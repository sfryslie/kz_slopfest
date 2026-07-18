# kz_slopfest — Map Specification

You are an AI coding agent. Your task is to design and build a **KZ (climb/bhop) map
for Momentum Mod** from scratch, working entirely inside your own entry folder.
This document is the frozen spec. [TOOLCHAIN.md](TOOLCHAIN.md) tells you how to build
and verify; [RULES.md](RULES.md) tells you where you may work and what is off-limits.

## Deliverable

A complete map entry in `entries/kz_slop_<model>_v<n>/` containing:

| File | Purpose |
|---|---|
| `PLAN.md` | Your design plan, committed **before any map code** (see Process) |
| `README.md` | Theme statement, stage overview, and how to build/run your entry |
| A generator script | Produces the `.vmf` from code (Node, Python, whatever — your choice) |
| `kz_slop_<model>_v<n>.vmf` | Generated output (never hand-edited) |
| `kz_slop_<model>_v<n>.bsp` | Compiled map |
| `kz_slop_<model>_v<n>.json` | Zone file (timer + checkpoints) |

`<model>` is your assigned short name and **must include the model version**,
lowercase with no dots (e.g. `opus48`, `sonnet5`, `haiku45`, `gpt5codex`);
`<n>` starts at 1.

## Requirements

1. **Theme.** Pick a theme and commit to it. State it in your README and make it
   visible in the map — geometry, texturing, and layout should all read as that
   theme, within the limits of stock textures (see TOOLCHAIN.md for what's mounted).
2. **Difficulty ramp.** At least **4 stages**. Each stage's hardest *required*
   movement must be harder than the previous stage's — longer gap, tighter
   landing, higher precision, or more technical (your PLAN.md must say which,
   per stage, so it can be checked against the geometry).
3. **Beatable.** Every movement required to finish must be within the movement
   model in TOOLCHAIN.md, with margin. A required jump may use at most **88%**
   of the physically clearable distance at the speed a player can reasonably
   carry into it. One impossible required jump fails the entire entry.
4. **Timer and checkpoints.** A valid zone JSON with a start zone, an end zone,
   and a timed split at each stage boundary (each stage-start zone is that
   stage's checkpoint — this matches the segment topology zonemaker emits;
   additional mid-stage checkpoints are optional). The timer must actually
   start, split, and stop in-game.
5. **Stability.** The map compiles through the full pipeline without errors,
   loads in Momentum Mod without crashing, and has no leaks. Fast-quality
   compile flags (e.g. `vvis -fast`) are fine while iterating, but the
   **shipped** `.bsp` must come from a full-quality vvis and vrad pass.
6. **Generated, not hand-made.** The `.vmf` must be fully reproducible by running
   your generator script. Hand-editing the VMF disqualifies the entry.
7. **It must actually demand jumping.** This is a KZ map: on the required route,
   consecutive platforms must be separated by gaps or rises that **cannot be
   crossed by walking** — no continuous walkable terrain (slopes, dirt fill,
   displacement ramps) bridging or bypassing any required jump, in any stage.
   Each stage needs at least 3 required jumps. A course you can walk from start
   to finish is not a KZ map, whatever its theme.
8. **No soft-locks.** Anywhere a player can fall off the route and be unable to
   rejoin it must be covered by a kill trigger (`trigger_teleport` back or kill
   volume) so they respawn instead of wandering a pit. Falling must never strand
   the player.

## Process (this is the spec-driven part)

1. Read this spec, TOOLCHAIN.md, and RULES.md in full.
2. Write and commit `PLAN.md`: theme, stage-by-stage layout, the difficulty
   mechanism per stage (with intended gap/height numbers), and how you'll verify.
3. Only then write the generator, compile, and test.
4. Iterate as needed. Log every human intervention you required in your README
   under an **Interventions** section (an empty section is a claim of zero).

## Acceptance gates (pass/fail, checked before judging)

- [ ] `PLAN.md` was committed before any generator code
- [ ] Generator runs cleanly and reproduces the shipped `.vmf`
- [ ] vbsp / vvis / vrad complete without errors
- [ ] Zone JSON is valid and zonemaker (or hand-derived zones) matches the geometry
- [ ] Map loads in Momentum Mod, no crash, no leak
- [ ] Timer starts, splits at each stage, and **stops at a reachable end zone**
      (verify as far as your harness allows; a human judge certifies it live —
      entries have shipped with non-functioning end zones before, so treat this
      gate as unproven until witnessed)
- [ ] Course is completable within the movement model (every required jump ≤ 88% of max)
- [ ] Every stage requires jumping; no walkable route or bypass exists past any
      required jump
- [ ] All fall-off areas are covered by kill/teleport triggers — no soft-locks

Entries that pass the gates are scored per [scoring/RUBRIC.md](scoring/RUBRIC.md).
