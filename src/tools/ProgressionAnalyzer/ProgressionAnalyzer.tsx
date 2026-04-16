import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import * as d3 from 'd3';

// ─── Note / interval constants ────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
type NoteName = typeof NOTE_NAMES[number];

const ENHARMONIC: Record<string, NoteName> = {
  Db:'C#', Eb:'D#', Fb:'E', Gb:'F#', Ab:'G#', Bb:'A#', Cb:'B', 'E#':'F', 'B#':'C',
};

const MAJOR_STEPS = [0,2,4,5,7,9,11];
const MINOR_STEPS = [0,2,3,5,7,8,10];
const ROMAN_UPPER = ['I','II','III','IV','V','VI','VII'];

type HFunc = 'T' | 'S' | 'D';
const FUNC_COLOR: Record<HFunc, string> = { T:'#4ade80', S:'#facc15', D:'#f87171' };

// ─── Chord parser ─────────────────────────────────────────────────────────────

type Quality = 'maj'|'min'|'dom7'|'maj7'|'min7'|'dim'|'hdim'|'aug'|'sus2'|'sus4'|'dim7'|'min9'|'dom9'|'maj9';

interface ParsedChord {
  raw: string; root: number; quality: Quality;
  valid: boolean; intervals: number[];
}

// Longest/most-specific suffixes first to avoid partial matches
const SUFFIX_MAP: Array<[RegExp, Quality, number[]]> = [
  [/^(maj9|M9)$/,   'maj9',  [0,4,7,11,14]],
  [/^(maj7|M7|Δ7|Δ)$/, 'maj7', [0,4,7,11]],
  [/^(m7b5|ø7|ø)$/, 'hdim',  [0,3,6,10]],
  [/^(dim7|°7)$/,   'dim7',  [0,3,6,9]],
  [/^(dim|°)$/,     'dim',   [0,3,6]],
  [/^(aug|\+)$/,    'aug',   [0,4,8]],
  [/^m9$/,          'min9',  [0,3,7,10,14]],
  [/^(m7|min7|-7)$/, 'min7', [0,3,7,10]],
  [/^(m|min|-)$/,   'min',   [0,3,7]],
  [/^9$/,           'dom9',  [0,4,7,10,14]],
  [/^7$/,           'dom7',  [0,4,7,10]],
  [/^sus2$/,        'sus2',  [0,2,7]],
  [/^sus4$/,        'sus4',  [0,5,7]],
  [/^(maj|M)?$/,    'maj',   [0,4,7]],
];

function parseChord(raw: string): ParsedChord {
  const s = raw.trim();
  const bad = (): ParsedChord => ({ raw: s, root: 0, quality: 'maj', valid: false, intervals: [0,4,7] });
  if (!s) return bad();
  let i = 0;
  let rootStr = s[i++].toUpperCase();
  if (i < s.length && (s[i] === '#' || s[i] === 'b')) rootStr += s[i++];
  // strip slash-bass notation (e.g. C/E)
  const suffix = s.slice(i).split('/')[0];
  const resolved = ENHARMONIC[rootStr] ?? rootStr;
  const root = NOTE_NAMES.indexOf(resolved as NoteName);
  if (root === -1) return bad();
  for (const [re, quality, intervals] of SUFFIX_MAP) {
    if (re.test(suffix)) return { raw: s, root, quality, valid: true, intervals };
  }
  return bad();
}

// ─── Key detection ────────────────────────────────────────────────────────────

function detectKey(chords: ParsedChord[]): { root: number; mode: 'major'|'minor' } {
  let best = { root: 0, mode: 'major' as 'major'|'minor', score: -1 };
  for (let r = 0; r < 12; r++) {
    for (const [mode, steps] of [['major', MAJOR_STEPS], ['minor', MINOR_STEPS]] as const) {
      const scale = new Set(steps.map(s => (s + r) % 12));
      const score = chords.filter(c => c.valid && scale.has(c.root)).length;
      if (score > best.score) best = { root: r, mode, score };
    }
  }
  return best;
}

// ─── Roman numeral analysis ───────────────────────────────────────────────────

interface Analysis {
  chord: ParsedChord; roman: string; func: HFunc; diatonic: boolean; secondary: string | null;
}

