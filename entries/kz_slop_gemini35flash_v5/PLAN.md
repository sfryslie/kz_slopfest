# Design Plan - `kz_slop_gemini35flash_v5`

## Theme Pitch
The map represents a "Scaffold Ascent" inside an industrial facility's vertical ventilation/machinery shaft. The player starts at the dusty concrete floor and climbs upward along a complex network of steel scaffolding, brick ventilation ducts, and suspended concrete platforms. The theme relies on steel truss frames, pipes, brick columns, and concrete floor pads to evoke an active industrial maintenance shaft.

## Asset Palette
- **Skybox**: `sky_urb01` (Overcast industrial sky, visible through top/side skylights)
- **Materials**:
  - Concrete: `concrete/concretefloor002a` (for horizontal pads), `concrete/concretewall036a` (for vertical structural pillars)
  - Brick: `brick/brickwall017a` (for walls and protrusions), `brick/brickfloor001a` (for checkpoint plazas)
  - Metal: `metal/metalfloor003a` (for scaffolding platforms), `metal/metalwall032a` (for structural beams and backing panels)
  - Tool textures: `tools/toolsskybox` (outer hull seal), `tools/toolsnodraw` (hidden faces), `tools/toolsinvisibleladder` (ladder volume), `tools/toolstrigger` (zone volumes)
- **Prop Vocabulary**:
  - `models/props_c17/truss03b` (Steel trusses supporting the scaffolding)
  - `models/props_rooftop/scaffolding01a` (Frames indicating the climb is a scaffold)
  - `models/props_c17/metalladder002b` (Rusted ladders matching the climbing path)
  - `models/props_rooftop/chimneypipe01a` (Vents emerging from walls)
  - `models/props_pipes/concrete_pipe001a` (Large pipes framing void spaces)

## Structure Sketch
- **Outer Hull**: A sealed skybox structure from Z = -256 to Z = 4500. Bounding box coordinates X/Y from -512 to 512.
- **Vertical Stack**:
  - Start Zone (Leg 1 base): Z = 0
  - Checkpoint 1 (End of Leg 1): Z = 600
  - Checkpoint 2 (End of Leg 2): Z = 1200
  - Checkpoint 3 (End of Leg 3): Z = 1800
  - Checkpoint 4 (End of Leg 4): Z = 2400
  - Checkpoint 5 (End of Leg 5): Z = 3000
  - Checkpoint 6 (End of Leg 6): Z = 3600
  - End Zone (End of Leg 7): Z = 4200
- **Footprint**: Horizontal dimensions are kept tight (bounded within X: -512 to 512, Y: -512 to 512) to ensure a high climb-to-footprint ratio (climb = 4200, extent = 1024, ratio ~ 0.24, well below the 1.5x cap).
- **Safety Nets / Catch Geometry**:
  - Below each leg, the previous checkpoint platform or specific safety mesh brushes extend horizontally to catch falling players. This avoids killbox resets and allows players to resume the climb easily.

## Difficulty Curve
The course consists of 42 required jumps (6 per leg over 7 legs):
- **Leg 1 (Warm-up)**: Jumps 1-6. Gaps are small (120-140u), dz = 0 or slightly positive (+16u), fraction 0.40 - 0.50. Assumed speed: 250.
- **Leg 2 (Medium climb)**: Jumps 7-12. Gaps around 150-180u, fraction 0.50 - 0.60.
- **Leg 3 (Winding height)**: Jumps 13-18. Fractions 0.55 - 0.65.
- **Leg 4 (Cramped moves)**: Jumps 19-24. Fractions 0.60 - 0.70.
- **Leg 5 (The Peak)**: Jumps 25-30. Includes a peak spike (Jump 27): fraction = 0.81 (gap 238u, dz = 16u, speed = 250).
  - Jumps 28 and 29 serve as cool-offs with easy fraction 0.50.
- **Leg 6 (Uphill hopping)**: Jumps 31-36. Fractions 0.60 - 0.70.
- **Leg 7 (Victory Lap)**: Jumps 37-42. Easy, flowing jumps (fraction 0.45 - 0.55) leading to the helicopter rescue pad.

## Constructs (Menu Items)
1. **ladder section** (Leg 2, climbing a vertical steel ladder between two scaffolding platforms)
2. **corner jump** (Leg 3 and Leg 5, jumping around a central brick/concrete pillar to a landing area around the corner)
3. **crouch tunnel** (Leg 4, jumping through a low, restricted ceiling corridor)
4. **uphill hop chain** (Leg 6, a series of 4 consecutive platforms rising by 32-48u each jump)

## Per-Leg Fun Hook
- **Leg 1**: Simple, rhythmic gap jumps to introduce the player to the scale of the maintenance shaft.
- **Leg 2**: A transition from jumping to vertical ladder climbing, requiring players to scan upward for the next platform.
- **Leg 3**: Corner jumps around the central support pillar, creating momentum and rhythm.
- **Leg 4**: Squeezing through a low ceiling area while seeing the ground far below.
- **Leg 5**: The peak jump across a wide gap to a narrow scaffold beam, followed by a satisfying cool-off.
- **Leg 6**: Rapid upward hops on a series of small, suspended concrete blocks.
- **Leg 7**: A fast, low-friction run-out on wide rooftop platforms ending at the helicopter pad.

## Verification Plan
1. Commit this PLAN.md before writing generator code.
2. Develop a basic generator script to build a "walking skeleton" (a simple two-platform map with start, end, and 1 jump) and run it through vbsp, vvis, vrad, zonemaker, and Momentum Mod. Commit the skeleton.
3. Complete the procedural generation code to build all 7 legs, 42 jumps, and props, ensuring no collisions or overlaps.
4. Run `node scripts/validate_entry.js` and fix any failures.
5. Compile with full vvis/vrad and test in-game to verify that the map plays smoothly, has no leaks, the timer registers properly, and all jumps are beatable.
