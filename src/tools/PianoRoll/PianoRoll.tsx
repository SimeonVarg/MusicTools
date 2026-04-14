import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  pitch: number;       // 0=C0 … 87=B7
  startBeat: number;
  durationBeats: number;
  velocity: number;    // 0–127
}

type Tool = 'draw' | 'select';
type Quantization = 0.25 | 0.125 | 0.0625 | 0.03125;

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_KEYS = 88;
const KEY_W = 48;          // piano keyboard width (px)
const BLACK_KEY_W = 29;    // black key width (~60% of KEY_W)
const KEY_H = 14;          // row height per pitch (px)
const VEL_H = 80;          // velocity lane height (px)
const BEATS_VISIBLE = 32;  // default visible beats
const BPM = 120;

const PITCH_COLORS = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71',
  '#1abc9c','#3498db','#9b59b6','#e91e63',
  '#ff5722','#00bcd4','#8bc34a','#ff9800',
];

const BLACK_KEYS = new Set([1,3,6,8,10]); // pitch % 12

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Chord detection patterns (intervals from root, sorted)
const CHORD_PATTERNS: [number[], string][] = [
  [[0,4,7],       'maj'],
  [[0,3,7],       'min'],
  [[0,4,7,11],    'maj7'],
  [[0,3,7,10],    'm7'],
  [[0,4,7,10],    '7'],
  [[0,3,6],       'dim'],
  [[0,4,8],       'aug'],
  [[0,5,7],       'sus4'],
  [[0,2,7],       'sus2'],
  [[0,3,6,10],    'm7b5'],
  [[0,4,7,11,14], 'maj9'],
  [[0,3,7,10,14], 'm9'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pitchToName(pitch: number): string {
  const oct = Math.floor(pitch / 12);
  return NOTE_NAMES[pitch % 12] + oct;
}

function quantize(beat: number, q: Quantization): number {
  return Math.round(beat / q) * q;
}

function detectChord(pitches: number[]): string {
  if (pitches.length < 2) return '';
  const pcs = [...new Set(pitches.map(p => p % 12))].sort((a, b) => a - b);
  for (const root of pcs) {
    const intervals = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
    for (const [pattern, name] of CHORD_PATTERNS) {
      if (pattern.length === intervals.length && pattern.every((v, i) => v === intervals[i])) {
        return NOTE_NAMES[root] + name;
      }
    }
  }
  // partial match (subset)
  for (const root of pcs) {
    const intervals = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
    for (const [pattern, name] of CHORD_PATTERNS) {
      if (intervals.every(iv => pattern.includes(iv))) {
        return NOTE_NAMES[root] + name + '?';
      }
    }
  }
  return pcs.map(pc => NOTE_NAMES[pc]).join('/');
}

function velColor(v: number): string {
  const t = v / 127;
  const r = Math.round(30 + t * 225);
  const g = Math.round(100 - t * 80);
  const b = Math.round(220 - t * 200);
  return `rgb(${r},${g},${b})`;
}


// ─── Canvas draw helpers ──────────────────────────────────────────────────────

function drawPianoKeys(ctx: CanvasRenderingContext2D, scrollY: number) {
  ctx.clearRect(0, 0, KEY_W, ctx.canvas.height);
  // White keys first (full width)
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const pitch = TOTAL_KEYS - 1 - i;
    const y = i * KEY_H - scrollY;
    if (y + KEY_H < 0 || y > ctx.canvas.height) continue;
    if (BLACK_KEYS.has(pitch % 12)) continue;
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, y, KEY_W - 1, KEY_H - 1);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(0, y, KEY_W - 1, KEY_H - 1);
    if (pitch % 12 === 0) {
      ctx.fillStyle = '#333';
      ctx.font = '9px monospace';
      ctx.fillText(pitchToName(pitch), BLACK_KEY_W + 2, y + KEY_H - 3);
    }
  }
  // Black keys on top (shorter)
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const pitch = TOTAL_KEYS - 1 - i;
    const y = i * KEY_H - scrollY;
    if (y + KEY_H < 0 || y > ctx.canvas.height) continue;
    if (!BLACK_KEYS.has(pitch % 12)) continue;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, y, BLACK_KEY_W, KEY_H - 1);
  }
}

