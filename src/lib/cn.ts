// Minimal classnames joiner -- every call site here only ever passes
// strings and simple ternaries, not objects/arrays, so a full clsx isn't
// worth the extra dependency.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
