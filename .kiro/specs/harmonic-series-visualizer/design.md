# Design: Harmonic Series Visualizer

## File: src/tools/HarmonicSeries/HarmonicSeries.tsx

## 3D Scene Structure

```tsx
// R3F Canvas with 16 harmonic spheres
// Y position: n * 0.6 (harmonic number × spacing)
// Sphere radius: 0.25
// Color: HARMONIC_COLORS[i] (warm→cool)

function HarmonicNode({ n, active, onClick }: { n:number; active:boolean; onClick:()=>void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({clock}) => {
    if (meshRef.current && active) {
      meshRef.current.scale.setScalar(1 + 0.1 * Math.sin(clock.elapsedTime * n * 2))
    }
  })
  return (
    <mesh ref={meshRef} position={[0, n * 0.6, 0]} onClick={onClick}>
      <sphereGeometry args={[0.25, 16, 16]} />
      <meshStandardMaterial color={HARMONIC_COLORS[n-1]} emissive={active ? HARMONIC_COLORS[n-1] : '#000'} emissiveIntensity={active ? 0.5 : 0} />
    </mesh>
  )
}
```

## Audio Engine

```ts
// One OscillatorNode per harmonic (Web Audio API directly for precision)
// Or: Tone.Oscillator array

const oscillators = useRef<(Tone.Oscillator | null)[]>(Array(16).fill(null))

function toggleHarmonic(n: number, fundamental: number) {
  const i = n - 1
  if (oscillators.current[i]) {
    oscillators.current[i]!.stop().dispose()
    oscillators.current[i] = null
  } else {
    const osc = new Tone.Oscillator(fundamental * n, 'sine')
      .toDestination()
    osc.volume.value = -20 - (n-1) * 2  // amplitude 1/n approximation
    osc.start()
    oscillators.current[i] = osc
  }
}
```

## Waveform Canvas

```ts
// useEffect: draw combined waveform from active harmonics
// t from 0 to 2π, sample 512 points
// y = sum of active harmonics: sin(n * t) / n (sawtooth normalization)

function drawWaveform(canvas: HTMLCanvasElement, activeSet: Set<number>, fundamental: number) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0,0,W,H)
  ctx.beginPath()
  for (let px = 0; px < W; px++) {
    const t = (px / W) * Math.PI * 2
    let y = 0
    activeSet.forEach(n => { y += Math.sin(n * t) / n })
    const py = H/2 - y * (H/3)
    px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.strokeStyle = '#7af'
  ctx.lineWidth = 2
  ctx.stroke()
}
```

## Timbre Presets

```ts
const PRESETS: Record<string, number[]> = {
  'Sine':     [1],
  'Sawtooth': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
  'Square':   [1,3,5,7,9,11,13,15],
  'Custom':   [],
}
```

## Teaching Panel

```ts
const HARMONIC_NAMES = [
  'Fundamental','Octave','P5 + 8va','2 Octaves',
  'M3 + 2×8va','P5 + 2×8va','Harm. 7th','3 Octaves',
  'M2 + 3×8va','M3 + 3×8va','A4 + 3×8va','P5 + 3×8va',
  'm7 + 3×8va','M7 + 3×8va','M7 + 3×8va','4 Octaves',
]
```
