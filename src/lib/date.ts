export function formatDayMonth(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return '—'

  // Common backend format: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    const mm = m[2]
    const dd = m[3]
    return `${dd}/${mm}`
  }

  // Fallback: try parsing as Date (ISO with time etc.)
  const ts = Date.parse(s)
  if (Number.isNaN(ts)) return s
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

