# Scoring rubric

## Layer 0 — acceptance gates (pass/fail)

The checklist at the bottom of [SPEC.md](../SPEC.md). An entry that fails any
gate is recorded as **DNF** with a note on where it died. DNFs are still
interesting data — record how far the run got.

## Layer 1 — judged scores (humans, 1–5 each)

Scored by the maintainers after actually playing the map. Judges score
independently, then average.

| Category | 1 | 5 |
|---|---|---|
| **Theme & aesthetics** | Gray boxes with a README excuse | Coherent look; you can tell the theme without reading it |
| **Difficulty curve** | Flat, spiky, or backwards | Each stage teaches the next; finale feels earned |
| **Fun** | Chore | "One more run" |

## Layer 2 — agentic metrics (recorded per run, not summed into a score)

| Metric | How |
|---|---|
| Wall-clock time | Run start to final commit |
| Cost / tokens | From the harness, where reported |
| Human interventions | Count from README + operator's notes (operator's count wins) |
| Failed compiles | Count of vbsp/vvis/vrad/zonemaker failures before success |
| In-game verification | yes / no (from README, per RULES.md #6) |
| Plan fidelity | Short judged note: how much of PLAN.md survived into the map |

## Results

One row per entry in `results.md`: gates passed, judged averages, Layer 2
metrics, and a one-line editorial verdict. There is deliberately no single
composite number — a cheap unbabysat 3/5 map and an expensive hand-held 5/5 map
are both winners of different things, and the table should show that.
