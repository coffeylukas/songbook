# CLAUDE.md

Guidance for Claude Code sessions working in this repo. Read [docs/CONTEXT.md](docs/CONTEXT.md)
first — it has the full architecture rationale. This file is the "how to work" companion.

## Working model

- Work is tracked in [docs/BACKLOG.md](docs/BACKLOG.md), split into **Manual** (the user does
  these — accounts, dashboard config) and **Autonomous** (Claude does these) tasks.
- Pick up **one task at a time**, in dependency order. Don't start a task whose dependencies
  (including manual ones) aren't marked done.
- If an autonomous task turns out to depend on a manual task that isn't done yet (e.g. no Supabase
  project exists), stop and say so rather than guessing at credentials/config.
- When a task is finished: update its status in `docs/BACKLOG.md` (`todo` → `done`), write tests
  per its Definition of Done, and commit with a message referencing the task ID (e.g.
  `A13: add songs table migration`).
- If you discover a task's plan is wrong once you're inside it (bad assumption, missing
  dependency), fix the backlog entry to reflect reality — don't silently diverge from what's
  written.

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

Populated once A1 (project scaffold) is done. Until then, this section is a placeholder:

```bash
pnpm dev          # local dev server
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # integration tests (Playwright)
pnpm lint         # eslint
pnpm build        # production build
supabase start    # local Supabase (Postgres + Realtime) via Docker
```

## Environment variables

Populated once A5 (env validation) is done. Expect, at minimum: Clerk publishable/secret keys,
Supabase URL, Supabase **Publishable key** (client-safe — replaces the legacy `anon` key) and
Supabase **Secret key** (server-only, never exposed to the client — replaces the legacy
`service_role` key), plus the Supabase DB password (a separate mechanism, needed for CLI/direct
Postgres access, not part of the API key system). Real values live in `.env.local` (gitignored)
and Vercel/GitHub Actions secrets — never in this repo.

## Things Claude should NOT do here

- Don't create the GitHub repo, Vercel project, Supabase project, or Clerk application — those are
  manual tasks the user owns (account/billing reasons). If a task needs one of these to exist and
  it doesn't yet, stop and ask.
- Don't add a second sync mechanism (e.g. BroadcastChannel) "for speed" — the `live_session` +
  Supabase Realtime approach is deliberate; see CONTEXT.md's "Sync mechanism" section before
  changing it.
- Don't restructure into a monorepo preemptively — that was a deliberate decision to defer until
  the desktop app work actually starts.
