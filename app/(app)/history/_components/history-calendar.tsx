"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format, parseISO } from "date-fns"
import Link from "next/link"

type SessionSummary = {
  id: string
  routineTitle: string
  goalTitle: string
  startedAtLocal: string
  endedAtLocal: string
  localDate: string
}

interface HistoryCalendarProps {
  sessions: SessionSummary[]
}

export function HistoryCalendar({ sessions }: HistoryCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(() => format(new Date(), "yyyy-MM-dd"))
  const [month, setMonth] = useState<Date>(new Date())

  const sessionDates = new Set(sessions.map((s) => s.localDate))

  const sessionsForDay = selectedDate
    ? sessions.filter((s) => s.localDate === selectedDate)
    : []

  function handleDayClick(day: Date) {
    const str = format(day, "yyyy-MM-dd")
    setSelectedDate((prev) => (prev === str ? null : str))
  }

  return (
    <div className="space-y-10">
      <DayPicker
        month={month}
        onMonthChange={setMonth}
        onDayClick={handleDayClick}
        modifiers={{
          hasSession: (day) => sessionDates.has(format(day, "yyyy-MM-dd")),
          selected: (day) => format(day, "yyyy-MM-dd") === selectedDate,
        }}
        modifiersClassNames={{
          hasSession: "font-bold text-accent bg-accent/20 rounded-full",
          selected: "bg-accent text-accent-foreground rounded-full",
        }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full space-y-3",
          month_caption: "flex items-center justify-between px-1",
          caption_label: "text-sm font-medium",
          nav: "flex items-center gap-1",
          button_previous: "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          button_next: "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          month_grid: "w-full border-collapse",
          weekdays: "grid grid-cols-7",
          weekday: "text-center text-xs text-muted-foreground py-1",
          weeks: "",
          week: "grid grid-cols-7",
          day: "text-center",
          day_button: "w-9 h-9 mx-auto rounded-full flex items-center justify-center text-sm hover:bg-muted transition-colors cursor-pointer",
          outside: "opacity-30",
          disabled: "opacity-30 cursor-default",
        }}
      />

      {selectedDate && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Sessions on {format(parseISO(selectedDate), "d MMMM yyyy")}
          </p>
          {sessionsForDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions on this day.</p>
          ) : (
            <div className="space-y-1">
              {sessionsForDay.map((s) => (
                <Link
                  key={s.id}
                  href={`/history/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium truncate">{s.routineTitle}</span>
                    <span className="text-muted-foreground shrink-0">
                      {s.startedAtLocal.slice(11, 16)} – {s.endedAtLocal.slice(11, 16)}
                    </span>
                    <span className="text-muted-foreground truncate">{s.goalTitle}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
