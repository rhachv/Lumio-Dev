import { Link } from 'react-router-dom'
import type { LeadListRow } from '../../services/leads'
import { LeadStatusBadge } from '../leads/LeadStatusBadge'
import { Badge } from '../ui/DataDisplay'
import { Icon } from '../ui/Icon'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'

export function RecentLeads({ leads, loading, error, onRetry }: { leads: LeadListRow[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (error) return <div className="dashboard-section-state"><ErrorState onRetry={onRetry}>Não foi possível carregar os leads recentes.</ErrorState></div>
  if (loading && leads.length === 0) return <div className="dashboard-section-state"><LoadingState label="Carregando leads recentes…" /></div>
  if (leads.length === 0) return <EmptyState title="Nenhum lead cadastrado" description="Adicione um lead ou importe uma lista para começar a organizar a prospecção." action={<div className="dashboard-empty-actions"><Link className="button button--secondary" to="/leads/novo"><Icon name="plus" />Novo lead</Link><Link className="text-link" to="/importacao">Importar leads</Link></div>} />
  return <div className="recent-record-list" aria-busy={loading}>{leads.map((lead) => <article className="recent-record-row" key={lead.id}>
    <div className="recent-record-main"><Link to={`/leads/${lead.id}`}>{lead.company_name}</Link><span>{[lead.responsible_name, lead.niche_name, [lead.city, lead.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'Sem informações complementares'}</span></div>
    <div className="recent-record-side"><LeadStatusBadge status={lead.status} />{lead.is_blocked && <Badge tone="error">Bloqueado</Badge>}<time dateTime={lead.created_at}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(lead.created_at))}</time></div>
  </article>)}</div>
}
