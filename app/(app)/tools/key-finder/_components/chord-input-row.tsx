"use client"

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
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { ChordTile } from "./chord-tile"
import type { ChordAnalysis, KeyMatch } from "@/lib/theory/key-finder"

interface ChordEntry {
  id: string
  symbol: string
}

interface ChordInputRowProps {
  chords: ChordEntry[]
  editingId: string | null
  selectedResult: KeyMatch | null
  onChordChange: (chords: ChordEntry[]) => void
  onCommit: (id: string, symbol: string) => void
  onRemove: (id: string) => void
  onStartEdit: (id: string) => void
  onAdd: () => void
}

export function ChordInputRow({
  chords,
  editingId,
  selectedResult,
  onChordChange,
  onCommit,
  onRemove,
  onStartEdit,
  onAdd,
}: ChordInputRowProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = chords.findIndex(c => c.id === active.id)
    const newIndex = chords.findIndex(c => c.id === over.id)
    onChordChange(arrayMove(chords, oldIndex, newIndex))
  }

  function getAnalysis(id: string): ChordAnalysis | null {
    if (!selectedResult) return null
    const index = chords.findIndex(c => c.id === id)
    if (index === -1 || index >= selectedResult.chordAnalysis.length) return null
    return selectedResult.chordAnalysis[index]
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <DndContext
        id="key-finder-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={chords.map(c => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {chords.map(chord => (
            <ChordTile
              key={chord.id}
              id={chord.id}
              symbol={chord.symbol}
              analysis={getAnalysis(chord.id)}
              isEditing={editingId === chord.id}
              onCommit={symbol => onCommit(chord.id, symbol)}
              onRemove={() => onRemove(chord.id)}
              onStartEdit={() => onStartEdit(chord.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button — outside SortableContext so it cannot be dragged */}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-foreground transition-colors px-3 py-2.5 min-w-[44px] text-sm"
        aria-label="add chord"
      >
        +
      </button>
    </div>
  )
}
