import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import type { DashboardActivity } from '../../types/database'

const eventIcons: Record<DashboardActivity['entity_type'], IconName> = { lead: 'users', interaction: 'message', project: 'briefcase', proposal: 'file' }
export function RecentActivity({ events, loading, error, onRetry }: { events: DashboardActivity[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (error) return <div className="dashboard-section-state"><ErrorState onRetry={onRetry}>Não foi possível carregar a atividade recente.</ErrorState></div>
  if (loading && events.length === 0) return <div className="dashboard-section-state"><LoadingState label="Carregando atividade…" /></div>
  if (events.length === 0) return <EmptyState title="Ainda não há movimentações" description="Cadastros e alterações recentes aparecerão aqui conforme você usa o sistema." />
  return <div className="recent-activity-list" aria-busy={loading}>{events.map((event) => <article className="recent-activity-item" key={event.id}>
    <span className={`recent-activity-icon recent-activity-icon--${event.entity_type}`} aria-hidden="true"><Icon name={eventIcons[event.entity_type]} /></span>
    <div className="recent-activity-copy"><div><span>{event.description}</span><time dateTime={event.occurred_at}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(event.occurred_at))}</time></div><Link to={event.href}>{event.entity_name}</Link></div>
  </article>)}</div>
}
