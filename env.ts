import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Minimal structural type for a Standard Schema issue, so this module doesn't
 * need a direct dependency on `@t3-oss/env-core` (it's only a transitive dep of
 * `@t3-oss/env-nextjs`, and pnpm's strict node_modules wouldn't resolve it).
 */
type ValidationIssue = {
  readonly message: string;
  readonly path?:
    ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
};

/** `["NEXT_PUBLIC_SUPABASE_URL"]` -> `"NEXT_PUBLIC_SUPABASE_URL"`. */
function variableName(issue: ValidationIssue): string {
  const name = (issue.path ?? [])
    .map((segment) =>
      typeof segment === "object" && segment !== null
        ? String(segment.key)
        : String(segment),
    )
    .join(".");
  return name === "" ? "(unknown variable)" : name;
}

/**
 * Throw a single error that *names* the offending variables. The library's
 * default handler only console.errors the details and throws a generic
 * "Invalid environment variables", which is easy to lose in build output.
 */
function reportValidationError(issues: readonly ValidationIssue[]): never {
  const details = issues
    .map((issue) => `  - ${variableName(issue)}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${details}\n` +
      `See .env.example for every variable this app expects, and put real values in .env.local.`,
  );
}

/** Message for a variable that isn't set at all. */
function missing(name: string, description: string): string {
  return `${name} is not set — expected the ${description}`;
}

/**
 * A required API key with a known prefix. The prefix check catches the common
 * mistake of pasting the wrong key (or a legacy Supabase JWT key) into a slot,
 * which would otherwise fail much later with an opaque 401.
 */
function keyStartingWith(name: string, prefix: string, description: string) {
  return z.string({ error: missing(name, description) }).startsWith(prefix, {
    error: `${name} must be a ${description} — it should start with "${prefix}"`,
  });
}

/**
 * Server-only variables. Never bundled for the browser: Next.js only inlines
 * `NEXT_PUBLIC_*` into client bundles, and any accidental client-side read of
 * one of these throws via `onInvalidAccess` below.
 *
 * Note the Supabase DB password is deliberately absent — it's a Supabase CLI /
 * direct-Postgres credential, not part of the API key system, and no app code
 * reads it (see "Supabase key naming" in docs/CONTEXT.md).
 */
const server = {
  /** Clerk backend API key. Server-only — never expose to the browser. */
  CLERK_SECRET_KEY: keyStartingWith(
    "CLERK_SECRET_KEY",
    "sk_",
    "Clerk secret key",
  ),
  /**
   * Supabase Secret key (`sb_secret_...`). Bypasses RLS, so server-only —
   * never expose to the browser. Replaces the legacy `service_role` key.
   */
  SUPABASE_SECRET_KEY: keyStartingWith(
    "SUPABASE_SECRET_KEY",
    "sb_secret_",
    "Supabase Secret key (legacy service_role JWT keys are not supported)",
  ),
};

const serverOnlyNames: ReadonlySet<string> = new Set(Object.keys(server));

/** Validated environment variables. */
export const env = createEnv({
  server,
  client: {
    /** Clerk frontend API key. Client-safe by design. */
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: keyStartingWith(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "pk_",
      "Clerk publishable key",
    ),
    /** Supabase project URL, e.g. https://abcdefgh.supabase.co */
    NEXT_PUBLIC_SUPABASE_URL: z.url({
      error: (issue) =>
        issue.input === undefined
          ? missing("NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL")
          : "NEXT_PUBLIC_SUPABASE_URL must be a valid URL, e.g. https://abcdefgh.supabase.co",
    }),
    /**
     * Supabase Publishable key (`sb_publishable_...`). Client-safe; RLS is what
     * protects the data. Replaces the legacy `anon` key.
     */
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: keyStartingWith(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_",
      "Supabase Publishable key (legacy anon JWT keys are not supported)",
    ),
  },
  /**
   * Explicit mapping, because Next.js statically replaces `process.env.X` only
   * for literal member accesses — destructuring or dynamic lookups don't work
   * in client bundles.
   */
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  /** Treat `FOO=` in a .env file as "not set" rather than as a valid "". */
  emptyStringAsUndefined: true,
  /**
   * Opt-out for contexts that build or boot the app without needing real
   * credentials — CI lint/build jobs, Playwright runs from a clean checkout,
   * Docker image builds. It is off by default, so ordinary `pnpm dev`/`pnpm
   * build` still fail fast; a caller has to ask for it explicitly with
   * `SKIP_ENV_VALIDATION=1`. Never set it for a real deployment.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  onValidationError: reportValidationError,
  /**
   * Guards the dangerous case: reading a secret from client code. Only the
   * actual server variables throw — the library routes *every* unknown property
   * here, including runtime probes like `then` (which JS looks up whenever the
   * env object is returned from an async function), and throwing on those would
   * break ordinary code without protecting anything.
   *
   * The cast is needed because the option is typed as returning `never`.
   */
  onInvalidAccess: ((variable: string) => {
    if (!serverOnlyNames.has(variable)) return undefined;
    throw new Error(
      `Attempted to access server-only environment variable "${variable}" on the client. ` +
        `Server secrets must stay on the server — see env.ts.`,
    );
  }) as (variable: string) => never,
});
