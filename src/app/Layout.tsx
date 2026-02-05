import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const isTestes = location.pathname === '/testes'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-black/30">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/90 to-fuchsia-500/80 font-semibold text-white">
                  SC
                </div>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight text-zinc-50 sm:text-base">Sistema Class</div>
                <div className="mt-0.5 text-[11px] font-medium tracking-wide text-zinc-400">Painel</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              {user ? (
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 ring-1 ring-white/10">
                    <span className="text-xs font-semibold text-white">{(user.nome || '?').trim().slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-[10px] font-semibold tracking-wide text-zinc-400">Usuário</div>
                    <div className="text-sm font-semibold text-zinc-50">{user.nome}</div>
                  </div>
                  <Link
                    to="/login"
                    onClick={() => logout()}
                    className={[
                      'ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-100',
                      'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
                    ].join(' ')}
                    aria-label="Sair / trocar usuário"
                    title="Sair / trocar usuário"
                  >
                    {/* logout icon */}
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M10 17l-1 0a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1" />
                      <path d="M15 12H9" />
                      <path d="M15 12l-2.5-2.5" />
                      <path d="M15 12l-2.5 2.5" />
                      <path d="M14 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1" />
                    </svg>
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {!isDashboard ? (
          <div className="mt-4">
            <Link
              to="/"
              className={[
                'group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5',
                'transition hover:bg-white/10',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/25',
              ].join(' ')}
              aria-label="Voltar para o painel"
              title="Voltar"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-zinc-950/40 px-3 py-2">
                <span
                  className={[
                    'grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white',
                    'transition group-hover:bg-white/10 group-active:scale-95',
                  ].join(' ')}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </span>
                <span className="text-sm font-semibold tracking-tight text-white/95">Voltar</span>
              </span>
            </Link>
          </div>
        ) : null}

        <main className="mt-6 min-w-0">
          {isTestes ? (
            <Outlet />
          ) : (
            <div className="rounded-2xl bg-white/5 p-5">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

