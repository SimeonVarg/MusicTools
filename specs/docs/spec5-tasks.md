# Spec 5 Tasks: Ambient Engine — Convert Tailwind to Inline Styles

## T1: Convert All Tailwind Classes to Inline Styles
**File**: `src/tools/AmbientEngine/AmbientEngine.tsx`
- Search for all `className=` attributes in the file
- Replace each with equivalent `style={{ ... }}` inline object
- Use the mapping table in the design doc as reference
- Verify: no `className` attributes remain after conversion
- Verify: visual appearance is unchanged

## T2: Add Now-Playing Markov State Indicator
**File**: `src/tools/AmbientEngine/AmbientEngine.tsx`
- Add `const [currentDegree, setCurrentDegree] = useState(0)`
- In the Markov step callback (where next note is chosen), call `setCurrentDegree(nextDegree)`
- Render the indicator: "Now playing: V" with Roman numeral
- Position: in the controls area, near the melody layer controls

## T3: Add Scale Degree Highlight Strip
**File**: `src/tools/AmbientEngine/AmbientEngine.tsx`
- Add `const [recentDegrees, setRecentDegrees] = useState<number[]>([])`
- On each Markov step, prepend `currentDegree` to `recentDegrees` (keep last 7)
- Render 7 boxes (I–VII) with opacity based on recency
- Active degree: bright purple background
- Position: below the waveform display

## Acceptance Criteria
- [ ] Zero `className=` attributes in AmbientEngine.tsx
- [ ] Visual appearance identical to before
- [ ] "Now playing: [Roman numeral]" updates in real-time
- [ ] Scale degree strip shows current and recent degrees
- [ ] Recent degrees fade out over time
