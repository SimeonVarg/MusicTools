# Design: Galaxy Map

## T1: Reduce MDS Iterations

In the `useMemo` that computes positions, change iterations from 80 to 40:

```ts
const positions = useMemo(() => {
  return computeMDS(SCALES, 40)  // was 80
}, [])  // no deps — SCALES is static
```

## T2: Scale Descriptions (already in source)

The `SCALES` array already has `description` fields. Verify the info panel renders `selectedScale.description`.

```tsx
{selectedScale && (
  <div style={{ fontSize:12, color:'#aaa', fontStyle:'italic', marginTop:4 }}>
    {selectedScale.description}
  </div>
)}
```

## T3: Threshold Slider

Add `threshold` to state (default 0.6):
```ts
const [threshold, setThreshold] = useState(0.6)
```

Add slider to controls bar:
```tsx
<label style={{ fontSize:11, color:'#666' }}>
  Similarity: {threshold.toFixed(2)}
  <input type="range" min={0.3} max={0.9} step={0.05}
    value={threshold}
    onChange={e => setThreshold(+e.target.value)}
    style={{ marginLeft:8, width:100, accentColor:'#7af' }} />
</label>
```

Pass `threshold` to the connection-line rendering logic (replace hardcoded 0.6).

## T4: Compare Mode

```ts
const [compareScale, setCompareScale] = useState<ScaleData | null>(null)

// On node click:
function handleNodeClick(scale: ScaleData, e: React.MouseEvent) {
  if (e.shiftKey) {
    setCompareScale(prev => prev?.id === scale.id ? null : scale)
  } else {
    setSelected(scale)
  }
}
```

Shared notes between selected and compareScale:
```ts
const sharedNotes = compareScale
  ? new Set(selectedScale.intervals.filter(i => compareScale.intervals.includes(i)))
  : null
```

Render shared notes green, different notes red in the note display panel.

```tsx
{compareScale && (
  <button onClick={() => setCompareScale(null)} style={{ ... }}>
    Clear Compare
  </button>
)}
```
