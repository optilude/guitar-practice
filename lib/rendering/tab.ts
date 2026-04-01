import type { GuitarScale } from "@/lib/theory/types"

// VexFlow is imported via ESM so that vitest's vi.mock("vexflow") intercepts it in tests.
// Components that call renderTab() should be loaded via next/dynamic with ssr:false to
// keep VexFlow out of the SSR bundle.
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

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(520, 130)
  const context = renderer.getContext()

  const stave = new TabStave(10, 10, 490)
  stave.addClef("tab").setContext(context).draw()

  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

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
}
