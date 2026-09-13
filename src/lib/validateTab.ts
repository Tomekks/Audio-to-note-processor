import Ajv2020 from "ajv/dist/2020.js";
// The `with { type: "json" }` import attribute is required by Node's native
// ESM loader (used directly by `node --test`) -- unlike Next's bundler,
// it doesn't infer JSON from `resolveJsonModule` alone.
import tabSchema from "../../contracts/tab.schema.json" with { type: "json" };
import type { TimedNote } from "./tabNotation";

// The contract's shape, not the DB row's -- contracts/tab.schema.json's own
// fields. The DB row additionally has id/artist/createdAt (not part of the
// contract) and doesn't store schemaVersion/sourceFile as columns; callers
// build one of these explicitly rather than passing a DB row straight in.
// See validateTab's own doc comment for why that distinction matters.
export type TabPayload = {
  schemaVersion: string;
  title: string;
  sourceFile?: string;
  tuning: number[];
  tempoBpm: number;
  notes: TimedNote[];
};

// Ajv2020, not the default Ajv export -- tab.schema.json declares the
// 2020-12 meta-schema ($schema), and plain Ajv targets draft-07 and can
// error on an unrecognized dialect.
const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(tabSchema);

// Throws with ajv's own error details on mismatch. Callers must pass the
// contract's shape, not a raw DB row -- the DB has extra columns
// (id/artist/createdAt) the contract doesn't define, and the contract
// requires schemaVersion, which isn't a DB column (it's a constant,
// injected here rather than stored). Validate right before writing across
// the contract boundary (e.g. immediately before a DB insert), not inside
// pure rendering code that already has compile-time guarantees once data
// has passed this point once.
export function validateTab(data: unknown): asserts data is TabPayload {
  if (!validate(data)) {
    throw new Error(`Invalid tab payload: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
  }
}
