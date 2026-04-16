# Design: Spectrum Analyzer

## T1: Smoothing Slider

Add `smoothing` to state (default 0.8):
```ts
const [smoothing, setSmoothing] = useState(0.8)
```

When analyser is created or smoothing changes:
```ts
useEffect(() => {
  if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing
}, [smoothing])
```

Render slider:
```tsx
<label style={{ fontSize:11, color:'#666' }}>
  Smoothing: {smoothing.toFixed(2)}
  <input type="range" min={0} max={0.99} step={0.01}
    value={smoothing} onChange={e => setSmoothing(+e.target.value)}
    style={{ marginLeft:8, width:100, accentColor:'#7af' }} />
</label>
```

## T2: OrbitControls in 3D Mode (already in source)

`OrbitControls` is already imported from `@react-three/drei` and used in the 3D Canvas. Verify it's active and add instruction text:

```tsx
{mode === '3d' && (
  <div style={{ fontSize:10, color:'#555', textAlign:'center', marginTop:4 }}>
    Drag to orbit · Scroll to zoom
  </div>
)}
```

## T3: Freeze Button

```ts
const [frozen, setFrozen] = useState(false)
const frozenRef = useRef(false)

// In animation loop:
const loop = () => {
  if (!frozenRef.current) {
    analyser.getByteFrequencyData(dataArray)
    draw(dataArray)
  }
  rafRef.current = requestAnimationFrame(loop)
}

// Toggle:
function toggleFreeze() {
  frozenRef.current = !frozenRef.current
  setFrozen(f => !f)
}
```

```tsx
<button onClick={toggleFreeze} style={{
  border: `1px solid ${frozen ? '#7af' : '#333'}`,
  color: frozen ? '#7af' : '#666', ...
}}>
  {frozen ? '⏸ Frozen' : '⏸ Freeze'}
</button>
```

## T4: Band Energy Readout

```ts
function getBandEnergy(dataArray: Uint8Array, sampleRate: number, fftSize: number, minHz: number, maxHz: number): number {
  const binHz = sampleRate / fftSize
  const lo = Math.floor(minHz / binHz)
  const hi = Math.ceil(maxHz / binHz)
  const slice = dataArray.slice(lo, hi)
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length
  return (avg / 255) * (MAX_DB - MIN_DB) + MIN_DB
}
```

Render below visualizer:
```tsx
<div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
  {BANDS.map(b => (
    <div key={b.label} style={{ fontSize:10, color:'#666', textAlign:'center' }}>
      <div style={{ color:'#aaa' }}>{bandEnergies[b.label].toFixed(1)} dB</div>
      <div>{b.label}</div>
    </div>
  ))}
</div>
```
