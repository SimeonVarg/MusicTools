import { useState, useEffect, useCallback, useRef } from 'react'
import * as Tone from 'tone'

// ─── Constants ────────────────────────────────────────────────────────────────

const KB_START = 48 // C3
const KB_END = 71   // B4
const BLACK_PCS = new Set([1, 3, 6, 8, 10])
const WW = 28, WH = 100, BW = 18, BH = 62
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const DISPLAY_NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']

const INTERVALS = [
  { name: 'Unison',     semitones: 0,  level: 1 },
  { name: 'Perfect 4th',semitones: 5,  level: 1 },
  { name: 'Perfect 5th',semitones: 7,  level: 1 },
  { name: 'Octave',     semitones: 12, level: 1 },
  { name: 'Major 3rd',  semitones: 4,  level: 2 },
  { name: 'Minor 3rd',  semitones: 3,  level: 2 },
  { name: 'Major 6th',  semitones: 9,  level: 2 },
  { name: 'Minor 6th',  semitones: 8,  level: 2 },
  { name: 'Major 2nd',  semitones: 2,  level: 3 },
  { name: 'Minor 2nd',  semitones: 1,  level: 3 },
  { name: 'Major 7th',  semitones: 11, level: 3 },
  { name: 'Minor 7th',  semitones: 10, level: 3 },
  { name: 'Tritone',    semitones: 6,  level: 4 },
]

// ─── Keyboard layout ──────────────────────────────────────────────────────────

function whiteKeyX(midi: number): number {
  let count = 0
  for (let m = KB_START; m < midi; m++) if (!BLACK_PCS.has(m % 12)) count++
  return count * WW
}

const ALL_MIDIS = Array.from({ length: KB_END - KB_START + 1 }, (_, i) => KB_START + i)
const WHITE_MIDIS = ALL_MIDIS.filter(m => !BLACK_PCS.has(m % 12))
const BLACK_MIDIS = ALL_MIDIS.filter(m => BLACK_PCS.has(m % 12))
const SVG_W = WHITE_MIDIS.length * WW

function blackKeyX(midi: number): number {
  // Center black key between the two white keys it sits between
  const wx = whiteKeyX(midi - 1) // white key to the left
  return wx + WW - BW / 2
}

function midiName(midi: number): string {
  const oct = Math.floor(midi / 12) - 1
  return DISPLAY_NAMES[midi % 12] + oct
}

// ─── Challenge ────────────────────────────────────────────────────────────────

type Challenge = {
  rootMidi: number
  interval: typeof INTERVALS[0]
  direction: 'above' | 'below'
  targetMidi: number
}

function generateChallenge(level: number): Challenge {
  const pool = INTERVALS.filter(i => i.level <= level)
  const interval = pool[Math.floor(Math.random() * pool.length)]
  const direction: 'above' | 'below' = interval.semitones === 0 ? 'above' : Math.random() > 0.5 ? 'above' : 'below'
  let rootMidi: number
  if (direction === 'above') {
    rootMidi = KB_START + Math.floor(Math.random() * (KB_END - KB_START - interval.semitones + 1))
  } else {
    rootMidi = KB_START + interval.semitones + Math.floor(Math.random() * (KB_END - KB_START - interval.semitones + 1))
  }
  const targetMidi = direction === 'above' ? rootMidi + interval.semitones : rootMidi - interval.semitones
  return { rootMidi, interval, direction, targetMidi }
}

// ─── Key color ────────────────────────────────────────────────────────────────

type KeyState = 'default' | 'root' | 'correct' | 'wrong' | 'reveal'

const KEY_COLORS: Record<KeyState, { white: string; black: string }> = {
  default: { white: '#e8e8e8', black: '#1a1a1a' },
  root:    { white: '#9b59b6', black: '#7d3c98' },
  correct: { white: '#00e676', black: '#00c853' },
  wrong:   { white: '#ff1744', black: '#d50000' },
  reveal:  { white: '#ffd600', black: '#f9a825' },
}

function keyColor(midi: number, state: KeyState): string {
  const isBlack = BLACK_PCS.has(midi % 12)
  return KEY_COLORS[state][isBlack ? 'black' : 'white']
}

// ─── Component ────────────────────────────────────────────────────────────────

const LS_KEY = 'intervalKeyboard_highScore'

