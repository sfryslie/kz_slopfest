# kz_slopfest — Map Specification

**Spec generation: 5**

You are an AI coding agent. Your task is to design and build a **KZ (climb/bhop) map
for Momentum Mod** from scratch, working entirely inside your own entry folder.
This document is the frozen spec. [TOOLCHAIN.md](TOOLCHAIN.md) tells you how to build
and verify; [ASSETS.md](ASSETS.md) lists benchmark-safe content; [RULES.md](RULES.md)
tells you where you may work and what is off-limits.

Runs are cut from a **template commit** on `main`; that commit fixes the spec text.
The **spec generation** integer at the top of this file (currently **5**) is the
version that must appear in your map filename — the way Source maps use `_v2`,
`_v3`, `_v4` when a course is revised. It is **not** a per-model attempt counter.

| Generation | Template commit | Summary |
|---|---|---|
| 3 | `1a0c5a6` | 6+ stages, 6+ jumps/stage, killboxes, witnessed end zones |
| 4 | `15cd23a` | Tier 1 ASSETS.md, layout + prop gates, shared-compile etiquette |
| **5** | `cf33271` | Single-track vertical climb, catch geometry, difficulty curve, route manifest + shared validator |

Older results tables may say "spec v3.1" — that is generation **3**.

## The shape of a KZ map

KZ stands for **KreedZ climb**. The point of the genre, learned the hard way from
human playtests of generation-4 entries against shipped reference maps:

- **You climb UP.** The course is one connected structure — a tower, a shaft, a
  spire, a cliff face, a stacked series of plazas — ascended from bottom to top.
  Reference maps climb 4,000–6,400 units. A 660-unit chain of floating islands
  is not a KZ map, whatever its theme.
- **The structure below you is the safety net.** Falling off a jump should drop
  you onto earlier course geometry — the base plaza, a lower floor — from which
  you climb back. The penalty for falling is lost height, not death. The game
  natively provides checkpoint teleports; binary kill/reset volumes fight that
  system instead of using it.
- **Looking down shows your progress.** From the upper half of the course a
  player should see the floors they've conquered below them. This falls out
  naturally from the climb-to-footprint ratio required below.

## Deliverable

A complete map entry in `entries/kz_slop_<model>_v<gen>/` containing:

| File | Purpose |
|---|---|
| `PLAN.md` | Your design plan, committed **before any map code** (see Process) |
| `README.md` | Theme statement, course overview, and how to build/run your entry |
| A generator script | Produces the `.vmf` **and** `route.json` from code (Node, Python — your choice) |
| `kz_slop_<model>_v<gen>.vmf` | Generated output (never hand-edited) |
| `kz_slop_<model>_v<gen>.bsp` | Compiled map |
| `kz_slop_<model>_v<gen>.json` | Zone file (timer + checkpoints) |
| `route.json` | Route manifest (see schema below), emitted by the same generator run as the `.vmf` |

`<model>` is your assigned short name and **must include the model version**,
lowercase with no dots (e.g. `opus48`, `sonnet5`, `haiku45`, `gpt56sol`).

`<gen>` is the **spec generation** integer from the header of this file (e.g.
generation 5 → `kz_slop_sonnet5_v5`). Every file and folder suffix must match.
If a human re-runs the same model on the same generation, the map name stays
`_v<gen>`; distinguish attempts in git branch names or `scoring/results.md`, not
by bumping the map version.

## Requirements

1. **Theme.** Pick **one coherent theme** from the Tier 1 palette in
   [ASSETS.md](ASSETS.md) and make the *structure* read as that theme —
   geometry, materials, and props should tell it without reading the README.
   Use **Tier 1 only** (no TF2 / CS:GO / CS:S / Portal 2 content).
2. **Climb.** Net elevation gain from start zone to end zone must be at least
   **3072 units**. The largest horizontal dimension of the course's bounding
   box must not exceed **1.5×** the net climb (this is what makes it a tower,
   not a sprawl). The course has at least **6 checkpoint floors** between start
   and end; each checkpoint region should generously cover its whole floor or
   plaza (≥ 256×256 u where the geometry allows).
3. **Difficulty curve — peaks and valleys, not a ramp.** Difficulty is declared
   per jump (as a fraction of the physical budget, see requirement 4) and must
   satisfy, over the whole jump sequence (validator-checked):
   - **Rising overall trend**: the course opens easy (warm-up) and the
     middle-to-late course is harder than the opening;
   - **Peak placement**: the hardest required jump sits between **50% and 75%**
     of the way through the jump sequence — not at the very end, not at the start;
   - **Cool-offs**: every jump at ≥ 80% of budget must be followed, within the
     next 3 jumps, by at least 2 jumps at ≤ 65% — players need to breathe after
     a spike;
   - **Victory lap**: the final ~10% of jumps may be easier than what precedes
     them; a hard jump near the end plays better when the run-out lets the
     player flow to the finish.
