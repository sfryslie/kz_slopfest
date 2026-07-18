# Canonical kickoff prompt (operator doc — not part of the frozen spec)

Every entry, in every harness, gets exactly this prompt with the three
placeholders filled. Do not embellish, hint, or add context per-model — prompt
parity is what makes entries comparable.

## Operator procedure

1. Cut a worktree from the current template commit (see SPEC.md for the generation
   and commit history for the hash; generation **3** template was `1a0c5a6`;
   generation **4** requires a new template commit after this spec lands on `main`):

   ```
   cd C:\Users\shfry\Documents\GitHub\kz_slopfest
   git worktree add ..\kz_slopfest-<name> <template-hash> -b entry/<name>-v<gen>
   ```

2. `<name>` is the versioned short name per SPEC.md — lowercase, no dots,
   includes the model version (`gemini3pro`, `gpt5codex`, `grok45`, `composer25`).
   Use the underlying model's name, not the IDE brand.
3. `<gen>` is the **spec generation** from the header of SPEC.md in that worktree
   (e.g. `4` → branch `entry/composer25-v4`, map `kz_slop_composer25_v4`).
3. Launch the harness **in that worktree folder**, in whatever auto-approve /
   full-auto mode it offers (it must be able to run shell commands to compile).
4. Paste the prompt below. Note the wall-clock start time.
5. Hands off. Every time you unstick it — answer, hint, retry, path fix —
   tally one intervention. The operator's tally overrides the agent's
   self-report.
6. When it finishes: note end time, record whatever usage/cost the harness
   reports, and add the row to `scoring/results.md`. Push the entry branch.

## The prompt

```
You are a competitor in kz_slopfest, a benchmark where AI coding agents each
build a KZ map for Momentum Mod from a frozen spec.

Your working directory is: C:\Users\shfry\Documents\GitHub\kz_slopfest-<name>
Your assigned model name is: <name>
Your spec generation is: <gen>  (map suffix — e.g. 4 → kz_slop_<name>_v4)

Start by reading SPEC.md, TOOLCHAIN.md, ASSETS.md, and RULES.md at the repo root, in
full. Then produce your entry exactly as the spec directs. Follow the rules
precisely, including the plan-first requirement and the honesty clauses.

Practical notes:
- You are on git branch entry/<name>-v<gen> in a dedicated worktree. Commit your
  work as you go on this branch. Do NOT push, and do not touch anything outside
  your worktree except the Momentum Mod install paths that TOOLCHAIN.md tells
  you to copy build artifacts into.
- The Momentum install may be shared with other agents on this machine. Follow
  TOOLCHAIN.md "Shared install and parallel runs": run full vvis/vrad one agent
  at a time; wait 2-3 minutes and retry if compiles OOM or the game won't launch.
- You may launch the game windowed to verify, per RULES.md #6. Prefer -novid
  -windowed and close the game when done.
- When you are finished, report back: whether every acceptance gate in SPEC.md
  passes, anything in the spec docs you found ambiguous, wrong, or missing
  (also record this in your README's Spec feedback section per RULES.md #2),
  and a short description of the map you built.
```
