import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import type { ReactNode } from 'react'

export function RequireUser(props: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{props.children}</>
}

