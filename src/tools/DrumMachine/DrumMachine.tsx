import { useEffect, useRef, useCallback, useReducer, useState } from 'react';
import * as Tone from 'tone';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepState = 0 | 1 | 2; // 0=off, 1=on, 2=accent

interface Track {
  name: string;
  color: string;
  steps: StepState[];
  stepCount: number;
  muted: boolean;
  soloed: boolean;
  currentStep: number;
}

interface State {
  tracks: Track[];
  bpm: number;
  swing: number;
  playing: boolean;
}

type Action =
  | { type: 'TOGGLE_STEP'; track: number; step: number; accent: boolean }
  | { type: 'SET_STEP_COUNT'; track: number; count: number }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'SET_SWING'; swing: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'TOGGLE_MUTE'; track: number }
  | { type: 'TOGGLE_SOLO'; track: number }
  | { type: 'SET_CURRENT_STEP'; track: number; step: number }
  | { type: 'APPLY_EUCLIDEAN'; track: number; pulses: number }
  | { type: 'LOAD_PRESET'; preset: PresetName }
  | { type: 'STOP' };

// ─── Presets ──────────────────────────────────────────────────────────────────

type PresetName = '4-on-floor' | 'Backbeat' | 'Bossa Nova' | 'Shuffle' | 'Breakbeat' | 'Empty';

interface PresetDef {
  stepCount: number;
  swing?: number;
  tracks: { [key: string]: StepState[] };
}

