import { useState, useCallback, useRef, useMemo } from 'react';
import * as Tone from 'tone';

// ─── T1: Scale Data ───────────────────────────────────────────────────────────

type Scale = {
  name: string;
  intervals: number[];
  pattern: string;
  description: string;
  characteristic?: number[]; // interval indices (0-based) to highlight gold
};

const SCALES: Scale[] = [
  { name: 'Major (Ionian)',          intervals: [0,2,4,5,7,9,11],    pattern: 'W-W-H-W-W-W-H',     description: 'The foundation of Western music. Bright and stable.' },
  { name: 'Dorian',                  intervals: [0,2,3,5,7,9,10],    pattern: 'W-H-W-W-W-H-W',     description: 'Minor with ♮6. Jazz and Celtic folk staple.',       characteristic: [5] },
  { name: 'Phrygian',                intervals: [0,1,3,5,7,8,10],    pattern: 'H-W-W-W-H-W-W',     description: 'Minor with ♭2. Spanish and metal.',                 characteristic: [1] },
  { name: 'Lydian',                  intervals: [0,2,4,6,7,9,11],    pattern: 'W-W-W-H-W-W-H',     description: 'Major with ♯4. Dreamy and floating.',               characteristic: [3] },
  { name: 'Mixolydian',              intervals: [0,2,4,5,7,9,10],    pattern: 'W-W-H-W-W-H-W',     description: 'Major with ♭7. Blues and rock.',                    characteristic: [6] },
  { name: 'Aeolian (Natural Minor)', intervals: [0,2,3,5,7,8,10],    pattern: 'W-H-W-W-H-W-W',     description: 'Natural minor. Melancholic and expressive.' },
  { name: 'Locrian',                 intervals: [0,1,3,5,6,8,10],    pattern: 'H-W-W-H-W-W-W',     description: 'Diminished tonic. Unstable and rare.',              characteristic: [4] },
  { name: 'Melodic Minor',           intervals: [0,2,3,5,7,9,11],    pattern: 'W-H-W-W-W-W-H',     description: 'Minor with ♮6 and ♮7 ascending. Jazz essential.' },
  { name: 'Harmonic Minor',          intervals: [0,2,3,5,7,8,11],    pattern: 'W-H-W-W-H-A2-H',    description: 'Minor with ♮7. Classical and Middle Eastern.',      characteristic: [6] },
  { name: 'Major Pentatonic',        intervals: [0,2,4,7,9],         pattern: 'W-W-m3-W-m3',       description: 'Five-note major scale. Universal and consonant.' },
  { name: 'Minor Pentatonic',        intervals: [0,3,5,7,10],        pattern: 'm3-W-W-m3-W',       description: 'Five-note minor scale. Blues and rock foundation.' },
  { name: 'Blues',                   intervals: [0,3,5,6,7,10],      pattern: 'm3-W-H-H-m3-W',     description: 'Minor pentatonic + ♭5. The blues note.',            characteristic: [3] },
  { name: 'Whole Tone',              intervals: [0,2,4,6,8,10],      pattern: 'W-W-W-W-W-W',       description: 'All whole steps. Dreamy and ambiguous.' },
  { name: 'Diminished (W-H)',        intervals: [0,2,3,5,6,8,9,11],  pattern: 'W-H-W-H-W-H-W-H',  description: 'Symmetric 8-note scale. Jazz over dim7 chords.' },
];

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const IS_BLACK    = [false,true,false,true,false,false,true,false,true,false,true,false];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function midiToFreq(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }

