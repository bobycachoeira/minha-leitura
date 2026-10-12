import type { ApiError } from '@ml/shared'
import { endRequest, startRequest } from '../lib/loading.js'
import { useToastsStore } from '../stores/toasts.js'
import { useErrorsStore } from '../stores/errors.js'

const API_URL = import.meta.env.VITE_API_URL ?? ''

let accessToken: string | null = null
let stepUpToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setStepUpToken(token: string | null): void {
  stepUpToken = token
}

export function getStepUpToken(): string | null {
  return stepUpToken
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.status = status
    this.code = error.code
    this.details = error.details
  }
}

let stepUpHandler: (() => void) | null = null
let unauthorizedHandler: (() => void) | null = null

/** Registers a global handler invoked when the API requires 2FA step-up. */
export function onStepUpRequired(handler: (() => void) | null): void {
  stepUpHandler = handler
}

/** Registers a global handler invoked when the session is no longer valid (401). */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  auth?: boolean
  stepUp?: boolean
}

function notifyError(message: string): void {
  try {
    useToastsStore().push(message, { kind: 'error', to: { name: 'diagnostics' } })
  } catch {
    // toasts unavailable (very early init) — ignore
  }
  try {
    useErrorsStore().logError('API', message)
  } catch {
    // ignore
  }
}

/** Thin fetch wrapper carrying Bearer + optional `X-Step-Up-Token` (T048). */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  // Absolute API base (e.g. http://127.0.0.1:8090 in dev) is used directly;
  // otherwise requests are same-origin (the Caddy / cloudflared setup proxies /api).
  const url = API_URL.startsWith('http')
    ? new URL(path, API_URL)
    : new URL(path, window.location.origin)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (options.stepUp && stepUpToken) headers['X-Step-Up-Token'] = stepUpToken

  startRequest()
  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (err) {
    notifyError('Sem conexão com o servidor.')
    throw err
  } finally {
    endRequest()
  }

  if (!res.ok) {
    let error: ApiError = { code: 'http_error', message: res.statusText }
    try {
      error = (await res.json()) as ApiError
    } catch {
      // keep default error
    }
    if (error.code === 'step_up_required' && stepUpHandler) stepUpHandler()
    if (res.status === 401 && options.auth !== false && unauthorizedHandler) {
      unauthorizedHandler()
    } else if (error.code !== 'step_up_required' && options.auth !== false) {
      notifyError(error.message || 'Algo deu errado.')
    }
    throw new ApiRequestError(res.status, error)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
