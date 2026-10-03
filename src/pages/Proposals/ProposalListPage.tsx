import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ProposalFilters } from '../../components/proposals/ProposalFilters'
import { ProposalSummary } from '../../components/proposals/ProposalSummary'
import { ProposalTable } from '../../components/proposals/ProposalTable'
import { Icon } from '../../components/ui/Icon'
import { Toast } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { listClients } from '../../services/clients'
import { getProposalLeadOptions, getProposalSummary, listProposals, setProposalArchived, type ProposalFilters as Filters, type ProposalLeadOption } from '../../services/proposals'
import type { ClientListItem, ProposalListItem, ProposalSummary as SummaryItem } from '../../types/database'

const emptyFilters: Filters = { query: '', status: null, clientId: null, leadId: null, from: null, to: null, archived: 'active' }
export function ProposalListPage() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [proposals, setProposals] = useState<ProposalListItem[]>([])
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [leads, setLeads] = useState<ProposalLeadOption[]>([])
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [optionsError, setOptionsError] = useState(false)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState((location.state as { notice?: string } | null)?.notice ?? '')

  useEffect(() => { const timer = window.setTimeout(() => setFilters((current) => ({ ...current, query })), 220); return () => window.clearTimeout(timer) }, [query])
  useEffect(() => {
    let active = true
    Promise.all([getProposalSummary(), getProposalLeadOptions(), listClients({ query: '', archived: 'all' })]).then(([totals, leadOptions, clientOptions]) => {
      if (!active) return
      setSummary(totals); setLeads(leadOptions); setClients(clientOptions); setOptionsError(false)
    }).catch(() => { if (active) setOptionsError(true) })
    return () => { active = false }
  }, [reload])
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    listProposals(filters).then((rows) => { if (active) setProposals(rows) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, reload])
  function updateFilters(update: Partial<Filters>) {
    if ('query' in update) {
      setQuery(update.query ?? '')
      const { query: nextQuery, ...otherFilters } = update
      if (nextQuery !== undefined) setFilters((current) => ({ ...current, ...otherFilters }))
    } else setFilters((current) => ({ ...current, ...update }))
  }
  async function toggleArchive(proposal: ProposalListItem) {
    setBusyId(proposal.id)
    try { await setProposalArchived(proposal.id, !proposal.is_archived); setToast(proposal.is_archived ? 'Proposta restaurada.' : 'Proposta arquivada.'); setReload((value) => value + 1) }
    catch { setToast('Não foi possível atualizar o arquivamento.') }
    finally { setBusyId(null) }
  }
  const hasFilters = Boolean(query || filters.status || filters.clientId || filters.leadId || filters.from || filters.to || filters.archived !== 'active')
  return <div className="page-wrap proposals-page">
    <div className="page-header"><div><p className="eyebrow">COMERCIAL / ACOMPANHAMENTO</p><h1>Propostas</h1><p className="page-subtitle">Acompanhe valores, prazos e decisões comerciais em um só lugar.</p></div><Link className="button button--primary" to="/propostas/nova"><Icon name="plus" />Nova proposta</Link></div>
    {toast && <Toast message={toast} tone={toast.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setToast('')} />}
    {optionsError && <div className="notice notice--info proposal-options-notice" role="status">Não foi possível carregar todos os filtros. <button className="text-button" type="button" onClick={() => setReload((value) => value + 1)}>Tentar novamente</button></div>}
    <ProposalSummary items={summary} selectedStatus={filters.status} onSelect={(status) => updateFilters({ status })} />
    <section className="proposal-workspace">
      <div className="proposal-workspace-heading"><div><h2>Pipeline de propostas</h2><p>{loading ? 'Carregando…' : `${proposals.length} ${proposals.length === 1 ? 'proposta' : 'propostas'}`}</p></div></div>
      <ProposalFilters value={{ ...filters, query }} leads={leads} clients={clients} onChange={updateFilters} onClear={() => { setQuery(''); setFilters(emptyFilters) }} />
      {error ? <ErrorState onRetry={() => setReload((value) => value + 1)}>Não foi possível carregar as propostas. Confira a conexão com o Supabase e tente novamente.</ErrorState> : loading && proposals.length === 0 ? <div className="proposal-loading"><LoadingState label="Carregando propostas…" /></div> : proposals.length === 0 ? <EmptyState title={hasFilters ? 'Nenhuma proposta encontrada' : filters.archived === 'archived' ? 'Nenhuma proposta arquivada' : 'Ainda não há propostas'} description={hasFilters ? 'Ajuste os filtros ou faça uma nova busca.' : 'Crie uma proposta para acompanhar seu valor, validade e status comercial.'} action={!hasFilters && filters.archived !== 'archived' && <Link className="button button--primary" to="/propostas/nova"><Icon name="plus" />Criar primeira proposta</Link>} /> : <ProposalTable proposals={proposals} busyId={busyId} onArchive={(proposal) => void toggleArchive(proposal)} />}
    </section>
  </div>
}
