import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

// ─── Types ────────────────────────────────────────────────────────────────────

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle';
type FilterType = 'lowpass' | 'highpass' | 'bandpass';
type LFOTarget = 'pitch' | 'filter' | 'amplitude';

interface OscState {
  type: OscType;
  mix: number;       // 0–1
  detune: number;    // -100 to +100 cents
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface LFOState {
  rate: number;   // 0.1–20 Hz
  depth: number;  // 0–100
  target: LFOTarget;
}

interface FilterState {
  type: FilterType;
  cutoff: number;    // 20–20000 Hz
  resonance: number; // 0–30
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function freqToNote(freq: number): string {
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${note}${oct}`;
}

// T1: logarithmic frequency knob mapping
const FREQ_MIN = 20;
const FREQ_MAX = 8000;
const freqToKnob = (f: number) => Math.log(f / FREQ_MIN) / Math.log(FREQ_MAX / FREQ_MIN);
const knobToFreq = (k: number) => FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, k);

// T2: note buttons C2–C7, white keys only (42 notes)
const WHITE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
function noteToFreq(name: string, octN: number): number {
  const semi = WHITE_SEMITONES[WHITE_NAMES.indexOf(name)];
  const midi = (octN + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const NOTE_BUTTONS = Array.from({ length: 6 }, (_, i) =>
  WHITE_NAMES.map(n => ({ label: `${n}${i + 2}`, freq: noteToFreq(n, i + 2) }))
).flat();

// T3: key map (semitone offsets from C in current octave)
const KEY_MAP: Record<string, number> = { a: 0, s: 2, d: 4, f: 5, g: 7, h: 9, j: 11, k: 12 };

// ─── SVG Rotary Knob ──────────────────────────────────────────────────────────

interface KnobProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
  onChange: (v: number) => void;
}

function Knob({ value, min, max, label, unit = '', size = 48, onChange }: KnobProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;
  const rad = (angle * Math.PI) / 180;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const px = cx + r * 0.7 * Math.sin(rad);
  const py = cy - r * 0.7 * Math.cos(rad);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startVal: value };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.startY - me.clientY) / 150;
      const next = Math.min(max, Math.max(min, dragRef.current.startVal + delta * (max - min)));
      onChange(next);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [value, min, max, onChange]);

  const displayVal = Number.isInteger(value) ? value : value.toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, userSelect: 'none' }}>
      <svg
        width={size} height={size}
        style={{ cursor: 'ns-resize' }}
        onMouseDown={onMouseDown}
      >
        {/* Track arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2a1a" strokeWidth={3} />
        {/* Value arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#00ff41"
          strokeWidth={3}
          strokeDasharray={`${norm * 2 * Math.PI * r * 0.75} ${2 * Math.PI * r}`}
          strokeDashoffset={2 * Math.PI * r * 0.125}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 3px #00ff41)' }}
          transform={`rotate(-135 ${cx} ${cy})`}
        />
        {/* Knob body */}
        <circle cx={cx} cy={cy} r={r - 5} fill="#0d1a0d" stroke="#00aa2a" strokeWidth={1} />
        {/* Indicator dot */}
        <circle cx={px} cy={py} r={2.5} fill="#00ff41" style={{ filter: 'drop-shadow(0 0 4px #00ff41)' }} />
      </svg>
      <span style={{ color: '#00cc33', fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 }}>
        {displayVal}{unit}
      </span>
      <span style={{ color: '#007a1a', fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_OSC: OscState = { type: 'sine', mix: 0.8, detune: 0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 };

export default function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Audio nodes refs
  const oscRefs = useRef<(Tone.Oscillator | null)[]>([null, null, null]);
  const gainRefs = useRef<(Tone.Gain | null)[]>([null, null, null]);
  const envRefs = useRef<(Tone.AmplitudeEnvelope | null)[]>([null, null, null]);
  const filterRef = useRef<Tone.Filter | null>(null);
  const lfoRef = useRef<Tone.LFO | null>(null);
  const lfoGainRef = useRef<Tone.Gain | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const analyser1Ref = useRef<AnalyserNode | null>(null);
  const analyser2Ref = useRef<AnalyserNode | null>(null);
  const analyserMainRef = useRef<AnalyserNode | null>(null);

  const [playing, setPlaying] = useState(false);
  const [lissajous, setLissajous] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [octave, setOctave] = useState(4); // T3/T4
  const [oscs, setOscs] = useState<OscState[]>([
    { ...DEFAULT_OSC, type: 'sine' },
    { ...DEFAULT_OSC, type: 'square', mix: 0.3 },
    { ...DEFAULT_OSC, type: 'sawtooth', mix: 0.2 },
  ]);
  const [lfo, setLfo] = useState<LFOState>({ rate: 2, depth: 20, target: 'pitch' });
  const [filter, setFilter] = useState<FilterState>({ type: 'lowpass', cutoff: 4000, resonance: 1 });

  // Stable refs so buildGraph/applyLFOTarget never go stale
  const oscsRef = useRef(oscs);
  const lfoStateRef = useRef(lfo);
  const filterStateRef = useRef(filter);
  const frequencyRef = useRef(frequency);
  oscsRef.current = oscs;
  lfoStateRef.current = lfo;
  filterStateRef.current = filter;
  frequencyRef.current = frequency;

  const applyLFOTarget = useCallback((lfoNode: Tone.LFO, target: LFOTarget) => {
    try { lfoNode.disconnect(); } catch {}
    if (target === 'pitch') {
      oscRefs.current.forEach(o => { if (o) lfoNode.connect(o.detune); });
    } else if (target === 'filter' && filterRef.current) {
      lfoNode.connect(filterRef.current.frequency);
    } else if (target === 'amplitude' && masterGainRef.current) {
      lfoNode.connect((masterGainRef.current as any).gain);
    }
  }, []);

  // Build audio graph
  const buildGraph = useCallback(async () => {
    await Tone.start();
    const ctx = Tone.getContext().rawContext as AudioContext;

    // Cleanup old
    oscRefs.current.forEach(o => { try { o?.stop(); o?.dispose(); } catch {} });
    gainRefs.current.forEach(g => { try { g?.dispose(); } catch {} });
    envRefs.current.forEach(e => { try { e?.dispose(); } catch {} });
    try { filterRef.current?.dispose(); } catch {}
    try { lfoRef.current?.stop(); lfoRef.current?.dispose(); } catch {}
    try { lfoGainRef.current?.dispose(); } catch {}
    try { masterGainRef.current?.dispose(); } catch {}

    const masterGain = new Tone.Gain(0.7).toDestination();
    masterGainRef.current = masterGain;

    const fs = filterStateRef.current;
    const toneFilter = new Tone.Filter(fs.cutoff, fs.type).connect(masterGain);
    toneFilter.Q.value = fs.resonance;
    filterRef.current = toneFilter;

    // Analysers
    const aMain = ctx.createAnalyser(); aMain.fftSize = 2048;
    const a1 = ctx.createAnalyser(); a1.fftSize = 2048;
    const a2 = ctx.createAnalyser(); a2.fftSize = 2048;
    analyserMainRef.current = aMain;
    analyser1Ref.current = a1;
    analyser2Ref.current = a2;

    // Connect master → analyser (tap the Tone.js internal node)
    (masterGain as any).input.connect(aMain);

    const newOscs: (Tone.Oscillator | null)[] = [];
    const newGains: (Tone.Gain | null)[] = [];
    const newEnvs: (Tone.AmplitudeEnvelope | null)[] = [];
    const freq = frequencyRef.current;

    oscsRef.current.forEach((oscState, i) => {
      const env = new Tone.AmplitudeEnvelope({
        attack: oscState.attack, decay: oscState.decay,
        sustain: oscState.sustain, release: oscState.release,
      }).connect(toneFilter);
      const gain = new Tone.Gain(oscState.mix).connect(env);
      const osc = new Tone.Oscillator({ frequency: freq, type: oscState.type, detune: oscState.detune }).connect(gain);

      // Tap osc1 and osc2 for Lissajous
      if (i === 0) (gain as any).output.connect(a1);
      if (i === 1) (gain as any).output.connect(a2);

      newOscs.push(osc);
      newGains.push(gain);
      newEnvs.push(env);
    });

    oscRefs.current = newOscs;
    gainRefs.current = newGains;
    envRefs.current = newEnvs;

    // LFO
    const ls = lfoStateRef.current;
    const lfoNode = new Tone.LFO({ frequency: ls.rate, min: -ls.depth, max: ls.depth }).start();
    lfoRef.current = lfoNode;

    applyLFOTarget(lfoNode, ls.target);
  }, [applyLFOTarget]);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas!.width, H = canvas!.height;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);

      if (lissajous) {
        drawLissajous(ctx, W, H);
      } else {
        drawWaveform(ctx, W, H);
      }
      drawScanlines(ctx, W, H);
      drawGrid(ctx, W, H);
    }

    function drawWaveform(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const analyser = analyserMainRef.current;
      if (!analyser) return;
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);

      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ff41';
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = W / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const x = i * step;
        const y = H / 2 - buf[i] * (H / 2 - 10);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawLissajous(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const a1 = analyser1Ref.current, a2 = analyser2Ref.current;
      if (!a1 || !a2) return;
      const b1 = new Float32Array(a1.fftSize), b2 = new Float32Array(a2.fftSize);
      a1.getFloatTimeDomainData(b1);
      a2.getFloatTimeDomainData(b2);

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff41';
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const len = Math.min(b1.length, b2.length);
      for (let i = 0; i < len; i++) {
        const x = W / 2 + b1[i] * (W / 2 - 10);
        const y = H / 2 - b2[i] * (H / 2 - 10);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
      ctx.strokeStyle = 'rgba(0,255,65,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += W / 8) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += H / 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    function drawScanlines(ctx: CanvasRenderingContext2D, W: number, H: number) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [lissajous]);

  // Sync oscillator params live
  useEffect(() => {
    oscs.forEach((s, i) => {
      const osc = oscRefs.current[i];
      const gain = gainRefs.current[i];
      const env = envRefs.current[i];
      if (!osc || !gain || !env) return;
      osc.type = s.type;
      osc.detune.value = s.detune;
      (gain as any).gain.value = s.mix;
      env.attack = s.attack;
      env.decay = s.decay;
      env.sustain = s.sustain;
      env.release = s.release;
    });
  }, [oscs]);

  useEffect(() => {
    oscRefs.current.forEach(o => { if (o) o.frequency.value = frequency; });
  }, [frequency]);

  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.frequency.value = filter.cutoff;
      filterRef.current.Q.value = filter.resonance;
      filterRef.current.type = filter.type;
    }
  }, [filter]);

  useEffect(() => {
    if (lfoRef.current) {
      lfoRef.current.frequency.value = lfo.rate;
      lfoRef.current.min = -lfo.depth;
      lfoRef.current.max = lfo.depth;
      applyLFOTarget(lfoRef.current, lfo.target);
    }
  }, [lfo, applyLFOTarget]);

  // T3: keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { setOctave(o => Math.max(1, o - 1)); return; }
      if (k === 'x') { setOctave(o => Math.min(7, o + 1)); return; }
      const semi = KEY_MAP[k];
      if (semi !== undefined) {
        const midi = (octave + 1) * 12 + semi;
        setFrequency(440 * Math.pow(2, (midi - 69) / 12));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [octave]);

  const togglePlay = async () => {
    if (!playing) {
      await buildGraph();
      oscRefs.current.forEach(o => o?.start());
      envRefs.current.forEach(e => e?.triggerAttack());
      setPlaying(true);
    } else {
      envRefs.current.forEach(e => e?.triggerRelease());
      setTimeout(() => {
        oscRefs.current.forEach(o => { try { o?.stop(); } catch {} });
        setPlaying(false);
      }, 1000);
    }
  };

  const updateOsc = (i: number, patch: Partial<OscState>) =>
    setOscs(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o));

  // ─── Render ────────────────────────────────────────────────────────────────

  const s = styles;

  return (
    <div style={s.root}>
      {/* CRT bezel */}
      <div style={s.bezel}>
        <div style={s.title}>◈ OSCILLOSCOPE MK-III ◈</div>

        {/* Canvas */}
        <div style={s.screenWrap}>
          <canvas ref={canvasRef} width={700} height={220} style={s.canvas} />
        </div>

        {/* Freq display + controls */}
        <div style={s.topBar}>
          <div style={s.freqDisplay}>
            <span style={s.freqHz}>{frequency.toFixed(1)} Hz</span>
            <span style={s.freqNote}>{freqToNote(frequency)}</span>
          </div>
          {/* T4: octave display + buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button style={{ ...s.typeBtn, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }} onClick={() => setOctave(o => Math.max(1, o - 1))}>−</button>
            <span style={{ color: '#a855f7', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, minWidth: 56, textAlign: 'center' }}>Octave {octave}</span>
            <button style={{ ...s.typeBtn, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }} onClick={() => setOctave(o => Math.min(7, o + 1))}>+</button>
          </div>
          {/* T1: logarithmic freq knob */}
          <Knob value={freqToKnob(frequency)} min={0} max={1} label="FREQ" unit="Hz" size={52}
            onChange={v => setFrequency(Math.round(knobToFreq(v)))} />
          <button style={{ ...s.btn, ...(playing ? s.btnActive : {}) }} onClick={togglePlay}>
            {playing ? '■ STOP' : '▶ PLAY'}
          </button>
          <button style={{ ...s.btn, ...(lissajous ? s.btnActive : {}) }}
            onClick={() => setLissajous(l => !l)}>
            {lissajous ? 'LISSAJOUS' : 'WAVEFORM'}
          </button>
        </div>

        {/* T2: note buttons C2–C7 white keys */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 80, overflowY: 'auto', marginTop: 6, marginBottom: 4 }}>
          {NOTE_BUTTONS.map(({ label, freq }) => (
            <button key={label} onClick={() => setFrequency(freq)} style={{
              background: Math.abs(frequency - freq) < 0.5 ? '#a855f7' : 'transparent',
              border: '1px solid #1a4a1a', color: Math.abs(frequency - freq) < 0.5 ? '#fff' : '#00cc33',
              padding: '2px 6px', fontSize: 10, fontFamily: 'monospace',
              cursor: 'pointer', borderRadius: 2,
            }}>{label}</button>
          ))}
        </div>

        {/* Oscillators */}
        <div style={s.section}>
          <div style={s.sectionLabel}>OSCILLATORS</div>
          <div style={s.oscRow}>
            {oscs.map((osc, i) => (
              <div key={i} style={s.oscCard}>
                <div style={s.oscTitle}>OSC {i + 1}</div>
                <div style={s.oscTypeRow}>
                  {(['sine', 'square', 'sawtooth', 'triangle'] as OscType[]).map(t => (
                    <button key={t} style={{ ...s.typeBtn, ...(osc.type === t ? s.typeBtnActive : {}) }}
                      onClick={() => updateOsc(i, { type: t })}>
                      {t.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>
                <div style={s.knobRow}>
                  <Knob value={osc.mix} min={0} max={1} label="MIX" onChange={v => updateOsc(i, { mix: v })} />
                  <Knob value={osc.detune} min={-100} max={100} label="DETUNE" unit="¢" onChange={v => updateOsc(i, { detune: Math.round(v) })} />
                </div>
                <div style={s.adsrLabel}>ADSR</div>
                <div style={s.knobRow}>
                  <Knob value={osc.attack} min={0.001} max={2} label="ATK" onChange={v => updateOsc(i, { attack: v })} />
                  <Knob value={osc.decay} min={0.001} max={2} label="DEC" onChange={v => updateOsc(i, { decay: v })} />
                  <Knob value={osc.sustain} min={0} max={1} label="SUS" onChange={v => updateOsc(i, { sustain: v })} />
                  <Knob value={osc.release} min={0.001} max={4} label="REL" onChange={v => updateOsc(i, { release: v })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter + LFO */}
        <div style={s.bottomRow}>
          <div style={s.section}>
            <div style={s.sectionLabel}>FILTER</div>
            <div style={s.filterTypeRow}>
              {(['lowpass', 'highpass', 'bandpass'] as FilterType[]).map(t => (
                <button key={t} style={{ ...s.typeBtn, ...(filter.type === t ? s.typeBtnActive : {}) }}
                  onClick={() => setFilter(f => ({ ...f, type: t }))}>
                  {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : 'BP'}
                </button>
              ))}
            </div>
            <div style={s.knobRow}>
              <Knob value={filter.cutoff} min={20} max={20000} label="CUTOFF" unit="Hz" size={52}
                onChange={v => setFilter(f => ({ ...f, cutoff: v }))} />
              <Knob value={filter.resonance} min={0} max={30} label="RES" size={52}
                onChange={v => setFilter(f => ({ ...f, resonance: v }))} />
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionLabel}>LFO</div>
            <div style={s.filterTypeRow}>
              {(['pitch', 'filter', 'amplitude'] as LFOTarget[]).map(t => (
                <button key={t} style={{ ...s.typeBtn, ...(lfo.target === t ? s.typeBtnActive : {}) }}
                  onClick={() => setLfo(l => ({ ...l, target: t }))}>
                  {t.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
            <div style={s.knobRow}>
              <Knob value={lfo.rate} min={0.1} max={20} label="RATE" unit="Hz" size={52}
                onChange={v => setLfo(l => ({ ...l, rate: v }))} />
              <Knob value={lfo.depth} min={0} max={100} label="DEPTH" size={52}
                onChange={v => setLfo(l => ({ ...l, depth: v }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'monospace',
  },
  bezel: {
    background: 'linear-gradient(160deg, #0a120a 0%, #050d05 100%)',
    border: '2px solid #1a3a1a',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 0 40px rgba(0,255,65,0.08), inset 0 0 60px rgba(0,0,0,0.6)',
    maxWidth: 780,
    width: '100%',
  },
  title: {
    color: '#00ff41',
    fontSize: 11,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
    textShadow: '0 0 8px #00ff41',
  },
  screenWrap: {
    border: '1px solid #0a2a0a',
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 12px rgba(0,255,65,0.05)',
    background: '#000',
  },
  canvas: {
    display: 'block',
    width: '100%',
    imageRendering: 'pixelated',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  freqDisplay: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  freqHz: {
    color: '#00ff41',
    fontSize: 22,
    fontFamily: '"Courier New", monospace',
    textShadow: '0 0 10px #00ff41',
    letterSpacing: 2,
  },
  freqNote: {
    color: '#00aa2a',
    fontSize: 13,
    letterSpacing: 3,
  },
  btn: {
    background: 'transparent',
    border: '1px solid #1a4a1a',
    color: '#00aa2a',
    padding: '6px 14px',
    fontSize: 10,
    letterSpacing: 2,
    cursor: 'pointer',
    borderRadius: 3,
    fontFamily: 'monospace',
    transition: 'all 0.15s',
  },
  btnActive: {
    borderColor: '#00ff41',
    color: '#00ff41',
    boxShadow: '0 0 8px rgba(0,255,65,0.3)',
  },
  section: {
    marginTop: 12,
    padding: '10px 12px',
    border: '1px solid #0d2a0d',
    borderRadius: 6,
    background: 'rgba(0,20,0,0.3)',
  },
  sectionLabel: {
    color: '#007a1a',
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  oscRow: {
    display: 'flex',
    gap: 10,
  },
  oscCard: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #0a200a',
    borderRadius: 4,
    background: 'rgba(0,10,0,0.4)',
  },
  oscTitle: {
    color: '#00cc33',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
  },
  oscTypeRow: {
    display: 'flex',
    gap: 3,
    marginBottom: 8,
  },
  typeBtn: {
    background: 'transparent',
    border: '1px solid #0d2a0d',
    color: '#005a10',
    padding: '2px 5px',
    fontSize: 8,
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  typeBtnActive: {
    borderColor: '#00ff41',
    color: '#00ff41',
    background: 'rgba(0,255,65,0.08)',
  },
  knobRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  adsrLabel: {
    color: '#005a10',
    fontSize: 8,
    letterSpacing: 2,
    textAlign: 'center',
    margin: '6px 0 4px',
  },
  bottomRow: {
    display: 'flex',
    gap: 12,
  },
  filterTypeRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
  },
};