4. **Beatable.** Every required movement must be within the movement model in
   TOOLCHAIN.md, with margin. A required jump may use at most **88%** of the
   physically clearable distance at its **declared** assumed approach speed:
   250 u/s (precision default), ~275 u/s (only with a straight unobstructed
   approach), 380 u/s (optional shortcut routes only). The declared speed goes
   in `route.json` per jump; the validator recomputes the physics and rejects
   drift. **Vertical rises get their own margin**: a required jump may rise at
   most **48 u** (~84% of the 57 u apex — a rise at the apex has zero margin
   even when the airtime formula says otherwise; the gen-4 playtest found two
   shipped jumps over this line). Rises of 49–56 u are legal only as declared
   crouch-jumps (`"crouch": true` in `route.json`; budget computed on the
   66 u / 325 u/s crouch model, and treat it as a precision move). Anything
   higher on the required route is impossible. One impossible required jump
   fails the entire entry.
5. **Timer and checkpoints.** A valid zone JSON: **one main track, a single
   segment** with **ordered checkpoints** (one per floor, matching requirement
   2) and an end zone — the topology shipped reference maps use. The start zone
   carries `teleDestPos` and `teleDestYaw`. The timer must actually start, hit
   checkpoints, and stop in-game.
6. **Stability.** The map compiles through the full pipeline without errors,
   loads in Momentum Mod without crashing, and has no leaks. Fast-quality
   compile flags are fine while iterating, but the **shipped** `.bsp` must come
   from a full-quality vvis and vrad pass.
7. **Generated, not hand-made.** The `.vmf` **and** `route.json` must both be
   fully reproducible by running your generator once. Hand-editing either
   disqualifies the entry. The manifest must describe the same geometry the
   VMF contains — a manifest that flatters the validator while the map differs
   is a dishonest entry, not a passing one.
8. **It must actually demand jumping.** On the required route, consecutive
   platforms must be separated by gaps or rises that **cannot be crossed by
   walking** — no walkable terrain bridging or bypassing any required jump.
   At least **6 required jumps per leg** (checkpoint to checkpoint) and
   **36 total**.
