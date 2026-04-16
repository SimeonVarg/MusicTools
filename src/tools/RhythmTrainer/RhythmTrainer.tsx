import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

// ─── Types & Data ─────────────────────────────────────────────────────────────

interface RhythmPattern {
  name: string;
  level: 1 | 2 | 3 | 4;
  timeSignature: [number, number];
  bpm: number;
  beats: number[]; // positions in quarter notes
  description: string;
}

const PATTERNS: RhythmPattern[] = [
  { name: 'Quarter Notes',   level: 1, timeSignature: [4,4], bpm: 80,  beats: [0,1,2,3],                                    description: 'Four quarter notes' },
  { name: 'Eighth Notes',    level: 2, timeSignature: [4,4], bpm: 80,  beats: [0,0.5,1,1.5,2,2.5,3,3.5],                   description: 'Eight eighth notes' },
  { name: 'Dotted Quarter',  level: 2, timeSignature: [4,4], bpm: 70,  beats: [0,1.5,2,3.5],                                description: 'Dotted quarter + eighth' },
  { name: 'Syncopation',     level: 3, timeSignature: [4,4], bpm: 75,  beats: [0,0.5,1.5,2,2.5,3.5],                       description: 'Off-beat emphasis' },
  { name: 'Triplets',        level: 4, timeSignature: [4,4], bpm: 80,  beats: [0,1/3,2/3,1,4/3,5/3,2,7/3,8/3,3,10/3,11/3], description: 'Eighth note triplets' },
  { name: '5/4 Pattern',     level: 4, timeSignature: [5,4], bpm: 80,  beats: [0,1,2,3,4],                                  description: 'Five beats per bar' },
  { name: 'Waltz',           level: 1, timeSignature: [3,4], bpm: 90,  beats: [0,1,2],                                      description: 'Three quarter notes' },
];

type Accuracy = 'correct' | 'close' | 'miss';
type Grade = 'A' | 'B' | 'C' | 'D';

interface TapResult {
  time: number;   // ms since session start
  diffMs: number; // signed offset from nearest beat
  accuracy: Accuracy;
}

const ACC_COLOR: Record<Accuracy, string> = { correct: '#4ade80', close: '#fbbf24', miss: '#f87171' };
const ACC_SCORE: Record<Accuracy, number> = { correct: 10, close: 5, miss: 0 };

