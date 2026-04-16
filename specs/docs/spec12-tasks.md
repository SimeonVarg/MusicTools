# Spec 12 Tasks: Interval Trainer Keyboard

## T1: SVG 2-Octave Keyboard
**File**: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Render SVG keyboard C3–B4 (MIDI 48–71)
- White keys: 28px wide, 100px tall
- Black keys: 18px wide, 62px tall, overlapping white keys
- Click handlers on each key
- Key color driven by `keyStates` map

## T2: Challenge Generator
**File**: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Define `INTERVALS` array with semitones and level
- Implement `generateChallenge(level)` ensuring target is in keyboard range
- Display prompt: "Play a [interval] [above/below] [note name]"
- Root note highlighted on keyboard (purple)

## T3: Answer Validation + Audio Feedback
**File**: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- On key click: compare clicked MIDI to `challenge.targetMidi`
- Correct: green key + play success chord + update score/streak
- Wrong: red key + play error tone + reveal correct key in yellow after 500ms
- Auto-advance to next challenge after 1.5 seconds

## T4: Progressive Difficulty
**File**: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Track `streak` state; advance level after 5 consecutive correct
- Level 1–4 as defined in requirements
- Show current level in UI
- Manual level selector (1–4 buttons)

## T5: Score + Streak Display
**File**: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Show: Score, Streak, Accuracy %, Level
- High score from localStorage
- Streak fire emoji at 5+ streak

## T6: Route Verification
- Verify `/interval-keyboard` route works in App.tsx (already registered)

## Acceptance Criteria
- [ ] SVG keyboard renders correctly with black/white keys
- [ ] Challenge prompt shows interval and root note
- [ ] Correct answer: green flash + score increment
- [ ] Wrong answer: red flash + correct key revealed
- [ ] Level advances after 5 consecutive correct
- [ ] Score persists in localStorage
