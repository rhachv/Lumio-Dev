import { Search } from '../ui/FormControls'
import type { ProposalFilters as Filters, ProposalLeadOption } from '../../services/proposals'
import type { ClientListItem, ProposalStatus } from '../../types/database'
import { proposalStatusOptions } from './proposalMeta'

export function ProposalFilters({ value, leads, clients, onChange, onClear }: { value: Filters; leads: ProposalLeadOption[]; clients: ClientListItem[]; onChange: (update: Partial<Filters>) => void; onClear: () => void }) {
  const filtered = Boolean(value.query || value.status || value.clientId || value.leadId || value.from || value.to || value.archived !== 'active')
  return <div className="proposal-filters">
    <Search id="proposal-search" label="Buscar título, empresa ou serviço" value={value.query} onChange={(event) => onChange({ query: event.target.value })} />
    <div className="proposal-filter-grid">
      <label><span>Status</span><select value={value.status ?? ''} onChange={(event) => onChange({ status: (event.target.value || null) as ProposalStatus | null })}><option value="">Todos</option>{proposalStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
      <label><span>Cliente</span><select value={value.clientId ?? ''} onChange={(event) => onChange({ clientId: event.target.value || null })}><option value="">Todos</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label>
      <label><span>Lead</span><select value={value.leadId ?? ''} onChange={(event) => onChange({ leadId: event.target.value || null })}><option value="">Todos</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</select></label>
      <label><span>De</span><input aria-label="Data inicial do período" type="date" value={value.from ?? ''} onChange={(event) => onChange({ from: event.target.value || null })} /></label>
      <label><span>Até</span><input aria-label="Data final do período" type="date" value={value.to ?? ''} onChange={(event) => onChange({ to: event.target.value || null })} /></label>
      <label><span>Visualização</span><select value={value.archived} onChange={(event) => onChange({ archived: event.target.value as Filters['archived'] })}><option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="all">Todas</option></select></label>
      {filtered && <button className="text-button proposal-clear-filters" type="button" onClick={onClear}>Limpar filtros</button>}
    </div>
  </div>
}
