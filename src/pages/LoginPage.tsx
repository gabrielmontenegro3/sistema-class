import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiOkData, ApiError } from '../lib/api'
import { useAuth, type AuthUser } from '../app/auth'
import { Button, Card, Select } from '../components/ui'

type AnyItem = Record<string, unknown>

function toUser(it: AnyItem): AuthUser | null {
  const id = it.id
  const nome = it.nome
  const idStr = typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null
  if (!idStr) return null
  if (typeof nome !== 'string' || !nome.trim()) return null
  return { id: idStr, nome: nome.trim() }
}

export function LoginPage() {
  const { user, setUser } = useAuth()
  const [items, setItems] = useState<AnyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')

  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [navigate, user])

  useEffect(() => {
    let mounted = true
    async function load() {
      setErr(null)
      setLoading(true)
      try {
        const data = await apiOkData<AnyItem[]>('/usuarios')
        if (!mounted) return
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!mounted) return
        setErr(e instanceof ApiError ? e.message : 'Falha ao carregar usuários')
        setItems([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const users = useMemo(() => {
    const u = items.map(toUser).filter(Boolean) as AuthUser[]
    u.sort((a, b) => a.nome.localeCompare(b.nome))
    return u
  }, [items])

  const selectedUser = users.find((u) => u.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-semibold">
            SC
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">Sistema Class</div>
            <div className="text-xs text-zinc-400">Selecione um usuário para entrar</div>
          </div>
        </div>

        <Card title="Login">
          {loading ? <div className="text-sm text-zinc-300">Carregando usuários...</div> : null}
          {err ? <div className="mt-3 text-sm text-red-200">{err}</div> : null}

          <div className="mt-4">
            <Select
              label="Usuário"
              value={selectedId}
              onChange={setSelectedId}
              disabled={loading || users.length === 0}
              placeholder={loading ? 'Carregando...' : users.length ? 'Selecione...' : 'Nenhum usuário encontrado'}
              options={users.map((u) => ({ value: u.id, label: u.nome }))}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={() => {
                if (!selectedUser) return
                setUser(selectedUser)
                navigate(from, { replace: true })
              }}
              disabled={!selectedUser}
            >
              Entrar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

