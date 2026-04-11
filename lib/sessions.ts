import { format } from "date-fns"
import type { TopicKind, PracticeMode, SectionType } from "@/lib/generated/prisma/enums"

// ── Types ──────────────────────────────────────────────────────────────────────

export type SessionTopic = {
  kind: TopicKind
  subtype: string | null
  displayName: string
  defaultKey: string | null
  keys: string[]
  practiceMode: PracticeMode | null
  lessonUrl: string | null
  userProgression?: {
    id: string
    displayName: string
    mode: string
    degrees: string[]
    description: string
  } | null
}

export type SessionSection = {
  id: string
  title: string
  type: SectionType
  description: string
  durationMinutes: number
  order: number
  topic: SessionTopic | null
}

export type SessionRoutine = {
  id: string
  title: string
  goalId: string | null
  goalTitle: string
  sections: SessionSection[]
}

// ── computeStreak ──────────────────────────────────────────────────────────────

export function computeStreak(localDates: string[]): number {
  if (localDates.length === 0) return 0

  const unique = [...new Set(localDates)].sort((a, b) => b.localeCompare(a))
  const today = format(new Date(), "yyyy-MM-dd")
  const yd = new Date()
  yd.setDate(yd.getDate() - 1)
  const yesterday = format(yd, "yyyy-MM-dd")

  let start = today
  if (unique[0] !== today) {
    if (unique[0] === yesterday) {
      start = yesterday
    } else {
      return 0
    }
  }

  let streak = 0
  let current = start
  const set = new Set(unique)
  while (set.has(current)) {
    streak++
    const d = new Date(current + "T12:00:00")
    d.setDate(d.getDate() - 1)
    current = format(d, "yyyy-MM-dd")
  }
  return streak
}

// ── Key sequence constants ────────────────────────────────────────────────────

const CHROMATIC_ASC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
const CIRCLE_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]

function rotateFrom(arr: string[], startKey: string): string[] {
  const idx = arr.findIndex((k) => k === startKey)
  if (idx === -1) return arr
  return [...arr.slice(idx), ...arr.slice(0, idx)]
}

function shuffleArray(arr: string[]): string[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── resolveKeySequence ────────────────────────────────────────────────────────

export function resolveKeySequence(topic: SessionTopic): string[] {
  if (topic.kind === "lesson") return [""]

  const { keys, defaultKey, practiceMode } = topic
  const dk = defaultKey ?? "C"

  if (keys.length === 0 || (keys.length === 1 && keys[0] === dk)) return [dk]
  if (keys[0] !== "*") return keys

  // All 12 keys
  switch (practiceMode) {
    case "chromatic_asc":
      return rotateFrom(CHROMATIC_ASC, dk)
    case "chromatic_desc":
      return rotateFrom([...CHROMATIC_ASC].reverse(), dk)
    case "circle_fifths_asc":
      return rotateFrom(CIRCLE_FIFTHS, dk)
    case "circle_fourths_desc":
      return rotateFrom([...CIRCLE_FIFTHS].reverse(), dk)
    case "random":
      return shuffleArray(CHROMATIC_ASC)
    default:
      return rotateFrom(CHROMATIC_ASC, dk)
  }
}
