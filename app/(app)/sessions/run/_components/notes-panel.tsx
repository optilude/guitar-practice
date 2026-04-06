interface NotesPanelProps {
  value: string
  onChange: (value: string) => void
}

export function NotesPanel({ value, onChange }: NotesPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Note anything useful from this session…"
        className="flex-1 w-full resize-none rounded-md border border-border bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-accent min-h-[120px]"
      />
    </div>
  )
}
