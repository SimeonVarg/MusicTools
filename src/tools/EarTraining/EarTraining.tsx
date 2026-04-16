import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';


// ─── Types ────────────────────────────────────────────────────────────────────

type GameMode = 'interval' | 'chord' | 'inversion' | 'progression';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type PlaybackType = 'ascending' | 'descending' | 'harmonic';

interface Interval {
  name: string;
  semitones: number;
  label: string;
}

interface ChordDef {
  name: string;
  label: string;
  intervals: number[]; // semitones from root
}

interface ProgressionDef {
  name: string;
  label: string;
  chords: number[][]; // each chord = semitone offsets from root
  description: string;
}

interface Stats {
  [key: string]: { correct: number; total: number };
}

type StatsMap = Record<string, { correct: number; total: number }>;

interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  stats: Stats;
}

// ─── Game Data ────────────────────────────────────────────────────────────────

const INTERVALS: Interval[] = [
  { name: 'P1',  semitones: 0,  label: 'Unison' },
  { name: 'm2',  semitones: 1,  label: 'Minor 2nd' },
  { name: 'M2',  semitones: 2,  label: 'Major 2nd' },
  { name: 'm3',  semitones: 3,  label: 'Minor 3rd' },
  { name: 'M3',  semitones: 4,  label: 'Major 3rd' },
  { name: 'P4',  semitones: 5,  label: 'Perfect 4th' },
  { name: 'TT',  semitones: 6,  label: 'Tritone' },
  { name: 'P5',  semitones: 7,  label: 'Perfect 5th' },
  { name: 'm6',  semitones: 8,  label: 'Minor 6th' },
  { name: 'M6',  semitones: 9,  label: 'Major 6th' },
  { name: 'm7',  semitones: 10, label: 'Minor 7th' },
  { name: 'M7',  semitones: 11, label: 'Major 7th' },
  { name: 'P8',  semitones: 12, label: 'Octave' },
];

const BEGINNER_INTERVALS = ['P4', 'P5', 'P8', 'M2', 'M3', 'M6', 'M7'];

const CHORD_DEFS: ChordDef[] = [
  { name: 'maj',   label: 'Major',          intervals: [0, 4, 7] },
  { name: 'min',   label: 'Minor',          intervals: [0, 3, 7] },
  { name: 'dim',   label: 'Diminished',     intervals: [0, 3, 6] },
  { name: 'aug',   label: 'Augmented',      intervals: [0, 4, 8] },
  { name: 'maj7',  label: 'Major 7th',      intervals: [0, 4, 7, 11] },
  { name: 'm7',    label: 'Minor 7th',      intervals: [0, 3, 7, 10] },
  { name: 'dom7',  label: 'Dominant 7th',   intervals: [0, 4, 7, 10] },
  { name: 'm7b5',  label: 'Half-Dim (ø7)',  intervals: [0, 3, 6, 10] },
  { name: 'dim7',  label: 'Diminished 7th', intervals: [0, 3, 6, 9] },
];

const BEGINNER_CHORDS = ['maj', 'min', 'dom7'];
const ADVANCED_CHORDS = ['m7b5', 'dim7', 'aug'];

const PROGRESSIONS: ProgressionDef[] = [
  {
    name: 'ii-V-I',
    label: 'ii–V–I',
    chords: [[0,3,7,10],[7,11,14,17],[0,4,7,11]],
    description: 'The most common jazz cadence',
  },
  {
    name: 'I-IV-V',
    label: 'I–IV–V',
    chords: [[0,4,7],[5,9,12],[7,11,14]],
    description: 'Classic blues/rock progression',
  },
  {
    name: 'I-vi-IV-V',
    label: 'I–vi–IV–V',
    chords: [[0,4,7],[9,12,16],[5,9,12],[7,11,14]],
    description: '50s doo-wop / pop progression',
  },
  {
    name: 'iii-VI-ii-V',
    label: 'iii–VI–ii–V',
    chords: [[4,7,11],[9,13,16],[2,5,9],[7,11,14]],
    description: 'Rhythm changes bridge',
  },
  {
    name: 'backdoor',
    label: 'Backdoor (♭VII7–I)',
    chords: [[10,14,17,20],[0,4,7,11]],
    description: 'Tritone sub / backdoor dominant',
  },
];

