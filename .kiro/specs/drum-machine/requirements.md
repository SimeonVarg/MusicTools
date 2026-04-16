# Requirements: Drum Machine

## Bug References (from all-specs.md SPEC 4)
- Euclidean input uses onBlur — user must click away to apply (poor UX)
- No pattern presets
- Swing amount has no visual feedback on the circular display
- No visual labels on SVG rings (only color distinguishes instruments)

## Acceptance Criteria

### AC-1: Euclidean Immediate Apply
- Changing the Euclidean pulse count immediately updates the pattern (no blur required)
- A debounce of ≤300ms prevents excessive recalculation during rapid input
- The pattern updates visually within one debounce period

### AC-2: Pattern Presets
- At least 6 presets are available: 4-on-floor, Backbeat, Bossa Nova, Shuffle, Breakbeat, Empty
- Selecting a preset immediately loads the pattern into all tracks
- Preset names are displayed as clickable buttons

### AC-3: Swing Visualization
- Even-numbered step dots are offset clockwise proportional to the swing amount
- At swing=0, all dots are evenly spaced
- At swing=100, even dots are shifted noticeably toward the next beat

### AC-4: Ring Labels
- Each ring in the SVG has a text label showing the instrument name
- Labels are positioned near the outer edge of each ring
- Labels are legible (minimum 9px font, sufficient contrast)

## Correctness Properties
- Euclidean(3, 8) = [1,0,0,1,0,0,1,0] (Bjorklund algorithm)
- 4-on-floor preset: Kick on beats 1,5,9,13 of 16 steps
- Swing offset formula: evenStepAngle += (swing/100) * (stepAngle * 0.5)
