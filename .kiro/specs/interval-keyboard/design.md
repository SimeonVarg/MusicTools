# Design: Interval Keyboard

## File: src/tools/IntervalKeyboard/IntervalKeyboard.tsx

## SVG Keyboard Layout (C3–B4, 2 octaves)

```ts
// White key: width=28, height=120; Black key: width=18, height=75
// 14 white keys per 2 octaves (C D E F G A B × 2)
const WHITE_KEYS = ['C','D','E','F','G','A','B']
const BLACK_OFFSETS: Record<string, number> = { C:18, D:46, F:74, G:102, A:130 }
// Black keys exist between: C-D, D-E, F-G, G-A, A-B

interface PianoKey {
  note: string   // 'C3', 'D#4', etc.
  midi: number
  isBlack: boolean
  x: number
  y: number
  width: number
  height: number
}
```

## Challenge State

```ts
interface Challenge {
  rootMidi: number    // MIDI number of root note
  rootNote: string    // e.g. 'E4'
  intervalName: string // e.g. 'Major 3rd'
  semitones: number   // e.g. 4
  direction: 'above' | 'below'
  answerMidi: number  // correct answer
}
```

## Difficulty Pools

```ts
const POOLS: Record<Difficulty, string[]> = {
  beginner:     ['P4','P5','P8','M2','M3'],
  intermediate: ['P1','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7'],
  advanced:     [...all 13 intervals, 'above' and 'below'],
}
```

## Key Click Handler

```ts
function handleKeyClick(midi: number) {
  playNote(midi)
  if (midi === challenge.answerMidi) {
    setFeedback({ midi, correct: true })
    setScore(s => s + 10)
    setStreak(s => s + 1)
    setTimeout(nextChallenge, 800)
  } else {
    setFeedback({ midi, correct: false })
    setStreak(0)
    setTimeout(() => setFeedback(null), 1200)
  }
}
```

## Key Colors

```ts
function keyColor(key: PianoKey): string {
  if (feedback?.midi === key.midi) return feedback.correct ? '#22c55e' : '#ef4444'
  if (key.midi === challenge?.rootMidi) return '#3b82f6'
  if (key.midi === challenge?.answerMidi && showAnswer) return '#fbbf24'
  return key.isBlack ? '#1a1a1a' : '#f5f5f5'
}
```

## Audio
```ts
const synth = useRef(new Tone.Synth({ oscillator:{type:'triangle'} }).toDestination())
function playNote(midi: number) {
  Tone.start()
  synth.current.triggerAttackRelease(Tone.Frequency(midi,'midi').toNote(), '4n')
}
```