function getGrade(pct: number): Grade {
  if (pct >= 90) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

function lsKey(patName: string) { return `rt_hs_${patName}`; }

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  wrap: { background: '#0a0a14', color: '#e0e0f0', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '24px 16px', gap: 18 },
  h1: { fontSize: 22, color: '#a855f7', margin: 0 },
  row: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'center' },
  btn: (active?: boolean) => ({ background: active ? '#a855f7' : '#1a1a2e', color: active ? '#fff' : '#e0e0f0', border: `1px solid ${active ? '#a855f7' : '#333'}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }),
  tapBtn: (pressed: boolean) => ({ width: 140, height: 140, borderRadius: '50%', border: `3px solid ${pressed ? '#4ade80' : '#a855f7'}`, background: pressed ? 'rgba(74,222,128,0.15)' : '#12122a', color: pressed ? '#4ade80' : '#a855f7', fontSize: 26, fontFamily: 'monospace', cursor: 'pointer', transition: 'all .07s', boxShadow: pressed ? '0 0 28px #4ade8055' : 'none', userSelect: 'none' as const }),
  beatBox: (active: boolean, isTarget: boolean) => ({ width: 22, height: 22, borderRadius: 4, background: active ? '#a855f7' : isTarget ? '#2a1a4a' : '#16162a', border: `1.5px solid ${isTarget ? '#a855f7' : '#2a2a3a'}`, transition: 'background .06s', flexShrink: 0 as const }),
  pulse: (lit: boolean) => ({ width: 36, height: 36, borderRadius: '50%', background: lit ? '#a855f7' : '#1a1a2e', border: '2px solid #a855f7', transition: 'background .05s', boxShadow: lit ? '0 0 18px #a855f7' : 'none' }),
  label: { fontSize: 12, color: '#888' },
  slider: { accentColor: '#a855f7', width: 160 },
  card: { background: '#0e0e1c', border: '1px solid #222', borderRadius: 8, padding: '12px 18px', display: 'flex', flexDirection: 'column' as const, gap: 8, alignItems: 'center' },
  scoreRow: { display: 'flex', gap: 18, fontSize: 14, flexWrap: 'wrap' as const, justifyContent: 'center' },
  countIn: { fontSize: 48, color: '#a855f7', fontWeight: 'bold' as const, minHeight: 60 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(80);
  const [patIdx, setPatIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState<number | null>(null); // null = not counting, 0 = done
  const [currentBeatIdx, setCurrentBeatIdx] = useState(-1);
  const [beatFlash, setBeatFlash] = useState(false);
  const [taps, setTaps] = useState<TapResult[]>([]);
  const [pressed, setPressed] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const pattern = PATTERNS[patIdx];

  // Refs for metronome
  const synthRef = useRef<Tone.Synth | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef(0);      // performance.now() when pattern (post count-in) starts
  const expectedMsRef = useRef<number[]>([]); // beat times in ms relative to sessionStart
  const barDurMsRef = useRef(0);
  const beatMsRef = useRef(0);
  const metBeatRef = useRef(0);           // current metronome beat index (across loops)
  const tapsRef = useRef<TapResult[]>([]); // mirror for handleTap closure

  // Sync tapsRef
  useEffect(() => { tapsRef.current = taps; }, [taps]);

  // Load high score when pattern changes
  useEffect(() => {
    const hs = parseInt(localStorage.getItem(lsKey(pattern.name)) ?? '0', 10);
    setHighScore(hs);
  }, [patIdx, pattern.name]);

  const getSynth = useCallback(async () => {
    await Tone.start();
    if (!synthRef.current) {
      synthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      }).toDestination();
      synthRef.current.volume.value = -8;
    }
    return synthRef.current;
  }, []);

  const playClick = useCallback((high: boolean) => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.triggerAttackRelease(high ? 'C5' : 'G4', '32n');
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPlaying(false);
    setCountIn(null);
    setCurrentBeatIdx(-1);
    setBeatFlash(false);
    metBeatRef.current = 0;
  }, []);

  const start = useCallback(async () => {
    await getSynth();
    setTaps([]);
    tapsRef.current = [];
    setScore(0);
    setCurrentBeatIdx(-1);
    metBeatRef.current = 0;

    const effectiveBpm = bpm;
    const beatMs = (60 / effectiveBpm) * 1000;
    const timeSig = pattern.timeSignature[0];
    const barDurMs = timeSig * beatMs;
    beatMsRef.current = beatMs;
    barDurMsRef.current = barDurMs;

    // Build expected beat times (ms from session start, repeating every bar)
    expectedMsRef.current = pattern.beats.map(b => b * beatMs);

    // Count-in: timeSig beats before pattern
    let countInBeat = 0;
    setCountIn(timeSig);
    setPlaying(true);

    const countInStart = performance.now();

    intervalRef.current = setInterval(() => {
      const now = performance.now();

      if (countInBeat < timeSig) {
        // Count-in phase
        const elapsed = now - countInStart;
        const expectedBeat = countInBeat * beatMs;
        if (elapsed >= expectedBeat) {
          playClick(countInBeat === 0);
          setBeatFlash(true);
          setTimeout(() => setBeatFlash(false), 80);
          setCountIn(timeSig - countInBeat);
          countInBeat++;
          if (countInBeat === timeSig) {
            // Pattern starts now
            sessionStartRef.current = countInStart + timeSig * beatMs;
            setCountIn(null);
          }
        }
      } else {
        // Pattern phase
        const elapsed = now - sessionStartRef.current;
        const loopPos = elapsed % barDurMs;
        const loopNum = Math.floor(elapsed / barDurMs);
        const beatInLoop = metBeatRef.current % pattern.beats.length;
        const expectedLoopBeat = loopNum * pattern.beats.length + beatInLoop;
        const nextBeatTime = expectedMsRef.current[beatInLoop] + loopNum * barDurMs;

        if (elapsed >= nextBeatTime - 2) { // 2ms tolerance for interval jitter
          const isFirst = beatInLoop === 0;
          playClick(isFirst);
          setBeatFlash(true);
          setTimeout(() => setBeatFlash(false), 80);
          setCurrentBeatIdx(beatInLoop);
          metBeatRef.current++;
          void loopPos; void expectedLoopBeat;
        }
      }
    }, 8); // ~8ms polling for sub-beat accuracy
  }, [bpm, pattern, getSynth, playClick]);

  const toggle = useCallback(async () => {
    if (playing) { stop(); return; }
    await start();
  }, [playing, stop, start]);

  // Tap handler
  const handleTap = useCallback(() => {
    if (!playing || countIn !== null) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 100);

    const now = performance.now();
    const elapsed = now - sessionStartRef.current;
    const barDurMs = barDurMsRef.current;
    const expected = expectedMsRef.current;
    if (!expected.length || barDurMs === 0) return;

    // Find nearest expected beat across current and adjacent loops
    const loopNum = Math.floor(elapsed / barDurMs);
    let minDiff = Infinity;
    for (const e of expected) {
      for (const ln of [loopNum - 1, loopNum, loopNum + 1]) {
        const abs = e + ln * barDurMs;
        const diff = elapsed - abs;
        if (Math.abs(diff) < Math.abs(minDiff)) minDiff = diff;
      }
    }

    const accuracy: Accuracy = Math.abs(minDiff) <= 100 ? 'correct' : Math.abs(minDiff) <= 200 ? 'close' : 'miss';
    const tap: TapResult = { time: elapsed, diffMs: minDiff, accuracy };

    const newTaps = [...tapsRef.current, tap];
    tapsRef.current = newTaps;
    setTaps(newTaps);

    const newScore = newTaps.reduce((s, t) => s + ACC_SCORE[t.accuracy], 0);
    setScore(newScore);

    // Update high score
    const hs = parseInt(localStorage.getItem(lsKey(pattern.name)) ?? '0', 10);
    if (newScore > hs) {
      localStorage.setItem(lsKey(pattern.name), String(newScore));
      setHighScore(newScore);
    }
  }, [playing, countIn, pattern.name]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); handleTap(); } };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [handleTap]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    synthRef.current?.dispose();
  }, []);

  // ── Derived stats ──
  const total = taps.length;
  const correctCount = taps.filter(t => t.accuracy === 'correct').length;
  const closeCount = taps.filter(t => t.accuracy === 'close').length;
  const missCount = taps.filter(t => t.accuracy === 'miss').length;
  const accuracyPct = total > 0 ? Math.round(((correctCount + closeCount * 0.5) / total) * 100) : 0;
  const grade = total > 0 ? getGrade(accuracyPct) : null;

  // ── Beat grid: subdivisions at 1/12 resolution to cover triplets ──
  // Use 12 subdivisions per bar (covers quarters, eighths, triplets)
  const SUBDIVS = 12;
  const subdivPositions = Array.from({ length: SUBDIVS }, (_, i) => i / (SUBDIVS / pattern.timeSignature[0]));

  // ── SVG timeline ──
  const SVG_W = 660;
  const SVG_H = 70;
  const barDurMs = barDurMsRef.current || 1;
  const timelineWindow = barDurMs > 0 ? barDurMs : 2000;

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>🥁 Rhythm Trainer</h1>

      {/* Pattern selector */}
      <div style={S.row}>
        {PATTERNS.map((p, i) => (
          <button key={i} style={S.btn(i === patIdx)} onClick={() => { if (!playing) setPatIdx(i); }}>
            L{p.level} · {p.name}
          </button>
        ))}
      </div>

      {/* Pattern info */}
      <div style={{ ...S.card, minWidth: 300 }}>
        <div style={{ fontSize: 13, color: '#a855f7' }}>{pattern.name} — {pattern.description}</div>
        <div style={{ fontSize: 12, color: '#888' }}>
          Time: {pattern.timeSignature[0]}/{pattern.timeSignature[1]} · Suggested BPM: {pattern.bpm} · Beats: {pattern.beats.length}
        </div>

        {/* Beat boxes */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {subdivPositions.map((pos, i) => {
            const isTarget = pattern.beats.some(b => Math.abs(b - pos) < 0.01);
            const active = playing && currentBeatIdx >= 0 && Math.abs(pattern.beats[currentBeatIdx] - pos) < 0.01;
            return <div key={i} style={S.beatBox(active, isTarget)} title={`${pos.toFixed(2)}`} />;
          })}
        </div>
      </div>

      {/* Beat flash + count-in */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={S.pulse(beatFlash)} />
        <div style={S.countIn}>
          {countIn !== null ? countIn : playing ? '▶' : ''}
        </div>
      </div>

      {/* SVG Timeline */}
      <div style={{ ...S.card, width: '100%', maxWidth: SVG_W + 20 }}>
        <div style={{ fontSize: 12, color: '#888', alignSelf: 'flex-start' }}>
          Timeline — expected beats (lines) vs taps (dots) · Accuracy: <span style={{ color: '#a855f7' }}>{accuracyPct}%</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
          {/* Background */}
          <rect width={SVG_W} height={SVG_H} fill="#0a0a14" rx={4} />

          {/* Beat number labels */}
          {Array.from({ length: pattern.timeSignature[0] + 1 }, (_, i) => {
            const x = (i / pattern.timeSignature[0]) * SVG_W;
            return <text key={i} x={x} y={SVG_H - 2} fontSize={9} fill="#444" textAnchor="middle">{i + 1}</text>;
          })}

          {/* Expected beat lines */}
          {pattern.beats.map((b, i) => {
            const x = (b / pattern.timeSignature[0]) * SVG_W;
            return <line key={i} x1={x} x2={x} y1={8} y2={SVG_H - 14} stroke="#3a3a5a" strokeWidth={1.5} />;
          })}

          {/* Tap dots */}
          {taps.slice(-60).map((tap, i) => {
            const loopPos = tap.time % timelineWindow;
            const x = (loopPos / timelineWindow) * SVG_W;
            const y = 30 + (tap.diffMs / 200) * 14; // vertical = timing offset
            return (
              <g key={i}>
                <circle cx={x} cy={Math.max(10, Math.min(SVG_H - 16, y))} r={5} fill={ACC_COLOR[tap.accuracy]} opacity={0.85} />
              </g>
            );
          })}

          {/* Center line */}
          <line x1={0} x2={SVG_W} y1={30} y2={30} stroke="#222" strokeWidth={1} strokeDasharray="4 4" />
        </svg>
      </div>

      {/* TAP button */}
      <button style={S.tapBtn(pressed)} onMouseDown={handleTap}>
        TAP
      </button>
      <div style={{ fontSize: 11, color: '#555' }}>or press Spacebar</div>

      {/* Controls */}
      <div style={S.row}>
        <span style={S.label}>BPM: {bpm}</span>
        <input type="range" min={40} max={200} value={bpm}
          onChange={e => { if (!playing) setBpm(+e.target.value); }}
          style={S.slider} />
        <button style={{ ...S.btn(playing), minWidth: 90, fontSize: 15 }} onClick={toggle}>
          {playing ? '■ Stop' : '▶ Start'}
        </button>
      </div>

      {/* Score panel */}
      <div style={S.card}>
        <div style={S.scoreRow}>
          <span style={{ color: ACC_COLOR.correct }}>✓ Correct: {correctCount}</span>
          <span style={{ color: ACC_COLOR.close }}>~ Close: {closeCount}</span>
          <span style={{ color: ACC_COLOR.miss }}>✗ Miss: {missCount}</span>
          <span style={{ color: '#888' }}>Total: {total}</span>
        </div>
        <div style={S.scoreRow}>
          <span style={{ color: '#a855f7' }}>Score: {score}</span>
          <span style={{ color: '#fbbf24' }}>High Score: {highScore}</span>
          {grade && (
            <span style={{ color: grade === 'A' ? '#4ade80' : grade === 'B' ? '#a855f7' : grade === 'C' ? '#fbbf24' : '#f87171', fontSize: 18, fontWeight: 'bold' }}>
              Grade: {grade}
            </span>
          )}
        </div>
        {taps.length > 0 && (
          <div style={{ fontSize: 11, color: '#555', maxWidth: 500, textAlign: 'center' }}>
            Last tap: {taps[taps.length - 1].diffMs > 0 ? '+' : ''}{taps[taps.length - 1].diffMs.toFixed(0)}ms
            {' '}({taps[taps.length - 1].accuracy})
          </div>
        )}
      </div>
    </div>
  );
}
