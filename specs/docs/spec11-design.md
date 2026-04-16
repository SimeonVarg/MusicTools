# Spec 11 Design: Chord Progression Analyzer

## Component: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`

## Chord Parser
```ts
type ParsedChord = {
  raw: string
  root: number        // 0-11 (C=0)
  quality: string     // 'maj'|'min'|'dom7'|'maj7'|'min7'|'dim'|'hdim'|'aug'
  extensions: number[] // [9, 11, 13]
  alterations: string[] // ['b9', '#11']
  valid: boolean
}

const CHORD_REGEX = /^([A-G][b#]?)(m|maj|M|dim|aug|ø|°)?(7|maj7|M7|9|11|13)?([b#]\d+)*$/

function parseChord(raw: string): ParsedChord { ... }
```

## Key Detection
```ts
const MAJOR_SCALE_INTERVALS = [0,2,4,5,7,9,11]

function detectKey(chords: ParsedChord[]): { root: number; mode: 'major'|'minor' } {
  let best = { root: 0, mode: 'major' as const, score: -1 }
  for (let root = 0; root < 12; root++) {
    for (const mode of ['major', 'minor'] as const) {
      const scale = MAJOR_SCALE_INTERVALS.map(i => (root + i) % 12)
      const score = chords.filter(c => scale.includes(c.root)).length
      if (score > best.score) best = { root, mode, score }
    }
  }
  return best
}
```

## Roman Numeral Analysis
```ts
function getRomanNumeral(chordRoot: number, keyRoot: number, mode: string): string {
  const degree = (chordRoot - keyRoot + 12) % 12
  const DEGREE_MAP: Record<number, string> = {
    0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII'
  }
  return DEGREE_MAP[degree] ?? `♭${DEGREE_MAP[(degree+1)%12] ?? '?'}`
}

function getFunction(roman: string): 'T'|'S'|'D' {
  if (['I','III','VI'].includes(roman)) return 'T'
  if (['II','IV'].includes(roman)) return 'S'
  return 'D' // V, VII
}
```

## Voice Leading D3 Chart
```tsx
// Use D3 line generator
const xScale = d3.scaleLinear().domain([0, chords.length-1]).range([0, width])
const yScale = d3.scaleLinear().domain([36, 84]).range([height, 0])

const lineGen = d3.line<number>()
  .x((_, i) => xScale(i))
  .y(d => yScale(d))
  .curve(d3.curveCatmullRom)

// 4 voice lines: soprano, alto, tenor, bass
const VOICE_COLORS = ['#60a5fa','#4ade80','#fb923c','#f87171']
```

## Substitution Engine
```ts
function getSubs(chord: ParsedChord, keyRoot: number): string[] {
  const subs: string[] = []
  // Tritone sub for dominant 7th
  if (chord.quality === 'dom7') {
    const tritone = (chord.root + 6) % 12
    subs.push(`${NOTE_NAMES[tritone]}7 (tritone sub)`)
  }
  // Relative major/minor
  if (chord.quality === 'maj') subs.push(`${NOTE_NAMES[(chord.root+9)%12]}m (relative minor)`)
  if (chord.quality === 'min') subs.push(`${NOTE_NAMES[(chord.root+3)%12]} (relative major)`)
  return subs
}
```

## Layout
```
┌─────────────────────────────────────────────────────┐
│ [Text input: "Dm7 G7 Cmaj7 Am7"]  [Analyze] [Play] │
│ Key: C major (auto-detected)  [Key dropdown]        │
├─────────────────────────────────────────────────────┤
│ [Dm7]  [G7]   [Cmaj7]  [Am7]                       │
│  ii     V      I        vi                          │
│  S      D      T        T                           │
├─────────────────────────────────────────────────────┤
│ Voice Leading Chart (D3 SVG)                        │
├─────────────────────────────────────────────────────┤
│ Substitutions (collapsible per chord)               │
└─────────────────────────────────────────────────────┘
```
