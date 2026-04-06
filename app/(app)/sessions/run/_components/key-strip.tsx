import { cn } from "@/lib/utils"

interface KeyStripProps {
  keys: string[]
  currentIndex: number
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
}

export function KeyStrip({ keys, currentIndex, onSelect, onPrev, onNext }: KeyStripProps) {
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) return null

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors",
              i === currentIndex
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
        <button
          onClick={onPrev}
          className="hover:text-foreground transition-colors disabled:opacity-40"
          aria-label="Previous key"
        >
          ←
        </button>
        <span>{currentIndex + 1}/{keys.length}</span>
        <button
          onClick={onNext}
          className="hover:text-foreground transition-colors"
          aria-label="Next key"
        >
          →
        </button>
      </div>
    </div>
  )
}
