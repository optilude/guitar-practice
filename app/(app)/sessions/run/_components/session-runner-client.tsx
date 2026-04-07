"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"
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
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  // When true, navigation away will be intercepted. Set false before intentional navigations.
  const guardActiveRef = useRef(true)
  // Becomes true once the timer has been started at least once.
  const hasStartedRef = useRef(false)
  // Stores the pending navigation callback shown in the leave modal.
  const pendingNavRef = useRef<(() => void) | null>(null)

  const nav = useSessionNav(routine.sections)
  const currentSection = routine.sections[nav.currentSectionIndex]
  const metronome = useMetronome()

  const timer = useSessionTimer(
    currentSection.durationMinutes * 60,
    totalSecs(routine.sections, 0),
  )

  // Arm the guard the first time the timer is started
  useEffect(() => {
    if (timer.isRunning) hasStartedRef.current = true
  }, [timer.isRunning])

  // Browser unload / refresh / external navigation
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!guardActiveRef.current || !hasStartedRef.current) return
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Intercept all internal link clicks via capture phase
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!guardActiveRef.current || !hasStartedRef.current) return
      const anchor = (e.target as Element).closest("a[href]")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || !href.startsWith("/")) return
      e.preventDefault()
      e.stopPropagation()
      pendingNavRef.current = () => router.push(href)
      setShowLeaveModal(true)
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [router])

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

  // "← Back" button — show leave guard only if session has started
  function handleBack() {
    if (!hasStartedRef.current) { router.back(); return }
    pendingNavRef.current = () => router.back()
    setShowLeaveModal(true)
  }

  // Confirmed leave from the leave modal
  function handleConfirmLeave() {
    guardActiveRef.current = false
    setShowLeaveModal(false)
    pendingNavRef.current?.()
  }

  async function handleSave(finalNotes: string) {
    setIsSaving(true)
    const result = await saveSession({
      routine,
      startedAtLocal,
      endedAtLocal: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      notes: finalNotes,
    })
    if ("success" in result) {
      guardActiveRef.current = false
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
  }

  function handleDiscardSession() {
    guardActiveRef.current = false
    router.back()
  }

  const handleMetronomeBpmChange = useCallback((newBpm: number) => {
    if (metronome.isPlaying) metronome.stop()
    metronome.setBpm(newBpm)
  }, [metronome])

  return (
    <div className="flex flex-col h-[calc(100dvh-44px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <button
          onClick={handleBack}
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
          onClick={timer.isRunning ? timer.pause : timer.play}
          className={btn("primary", "sm")}
        >
          {timer.isRunning ? "⏸" : "▶"}
        </button>
        <button
          onClick={() => setAutoAdvance((v) => !v)}
          className={cn(btn("standalone", "sm"), autoAdvance ? "border-accent bg-accent/10 text-accent" : "")}
        >
          Auto
        </button>
        <button
          onClick={handleEndSession}
          className={btn("secondary", "sm")}
        >
          End Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Flashcard area (+ mobile metronome/notes scrolls inside) */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
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
          <div className="lg:hidden px-3 pb-3 space-y-3">
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

      {/* Section strip + Prev/Next */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-background shrink-0">
        <button
          onClick={handlePrev}
          disabled={nav.currentSectionIndex === 0}
          className={btn("standalone", "sm")}
        >
          ← Prev
        </button>
        <div className="flex-1 min-w-0">
          <SectionStrip
            sections={routine.sections}
            currentIndex={nav.currentSectionIndex}
            onSelect={handleGoToSection}
          />
        </div>
        <button
          onClick={handleNext}
          disabled={nav.currentSectionIndex === routine.sections.length - 1}
          className={btn("standalone", "sm")}
        >
          Next →
        </button>
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

      {/* Leave session guard modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40">
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Leave session?</h2>
            <p className="text-sm text-muted-foreground">
              Your session is in progress. If you leave now, it won&apos;t be saved.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleConfirmLeave}
                className={btn("destructive")}
              >
                Leave session
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
                className={btn("secondary")}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
