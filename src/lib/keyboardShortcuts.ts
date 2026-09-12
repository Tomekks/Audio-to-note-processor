// Shared guard for global keydown listeners (StudioTabs.tsx's transport
// shortcuts) so typing into an input/textarea/contenteditable element (e.g.
// the Tempo field) never gets hijacked by app-level key handling.
export function isEditableTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
