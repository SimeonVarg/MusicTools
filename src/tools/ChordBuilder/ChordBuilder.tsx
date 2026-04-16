import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import * as d3 from 'd3';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Root = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
type Quality =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'maj7' | 'm7' | '7' | 'm7b5' | 'dim7'
  | 'maj9' | 'm9' | '9' | '11' | '13'
  | 'alt' | 'sus2' | 'sus4';
type VoicingType = 'close' | 'drop2' | 'shell' | 'rootless';
type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant' | 'unknown';

interface ChordSlot {
  id: string;
  root: Root;
  quality: Quality;
  voicing: VoicingType;
}

// ─── Chord Data ───────────────────────────────────────────────────────────────

const ROOTS: Root[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SEMITONES: Record<Root, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

// Intervals in semitones from root
const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj:   [0, 4, 7],
  min:   [0, 3, 7],
  dim:   [0, 3, 6],
  aug:   [0, 4, 8],
  maj7:  [0, 4, 7, 11],
  m7:    [0, 3, 7, 10],
  '7':   [0, 4, 7, 10],
  m7b5:  [0, 3, 6, 10],
  dim7:  [0, 3, 6, 9],
  maj9:  [0, 4, 7, 11, 14],
  m9:    [0, 3, 7, 10, 14],
  '9':   [0, 4, 7, 10, 14],
  '11':  [0, 4, 7, 10, 14, 17],
  '13':  [0, 4, 7, 10, 14, 21],
  alt:   [0, 4, 10, 13, 15],   // 1 3 b7 b9 #9 (simplified)
  sus2:  [0, 2, 7],
  sus4:  [0, 5, 7],
};

const TENSION_SCORE: Record<Quality, number> = {
  maj: 1, min: 2, dim: 6, aug: 5,
  maj7: 2, m7: 3, '7': 7, m7b5: 7, dim7: 8,
  maj9: 3, m9: 4, '9': 6, '11': 6, '13': 7,
  alt: 9, sus2: 2, sus4: 3,
};

const INTERVAL_TENSION = [0, 0.9, 0.3, 0.5, 0.2, 0.1, 1.0, 0.1, 0.2, 0.4, 0.6, 0.8];
const QUALITY_TENSION_SCORE: Record<Quality, number> = {
  maj: 0.0, min: 0.3, dim: 0.8, aug: 0.7,
  maj7: 0.1, m7: 0.3, '7': 0.6, m7b5: 0.8, dim7: 0.9,
  maj9: 0.2, m9: 0.4, '9': 0.5, '11': 0.5, '13': 0.5,
  alt: 1.0, sus2: 0.2, sus4: 0.2,
};

function computeTension(chord: ChordSlot, prevChord: ChordSlot | null, keyRoot: Root): number {
  const rootInterval = (SEMITONES[chord.root] - SEMITONES[keyRoot] + 12) % 12;
  const intervalScore = INTERVAL_TENSION[rootInterval];
  const motionScore = prevChord
    ? Math.min(1, Math.abs(SEMITONES[chord.root] - SEMITONES[prevChord.root]) / 6)
    : 0;
  const qualityScore = QUALITY_TENSION_SCORE[chord.quality] ?? 0.5;
  return intervalScore * 0.4 + motionScore * 0.3 + qualityScore * 0.3;
}

// Keep for D3 chart compatibility
function computeContextualTension(chord: ChordSlot, keyRoot: Root): number {
  return computeTension(chord, null, keyRoot) * 10;
}

const QUALITY_LABEL: Record<Quality, string> = {
  maj: '', min: 'm', dim: '°', aug: '+',
  maj7: 'Δ7', m7: 'm7', '7': '7', m7b5: 'ø7', dim7: '°7',
  maj9: 'Δ9', m9: 'm9', '9': '9', '11': '11', '13': '13',
  alt: '7alt', sus2: 'sus2', sus4: 'sus4',
};

