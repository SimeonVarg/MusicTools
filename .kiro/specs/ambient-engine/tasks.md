# Tasks: Ambient Engine

- [ ] T1: Convert all Tailwind className usage to inline styles
  - Grep for `className=` in AmbientEngine.tsx
  - For each occurrence, replace with equivalent `style={{...}}`
  - Remove all `className` props
  - Verify: zero `className` attributes remain in file

- [ ] T2: Add Markov state display
  - Add `markovState: number` to component state (default 0)
  - In melody scheduling callback, call `setMarkovState(nextState)` after computing next
  - Add `DEGREE_NAMES` array: ['Tonic','Supertonic','Mediant','Subdominant','Dominant','Submediant','Leading Tone']
  - Render "Now Playing: Degree N — Name" indicator
  - Verify: indicator updates as melody plays

- [ ] T3: Add scale degree highlight strip
  - Add `recentDegrees: number[]` to state (max 4 entries)
  - On each note: append current degree, trim to last 4
  - Render row of cells (one per scale degree)
  - Active cell: bright color; recent cells: faded; inactive: dim
  - Verify: strip highlights current and recent degrees during playback
