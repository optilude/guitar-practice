"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useSessionTimer } from "@/lib/hooks/use-session-timer"
import { useSessionNav } from "@/lib/hooks/use-session-nav"
import { useMetronome } from "@/lib/hooks/use-metronome"
import { saveSession } from "@/app/(app)/sessions/actions"
import type { SessionRoutine } from "@/lib/sessions"
import { FlashCard } from "./flashcard"
import { SectionStrip } from "./section-strip"
import { TimerDisplay } from "./timer-display"
import { NotesPanel } from "./notes-panel"
import { MetronomePanel } from "./metronome-panel"
import { EndSessionModal } from "./end-session-modal"

function totalSecs(sections: SessionRoutine["sections"], fromIndex: number): number {
  return sections.slice(fromIndex).reduce((sum, s) => sum + s.durationMinutes * 60, 0)
}

interface SessionRunnerClientProps {
  routine: SessionRoutine
}

export function SessionRunnerClient({ routine }: SessionRunnerClientProps) {
  const router = useRouter()
  const startedAtLocal = useState(() => format(new Date(), "yyyy-MM-dd HH:mm:ss"))[0]
  const [notes, setNotes] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [flashKey, setFlashKey] = useState(0) // forces FlashCard remount on section change

  const nav = useSessionNav(routine.sections)
  const currentSection = routine.sections[nav.currentSectionIndex]
  const metronome = useMetronome()

  const timer = useSessionTimer(
    currentSection.durationMinutes * 60,
    totalSecs(routine.sections, 0),
  )

  // Handle section completion when timer reaches 0
  const autoAdvanceRef = useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance
  const navRef = useRef(nav)
  navRef.current = nav
  const sectionLengthRef = useRef(routine.sections.length)
  sectionLengthRef.current = routine.sections.length
  const sectionCompleteTriggeredRef = useRef(false)

  useEffect(() => {
    if (timer.sectionSecondsRemaining === 0 && timer.isRunning) {
      if (!sectionCompleteTriggeredRef.current) {
        sectionCompleteTriggeredRef.current = true
        if (autoAdvanceRef.current && navRef.current.currentSectionIndex < sectionLengthRef.current - 1) {
          navRef.current.goToNextSection()
        }
      }
    } else {
      sectionCompleteTriggeredRef.current = false
    }
  }, [timer.sectionSecondsRemaining, timer.isRunning])

  // When section changes: reset timer and remount flashcard
  const handleGoToSection = useCallback((index: number) => {
    nav.goToSection(index)
    timer.resetSection(
      routine.sections[index].durationMinutes * 60,
      totalSecs(routine.sections, index),
    )
    setFlashKey((k) => k + 1)
  }, [nav, routine.sections, timer])

  const handleNext = useCallback(() => {
    const next = nav.currentSectionIndex + 1
    if (next < routine.sections.length) handleGoToSection(next)
  }, [nav.currentSectionIndex, routine.sections.length, handleGoToSection])

  const handlePrev = useCallback(() => {
    const prev = nav.currentSectionIndex - 1
    if (prev >= 0) handleGoToSection(prev)
  }, [nav.currentSectionIndex, handleGoToSection])

  async function handleSave(finalNotes: string) {
    setIsSaving(true)
    const result = await saveSession({
      routine,
      startedAtLocal,
      endedAtLocal: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      notes: finalNotes,
    })
    if ("success" in result) {
      router.push(`/history/${result.id}`)
    } else {
      setIsSaving(false)
      alert(result.error)
    }
  }

  function handleEndSession() {
    timer.pause()
    setShowModal(true)
  }

  function handleCancel() {
    setShowModal(false)
    // Timer stays paused — user can resume or navigate away
  }

  function handleDiscardSession() {
    router.back()
  }

  const handleMetronomeBpmChange = useCallback((newBpm: number) => {
    if (metronome.isPlaying) metronome.stop()
    metronome.setBpm(newBpm)
  }, [metronome])

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <button
          onClick={() => router.back()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <span className="flex-1 text-sm font-medium truncate">{routine.title}</span>
        <TimerDisplay
          sectionSecondsRemaining={timer.sectionSecondsRemaining}
          totalSecondsRemaining={timer.totalSecondsRemaining}
        />
        <button
          onClick={() => setAutoAdvance((v) => !v)}
          className={cn(
            "text-xs px-2.5 py-1 rounded border transition-colors",
            autoAdvance ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Auto
        </button>
        <button
          onClick={handleEndSession}
          className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          End Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Flashcard area (+ mobile metronome/notes scrolls inside) */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <FlashCard
              key={flashKey}
              section={currentSection}
              currentKeyIndex={nav.currentKeyIndex}
              currentKeySequence={nav.currentKeySequence}
              onSelectKey={nav.goToKeyIndex}
              onPrevKey={nav.goToPrevKey}
              onNextKey={nav.goToNextKey}
            />
          </div>
          {/* Mobile: metronome + notes scroll with the flashcard */}
          <div className="lg:hidden px-4 pb-4 space-y-3">
            <MetronomePanel
              bpm={metronome.bpm}
              isRunning={metronome.isPlaying}
              onBpmChange={handleMetronomeBpmChange}
              onStart={metronome.start}
              onStop={metronome.stop}
            />
            <NotesPanel value={notes} onChange={setNotes} />
          </div>
        </div>

        {/* Metronome + Notes (desktop) */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border">
          <div className="p-3 border-b border-border shrink-0">
            <MetronomePanel
              bpm={metronome.bpm}
              isRunning={metronome.isPlaying}
              onBpmChange={handleMetronomeBpmChange}
              onStart={metronome.start}
              onStop={metronome.stop}
            />
          </div>
          <div className="flex-1 min-h-0 p-3 flex flex-col">
            <NotesPanel value={notes} onChange={setNotes} />
          </div>
        </div>
      </div>

      {/* Section strip */}
      <div className="px-4 py-2 border-t border-border bg-background shrink-0">
        <SectionStrip
          sections={routine.sections}
          currentIndex={nav.currentSectionIndex}
          onSelect={handleGoToSection}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-border bg-background shrink-0">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={nav.currentSectionIndex === 0}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={timer.isRunning ? timer.pause : timer.play}
            className="px-4 py-1.5 text-sm rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            {timer.isRunning ? "⏸" : "▶"}
          </button>
          <button
            onClick={handleNext}
            disabled={nav.currentSectionIndex === routine.sections.length - 1}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      {/* End session modal */}
      {showModal && (
        <EndSessionModal
          routineTitle={routine.title}
          goalTitle={routine.goalTitle}
          startedAtLocal={startedAtLocal}
          notes={notes}
          onSave={handleSave}
          onCancel={handleCancel}
          onDiscardSession={handleDiscardSession}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