const PALETTE_CATEGORIES: { label: string; qualities: Quality[] }[] = [
  { label: 'Triads',   qualities: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'] },
  { label: '7ths',     qualities: ['maj7', 'm7', '7', 'm7b5', 'dim7'] },
  { label: '9ths',     qualities: ['maj9', 'm9', '9'] },
  { label: 'Extended', qualities: ['11', '13'] },
  { label: 'Altered',  qualities: ['alt'] },
];

// ─── Voicing Engine ───────────────────────────────────────────────────────────

function midiToNote(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return noteNames[midi % 12] + octave;
}

function getCloseVoicing(root: Root, quality: Quality): number[] {
  const base = SEMITONES[root] + 48; // C3
  return QUALITY_INTERVALS[quality].map(i => base + i);
}

function getDrop2Voicing(root: Root, quality: Quality): number[] {
  const close = getCloseVoicing(root, quality);
  if (close.length < 4) return close;
  // Drop 2nd from top: take top note down an octave
  const result = [...close];
  const secondFromTop = result[result.length - 2];
  result[result.length - 2] = secondFromTop - 12;
  return result.sort((a, b) => a - b);
}

function getShellVoicing(root: Root, quality: Quality): number[] {
  const intervals = QUALITY_INTERVALS[quality];
  // Shell: root (1), 3rd, 7th
  const shell = [intervals[0]];
  if (intervals.length >= 2) shell.push(intervals[1]); // 3rd
  if (intervals.length >= 4) shell.push(intervals[3]); // 7th
  else if (intervals.length >= 3) shell.push(intervals[2]);
  const base = SEMITONES[root] + 48;
  return shell.map(i => base + i);
}

function getRootlessVoicing(root: Root, quality: Quality): number[] {
  const intervals = QUALITY_INTERVALS[quality];
  if (intervals.length < 4) return getCloseVoicing(root, quality);
  // Rootless: 3-5-7-9 (skip root)
  const rootless = intervals.slice(1, 5);
  const base = SEMITONES[root] + 48;
  return rootless.map(i => base + i);
}

function getVoicingNotes(root: Root, quality: Quality, voicing: VoicingType): number[] {
  switch (voicing) {
    case 'drop2':    return getDrop2Voicing(root, quality);
    case 'shell':    return getShellVoicing(root, quality);
    case 'rootless': return getRootlessVoicing(root, quality);
    default:         return getCloseVoicing(root, quality);
  }
}

// ─── Roman Numeral Analysis ───────────────────────────────────────────────────

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII',
               'VIII', 'IX', 'X', 'XI', 'XII'];

function getRomanNumeral(chord: ChordSlot, keyRoot: Root): string {
  const diff = (SEMITONES[chord.root] - SEMITONES[keyRoot] + 12) % 12;
  const degreeMap: Record<number, string> = {
    0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII',
    1: '♭II', 3: '♭III', 6: '♭V/♯IV', 8: '♭VI', 10: '♭VII',
  };
  const base = degreeMap[diff] ?? '?';
  const isMinor = ['min', 'm7', 'm9', 'm7b5', 'dim', 'dim7'].includes(chord.quality);
  return isMinor ? base.toLowerCase() : base;
}

function getHarmonicFunction(chord: ChordSlot, keyRoot: Root): HarmonicFunction {
  const diff = (SEMITONES[chord.root] - SEMITONES[keyRoot] + 12) % 12;
  if ([0, 4, 9].includes(diff)) return 'tonic';
  if ([5, 2].includes(diff)) return 'subdominant';
  if ([7, 11].includes(diff)) return 'dominant';
  return 'unknown';
}

const FUNCTION_COLOR: Record<HarmonicFunction, string> = {
  tonic: '#3b82f6',
  subdominant: '#22c55e',
  dominant: '#f97316',
  unknown: '#6b7280',
};

// ─── Jazz Pattern Detection ───────────────────────────────────────────────────