function analyzeChords(chords: ParsedChord[], keyRoot: number, mode: 'major'|'minor'): Analysis[] {
  const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  const scale = steps.map(s => (s + keyRoot) % 12);

  return chords.map(c => {
    if (!c.valid) return { chord: c, roman: '?', func: 'D' as HFunc, diatonic: false, secondary: null };
    const degree = (c.root - keyRoot + 12) % 12;
    const idx = steps.indexOf(degree);
    const diatonic = idx !== -1;

    let roman = diatonic ? ROMAN_UPPER[idx] : '?';
    const isMinor = ['min','min7','min9','hdim','dim','dim7'].includes(c.quality);
    if (diatonic && isMinor) roman = roman.toLowerCase();
    if (c.quality === 'dim' || c.quality === 'dim7') roman += '°';
    if (c.quality === 'hdim') roman += 'ø7';
    if (c.quality === 'aug') roman += '+';
    if (['dom7','dom9'].includes(c.quality)) roman += '7';
    if (c.quality === 'maj7' || c.quality === 'maj9') roman += 'maj7';
    if (c.quality === 'min7' || c.quality === 'min9') roman += '7';

    const funcBase = diatonic ? ROMAN_UPPER[idx] : 'V';
    const func: HFunc = ['I','III','VI'].includes(funcBase) ? 'T'
      : ['II','IV'].includes(funcBase) ? 'S' : 'D';

    let secondary: string | null = null;
    if (!diatonic && ['dom7','dom9','maj'].includes(c.quality)) {
      const target = (c.root + 7) % 12;
      const ti = scale.indexOf(target);
      if (ti !== -1) secondary = `V/${ROMAN_UPPER[ti]}`;
    }
    return { chord: c, roman, func, diatonic, secondary };
  });
}

// ─── SATB voicing (correct close-position with proper octave spread) ──────────
//
// Music theory rules applied:
//   Bass  (voice 0): root in octave 2 (MIDI 36-47)
//   Tenor (voice 1): 3rd or 5th, octave 3 (MIDI 48-59)
//   Alto  (voice 2): 5th or 7th, octave 4 (MIDI 60-71)
//   Soprano (voice 3): root or 3rd, octave 4-5 (MIDI 60-79)
// Each voice is placed in its register independently, not by adding 12 blindly.

function midiInRegister(pc: number, lo: number, hi: number): number {
  // Find the MIDI note with pitch class `pc` closest to the middle of [lo, hi]
  const mid = Math.round((lo + hi) / 2);
  const base = pc + 12 * Math.floor((mid - pc) / 12);
  const candidates = [base - 12, base, base + 12];
  return candidates
    .filter(n => n >= lo && n <= hi)
    .reduce((best, n) => Math.abs(n - mid) < Math.abs(best - mid) ? n : best, base);
}

function satbVoicing(chord: ParsedChord, voiceOctaves: [number,number,number,number]): [number,number,number,number] {
  const ivs = chord.intervals;
  const root = chord.root;
  // pitch classes for each chord tone (wrap 9ths back into octave for voicing)
  const pcs = ivs.map(iv => (root + (iv % 12)) % 12);

  // Assign chord tones to voices by register
  // Bass: always root
  const bass = midiInRegister(pcs[0], 36 + (voiceOctaves[0]-2)*12, 47 + (voiceOctaves[0]-2)*12);
  // Tenor: 3rd (index 1), fallback root
  const tenorPc = pcs[1] ?? pcs[0];
  const tenor = midiInRegister(tenorPc, 48 + (voiceOctaves[1]-3)*12, 59 + (voiceOctaves[1]-3)*12);
  // Alto: 5th (index 2), fallback 3rd
  const altoPc = pcs[2] ?? pcs[1] ?? pcs[0];
  const alto = midiInRegister(altoPc, 60 + (voiceOctaves[2]-4)*12, 71 + (voiceOctaves[2]-4)*12);
  // Soprano: 7th if present (index 3), else root an octave up
  const sopPc = pcs[3] ?? pcs[0];
  const soprano = midiInRegister(sopPc, 60 + (voiceOctaves[3]-4)*12, 76 + (voiceOctaves[3]-4)*12);

  return [bass, tenor, alto, soprano];
}

function midiToNoteName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}


// ─── Instrument definitions ───────────────────────────────────────────────────

type InstrumentId = 'piano' | 'strings' | 'organ' | 'guitar' | 'vibraphone';

// Use the same pattern as the rest of the codebase: pass options directly to PolySynth constructor
type SynthCfg = { oscillator: { type: string }; envelope: { attack: number; decay: number; sustain: number; release: number } };

