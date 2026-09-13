import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TOKEN_FIELDS } from "../../tokenFields";
import { isValidValue, setTokenValue } from "../../tokenCss";

const TOKENS_CSS_PATH = path.join(process.cwd(), "src", "styles", "tokens.css");

type EditRequestBody = { property?: unknown; value?: unknown };

export async function PATCH(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const body = (await request.json().catch(() => null)) as EditRequestBody | null;
  const property = typeof body?.property === "string" ? body.property : null;
  const value = typeof body?.value === "string" ? body.value : null;

  if (property === null || value === null) {
    return NextResponse.json({ error: "property and value must be strings" }, { status: 400 });
  }

  const field = TOKEN_FIELDS.find((f) => f.property === property);
  if (!field || !isValidValue(field.kind, value)) {
    return NextResponse.json({ error: "invalid property or value" }, { status: 400 });
  }

  const cssText = readFileSync(TOKENS_CSS_PATH, "utf8");
  let updated: string;
  try {
    updated = setTokenValue(cssText, property, value);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  writeFileSync(TOKENS_CSS_PATH, updated, "utf8");

  return NextResponse.json({ property, value });
}
