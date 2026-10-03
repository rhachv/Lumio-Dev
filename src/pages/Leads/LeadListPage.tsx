import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import { formatDate, sourceLabels, sourceOptions, statusOptions, toWhatsAppUrl } from '../../components/leads/leadMeta'
import { getLeadNiches, listLeads, type LeadListRow } from '../../services/leads'
import type { LeadSource, LeadStatus, Niche } from '../../types/database'

const PAGE_SIZE = 25
const validStatuses = new Set(statusOptions.map(([status]) => status))
const validSources = new Set(sourceOptions.map(([source]) => source))

function parseStatus(value: string | null): LeadStatus | null { return value && validStatuses.has(value as LeadStatus) ? value as LeadStatus : null }
function parseSource(value: string | null): LeadSource | null { return value && validSources.has(value as LeadSource) ? value as LeadSource : null }

export function LeadListPage() {
  const [params, setParams] = useSearchParams()
  const queryString = params.toString()
  const [queryDraft, setQueryDraft] = useState(params.get('q') ?? '')
  const [rows, setRows] = useState<LeadListRow[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [nicheLoadError, setNicheLoadError] = useState(false)
  const [nicheRetry, setNicheRetry] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => { setQueryDraft(new URLSearchParams(queryString).get('q') ?? '') }, [queryString])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(queryString)
      const current = next.get('q') ?? ''
      if (queryDraft.trim() === current) return
      if (queryDraft.trim()) next.set('q', queryDraft.trim()); else next.delete('q')
      next.delete('page')
      setParams(next, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [queryDraft, queryString, setParams])

  useEffect(() => {
    let active = true
    setNicheLoadError(false)
    getLeadNiches().then((data) => { if (active) setNiches(data) }).catch(() => { if (active) { setNiches([]); setNicheLoadError(true) } })
    return () => { active = false }
  }, [nicheRetry])

  const filters = useMemo(() => {
    const current = new URLSearchParams(queryString)
    const rawBlocked = current.get('blocked')
    return {
      query: current.get('q') ?? '', status: parseStatus(current.get('status')),
      nicheId: current.get('niche') || null, source: parseSource(current.get('source')),
      blocked: rawBlocked === 'true' ? true : rawBlocked === 'all' ? null : false,
      archived: current.get('archived') === 'archived' || current.get('archived') === 'all' ? current.get('archived') as 'archived' | 'all' : 'active' as const,
      page: Math.max(1, Number.parseInt(current.get('page') ?? '1', 10) || 1), pageSize: PAGE_SIZE,
    }
  }, [queryString])

  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    listLeads(filters).then((result) => {
      if (active) { setRows(result.rows); setTotal(result.total) }
    }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, reload])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(queryString)
    if (value) next.set(key, value); else next.delete(key)
    next.delete('page')
    setParams(next)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(filters.query || filters.status || filters.nicheId || filters.source || filters.blocked !== false || filters.archived !== 'active')

  return <div className="page-wrap leads-page">
    <div className="page-header leads-heading"><div><p className="eyebrow">CRM / LEADS</p><h1>Prospecção</h1><p className="page-subtitle">Gerencie seus leads e acompanhe suas oportunidades.</p></div><Link className="button button--primary" to="/leads/novo"><Icon name="plus" />Novo lead</Link></div>
    <section className="leads-workspace">
      {nicheLoadError && <div className="notice notice--error niche-load-error" role="alert">Não foi possível carregar os nichos. <button className="text-button" onClick={() => setNicheRetry((count) => count + 1)}>Tentar novamente</button></div>}
      <div className="leads-toolbar"><label className="leads-search"><Icon name="search" /><span className="sr-only">Pesquisar leads</span><input type="search" value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Buscar empresa, responsável, cidade ou contato" /></label><span className="result-count">{loading ? 'Carregando…' : `${total} ${total === 1 ? 'lead' : 'leads'}`}</span></div>
      <div className="lead-filters" aria-label="Filtros de leads">
        <label><span>Status</span><select value={filters.status ?? ''} onChange={(event) => updateParam('status', event.target.value)}><option value="">Todos</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Nicho</span><select value={filters.nicheId ?? ''} onChange={(event) => updateParam('niche', event.target.value)}><option value="">Todos</option>{niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label>
        <label><span>Origem</span><select value={filters.source ?? ''} onChange={(event) => updateParam('source', event.target.value)}><option value="">Todas</option>{sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Bloqueio</span><select value={filters.blocked === null ? 'all' : String(filters.blocked)} onChange={(event) => updateParam('blocked', event.target.value === 'false' ? '' : event.target.value)}><option value="all">Todos</option><option value="true">Bloqueados</option><option value="false">Não bloqueados</option></select></label>
        <label><span>Arquivamento</span><select value={filters.archived} onChange={(event) => updateParam('archived', event.target.value === 'active' ? '' : event.target.value)}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label>
        {hasFilters && <button className="text-button clear-filters" onClick={() => { setQueryDraft(''); setParams({}) }}>Limpar filtros</button>}
      </div>
      {error ? <ErrorState onRetry={() => setReload((count) => count + 1)}>Não foi possível carregar os leads. Tente novamente.</ErrorState> : loading && rows.length === 0 ? <div className="leads-loading"><LoadingState label="Carregando leads…" /></div> : rows.length === 0 ? <div className="leads-empty"><EmptyState title={hasFilters ? 'Nenhum lead encontrado' : 'Você ainda não possui leads'} description={hasFilters ? 'Ajuste ou limpe os filtros para ver outros registros.' : 'Adicione um lead para começar a organizar sua prospecção.'} action={hasFilters ? <button className="text-button" onClick={() => { setQueryDraft(''); setParams({}) }}>Limpar filtros</button> : <Link className="button button--primary" to="/leads/novo"><Icon name="plus" />Adicionar primeiro lead</Link>} /></div> : <>
        <div className="lead-table-wrap" aria-busy={loading}>
          <table className="lead-table"><thead><tr><th>Empresa</th><th>Responsável</th><th>Nicho</th><th>Cidade</th><th>WhatsApp</th><th>Status</th><th>Origem</th><th>Prospecção</th><th>Atualizado</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
            {rows.map((lead) => <tr key={lead.id}>
              <td><Link className="lead-company-link" to={`/leads/${lead.id}`}>{lead.company_name}</Link>{lead.is_archived && <span className="archive-label table-archive-label">Arquivado</span>}</td><td>{lead.responsible_name || '—'}</td><td>{lead.niche_name || '—'}</td><td>{[lead.city, lead.state].filter(Boolean).join(' / ') || '—'}</td>
              <td>{lead.whatsapp ? <a className="lead-contact-link" href={toWhatsAppUrl(lead.whatsapp) ?? undefined} target="_blank" rel="noreferrer">{lead.whatsapp}</a> : '—'}</td><td><LeadStatusBadge status={lead.status} /></td><td>{lead.source_detail || sourceLabels[lead.source]}</td>
              <td>{lead.is_blocked ? <span className="blocked-label">Bloqueado</span> : 'Disponível'}</td><td>{formatDate(lead.updated_at)}</td><td><Link className="icon-button lead-open" to={`/leads/${lead.id}`} aria-label={`Abrir ${lead.company_name}`}><Icon name="arrow" /></Link></td>
            </tr>)}
          </tbody></table>
        </div>
        <div className="lead-mobile-list" aria-busy={loading}>{rows.map((lead) => <LeadMobileCard key={lead.id} lead={lead} />)}</div>
        <div className="pagination"><span>Mostrando {Math.min((filters.page - 1) * PAGE_SIZE + 1, total)}–{Math.min(filters.page * PAGE_SIZE, total)} de {total}</span><div><button className="button button--secondary" onClick={() => updateParam('page', filters.page > 2 ? String(filters.page - 1) : '')} disabled={filters.page <= 1}>Anterior</button><span>Página {filters.page} de {pageCount}</span><button className="button button--secondary" onClick={() => updateParam('page', String(filters.page + 1))} disabled={filters.page >= pageCount}>Próxima</button></div></div>
      </>}
    </section>
  </div>
}

function LeadMobileCard({ lead }: { lead: LeadListRow }) {
  const whatsappUrl = toWhatsAppUrl(lead.whatsapp)
  return <article className="lead-mobile-card">
    <div className="lead-mobile-top"><div><Link className="lead-company-link" to={`/leads/${lead.id}`}>{lead.company_name}</Link>{lead.is_archived && <span className="archive-label mobile-archive-label">Arquivado</span>}<p>{lead.responsible_name || lead.niche_name || 'Sem responsável informado'}</p></div><LeadStatusBadge status={lead.status} /></div>
    <dl><div><dt>Cidade</dt><dd>{[lead.city, lead.state].filter(Boolean).join(' / ') || '—'}</dd></div><div><dt>Origem</dt><dd>{lead.source_detail || sourceLabels[lead.source]}</dd></div>{lead.whatsapp && <div><dt>WhatsApp</dt><dd>{lead.whatsapp}</dd></div>}</dl>
    <div className="lead-mobile-actions"><span className={lead.is_blocked ? 'blocked-label' : 'available-label'}>{lead.is_blocked ? 'Bloqueado' : 'Disponível'}</span>{whatsappUrl && <a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp <Icon name="arrow" /></a>}<Link className="text-link" to={`/leads/${lead.id}`}>Detalhes <Icon name="chevron" /></Link></div>
  </article>
}
