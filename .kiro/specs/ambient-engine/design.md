# Design: Ambient Engine

## T1: Convert Tailwind to Inline Styles

Scan AmbientEngine.tsx for `className=` attributes. For each:
1. Identify the Tailwind classes used
2. Replace with equivalent inline `style` object
3. Remove the `className` prop

Common conversions needed (check actual file):
- `className="flex items-center gap-2"` → `style={{ display:'flex', alignItems:'center', gap:8 }}`
- `className="text-sm text-gray-400"` → `style={{ fontSize:14, color:'#9ca3af' }}`
- `className="rounded-lg p-4"` → `style={{ borderRadius:8, padding:16 }}`

After conversion: zero `className` props in the file.

## T2: Markov State Display

Add `markovState` to component state:
```ts
const [markovState, setMarkovState] = useState(0)
```

Update it in the melody scheduling callback:
```ts
// Inside the Tone.js sequence callback, after computing next state:
setMarkovState(nextState)
```

Render:
```tsx
<div style={{ fontSize:11, color:'#888' }}>
  Now Playing: Degree {markovState + 1} — {DEGREE_NAMES[markovState]}
</div>
```

```ts
const DEGREE_NAMES = ['Tonic','Supertonic','Mediant','Subdominant','Dominant','Submediant','Leading Tone']
```

## T3: Scale Degree Highlight Strip

```tsx
const [recentDegrees, setRecentDegrees] = useState<number[]>([])

// On each note: setRecentDegrees(prev => [...prev.slice(-3), nextState])

<div style={{ display:'flex', gap:3, marginTop:8 }}>
  {scaleNotes.map((_, i) => (
    <div key={i} style={{
      width:24, height:24, borderRadius:4,
      background: i === markovState ? '#7af'
        : recentDegrees.includes(i) ? '#7af44'
        : '#1a1a2e',
      opacity: i === markovState ? 1 : recentDegrees.indexOf(i) >= 0 ? 0.5 : 0.2,
      transition: 'background 0.3s, opacity 0.3s',
    }} />
  ))}
</div>
```

## No New Dependencies
All changes use existing React state and Tone.js patterns.
