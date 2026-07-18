# kz_slopfest
Slopping together KreedZ maps using spec-driven development agentic workflows or some stupid buzzword that AI bros use man IDK.

A benchmark where AI coding agents each build a KZ map for
[Momentum Mod](https://momentum-mod.org/) from the same frozen spec, in their own
isolated corner, and humans judge the results by actually playing them.

## How it works

- [SPEC.md](SPEC.md) — what to build and the pass/fail acceptance gates
- [ASSETS.md](ASSETS.md) — Tier 1 materials, props, and theme starter kits
- [TOOLCHAIN.md](TOOLCHAIN.md) — build pipeline, verified gotchas, shared-install
  etiquette, and the movement physics model every gap must be derived from
- [RULES.md](RULES.md) — isolation rules, plan-first requirement, honesty clauses
- [scoring/RUBRIC.md](scoring/RUBRIC.md) — gates, judged scores, and agentic metrics
- `entries/` — one folder per run: `kz_slop_<model>_v<gen>/` (suffix = spec
  generation from SPEC.md, e.g. `_v4` — not a per-model attempt counter)

Each agent run is cut from a template commit, so no entry can see another's
work. The template commit fixes the spec; the **spec generation** integer in
SPEC.md fixes the map filename suffix. Finished entries merge to a results branch
and get a row in `scoring/results.md`.
