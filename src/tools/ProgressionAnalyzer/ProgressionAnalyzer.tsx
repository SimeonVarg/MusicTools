import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import * as d3 from 'd3';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
type NoteName = typeof NOTE_NAMES[number];

const ENHARMONIC: Record<string, NoteName> = {
  Db:'C#', Eb:'D#', Fb:'E', Gb:'F#', Ab:'G#', Bb:'A#', Cb:'B', 'E#':'F', 'B#':'C',
};

const MAJOR_STEPS = [0,2,4,5,7,9,11];
const MINOR_STEPS = [0,2,3,5,7,8,10]; // natural minor

const ROMAN_UPPER = ['I','II','III','IV','V','VI','VII'];

type HFunc = 'T' | 'S' | 'D';
const FUNC_COLOR: Record<HFunc, string> = { T:'#4ade80', S:'#facc15', D:'#f87171' };

// ─── T1: Chord Parser ─────────────────────────────────────────────────────────

type Quality = 'maj'|'min'|'dom7'|'maj7'|'min7'|'dim'|'hdim'|'aug'|'sus2'|'sus4'|'dim7'|'min9'|'dom9';

interface ParsedChord {
  raw: string;
  root: number;       // 0-11
  quality: Quality;
  extensions: number[];
  valid: boolean;
  intervals: number[];
}

// Order matters: longer/more-specific suffixes first
const SUFFIX_MAP: Array<[RegExp, Quality, number[]]> = [
  [/^(maj7|M7)$/,   'maj7',  [0,4,7,11]],
  [/^(m7b5|ø7|ø)$/, 'hdim',  [0,3,6,10]],
  [/^(dim7|°7)$/,   'dim7',  [0,3,6,9]],
  [/^(dim|°)$/,     'dim',   [0,3,6]],
  [/^aug(\+)?$/,    'aug',   [0,4,8]],
  [/^m9$/,          'min9',  [0,3,7,10,14]],
  [/^m7$/,          'min7',  [0,3,7,10]],
  [/^(m|min)$/,     'min',   [0,3,7]],
  [/^9$/,           'dom9',  [0,4,7,10,14]],
  [/^7$/,           'dom7',  [0,4,7,10]],
  [/^sus2$/,        'sus2',  [0,2,7]],
  [/^sus4$/,        'sus4',  [0,5,7]],
  [/^(maj|M|\+)?$/, 'maj',   [0,4,7]],
];

function parseChord(raw: string): ParsedChord {
  const s = raw.trim();
  const invalid = (q: Quality = 'maj'): ParsedChord =>
    ({ raw: s, root: 0, quality: q, extensions: [], valid: false, intervals: [0,4,7] });
  if (!s) return invalid();

  let i = 0;
  let rootStr = s[i++].toUpperCase();
  if (i < s.length && (s[i] === '#' || s[i] === 'b')) rootStr += s[i++];

  const resolved = ENHARMONIC[rootStr] ?? rootStr;
  const root = NOTE_NAMES.indexOf(resolved as NoteName);
  if (root === -1) return invalid();

  const suffix = s.slice(i);
  for (const [re, quality, intervals] of SUFFIX_MAP) {
    if (re.test(suffix)) {
      const extensions: number[] = [];
      if (intervals.includes(14)) extensions.push(9);
      return { raw: s, root, quality, extensions, valid: true, intervals };
    }
  }
  return invalid();
}

// ─── T2: Key Detection ────────────────────────────────────────────────────────

function detectKey(chords: ParsedChord[]): { root: number; mode: 'major'|'minor' } {
  let best: { root: number; mode: 'major'|'minor'; score: number } = { root: 0, mode: 'major', score: -1 };
  const candidates: Array<['major'|'minor', number[]]> = [['major', MAJOR_STEPS], ['minor', MINOR_STEPS]];
  for (let r = 0; r < 12; r++) {
    for (const [mode, steps] of candidates) {
      const scale = steps.map(s => (s + r) % 12);
      const score = chords.filter(c => c.valid && scale.includes(c.root)).length;
      if (score > best.score) best = { root: r, mode, score };
    }
  }
  return best;
}

