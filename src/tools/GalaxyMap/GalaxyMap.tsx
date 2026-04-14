import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// ─── Scale Database ───────────────────────────────────────────────────────────

type Mood = 'bright' | 'dark' | 'exotic'

interface ScaleData {
  id: number
  name: string
  intervals: number[]          // semitones from root
  mood: Mood
  genres: string[]
  characteristicNotes: string  // e.g. "raised 4th, flat 7th"
  popularity: number           // 1–5, drives star size
}

const SCALES: ScaleData[] = [
  { id: 0,  name: 'Major (Ionian)',        intervals: [0,2,4,5,7,9,11],    mood: 'bright',  genres: ['pop','classical','jazz'],       characteristicNotes: 'M3, M7',              popularity: 5 },
  { id: 1,  name: 'Natural Minor (Aeolian)',intervals: [0,2,3,5,7,8,10],   mood: 'dark',    genres: ['rock','classical','metal'],     characteristicNotes: 'm3, m6, m7',          popularity: 5 },
  { id: 2,  name: 'Dorian',                intervals: [0,2,3,5,7,9,10],   mood: 'dark',    genres: ['jazz','funk','rock'],           characteristicNotes: 'm3, M6',              popularity: 4 },
  { id: 3,  name: 'Phrygian',              intervals: [0,1,3,5,7,8,10],   mood: 'exotic',  genres: ['flamenco','metal','world'],     characteristicNotes: 'b2, m3',              popularity: 3 },
  { id: 4,  name: 'Lydian',                intervals: [0,2,4,6,7,9,11],   mood: 'bright',  genres: ['film','jazz','pop'],            characteristicNotes: '#4, M7',              popularity: 3 },
  { id: 5,  name: 'Mixolydian',            intervals: [0,2,4,5,7,9,10],   mood: 'bright',  genres: ['blues','rock','folk'],          characteristicNotes: 'M3, b7',              popularity: 4 },
  { id: 6,  name: 'Locrian',               intervals: [0,1,3,5,6,8,10],   mood: 'dark',    genres: ['metal','jazz'],                 characteristicNotes: 'b2, b5',              popularity: 2 },
  { id: 7,  name: 'Melodic Minor',         intervals: [0,2,3,5,7,9,11],   mood: 'dark',    genres: ['jazz','classical'],             characteristicNotes: 'm3, M6, M7',          popularity: 4 },
  { id: 8,  name: 'Lydian Dominant',       intervals: [0,2,4,6,7,9,10],   mood: 'bright',  genres: ['jazz','fusion'],               characteristicNotes: '#4, b7',              popularity: 3 },
  { id: 9,  name: 'Super Locrian (Altered)',intervals: [0,1,3,4,6,8,10],  mood: 'exotic',  genres: ['jazz'],                        characteristicNotes: 'b2, b3, b5, b7',      popularity: 2 },
  { id: 10, name: 'Harmonic Minor',        intervals: [0,2,3,5,7,8,11],   mood: 'exotic',  genres: ['classical','metal','flamenco'], characteristicNotes: 'm3, m6, M7',          popularity: 4 },
  { id: 11, name: 'Phrygian Dominant',     intervals: [0,1,4,5,7,8,10],   mood: 'exotic',  genres: ['flamenco','metal','world'],     characteristicNotes: 'b2, M3',              popularity: 3 },
  { id: 12, name: 'Double Harmonic Major', intervals: [0,1,4,5,7,8,11],   mood: 'exotic',  genres: ['world','metal'],               characteristicNotes: 'b2, M3, m6, M7',      popularity: 2 },
  { id: 13, name: 'Hungarian Minor',       intervals: [0,2,3,6,7,8,11],   mood: 'exotic',  genres: ['world','classical'],           characteristicNotes: '#4, m6, M7',          popularity: 2 },
  { id: 14, name: 'Neapolitan Major',      intervals: [0,1,3,5,7,9,11],   mood: 'exotic',  genres: ['classical'],                   characteristicNotes: 'b2, M6, M7',          popularity: 1 },
  { id: 15, name: 'Neapolitan Minor',      intervals: [0,1,3,5,7,8,11],   mood: 'exotic',  genres: ['classical'],                   characteristicNotes: 'b2, m6, M7',          popularity: 1 },
  { id: 16, name: 'Persian',               intervals: [0,1,4,5,6,8,11],   mood: 'exotic',  genres: ['world'],                       characteristicNotes: 'b2, M3, b5, m6, M7', popularity: 1 },
  { id: 17, name: 'Major Pentatonic',      intervals: [0,2,4,7,9],         mood: 'bright',  genres: ['pop','folk','blues','rock'],    characteristicNotes: 'M2, M3, P5, M6',      popularity: 5 },
  { id: 18, name: 'Minor Pentatonic',      intervals: [0,3,5,7,10],        mood: 'dark',    genres: ['blues','rock','pop'],          characteristicNotes: 'm3, P4, P5, m7',      popularity: 5 },
  { id: 19, name: 'Blues',                 intervals: [0,3,5,6,7,10],      mood: 'dark',    genres: ['blues','rock','jazz'],         characteristicNotes: 'm3, b5, m7',          popularity: 5 },
  { id: 20, name: 'Bebop Dominant',        intervals: [0,2,4,5,7,9,10,11], mood: 'bright',  genres: ['jazz','bebop'],               characteristicNotes: 'M7 passing tone',     popularity: 3 },
  { id: 21, name: 'Whole Tone',            intervals: [0,2,4,6,8,10],      mood: 'exotic',  genres: ['jazz','impressionist'],       characteristicNotes: 'all whole steps',     popularity: 2 },
  { id: 22, name: 'Diminished (HW)',       intervals: [0,1,3,4,6,7,9,10],  mood: 'dark',    genres: ['jazz','classical'],           characteristicNotes: 'b2, b3, b5, b6',      popularity: 2 },
  { id: 23, name: 'Diminished (WH)',       intervals: [0,2,3,5,6,8,9,11],  mood: 'dark',    genres: ['jazz','classical'],           characteristicNotes: 'm3, b5, M7',          popularity: 2 },
  { id: 24, name: 'Augmented',             intervals: [0,3,4,7,8,11],      mood: 'exotic',  genres: ['jazz','classical'],           characteristicNotes: 'M3, #5, M7',          popularity: 1 },
  { id: 25, name: 'Lydian b7 (Overtone)',  intervals: [0,2,4,6,7,9,10],   mood: 'bright',  genres: ['jazz','fusion'],               characteristicNotes: '#4, b7',              popularity: 2 },
  { id: 26, name: 'Acoustic',              intervals: [0,2,4,6,7,9,10],   mood: 'bright',  genres: ['jazz','contemporary'],         characteristicNotes: '#4, b7',              popularity: 2 },
  { id: 27, name: 'Locrian #2',            intervals: [0,2,3,5,6,8,10],   mood: 'dark',    genres: ['jazz'],                        characteristicNotes: 'M2, b5',              popularity: 2 },
  { id: 28, name: 'Harmonic Major',        intervals: [0,2,4,5,7,8,11],   mood: 'exotic',  genres: ['classical','jazz'],            characteristicNotes: 'M3, m6, M7',          popularity: 2 },
  { id: 29, name: 'Ukrainian Dorian',      intervals: [0,2,3,6,7,9,10],   mood: 'exotic',  genres: ['world','folk'],               characteristicNotes: '#4, m3',              popularity: 1 },
  { id: 30, name: 'Enigmatic',             intervals: [0,1,4,6,8,10,11],  mood: 'exotic',  genres: ['classical'],                   characteristicNotes: 'b2, M3, #5, M7',     popularity: 1 },
  { id: 31, name: 'Prometheus',            intervals: [0,2,4,6,9,10],     mood: 'exotic',  genres: ['classical','impressionist'],   characteristicNotes: '#4, M6, b7',          popularity: 1 },
  { id: 32, name: 'Hirajoshi',             intervals: [0,2,3,7,8],         mood: 'exotic',  genres: ['world','japanese'],           characteristicNotes: 'm3, P5, m6',          popularity: 2 },
  { id: 33, name: 'In Scale',              intervals: [0,1,5,7,8],         mood: 'exotic',  genres: ['world','japanese'],           characteristicNotes: 'b2, P4, m6',          popularity: 1 },
  { id: 34, name: 'Insen',                 intervals: [0,1,5,7,10],        mood: 'exotic',  genres: ['world','japanese'],           characteristicNotes: 'b2, P4, m7',          popularity: 1 },
  { id: 35, name: 'Iwato',                 intervals: [0,1,5,6,10],        mood: 'exotic',  genres: ['world','japanese'],           characteristicNotes: 'b2, b5, m7',          popularity: 1 },
]

