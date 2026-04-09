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
import { reorderUserProgressions } from "@/app/(app)/reference/progressions/actions"
import { UserProgressionCard } from "./user-progression-card"

export type UserProgressionItem = {
  id: string
  displayName: string
  description: string
  mode: string
  degrees: string[]
  order: number
}

interface UserProgressionListProps {
  initialProgressions: UserProgressionItem[]
}

export function UserProgressionList({ initialProgressions }: UserProgressionListProps) {
  const [progressions, setProgressions] = useState(
    [...initialProgressions].sort((a, b) => a.order - b.order)
  )
  const router = useRouter()

  useEffect(() => {
    setProgressions([...initialProgressions].sort((a, b) => a.order - b.order))
  }, [initialProgressions])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = progressions.findIndex((p) => p.id === active.id)
    const newIndex = progressions.findIndex((p) => p.id === over.id)
    const prev = progressions
    const reordered = arrayMove(progressions, oldIndex, newIndex)
    setProgressions(reordered)
    const result = await reorderUserProgressions(reordered.map((p) => p.id))
    if ("error" in result) setProgressions(prev)
  }

  if (progressions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No custom progressions yet.
      </p>
    )
  }

  return (
    <DndContext
      id="progression-list"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={progressions.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {progressions.map((prog) => (
            <UserProgressionCard
              key={prog.id}
              progression={prog}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
