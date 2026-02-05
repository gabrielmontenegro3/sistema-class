import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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

export function CreateButton(props: { onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label ?? 'Criar'}
      title={props.label ?? 'Criar'}
      className={[
        'inline-flex h-12 w-12 items-center justify-center rounded-full',
        'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20',
        'transition hover:brightness-110 active:brightness-95',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  )
}

export function OpenButton(props: { onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label ?? 'Abrir'}
      title={props.label ?? 'Abrir'}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white',
        'transition hover:bg-white/10',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ')}
    >
      {/* eye icon */}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  )
}

export function ConfirmDelete(props: {
  onConfirm: () => void | Promise<void>
  disabled?: boolean
  busy?: boolean
  stopPropagation?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const disabled = Boolean(props.disabled) || Boolean(props.busy) || confirming
  const stop = props.stopPropagation !== false

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      const el = ref.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function doConfirm() {
    if (disabled) return
    setConfirming(true)
    try {
      await props.onConfirm()
      setOpen(false)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="relative z-40" ref={ref}>
      <button
        type="button"
        disabled={Boolean(props.disabled) || Boolean(props.busy)}
        className={[
          'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200',
          'transition hover:bg-red-500/10 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
        title="Excluir"
        aria-label="Excluir"
        onMouseDown={(e) => {
          if (!stop) return
          e.stopPropagation()
        }}
        onClick={(e) => {
          if (stop) e.stopPropagation()
          if (Boolean(props.disabled) || Boolean(props.busy)) return
          setOpen(true)
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>

      {open ? (
        <div
          className={[
            'absolute bottom-full right-0 z-50 mb-2 w-48 overflow-hidden rounded-xl border border-white/10',
            'bg-zinc-950/95 shadow-2xl shadow-black/40 backdrop-blur',
          ].join(' ')}
          onMouseDown={(e) => {
            if (stop) e.stopPropagation()
          }}
        >
          <div className="px-3 py-2 text-xs font-semibold text-zinc-100">Excluir?</div>
          <div className="flex items-center justify-end gap-2 border-t border-white/10 px-3 py-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
              onClick={(e) => {
                if (stop) e.stopPropagation()
                setOpen(false)
              }}
              disabled={confirming}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-500/25 bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-60"
              onClick={(e) => {
                if (stop) e.stopPropagation()
                void doConfirm()
              }}
              disabled={disabled}
            >
              {confirming ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function GlassSegmentedControl(props: {
  value: 'pendente' | 'feita'
  onChange: (v: 'pendente' | 'feita') => void
  disabled?: boolean
}) {
  const isFeita = props.value === 'feita'
  const disabled = Boolean(props.disabled)
  const pendRef = useRef<HTMLDivElement | null>(null)
  const feitaRef = useRef<HTMLDivElement | null>(null)
  const [segW, setSegW] = useState<{ pend: number; feita: number }>({ pend: 0, feita: 0 })

  useLayoutEffect(() => {
    if (!pendRef.current || !feitaRef.current) return
    const p = pendRef.current as HTMLDivElement
    const f = feitaRef.current as HTMLDivElement

    function measure() {
      const pw = p.offsetWidth
      const fw = f.offsetWidth
      setSegW((cur) => (cur.pend === pw && cur.feita === fw ? cur : { pend: pw, feita: fw }))
    }

    measure()

    const ro = new ResizeObserver(() => measure())
    ro.observe(p as HTMLDivElement)
    ro.observe(f as HTMLDivElement)
    return () => ro.disconnect()
  }, [])

  const sliderW = isFeita ? segW.feita : segW.pend
  const sliderX = isFeita ? segW.pend : 0

  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={isFeita}
      aria-label="Alternar status"
      title={isFeita ? 'Marcar como pendente' : 'Marcar como feita'}
      onClick={() => props.onChange(isFeita ? 'pendente' : 'feita')}
      className={[
        'relative inline-flex select-none items-center rounded-full border border-white/10 bg-white/5 p-1',
        'shadow-inner shadow-black/30',
        'transition',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/25',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/10',
      ].join(' ')}
    >
      {/* slider (glass) */}
      <div
        className={[
          'absolute inset-y-1 left-1 rounded-full',
          'backdrop-blur-[8px]',
          'shadow-[0_10px_28px_rgba(0,0,0,0.30)]',
          'transition-[transform,width,background-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          // brilho interno sutil
          'ring-1 ring-white/20',
          // cor dinâmica
          isFeita ? 'bg-emerald-400/18' : 'bg-amber-400/18',
        ].join(' ')}
        style={{
          width: sliderW ? `${sliderW}px` : undefined,
          transform: `translateX(${sliderX}px)`,
        }}
        aria-hidden
      />

      {/* labels (clique em qualquer lugar alterna) */}
      <div className="relative z-10 inline-flex items-center text-[11px] font-semibold">
        <div
          ref={pendRef}
          className={['px-2.5 py-1.5', !isFeita ? 'text-zinc-50' : 'text-zinc-300'].join(' ')}
        >
          Pendente
        </div>
        <div
          ref={feitaRef}
          className={['px-2.5 py-1.5', isFeita ? 'text-zinc-50' : 'text-zinc-300'].join(' ')}
        >
          Feita
        </div>
      </div>
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

export type SelectOption = { value: string; label: string; sublabel?: string }

export function Select(props: {
  label: string
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(() => props.options.find((o) => o.value === props.value) ?? null, [props.options, props.value])

  useEffect(() => {
    setOpen(false)
  }, [props.value])

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      const el = ref.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const disabled = Boolean(props.disabled) || props.options.length === 0
  const placeholder = props.placeholder ?? 'Selecione...'

  return (
    <div className="block">
      <div className="mb-1 text-xs font-medium text-zinc-300">{props.label}</div>
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3 pr-11 text-left text-sm text-zinc-100',
            'shadow-inner shadow-black/20 ring-1 ring-white/5',
            'transition hover:bg-zinc-950/45',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
            'disabled:cursor-not-allowed disabled:opacity-60',
          ].join(' ')}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0">
            {selected ? (
              <>
                <div className="truncate font-semibold text-zinc-50">{selected.label}</div>
                {selected.sublabel ? <div className="mt-0.5 truncate text-xs text-zinc-400">{selected.sublabel}</div> : null}
              </>
            ) : (
              <div className="truncate text-zinc-300">{placeholder}</div>
            )}
          </div>
        </button>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-300" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {open ? (
          <div
            role="listbox"
            className={[
              'absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10',
              'bg-zinc-950/95 shadow-2xl shadow-black/40 backdrop-blur',
            ].join(' ')}
          >
            <div className="max-h-72 overflow-auto p-1">
              {props.options.map((o) => {
                const isSelected = o.value === props.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      'relative w-full overflow-hidden rounded-xl px-3 py-3 text-left',
                      'transition',
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5',
                    ].join(' ')}
                    onClick={() => {
                      props.onChange(o.value)
                      setOpen(false)
                    }}
                  >
                    {isSelected ? <div className="absolute inset-y-0 left-0 w-1 bg-indigo-400/80" aria-hidden /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{o.label}</div>
                        {o.sublabel ? <div className="mt-0.5 text-xs text-zinc-400">{o.sublabel}</div> : null}
                      </div>
                      {isSelected ? (
                        <div className="mt-0.5 text-indigo-200" aria-hidden>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
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

export function Modal(props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'default' | 'view'
}) {
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
      <div
        className="absolute inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-10"
        onPointerDown={(e) => {
          // clica fora do dialog → fecha
          if (e.target === e.currentTarget) props.onClose()
        }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <div
            role="dialog"
            aria-modal="true"
            className="rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur"
            onPointerDown={(e) => {
              // evita fechar quando interage dentro do modal
              e.stopPropagation()
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div
                className={[
                  props.variant === 'view'
                    ? 'text-base font-semibold tracking-tight text-zinc-50 sm:text-lg md:text-xl'
                    : 'text-sm font-semibold text-zinc-100',
                ].join(' ')}
              >
                {props.title}
              </div>
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

