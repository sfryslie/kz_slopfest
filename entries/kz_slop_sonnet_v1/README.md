# kz_slop_sonnet_v1 — Canyon Switchback

A KZ climb map for Momentum Mod: a desert box-canyon ascent in four timed
stages, from a dry wash floor to a rimrock lookout tower.

## Theme

**Canyon Switchback.** You start in the sandy floor of a dry wash and climb
out of the canyon: bhopping the wash bed, working up a set of sun-baked
switchback ledges cut into the canyon wall, crossing a line of narrowing mesa
pillars through "the Narrows," and finishing with a longjump gauntlet across
open air to a rimrock lookout tower with a signal beacon. All geometry uses
stock HL2 `nature/` materials (sandfloor/rockfloor/cliffface/rockwall,
verified present in the mounted `hl2_dir.vpk`) with a warm, dusty
fog/lighting pass, so the desert-canyon read comes from texturing and
terrain shaping, not custom content.

## Stage overview

| Stage | Name | z range | What you do | Hardest jump (frac of max clearable) |
|---|---|---|---|---|
| 1 | The Wash | 0 → 100 | Sandy canyon-floor bhop, 10 rock hops, speed builds ~260→330 u/s | **0.64** |
| 2 | The Switchbacks | 100 → 500 | 9 ledges zigzagging up the canyon wall, run-speed jumps, rises to +56 (1u under the unboosted 57u apex) | **0.66** |
| 3 | The Narrows | 500 → 788 | 90° turn onto 8 shrinking mesa pillars (96u→72u wide), +32 rises, modest bhop chaining | **0.76** |
| 4 | Rimrock | 788 → 820 | Finale: 192u runways for a fresh prestrafe each jump, rises shrink to 0, final flat jump at 0.87 | **0.87** |

Every jump is computed from the TOOLCHAIN.md movement model
(`airTime(dz) = (VJUMP + sqrt(VJUMP² − 2·800·dz)) / 800`,
`maxGap = speed · airTime + 32`) and hard-capped at 88% of clearable —
`generate_map.js` throws if any jump would exceed that. The generator prints
a full per-jump difficulty report; the achieved per-stage hardest fractions
(0.64 → 0.66 → 0.76 → 0.87) are strictly increasing, satisfying the
difficulty-ramp requirement.

## How to build and run

```
node generate_map.js
```
writes `kz_slop_sonnet_v1.vmf` and prints the difficulty report.

```
set MOM=C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest
"%MOM%\bin\win64\vbsp.exe" -game "%MOM%\momentum" kz_slop_sonnet_v1.vmf
"%MOM%\bin\win64\vvis.exe" -game "%MOM%\momentum" kz_slop_sonnet_v1.bsp
"%MOM%\bin\win64\vrad.exe" -game "%MOM%\momentum" kz_slop_sonnet_v1.bsp
"%MOM%\bin\win64\zonemaker.exe" kz_slop_sonnet_v1.vmf
```

Install for testing:
- `kz_slop_sonnet_v1.bsp` → `%MOM%\momentum\maps\`
- `kz_slop_sonnet_v1.json` → `%MOM%\momentum\maps\zones\local\`

Launch: `steam.exe -applaunch 1802710 -novid -windowed +map kz_slop_sonnet_v1`.
The `kz_` filename prefix auto-selects KZ/Climb mode; the timer starts when
you leave the start zone, splits at each of the three stage zones, and stops
in the end zone.

## Verification

**Compile-only + partial in-game verification.** Ran the full pipeline
(vbsp → vvis → vrad → zonemaker) with no errors:

- `vbsp`: 0 leaks (no `.lin`/`.pts` leak file produced, `.prt` portal file
  written cleanly). Only warnings were harmless "unknown detail object type"
  spam from the terrain blend material's built-in detail sprites (cosmetic,
  not an error).
- `vvis`: completed (`-fast`, to keep iteration time reasonable on ~310
  displacement tiles), 0 errors.
- `vrad`: completed, 0 errors.
- `zonemaker`: produced `kz_slop_sonnet_v1.json`; spot-checked its zone
  coordinates against the generator's own printed plaza list — they match
  exactly (e.g. stage 2 start zone centered at x=3147, generator reported
  plaza `Stage 2 start` at x=3147).
- **In-game load:** launched via
  `steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720 -condebug
  +map kz_slop_sonnet_v1` and read `console.log`. Map loaded
  (`Host_NewGame on map kz_slop_sonnet_v1`), `momentum.exe` stayed running
  (no crash), no leak warnings anywhere in the log, and the zone/times UI
  reported `getTimesListStatus returned LOADED` (the zone JSON was read
  successfully). The only zone-related log lines are the expected harmless
  "Attempted to create unknown entity type zone_timer_*" warnings that
  TOOLCHAIN.md documents as cosmetic (the runtime timer reads the JSON, not
  these baked BSP entities).
- **What I could not do:** this harness has no input device access to the
  native game window (only a browser-automation tool, which doesn't apply to
  a Source-engine window), so I could not personally walk/bhop the course to
  feel-test every jump or watch the timer split live. All movement numbers
  are derived analytically from the documented model with an enforced 88%
  ceiling and printed for review, but a human playtest of the actual feel is
  still recommended before treating this as fully proven.

## Interventions

None. No human answered a question, fixed a path, restarted a tool, or gave
a hint during this build. (This is a claim of zero, made honestly per
RULES.md #5.)

## Spec feedback

- **"A checkpoint per stage" (SPEC.md requirement 4) is ambiguous** between
  "one checkpoint marking each stage boundary" and "a checkpoint *within*
  each stage, separate from the stage-start/end zones." I read it as the
  former, since it matches the zone JSON schema zonemaker actually emits
  (each `segment` has exactly one `checkpoints` entry) — every stage-start
  zone is both a split point and that stage's required checkpoint. A
  from-scratch course with genuinely separate mid-stage checkpoints would
  need a different zone topology; worth clarifying in a future spec
  revision.
- **The movement model gives the crouched jump apex (66u) but not a
  corresponding `VJUMP_crouch` formula.** I didn't need it here (my highest
  stage-2 rise, +56, stays under the *unboosted* 57u apex), but an entry
  that wants a genuine crouch-jump-required movement above 57u would have to
  derive `VJUMP_crouch = sqrt(2·800·66) ≈ 325 u/s` itself — TOOLCHAIN.md
  states the apex number but not the derived constant or whether crouch-jump
  timing is even considered "within the movement model" for gate purposes.
- **TOOLCHAIN.md doesn't specify vvis quality flags.** I ran `vvis -fast` to
  keep compile iteration fast on ~310 displacement tiles; the spec's gate
  only requires vvis to "complete without errors," which `-fast` satisfies,
  but a judge comparing entries on visual/performance polish should know
  fast-vis was used here rather than full visibility optimization.
- **Minor:** the finish beacon and stage cairn flags use
  `DEV_NYRO/DEV_RED_A-01`, a built-in Strata/Momentum dev texture rather than
  an HL2 `nature/` material from the mounted VPK. TOOLCHAIN.md's "stick to
  mounted stock content" guidance is scoped to what's mounted *from HL2* and
  doesn't explicitly rule on the engine's own always-present dev textures;
  I judged a small decorative accent using guaranteed-present built-in
  content to be within spirit, but it's a boundary call worth flagging.
