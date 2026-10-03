import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/DataDisplay'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { Button } from '../../components/ui/FormControls'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { getClient, setClientArchived } from '../../services/clients'
import { listClientProjects, setProjectArchived } from '../../services/projects'
import { formatCurrency, formatShortDate, projectStatusLabel } from '../../components/clients/projectMeta'
import { toInstagramUrl, toWhatsAppUrl } from '../../components/leads/leadMeta'
import type { Client, Project } from '../../types/database'

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectView, setProjectView] = useState<'active' | 'archived' | 'all'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError(null)
    try {
      const [record, projectRows] = await Promise.all([getClient(id), listClientProjects(id, projectView)])
      setClient(record); setProjects(projectRows)
    } catch { setError('Não foi possível carregar este cliente.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [id, projectView])
  useEffect(() => { void load() }, [load])

  async function toggleClientArchive() {
    if (!client) return
    setBusyId(client.id)
    try { await setClientArchived(client.id, !client.is_archived); setArchiveDialog(false); setNotice(client.is_archived ? 'Cliente restaurado.' : 'Cliente arquivado.'); await load(true) }
    catch { setError('Não foi possível atualizar o arquivamento do cliente.') }
    finally { setBusyId(null) }
  }
  async function archiveProject(project: Project) {
    setBusyId(project.id)
    try { await setProjectArchived(project.id, !project.is_archived); setNotice(project.is_archived ? 'Projeto restaurado.' : 'Projeto arquivado.'); await load(true) }
    catch { setError('Não foi possível atualizar o arquivamento do projeto.') }
    finally { setBusyId(null) }
  }

  if (loading) return <div className="page-wrap client-detail-page"><LoadingState label="Carregando cliente…" /></div>
  if (error && !client) return <div className="page-wrap client-detail-page"><ErrorState onRetry={() => void load()}>Não foi possível carregar este cliente. Tente novamente.</ErrorState><Link className="text-link" to="/clientes">Voltar para clientes</Link></div>
  if (!client) return <div className="page-wrap client-detail-page"><ErrorState>Este cliente não foi encontrado ou você não tem acesso.</ErrorState><Link className="text-link" to="/clientes">Voltar para clientes</Link></div>

  return <div className="page-wrap client-detail-page">
    <div className="detail-back-row"><Link className="back-link" to="/clientes"><Icon name="chevron" />Voltar para clientes</Link>{refreshing && <span className="detail-saving"><span className="spinner" />Atualizando</span>}</div>
    {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}{error && <ErrorState>{error}</ErrorState>}
    <section className="client-detail-heading"><div><p className="eyebrow">CARTEIRA / CLIENTE</p><h1>{client.company_name}</h1><div className="detail-badges">{client.niche_name && <Badge tone="info">{client.niche_name}</Badge>}{client.is_archived && <Badge>Arquivado</Badge>}</div></div><div className="detail-actions"><Link className="button button--secondary" to={`/clientes/${client.id}/editar`}><Icon name="file" />Editar dados</Link><Link className="button button--primary" to={`/projetos/novo?cliente=${client.id}`}><Icon name="plus" />Novo projeto</Link><Button onClick={() => setArchiveDialog(true)}>{client.is_archived ? 'Restaurar cliente' : 'Arquivar cliente'}</Button></div></section>
    <div className="client-detail-grid">
      <section className="dashboard-section client-info-section"><div className="section-heading"><div><h2>Informações do cliente</h2><p>Cadastro independente, convertido da prospecção</p></div></div><dl className="client-info-grid">
        <Info label="Responsável" value={client.responsible_name} /><Info label="Nicho" value={client.niche_name} /><Info label="Cidade" value={client.city} /><Info label="Estado" value={client.state} /><Info label="WhatsApp" value={client.whatsapp} href={toWhatsAppUrl(client.whatsapp)} /><Info label="Instagram" value={client.instagram} href={toInstagramUrl(client.instagram)} /><Info label="Cliente desde" value={formatShortDate(client.created_at)} /><Info label="Atualizado em" value={formatShortDate(client.updated_at)} /><div className="lead-info-item lead-info-item--wide"><dt>Observações</dt><dd className="lead-notes">{client.notes || 'Nenhuma observação registrada.'}</dd></div>
      </dl><div className="client-origin-link"><span>Lead de origem</span><Link to={`/leads/${client.lead_id}`}>Ver histórico do lead <Icon name="arrow" /></Link></div></section>
      <section className="dashboard-section client-projects-section"><div className="section-heading"><div><h2>Projetos</h2><p>Trabalho contratado e andamento</p></div><Link className="text-link" to={`/projetos/novo?cliente=${client.id}`}><Icon name="plus" />Adicionar projeto</Link></div>
        <div className="project-list-tools"><label><span>Visualização</span><select value={projectView} onChange={(event) => setProjectView(event.target.value as typeof projectView)}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label><span>{projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}</span></div>
        {projects.length === 0 ? <div className="project-empty"><p>{projectView === 'active' ? 'Ainda não há projetos ativos para este cliente.' : 'Nenhum projeto encontrado nesta visualização.'}</p>{projectView === 'active' && <Link className="button button--secondary" to={`/projetos/novo?cliente=${client.id}`}><Icon name="plus" />Criar primeiro projeto</Link>}</div> : <div className="project-list">{projects.map((project) => <article className="project-row" key={project.id}><div className="project-row-mark" aria-hidden="true"><Icon name="file" /></div><div className="project-row-main"><Link to={`/projetos/${project.id}`}>{project.name}</Link><span>{project.service} · {formatCurrency(project.value)}</span><small>Prazo: {formatShortDate(project.deadline)}</small></div><div className="project-row-side"><Badge tone={project.status === 'completed' ? 'success' : project.status === 'cancelled' ? 'neutral' : 'info'}>{projectStatusLabel(project.status)}</Badge>{project.is_archived && <Badge>Arquivado</Badge>}<div className="project-row-actions"><Link className="text-link" to={`/projetos/${project.id}`}>Abrir</Link><button className="text-button" disabled={busyId === project.id} onClick={() => void archiveProject(project)}>{busyId === project.id ? 'Salvando…' : project.is_archived ? 'Restaurar' : 'Arquivar'}</button></div></div></article>)}</div>}
      </section>
    </div>
    <ConfirmDialog open={archiveDialog} title={client.is_archived ? 'Restaurar cliente' : 'Arquivar cliente'} confirmLabel={busyId ? 'Salvando…' : client.is_archived ? 'Restaurar' : 'Arquivar cliente'} onOpenChange={setArchiveDialog} onConfirm={() => void toggleClientArchive()}>{client.is_archived ? 'Este cliente voltará para a carteira ativa.' : 'O cliente sairá da carteira ativa. Seus projetos e o lead de origem continuarão preservados.'}</ConfirmDialog>
  </div>
}

function Info({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return <div className="lead-info-item"><dt>{label}</dt><dd>{value && href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value || '—'}</dd></div>
}
