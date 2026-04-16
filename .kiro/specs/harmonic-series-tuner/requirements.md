# Requirements: Harmonic Series Tuner

## Bug References (from all-specs.md SPEC 9)
- CRITICAL: JI_RATIOS was labeled "partials 1-16" but contained JI interval ratios, not harmonic series integers
- CRITICAL: JustVsET compared harmonic partials against JI intervals (different concepts)
- Component conflated harmonic series (overtones) with just intonation intervals

## Status: ALREADY FIXED
The Tuner.tsx source has been corrected in a prior session:
- `HARMONIC_RATIOS = [1,2,3,...,16]` — correct integer harmonic series
- `JI_INTERVALS = [1/1, 16/15, 9/8, ...]` — correct 12 JI chromatic intervals
- `HarmonicBars` shows `fundamental * n` with label `n/1`
- `JustVsET` compares `fundamental * jiRatio` vs `fundamental * 2^(i/12)`

## Acceptance Criteria (Verification)

### AC-1: Harmonic Series Display
- `HARMONIC_RATIOS` is `[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]`
- Each bar shows frequency = `fundamental * n` where n is the harmonic number
- Labels show `n/1` (e.g., "1/1", "2/1", "3/1")

### AC-2: JI vs ET Comparison
- `JI_INTERVALS` has 12 entries for the 12 chromatic semitones
- ET frequency = `fundamental * 2^(semitone/12)`
- JI frequency = `fundamental * JI_INTERVALS[semitone]`
- Cent difference = `1200 * log2(jiFreq / etFreq)`

### AC-3: Conceptual Separation
- Harmonic series section and JI vs ET section are visually distinct
- Harmonic series section header says "Harmonic Series" (not "JI Ratios")
- JI vs ET section header says "Just vs Equal Temperament"

## Correctness Properties
- Harmonic 3 frequency = fundamental * 3 (not fundamental * 3/2)
- JI P5 ratio = 3/2, ET P5 = 2^(7/12) ≈ 1.4983, difference ≈ +1.96 cents
- All 16 harmonic bars have non-zero height
