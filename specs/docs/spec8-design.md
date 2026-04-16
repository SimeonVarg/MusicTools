# Spec 8 Design: Spectrum Analyzer — Smoothing Control + 3D Orbit

## Component: `src/tools/SpectrumAnalyzer/SpectrumAnalyzer.tsx`

## Smoothing Slider
```tsx
const [smoothing, setSmoothing] = useState(0.8)

// Apply to analyser:
useEffect(() => {
  if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing
}, [smoothing])

// Render:
<label style={{ color: '#888', fontSize: 12 }}>
  Smoothing: {smoothing.toFixed(2)}
  <input type="range" min={0} max={0.99} step={0.01}
    value={smoothing}
    onChange={e => setSmoothing(+e.target.value)}
    style={{ marginLeft: 8, width: 120 }}
  />
</label>
```

## OrbitControls (3D Mode)
```tsx
import { OrbitControls } from '@react-three/drei'

// In the Canvas (3D mode only):
{mode === '3d' && (
  <Canvas>
    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    {/* existing 3D scene */}
  </Canvas>
)}
```
Add hint text below canvas: `"Drag to rotate · Scroll to zoom · Right-drag to pan"`

## Freeze Feature
```ts
const [frozen, setFrozen] = useState(false)
const frozenRef = useRef(false)

// In animation loop:
function animate() {
  if (!frozenRef.current) {
    analyser.getByteFrequencyData(dataArray)
    drawSpectrum(dataArray)
  }
  rafRef.current = requestAnimationFrame(animate)
}

// Toggle:
const toggleFreeze = () => {
  frozenRef.current = !frozenRef.current
  setFrozen(frozenRef.current)
}
```

## Band Energy Readout
```ts
const BANDS = [
  { name: 'Sub-bass', lo: 20,   hi: 60   },
  { name: 'Bass',     lo: 60,   hi: 250  },
  { name: 'Low-mid',  lo: 250,  hi: 500  },
  { name: 'Mid',      lo: 500,  hi: 2000 },
  { name: 'High-mid', lo: 2000, hi: 4000 },
  { name: 'Presence', lo: 4000, hi: 6000 },
  { name: 'Brilliance',lo: 6000,hi: 20000},
]

function getBandEnergy(data: Uint8Array, sampleRate: number, lo: number, hi: number): number {
  const nyquist = sampleRate / 2
  const loIdx = Math.floor(lo / nyquist * data.length)
  const hiIdx = Math.ceil(hi / nyquist * data.length)
  const slice = data.slice(loIdx, hiIdx)
  const avg = slice.reduce((a,b) => a+b, 0) / slice.length
  return 20 * Math.log10(avg / 255 + 1e-6) // dB
}
```

Render as a flex row of colored badges below the visualizer.
