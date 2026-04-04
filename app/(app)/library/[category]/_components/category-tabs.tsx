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
    <li className="border border-border rounded-md">
      <div
        role={hasDescription ? "button" : undefined}
        tabIndex={hasDescription ? 0 : undefined}
        onClick={() => hasDescription && setIsExpanded((v) => !v)}
        onKeyDown={(e) =>
          hasDescription &&
          (e.key === "Enter" || e.key === " ") &&
          setIsExpanded((v) => !v)
        }
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 min-w-0 rounded-md",
          hasDescription && !isExpanded && "rounded-b-md",
          hasDescription && isExpanded && "rounded-b-none",
          hasDescription && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
      >
        <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 min-w-0 group"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-muted-foreground transition-colors truncate">{title}</span>
              {source && (
                <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                  {source}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground flex-shrink-0">↗</span>
            </a>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground truncate">{title}</span>
              {source && (
                <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                  {source}
                </span>
              )}
            </>
          )}
        </div>
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {hasDescription && (
            <span
              className="text-muted-foreground text-xs flex-shrink-0 cursor-pointer"
              onClick={() => setIsExpanded((v) => !v)}
            >
              {isExpanded ? "▲" : "▼"}
            </span>
          )}
          <AddToGoalButton {...addToGoalProps} popupAlign="right" />
        </div>
      </div>
      {isExpanded && hasDescription && (
        <div className="px-3 pb-3 pt-3 border-t border-border prose prose-sm max-w-none text-muted-foreground text-sm">
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
        <ul className="space-y-1.5">
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
        <ul className="space-y-1.5">
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
