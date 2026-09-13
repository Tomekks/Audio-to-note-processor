// Single source of truth for which design tokens the /dev/design-system tool
// can edit -- both the API routes' validation allow-list and the page's
// editable fields read from this same array, so a typo in one place is a
// compile error, not a silent mismatch between what the UI shows and what
// the API accepts.
//
// See docs/superpowers/specs/2026-09-13-local-design-system-tool-design.md
// ("Token fields (the allow-list)") for why exactly these eight.

export type TokenTier = "global" | "brand" | "component";
export type TokenKind = "color" | "size";

export type TokenField = {
  property: string;
  tier: TokenTier;
  kind: TokenKind;
};

export const TOKEN_FIELDS: TokenField[] = [
  { property: "--radius", tier: "global", kind: "size" },
  { property: "--sidebar-width", tier: "global", kind: "size" },
  { property: "--color-accent", tier: "brand", kind: "color" },
  { property: "--color-border", tier: "brand", kind: "color" },
  { property: "--background", tier: "brand", kind: "color" },
  { property: "--foreground", tier: "brand", kind: "color" },
  { property: "--toggle-radius", tier: "component", kind: "size" },
  { property: "--toggle-border-color", tier: "component", kind: "color" },
];
