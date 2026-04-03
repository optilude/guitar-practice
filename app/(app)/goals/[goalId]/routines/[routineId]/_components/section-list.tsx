"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { reorderSections } from "@/app/(app)/goals/actions"
import { SectionCard } from "./section-card"
import { AddSectionForm } from "./add-section-form"
import type { SectionType, PracticeMode } from "@/lib/generated/prisma/enums"

type GoalTopicForDisplay = {
  id: string
  kind: string
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
}

type SectionTopicWithGoalTopic = {
  id: string
  keys: string[]
  practiceMode: PracticeMode | null
  goalTopicId: string
  goalTopic: GoalTopicForDisplay
}

type SectionWithTopics = {
  id: string
  type: SectionType
  title: string
  description: string
  durationMinutes: number
  order: number
  routineId: string
  sectionTopics: SectionTopicWithGoalTopic[]
}

interface SectionListProps {
  routineId: string
  routineGoalId: string
  initialSections: SectionWithTopics[]
  availableTopics: GoalTopicForDisplay[]
}

export function SectionList({
  routineId,
  routineGoalId,
  initialSections,
  availableTopics,
}: SectionListProps) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.order - b.order)
  )
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(sections, oldIndex, newIndex)
    setSections(reordered)
    reorderSections(routineId, reordered.map((s) => s.id))
  }

  const handleChanged = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              availableTopics={availableTopics}
              routineGoalId={routineGoalId}
              onChanged={handleChanged}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sections yet. Add one below.
        </p>
      )}

      <AddSectionForm routineId={routineId} onAdded={handleChanged} />
    </div>
  )
}