const XP_PER_CORRECT = 10;
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000];
const MILESTONE_STREAKS = [5, 10, 25, 50];

const NOTE_NAMES = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5'];

function midiToNote(semitones: number, root = 0): string {
  return NOTE_NAMES[root + semitones] ?? 'C4';
}

function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function xpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const lvl = getLevel(xp) - 1;
  const current = xp - LEVEL_THRESHOLDS[lvl];
  const needed = (LEVEL_THRESHOLDS[lvl + 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) - LEVEL_THRESHOLDS[lvl];
  return { current, needed, pct: Math.min(1, current / needed) };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T extends { name: string }>(arr: T[], stats: Stats): T {
  const weights = arr.map(item => {
    const s = stats[item.name];
    const acc = s && s.total > 0 ? s.correct / s.total : 0.5;
    return 1 / (acc + 0.1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function buildWeightedPool<T extends { name: string }>(items: T[], stats: StatsMap): T[] {
  return items.flatMap(item => {
    const s = stats[item.name];
    if (!s || s.total < 3) return [item, item];
    const acc = s.correct / s.total;
    if (acc < 0.6) return [item, item, item];
    if (acc > 0.85) return [item];
    return [item, item];
  });
}


// ─── Audio ────────────────────────────────────────────────────────────────────

async function ensureAudio() {
  if (Tone.getContext().state !== 'running') await Tone.start();
}

async function playInterval(semitones: number, type: PlaybackType, rootIdx = 0) {
  await ensureAudio();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
  }).toDestination();
  const root = NOTE_NAMES[rootIdx];
  const upper = NOTE_NAMES[rootIdx + semitones] ?? NOTE_NAMES[rootIdx];
  const now = Tone.now();
  if (type === 'harmonic') {
    synth.triggerAttackRelease([root, upper], '2n', now);
  } else if (type === 'ascending') {
    synth.triggerAttackRelease(root, '4n', now);
    synth.triggerAttackRelease(upper, '4n', now + 0.5);
  } else {
    synth.triggerAttackRelease(upper, '4n', now);
    synth.triggerAttackRelease(root, '4n', now + 0.5);
  }
  setTimeout(() => synth.dispose(), 3000);
}

async function playChord(intervals: number[], rootIdx = 0) {
  await ensureAudio();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 1 },
  }).toDestination();
  const notes = intervals.map(s => NOTE_NAMES[rootIdx + s] ?? NOTE_NAMES[rootIdx]);
  synth.triggerAttackRelease(notes, '2n', Tone.now());
  setTimeout(() => synth.dispose(), 3000);
}

async function playProgression(chords: number[][], rootIdx = 0) {
  await ensureAudio();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.8 },
  }).toDestination();
  const now = Tone.now();
  chords.forEach((chord, i) => {
    const notes = chord.map(s => NOTE_NAMES[Math.min(rootIdx + s, NOTE_NAMES.length - 1)]);
    synth.triggerAttackRelease(notes, '2n', now + i * 1.2);
  });
  setTimeout(() => synth.dispose(), chords.length * 1200 + 2000);
}

// ─── Question Generation ──────────────────────────────────────────────────────

interface Question {
  type: GameMode;
  correctAnswer: string;
  options: string[];
  playbackData: unknown;
  explanation: string;
}

function generateIntervalQuestion(difficulty: Difficulty, playbackType: PlaybackType, stats: StatsMap): Question {
  const pool = difficulty === 'beginner'
    ? INTERVALS.filter(i => BEGINNER_INTERVALS.includes(i.name))
    : INTERVALS;
  const correct = pick(buildWeightedPool(pool, stats));
  const distractors = shuffle(pool.filter(i => i.name !== correct.name)).slice(0, 3);
  const options = shuffle([correct, ...distractors]).map(i => i.name);
  const rootIdx = Math.floor(Math.random() * 4);
  return {
    type: 'interval',
    correctAnswer: correct.name,
    options,
    playbackData: { semitones: correct.semitones, playbackType, rootIdx },
    explanation: `${correct.label} (${correct.semitones} semitone${correct.semitones !== 1 ? 's' : ''})`,
  };
}

