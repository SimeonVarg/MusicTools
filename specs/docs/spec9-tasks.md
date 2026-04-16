# Spec 9 Tasks: Tuner — Fix JI_RATIOS + Fix HarmonicBars + Fix JustVsET Math

## T1: Replace JI_RATIOS with HARMONIC_RATIOS
**File**: `src/tools/Tuner/Tuner.tsx`
- Delete `JI_RATIOS` constant
- Add `HARMONIC_RATIOS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]`
- Add `HARMONIC_NAMES` array with interval names for each partial
- Update all references from `JI_RATIOS` to `HARMONIC_RATIOS`

## T2: Add JI_INTERVALS for JustVsET
**File**: `src/tools/Tuner/Tuner.tsx`
- Add `JI_INTERVALS` array with 12 just intonation ratios (see design doc)
- Add `INTERVAL_NAMES` array for the 12 chromatic intervals
- These are used ONLY in the JustVsET component

## T3: Fix JustVsET Math
**File**: `src/tools/Tuner/Tuner.tsx`
- Rewrite `JustVsET` component to iterate over `JI_INTERVALS` (not harmonic partials)
- For each interval i: `jiFreq = fundamental * JI_INTERVALS[i]`, `etFreq = fundamental * 2^(i/12)`
- `centsDiff = 1200 * log2(jiFreq / etFreq)`
- Display: interval name, JI ratio, cent difference bar, cent value
- Add section header and 1-line explanation

## T4: Fix HarmonicBars Labels
**File**: `src/tools/Tuner/Tuner.tsx`
- Update `HarmonicBars` to use `HARMONIC_RATIOS` (integer n values)
- Bar label: `n/1` (not JI fraction)
- Tooltip/sub-label: harmonic name from `HARMONIC_NAMES`
- Frequency label: `(fundamental * n).toFixed(0) + 'Hz'`
- Add section header: "Harmonic Series" with 1-line explanation

## Acceptance Criteria
- [ ] HarmonicBars shows bars at `fundamental * 1, 2, 3, ...16`
- [ ] HarmonicBars labels show `1/1, 2/1, 3/1...` not JI fractions
- [ ] JustVsET compares JI intervals against ET semitones
- [ ] Cent differences are mathematically correct
- [ ] Two sections clearly labeled and explained
