# Results

Judged scores (theme / difficulty curve / fun) pending human playtests — see
[RUBRIC.md](RUBRIC.md). Layer 0 gates and Layer 2 agentic metrics recorded below.

| Entry | Model | Harness | Gates | Wall time | Tokens | Tool calls | Interventions | In-game verify | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `kz_slop_sonnet_v1` "Canyon Switchback" | Sonnet 5 | Claude Code subagent | all pass* | 13.5 min | ~140k | 49 | 0 | load-only | **Dry run, contaminated** — legally read ancestor repo via spec v1 loophole; used `vvis -fast` (legal at the time). Not a clean score. **Playtest: no required jumps — fully walkable** (terrain fill bridged the course); prompted spec v3 req 7. |
| `kz_slop_opus48_v1` "Tidewater Ascent" | Opus 4.8 | Claude Code subagent | all pass | 16.6 min | ~105k | 47 | 0 | load-only | Found + fixed own off-by-one stage-zone bug. Cheapest clean pass. **Playtest: working end zone; no killbox** — fall-offs strand the player (spec v3 req 8). |
| `kz_slop_sonnet5_v1` "Cape Ascent" | Sonnet 5 | Claude Code subagent | ⚠️ end-zone fail (playtest) | 25.2 min | ~199k | 92 | 0 | load-only | Read `momentum.fgd` for real entity names; validated winding + `vertices_plus` on a throwaway test map. Flagged its timer gate as inferred, not witnessed — **correctly: playtest found no working end zone.** |
| `kz_slop_haiku45_v1` | Haiku 4.5 | Claude Code subagent | **DNF** | 21.4 min | ~111k | 93 | 0 | load-only (empty map) | Real geometry never survived vbsp ("no visible sides" — plane winding suspected). Honest failure report. Self-reported difficulty fractions also non-monotonic (81.5/83.5/84.3/**75.6**). Installed bsp is a 76KB empty husk. |

| `kz_slop_sonnet5_v4` "Refinery Spire" | Sonnet 5 | Claude Code subagent (default effort) | ⚠️ beatable fail (playtest) | 51.4 min | ~348k | 186 | 0 | load + console, 4 launches | 6 stages, 46 jumps, 660u climb, 60 props, max jump 87%. Reverse-engineered the real zonemaker 0.10.0 entity schema from exe strings (public docs/repo stale — see entry README). Found ASSETS.md prop list includes physics-only models that fail as `prop_static`; probe-compiled a verified-safe list. Explicitly declined to read foreign zone JSONs in shared install (RULES #1). Operator verified: PLAN-first ✓, generator byte-identical repro ✓, zero leaks ✓. **Playtest (2026-07-18): timer start + stage splits witnessed live ✓, but props block required jumps in ≥4 spots and two required jumps rise higher than physically clearable (vertical margin miscalculation) — course impossible as shipped (reqs 3+10 violated, beatability gate fails). Reads as floating-island mishmash, not a climbable structure; comic slop value high, fun value pending a fixed run.** |
| `kz_slop_haiku45_v4` | Haiku 4.5 | Claude Code subagent (default effort) | **DNF** | 17.5 min | ~121k | 79 | 0 | none (vbsp never passed) | Same plane-winding death as wave 1 ("no visible sides" on every brush → vbsp segfault) despite gen-4 docs. Misattributed failure to "vbsp installation issue" — falsified by Sonnet compiling concurrently in the same install. **Contaminated:** used `kz_slop_gpt56terra_v1.vmf` found in the shared `maps/` folder as a format reference (operational spillover — see wave 3 notes). Design layer above the format was spec-conformant (theme, switchback, 72 props, ≤87.5% jumps). |

| `kz_slop_sonnet5_v5` "Scaffold Spire" | Sonnet 5 | Claude Code subagent (default effort), clean-room clone | all pass‡ | 89 min | ~708k | ~548 | 2 (harness artifact) | load + console, 3 sessions | First gen-5 run. 3260u climb, 7 legs × 6 jumps, 6 plaza checkpoints, catch-net floors, **zero killboxes**, peak 85% crouch-jump at 61% of sequence with cool-off, victory-lap leg 7. Validator PASS (operator re-ran independently). Both interventions were wake-ups after it parked on detached ~19-min vvis runs believing its harness would notify it — no map-technical help. Spec feedback for v5.1: zonemaker emits `teleDestTargetname` (not `teleDestPos`; runtime rejects both together — entry postprocesses), `zone_timer_checkpoint` needs `stage_number "1"` even non-staged, `checkpoint_number` is 1-based counting start, 6-plane box ≠ hollow room. **Playtest (2026-07-18): start-legibility failure — ground spawn + unmarked, unlit, 128u-wide entrance staircase under a dominant overhead silhouette; tester read the map as unplayable/spawned-below-course. Geometry verified present and walkable; failure is readability, not topology. Post-run interview: agent concurs, cites shadowed base plaza, silhouette pull, and rendered start-zone volume; console-only verification cannot see this failure class.** |
| `kz_slop_gemini31pro_v5` "Abandoned High-Rise" | Gemini 3.1 Pro | Antigravity subagent | all pass‡ | 454 min | ? | ? | 0 | load-only | 3359u climb, 7 legs × 6 checkpoints, scaling an abandoned high-rise. Used `vvis -fast` to avoid timeouts. Peak 85% at Leg 5. Validator PASS. Geometry natively valid, avoided skybox leak. |

\* dry-run gates were the spec v1 gates (no full-vvis requirement).

‡ timer start/checkpoint/stop accepted by runtime (no zone-definition errors);
live witness pending human playtest, per the gate's wording.

† end-zone timer stop structurally verified against geometry but not witnessed
live (no input injection in this harness); flagged honestly in the entry README
per the SPEC gate. Human judge certification pending.

Operator notes, wave 1 (2026-07-17): three parallel runs from template `4d8e312`
(spec v2.1), identical kickoff prompts, shared game install with wait-and-retry
rule — no observed contention. Subagents on this machine cannot inject input
into the game window, so "in-game verify" maxes out at load/console.log for all
local Claude runs; beatability remains analytic until human playtest.

Operator notes, wave 3 (2026-07-18): two parallel gen-4 runs from template
`15cd23a`, canonical prompt, launched 15:29 PDT as Claude Code subagents from a
Fable 5 operator session. Two hygiene findings: (1) the shared Momentum `maps/`
folder contained a previous run's **VMF source** (`kz_slop_gpt56terra_v1.vmf`)
plus a stray `test_minimal.vmf` — Haiku legitimately entered that folder per
TOOLCHAIN and read the foreign VMF. Operators must sweep foreign `.vmf`/debug
files from the install between waves; only `.bsp` + `.json` belong there. (2)
The operator briefly entered the running game window during Sonnet's run and
performed test jumps — potential `console.log` contamination. No effect on the
record: Sonnet claimed no witnessed timer events. Counted as 0 interventions
(nothing was unstuck), logged here for provenance.

**Naming note:** Wave 1 entries use `_v1` suffixes — an per-model attempt counter from
early spec drafts. From **spec generation 4** onward, the map suffix matches the
integer in SPEC.md (`_v3`, `_v4`, …). Generation 3 results above would be `_v3`
under current rules; names are unchanged here.