function detectPatterns(chords: ChordSlot[], keyRoot: Root): string[] {
  const patterns: string[] = [];
  for (let i = 0; i < chords.length - 1; i++) {
    const a = chords[i], b = chords[i + 1];
    const aDiff = (SEMITONES[a.root] - SEMITONES[keyRoot] + 12) % 12;
    const bDiff = (SEMITONES[b.root] - SEMITONES[keyRoot] + 12) % 12;
    const interval = (bDiff - aDiff + 12) % 12;

    // ii-V-I
    if (i < chords.length - 2) {
      const c = chords[i + 2];
      const cDiff = (SEMITONES[c.root] - SEMITONES[keyRoot] + 12) % 12;
      if (aDiff === 2 && bDiff === 7 && cDiff === 0) {
        patterns.push(`ii-V-I at ${a.root}`);
      }
    }
    // Tritone sub: roots a tritone apart, both dominant
    if (interval === 6 && ['7', 'alt'].includes(a.quality) && ['7', 'alt'].includes(b.quality)) {
      patterns.push(`Tritone sub: ${a.root}7 → ${b.root}7`);
    }
    // Backdoor: ♭VII7 → I
    if (aDiff === 10 && bDiff === 0 && a.quality === '7') {
      patterns.push(`Backdoor: ♭VII7 → I`);
    }
    // Modal interchange: borrowed chord (minor subdominant in major)
    if (aDiff === 5 && ['min', 'm7'].includes(a.quality)) {
      patterns.push(`Modal interchange: iv (${a.root}m)`);
    }
  }
  return [...new Set(patterns)];
}


// ─── Mini Keyboard Component ──────────────────────────────────────────────────

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
const BLACK_KEYS = [1, 3, 6, 8, 10];        // C# D# F# G# A#
const BLACK_KEY_POS: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };

