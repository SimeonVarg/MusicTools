# Spec 12 Design: Interval Trainer Keyboard

## Component: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`

## Keyboard Layout
```ts
// C3 = MIDI 48, B4 = MIDI 71 (24 notes)
const KEYBOARD_START = 48 // C3
const KEYBOARD_END = 71   // B4
const BLACK_KEY_PCS = new Set([1,3,6,8,10]) // pitch classes

// White key positions (x offset in units)
const WHITE_KEY_WIDTH = 28
const BLACK_KEY_WIDTH = 18
const WHITE_KEY_HEIGHT = 100
const BLACK_KEY_HEIGHT = 62
```

## SVG Keyboard Render
```tsx
// First pass: white keys
// Second pass: black keys (on top)
const whiteKeys = notes.filter(n => !BLACK_KEY_PCS.has(n % 12))
const blackKeys = notes.filter(n => BLACK_KEY_PCS.has(n % 12))

// White key x position: count white keys before this note
function whiteKeyX(midi: number): number {
  const whitesBefore = Array.from({length: midi - KEYBOARD_START}, (_,i) => i + KEYBOARD_START)
    .filter(n => !BLACK_KEY_PCS.has(n % 12)).length
  return whitesBefore * WHITE_KEY_WIDTH
}
```

## Interval Data
```ts
const INTERVALS = [
  { name: 'Unison',    semitones: 0,  level: 1 },
  { name: 'P4',        semitones: 5,  level: 1 },
  { name: 'P5',        semitones: 7,  level: 1 },
  { name: 'Octave',    semitones: 12, level: 1 },
  { name: 'M3',        semitones: 4,  level: 2 },
  { name: 'm3',        semitones: 3,  level: 2 },
  { name: 'M6',        semitones: 9,  level: 2 },
  { name: 'm6',        semitones: 8,  level: 2 },
  { name: 'M2',        semitones: 2,  level: 3 },
  { name: 'm2',        semitones: 1,  level: 3 },
  { name: 'M7',        semitones: 11, level: 3 },
  { name: 'm7',        semitones: 10, level: 3 },
  { name: 'TT',        semitones: 6,  level: 4 },
]
```

## Challenge State
```ts
type Challenge = {
  rootMidi: number
  interval: typeof INTERVALS[0]
  direction: 'above' | 'below'
  targetMidi: number
}

function generateChallenge(level: number): Challenge {
  const pool = INTERVALS.filter(i => i.level <= level)
  const interval = pool[Math.floor(Math.random() * pool.length)]
  const direction = Math.random() > 0.5 ? 'above' : 'below'
  // Ensure target is within keyboard range
  const rootMidi = direction === 'above'
    ? KEYBOARD_START + Math.floor(Math.random() * (KEYBOARD_END - KEYBOARD_START - interval.semitones))
    : KEYBOARD_START + interval.semitones + Math.floor(Math.random() * (KEYBOARD_END - KEYBOARD_START - interval.semitones))
  const targetMidi = direction === 'above' ? rootMidi + interval.semitones : rootMidi - interval.semitones
  return { rootMidi, interval, direction, targetMidi }
}
```

## Key Color State
```ts
type KeyState = 'default' | 'root' | 'correct' | 'wrong' | 'reveal'
const [keyStates, setKeyStates] = useState<Record<number, KeyState>>({})
```
