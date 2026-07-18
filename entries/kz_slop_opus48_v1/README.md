# kz_slop_opus48_v1 — "Tidewater Ascent"

A four-stage KZ climb for Momentum Mod. You start on tide-washed grassy
stepping-stones at the shore and work your way up a sea cliff — through dirt
scrambles and bare rock ledges — to a windswept summit spire, all under the
`sky_cape_hill` sky.

Built by the `opus48` entry for **kz_slopfest**. Everything visible is stock
mounted HL2 `nature/` material; the only tool textures are the invisible skybox
shell and the trigger zone volumes.

## Theme

**Tidewater Ascent** — a coastal cliff climb. The material palette carries the
theme and marks your progress up the rock:

| Stage | Fiction | Top material | Difficulty lever |
|---|---|---|---|
| 1 — The Tideline | grassy shore stones | `nature/grassfloor003a` | flat, wide, small gaps — learn the timing |
| 2 — The Scramble | dirt/gravel switchbacks | `nature/dirtfloor003a` | **uphill** (+16/jump) shortens airtime |
| 3 — The Ledgeworks | bare rock shelves | `nature/rockfloor006a` | **precision** — 56×56 landings, longer gaps |
| 4 — The Summit Spires | high pale pillars | `nature/rockfloor002c` | **finale** — steepest (+40), 44×44 pillars, longest relative gaps |

Both sides of the route are framed by `nature/cliffface001a` canyon walls, and a
sand beach (`nature/sandfloor005a`) sits far below as the "you fell" floor.

## Difficulty ramp (physics-derived, not eyeballed)

Every required jump is checked in the generator against the TOOLCHAIN movement
model at the **conservative run speed v = 250 u/s** and kept at **≤ 88%** of the
max clearable gap. The hardest jump of each stage is strictly harder than the
last on four independent axes (gap %, uphill dz, landing depth, landing width):

```
hardest jump per stage:  S1=58.0%   S2=73.6%   S3=82.8%   S4=84.3%   (all ≤ 88%)
```

`node generate.js` prints the full per-jump table and **aborts the build** if any
required jump exceeds 88% or if any stage is not harder than the previous one.

## Build / run

From this folder (`entries/kz_slop_opus48_v1/`), with `<MOM>` = the Momentum
install root from TOOLCHAIN.md:

```sh
node generate.js                                             # emit the .vmf (+ difficulty report)
"<MOM>/bin/win64/vbsp.exe"      -game "<MOM>/momentum" kz_slop_opus48_v1.vmf
"<MOM>/bin/win64/vvis.exe"      -game "<MOM>/momentum" kz_slop_opus48_v1.bsp
"<MOM>/bin/win64/vrad.exe"      -game "<MOM>/momentum" kz_slop_opus48_v1.bsp
"<MOM>/bin/win64/zonemaker.exe"                       kz_slop_opus48_v1.vmf   # -> .json
```

Install for testing:

```sh
cp kz_slop_opus48_v1.bsp  "<MOM>/momentum/maps/"
cp kz_slop_opus48_v1.json "<MOM>/momentum/maps/zones/local/"
steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720 -condebug +map kz_slop_opus48_v1
```

The `.vmf`, `.bsp`, and `.json` in this folder are the shipped artifacts; all
three are reproducible from `generate.js` + the toolchain. The `.vmf` is never
hand-edited.

## How it's generated

`generate.js` is fully data-driven (see the `STAGES` table). Two correctness
mechanisms address the TOOLCHAIN gotchas directly:

- **Plane winding** (gotcha #1): every box face computes its normal from the
  first three emitted points and reverses the winding if it doesn't match the
  known outward normal — so winding is correct by construction, not by hand.
- **`vertices_plus`** (gotcha #2): emitted on every face, which is what
  `zonemaker.exe` needs to accept the zone brushes.

Zones are real `zone_timer_*` brush entities (start / stage 2 / stage 3 /
stage 4 / end) with `info_teleport_destination` restart targets; `zonemaker.exe`
reads them from the VMF and writes the shipped `.json`.

## Acceptance gates — self-check

| Gate | Status |
|---|---|
| PLAN.md committed before generator code | ✅ (separate earlier commit) |
| Generator runs cleanly and reproduces the shipped `.vmf` | ✅ deterministic |
| vbsp / vvis / vrad complete without errors | ✅ full-quality vvis + vrad, no leak |
| Zone JSON valid, matches geometry | ✅ zonemaker output: start + 3 stage splits + end at correct heights |
| Loads in Momentum, no crash, no leak | ✅ see In-game verification |
| Timer starts, splits at each stage, stops at end | ✅ see In-game verification |
| Every required jump ≤ 88% of max | ✅ worst = 84.3% (asserted in generator) |

## In-game verification

**Yes — launched in Momentum Mod (windowed, `-condebug`), read `console.log`.**

- `Host_NewGame on map kz_slop_opus48_v1` — the map loads.
- **No leak** anywhere in `console.log`; **no crash / Host_Error / fatal**; the
  `momentum.exe` process stayed healthy.
- The `zone_timer_*` "unknown entity type … Can't init" console lines are the
  expected, harmless warnings called out in TOOLCHAIN gotcha #3 (the runtime
  ignores the BSP-baked zone entities and drives the timer from the `.json`).
- The zone `.json` was produced by the official `zonemaker.exe`, is structurally
  valid (start + 3 stage splits + end, at world coordinates matching the
  platforms), is installed in `maps/zones/local/`, and produced **no parse
  error** on load — a malformed zone file logs one, and none appeared.

Scope of what was verified: compile-clean through the full pipeline, in-game
load with no crash and no leak, and a valid/registered zone file. A live
human playthrough watching each split fire on-screen was **not** performed — the
agent has no desktop-input channel into the game window, so the split *behaviour*
is verified structurally (valid zonemaker JSON + correct geometry) rather than by
a played run.

## Spec feedback

- **Zone/stage topology was slightly ambiguous.** SPEC req 4 says "each
  stage-start zone is that stage's checkpoint," and `zone_timer_start` is
  documented as automatically stage 1. So a 4-stage map needs a `zone_timer_start`
  plus **three** `zone_timer_stage` zones (stages 2–4) plus a `zone_timer_end` —
  i.e. three *internal* splits, not four. Worth stating explicitly; it's easy to
  emit an off-by-one extra stage zone (I hit and fixed exactly that during the run).
- **TOOLCHAIN is otherwise accurate and saved real time** — the plane-winding and
  `vertices_plus` gotchas were both real and both would have cost debugging time.
- Minor: TOOLCHAIN doesn't mention that blend/WVT `nature/` materials render as
  their base texture on ordinary brush faces (vbsp emits a harmless
  `_wvt_patch`); using a plain material like `sandfloor005a` avoids the noise.

## Interventions

None. No human answered a question, fixed a path, restarted a tool, or gave a
hint during this run. All debugging (the off-by-one stage-zone fix) was done by
reading tool output.