// ─── Harmonic similarity → 3D positions ──────────────────────────────────────

function pitchClassSet(intervals: number[]): Set<number> {
  return new Set(intervals.map(i => i % 12))
}

function similarity(a: ScaleData, b: ScaleData): number {
  const sa = pitchClassSet(a.intervals)
  const sb = pitchClassSet(b.intervals)
  let shared = 0
  sa.forEach(n => { if (sb.has(n)) shared++ })
  return shared / Math.max(sa.size, sb.size)
}

// Simple MDS-like layout: place each scale by its average distance to others
function computePositions(scales: ScaleData[]): THREE.Vector3[] {
  const n = scales.length
  // Build distance matrix
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => 1 - similarity(scales[i], scales[j]))
  )
  // Random init seeded by index
  const pos = scales.map((_, i) => {
    const angle = (i / n) * Math.PI * 2
    const r = 8 + (i % 5) * 2
    return new THREE.Vector3(
      Math.cos(angle) * r,
      (Math.sin(i * 1.7) * 6),
      Math.sin(angle) * r
    )
  })
  // Stress minimization iterations
  for (let iter = 0; iter < 80; iter++) {
    for (let i = 0; i < n; i++) {
      const force = new THREE.Vector3()
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const diff = pos[i].clone().sub(pos[j])
        const actual = diff.length() || 0.001
        const target = dist[i][j] * 14 + 1
        const f = (actual - target) / actual
        force.addScaledVector(diff, -f * 0.05)
      }
      pos[i].add(force)
    }
  }
  return pos
}

