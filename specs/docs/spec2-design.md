# Spec 2 Design: Chord Builder — Voice Leading + Click-to-Play + Dynamic Tension

## Component: `src/tools/ChordBuilder/ChordBuilder.tsx`

## Contextual Tension Algorithm
```ts
function computeTension(chord: ChordData, prevChord: ChordData | null, keyRoot: number): number {
  // Factor 1: interval from key root (0–1)
  const rootInterval = (chord.rootIdx - keyRoot + 12) % 12
  const INTERVAL_TENSION = [0, 0.9, 0.3, 0.5, 0.2, 0.1, 1.0, 0.1, 0.2, 0.4, 0.6, 0.8]
  const intervalScore = INTERVAL_TENSION[rootInterval]

  // Factor 2: root motion from previous chord (0–1)
  const motionScore = prevChord
    ? Math.min(1, Math.abs(chord.rootIdx - prevChord.rootIdx) / 6)
    : 0

  // Factor 3: chord quality (0–1)
  const QUALITY_TENSION: Record<string, number> = {
    maj: 0.0, maj7: 0.1, '6': 0.1,
    min: 0.3, min7: 0.3, m6: 0.3,
    dom7: 0.6, '9': 0.5, '13': 0.5,
    dim: 0.8, dim7: 0.9, aug: 0.7,
    alt: 1.0, '7b9': 0.95, '7#11': 0.85,
  }
  const qualityScore = QUALITY_TENSION[chord.quality] ?? 0.5

  return (intervalScore * 0.4 + motionScore * 0.3 + qualityScore * 0.3)
}
```

## Voice Leading Computation
```ts
function getVoiceLeading(chordA: number[], chordB: number[]): VoiceMove[] {
  // Take bottom 4 notes of each voicing (sorted ascending)
  const a = [...chordA].sort((x,y) => x-y).slice(0,4)
  const b = [...chordB].sort((x,y) => x-y).slice(0,4)
  return a.map((note, i) => {
    const diff = (b[i] ?? b[b.length-1]) - note
    return { semitones: diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' }
  })
}
```

## Common Tone Detection
```ts
function getCommonTones(chordA: number[], chordB: number[]): Set<number> {
  const pcA = new Set(chordA.map(n => n % 12))
  const pcB = new Set(chordB.map(n => n % 12))
  return new Set([...pcA].filter(n => pcB.has(n)))
}
```

## UI Changes

### ChordCard Click Handler
```tsx
<div onClick={() => playChord(chord.voicing)} style={{ cursor: 'pointer', ... }}>
```
Play: `synth.triggerAttackRelease(chord.voicing.map(midiToFreq), '2n')`

### Tension Bar
```tsx
<div style={{
  height: 4, borderRadius: 2,
  background: `hsl(${(1 - tension) * 120}, 80%, 50%)`,
  width: `${tension * 100}%`
}} />
```

### Voice Leading Arrows (between cards)
SVG `<svg width="24" height="60">` with arrow paths between each pair of adjacent cards.
Arrow color: `semitones <= 2 ? '#4ade80' : semitones <= 4 ? '#fbbf24' : '#f87171'`

### Mini Keyboard Common Tones
In the existing mini keyboard render, check if each pitch class is in `commonTones`:
- Common: `fillStyle = '#a855f7'` (bright purple)
- Non-common: `fillStyle = '#333'` (dim)
