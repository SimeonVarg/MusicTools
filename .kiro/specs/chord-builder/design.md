# Design: Chord Builder

## Component: ChordBuilder.tsx

### T1: Click-to-Play
Read existing ChordCard component. Add `onClick` that calls `playChord(chord.notes)`.

```ts
function playChord(notes: string[]): void {
  Tone.start()
  synthRef.current?.triggerAttackRelease(notes, '2n')
}
```

### T2: Contextual Tension Score
```ts
function contextualTension(chord: ChordDef, keyRoot: number, prevChord: ChordDef | null): number {
  const baseTension = TENSION_TABLE[chord.quality] // existing lookup
  const rootInterval = (chord.rootMidi - keyRoot + 12) % 12
  const intervalBonus = [0,0.5,0.2,0.3,0.1,0.2,0.4,0.1,0.3,0.2,0.4,0.3][rootInterval]
  const voiceLeadingBonus = prevChord
    ? avgSemitoneMotion(prevChord.notes, chord.notes) * 0.05
    : 0
  return Math.min(1, baseTension + intervalBonus + voiceLeadingBonus)
}
```

### T3: Voice Leading Arrows
```ts
interface VoiceLeadingArrow {
  voice: number      // 0=bass, 1=tenor, 2=alto, 3=soprano
  semitones: number  // signed: positive=up, negative=down
}

function computeVoiceLeading(from: string[], to: string[]): VoiceLeadingArrow[]
// Pairs voices by closest motion (greedy nearest-neighbor)
// Returns array of { voice, semitones }
```

Render as SVG arrows between two adjacent chord mini-keyboards.

### T4: Common Tone Highlighting
```ts
function commonTones(a: string[], b: string[]): Set<number> {
  const pcA = new Set(a.map(n => noteToMidi(n) % 12))
  const pcB = new Set(b.map(n => noteToMidi(n) % 12))
  return new Set([...pcA].filter(pc => pcB.has(pc)))
}
```

In mini keyboard: keys in `commonTones` set → gold fill `#ffd700`.

## Types
```ts
// No new top-level types needed — extend existing ChordDef with rootMidi
```

## Style Convention
All new UI elements use inline `style` objects. No Tailwind.
