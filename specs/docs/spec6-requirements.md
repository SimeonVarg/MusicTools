# Spec 6 Requirements: Galaxy Map — Performance + Teaching Content

## Overview
Improve MDS performance, add scale descriptions, add similarity threshold slider, and add compare mode.

## Functional Requirements

### FR-1: MDS Performance
- Current: 80 iterations on every render — blocks main thread
- Fix: reduce to 40 iterations (sufficient convergence for 36 scales)
- Positions already memoized with `useMemo` — ensure dependency array is correct
- Result: smoother interaction, no jank on first load

### FR-2: Scale Descriptions
- Add a `description` field to each scale in the scale database
- Description: 1–2 sentences explaining the scale's character, origin, and typical use
- Examples:
  - Major: "The foundation of Western music. Bright, stable, and universally familiar."
  - Dorian: "Minor with a raised 6th. Used extensively in jazz and Celtic folk music."
  - Phrygian Dominant: "The 5th mode of harmonic minor. Defines the Spanish/flamenco sound."
- Description shown in the HUD panel when a scale is selected

### FR-3: Similarity Threshold Slider
- Add a slider control (range 0.3–0.9, step 0.05, default 0.6)
- Slider controls which scales are connected by constellation lines
- Lower threshold = more connections; higher = fewer
- Label: "Similarity: X.XX"
- Position: in the controls overlay

### FR-4: Compare Mode (Shift-Click)
- Shift-clicking a second scale enters compare mode
- Compare mode shows:
  - Scale A notes: blue circles
  - Scale B notes: orange circles
  - Shared notes: green circles (with "✓" label)
  - Notes only in A: blue with "A"
  - Notes only in B: orange with "B"
- A panel shows: "X notes in common, Y unique to A, Z unique to B"
- Click anywhere else to exit compare mode

## Non-Functional Requirements
- MDS iteration count is a constant `MDS_ITERATIONS = 40`
- Descriptions are static data (no API calls)
- Compare mode uses existing scale note data
- Shift-click detection: `e.shiftKey` in the click handler
