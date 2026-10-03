import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { Search } from '../../components/ui/FormControls'
import { Badge } from '../../components/ui/DataDisplay'
import { Toast } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { listClients, setClientArchived } from '../../services/clients'
import type { ClientListItem } from '../../types/database'
import { formatCurrency } from '../../components/clients/projectMeta'

export function ClientListPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ query: '', archived: 'active' as 'active' | 'archived' | 'all', projects: 'all' as 'all' | 'with_projects' | 'without_projects' | 'in_progress' | 'completed' })
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, query })), 220)
    return () => window.clearTimeout(timer)
  }, [query])
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    listClients(filters).then((rows) => { if (active) setClients(rows) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, reload])

  async function toggleArchive(client: ClientListItem) {
    setBusyId(client.id)
    try { await setClientArchived(client.id, !client.is_archived); setToast(client.is_archived ? 'Cliente restaurado.' : 'Cliente arquivado.'); setReload((value) => value + 1) }
    catch { setToast('Não foi possível atualizar o arquivamento.') }
    finally { setBusyId(null) }
  }

  return <div className="page-wrap clients-page">
    <div className="page-header"><div><p className="eyebrow">RELACIONAMENTO / CONTAS</p><h1>Clientes</h1><p className="page-subtitle">Contas convertidas da prospecção e os projetos em andamento.</p></div></div>
    {toast && <Toast message={toast} tone={toast.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setToast('')} />}
    <section className="client-workspace">
      <div className="client-toolbar"><Search id="clients-search" label="Empresa, responsável, cidade ou WhatsApp" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="client-view-filter"><span>Projetos</span><select value={filters.projects} onChange={(event) => setFilters((current) => ({ ...current, projects: event.target.value as typeof current.projects }))}><option value="all">Todos</option><option value="with_projects">Com projetos</option><option value="without_projects">Sem projetos</option><option value="in_progress">Em andamento</option><option value="completed">Concluídos</option></select></label><label className="client-view-filter"><span>Visualização</span><select value={filters.archived} onChange={(event) => setFilters((current) => ({ ...current, archived: event.target.value as typeof current.archived }))}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label><span className="client-count">{loading ? 'Carregando…' : `${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`}</span></div>
      {error ? <ErrorState onRetry={() => setReload((value) => value + 1)}>Não foi possível carregar os clientes. Confira a conexão com o Supabase e tente novamente.</ErrorState> : loading && clients.length === 0 ? <LoadingState label="Carregando clientes…" /> : clients.length === 0 ? <EmptyState title={query ? 'Nenhum cliente encontrado' : filters.archived === 'archived' ? 'Nenhum cliente arquivado' : 'Sua carteira começa com um lead ganho'} description={query ? 'Experimente buscar por outro nome ou cidade.' : filters.archived === 'archived' ? 'Clientes arquivados aparecem aqui e podem ser restaurados.' : 'Converta um lead com status ganho para criar o primeiro cliente.'} action={!query && filters.archived !== 'archived' && <Link className="button button--secondary" to="/leads">Abrir prospecção</Link>} /> : <div className="client-table-wrap" aria-busy={loading} role="region" aria-label="Tabela de clientes; deslize horizontalmente para ver todas as colunas" tabIndex={0}>
        <table className="client-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Localização</th><th scope="col">Projetos ativos</th><th scope="col">Valor ativo</th><th scope="col">Cadastro</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {clients.map((client) => <tr key={client.id}><td><Link className="client-name-link" to={`/clientes/${client.id}`}>{client.company_name}</Link><span className="client-contact">{client.responsible_name || client.niche_name || 'Cliente'}</span>{client.is_archived && <Badge>Arquivado</Badge>}</td><td>{[client.city, client.state].filter(Boolean).join(', ') || '—'}</td><td><span className="client-project-count">{client.project_count}</span></td><td>{formatCurrency(client.project_total_value)}</td><td>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(client.created_at))}</td><td className="client-row-actions"><Link className="text-link" to={`/clientes/${client.id}`}>Abrir <Icon name="chevron" /></Link><button type="button" className="text-button" disabled={busyId === client.id} onClick={() => void toggleArchive(client)}>{busyId === client.id ? 'Salvando…' : client.is_archived ? 'Restaurar' : 'Arquivar'}</button></td></tr>)}
        </tbody></table>
      </div>}
      <p className="client-list-footnote">Os dados do cliente são mantidos separadamente do lead de origem.</p>
    </section>
  </div>
}
