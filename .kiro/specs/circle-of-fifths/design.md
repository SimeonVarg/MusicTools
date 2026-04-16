# Design: Circle of Fifths

## Status
The chord ring bug is already fixed in the current source. `getDiatonicChords()` returns exactly 7 `ChordInfo` objects and they are rendered as 7 card divs below the SVG — not mapped to 12 slices. Verification only needed.

## Existing Implementation (correct)

```ts
interface ChordInfo {
  degree: string   // 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'
  symbol: string   // e.g. 'Cmaj7'
  quality: 'maj' | 'min' | 'dim'
  notes: string[]  // [root, third, fifth] in octave 4
}

function getDiatonicChords(rootIdx: number, mode: Mode): ChordInfo[]
// Returns array of length 7 — one per scale degree
```

## Chord Ring Rendering (current — correct)
```tsx
// 7 card divs, not 12 slices:
{diatonicChords.map((chord, i) => (
  <div key={i} onClick={() => handleDiatonicCardClick(chord, i)} ...>
    <div>{chord.degree}</div>
    <div>{chord.symbol}</div>
  </div>
))}
```

## Minor Key Audio (current — correct)
```ts
const MINOR_KEY_NOTES: Record<Key, string[]> = {
  C: ['C4','Eb4','G4'], // [0,3,7] semitones = minor triad
  ...
}
handleMinorKeyClick → synth.triggerAttackRelease(MINOR_KEY_NOTES[key], '2n')
```

## Mode Selector (current — correct)
- 7 mode buttons rendered above wheel
- `inModeKeys` set computed from `MODE_INTERVALS[mode]`
- Slices not in mode rendered at `opacity={0.3}`

## No Changes Required
All spec 1 tasks are already implemented correctly in the current source.
