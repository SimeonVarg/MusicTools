# Spec 6 Tasks: Galaxy Map — Performance + Teaching Content

## T1: Reduce MDS Iterations
**File**: `src/tools/GalaxyMap/GalaxyMap.tsx`
- Change MDS iteration count from 80 to 40
- Add `const MDS_ITERATIONS = 40` constant
- Verify `useMemo` dependency array is correct (no unnecessary recomputation)

## T2: Add Scale Descriptions
**File**: `src/tools/GalaxyMap/GalaxyMap.tsx`
- Add `description: string` field to the `Scale` type
- Write descriptions for all 36+ scales in the database
- Show description in the HUD panel below the interval list
- Style: italic, gray, 12px

## T3: Add Similarity Threshold Slider
**File**: `src/tools/GalaxyMap/GalaxyMap.tsx`
- Add `const [simThreshold, setSimThreshold] = useState(0.6)`
- Add range input slider (0.3–0.9, step 0.05) in the controls overlay
- Pass `simThreshold` to the constellation line filter
- Label shows current value: "Similarity: 0.60"

## T4: Add Compare Mode (Shift-Click)
**File**: `src/tools/GalaxyMap/GalaxyMap.tsx`
- Add `const [compareScale, setCompareScale] = useState<Scale | null>(null)`
- In the star click handler: if `e.shiftKey && selectedScale`, set `compareScale`
- Render compare panel showing shared/unique notes with color coding
- Blue = only in A, Orange = only in B, Green = shared
- Show count summary: "X shared, Y unique to A, Z unique to B"
- Click without shift clears compare mode

## Acceptance Criteria
- [ ] MDS uses 40 iterations (not 80)
- [ ] Scale descriptions appear in HUD panel
- [ ] Similarity slider changes constellation line density
- [ ] Shift-click shows compare panel with color-coded notes
