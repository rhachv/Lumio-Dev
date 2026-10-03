import type { ProposalStatus, ProposalSummary as SummaryItem } from '../../types/database'
import { formatProposalValue, proposalStatusOptions } from './proposalMeta'

export function ProposalSummary({ items, selectedStatus, onSelect }: { items: SummaryItem[]; selectedStatus: ProposalStatus | null; onSelect: (status: ProposalStatus | null) => void }) {
  const byStatus = new Map(items.map((item) => [item.status, item]))
  return <section className="proposal-summary" aria-label="Resumo de propostas">
    {proposalStatusOptions.map(([status, label]) => {
      const item = byStatus.get(status)
      return <button className={`proposal-summary-card${selectedStatus === status ? ' is-selected' : ''}`} type="button" key={status} aria-pressed={selectedStatus === status} onClick={() => onSelect(selectedStatus === status ? null : status)}>
        <span className="proposal-summary-label">{label}</span><strong>{item?.proposal_count ?? 0}</strong><span className="proposal-summary-value">{formatProposalValue(item?.total_value ?? 0)}</span>
      </button>
    })}
  </section>
}
