# Song Book App — Project Context

Read this before starting any backlog task. It captures the *why* behind the architecture so
decisions don't get silently re-litigated or violated task by task.

## What this is

A web app for a church to store songs (lyrics, chords, keys, tempo, YouTube links), search them,
build "plans" (setlists) for a service, and run a live dual-view presentation (presenter view for
the operator, audience view fullscreened on a second monitor via HDMI) — like PowerPoint's
presenter view, but for worship lyrics/chords.

A native desktop app is a likely **future** addition (see "Desktop-readiness" below), but is
**not** built as part of this backlog. This backlog builds the web app and a backend that a
desktop client could plug into later without backend rework.

## Non-goals (explicitly out of scope)

- Multi-tenant / multi-church support. Single church, single Supabase project.
- Building the desktop app itself.
- CCLI license compliance automation — that's a real-world licensing responsibility for the
  church, not something the app enforces. There's a one-line manual reminder task about it, no
  code depends on it.
- Payment/giving features, attendance tracking, or anything outside the song book scope.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript), single app at repo root | No monorepo — decided against it since desktop-readiness is achieved by keeping logic out of Next.js entirely, not by repo layout. Revisit only when the desktop app build actually starts. |
| Hosting | Vercel | Connected to GitHub for preview deploys per PR + prod deploy on merge to main. |
| Auth | Clerk | Email magic link + SMS OTP both supported; which one(s) are actually enabled at launch is a launch-time decision, not an architecture one. |
| Database | Supabase (Postgres) | Real SQL + full-text search (`tsvector`), no NoSQL needed — the data is relational (songs, plans, plan_items, profiles). |
| Identity sync | Clerk → Supabase `profiles` table via webhook | Clerk is the source of truth for identity. Supabase RLS needs role data *inside Postgres* to enforce permissions, so a `profiles` table mirrors `clerk_user_id`, `role`, `display_name`, kept in sync via a Clerk webhook. |
| Auth↔DB trust | Clerk native Third-Party Auth integration (no JWT template) | The old "Supabase JWT template" approach was deprecated by Clerk on April 1, 2025 (it required sharing your Supabase JWT secret with Clerk). Current approach: activate the Supabase integration in Clerk (Clerk side) to get a Clerk domain, add Clerk as a Third-Party Auth provider in Supabase using that domain (Supabase side). No shared secret. The Supabase client is created with an `accessToken()` callback that returns `session.getToken()` (client) / `auth().getToken()` (server) — no manual JWT copying. |
| Realtime / live sync | Supabase Realtime, backed by a `live_session` table | See "Sync mechanism" below — this is the one deliberate course-correction from earlier planning. |
| Lyrics/chords format | ChordPro text stored in `songs.chordpro_body`, rendered client-side with `chordsheetjs` | Standard worship-software format. Plain lyrics with no chord tags is still valid ChordPro, so this costs nothing even if chord rendering isn't built first. |
| Testing | Vitest (unit) + Playwright (integration/e2e) | |
| CI | GitHub Actions | Runs lint, unit tests, and Playwright tests (against a local Supabase instance via the Supabase CLI/Docker) on every PR. |
| Package manager | pnpm | |

## The one hard architectural rule

**No business logic lives in Next.js API routes or Server Actions.** Anything beyond
page-rendering/UI concerns — validating a plan reorder, advancing the live session, running a
song search — must live in Postgres (RPC functions) or a Supabase Edge Function. Next.js is just
one client among (eventually) several; a desktop app can't call a Next.js Server Action, but it
*can* call a Postgres RPC or subscribe to Realtime the same way the web app does.

If a task's implementation is about to put real logic in a Next.js route handler, stop and put it
in a Postgres function instead, exposed via `supabase.rpc(...)`.

## Sync mechanism (course-corrected — read this if you remember an earlier BroadcastChannel plan)

Earlier planning considered `BroadcastChannel` (same-device browser tabs) as the first
implementation, with Supabase Realtime as a later upgrade for remote/cross-device control. That
plan is **superseded**: `BroadcastChannel` is a browser-only API and a native desktop client can't
use it at all, so it would have meant building the sync logic twice.

Canonical mechanism, built once:

- A `live_session` table holds the single row of truth: current `plan_id`, current
  `plan_item_id`, `updated_by`, `updated_at`.
- The presenter view calls the `advance_live_session` RPC to change it.
- The audience view (and, later, a desktop client) subscribes to that row via Supabase Realtime
  and renders whatever it says.
- This works identically whether presenter and audience are two tabs on the same laptop, or two
  entirely different devices/processes.

Offline resilience (wifi dropping mid-service) is handled *separately*, by caching the active
plan's song data client-side (IndexedDB) when a plan goes live — not by the sync transport itself.

## Roles

Three roles, stored in `profiles.role`, enforced via RLS policies. The native Clerk↔Supabase
integration only puts the Clerk user ID in the JWT (`auth.jwt()->>'sub'`) — it does **not**
automatically expose custom fields like role. So RLS policies resolve role via a subquery: match
`auth.jwt()->>'sub'` against `profiles.clerk_user_id`, then read `profiles.role`. (Alternative
would be a custom Clerk session claim, but that duplicates data we already mirror into `profiles`
via the webhook — no reason to maintain both.)

- **admin** — full access, including user role management.
- **editor** — can create/edit/delete songs and plans, cannot manage users.
- **member** — read-only on songs/plans, but *can* write to `live_session` (running a plan during
  a service shouldn't require edit rights — a musician or sound-booth volunteer who didn't build
  the plan still needs to be able to advance it).

## Data model (conceptual — DDL lives in migration tasks, not here)

- `profiles` — mirrors Clerk identity: `clerk_user_id`, `role`, `display_name`, timestamps.
- `songs` — `title`, `chordpro_body`, `default_key`, `tempo_bpm`, `youtube_url`, `tags`,
  generated `search` tsvector column, `created_by`/`updated_by` → `profiles`, timestamps.
- `plans` — `name`, `service_date`, `created_by`, timestamps.
- `plan_items` — `plan_id` FK, `song_id` FK, `position`, `key_override`, `notes`.
- `live_session` — singleton-ish row: `current_plan_id`, `current_plan_item_id`, `updated_by`,
  `updated_at`.

## Desktop-readiness — what "future-proofed" actually means here

The backend is designed so a future native desktop app (Electron/Tauri or fully native) could:

1. Authenticate via Clerk (Clerk has SDKs/flows usable outside pure web contexts; exact approach
   is a decision for when that work starts).
2. Read/write songs, plans, and `live_session` via the same Supabase client libraries and RPCs the
   web app uses — no separate API to build.
3. Subscribe to `live_session` via Supabase Realtime for live sync, same as the web audience view.

The desktop app's actual motivation (per your answer) is more reliable OS-level multi-monitor
placement and offline handling than browsers give consistently — which is a *client-side* concern
it solves natively, not something that requires backend changes beyond what's listed above.

A documentation task (A49 in the backlog) captures this contract explicitly once the relevant
tables/RPCs exist, so a future session (or a different tool) can pick up desktop work without
re-deriving it.

## Environments

Single Supabase project, single Vercel project to start. No separate staging environment yet —
Vercel's preview deploys per-PR cover most of that need at this scale. Revisit if the church wants
a true staging DB before go-live.
