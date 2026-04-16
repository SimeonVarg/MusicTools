import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as Tone from 'tone'
import * as THREE from 'three'

/* ── T4: Harmonic info ── */
const HARMONIC_INFO = [
  { n: 1,  interval: 'Fundamental',       significance: 'The root tone' },
  { n: 2,  interval: 'Octave (2:1)',       significance: 'First overtone, same pitch class' },
  { n: 3,  interval: 'P5 + octave (3:2)', significance: 'Basis of the perfect fifth' },
  { n: 4,  interval: '2 Octaves (4:1)',    significance: 'Second octave' },
  { n: 5,  interval: 'M3 + 2 oct (5:4)',  significance: 'Basis of the major third' },
  { n: 6,  interval: 'P5 + 2 oct (3:2)',  significance: 'Reinforces the fifth' },
  { n: 7,  interval: 'Harm. 7th (7:4)',   significance: 'Flat minor 7th — not in 12-TET' },
  { n: 8,  interval: '3 Octaves (8:1)',    significance: 'Third octave' },
  { n: 9,  interval: 'M2 + 3 oct (9:8)',  significance: 'Basis of the major second' },
  { n: 10, interval: 'M3 + 3 oct (5:4)',  significance: 'Reinforces the major third' },
  { n: 11, interval: 'A4 + 3 oct (11:8)', significance: '11th harmonic — between P4 and TT' },
  { n: 12, interval: 'P5 + 3 oct (3:2)',  significance: 'Reinforces the fifth again' },
  { n: 13, interval: 'm6 + 3 oct (13:8)', significance: '13th harmonic — slightly flat m6' },
  { n: 14, interval: 'm7 + 3 oct (7:4)',  significance: 'Reinforces harmonic 7th' },
  { n: 15, interval: 'M7 + 3 oct (15:8)', significance: 'Basis of the major seventh' },
  { n: 16, interval: '4 Octaves (16:1)',   significance: 'Fourth octave' },
]

/* ── T5: Presets ── */
const PRESETS: Record<string, number[]> = {
  'Sine':     [1],
  'Square':   [1,3,5,7,9,11,13,15],
  'Sawtooth': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
  'Triangle': [1,3,5,7,9],
  'Clarinet': [1,3,5],
  'Brass':    [1,2,3,4,5,6,7,8],
}

/* ── T3: Draw waveform ── */
function drawWaveform(canvas: HTMLCanvasElement, activeHarmonics: Set<number>, fundamental: number) {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke()

  if (activeHarmonics.size === 0) return

  const samples = width
  const period = 1 / fundamental
  const data = new Float32Array(samples)
  for (const n of activeHarmonics) {
    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * period
      data[i] += Math.sin(2 * Math.PI * fundamental * n * t) / n
    }
  }
  let max = 0.001
  for (let i = 0; i < samples; i++) if (Math.abs(data[i]) > max) max = Math.abs(data[i])

  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < samples; i++) {
    const x = i
    const y = height / 2 - (data[i] / max) * (height / 2 - 4)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/* ── T1: Sphere mesh for one harmonic ── */
function HarmonicSphere({ n, active, onClick, onPointerOver, onPointerOut }: {
  n: number; active: boolean
  onClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
}) {
  const height = Math.log2(n) * 2
  const radius = 0.3 / Math.sqrt(n)
  const orbitRadius = 2 + n * 0.3
  const x = Math.cos(n * 0.8) * orbitRadius
  const z = Math.sin(n * 0.8) * orbitRadius
  const hue = (n / 16) * 360
  const color = active ? `hsl(${hue}, 80%, 60%)` : '#333'

  return (
    <mesh
      position={[x, height, z]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver() }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut() }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={active ? new THREE.Color(color) : new THREE.Color('#000')}
        emissiveIntensity={active ? 0.5 : 0}
      />
    </mesh>
  )
}

