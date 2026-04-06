interface NotesPanelProps {
  value: string
  onChange: (value: string) => void
}

export function NotesPanel({ value, onChange }: NotesPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Session notes</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Note anything useful from this session…"
        className="flex-1 w-full resize-none rounded-md border border-border bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-accent min-h-[200px]"
      />
    </div>
  )
}
