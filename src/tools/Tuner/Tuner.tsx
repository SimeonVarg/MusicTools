import { useEffect, useRef, useState, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BUFFER_SIZE = 2048;

// Harmonic partials 1–16 (fundamental, 2nd harmonic, 3rd harmonic, etc.)
const HARMONIC_RATIOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const HARMONIC_NAMES = [
  'Fundamental', 'Octave', 'P5+8va', '2 Octaves',
  'M3+2×8va', 'P5+2×8va', 'Harm. 7th', '3 Octaves',
  'M2+3×8va', 'M3+3×8va', 'A4+3×8va', 'P5+3×8va',
  'm7+3×8va', 'M7+3×8va', 'M7+3×8va', '4 Octaves',
];

// Just intonation intervals for 12 chromatic semitones
const JI_INTERVALS = [1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8];
const INTERVAL_NAMES = ['Unison','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7'];

// Harmonic colors: warm→cool by harmonic distance
const HARMONIC_COLORS = [
  '#ff4444','#ff6644','#ff8844','#ffaa44','#ffcc44','#ffee44',
  '#aaee44','#44ee44','#44eeaa','#44eeff','#44aaff','#4466ff',
  '#6644ff','#aa44ff','#ee44ff','#ff44aa',
];

// ── Pitch detection ──────────────────────────────────────────────────────────
function detectPitch(buf: Float32Array, sampleRate: number, refA: number): { freq: number; note: string; octave: number; cents: number; noteFreq: number } | null {
  // Autocorrelation
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null;

  const corr = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += buf[i] * buf[i + lag];
    corr[lag] = s;
  }

  // Find first dip then first peak after it
  let d = 1;
  while (d < n / 2 && corr[d] > corr[d - 1]) d++;
  let maxVal = -Infinity, maxLag = -1;
  for (let i = d; i < n / 2; i++) {
    if (corr[i] > maxVal) { maxVal = corr[i]; maxLag = i; }
  }
  if (maxLag < 2 || maxVal < 0.01) return null;

  // Parabolic interpolation for sub-sample accuracy
  const y0 = corr[maxLag - 1], y1 = corr[maxLag], y2 = corr[maxLag + 1];
  const refinedLag = maxLag - (y2 - y0) / (2 * (2 * y1 - y0 - y2));
  const freq = sampleRate / refinedLag;
  if (freq < 50 || freq > 4000) return null;

  const noteNum = 12 * Math.log2(freq / refA) + 69;
  const roundedNote = Math.round(noteNum);
  const noteFreq = refA * Math.pow(2, (roundedNote - 69) / 12);
  const cents = 1200 * Math.log2(freq / noteFreq);
  const noteName = NOTE_NAMES[((roundedNote % 12) + 12) % 12];
  const octave = Math.floor(roundedNote / 12) - 1;

  return { freq, note: noteName, octave, cents, noteFreq };
}

// ── VU Meter (SVG needle) ────────────────────────────────────────────────────
function VUMeter({ cents }: { cents: number }) {
  const clamp = Math.max(-50, Math.min(50, cents));
  // Map -50..+50 → -70°..+70°
  const angle = (clamp / 50) * 70;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 100, cy = 110, r = 80;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const inTune = Math.abs(cents) < 3;

  // Arc ticks
  const ticks = [];
  for (let c = -50; c <= 50; c += 10) {
    const a = ((c / 50) * 70 - 90) * (Math.PI / 180);
    const inner = 65, outer = 75;
    ticks.push(
      <line key={c}
        x1={cx + inner * Math.cos(a)} y1={cy + inner * Math.sin(a)}
        x2={cx + outer * Math.cos(a)} y2={cy + outer * Math.sin(a)}
        stroke={c === 0 ? '#00ff88' : '#888'} strokeWidth={c === 0 ? 2 : 1}
      />
    );
  }

  return (
    <svg viewBox="0 0 200 130" style={{ width: '100%', maxWidth: 260 }}>
      {/* Background arc */}
      <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#333" strokeWidth="12" strokeLinecap="round" />
      {/* Colored zones */}
      <path d="M 20 110 A 80 80 0 0 1 60 47" fill="none" stroke="#ff4444" strokeWidth="12" strokeLinecap="round" opacity="0.4" />
      <path d="M 140 47 A 80 80 0 0 1 180 110" fill="none" stroke="#ff4444" strokeWidth="12" strokeLinecap="round" opacity="0.4" />
      <path d="M 60 47 A 80 80 0 0 1 140 47" fill="none" stroke="#00ff88" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      {ticks}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={inTune ? '#00ff88' : '#ffcc44'} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={inTune ? '#00ff88' : '#ffcc44'} />
      {/* Labels */}
      <text x="18" y="125" fill="#888" fontSize="9" textAnchor="middle">-50</text>
      <text x="100" y="28" fill="#888" fontSize="9" textAnchor="middle">0</text>
      <text x="182" y="125" fill="#888" fontSize="9" textAnchor="middle">+50</text>
      <text x="100" y="100" fill={inTune ? '#00ff88' : '#ffcc44'} fontSize="11" textAnchor="middle" fontFamily="monospace">
        {cents >= 0 ? '+' : ''}{cents.toFixed(1)}¢
      </text>
    </svg>
  );
}

