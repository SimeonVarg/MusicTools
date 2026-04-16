# Spec 15 Design: Harmonic Series Visualizer

## Component: `src/tools/HarmonicSeries/HarmonicSeries.tsx`

## Harmonic Data
```ts
const HARMONIC_INFO = [
  { n: 1,  interval: 'Fundamental',        significance: 'The root tone' },
  { n: 2,  interval: 'Octave (2:1)',        significance: 'First overtone, same pitch class' },
  { n: 3,  interval: 'P5 + octave (3:2)',   significance: 'Basis of the perfect fifth' },
  { n: 4,  interval: '2 Octaves (4:1)',     significance: 'Second octave' },
  { n: 5,  interval: 'M3 + 2 oct (5:4)',   significance: 'Basis of the major third' },
  { n: 6,  interval: 'P5 + 2 oct (3:2)',   significance: 'Reinforces the fifth' },
  { n: 7,  interval: 'Harm. 7th (7:4)',    significance: 'Flat minor 7th — not in 12-TET' },
  { n: 8,  interval: '3 Octaves (8:1)',     significance: 'Third octave' },
  { n: 9,  interval: 'M2 + 3 oct (9:8)',   significance: 'Basis of the major second' },
  { n: 10, interval: 'M3 + 3 oct (5:4)',   significance: 'Reinforces the major third' },
  { n: 11, interval: 'A4 + 3 oct (11:8)',  significance: '11th harmonic — between P4 and TT' },
  { n: 12, interval: 'P5 + 3 oct (3:2)',   significance: 'Reinforces the fifth again' },
  { n: 13, interval: 'm6 + 3 oct (13:8)',  significance: '13th harmonic — slightly flat m6' },
  { n: 14, interval: 'm7 + 3 oct (7:4)',   significance: 'Reinforces harmonic 7th' },
  { n: 15, interval: 'M7 + 3 oct (15:8)',  significance: 'Basis of the major seventh' },
  { n: 16, interval: '4 Octaves (16:1)',    significance: 'Fourth octave' },
]
```

## 3D Scene
```tsx
function HarmonicNode({ n, active, onClick, fundamental }: HarmonicNodeProps) {
  const freq = fundamental * n
  const height = Math.log2(n) * 2  // logarithmic height
  const radius = 0.3 / Math.sqrt(n) // smaller for higher harmonics
  const hue = (n / 16) * 360
  const color = active ? `hsl(${hue}, 80%, 60%)` : '#333'
  const orbitRadius = 2 + n * 0.3

  return (
    <mesh position={[Math.cos(n) * orbitRadius, height, Math.sin(n) * orbitRadius]}
      onClick={onClick}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} emissive={active ? color : '#000'} emissiveIntensity={0.5} />
    </mesh>
  )
}
```

## Waveform Canvas
```ts
function drawWaveform(canvas: HTMLCanvasElement, activeHarmonics: number[], fundamental: number) {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  const samples = width
  const period = 1 / fundamental
  const data = new Float32Array(samples)

  for (const n of activeHarmonics) {
    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * period
      data[i] += Math.sin(2 * Math.PI * fundamental * n * t) / n
    }
  }

  // Normalize and draw
  const max = Math.max(...data.map(Math.abs), 0.001)
  ctx.beginPath()
  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth = 2
  data.forEach((v, i) => {
    const x = i
    const y = height/2 - (v/max) * (height/2 - 4)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
}
```

## Timbre Presets
```ts
const PRESETS: Record<string, number[]> = {
  'Sine':     [1],
  'Square':   [1,3,5,7,9,11,13,15],
  'Sawtooth': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
  'Triangle': [1,3,5,7,9],
  'Clarinet': [1,3,5],
  'Brass':    [1,2,3,4,5,6,7,8],
}
```