// C3 = midi 48
function getScaleMidis(rootIdx: number, intervals: number[], octaveStart = 3): number[] {
  const base = 12 * (octaveStart + 1) + rootIdx; // C3 = 48
  const notes: number[] = [];
  for (let oct = 0; oct < 2; oct++)
    for (const iv of intervals) notes.push(base + oct * 12 + iv);
  notes.push(base + 24); // top root
  return notes;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── T2: Piano Keyboard ───────────────────────────────────────────────────────

const WW = 28, WH = 120, BW = 18, BH = 74;

function getKeyColor(
  midi: number,
  rootMidi: number,
  intervals: number[],
  characteristic: number[] | undefined,
  playingMidi: number | null,
  isBlack: boolean,
): string {
  if (playingMidi === midi) return '#ffffff';
  const pc = ((midi - rootMidi) % 12 + 12) % 12;
  if (pc === 0) return '#c084fc'; // root: bright purple
  const idx = intervals.indexOf(pc);
  if (idx >= 0) {
    if (characteristic?.includes(pc)) return '#eab308'; // gold
    return '#7c3aed'; // scale note: purple
  }
  return isBlack ? '#111' : '#1e1e2e'; // non-scale
}

interface PianoProps {
  rootIdx: number;
  scale: Scale;
  playingMidi: number | null;
  onKeyClick: (midi: number) => void;
}

function PianoKeyboard({ rootIdx, scale, playingMidi, onKeyClick }: PianoProps) {
  const startMidi = 48; // C3
  const whites: { midi: number; x: number }[] = [];
  const blacks: { midi: number; x: number }[] = [];
  const rootMidi = startMidi + rootIdx; // root in first octave

  let wx = 0;
  for (let i = 0; i <= 24; i++) {
    const midi = startMidi + i;
    const pc = i % 12;
    if (!IS_BLACK[pc]) { whites.push({ midi, x: wx }); wx += WW; }
  }
  for (let i = 0; i <= 24; i++) {
    const midi = startMidi + i;
    const pc = i % 12;
    if (IS_BLACK[pc]) {
      const prev = whites.find(w => w.midi === midi - 1);
      if (prev) blacks.push({ midi, x: prev.x + WW - BW / 2 });
    }
  }

  return (
    <svg width={wx} height={WH + 4} style={{ display: 'block', cursor: 'pointer' }}>
      {whites.map(k => {
        const fill = getKeyColor(k.midi, rootMidi, scale.intervals, scale.characteristic, playingMidi, false);
        const isRoot = ((k.midi - rootMidi) % 12 + 12) % 12 === 0;
        const glow = playingMidi === k.midi;
        return (
          <g key={k.midi} onClick={() => onKeyClick(k.midi)}>
            <rect x={k.x} y={0} width={WW - 1} height={WH} rx={3}
              fill={fill} stroke="#333" strokeWidth={1}
              style={glow ? { filter: 'drop-shadow(0 0 6px #fff)' } : undefined} />
            {isRoot && <text x={k.x + (WW - 1) / 2} y={WH - 8} textAnchor="middle"
              fontSize={10} fill="#fff" fontWeight="bold" style={{ pointerEvents: 'none' }}>R</text>}
          </g>
        );
      })}
      {blacks.map(k => {
        const fill = getKeyColor(k.midi, rootMidi, scale.intervals, scale.characteristic, playingMidi, true);
        const isRoot = ((k.midi - rootMidi) % 12 + 12) % 12 === 0;
        const glow = playingMidi === k.midi;
        return (
          <g key={k.midi} onClick={() => onKeyClick(k.midi)}>
            <rect x={k.x} y={0} width={BW} height={BH} rx={2}
              fill={fill} stroke="#333" strokeWidth={1}
              style={glow ? { filter: 'drop-shadow(0 0 6px #fff)' } : undefined} />
            {isRoot && <text x={k.x + BW / 2} y={BH - 6} textAnchor="middle"
              fontSize={9} fill="#fff" fontWeight="bold" style={{ pointerEvents: 'none' }}>R</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── T3: Pattern Display ──────────────────────────────────────────────────────

function PatternDisplay({ scale, rootIdx, onStepClick }: {
  scale: Scale;
  rootIdx: number;
  onStepClick: (fromMidi: number, toMidi: number) => void;
}) {
  const steps = scale.pattern.split('-');
  const baseMidi = 48 + rootIdx; // C3 + root

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Degree numbers */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {scale.intervals.map((_, i) => (
          <div key={i} style={{ width: 44, textAlign: 'center', fontSize: 11, color: '#a855f7', fontWeight: 700 }}>
            {i + 1}
          </div>
        ))}
      </div>
      {/* Step boxes */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {steps.map((step, i) => {
          const fromMidi = baseMidi + (scale.intervals[i] ?? 0);
          const toMidi   = baseMidi + (scale.intervals[i + 1] ?? 12);
          const bg = step === 'W' ? '#166534' : step === 'H' ? '#92400e' : step === 'A2' ? '#7f1d1d' : '#1a1a2e';
          const border = step === 'W' ? '#22c55e' : step === 'H' ? '#f97316' : step === 'A2' ? '#ef4444' : '#555';
          return (
            <button key={i} onClick={() => onStepClick(fromMidi, toMidi)}
              style={{ background: bg, color: '#fff', border: `1px solid ${border}`, borderRadius: 4,
                padding: '5px 10px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 44 }}>
              {step}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── T4: Quiz ─────────────────────────────────────────────────────────────────

type QuizQ =
  | { type: 'degree'; degree: number; answerPc: number }
  | { type: 'step'; fromIdx: number; toIdx: number; answer: 'W' | 'H' };

function generateQuestion(scale: Scale): QuizQ {
  if (Math.random() > 0.5 || scale.intervals.length < 2) {
    const degree = Math.floor(Math.random() * scale.intervals.length);
    return { type: 'degree', degree, answerPc: scale.intervals[degree] };
  } else {
    const i = Math.floor(Math.random() * (scale.intervals.length - 1));
    const diff = scale.intervals[i + 1] - scale.intervals[i];
    return { type: 'step', fromIdx: i, toIdx: i + 1, answer: diff <= 1 ? 'H' : 'W' };
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  root: { fontFamily: 'monospace', background: '#0a0a0f', color: '#e0e0e0', minHeight: '100%', padding: 24,
    display: 'flex', flexDirection: 'column' as const, gap: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 700, color: '#a855f7', margin: 0 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center', alignItems: 'center' },
  select: { background: '#1a1a2e', color: '#e0e0e0', border: '1px solid #333', borderRadius: 4,
    padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 },
  keyBtn: (active: boolean) => ({ background: active ? '#a855f7' : '#1a1a2e', color: active ? '#fff' : '#aaa',
    border: '1px solid #333', borderRadius: 4, padding: '6px 12px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 13, fontWeight: active ? 700 : 400 } as const),
  btn: (color = '#a855f7') => ({ background: '#1a1a2e', color, border: `1px solid ${color}`, borderRadius: 4,
    padding: '6px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 } as const),
  desc: { fontSize: 13, color: '#888', maxWidth: 480, textAlign: 'center' as const },
  quizBox: { background: '#111122', border: '1px solid #333', borderRadius: 8, padding: 20,
    maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 12, alignItems: 'center' },
  choiceBtn: (state: 'default' | 'correct' | 'wrong') => ({
    background: state === 'correct' ? '#166534' : state === 'wrong' ? '#7f1d1d' : '#1a1a2e',
    color: '#e0e0e0', border: '1px solid #555', borderRadius: 4, padding: '8px 16px',
    cursor: 'pointer', fontFamily: 'monospace', fontSize: 14, minWidth: 60,
  } as const),
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScalePractice() {
  const [scaleIdx, setScaleIdx]       = useState(0);
  const [rootIdx, setRootIdx]         = useState(0);
  const [playingMidi, setPlayingMidi] = useState<number | null>(null);
  const [quizOn, setQuizOn]           = useState(false);
  const [quizQ, setQuizQ]             = useState<QuizQ | null>(null);
  const [pickedPc, setPickedPc]       = useState<number | null>(null);
  const [pickedStep, setPickedStep]   = useState<'W' | 'H' | null>(null);
  const [score, setScore]             = useState(0);
  const [streak, setStreak]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const stopRef  = useRef(false);
  const synthRef = useRef<Tone.Synth | null>(null);

  const scale    = SCALES[scaleIdx];
  const rootMidi = 48 + rootIdx; // C3 + root offset

  const scaleMidis = useMemo(() => getScaleMidis(rootIdx, scale.intervals), [rootIdx, scale]);

  const getSynth = useCallback(async () => {
    await Tone.start();
    if (!synthRef.current)
      synthRef.current = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { release: 0.4 } }).toDestination();
    return synthRef.current;
  }, []);

  const playMidi = useCallback(async (midi: number) => {
    const synth = await getSynth();
    synth.triggerAttackRelease(midiToFreq(midi), '8n');
  }, [getSynth]);

  // T5: Playback
  const playSequence = useCallback(async (direction: 'asc' | 'desc' | 'random') => {
    if (playing) { stopRef.current = true; return; }
    const notes = direction === 'asc'  ? [...scaleMidis]
                : direction === 'desc' ? [...scaleMidis].reverse()
                : shuffle([...scaleMidis]);
    stopRef.current = false;
    setPlaying(true);
    const synth = await getSynth();
    for (const midi of notes) {
      if (stopRef.current) break;
      setPlayingMidi(midi);
      synth.triggerAttackRelease(midiToFreq(midi), '8n');
      await new Promise(r => setTimeout(r, 500));
    }
    setPlayingMidi(null);
    setPlaying(false);
  }, [playing, scaleMidis, getSynth]);

  const stopPlayback = () => { stopRef.current = true; };

  // T3: Step click plays two notes
  const onStepClick = useCallback(async (fromMidi: number, toMidi: number) => {
    const synth = await getSynth();
    const now = Tone.now();
    synth.triggerAttackRelease(midiToFreq(fromMidi), '8n', now);
    synth.triggerAttackRelease(midiToFreq(toMidi), '8n', now + 0.4);
  }, [getSynth]);

  // T2: Key click
  const onKeyClick = useCallback((midi: number) => {
    if (quizOn && quizQ?.type === 'degree') {
      const pc = ((midi - rootMidi) % 12 + 12) % 12;
      setPickedPc(pc);
      const correct = pc === quizQ.answerPc;
      if (correct) { setScore(s => s + 1); setStreak(s => s + 1); }
      else setStreak(0);
    } else {
      playMidi(midi);
    }
  }, [quizOn, quizQ, rootMidi, playMidi]);

  // T4: Quiz
  const startQuiz = () => {
    setQuizQ(generateQuestion(scale));
    setPickedPc(null);
    setPickedStep(null);
  };

  const nextQuestion = () => {
    setQuizQ(generateQuestion(scale));
    setPickedPc(null);
    setPickedStep(null);
  };

  const handleStepAnswer = (ans: 'W' | 'H') => {
    if (pickedStep !== null || quizQ?.type !== 'step') return;
    setPickedStep(ans);
    const correct = ans === quizQ.answer;
    if (correct) { setScore(s => s + 1); setStreak(s => s + 1); }
    else setStreak(0);
  };

  const degreeAnswered = quizQ?.type === 'degree' && pickedPc !== null;
  const stepAnswered   = quizQ?.type === 'step'   && pickedStep !== null;
  const answered       = degreeAnswered || stepAnswered;

  const degreeChoiceState = (pc: number): 'default' | 'correct' | 'wrong' => {
    if (pickedPc === null) return 'default';
    if (pc === (quizQ as { answerPc: number }).answerPc) return 'correct';
    if (pc === pickedPc) return 'wrong';
    return 'default';
  };

  const stepChoiceState = (btn: 'W' | 'H'): 'default' | 'correct' | 'wrong' => {
    if (pickedStep === null) return 'default';
    if (btn === (quizQ as { answer: string }).answer) return 'correct';
    if (btn === pickedStep) return 'wrong';
    return 'default';
  };

  return (
    <div style={S.root}>
      <h2 style={S.title}>Scale Practice</h2>

      {/* Scale + Root selectors */}
      <div style={S.row}>
        <select style={S.select} value={scaleIdx} onChange={e => setScaleIdx(Number(e.target.value))}>
          {SCALES.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
        </select>
      </div>
      <div style={S.row}>
        {NOTE_NAMES.map((n, i) => (
          <button key={n} style={S.keyBtn(i === rootIdx)} onClick={() => setRootIdx(i)}>{n}</button>
        ))}
      </div>

      <p style={S.desc}>{scale.description}</p>

      {/* T2: Piano */}
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <PianoKeyboard rootIdx={rootIdx} scale={scale} playingMidi={playingMidi} onKeyClick={onKeyClick} />
      </div>

      {/* Legend */}
      <div style={{ ...S.row, fontSize: 12, color: '#888', gap: 16 }}>
        <span><span style={{ color: '#c084fc' }}>■</span> Root</span>
        <span><span style={{ color: '#7c3aed' }}>■</span> Scale</span>
        <span><span style={{ color: '#eab308' }}>■</span> Characteristic</span>
        <span><span style={{ color: '#fff' }}>■</span> Playing</span>
      </div>

      {/* T3: Pattern */}
      <PatternDisplay scale={scale} rootIdx={rootIdx} onStepClick={onStepClick} />

      {/* T5: Playback */}
      <div style={S.row}>
        <button style={S.btn()} onClick={() => playSequence('asc')}  disabled={playing}>▲ Ascending</button>
        <button style={S.btn()} onClick={() => playSequence('desc')} disabled={playing}>▼ Descending</button>
        <button style={S.btn()} onClick={() => playSequence('random')} disabled={playing}>⟳ Random</button>
        {playing && <button style={S.btn('#ef4444')} onClick={stopPlayback}>■ Stop</button>}
      </div>

      {/* T4: Quiz */}
      <div style={S.quizBox}>
        <div style={S.row}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Quiz Mode</span>
          <button style={S.btn(quizOn ? '#ef4444' : '#a855f7')} onClick={() => {
            setQuizOn(q => !q);
            setQuizQ(null); setPickedPc(null); setPickedStep(null);
            if (!quizOn) { setScore(0); setStreak(0); }
          }}>
            {quizOn ? 'Exit Quiz' : 'Start Quiz'}
          </button>
          {quizOn && <span style={{ fontSize: 13, color: '#888' }}>Score: <b style={{ color: '#22c55e' }}>{score}</b> | Streak: <b style={{ color: '#f97316' }}>{streak}</b></span>}
        </div>

        {quizOn && (
          <>
            {!quizQ ? (
              <button style={S.btn()} onClick={startQuiz}>Generate Question</button>
            ) : (
              <>
                {quizQ.type === 'degree' && (
                  <>
                    <span style={{ textAlign: 'center' }}>
                      What note is degree <b style={{ color: '#a855f7' }}>{quizQ.degree + 1}</b> of{' '}
                      <b style={{ color: '#a855f7' }}>{NOTE_NAMES[rootIdx]} {scale.name}</b>?
                    </span>
                    <span style={{ fontSize: 12, color: '#666' }}>(Click the correct key on the keyboard above, or choose below)</span>
                    <div style={S.row}>
                      {NOTE_NAMES.map((n, i) => (
                        <button key={n} style={S.choiceBtn(degreeChoiceState(i))}
                          disabled={pickedPc !== null}
                          onClick={() => {
                            setPickedPc(i);
                            const correct = i === quizQ.answerPc;
                            if (correct) { setScore(s => s + 1); setStreak(s => s + 1); }
                            else setStreak(0);
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {quizQ.type === 'step' && (
                  <>
                    <span style={{ textAlign: 'center' }}>
                      Is the step from degree <b style={{ color: '#a855f7' }}>{quizQ.fromIdx + 1}</b> to{' '}
                      <b style={{ color: '#a855f7' }}>{quizQ.toIdx + 1}</b> a Whole (W) or Half (H) step?
                    </span>
                    <div style={S.row}>
                      {(['W', 'H'] as const).map(btn => (
                        <button key={btn} style={{ ...S.choiceBtn(stepChoiceState(btn)), minWidth: 80, fontSize: 16, fontWeight: 700 }}
                          disabled={pickedStep !== null}
                          onClick={() => handleStepAnswer(btn)}>
                          {btn}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {answered && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: (quizQ.type === 'degree' ? pickedPc === quizQ.answerPc : pickedStep === quizQ.answer) ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                      {(quizQ.type === 'degree' ? pickedPc === quizQ.answerPc : pickedStep === quizQ.answer) ? '✓ Correct!' : '✗ Wrong'}
                    </span>
                    <button style={S.btn()} onClick={nextQuestion}>Next →</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
