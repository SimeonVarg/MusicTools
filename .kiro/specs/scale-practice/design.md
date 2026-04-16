# Design: Scale Practice

## File: src/tools/ScalePractice/ScalePractice.tsx

## Scale Data Structure

```ts
interface ScaleDef {
  name: string
  intervals: number[]   // semitones from root
  steps: string         // e.g. 'W W H W W W H'
}

const SCALES: ScaleDef[] = [
  { name:'Major',           intervals:[0,2,4,5,7,9,11],  steps:'W W H W W W H' },
  { name:'Natural Minor',   intervals:[0,2,3,5,7,8,10],  steps:'W H W W H W W' },
  { name:'Dorian',          intervals:[0,2,3,5,7,9,10],  steps:'W H W W W H W' },
  { name:'Phrygian',        intervals:[0,1,3,5,7,8,10],  steps:'H W W W H W W' },
  { name:'Lydian',          intervals:[0,2,4,6,7,9,11],  steps:'W W W H W W H' },
  { name:'Mixolydian',      intervals:[0,2,4,5,7,9,10],  steps:'W W H W W H W' },
  { name:'Locrian',         intervals:[0,1,3,5,6,8,10],  steps:'H W W H W W W' },
  { name:'Melodic Minor',   intervals:[0,2,3,5,7,9,11],  steps:'W H W W W W H' },
  { name:'Harmonic Minor',  intervals:[0,2,3,5,7,8,11],  steps:'W H W W H A H' },
  { name:'Major Pentatonic',intervals:[0,2,4,7,9],        steps:'W W m3 W m3' },
  { name:'Minor Pentatonic',intervals:[0,3,5,7,10],       steps:'m3 W W m3 W' },
  { name:'Blues',           intervals:[0,3,5,6,7,10],     steps:'m3 W H H m3 W' },
]
```

## Keyboard Visualization

Reuse the same SVG piano key layout from IntervalKeyboard design (C3–B4).

```ts
function getScaleNotes(rootPc: number, scale: ScaleDef): Set<number> {
  return new Set(scale.intervals.map(i => (rootPc + i) % 12))
}

// Key color:
function keyColor(key: PianoKey, scalePcs: Set<number>, rootPc: number): string {
  const pc = key.midi % 12
  if (pc === rootPc) return '#fbbf24'        // root = gold
  if (scalePcs.has(pc)) return '#7c3aed'     // scale note = purple
  return key.isBlack ? '#1a1a1a' : '#f5f5f5' // non-scale = default
}
```

## Quiz Mode

```ts
interface QuizQuestion {
  degreeIndex: number   // 0–6 (or 0–4 for pentatonic)
  correctNote: string   // e.g. 'B'
  choices: string[]     // 4 note names
}

function generateQuestion(rootPc: number, scale: ScaleDef): QuizQuestion {
  const degreeIndex = Math.floor(Math.random() * scale.intervals.length)
  const correctPc = (rootPc + scale.intervals[degreeIndex]) % 12
  const correctNote = NOTE_NAMES[correctPc]
  const choices = shuffle([correctNote, ...randomNotes(3, correctNote)])
  return { degreeIndex, correctNote, choices }
}
```

## Audio Playback

```ts
async function playScale(direction: 'asc' | 'desc') {
  await Tone.start()
  const notes = scale.intervals.map(i => {
    const midi = rootMidi + i
    return Tone.Frequency(midi, 'midi').toNote()
  })
  if (direction === 'desc') notes.reverse()
  const seq = new Tone.Sequence((time, note) => {
    synth.triggerAttackRelease(note, '8n', time)
  }, notes, '8n')
  seq.loop = false
  Tone.Transport.start()
  seq.start(0)
}
```
