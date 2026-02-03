import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiHealth } from '../lib/api'
import { useAuth } from './auth'

export function Layout() {
  const [health, setHealth] = useState<'unknown' | 'ok' | 'down'>('unknown')
  const { user, logout } = useAuth()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const isTestes = location.pathname === '/testes'

  useEffect(() => {
    let mounted = true
    async function run() {
      const res = await apiHealth()
      if (!mounted) return
      setHealth(res.ok ? 'ok' : 'down')
    }
    void run()
    const t = window.setInterval(() => void run(), 15000)
    return () => {
      mounted = false
      window.clearInterval(t)
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-semibold">
                SC
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">Sistema Class</div>
                <div className="text-xs text-zinc-400">Painel</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              {user ? (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="text-zinc-400">Usuário:</span>
                  <span className="font-semibold text-zinc-100">{user.nome}</span>
                  <Link
                    to="/login"
                    onClick={() => logout()}
                    className="ml-1 text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
                  >
                    Trocar
                  </Link>
                </div>
              ) : null}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    health === 'ok' ? 'bg-emerald-400' : health === 'down' ? 'bg-red-400' : 'bg-zinc-400',
                  ].join(' ')}
                />
                <span className="text-zinc-200">{health === 'ok' ? 'API online' : health === 'down' ? 'API offline' : 'Verificando API'}</span>
              </div>
            </div>
          </div>
        </header>

        {!isDashboard ? (
          <div className="mt-4">
            <Link
              to="/"
              className={[
                'inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white',
                'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
              ].join(' ')}
            >
              <span aria-hidden>←</span>
              Voltar
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

