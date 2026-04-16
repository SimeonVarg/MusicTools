# Design: Harmonic Series Tuner

## Status: Already Correct — Verification Only

The Tuner.tsx source already has the correct implementation:

```ts
// Correct harmonic series (integer multiples):
const HARMONIC_RATIOS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

// Correct JI chromatic intervals (12 semitones):
const JI_INTERVALS = [1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8]
```

## HarmonicBars (correct)
```tsx
// Shows fundamental * n for each harmonic n:
{HARMONIC_RATIOS.map((n, i) => (
  <div key={i}>
    <div style={{ height: 80 - i*4 }} />  {/* bar */}
    <span>{n}/1</span>                     {/* label */}
    <span>{(fundamental * n).toFixed(0)}Hz</span>
  </div>
))}
```

## JustVsET (correct)
```tsx
// Compares JI interval ratio vs ET semitone ratio:
{JI_INTERVALS.map((ratio, i) => {
  const jiFreq = fundamental * ratio
  const etFreq = fundamental * Math.pow(2, i / 12)
  const centDiff = 1200 * Math.log2(jiFreq / etFreq)
  // ...
})}
```

## Conceptual Separation (correct)
- "Harmonic Series" section: integer multiples (1×, 2×, 3×...)
- "Just vs Equal Temperament" section: JI chromatic intervals vs ET
- These are distinct concepts, clearly labeled in separate sections

## No Changes Required