export default function IntervalKeyboard() {
  const [level, setLevel] = useState(1)
  const [challenge, setChallenge] = useState<Challenge>(() => generateChallenge(1))
  const [keyStates, setKeyStates] = useState<Record<number, KeyState>>({})
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [total, setTotal] = useState(0)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(LS_KEY) ?? '0', 10))
  const [locked, setLocked] = useState(false)
  const synthRef = useRef<Tone.Synth | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const getSynth = useCallback(() => {
    if (!synthRef.current)
      synthRef.current = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, release: 0.4 } }).toDestination()
    return synthRef.current
  }, [])

  const playMidi = useCallback((midi: number, when = 0) => {
    const oct = Math.floor(midi / 12) - 1
    const name = NOTE_NAMES[midi % 12] + oct
    getSynth().triggerAttackRelease(name, '8n', Tone.now() + when)
  }, [getSynth])

  const clearTimers = () => { timerRef.current.forEach(clearTimeout); timerRef.current = [] }

  const startChallenge = useCallback((lvl: number) => {
    const c = generateChallenge(lvl)
    setChallenge(c)
    setKeyStates({ [c.rootMidi]: 'root' })
    setLocked(false)
    clearTimers()
    timerRef.current.push(setTimeout(() => {
      Tone.start().then(() => playMidi(c.rootMidi))
    }, 200))
  }, [playMidi])

  // Init
  useEffect(() => {
    startChallenge(1)
    return clearTimers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLevelSelect = (l: number) => {
    setLevel(l)
    setScore(0); setStreak(0); setTotal(0)
    startChallenge(l)
  }

  const handleKey = useCallback((midi: number) => {
    if (locked) return
    Tone.start()
    const correct = midi === challenge.targetMidi
    setTotal(t => t + 1)
    setLocked(true)

    if (correct) {
      setKeyStates({ [challenge.rootMidi]: 'root', [midi]: 'correct' })
      playMidi(challenge.rootMidi)
      playMidi(challenge.targetMidi, 0.25)

      setScore(prev => {
        const next = prev + 1
        if (next > highScore) { setHighScore(next); localStorage.setItem(LS_KEY, String(next)) }
        return next
      })
      setStreak(prev => {
        const next = prev + 1
        if (next % 5 === 0 && level < 4) {
          const nl = level + 1
          setLevel(nl)
          timerRef.current.push(setTimeout(() => startChallenge(nl), 1500))
        } else {
          timerRef.current.push(setTimeout(() => startChallenge(level), 1500))
        }
        return next
      })
    } else {
      setKeyStates({ [challenge.rootMidi]: 'root', [midi]: 'wrong' })
      // Error tone: short low buzz
      getSynth().triggerAttackRelease('C2', '16n', Tone.now())
      setStreak(0)
      timerRef.current.push(setTimeout(() => {
        setKeyStates({ [challenge.rootMidi]: 'root', [midi]: 'wrong', [challenge.targetMidi]: 'reveal' })
      }, 500))
      timerRef.current.push(setTimeout(() => startChallenge(level), 1500))
    }
  }, [locked, challenge, level, highScore, playMidi, getSynth, startChallenge])

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div style={{ background: '#0a0a14', color: '#e0e0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', padding: 24, gap: 20 }}>

      {/* Level selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4].map(l => (
          <button key={l} onClick={() => handleLevelSelect(l)}
            style={{ padding: '4px 14px', borderRadius: 4, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: level === l ? 700 : 400, background: level === l ? '#9b59b6' : '#1a1a2e', color: level === l ? '#fff' : '#666' }}>
            Level {l}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#ce93d8' }}>
          Play a <span style={{ color: '#fff' }}>{challenge.interval.name}</span>{' '}
          <span style={{ color: '#9b59b6' }}>{challenge.direction}</span>{' '}
          <span style={{ color: '#fff' }}>{midiName(challenge.rootMidi)}</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          {challenge.interval.semitones} semitone{challenge.interval.semitones !== 1 ? 's' : ''} {challenge.direction}
        </div>
      </div>

      {/* SVG Keyboard */}
      <svg width={SVG_W} height={WH + 4} style={{ cursor: 'pointer', display: 'block' }}>
        {WHITE_MIDIS.map(m => (
          <rect key={m} x={whiteKeyX(m)} y={0} width={WW - 1} height={WH} rx={3}
            fill={keyColor(m, keyStates[m] ?? 'default')}
            stroke="#333" strokeWidth={1}
            onClick={() => handleKey(m)}
            style={{ transition: 'fill 0.1s' }} />
        ))}
        {BLACK_MIDIS.map(m => (
          <rect key={m} x={blackKeyX(m)} y={0} width={BW} height={BH} rx={2}
            fill={keyColor(m, keyStates[m] ?? 'default')}
            stroke="#111" strokeWidth={1}
            onClick={() => handleKey(m)}
            style={{ transition: 'fill 0.1s' }} />
        ))}
      </svg>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 28, fontSize: 13 }}>
        <span>Score: <b style={{ color: '#ce93d8' }}>{score}</b></span>
        <span>Streak: <b style={{ color: streak >= 5 ? '#ff9800' : '#ce93d8' }}>{streak >= 5 ? '🔥' : ''}{streak}</b></span>
        <span>Accuracy: <b style={{ color: '#ce93d8' }}>{accuracy}%</b></span>
        <span>Best: <b style={{ color: '#ce93d8' }}>{highScore}</b></span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { Tone.start().then(() => playMidi(challenge.rootMidi)) }}
          style={{ background: 'none', border: '1px solid #9b59b6', color: '#ce93d8', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          🔊 Replay Root
        </button>
        <button onClick={() => handleLevelSelect(level)}
          style={{ background: 'none', border: '1px solid #444', color: '#888', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          Skip
        </button>
        <button onClick={() => { setScore(0); setStreak(0); setTotal(0); localStorage.removeItem(LS_KEY); setHighScore(0); startChallenge(level) }}
          style={{ background: 'none', border: '1px solid #333', color: '#555', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          Reset
        </button>
      </div>
    </div>
  )
}
