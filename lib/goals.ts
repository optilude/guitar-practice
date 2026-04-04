import type { TopicKind } from "@/lib/generated/prisma/client"
import { listProgressions } from "@/lib/theory/progressions"

export function computeRefKey(topicRef: {
  kind: TopicKind
  subtype?: string | null
  lessonId?: string | null
  userLessonId?: string | null
  defaultKey?: string | null
}): string {
  if (topicRef.kind === "lesson" && topicRef.userLessonId) {
    return `user_lesson:${topicRef.userLessonId}`
  }
  if (topicRef.kind === "lesson" && topicRef.lessonId) {
    return `lesson:${topicRef.lessonId}`
  }
  return `${topicRef.kind}:${topicRef.subtype ?? ""}:${topicRef.defaultKey ?? ""}`
}

type GoalTopicForDisplay = {
  kind: TopicKind
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
  userLesson?: { title: string; url: string | null } | null
}

export function formatTopicName(topic: GoalTopicForDisplay): string {
  switch (topic.kind) {
    case "lesson":
      if (topic.userLesson) return topic.userLesson.title
      if (topic.lesson) return topic.lesson.title
      return "(lesson removed)"
    case "scale":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} scale`.trim()
    case "chord":
      return `${topic.defaultKey ?? ""}${topic.subtype ?? ""} chord`
    case "inversion":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} inversion`.trim()
    case "arpeggio":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} arpeggio`.trim()
    case "progression": {
      const prog = listProgressions().find((p) => p.name === topic.subtype)
      return prog?.displayName ?? topic.subtype ?? "Unknown progression"
    }
    case "harmony":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""}`.trim()
    default:
      return "Unknown topic"
  }
}
