import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve the `@/*` alias from tsconfig.json. Vite supports this natively,
    // so no `vite-tsconfig-paths` plugin is needed.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Unit tests are colocated next to the code under test (see CLAUDE.md).
    include: ["**/*.test.{ts,tsx}"],
    // Playwright owns `e2e/` — Vitest must never try to run those specs.
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
  },
});
