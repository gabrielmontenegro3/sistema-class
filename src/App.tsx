import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { RequireUser } from './app/RequireUser'
import { AgendaPage } from './pages/AgendaPage'
import { DashboardPage } from './pages/DashboardPage'
import { DicionarioPage } from './pages/DicionarioPage'
import { LeiturasPage } from './pages/LeiturasPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ResumosPage } from './pages/ResumosPage'
import { CorrecoesPage } from './pages/CorrecoesPage'
import { TestesPage } from './pages/TestesPage'
import { UsuariosPage } from './pages/UsuariosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireUser>
            <Layout />
          </RequireUser>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/resumos" element={<ResumosPage />} />
        <Route path="/leituras" element={<LeiturasPage />} />
        <Route path="/testes" element={<TestesPage />} />
        <Route path="/correcoes" element={<CorrecoesPage />} />
        <Route path="/dicionario" element={<DicionarioPage />} />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
