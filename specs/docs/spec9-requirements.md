# Spec 9 Requirements: Tuner — Fix JI_RATIOS + Fix HarmonicBars + Fix JustVsET Math

## Overview
Fix two critical conceptual bugs: the conflation of harmonic series with JI intervals, and the incorrect JustVsET comparison math.

## Functional Requirements

### FR-1: Fix HARMONIC_RATIOS (was JI_RATIOS)
- Current: `JI_RATIOS` contains JI interval ratios (3/2, 5/4, etc.) but is used as harmonic series
- Fix: Replace with `HARMONIC_RATIOS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]`
- These are the integer harmonic partials of the fundamental
- HarmonicBars component uses `fundamental * n` for each partial — this is now correct

### FR-2: Fix HarmonicBars Labels
- Current: shows JI fraction labels (3/2, 5/4) below harmonic bars — wrong concept
- Fix: show `n/1` labels (1/1, 2/1, 3/1, ...) representing the harmonic number
- Also show the interval name each harmonic represents:
  - 1: Fundamental (unison)
  - 2: Octave (2:1)
  - 3: Perfect 5th + octave (3:2 above octave)
  - 4: Two octaves (4:1)
  - 5: Major 3rd + 2 octaves (5:4 above)
  - 6: Perfect 5th + 2 octaves
  - 7: Harmonic 7th (7:4 — flat minor 7th)
  - 8: Three octaves

### FR-3: Fix JustVsET Comparison
- Current: compares harmonic partials against JI intervals — wrong
- Fix: compare each of the 12 JI intervals against their ET equivalents
- `JI_INTERVALS = [1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8]`
- For each interval i (0–11):
  - `jiFreq = fundamental * JI_INTERVALS[i]`
  - `etFreq = fundamental * 2^(i/12)`
  - `centsDiff = 1200 * log2(jiFreq / etFreq)`
- Display: side-by-side bars with cent difference label

### FR-4: Conceptual Clarity
- Add section headers: "Harmonic Series" and "Just vs Equal Temperament"
- Add a brief explanation under each section (1 sentence)
- These are now clearly two separate, correctly-implemented features

## Non-Functional Requirements
- No new dependencies
- All math is pure JS
- Existing component structure preserved (just fix the data and math)
