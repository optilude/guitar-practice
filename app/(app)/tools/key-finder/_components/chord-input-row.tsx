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
  // distance:5 lets quick clicks pass through to inner buttons without activating drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  // items-start: × badge at -top-1.5 overflows tile bounds; items-center would mis-align on wrap
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
          {chords.map((chord, i) => (
            // Arrow + tile grouped as flex-shrink-0 so wrapping keeps → ahead of its tile
            <div key={chord.id} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm select-none">→</span>
              )}
              <ChordTile
                id={chord.id}
                symbol={chord.symbol}
                analysis={getAnalysis(chord.id)}
                isEditing={editingId === chord.id}
                onCommit={symbol => onCommit(chord.id, symbol)}
                onRemove={() => onRemove(chord.id)}
                onStartEdit={() => onStartEdit(chord.id)}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button — outside SortableContext so it cannot be dragged */}
      {/* Invisible rows match tile height; + is absolutely centred and oversized */}
      <button
        type="button"
        onClick={onAdd}
        className="relative flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 min-w-[68px] text-muted-foreground hover:border-accent hover:text-foreground transition-colors"
        aria-label="add chord"
      >
        <span className="text-[10px] mb-1 invisible" aria-hidden="true">&nbsp;</span>
        <span className="text-sm invisible" aria-hidden="true">&nbsp;</span>
        <span className="absolute inset-0 flex items-center justify-center text-xl leading-none">+</span>
      </button>
    </div>
  )
}
