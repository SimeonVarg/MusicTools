import { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
type ScaleName = 'major' | 'minor' | 'pentatonic' | 'whole-tone' | 'lydian';
type Density = 'sparse' | 'medium' | 'dense';

interface Params {
  key: KeyName;
  scale: ScaleName;
  density: Density;
  tempo: number;
  reverb: number;
  complexity: number;
}

interface Preset {
  name: string;
  emoji: string;
  bg: string;
  colors: [number, number, number];
  params: Params;
}

// ─── Music Theory ─────────────────────────────────────────────────────────────

const KEYS: KeyName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  'whole-tone': [0, 2, 4, 6, 8, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
};

function buildScale(key: KeyName, scale: ScaleName, octave = 4): string[] {
  const root = KEYS.indexOf(key);
  return SCALE_INTERVALS[scale].map(i => {
    const midi = root + i;
    const oct = octave + Math.floor(midi / 12);
    const note = KEYS[midi % 12];
    return `${note}${oct}`;
  });
}

// Markov chain: state = scale degree index
function buildMarkov(len: number): number[][] {
  return Array.from({ length: len }, (_, i) => {
    const row = Array(len).fill(0);
    // stepwise motion
    if (i > 0) row[i - 1] = 3;
    if (i < len - 1) row[i + 1] = 3;
    // tonic pull
    row[0] += 4;
    // self
    row[i] += 1;
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map(v => v / sum);
  });
}

function markovNext(matrix: number[][], state: number): number {
  const row = matrix[state];
  let r = Math.random();
  for (let i = 0; i < row.length; i++) {
    r -= row[i];
    if (r <= 0) return i;
  }
  return 0;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Deep Space', emoji: '🌌',
    bg: 'linear-gradient(to bottom right, #1e1b4b, #3b0764, #000)',
    colors: [0.3, 0.1, 1.0],
    params: { key: 'D', scale: 'minor', density: 'sparse', tempo: 45, reverb: 0.9, complexity: 0.3 },
  },
  {
    name: 'Forest Rain', emoji: '🌿',
    bg: 'linear-gradient(to bottom right, #052e16, #064e3b, #000)',
    colors: [0.1, 0.8, 0.3],
    params: { key: 'G', scale: 'pentatonic', density: 'medium', tempo: 60, reverb: 0.7, complexity: 0.5 },
  },
  {
    name: 'Jazz Club', emoji: '🎷',
    bg: 'linear-gradient(to bottom right, #451a03, #7c2d12, #000)',
    colors: [1.0, 0.6, 0.1],
    params: { key: 'F', scale: 'lydian', density: 'dense', tempo: 100, reverb: 0.4, complexity: 0.8 },
  },
  {
    name: 'Underwater', emoji: '🌊',
    bg: 'linear-gradient(to bottom right, #083344, #1e3a5f, #000)',
    colors: [0.0, 0.7, 0.9],
    params: { key: 'A', scale: 'whole-tone', density: 'sparse', tempo: 50, reverb: 0.95, complexity: 0.4 },
  },
  {
    name: 'Sunrise', emoji: '🌅',
    bg: 'linear-gradient(to bottom right, #4c0519, #9a3412, #78350f)',
    colors: [1.0, 0.4, 0.2],
    params: { key: 'E', scale: 'major', density: 'medium', tempo: 75, reverb: 0.6, complexity: 0.6 },
  },
];

const DEGREE_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const DEGREE_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];

// ─── Particle System (Three.js via R3F) ───────────────────────────────────────

const PARTICLE_COUNT = 3000;