function MiniKeyboard({ midiNotes, commonTones }: { midiNotes: number[]; commonTones?: Set<number> }) {
  const activeClasses = new Set(midiNotes.map(n => n % 12));
  const W = 10, H = 32, BH = 20, BW = 7;

  return (
    <svg width={W * 7 + 1} height={H} style={{ display: 'block' }}>
      {WHITE_KEYS.map((pc, i) => (
        <rect
          key={pc}
          x={i * W} y={0} width={W - 1} height={H}
          fill={activeClasses.has(pc) ? (commonTones?.has(pc) ? '#a855f7' : '#60a5fa') : '#e5e7eb'}
          stroke="#374151" strokeWidth={0.5}
          rx={1}
        />
      ))}
      {BLACK_KEYS.map(pc => {
        const pos = BLACK_KEY_POS[pc];
        return (
          <rect
            key={pc}
            x={pos * W - BW / 2} y={0} width={BW} height={BH}
            fill={activeClasses.has(pc) ? (commonTones?.has(pc) ? '#7c3aed' : '#2563eb') : '#1f2937'}
            stroke="#111827" strokeWidth={0.5}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

// ─── Tension Chart (D3) ───────────────────────────────────────────────────────

function TensionChart({ chords, keyRoot }: { chords: ChordSlot[]; keyRoot: Root }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 60, PAD = { t: 8, r: 16, b: 16, l: 32 };

  useEffect(() => {
    if (!svgRef.current || chords.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const data = chords.map((c, i) => ({ x: i, y: computeContextualTension(c, keyRoot) }));
    const xScale = d3.scaleLinear()
      .domain([0, Math.max(chords.length - 1, 1)])
      .range([PAD.l, W - PAD.r]);
    const yScale = d3.scaleLinear().domain([0, 10]).range([H - PAD.b, PAD.t]);

    // Gradient fill
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'tension-grad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#f97316').attr('stop-opacity', 0.6);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#f97316').attr('stop-opacity', 0.05);

    const area = d3.area<{ x: number; y: number }>()
      .x(d => xScale(d.x))
      .y0(H - PAD.b)
      .y1(d => yScale(d.y))
      .curve(d3.curveCatmullRom);

    const line = d3.line<{ x: number; y: number }>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveCatmullRom);

    svg.append('path').datum(data).attr('d', area).attr('fill', 'url(#tension-grad)');
    svg.append('path').datum(data).attr('d', line)
      .attr('fill', 'none').attr('stroke', '#f97316').attr('stroke-width', 2);

    // Y axis
    svg.append('g').attr('transform', `translate(${PAD.l},0)`)
      .call(d3.axisLeft(yScale).ticks(3).tickSize(3))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#9ca3af').attr('font-size', 9));

    // Dots
    svg.selectAll('circle').data(data).enter().append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 3)
      .attr('fill', '#f97316')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1);
  }, [chords, keyRoot]);

  return (
    <svg ref={svgRef} width={W} height={H}
      style={{ width: '100%', height: H, overflow: 'visible' }} />
  );
}

// ─── Voice Leading Helpers ────────────────────────────────────────────────────

function voiceLeadingDistance(a: ChordSlot, b: ChordSlot): number {
  const va = getVoicingNotes(a.root, a.quality, a.voicing);
  const vb = getVoicingNotes(b.root, b.quality, b.voicing);
  const len = Math.min(va.length, vb.length);
  let total = 0;
  for (let i = 0; i < len; i++) total += Math.abs(va[i] - vb[i]);
  for (let i = len; i < Math.max(va.length, vb.length); i++) total += 6;
  return total;
}

function getVoiceLeading(a: ChordSlot, b: ChordSlot): { semitones: number; direction: 'up' | 'down' | 'same' }[] {
  const va = [...getVoicingNotes(a.root, a.quality, a.voicing)].sort((x, y) => x - y).slice(0, 4);
  const vb = [...getVoicingNotes(b.root, b.quality, b.voicing)].sort((x, y) => x - y).slice(0, 4);
  return va.map((note, i) => {
    const diff = (vb[i] ?? vb[vb.length - 1]) - note;
    return { semitones: Math.abs(diff), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
  });
}

function getCommonTones(a: ChordSlot, b: ChordSlot): Set<number> {
  const pcA = new Set(getVoicingNotes(a.root, a.quality, a.voicing).map(n => n % 12));
  const pcB = new Set(getVoicingNotes(b.root, b.quality, b.voicing).map(n => n % 12));
  const common = new Set<number>();
  pcA.forEach(pc => { if (pcB.has(pc)) common.add(pc); });
  return common;
}

// ─── Chord Card ───────────────────────────────────────────────────────────────

interface ChordCardProps {
  chord: ChordSlot;
  prevChord: ChordSlot | null;
  keyRoot: Root;
  isPlaying: boolean;
  onRemove: () => void;
  onVoicingChange: (v: VoicingType) => void;
  onPlay: () => void;
  commonTones?: Set<number>;
}

function ChordCard({ chord, prevChord, keyRoot, isPlaying, onRemove, onVoicingChange, onPlay, commonTones }: ChordCardProps) {
  const midiNotes = getVoicingNotes(chord.root, chord.quality, chord.voicing);
  const fn = getHarmonicFunction(chord, keyRoot);
  const roman = getRomanNumeral(chord, keyRoot);
  const color = FUNCTION_COLOR[fn];
  const label = chord.root + QUALITY_LABEL[chord.quality];
  const tension = computeTension(chord, prevChord, keyRoot);
  const tensionColor = `hsl(${(1 - tension) * 120}, 80%, 50%)`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: isPlaying ? 1.04 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={(e) => { e.stopPropagation(); onPlay(); }}
      style={{
        background: '#1e2433',
        border: `2px solid ${isPlaying ? color : '#374151'}`,
        borderRadius: 10,
        padding: '10px 8px',
        minWidth: 90,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        boxShadow: isPlaying ? `0 0 12px ${color}66` : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          position: 'absolute', top: 4, right: 4,
          background: 'none', border: 'none', color: '#6b7280',
          cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 2,
        }}
      >✕</button>

      {/* Roman numeral */}
      <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>
        {roman}
      </div>

      {/* Chord symbol */}
      <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 6 }}>
        {label}
      </div>

      {/* Mini keyboard */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <MiniKeyboard midiNotes={midiNotes} commonTones={commonTones} />
      </div>

      {/* Voicing selector */}
      <select
        value={chord.voicing}
        onChange={e => onVoicingChange(e.target.value as VoicingType)}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', fontSize: 9, background: '#111827',
          color: '#9ca3af', border: '1px solid #374151', borderRadius: 4,
          padding: '2px 2px', cursor: 'pointer',
        }}
      >
        <option value="close">Close</option>
        <option value="drop2">Drop-2</option>
        <option value="shell">Shell</option>
        <option value="rootless">Rootless</option>
      </select>

      {/* Tension bar */}
      <div style={{ marginTop: 5, height: 4, borderRadius: 2, background: '#1f2937', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: tensionColor, width: `${tension * 100}%`, transition: 'width 0.3s, background 0.3s' }} />
      </div>
    </motion.div>
  );
}


// ─── Chord Palette Sidebar ────────────────────────────────────────────────────

interface SidebarProps {
  selectedRoot: Root;
  onRootChange: (r: Root) => void;
  onAddChord: (q: Quality) => void;
}

