# Backlog

Status values: `todo`, `in-progress`, `blocked`, `done`. Update in place as work happens.

See [CONTEXT.md](CONTEXT.md) for architecture rationale referenced throughout.

---

## Manual tasks (you)

These require account ownership/billing decisions and can't be done autonomously.

### M1 — Create GitHub repository
- **Status:** done
- **Description:** Create a new, empty, private GitHub repository for this project under your
  account.
- **Definition of done:** Repo exists; you've shared the repo URL (or given push access) so A7 can
  add it as a remote and push the local history.
- **Dependencies:** none.

### M2 — Create Vercel project
- **Status:** in-progress
- **Description:** Create a Vercel account (if needed) and a new project. Once M1's repo has code
  pushed (after A7), import it via "Add New Project" and select Next.js as the framework preset.
- **Definition of done:** Vercel project exists and is linked to the GitHub repo; preview deploys
  trigger on PRs.
- **Dependencies:** M1, A7.
- **Note:** Account/project shell exists; full DoD (linked to repo, preview deploys firing) can't
  complete until A7 pushes actual code.

### M3 — Create Supabase project
- **Status:** done
- **Description:** Create a Supabase account/project. Pick a region close to the church. Note down:
  Project URL, **Publishable key** (`sb_publishable_...`), **Secret key** (`sb_secret_...`), and
  DB password (still a separate mechanism from the API keys — needed for the Supabase CLI/direct
  Postgres connections, e.g. `supabase link`, migrations). The legacy `anon`/`service_role` JWT
  keys still exist and work, but the Publishable/Secret keys are current — use those for anything
  new (see CONTEXT.md's key naming note).
- **Definition of done:** Project created, credentials saved somewhere secure (password manager),
  shared with Claude via env vars (not pasted in chat) when needed for later tasks.
- **Dependencies:** none.

### M4 — Create Clerk application
- **Status:** done
- **Description:** Create a Clerk account/application. Enable **Email** (magic link/OTP) as the
  sign-in method. Phone/SMS OTP is deferred post-MVP for cost reasons — see
  [FUTURE_FEATURES.md](FUTURE_FEATURES.md) — don't enable it yet. Note the Publishable Key and
  Secret Key.
- **Definition of done:** Clerk app exists with Email enabled; keys saved securely.
- **Dependencies:** none.

### M5 — Activate Clerk's native Supabase integration (Clerk side)
- **Status:** done
- **Description:** ~~Create a JWT template~~ — **superseded.** Clerk deprecated the "Supabase JWT
  template" approach on April 1, 2025 (it required sharing your Supabase JWT secret with Clerk).
  Current approach: in the Clerk dashboard, go to the Supabase integration setup, select
  configuration options, and activate it. This reveals your **Clerk domain**, which M6 needs.
- **Definition of done:** Integration activated in Clerk; Clerk domain captured for use in M6.
- **Dependencies:** M4.
- **Note:** Marked done on the assumption this necessarily happened as part of getting M6 done
  (M6 needs the Clerk domain this step produces) — flag if that's not actually the case.

### M6 — Configure Supabase Third-Party Auth (Clerk)
- **Status:** done
- **Description:** In the Supabase dashboard (Authentication → Sign In / Providers → Third Party
  Auth), add Clerk as a provider using the **Clerk domain** from M5 (not a JWKS URL from a JWT
  template — that was the deprecated flow).
- **Definition of done:** Supabase trusts Clerk-issued session tokens. No shared secret exists
  between the two systems anymore (a good sign it's configured correctly).
- **Dependencies:** M3, M5.

### M7 — Add secrets everywhere they're needed
- **Status:** todo
- **Description:** Once M3/M4 credentials exist, add them to: (a) a local `.env.local` (never
  committed), (b) Vercel project → Settings → Environment Variables, (c) GitHub repo → Settings →
  Secrets and variables → Actions (for CI).
- **Definition of done:** All three locations have matching, current values for every credential.
- **Dependencies:** M2, M3, M4.

### M8 — Confirm CCLI (or equivalent) license status
- **Status:** todo
- **Description:** Not a code task — confirm the church's CCLI license (or whatever licensing
  applies) covers digitally displaying/reproducing the lyrics that'll be stored in this app.
- **Definition of done:** Confirmed, noted here for the record. Doesn't block any other task.
- **Dependencies:** none.

### M9 — (Optional, later) Point a custom domain at Vercel
- **Status:** todo
- **Description:** If the church wants a custom domain instead of the default `*.vercel.app` URL,
  buy/configure it and point it at the Vercel project.
- **Definition of done:** Domain resolves to the app.
- **Dependencies:** M2.

---

## Autonomous tasks (Claude)

### Epic 0 — Project scaffolding

#### A1 — Initialize Next.js project
- **Status:** done
- **Description:** Scaffold a Next.js (App Router, TypeScript) app at the repo root using pnpm.
  Basic folder structure, no monorepo (see CONTEXT.md).
- **Definition of done:** `pnpm dev` runs a default Next.js page locally.
- **Dependencies:** none.
- **Context:** This repo root already has `CLAUDE.md` and `docs/` — scaffold the Next.js app
  around those, don't overwrite them.

#### A2 — Lint/format setup
- **Status:** done
- **Description:** Configure ESLint + Prettier with sensible defaults for Next.js/TypeScript.
- **Definition of done:** `pnpm lint` runs clean on the scaffolded project.
- **Dependencies:** A1.

#### A3 — Vitest setup
- **Status:** done
- **Description:** Add Vitest, configure for TypeScript/React, add one trivial passing test as
  proof of setup.
- **Definition of done:** `pnpm test` runs and passes.
- **Dependencies:** A1.

#### A4 — Playwright setup
- **Status:** todo
- **Description:** Add Playwright, configure against the local dev server, add one trivial test
  (e.g. homepage loads).
- **Definition of done:** `pnpm test:e2e` runs and passes locally.
- **Dependencies:** A1.

#### A5 — Typed environment variables
- **Status:** todo
- **Description:** Add env var validation (e.g. `@t3-oss/env-nextjs` or a zod schema) covering the
  Clerk/Supabase keys expected later. Add `.env.example` with placeholder names (no real values).
- **Definition of done:** App fails fast with a clear error if a required env var is missing;
  `.env.example` documents every variable name.
- **Dependencies:** A1.

#### A6 — Supabase CLI local dev setup
- **Status:** todo
- **Description:** `supabase init`, set up `supabase/migrations/`, confirm `supabase start` boots a
  local Postgres + Realtime + Auth stack via Docker.
- **Definition of done:** `supabase start` works locally; migrations folder exists (empty is fine
  for now).
- **Dependencies:** A1. (Linking to the hosted project for deploying migrations needs M3, but
  local-only dev doesn't.)

#### A7 — Push to GitHub
- **Status:** todo
- **Description:** Add the GitHub repo (from M1) as `origin`, push the local history.
- **Definition of done:** Repo on GitHub matches local `main`.
- **Dependencies:** M1.

#### A8 — CI: lint + unit tests + build
- **Status:** todo
- **Description:** GitHub Actions workflow that runs on every PR: install deps, lint, unit tests,
  production build.
- **Definition of done:** Workflow passes on a trivial PR; fails if lint/tests/build fail.
- **Dependencies:** A2, A3, A7.

#### A9 — CI: integration tests against local Supabase
- **Status:** todo
- **Description:** Extend CI to spin up Supabase locally (CLI + Docker) in the runner, apply
  migrations, run Playwright tests against it.
- **Definition of done:** CI job boots local Supabase, runs migrations, runs `pnpm test:e2e`
  green, tears down cleanly.
- **Dependencies:** A4, A6, A8, and enough of Epic 1's migrations to be meaningful (at least
  A12–A16).

---

### Epic 1 — Data layer & auth wiring

#### A10 — `profiles` table migration
- **Status:** todo
- **Description:** Migration for `profiles`: `id` (uuid, pk), `clerk_user_id` (text, unique),
  `role` (enum: `admin`/`editor`/`member`, default `member`), `display_name`, timestamps.
- **Definition of done:** Migration applies cleanly via `supabase db reset` locally.
- **Dependencies:** A6.

#### A11 — `songs` table migration
- **Status:** todo
- **Description:** Migration for `songs`: `id`, `title`, `chordpro_body` (text), `default_key`,
  `tempo_bpm` (int, nullable), `youtube_url` (nullable), `tags` (text[]), generated `search`
  tsvector column (title + lyrics), `created_by`/`updated_by` (→ `profiles.id`), timestamps.
- **Definition of done:** Migration applies cleanly; `search` column populates automatically on
  insert/update.
- **Dependencies:** A10.

#### A12 — `plans` table migration
- **Status:** todo
- **Description:** Migration for `plans`: `id`, `name`, `service_date`, `created_by` (→
  `profiles.id`), timestamps.
- **Definition of done:** Migration applies cleanly.
- **Dependencies:** A10.

#### A13 — `plan_items` table migration
- **Status:** todo
- **Description:** Migration for `plan_items`: `id`, `plan_id` (FK → `plans`), `song_id` (FK →
  `songs`), `position` (int), `key_override` (nullable), `notes` (nullable).
- **Definition of done:** Migration applies cleanly; FK constraints enforced; a unique constraint
  on `(plan_id, position)` prevents duplicate ordering.
- **Dependencies:** A11, A12.

#### A14 — `live_session` table migration
- **Status:** todo
- **Description:** Migration for `live_session`: single canonical row (or one per "active"
  session — simplest is a singleton row, id fixed/constant) holding `current_plan_id`,
  `current_plan_item_id`, `updated_by`, `updated_at`.
- **Definition of done:** Migration applies cleanly; a check/constraint (or app-level convention)
  keeps it to one active row.
- **Dependencies:** A12, A13.
- **Context:** This is the canonical sync mechanism — see CONTEXT.md "Sync mechanism." Don't skip
  or simplify this in favor of a client-side-only approach.

#### A15 — RLS policies
- **Status:** todo
- **Description:** Row-level security policies for all tables, keyed off `profiles.role`. The
  native Clerk↔Supabase integration only puts the Clerk user ID in the JWT
  (`auth.jwt()->>'sub'`), not custom fields — so policies resolve role via a subquery: match
  `auth.jwt()->>'sub'` against `profiles.clerk_user_id`, then read that row's `role`. Per
  CONTEXT.md's roles section: `admin` full access; `editor` CRUD on songs/plans, no user
  management; `member` read-only on songs/plans, but *can* write `live_session` (running a plan
  doesn't require edit rights).
- **Definition of done:** Policies exist for all four tables; at minimum a test (manual or
  scripted) confirms a `member`-role token can read songs/plans, write `live_session`, but cannot
  write songs/plans; an `editor` can write songs/plans but not change another user's role.
- **Dependencies:** A10–A14, M6 (Clerk sessions must be trusted by Supabase for `auth.jwt()->>'sub'`
  to mean anything).

#### A16 — Full-text search index
- **Status:** todo
- **Description:** GIN index on `songs.search` for fast full-text queries.
- **Definition of done:** `EXPLAIN` on a search query shows index usage.
- **Dependencies:** A11.

#### A17 — RPC: `search_songs`
- **Status:** todo
- **Description:** Postgres function `search_songs(query text)` wrapping the full-text search,
  returning ranked results. Callable via `supabase.rpc('search_songs', { query })` from any
  client.
- **Definition of done:** Returns relevant songs for a text query; has a unit-style test (SQL or
  via Vitest hitting local Supabase).
- **Dependencies:** A16.
- **Context:** Search logic lives here, not in a Next.js route — per the hard architectural rule.

#### A18 — RPC: `get_plan_with_songs`
- **Status:** todo
- **Description:** Postgres function returning a plan's metadata plus its ordered `plan_items`
  joined with `songs` data, in one call.
- **Definition of done:** Returns correctly ordered results for a seeded plan.
- **Dependencies:** A13.

#### A19 — RPC: `advance_live_session`
- **Status:** todo
- **Description:** Postgres function `advance_live_session(plan_id uuid, plan_item_id uuid)` that
  updates the `live_session` row (`updated_by` from the calling user's JWT, `updated_at` = now()).
- **Definition of done:** Calling it updates the row; RLS still applies (only permitted roles can
  call it, per A15).
- **Dependencies:** A14, A15.

#### A20 — Clerk webhook → `profiles` sync
- **Status:** todo
- **Description:** Endpoint (Next.js route handler is fine here — this is infrastructure glue, not
  business logic) receiving Clerk's `user.created`/`user.updated`/`user.deleted` webhooks and
  upserting/deleting the corresponding `profiles` row. New users default to `member` role.
- **Definition of done:** Creating a user in Clerk (locally testable via Clerk's webhook testing
  tools) results in a matching `profiles` row within seconds.
- **Dependencies:** M4, M6, A10.
- **Context:** This is the one legitimate exception to "no logic in Next.js" — webhook receivers
  are inherently framework-hosted endpoints, not app business logic. Keep it thin: verify
  signature, upsert, done.

#### A21 — Seed script
- **Status:** todo
- **Description:** Script (or `supabase/seed.sql`) with sample songs (a few real ChordPro examples),
  sample profiles across all three roles, and a sample plan — for local dev and as fixtures for
  integration tests.
- **Definition of done:** `supabase db reset` leaves the local DB with usable sample data.
- **Dependencies:** A10–A13.

---

### Epic 2 — Frontend foundations

#### A22 — Supabase client helpers
- **Status:** todo
- **Description:** Browser and server Supabase client factories created with an `accessToken()`
  callback (the current native integration pattern, not the deprecated JWT-template flow):
  client-side returns `session?.getToken() ?? null`, server-side returns
  `(await auth()).getToken()`. No manual JWT copying, no shared secret.
- **Definition of done:** A server component and a client component can each successfully query
  Supabase with the signed-in user's identity applied (confirmable once RLS from A15 is in place).
- **Dependencies:** A1, A5, M3, M4, M5, M6.

#### A23 — Clerk sign-in/sign-up UI
- **Status:** todo
- **Description:** Wire Clerk's Next.js SDK into the app: sign-in/sign-up routes, session
  provider, sign-out.
- **Definition of done:** A user can sign in via email (magic link/OTP) and land in the app
  authenticated. Phone/SMS sign-in is out of scope for MVP — see
  [FUTURE_FEATURES.md](FUTURE_FEATURES.md).
- **Dependencies:** A1, M4.

#### A24 — Role-aware route guards
- **Status:** todo
- **Description:** Middleware/layout-level guards that read the signed-in user's role (from
  `profiles`, via A22's client) and gate admin/editor-only routes.
- **Definition of done:** A `member`-role user hitting an editor/admin-only route is redirected or
  shown an access-denied state, not the protected UI.
- **Dependencies:** A20, A22, A23.

#### A25 — App shell & navigation
- **Status:** todo
- **Description:** Basic layout/nav reflecting the signed-in user's role (e.g. admin sees a "Users"
  link, others don't).
- **Definition of done:** Nav renders correctly for each of the three roles.
- **Dependencies:** A23, A24.

---

### Epic 3 — Song management

#### A26 — Song list + search UI
- **Status:** todo
- **Description:** Page listing songs with a search box calling the `search_songs` RPC (A17).
- **Definition of done:** Typing a query filters results against real (seeded) data.
- **Dependencies:** A17, A22, A25.

#### A27 — Song detail view
- **Status:** todo
- **Description:** Page rendering a single song's ChordPro body via `chordsheetjs` (lyrics only by
  default; chords togglable/visible per design taste at build time).
- **Definition of done:** A seeded song with chord annotations renders readably.
- **Dependencies:** A11, A26.

#### A28 — Song create/edit form
- **Status:** todo
- **Description:** Form for creating/editing a song's fields, restricted to `editor`/`admin`.
- **Definition of done:** An editor can create and edit a song; a `member` cannot access the form
  (enforced both in UI and by RLS as the real backstop).
- **Dependencies:** A15, A24, A27.

#### A29 — Song delete
- **Status:** todo
- **Description:** Delete action with confirmation, restricted to `editor`/`admin`.
- **Definition of done:** Deleting removes the song and any dependent `plan_items` (decide
  cascade-vs-block behavior explicitly in the migration/RLS, don't leave it implicit).
- **Dependencies:** A28.

#### A30 — Unit tests: song-related logic
- **Status:** todo
- **Description:** Vitest coverage for the ChordPro rendering component and any client-side search
  query building.
- **Definition of done:** Tests exist and pass in CI (A8).
- **Dependencies:** A26, A27.

#### A31 — Integration test: song CRUD + search
- **Status:** todo
- **Description:** Playwright test covering create → appears in search → edit → delete, as an
  editor; and confirming a member cannot reach create/edit.
- **Definition of done:** Test passes in CI (A9).
- **Dependencies:** A26–A29, A9.

---

### Epic 4 — Plan mode

#### A32 — Plan list + create/edit metadata
- **Status:** todo
- **Description:** Page listing plans, creating a new plan (name + service date), editing metadata.
  Restricted to `editor`/`admin`.
- **Definition of done:** Editor can create/edit a plan; member sees a read-only list.
- **Dependencies:** A12, A15, A24.

#### A33 — Plan editor: songs, ordering, overrides
- **Status:** todo
- **Description:** UI to add/remove/reorder songs within a plan, set a per-song `key_override` and
  `notes`. Uses `get_plan_with_songs` (A18) to load, writes via direct table calls or a dedicated
  RPC if reordering logic gets non-trivial (renumbering `position` atomically).
- **Definition of done:** Reordering persists correctly and survives a page reload; no duplicate
  `position` values.
- **Dependencies:** A13, A18, A32.
- **Context:** If atomic renumbering is fiddly to get right client-side, that's a signal to push it
  into an RPC — per the hard architectural rule, that's the right call anyway.

#### A34 — "Start live session" action
- **Status:** todo
- **Description:** Button on a plan that calls `advance_live_session` (A19) pointing at the plan's
  first item, effectively "going live."
- **Definition of done:** Triggers a `live_session` row update visible to Epic 5's views.
- **Dependencies:** A19, A33.

#### A35 — Unit tests: plan ordering logic
- **Status:** todo
- **Description:** Vitest coverage for reorder/renumber logic (wherever it ends up living per
  A33's note).
- **Definition of done:** Tests exist and pass in CI.
- **Dependencies:** A33.

#### A36 — Integration test: plan creation + reordering
- **Status:** todo
- **Description:** Playwright test: create a plan, add songs, reorder, reload, confirm order
  persisted.
- **Definition of done:** Test passes in CI.
- **Dependencies:** A32–A34, A9.

---

### Epic 5 — Presenter / audience live display

#### A37 — Live session hook
- **Status:** todo
- **Description:** Shared client hook subscribing to the `live_session` row via Supabase Realtime,
  and exposing an `advance()` call wrapping the `advance_live_session` RPC.
- **Definition of done:** Two browser tabs both using the hook stay in sync within ~1s of an
  `advance()` call in either.
- **Dependencies:** A14, A19, A22.
- **Context:** This is the client-agnostic sync layer per CONTEXT.md — no `BroadcastChannel`.

#### A38 — Presenter view
- **Status:** todo
- **Description:** View showing current song (with chords/key), next song preview, plan
  navigation, and large "advance/back" controls. Uses A37's hook.
- **Definition of done:** Operator can step through a live plan's songs.
- **Dependencies:** A27, A37.

#### A39 — Audience view
- **Status:** todo
- **Description:** Fullscreen, minimal-chrome view showing only the current song's lyrics (no
  chords), large text, sized for a projector/TV. Uses A37's hook, read-only.
- **Definition of done:** Reflects `live_session` changes within ~1s; readable at a distance
  (verify at a reasonable viewport size, not just desktop dev width).
- **Dependencies:** A37.

#### A40 — "Open audience display" control
- **Status:** todo
- **Description:** From the presenter view, a control that opens the audience view in a new
  window, plus on-screen instructions for the operator to drag it to the second monitor and
  fullscreen it (F11) — manual placement, not programmatic (see CONTEXT.md pitfalls).
- **Definition of done:** New window opens pointed at the audience route; instructions are visible
  and clear on first use.
- **Dependencies:** A39.

#### A41 — Offline caching of active plan
- **Status:** todo
- **Description:** When a plan goes live, cache its songs' data client-side (IndexedDB) so the
  audience/presenter views keep working through a brief network drop.
- **Definition of done:** Simulate offline (dev tools) mid-session; already-loaded songs still
  render; a reasonable degraded state shows for anything not cached.
- **Dependencies:** A37, A39.

#### A42 — Integration test: presenter → audience sync
- **Status:** todo
- **Description:** Playwright test with two tabs/contexts: advancing in presenter view updates
  audience view via Realtime.
- **Definition of done:** Test passes reliably in CI (watch for flakiness given the async
  Realtime round-trip — use proper waits, not fixed sleeps).
- **Dependencies:** A38–A40, A9.

---

### Epic 6 — Admin & roles

#### A43 — Admin user management page
- **Status:** todo
- **Description:** Page (admin-only) listing users from `profiles` with the ability to change
  role.
- **Definition of done:** Admin can promote/demote a user; change reflects in that user's access
  immediately (or next session, if token refresh timing makes "immediately" impractical — document
  whichever is true).
- **Dependencies:** A15, A24.

#### A44 — Integration test: role gating
- **Status:** todo
- **Description:** Playwright test confirming a `member` cannot reach admin/editor-only routes or
  actions (song edit, plan edit, user management), across the UI paths built so far.
- **Definition of done:** Test passes in CI.
- **Dependencies:** A43, A9.

---

### Epic 7 — CI/CD hardening & documentation

#### A45 — Full CI pipeline validation
- **Status:** todo
- **Description:** Confirm the complete GitHub Actions pipeline (lint, unit, integration against
  local Supabase, build) runs green end-to-end on a real PR touching multiple areas of the app.
- **Definition of done:** A PR shows all checks passing; a deliberately broken test shows the
  pipeline correctly failing (then revert the deliberate break).
- **Dependencies:** A8, A9, and the bulk of Epics 1–6's test tasks.

#### A46 — Desktop-client data contract doc
- **Status:** todo
- **Description:** Write `docs/DESKTOP_CLIENT_CONTRACT.md` documenting, for a future native
  client: which tables it can read/write directly, which RPCs exist and their signatures, which
  Realtime channel(s) to subscribe to for live sync, and how Clerk auth would need to be
  established outside a browser context (flagged as an open question to resolve when that work
  starts, not answered here).
- **Definition of done:** Doc exists, is accurate against the actual schema/RPCs built in Epics
  1–5, and explicitly does not attempt to design the desktop app itself.
- **Dependencies:** A14, A17–A19, A37.
