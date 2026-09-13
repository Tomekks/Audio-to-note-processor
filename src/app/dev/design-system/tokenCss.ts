import { TOKEN_FIELDS, type TokenField } from "./tokenFields.ts";

const COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
const SIZE_PATTERN = /^\d+(\.\d+)?px$/;

// Validates a value's shape against its token's kind -- a real trust
// boundary check, not cosmetic: this runs before anything is written into
// tokens.css, the file the whole live app imports.
export function isValidValue(kind: TokenField["kind"], value: string): boolean {
  return kind === "color" ? COLOR_PATTERN.test(value) : SIZE_PATTERN.test(value);
}

function declarationRegex(property: string): RegExp {
  // Matches a single-line, semicolon-terminated custom-property
  // declaration for exactly this property name -- anchored on the leading
  // `--name:` right after optional indentation, so e.g. `--radius` never
  // matches inside `--toggle-radius`.
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^([ \\t]*${escaped}:[ \\t]*).*?;`, "m");
}

// Reads a property's current value out of a tokens.css text blob.
// Returns undefined if the property has no declaration in this text.
export function getTokenValue(cssText: string, property: string): string | undefined {
  const match = declarationRegex(property).exec(cssText);
  if (!match) return undefined;
  return match[0].slice(match[1].length, -1).trim();
}

// Rewrites one property's declaration line in place. Throws if the
// property has no existing declaration to rewrite -- failing loudly
// rather than silently no-op-succeeding, since a caller that thinks it
// wrote a value it didn't would be a worse bug than a thrown error.
export function setTokenValue(cssText: string, property: string, value: string): string {
  const match = declarationRegex(property).exec(cssText);
  if (!match) {
    throw new Error(`tokens.css has no existing declaration for ${property}`);
  }
  const prefix = match[1];
  const start = match.index;
  const end = match.index + match[0].length;
  return cssText.slice(0, start) + prefix + value + ";" + cssText.slice(end);
}

// Resets every known token field to its value in `committedCssText`
// (typically the git HEAD copy of tokens.css), rewriting only those
// fields' own lines in `cssText` -- anything else in the file, edited by
// the tool or by hand, committed or not, is left untouched.
export function resetTokenValues(cssText: string, committedCssText: string): string {
  let result = cssText;
  for (const field of TOKEN_FIELDS) {
    const committedValue = getTokenValue(committedCssText, field.property);
    if (committedValue === undefined) continue;
    result = setTokenValue(result, field.property, committedValue);
  }
  return result;
}
