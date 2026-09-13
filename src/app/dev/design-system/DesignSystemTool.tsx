"use client";

import { useEffect, useRef, useState } from "react";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import { TOKEN_FIELDS } from "./tokenFields";

const TOKENS_API_URL = "/dev/design-system/api/tokens";

async function fetchTokenValues(): Promise<Record<string, string>> {
  const response = await fetch(TOKENS_API_URL);
  const body = (await response.json()) as Record<string, string | undefined>;
  const values: Record<string, string> = {};
  for (const field of TOKEN_FIELDS) {
    values[field.property] = body[field.property] ?? "";
  }
  return values;
}

export function DesignSystemTool() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [highOnTop, setHighOnTop] = useState(false);
  // The value each field had the last time it was synced from the server --
  // used to skip PATCHing a field that was clicked into and out of without
  // actually being edited (computed-vs-authored / untouched-field bug).
  const baselineRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // One-time sync from an external system (the real, authored contents of
    // tokens.css, via the GET endpoint) into React state on mount -- fetch
    // is only meaningfully kicked off client-side here, so this can't be a
    // useState initializer. The state update happens inside the .then()
    // callback, not synchronously in the effect body, so this doesn't need
    // the set-state-in-effect lint exception the old getComputedStyle
    // version required.
    fetchTokenValues().then((fetched) => {
      baselineRef.current = fetched;
      setValues(fetched);
    });
  }, []);

  useEffect(() => {
    // Preview-only, session-local theme override: applied to <html> (not
    // this component's own wrapper div) because <body> -- the ancestor
    // that actually paints background/color in globals.css -- can only be
    // reached by a data-theme attribute on one of its own ancestors, not
    // on a descendant. Nothing is written to disk; the attribute is
    // removed on unmount/theme change so leaving this page (or picking
    // "system") always falls back to the OS preference.
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  function handleFieldChange(property: string, value: string) {
    setValues((prev) => ({ ...prev, [property]: value }));
  }

  async function handleFieldCommit(property: string, value: string) {
    // Skip the write entirely if nothing actually changed from the last
    // known-real value -- this is what stops clicking into and out of an
    // untouched field from ever writing anything, regardless of what value
    // domain (authored vs. computed) it happened to display.
    if (baselineRef.current[property] === value) {
      return;
    }
    try {
      await fetch(TOKENS_API_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, value }),
      });
    } finally {
      // Re-fetch regardless of success or failure -- a rejected edit (e.g.
      // a 400) should visibly snap the field back to the real persisted
      // value instead of leaving the rejected input on screen.
      const fetched = await fetchTokenValues();
      baselineRef.current = fetched;
      setValues(fetched);
    }
  }

  async function handleReset() {
    await fetch("/dev/design-system/api/tokens/reset", { method: "POST" });
    const fetched = await fetchTokenValues();
    baselineRef.current = fetched;
    setValues(fetched);
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-xl font-semibold mb-6">Design System</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">Theme</h2>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className="rounded-[var(--radius)] border px-3 py-1.5 text-sm"
              style={{
                borderColor: "var(--color-border)",
                fontWeight: theme === option ? 600 : 400,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">StringOrientationToggle</h2>
        <StringOrientationToggle highOnTop={highOnTop} onToggle={() => setHighOnTop((v) => !v)} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">Tokens</h2>
        <div className="flex flex-col gap-3">
          {TOKEN_FIELDS.map((field) => (
            <label key={field.property} className="flex items-center gap-3 text-sm">
              <span className="w-48 font-mono">{field.property}</span>
              <span className="w-24 text-xs uppercase" style={{ color: "var(--color-border)" }}>
                {field.tier}
              </span>
              <input
                type="text"
                value={values[field.property] ?? ""}
                onChange={(e) => handleFieldChange(field.property, e.target.value)}
                onBlur={(e) => handleFieldCommit(field.property, e.target.value)}
                className="rounded-[var(--radius)] border px-2 py-1 font-mono text-sm"
                style={{ borderColor: "var(--color-border)" }}
              />
            </label>
          ))}
        </div>
      </section>

      <button
        onClick={handleReset}
        className="rounded-[var(--radius)] border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--color-border)" }}
      >
        Reset all
      </button>
    </div>
  );
}
