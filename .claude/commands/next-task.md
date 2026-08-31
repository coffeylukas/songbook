---
description: Pick up the next unblocked backlog task(s) from GitHub Issues, implement via subagent(s), review, merge, and update the issue/Project board.
argument-hint: [issue-number ...]
---

You are orchestrating work tracked in GitHub Issues on this repo (see
[docs/MULTI_AGENT_WORKFLOW.md](../docs/MULTI_AGENT_WORKFLOW.md)). Read `CLAUDE.md` and
`docs/CONTEXT.md` first if you haven't already this session. `docs/BACKLOG.md` is retired — don't
read task state from it.

## 1. Pick target task(s)

- If arguments were given (`$ARGUMENTS`), treat each as an explicit GitHub issue number.
- Otherwise, list open issues: `gh issue list --label type:autonomous --state open --json
  number,title,body,labels`. For each, read its body's "**Depends on:** #N, #M" line (if present)
  and check that every referenced issue is `closed`
  (`gh issue view <n> --json state`). An issue with no unresolved dependency is a candidate. Skip
  anything labeled `status:blocked` — a human needs to clear that label first. Pick the
  lowest-numbered candidate. Only batch more than one at a time if they're genuinely
  independent — check their dependency lists; don't parallelize tasks that touch overlapping
  files or depend on each other.
- If nothing qualifies, report exactly what's blocking (which issues, waiting on which open
  dependency or manual `type:manual` issue) and stop. Never work a `type:manual` issue yourself —
  those are the user's; if everything open is `type:manual`, say so and stop.

## 2. Claim it

Re-fetch the issue fresh right before claiming (`gh issue view <n>`) — don't trust an earlier read
in this conversation, another session may have moved since. Move the Project board item's Status
to "In Progress"
(`gh project item-list <project-number> --owner <owner> --format json` to find the item, then
`gh project item-edit --id <item-id> --project-id <project-node-id> --field-id <status-field-id>
--single-select-option-id <in-progress-option-id>` — resolve those ids once via `gh project
field-list` and reuse them for the session). This board move *is* the claim — it's what lets a
second, independently-running `/next-task` session avoid grabbing the same issue.

## 3. Dispatch

**Single task:** spawn one `task-implementer` subagent (Agent tool, `subagent_type:
"task-implementer"`) in the current working tree, passing the issue number and its full body
(`gh issue view <n> --json body,title`).

**Multiple independent tasks:** spawn one `task-implementer` per issue in the same message, each
with `isolation: "worktree"` so they can't collide on files. Wait for all to report back before
moving to review. Keep the batch small (a handful at most).

## 4. Verify

For each finished task, before treating it as reviewable:
- Run whatever of `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` applies to what changed
  (skip whichever doesn't exist yet).
- Re-read the issue's Definition of Done against the actual diff and test output yourself — the
  implementer's self-report is a starting point, not sufficient on its own.
- Check the diff against `CLAUDE.md`'s hard rule (no business logic in Next.js routes/Server
  Actions) yourself.

Then run `/code-review` (medium effort is a reasonable default) against the diff for general
correctness/simplification issues. Treat CONFIRMED findings as blocking; use judgment on
PLAUSIBLE ones relative to the task's stakes.

## 5. Resolve

**If verification and review pass:** merge into the main branch (from a worktree:
`git merge --squash task/<id>` from the main worktree, then commit with a message referencing the
issue, e.g. `Closes #<n>`), close the issue
(`gh issue close <n> --comment "<summary of what landed, how the DoD was verified>"`), and move
its Project board item to "Done". Clean up the worktree
(`git worktree remove <path>`, delete the merged branch).

**If something failed:** leave the issue open and its board item on "In Progress", and comment on
the issue (`gh issue comment <n> --body "..."`) explaining what's blocking — a failed test, a
review finding, a Definition-of-Done gap, or a bad assumption discovered in the task itself.
Don't close it to move on, and don't silently solve it a different way without saying so. If the
issue itself turns out to be wrong (bad assumption baked into its body), edit the issue body to
correct it (`gh issue edit`) rather than leaving future readers with stale instructions.

## 6. Report

Summarize for the user: which issue(s) closed (with links to changed files and the issue), which
are blocked and on what, and what the next unblocked task will be once the blocker clears.
