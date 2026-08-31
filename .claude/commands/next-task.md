---
description: Pick up the next unblocked backlog task(s), implement via subagent(s), review, merge, and update status.
argument-hint: [task-id ...]
---

You are orchestrating work on this repo's backlog (`docs/BACKLOG.md`). Read `CLAUDE.md` and
`docs/CONTEXT.md` first if you haven't already this session.

## 1. Pick target task(s)

- If arguments were given (`$ARGUMENTS`), treat each as an explicit autonomous task ID to work
  (e.g. `A2 A3 A4`).
- Otherwise, scan `docs/BACKLOG.md`'s Autonomous section for `todo` tasks whose *every*
  dependency (manual `M*` or autonomous `A*`) is marked `done`. Pick the lowest-numbered one. Only
  batch more than one at a time if they're mutually independent — check their Dependencies fields;
  don't parallelize tasks that touch overlapping files or depend on each other.
- If nothing qualifies (every remaining `todo` task is blocked on a manual `M*` task), report
  exactly what's blocking and stop. Never attempt a manual task yourself — those are the user's.

## 2. Claim it

Re-read `docs/BACKLOG.md` fresh right before claiming (not from earlier in this conversation —
another session may have moved since). For each task about to be dispatched, edit its
`**Status:**` line to `in-progress` and commit that alone
(`git commit -m "A13: claim task"`) before spawning any agent. This is the lock that lets a
second, independently-running `/next-task` session (another terminal, another worktree) avoid
grabbing the same task.

## 3. Dispatch

**Single task:** spawn one `task-implementer` subagent (Agent tool, `subagent_type:
"task-implementer"`) in the current working tree, passing the task's full entry text copied from
`docs/BACKLOG.md` plus its ID.

**Multiple independent tasks:** spawn one `task-implementer` per task in the same message, each
with `isolation: "worktree"` so they can't collide on files. Wait for all to report back before
moving to review — don't review a task whose implementer hasn't finished. Keep the batch small
(a handful at most) — this is meant to parallelize genuinely independent work, not to rush the
whole backlog at once.

## 4. Verify

For each finished task, before treating it as reviewable:
- Run whatever of `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` applies to what changed
  (skip whichever doesn't exist yet — Epic 0's tasks bootstrap these).
- Re-read the task's Definition of Done against the actual diff and test output yourself. The
  implementer's self-report is a starting point, not sufficient on its own.
- Check the diff against `CLAUDE.md`'s hard rule (no business logic in Next.js routes/Server
  Actions) yourself — this is exactly the kind of thing worth double-checking rather than trusting.

Then run `/code-review` (medium effort is a reasonable default) against the diff for general
correctness/simplification issues. Treat CONFIRMED findings as blocking; use judgment on
PLAUSIBLE ones relative to the task's stakes.

## 5. Resolve

**If verification and review pass:** merge into the main branch (from a worktree:
`git merge --squash task/<id>` from the main worktree, then commit with a message referencing the
task ID and summarizing what landed), set the task's `**Status:**` to `done` in
`docs/BACKLOG.md`, commit that, and clean up
(`git worktree remove <path>`, delete the merged branch).

**If something failed:** leave `**Status:**` as `in-progress`, don't merge, and report clearly
what's blocking — a failed test, a review finding, a Definition-of-Done gap, or a bad assumption
discovered in the task itself. Don't mark it done to move on, and don't silently solve it a
different way without saying so.

## 6. Report

Summarize for the user: which task(s) landed (with links to changed files), which are blocked and
on what, and what the next unblocked task will be once the blocker clears.
