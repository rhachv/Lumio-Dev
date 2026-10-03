import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { DashboardCard } from '../../components/dashboard/DashboardCard'
import { DashboardSection } from '../../components/dashboard/DashboardSection'
import { QuickActions } from '../../components/dashboard/QuickActions'
import { RecentActivity } from '../../components/dashboard/RecentActivity'
import { RecentLeads } from '../../components/dashboard/RecentLeads'
import { RecentProposals } from '../../components/dashboard/RecentProposals'
import { StatusSummary, type StatusRow } from '../../components/dashboard/StatusSummary'
import { projectStatuses, type DashboardActivity, type DashboardRecentProposal, type DashboardSummary, type LeadStatus } from '../../types/database'
import { getDashboardSummary, getRecentDashboardActivity, getRecentDashboardLeads, getRecentDashboardProposals } from '../../services/dashboard'
import type { LeadListRow } from '../../services/leads'
import { statusLabels } from '../../components/leads/leadMeta'
import { projectStatusLabel } from '../../components/clients/projectMeta'
import { proposalStatusLabel, formatProposalValue } from '../../components/proposals/proposalMeta'
import { ErrorState, LoadingState } from '../../components/ui/States'

type SectionState<T> = { data: T | null; loading: boolean; error: boolean }
const initial = <T,>(): SectionState<T> => ({ data: null, loading: true, error: false })
const leadStatuses: LeadStatus[] = ['new', 'contacted', 'interested', 'negotiation', 'no_response', 'not_interested', 'won', 'lost']

