# Design: Rhythm Trainer

## File: src/tools/RhythmTrainer/RhythmTrainer.tsx

## Pattern Data

```ts
interface RhythmPattern {
  name: string
  difficulty: 1 | 2 | 3 | 4 | 5
  beats: number        // total beats
  subdivisions: number // subdivisions per beat
  taps: number[]       // subdivision indices where taps are expected
}

const PATTERNS: RhythmPattern[] = [
  { name:'Quarter Notes',  difficulty:1, beats:4, subdivisions:1, taps:[0,1,2,3] },
  { name:'Eighth Notes',   difficulty:2, beats:4, subdivisions:2, taps:[0,1,2,3,4,5,6,7] },
  { name:'Dotted Quarter', difficulty:3, beats:4, subdivisions:2, taps:[0,3,6] },
  { name:'Syncopated',     difficulty:4, beats:4, subdivisions:2, taps:[0,1,3,4,6] },
  { name:'Triplets',       difficulty:3, beats:4, subdivisions:3, taps:[0,1,2,3,4,5,6,7,8,9,10,11] },
]
```

## Metronome Engine

```ts
// Use Tone.Transport + Tone.Sequence for click track
// Beat click: high-pitched synth for downbeat, low for upbeat
const clickSynth = new Tone.Synth({ oscillator:{type:'triangle'}, envelope:{attack:0.001,decay:0.1,sustain:0,release:0.1} })

function startMetronome(bpm: number, pattern: RhythmPattern) {
  Tone.Transport.bpm.value = bpm
  const subDur = `${4 / pattern.subdivisions}n`
  const seq = new Tone.Sequence((time, idx) => {
    const isDownbeat = idx % pattern.subdivisions === 0
    clickSynth.triggerAttackRelease(isDownbeat ? 'C5' : 'G4', '32n', time)
    setCurrentSub(idx)
  }, Array.from({length: pattern.beats * pattern.subdivisions}, (_,i) => i), subDur)
  seq.start(0)
  Tone.Transport.start()
}
```

## Tap Handler

```ts
interface TapResult {
  expectedTime: number  // ms from start
  actualTime: number    // ms from start
  error: number         // ms, signed
  grade: 'Perfect' | 'Good' | 'OK' | 'Miss'
}

function gradeTap(error: number): TapResult['grade'] {
  const abs = Math.abs(error)
  if (abs <= 20) return 'Perfect'
  if (abs <= 50) return 'Good'
  if (abs <= 100) return 'OK'
  return 'Miss'
}
```

## Accuracy Timeline (SVG)

```tsx
// SVG: width=100%, height=60
// Expected beats: circles at x = (expectedTime / totalTime) * width
// Actual taps: triangles at x = (actualTime / totalTime) * width
// Color: green=Perfect, yellow=Good, orange=OK, red=Miss
```

## Score Calculation

```ts
const GRADE_POINTS = { Perfect:100, Good:70, OK:40, Miss:0 }
const finalGrade = (totalPoints / maxPoints) >= 0.9 ? 'A'
  : >= 0.75 ? 'B' : >= 0.6 ? 'C' : 'F'
```
