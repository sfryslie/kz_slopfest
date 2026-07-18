# Results

Judged scores (theme / difficulty curve / fun) pending human playtests — see
[RUBRIC.md](RUBRIC.md). Layer 0 gates and Layer 2 agentic metrics recorded below.

| Entry | Model | Harness | Gates | Wall time | Tokens | Tool calls | Interventions | In-game verify | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `kz_slop_sonnet_v1` "Canyon Switchback" | Sonnet 5 | Claude Code subagent | all pass* | 13.5 min | ~140k | 49 | 0 | load-only | **Dry run, contaminated** — legally read ancestor repo via spec v1 loophole; used `vvis -fast` (legal at the time). Not a clean score. **Playtest: no required jumps — fully walkable** (terrain fill bridged the course); prompted spec v3 req 7. |
| `kz_slop_opus48_v1` "Tidewater Ascent" | Opus 4.8 | Claude Code subagent | all pass | 16.6 min | ~105k | 47 | 0 | load-only | Found + fixed own off-by-one stage-zone bug. Cheapest clean pass. **Playtest: working end zone; no killbox** — fall-offs strand the player (spec v3 req 8). |
| `kz_slop_sonnet5_v1` "Cape Ascent" | Sonnet 5 | Claude Code subagent | ⚠️ end-zone fail (playtest) | 25.2 min | ~199k | 92 | 0 | load-only | Read `momentum.fgd` for real entity names; validated winding + `vertices_plus` on a throwaway test map. Flagged its timer gate as inferred, not witnessed — **correctly: playtest found no working end zone.** |
| `kz_slop_haiku45_v1` | Haiku 4.5 | Claude Code subagent | **DNF** | 21.4 min | ~111k | 93 | 0 | load-only (empty map) | Real geometry never survived vbsp ("no visible sides" — plane winding suspected). Honest failure report. Self-reported difficulty fractions also non-monotonic (81.5/83.5/84.3/**75.6**). Installed bsp is a 76KB empty husk. |

\* dry-run gates were the spec v1 gates (no full-vvis requirement).

Operator notes, wave 1 (2026-07-17): three parallel runs from template `4d8e312`
(spec v2.1), identical kickoff prompts, shared game install with wait-and-retry
rule — no observed contention. Subagents on this machine cannot inject input
into the game window, so "in-game verify" maxes out at load/console.log for all
local Claude runs; beatability remains analytic until human playtest.
