# Spec 9 Design: Tuner — Fix JI_RATIOS + Fix HarmonicBars + Fix JustVsET Math

## Component: `src/tools/Tuner/Tuner.tsx`

## Data Constants (Replace JI_RATIOS)
```ts
// Harmonic series: integer multiples of fundamental
const HARMONIC_RATIOS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

const HARMONIC_NAMES = [
  'Fundamental', 'Octave', 'P5+8va', '2 Octaves',
  'M3+2×8va', 'P5+2×8va', 'Harm. 7th', '3 Octaves',
  'M2+3×8va', 'M3+3×8va', 'A4+3×8va', 'P5+3×8va',
  'm7+3×8va', 'M7+3×8va', 'M7+3×8va', '4 Octaves'
]

// JI intervals for the 12 chromatic semitones
const JI_INTERVALS = [
  1/1,    // unison
  16/15,  // minor 2nd
  9/8,    // major 2nd
  6/5,    // minor 3rd
  5/4,    // major 3rd
  4/3,    // perfect 4th
  7/5,    // tritone (septimal)
  3/2,    // perfect 5th
  8/5,    // minor 6th
  5/3,    // major 6th
  7/4,    // harmonic 7th (minor 7th)
  15/8,   // major 7th
]

const INTERVAL_NAMES = [
  'Unison','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7'
]
```

## HarmonicBars Fix
```tsx
function HarmonicBars({ fundamental }: { fundamental: number }) {
  return (
    <div>
      <h4>Harmonic Series</h4>
      <p style={{ fontSize: 11, color: '#666' }}>Integer multiples of the fundamental frequency</p>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
        {HARMONIC_RATIOS.map((n, i) => {
          const freq = fundamental * n
          const height = Math.max(4, 80 - i * 4) // decreasing height
          return (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 16, height, background: `hsl(${270 - i*10}, 70%, 60%)`, borderRadius: 2 }} />
              <span style={{ fontSize: 8, color: '#888', marginTop: 2 }}>{n}/1</span>
              <span style={{ fontSize: 7, color: '#555' }}>{freq.toFixed(0)}Hz</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## JustVsET Fix
```tsx
function JustVsET({ fundamental }: { fundamental: number }) {
  return (
    <div>
      <h4>Just vs Equal Temperament</h4>
      <p style={{ fontSize: 11, color: '#666' }}>Cent differences between JI intervals and 12-TET</p>
      {JI_INTERVALS.map((ratio, i) => {
        const jiFreq = fundamental * ratio
        const etFreq = fundamental * Math.pow(2, i / 12)
        const cents = 1200 * Math.log2(jiFreq / etFreq)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 24, fontSize: 10, color: '#aaa' }}>{INTERVAL_NAMES[i]}</span>
            <span style={{ width: 40, fontSize: 10, color: '#888' }}>{ratio.toFixed(4)}</span>
            <div style={{
              width: Math.abs(cents) * 2, height: 8, borderRadius: 2,
              background: cents > 0 ? '#4ade80' : '#f87171',
              marginLeft: cents < 0 ? 0 : 40, marginRight: cents > 0 ? 0 : 40
            }} />
            <span style={{ fontSize: 10, color: cents === 0 ? '#4ade80' : '#fbbf24' }}>
              {cents > 0 ? '+' : ''}{cents.toFixed(1)}¢
            </span>
          </div>
        )
      })}
    </div>
  )
}
```
