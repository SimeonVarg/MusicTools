# Spec 3 Design: Ear Training — Adaptive Difficulty + Remove Confetti

## Component: `src/tools/EarTraining/EarTraining.tsx`

## Confetti Replacement
Remove: `import confetti from 'canvas-confetti'` and all `confetti(...)` calls.
Replace with CSS keyframe animation on the streak counter:
```css
@keyframes streakPulse {
  0%   { transform: scale(1);   color: #a855f7; }
  50%  { transform: scale(1.4); color: #fbbf24; }
  100% { transform: scale(1);   color: #a855f7; }
}
```
Trigger by toggling a `celebrating` boolean state for 600ms on milestone streaks (5, 10, 25...).

## Accuracy Tracking State
```ts
type ItemStats = { correct: number; total: number }
type StatsMap = Record<string, ItemStats>

// Load from localStorage on mount
const [stats, setStats] = useState<StatsMap>(() => {
  try { return JSON.parse(localStorage.getItem('ear-training-stats') ?? '{}') }
  catch { return {} }
})

// Save on every update
useEffect(() => {
  localStorage.setItem('ear-training-stats', JSON.stringify(stats))
}, [stats])
```

## Adaptive Weighting
```ts
function buildWeightedPool(items: QuestionItem[], stats: StatsMap): QuestionItem[] {
  return items.flatMap(item => {
    const s = stats[item.id]
    if (!s || s.total < 3) return [item, item] // new items: 2×
    const acc = s.correct / s.total
    if (acc < 0.6) return [item, item, item]   // weak: 3×
    if (acc > 0.85) return [item]               // strong: 1× (effectively 0.5× since pool is larger)
    return [item, item]                          // normal: 2×
  })
}
```

## Reference Tone Button
```tsx
{mode === 'interval' && (
  <button
    disabled={isPlaying}
    onClick={() => {
      setIsPlaying(true)
      synth.triggerAttackRelease(rootFreq, '1n')
      setTimeout(() => setIsPlaying(false), 1200)
    }}
    style={{ ... }}
  >
    ▶ Play Root
  </button>
)}
```

## Weak Item Indicator
In answer buttons, check `stats[item.id]`:
```tsx
const isWeak = stats[item.id] && stats[item.id].correct / stats[item.id].total < 0.6
<button style={{ borderColor: isWeak ? '#ef4444' : '#333' }}>
```
