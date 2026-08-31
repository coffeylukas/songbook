// Vitest runs with `globals: true` (see vitest.config.mts), so `describe`,
// `it`, `expect`, etc. exist at runtime without being imported. This reference
// tells TypeScript about them. It is done here rather than via
// `compilerOptions.types` so that ambient `@types/*` packages stay
// auto-included.
/// <reference types="vitest/globals" />