function generateChordQuestion(difficulty: Difficulty, stats: StatsMap): Question {
  const pool = difficulty === 'beginner'
    ? CHORD_DEFS.filter(c => BEGINNER_CHORDS.includes(c.name))
    : difficulty === 'intermediate'
    ? CHORD_DEFS.filter(c => !ADVANCED_CHORDS.includes(c.name))
    : CHORD_DEFS;
  const correct = pick(buildWeightedPool(pool, stats));
  const distractors = shuffle(pool.filter(c => c.name !== correct.name)).slice(0, 3);
  const options = shuffle([correct, ...distractors]).map(c => c.name);
  const rootIdx = Math.floor(Math.random() * 4);
  return {
    type: 'chord',
    correctAnswer: correct.name,
    options,
    playbackData: { intervals: correct.intervals, rootIdx },
    explanation: correct.label,
  };
}

function generateInversionQuestion(difficulty: Difficulty, stats: StatsMap): Question {
  const pool = difficulty === 'beginner'
    ? CHORD_DEFS.filter(c => BEGINNER_CHORDS.includes(c.name))
    : CHORD_DEFS.filter(c => !ADVANCED_CHORDS.includes(c.name));
  const chord = pick(buildWeightedPool(pool, stats));
  const maxInv = chord.intervals.length - 1;
  const invNum = Math.floor(Math.random() * (maxInv + 1));
  const invNames = ['Root Position', '1st Inversion', '2nd Inversion', '3rd Inversion'];
  const invKeys = ['root', '1st', '2nd', '3rd'];
  // rotate intervals for inversion
  const rotated = [...chord.intervals.slice(invNum), ...chord.intervals.slice(0, invNum)].map(
    (s, i, arr) => (i === 0 ? 0 : s - arr[0] + (s < arr[0] ? 12 : 0))
  );
  const options = shuffle(invKeys.slice(0, maxInv + 1));
  const rootIdx = Math.floor(Math.random() * 4);
  return {
    type: 'inversion',
    correctAnswer: invKeys[invNum],
    options: options.length < 4 ? [...options, ...invKeys.filter(k => !options.includes(k))].slice(0, 4) : options,
    playbackData: { intervals: rotated, rootIdx },
    explanation: `${chord.label} — ${invNames[invNum]}`,
  };
}

function generateProgressionQuestion(stats: StatsMap): Question {
  const correct = pick(buildWeightedPool(PROGRESSIONS, stats));
  const distractors = shuffle(PROGRESSIONS.filter(p => p.name !== correct.name)).slice(0, 3);
  const options = shuffle([correct, ...distractors]).map(p => p.name);
  const rootIdx = Math.floor(Math.random() * 3);
  return {
    type: 'progression',
    correctAnswer: correct.name,
    options,
    playbackData: { chords: correct.chords, rootIdx },
    explanation: `${correct.label}: ${correct.description}`,
  };
}

function generateQuestion(mode: GameMode, difficulty: Difficulty, playbackType: PlaybackType, stats: StatsMap): Question {
  switch (mode) {
    case 'interval':    return generateIntervalQuestion(difficulty, playbackType, stats);
    case 'chord':       return generateChordQuestion(difficulty, stats);
    case 'inversion':   return generateInversionQuestion(difficulty, stats);
    case 'progression': return generateProgressionQuestion(stats);
  }
}

function getOptionLabel(mode: GameMode, key: string): string {
  if (mode === 'interval') return INTERVALS.find(i => i.name === key)?.label ?? key;
  if (mode === 'chord')    return CHORD_DEFS.find(c => c.name === key)?.label ?? key;
  if (mode === 'inversion') {
    const map: Record<string, string> = { root: 'Root Position', '1st': '1st Inversion', '2nd': '2nd Inversion', '3rd': '3rd Inversion' };
    return map[key] ?? key;
  }
  return PROGRESSIONS.find(p => p.name === key)?.label ?? key;
}


// ─── Radar Chart ──────────────────────────────────────────────────────────────

interface RadarChartProps { stats: StatsMap; mode: GameMode; }

