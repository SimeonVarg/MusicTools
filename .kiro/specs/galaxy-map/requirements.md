# Requirements: Galaxy Map

## Bug References (from all-specs.md SPEC 6)
- MDS runs 80 iterations on every render — blocks main thread
- No teaching content when clicking a scale
- Similarity threshold 0.6 is hardcoded with no user control
- No comparison mode between two scales

## Acceptance Criteria

### AC-1: Reduced MDS Iterations
- MDS layout uses ≤40 iterations (down from 80)
- Positions are memoized with `useMemo` — recalculated only when scale data changes
- No perceptible layout difference at 40 vs 80 iterations

### AC-2: Scale Descriptions
- Each scale in the SCALES array has a non-empty `description` field
- Clicking a scale node shows the description in the info panel
- Description is ≤120 characters (one teaching sentence)

### AC-3: Threshold Slider
- A slider control labeled "Similarity Threshold" is visible in the controls bar
- Range: 0.3–0.9, step 0.05, default 0.6
- Moving the slider immediately updates which connection lines are drawn

### AC-4: Compare Mode
- Shift-clicking a second scale enters compare mode
- In compare mode, shared notes are highlighted green, different notes are highlighted red
- A "Clear Compare" button exits compare mode

## Correctness Properties
- Similarity between identical scales = 1.0
- Similarity between C major [0,2,4,5,7,9,11] and C minor [0,2,3,5,7,8,10] = 5/7 ≈ 0.714
- Threshold slider change triggers re-render of connection lines only (not MDS recalc)
