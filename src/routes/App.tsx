import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthProvider'
import { LoadingState } from '../components/ui/States'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/Login/LoginPage'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { LeadListPage } from '../pages/Leads/LeadListPage'
import { LeadFormPage } from '../pages/Leads/LeadFormPage'
import { LeadDetailPage } from '../pages/Leads/LeadDetailPage'
import { ImportPage } from '../pages/Imports/ImportPage'
import { ImportDetailPage } from '../pages/Imports/ImportDetailPage'
import { ScriptListPage } from '../pages/Scripts/ScriptListPage'
import { ScriptEntryPage } from '../pages/Scripts/ScriptEntryPage'
import { LibraryListPage } from '../pages/Library/LibraryListPage'
import { LibraryEntryPage } from '../pages/Library/LibraryEntryPage'
import { ClientListPage } from '../pages/Clients/ClientListPage'
import { ClientDetailPage } from '../pages/Clients/ClientDetailPage'
import { ClientFormPage } from '../pages/Clients/ClientFormPage'
import { ProjectDetailPage } from '../pages/Projects/ProjectDetailPage'
import { ProjectFormPage } from '../pages/Projects/ProjectFormPage'

function ProtectedRoute() {
  const { user, loading, configured } = useAuth()
  const location = useLocation()
  if (loading) return <div className="route-loading"><LoadingState label="Carregando sua sessão…" /></div>
  if (!configured || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function App() {
  const { user } = useAuth()
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/leads" element={<LeadListPage />} /><Route path="/leads/novo" element={<LeadFormPage />} /><Route path="/leads/:id/editar" element={<LeadFormPage />} /><Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/clientes" element={<ClientListPage />} /><Route path="/clientes/:id/editar" element={<ClientFormPage />} /><Route path="/clientes/:id" element={<ClientDetailPage />} />
      <Route path="/projetos/novo" element={<ProjectFormPage />} /><Route path="/projetos/:id/editar" element={<ProjectFormPage />} /><Route path="/projetos/:id" element={<ProjectDetailPage />} />
      <Route path="/propostas" element={<PlaceholderPage />} /><Route path="/propostas/nova" element={<PlaceholderPage />} /><Route path="/propostas/:id" element={<PlaceholderPage />} />
      <Route path="/scripts" element={<ScriptListPage />} /><Route path="/scripts/novo" element={<ScriptEntryPage />} /><Route path="/scripts/:id" element={<ScriptEntryPage />} />
      <Route path="/biblioteca" element={<LibraryListPage />} /><Route path="/biblioteca/novo" element={<LibraryEntryPage />} /><Route path="/biblioteca/:id" element={<LibraryEntryPage />} />
      <Route path="/importacao" element={<ImportPage />} /><Route path="/importacao/:id" element={<ImportDetailPage />} /><Route path="/configuracoes" element={<PlaceholderPage />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
  </Routes>
}
