# Multi-Agent Workflow

How this repo's backlog gets built: an orchestrator command picks up tasks from **GitHub Issues**
and dispatches implementer subagents to build them, one task (or a handful of independent ones)
at a time. `docs/BACKLOG.md` is retired — see [its note](BACKLOG.md) — GitHub is now the single
source of truth for task status.

## Pieces

| Thing | Role |
|---|---|
| GitHub Issues, labeled `type:manual` / `type:autonomous` / `epic:N-...` | One issue per task. Body holds the description, Definition of Done, and a "Depends on: #N" line. |
| The **Song Book App** Project (v2) board | Kanban view — Status field: Todo / In Progress / Done. (No "Blocked" column — see below.) |
| [`.claude/commands/next-task.md`](../.claude/commands/next-task.md) | The orchestrator. Invoked as `/next-task`. Picks the next unblocked issue(s), claims via the board, dispatches implementers, verifies, reviews, merges, closes the issue. |
| [`.claude/agents/task-implementer.md`](../.claude/agents/task-implementer.md) | The worker subagent. Builds one issue's code + tests. Never closes the issue or touches the board itself. |
| [`scripts/sync_backlog_to_github.py`](../scripts/sync_backlog_to_github.py) | The one-time migration script that created all of this from `docs/BACKLOG.md`. Re-runnable (idempotent on labels/milestones) if you ever need to migrate `docs/FUTURE_FEATURES.md` the same way later. |
| `/code-review` (already in your setup) | Reused for general correctness/simplification review of each task's diff. |

## Why no "Blocked" board column

GitHub Projects ships a three-option Status field (Todo / In Progress / Done) by default, and
extending a single-select field's options isn't something the `gh` CLI does cleanly. Rather than
fight that, a blocked task just gets a `status:blocked` label and stays in Todo — the orchestrator
skips labeled issues when picking work, and a human clears the label once the blocker's resolved.

## How to run it

```bash
cd ~/song-book-app
claude
```

**Work the next unblocked issue automatically:**

```
/next-task
```

**Work a specific issue:**

```
/next-task 13
```

**Work several independent issues in parallel** (the orchestrator refuses to parallelize issues
that aren't actually independent, so it's safe to over-ask):

```
/next-task 14 15 16
```

**Run true multi-process parallelism** (multiple Claude Code sessions at once): open another
terminal tab, `cd` into the repo (or a separate `git worktree add ../song-book-app-worker2 main`
for a fully separate working copy), run `claude`, call `/next-task` there too. Coordination is the
Project board's Status field — each session moves an item to "In Progress" as its claim before
starting work, so a sibling session re-reading the board won't grab the same one. This depends on
each session re-fetching current state rather than trusting its own memory of it — the
orchestrator prompt already says to do that.

## Sequencing reality

Epic 0 (project scaffolding) is almost entirely sequential — issue `A1` (the Next.js scaffold)
gates nearly everything else. Run `/next-task` one at a time through Epic 0; real parallelism
opens up from Epic 1 onward, once independent migrations, RPCs, and UI pieces exist side by side.

## If a worktree gets abandoned or stuck

```bash
git worktree list
git worktree remove --force <path>
git branch -D task/<id>   # only after confirming its work isn't needed
```

## Trust, but check in

This loop runs your architectural rules (RLS, ChordPro storage, no-logic-in-Next.js, etc.)
consistently because they're written down in `CLAUDE.md`/`CONTEXT.md` and the orchestrator is
told to check the diff against them — but it's still worth spot-checking merged commits yourself,
especially early on. If the orchestrator or implementer keeps missing something, fix the rule in
`CLAUDE.md` rather than babysitting every task by hand.
