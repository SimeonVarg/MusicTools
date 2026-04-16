# Design: Ear Training

## T1: Remove canvas-confetti

Find and remove:
- `import confetti from 'canvas-confetti'`
- All `confetti(...)` calls

Replace streak celebration with CSS pulse:
```tsx
// Inline keyframe via style tag injected once, or use transform animation
<div style={{
  animation: showStreak ? 'pulse 0.4s ease-out' : 'none',
  // inject @keyframes pulse via a <style> tag in the component
}} />
```

Inject once:
```tsx
useEffect(() => {
  const s = document.createElement('style')
  s.textContent = '@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}'
  document.head.appendChild(s)
  return () => s.remove()
}, [])
```

## T2 + T4: Adaptive Weighting

```ts
// In state (already has stats: StatsMap)
function getWeight(key: string, stats: StatsMap): number {
  const s = stats[key]
  if (!s || s.total === 0) return 2  // unseen = medium priority
  const acc = s.correct / s.total
  if (acc < 0.5) return 4
  if (acc < 0.7) return 2
  return 1
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// In generateQuestion():
const pool = getCurrentPool(difficulty, mode)
const weights = pool.map(item => getWeight(item.name, stats))
const chosen = weightedRandom(pool, weights)
```

## T3: Reference Tone Button

```tsx
// Only shown in interval mode
{mode === 'interval' && (
  <button onClick={playRootTone} style={{ ... }}>
    ▶ Play Root
  </button>
)}

function playRootTone() {
  Tone.start()
  synth.triggerAttackRelease(currentQuestion.rootNote, '4n')
}
```

`currentQuestion.rootNote` is already stored in question state.

## No New Types Required
Existing `StatsMap = Record<string, { correct: number; total: number }>` is sufficient.
