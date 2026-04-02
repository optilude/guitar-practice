import { cn } from "@/lib/utils"

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  type: string       // chord type: "maj7", "7", "m7", "m7b5"
  isSelected: boolean
  onClick: () => void
}

function blockColors(type: string): {
  border: string; bg: string; text: string; sub: string
} {
  if (type === "maj7" || type === "")
    return { border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400",  sub: "text-green-700" }
  if (type === "7")
    return { border: "border-amber-700",  bg: "bg-amber-950",  text: "text-amber-400",  sub: "text-amber-700" }
  if (type === "m7")
    return { border: "border-blue-700",   bg: "bg-blue-950",   text: "text-blue-400",   sub: "text-blue-700" }
  if (type === "m7b5" || type === "dim7")
    return { border: "border-purple-700", bg: "bg-purple-950", text: "text-purple-400", sub: "text-purple-700" }
  return { border: "border-border", bg: "bg-card", text: "text-foreground", sub: "text-muted-foreground" }
}

export function ChordQualityBlock({
  roman,
  chordName,
  type,
  isSelected,
  onClick,
}: ChordQualityBlockProps) {
  const colors = blockColors(type)
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-lg px-3 py-2.5 text-center transition-all min-w-[68px] flex-shrink-0",
        colors.bg,
        isSelected
          ? cn("border-2 ring-2 ring-offset-1 ring-offset-background", colors.border)
          : cn("border", colors.border)
      )}
    >
      <span className={cn("text-[9px] font-medium mb-1", colors.sub)}>{roman}</span>
      <span className={cn("text-sm font-bold leading-tight", colors.text)}>{chordName}</span>
      <span className={cn("text-[9px] mt-1", colors.sub)}>{type}</span>
    </button>
  )
}
