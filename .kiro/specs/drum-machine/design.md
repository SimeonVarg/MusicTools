# Design: Drum Machine

## T1: Euclidean Immediate Apply

Replace `onBlur` with `onChange` + debounce:

```tsx
const euclideanDebounce = useRef<ReturnType<typeof setTimeout>>()

function handleEuclideanChange(trackIdx: number, value: number) {
  clearTimeout(euclideanDebounce.current)
  euclideanDebounce.current = setTimeout(() => {
    dispatch({ type: 'APPLY_EUCLIDEAN', track: trackIdx, pulses: value })
  }, 250)
}

<input type="number" onChange={e => handleEuclideanChange(i, +e.target.value)} />
```

## T2: Presets (already in source)

The `PRESETS` record and `LOAD_PRESET` action already exist in DrumMachine.tsx. Verify the preset buttons are rendered and wired to `dispatch({ type: 'LOAD_PRESET', preset: name })`.

```tsx
const PRESET_NAMES: PresetName[] = ['4-on-floor','Backbeat','Bossa Nova','Shuffle','Breakbeat','Empty']

{PRESET_NAMES.map(name => (
  <button key={name} onClick={() => dispatch({ type: 'LOAD_PRESET', preset: name })}
    style={{ ... }}>
    {name}
  </button>
))}
```

## T3: Ring Labels

In the SVG circular display, add text labels near each ring:

```tsx
// For each track at ring radius r:
const labelAngle = -Math.PI / 2  // top of circle
const lx = cx + (r + 12) * Math.cos(labelAngle)
const ly = cy + (r + 12) * Math.sin(labelAngle)

<text x={lx} y={ly} textAnchor="middle" fontSize={9}
  fill={track.color} fontFamily="monospace">
  {track.name}
</text>
```

## T4: Swing Visualization

Even-numbered step dots offset clockwise by swing amount:

```ts
function stepAngle(stepIdx: number, stepCount: number, swing: number): number {
  const base = (stepIdx / stepCount) * Math.PI * 2
  const isEven = stepIdx % 2 === 1  // 0-indexed: odd index = even beat
  const offset = isEven ? (swing / 100) * (Math.PI * 2 / stepCount) * 0.5 : 0
  return base + offset
}
```

## State Shape (existing — no changes)
```ts
interface State { tracks: Track[]; bpm: number; swing: number; playing: boolean }
```
