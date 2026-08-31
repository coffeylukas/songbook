# Future Features (Post-MVP)

Deferred scope — not part of the current MVP backlog ([BACKLOG.md](BACKLOG.md)). Each item below
keeps enough context to be picked up later without re-deriving decisions already made. Task IDs
here (`FM*`/`FA*`) are intentionally in a separate namespace from the active MVP backlog's
`M*`/`A*` IDs so reactivating this feature doesn't collide with anything in progress.

---

## SMS OTP Login (via Twilio)

**Deferred because:** ongoing per-message SMS cost (plus Twilio's A2P 10DLC registration fees)
isn't justified for MVP. Email magic link covers login for launch at no marginal cost. Revisit if
the church specifically wants text-based login for members who don't check email.

**Decisions already made** (preserved so they don't need to be re-litigated when this is picked
back up):
- Provider: **Twilio, bring-your-own** — not Clerk's bundled SMS billing. Chosen for direct cost
  control and owning the sending number's reputation.
- **Unresolved when deferred:** whether Clerk exposes a native "enter Twilio credentials"
  dashboard field, or requires the self-delivery webhook pattern (disable "Delivered by Clerk" →
  handle the `sms.created` webhook yourself, forwarding to Twilio). This was never confirmed
  against a live Clerk dashboard — check Clerk's current docs/dashboard when reactivating, since
  their offering may have changed.

### Reactivation checklist
1. In Clerk, enable **Phone** as a sign-in method alongside Email (MVP only enabled Email — see
   current [M4](BACKLOG.md)).
2. Do FM1 → FM2 → FM3 → FM4 below, in order.
3. Build FA1 — unless FM3 finds Clerk now offers direct Twilio credentials, in which case FA1 is
   unnecessary.
4. Update [A23](BACKLOG.md)'s Definition of Done back to covering both email and phone sign-in.
5. Re-add a "never call the real Twilio API from CI" note to [A9](BACKLOG.md), matching FA1's own
   note.

### FM1 — Create Twilio account + SMS-capable number
- **Status:** deferred
- **Description:** Create a Twilio account (or use an existing one). Provision a phone number
  capable of sending SMS, or set up a Twilio Messaging Service (generally the better option — it
  pools numbers and simplifies the compliance step in FM2). Note the Account SID, Auth Token, and
  phone number / Messaging Service SID.
- **Definition of done:** Twilio account + SMS-capable number/Messaging Service exist; credentials
  saved securely (password manager).
- **Dependencies:** none.

### FM2 — Register A2P 10DLC (US SMS compliance)
- **Status:** deferred
- **Description:** If texting US numbers on a standard Twilio long-code number, register a Brand
  and Campaign for A2P 10DLC (via Twilio's console or your Messaging Service's compliance flow).
  Unregistered application-to-person traffic gets filtered or blocked by carriers — this isn't
  optional for reliable delivery. Approval timing varies (same-day to ~2 weeks); there are
  typically both a one-time and a small recurring fee — check Twilio's current pricing rather than
  assuming a number.
- **Definition of done:** Brand + Campaign approved and linked to the number/Messaging Service
  from FM1.
- **Dependencies:** FM1.

### FM3 — Configure Clerk for self-delivered SMS
- **Status:** deferred
- **Description:** Clerk's documented mechanism for bringing your own SMS provider is: toggle
  **off** "Delivered by Clerk" for SMS in the Clerk dashboard, after which Clerk fires an
  `sms.created` webhook (phone number + code) instead of sending it themselves, and you're
  expected to deliver it via your own provider (Twilio). **Verify this against the actual Clerk
  dashboard at reactivation time** — a simpler native "enter your Twilio SID/Auth Token directly"
  option may exist by then. Note in this file which mechanism actually applies, since FA1 needs to
  be built against reality, not this note.
- **Definition of done:** Clerk confirmed configured to route SMS through Twilio; if it's the
  webhook approach, the `sms.created` event is enabled in Clerk's webhook settings and its signing
  secret is captured.
- **Dependencies:** M4 (from the active backlog, with Phone re-enabled per the reactivation
  checklist), FM1.

### FM4 — Add Twilio secrets
- **Status:** deferred
- **Description:** Add the Twilio Account SID, Auth Token, and phone number/Messaging Service SID
  from FM1 to: local `.env.local`, Vercel project env vars, and GitHub Actions secrets — same
  process as the active backlog's M7 (Add secrets), just for these additional values.
- **Definition of done:** All three locations have matching, current Twilio credential values.
- **Dependencies:** FM1.

### FA1 — Clerk SMS webhook → Twilio send handler
- **Status:** deferred
- **Description:** *Only needed if FM3 confirms Clerk's self-delivery/webhook mechanism applies* —
  check FM3's notes before starting. Otherwise: a webhook route (infrastructure glue, a legitimate
  exception to the "no logic in Next.js" rule — same category as the active backlog's A20) that
  receives Clerk's `sms.created` event, verifies its signing secret, extracts the phone number and
  code, and sends it via the Twilio API using the FM1/FM4 credentials.
- **Definition of done:** A real OTP sign-in attempt results in an SMS actually sent through the
  Twilio account from FM1, not Clerk's own gateway. Failures are logged clearly and loudly — a
  silent failure here means a user literally cannot log in. Twilio is never called from automated
  tests (mock/stub it — restore the CI note on A9 per the reactivation checklist).
- **Dependencies:** FM1, FM3, A20 (from the active backlog — reuses the webhook-receiving
  pattern).
