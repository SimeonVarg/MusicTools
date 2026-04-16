# Spec 1 Design: Circle of Fifths — Chord Ring Fix + Mode Teaching

## Component: `src/tools/CircleOfFifths/CircleOfFifths.tsx`

## Data Model Changes

### Mode Data
```ts
const MODES = ['Ionian','Dorian','Phrygian','Lydian','Mixolydian','Aeolian','Locrian'] as const
const MODE_INTERVALS: Record<string, number[]> = {
  Ionian:     [0,2,4,5,7,9,11],
  Dorian:     [0,2,3,5,7,9,10],
  Phrygian:   [0,1,3,5,7,8,10],
  Lydian:     [0,2,4,6,7,9,11],
  Mixolydian: [0,2,4,5,7,9,10],
  Aeolian:    [0,2,3,5,7,8,10],
  Locrian:    [0,1,3,5,6,8,10],
}
const MODE_CHARACTER: Record<string, string> = {
  Ionian: 'Major scale — bright, stable',
  Dorian: 'Minor with ♮6 — jazzy, soulful',
  Phrygian: 'Minor with ♭2 — Spanish, dark',
  Lydian: 'Major with ♯4 — dreamy, floating',
  Mixolydian: 'Major with ♭7 — bluesy, dominant',
  Aeolian: 'Natural minor — melancholic',
  Locrian: 'Diminished tonic — unstable, rare',
}
```

### Diatonic Chord Generation
```ts
// Generate 7 diatonic chords from root + mode intervals
function getDiatonicChords(rootIdx: number, mode: string): ChordInfo[] {
  const intervals = MODE_INTERVALS[mode]
  return intervals.map((interval, degree) => {
    const root = (rootIdx + interval) % 12
    const third = (rootIdx + intervals[(degree + 2) % 7]) % 12
    const fifth = (rootIdx + intervals[(degree + 4) % 7]) % 12
    const quality = getTriadQuality(interval, degree, mode)
    return { root, third, fifth, quality, degree }
  })
}
```

## UI Layout Changes

### Mode Selector Bar
- Horizontal pill buttons below the wheel: `[Ionian] [Dorian] [Phrygian] ...`
- Active mode: purple background, white text
- Inactive: dark background, gray text

### Diatonic Chord Panel (replaces broken ring)
- 7 chord cards in a horizontal row below the mode selector
- Each card: Roman numeral (top), chord symbol (middle), quality badge (bottom)
- Cards are clickable → play chord via PolySynth
- Card highlight on click: 200ms white glow animation

### Mode Highlight on Wheel
- Wheel segments for notes IN the current mode: full opacity
- Wheel segments for notes NOT in the mode: 30% opacity
- Computed from `MODE_INTERVALS[selectedMode]` relative to selected root

### Minor Key Fix
```ts
// In the click handler for inner ring (minor keys):
const minorNotes = [rootMidi, rootMidi + 3, rootMidi + 7] // minor triad
synth.triggerAttackRelease(minorNotes.map(midiToFreq), '1n')
```

## State
```ts
const [selectedMode, setSelectedMode] = useState<string>('Ionian')
```
Existing `selectedKey` state drives both the wheel rotation and chord generation.