function drawRoll(
  ctx: CanvasRenderingContext2D,
  notes: Note[],
  scrollX: number,
  scrollY: number,
  zoom: number,
  playhead: number,
  selectedIds: Set<string>,
  chords: { beat: number; label: string }[],
  canvasW: number,
  canvasH: number,
  quant: Quantization,
  selBox: { x1: number; y1: number; x2: number; y2: number } | null,
) {
  ctx.clearRect(0, 0, canvasW, canvasH);

  const beatW = (canvasW / BEATS_VISIBLE) * zoom;

  // Background rows
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const pitch = TOTAL_KEYS - 1 - i;
    const y = i * KEY_H - scrollY;
    if (y + KEY_H < 0 || y > canvasH) continue;
    const isBlack = BLACK_KEYS.has(pitch % 12);
    ctx.fillStyle = isBlack ? '#1e1e24' : '#252530';
    ctx.fillRect(0, y, canvasW, KEY_H);
  }

  // Beat grid lines
  const firstBeat = Math.floor(scrollX / beatW);
  const lastBeat = Math.ceil((scrollX + canvasW) / beatW) + 1;
  for (let b = firstBeat; b <= lastBeat; b++) {
    const x = b * beatW - scrollX;
    ctx.strokeStyle = b % 4 === 0 ? '#444' : '#2e2e3a';
    ctx.lineWidth = b % 4 === 0 ? 1.5 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    if (b % 4 === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText(`${b}`, x + 2, 10);
    }
  }

  // Quantization sub-grid lines
  if (quant < 0.25) {
    const stepsPerBeat = 1 / quant;
    for (let b = firstBeat; b <= lastBeat; b++) {
      for (let s = 1; s < stepsPerBeat; s++) {
        const x = (b + s * quant) * beatW - scrollX;
        if (x < 0 || x > canvasW) continue;
        ctx.strokeStyle = '#262630';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
      }
    }
  }

  // Notes
  for (const n of notes) {
    const row = TOTAL_KEYS - 1 - n.pitch;
    const x = n.startBeat * beatW - scrollX;
    const y = row * KEY_H - scrollY;
    const w = Math.max(n.durationBeats * beatW - 1, 2);
    if (x + w < 0 || x > canvasW || y + KEY_H < 0 || y > canvasH) continue;

    const base = PITCH_COLORS[n.pitch % 12];
    ctx.fillStyle = base;
    ctx.globalAlpha = selectedIds.has(n.id) ? 1 : 0.85;
    ctx.fillRect(x, y + 1, w, KEY_H - 2);
    ctx.globalAlpha = 1;

    if (selectedIds.has(n.id)) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y + 1, w, KEY_H - 2);
    }

    // resize handle
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x + w - 4, y + 2, 3, KEY_H - 4);
  }

  // Chord labels
  for (const c of chords) {
    const x = c.beat * beatW - scrollX;
    if (x < -100 || x > canvasW + 100) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = 'bold 11px sans-serif';
    const tw = ctx.measureText(c.label).width;
    ctx.fillRect(x, 2, tw + 6, 16);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(c.label, x + 3, 14);
  }

  // Selection box
  if (selBox) {
    const rx = Math.min(selBox.x1, selBox.x2);
    const ry = Math.min(selBox.y1, selBox.y2);
    const rw = Math.abs(selBox.x2 - selBox.x1);
    const rh = Math.abs(selBox.y2 - selBox.y1);
    ctx.fillStyle = 'rgba(100,150,255,0.15)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(100,150,255,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
  }

  // Playhead
  const phX = playhead * beatW - scrollX;
  if (phX >= 0 && phX <= canvasW) {
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, canvasH); ctx.stroke();
    ctx.restore();
  }
}