/* ── Main component ── */
export default function HarmonicSeries() {
  const [fundamental, setFundamental] = useState(110)
  const [activeHarmonics, setActiveHarmonics] = useState<Set<number>>(new Set([1]))
  const [hoveredN, setHoveredN] = useState<number | null>(null)
  const oscRefs = useRef<Map<number, Tone.Oscillator>>(new Map())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioStarted = useRef(false)

  /* T3: Redraw waveform on change */
  useEffect(() => {
    if (canvasRef.current) drawWaveform(canvasRef.current, activeHarmonics, fundamental)
  }, [activeHarmonics, fundamental])

  /* Update frequencies when fundamental changes */
  useEffect(() => {
    oscRefs.current.forEach((osc, n) => {
      osc.frequency.value = fundamental * n
    })
  }, [fundamental])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      oscRefs.current.forEach(osc => { osc.stop(); osc.dispose() })
      oscRefs.current.clear()
    }
  }, [])

  /* T2: Toggle harmonic */
  const toggleHarmonic = useCallback(async (n: number) => {
    if (!audioStarted.current) {
      await Tone.start()
      audioStarted.current = true
    }
    setActiveHarmonics(prev => {
      const next = new Set(prev)
      if (next.has(n)) {
        next.delete(n)
        const osc = oscRefs.current.get(n)
        if (osc) { osc.stop(); osc.dispose(); oscRefs.current.delete(n) }
      } else {
        next.add(n)
        const osc = new Tone.Oscillator(fundamental * n, 'sine')
        osc.volume.value = -20
        osc.connect(Tone.getDestination())
        osc.start()
        oscRefs.current.set(n, osc)
      }
      return next
    })
  }, [fundamental])

  /* T5: Apply preset */
  const applyPreset = useCallback(async (harmonics: number[]) => {
    if (!audioStarted.current) {
      await Tone.start()
      audioStarted.current = true
    }
    oscRefs.current.forEach(osc => { osc.stop(); osc.dispose() })
    oscRefs.current.clear()
    const next = new Set<number>()
    for (const n of harmonics) {
      next.add(n)
      const osc = new Tone.Oscillator(fundamental * n, 'sine')
      osc.volume.value = -20
      osc.connect(Tone.getDestination())
      osc.start()
      oscRefs.current.set(n, osc)
    }
    setActiveHarmonics(next)
  }, [fundamental])

  const panelInfo = hoveredN != null ? HARMONIC_INFO[hoveredN - 1] : null

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', color: '#ccc', fontFamily: 'monospace' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* T1: 3D Canvas */}
        <div style={{ flex: 1 }}>
          <Canvas camera={{ position: [6, 4, 10], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 10, 5]} intensity={1.5} />
            <OrbitControls />
            {HARMONIC_INFO.map(({ n }) => (
              <HarmonicSphere
                key={n} n={n}
                active={activeHarmonics.has(n)}
                onClick={() => toggleHarmonic(n)}
                onPointerOver={() => setHoveredN(n)}
                onPointerOut={() => setHoveredN(null)}
              />
            ))}
          </Canvas>
        </div>

        {/* T4: Side panel */}
        <div style={{ width: 280, background: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Controls */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #222' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', marginBottom: 10 }}>Harmonic Series</div>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              Fundamental: <strong>{fundamental} Hz</strong>
              <input type="range" min={55} max={440} value={fundamental}
                onChange={e => setFundamental(+e.target.value)}
                style={{ width: '100%', accentColor: '#a855f7', marginTop: 4 }} />
            </label>
            {/* T5: Preset buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(PRESETS).map(([name, harmonics]) => (
                <button key={name} onClick={() => applyPreset(harmonics)} style={{
                  background: '#1a1a2e', border: '1px solid #333', color: '#bbb',
                  borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                }}>{name}</button>
              ))}
            </div>
          </div>

          {/* Hover info or harmonic list */}
          {panelInfo ? (
            <div style={{ padding: '14px', fontSize: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: `hsl(${(panelInfo.n / 16) * 360}, 80%, 60%)`, marginBottom: 6 }}>H{panelInfo.n}</div>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>Freq: </span>{(fundamental * panelInfo.n).toFixed(1)} Hz</div>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>Interval: </span>{panelInfo.interval}</div>
              <div style={{ color: '#aaa', lineHeight: 1.5 }}>{panelInfo.significance}</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {HARMONIC_INFO.map(({ n, interval }) => {
                const active = activeHarmonics.has(n)
                const hue = (n / 16) * 360
                return (
                  <div key={n} onClick={() => toggleHarmonic(n)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
                      cursor: 'pointer', background: active ? 'rgba(168,85,247,0.1)' : 'transparent',
                      borderLeft: active ? `3px solid hsl(${hue},80%,60%)` : '3px solid transparent',
                    }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? `hsl(${hue},80%,60%)` : '#444', flexShrink: 0 }} />
                    <span style={{ width: 22, fontSize: 11, fontWeight: 700 }}>H{n}</span>
                    <span style={{ width: 52, fontSize: 10, color: '#888' }}>{(fundamental * n).toFixed(0)} Hz</span>
                    <span style={{ fontSize: 10, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{interval}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* T3: Waveform canvas */}
      <canvas ref={canvasRef} width={400} height={80}
        style={{ width: '100%', height: 80, display: 'block', borderTop: '1px solid #222' }} />
    </div>
  )
}
