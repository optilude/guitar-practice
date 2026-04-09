export const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
  { label: "9/8", beats: 9 },
  { label: "12/8", beats: 12 },
] as const

export type TimeSig = typeof TIME_SIGNATURES[number]
export const DEFAULT_BEATS_PER_BAR = 4
