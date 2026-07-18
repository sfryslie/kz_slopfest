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
   Hammer `vertices_plus` blocks on zone brush faces. The error when missing is
   the unhelpful "Could not find bottom of zone brush". Emit them from your
   generator.
3. **Timer comes from the JSON only:** the runtime ignores `zone_timer_*`
   entities baked into the BSP ("unknown entity type" console warnings are
   harmless). If the timer doesn't work, the problem is in the JSON zone file,
   not the map.
4. **Displacement orientation:** `dispinfo` rows advance **+Y** from
   `startposition` (the min corner) and columns advance **+X** (verified against
   `builddisp.cpp` in the momentum-mod/game source).

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