const INSTRUMENTS: Record<InstrumentId, { label: string; cfg: SynthCfg }> = {
  piano:      { label: 'Piano',      cfg: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02,  decay: 0.4,  sustain: 0.3, release: 1.2 } } },
  strings:    { label: 'Strings',    cfg: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.4,   decay: 0.1,  sustain: 0.9, release: 1.5 } } },
  organ:      { label: 'Organ',      cfg: { oscillator: { type: 'square'   }, envelope: { attack: 0.01,  decay: 0.01, sustain: 1.0, release: 0.1 } } },
  guitar:     { label: 'Guitar',     cfg: { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.6,  sustain: 0.1, release: 0.8 } } },
  vibraphone: { label: 'Vibraphone', cfg: { oscillator: { type: 'sine'     }, envelope: { attack: 0.01,  decay: 1.2,  sustain: 0.2, release: 1.0 } } },
};

// ─── Voice leading D3 chart ───────────────────────────────────────────────────

const VOICE_COLORS = ['#60a5fa','#4ade80','#fb923c','#f87171'];
const VOICE_LABELS = ['B','T','A','S'];

function VoiceLeadingChart({ voicings }: { voicings: [number,number,number,number][] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 500, H = 140;

  useEffect(() => {
    if (!svgRef.current || voicings.length < 2) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const all = voicings.flat();
    const yMin = Math.min(...all) - 1, yMax = Math.max(...all) + 1;
    const xScale = d3.scaleLinear().domain([0, voicings.length - 1]).range([36, W - 10]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([H - 10, 10]);

    [0,1,2,3].forEach(vi => {
      const data = voicings.map(v => v[vi]);
      svg.append('path')
        .datum(data)
        .attr('fill','none')
        .attr('stroke', VOICE_COLORS[vi])
        .attr('stroke-width', 2)
        .attr('d', d3.line<number>().x((_,i) => xScale(i)).y(d => yScale(d)).curve(d3.curveCatmullRom));
      data.forEach((d, i) => {
        svg.append('circle').attr('cx', xScale(i)).attr('cy', yScale(d)).attr('r', 3).attr('fill', VOICE_COLORS[vi]);
        svg.append('text').attr('x', xScale(i)).attr('y', yScale(d) - 6)
          .attr('text-anchor','middle').attr('font-size', 8).attr('fill', VOICE_COLORS[vi]).attr('font-family','monospace')
          .text(midiToNoteName(d));
      });
    });

    VOICE_LABELS.forEach((lbl, li) => {
      svg.append('text').attr('x', 4).attr('y', 14 + li * 16)
        .attr('fill', VOICE_COLORS[li]).attr('font-size', 10).attr('font-family','monospace').text(lbl);
    });
  }, [voicings]);

  if (voicings.length < 2) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 6, fontWeight: 600 }}>Voice Leading</div>
      <svg ref={svgRef} width={W} height={H}
        style={{ background:'#13131a', borderRadius:8, border:'1px solid #222', maxWidth:'100%' }} />
    </div>
  );
}

// ─── Substitutions panel ──────────────────────────────────────────────────────