// ── Strobe Disc (SVG) ────────────────────────────────────────────────────────
function StrobeDisc({ cents, active }: { cents: number; active: boolean }) {
  const rotRef = useRef(0);
  const [rot, setRot] = useState(0);
  const rafRef = useRef<number>(0);
  const centsRef = useRef(cents);
  centsRef.current = cents;

  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Rotation speed proportional to cents deviation
      rotRef.current = (rotRef.current + centsRef.current * dt * 3) % 360;
      setRot(rotRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  const segments = 24;
  const paths = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * 360;
    const a2 = ((i + 0.45) / segments) * 360;
    const r1 = 28, r2 = 48;
    const toRad = (d: number) => d * Math.PI / 180;
    const x1 = 50 + r1 * Math.cos(toRad(a1)), y1 = 50 + r1 * Math.sin(toRad(a1));
    const x2 = 50 + r2 * Math.cos(toRad(a1)), y2 = 50 + r2 * Math.sin(toRad(a1));
    const x3 = 50 + r2 * Math.cos(toRad(a2)), y3 = 50 + r2 * Math.sin(toRad(a2));
    const x4 = 50 + r1 * Math.cos(toRad(a2)), y4 = 50 + r1 * Math.sin(toRad(a2));
    paths.push(
      <path key={i} d={`M${x1},${y1} L${x2},${y2} A${r2},${r2} 0 0,1 ${x3},${y3} L${x4},${y4} A${r1},${r1} 0 0,0 ${x1},${y1}`}
        fill={i % 2 === 0 ? '#e8d5a0' : '#2a2010'} />
    );
  }

  const inTune = Math.abs(cents) < 3;
  return (
    <svg viewBox="0 0 100 100" style={{ width: 120, height: 120 }}>
      <circle cx="50" cy="50" r="49" fill="#1a1a0a" stroke={inTune ? '#00ff88' : '#555'} strokeWidth="1.5" />
      <g transform={`rotate(${rot}, 50, 50)`}>{paths}</g>
      <circle cx="50" cy="50" r="6" fill={inTune ? '#00ff88' : '#888'} />
    </svg>
  );
}

