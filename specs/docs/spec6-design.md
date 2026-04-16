# Spec 6 Design: Galaxy Map — Performance + Teaching Content

## Component: `src/tools/GalaxyMap/GalaxyMap.tsx`

## MDS Performance Fix
```ts
const MDS_ITERATIONS = 40 // was 80
// In useMemo:
const positions = useMemo(() => computeMDS(scales, MDS_ITERATIONS), [scales])
```

## Scale Description Data
Add `description` field to each scale object:
```ts
type Scale = {
  name: string
  intervals: number[]
  description: string
  // ... existing fields
}

// Examples:
{ name: 'Major', intervals: [0,2,4,5,7,9,11],
  description: 'The foundation of Western music. Bright, stable, universally familiar.' },
{ name: 'Dorian', intervals: [0,2,3,5,7,9,10],
  description: 'Minor with ♮6. The jazz minor par excellence — used in modal jazz and Celtic folk.' },
{ name: 'Phrygian', intervals: [0,1,3,5,7,8,10],
  description: 'Minor with ♭2. Dark and tense, common in metal and Spanish music.' },
{ name: 'Lydian', intervals: [0,2,4,6,7,9,11],
  description: 'Major with ♯4. Dreamy and floating — John Williams\' signature sound.' },
// ... all 36 scales
```

## Similarity Slider
```tsx
const [simThreshold, setSimThreshold] = useState(0.6)

// In controls overlay:
<label style={{ color: '#888', fontSize: 12 }}>
  Similarity: {simThreshold.toFixed(2)}
  <input type="range" min={0.3} max={0.9} step={0.05}
    value={simThreshold}
    onChange={e => setSimThreshold(+e.target.value)}
    style={{ marginLeft: 8, width: 100 }}
  />
</label>

// Pass to constellation line rendering:
const lines = scales.flatMap((a, i) =>
  scales.slice(i+1).filter(b => similarity(a,b) >= simThreshold).map(b => [a,b])
)
```

## Compare Mode
```tsx
const [compareScale, setCompareScale] = useState<Scale | null>(null)

// In click handler:
if (e.shiftKey && selectedScale) {
  setCompareScale(clickedScale)
} else {
  setSelectedScale(clickedScale)
  setCompareScale(null)
}

// Compare panel:
const sharedNotes = selectedScale.intervals.filter(n => compareScale.intervals.includes(n))
const onlyA = selectedScale.intervals.filter(n => !compareScale.intervals.includes(n))
const onlyB = compareScale.intervals.filter(n => !selectedScale.intervals.includes(n))
```

## HUD Panel Update
Add description below the interval display:
```tsx
{selectedScale && (
  <p style={{ color: '#aaa', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
    {selectedScale.description}
  </p>
)}
```
