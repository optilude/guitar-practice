"use client"

import { cn } from "@/lib/utils"

// The 12 major keys in circle-of-fifths order (starting from C)
const MAJOR_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]

// Relative minors for each major key (same order)
const RELATIVE_MINORS = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"]

// Diatonic chord offset → Roman numeral (relative to any tonic on the circle)
// The 7 diatonic keys of a major scale occupy offsets 0,1,2,3,4,5 (clockwise) and 11 (counter-clockwise)
const DIATONIC_ROMAN: Record<number, string> = {
  0: "I",
  1: "V",
  2: "ii",
  3: "vi",
  4: "iii",
  5: "vii°",
  11: "IV",
}

// Accidentals for each key, in circle-of-fifths order
const KEY_ACCIDENTALS: string[][] = [
  [],                                       // C
  ["F#"],                                   // G
  ["F#", "C#"],                            // D
  ["F#", "C#", "G#"],                      // A
  ["F#", "C#", "G#", "D#"],               // E
  ["F#", "C#", "G#", "D#", "A#"],         // B
  ["F#", "C#", "G#", "D#", "A#", "E#"],   // F#
  ["Bb", "Eb", "Ab", "Db", "Gb"],         // Db
  ["Bb", "Eb", "Ab", "Db"],               // Ab
  ["Bb", "Eb", "Ab"],                      // Eb
  ["Bb", "Eb"],                            // Bb
  ["Bb"],                                   // F
]

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
      x: parseFloat((cx + radius * Math.cos(rad)).toFixed(4)),
      y: parseFloat((cy + radius * Math.sin(rad)).toFixed(4)),
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
  const selectedIdx = MAJOR_KEYS.indexOf(selectedKey)

  return (
    <div className="flex justify-center">
      <svg
        width={400}
        height={400}
        viewBox="0 0 400 400"
        style={{ overflow: "visible" }}
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
                    : "fill-card dark:fill-[#2d2d2d] stroke-border hover:fill-muted dark:hover:fill-[#393939]"
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

              {/* Diatonic Roman numeral — inside the outer ring, below the key name */}
              {(() => {
                const offset = (i - selectedIdx + 12) % 12
                const roman = DIATONIC_ROMAN[offset]
                if (!roman) return null
                const romanPos = polarToCartesian(midAngle, labelOuterR - 17)
                return (
                  <text
                    x={romanPos.x}
                    y={romanPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    className={isSelected ? "fill-accent-foreground" : "fill-foreground"}
                  >
                    {roman}
                  </text>
                )
              })()}

              {/* Accidentals outside the outer ring — radius adjusted per angle so
                  the inner text edge stays a consistent ~8px from the ring. */}
              {(() => {
                const acc = KEY_ACCIDENTALS[i]
                if (acc.length === 0) return null
                const accText = acc.join(", ")
                const thetaRad = (midAngle * Math.PI) / 180
                // Estimated half-width at fontSize=7, ~4.4px per char
                const estHalfWidth = accText.length * 2.2
                const estHalfHeight = 3.5
                const r =
                  outerR +
                  8 +
                  estHalfWidth * Math.abs(Math.sin(thetaRad)) +
                  estHalfHeight * Math.abs(Math.cos(thetaRad))
                const pos = polarToCartesian(midAngle, r)
                return (
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7}
                    className="fill-muted-foreground"
                  >
                    {accText}
                  </text>
                )
              })()}

              {/* Inner ring slice (relative minor) */}
              <path
                d={slicePath(startAngle, endAngle, 55, innerR - 5)}
                className={cn(
                  "transition-colors",
                  isSelected
                    ? "fill-accent/20 dark:fill-accent/40 stroke-background"
                    : "fill-muted dark:fill-[#1e1e1e] stroke-border"
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
                className="fill-foreground/70 dark:fill-muted-foreground"
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