function ChordPaletteSidebar({ selectedRoot, onRootChange, onAddChord }: SidebarProps) {
  return (
    <div style={{
      width: 160, background: '#111827', borderRight: '1px solid #1f2937',
      padding: '12px 8px', overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
        ROOT
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
        {ROOTS.map(r => (
          <button
            key={r}
            onClick={() => onRootChange(r)}
            style={{
              padding: '3px 6px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
              background: selectedRoot === r ? '#3b82f6' : '#1f2937',
              color: selectedRoot === r ? '#fff' : '#9ca3af',
              border: 'none', fontWeight: 600,
            }}
          >{r}</button>
        ))}
      </div>

      {PALETTE_CATEGORIES.map(cat => (
        <div key={cat.label} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>
            {cat.label.toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {cat.qualities.map(q => (
              <button
                key={q}
                onClick={() => onAddChord(q)}
                style={{
                  padding: '4px 8px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                  background: '#1f2937', color: '#d1d5db', border: '1px solid #374151',
                  textAlign: 'left', fontWeight: 600,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1f2937')}
              >
                {selectedRoot}{QUALITY_LABEL[q] || ' maj'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

let _idCounter = 0;
const uid = () => `chord-${++_idCounter}`;

export default function ChordBuilder() {
  const [chords, setChords] = useState<ChordSlot[]>([]);
  const [keyRoot, setKeyRoot] = useState<Root>('C');
  const [selectedRoot, setSelectedRoot] = useState<Root>('C');
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  // Init synth
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -10,
    }).toDestination();
    return () => { synthRef.current?.dispose(); };
  }, []);

  const addChord = useCallback((quality: Quality) => {
    if (chords.length >= 8) return;
    setChords(prev => [...prev, { id: uid(), root: selectedRoot, quality, voicing: 'close' }]);
  }, [chords.length, selectedRoot]);

  const removeChord = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateVoicing = useCallback((id: string, voicing: VoicingType) => {
    setChords(prev => prev.map(c => c.id === id ? { ...c, voicing } : c));
  }, []);

  const playProgression = useCallback(async () => {
    if (isPlaying || chords.length === 0) return;
    await Tone.start();
    setIsPlaying(true);
    const synth = synthRef.current!;
    const dur = 1.2;

    for (let i = 0; i < chords.length; i++) {
      setPlayingIdx(i);
      const notes = getVoicingNotes(chords[i].root, chords[i].quality, chords[i].voicing)
        .map(midiToNote);
      synth.triggerAttackRelease(notes, dur);
      await new Promise(r => setTimeout(r, dur * 1000));
    }
    setPlayingIdx(null);
    setIsPlaying(false);
  }, [chords, isPlaying]);

  const playChord = useCallback(async (chord: ChordSlot) => {
    await Tone.start();
    const notes = getVoicingNotes(chord.root, chord.quality, chord.voicing).map(midiToNote);
    synthRef.current?.triggerAttackRelease(notes, 0.8);
  }, []);

  const exportText = useCallback(() => {
    const lines = chords.map((c, i) => {
      const roman = getRomanNumeral(c, keyRoot);
      const fn = getHarmonicFunction(c, keyRoot);
      return `${i + 1}. ${c.root}${QUALITY_LABEL[c.quality]} (${roman}) [${fn}] — ${c.voicing} voicing`;
    });
    const patterns = detectPatterns(chords, keyRoot);
    const text = [
      `Key: ${keyRoot}`,
      '',
      ...lines,
      '',
      patterns.length ? 'Patterns detected:' : '',
      ...patterns,
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    alert('Progression copied to clipboard!');
  }, [chords, keyRoot]);

  const patterns = detectPatterns(chords, keyRoot);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0f1117', color: '#f1f5f9', fontFamily: 'monospace',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 20px', background: '#111827',
        borderBottom: '1px solid #1f2937', flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>
          🎹 Chord Builder
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Jazz Harmony Explorer</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Key selector */}
          <label style={{ fontSize: 11, color: '#9ca3af' }}>Key:</label>
          <select
            value={keyRoot}
            onChange={e => setKeyRoot(e.target.value as Root)}
            style={{
              background: '#1f2937', color: '#f1f5f9', border: '1px solid #374151',
              borderRadius: 4, padding: '3px 6px', fontSize: 12,
            }}
          >
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <button
            onClick={playProgression}
            disabled={isPlaying || chords.length === 0}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: isPlaying ? '#374151' : '#3b82f6', color: '#fff',
              fontWeight: 700, fontSize: 12, opacity: chords.length === 0 ? 0.4 : 1,
            }}
          >
            {isPlaying ? '▶ Playing…' : '▶ Play'}
          </button>

          <button
            onClick={exportText}
            disabled={chords.length === 0}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #374151',
              cursor: 'pointer', background: '#1f2937', color: '#9ca3af',
              fontWeight: 600, fontSize: 12, opacity: chords.length === 0 ? 0.4 : 1,
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <ChordPaletteSidebar
          selectedRoot={selectedRoot}
          onRootChange={setSelectedRoot}
          onAddChord={addChord}
        />

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tension chart */}
          <div style={{
            padding: '12px 20px 4px', borderBottom: '1px solid #1f2937', flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, letterSpacing: 1 }}>
              HARMONIC TENSION
            </div>
            {chords.length > 0
              ? <TensionChart chords={chords} keyRoot={keyRoot} />
              : <div style={{ height: 60, display: 'flex', alignItems: 'center', color: '#374151', fontSize: 12 }}>
                  Add chords to see tension arc
                </div>
            }
          </div>

          {/* Chord slots */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px' }}>
            {chords.length === 0 ? (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#374151', fontSize: 14,
              }}>
                ← Select a root and click a chord quality to add up to 8 chords
              </div>
            ) : (
              <Reorder.Group
                axis="x"
                values={chords}
                onReorder={setChords}
                style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: 0, height: '100%', alignItems: 'flex-start' }}
              >
                <AnimatePresence>
                  {chords.map((chord, i) => {
                    const prev = i > 0 ? chords[i - 1] : null;
                    const moves = prev ? getVoiceLeading(prev, chord) : null;
                    return (
                      <React.Fragment key={chord.id}>
                        {moves && (
                          <svg width={24} height={60} style={{ alignSelf: 'center', flexShrink: 0 }}>
                            {moves.map((m, vi) => {
                              const y = 6 + vi * 13;
                              const arrowColor = m.semitones <= 2 ? '#4ade80' : m.semitones <= 4 ? '#fbbf24' : '#f87171';
                              const arrow = m.direction === 'up' ? '↑' : m.direction === 'down' ? '↓' : '—';
                              return (
                                <text key={vi} x={12} y={y + 9} textAnchor="middle"
                                  fontSize={10} fill={arrowColor} fontFamily="monospace">{arrow}</text>
                              );
                            })}
                          </svg>
                        )}
                        <Reorder.Item value={chord} style={{ listStyle: 'none' }}>
                          <ChordCard
                            chord={chord}
                            prevChord={prev}
                            keyRoot={keyRoot}
                            isPlaying={playingIdx === i}
                            onRemove={() => removeChord(chord.id)}
                            onVoicingChange={v => updateVoicing(chord.id, v)}
                            onPlay={() => playChord(chord)}
                            commonTones={prev ? getCommonTones(prev, chord) : undefined}
                          />
                        </Reorder.Item>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>

          {/* Pattern detection bar */}
          {patterns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '8px 20px', background: '#111827',
                borderTop: '1px solid #1f2937', flexShrink: 0,
                display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1 }}>
                PATTERNS:
              </span>
              {patterns.map((p, i) => (
                <span key={i} style={{
                  fontSize: 11, background: '#1f2937', color: '#fbbf24',
                  padding: '2px 8px', borderRadius: 12, border: '1px solid #374151',
                }}>
                  {p}
                </span>
              ))}
            </motion.div>
          )}

          {/* Legend */}
          <div style={{
            padding: '6px 20px', borderTop: '1px solid #1f2937', flexShrink: 0,
            display: 'flex', gap: 16, alignItems: 'center',
          }}>
            {(['tonic', 'subdominant', 'dominant'] as HarmonicFunction[]).map(fn => (
              <span key={fn} style={{ fontSize: 10, color: FUNCTION_COLOR[fn], display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: FUNCTION_COLOR[fn], display: 'inline-block' }} />
                {fn}
              </span>
            ))}
            <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto' }}>
              {chords.length}/8 chords · drag to reorder
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
