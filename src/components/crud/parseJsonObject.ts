export function parseJsonObject(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: {} }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'JSON deve ser um objeto { ... }' }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'JSON inválido' }
  }
}

