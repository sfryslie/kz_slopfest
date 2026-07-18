# PLAN.md — kz_slop_sonnet5_v1 "Cape Ascent"

## Theme

A climb up a rocky sea-cliff toward a summit ridge under the `sky_cape_hill` skybox.
The player starts on a low rock shelf at the base of the cliff, works up through a
wooden scaffold switchback bolted to the rock face, crosses a band of broken/fallen
rock ("rockslide"), and finishes on an exposed summit ridge. Materials are all stock
HL2 content mounted through Momentum's `mount/hl2_dir.vpk` (verified present):
`nature/rockfloor*`, `nature/rockwall*`, `nature/cliff*`, `nature/blenddirtgrass*`
for rock/ground, `wood/woodbeam*` and `wood/ep2_woodfloor*` for the scaffold stage,
plus the native `skybox/sky_cape_hill*` set. Small functional accents (zone
markers) use `tools/toolstrigger` (invisible) as intended by TOOLCHAIN.md — no
dev textures on visible surfaces.

## Movement model recap (from TOOLCHAIN.md, used for every jump below)

```
airTime(dz) = (v0 + sqrt(v0² − 1600·dz)) / 800      v0 = 302 (jump), 325 (crouch-jump)
maxGap(v, dz) = v · airTime(dz) + 32
```

