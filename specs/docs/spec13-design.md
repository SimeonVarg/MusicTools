# Spec 13 Design: Scale Practice Mode

## Component: `src/tools/ScalePractice/ScalePractice.tsx`

## Scale Data
```ts
type Scale = {
  name: string
  intervals: number[]  // semitones from root
  pattern: string      // e.g. "W-W-H-W-W-W-H"
  description: string
  characteristic?: number[] // special interval indices to highlight
}

const SCALES: Scale[] = [
  { name: 'Major (Ionian)',    intervals: [0,2,4,5,7,9,11], pattern: 'W-W-H-W-W-W-H',
    description: 'The foundation of Western music. Bright and stable.' },
  { name: 'Dorian',            intervals: [0,2,3,5,7,9,10], pattern: 'W-H-W-W-W-H-W',
    description: 'Minor with ♮6. Jazz and Celtic folk staple.', characteristic: [5] },
  { name: 'Phrygian',          intervals: [0,1,3,5,7,8,10], pattern: 'H-W-W-W-H-W-W',
    description: 'Minor with ♭2. Spanish and metal.', characteristic: [1] },
  { name: 'Lydian',            intervals: [0,2,4,6,7,9,11], pattern: 'W-W-W-H-W-W-H',
    description: 'Major with ♯4. Dreamy and floating.', characteristic: [3] },
  { name: 'Mixolydian',        intervals: [0,2,4,5,7,9,10], pattern: 'W-W-H-W-W-H-W',
    description: 'Major with ♭7. Blues and rock.', characteristic: [6] },
  { name: 'Aeolian (Natural Minor)', intervals: [0,2,3,5,7,8,10], pattern: 'W-H-W-W-H-W-W',
    description: 'Natural minor. Melancholic and expressive.' },
  { name: 'Locrian',           intervals: [0,1,3,5,6,8,10], pattern: 'H-W-W-H-W-W-W',
    description: 'Diminished tonic. Unstable and rare.', characteristic: [4] },
  { name: 'Melodic Minor',     intervals: [0,2,3,5,7,9,11], pattern: 'W-H-W-W-W-W-H',
    description: 'Minor with ♮6 and ♮7 ascending. Jazz essential.' },
  { name: 'Harmonic Minor',    intervals: [0,2,3,5,7,8,11], pattern: 'W-H-W-W-H-A2-H',
    description: 'Minor with ♮7. Classical and Middle Eastern.', characteristic: [6] },
  { name: 'Major Pentatonic',  intervals: [0,2,4,7,9],       pattern: 'W-W-m3-W-m3',
    description: 'Five-note major scale. Universal and consonant.' },
  { name: 'Minor Pentatonic',  intervals: [0,3,5,7,10],      pattern: 'm3-W-W-m3-W',
    description: 'Five-note minor scale. Blues and rock foundation.' },
  { name: 'Blues',             intervals: [0,3,5,6,7,10],    pattern: 'm3-W-H-H-m3-W',
    description: 'Minor pentatonic + ♭5. The blues note.', characteristic: [3] },
  { name: 'Whole Tone',        intervals: [0,2,4,6,8,10],    pattern: 'W-W-W-W-W-W',
    description: 'All whole steps. Dreamy and ambiguous.' },
  { name: 'Diminished (W-H)', intervals: [0,2,3,5,6,8,9,11], pattern: 'W-H-W-H-W-H-W-H',
    description: 'Symmetric 8-note scale. Jazz over dim7 chords.' },
]
```

## Keyboard Visualization
Same SVG approach as Spec 12, but with scale highlighting:
```tsx
function getKeyColor(midi: number, rootMidi: number, scaleIntervals: number[]): string {
  const pc = (midi - rootMidi + 12) % 12
  if (pc === 0) return '#c084fc'  // root: bright purple
  if (scaleIntervals.includes(pc)) return '#7c3aed'  // scale note: purple
  return '#1e1e2e'  // non-scale: dark
}
```

## Quiz Mode
```ts
type QuizQuestion =
  | { type: 'degree'; degree: number; answer: number }  // "What is degree N?" → click key
  | { type: 'step'; from: number; to: number; answer: 'W'|'H' }  // "W or H between N and N+1?"

function generateQuestion(scale: Scale, rootMidi: number): QuizQuestion {
  if (Math.random() > 0.5) {
    const degree = Math.floor(Math.random() * scale.intervals.length)
    return { type: 'degree', degree, answer: rootMidi + scale.intervals[degree] }
  } else {
    const i = Math.floor(Math.random() * (scale.intervals.length - 1))
    const diff = scale.intervals[i+1] - scale.intervals[i]
    return { type: 'step', from: i, to: i+1, answer: diff === 2 ? 'W' : 'H' }
  }
}
```

## Audio Playback
```ts
async function playScale(direction: 'asc'|'desc'|'random') {
  const notes = scale.intervals.map(i => rootMidi + i)
  const ordered = direction === 'asc' ? notes
    : direction === 'desc' ? [...notes].reverse()
    : [...notes].sort(() => Math.random() - 0.5)
  
  for (let i = 0; i < ordered.length; i++) {
    await new Promise(r => setTimeout(r, 500))
    setPlayingNote(ordered[i])
    synth.triggerAttackRelease(midiToFreq(ordered[i]), '8n')
  }
  setPlayingNote(null)
}
```
