"use client"

import { cn } from "@/lib/utils"

// The 12 major keys in circle-of-fifths order (starting from C)
const MAJOR_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]

// Relative minors for each major key (same order)
const RELATIVE_MINORS = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"]

interface CircleOfFifthsProps {
  selectedKey: string
  onKeySelect: (tonic: string) => void
}

export function CircleOfFifths({ selectedKey, onKeySelect }: CircleOfFifthsProps) {
  const cx = 200
  const cy = 200
  const outerR = 160
  const innerR = 110
  const labelOuterR = 140
  const labelInnerR = 90

  // Generate SVG arc paths for each of the 12 slices
  function polarToCartesian(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  function slicePath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) {
    const s1 = polarToCartesian(startAngle, outerRadius)
    const e1 = polarToCartesian(endAngle, outerRadius)
    const s2 = polarToCartesian(endAngle, innerRadius)
    const e2 = polarToCartesian(startAngle, innerRadius)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
      `L ${s2.x} ${s2.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
      "Z",
    ].join(" ")
  }

  const sliceAngle = 360 / 12

  return (
    <div className="flex justify-center">
      <svg
        width={400}
        height={400}
        viewBox="0 0 400 400"
        role="img"
        aria-label="Circle of Fifths"
        className="max-w-full"
      >
        {MAJOR_KEYS.map((key, i) => {
          const startAngle = i * sliceAngle - sliceAngle / 2
          const endAngle = startAngle + sliceAngle
          const midAngle = i * sliceAngle
          const isSelected = key === selectedKey

          const outerLabelPos = polarToCartesian(midAngle, labelOuterR)
          const innerLabelPos = polarToCartesian(midAngle, labelInnerR)

          return (
            <g
              key={key}
              onClick={() => onKeySelect(key)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={`Select key ${key}`}
              aria-pressed={isSelected}
            >
              {/* Outer ring slice (major key) */}
              <path
                d={slicePath(startAngle, endAngle, innerR + 5, outerR)}
                className={cn(
                  "transition-colors",
                  isSelected
                    ? "fill-accent stroke-background"
                    : "fill-card stroke-border hover:fill-muted"
                )}
                strokeWidth={1.5}
              />
              {/* Major key label */}
              <text
                x={outerLabelPos.x}
                y={outerLabelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={isSelected ? "700" : "500"}
                className={isSelected ? "fill-accent-foreground" : "fill-foreground"}
              >
                {key}
              </text>

              {/* Inner ring slice (relative minor) */}
              <path
                d={slicePath(startAngle, endAngle, 55, innerR - 5)}
                className={cn(
                  "transition-colors",
                  isSelected
                    ? "fill-accent/20 stroke-background"
                    : "fill-muted stroke-border"
                )}
                strokeWidth={1}
              />
              {/* Relative minor label */}
              <text
                x={innerLabelPos.x}
                y={innerLabelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                className="fill-muted-foreground"
              >
                {RELATIVE_MINORS[i]}
              </text>
            </g>
          )
        })}

        {/* Centre label: selected key */}
        <circle cx={cx} cy={cy} r={48} className="fill-background stroke-border" strokeWidth={1} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={22}
          fontWeight="700"
          className="fill-foreground"
        >
          {selectedKey}
        </text>
      </svg>
    </div>
  )
}
