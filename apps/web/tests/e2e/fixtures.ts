import { test as base, type Page } from '@playwright/test'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const appDir = resolve(here, '../../../pocketbase')
const binary = join(appDir, 'pocketbase')
const migrationsDir = join(appDir, 'pb_migrations')
const hooksDir = join(appDir, 'pb_hooks')

const PORT = 8091
export const API_URL = `http://127.0.0.1:${PORT}`

export const SPACE_NAME = 'Cachoeira'
/** Marido lê MENOS que a esposa. */
export const MARIDO = { email: 'marido@casal.test', name: 'João Leitor' }
export const ESPOSA = { email: 'esposa@casal.test', name: 'Maria Leitora' }

export const BOOKS = {
  domCasmurro: { title: 'Dom Casmurro E2E', authors: ['Machado de Assis'], totalPages: 256 },
  hobbit: { title: 'O Hobbit E2E', authors: ['J. R. R. Tolkien'], totalPages: 320 },
  sapiens: { title: 'Sapiens E2E', authors: ['Yuval Harari'], totalPages: 464 },
  bichos: { title: 'A Revolução dos Bichos E2E', authors: ['George Orwell'], totalPages: 152 },
}

export interface Persona {
  email: string
  name: string
  token: string
  secret?: string
}

interface ApiOptions {
  token?: string
  stepUp?: string
  method?: string
  body?: unknown
}

interface ApiResult<T> {
  status: number
  data: T
}

export interface Session {
  token: string
  record: { id: string; email: string; name?: string }
  stepUpToken?: string
}

export interface Backend {
  marido: Persona
  esposa: Persona
  space: string
  api: <T>(path: string, options?: ApiOptions) => Promise<ApiResult<T>>
  login: (email: string) => Promise<Session>
  magicTokenFor: (email: string) => string | null
  stepUpCode: (email: string) => string
  logs: () => string
  stop: () => Promise<void>
  /** Ids úteis nos testes. */
  ids: {
    marido: string
    esposa: string
    dom: string
    hobbit: string
    sapiens: string
    bichos: string
    space: string
  }
}

function toBase32Bytes(secret: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of secret.replace(/=+$/, '').toUpperCase()) {
    const index = alphabet.indexOf(char)
    if (index === -1) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return bytes
}

export function totpCode(secret: string, offset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / 30) + offset
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', Buffer.from(toBase32Bytes(secret))).update(buffer).digest()
  const o = (hmac[hmac.length - 1] ?? 0) & 0x0f
  const code =
    ((((hmac[o] ?? 0) & 0x7f) << 24) |
      ((hmac[o + 1] ?? 0) << 16) |
      ((hmac[o + 2] ?? 0) << 8) |
      (hmac[o + 3] ?? 0)) %
    1_000_000
  return String(code).padStart(6, '0')
}

