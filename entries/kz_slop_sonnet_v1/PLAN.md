# PLAN — kz_slop_sonnet_v1

## Theme

**Canyon Switchback** — a desert box-canyon ascent. You start in a dry wash at
the canyon floor and climb out via four stages: hopping the wash bed, working
up a set of switchback ledges cut into the canyon wall, crossing a set of
narrow mesa pillars ("the Narrows"), and finishing with a longjump gauntlet
across open air to a rimrock lookout tower with a signal beacon.

Palette (all stock HL2 `nature/` materials mounted by Momentum, verified
present in the game's `hl2_dir.vpk` via `bin\win64\vpk.exe l hl2_dir.vpk`):

| Use | Material |
|---|---|
| Displacement terrain blend (canyon walls/floor) | `NATURE/BLENDCLIFFSAND01A` |
| Wash-bed platform tops (stage 1) | `NATURE/SANDFLOOR005A`, `NATURE/SANDFLOOR009C` |
| Switchback ledge tops (stage 2) | `NATURE/SANDFLOOR010A` |
| Narrows pillar tops (stage 3) | `NATURE/ROCKFLOOR002A`, `NATURE/ROCKFLOOR006A` |
| Rimrock finale tops (stage 4) | `NATURE/ROCKFLOOR003A` |
| Platform sides / cliff faces | `NATURE/CLIFFFACE001A`, `NATURE/CLIFFFACE002A`, `NATURE/ROCKWALL021B`, `NATURE/ROCKWALL021C` |
| Skybox | `sky_cape_hill` (explicitly named safe in TOOLCHAIN.md), tinted with warm fog/lighting for a desert read |
| Zone triggers | `TOOLS/TOOLSTRIGGER` |
| Nodraw / seal | `TOOLS/TOOLSNODRAW` |

## Course overview

Four plazas mark stage boundaries: `P0` (start, z=0) → `P1` (stage 2 start)
→ `P2` (stage 3 start) → `P3` (stage 4 start) → `P4` (end, the rimrock
lookout). Each plaza is a flat 640×640 unit safe area. Between plazas, players
cross a chain of platforms; every gap is computed from the TOOLCHAIN.md
movement model, never eyeballed.

Movement model constants used (from TOOLCHAIN.md): gravity 800 u/s²,
vertical takeoff speed `VJUMP = sqrt(2·800·57) ≈ 302 u/s`,
`airTime(dz) = (VJUMP + sqrt(VJUMP² − 2·800·dz)) / 800`,
`maxGap(v, dz) = v · airTime(dz) + 32`. Every required jump is capped at a
`frac` of `maxGap` for its assumed approach speed, and the generator asserts
`frac ≤ 0.88` and throws if any computed jump exceeds it (hard gate, not a
lint warning).

### Difficulty metric

Because assumed approach speed differs by stage (bhop chains build speed;
ledge climbs kill it), raw gap length isn't comparable across stages. The
ramp is measured by **`frac` of the physically clearable distance at the
jump's assumed approach speed** — this is the real difficulty a player feels,
independent of absolute units. Each stage's hardest required jump uses a
higher `frac` than the previous stage's hardest, and each stage adds a
qualitative technicality on top:

| Stage | Name | Hardest jump | frac of max | Added technicality |
|---|---|---|---|---|
| 1 | The Wash | bhop hop #9, v=320, dz=+16 | **0.62** | none yet — pure speed/gap judgment on a flat bed |
| 2 | The Switchbacks | ledge #7, v=250, dz=+56 | **0.66** | jump is within 1u of the 57u unboosted apex — almost zero timing margin, plus zigzag lateral offset |
| 3 | The Narrows | pillar #7, v=330, dz=+32 | **0.76** | landings shrink to 72u wide (vs. 320u start plaza) and the course turns 90°, forcing a mid-air strafe correction |
| 4 | Rimrock | final gap, v=275, dz=0 | **0.87** | flat runway-to-runway longjumps at bhop-adjacent prestrafe speed with no vertical assist — the spec's ceiling, one below the 0.88 hard cap |

Numbers above are the *intended* design targets; the generator computes and
prints the actual per-jump numbers (a difficulty report) and hard-fails the
build if any required jump exceeds 88%. Exact platform coordinates are an
output of the generator, not hand-placed.

### Stage 1 — The Wash (z 0 → ~100)

Flat sandy canyon floor. 10 rock-hop platforms in the dry wash, dz alternating
small drops and rises (−16 to +20) so a player chains bhop speed from ~260 up
to ~320 u/s through the stage. Gaps run roughly 45%→62% of clearable as speed
builds. Platform footprints 96–128u, wide enough that stage 1 is forgiving.
Ends at plaza `P1`.

### Stage 2 — The Switchbacks (z ~100 → ~500)

The course turns to face the canyon wall and climbs via 9 ledges zigzagging
left/right (lateral offset ±40–56u), each a +32 to +56 rise. Because each
ledge kills forward speed, jumps are computed at assumed run speed (250 u/s,
per TOOLCHAIN.md's guidance for jumps without a straight approach), not
bhop speed. The final ledge sits at dz=+56, 1u under the unboosted jump apex
— the stage's technical peak. Ends at plaza `P2`.

### Stage 3 — The Narrows (z ~500 → ~750)

Course turns 90° (west → north) onto a line of narrow mesa pillars. Modest
bhop chaining is assumed (285→330 u/s) since the turn gives a diagonal
approach. Rises are a constant +32; footprints shrink from 96u to 72u across
8 pillars, so precision (not raw distance) is the growing challenge, plus the
turn itself demands a mid-air strafe correction. Ends at plaza `P3`.

### Stage 4 — Rimrock (z ~750 → ~800, the finale)

Long 192u-deep runways (room for a fresh prestrafe each jump) with rises
shrinking to 0 as gaps grow toward the spec's 88% ceiling. Assumed speed is
275 u/s (prestrafe, per TOOLCHAIN.md — "prestrafe where the player has a
straight approach"). Final jump is flat (dz=0) at frac 0.87, landing on the
rimrock lookout plaza `P4` with a small stone cairn, signal-flag pole, and
beacon marking the finish.

## Terrain

A single carved-canyon heightfield (Strata displacement tiles, power 3,
512u tiles) generated from a distance-to-course-centerline function: the
canyon floor sags below the course near the wash, walls rise steeply on both
sides, and the terrain flattens into plateaus under each plaza and platform
footprint so nothing floats mid-air unsupported. Alpha-blends
`BLENDCLIFFSAND01A` by local slope (steep = bare rock, shallow = sand),
mirroring the slope-blend approach documented in TOOLCHAIN.md's dispinfo
gotcha (rows +Y from startposition, columns +X — verified against
`builddisp.cpp`). A nodraw box seals the level (floor slab under the lowest
displacement point, sky box walls/ceiling) since displacements alone don't
seal a map.

## Zones / timer

`zonemaker.exe` is run against the compiled `.vmf` to produce
`kz_slop_sonnet_v1.json`, per TOOLCHAIN.md's build pipeline — the generator
never hand-writes the zone JSON. To make that possible, world-brush zone
volumes (with `vertices_plus` blocks, per the documented zonemaker gotcha)
are emitted around each plaza:

- `zone_timer_start` at `P0` (start of stage 1)
- `zone_timer_stage` at `P1`, `P2`, `P3` (start of stages 2, 3, 4 — these are
  the "checkpoint per stage" the spec requires)
- `zone_timer_end` at `P4`

Each stage zone gets an `info_teleport_destination` restart point so a failed
attempt can restart the current stage. `zone_timer_*` entities baked into the
BSP are cosmetic only per TOOLCHAIN.md (the runtime reads the JSON) — they're
included anyway since zonemaker derives the JSON from these same brushes, and
leaving them out would mean nothing to run zonemaker against.

## Generator

`generate_map.js` (Node, no dependencies) will:
1. Define the movement-model helpers (`airTime`, `maxGap`, `gapFor`) exactly
   as TOOLCHAIN.md specifies, with a hard `throw` if any requested jump
   exceeds 88%.
2. Build the course as pure data (plaza list + platform list) stage by stage,
   printing a difficulty report line per jump.
3. Shape canyon terrain around the resulting course path.
4. Emit VMF text directly (no library) — axis-aligned box solids with
   clockwise-from-outside winding, plus displacement tiles for terrain and
   zone brushes with `vertices_plus`.
5. Write `kz_slop_sonnet_v1.vmf`.

## Verification plan

1. `node generate_map.js` — must run clean and print a difficulty report
   where every jump is ≤88% of clearable.
2. Compile: `vbsp.exe -game <MOM>\momentum kz_slop_sonnet_v1.vmf`, then
   `vvis.exe` and `vrad.exe` on the resulting `.bsp` — all three must
   complete without errors, and vbsp's leak check must report none.
3. `zonemaker.exe kz_slop_sonnet_v1.vmf` to produce the zone JSON; sanity
   check the JSON's plaza coordinates against the generator's own printed
   plaza list.
4. Copy `.bsp` → `<MOM>\momentum\maps\`, `.json` →
   `<MOM>\momentum\maps\zones\local\`.
5. Launch `steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720
   -condebug +map kz_slop_sonnet_v1`, confirm no crash, then read
   `<MOM>\momentum\console.log` for load errors, leak warnings, and zone
   registration. Manually fly/walk the course to confirm every jump is
   makeable and the timer starts/splits/stops, then close the game.

## Interventions

Tracked honestly in README.md as the build proceeds; empty is a claim of
zero, not an omission.
