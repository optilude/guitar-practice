declare module "@tombatossals/react-chords/lib/Chord" {
  interface ChordData {
    frets: number[]
    fingers: number[]
    baseFret: number
    barres: number[]
    capo?: boolean
  }

  interface InstrumentData {
    strings: number
    fretsOnChord: number
    name: string
    keys?: string[]
    tunings: {
      standard: string[]
    }
  }

  interface ChordProps {
    chord: ChordData
    instrument: InstrumentData
    lite?: boolean
  }

  const Chord: (props: ChordProps) => import("react").ReactElement | null
  export default Chord
}
