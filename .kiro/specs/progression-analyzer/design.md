# Design: Progression Analyzer

## File: src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx

## Data Structures

```ts
interface ParsedChord {
  root: string        // 'C', 'F#', 'Bb', etc.
  quality: string     // 'maj7', 'm7', '7', 'dim', etc.
  rootMidi: number    // 0–11 pitch class
}

interface AnalyzedChord extends ParsedChord {
  romanNumeral: string  // 'I', 'ii', 'V7', '♭VII', etc.
  function: 'T' | 'S' | 'D' | '?'
}
```

## T1: Chord Parser

```ts
const NOTE_MAP: Record<string, number> = {
  C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5,
  'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11
}
const QUALITY_RE = /^([A-G][b#]?)(maj7|maj|m7b5|m7|m|dim7|dim|aug|sus2|sus4|7|)$/

function parseChord(token: string): ParsedChord | null {
  const m = token.match(QUALITY_RE)
  if (!m) return null
  return { root: m[1], quality: m[2] || 'maj', rootMidi: NOTE_MAP[m[1]] }
}
```

## T2: Key Detection

```ts
// Diatonic pitch classes for each of 12 major keys
function detectKey(chords: ParsedChord[]): number {
  let best = 0, bestScore = -1
  for (let k = 0; k < 12; k++) {
    const diatonic = new Set([0,2,4,5,7,9,11].map(i => (k+i)%12))
    const score = chords.filter(c => diatonic.has(c.rootMidi)).length
    if (score > bestScore) { bestScore = score; best = k }
  }
  return best  // pitch class 0–11
}
```

## T3: Roman Numeral + Function

```ts
const DEGREE_ROMAN = ['I','II','III','IV','V','VI','VII']
const FUNC_MAP: Record<number, 'T'|'S'|'D'> = {0:'T',2:'D',4:'T',5:'S',7:'D',9:'T',11:'D'}

function analyzeChord(chord: ParsedChord, keyPc: number): AnalyzedChord {
  const interval = (chord.rootMidi - keyPc + 12) % 12
  const degreeIdx = [0,2,4,5,7,9,11].indexOf(interval)
  const roman = degreeIdx >= 0
    ? DEGREE_ROMAN[degreeIdx] + (chord.quality.includes('m') ? '' : '')
    : `♭${DEGREE_ROMAN[Math.round(interval/2)] ?? interval}`
  return { ...chord, romanNumeral: roman, function: FUNC_MAP[interval] ?? '?' }
}
```

## T4: Voice Leading Graph (D3)

```tsx
// useEffect with D3 line chart
// X: chord index (0..n-1), Y: MIDI pitch of each voice
// 4 lines: bass (root), tenor (3rd), alto (5th), soprano (7th if present)
// SVG width: 100%, height: 120px
```

## T5: Substitution Suggestions

```ts
function getSubs(chord: AnalyzedChord, keyPc: number): string[] {
  const subs: string[] = []
  if (chord.function === 'D') {
    const tritoneRoot = (chord.rootMidi + 6) % 12
    subs.push(`${NOTE_NAMES[tritoneRoot]}7 (tritone sub)`)
  }
  if (chord.quality.startsWith('m')) {
    const relMajRoot = (chord.rootMidi + 3) % 12
    subs.push(`${NOTE_NAMES[relMajRoot]}maj (relative major)`)
  }
  return subs
}
```

## T6: Audio Playback

```ts
// PolySynth, play each chord for '2n' at 80 BPM
// Use Tone.Transport + Tone.Part for sequenced playback
```

## Layout
Single column: input → analysis table → D3 graph → substitutions → play button.
All inline styles, no Tailwind.
