import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'
import { primaryNavigation } from './navigation'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  const statusLinks = [
    ['Novos', 'new'], ['Abordados', 'contacted'], ['Interessados', 'interested'], ['Negociação', 'negotiation'], ['Sem resposta', 'no_response'], ['Não interessados', 'not_interested'],
  ] as const
  return <>
    {open && <button className="drawer-scrim" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-top"><Logo /><button className="icon-button sidebar-close" onClick={onClose} aria-label="Fechar navegação"><Icon name="close" /></button></div>
      <div className="nav-caption">ESPAÇO DE TRABALHO</div>
      <nav className="nav-list">
        {primaryNavigation.map(({ label, path, icon }) => path === '/leads' ? <details key={path} className="nav-group" open={location.pathname.startsWith('/leads')}>
          <summary className={`nav-link${location.pathname.startsWith('/leads') ? ' nav-link--active' : ''}`}><Icon name={icon} /><span>{label}</span><span className="nav-link-end" aria-hidden="true"><Icon name="chevron" /></span></summary>
          <div className="nav-sublist"><NavLink end to="/leads" onClick={onClose} className={({ isActive }) => `nav-sublink${isActive && !location.search ? ' nav-sublink--active' : ''}`}>Todos os leads</NavLink>
            {statusLinks.map(([statusLabel, status]) => <NavLink key={status} to={`/leads?status=${status}`} onClick={onClose} className={({ isActive }) => `nav-sublink${isActive && new URLSearchParams(location.search).get('status') === status ? ' nav-sublink--active' : ''}`}>{statusLabel}</NavLink>)}
            <NavLink to="/leads?blocked=true" onClick={onClose} className={({ isActive }) => `nav-sublink${isActive && new URLSearchParams(location.search).get('blocked') === 'true' ? ' nav-sublink--active' : ''}`}>Bloqueados</NavLink>
          </div>
        </details> : <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
          <Icon name={icon} /><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom"><NavLink to="/configuracoes" onClick={onClose} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}><Icon name="settings" /><span>Configurações</span></NavLink>
        <div className="sidebar-footnote"><span className="status-dot" />Seu espaço privado</div>
      </div>
    </aside>
  </>
}