// ─── Constellation edges (connect scales with similarity > threshold) ─────────

function computeEdges(scales: ScaleData[], positions: THREE.Vector3[]): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 0; i < scales.length; i++) {
    for (let j = i + 1; j < scales.length; j++) {
      if (similarity(scales[i], scales[j]) >= 0.6) {
        edges.push([i, j])
      }
    }
  }
  return edges
}

// ─── Color by mood ────────────────────────────────────────────────────────────

const MOOD_COLOR: Record<Mood, string> = {
  bright: '#ffaa44',
  dark:   '#4488ff',
  exotic: '#cc44ff',
}

// ─── Star mesh ────────────────────────────────────────────────────────────────

interface StarProps {
  scale: ScaleData
  position: THREE.Vector3
  selected: boolean
  onClick: () => void
}

function Star({ scale, position, selected, onClick }: StarProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const baseSize = 0.08 + scale.popularity * 0.06
  const color = MOOD_COLOR[scale.mood]

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const target = selected ? baseSize * 2.5 : baseSize
    meshRef.current.scale.setScalar(
      THREE.MathUtils.lerp(meshRef.current.scale.x, target, delta * 6)
    )
    if (selected) {
      meshRef.current.rotation.y += delta * 1.2
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <sphereGeometry args={[baseSize, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 3 : 1.2}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─── Orbit rings for selected star ───────────────────────────────────────────

function OrbitRings({ position, intervals }: { position: THREE.Vector3; intervals: number[] }) {
  return (
    <>
      {intervals.map((interval, i) => {
        const r = 0.4 + i * 0.18
        const pts: THREE.Vector3[] = []
        for (let a = 0; a <= 64; a++) {
          const angle = (a / 64) * Math.PI * 2
          pts.push(new THREE.Vector3(
            position.x + Math.cos(angle) * r,
            position.y,
            position.z + Math.sin(angle) * r
          ))
        }
        return (
          <Line
            key={i}
            points={pts}
            color="#ffffff"
            lineWidth={0.5}
            transparent
            opacity={0.25}
          />
        )
      })}
    </>
  )
}

// ─── Background stars (decorative) ───────────────────────────────────────────

function BackgroundStars() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = 800
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 120
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.06} sizeAttenuation transparent opacity={0.5} />
    </points>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  visibleScales: ScaleData[]
  positions: THREE.Vector3[]
  edges: [number, number][]
  selectedId: number | null
  onSelect: (id: number) => void
}

function Scene({ visibleScales, positions, edges, selectedId, onSelect }: SceneProps) {
  // Map from scale id to position index in the full SCALES array
  const posMap = useMemo(() => {
    const m = new Map<number, THREE.Vector3>()
    SCALES.forEach((s, i) => m.set(s.id, positions[i]))
    return m
  }, [positions])

  const visibleIds = useMemo(() => new Set(visibleScales.map(s => s.id)), [visibleScales])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" />
      <BackgroundStars />

      {/* Constellation lines */}
      {edges.map(([a, b]) => {
        if (!visibleIds.has(SCALES[a].id) || !visibleIds.has(SCALES[b].id)) return null
        const pa = posMap.get(SCALES[a].id)!
        const pb = posMap.get(SCALES[b].id)!
        return (
          <Line
            key={`${a}-${b}`}
            points={[pa, pb]}
            color="#8888ff"
            lineWidth={0.8}
            transparent
            opacity={0.2}
          />
        )
      })}

      {/* Stars */}
      {visibleScales.map(scale => {
        const pos = posMap.get(scale.id)!
        return (
          <Star
            key={scale.id}
            scale={scale}
            position={pos}
            selected={selectedId === scale.id}
            onClick={() => onSelect(scale.id)}
          />
        )
      })}

      {/* Orbit rings for selected */}
      {selectedId !== null && visibleIds.has(selectedId) && (
        <OrbitRings
          position={posMap.get(selectedId)!}
          intervals={SCALES.find(s => s.id === selectedId)!.intervals}
        />
      )}

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </>
  )
}

