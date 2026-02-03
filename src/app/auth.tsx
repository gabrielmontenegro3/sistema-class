import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AuthUser = { id: string; nome: string }

type AuthContextValue = {
  user: AuthUser | null
  setUser: (u: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'sc_user'

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const u = parsed as { id?: unknown; nome?: unknown }
    if (typeof u.id !== 'string' || typeof u.nome !== 'string') return null
    return { id: u.id, nome: u.nome }
  } catch {
    return null
  }
}

export function AuthProvider(props: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => readStoredUser())

  useEffect(() => {
    // Mantém compatibilidade com a regra antiga (se existir no localStorage)
    const legacyName = (localStorage.getItem('sc_user_name') ?? '').trim()
    const legacyId = (localStorage.getItem('sc_user_id') ?? '').trim()
    if (!user && legacyName && legacyId) {
      const u: AuthUser = { id: legacyId, nome: legacyName }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
      setUserState(u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      setUser: (u) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
        localStorage.setItem('sc_user_name', u.nome)
        localStorage.setItem('sc_user_id', u.id)
        setUserState(u)
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem('sc_user_name')
        localStorage.removeItem('sc_user_id')
        setUserState(null)
      },
    }
  }, [user])

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

