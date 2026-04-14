import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tone from 'tone'

// ── Music theory data ──────────────────────────────────────────────────────────

const KEYS = ['C','G','D','A','E','B','F#','Db','Ab','Eb','Bb','F'] as const
type Key = typeof KEYS[number]

const RELATIVE_MINORS: Record<Key, string> = {
  C:'Am', G:'Em', D:'Bm', A:'F#m', E:'C#m', B:'G#m',
  'F#':'D#m', Db:'Bbm', Ab:'Fm', Eb:'Cm', Bb:'Gm', F:'Dm'
}

const KEY_SIGS: Record<Key, string> = {
  C:'0 sharps/flats', G:'1 sharp', D:'2 sharps', A:'3 sharps',
  E:'4 sharps', B:'5 sharps', 'F#':'6 sharps', Db:'5 flats',
  Ab:'4 flats', Eb:'3 flats', Bb:'2 flats', F:'1 flat'
}

// Diatonic chords: [I, ii, iii, IV, V, vi, vii°]
const DIATONIC: Record<Key, string[]> = {
  C:  ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5'],
  G:  ['Gmaj7','Am7','Bm7','Cmaj7','D7','Em7','F#m7b5'],
  D:  ['Dmaj7','Em7','F#m7','Gmaj7','A7','Bm7','C#m7b5'],
  A:  ['Amaj7','Bm7','C#m7','Dmaj7','E7','F#m7','G#m7b5'],
  E:  ['Emaj7','F#m7','G#m7','Amaj7','B7','C#m7','D#m7b5'],
  B:  ['Bmaj7','C#m7','D#m7','Emaj7','F#7','G#m7','A#m7b5'],
  'F#':['F#maj7','G#m7','A#m7','Bmaj7','C#7','D#m7','E#m7b5'],
  Db: ['Dbmaj7','Ebm7','Fm7','Gbmaj7','Ab7','Bbm7','Cm7b5'],
  Ab: ['Abmaj7','Bbm7','Cm7','Dbmaj7','Eb7','Fm7','Gm7b5'],
  Eb: ['Ebmaj7','Fm7','Gm7','Abmaj7','Bb7','Cm7','Dm7b5'],
  Bb: ['Bbmaj7','Cm7','Dm7','Ebmaj7','F7','Gm7','Am7b5'],
  F:  ['Fmaj7','Gm7','Am7','Bbmaj7','C7','Dm7','Em7b5'],
}

const SCALE_DEGREES = ['I','ii','iii','IV','V','vi','vii°']

// Secondary dominants for each key: V/ii, V/iii, V/IV, V/V, V/vi
const SEC_DOMINANTS: Record<Key, string[]> = {
  C:  ['A7','B7','C7','D7','E7'],
  G:  ['E7','F#7','G7','A7','B7'],
  D:  ['B7','C#7','D7','E7','F#7'],
  A:  ['F#7','G#7','A7','B7','C#7'],
  E:  ['C#7','D#7','E7','F#7','G#7'],
  B:  ['G#7','A#7','B7','C#7','D#7'],
  'F#':['D#7','E#7','F#7','G#7','A#7'],
  Db: ['Bb7','C7','Db7','Eb7','F7'],
  Ab: ['F7','G7','Ab7','Bb7','C7'],
  Eb: ['C7','D7','Eb7','F7','G7'],
  Bb: ['G7','A7','Bb7','C7','D7'],
  F:  ['D7','E7','F7','G7','A7'],
}

// Tritone sub of V7 = bII7
const TRITONE_SUBS: Record<Key, string> = {
  C:'Db7', G:'Ab7', D:'Eb7', A:'Bb7', E:'F7', B:'C7',
  'F#':'C7', Db:'G7', Ab:'D7', Eb:'A7', Bb:'E7', F:'B7'
}

// Notes to play when a key is clicked (root + major chord)
const KEY_NOTES: Record<Key, string[]> = {
  C:['C4','E4','G4'], G:['G3','B3','D4'], D:['D4','F#4','A4'],
  A:['A3','C#4','E4'], E:['E4','G#4','B4'], B:['B3','D#4','F#4'],
  'F#':['F#3','A#3','C#4'], Db:['Db4','F4','Ab4'], Ab:['Ab3','C4','Eb4'],
  Eb:['Eb4','G4','Bb4'], Bb:['Bb3','D4','F4'], F:['F3','A3','C4'],
}