Required jumps only ever assume **250 u/s** (run speed, used where the approach is
short/turny) or **275 u/s** (prestrafe, used where there's a straight runup). No
required jump assumes the 380 u/s bhop cap. Every required jump is kept at or below
**88%** of `maxGap` at its design speed (SPEC requirement 3). The one required
crouch-jump (Stage 3) is checked against the **66 u vertical** crouch-jump ceiling
instead, since it's a near-vertical mantle, not a horizontal gap.

## Course layout

The path runs generally along +X (forward/"up the mountain"), zig-zags in Y
("switchbacks"), and climbs in +Z. Each numbered `N#` below is a platform (top
surface); `gap#` is the horizontal void between the departure edge of one platform
and the landing edge of the next, `dz` is the landing-minus-takeoff height delta.
`width` is the lateral (Y) size of the landing platform — this is what "tighter
landing" refers to in the difficulty ramp below. Coordinates are the generator's
actual planned values (forward-position `X`, lateral offset `Y`, top height `Z`,
depth `sizeX`, lateral `width`).

| Node | X (back→front) | Y | Z | sizeX | width | Role |
|---|---|---|---|---|---|---|
| N0 | 0 → 384 | 0 | 0 | 384 | 384 | Spawn / Stage 1 start |
| N1 | 494 → 718 | 0 | 0 | 224 | 300 | |
| N2 | 848 → 1072 | 40 | 8 | 224 | 280 | |
| N3 | 1212 → 1532 | 0 | 24 | 320 | 320 | Stage 2 start (= Stage 1 checkpoint) |
| N4 | 1682 → 1890 | 48 | 48 | 208 | 240 | |
| N5 | 2050 → 2258 | 18 | 72 | 208 | 224 | |
| N6 | 2422 → 2742 | 54 | 104 | 320 | 288 | Stage 3 start |
| N7 | 2882 → 3074 | 14 | 144 | 192 | 208 | |
| N7b | 3106 → 3282 | 14 | 202 | 176 | 192 | post-mantle ledge |
| N8 | 3428 → 3684 | 44 | 252 | 256 | 240 | Stage 4 start |
| N9 | 3834 → 4042 | 44 | 268 | 208 | 176 | |
| N10 | 4210 → 4530 | 64 | 308 | 320 | 160 | Finish |

### Stage 1 — "Foothold" (tutorial, flat run-speed jumps)

| Jump | dist | dz | v | maxGap | % used |
|---|---|---|---|---|---|
| gap1 N0→N1 | 110 | 0 | 250 | 220.8 | 50% |
| gap2 N1→N2 | 130 | +8 | 250 | 213.9 | 61% |
| **gap3 N2→N3 (hardest)** | **140** | **+16** | **250** | **206.4** | **68%** |

Wide, forgiving landings (280–384 wide). Purely flat run-speed jumps, no turns.
Teaches basic gap judgment.

### Stage 2 — "Switchback" (wood scaffold, prestrafe + turns)

| Jump | dist | dz | v | maxGap | % used |
|---|---|---|---|---|---|
| gap4 N3→N4 | 150 | +24 | 275 | 214.8 | 70% |
| gap5 N4→N5 | 160 | +24 | 275 | 214.8 | 75% |
| **gap6 N5→N6 (hardest)** | **164** | **+32** | **275** | **204.6** | **80%** |

Landings tighten to 224–288 wide. Every jump has a lateral turn (36–48 u), so the
player must strafe through the jump instead of going straight — the scaffold
literally switches back. Harder than Stage 1: higher %, narrower landings, turning
required.

### Stage 3 — "Rockslide" (technical: crouch-jump mantle + tightest gap yet)

| Move | dist | dz | v | maxGap | % used |
|---|---|---|---|---|---|
| gap7 N6→N7 | 140 | +40 | 275 | 192.5 | 73% |
| mantle N7→N7b (crouch-jump) | 32 horiz | **+58 vert** | run | 66 u ceiling | 88% of vertical ceiling |
| **gap8 N7b→N8 (hardest)** | **146** | **+50** | **275** | **172.2** | **85%** |

Landings tighten further to 176–240. Introduces the one required crouch-jump of the
map (a 58 u mantle, between the 57 u run-jump apex and the 66 u crouch-jump apex —
legal per TOOLCHAIN.md, kept at 88% of the 66 u ceiling for margin) plus the highest
horizontal % yet. Harder than Stage 2: higher %, narrower landings, new technique.

### Stage 4 — "Summit Ridge" (finale: chained jumps, tightest landings)

| Jump | dist | dz | v | maxGap | % used |
|---|---|---|---|---|---|
| gap9 N8→N9 (setup) | 150 | +16 | 275 | 223.9 | 67% |
| **gap10 N9→N10 (hardest, finale)** | **168** | **+40** | **275** | **192.5** | **87%** |

Landings tighten to their narrowest in the map (160–176 wide), gap10 is chained
immediately after gap9 with no recovery platform in between, and gap10 sits at 87%
— just under the 88% ceiling, the highest fraction used anywhere in the map. This
is the intended hardest required movement in the course.

**Difficulty ramp check (spec requirement 2):** hardest-jump usage rises
monotonically each stage — 68% → 80% → 85% → 87% — while landing width shrinks
384→320 (S1) to 224–288 (S2) to 176–240 (S3) to 160–176 (S4), turning is introduced
in S2, and a new technique (crouch-jump mantle) is introduced in S3. Every number
above stays ≤88% of `maxGap`, satisfying requirement 3.

## Zones (spec requirement 4)

- `zone_timer_start` brush covering N0, `stage_end_zones` = Next Stage,
  `restart_destination` → `info_teleport_destination` at N0. `info_player_start`
  also sits on N0, facing +X.
- `zone_timer_stage` (stage_number 2) covering N3; (stage_number 3) covering N6;
  (stage_number 4) covering N8. Each gets its own restart-destination target.
  Per TOOLCHAIN.md, each of these brushes gets `vertices_plus` blocks on every
  side so zonemaker.exe can read them.
- `zone_timer_end` brush covering N10 (finish).
- No extra mid-stage checkpoints — each stage-start zone is that stage's
  checkpoint, matching the segment topology zonemaker emits (per SPEC.md
  requirement 4), so 4 stage-start zones + 1 end zone is the complete zone set.
- A large `trigger_teleport` safety net well below the lowest platform, wired to
  teleport any player who falls off back to the N0 spawn point, so a missed jump
  doesn't strand the player in the void indefinitely.

## World/leak safety

The entire playable volume sits inside one large hollow shell brush (6 solid
walls) textured `tools/toolsskybox` on the inward faces, sized with generous
margin around the whole path (X −256..5120, Y −768..768, Z −512..1024). All
gameplay geometry floats inside this sealed shell, so leak-proofing the level
reduces to leak-proofing one box, regardless of how open the internal platforming
is. Decorative cliff-wall brushes sit outside the jump corridor (offset beyond
platform width + 150 u margin) so they cannot interfere with any required jump's
trajectory.

## Lighting

`light_environment` (the sun) angled down across the ascent (pitch −55, yaw 130)
so cliff faces and scaffold undersides read with directional shadow, plus a modest
`_ambient` so shaded platform tops aren't pitch black. No other lights planned for
v1 — this is a straightforward outdoor map with a single sun source.

## Generator & verification plan

- **Generator:** a single-file Python 3 script (`generate.py`, stdlib only) that
  builds the node table above programmatically, emits axis-aligned (and a few
  Z-rotated decorative) box brushes with a self-checking plane-winding routine
  (compute the face normal from the emitted 3-point plane string and assert it
  matches the intended outward normal, auto-correcting point order if not, before
  writing), emits the zone entities with `vertices_plus` blocks, and prints a
  per-jump difficulty report (dist/dz/v/maxGap/%) matching the tables above, so
  the numbers can be checked against the geometry mechanically, not just by
  reading this document.
- **Compile:** vbsp → vvis → vrad → zonemaker, exactly the pipeline in
  TOOLCHAIN.md. I'll iterate on a tiny throwaway test VMF first (one cube + one
  zone brush) to nail the plane-winding and `vertices_plus` format against the
  real `vbsp.exe`/`zonemaker.exe` binaries before generating the full map, since
  those are the two gotchas most likely to silently break things.
- **In-game verification:** install the compiled `.bsp`/`.json` into the
  Momentum install per TOOLCHAIN.md, launch with `-condebug`, and read
  `console.log` for load errors, leak warnings, and zone registration messages.
  I do not have an input-injection tool for the standalone game window (only for
  a browser), so I cannot perform an actual timed human-style playthrough myself;
  beatability is instead guaranteed analytically by the ≤88%-of-max margin on
  every required jump above, which is the verification method TOOLCHAIN.md itself
  prescribes ("compute every required jump... keep every required jump at ≤88% of
  max"). This will be stated plainly in the README per RULES.md #6 rather than
  implied to be a full manual playtest.

## Spec feedback (preliminary, expanded in README)

- The exact `vertices_plus` block syntax isn't documented anywhere I could reach
  (Valve Developer Wiki blocked the fetch tool with 403; the Momentum docs site
  did too). I'm reconstructing it from indirect references (Hammer++/Strata
  "precise vertex" release notes) and will validate it empirically against the
  real `zonemaker.exe` binary on a throwaway test map before trusting it on the
  full build, but a one-line example in TOOLCHAIN.md would have saved real time.
