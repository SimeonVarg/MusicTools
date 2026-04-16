import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import {
  Music, Piano, Activity, Drum, BarChart2, Stars,
  Headphones, AlignLeft, Target, Wind,
  GitBranch, Keyboard, BookOpen, Timer, Waves
} from 'lucide-react'

const TOOLS = [
  { path: '/circle-of-fifths',      name: 'Circle of Fifths',       Icon: Music,       desc: 'Explore key relationships & jazz harmony',  color: '#a855f7', glow: 'rgba(168,85,247,0.35)' },
  { path: '/chord-builder',         name: 'Chord Builder',          Icon: Piano,       desc: 'Build jazz progressions with voicings',      color: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
  { path: '/oscilloscope',          name: 'Oscilloscope',           Icon: Activity,    desc: 'Synthesize & visualize waveforms',           color: '#22c55e', glow: 'rgba(34,197,94,0.35)'  },
  { path: '/drum-machine',          name: 'Drum Machine',           Icon: Drum,        desc: 'Polyrhythmic circular sequencer',            color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
  { path: '/spectrum',              name: 'Spectrum Analyzer',      Icon: BarChart2,   desc: 'Real-time FFT frequency analysis',           color: '#06b6d4', glow: 'rgba(6,182,212,0.35)'  },
  { path: '/galaxy-map',            name: 'Galaxy Map',             Icon: Stars,       desc: 'Navigate 35+ scales in 3D space',           color: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
  { path: '/ear-training',          name: 'Ear Training',           Icon: Headphones,  desc: 'Train your musical ear',                    color: '#eab308', glow: 'rgba(234,179,8,0.35)'  },
  { path: '/piano-roll',            name: 'Piano Roll',             Icon: AlignLeft,   desc: 'Draw & play MIDI sequences',                color: '#ec4899', glow: 'rgba(236,72,153,0.35)' },
  { path: '/tuner',                 name: 'Tuner',                  Icon: Target,      desc: 'Chromatic tuner + overtone series',         color: '#14b8a6', glow: 'rgba(20,184,166,0.35)' },
  { path: '/ambient',               name: 'Ambient Engine',         Icon: Wind,        desc: 'Generative ambient music',                  color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' },
  { path: '/progression-analyzer',  name: 'Progression Analyzer',  Icon: GitBranch,   desc: 'Analyze chord progressions & voice leading', color: '#f43f5e', glow: 'rgba(244,63,94,0.35)'  },
  { path: '/interval-keyboard',     name: 'Interval Keyboard',      Icon: Keyboard,    desc: 'Interactive interval ear training',          color: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  { path: '/scale-practice',        name: 'Scale Practice',         Icon: BookOpen,    desc: 'Learn scales with keyboard & quiz mode',    color: '#34d399', glow: 'rgba(52,211,153,0.35)'  },
  { path: '/rhythm-trainer',        name: 'Rhythm Trainer',         Icon: Timer,       desc: 'Tap along & measure timing accuracy',       color: '#fb923c', glow: 'rgba(251,146,60,0.35)'  },
  { path: '/harmonic-series',       name: 'Harmonic Series',        Icon: Waves,       desc: '3D overtone visualizer & timbre builder',   color: '#38bdf8', glow: 'rgba(56,189,248,0.35)'  },
]

function useThreeBackground(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
    camera.position.z = 50

    // Particles
    const count = 1200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#a855f7'), new THREE.Color('#3b82f6'),
      new THREE.Color('#06b6d4'), new THREE.Color('#ec4899'),
      new THREE.Color('#22c55e'),
    ]
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 120
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    // Soft glowing dot sprite
    const sprite = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const ctx = c.getContext('2d')!
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0,   'rgba(255,255,255,1)')
      g.addColorStop(0.15,'rgba(255,255,255,0.8)')
      g.addColorStop(0.4, 'rgba(255,255,255,0.2)')
      g.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()
    const mat = new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 1, map: sprite, depthWrite: false, blending: THREE.AdditiveBlending })
    const points = new THREE.Points(geo, mat)
    scene.add(points)

    // Staff lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.4 })
    for (let i = -4; i <= 4; i++) {
      const lg = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-80, i * 4, -10),
        new THREE.Vector3(80, i * 4, -10),
      ])
      scene.add(new THREE.Line(lg, lineMat))
    }

    let raf: number
    let t = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.0005
      points.rotation.y = t * 0.3
      points.rotation.x = t * 0.1
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      sprite.dispose()
    }
  }, [canvasRef])
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const } }),
}

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useThreeBackground(canvasRef)
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030712', overflow: 'hidden' }}>
      {/* Three.js canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0,
            background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 40%, #06b6d4 70%, #ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.5))',
          }}>
            MusicTools
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', marginTop: 12, letterSpacing: '0.05em' }}>
            A Musical Arcade &amp; Multimeter
          </p>
        </motion.div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {TOOLS.map(({ path, name, Icon, desc, color, glow }, i) => (
            <motion.div key={path} custom={i} initial="hidden" animate="visible" variants={cardVariants}
              onClick={() => navigate(path)}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: '#0f172a',
                border: `1px solid ${color}40`,
                borderRadius: 12,
                padding: '24px 20px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onHoverStart={e => { (e.target as HTMLElement).closest?.('[data-card]') }}
              className="tool-card"
              data-card=""
              // inline hover glow via CSS variable trick — handled by whileHover scale above
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, marginBottom: 14,
                background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 16px ${glow}`,
              }}>
                <Icon size={22} color={color} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 6 }}>{name}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .tool-card:hover {
          box-shadow: 0 0 24px var(--card-glow, rgba(168,85,247,0.3)), 0 8px 32px rgba(0,0,0,0.4) !important;
        }
      `}</style>
    </div>
  )
}
