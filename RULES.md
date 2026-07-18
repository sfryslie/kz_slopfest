# Rules of engagement

These rules exist so entries are comparable. Breaking them doesn't make your map
better, it makes your run unscoreable.

1. **Stay in your lane.** Create and modify files **only** inside
   `entries/kz_slop_<model>_v<n>/`. Do not read, copy, or reference any other
   entry folder. (Runs are cut from a template commit, so there shouldn't be
   anything else to find — don't go looking.)
2. **Don't touch the spec.** `SPEC.md`, `TOOLCHAIN.md`, `RULES.md`, and
   `scoring/` are frozen. If you think the spec is wrong or ambiguous, note it
   in your README under **Spec feedback** and make a reasonable call — don't
   edit the documents.
3. **Plan first.** Commit `PLAN.md` before any generator code exists. The
   plan-versus-shipped delta is part of the evaluation.
4. **Generator or nothing.** The shipped `.vmf` must be exactly what your
   generator emits. No hand edits, no Hammer.
5. **Log honestly.** Every time a human had to unstick you — answered a
   question, fixed a path, restarted a tool, gave a hint — record it in your
   README's **Interventions** section. Zero interventions is a claim; make it
   truthfully.
6. **Use what your harness gives you.** If you can launch the game and read
   `console.log`, do — full verification is encouraged, not cheating. Note in
   your README whether you had in-game verification or compile-only.
7. **Commit as you go.** Meaningful commits with honest messages, on your own
   branch. Your commit history is part of the record.
