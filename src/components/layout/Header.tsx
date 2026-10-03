import { useState, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Icon } from '../ui/Icon'

const titles: Record<string, string> = {
  '/dashboard': 'Visão geral', '/leads': 'Prospecção', '/clientes': 'Clientes', '/propostas': 'Propostas',
  '/scripts': 'Scripts', '/biblioteca': 'Biblioteca', '/importacao': 'Importação', '/configuracoes': 'Configurações',
}

export function Header({ onMenu, menuOpen, menuButtonRef }: { onMenu: () => void; menuOpen: boolean; menuButtonRef: RefObject<HTMLButtonElement | null> }) {
  const { user, signOut, error } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const title = titles[location.pathname] ?? titles[Object.keys(titles).find((path) => path !== '/dashboard' && location.pathname.startsWith(`${path}/`)) ?? ''] ?? 'Lumio Dev'

  async function logout() {
    setBusy(true); setNotice(null)
    const successful = await signOut()
    setBusy(false)
    if (successful) navigate('/login')
    else setNotice('Não foi possível encerrar a sessão. Tente novamente.')
  }

  return <header className="topbar">
    <button ref={menuButtonRef} className="icon-button mobile-menu" onClick={onMenu} aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'} aria-expanded={menuOpen} aria-controls="primary-navigation"><Icon name="menu" /></button>
    <div className="topbar-heading"><span className="topbar-context">Lumio Dev</span><Icon name="chevron" /><span>{title}</span></div>
    <div className="topbar-actions"><span className="user-chip" title={user?.email ?? ''}><span className="avatar">{user?.email?.slice(0, 1).toUpperCase() ?? 'L'}</span><span className="user-email">{user?.email}</span></span>
      <button className="logout-button" onClick={logout} disabled={busy}><Icon name="logout" /><span>{busy ? 'Saindo…' : 'Sair'}</span></button>
    </div>
    {(error || notice) && <div className="sr-only" role="status">{notice ?? error}</div>}
  </header>
}
