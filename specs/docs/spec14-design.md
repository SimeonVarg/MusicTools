# Spec 14 Design: Rhythm Trainer

## Component: `src/tools/RhythmTrainer/RhythmTrainer.tsx`

## Pattern Data
```ts
type RhythmPattern = {
  name: string
  level: number
  timeSignature: [number, number]  // [beats, noteValue]
  bpm: number
  beats: number[]  // beat positions in quarter notes (0 = bar start)
  description: string
}

const PATTERNS: RhythmPattern[] = [
  { name: 'Quarter Notes', level: 1, timeSignature: [4,4], bpm: 80,
    beats: [0, 1, 2, 3], description: 'Four quarter notes per bar' },
  { name: 'Eighth Notes', level: 2, timeSignature: [4,4], bpm: 80,
    beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], description: 'Eight eighth notes per bar' },
  { name: 'Dotted Quarter', level: 3, timeSignature: [4,4], bpm: 70,
    beats: [0, 1.5, 2, 3.5], description: 'Dotted quarter + eighth pattern' },
  { name: 'Syncopation', level: 3, timeSignature: [4,4], bpm: 75,
    beats: [0, 0.5, 1.5, 2, 2.5, 3.5], description: 'Off-beat emphasis' },
  { name: 'Triplets', level: 4, timeSignature: [4,4], bpm: 80,
    beats: [0, 1/3, 2/3, 1, 4/3, 5/3, 2, 7/3, 8/3, 3, 10/3, 11/3],
    description: 'Eighth note triplets' },
  { name: '5/4 Pattern', level: 4, timeSignature: [5,4], bpm: 80,
    beats: [0, 1, 2, 3, 4], description: 'Five beats per bar' },
]
```

## Metronome Engine
```ts
// Tone.js Transport scheduling
const schedulePattern = (pattern: RhythmPattern) => {
  const secPerBeat = 60 / bpm
  const barDuration = pattern.timeSignature[0] * secPerBeat

  // Count-in: 1 bar of clicks
  for (let i = 0; i < pattern.timeSignature[0]; i++) {
    Tone.Transport.schedule(time => {
      clickSynth.triggerAttackRelease(i === 0 ? 'C5' : 'G4', '32n', time)
    }, `+${i * secPerBeat}`)
  }

  // Pattern beats
  pattern.beats.forEach((beat, idx) => {
    const time = barDuration + beat * secPerBeat
    expectedBeatsRef.current.push(Tone.Transport.now() + time)
    Tone.Transport.schedule(time => {
      setCurrentBeat(idx)
    }, `+${time}`)
  })
}
```

## Tap Timing
```ts
const handleTap = () => {
  const now = performance.now()
  const nearest = expectedBeatsRef.current.reduce((best, t) =>
    Math.abs(t * 1000 - now) < Math.abs(best * 1000 - now) ? t : best
  )
  const diffMs = now - nearest * 1000
  const accuracy = Math.abs(diffMs) < 100 ? 'correct' : Math.abs(diffMs) < 200 ? 'close' : 'miss'
  setTaps(prev => [...prev, { time: now, diff: diffMs, accuracy }])
}

useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); handleTap() } }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

## Accuracy Timeline (SVG)
```tsx
// SVG timeline: expected beats as vertical lines, taps as colored dots
<svg width={400} height={60}>
  {expectedBeats.map((t, i) => (
    <line key={i} x1={xScale(t)} x2={xScale(t)} y1={10} y2={50}
      stroke="#333" strokeWidth={1} />
  ))}
  {taps.map((tap, i) => (
    <circle key={i} cx={xScale(tap.time)} cy={30} r={5}
      fill={tap.accuracy === 'correct' ? '#4ade80' : tap.accuracy === 'close' ? '#fbbf24' : '#f87171'} />
  ))}
</svg>
```
