"use client";

import { useEffect, useState } from "react";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import { TOKEN_FIELDS } from "./tokenFields";

function readCurrentValues(): Record<string, string> {
  const rootStyle = getComputedStyle(document.documentElement);
  const toggleElement = document.querySelector(".dsys-toggle");
  const toggleStyle = toggleElement ? getComputedStyle(toggleElement) : null;
  const values: Record<string, string> = {};
  for (const field of TOKEN_FIELDS) {
    const style = field.tier === "component" && toggleStyle ? toggleStyle : rootStyle;
    values[field.property] = style.getPropertyValue(field.property).trim();
  }
  return values;
}

export function DesignSystemTool() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [highOnTop, setHighOnTop] = useState(false);

  useEffect(() => {
    // One-time sync from an external system (the DOM's computed CSS values)
    // into React state on mount -- getComputedStyle is only available
    // client-side, so this can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(readCurrentValues());
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
    await fetch("/dev/design-system/api/tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property, value }),
    });
  }

  async function handleReset() {
    await fetch("/dev/design-system/api/tokens/reset", { method: "POST" });
    setValues(readCurrentValues());
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