function drawVelocityLane(
  ctx: CanvasRenderingContext2D,
  notes: Note[],
  scrollX: number,
  zoom: number,
  canvasW: number,
  selectedIds: Set<string>,
) {
  ctx.clearRect(0, 0, canvasW, VEL_H);
  ctx.fillStyle = '#181820';
  ctx.fillRect(0, 0, canvasW, VEL_H);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(0, 0, canvasW, VEL_H);

  const beatW = (canvasW / BEATS_VISIBLE) * zoom;
  for (const n of notes) {
    const x = n.startBeat * beatW - scrollX;
    const barH = Math.round((n.velocity / 127) * (VEL_H - 4));
    const barW = Math.max(n.durationBeats * beatW - 2, 4);
    if (x + barW < 0 || x > canvasW) continue;
    ctx.fillStyle = velColor(n.velocity);
    ctx.fillRect(x, VEL_H - barH, barW, barH);
    if (selectedIds.has(n.id)) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, VEL_H - barH, barW, barH);
    }
  }
  ctx.fillStyle = '#555';
  ctx.font = '9px monospace';
  ctx.fillText('VELOCITY', 2, 10);
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function PianoRoll() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tool, setTool] = useState<Tool>('draw');
  const [quant, setQuant] = useState<Quantization>(0.25);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selBox, setSelBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);

  const rollCanvasRef = useRef<HTMLCanvasElement>(null);
  const keyCanvasRef = useRef<HTMLCanvasElement>(null);
  const velCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const rafRef = useRef<number>(0);

  const dragRef = useRef<{
    type: 'draw' | 'move' | 'resize' | 'velocity' | 'select-box';
    noteId?: string;
    startX: number; startY: number;
    origBeat?: number; origPitch?: number; origDur?: number; origVel?: number;
    newNoteId?: string;
  } | null>(null);

  // ── Chord detection ──────────────────────────────────────────────────────
  const chords = (() => {
    const clusters: { beat: number; pitches: number[] }[] = [];
    const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
    for (const n of sorted) {
      const existing = clusters.find(c => Math.abs(c.beat - n.startBeat) < 0.1);
      if (existing) existing.pitches.push(n.pitch);
      else clusters.push({ beat: n.startBeat, pitches: [n.pitch] });
    }
    return clusters
      .filter(c => c.pitches.length >= 2)
      .map(c => ({ beat: c.beat, label: detectChord(c.pitches) }));
  })();

  // ── Canvas dimensions ────────────────────────────────────────────────────
  const rollH = TOTAL_KEYS * KEY_H;

  // ── Render loop ──────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const roll = rollCanvasRef.current;
    const keys = keyCanvasRef.current;
    const vel = velCanvasRef.current;
    if (!roll || !keys || !vel) return;
    const rCtx = roll.getContext('2d')!;
    const kCtx = keys.getContext('2d')!;
    const vCtx = vel.getContext('2d')!;
    drawPianoKeys(kCtx, scrollY);
    drawRoll(rCtx, notes, scrollX, scrollY, zoom, playhead, selectedIds, chords, roll.width, roll.height, quant, selBox);
    drawVelocityLane(vCtx, notes, scrollX, zoom, vel.width, selectedIds);
  }, [notes, scrollX, scrollY, zoom, playhead, selectedIds, chords, quant, selBox]);

  useEffect(() => { render(); }, [render]);

  // ── Hit test ─────────────────────────────────────────────────────────────
  const hitNote = useCallback((beatX: number, pitchY: number): { note: Note; zone: 'body' | 'resize' } | null => {
    const beatW = (rollCanvasRef.current?.width ?? 800) / BEATS_VISIBLE * zoom;
    for (const n of [...notes].reverse()) {
      const nX = n.startBeat * beatW;
      const nW = n.durationBeats * beatW;
      if (pitchY === n.pitch && beatX >= nX && beatX <= nX + nW) {
        const zone = beatX >= nX + nW - 4 / beatW ? 'resize' : 'body';
        return { note: n, zone };
      }
    }
    return null;
  }, [notes, zoom]);

  const canvasToBeat = (clientX: number, rect: DOMRect) =>
    (clientX - rect.left + scrollX) / ((rollCanvasRef.current?.width ?? 800) / BEATS_VISIBLE * zoom);

  const canvasToPitch = (clientY: number, rect: DOMRect) =>
    TOTAL_KEYS - 1 - Math.floor((clientY - rect.top + scrollY) / KEY_H);

  // ── Mouse handlers (roll) ────────────────────────────────────────────────
  const onRollMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const beat = canvasToBeat(e.clientX, rect);
    const pitch = canvasToPitch(e.clientY, rect);
    if (pitch < 0 || pitch >= TOTAL_KEYS) return;

    const hit = hitNote(beat, pitch);

    if (tool === 'select') {
      if (hit) {
        if (!e.shiftKey) setSelectedIds(new Set([hit.note.id]));
        else setSelectedIds(prev => { const s = new Set(prev); s.add(hit.note.id); return s; });
        dragRef.current = {
          type: hit.zone === 'resize' ? 'resize' : 'move',
          noteId: hit.note.id,
          startX: e.clientX, startY: e.clientY,
          origBeat: hit.note.startBeat, origPitch: hit.note.pitch,
          origDur: hit.note.durationBeats,
        };
      } else {
        if (!e.shiftKey) setSelectedIds(new Set());
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        setSelBox({ x1: cx, y1: cy, x2: cx, y2: cy });
        dragRef.current = { type: 'select-box', startX: e.clientX, startY: e.clientY };
      }
      return;
    }

    // draw tool
    if (hit) {
      // right-click or alt = delete
      if (e.button === 2 || e.altKey) {
        setNotes(prev => prev.filter(n => n.id !== hit.note.id));
        return;
      }
    }

    const qBeat = quantize(beat, quant);
    const id = uid();
    const newNote: Note = { id, pitch, startBeat: qBeat, durationBeats: quant, velocity: 100 };
    setNotes(prev => [...prev, newNote]);
    setSelectedIds(new Set([id]));
    dragRef.current = { type: 'draw', newNoteId: id, startX: e.clientX, startY: e.clientY, origBeat: qBeat };
  }, [tool, quant, zoom, scrollX, scrollY, hitNote]);

  const onRollMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const beatW = (rollCanvasRef.current?.width ?? 800) / BEATS_VISIBLE * zoom;
    const dxBeats = (e.clientX - d.startX) / beatW;
    const dyPitch = -Math.round((e.clientY - d.startY) / KEY_H);

    if (d.type === 'select-box') {
      setSelBox(prev => prev ? { ...prev, x2: e.clientX - rect.left, y2: e.clientY - rect.top } : null);
      return;
    }

    if (d.type === 'draw' && d.newNoteId) {
      const dur = Math.max(quant, quantize(dxBeats, quant) + quant);
      setNotes(prev => prev.map(n => n.id === d.newNoteId ? { ...n, durationBeats: dur } : n));
    } else if (d.type === 'move' && d.noteId) {
      const newBeat = Math.max(0, quantize((d.origBeat ?? 0) + dxBeats, quant));
      const newPitch = Math.max(0, Math.min(TOTAL_KEYS - 1, (d.origPitch ?? 0) + dyPitch));
      setNotes(prev => prev.map(n => n.id === d.noteId ? { ...n, startBeat: newBeat, pitch: newPitch } : n));
    } else if (d.type === 'resize' && d.noteId) {
      const newDur = Math.max(quant, quantize((d.origDur ?? quant) + dxBeats, quant));
      setNotes(prev => prev.map(n => n.id === d.noteId ? { ...n, durationBeats: newDur } : n));
    }
  }, [zoom, quant, scrollX]);

  const onRollMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.type === 'select-box' && selBox) {
      const beatW = (rollCanvasRef.current?.width ?? 800) / BEATS_VISIBLE * zoom;
      const minX = Math.min(selBox.x1, selBox.x2);
      const maxX = Math.max(selBox.x1, selBox.x2);
      const minY = Math.min(selBox.y1, selBox.y2);
      const maxY = Math.max(selBox.y1, selBox.y2);
      const minBeat = (minX + scrollX) / beatW;
      const maxBeat = (maxX + scrollX) / beatW;
      const minPitch = TOTAL_KEYS - 1 - Math.floor((maxY + scrollY) / KEY_H);
      const maxPitch = TOTAL_KEYS - 1 - Math.floor((minY + scrollY) / KEY_H);
      const ids = notes
        .filter(n =>
          n.startBeat + n.durationBeats > minBeat &&
          n.startBeat < maxBeat &&
          n.pitch >= minPitch &&
          n.pitch <= maxPitch
        )
        .map(n => n.id);
      setSelectedIds(prev => e.shiftKey ? new Set([...prev, ...ids]) : new Set(ids));
      setSelBox(null);
    }
    dragRef.current = null;
  }, [selBox, zoom, scrollX, scrollY, notes]);

  // ── Mouse handlers (velocity lane) ───────────────────────────────────────
  const onVelMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const beatW = (rollCanvasRef.current?.width ?? 800) / BEATS_VISIBLE * zoom;
    const clickBeat = (e.clientX - rect.left + scrollX) / beatW;
    // find closest note
    let closest: Note | null = null;
    let minDist = Infinity;
    for (const n of notes) {
      const d = Math.abs(n.startBeat - clickBeat);
      if (d < minDist) { minDist = d; closest = n; }
    }
    if (!closest) return;
    const vel = Math.max(1, Math.min(127, Math.round((1 - (e.clientY - rect.top) / VEL_H) * 127)));
    setNotes(prev => prev.map(n => n.id === closest!.id ? { ...n, velocity: vel } : n));
    dragRef.current = { type: 'velocity', noteId: closest.id, startX: e.clientX, startY: e.clientY, origVel: vel };
  }, [notes, zoom, scrollX]);

  const onVelMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.type !== 'velocity' || !d.noteId) return;
    const rect = velCanvasRef.current!.getBoundingClientRect();
    const vel = Math.max(1, Math.min(127, Math.round((1 - (e.clientY - rect.top) / VEL_H) * 127)));
    setNotes(prev => prev.map(n => n.id === d.noteId ? { ...n, velocity: vel } : n));
  }, []);

  // ── Scroll / zoom ─────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.max(0.25, Math.min(8, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else if (e.shiftKey) {
      setScrollX(x => Math.max(0, x + e.deltaY));
    } else {
      setScrollY(y => Math.max(0, Math.min(rollH - (rollCanvasRef.current?.height ?? 400), y + e.deltaY)));
    }
  }, [rollH]);


  // ── Playback ──────────────────────────────────────────────────────────────
  const startPlayback = useCallback(async () => {
    await Tone.start();
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
      }).toDestination();
    }
    partRef.current?.dispose();
    Tone.getTransport().bpm.value = BPM;
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;

    const events = notes.map(n => ({
      time: `${n.startBeat}i` as Tone.Unit.Time,
      note: Tone.Frequency(n.pitch + 12, 'midi').toNote(),
      duration: `${n.durationBeats * (60 / BPM)}`,
      velocity: n.velocity / 127,
    }));

    partRef.current = new Tone.Part((time, ev) => {
      synthRef.current?.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, events);
    partRef.current.start(0);
    Tone.getTransport().start();
    setIsPlaying(true);

    const startTime = Tone.now();
    const tick = () => {
      const elapsed = Tone.now() - startTime;
      setPlayhead((elapsed * BPM) / 60);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [notes]);

  const stopPlayback = useCallback(() => {
    Tone.getTransport().stop();
    partRef.current?.dispose();
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setPlayhead(0);
  }, []);

  useEffect(() => () => { stopPlayback(); synthRef.current?.dispose(); }, []);

  // ── Piano key preview ─────────────────────────────────────────────────────
  const previewNote = useCallback(async (pitch: number) => {
    await Tone.start();
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    }
    const note = Tone.Frequency(pitch + 12, 'midi').toNote();
    synthRef.current.triggerAttackRelease(note, '8n');
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify({ bpm: BPM, notes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'piano-roll.json';
    a.click();
  }, [notes]);

  // ── JSX ───────────────────────────────────────────────────────────────────
  const ROLL_W = 900;
  const ROLL_H = 480;

  return (
    <div style={{ background: '#12121a', color: '#ccc', fontFamily: 'monospace', userSelect: 'none', display: 'inline-block' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 8px', background: '#1a1a28', borderBottom: '1px solid #333', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#ffe066', fontWeight: 'bold', marginRight: 4 }}>🎹 Piano Roll</span>

        {(['draw', 'select'] as Tool[]).map(t => (
          <button key={t} onClick={() => setTool(t)}
            style={{ padding: '2px 10px', background: tool === t ? '#3a3a5c' : '#222', color: tool === t ? '#fff' : '#aaa', border: '1px solid #444', borderRadius: 4, cursor: 'pointer' }}>
            {t === 'draw' ? '✏️ Draw' : '🖱 Select'}
          </button>
        ))}

        <span style={{ color: '#888', marginLeft: 8 }}>Snap:</span>
        {([['1/4', 0.25], ['1/8', 0.125], ['1/16', 0.0625], ['1/32', 0.03125]] as [string, Quantization][]).map(([label, val]) => (
          <button key={label} onClick={() => setQuant(val)}
            title={`Snap notes to ${label} note grid`}
            style={{ padding: '2px 8px', background: quant === val ? '#3a3a5c' : '#222', color: quant === val ? '#fff' : '#aaa', border: '1px solid #444', borderRadius: 4, cursor: 'pointer' }}>
            {label}
          </button>
        ))}

        <span style={{ color: '#888', marginLeft: 8 }}>Zoom:</span>
        <button onClick={() => setZoom(z => Math.min(8, z * 1.25))} style={btnStyle}>+</button>
        <button onClick={() => setZoom(z => Math.max(0.25, z / 1.25))} style={btnStyle}>−</button>

        <button onClick={isPlaying ? stopPlayback : startPlayback}
          style={{ ...btnStyle, background: isPlaying ? '#8b0000' : '#1a5c1a', color: '#fff', minWidth: 60 }}>
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>

        <button onClick={() => setNotes([])} style={{ ...btnStyle, color: '#f88' }}>🗑 Clear</button>
        <button onClick={exportJSON} style={btnStyle}>💾 Export</button>
      </div>

      {/* Main area */}
      <div ref={containerRef} style={{ display: 'flex', overflow: 'hidden' }}>
        {/* Piano keyboard */}
        <canvas
          ref={keyCanvasRef}
          width={KEY_W}
          height={ROLL_H}
          style={{ flexShrink: 0, cursor: 'pointer' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pitch = TOTAL_KEYS - 1 - Math.floor((e.clientY - rect.top + scrollY) / KEY_H);
            if (pitch >= 0 && pitch < TOTAL_KEYS) previewNote(pitch);
          }}
        />

        {/* Roll canvas */}
        <canvas
          ref={rollCanvasRef}
          width={ROLL_W}
          height={ROLL_H}
          style={{ cursor: tool === 'draw' ? 'crosshair' : 'default' }}
          onMouseDown={onRollMouseDown}
          onMouseMove={onRollMouseMove}
          onMouseUp={onRollMouseUp}
          onMouseLeave={onRollMouseUp}
          onWheel={onWheel}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {/* Velocity lane */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: KEY_W, background: '#181820', borderRight: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, color: '#555', writingMode: 'vertical-rl' }}>VEL</span>
        </div>
        <canvas
          ref={velCanvasRef}
          width={ROLL_W}
          height={VEL_H}
          style={{ cursor: 'ns-resize' }}
          onMouseDown={onVelMouseDown}
          onMouseMove={onVelMouseMove}
          onMouseUp={onRollMouseUp}
          onMouseLeave={onRollMouseUp}
        />
      </div>

      <div style={{ padding: '4px 8px', fontSize: 10, color: '#555', background: '#12121a' }}>
        {notes.length} notes · snap: {({0.25:'1/4',0.125:'1/8',0.0625:'1/16',0.03125:'1/32'} as Record<number,string>)[quant]} · scroll: shift+wheel (X) / wheel (Y) · zoom: ctrl+wheel · alt+click = delete
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '2px 10px', background: '#222', color: '#ccc',
  border: '1px solid #444', borderRadius: 4, cursor: 'pointer',
};