// ── Harmonic Series Bars ─────────────────────────────────────────────────────
function HarmonicBars({ fundamental }: { fundamental: number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Integer multiples of the fundamental frequency</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, padding: '0 4px' }}>
        {HARMONIC_RATIOS.map((n, i) => {
          const height = Math.max(8, 80 - i * 4);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 14, height, background: HARMONIC_COLORS[i],
                borderRadius: '2px 2px 0 0', opacity: 0.85,
                boxShadow: `0 0 6px ${HARMONIC_COLORS[i]}88`,
              }} />
              <span style={{ fontSize: 8, color: '#888', fontFamily: 'monospace' }}>{n}/1</span>
              <span style={{ fontSize: 7, color: '#666', fontFamily: 'monospace' }}>{(fundamental * n).toFixed(0)}Hz</span>
              <span style={{ fontSize: 6, color: '#555', fontFamily: 'monospace', maxWidth: 28, textAlign: 'center', lineHeight: 1.1 }}>{HARMONIC_NAMES[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Just vs ET Comparison ────────────────────────────────────────────────────
function JustVsET({ fundamental }: { fundamental: number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Cent differences between pure JI intervals and 12-tone equal temperament</div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, minWidth: 'max-content', padding: '0 4px' }}>
          {JI_INTERVALS.map((ratio, i) => {
            const jiFreq = fundamental * ratio;
            const etFreq = fundamental * Math.pow(2, i / 12);
            const centDiff = 1200 * Math.log2(jiFreq / etFreq);
            const barH = Math.min(40, Math.abs(centDiff) * 2);
            const color = centDiff > 0 ? '#44aaff' : '#ff6644';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32 }}>
                <span style={{ fontSize: 7, color: '#aaa', fontFamily: 'monospace', marginBottom: 2 }}>
                  {centDiff >= 0 ? '+' : ''}{centDiff.toFixed(1)}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 44, justifyContent: 'flex-end' }}>
                  {centDiff > 0 && <div style={{ width: 10, height: barH, background: color, borderRadius: 2, opacity: 0.8 }} />}
                </div>
                <div style={{ height: 1, width: 32, background: '#444' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 44, justifyContent: 'flex-start' }}>
                  {centDiff < 0 && <div style={{ width: 10, height: barH, background: color, borderRadius: 2, opacity: 0.8 }} />}
                </div>
                <span style={{ fontSize: 8, color: '#e8d5a0', fontFamily: 'monospace' }}>{INTERVAL_NAMES[i]}</span>
                <span style={{ fontSize: 7, color: '#666', fontFamily: 'monospace' }}>{ratio.toFixed(4)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Lissajous Canvas ─────────────────────────────────────────────────────────
function Lissajous({ detectedFreq, refFreq }: { detectedFreq: number; refFreq: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    const draw = () => {
      ctx.fillStyle = 'rgba(10,10,20,0.15)';
      ctx.fillRect(0, 0, W, H);

      const ratio = detectedFreq / refFreq;
      const steps = 512;
      ctx.beginPath();
      for (let k = 0; k <= steps; k++) {
        const t = (k / steps) * Math.PI * 2 + tRef.current;
        const x = cx + (cx - 8) * Math.sin(ratio * t);
        const y = cy + (cy - 8) * Math.sin(t);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsl(${(tRef.current * 30) % 360}, 100%, 65%)`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      tRef.current += 0.015;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [detectedFreq, refFreq]);

  return (
    <canvas ref={canvasRef} width={160} height={160}
      style={{ borderRadius: 8, border: '1px solid #333', background: '#0a0a14' }} />
  );
}

// ── Main Tuner Component ─────────────────────────────────────────────────────
export default function Tuner() {
  const [active, setActive] = useState(false);
  const [refA, setRefA] = useState(440);
  const [pitch, setPitch] = useState<{ freq: number; note: string; octave: number; cents: number; noteFreq: number } | null>(null);
  const [strobeMode, setStrobeMode] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const refARef = useRef(refA);
  refARef.current = refA;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setActive(false);
    setPitch(null);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE * 2;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const buf = new Float32Array(BUFFER_SIZE);
      const loop = () => {
        analyser.getFloatTimeDomainData(buf);
        const result = detectPitch(buf, ctx.sampleRate, refARef.current);
        setPitch(result);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setActive(true);
    } catch {
      alert('Microphone access denied.');
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const cents = pitch?.cents ?? 0;
  const freq = pitch?.freq ?? 0;
  const fundamental = freq || 220;

  // Analog panel style
  const panel: React.CSSProperties = {
    background: 'linear-gradient(160deg, #1c1a14 0%, #0e0d09 100%)',
    border: '2px solid #3a3520',
    borderRadius: 16,
    padding: 20,
    color: '#e8d5a0',
    fontFamily: 'monospace',
    maxWidth: 700,
    margin: '0 auto',
    boxShadow: '0 0 40px #00000088, inset 0 1px 0 #4a4030',
  };

  const label: React.CSSProperties = { fontSize: 10, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 };
  const section: React.CSSProperties = { background: '#12110a', border: '1px solid #2a2510', borderRadius: 10, padding: 12 };

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: '#888', textTransform: 'uppercase' }}>Chromatic Tuner</div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#e8d5a0', letterSpacing: 2 }}>HARMONIC ANALYZER</div>
      </div>

      {/* Top row: Note display + VU meter + Strobe */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Note display */}
        <div style={{ ...section, flex: '1 1 140px', textAlign: 'center' }}>
          <div style={label}>Detected Note</div>
          <div style={{ fontSize: 52, fontWeight: 'bold', color: pitch ? '#e8d5a0' : '#333', lineHeight: 1 }}>
            {pitch ? pitch.note : '—'}
            <span style={{ fontSize: 22, color: '#888' }}>{pitch ? pitch.octave : ''}</span>
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
            {pitch ? `${pitch.freq.toFixed(2)} Hz` : '— Hz'}
          </div>
          <div style={{ fontSize: 11, color: pitch && Math.abs(pitch.cents) < 3 ? '#00ff88' : '#ffcc44', marginTop: 2 }}>
            {pitch ? (pitch.cents >= 0 ? '+' : '') + pitch.cents.toFixed(1) + '¢' : '—'}
          </div>
        </div>

        {/* VU Meter */}
        <div style={{ ...section, flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={label}>Cents Deviation</div>
          <VUMeter cents={cents} />
        </div>

        {/* Strobe + controls */}
        <div style={{ ...section, flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={label}>Strobe</div>
          {strobeMode && <StrobeDisc cents={cents} active={active} />}
          <button onClick={() => setStrobeMode(s => !s)}
            style={{ background: strobeMode ? '#2a2010' : '#1a1a0a', border: '1px solid #3a3520', color: '#e8d5a0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10 }}>
            {strobeMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Reference pitch + start/stop */}
      <div style={{ ...section, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={label}>Reference A</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={432} max={446} value={refA} onChange={e => setRefA(+e.target.value)}
              style={{ accentColor: '#e8d5a0', width: 120 }} />
            <span style={{ fontSize: 14, color: '#e8d5a0', minWidth: 50 }}>{refA} Hz</span>
          </div>
        </div>
        <button onClick={active ? stop : start}
          style={{
            background: active ? '#3a1010' : '#1a3a10', border: `1px solid ${active ? '#ff4444' : '#44ff88'}`,
            color: active ? '#ff8888' : '#88ff88', borderRadius: 8, padding: '8px 20px',
            cursor: 'pointer', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1,
          }}>
          {active ? '⏹ STOP' : '⏺ START'}
        </button>
        {!active && <span style={{ fontSize: 10, color: '#555' }}>Awaiting microphone input…</span>}
      </div>

      {/* Harmonic series */}
      <div style={{ ...section, marginBottom: 12 }}>
        <div style={label}>Harmonic Series</div>
        <HarmonicBars fundamental={fundamental} />
        {/* Overtone ratios */}
        <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
          {HARMONIC_RATIOS.map((n, i) => (
            <span key={i} style={{ fontSize: 8, color: HARMONIC_COLORS[i], fontFamily: 'monospace', background: '#1a1a0a', borderRadius: 3, padding: '1px 3px' }}>
              {n}/1
            </span>
          ))}
        </div>
      </div>

      {/* Just vs ET */}
      <div style={{ ...section, marginBottom: 12 }}>
        <div style={label}>Just vs Equal Temperament</div>
        <JustVsET fundamental={fundamental} />
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: '#666' }}>
          <span style={{ color: '#44aaff' }}>▲ JI sharper than ET</span>
          <span style={{ color: '#ff6644' }}>▼ JI flatter than ET</span>
        </div>
      </div>

      {/* Lissajous */}
      <div style={{ ...section, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={label}>Lissajous — Detected vs Reference</div>
          <Lissajous detectedFreq={freq || refA} refFreq={refA} />
        </div>
        <div style={{ fontSize: 10, color: '#666', lineHeight: 1.8 }}>
          <div>X axis: detected pitch</div>
          <div>Y axis: reference ({refA} Hz)</div>
          <div style={{ marginTop: 8, color: '#888' }}>
            Ratio: {freq ? (freq / refA).toFixed(4) : '—'}
          </div>
          <div style={{ color: freq && Math.abs(cents) < 3 ? '#00ff88' : '#888' }}>
            {freq && Math.abs(cents) < 3 ? '✓ In tune' : freq ? '✗ Out of tune' : 'No signal'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
