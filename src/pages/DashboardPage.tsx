import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Page } from '../components/ui'
import { useAuth } from '../app/auth'
import { ApiError, apiOkData } from '../lib/api'
import { formatDayMonth } from '../lib/date'

type AnyItem = Record<string, unknown>

function asString(x: unknown): string {
  if (x === null || x === undefined) return ''
  if (typeof x === 'string') return x
  if (typeof x === 'number' || typeof x === 'boolean') return String(x)
  return JSON.stringify(x)
}

function getId(item: AnyItem): string | null {
  const id = item.id
  if (typeof id === 'string') return id
  if (typeof id === 'number') return String(id)
  return null
}

function toDateOnlyValue(s: string): string | null {
  const raw = s.trim()
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (m) return raw
  const ts = Date.parse(raw)
  if (Number.isNaN(ts)) return null
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function todayLocalISODate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function DashboardTile(props: { to: string; title: string; gradient: string }) {
  return (
    <Link
      to={props.to}
      className={[
        'group relative block aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6',
        'transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
      ].join(' ')}
    >
      <div className={['pointer-events-none absolute inset-0 opacity-30 transition group-hover:opacity-60', props.gradient].join(' ')} />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <div className="text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">{props.title}</div>
        <div className="mt-3 h-1 w-10 rounded-full bg-white/15" />
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function compute() {
      try {
        const mq = window.matchMedia?.('(pointer: coarse), (max-width: 768px)')
        if (mq?.matches) return true
      } catch {
        // ignore
      }
      const ua = navigator.userAgent || ''
      return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
    }
    setIsMobile(compute())
    function onResize() {
      setIsMobile(compute())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [upcoming, setUpcoming] = useState<AnyItem[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [upcomingErr, setUpcomingErr] = useState<string | null>(null)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragStartXRef = useRef(0)
  const scrollStartRef = useRef(0)

  useEffect(() => {
    let mounted = true
    async function run() {
      setUpcomingErr(null)
      setUpcomingLoading(true)
      try {
        const rows = await apiOkData<AnyItem[]>('/atividades')
        const list = Array.isArray(rows) ? rows : []
        const today = todayLocalISODate()

        const next = list
          .filter((a) => {
            const de = toDateOnlyValue(asString(a.data_entrega))
            if (!de) return false
            return de >= today
          })
          .sort((a, b) => {
            const da = toDateOnlyValue(asString(a.data_entrega)) ?? '9999-12-31'
            const db = toDateOnlyValue(asString(b.data_entrega)) ?? '9999-12-31'
            if (da !== db) return da.localeCompare(db)
            const fa = Boolean(a.feita)
            const fb = Boolean(b.feita)
            if (fa !== fb) return fa ? 1 : -1 // pendentes primeiro no mesmo dia
            return asString(a.materia).localeCompare(asString(b.materia))
          })
          .slice(0, 12)

        if (!mounted) return
        setUpcoming(next)
      } catch (e) {
        if (!mounted) return
        setUpcomingErr(e instanceof ApiError ? e.message : 'Falha ao carregar próximas entregas')
        setUpcoming([])
      } finally {
        if (!mounted) return
        setUpcomingLoading(false)
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [])

  const upcomingTitle = useMemo(() => {
    if (upcomingLoading) return 'Próximas entregas (carregando...)'
    return 'Próximas entregas'
  }, [upcomingLoading])

  return (
    <Page title="Painel">
      <div className="mb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-100">{upcomingTitle}</div>
          <Link
            to="/agenda"
            className={[
              'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2',
              'text-xs font-semibold text-zinc-100',
              'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
            ].join(' ')}
            aria-label="Ver Agenda"
            title="Ver Agenda"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M7 3v3" />
              <path d="M17 3v3" />
              <path d="M4 8h16" />
              <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
            </svg>
            Ver Agenda
          </Link>
        </div>

        {upcomingErr ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{upcomingErr}</div> : null}

        {!upcomingErr ? (
          <div
            ref={scrollerRef}
            className={['-mx-4 overflow-x-auto px-4 select-none no-scrollbar', dragging ? 'cursor-grabbing' : 'cursor-grab'].join(' ')}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              const el = scrollerRef.current
              if (!el) return
              setDragging(true)
              dragStartXRef.current = e.clientX
              scrollStartRef.current = el.scrollLeft
              el.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!dragging) return
              const el = scrollerRef.current
              if (!el) return
              const dx = e.clientX - dragStartXRef.current
              el.scrollLeft = scrollStartRef.current - dx
            }}
            onPointerUp={(e) => {
              const el = scrollerRef.current
              if (el) el.releasePointerCapture(e.pointerId)
              setDragging(false)
            }}
            onPointerCancel={() => setDragging(false)}
          >
            <div className="flex snap-x snap-mandatory gap-3 pb-2">
              {upcomingLoading ? (
                <div className="min-w-[240px] snap-start rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  Carregando...
                </div>
              ) : upcoming.length === 0 ? (
                <div className="min-w-[240px] snap-start rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  Sem entregas próximas.
                </div>
              ) : (
                upcoming.map((a) => {
                  const id = getId(a) ?? `${asString(a.materia)}-${asString(a.data_entrega)}`
                  const feita = Boolean(a.feita)
                  return (
                    <div
                      key={id}
                      className="relative min-w-[240px] max-w-[280px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div
                        className={['absolute inset-y-0 left-0 w-1', feita ? 'bg-emerald-400/80' : 'bg-amber-400/80'].join(' ')}
                        aria-hidden
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-zinc-100">{asString(a.materia) || 'Atividade'}</div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div
                            className={[
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                              feita
                                ? 'border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-100'
                                : 'border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-100',
                            ].join(' ')}
                          >
                            <span className={['h-2 w-2 rounded-full', feita ? 'bg-emerald-300' : 'bg-amber-300'].join(' ')} />
                            {feita ? 'Feita' : 'Pendente'}
                          </div>
                          <div className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-200">
                            {formatDayMonth(a.data_entrega)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-200">{asString(a.conteudo) || '—'}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardTile to="/agenda" title="Agenda" gradient="bg-gradient-to-br from-emerald-500/25 to-cyan-500/10" />
        <DashboardTile to="/resumos" title="Resumos" gradient="bg-gradient-to-br from-amber-500/25 to-rose-500/10" />
        <DashboardTile to="/leituras" title="Leituras" gradient="bg-gradient-to-br from-sky-500/25 to-indigo-500/10" />
        <DashboardTile to="/testes" title="Testes" gradient="bg-gradient-to-br from-fuchsia-500/25 to-purple-500/10" />
        {!isDavi ? (
          <DashboardTile to="/correcoes" title="Correções" gradient="bg-gradient-to-br from-indigo-500/25 to-sky-500/10" />
        ) : null}
        {isDavi && isMobile ? (
          <DashboardTile to="/dicionario" title="Dicionário" gradient="bg-gradient-to-br from-lime-500/20 to-emerald-500/10" />
        ) : null}
      </div>
    </Page>
  )
}

