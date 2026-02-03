import { useEffect, type ReactNode } from 'react'

export function Page(props: { title: string; description?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{props.title}</h1>
          {props.description ? <p className="mt-1 text-sm text-zinc-400">{props.description}</p> : null}
        </div>
        {props.right ? <div className="flex items-center gap-2">{props.right}</div> : null}
      </div>
      {props.children}
    </div>
  )
}

export function Card(props: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {props.title ? <div className="mb-3 text-sm font-semibold">{props.title}</div> : null}
      {props.children}
    </div>
  )
}

export function Button(props: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const cls =
    props.variant === 'danger'
      ? `${base} bg-red-500 text-white hover:bg-red-400`
      : props.variant === 'secondary'
        ? `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`
        : `${base} bg-indigo-500 text-white hover:bg-indigo-400`

  return (
    <button type={props.type ?? 'button'} className={cls} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

export function Input(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'date' | 'number'
}) {
  const dateTweaks =
    props.type === 'date'
      ? ' [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100'
      : ''
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-300">{props.label}</div>
      <input
        className={[
          'w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
          dateTweaks,
        ].join(' ')}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? 'text'}
      />
    </label>
  )
}

export function Select(props: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-300">{props.label}</div>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="" disabled>
          {props.placeholder ?? 'Selecione...'}
        </option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Textarea(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-300">{props.label}</div>
      <textarea
        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
      />
    </label>
  )
}

export function Checkbox(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-zinc-950/40 text-indigo-500 focus:ring-indigo-500/40"
      />
      {props.label}
    </label>
  )
}

export function InlineError(props: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {props.message}
    </div>
  )
}

export function Modal(props: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!props.open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60"
        onClick={props.onClose}
      />

      <div className="absolute inset-0 overflow-y-auto px-4 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div
            role="dialog"
            aria-modal="true"
            className="rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="text-sm font-semibold text-zinc-100">{props.title}</div>
              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Fechar"
                title="Fechar"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5">{props.children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