// ─── T3: Roman Numeral + Function ─────────────────────────────────────────────

function getRomanNumeral(chordRoot: number, keyRoot: number, mode: 'major'|'minor'): string {
  const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  const degree = (chordRoot - keyRoot + 12) % 12;
  const idx = steps.indexOf(degree);
  if (idx === -1) return '?';
  return ROMAN_UPPER[idx];
}

function getFunction(roman: string): HFunc {
  const base = roman.replace(/[^IViv]/g, '').toUpperCase();
  if (['I','III','VI'].includes(base)) return 'T';
  if (['II','IV'].includes(base)) return 'S';
  return 'D';
}

interface Analysis {
  chord: ParsedChord;
  roman: string;
  func: HFunc;
  diatonic: boolean;
  secondary: string | null; // e.g. "V/V"
}

function analyzeChords(chords: ParsedChord[], keyRoot: number, mode: 'major'|'minor'): Analysis[] {
  const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  const scale = steps.map(s => (s + keyRoot) % 12);

  return chords.map(c => {
    if (!c.valid) return { chord: c, roman: '?', func: 'D', diatonic: false, secondary: null };

    const degree = (c.root - keyRoot + 12) % 12;
    const idx = steps.indexOf(degree);
    const diatonic = idx !== -1;

    let roman = diatonic ? ROMAN_UPPER[idx] : '?';
    const isMinorQuality = ['min','min7','min9','hdim','dim','dim7'].includes(c.quality);
    if (diatonic && isMinorQuality) roman = roman.toLowerCase();
    if (c.quality === 'dim' || c.quality === 'dim7') roman += '°';
    if (c.quality === 'hdim') roman += 'ø7';
    if (c.quality === 'aug') roman += '+';
    if (['dom7','dom9'].includes(c.quality)) roman += '7';
    if (c.quality === 'maj7') roman += 'maj7';
    if (c.quality === 'min7') roman += '7';

    const func = diatonic ? getFunction(ROMAN_UPPER[idx] ?? 'V') : 'D';

    // Detect secondary dominant: dom7 chord whose root+4 is a scale degree
    let secondary: string | null = null;
    if (['dom7','dom9','maj'].includes(c.quality) && !diatonic) {
      const resolveTarget = (c.root + 7) % 12; // V resolves up a 4th
      const targetIdx = scale.indexOf(resolveTarget);
      if (targetIdx !== -1) {
        secondary = `V/${ROMAN_UPPER[targetIdx]}`;
      }
    }

    return { chord: c, roman, func, diatonic, secondary };
  });
}

// ─── T4: SATB Voicing ─────────────────────────────────────────────────────────

// Returns [bass, tenor, alto, soprano] MIDI note numbers
function satbVoicing(chord: ParsedChord): [number, number, number, number] {
  const root = chord.root + 48; // C3
  const notes = chord.intervals.slice(0, 4).map((iv, i) => {
    let n = root + iv;
    // Spread voices: bass stays low, others climb
    if (i === 1) n += 12;
    if (i === 2) n += 12;
    if (i === 3) n += 24;
    return n;
  });
  // Pad to 4 voices if chord has fewer than 4 notes
  while (notes.length < 4) notes.push(notes[notes.length - 1] + 7);
  return [notes[0], notes[1], notes[2], notes[3]];
}

// ─── Voice Leading D3 Chart ───────────────────────────────────────────────────

const VOICE_COLORS = ['#60a5fa', '#4ade80', '#fb923c', '#f87171']; // S A T B
const VOICE_LABELS = ['S', 'A', 'T', 'B'];

