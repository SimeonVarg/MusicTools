# Spec 7 Design: Oscilloscope — Keyboard Input + Extended Range

## Component: `src/tools/Oscilloscope/Oscilloscope.tsx`

## Frequency Range Extension
```ts
const FREQ_MIN = 20
const FREQ_MAX = 8000
// Logarithmic knob mapping:
const freqToKnob = (f: number) => Math.log(f / FREQ_MIN) / Math.log(FREQ_MAX / FREQ_MIN)
const knobToFreq = (k: number) => FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, k)
```

## Note Buttons
```ts
const NOTE_NAMES = ['C','D','E','F','G','A','B']
const NOTE_BUTTONS = Array.from({ length: 6 }, (_, oct) =>
  NOTE_NAMES.map(n => ({ label: `${n}${oct + 2}`, freq: noteToFreq(`${n}${oct + 2}`) }))
).flat()

function noteToFreq(note: string): number {
  const midi = noteNameToMidi(note) // e.g. C4 = 60
  return 440 * Math.pow(2, (midi - 69) / 12)
}
```

Render as a scrollable row of small buttons:
```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
  {NOTE_BUTTONS.map(({ label, freq }) => (
    <button key={label}
      onClick={() => setFrequency(freq)}
      style={{
        padding: '2px 6px', fontSize: 10, borderRadius: 3,
        background: Math.abs(currentFreq - freq) < 0.5 ? '#a855f7' : '#1e1e2e',
        border: '1px solid #333', color: '#ccc', cursor: 'pointer'
      }}
    >{label}</button>
  ))}
</div>
```

## Keyboard Input
```ts
const KEY_MAP: Record<string, number> = {
  'a': 0, 's': 2, 'd': 4, 'f': 5, 'g': 7, 'h': 9, 'j': 11, 'k': 12
}
const [octave, setOctave] = useState(4)

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return
    if (e.key === 'z') { setOctave(o => Math.max(1, o - 1)); return }
    if (e.key === 'x') { setOctave(o => Math.min(7, o + 1)); return }
    const semitone = KEY_MAP[e.key.toLowerCase()]
    if (semitone !== undefined) {
      const midi = (octave + 1) * 12 + semitone // C4 = MIDI 60
      setFrequency(440 * Math.pow(2, (midi - 69) / 12))
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [octave])
```

## Octave Display + Buttons
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <button onClick={() => setOctave(o => Math.max(1, o-1))}>−</button>
  <span style={{ color: '#a855f7', fontWeight: 700 }}>Octave {octave}</span>
  <button onClick={() => setOctave(o => Math.min(7, o+1))}>+</button>
</div>
```
