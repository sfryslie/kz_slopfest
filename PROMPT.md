# Canonical kickoff prompt (operator doc — not part of the frozen spec)

Every entry, in every harness, gets exactly this prompt with the three
placeholders filled. Do not embellish, hint, or add context per-model — prompt
parity is what makes entries comparable.

## Operator procedure

1. Cut a worktree from the current template commit (check the memory/README for
   the hash; as of spec v3.1 it is `1a0c5a6`):

   ```
   cd C:\Users\shfry\Documents\GitHub\kz_slopfest
   git worktree add ..\kz_slopfest-<name> 1a0c5a6 -b entry/<name>-v<n>
   ```

2. `<name>` is the versioned short name per SPEC.md — lowercase, no dots,
   includes the model version (`gemini3pro`, `gpt5codex`, `grok4`, `glm5`,
   `kimik2`). Use the underlying model's name, not the IDE brand.
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
Your entry version is: <n>

Start by reading SPEC.md, TOOLCHAIN.md, and RULES.md at the repo root, in
full. Then produce your entry exactly as the spec directs. Follow the rules
precisely, including the plan-first requirement and the honesty clauses.

Practical notes:
- You are on git branch entry/<name>-v<n> in a dedicated worktree. Commit your
  work as you go on this branch. Do NOT push, and do not touch anything outside
  your worktree except the Momentum Mod install paths that TOOLCHAIN.md tells
  you to copy build artifacts into.
- You may launch the game windowed to verify, per RULES.md #6. The shared game
  install may be in use by another process; if the game fails to launch or is
  already running, wait 2-3 minutes and retry. Prefer -novid -windowed and
  close the game when done.
- When you are finished, report back: whether every acceptance gate in SPEC.md
  passes, anything in the spec docs you found ambiguous, wrong, or missing
  (also record this in your README's Spec feedback section per RULES.md #2),
  and a short description of the map you built.
```
