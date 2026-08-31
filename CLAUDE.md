# CLAUDE.md

Guidance for Claude Code sessions working in this repo. Read [docs/CONTEXT.md](docs/CONTEXT.md)
first — it has the full architecture rationale. This file is the "how to work" companion.

## Multi-agent workflow

Autonomous tasks are normally built via `/next-task` (see
[docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md)), which dispatches
`task-implementer` subagents per task. Ground rule: **only the orchestrator (`/next-task`)
closes GitHub issues or moves the Project board**, and only after review — an implementer
subagent (or you, working a task by hand outside the workflow) reports what changed but doesn't
mark its own issue done. This prevents a task being marked complete before it's actually been
checked against its Definition of Done.

## Working model

- Work is tracked as **GitHub Issues** (labeled `type:manual` / `type:autonomous` / `epic:N-...`)
  on a Project board (Status: Todo / In Progress / Done). `docs/BACKLOG.md` is retired — don't
  read task state from it.
- Pick up **one task at a time**, in dependency order — an issue's body has a "Depends on: #N"
  line. Don't start a task whose dependencies (including manual ones) aren't closed.
- If an autonomous task turns out to depend on a manual (`type:manual`) issue that isn't closed
  yet (e.g. no Supabase project exists), stop and say so rather than guessing at credentials/config.
- When a task is finished: close its issue and move its board item to Done (the orchestrator does
  this, not the implementer — see the ground rule above), write tests per its Definition of Done,
  and commit with a message referencing the task ID (e.g. `A13: add songs table migration`).
- If you discover a task's plan is wrong once you're inside it (bad assumption, missing
  dependency), edit the issue body to reflect reality (`gh issue edit`) — don't silently diverge
  from what's written and leave future readers with stale instructions.

## The rule that matters most

**No business logic in Next.js API routes or Server Actions.** Validation, search, plan
reordering, live-session advancement — all of it belongs in Postgres (RPC functions/triggers) or a
Supabase Edge Function, called via `supabase.rpc(...)` or Realtime. Next.js is a UI client, not
the backend. See "The one hard architectural rule" in CONTEXT.md for why — this directly serves
the future desktop client.

## Conventions

- **Package manager:** pnpm. Don't introduce npm/yarn lockfiles.
- **Language:** TypeScript, strict mode.
- **Framework:** Next.js App Router.
- **Unit tests:** Vitest. Colocate as `*.test.ts(x)` next to the code under test.
- **Integration/e2e tests:** Playwright, in `e2e/`.
- **DB migrations:** Supabase CLI migrations under `supabase/migrations/`. Never hand-edit schema
  directly against a hosted project — write a migration.
- **Chords/lyrics:** stored as ChordPro text (`songs.chordpro_body`), rendered client-side with
  `chordsheetjs`. Don't invent a parallel chord storage format.

## Commands

```bash
pnpm dev              # local dev server (port 3000)
pnpm build            # production build
pnpm start            # serve the production build
pnpm lint             # eslint
pnpm format           # prettier --write
pnpm format:check     # prettier --check (what CI runs)
pnpm test             # unit tests (Vitest, single run)
pnpm test:watch       # unit tests in watch mode
pnpm test:e2e         # integration tests (Playwright, auto-starts a dev server on port 3100)
pnpm test:e2e:install # one-time: download the Chromium binary Playwright needs
supabase start        # local Supabase (Postgres + Realtime) via Docker — not set up until A6
```

**Prerequisites, both easy to trip over:**

- **Node 22 (>=20.9) and pnpm via corepack.** The system `node` on this machine is v14 and `pnpm`
  is not on `PATH`; Next 16 will not run under it. Activate with
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22; corepack enable`.
- **Playwright browsers are not installed by `pnpm install`.** On a fresh clone (and in CI),
  `pnpm test:e2e` fails with "Executable doesn't exist" until `pnpm test:e2e:install` has been run
  once. A8/A9 need an explicit install step in the workflow.

## Environment variables

The schema lives in [`env.ts`](env.ts) (`@t3-oss/env-nextjs` + zod) and every variable name is
documented in [`.env.example`](.env.example) — treat those two as the source of truth, don't keep
a second list here. `env.ts` is imported from `next.config.ts`, so a missing or malformed value
fails `pnpm dev`/`pnpm build` immediately with the variable named.

- **Client** (`NEXT_PUBLIC_`-prefixed, safe in the browser bundle):
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Server-only** (never expose to the client): `CLERK_SECRET_KEY`, `SUPABASE_SECRET_KEY`.
- **Not in the schema:** the Supabase DB password. It's a Supabase CLI / direct-Postgres
  credential, not part of the API key system, and no app code reads it.

Add a variable by editing `env.ts` _and_ `.env.example` together. Put it in the `server` block
unless the browser genuinely needs it — a secret in the `client` block gets inlined into the
JavaScript shipped to every visitor.

Real values live in `.env.local` (gitignored) and Vercel/GitHub Actions secrets — never in this
repo. `SKIP_ENV_VALIDATION=1` bypasses validation for CI builds and e2e runs from a clean
checkout; never set it for a real deployment.

## Things Claude should NOT do here

- Don't create the GitHub repo, Vercel project, Supabase project, or Clerk application — those are
  manual tasks the user owns (account/billing reasons). If a task needs one of these to exist and
  it doesn't yet, stop and ask.
- Don't add a second sync mechanism (e.g. BroadcastChannel) "for speed" — the `live_session` +
  Supabase Realtime approach is deliberate; see CONTEXT.md's "Sync mechanism" section before
  changing it.
- Don't restructure into a monorepo preemptively — that was a deliberate decision to defer until
  the desktop app work actually starts.