function VoiceLeadingChart({ chords }: { chords: ParsedChord[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 400, H = 150;

  const voicings = useMemo(() => chords.filter(c => c.valid).map(satbVoicing), [chords]);

  useEffect(() => {
    if (!svgRef.current || voicings.length < 2) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const allNotes = voicings.flat();
    const yMin = Math.min(...allNotes) - 2;
    const yMax = Math.max(...allNotes) + 2;

    const xScale = d3.scaleLinear().domain([0, voicings.length - 1]).range([30, W - 10]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([H - 10, 10]);

    // Draw each voice (0=bass,1=tenor,2=alto,3=soprano → reverse for color order S/A/T/B)
    [3, 2, 1, 0].forEach(vi => {
      const data = voicings.map(v => v[vi]);
      const lineGen = d3.line<number>()
        .x((_, i) => xScale(i))
        .y(d => yScale(d))
        .curve(d3.curveCatmullRom);

      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', VOICE_COLORS[vi === 3 ? 0 : vi === 2 ? 1 : vi === 1 ? 2 : 3])
        .attr('stroke-width', 2)
        .attr('d', lineGen);

      // Dots
      data.forEach((d, i) => {
        svg.append('circle')
          .attr('cx', xScale(i))
          .attr('cy', yScale(d))
          .attr('r', 3)
          .attr('fill', VOICE_COLORS[vi === 3 ? 0 : vi === 2 ? 1 : vi === 1 ? 2 : 3]);
      });
    });

    // Legend
    VOICE_LABELS.forEach((label, li) => {
      svg.append('text')
        .attr('x', 4)
        .attr('y', 14 + li * 16)
        .attr('fill', VOICE_COLORS[li])
        .attr('font-size', 10)
        .attr('font-family', 'monospace')
        .text(label);
    });
  }, [voicings]);

  if (voicings.length < 2) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 8, fontWeight: 600 }}>Voice Leading</div>
      <svg ref={svgRef} width={W} height={H} style={{ background: '#13131a', borderRadius: 8, border: '1px solid #222' }} />
    </div>
  );
}

// ─── T5: Substitutions ────────────────────────────────────────────────────────

interface Sub { label: string; chord: string; }

function getSubs(chord: ParsedChord, keyRoot: number): Sub[] {
  if (!chord.valid) return [];
  const subs: Sub[] = [];
  const n = NOTE_NAMES;

  if (chord.quality === 'dom7' || chord.quality === 'dom9') {
    subs.push({ label: 'Tritone sub', chord: `${n[(chord.root + 6) % 12]}7` });
  }
  if (['min','min7','min9'].includes(chord.quality)) {
    subs.push({ label: 'Relative major', chord: `${n[(chord.root + 3) % 12]}` });
  } else if (['maj','maj7'].includes(chord.quality)) {
    subs.push({ label: 'Relative minor', chord: `${n[(chord.root + 9) % 12]}m` });
  }
  return subs;
}

