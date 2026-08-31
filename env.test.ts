// @vitest-environment node
//
// Node (not jsdom), because `@t3-oss/env-nextjs` decides whether it's running on
// the server by checking for a `window` — under jsdom it would take the client
// path and skip validating the server-only variables entirely.
import { afterEach, assert, describe, expect, it, vi } from "vitest";

const VALID_ENV = {
  CLERK_SECRET_KEY: "sk_test_fake",
  SUPABASE_SECRET_KEY: "sb_secret_fake",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fake",
  NEXT_PUBLIC_SUPABASE_URL: "https://fake-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake",
} as const;

type EnvOverrides = Partial<Record<keyof typeof VALID_ENV, string | undefined>>;

/**
 * Load a fresh copy of the env module against a stubbed `process.env`. The
 * module validates at import time, so each case needs its own module instance.
 */
async function loadEnv(overrides: EnvOverrides = {}) {
  vi.resetModules();
  // These tests assert that validation *throws*; an ambient SKIP_ENV_VALIDATION
  // (easy to export in a shell, since CI documents it) would make env.ts a
  // no-op and turn every such assertion into a confusing failure.
  vi.stubEnv("SKIP_ENV_VALIDATION", undefined);
  for (const [key, value] of Object.entries({ ...VALID_ENV, ...overrides })) {
    if (value === undefined) {
      vi.stubEnv(key, undefined);
    } else {
      vi.stubEnv(key, value);
    }
  }
  const { env } = await import("./env");
  return env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("parses a complete, valid environment", async () => {
    const env = await loadEnv();

    expect(env.CLERK_SECRET_KEY).toBe(VALID_ENV.CLERK_SECRET_KEY);
    expect(env.SUPABASE_SECRET_KEY).toBe(VALID_ENV.SUPABASE_SECRET_KEY);
    expect(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe(
      VALID_ENV.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      VALID_ENV.NEXT_PUBLIC_SUPABASE_URL,
    );
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      VALID_ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  });

  it.each(Object.keys(VALID_ENV) as Array<keyof typeof VALID_ENV>)(
    "throws naming %s when it is missing",
    async (missing) => {
      await expect(loadEnv({ [missing]: undefined })).rejects.toThrow(missing);
    },
  );

  it("treats an empty string as missing", async () => {
    await expect(loadEnv({ CLERK_SECRET_KEY: "" })).rejects.toThrow(
      "CLERK_SECRET_KEY",
    );
  });

  it("rejects a legacy Supabase anon/service_role JWT key", async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiJ9" }),
    ).rejects.toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

    await expect(
      loadEnv({ SUPABASE_SECRET_KEY: "eyJhbGciOiJIUzI1NiJ9" }),
    ).rejects.toThrow("sb_secret_");
  });

  it("rejects a non-URL Supabase project URL", async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("reports every missing variable in one error", async () => {
    const error = await loadEnv({
      CLERK_SECRET_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    }).then(
      () => null,
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(Error);
    assert(error instanceof Error);
    expect(error.message).toContain("CLERK_SECRET_KEY");
    expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(error.message).toContain(".env.example");
  });
});