function RadarChart({ stats, mode }: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const keys = mode === 'interval'
    ? INTERVALS.map(i => i.name)
    : mode === 'chord' || mode === 'inversion'
    ? CHORD_DEFS.map(c => c.name)
    : PROGRESSIONS.map(p => p.name);

  useEffect(() => {
    if (!svgRef.current) return;
    const size = 220, cx = size / 2, cy = size / 2, r = 80;
    const n = keys.length;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const angleSlice = (Math.PI * 2) / n;
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, r]);

    // grid circles
    [0.25, 0.5, 0.75, 1].forEach(t => {
      svg.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', rScale(t)).attr('fill', 'none')
        .attr('stroke', '#1e3a5f').attr('stroke-width', 1);
    });

    // axes
    keys.forEach((_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + r * Math.cos(angle))
        .attr('y2', cy + r * Math.sin(angle))
        .attr('stroke', '#1e3a5f').attr('stroke-width', 1);
    });

    // data polygon
    const points = keys.map((k, i) => {
      const s = stats[k];
      const acc = s && s.total > 0 ? s.correct / s.total : 0;
      const angle = angleSlice * i - Math.PI / 2;
      return [cx + rScale(acc) * Math.cos(angle), cy + rScale(acc) * Math.sin(angle)];
    });

    const lineGen = d3.line<number[]>().x(d => d[0]).y(d => d[1]).curve(d3.curveLinearClosed);
    svg.append('path')
      .datum(points)
      .attr('d', lineGen as never)
      .attr('fill', 'rgba(0,255,200,0.15)')
      .attr('stroke', '#00ffc8')
      .attr('stroke-width', 2);

    // dots
    points.forEach(([x, y]) => {
      svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 3)
        .attr('fill', '#00ffc8');
    });

    // labels
    keys.forEach((k, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const lx = cx + (r + 18) * Math.cos(angle);
      const ly = cy + (r + 18) * Math.sin(angle);
      svg.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#7dd3fc').attr('font-size', '9px')
        .text(k);
    });
  }, [stats, keys]);

  return <svg ref={svgRef} width={220} height={220} />;
}


// ─── Main Component ───────────────────────────────────────────────────────────

const NEON = { cyan: '#00ffc8', pink: '#ff2d78', yellow: '#ffe600', purple: '#b44fff' };

