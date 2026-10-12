import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

const BINARY = resolve(import.meta.dirname, '../pocketbase')

/** True when a PocketBase binary is available for integration tests. */
export const pbAvailable = existsSync(BINARY)

export interface PocketBaseInstance {
  url: string
  dataDir: string
  stop: () => Promise<void>
}

/**
 * Boots an ephemeral PocketBase instance against a temporary data dir and runs
 * the migrations in `pb_migrations/`. Integration tests are skipped when the
 * binary is absent so the suite stays green on machines without it.
 */
export async function startPocketBase(): Promise<PocketBaseInstance> {
  if (!pbAvailable) throw new Error('PocketBase binary not found')
  const dataDir = mkdtempSync(resolve(tmpdir(), 'ml-pb-'))
  const hooksDir = resolve(import.meta.dirname, '../pb_hooks')
  const migrationsDir = resolve(import.meta.dirname, '../pb_migrations')

  const child: ChildProcess = spawn(
    BINARY,
    ['serve', '--http=127.0.0.1:8099', `--dir=${dataDir}`, `--hooksDir=${hooksDir}`, `--migrationsDir=${migrationsDir}`],
    { stdio: 'ignore' },
  )

  await waitForHttp('http://127.0.0.1:8099/api/health', 20_000)

  return {
    url: 'http://127.0.0.1:8099',
    dataDir,
    stop: async () => {
      child.kill('SIGTERM')
      await new Promise((r) => child.once('exit', r))
    },
  }
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`PocketBase did not start within ${timeoutMs}ms`)
}
