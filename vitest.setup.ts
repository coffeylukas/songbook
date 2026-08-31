// Adds jest-dom's DOM matchers (toBeInTheDocument, toHaveTextContent, ...) to
// Vitest's `expect`. This import does NOT register Testing Library's cleanup —
// that comes from @testing-library/react's own auto-cleanup, which only runs
// because `globals: true` (see vitest.config.mts) provides a global `afterEach`.
// If globals is ever turned off, add an explicit `afterEach(cleanup)` or renders
// will accumulate in the same document between tests.
import "@testing-library/jest-dom/vitest";
