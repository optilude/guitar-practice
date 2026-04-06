interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
}

export function MetronomePanel({ bpm, isRunning, onBpmChange, onStart, onStop }: MetronomePanelProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">BPM</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onBpmChange(Math.max(20, bpm - 5))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          ▼
        </button>
        <span className="w-10 text-center font-medium tabular-nums text-sm">{bpm}</span>
        <button
          onClick={() => onBpmChange(Math.min(300, bpm + 5))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          ▲
        </button>
      </div>
      <button
        onClick={isRunning ? onStop : onStart}
        className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {isRunning ? "■ Stop" : "▶ Start"}
      </button>
    </div>
  )
}
