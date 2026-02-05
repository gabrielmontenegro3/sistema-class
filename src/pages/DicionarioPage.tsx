import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Page } from '../components/ui'
import { DICIONARIO_DECK } from '../data/dicionarioDeck'
import { useAuth } from '../app/auth'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HandCardArt() {
  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" aria-hidden>
      {/* card */}
      <g opacity="0.9">
        <rect x="210" y="12" width="150" height="190" rx="16" fill="currentColor" />
      </g>
      {/* hand (simplified silhouette) */}
      <g>
        <path
          d="M110 230c-18-10-34-30-34-54 0-18 8-34 22-46l44-38c8-7 20-6 27 2 7 8 6 20-2 27l-20 18 66-58c8-7 20-6 27 2 7 8 6 20-2 27l-52 46 32-28c8-7 20-6 27 2 7 8 6 20-2 27l-60 53c-20 18-52 43-73 38-14-3-26-6-42-15z"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}

function isMobileNow(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const mq = window.matchMedia?.('(pointer: coarse), (max-width: 768px)')
    if (mq?.matches) return true
  } catch {
    // ignore
  }
  const ua = navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
}

export function DicionarioPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'
  const [isMobile, setIsMobile] = useState(() => isMobileNow())

  useEffect(() => {
    setIsMobile(isMobileNow())
    function onResize() {
      setIsMobile(isMobileNow())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!isDavi || !isMobile) return <Navigate to="/" replace />

  const deck = useMemo(() => shuffle(DICIONARIO_DECK), [])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const pointerDownRef = useRef(false)
  const downXRef = useRef(0)
  const downYRef = useRef(0)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragStartXRef = useRef(0)
  const scrollStartRef = useRef(0)

  const safeIdx = ((idx % deck.length) + deck.length) % deck.length

  // Keep scroller in sync with idx (snap to card)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const width = el.clientWidth
    el.scrollTo({ left: width * safeIdx, behavior: 'smooth' })
  }, [safeIdx])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ') {
        e.preventDefault()
        setRevealed(true)
      }
      if (e.key === 'ArrowRight') setIdx((v) => v + 1)
      if (e.key === 'ArrowLeft') setIdx((v) => v - 1)
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setRevealed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [deck.length])

  return (
    <Page title="Dicionário" description={undefined}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-300">
            Carta <span className="font-semibold text-white">{safeIdx + 1}</span> de{' '}
            <span className="font-semibold text-white">{deck.length}</span>
          </div>
          <div className="text-xs text-zinc-400">Arraste para o lado</div>
        </div>

        <div
          ref={scrollerRef}
          className={['-mx-4 overflow-x-auto px-4 select-none', dragging ? 'cursor-grabbing' : 'cursor-grab'].join(' ')}
          style={{ scrollSnapType: 'x mandatory' }}
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
            if (!el) return
            try {
              el.releasePointerCapture(e.pointerId)
            } catch {
              // ignore
            }
            setDragging(false)
            const width = el.clientWidth || 1
            const next = Math.round(el.scrollLeft / width)
            setIdx(next)
          }}
          onPointerCancel={() => setDragging(false)}
          onScroll={() => {
            const el = scrollerRef.current
            if (!el) return
            const width = el.clientWidth || 1
            const next = Math.round(el.scrollLeft / width)
            if (next !== safeIdx) setIdx(next)
          }}
        >
          <div className="flex">
            {deck.map((c, i) => (
              <div
                key={`${c.categoria}-${c.palavra}-${i}`}
                className="w-full shrink-0 px-1"
                style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' as never }}
              >
                <div className="relative mx-auto max-w-2xl">
                  <div className="absolute inset-0 -z-10">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 blur-2xl" />
                  </div>

                  {/* Art */}
                  <div className="absolute -bottom-6 left-1/2 -z-10 h-[220px] w-[360px] -translate-x-1/2 text-white/10">
                    <HandCardArt />
                  </div>

                  {/* Card surface */}
                  <div
                    className="relative select-none overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-6 sm:p-8"
                    onMouseDown={(e) => {
                      // evita seleção de texto ao clicar e segurar no desktop
                      e.preventDefault()
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      // only handle reveal if this slide is current-ish
                      downXRef.current = e.clientX
                      downYRef.current = e.clientY
                      pointerDownRef.current = true
                      setRevealed(true)
                    }}
                    onPointerMove={(e) => {
                      if (!pointerDownRef.current) return
                      const dx = Math.abs(e.clientX - downXRef.current)
                      const dy = Math.abs(e.clientY - downYRef.current)
                      // if user is swiping, don't show meaning
                      if (dx > 10 && dx > dy) setRevealed(false)
                    }}
                    onPointerUp={() => {
                      pointerDownRef.current = false
                      setRevealed(false)
                    }}
                    onPointerCancel={() => {
                      pointerDownRef.current = false
                      setRevealed(false)
                    }}
                    onPointerLeave={() => {
                      if (!pointerDownRef.current) return
                      pointerDownRef.current = false
                      setRevealed(false)
                    }}
                  >
                    <div className="mt-8 grid place-items-center">
                      <div
                        className={[
                          'w-full max-w-md rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center',
                          'transition',
                          revealed && i === safeIdx ? 'bg-white/8' : 'hover:bg-white/7',
                        ].join(' ')}
                      >
                        {revealed && i === safeIdx ? (
                          <div className="open-frames select-none text-2xl font-extrabold leading-snug tracking-tight text-zinc-100 sm:text-3xl">
                            {c.significado}
                          </div>
                        ) : (
                          <div className="select-none pointer-events-none text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
                            {c.palavra}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

