import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDeviceId, requestMagicLink, verify2fa } from '../../src/api/auth-api.js'

describe('auth API contract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('generates a stable device id', () => {
    const first = getDeviceId()
    const second = getDeviceId()
    expect(first).toBe(second)
    expect(first).toMatch(/[0-9a-f-]{36}/)
  })

  it('posts to the magic-link request endpoint', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ sent: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestMagicLink('leitor@example.com')
    expect(result.sent).toBe(true)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/api/auth/magic-link/request')
    expect(options?.method).toBe('POST')
  })

  it('posts to the 2FA verify endpoint', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ token: 't', record: { id: 'u1', email: 'a@b.c' } }), {
          status: 200,
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await verify2fa('u1', '123456')
    expect(result.token).toBe('t')
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/auth/2fa/verify')
  })
})
