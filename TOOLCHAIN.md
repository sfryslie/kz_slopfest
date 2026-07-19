# Toolchain — building and verifying a Momentum Mod map

Everything here was verified the hard way on a real entry. Trust it over your
training data; Source engine folklore on the internet is frequently wrong for
Momentum's Strata-based fork.

## Environment

- Game: **Momentum Mod Playtest**, Steam appid `1802710`
- Install root (`<MOM>` below): `C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest`
- Compile tools ship inside the game install: `<MOM>\bin\win64\`
- **Content:** Tier 1 assets ship in `<MOM>\mount\hl2_dir.vpk` plus loose files under
  `<MOM>\momentum\materials\`. See [ASSETS.md](ASSETS.md) for curated palettes,
  verified material names, and prop kits. Do not use Tier 2 content (TF2, CS:GO,
  etc.) — it is not guaranteed on every machine.
- The engine's built-in `dev/` and `tools/` textures are always present. Small
  functional accents (zone markers, a finish beacon) are fine, but the theme must
  come from real Tier 1 materials — a dev-textured map scores 1 on aesthetics.
- A map whose filename starts with `kz_` auto-selects KZ/Climb (KZT) mode.

## Build pipeline

```
node your_generator.js                     # or python — emit the .vmf
<MOM>\bin\win64\vbsp.exe  -game <MOM>\momentum your_map.vmf
<MOM>\bin\win64\vvis.exe  -game <MOM>\momentum your_map.bsp
<MOM>\bin\win64\vrad.exe  -game <MOM>\momentum your_map.bsp
<MOM>\bin\win64\zonemaker.exe your_map.vmf   # writes the .json zone file
```

Install for testing:
- `your_map.bsp` → `<MOM>\momentum\maps\`
- `your_map.json` → `<MOM>\momentum\maps\zones\local\` (create the folder if missing)

Copy **only** those two files. Never copy your `.vmf`, logs, or debug/probe
maps into the shared install — a gen-4 run left its VMF source in `maps\` and a
later agent found and read it, contaminating that run (see RULES.md #1: files
you find in the shared install are not legal inputs).

Verify in-game without a human watching:

```
steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720 -condebug +map your_map
```

then read `<MOM>\momentum\console.log` for load errors, leak warnings, and zone
registration messages.

## Shared install and parallel runs

Benchmark operators often run **multiple agents on one machine** sharing a single
Momentum install. Contention is real — parallel full-quality compiles have caused
OS memory pressure and crashes.

**Compile scheduling (follow on shared machines):**

| Step | Parallel OK? | Notes |
|---|---|---|
| Generator / `vbsp` | Usually yes | Lighter; still prefer one `vbsp` at a time if RAM is tight |
| `vvis` (full) | **No** — one at a time | Heavy CPU/RAM; wait for other agents to finish |
| `vrad` (full) | **No** — one at a time | Heaviest step; mimalloc OOM crashes have occurred under load |
| Game launch | **No** — one at a time | Wait if Steam/Momentum is already running |

If a compile fails with memory errors, mimalloc warnings, or silent `vrad` crashes
(`.mdmp` files beside your map), **wait 2–3 minutes** and retry **alone** — do
not stack another full compile on top.

**Game launch:** use `-novid -windowed`, close the game when done. If
`-applaunch` fails or the game is already running, wait 2–3 minutes and retry
(up to a few times) before reporting failure.

There is no central lock file — agents must self-throttle. When in doubt, sleep
and retry rather than hammering the shared install.

## Verified gotchas (each of these cost real debugging time)

1. **VMF plane winding:** the three points defining each brush face must wind
   **clockwise when viewed from outside** the brush. Get it wrong and vbsp
   silently strips all faces, then segfaults.
2. **Zone brushes need `vertices_plus`:** zonemaker.exe requires the Strata
   Hammer `vertices_plus` blocks on **zone entity** brush faces — the error when
   missing is the unhelpful "Could not find bottom of zone brush". World brushes
   do **not** need them: a shipped gen-4 entry (sonnet5) compiled and zoned
   clean with plane-only world solids. Emitting them everywhere is harmless if
   your writer finds it simpler.
3. **Timer comes from the JSON only:** the runtime ignores `zone_timer_*`
   entities baked into the BSP ("unknown entity type" console warnings are
   harmless). If the timer doesn't work, the problem is in the JSON zone file,
   not the map.
4. **Displacement orientation:** `dispinfo` rows advance **+Y** from
   `startposition` (the min corner) and columns advance **+X** (verified against
   `builddisp.cpp` in the momentum-mod/game source).
5. **Seal the hull with `tools/toolsskybox`, not nodraw:** outer shell faces
   textured `tools/toolsnodraw` do **not** seal against the void — use
   `tools/toolsskybox` on the enclosing hull. Also avoid themed wall brushes
   **coplanar with** the skybox hull; coplanar faces reintroduce portal leaks
   (wave 2, composer25). A solid enclosed start chamber merged into stage 1
   prevents spawn-point leaks in long procedural layouts.
6. **The real zone entity schema (reverse-engineered from the shipped
   `zonemaker.exe`, verified by probe compiles — gen 4, sonnet5).** The public
   docs are actively wrong here, in both directions:
   - docs.momentum-mod.org's entity reference pages describe
     `trigger_momentum_timer_*` entities with `zone_number`/`target` keys —
     that is the **runtime** layer driven by the compiled zone JSON, *not* what
     zonemaker parses. Using those classnames compiles fine and then zonemaker
     fails with the unhelpful `There is no main track`.
   - The public momentum-mod/game repo's `zonmaker.cpp` predates the 0.10.0
     zone-system rewrite (Oct 2025) and does not match the shipped binary.
     Do not treat it as ground truth.
   - What zonemaker actually parses from the VMF: classnames
     **`zone_timer_start` / `zone_timer_stage` / `zone_timer_checkpoint` /
     `zone_timer_end`**, with keys **`track_number`** (`"0"` = main track),
     **`safe_height`** (required — missing/invalid trips its own validation
     error), **`restart_destination`** (the `targetname` of an
     `info_teleport_destination` — not `target`, not `teleport_destination`),
     plus **`stage_number`** on stages and **`checkpoint_number`** on
     checkpoints. There is no `zone_number` key in the current schema.
   - If you use staged topology: each non-final stage needs an explicit
     `zone_timer_checkpoint` co-located with the *next* stage's
     `zone_timer_stage` (same brush footprint), `stage_number` = the ending
     stage, `checkpoint_number` `"2"` — else `Stage N does not have a
     checkpoint to use as the stage track end`. And once any stage has two
     checkpoints, `zone_timer_start`/`zone_timer_stage` need
     `checkpoints_ordered` `"1"` or the runtime refuses the zones.
   - SPEC generation 5 uses the simpler single-track checkpoint topology
     (start + ordered `zone_timer_checkpoint`s + end); the same classnames and
     keys apply. Remember the runtime timer still comes from the JSON only
     (gotcha 3) — these entities exist for zonemaker to read.
7. **vbsp material path warnings:** `gameinfo.txt` references
   `mount/hl2_dir.vpk` relative to the momentum folder while the VPK lives at
   `<MOM>\mount\`. The runtime mounts content fine, but vbsp can emit material
   resolution warnings depending on the compile-time search path (wave 2,
   grok45). Warnings on ASSETS.md-verified names are noise; warnings on other
   names usually mean the material really is missing — swap it.

## Golden brush — a known-good VMF solid

This exact solid (from a shipped gen-4 entry) went through vbsp, full vvis,
full vrad, zonemaker, and an in-game load with zero errors. It is a 192×192×16
platform whose top face sits at z=0. **Match this winding pattern exactly** —
the three plane points on each face wind clockwise viewed from outside the
brush. Two consecutive generations of entries died or stalled on getting this
wrong from first principles; don't re-derive it, pattern-match it.

```
solid
{
	"id" "1006"
	side
	{
		"id" "1000"
		"plane" "(-96 96 0) (96 96 0) (96 -96 0)"
		"material" "concrete/concretefloor002a"
		"uaxis" "[1 0 0 0] 0.25"
		"vaxis" "[0 -1 0 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
	side
	{
		"id" "1001"
		"plane" "(-96 -96 -16) (96 -96 -16) (96 96 -16)"
		"material" "concrete/concretewall036a"
		"uaxis" "[1 0 0 0] 0.25"
		"vaxis" "[0 -1 0 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
	side
	{
		"id" "1002"
		"plane" "(-96 96 -16) (96 96 -16) (96 96 0)"
		"material" "concrete/concretewall036a"
		"uaxis" "[1 0 0 0] 0.25"
		"vaxis" "[0 0 -1 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
	side
	{
		"id" "1003"
		"plane" "(-96 -96 0) (96 -96 0) (96 -96 -16)"
		"material" "concrete/concretewall036a"
		"uaxis" "[1 0 0 0] 0.25"
		"vaxis" "[0 0 -1 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
	side
	{
		"id" "1004"
		"plane" "(96 -96 0) (96 96 0) (96 96 -16)"
		"material" "concrete/concretewall036a"
		"uaxis" "[0 1 0 0] 0.25"
		"vaxis" "[0 0 -1 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
	side
	{
		"id" "1005"
		"plane" "(-96 -96 -16) (-96 96 -16) (-96 96 0)"
		"material" "concrete/concretewall036a"
		"uaxis" "[0 1 0 0] 0.25"
		"vaxis" "[0 0 -1 0] 0.25"
		"rotation" "0"
		"lightmapscale" "16"
		"smoothing_groups" "0"
	}
}
```

The pattern, face by face for an axis-aligned box spanning `(x1,y1,z1)` to
`(x2,y2,z2)` with `x1<x2, y1<y2, z1<z2`:

| Face | Three plane points |
|---|---|
| top (+z) | `(x1 y2 z2) (x2 y2 z2) (x2 y1 z2)` |
| bottom (−z) | `(x1 y1 z1) (x2 y1 z1) (x2 y2 z1)` |
| north (+y) | `(x1 y2 z1) (x2 y2 z1) (x2 y2 z2)` |
| south (−y) | `(x1 y1 z2) (x2 y1 z2) (x2 y1 z1)` |
| east (+x) | `(x2 y1 z2) (x2 y2 z2) (x2 y2 z1)` |
| west (−x) | `(x1 y1 z1) (x1 y2 z1) (x1 y2 z2)` |

## Canonical zone JSON — checkpoint topology

The shape SPEC generation 5 requires, matching shipped reference maps
(`formatVersion` 1): one main track, one segment, ordered checkpoints, an end
zone. The first checkpoint is the start zone and carries the spawn
(`teleDestPos`/`teleDestYaw`). `bottom` is the region's floor z; `points` are
the region polygon's XY corners.

```json
{
  "dataTimestamp": 0,
  "formatVersion": 1,
  "tracks": {
    "main": {
      "zones": {
        "segments": [ {
          "limitStartGroundSpeed": false,
          "checkpointsRequired": true,
          "checkpointsOrdered": true,
          "checkpoints": [
            { "regions": [ { "points": [[-128,-128],[128,-128],[128,128],[-128,128]],
                "bottom": 0, "height": 196,
                "teleDestPos": [0, 0, 0], "teleDestYaw": 90, "safeHeight": 0 } ] },
            { "regions": [ { "points": [[-128,640],[128,640],[128,896],[-128,896]],
                "bottom": 768, "height": 320 } ] }
          ]
        } ],
        "end": { "regions": [ { "points": [[-64,1536],[64,1536],[64,1664],[-64,1664]],
            "bottom": 1600, "height": 192 } ] }
      },
      "stagesEndAtStageStarts": true
    }
  },
  "globalRegions": {}
}
```

Add one `checkpoints` entry per floor (≥ 6 after the start for gen 5), each
region generously covering the whole floor. Reference maps place checkpoint
floors 768–960 u apart vertically.

## Movement model (Momentum climb mode — derive your gaps from this)

Constants (from docs.momentum-mod.org, validated in-game):

| Quantity | Value |
|---|---|
| Gravity | 800 u/s² |
| Jump apex | 57 u (66 crouched) |
| Run speed | 250 u/s |
| Prestrafe (realistic ceiling) | ~275 u/s |
| KZT bhop speed cap | 380 u/s |
| Vertical takeoff speed | √(2·800·57) ≈ 302 u/s |
| Crouch-jump takeoff speed | √(2·800·66) ≈ 325 u/s |

Crouch-jumps count as within the movement model: a required climb between 57 u
and 66 u is legal, but treat it as a precision move (use the 325 u/s takeoff
speed in the airtime formula and keep extra margin).

Airtime when landing `dz` units **above** takeoff (negative `dz` = drop):

```
airTime(dz) = (302 + sqrt(302² − 2·800·dz)) / 800
```

Max clearable gap at horizontal speed `v`: `v · airTime(dz) + 32`
(the +32 is the player bbox overhanging both edges, 16 u each side).

**Do not tune gaps by feel.** A landing that is +48 u above takeoff cuts airtime
from 0.755 s to 0.53 s — eyeballed gaps that look fine on flat ground become
impossible uphill. Compute every required jump, print a per-jump difficulty
report from your generator, and keep every required jump at ≤ 88% of max
(SPEC.md requirement 3). Assume run speed (250) for precision jumps, prestrafe
(~275) where the player has a straight approach, and bhop-cap speeds only for
optional shortcut routes.
