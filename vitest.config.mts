import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve the `@/*` alias from tsconfig.json. Vite supports this natively,
    // so no `vite-tsconfig-paths` plugin is needed.
    tsconfigPaths: true,
  },
  test: {
    // Default environment, since most tests here are React components. Tests
    // that need plain Node (e.g. SQL/RPC helpers) should opt out per file with
    // a `// @vitest-environment node` docblock at the top.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Unit tests are colocated next to the code under test (see CLAUDE.md).
    include: ["**/*.test.{ts,tsx}"],
    // Extend Vitest's defaults rather than replacing them, so dist/coverage/etc.
    // stay excluded. Playwright owns `e2e/` — Vitest must never run those specs.
    exclude: [...configDefaults.exclude, "**/.next/**", "e2e/**"],
  },
});