function Particles({ amplitude, colors }: { amplitude: number; colors: [number, number, number] }) {
  const meshRef = useRef<THREE.Points>(null!);
  const posRef = useRef<Float32Array>(null!);
  const velRef = useRef<Float32Array>(null!);

  useEffect(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      vel[i * 3]     = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    posRef.current = pos;
    velRef.current = vel;
    if (meshRef.current) {
      meshRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    }
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !posRef.current) return;
    const t = clock.getElapsedTime();
    const pos = posRef.current;
    const vel = velRef.current;
    const pulse = 1 + amplitude * 3;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      pos[ix] += vel[ix] + Math.sin(t * 0.3 + i * 0.01) * 0.002;
      pos[iy] += vel[iy] + Math.cos(t * 0.2 + i * 0.013) * 0.002;
      pos[iz] += vel[iz];
      // wrap
      if (Math.abs(pos[ix]) > 10) pos[ix] *= -0.9;
      if (Math.abs(pos[iy]) > 10) pos[iy] *= -0.9;
      if (Math.abs(pos[iz]) > 10) pos[iz] *= -0.9;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y = t * 0.05;
    meshRef.current.scale.setScalar(pulse);

    const mat = meshRef.current.material as THREE.PointsMaterial;
    mat.color.setRGB(colors[0], colors[1], colors[2]);
    mat.size = 0.05 + amplitude * 0.15;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry />
      <pointsMaterial size={0.05} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

// ─── Waveform Canvas ──────────────────────────────────────────────────────────

function WaveformDisplay({ analyser }: { analyser: Tone.Analyser | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    let raf: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const data = analyser.getValue() as Float32Array;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / data.length) * w;
        const y = h / 2 + (v as number) * h * 0.4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      style={{ width: '100%', height: 80, borderRadius: 8, background: 'rgba(0,0,0,0.4)' }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AmbientEngine() {
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [params, setParams] = useState<Params>(PRESETS[0].params);
  const [activePreset, setActivePreset] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [particleColors, setParticleColors] = useState<[number, number, number]>(PRESETS[0].colors);
  const [currentDegree, setCurrentDegree] = useState(0);
  const [recentDegrees, setRecentDegrees] = useState<number[]>([]);

  // Tone.js refs
  const droneRef = useRef<Tone.Synth | null>(null);
  const droneRef2 = useRef<Tone.Synth | null>(null);
  const melodyRef = useRef<Tone.Synth | null>(null);
  const harmonyRef = useRef<Tone.PolySynth | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const shakerRef = useRef<Tone.NoiseSynth | null>(null);
  const seqRef = useRef<Tone.Sequence | null>(null);
  const harmSeqRef = useRef<Tone.Sequence | null>(null);
  const percSeqRef = useRef<Tone.Sequence | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const ampMeterRef = useRef<Tone.Meter | null>(null);
  const markovStateRef = useRef(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ampRafRef = useRef<number>(0);

  const stopAll = useCallback(() => {
    seqRef.current?.stop();
    seqRef.current?.dispose();
    harmSeqRef.current?.stop();
    harmSeqRef.current?.dispose();
    percSeqRef.current?.stop();
    percSeqRef.current?.dispose();
    droneRef.current?.triggerRelease();
    droneRef2.current?.triggerRelease();
    [droneRef, droneRef2, melodyRef, harmonyRef, kickRef, shakerRef].forEach(r => {
      r.current?.dispose();
      r.current = null;
    });
    analyserRef.current?.dispose();
    analyserRef.current = null;
    ampMeterRef.current?.dispose();
    ampMeterRef.current = null;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    cancelAnimationFrame(ampRafRef.current);
  }, []);

  const startEngine = useCallback(async () => {
    await Tone.start();
    stopAll();

    const { key, scale, density, tempo, reverb: rvb, complexity } = params;
    Tone.getTransport().bpm.value = tempo;

    const masterReverb = new Tone.Reverb({ decay: 4 + rvb * 8, wet: rvb }).toDestination();
    await masterReverb.ready;

    const analyser = new Tone.Analyser('waveform', 256);
    const meter = new Tone.Meter();
    analyserRef.current = analyser;
    ampMeterRef.current = meter;
    masterReverb.connect(analyser);
    masterReverb.connect(meter);

    const scaleNotes = buildScale(key, scale, 3);
    const scaleNotes2 = buildScale(key, scale, 4);
    const matrix = buildMarkov(scaleNotes.length);

    // Drone
    const drone = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 4, decay: 0, sustain: 1, release: 6 },
    }).connect(masterReverb);
    const drone2 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 5, decay: 0, sustain: 1, release: 6 },
    }).connect(masterReverb);
    droneRef.current = drone;
    droneRef2.current = drone2;

    const rootNote = scaleNotes[0];
    const fifthIdx = Math.min(4, scaleNotes.length - 1);
    const fifthNote = scaleNotes[fifthIdx];
    drone.triggerAttack(rootNote, Tone.now());
    drone2.triggerAttack(fifthNote, Tone.now() + 0.5);

    // Slow filter sweep on drone
    const filter = new Tone.AutoFilter({ frequency: '0.1', depth: 0.6, wet: 0.5 }).connect(masterReverb).start();
    drone.disconnect(masterReverb);
    drone.connect(filter);

    // Melody (Markov)
    const melody = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1.5 },
      volume: -8,
    }).connect(masterReverb);
    melodyRef.current = melody;

    const melodyInterval = density === 'sparse' ? '2n' : density === 'medium' ? '4n' : '8n';
    const melodySeq = new Tone.Sequence(
      (time) => {
        if (Math.random() > (density === 'sparse' ? 0.4 : density === 'medium' ? 0.6 : 0.8)) return;
        markovStateRef.current = markovNext(matrix, markovStateRef.current);
        const deg = markovStateRef.current % scaleNotes2.length;
        const note = scaleNotes2[deg];
        melody.triggerAttackRelease(note, '8n', time);
        setCurrentDegree(deg);
        setRecentDegrees(prev => [deg, ...prev].slice(0, 7));
      },
      [null],
      melodyInterval,
    );
    seqRef.current = melodySeq;
    melodySeq.start(0);

    // Harmony
    const harmony = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 1, decay: 0.5, sustain: 0.6, release: 3 },
      volume: -12,
    }).connect(masterReverb);
    harmonyRef.current = harmony;

    const barsPerChord = Math.floor(4 + Math.random() * 4);
    let harmBar = 0;
    const harmSeq = new Tone.Sequence(
      (time) => {
        harmBar++;
        if (harmBar % barsPerChord !== 0) return;
        const numNotes = 2 + Math.floor(complexity * 2);
        const chord: string[] = [];
        const used = new Set<number>();
        while (chord.length < numNotes) {
          const idx = Math.floor(Math.random() * scaleNotes2.length);
          if (!used.has(idx)) { used.add(idx); chord.push(scaleNotes2[idx]); }
        }
        harmony.triggerAttackRelease(chord, '2n', time);
      },
      [null],
      '1n',
    );
    harmSeqRef.current = harmSeq;
    harmSeq.start(0);

    // Percussion
    const kick = new Tone.MembraneSynth({ volume: -18 }).connect(masterReverb);
    const shaker = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -24,
    }).connect(masterReverb);
    kickRef.current = kick;
    shakerRef.current = shaker;

    const percProb = density === 'sparse' ? 0.15 : density === 'medium' ? 0.3 : 0.5;
    const percSeq = new Tone.Sequence(
      (time) => {
        if (Math.random() < percProb) kick.triggerAttackRelease('C1', '8n', time);
        if (Math.random() < percProb * 1.5) shaker.triggerAttackRelease('16n', time);
      },
      [null],
      '8n',
    );
    percSeqRef.current = percSeq;
    percSeq.start(0);

    Tone.getTransport().start();

    // Amplitude polling
    const pollAmp = () => {
      const v = meter.getValue();
      const db = typeof v === 'number' ? v : (v as number[])[0];
      const norm = Math.max(0, Math.min(1, (db + 60) / 60));
      setAmplitude(norm);
      ampRafRef.current = requestAnimationFrame(pollAmp);
    };
    pollAmp();
  }, [params, stopAll]);

  const handlePlay = async () => {
    if (playing) {
      stopAll();
      setPlaying(false);
    } else {
      await startEngine();
      setPlaying(true);
    }
  };

  const handlePreset = (i: number) => {
    setActivePreset(i);
    setParams(PRESETS[i].params);
    setParticleColors(PRESETS[i].colors);
    if (playing) {
      stopAll();
      setPlaying(false);
    }
  };

  const handleRecord = async () => {
    if (recording) {
      mediaRecRef.current?.stop();
      setRecording(false);
      return;
    }
    // Capture audio via MediaRecorder from AudioContext destination
    const ctx = Tone.getContext().rawContext as AudioContext;
    const dest = ctx.createMediaStreamDestination();
    Tone.getDestination().connect(dest as unknown as Tone.ToneAudioNode);
    const mr = new MediaRecorder(dest.stream);
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ambient-recording.webm';
      a.click();
      URL.revokeObjectURL(url);
    };
    mr.start();
    mediaRecRef.current = mr;
    setRecording(true);
  };

  useEffect(() => () => stopAll(), [stopAll]);

  const updateParam = <K extends keyof Params>(k: K, v: Params[K]) => {
    setParams(p => ({ ...p, [k]: v }));
    if (playing) { stopAll(); setPlaying(false); }
  };

  const bg = PRESETS[activePreset].bg;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Three.js Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <Particles amplitude={amplitude} colors={particleColors} />
        </Canvas>
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 896, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 36, fontWeight: 'bold', letterSpacing: '-0.025em' }}>Ambient Engine</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Generative ambient music · procedurally evolving</p>
        </div>

        {/* Mood Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {PRESETS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => handlePreset(i)}
              style={{
                borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', cursor: 'pointer', color: '#fff',
                border: activePreset === i ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.1)',
                background: activePreset === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                transform: activePreset === i ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 30 }}>{p.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Waveform */}
        <div style={{ position: 'relative' }}>
          <WaveformDisplay analyser={analyserRef.current} />
          {playing && (
            <div style={{
              position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 10px',
              fontSize: 14, fontWeight: 'bold', color: '#a855f7',
            }}>
              Now playing: {DEGREE_NAMES[currentDegree % DEGREE_NAMES.length]}
            </div>
          )}
          {/* Scale Degree Strip */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
            {DEGREE_NAMES.map((r, i) => {
              const recency = recentDegrees.indexOf(i);
              const opacity = recency === 0 ? 1 : recency === 1 ? 0.6 : recency === 2 ? 0.3 : 0.1;
              const isActive = currentDegree === i && playing;
              return (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: isActive ? '#a855f7' : '#1e1e2e',
                  border: `1px solid ${isActive ? '#a855f7' : '#333'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#fff' : `rgba(168,85,247,${opacity})`,
                  fontSize: 11, fontWeight: 600,
                  transition: 'all 0.3s ease',
                }}>
                  {r}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Key + Scale */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key</label>
              <select
                value={params.key}
                onChange={e => updateParam('key', e.target.value as KeyName)}
                style={{ marginTop: 4, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
              >
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scale</label>
              <select
                value={params.scale}
                onChange={e => updateParam('scale', e.target.value as ScaleName)}
                style={{ marginTop: 4, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
              >
                {(Object.keys(SCALE_INTERVALS) as ScaleName[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Density */}
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Density</label>
            <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
              {(['sparse', 'medium', 'dense'] as Density[]).map(d => (
                <button
                  key={d}
                  onClick={() => updateParam('density', d)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 14, textTransform: 'capitalize',
                    transition: 'all 0.2s', border: 'none', cursor: 'pointer', color: '#fff',
                    background: params.density === d ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                    fontWeight: params.density === d ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          {([
            { key: 'tempo', label: 'Tempo (BPM)', min: 40, max: 120, step: 1 },
            { key: 'reverb', label: 'Reverb', min: 0, max: 1, step: 0.01 },
            { key: 'complexity', label: 'Harmonic Complexity', min: 0, max: 1, step: 0.01 },
          ] as { key: keyof Params; label: string; min: number; max: number; step: number }[]).map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                <span>{label}</span>
                <span>{typeof params[key] === 'number' ? (params[key] as number).toFixed(key === 'tempo' ? 0 : 2) : params[key]}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={params[key] as number}
                onChange={e => updateParam(key, parseFloat(e.target.value) as Params[typeof key])}
                style={{ width: '100%', accentColor: 'rgba(255,255,255,0.8)' }}
              />
            </div>
          ))}
        </div>

        {/* Play / Record */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            onClick={handlePlay}
            style={{
              padding: '16px 40px', borderRadius: 9999, fontSize: 18, fontWeight: 'bold',
              transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              boxShadow: playing ? '0 10px 15px -3px rgba(239,68,68,0.3)' : '0 10px 15px -3px rgba(255,255,255,0.2)',
              background: playing ? '#ef4444' : '#fff',
              color: playing ? '#fff' : '#000',
            }}
          >
            {playing ? '⏹ Stop' : '▶ Play'}
          </button>
          <button
            onClick={handleRecord}
            disabled={!playing}
            style={{
              padding: '16px 32px', borderRadius: 9999, fontSize: 18, fontWeight: 'bold',
              transition: 'all 0.2s', cursor: playing ? 'pointer' : 'default',
              opacity: !playing ? 0.4 : 1,
              background: recording ? '#dc2626' : 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: recording ? 'none' : '1px solid rgba(255,255,255,0.3)',
              boxShadow: recording ? '0 10px 15px -3px rgba(220,38,38,0.4)' : '0 10px 15px -3px rgba(0,0,0,0.1)',
            }}
          >
            {recording ? '⏺ Stop Rec' : '⏺ Record'}
          </button>
        </div>

        {/* Amplitude indicator */}
        <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div
            style={{ height: '100%', background: 'rgba(255,255,255,0.6)', transition: 'all 75ms', width: `${amplitude * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
