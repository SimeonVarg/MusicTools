# Spec 13 Tasks: Scale Practice Mode

## T1: Scale Data
**File**: `src/tools/ScalePractice/ScalePractice.tsx`
- Define `SCALES` array with 14+ scales (see design doc)
- Each scale: name, intervals, pattern string, description, optional characteristic indices
- Add root note selector (C–B, 12 options)
- Add scale selector dropdown

## T2: Piano Keyboard Visualization
**File**: `src/tools/ScalePractice/ScalePractice.tsx`
- Render SVG 2-octave keyboard (C3–B4)
- Scale notes: purple fill; root: bright purple with "R"; non-scale: dark
- Characteristic notes: gold highlight
- Currently playing note: white glow
- Click on key plays the note

## T3: Interval Pattern Display
**File**: `src/tools/ScalePractice/ScalePractice.tsx`
- Render the pattern string (W-W-H-W-W-W-H) as clickable step boxes
- W = whole step (green), H = half step (orange), A2 = augmented 2nd (red)
- Clicking a step plays that interval from the previous note
- Show degree numbers (1–7) above each note

## T4: Quiz Mode
**File**: `src/tools/ScalePractice/ScalePractice.tsx`
- Add "Quiz" toggle button
- Generate degree questions and step questions
- Degree question: click correct key on keyboard
- Step question: click W or H button
- Score + streak display

## T5: Audio Playback
**File**: `src/tools/ScalePractice/ScalePractice.tsx`
- "▶ Ascending", "▶ Descending", "▶ Random" buttons
- Play each note with 500ms spacing
- Highlight currently playing key
- Stop button cancels playback

## T6: Route Verification
- Verify `/scale-practice` route works (already registered)

## Acceptance Criteria
- [ ] 14+ scales available with correct intervals
- [ ] Keyboard highlights scale notes correctly
- [ ] Pattern display shows W/H steps
- [ ] Quiz mode generates questions and validates answers
- [ ] Audio plays scale in ascending/descending/random order
