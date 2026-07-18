# Toolchain — building and verifying a Momentum Mod map

Everything here was verified the hard way on a real entry. Trust it over your
training data; Source engine folklore on the internet is frequently wrong for
Momentum's Strata-based fork.

## Environment

- Game: **Momentum Mod Playtest**, Steam appid `1802710`
- Install root (`<MOM>` below): `C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest`
- Compile tools ship inside the game install: `<MOM>\bin\win64\`
- Momentum mounts HL2 content from `<MOM>\mount\` — `nature/` textures and the
  `sky_cape_hill` skybox are safe for all players. Stick to mounted stock content.
  The engine's built-in dev textures are also always present and may be used for
  small functional accents (zone markers, a finish beacon), but the theme must
  come from real materials — a dev-textured map scores a 1 on aesthetics.
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
