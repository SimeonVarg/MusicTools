# Tasks: Harmonic Series Tuner

## Status: Already Correct — Verification Only

- [x] T1: Verify HARMONIC_RATIOS = [1,2,3,...,16]
  - Confirm array in source is integer sequence, not JI fractions

- [x] T2: Verify JI_INTERVALS has 12 entries for chromatic semitones
  - Confirm [1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8]

- [x] T3: Verify JustVsET math is correct
  - etFreq = fundamental * Math.pow(2, i/12)
  - jiFreq = fundamental * JI_INTERVALS[i]
  - centDiff = 1200 * Math.log2(jiFreq / etFreq)

- [x] T4: Verify HarmonicBars shows n/1 labels
  - Each bar label shows `{n}/1` where n is the harmonic number
  - Frequency shown as `(fundamental * n).toFixed(0) Hz`

## No Code Changes Required
