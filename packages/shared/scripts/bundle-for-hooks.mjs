// Bundles @ml/shared into a single ESM file consumable by PocketBase JS hooks.
// PocketBase (Goja) has no module loader, so hooks load this generated file.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const entry = resolve(here, '../src/hooks-entry.ts')
const outfile = resolve(here, '../../../apps/pocketbase/pb_hooks/lib/shared.js')

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2020',
  logLevel: 'info',
})

console.log(`[build:hooks] wrote ${outfile}`)