export default function EarTraining() {
  const [gameState, setGameState] = useState<GameState>({
    mode: 'interval',
    difficulty: 'beginner',
    score: 0,
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    stats: {},
  });
  const [stats, setStats] = useState<StatsMap>(() => {
    try { return JSON.parse(localStorage.getItem('ear-training-stats') ?? '{}'); }
    catch { return {}; }
  });
  const [playbackType, setPlaybackType] = useState<PlaybackType>('ascending');
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<string | null>(null); // selected option key
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [started, setStarted] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const prevLevel = useRef(1);

  const newQuestion = useCallback(() => {
    setAnswered(null);
    setQuestion(generateQuestion(gameState.mode, gameState.difficulty, playbackType, stats));
  }, [gameState.mode, gameState.difficulty, playbackType, stats]);

  useEffect(() => { if (started) newQuestion(); }, [started, gameState.mode, gameState.difficulty]);

  const replayAudio = useCallback(() => {
    if (!question) return;
    setIsPlaying(true);
    const d = question.playbackData as Record<string, unknown>;
    let duration = 2000;
    if (question.type === 'interval') {
      playInterval(d.semitones as number, d.playbackType as PlaybackType, d.rootIdx as number);
    } else if (question.type === 'chord' || question.type === 'inversion') {
      playChord(d.intervals as number[], d.rootIdx as number);
    } else {
      const chords = d.chords as number[][];
      duration = chords.length * 1200 + 500;
      playProgression(chords, d.rootIdx as number);
    }
    setTimeout(() => setIsPlaying(false), duration);
  }, [question]);

  const playRoot = useCallback(async () => {
    if (!question || question.type !== 'interval') return;
    const d = question.playbackData as Record<string, unknown>;
    setIsPlaying(true);
    await ensureAudio();
    const synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 } }).toDestination();
    synth.triggerAttackRelease(NOTE_NAMES[d.rootIdx as number], '2n');
    setTimeout(() => { synth.dispose(); setIsPlaying(false); }, 1200);
  }, [question]);

  // auto-play on new question
  useEffect(() => { if (question) replayAudio(); }, [question]);

  const handleAnswer = useCallback((chosen: string) => {
    if (answered || !question) return;
    setAnswered(chosen);
    const correct = chosen === question.correctAnswer;
    const key = question.correctAnswer;

    setStats(prev => {
      const prevStat = prev[key] ?? { correct: 0, total: 0 };
      const next = { ...prev, [key]: { correct: prevStat.correct + (correct ? 1 : 0), total: prevStat.total + 1 } };
      localStorage.setItem('ear-training-stats', JSON.stringify(next));
      return next;
    });

    setGameState(prev => {
      const newStreak = correct ? prev.streak + 1 : 0;
      const newXp = prev.xp + (correct ? XP_PER_CORRECT : 0);
      const newScore = prev.score + (correct ? XP_PER_CORRECT * newStreak : 0);
      const newLevel = getLevel(newXp);
      return {
        ...prev,
        score: newScore,
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        stats: prev.stats, // keep for backward compat
      };
    });
  }, [answered, question]);

  // level-up detection
  useEffect(() => {
    if (gameState.level > prevLevel.current) {
      setShowLevelUp(true);
      prevLevel.current = gameState.level;
      setTimeout(() => setShowLevelUp(false), 2500);
    }
  }, [gameState.level]);

  // fire burst on milestone streaks
  useEffect(() => {
    if (MILESTONE_STREAKS.includes(gameState.streak)) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 600);
      return () => clearTimeout(t);
    }
  }, [gameState.streak]);

  const xpInfo = xpToNextLevel(gameState.xp);

  // ── Splash screen ──
  if (!started) {
    return (
      <div style={styles.root}>
        <div style={styles.splash}>
          <div style={{ ...styles.neonText, fontSize: 48, marginBottom: 8 }}>🎵 EAR TRAINING</div>
          <div style={{ color: '#7dd3fc', marginBottom: 32, fontSize: 14 }}>Train your musical ear. Level up. Dominate.</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {(['interval','chord','inversion','progression'] as GameMode[]).map(m => (
              <button key={m} style={{ ...styles.modeBtn, ...(gameState.mode === m ? styles.modeBtnActive : {}) }}
                onClick={() => setGameState(s => ({ ...s, mode: m }))}>
                {m === 'interval' ? '🎼 Interval ID' : m === 'chord' ? '🎹 Chord Quality' : m === 'inversion' ? '🔄 Chord Inversion' : '🎸 Progression ID'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            {(['beginner','intermediate','advanced'] as Difficulty[]).map(d => (
              <button key={d} style={{ ...styles.diffBtn, ...(gameState.difficulty === d ? styles.diffBtnActive : {}) }}
                onClick={() => setGameState(s => ({ ...s, difficulty: d }))}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <button style={styles.startBtn} onClick={() => setStarted(true)}>▶ START GAME</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* HUD */}
      <div style={styles.hud}>
        <div style={styles.scoreBox}>
          <span style={{ color: '#888', fontSize: 10, letterSpacing: 2 }}>SCORE</span>
          <span style={{ ...styles.neonText, fontSize: 28 }}>{String(gameState.score).padStart(6, '0')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ color: NEON.yellow, fontSize: 13, fontWeight: 700 }}>LVL {gameState.level}</span>
          <div style={styles.xpBar}>
            <div style={{ ...styles.xpFill, width: `${xpInfo.pct * 100}%` }} />
          </div>
          <span style={{ color: '#888', fontSize: 10 }}>{xpInfo.current}/{xpInfo.needed} XP</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{gameState.streak >= 5 ? '🔥' : '💫'}</span>
          <span style={{ color: NEON.pink, fontWeight: 700, fontSize: 18, animation: celebrating ? 'streakPulse 0.6s ease-in-out' : undefined }}>{gameState.streak}</span>
          <span style={{ color: '#555', fontSize: 10 }}>STREAK</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.smallBtn} onClick={() => setShowStats(s => !s)}>📊</button>
          <button style={styles.smallBtn} onClick={() => { setStarted(false); setQuestion(null); setAnswered(null); }}>⚙</button>
        </div>
      </div>

      {/* Mode + Difficulty bar */}
      <div style={styles.subBar}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['interval','chord','inversion','progression'] as GameMode[]).map(m => (
            <button key={m} style={{ ...styles.tabBtn, ...(gameState.mode === m ? styles.tabBtnActive : {}) }}
              onClick={() => { setGameState(s => ({ ...s, mode: m })); setAnswered(null); }}>
              {m === 'interval' ? 'Interval' : m === 'chord' ? 'Chord' : m === 'inversion' ? 'Inversion' : 'Progression'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['beginner','intermediate','advanced'] as Difficulty[]).map(d => (
            <button key={d} style={{ ...styles.tabBtn, ...(gameState.difficulty === d ? { ...styles.tabBtnActive, borderColor: NEON.yellow } : {}) }}
              onClick={() => setGameState(s => ({ ...s, difficulty: d }))}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        {gameState.mode === 'interval' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ascending','descending','harmonic'] as PlaybackType[]).map(t => (
              <button key={t} style={{ ...styles.tabBtn, ...(playbackType === t ? { ...styles.tabBtnActive, borderColor: NEON.purple } : {}) }}
                onClick={() => setPlaybackType(t)}>
                {t === 'ascending' ? '↑' : t === 'descending' ? '↓' : '≈'} {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main game area */}
      <div style={styles.gameArea}>
        {question && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ ...styles.replayBtn, opacity: isPlaying ? 0.5 : 1 }} disabled={isPlaying} onClick={replayAudio}>🔊 Replay</button>
              {question.type === 'interval' && (
                <button style={{ ...styles.replayBtn, opacity: isPlaying ? 0.5 : 1 }} disabled={isPlaying} onClick={playRoot}>🎵 Play Root</button>
              )}
            </div>

            {/* Answer buttons */}
            <div style={styles.optionsGrid}>
              {question.options.map(opt => {
                const isCorrect = opt === question.correctAnswer;
                const isChosen = opt === answered;
                const revealed = answered !== null;
                const s = stats[opt];
                const isWeak = s && s.total >= 3 && s.correct / s.total < 0.6;
                let bg = 'transparent';
                let border = isWeak && !revealed ? '#ef4444' : '#1e3a5f';
                let color = '#cbd5e1';
                if (revealed && isCorrect) { bg = 'rgba(0,255,100,0.15)'; border = '#00ff64'; color = '#00ff64'; }
                else if (revealed && isChosen && !isCorrect) { bg = 'rgba(255,45,120,0.15)'; border = NEON.pink; color = NEON.pink; }
                return (
                  <motion.button
                    key={opt}
                    style={{ ...styles.optionBtn, background: bg, borderColor: border, color }}
                    onClick={() => handleAnswer(opt)}
                    animate={revealed && isChosen && !isCorrect ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    whileHover={!answered ? { scale: 1.04, borderColor: NEON.cyan } : {}}
                    whileTap={!answered ? { scale: 0.97 } : {}}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{opt}</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{getOptionLabel(question.type, opt)}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ ...styles.feedback, borderColor: answered === question.correctAnswer ? '#00ff64' : NEON.pink,
                    color: answered === question.correctAnswer ? '#00ff64' : NEON.pink }}>
                  <span style={{ fontSize: 18 }}>{answered === question.correctAnswer ? '✅ Correct!' : '❌ Wrong'}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{question.explanation}</span>
                  <button style={styles.nextBtn} onClick={newQuestion}>Next →</button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Stats panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
            style={styles.statsPanel}>
            <div style={{ color: NEON.cyan, fontWeight: 700, marginBottom: 8 }}>📊 Accuracy Radar</div>
            <RadarChart stats={stats} mode={gameState.mode} />
            <div style={{ color: '#7dd3fc', fontSize: 12, marginTop: 8 }}>Best Streak: 🔥 {gameState.bestStreak}</div>
            <div style={{ marginTop: 16, width: '100%' }}>
              <div style={{ color: NEON.pink, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>⚠ Weakest</div>
              {(() => {
                const keys = gameState.mode === 'interval' ? INTERVALS.map(i => i.name)
                  : gameState.mode === 'chord' || gameState.mode === 'inversion' ? CHORD_DEFS.map(c => c.name)
                  : PROGRESSIONS.map(p => p.name);
                return keys
                  .map(k => {
                    const s = stats[k];
                    const acc = s && s.total > 0 ? s.correct / s.total : s ? 0 : -1;
                    return { name: k, acc, total: s?.total ?? 0 };
                  })
                  .filter(x => x.total > 0)
                  .sort((a, b) => a.acc - b.acc)
                  .slice(0, 3)
                  .map(x => (
                    <div key={x.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', padding: '2px 0' }}>
                      <span>{getOptionLabel(gameState.mode, x.name)}</span>
                      <span style={{ color: x.acc < 0.5 ? NEON.pink : NEON.cyan }}>{Math.round(x.acc * 100)}%</span>
                    </div>
                  ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }}
            style={styles.levelUpOverlay}>
            <div style={{ fontSize: 48 }}>⚡</div>
            <div style={{ ...styles.neonText, fontSize: 36 }}>LEVEL UP!</div>
            <div style={{ color: NEON.yellow, fontSize: 22 }}>Level {gameState.level}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* streakPulse keyframe */}
      <style>{`@keyframes streakPulse { 0% { transform: scale(1); color: ${NEON.pink}; } 50% { transform: scale(1.5); color: ${NEON.yellow}; } 100% { transform: scale(1); color: ${NEON.pink}; } }`}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: '#050d1a', color: '#e2e8f0',
    fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column',
    userSelect: 'none',
  },
  splash: {
    margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 40, maxWidth: 600,
  },
  neonText: {
    color: NEON.cyan, textShadow: `0 0 10px ${NEON.cyan}, 0 0 30px ${NEON.cyan}`,
    fontWeight: 900, letterSpacing: 3,
  },
  hud: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', background: '#0a1628', borderBottom: '1px solid #1e3a5f',
    flexWrap: 'wrap', gap: 12,
  },
  scoreBox: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  xpBar: { width: 120, height: 6, background: '#1e3a5f', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', background: `linear-gradient(90deg, ${NEON.cyan}, ${NEON.purple})`, borderRadius: 3, transition: 'width 0.4s' },
  subBar: {
    display: 'flex', gap: 16, padding: '8px 24px', background: '#080f1e',
    borderBottom: '1px solid #1e3a5f', flexWrap: 'wrap', alignItems: 'center',
  },
  gameArea: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 24,
  },
  replayBtn: {
    background: 'transparent', border: `2px solid ${NEON.cyan}`, color: NEON.cyan,
    padding: '10px 28px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
    fontFamily: 'inherit', letterSpacing: 1,
    boxShadow: `0 0 12px ${NEON.cyan}44`,
  },
  optionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', maxWidth: 520,
  },
  optionBtn: {
    border: '2px solid', borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    transition: 'background 0.2s, border-color 0.2s',
  },
  feedback: {
    border: '2px solid', borderRadius: 12, padding: '16px 24px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 400, width: '100%',
    background: '#0a1628',
  },
  nextBtn: {
    marginTop: 4, background: NEON.cyan, color: '#050d1a', border: 'none',
    padding: '8px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
    fontFamily: 'inherit', fontSize: 13,
  },
  statsPanel: {
    position: 'fixed', right: 0, top: 0, bottom: 0, width: 260,
    background: '#0a1628', borderLeft: '1px solid #1e3a5f',
    padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
    zIndex: 50,
  },
  levelUpOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.92)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, gap: 8,
  },
  modeBtn: {
    background: 'transparent', border: '2px solid #1e3a5f', color: '#7dd3fc',
    padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
  },
  modeBtnActive: { borderColor: NEON.cyan, color: NEON.cyan, boxShadow: `0 0 10px ${NEON.cyan}44` },
  diffBtn: {
    background: 'transparent', border: '2px solid #1e3a5f', color: '#94a3b8',
    padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
  },
  diffBtnActive: { borderColor: NEON.yellow, color: NEON.yellow },
  startBtn: {
    background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.purple})`, border: 'none',
    color: '#050d1a', padding: '14px 48px', borderRadius: 10, cursor: 'pointer',
    fontWeight: 900, fontSize: 16, fontFamily: 'inherit', letterSpacing: 2,
    boxShadow: `0 0 24px ${NEON.cyan}88`,
  },
  tabBtn: {
    background: 'transparent', border: '1px solid #1e3a5f', color: '#64748b',
    padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
  },
  tabBtnActive: { borderColor: NEON.cyan, color: NEON.cyan },
  smallBtn: {
    background: 'transparent', border: '1px solid #1e3a5f', color: '#7dd3fc',
    padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 16,
  },
};
