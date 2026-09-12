import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import type { TimedNote } from "@/lib/tabNotation";

// One row per published song. `tuning` and `notes` are stored as JSON --
// Turso/libSQL has no native array/struct column type, and both are always
// read/written whole (no querying into their contents), so JSON is simpler
// than a normalized notes table for what this app actually needs.
export const songs = sqliteTable("songs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  // Optional -- see SongListRow.tsx/SongDetailPane.tsx's "always render the
  // row, even with no artist data" handling. Empty string, not null, so
  // `song.artist || fallback` reads the same everywhere.
  artist: text("artist").notNull().default(""),
  tempoBpm: real("tempo_bpm").notNull(),
  // Per-string open-string MIDI pitch, low string first -- tuning[tuning.length - 1]
  // is always the highest ("thin e") string. See lib/tabNotation.ts's pitchClassName.
  tuning: text("tuning", { mode: "json" }).$type<number[]>().notNull(),
  notes: text("notes", { mode: "json" }).$type<TimedNote[]>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
