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
import { reorderTopics } from "@/app/(app)/admin/library/actions"
import { TopicCard } from "./topic-card"
import { AddTopicForm } from "./add-topic-form"
import type { TopicItem } from "./topic-card"

interface TopicListProps {
  categoryId: string
  categoryName: string
  initialTopics: TopicItem[]
}

export function TopicList({ categoryId, categoryName, initialTopics }: TopicListProps) {
  const [topics, setTopics] = useState([...initialTopics].sort((a, b) => a.order - b.order))
  const router = useRouter()

  useEffect(() => {
    setTopics([...initialTopics].sort((a, b) => a.order - b.order))
  }, [initialTopics])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = topics.findIndex((t) => t.id === active.id)
    const newIndex = topics.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(topics, oldIndex, newIndex)
    setTopics(reordered)
    const result = await reorderTopics(categoryId, reordered.map((t) => t.id))
    if ("error" in result) {
      // Rollback to previous order
      setTopics(topics)
    }
  }

  function handleChanged() {
    router.refresh()
  }

  return (
    <div>
      <DndContext
        id={`topic-list-${categoryId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={topics.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AddTopicForm
        categoryId={categoryId}
        categoryName={categoryName}
        onCreated={handleChanged}
      />
    </div>
  )
}
