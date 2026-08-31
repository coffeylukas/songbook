# Multi-Agent Workflow

How this repo's backlog gets built: an orchestrator command picks up tasks from
[BACKLOG.md](BACKLOG.md) and dispatches implementer subagents to build them, one task (or a
handful of independent ones) at a time.

## Pieces (already created, nothing left to set up)

| File | Role |
|---|---|
| [`.claude/commands/next-task.md`](../.claude/commands/next-task.md) | The orchestrator. Invoked as `/next-task` inside a Claude Code session. Picks the next unblocked task(s), claims them, dispatches implementers, verifies, reviews, merges, updates `BACKLOG.md`. |
| [`.claude/agents/task-implementer.md`](../.claude/agents/task-implementer.md) | The worker subagent type. Builds exactly one task's code + tests. Never edits `BACKLOG.md` itself — only the orchestrator does, after review, so two agents can't race on the same file. |
| `/code-review` (already in your setup) | Reused for general correctness/simplification review of each task's diff — not reinvented here. |

No install step, no external tooling — this is entirely Claude Code's native subagent (`Agent`
tool) and slash-command features, pointed at files already in this repo.

## How to run it

Start a normal session in the repo root:

```bash
cd ~/song-book-app
claude
```

**Work the next unblocked task automatically:**

```
/next-task
```

**Work a specific task:**

```
/next-task A1
```

**Work several independent tasks in parallel** (the orchestrator will refuse to parallelize tasks
that aren't actually independent, so it's safe to over-ask):

```
/next-task A2 A3 A4
```

**Run true multi-process parallelism** (multiple Claude Code sessions at once, not just multiple
subagents inside one): open another terminal tab, `cd` into the repo (or into a separate
`git worktree add ../song-book-app-worker2 main` if you want a fully separate working copy), run
`claude`, and call `/next-task` there too. Coordination is just `docs/BACKLOG.md` plus git — each
session claims a task by committing an `in-progress` status update before starting work, so a
sibling session re-reading the file won't grab the same one. This only works if each session
re-reads the file fresh rather than trusting its own memory of it — the orchestrator prompt
already says to do that.

## Sequencing reality

Epic 0 (project scaffolding, `A1`–`A9`) is almost entirely sequential — `A1` gates nearly
everything else, so there's not much to parallelize until it's done. Real parallelism opens up
from Epic 1 onward, where independent migrations, RPCs, and UI pieces can build side by side. Run
`/next-task` one task at a time through Epic 0, then start batching once there's more than one
genuinely independent `todo` task available.

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
especially early on, rather than assuming every merge is exactly right. If you find the
orchestrator or implementer consistently missing something, the fix is to make the rule more
explicit in `CLAUDE.md`, not to babysit every task by hand.