async function waitForHealth(timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${API_URL}/api/health`)
      if (response.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('PocketBase não subiu a tempo')
}

async function startBackend(): Promise<Backend> {
  const dataDir = mkdtempSync(join(tmpdir(), 'ml-e2e-'))
  const child: ChildProcessWithoutNullStreams = spawn(
    binary,
    [
      'serve',
      '--dev',
      `--http=127.0.0.1:${PORT}`,
      `--dir=${dataDir}`,
      `--migrationsDir=${migrationsDir}`,
      `--hooksDir=${hooksDir}`,
    ],
    {
      cwd: appDir,
      env: {
        ...process.env,
        CF_ENCRYPTION_KEY: 'e2e-insecure-key-change-me-1234567890',
        CF_APP_URL: 'http://localhost:5174',
        CF_CORS_ORIGINS: 'http://localhost:5174',
        CF_ADMIN_EMAIL: MARIDO.email,
        CF_ADMIN_NAME: MARIDO.name,
        CF_STEPUP_TTL: '10m',
        CF_TIMEZONE: 'America/Sao_Paulo',
      },
    },
  )

  let output = ''
  child.stdout.on('data', (chunk) => (output += chunk.toString()))
  child.stderr.on('data', (chunk) => (output += chunk.toString()))

  await waitForHealth()

  function magicTokenFor(email: string): string | null {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`"email":"${escaped}"[^}]*"link":"([^"]+)"`, 'g')
    const matches = [...output.matchAll(regex)]
    const last = matches[matches.length - 1]
    if (!last?.[1]) return null
    try {
      return new URL(last[1]).searchParams.get('token')
    } catch {
      return null
    }
  }

  async function api<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
    const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    if (options.stepUp) headers['X-Step-Up-Token'] = options.stepUp
    let response: Response
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
    } catch (err) {
      throw new Error(`API ${path} falhou: ${String(err)} | PB: ${output.slice(-1200)}`)
    }
    const text = await response.text()
    const data = text ? (JSON.parse(text) as T) : (undefined as T)
    return { status: response.status, data }
  }

  const secrets = new Map<string, string>()

  async function login(email: string): Promise<Session> {
    await api('/api/auth/magic-link/request', { body: { email } })
    let token: string | null = null
    for (let i = 0; i < 50 && !token; i += 1) {
      await new Promise((r) => setTimeout(r, 100))
      token = magicTokenFor(email)
    }
    if (!token) throw new Error(`magic token não encontrado para ${email}`)

    const verify = await api<{
      stepUpRequired?: boolean
      userId?: string
      token?: string
      record?: Session['record']
    }>('/api/auth/magic-link/verify', { body: { token, deviceId: `e2e-${Date.now()}` } })
    if (verify.status >= 400) throw new Error(`login falhou: ${JSON.stringify(verify.data)}`)

    if (verify.data.stepUpRequired && verify.data.userId) {
      const secret = secrets.get(email)
      if (!secret) throw new Error(`2FA exigido para ${email} mas sem segredo`)
      const result = await api<{
        token: string
        record: Session['record']
        meta?: { stepUpToken?: string }
      }>('/api/auth/2fa/verify', {
        body: { userId: verify.data.userId, code: totpCode(secret) },
      })
      if (result.status >= 400) throw new Error(`2FA falhou: ${JSON.stringify(result.data)}`)
      return { token: result.data.token, record: result.data.record, stepUpToken: result.data.meta?.stepUpToken }
    }

    return { token: verify.data.token as string, record: verify.data.record as Session['record'] }
  }

  // ---------------------------------------------------------------- seed
  const maridoSession = await login(MARIDO.email)
  const marido: Persona = { email: MARIDO.email, name: MARIDO.name, token: maridoSession.token }

  const space = await api<{ id: string }>('/api/spaces', {
    token: marido.token,
    body: { name: SPACE_NAME },
  })
  if (space.status >= 400) throw new Error(`criar espaço falhou: ${JSON.stringify(space.data)}`)
  const spaceId = space.data.id

  // 2FA do marido (convite exige step-up).
  const setup = await api<{ secret: string }>('/api/auth/2fa/setup', { token: marido.token, body: {} })
  marido.secret = setup.data.secret
  secrets.set(MARIDO.email, setup.data.secret)
  await api('/api/auth/2fa/confirm', {
    token: marido.token,
    body: { code: totpCode(setup.data.secret) },
  })

  const step = await api<{ meta?: { stepUpToken?: string } }>('/api/auth/2fa/verify', {
    body: { userId: maridoSession.record.id, code: totpCode(setup.data.secret) },
  })
  if (step.status >= 400) throw new Error(`step-up falhou: ${JSON.stringify(step.data)}`)
  const stepUp = step.data.meta?.stepUpToken
  if (!stepUp) throw new Error(`sem stepUpToken: ${JSON.stringify(step.data)}`)

  const invite = await api<{ token: string }>(`/api/spaces/${spaceId}/invites`, {
    token: marido.token,
    stepUp,
    body: { email: ESPOSA.email, role: 'partner' },
  })
  if (invite.status >= 400) throw new Error(`convidar falhou: ${JSON.stringify(invite.data)}`)

  const esposaSession = await login(ESPOSA.email)
  const esposa: Persona = { email: ESPOSA.email, name: ESPOSA.name, token: esposaSession.token }
  await api('/api/auth/me', { token: marido.token, method: 'PATCH', body: { name: MARIDO.name } })
  await api('/api/auth/me', { token: esposa.token, method: 'PATCH', body: { name: ESPOSA.name } })
  const accepted = await api('/api/invites/accept', {
    token: esposa.token,
    body: { token: invite.data.token },
  })
  if (accepted.status >= 400) throw new Error(`aceitar convite falhou: ${JSON.stringify(accepted.data)}`)

  async function createBook(book: { title: string; authors: string[]; totalPages: number }): Promise<string> {
    const record = await api<{ id: string }>(`/api/books?space=${spaceId}`, {
      token: marido.token,
      body: { ...book, source: 'manual' },
    })
    if (record.status >= 400) throw new Error(`criar livro falhou: ${JSON.stringify(record.data)}`)
    return record.data.id
  }

  async function createUserBook(
    token: string,
    book: string,
    fields: Record<string, unknown>,
  ): Promise<string> {
    const record = await api<{ id: string }>(`/api/user-books?space=${spaceId}`, {
      token,
      body: { book, ...fields },
    })
    if (record.status >= 400) throw new Error(`criar user-book falhou: ${JSON.stringify(record.data)}`)
    return record.data.id
  }

  async function createLog(
    token: string,
    book: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const record = await api(`/api/reading-logs?space=${spaceId}`, { token, body: { book, ...fields } })
    if (record.status >= 400) throw new Error(`criar log falhou: ${JSON.stringify(record.data)}`)
  }

  const dom = await createBook(BOOKS.domCasmurro)
  const hobbit = await createBook(BOOKS.hobbit)
  const sapiens = await createBook(BOOKS.sapiens)
  const bichos = await createBook(BOOKS.bichos)

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Marido: lê menos (25 páginas no total).
  await createUserBook(marido.token, dom, { status: 'lendo', owned: true, currentPage: 40 })
  await createUserBook(marido.token, hobbit, { status: 'quero_ler', owned: true })
  await createUserBook(marido.token, sapiens, { status: 'quero_ler', owned: false })
  await createLog(marido.token, dom, { date: yesterday, pages: 10, endPage: 25 })
  await createLog(marido.token, dom, { date: today, pages: 15, endPage: 40 })
  await api(`/api/goals?space=${spaceId}`, {
    token: marido.token,
    body: { metric: 'paginas', period: 'dia', target: 10, weekStart: 1, graceHours: 24, startsOn: today },
  })

  // Esposa: lê mais (mais páginas + um livro terminado com resenha pública).
  await createUserBook(esposa.token, dom, { status: 'lendo', owned: true, currentPage: 120 })
  await createUserBook(esposa.token, bichos, {
    status: 'lido',
    owned: true,
    finishedAt: today,
    rating: 5,
    review: 'Clássico atemporal.',
    reviewPublic: true,
  })
  await createLog(esposa.token, dom, { date: yesterday, pages: 30, endPage: 90, note: 'Boa leitura', quote: 'Capitu, olhos de ressaca', quotePage: 60 })
  await createLog(esposa.token, dom, { date: today, pages: 30, endPage: 120 })
  await createLog(esposa.token, bichos, { date: today, pages: 152, endPage: 152 })
  await api(`/api/goals?space=${spaceId}`, {
    token: esposa.token,
    body: { metric: 'paginas', period: 'dia', target: 20, weekStart: 1, graceHours: 24, startsOn: today },
  })

  return {
    marido,
    esposa,
    space: spaceId,
    api,
    login,
    magicTokenFor,
    stepUpCode: (email: string) => {
      const secret = secrets.get(email)
      if (!secret) throw new Error(`sem 2FA para ${email}`)
      return totpCode(secret)
    },
    logs: () => output,
    ids: { marido: maridoSession.record.id, esposa: esposaSession.record.id, dom, hobbit, sapiens, bichos, space: spaceId },
    stop: () =>
      new Promise<void>((resolvePromise) => {
        child.once('exit', () => {
          try {
            rmSync(dataDir, { recursive: true, force: true })
          } catch {
            // ignore
          }
          resolvePromise()
        })
        child.kill('SIGTERM')
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL')
        }, 4000)
      }),
  }
}

export type LoginAs = (persona: 'marido' | 'esposa') => Promise<void>

interface TestFixtures {
  loginAs: LoginAs
}

interface WorkerFixtures {
  backend: Backend
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  backend: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const backend = await startBackend()
      await use(backend)
      await backend.stop()
    },
    { scope: 'worker' },
  ],

  loginAs: async ({ page, backend }, use) => {
    page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[console.error] ${msg.text()}`)
    })
    const run: LoginAs = async (persona) => {
      const user = backend[persona]
      await page.addInitScript(
        ({ token, space, user }) => {
          localStorage.setItem('ml.token', token)
          localStorage.setItem('ml.space', space)
          localStorage.setItem('ml.user', JSON.stringify({ id: user.id, email: user.email, name: user.name }))
        },
        {
          token: user.token,
          space: backend.space,
          user: {
            id: persona === 'marido' ? backend.ids.marido : backend.ids.esposa,
            email: user.email,
            name: user.name,
          },
        },
      )
    }
    await use(run)
  },
})

export { expect } from '@playwright/test'
export type { Page }
