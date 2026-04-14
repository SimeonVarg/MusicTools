import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Constants ────────────────────────────────────────────────────────────────

const FFT_SIZE = 2048;
const MIN_DB = -100;
const MAX_DB = -10;
const PEAK_DECAY = 0.3; // dB per frame
const PEAK_HOLD_FRAMES = 60;
const PEAK_THRESHOLD_DB = -60;

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const BANDS = [
  { label: 'Sub-Bass', min: 20,   max: 60   },
  { label: 'Bass',     min: 60,   max: 250  },
  { label: 'Low-Mid',  min: 250,  max: 500  },
  { label: 'Mid',      min: 500,  max: 2000 },
  { label: 'Hi-Mid',   min: 2000, max: 4000 },
  { label: 'Presence', min: 4000, max: 6000 },
  { label: 'Brilliance',min: 6000,max: 20000},
];

type Mode = 'bar' | 'waterfall' | '3d';

// ── Helpers ──────────────────────────────────────────────────────────────────

function freqToNote(freq: number): string {
  if (freq <= 0) return '';
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function dbToY(db: number, height: number): number {
  const norm = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return height - norm * height;
}

function amplitudeColor(norm: number): string {
  // purple(0) → cyan(0.5) → white(1)
  if (norm < 0.5) {
    const t = norm * 2;
    const r = Math.round(128 * (1 - t));
    const g = Math.round(255 * t);
    const b = 255;
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (norm - 0.5) * 2;
    const r = Math.round(255 * t);
    const g = 255;
    const b = 255;
    return `rgb(${r},${g},${b})`;
  }
}

function waterfallColor(norm: number): [number, number, number] {
  // black → blue → cyan → yellow → white
  if (norm < 0.25) {
    const t = norm / 0.25;
    return [0, 0, Math.round(255 * t)];
  } else if (norm < 0.5) {
    const t = (norm - 0.25) / 0.25;
    return [0, Math.round(255 * t), 255];
  } else if (norm < 0.75) {
    const t = (norm - 0.5) / 0.25;
    return [Math.round(255 * t), 255, Math.round(255 * (1 - t))];
  } else {
    const t = (norm - 0.75) / 0.25;
    return [255, 255, Math.round(255 * t)];
  }
}

function freqToX(freq: number, width: number, logScale: boolean, nyquist: number): number {
  if (logScale) {
    const logMin = Math.log10(20);
    const logMax = Math.log10(nyquist);
    return ((Math.log10(Math.max(freq, 20)) - logMin) / (logMax - logMin)) * width;
  }
  return (freq / nyquist) * width;
}

function binToFreq(bin: number, fftSize: number, sampleRate: number): number {
  return (bin * sampleRate) / fftSize;
}

// ── Peak state ───────────────────────────────────────────────────────────────

interface PeakState {
  db: number;
  holdFrames: number;
}

// ── 3D Spectrogram mesh ──────────────────────────────────────────────────────

const GRID_W = 64;
const GRID_H = 32;

function SpectrogramMesh({ analyser }: { analyser: AnalyserNode | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const historyRef = useRef<Float32Array[]>([]);
  const dataRef = useRef(new Uint8Array(analyser ? analyser.frequencyBinCount : FFT_SIZE / 2));

  useFrame(() => {
    if (!analyser || !meshRef.current) return;
    analyser.getByteFrequencyData(dataRef.current);

    // Downsample to GRID_W bins
    const row = new Float32Array(GRID_W);
    const step = Math.floor(dataRef.current.length / GRID_W);
    for (let i = 0; i < GRID_W; i++) {
      row[i] = dataRef.current[i * step] / 255;
    }

    historyRef.current.unshift(row);
    if (historyRef.current.length > GRID_H) historyRef.current.pop();

    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const cols = GRID_W + 1;
    const rows = GRID_H + 1;

    for (let r = 0; r < rows; r++) {
      const histRow = historyRef.current[Math.min(r, historyRef.current.length - 1)];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const amp = histRow ? (histRow[Math.min(c, GRID_W - 1)] ?? 0) : 0;
        pos.setZ(idx, amp * 1.5);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 3, 0, 0]}>
      <planeGeometry args={[6, 3, GRID_W, GRID_H]} />
      <meshStandardMaterial
        color="#00ffff"
        wireframe={false}
        side={THREE.DoubleSide}
        vertexColors={false}
        emissive="#003344"
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SpectrumAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const peaksRef = useRef<PeakState[]>([]);

  const [mode, setMode] = useState<Mode>('bar');
  const [logScale, setLogScale] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Audio init ─────────────────────────────────────────────────────────────

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      peaksRef.current = Array.from({ length: analyser.frequencyBinCount }, () => ({
        db: MIN_DB,
        holdFrames: 0,
      }));
      setRunning(true);
      setError(null);
    } catch (e) {
      setError('Microphone access denied or unavailable.');
    }
  }, []);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setRunning(false);
  }, []);

  // ── Draw bar mode ──────────────────────────────────────────────────────────

  const drawBar = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number,
    sampleRate: number,
  ) => {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    const nyquist = sampleRate / 2;
    const binCount = data.length;
    const peaks = peaksRef.current;
    const detectedNotes: { x: number; note: string; y: number }[] = [];

    // Draw frequency band backgrounds
    for (const band of BANDS) {
      const x1 = freqToX(band.min, width, logScale, nyquist);
      const x2 = freqToX(band.max, width, logScale, nyquist);
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(x1, 0, x2 - x1, height - 20);
    }

    // Draw bars
    const barCount = Math.min(binCount, logScale ? 512 : binCount);
    for (let i = 1; i < barCount; i++) {
      const freq = binToFreq(i, FFT_SIZE, sampleRate);
      if (freq < 20 || freq > nyquist) continue;

      const db = MIN_DB + (data[i] / 255) * (MAX_DB - MIN_DB);
      const norm = (db - MIN_DB) / (MAX_DB - MIN_DB);

      const x = freqToX(freq, width, logScale, nyquist);
      const nextFreq = binToFreq(i + 1, FFT_SIZE, sampleRate);
      const xNext = freqToX(nextFreq, width, logScale, nyquist);
      const barW = Math.max(1, xNext - x - 1);
      const barH = norm * (height - 20);

      ctx.fillStyle = amplitudeColor(norm);
      ctx.fillRect(x, height - 20 - barH, barW, barH);

      // Peak hold
      if (!peaks[i]) continue;
      if (db > peaks[i].db) {
        peaks[i].db = db;
        peaks[i].holdFrames = PEAK_HOLD_FRAMES;
      } else {
        if (peaks[i].holdFrames > 0) {
          peaks[i].holdFrames--;
        } else {
          peaks[i].db = Math.max(MIN_DB, peaks[i].db - PEAK_DECAY);
        }
      }

      const peakNorm = (peaks[i].db - MIN_DB) / (MAX_DB - MIN_DB);
      const peakY = height - 20 - peakNorm * (height - 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, peakY, barW, 2);
    }

    // Peak detection for note labels
    for (let i = 2; i < barCount - 2; i++) {
      const db = MIN_DB + (data[i] / 255) * (MAX_DB - MIN_DB);
      if (db < PEAK_THRESHOLD_DB) continue;
      const prev = MIN_DB + (data[i - 1] / 255) * (MAX_DB - MIN_DB);
      const next = MIN_DB + (data[i + 1] / 255) * (MAX_DB - MIN_DB);
      if (db > prev && db > next) {
        const freq = binToFreq(i, FFT_SIZE, sampleRate);
        const note = freqToNote(freq);
        const x = freqToX(freq, width, logScale, nyquist);
        const norm = (db - MIN_DB) / (MAX_DB - MIN_DB);
        const y = height - 20 - norm * (height - 20) - 14;
        detectedNotes.push({ x, note, y });
      }
    }

    // Draw note labels (deduplicate nearby)
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    let lastX = -999;
    for (const { x, note, y } of detectedNotes) {
      if (x - lastX < 30) continue;
      lastX = x;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 14, y - 10, 28, 13);
      ctx.fillStyle = '#ffff00';
      ctx.fillText(note, x, y);
    }

    // dB axis
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (let db = -90; db <= -10; db += 20) {
      const y = dbToY(db, height - 20);
      ctx.fillText(`${db}`, 28, y + 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(30, y, width - 30, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
    }

    // Freq axis labels
    ctx.textAlign = 'center';
    const freqLabels = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    for (const f of freqLabels) {
      if (f > nyquist) continue;
      const x = freqToX(f, width, logScale, nyquist);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x, height - 5);
    }

    // Band labels
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const band of BANDS) {
      const x1 = freqToX(band.min, width, logScale, nyquist);
      const x2 = freqToX(band.max, width, logScale, nyquist);
      ctx.fillText(band.label, (x1 + x2) / 2, 12);
    }
  }, [logScale]);

  // ── Draw waterfall mode ────────────────────────────────────────────────────

  const drawWaterfall = useCallback((
    wCtx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number,
    sampleRate: number,
  ) => {
    const nyquist = sampleRate / 2;
    const binCount = data.length;

    // Shift image down by 1 row
    const imageData = wCtx.getImageData(0, 0, width, height);
    const shifted = wCtx.createImageData(width, height);
    shifted.data.set(imageData.data.subarray(0, width * (height - 1) * 4), width * 4);
    wCtx.putImageData(shifted, 0, 0);

    // Draw new top row
    const rowData = wCtx.createImageData(width, 1);
    for (let x = 0; x < width; x++) {
      // Map pixel x → frequency
      let freq: number;
      if (logScale) {
        const logMin = Math.log10(20);
        const logMax = Math.log10(nyquist);
        freq = Math.pow(10, logMin + (x / width) * (logMax - logMin));
      } else {
        freq = (x / width) * nyquist;
      }
      const bin = Math.round((freq * FFT_SIZE) / sampleRate);
      const clamped = Math.max(0, Math.min(binCount - 1, bin));
      const norm = data[clamped] / 255;
      const [r, g, b] = waterfallColor(norm);
      const idx = x * 4;
      rowData.data[idx] = r;
      rowData.data[idx + 1] = g;
      rowData.data[idx + 2] = b;
      rowData.data[idx + 3] = 255;
    }
    wCtx.putImageData(rowData, 0, 0);
  }, [logScale]);

  // ── Animation loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!running) return;

    const loop = () => {
      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (!analyser || !data) return;

      analyser.getByteFrequencyData(data);
      const sampleRate = analyser.context.sampleRate;

      if (mode === 'bar') {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) drawBar(ctx, data, canvas.width, canvas.height, sampleRate);
        }
      } else if (mode === 'waterfall') {
        const canvas = waterfallCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) drawWaterfall(ctx, data, canvas.width, canvas.height, sampleRate);
        }
      }
      // 3D mode is handled by useFrame in SpectrogramMesh

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [running, mode, drawBar, drawWaterfall]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: '#0a0a0f',
      color: '#e0e0ff',
      fontFamily: 'monospace',
      padding: '12px',
      borderRadius: '8px',
      userSelect: 'none',
      minWidth: 600,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 16 }}>
          ⚡ Spectrum Analyzer
        </span>

        {/* Mode buttons */}
        {(['bar', 'waterfall', '3d'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? '#00ffff22' : 'transparent',
              border: `1px solid ${mode === m ? '#00ffff' : '#444'}`,
              color: mode === m ? '#00ffff' : '#888',
              borderRadius: 4,
              padding: '2px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}

        {/* Log/Lin toggle */}
        <button
          onClick={() => setLogScale(v => !v)}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#aaa',
            borderRadius: 4,
            padding: '2px 10px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {logScale ? 'LOG' : 'LIN'}
        </button>

        {/* Start/Stop */}
        <button
          onClick={running ? stopAudio : startAudio}
          style={{
            background: running ? '#ff003322' : '#00ff4422',
            border: `1px solid ${running ? '#ff0033' : '#00ff44'}`,
            color: running ? '#ff0033' : '#00ff44',
            borderRadius: 4,
            padding: '2px 14px',
            cursor: 'pointer',
            fontSize: 12,
            marginLeft: 'auto',
          }}
        >
          {running ? '⏹ STOP' : '▶ START'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 8 }}>{error}</div>
      )}

      {/* Visualizer area */}
      <div style={{ position: 'relative', width: '100%', height: 320 }}>
        {/* Bar mode */}
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          style={{
            display: mode === 'bar' ? 'block' : 'none',
            width: '100%',
            height: '100%',
            borderRadius: 4,
          }}
        />

        {/* Waterfall mode */}
        <canvas
          ref={waterfallCanvasRef}
          width={800}
          height={320}
          style={{
            display: mode === 'waterfall' ? 'block' : 'none',
            width: '100%',
            height: '100%',
            borderRadius: 4,
            background: '#000',
          }}
        />

        {/* 3D mode */}
        {mode === '3d' && (
          <div style={{ width: '100%', height: '100%' }}>
            <Canvas
              camera={{ position: [0, 3, 5], fov: 50 }}
              style={{ background: '#0a0a0f', borderRadius: 4 }}
            >
              <ambientLight intensity={0.4} />
              <pointLight position={[0, 4, 4]} intensity={1.5} color="#00ffff" />
              <pointLight position={[0, -2, 2]} intensity={0.5} color="#8800ff" />
              <SpectrogramMesh analyser={analyserRef.current} />
            </Canvas>
          </div>
        )}

        {/* Idle overlay */}
        {!running && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,15,0.85)',
            borderRadius: 4,
            fontSize: 14,
            color: '#555',
          }}>
            Press START to begin analysis
          </div>
        )}
      </div>
    </div>
  );
}
