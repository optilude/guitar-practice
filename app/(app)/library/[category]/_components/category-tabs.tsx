"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"

type StandardTopic = {
  id: string
  title: string
  url: string
  description: string
  source: { name: string }
}

type UserLesson = {
  id: string
  title: string
  url: string | null
  description: string
  source: string
}

function LessonRow({
  title,
  url,
  source,
  description,
  addToGoalProps,
}: {
  title: string
  url?: string | null
  source: string
  description: string
  addToGoalProps: {
    kind: "lesson"
    lessonId?: string
    userLessonId?: string
    displayName: string
  }
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDescription = Boolean(description)

  return (
    <li>
      <div className="flex items-center gap-2 py-2 min-w-0">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground hover:text-muted-foreground transition-colors truncate"
            >
              {title}
            </a>
          ) : (
            <span className="text-sm text-foreground truncate">{title}</span>
          )}
          {source && (
            <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
              {source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasDescription ? (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="w-5 text-center text-muted-foreground hover:text-foreground transition-colors text-xs"
              aria-label={isExpanded ? "Collapse description" : "Expand description"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}
          <AddToGoalButton {...addToGoalProps} />
        </div>
      </div>
      {isExpanded && hasDescription && (
        <div className="pb-2 pl-0 prose prose-sm max-w-none text-muted-foreground text-xs">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      )}
    </li>
  )
}

interface CategoryTabsProps {
  standardTopics: StandardTopic[]
  userLessons: UserLesson[]
}

export function CategoryTabs({ standardTopics, userLessons }: CategoryTabsProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "personal">("standard")
  const hasPersonal = userLessons.length > 0

  return (
    <>
      {hasPersonal && (
        <div className="flex border-b border-border mb-4">
          {(["standard", "personal"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "standard" ? "Standard" : "Personal"}
            </button>
          ))}
        </div>
      )}

      {(!hasPersonal || activeTab === "standard") && (
        <ul className="space-y-0">
          {standardTopics.map((topic) => (
            <LessonRow
              key={topic.id}
              title={topic.title}
              url={topic.url}
              source={topic.source.name}
              description={topic.description}
              addToGoalProps={{ kind: "lesson", lessonId: topic.id, displayName: topic.title }}
            />
          ))}
        </ul>
      )}

      {hasPersonal && activeTab === "personal" && (
        <ul className="space-y-0">
          {userLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              title={lesson.title}
              url={lesson.url}
              source={lesson.source}
              description={lesson.description}
              addToGoalProps={{ kind: "lesson", userLessonId: lesson.id, displayName: lesson.title }}
            />
          ))}
        </ul>
      )}
    </>
  )
}
