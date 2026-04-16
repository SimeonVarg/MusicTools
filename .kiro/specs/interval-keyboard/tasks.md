# Tasks: Interval Keyboard

- [ ] T1: Build SVG 2-octave piano keyboard (C3–B4)
  - Compute white key positions (14 keys × 28px wide)
  - Compute black key positions (10 black keys)
  - Each key has click handler
  - Verify: keyboard renders with correct white/black key layout

- [ ] T2: Implement challenge generator
  - `generateChallenge(difficulty): Challenge`
  - Random root from keyboard range, random interval from difficulty pool
  - Store challenge in state
  - Verify: challenge prompt shows e.g. "Play a Major 3rd above E4"

- [ ] T3: Answer validation + audio feedback
  - On key click: compare clicked MIDI to `challenge.answerMidi`
  - Correct: flash green, play note, +10 score, next challenge after 800ms
  - Wrong: flash red, show correct answer briefly
  - Root note always highlighted blue
  - Verify: correct answer triggers green flash and score increment

- [ ] T4: Progressive difficulty
  - Track consecutive correct answers
  - After 5 correct: advance difficulty (beginner→intermediate→advanced)
  - Show current difficulty level
  - Verify: difficulty advances after 5 correct answers

- [ ] T5: Score/streak display
  - Show score, current streak, best streak
  - Verify: score increments on correct, streak resets on wrong

- [ ] T6: Route already registered in App.tsx — verify `/interval-keyboard` loads
