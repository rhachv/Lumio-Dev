import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { ProposalListItem } from '../../types/database'
import { ProposalStatusBadge } from './ProposalStatusBadge'
import { formatProposalDate, formatProposalValue } from './proposalMeta'
import { ProposalCard } from './ProposalCard'

export function ProposalTable({ proposals, busyId, onArchive }: { proposals: ProposalListItem[]; busyId: string | null; onArchive: (proposal: ProposalListItem) => void }) {
  return <>
    <div className="proposal-table-wrap"><table className="proposal-table"><thead><tr><th>Proposta</th><th>Empresa</th><th>Serviço</th><th>Valor</th><th>Status</th><th>Data / validade</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
      {proposals.map((proposal) => <tr key={proposal.id}>
        <td><Link className="proposal-title-link" to={`/propostas/${proposal.id}`}>{proposal.title}</Link></td>
        <td><span>{proposal.client_company_name || proposal.lead_company_name || 'Sem vínculo'}</span>{proposal.client_company_name && proposal.lead_company_name && <small className="proposal-secondary-relation">Lead: {proposal.lead_company_name}</small>}</td>
        <td>{proposal.service}</td><td className="proposal-table-value">{formatProposalValue(proposal.value)}</td><td><ProposalStatusBadge status={proposal.status} /></td>
        <td><span>{formatProposalDate(proposal.created_at)}</span><small className="proposal-secondary-relation">Validade: {formatProposalDate(proposal.valid_until)}</small></td>
        <td className="proposal-table-actions"><Link className="text-link" to={`/propostas/${proposal.id}`}>Abrir <Icon name="chevron" /></Link><button className="text-button" type="button" disabled={busyId === proposal.id} onClick={() => onArchive(proposal)}>{busyId === proposal.id ? 'Salvando…' : proposal.is_archived ? 'Restaurar' : 'Arquivar'}</button></td>
      </tr>)}
    </tbody></table></div>
    <div className="proposal-cards">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} busy={busyId === proposal.id} onArchive={onArchive} />)}</div>
  </>
}