function SubsPanel({ chord, keyRoot }: { chord: ParsedChord; keyRoot: number }) {
  const [open, setOpen] = useState(false);
  const subs: { label: string; chord: string }[] = [];
  if (chord.valid) {
    if (['dom7','dom9'].includes(chord.quality))
      subs.push({ label: 'Tritone sub', chord: `${NOTE_NAMES[(chord.root + 6) % 12]}7` });
    if (['min','min7','min9'].includes(chord.quality))
      subs.push({ label: 'Relative major', chord: NOTE_NAMES[(chord.root + 3) % 12] });
    else if (['maj','maj7','maj9'].includes(chord.quality))
      subs.push({ label: 'Relative minor', chord: `${NOTE_NAMES[(chord.root + 9) % 12]}m` });
  }
  if (!subs.length) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background:'none', border:'none', color:'#7c3aed', cursor:'pointer', fontSize:10, padding:0 }}>
        {open ? '▾' : '▸'} subs
      </button>
      {open && (
        <div style={{ background:'#0d0d14', border:'1px solid #2a2a3a', borderRadius:6, padding:'5px 8px', marginTop:3 }}>
          {subs.map((s, i) => (
            <div key={i} style={{ fontSize:10, color:'#bbb' }}>
              <span style={{ color:'#a855f7' }}>{s.label}:</span> {s.chord}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_VOICE_OCTAVES: [number,number,number,number] = [2, 3, 4, 4];

export default function ProgressionAnalyzer() {
  const [input, setInput] = useState('Dm7 G7 Cmaj7 Am7');
  const [manualKey, setManualKey] = useState('');
  const [instrument, setInstrument] = useState<InstrumentId>('piano');
  const [voiceOctaves, setVoiceOctaves] = useState<[number,number,number,number]>([...DEFAULT_VOICE_OCTAVES]);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const chords = useMemo(() => input.split(/[\s,]+/).filter(Boolean).map(parseChord), [input]);

  const autoKey = useMemo(() =>
    chords.some(c => c.valid) ? detectKey(chords.filter(c => c.valid)) : { root: 0, mode: 'major' as const },
    [chords]);

  const keyRoot = manualKey ? parseInt(manualKey.split('-')[0]) : autoKey.root;
  const keyMode = manualKey ? (manualKey.split('-')[1] as 'major'|'minor') : autoKey.mode;

  const results = useMemo(() => analyzeChords(chords, keyRoot, keyMode), [chords, keyRoot, keyMode]);

  // Recompute voicings whenever chords or voice octaves change
  const voicings = useMemo(
    () => chords.filter(c => c.valid).map(c => satbVoicing(c, voiceOctaves)),
    [chords, voiceOctaves]
  );

  // Rebuild synth when instrument changes
  useEffect(() => {
    synthRef.current?.dispose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    synthRef.current = new Tone.PolySynth(Tone.Synth, INSTRUMENTS[instrument].cfg as any).toDestination();
    synthRef.current.volume.value = -10;
    return () => { synthRef.current?.dispose(); synthRef.current = null; };
  }, [instrument]);

  const stop = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    synthRef.current?.releaseAll();
    setPlaying(false);
    setActiveIdx(-1);
  }, []);

  const play = useCallback(async () => {
    if (playing) { stop(); return; }
    const validChords = chords.filter(c => c.valid);
    if (!validChords.length) return;

    await Tone.start();
    setPlaying(true);

    const synth = synthRef.current!;
    const BPM = 80;
    const barSec = (60 / BPM) * 2; // 2 beats per chord (half note)
    const now = Tone.now() + 0.05; // small offset to avoid scheduling in the past

    let vi = 0;
    chords.forEach((c, i) => {
      if (!c.valid) return;
      const t = now + vi * barSec;
      const notes = satbVoicing(c, voiceOctaves).map(midiToNoteName);
      synth.triggerAttackRelease(notes, barSec - 0.05, t);

      timersRef.current.push(setTimeout(() => setActiveIdx(i), vi * barSec * 1000));
      vi++;
    });

    timersRef.current.push(setTimeout(() => {
      setPlaying(false);
      setActiveIdx(-1);
    }, vi * barSec * 1000 + 200));
  }, [chords, playing, stop, voiceOctaves]);

  const keyOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Auto-detect' }];
    for (let r = 0; r < 12; r++) {
      opts.push({ value: `${r}-major`, label: `${NOTE_NAMES[r]} major` });
      opts.push({ value: `${r}-minor`, label: `${NOTE_NAMES[r]} minor` });
    }
    return opts;
  }, []);

  const setVoiceOct = (vi: number, oct: number) =>
    setVoiceOctaves(prev => { const n = [...prev] as [number,number,number,number]; n[vi] = oct; return n; });

  const voiceNames = ['Bass', 'Tenor', 'Alto', 'Soprano'];
  const voiceRanges = [[1,3],[2,4],[3,5],[3,6]]; // sensible octave ranges per voice

  return (
    <div style={{ background:'#0a0a0f', color:'#e2e2e8', fontFamily:'"JetBrains Mono",monospace',
      minHeight:'100vh', padding:24, boxSizing:'border-box', maxWidth:800, margin:'0 auto' }}>

      <div style={{ fontSize:20, fontWeight:700, marginBottom:16, color:'#a855f7' }}>
        Chord Progression Analyzer
      </div>

      {/* Input */}
      <input value={input} onChange={e => setInput(e.target.value)}
        placeholder="Dm7 G7 Cmaj7 Am7"
        spellCheck={false}
        style={{ width:'100%', padding:'10px 14px', fontSize:14, fontFamily:'inherit',
          background:'#1a1a24', border:'1px solid #333', borderRadius:8,
          color:'#e2e2e8', outline:'none', marginBottom:6, boxSizing:'border-box' }} />
      <div style={{ fontSize:11, color:'#555', marginBottom:16 }}>
        Supports: C Cm C7 Cmaj7 Cm7 Cdim Caug Cm7b5 Cdim7 C9 Cm9 Cmaj9 — use # or b
      </div>

      {/* Controls row */}
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:20 }}>
        {/* Key */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#a78bfa' }}>Key:</span>
          <select value={manualKey} onChange={e => setManualKey(e.target.value)}
            style={{ background:'#1a1a24', border:'1px solid #333', borderRadius:6,
              color:'#e2e2e8', padding:'4px 8px', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
            {keyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!manualKey && (
            <span style={{ fontSize:11, color:'#555' }}>
              → {NOTE_NAMES[keyRoot]} {keyMode}
            </span>
          )}
        </div>

        {/* Instrument */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#a78bfa' }}>Instrument:</span>
          <select value={instrument} onChange={e => setInstrument(e.target.value as InstrumentId)}
            style={{ background:'#1a1a24', border:'1px solid #333', borderRadius:6,
              color:'#e2e2e8', padding:'4px 8px', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
            {(Object.keys(INSTRUMENTS) as InstrumentId[]).map(id => (
              <option key={id} value={id}>{INSTRUMENTS[id].label}</option>
            ))}
          </select>
        </div>

        {/* Play */}
        <button onClick={play} disabled={!chords.some(c => c.valid)}
          style={{ padding:'7px 20px', fontSize:13, fontFamily:'inherit', fontWeight:600,
            border:'none', borderRadius:8, cursor:'pointer',
            background: playing ? '#7c3aed' : '#a855f7', color:'#fff',
            opacity: chords.some(c => c.valid) ? 1 : 0.4 }}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      {/* Voice octave controls */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        {voiceNames.map((name, vi) => (
          <div key={vi} style={{ display:'flex', alignItems:'center', gap:6,
            background:'#1a1a24', border:`1px solid ${VOICE_COLORS[vi]}44`,
            borderRadius:6, padding:'5px 10px' }}>
            <span style={{ fontSize:11, color: VOICE_COLORS[vi], minWidth:48 }}>{name}</span>
            <button onClick={() => setVoiceOct(vi, Math.max(voiceRanges[vi][0], voiceOctaves[vi] - 1))}
              style={{ background:'none', border:'1px solid #333', color:'#aaa', borderRadius:3,
                width:20, height:20, cursor:'pointer', fontSize:12, lineHeight:1, padding:0 }}>−</button>
            <span style={{ fontSize:12, color:'#e2e2e8', minWidth:16, textAlign:'center' }}>
              {voiceOctaves[vi]}
            </span>
            <button onClick={() => setVoiceOct(vi, Math.min(voiceRanges[vi][1], voiceOctaves[vi] + 1))}
              style={{ background:'none', border:'1px solid #333', color:'#aaa', borderRadius:3,
                width:20, height:20, cursor:'pointer', fontSize:12, lineHeight:1, padding:0 }}>+</button>
          </div>
        ))}
        <button onClick={() => setVoiceOctaves([...DEFAULT_VOICE_OCTAVES])}
          style={{ background:'none', border:'1px solid #333', color:'#555', borderRadius:6,
            padding:'5px 10px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
          Reset voices
        </button>
      </div>

      {/* Chord cards */}
      {chords.length > 0 && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            {results.map((r, i) => {
              const fc = r.chord.valid ? FUNC_COLOR[r.func] : '#555';
              const isActive = activeIdx === i;
              // Show the actual notes being played
              const noteStr = r.chord.valid
                ? satbVoicing(r.chord, voiceOctaves).map(midiToNoteName).join(' ')
                : '';
              return (
                <div key={i} style={{
                  background: isActive ? '#1e1030' : '#1a1a24',
                  border: `1px solid ${isActive ? '#a855f7' : fc + '44'}`,
                  borderRadius:10, padding:'10px 14px', minWidth:90, textAlign:'center',
                  transition:'border-color 0.15s, background 0.15s',
                  boxShadow: isActive ? '0 0 12px #a855f744' : 'none',
                }}>
                  <div style={{ fontSize:16, fontWeight:700, color:fc }}>{r.roman}</div>
                  <div style={{ fontSize:13, color:'#ccc', marginTop:2, fontWeight:600 }}>{r.chord.raw}</div>
                  {r.chord.valid && (
                    <>
                      <div style={{ display:'inline-block', marginTop:4, fontSize:9, fontWeight:600,
                        padding:'2px 6px', borderRadius:4, background:`${fc}22`, color:fc }}>
                        {r.secondary ?? (r.func === 'T' ? 'Tonic' : r.func === 'S' ? 'Sub' : 'Dom')}
                      </div>
                      <div style={{ fontSize:8, color:'#555', marginTop:4, lineHeight:1.4 }}>{noteStr}</div>
                    </>
                  )}
                  {!r.chord.valid && <div style={{ fontSize:9, color:'#f87171', marginTop:4 }}>invalid</div>}
                  <SubsPanel chord={r.chord} keyRoot={keyRoot} />
                </div>
              );
            })}
          </div>

          {/* Voice leading chart */}
          <VoiceLeadingChart voicings={voicings} />
        </>
      )}
    </div>
  );
}
