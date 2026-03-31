// Maps HubGuitar URL path prefixes to our app's 7 category slugs.
// Deliberate consolidations:
//   - /rhythm/ → technique  (rhythm is a sub-domain of technique, not a separate category)
//   - /pick/ and /fingerstyle/ → songs  (these are song-focused playlists, not technique topics)
//   - /songs/ → songs  (direct match)
// Prefixes not listed here (e.g. /boston/, /articles/) return null and are skipped during seeding.
const CATEGORY_MAP: Record<string, string> = {
  technique: "technique",
  rhythm: "technique",
  fretboard: "fretboard-knowledge",
  "music-theory": "music-theory",
  improvisation: "improvisation",
  "ear-training": "ear-training",
  "sight-reading": "sight-reading",
  pick: "songs",
  fingerstyle: "songs",
  songs: "songs",
}

/**
 * Resolves a HubGuitar topic URL to one of the app's 7 category slugs.
 *
 * HubGuitar topic URLs are always exactly two path segments deep
 * (e.g. `/technique/alternate-picking`). URLs with fewer or more segments
 * (root pages, paginated index URLs, etc.) are not topics and return null.
 */
export function urlToCategory(urlString: string): string | null {
  const segments = new URL(urlString).pathname.split("/").filter(Boolean)
  if (segments.length !== 2) return null
  return CATEGORY_MAP[segments[0]] ?? null
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