// Color: sharps = warm, flats = cool, C = neutral
const KEY_COLORS: Record<Key, string> = {
  C:'#a0a0ff',
  G:'#ffb347', D:'#ff8c42', A:'#ff6b35', E:'#ff4500', B:'#ff2200',
  'F#':'#cc1100',
  Db:'#9b59b6', Ab:'#6c3483', Eb:'#5b2c6f', Bb:'#7d3c98', F:'#8e44ad',
}

// ── Geometry helpers ───────────────────────────────────────────────────────────

const TWO_PI = Math.PI * 2
const SLICE = TWO_PI / 12
// Start at top (-π/2) offset by half a slice so labels are centered
const angleFor = (i: number) => -Math.PI / 2 + i * SLICE

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function arcPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number) {
  const s1 = polarToXY(startAngle, r1, cx, cy)
  const e1 = polarToXY(endAngle, r1, cx, cy)
  const s2 = polarToXY(startAngle, r2, cx, cy)
  const e2 = polarToXY(endAngle, r2, cx, cy)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${r2} ${r2} 0 ${large} 0 ${s2.x} ${s2.y}`,
    'Z'
  ].join(' ')
}


// ── Sub-components ─────────────────────────────────────────────────────────────

const CX = 300, CY = 300
const R_OUTER_OUT = 270, R_OUTER_IN = 195
const R_INNER_OUT = 185, R_INNER_IN = 130
const R_CHORD_OUT = 295, R_CHORD_IN = 272

interface SliceProps {
  index: number
  keyName: Key
  isSelected: boolean
  isHighlighted: boolean
  rOut: number
  rIn: number
  label: string
  labelR: number
  fontSize: number
  onClick: () => void
  onMouseEnter: (e: React.MouseEvent, key: Key) => void
  onMouseLeave: () => void
}

function WheelSlice({ index, keyName, isSelected, isHighlighted, rOut, rIn, label, labelR, fontSize, onClick, onMouseEnter, onMouseLeave }: SliceProps) {
  const start = angleFor(index) - SLICE / 2
  const end = angleFor(index) + SLICE / 2
  const mid = angleFor(index)
  const lp = polarToXY(mid, labelR, CX, CY)
  const base = KEY_COLORS[keyName]
  const fill = isSelected ? base : isHighlighted ? base + 'bb' : base + '44'
  const stroke = isSelected ? base : isHighlighted ? base + 'cc' : '#333'
  const glowId = `glow-${keyName.replace('#', 's')}`

  return (
    <g onClick={onClick} onMouseEnter={e => onMouseEnter(e, keyName)} onMouseLeave={onMouseLeave} style={{ cursor: 'pointer' }}>
      <path
        d={arcPath(CX, CY, rOut, rIn, start, end)}
        fill={fill}
        stroke={stroke}
        strokeWidth={isSelected ? 2 : 1}
        filter={isSelected || isHighlighted ? `url(#${glowId})` : undefined}
        style={{ transition: 'fill 0.3s, stroke 0.3s' }}
      />
      <text
        x={lp.x} y={lp.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize}
        fill={isSelected ? '#fff' : isHighlighted ? '#eee' : '#aaa'}
        fontWeight={isSelected ? 'bold' : 'normal'}
        style={{ pointerEvents: 'none', transition: 'fill 0.3s', fontFamily: 'monospace' }}
      >
        {label}
      </text>
    </g>
  )
}

interface ChordSliceProps {
  index: number
  chord: string
  degree: string
  active: boolean
}

