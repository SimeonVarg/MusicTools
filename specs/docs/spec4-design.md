# Spec 4 Design: Drum Machine — Euclidean UX + Presets + Swing Viz

## Component: `src/tools/DrumMachine/DrumMachine.tsx`

## Euclidean Debounce
```ts
const euclidDebounceRef = useRef<ReturnType<typeof setTimeout>>()

function handleEuclidChange(trackIdx: number, field: 'pulses'|'steps', value: number) {
  clearTimeout(euclidDebounceRef.current)
  euclidDebounceRef.current = setTimeout(() => {
    applyEuclidean(trackIdx, field, value)
  }, 300)
}
```
Replace `onBlur={applyEuclidean}` with `onChange={e => handleEuclidChange(..., +e.target.value)}`.

## Preset Data
```ts
const PRESETS = {
  '4-on-floor': {
    tracks: [
      { steps: 16, pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] }, // kick
      { steps: 16, pattern: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] }, // snare
      { steps: 16, pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }, // hihat
    ]
  },
  'backbeat': { ... },
  'bossa-nova': { ... },
  'shuffle': { ..., swing: 60 },
  'breakbeat': { ... },
  'empty': { tracks: Array(6).fill({ steps: 16, pattern: Array(16).fill(0) }) }
}
```

## Preset UI
```tsx
<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
  {Object.keys(PRESETS).map(name => (
    <button key={name} onClick={() => applyPreset(name)} style={{ ... }}>
      {name}
    </button>
  ))}
</div>
```

## Ring Labels (SVG)
In the SVG render loop, after drawing each ring:
```tsx
<text
  x={cx - ringRadius - 8}
  y={cy}
  textAnchor="end"
  fontSize={10}
  fill={track.color}
  dominantBaseline="middle"
>
  {track.name}
</text>
```

## Swing Dot Offset
For each active dot at step `i` on a ring:
```ts
const isEven = i % 2 === 1 // 0-indexed, so odd index = even beat
const swingOffset = isEven ? (swing / 100) * (2 * Math.PI / steps) * 0.5 : 0
const angle = (i / steps) * 2 * Math.PI - Math.PI / 2 + swingOffset
```
This shifts even-beat dots clockwise proportionally to swing amount.
