# PLAN — kz_slop_opus48_v1

## Theme

**"Tidewater Ascent."** A climber scales a sea cliff, starting on tide-washed
grassy stepping-stones at the shore and working up through rocky ledges to a
windswept summit spire, all under the `sky_cape_hill` sky. The look comes
entirely from mounted HL2 `nature/` stock materials:

- **Shore (Stage 1):** grass tops (`nature/grassfloor003a`), sand/dirt ground below.
- **Scramble (Stage 2):** dirt + gravel ledges (`nature/dirtfloor003a`, gravel sides).
- **Ledgeworks (Stage 3):** bare rock shelves (`nature/rockfloor006a`).
- **Summit Spires (Stage 4):** high pale rock pillars (`nature/rockfloor002c`).
- **Canyon walls** framing both sides: `nature/cliffface001a` / `cliff02a`.
- Sky: `sky_cape_hill`. Void floor is a distant sand plane so a miss reads as "fell to the beach."

Dev/tool textures are used only for the invisible skybox shell and the (non-visible)
trigger zone volumes — never on a play surface.

## Movement model (from TOOLCHAIN.md) and the safety rule

```
airTime(dz) = (302 + sqrt(302^2 - 1600*dz)) / 800
maxGap(dz,v) = v*airTime(dz) + 32          # +32 = player bbox overhang
```

Every **required** jump is checked at the **conservative run speed v = 250 u/s**
(not prestrafe 275), and the actual edge-to-edge gap is kept at **≤ 88% of maxGap**.
Using 250 for the check means a player who only reaches run speed still clears with
margin, and anyone who prestrafes has more. The generator recomputes this table and
**asserts** every jump ≤ 88%, aborting the build otherwise.

## Difficulty ramp (4 stages, each hardest jump harder than the last)

All jumps are axial (travel is +X, landings centred on Y=0) so the physics check is
exact. Difficulty escalates on **four** independent axes — gap %, uphill dz, landing
depth, landing width — and every axis is monotonic across stages.

| Stage | Name | dz/jump | Landing (depth×width) | Gaps (u) | Hardest jump % of max@250 |
|---|---|---|---|---|---|
| 1 | The Tideline | 0 (flat) | 96 × 128 | 96,112,120,128 | 58.0% |
| 2 | The Scramble | +16 | 80 × 112 | 120,132,140,148,152 | 73.6% |
| 3 | The Ledgeworks | +24 | 56 × 56 | 140,148,156,160,164 | 82.7% |
| 4 | The Summit Spires | +40 | 44 × 44 | 128,136,142,146,150 | 84.3% |

Per-stage teaching intent:
- **S1** teaches jump+strafe timing on flat, forgiving ground (wide landings, small gaps).
- **S2** introduces **uphill** airtime — same skill, but every landing is +16 above
  takeoff, which shortens airtime, so gaps that "look the same" demand more speed.
- **S3** is **precision**: landings shrink to 56×56 (~1.75× the 32u bbox) while gaps grow.
- **S4** is the **finale**: steepest climb (+40, near the 57u apex), narrowest pads
  (44×44), and the longest gaps relative to their (short, uphill) airtime.

Height gained: S1 z=0 → S2 to +80 → S3 to +200 → S4 to +400 summit.

## Geometry / build approach

- **Generator:** `generate.js` (Node). Emits the `.vmf` deterministically from a
  data-driven course description. No hand editing.
- **Box helper:** every brush is an axis-aligned box. For each of the 6 faces the
  generator computes the plane normal from the first three emitted points and
  **reverses the winding if it does not match the outward normal** — so plane
  winding (TOOLCHAIN gotcha #1) is correct by construction, not by hand. It also
  emits `vertices_plus` on every face (gotcha #2) so zonemaker accepts the zone brushes.
- **Sealing:** a hollow `tools/toolsskybox` shell (6 thick, overlapping brushes)
  encloses the whole course → no leak. A decorative nature ground slab and two
  `cliffface` canyon walls sit inside for the theme.
- **Course brushes:** start pad, 4+5+5+5 stage platforms, summit finish pad.

## Zones (timer + checkpoints)

Zone volumes are `@SolidClass` brush entities read by `zonemaker.exe` from the VMF
(confirmed in `momentum.fgd`): `zone_timer_start` (start pad), `zone_timer_stage`
with stage_number 2/3/4 over each stage's first platform (these are the timed stage
splits / checkpoints per SPEC req 4), and `zone_timer_end` over the summit pad.
Each start/stage zone gets an `info_teleport_destination` for its required
`restart_destination`. `checkpoints_required` is 0 (no mid-stage checkpoint zones).
Zone brushes carry `vertices_plus`. `zonemaker.exe` produces the shipped `.json`.
If zonemaker rejects the geometry, fall back to hand-deriving the JSON to match
(SPEC allows either), documenting it in the README.

## Verification plan

1. `node generate.js` — prints the per-jump difficulty report and asserts ≤88%.
2. `vbsp` → `vvis` (full) → `vrad` (full) on the shipped bsp; iterate with
   `-fast` only while debugging.
3. `zonemaker.exe` → `.json`; validate start/3 stages/end are present.
4. Install bsp + json, launch Momentum windowed with `-condebug +map`, read
   `console.log` for leaks / zone registration / load errors, and confirm the
   timer starts, splits at each stage, and stops.

## Acceptance-gate self-check mapping

- PLAN before code ✔ (this commit) · generator reproduces vmf ✔ · full vbsp/vvis/vrad ✔
- zones match geometry ✔ · loads without crash/leak (verify) · timer start/split/stop (verify)
- every required jump ≤ 88% ✔ (asserted in generator)
