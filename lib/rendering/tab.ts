import type { GuitarScale } from "@/lib/theory/types"

// VexFlow is imported via ESM so that vitest's vi.mock("vexflow") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
//
// IMPORTANT: Before modifying this file, check the actual VexFlow API:
//   node_modules/vexflow/build/types/src/index.d.ts
// VexFlow 5.x uses named exports directly.
import * as VexFlow from "vexflow"

const { Renderer, TabStave, TabNote, Formatter } = VexFlow as unknown as {
  Renderer: any
  TabStave: any
  TabNote: any
  Formatter: any
}

/**
 * Renders a single scale position as guitar tablature (ascending) into containerEl.
 * Clears the container first. Safe to call multiple times.
 */
export function renderTab(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number
): void {
  containerEl.innerHTML = ""

  // Guard: early exit for empty/invalid positions
  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(520, 160)
  const context = renderer.getContext()

  const stave = new TabStave(10, 25, 490)
  stave.addClef("tab").setContext(context).draw()

  // Sort ascending: low strings (6) first, then by fret
  const sorted = [...scalePosition.positions].sort(
    (a, b) => b.string - a.string || a.fret - b.fret
  )

  const notes = sorted.map(
    (p) =>
      new TabNote({
        positions: [{ str: p.string, fret: String(p.fret) }],
        duration: "q",
      })
  )

  Formatter.FormatAndDraw(context, stave, notes)

  // Auto-crop: set the viewBox to the actual rendered content so VexFlow's
  // internal top-padding doesn't leave dead whitespace above the stave.
  const svgEl = containerEl.querySelector("svg")
  if (svgEl) {
    try {
      const bbox = (svgEl as SVGSVGElement).getBBox()
      const pad = 8
      svgEl.setAttribute(
        "viewBox",
        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
      )
      svgEl.setAttribute("height", String(Math.round(bbox.height + pad * 2)))
    } catch {
      // getBBox unavailable in non-browser environments (e.g. jsdom without layout)
    }
  }
}
