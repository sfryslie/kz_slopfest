# kz_slop_haiku45_v1 — Design Plan

## Theme: Industrial Canyon Transit

A vertical industrial/mining facility built into a canyon. The map progresses upward through four stages of increasing technical difficulty, using industrial metal textures, catwalks, and ramps set against canyon walls. The aesthetic emphasizes precision and height as the player advances.

## Stage-by-Stage Design

### Stage 1: Canyon Base (Introductory)
- **Difficulty mechanism:** Horizontal distance
- **Key jump:** 180-unit gap at flat elevation
- **Context:** Player starts at canyon bottom, navigates horizontally through industrial structures
- **Calculation:**
  - Max clearable at 250 u/s (run speed): 250 · 0.755s + 32 = 220 u
  - Required gap: 180 u (81.8% of max) ✓
- **Why this works:** Establishes baseline movement; player builds confidence with straight-line jumps

### Stage 2: Lower Platform (Intermediate)
- **Difficulty mechanism:** Speed requirement + distance
- **Key jump:** 200-unit gap at prestrafe speed (275 u/s)
- **Context:** Player must reach a lower platform by jumping with run-up momentum
- **Calculation:**
  - Max clearable at 275 u/s: 275 · 0.755s + 32 = 240 u
  - Required gap: 200 u (83.3% of max) ✓
- **Why this works:** Requires prestrafe positioning; introduces speed management

### Stage 3: Upper Platform (Advanced)
- **Difficulty mechanism:** Height variation + precision
- **Key jump:** 150-unit gap landing +40u above takeoff (uphill)
- **Context:** Player must jump uphill to a narrow catwalk
- **Calculation:**
  - Uphill dz = +40u, airTime(40) = (302 + sqrt(302² - 2·800·40)) / 800 = 0.535s
  - Max clearable: 250 · 0.535 + 32 = 166 u
  - Required gap: 150 u (90.4% of max) ✓
- **Why this works:** Airtime reduction from elevation change significantly increases difficulty

### Stage 4: Final Ascent (Expert)
- **Difficulty mechanism:** Combined height + precision + distance
- **Key jump:** 130-unit gap landing +50u above takeoff with sloped approach
- **Context:** Tricky final platform before finish with mixed geometry
- **Calculation:**
  - Uphill dz = +50u, airTime(50) = (302 + sqrt(302² - 2·800·50)) / 800 = 0.508s
  - Max clearable at 275 u/s: 275 · 0.508 + 32 = 172 u
  - Required gap: 130 u (75.6% of max) ✓
- **Why this works:** Combines speed requirement with significant height, requiring expert timing

## Difficulty Progression

| Stage | Primary Challenge | Airtime (s) | Max Gap (u) | Required (u) | % of Max |
|-------|-------------------|-------------|------------|-------------|----------|
| 1     | Distance (flat)   | 0.755       | 220        | 180         | 81.8%    |
| 2     | Speed + Distance  | 0.755       | 240        | 200         | 83.3%    |
| 3     | Uphill precision  | 0.535       | 166        | 150         | 90.4%    |
| 4     | Height + Speed    | 0.508       | 172        | 130         | 75.6%    |

Each stage increases in at least one dimension (distance, speed requirement, or height variation).

## Map Structure

- **Total dimensions:** ~1200u wide x 1500u deep x 600u tall
- **Stage connections:** Ramps and platforms connect vertically with platforming between stages
- **Geometry:** Mix of flat platforms, ramps (15-30 degree angles), and one 32x32 displacement surface at Stage 4 for visual interest
- **Textures:** Industrial metal (mt_caution, mt_tile), canyon rock from nature pack

## Verification Plan

1. **Generator validation:**
   - Print per-jump analysis with calculated airtime and clearance percentage
   - Verify all required jumps ≤ 88% of max

2. **Compile validation:**
   - Ensure vbsp/vvis/vrad complete without errors
   - Check console.log for leak warnings
   - Verify zone file is valid and loads

3. **In-game validation:**
   - Launch with -novid -windowed
   - Navigate through all 4 stages
   - Verify timer starts, splits at each stage, stops at finish
   - Check no crashes or geometry issues

## Acceptance Criteria Checklist

- [ ] PLAN.md committed before generator code
- [ ] Generator script produces reproducible VMF
- [ ] All compile passes complete without errors
- [ ] Zone JSON is valid and zonemaker succeeds
- [ ] Map loads without crash/leak
- [ ] Timer works with splits
- [ ] All required jumps ≤ 88% of max clearance
