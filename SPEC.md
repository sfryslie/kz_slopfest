# kz_slopfest — Map Specification

**Spec generation: 4**

You are an AI coding agent. Your task is to design and build a **KZ (climb/bhop) map
for Momentum Mod** from scratch, working entirely inside your own entry folder.
This document is the frozen spec. [TOOLCHAIN.md](TOOLCHAIN.md) tells you how to build
and verify; [ASSETS.md](ASSETS.md) lists benchmark-safe content; [RULES.md](RULES.md)
tells you where you may work and what is off-limits.

Runs are cut from a **template commit** on `main`; that commit fixes the spec text.
The **spec generation** integer at the top of this file (currently **4**) is the
version that must appear in your map filename — the way Source maps use `_v2`,
`_v3`, `_v4` when a course is revised. It is **not** a per-model attempt counter.

| Generation | Template commit | Summary |
|---|---|---|
| 3 | `1a0c5a6` | 6+ stages, 6+ jumps/stage, killboxes, witnessed end zones |
| **4** | `15cd23a` | Tier 1 ASSETS.md, layout + prop gates, shared-compile etiquette |

Older results tables may say "spec v3.1" — that is generation **3**.

## Deliverable

A complete map entry in `entries/kz_slop_<model>_v<gen>/` containing:

| File | Purpose |
|---|---|
| `PLAN.md` | Your design plan, committed **before any map code** (see Process) |
| `README.md` | Theme statement, stage overview, and how to build/run your entry |
| A generator script | Produces the `.vmf` from code (Node, Python, whatever — your choice) |
| `kz_slop_<model>_v<gen>.vmf` | Generated output (never hand-edited) |
| `kz_slop_<model>_v<gen>.bsp` | Compiled map |
| `kz_slop_<model>_v<gen>.json` | Zone file (timer + checkpoints) |

`<model>` is your assigned short name and **must include the model version**,
lowercase with no dots (e.g. `opus48`, `sonnet5`, `haiku45`, `gpt5codex`).

`<gen>` is the **spec generation** integer from the header of this file (e.g.
generation 4 → `kz_slop_opus48_v4`). Every file and folder suffix must match.
If a human re-runs the same model on the same generation, the map name stays
`_v<gen>`; distinguish attempts in git branch names or `scoring/results.md`, not
by bumping the map version.

## Requirements

1. **Theme.** Pick **one coherent theme** from the Tier 1 palette in
   [ASSETS.md](ASSETS.md). Mountain/outdoor is fine — not required. Urban,
   industrial, coastal, trainyard, mining, and rooftop themes are equally valid.
   State the theme in your README and make it visible — geometry, materials, and
   props should read as that theme without reading the README. Use **Tier 1 only**
   (no TF2 / CS:GO / CS:S / Portal 2 content).
2. **Difficulty ramp.** At least **6 stages**. Each stage must be harder than
   the previous one, on at least one of two axes — and your PLAN.md must say
   which, per stage, so it can be checked against the geometry:
   - **Harder movements** — longer gap, tighter landing, higher precision, more
     technical; and/or
   - **Longer sequences** — more consecutive required jumps between rest
     platforms, so sustained execution ramps even when individual jumps don't.
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
   Each stage needs at least **6 required jumps**. A course you can walk from
   start to finish is not a KZ map, whatever its theme.
8. **No soft-locks.** Anywhere a player can fall off the route and be unable to
   rejoin it must be covered by a kill trigger (`trigger_teleport` back or kill
   volume) so they respawn instead of wandering a pit. Falling must never strand
   the player.
9. **Route shape.** The required path must not be a single straight corridor.
   Across the full course:
   - The dominant travel direction must **change at least twice** (e.g. +Y then
     +X then +Y, or equivalent turns ≥ ~70° between stage centroids).
   - **Each stage** must use at least **two distinct platform footprints**
     (different width×depth pairs on required landings).
   - **At least one stage** must include a **vertical switchback or zigzag**
     (the route reverses or turns back on itself in plan view — not merely
     "gap gets longer").
10. **Dressing.** Each stage must include at least **8 `prop_static` entities**
    used as themed decoration. Props must not block the required route or create
    walkable bypasses. A map with zero scenery props fails this requirement
    regardless of floor texture swaps.

## Process (this is the spec-driven part)

1. Read this spec, [TOOLCHAIN.md](TOOLCHAIN.md), [ASSETS.md](ASSETS.md), and
   [RULES.md](RULES.md) in full.
2. Write and commit `PLAN.md` **before any generator code**:
   - **Theme pitch** — one short paragraph: what's the fantasy of this map?
   - **Asset palette** — explicit Tier 1 materials (3–6 families) and prop
     vocabulary from ASSETS.md
   - **Stage-by-stage layout** — difficulty mechanism per stage with intended
     gap/height numbers
   - **Per-stage fun hook** — one sentence each on why that stage is interesting
     to play (not just harder)
   - **Setpiece notes** — where landmarks, props, or vista moments go
   - **Verification plan**
3. Only then write the generator, compile, and test.
4. Your generator should print a **route report** on each build: total required
   path length, number of heading/direction changes, per-stage prop count, and
   per-jump difficulty percentages. If `heading_changes < 2`, fix the layout
   before shipping.
5. Iterate as needed. Log every human intervention you required in your README
   under an **Interventions** section (an empty section is a claim of zero).

**Gates vs judging:** Acceptance gates prove the map *works*. **Fun** is scored
by humans after playing ([scoring/RUBRIC.md](scoring/RUBRIC.md) Layer 1). Entries
that pass gates but play like a uniform pad corridor are valid data — they will
score poorly on Fun. Design for flow, pacing, and memorable moments, not minimum
jump count.

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
- [ ] Route changes dominant direction at least twice; each stage has ≥ 2 platform
      footprints; at least one stage has a switchback or zigzag (see requirement 9)
- [ ] Each stage has ≥ 8 themed `prop_static` decorations off the required route
      (see requirement 10)
- [ ] All materials and models are Tier 1 per ASSETS.md

Entries that pass the gates are scored per [scoring/RUBRIC.md](scoring/RUBRIC.md).