function ChordSlice({ index, chord, degree, active }: ChordSliceProps) {
  const start = angleFor(index) - SLICE / 2 + 0.02
  const end = angleFor(index) + SLICE / 2 - 0.02
  const mid = angleFor(index)
  const lp = polarToXY(mid, (R_CHORD_OUT + R_CHORD_IN) / 2, CX, CY)
  return (
    <g>
      <path
        d={arcPath(CX, CY, R_CHORD_OUT, R_CHORD_IN, start, end)}
        fill={active ? '#ffffff22' : '#ffffff08'}
        stroke={active ? '#ffffff55' : '#ffffff15'}
        strokeWidth={1}
      />
      <text x={lp.x} y={lp.y - 5} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fill={active ? '#fff' : '#555'} fontFamily="monospace">
        {degree}
      </text>
      <text x={lp.x} y={lp.y + 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={6.5} fill={active ? '#ccc' : '#444'} fontFamily="monospace">
        {chord}
      </text>
    </g>
  )
}


// ── Main component ─────────────────────────────────────────────────────────────

export default function CircleOfFifths() {
  const [selected, setSelected] = useState<Key | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)

  const getSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.2 },
      }).toDestination()
    }
    return synthRef.current
  }, [])

  const handleKeyClick = useCallback(async (key: Key) => {
    await Tone.start()
    setSelected(prev => prev === key ? null : key)
    const synth = getSynth()
    const notes = KEY_NOTES[key]
    synth.triggerAttackRelease(notes, '2n')
  }, [getSynth])

  // Compute highlighted keys for selected
  const highlighted = new Set<string>()
  if (selected) {
    const idx = KEYS.indexOf(selected)
    // dominant = next clockwise (+1), subdominant = prev (-1)
    highlighted.add(KEYS[(idx + 1) % 12])
    highlighted.add(KEYS[(idx + 11) % 12])
    // relative minor
    highlighted.add(RELATIVE_MINORS[selected])
    // parallel minor (same root, minor)
    highlighted.add(selected.toLowerCase() + 'm')
  }

  const diatonic = selected ? DIATONIC[selected] : null
  const secDoms = selected ? SEC_DOMINANTS[selected] : null
  const tritoneSub = selected ? TRITONE_SUBS[selected] : null
  const relMinor = selected ? RELATIVE_MINORS[selected] : null

  // SVG defs: glow filters per key
  const glowFilters = KEYS.map(k => {
    const id = `glow-${k.replace('#', 's')}`
    const color = KEY_COLORS[k]
    return (
      <filter key={id} id={id} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor={color} floodOpacity="0.8" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    )
  })

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '24px 16px', boxSizing: 'border-box',
      fontFamily: 'monospace', color: '#ccc',
    }}>
      <h1 style={{ fontSize: 22, letterSpacing: 4, color: '#7af', marginBottom: 8, textTransform: 'uppercase' }}>
        Circle of Fifths
      </h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>Click a key to explore</p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>

        {/* SVG Wheel */}
        <div style={{ position: 'relative' }}>
          <svg width={600} height={600} viewBox="0 0 600 600">
            <defs>{glowFilters}</defs>

            {/* Chord ring (outermost) — only when key selected */}
            {diatonic && KEYS.map((k, i) => (
              <ChordSlice key={k} index={i} chord={diatonic[i] ?? ''} degree={SCALE_DEGREES[i] ?? ''} active={!!selected} />
            ))}

            {/* Major keys outer ring */}
            {KEYS.map((k, i) => (
              <WheelSlice
                key={k} index={i} keyName={k}
                isSelected={selected === k}
                isHighlighted={highlighted.has(k)}
                rOut={R_OUTER_OUT} rIn={R_OUTER_IN}
                label={k} labelR={(R_OUTER_OUT + R_OUTER_IN) / 2}
                fontSize={16}
                onClick={() => handleKeyClick(k)}
                onMouseEnter={(e, key) => setTooltip({ x: e.clientX, y: e.clientY, text: `${key} major — ${KEY_SIGS[key]}` })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}

            {/* Minor keys inner ring */}
            {KEYS.map((k, i) => {
              const minorLabel = RELATIVE_MINORS[k]
              return (
                <WheelSlice
                  key={`m-${k}`} index={i} keyName={k}
                  isSelected={false}
                  isHighlighted={selected ? highlighted.has(minorLabel) : false}
                  rOut={R_INNER_OUT} rIn={R_INNER_IN}
                  label={minorLabel} labelR={(R_INNER_OUT + R_INNER_IN) / 2}
                  fontSize={11}
                  onClick={() => handleKeyClick(k)}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, text: `${minorLabel} — relative of ${k} major` })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}

            {/* Center panel */}
            <circle cx={CX} cy={CY} r={118} fill="#0d0d1a" stroke="#222" strokeWidth={1} />
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.g key={selected}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{ originX: '300px', originY: '300px' }}
                >
                  <text x={CX} y={CY - 48} textAnchor="middle" fontSize={36} fontWeight="bold"
                    fill={KEY_COLORS[selected]} fontFamily="monospace"
                    filter={`url(#glow-${selected.replace('#','s')})`}>
                    {selected}
                  </text>
                  <text x={CX} y={CY - 18} textAnchor="middle" fontSize={10} fill="#888" fontFamily="monospace">
                    {KEY_SIGS[selected]}
                  </text>
                  <text x={CX} y={CY + 2} textAnchor="middle" fontSize={9} fill="#aaa" fontFamily="monospace">
                    rel: {relMinor}  ‖  par: {selected.toLowerCase()}m
                  </text>
                  <text x={CX} y={CY + 22} textAnchor="middle" fontSize={8} fill="#666" fontFamily="monospace">
                    {diatonic?.slice(0,4).join('  ')}
                  </text>
                  <text x={CX} y={CY + 36} textAnchor="middle" fontSize={8} fill="#666" fontFamily="monospace">
                    {diatonic?.slice(4).join('  ')}
                  </text>
                  <text x={CX} y={CY + 58} textAnchor="middle" fontSize={8} fill="#555" fontFamily="monospace">
                    dom: {KEYS[(KEYS.indexOf(selected)+1)%12]}  sub: {KEYS[(KEYS.indexOf(selected)+11)%12]}
                  </text>
                  <text x={CX} y={CY + 74} textAnchor="middle" fontSize={8} fill="#444" fontFamily="monospace">
                    tritone sub: {tritoneSub}
                  </text>
                </motion.g>
              ) : (
                <motion.g key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <text x={CX} y={CY - 8} textAnchor="middle" fontSize={12} fill="#444" fontFamily="monospace">select a key</text>
                  <text x={CX} y={CY + 12} textAnchor="middle" fontSize={10} fill="#333" fontFamily="monospace">to explore</text>
                </motion.g>
              )}
            </AnimatePresence>
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 8,
              background: '#1a1a2e', border: '1px solid #333', borderRadius: 6,
              padding: '4px 10px', fontSize: 12, color: '#aaa', pointerEvents: 'none',
              zIndex: 100, whiteSpace: 'nowrap',
            }}>
              {tooltip.text}
            </div>
          )}
        </div>

        {/* Jazz theory panel */}
        <div style={{
          width: 260, background: '#0d0d1a', border: '1px solid #1e1e3a',
          borderRadius: 12, padding: 20, minHeight: 400,
        }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>
            Jazz Theory
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
              >
                {/* Diatonic chords */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: 1 }}>DIATONIC CHORDS</div>
                  {diatonic?.map((chord, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #1a1a2a' }}>
                      <span style={{ color: '#555', fontSize: 11 }}>{SCALE_DEGREES[i]}</span>
                      <span style={{ color: '#9af', fontSize: 11 }}>{chord}</span>
                    </div>
                  ))}
                </div>

                {/* Secondary dominants */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: 1 }}>SECONDARY DOMINANTS</div>
                  {['V/ii','V/iii','V/IV','V/V','V/vi'].map((label, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #1a1a2a' }}>
                      <span style={{ color: '#555', fontSize: 11 }}>{label}</span>
                      <span style={{ color: '#fa8', fontSize: 11 }}>{secDoms?.[i]}</span>
                    </div>
                  ))}
                </div>

                {/* Tritone sub */}
                <div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: 1 }}>TRITONE SUBSTITUTION</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#555', fontSize: 11 }}>bII7 for V7</span>
                    <span style={{ color: '#c8f', fontSize: 11 }}>{tritoneSub}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#333', marginTop: 8, lineHeight: 1.5 }}>
                    Replaces {KEYS[(KEYS.indexOf(selected)+1)%12]}7 with {tritoneSub} — a tritone away
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ color: '#333', fontSize: 12, marginTop: 40, textAlign: 'center' }}>
                  Select a key to see<br />jazz theory details
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
