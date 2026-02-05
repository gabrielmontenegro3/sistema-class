export type ApiEnvelopeOk<T> = { ok: true; data: T }
export type ApiEnvelopeError = { ok: false; error: { message: string; details?: unknown } }
export type ApiEnvelope<T> = ApiEnvelopeOk<T> | ApiEnvelopeError

export class ApiError extends Error {
  readonly details?: unknown
  readonly status?: number

  constructor(message: string, opts?: { details?: unknown; status?: number }) {
    super(message)
    this.name = 'ApiError'
    this.details = opts?.details
    this.status = opts?.status
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeBaseUrl(
  // Força API local (remove "API online")
  'https://sistema-class-backend.vercel.app/api',
)

export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

function joinUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function isOkEnvelope<T>(x: unknown): x is ApiEnvelopeOk<T> {
  return typeof x === 'object' && x !== null && (x as { ok?: unknown }).ok === true && 'data' in x
}

function isErrEnvelope(x: unknown): x is ApiEnvelopeError {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as { ok?: unknown }).ok === false &&
    'error' in x
  )
}

export async function apiOkData<T>(path: string, init?: RequestInit): Promise<T> {
  const url = joinUrl(API_BASE_URL, path)
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const json = await readJsonSafe(res)

  if (!res.ok) {
    if (isErrEnvelope(json)) {
      throw new ApiError(json.error.message, { details: json.error.details, status: res.status })
    }
    throw new ApiError('Erro na requisição', { details: json, status: res.status })
  }

  if (isOkEnvelope<T>(json)) return json.data
  if (isErrEnvelope(json)) throw new ApiError(json.error.message, { details: json.error.details })
  throw new ApiError('Resposta inválida da API', { details: json, status: res.status })
}

export async function apiHealth(): Promise<{ ok: boolean }> {
  const url = joinUrl(BACKEND_BASE_URL, '/health')
  const res = await fetch(url)
  if (!res.ok) return { ok: false }
  return { ok: true }
}

