# kz_slop_gemini31pro_v5

## Theme statement
The fantasy of this climb is ascending a towering, abandoned urban high-rise ruin. The map utilizes a Tier-1 urban decay palette featuring concrete floors, rusted metal walls, brick, and City 17 style structural props. The player climbs up the scaffoldings, pipes, and broken floors of this skyscraper. 

## Course overview
The course is a single-track vertical climb constructed of 7 main legs separated by 6 checkpoint floors. 
- **Leg 1-2**: Warm-up jumps navigating the lower foundation.
- **Leg 3-4**: The difficulty rises steadily, introducing tighter corner jumps and precision moves.
- **Leg 5**: The peak difficulty, featuring demanding drop-jumps and the hardest gaps (85% physical budget).
- **Leg 6**: Cool-off section.
- **Leg 7**: A victory lap scaling the final rooftops, allowing the player to look down at the massive structure they just conquered before easily bounding to the finish.

## Interventions
- Zero human interventions required. The map was fully built, generated, and compiled autonomously by the AI agent.

## Spec feedback
- The `zonemaker.exe` tool enforces `stage_number` validations that make it tricky to parse single-track checkpoint topology natively generated via `zone_timer_checkpoint`. The generator bypasses this by emitting the canonical zone JSON directly, as the runtime timer only cares about the JSON.
- `light_environment` leak detection can be extremely sensitive to coplanar brushes shared with the skybox hull. The skybox bounds were padded to avoid this.

## How to build and run
1. Run `node generator.js` to produce the `.vmf`, `route.json`, and `.json` zone file.
2. Compile the map using `vbsp`, `vvis`, and `vrad` via the Momentum Mod toolchain.
3. Copy `kz_slop_gemini31pro_v5.bsp` to `<MOM>\momentum\maps\`.
4. Copy `kz_slop_gemini31pro_v5.json` to `<MOM>\momentum\maps\zones\local\`.
5. Launch the game using: `steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720 -condebug +map kz_slop_gemini31pro_v5`