const PRESETS: Record<PresetName, PresetDef> = {
  '4-on-floor': {
    stepCount: 16,
    tracks: {
      Kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      Snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      'Hi-Hat':[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      Clap:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
  },
  'Backbeat': {
    stepCount: 16,
    tracks: {
      Kick:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      Snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      'Hi-Hat':[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      Clap:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    },
  },
  'Bossa Nova': {
    stepCount: 16,
    tracks: {
      Kick:   [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      Snare:  [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
      'Hi-Hat':[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      Clap:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    },
  },
  'Shuffle': {
    stepCount: 16,
    swing: 60,
    tracks: {
      Kick:   [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
      Snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      'Hi-Hat':[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      Clap:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    },
  },
  'Breakbeat': {
    stepCount: 16,
    tracks: {
      Kick:   [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0],
      Snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      'Hi-Hat':[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      Clap:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],
    },
  },
  'Empty': {
    stepCount: 16,
    tracks: {
      Kick:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      Snare:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      'Hi-Hat':[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      Clap:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_DEFS = [
  { name: 'Kick',    color: '#ff4466' },
  { name: 'Snare',   color: '#ffaa00' },
  { name: 'Hi-Hat',  color: '#00ffcc' },
  { name: 'Clap',    color: '#aa44ff' },
  { name: 'Tom',     color: '#44aaff' },
  { name: 'Cowbell', color: '#ff8800' },
];

const DEFAULT_STEP_COUNTS = [16, 16, 16, 12, 8, 6];

// ─── Euclidean Algorithm (Bjorklund) ─────────────────────────────────────────

function euclidean(pulses: number, steps: number): StepState[] {
  if (pulses <= 0) return Array(steps).fill(0);
  if (pulses >= steps) return Array(steps).fill(1);

  let pattern: number[][] = [];
  for (let i = 0; i < steps; i++) pattern.push([i < pulses ? 1 : 0]);

  let remainder = steps - pulses;
  let divisor = pulses;

  while (remainder > 1) {
    const newPattern: number[][] = [];
    const times = Math.min(divisor, remainder);
    for (let i = 0; i < times; i++) {
      newPattern.push([...pattern[i], ...pattern[divisor + i] ?? []]);
    }
    if (divisor > remainder) {
      for (let i = remainder; i < divisor; i++) newPattern.push(pattern[i]);
    } else {
      for (let i = divisor; i < divisor + (remainder - divisor); i++) newPattern.push(pattern[i]);
    }
    pattern = newPattern;
    const prev = divisor;
    divisor = times;
    remainder = Math.abs(prev - remainder);
  }

  return pattern.flat().map(v => (v ? 1 : 0)) as StepState[];
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function makeTrack(def: typeof TRACK_DEFS[0], stepCount: number): Track {
  return {
    name: def.name,
    color: def.color,
    steps: Array(stepCount).fill(0),
    stepCount,
    muted: false,
    soloed: false,
    currentStep: -1,
  };
}

const initialState: State = {
  tracks: TRACK_DEFS.map((d, i) => makeTrack(d, DEFAULT_STEP_COUNTS[i])),
  bpm: 120,
  swing: 0,
  playing: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_STEP': {
      const tracks = state.tracks.map((t, i) => {
        if (i !== action.track) return t;
        const steps = [...t.steps] as StepState[];
        const cur = steps[action.step];
        if (action.accent) {
          steps[action.step] = cur === 2 ? 0 : 2;
        } else {
          steps[action.step] = cur === 0 ? 1 : 0;
        }
        return { ...t, steps };
      });
      return { ...state, tracks };
    }
    case 'SET_STEP_COUNT': {
      const tracks = state.tracks.map((t, i) => {
        if (i !== action.track) return t;
        const newSteps: StepState[] = Array(action.count).fill(0);
        for (let j = 0; j < Math.min(action.count, t.stepCount); j++) newSteps[j] = t.steps[j];
        return { ...t, stepCount: action.count, steps: newSteps };
      });
      return { ...state, tracks };
    }
    case 'SET_BPM': return { ...state, bpm: action.bpm };
    case 'SET_SWING': return { ...state, swing: action.swing };
    case 'TOGGLE_PLAY': return { ...state, playing: !state.playing };
    case 'STOP': return {
      ...state,
      playing: false,
      tracks: state.tracks.map(t => ({ ...t, currentStep: -1 })),
    };
    case 'TOGGLE_MUTE': {
      const tracks = state.tracks.map((t, i) =>
        i === action.track ? { ...t, muted: !t.muted } : t
      );
      return { ...state, tracks };
    }
    case 'TOGGLE_SOLO': {
      const tracks = state.tracks.map((t, i) =>
        i === action.track ? { ...t, soloed: !t.soloed } : t
      );
      return { ...state, tracks };
    }
    case 'SET_CURRENT_STEP': {
      const tracks = state.tracks.map((t, i) =>
        i === action.track ? { ...t, currentStep: action.step } : t
      );
      return { ...state, tracks };
    }
    case 'APPLY_EUCLIDEAN': {
      const tracks = state.tracks.map((t, i) => {
        if (i !== action.track) return t;
        return { ...t, steps: euclidean(action.pulses, t.stepCount) };
      });
      return { ...state, tracks };
    }
    case 'LOAD_PRESET': {
      const p = PRESETS[action.preset];
      const tracks = state.tracks.map(t => {
        const pattern = p.tracks[t.name];
        if (!pattern) return t;
        const steps: StepState[] = Array(p.stepCount).fill(0);
        for (let j = 0; j < Math.min(p.stepCount, pattern.length); j++) steps[j] = pattern[j];
        return { ...t, stepCount: p.stepCount, steps };
      });
      return { ...state, tracks, ...(p.swing !== undefined ? { swing: p.swing } : {}) };
    }
    default: return state;
  }
}

// ─── SVG Dimensions ──────────────────────────────────────────────────────────

const SVG_SIZE = 500;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const INNER_R = 55;
const RING_GAP = 32;
const DOT_R_NORMAL = 6;
const DOT_R_ACCENT = 8;

function ringRadius(trackIdx: number) {
  return INNER_R + (trackIdx + 1) * RING_GAP;
}

function stepAngle(step: number, total: number) {
  return (step / total) * Math.PI * 2 - Math.PI / 2;
}

function dotPos(trackIdx: number, step: number, total: number, swing = 0) {
  const r = ringRadius(trackIdx);
  const a = stepAngle(step, total) + (step % 2 === 1 ? (swing / 100) * (Math.PI / total) : 0);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DrumMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Euclidean local state per track
  const [euclidValues, setEuclidValues] = useState<number[]>(() => state.tracks.map(() => 0));
  const euclidDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleEuclidChange = (trackIdx: number, value: number) => {
    const v = Math.max(0, Math.min(state.tracks[trackIdx].stepCount, value || 0));
    setEuclidValues(prev => { const n = [...prev]; n[trackIdx] = v; return n; });
    clearTimeout(euclidDebounceRef.current);
    euclidDebounceRef.current = setTimeout(() => {
      if (v > 0) dispatch({ type: 'APPLY_EUCLIDEAN', track: trackIdx, pulses: v });
    }, 300);
  };

  // Tone.js synths
  const synthsRef = useRef<{
    kick: Tone.MembraneSynth;
    snare: Tone.NoiseSynth;
    hihat: Tone.MetalSynth;
    clap: Tone.NoiseSynth;
    tom: Tone.MembraneSynth;
    cowbell: Tone.MetalSynth;
  } | null>(null);

  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const playheadAngleRef = useRef<number>(-Math.PI / 2);
  const rafRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const playheadLineRef = useRef<SVGLineElement>(null);

  // Tap tempo
  const tapTimesRef = useRef<number[]>([]);

  // Init synths once
  useEffect(() => {
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    }).toDestination();

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    }).toDestination();

    const hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    }).toDestination();
    hihat.frequency.value = 400;

    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
    }).toDestination();

    const tom = new Tone.MembraneSynth({
      pitchDecay: 0.08, octaves: 4,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    }).toDestination();

    const cowbell = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
      harmonicity: 5.1, modulationIndex: 16, resonance: 3000, octaves: 0.5,
    }).toDestination();
    cowbell.frequency.value = 562;

    synthsRef.current = { kick, snare, hihat, clap, tom, cowbell };

    return () => {
      [kick, snare, hihat, clap, tom, cowbell].forEach(s => s.dispose());
    };
  }, []);

  // Playhead animation
  useEffect(() => {
    let lastTime = performance.now();

    function animate(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      const { playing, bpm } = stateRef.current;

      if (playing) {
        // Advance angle based on BPM (one full rotation = one bar of 16 steps at current BPM)
        // We use the transport position for accuracy
        const pos = Tone.getTransport().seconds;
        const beatsPerSec = bpm / 60;
        const angle = (pos * beatsPerSec * Math.PI * 2) % (Math.PI * 2) - Math.PI / 2;
        playheadAngleRef.current = angle;
      }

      if (playheadLineRef.current) {
        const a = playheadAngleRef.current;
        const outerR = ringRadius(5) + 20;
        playheadLineRef.current.setAttribute('x1', String(CX));
        playheadLineRef.current.setAttribute('y1', String(CY));
        playheadLineRef.current.setAttribute('x2', String(CX + outerR * Math.cos(a)));
        playheadLineRef.current.setAttribute('y2', String(CY + outerR * Math.sin(a)));
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Sequencer
  const buildSequence = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }

    const maxSteps = 16; // LCM base for timing grid
    const seq = new Tone.Sequence(
      (time, step16) => {
        const { tracks, swing } = stateRef.current;
        const swingDelay = (step16 % 2 === 1) ? (swing / 100) * (60 / stateRef.current.bpm / 4) : 0;

        const synths = synthsRef.current;
        if (!synths) return;

        const synthArr = [synths.kick, synths.snare, synths.hihat, synths.clap, synths.tom, synths.cowbell];
        const noteArr = ['C1', undefined, undefined, undefined, 'G1', undefined];

        const anySoloed = tracks.some(t => t.soloed);

        tracks.forEach((track, ti) => {
          const trackStep = step16 % track.stepCount;
          dispatch({ type: 'SET_CURRENT_STEP', track: ti, step: trackStep });

          if (track.muted) return;
          if (anySoloed && !track.soloed) return;

          const stepVal = track.steps[trackStep];
          if (!stepVal) return;

          const velocity = stepVal === 2 ? 1.0 : 0.6;
          const s = synthArr[ti];
          const t = time + swingDelay;

          if (ti === 0 || ti === 4) {
            (s as Tone.MembraneSynth).triggerAttackRelease(noteArr[ti]!, '8n', t, velocity);
          } else if (ti === 2 || ti === 5) {
            (s as Tone.MetalSynth).triggerAttackRelease('16n', t, velocity);
          } else {
            (s as Tone.NoiseSynth).triggerAttackRelease('16n', t, velocity);
          }
        });
      },
      Array.from({ length: maxSteps }, (_, i) => i),
      '16n'
    );

    seq.start(0);
    sequenceRef.current = seq;
  }, []);

  useEffect(() => {
    buildSequence();
    return () => { sequenceRef.current?.dispose(); };
  }, [buildSequence]);

  // BPM sync
  useEffect(() => {
    Tone.getTransport().bpm.value = state.bpm;
  }, [state.bpm]);

  // Play/stop
  useEffect(() => {
    if (state.playing) {
      Tone.start().then(() => {
        Tone.getTransport().start();
      });
    } else {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
      dispatch({ type: 'STOP' });
    }
  }, [state.playing]);

  const handleStepClick = (trackIdx: number, stepIdx: number, e: React.MouseEvent) => {
    dispatch({ type: 'TOGGLE_STEP', track: trackIdx, step: stepIdx, accent: e.shiftKey });
  };

  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 8) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const intervals = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avg);
      dispatch({ type: 'SET_BPM', bpm: Math.max(40, Math.min(240, bpm)) });
    }
  };

  const polyRatioStr = state.tracks.map(t => t.stepCount).join(':');

  const anySoloed = state.tracks.some(t => t.soloed);

  return (
    <div style={{
      background: '#0a0a0f',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      gap: '16px',
    }}>
      <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.2em', color: '#aaa' }}>
        POLYRHYTHM DRUM MACHINE
      </h1>

      {/* SVG Sequencer */}
      <svg
        ref={svgRef}
        width={SVG_SIZE}
        height={SVG_SIZE}
        style={{ maxWidth: '100%', overflow: 'visible' }}
      >
        <defs>
          {TRACK_DEFS.map((def, ti) => (
            <filter key={ti} id={`glow-${ti}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
          <filter id="glow-playhead">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ring guides */}
        {state.tracks.map((_, ti) => (
          <circle
            key={ti}
            cx={CX} cy={CY}
            r={ringRadius(ti)}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="1"
          />
        ))}

        {/* Ring labels */}
        {state.tracks.map((track, ti) => {
          const r = ringRadius(ti);
          return (
            <text
              key={`label-${ti}`}
              x={CX - r - 8}
              y={CY}
              textAnchor="end"
              dominantBaseline="middle"
              fill={track.color}
              fontSize="10"
              fontFamily="monospace"
            >
              {track.name}
            </text>
          );
        })}

        {/* Step dots */}
        {state.tracks.map((track, ti) =>
          track.steps.map((stepVal, si) => {
            const { x, y } = dotPos(ti, si, track.stepCount, state.swing);
            const isActive = track.currentStep === si;
            const isOn = stepVal > 0;
            const isAccent = stepVal === 2;
            const r = isAccent ? DOT_R_ACCENT : DOT_R_NORMAL;
            const opacity = (anySoloed && !track.soloed) || track.muted ? 0.2 : 1;

            return (
              <circle
                key={`${ti}-${si}`}
                cx={x} cy={y} r={r}
                fill={isOn ? track.color : '#1e1e2e'}
                stroke={isActive ? '#fff' : (isOn ? track.color : '#333')}
                strokeWidth={isActive ? 2 : 1}
                opacity={opacity}
                filter={isActive && isOn ? `url(#glow-${ti})` : undefined}
                style={{ cursor: 'pointer', transition: 'fill 0.05s' }}
                onClick={(e) => handleStepClick(ti, si, e)}
              />
            );
          })
        )}

        {/* Playhead line */}
        <line
          ref={playheadLineRef}
          x1={CX} y1={CY}
          x2={CX} y2={CY - ringRadius(5) - 20}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2"
          filter="url(#glow-playhead)"
        />

        {/* Center circle */}
        <circle cx={CX} cy={CY} r={INNER_R - 4} fill="#0d0d1a" stroke="#222" strokeWidth="1" />

        {/* BPM display */}
        <text x={CX} y={CY - 10} textAnchor="middle" fill="#fff" fontSize="22" fontFamily="monospace" fontWeight="bold">
          {state.bpm}
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">
          BPM
        </text>
        <text
          x={CX} y={CY + 24}
          textAnchor="middle"
          fill="#444"
          fontSize="9"
          fontFamily="monospace"
          style={{ cursor: 'pointer' }}
          onClick={handleTapTempo}
        >
          TAP
        </text>

        {/* Polyrhythm ratio */}
        <text x={CX} y={SVG_SIZE - 8} textAnchor="middle" fill="#555" fontSize="10" fontFamily="monospace">
          {polyRatioStr}
        </text>
      </svg>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Play/Stop */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
          style={{
            background: state.playing ? '#ff4466' : '#00ffcc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 24px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          {state.playing ? '■ STOP' : '▶ PLAY'}
        </button>

        {/* BPM */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#888' }}>
          BPM: {state.bpm}
          <input
            type="range" min={40} max={240} value={state.bpm}
            onChange={e => dispatch({ type: 'SET_BPM', bpm: Number(e.target.value) })}
            style={{ width: '120px', accentColor: '#00ffcc' }}
          />
        </label>

        {/* Swing */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#888' }}>
          Swing: {state.swing}%
          <input
            type="range" min={0} max={100} value={state.swing}
            onChange={e => dispatch({ type: 'SET_SWING', swing: Number(e.target.value) })}
            style={{ width: '120px', accentColor: '#ffaa00' }}
          />
        </label>
      </div>

      {/* Pattern Presets */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#555', alignSelf: 'center' }}>Presets:</span>
        {(Object.keys(PRESETS) as PresetName[]).map(name => (
          <button
            key={name}
            onClick={() => {
              dispatch({ type: 'LOAD_PRESET', preset: name });
              setEuclidValues(state.tracks.map(() => 0));
            }}
            style={{
              background: '#1e1e2e',
              color: '#aaa',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '0.65rem',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >{name}</button>
        ))}
      </div>

      {/* Track controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '600px' }}>
        {state.tracks.map((track, ti) => (
          <div key={ti} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#0d0d1a', borderRadius: '6px', padding: '6px 10px',
            border: `1px solid ${track.color}22`,
          }}>
            {/* Color swatch */}
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: track.color, flexShrink: 0 }} />

            {/* Name */}
            <span style={{ width: '52px', fontSize: '0.7rem', color: track.color, letterSpacing: '0.05em' }}>
              {track.name}
            </span>

            {/* Mute */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_MUTE', track: ti })}
              style={{
                background: track.muted ? '#ff4466' : '#1e1e2e',
                color: track.muted ? '#000' : '#666',
                border: '1px solid #333',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >M</button>

            {/* Solo */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SOLO', track: ti })}
              style={{
                background: track.soloed ? '#ffaa00' : '#1e1e2e',
                color: track.soloed ? '#000' : '#666',
                border: '1px solid #333',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >S</button>

            {/* Step count */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#666' }}>
              <span style={{ color: '#444' }}>Steps:</span>
              <input
                type="number" min={3} max={16} value={track.stepCount}
                onChange={e => dispatch({ type: 'SET_STEP_COUNT', track: ti, count: Math.max(3, Math.min(16, Number(e.target.value))) })}
                style={{
                  width: '36px', background: '#111', color: '#aaa',
                  border: '1px solid #333', borderRadius: '3px',
                  padding: '2px 4px', fontFamily: 'monospace', fontSize: '0.65rem',
                }}
              />
            </label>

            {/* Euclidean */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#666', marginLeft: 'auto' }}>
              <span style={{ color: '#444' }}>Euclid:</span>
              <input
                type="number" min={0} max={track.stepCount}
                value={euclidValues[ti]}
                onChange={e => handleEuclidChange(ti, Number(e.target.value))}
                style={{
                  width: '36px', background: '#111', color: '#aaa',
                  border: '1px solid #333', borderRadius: '3px',
                  padding: '2px 4px', fontFamily: 'monospace', fontSize: '0.65rem',
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.65rem', color: '#333', margin: 0 }}>
        Click dot = toggle on/off · Shift+click = accent · Euclid = change value to apply
      </p>
    </div>
  );
}
