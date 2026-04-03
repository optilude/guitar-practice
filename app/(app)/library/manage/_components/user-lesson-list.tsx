"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { reorderUserLessons } from "@/app/(app)/library/actions"
import { UserLessonCard } from "./user-lesson-card"
import { AddLessonForm } from "./add-lesson-form"

export type UserLessonItem = {
  id: string
  title: string
  url: string | null
  description: string
  source: string
  order: number
}

interface UserLessonListProps {
  categoryId: string
  categoryName: string
  initialLessons: UserLessonItem[]
  sourceOptions: string[]
}

export function UserLessonList({
  categoryId,
  categoryName,
  initialLessons,
  sourceOptions,
}: UserLessonListProps) {
  const [lessons, setLessons] = useState([...initialLessons].sort((a, b) => a.order - b.order))
  const router = useRouter()

  useEffect(() => {
    setLessons([...initialLessons].sort((a, b) => a.order - b.order))
  }, [initialLessons])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(lessons, oldIndex, newIndex)
    setLessons(reordered)
    const result = await reorderUserLessons(categoryId, reordered.map((l) => l.id))
    if ("error" in result) {
      // Rollback to previous order
      setLessons(lessons)
    }
  }

  function handleChanged() {
    router.refresh()
  }

  return (
    <div>
      <DndContext
        id={`lesson-list-${categoryId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {lessons.map((lesson) => (
              <UserLessonCard
                key={lesson.id}
                lesson={lesson}
                sourceOptions={sourceOptions}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AddLessonForm
        categoryId={categoryId}
        categoryName={categoryName}
        sourceOptions={sourceOptions}
        onCreated={handleChanged}
      />
    </div>
  )
}