// ─── Tone.js playback ─────────────────────────────────────────────────────────

async function playScale(intervals: number[]) {
  await Tone.start()
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 0.8 },
  }).toDestination()

  const root = 261.63 // C4
  const now = Tone.now()
  intervals.forEach((semitones, i) => {
    const freq = root * Math.pow(2, semitones / 12)
    synth.triggerAttackRelease(freq, '8n', now + i * 0.22)
  })
  // Chord at end
  const chord = intervals.slice(0, 3).map(s => root * Math.pow(2, s / 12))
  synth.triggerAttackRelease(chord, '2n', now + intervals.length * 0.22 + 0.1)

  setTimeout(() => synth.dispose(), (intervals.length * 0.22 + 2) * 1000)
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function HUD({ scale, onPlay, onClose }: { scale: ScaleData; onPlay: () => void; onClose: () => void }) {
  const notes = scale.intervals.map(i => NOTE_NAMES[i % 12]).join('  ')
  const intervalNames = scale.intervals.map(i => i === 0 ? 'R' : `+${i}`).join('  ')

  return (
    <div style={{
      position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(8,8,24,0.88)', border: '1px solid rgba(120,120,255,0.4)',
      borderRadius: 12, padding: '16px 24px', color: '#e0e0ff', minWidth: 320,
      backdropFilter: 'blur(8px)', pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: MOOD_COLOR[scale.mood] }}>{scale.name}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            {scale.mood.toUpperCase()} · {scale.genres.join(', ')}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 13 }}>
        <div><span style={{ opacity: 0.5 }}>Notes: </span>{notes}</div>
        <div><span style={{ opacity: 0.5 }}>Intervals: </span>{intervalNames}</div>
        <div><span style={{ opacity: 0.5 }}>Characteristic: </span>{scale.characteristicNotes}</div>
      </div>
      <button
        onClick={onPlay}
        style={{
          marginTop: 12, padding: '6px 18px', borderRadius: 6,
          background: MOOD_COLOR[scale.mood], border: 'none', color: '#000',
          fontWeight: 700, cursor: 'pointer', fontSize: 13,
        }}
      >
        ▶ Play Scale
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GalaxyMap() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterMood, setFilterMood] = useState<Mood | 'all'>('all')
  const [filterNotes, setFilterNotes] = useState<number | 'all'>('all')
  const [filterGenre, setFilterGenre] = useState('all')

  const positions = useMemo(() => computePositions(SCALES), [])
  const edges = useMemo(() => computeEdges(SCALES, positions), [positions])

  const allGenres = useMemo(() => {
    const g = new Set<string>()
    SCALES.forEach(s => s.genres.forEach(x => g.add(x)))
    return ['all', ...Array.from(g).sort()]
  }, [])

  const noteCounts = useMemo(() => {
    const c = new Set(SCALES.map(s => s.intervals.length))
    return ['all', ...Array.from(c).sort((a, b) => (a as number) - (b as number))]
  }, [])

  const visibleScales = useMemo(() => SCALES.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMood !== 'all' && s.mood !== filterMood) return false
    if (filterNotes !== 'all' && s.intervals.length !== filterNotes) return false
    if (filterGenre !== 'all' && !s.genres.includes(filterGenre)) return false
    return true
  }), [search, filterMood, filterNotes, filterGenre])

  const selectedScale = selectedId !== null ? SCALES.find(s => s.id === selectedId) ?? null : null

  const handleSelect = useCallback((id: number) => {
    setSelectedId(prev => prev === id ? null : id)
  }, [])

  const selectStyle: React.CSSProperties = {
    background: 'rgba(8,8,24,0.85)', border: '1px solid rgba(120,120,255,0.3)',
    color: '#c0c0ff', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020210', fontFamily: 'system-ui, sans-serif' }}>
      {/* Controls bar */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center', zIndex: 10,
        background: 'rgba(8,8,24,0.85)', border: '1px solid rgba(120,120,255,0.3)',
        borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(8px)',
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scales…"
          style={{ ...selectStyle, width: 140, outline: 'none' }}
        />
        <select value={filterMood} onChange={e => setFilterMood(e.target.value as Mood | 'all')} style={selectStyle}>
          <option value="all">All moods</option>
          <option value="bright">Bright</option>
          <option value="dark">Dark</option>
          <option value="exotic">Exotic</option>
        </select>
        <select value={filterNotes === 'all' ? 'all' : String(filterNotes)} onChange={e => setFilterNotes(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={selectStyle}>
          {noteCounts.map(n => <option key={String(n)} value={String(n)}>{n === 'all' ? 'All note counts' : `${n} notes`}</option>)}
        </select>
        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} style={selectStyle}>
          {allGenres.map(g => <option key={g} value={g}>{g === 'all' ? 'All genres' : g}</option>)}
        </select>
        <span style={{ color: '#6666aa', fontSize: 11 }}>{visibleScales.length} / {SCALES.length} scales</span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 12, left: 16, zIndex: 10,
        color: '#8888ff', fontSize: 13, fontWeight: 600, letterSpacing: 2,
        textTransform: 'uppercase', opacity: 0.7,
      }}>
        Galaxy Map
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, right: 16, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'rgba(8,8,24,0.75)', borderRadius: 8, padding: '8px 12px',
        border: '1px solid rgba(120,120,255,0.2)',
      }}>
        {(['bright', 'dark', 'exotic'] as Mood[]).map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#aaa' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: MOOD_COLOR[m] }} />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </div>
        ))}
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 8, 22], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          visibleScales={visibleScales}
          positions={positions}
          edges={edges}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </Canvas>

      {/* HUD */}
      {selectedScale && (
        <HUD
          scale={selectedScale}
          onPlay={() => playScale(selectedScale.intervals)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
