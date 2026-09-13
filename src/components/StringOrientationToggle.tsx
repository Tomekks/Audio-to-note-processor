"use client";

// Shared by SheetDiagram and FretboardDiagram (2026-09-10) -- both views need
// the exact same "flip which end is on top" control, and it should look
// identical in both places rather than two independently-styled buttons that
// happen to say similar things. Extracted the same way tabNotation.ts's
// helpers were: once a second component needed it, not before.
//
// Styled through the design-token cascade (2026-09-13, see
// src/styles/tokens.css) rather than a one-off color-mix() and Tailwind's
// default radius -- this used to be the one shared control that didn't
// match the rest of the app's border/radius tokens.
export function StringOrientationToggle({ highOnTop, onToggle }: { highOnTop: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="dsys-toggle inline-flex items-center gap-1.5 rounded-[var(--toggle-radius)] border px-3 py-1.5 text-sm font-medium hover:opacity-70"
      style={{ borderColor: "var(--toggle-border-color)" }}
    >
      Flip to {highOnTop ? "thick E" : "thin e"} on top
    </button>
  );
}
