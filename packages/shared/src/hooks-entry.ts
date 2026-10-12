/**
 * Entry point bundled for PocketBase JS hooks (Goja / CommonJS).
 * Exposes only the pure domain rules + constants (no Zod) so hooks can reuse
 * the exact same goal/period/progress math as the client (Constitution III).
 */
export * from './constants/index.js'
export * from './domain/index.js'
