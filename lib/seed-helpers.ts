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
