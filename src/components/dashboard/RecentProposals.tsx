import { Link } from 'react-router-dom'
import type { DashboardRecentProposal } from '../../types/database'
import { ProposalStatusBadge } from '../proposals/ProposalStatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'

export function RecentProposals({ proposals, loading, error, onRetry }: { proposals: DashboardRecentProposal[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (error) return <div className="dashboard-section-state"><ErrorState onRetry={onRetry}>Não foi possível carregar as propostas recentes.</ErrorState></div>
  if (loading && proposals.length === 0) return <div className="dashboard-section-state"><LoadingState label="Carregando propostas recentes…" /></div>
  if (proposals.length === 0) return <EmptyState title="Nenhuma proposta cadastrada" description="Crie uma proposta para acompanhar serviço, valor, validade e status." action={<Link className="button button--secondary" to="/propostas/nova">Criar proposta</Link>} />
  return <div className="recent-record-list recent-proposal-list" aria-busy={loading}>{proposals.map((proposal) => <article className="recent-proposal-row" key={proposal.id}>
    <div className="recent-record-main"><Link to={`/propostas/${proposal.id}`}>{proposal.title}</Link><span>{[proposal.client_company_name, proposal.lead_company_name, proposal.service].filter(Boolean).join(' · ') || proposal.service}</span></div>
    <div className="recent-proposal-side"><strong>{proposal.value === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.value)}</strong><ProposalStatusBadge status={proposal.status} /><time dateTime={proposal.updated_at}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(proposal.updated_at))}</time></div>
  </article>)}</div>
}
