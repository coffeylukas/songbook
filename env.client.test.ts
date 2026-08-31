// @vitest-environment jsdom
//
// Companion to env.test.ts: that file runs in Node (server), this one runs with
// a `window` present, which is how `@t3-oss/env-nextjs` detects "client". The
// point is to prove server-only secrets are unreachable from client code — the
// one genuinely dangerous failure mode of an env module like this.
import { afterEach, describe, expect, it, vi } from "vitest";

/** Only the client half — a browser bundle never has the server variables. */
const CLIENT_ENV = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fake",
  NEXT_PUBLIC_SUPABASE_URL: "https://fake-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake",
} as const;

async function loadClientEnv() {
  vi.resetModules();
  vi.stubEnv("CLERK_SECRET_KEY", undefined);
  vi.stubEnv("SUPABASE_SECRET_KEY", undefined);
  for (const [key, value] of Object.entries(CLIENT_ENV)) {
    vi.stubEnv(key, value);
  }
  const { env } = await import("./env");
  return env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env on the client", () => {
  it("validates and exposes the NEXT_PUBLIC_ variables", async () => {
    const env = await loadClientEnv();

    expect(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe(
      CLIENT_ENV.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      CLIENT_ENV.NEXT_PUBLIC_SUPABASE_URL,
    );
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      CLIENT_ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  });

  it.each(["CLERK_SECRET_KEY", "SUPABASE_SECRET_KEY"] as const)(
    "throws instead of returning %s",
    async (secret) => {
      const env = await loadClientEnv();

      expect(() => env[secret]).toThrow(
        `Attempted to access server-only environment variable "${secret}" on the client`,
      );
    },
  );

  it("does not fail validation just because the server secrets are absent", async () => {
    await expect(loadClientEnv()).resolves.toBeDefined();
  });
});