9. **Catch geometry, not killboxes.** Every place a player can fall off the
   required route must land them on course geometry — the base plaza, an
   earlier floor, a catch ledge — from which they can walk or climb back to
   the route. Kill or teleport triggers are permitted **only** over true voids
   where no catch geometry is possible, and stranding a player anywhere is an
   automatic fail. Design the structure so falls are caught by construction;
   if your map needs killboxes everywhere, its morphology is wrong (see "The
   shape of a KZ map").
10. **Route shape.** Judged on the **per-jump heading sequence** (not stage
    centroids): the heading must change at least **twice** across the course;
    at least one section must be a **plan-view reversal** (switchback — the
    route turns back over or beside itself); each leg must use at least **two
    distinct landing footprints** (width×depth pairs).
11. **Props — dress the structure, never block it.** At least **8 static-safe
    props per leg** (see the ASSETS.md static-prop warning — many "loose
    object" models silently fail as `prop_static`). **No prop may sit within
    64 units of any required jump corridor** (the takeoff→landing segment, at
    any height a player traverses it) **or on any required landing area.**
    Props go in `route.json`; the validator checks clearance. A blocked jump
    is an impossible jump (requirement 4) found the embarrassing way.
12. **Mechanical variety.** Include at least **3 distinct movement constructs**
    from this menu, named in PLAN.md and identifiable in-game: ladder section,
    crouch tunnel, drop-jump, uphill hop chain, tightrope / rail walk,
    **corner jump** (a 90° or U-turn jump around a climbed obstacle),
    180°-turn jump, pillar weave, wall gap. Flat same-height gap jumps
    arranged in a zigzag do not count as variety.

### Design notes for fun (judged, not gated)

Gen-4 playtesting found what actually plays well; none of this is a gate, all
of it moves the Layer 1 Fun score:

- **Corner rhythm.** The most fun jumps in playtests were 90° and U-turn jumps
  around the corner of a climbed obstacle — they turn raw gaps into momentum
  and rhythm. Requirement 12's corner-jump construct exists because of this;
  use it more than once if it suits the structure.
- **Discovery beats.** Arriving on a new floor and taking a second to scan for
  the *next* hold is a pleasure — not every jump needs to be signposted.
  Budget a couple of these moments. But never let discovery become ambiguity
  with stakes: if a player could plausibly commit to the *wrong* platform and
  fall for it, mark the right one (a lamp, a prop cluster, a material accent).
- **The view down.** Checkpoint floors with an open sightline back down the
  structure are the reward for climbing. Don't wall in every floor.

## Route manifest — `route.json`

Emitted by the same generator run that writes the VMF. Schema (all positions in
world units; `leg` is the 1-based index of the checkpoint span the jump belongs
to, where leg 1 runs from the start zone to checkpoint 1):

```json
{
  "map": "kz_slop_<model>_v<gen>",
  "start": { "pos": [x, y, z], "yaw": 0 },
  "end":   { "pos": [x, y, z] },
  "checkpoints": [ { "index": 1, "pos": [x, y, z], "regionSize": [w, d] } ],
  "jumps": [ {
      "index": 1, "leg": 1,
      "from": [x, y, z], "to": [x, y, z],
      "gap": 150.0, "dz": 0.0,
      "assumedSpeed": 250, "fraction": 0.62, "crouch": false,
      "heading": "N",
      "landing": [96, 96]
  } ],
  "props": [ { "model": "props_c17/truss03b", "pos": [x, y, z], "leg": 1 } ],
  "constructs": [ "ladder", "drop-jump", "pillar weave" ]
}
```

Run the frozen validator before shipping:

```
node scripts/validate_entry.js entries/kz_slop_<model>_v<gen>
```

It checks naming, climb and footprint ratio, jump counts, physics (recomputed
from the TOOLCHAIN movement model), the difficulty-curve rules, heading changes
and the switchback, landing-footprint variety, prop counts and prop clearance,
and the zone JSON topology. **A validator failure is a failed gate.** The
validator is frozen with the spec — do not modify it; if you believe it is
wrong, note it under **Spec feedback** in your README and design within it.

## Process (this is the spec-driven part)

1. Read this spec, [TOOLCHAIN.md](TOOLCHAIN.md), [ASSETS.md](ASSETS.md), and
   [RULES.md](RULES.md) in full.
2. Write and commit `PLAN.md` **before any generator code**:
   - **Theme pitch** — one short paragraph: what's the fantasy of this climb?
   - **Asset palette** — explicit Tier 1 materials (3–6 families) and prop
     vocabulary from ASSETS.md
   - **Structure sketch** — what is the building? How do the floors stack?
   - **Difficulty curve** — the intended per-leg shape: where the warm-up ends,
     where the peak lives, where the cool-offs and victory lap go
   - **Constructs** — which 3+ menu items from requirement 12, and where
   - **Per-leg fun hook** — one sentence each on why that leg is interesting
   - **Verification plan**
3. **Walking skeleton first.** Before building the real course, push a minimal
   two-platform probe map through the **entire** pipeline — generator → vbsp →
   vvis → vrad → zonemaker → load in game — and note the result in a commit.
   Every generation so far, at least one entry died late on a format error a
   ten-minute probe would have caught on attempt one.
4. Build the real course. Your generator must print a **route report** on each
   build: net climb, footprint ratio, per-leg jump and prop counts, per-jump
   difficulty percentages with declared speeds, and the heading sequence. Then
   run the frozen validator (above) and fix failures before shipping.
5. Iterate as needed. Log every human intervention in your README under an
   **Interventions** section (an empty section is a claim of zero).

**Gates vs judging:** Acceptance gates prove the map *works*. **Fun** is scored
by humans after playing ([scoring/RUBRIC.md](scoring/RUBRIC.md) Layer 1). The
difficulty-curve and morphology rules exist because generation-4 playtests
showed gate-passing maps that played like chores. Design for flow, pacing, and
the view from the top.

## Acceptance gates (pass/fail, checked before judging)

- [ ] `PLAN.md` was committed before any generator code
- [ ] Walking-skeleton probe committed before the real course
- [ ] Generator runs cleanly and reproduces the shipped `.vmf` **and** `route.json`
- [ ] `scripts/validate_entry.js` passes on the shipped entry
- [ ] vbsp / vvis / vrad complete without errors; no leaks
- [ ] Zone JSON is valid, single-segment-with-checkpoints topology, matches geometry
- [ ] Map loads in Momentum Mod, no crash
- [ ] Timer starts, hits each checkpoint, and **stops at a reachable end zone**
      (verify as far as your harness allows; a human judge certifies it live —
      treat this gate as unproven until witnessed)
- [ ] Course completable within the movement model — including **prop clearance**
      (a prop blocking a jump fails this gate; generation 4 shipped one)
- [ ] No stranding anywhere; falls land on catch geometry per requirement 9
- [ ] All materials and models are Tier 1 per ASSETS.md, props static-safe

Entries that pass the gates are scored per [scoring/RUBRIC.md](scoring/RUBRIC.md).
