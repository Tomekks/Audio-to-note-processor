// Optional real cover art / artist / link lookup -- deliberately a no-op
// stub for now (no credentials configured, no network call), so every
// caller's "missing/null both mean no art found, degrade gracefully" path
// (see app/page.tsx, SongDetailPane.tsx, SongListRow.tsx) already does the
// right thing. Swap this out for a real Spotify Web API lookup later
// without touching any caller.
export async function getTrackMetadata(
  title: string,
  artist: string,
): Promise<{ coverArtUrl?: string; artist?: string; url?: string | null } | null> {
  void title;
  void artist;
  return null;
}
