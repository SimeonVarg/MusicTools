# Design: Oscilloscope

## Existing State (from source)
- `FREQ_MIN = 20`, `FREQ_MAX = 8000` — already updated in source
- `freqToKnob` / `knobToFreq` — logarithmic mapping already present
- `NOTE_BUTTONS` array already defined (C2–C7 white keys)

## T1: Frequency Range (already done in source)
`FREQ_MAX = 8000` is already set. Verify and confirm.

## T2: Note Buttons

```tsx
const [activeNote, setActiveNote] = useState<string | null>(null)

// Render note buttons grouped by octave:
{Array.from({length:6}, (_,oct) => (
  <div key={oct} style={{ display:'flex', gap:2, marginBottom:2 }}>
    {['C','D','E','F','G','A','B'].map(n => {
      const label = `${n}${oct+2}`
      const freq = noteToFreq(n, oct+2)
      return (
        <button key={label}
          onClick={() => { setFreq(freq); setActiveNote(label) }}
          style={{
            background: activeNote === label ? '#7af' : '#1a1a2e',
            color: activeNote === label ? '#000' : '#666',
            border: '1px solid #333', borderRadius:3,
            padding:'2px 4px', fontSize:9, cursor:'pointer',
          }}>
          {label}
        </button>
      )
    })}
  </div>
))}
```

## T3: Keyboard Input

```ts
const [octave, setOctave] = useState(4)
const KEY_MAP: Record<string, number> = {
  a:0, s:2, d:4, f:5, g:7, h:9, j:11  // C D E F G A B semitones
}

useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return
    const k = e.key.toLowerCase()
    if (k === 'z') { setOctave(o => Math.max(1, o-1)); return }
    if (k === 'x') { setOctave(o => Math.min(7, o+1)); return }
    if (k in KEY_MAP) {
      const midi = (octave + 1) * 12 + KEY_MAP[k]
      setFreq(440 * Math.pow(2, (midi - 69) / 12))
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [octave])
```

## T4: Octave Display + Buttons

```tsx
<div style={{ display:'flex', alignItems:'center', gap:8 }}>
  <button onClick={() => setOctave(o => Math.max(1,o-1))}>−</button>
  <span style={{ fontSize:13, color:'#7af' }}>Oct {octave}</span>
  <button onClick={() => setOctave(o => Math.min(7,o+1))}>+</button>
</div>
```
