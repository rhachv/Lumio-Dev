import { Link } from 'react-router-dom'
import type { ProposalListItem } from '../../types/database'
import { ProposalStatusBadge } from './ProposalStatusBadge'
import { formatProposalDate, formatProposalValue } from './proposalMeta'

export function ProposalCard({ proposal, busy, onArchive }: { proposal: ProposalListItem; busy: boolean; onArchive: (proposal: ProposalListItem) => void }) {
  return <article className="proposal-card">
    <div className="proposal-card-top"><ProposalStatusBadge status={proposal.status} /><span>{formatProposalDate(proposal.created_at)}</span></div>
    <Link className="proposal-card-title" to={`/propostas/${proposal.id}`}>{proposal.title}</Link>
    <p className="proposal-card-company">{[proposal.client_company_name, proposal.lead_company_name].filter(Boolean).join(' · ') || 'Sem vínculo'}</p>
    <div className="proposal-card-bottom"><span>{proposal.service}</span><strong>{formatProposalValue(proposal.value)}</strong></div>
    <div className="proposal-card-footer"><span>Validade: {formatProposalDate(proposal.valid_until)}</span><button className="text-button" type="button" disabled={busy} onClick={() => onArchive(proposal)}>{proposal.is_archived ? 'Restaurar' : 'Arquivar'}</button></div>
  </article>
}