export function DashboardPage() {
  const [summary, setSummary] = useState(initial<DashboardSummary>)
  const [activity, setActivity] = useState(initial<DashboardActivity[]>)
  const [leads, setLeads] = useState(initial<LeadListRow[]>)
  const [proposals, setProposals] = useState(initial<DashboardRecentProposal[]>)
  const [reload, setReload] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let active = true
    const load = async <T,>(setter: Dispatch<SetStateAction<SectionState<T>>>, request: () => Promise<T>) => {
      setter((current) => ({ ...current, loading: true, error: false }))
      try { const data = await request(); if (active) setter({ data, loading: false, error: false }) }
      catch { if (active) setter((current) => ({ ...current, loading: false, error: true })) }
    }
    void load(setSummary, getDashboardSummary)
    void load(setActivity, getRecentDashboardActivity)
    void load(setLeads, getRecentDashboardLeads)
    void load(setProposals, getRecentDashboardProposals)
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    if (!summary.loading && !activity.loading && !leads.loading && !proposals.loading) setRefreshing(false)
  }, [summary.loading, activity.loading, leads.loading, proposals.loading])

  function refresh() { setRefreshing(true); setReload((value) => value + 1) }
  const summaryData = summary.data
  const leadCounts = summaryData?.leads_by_status ?? {}
  const projectCounts = summaryData?.projects_by_status ?? {}
  const proposalCounts = summaryData?.proposals_by_status ?? {}
  const leadRows: StatusRow[] = leadStatuses.map((status) => ({ key: status, label: statusLabels[status], count: leadCounts[status] ?? 0, to: `/leads?status=${status}` }))
  const projectRows: StatusRow[] = projectStatuses.map((status) => ({ key: status, label: projectStatusLabel(status), count: projectCounts[status] ?? 0, to: '/clientes' }))
  const anyLoading = summary.loading || activity.loading || leads.loading || proposals.loading
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())

  return <div className="page-wrap dashboard-page">
    <div className="page-header dashboard-heading"><div><p className="eyebrow">{today}</p><h1>Dashboard</h1><p className="page-subtitle">Uma visão geral da sua prospecção, carteira e propostas.</p></div><div className="dashboard-header-actions"><button className="button button--secondary" type="button" onClick={refresh} disabled={anyLoading}>{refreshing ? 'Atualizando…' : 'Atualizar dados'}</button><Link className="button button--primary" to="/leads/novo">Novo lead</Link></div></div>
    {summary.error && <div className="dashboard-summary-error"><ErrorState onRetry={refresh}>Não foi possível carregar os indicadores. As outras seções continuam disponíveis.</ErrorState></div>}
    <section className="dashboard-metrics" aria-label="Indicadores da operação">
      <DashboardCard label="Leads ativos" value={summaryData?.leads_total ?? '—'} note={summaryData ? `${summaryData.blocked_leads} bloqueados` : undefined} to="/leads" icon="users" />
      <DashboardCard label="Novos" value={summaryData ? leadCounts.new ?? 0 : '—'} to="/leads?status=new" icon="plus" />
      <DashboardCard label="Abordados" value={summaryData ? leadCounts.contacted ?? 0 : '—'} to="/leads?status=contacted" icon="message" />
      <DashboardCard label="Interessados" value={summaryData ? leadCounts.interested ?? 0 : '—'} to="/leads?status=interested" icon="star" />
      <DashboardCard label="Em negociação" value={summaryData ? leadCounts.negotiation ?? 0 : '—'} to="/leads?status=negotiation" icon="file" />
      <DashboardCard label="Clientes ativos" value={summaryData?.clients_total ?? '—'} to="/clientes" icon="briefcase" />
      <DashboardCard label="Projetos ativos" value={summaryData?.projects_total ?? '—'} to="/clientes" icon="grid" />
      <DashboardCard label="Propostas ativas" value={summaryData?.proposals_total ?? '—'} to="/propostas" icon="file" />
    </section>

    <div className="dashboard-columns dashboard-distributions">
      <DashboardSection title="Leads por status" description="Distribuição dos leads ativos. Bloqueios aparecem em uma contagem separada." action={{ label: 'Ver prospecção', to: '/leads' }} className="dashboard-status-section">
        {summary.error ? <ErrorState onRetry={refresh}>Indicadores de leads indisponíveis.</ErrorState> : summary.loading && !summaryData ? <LoadingState label="Carregando status dos leads…" /> : summaryData && <StatusSummary rows={leadRows} total={summaryData.leads_total} blockedCount={summaryData.blocked_leads} />}
      </DashboardSection>
      <DashboardSection title="Clientes e projetos" description={`${summaryData?.clients_total ?? '—'} clientes ativos · ${summaryData?.projects_total ?? '—'} projetos ativos`} action={{ label: 'Ver clientes', to: '/clientes' }} className="dashboard-status-section">
        {summary.error ? <ErrorState onRetry={refresh}>Indicadores de projetos indisponíveis.</ErrorState> : summary.loading && !summaryData ? <LoadingState label="Carregando status dos projetos…" /> : summaryData && <StatusSummary rows={projectRows} total={summaryData.projects_total} />}
      </DashboardSection>
    </div>

    <DashboardSection title="Propostas" description="Valores registrados nas propostas ativas." action={{ label: 'Ver todas as propostas', to: '/propostas' }} className="dashboard-proposals-section">
      {summary.error ? <ErrorState onRetry={refresh}>Indicadores de propostas indisponíveis.</ErrorState> : summary.loading && !summaryData ? <LoadingState label="Carregando resumo de propostas…" /> : summaryData && <>
        <div className="dashboard-proposal-statuses">{(['draft', 'sent', 'negotiation', 'accepted', 'rejected'] as const).map((status) => <Link className="dashboard-proposal-status" to={`/propostas?status=${status}`} key={status}><span>{proposalStatusLabel(status)}</span><strong>{proposalCounts[status] ?? 0}</strong></Link>)}</div>
        <div className="dashboard-proposal-values"><div><span>Em aberto · enviadas + em negociação</span><strong>{formatProposalValue(summaryData.proposal_open_value)}</strong></div><div><span>Propostas aceitas</span><strong>{formatProposalValue(summaryData.proposal_accepted_value)}</strong></div><div><span>Total registrado</span><strong>{formatProposalValue(summaryData.proposal_total_value)}</strong></div></div>
      </>}
    </DashboardSection>

    <div className="dashboard-columns dashboard-activity-row">
      <DashboardSection title="Atividade recente" description="Interações e alterações registradas" className="dashboard-activity-section">
        <RecentActivity events={activity.data ?? []} loading={activity.loading} error={activity.error} onRetry={refresh} />
      </DashboardSection>
      <DashboardSection title="Ações rápidas" description="Atalhos para as áreas mais usadas" className="dashboard-actions-section"><QuickActions /></DashboardSection>
    </div>

    <div className="dashboard-columns dashboard-recent-row">
      <DashboardSection title="Leads recentes" description="Últimos leads cadastrados" action={{ label: 'Ver todos os leads', to: '/leads' }} className="dashboard-recent-section">
        <RecentLeads leads={leads.data ?? []} loading={leads.loading} error={leads.error} onRetry={refresh} />
      </DashboardSection>
      <DashboardSection title="Propostas recentes" description="Últimas propostas atualizadas" action={{ label: 'Ver todas', to: '/propostas' }} className="dashboard-recent-section">
        <RecentProposals proposals={proposals.data ?? []} loading={proposals.loading} error={proposals.error} onRetry={refresh} />
      </DashboardSection>
    </div>
  </div>
}