function SubsPanel({ chord, keyRoot }: { chord: ParsedChord; keyRoot: number }) {
  const [open, setOpen] = useState(false);
  const subs = getSubs(chord, keyRoot);
  if (!subs.length) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 11, padding: 0 }}
      >
        {open ? '▾' : '▸'} subs
      </button>
      {open && (
        <div style={{ background: '#0d0d14', border: '1px solid #2a2a3a', borderRadius: 6, padding: '6px 10px', marginTop: 4, minWidth: 140 }}>
          {subs.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: '#bbb', marginBottom: 2 }}>
              <span style={{ color: '#a855f7' }}>{s.label}:</span> {s.chord}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── T6: Playback ─────────────────────────────────────────────────────────────

function midiToNote(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProgressionAnalyzer() {
  const [input, setInput] = useState('Dm7 G7 Cmaj7 Am7');
  const [manualKey, setManualKey] = useState<string>('');
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const chords = useMemo(
    () => input.split(/\s+/).filter(Boolean).map(parseChord),
    [input]
  );

  const autoKey = useMemo(() => chords.some(c => c.valid) ? detectKey(chords.filter(c => c.valid)) : { root: 0, mode: 'major' as const }, [chords]);

  const keyRoot = manualKey !== '' ? parseInt(manualKey.split('-')[0]) : autoKey.root;
  const keyMode = manualKey !== '' ? (manualKey.split('-')[1] as 'major'|'minor') : autoKey.mode;

  const results = useMemo(() => analyzeChords(chords, keyRoot, keyMode), [chords, keyRoot, keyMode]);

  const stop = useCallback(() => {
    stopRef.current?.();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    synthRef.current?.releaseAll();
    setPlaying(false);
    setActiveIdx(-1);
  }, []);

  const play = useCallback(async () => {
    if (playing) { stop(); return; }
    const valid = chords.filter(c => c.valid);
    if (!valid.length) return;
    await Tone.start();
    setPlaying(true);

    const synth = synthRef.current ?? new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).toDestination();
    synthRef.current = synth;

    const BPM = 80;
    const barSec = (60 / BPM) * 4;
    const now = Tone.now();

    let cancelled = false;
    stopRef.current = () => { cancelled = true; };

    chords.forEach((c, i) => {
      if (!c.valid) return;
      const t = now + i * barSec;
      const notes = satbVoicing(c).map(midiToNote);
      synth.triggerAttackRelease(notes, `${barSec - 0.1}`, t);
    });

    chords.forEach((_, i) => {
      setTimeout(() => {
        if (!cancelled) setActiveIdx(i);
      }, i * barSec * 1000);
    });

    setTimeout(() => {
      if (!cancelled) { setPlaying(false); setActiveIdx(-1); }
    }, chords.length * barSec * 1000 + 300);
  }, [chords, playing, stop]);

  const keyOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: '', label: 'Auto-detect' }];
    for (let r = 0; r < 12; r++) {
      opts.push({ value: `${r}-major`, label: `${NOTE_NAMES[r]} major` });
      opts.push({ value: `${r}-minor`, label: `${NOTE_NAMES[r]} minor` });
    }
    return opts;
  }, []);

  return (
    <div style={{ background: '#0a0a0f', color: '#e2e2e8', fontFamily: '"JetBrains Mono",monospace', minHeight: '100vh', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#a855f7' }}>Chord Progression Analyzer</div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter chords: Dm7 G7 Cmaj7 Am7"
        spellCheck={false}
        style={{ width: '100%', padding: '10px 14px', fontSize: 15, fontFamily: 'inherit', background: '#1a1a24', border: '1px solid #333', borderRadius: 8, color: '#e2e2e8', outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
      />
      <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
        Supported: C Cm C7 Cmaj7 Cm7 Cdim Caug Cm7b5 Cdim7 C9 Cm9 — use # or b for accidentals
      </div>

      {/* T2: Key display + override */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: '#a78bfa' }}>
          Key: <strong>{NOTE_NAMES[keyRoot]} {keyMode}</strong>
          {manualKey === '' && <span style={{ color: '#555', fontSize: 12 }}> (auto)</span>}
        </span>
        <select
          value={manualKey}
          onChange={e => setManualKey(e.target.value)}
          style={{ background: '#1a1a24', border: '1px solid #333', borderRadius: 6, color: '#e2e2e8', padding: '4px 8px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          {keyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* T6: Play/Stop */}
        <button
          onClick={play}
          disabled={!chords.some(c => c.valid)}
          style={{ padding: '7px 18px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: playing ? '#7c3aed' : '#2a2a3a', color: '#fff' }}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      {/* T3: Chord cards */}
      {chords.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            {results.map((r, i) => {
              const fc = r.chord.valid ? FUNC_COLOR[r.func] : '#555';
              const isActive = activeIdx === i;
              return (
                <div key={i} style={{
                  background: isActive ? '#1e1030' : '#1a1a24',
                  border: `1px solid ${isActive ? '#a855f7' : fc + '44'}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  minWidth: 80,
                  textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: isActive ? '0 0 12px #a855f744' : 'none',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: fc }}>{r.roman}</div>
                  <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{r.chord.raw}</div>
                  {r.chord.valid && (
                    <div style={{ display: 'inline-block', marginTop: 5, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${fc}22`, color: fc }}>
                      {r.secondary ?? (r.func === 'T' ? 'Tonic' : r.func === 'S' ? 'Sub' : 'Dom')}
                    </div>
                  )}
                  {!r.chord.valid && <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>invalid</div>}
                  {/* T5: per-chord subs */}
                  <SubsPanel chord={r.chord} keyRoot={keyRoot} />
                </div>
              );
            })}
          </div>

          {/* T4: Voice leading chart */}
          <VoiceLeadingChart chords={chords} />
        </>
      )}
    </div>
  );
}
