import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/DataDisplay'
import { Button, Select } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { getClient } from '../../services/clients'
import { changeProjectStatus, getProject, getProjectStatusHistory, setProjectArchived } from '../../services/projects'
import { formatCurrency, formatShortDate, projectStatusLabel, projectStatusOptions, safeExternalUrl } from '../../components/clients/projectMeta'
import type { Client, Project, ProjectStatusHistory } from '../../types/database'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [history, setHistory] = useState<ProjectStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [record, events] = await Promise.all([getProject(id), getProjectStatusHistory(id)])
      const account = await getClient(record.client_id)
      setProject(record); setHistory(events); setClient(account)
    } catch { setError('Não foi possível carregar este projeto.') }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  async function saveStatus(value: string) {
    if (!project || value === project.status) return
    setSaving(true); setError('')
    try { await changeProjectStatus(project.id, value as Project['status']); setNotice('Status do projeto atualizado.'); await load() }
    catch { setError('Não foi possível atualizar o status do projeto.') }
    finally { setSaving(false) }
  }
  async function toggleArchive() {
    if (!project) return
    setSaving(true); setError('')
    try { await setProjectArchived(project.id, !project.is_archived); setArchiveDialog(false); setNotice(project.is_archived ? 'Projeto restaurado.' : 'Projeto arquivado.'); await load() }
    catch { setError('Não foi possível atualizar o arquivamento do projeto.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="page-wrap project-detail-page"><LoadingState label="Carregando projeto…" /></div>
  if (error && !project) return <div className="page-wrap project-detail-page"><ErrorState onRetry={() => void load()}>{error}</ErrorState><Link className="text-link" to="/clientes">Voltar para clientes</Link></div>
  if (!project || !client) return <div className="page-wrap project-detail-page"><ErrorState>Este projeto não foi encontrado ou você não tem acesso.</ErrorState><Link className="text-link" to="/clientes">Voltar para clientes</Link></div>
  const links = [['Projeto', project.project_url], ['GitHub', project.github_url], ['Vercel', project.vercel_url], ['Domínio', project.domain]] as const
  const deadlineState = project.status === 'completed' || project.status === 'cancelled' || !project.deadline ? null : getDeadlineState(project.deadline)
  return <div className="page-wrap project-detail-page">
    <div className="detail-back-row"><Link className="back-link" to={`/clientes/${client.id}`}><Icon name="chevron" />Voltar para {client.company_name}</Link></div>
    {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}{error && <ErrorState>{error}</ErrorState>}
    <section className="project-detail-heading"><div><p className="eyebrow">PROJETO / {client.company_name}</p><h1>{project.name}</h1><div className="detail-badges"><Badge tone={project.status === 'completed' ? 'success' : project.status === 'cancelled' ? 'neutral' : 'info'}>{projectStatusLabel(project.status)}</Badge>{project.is_archived && <Badge>Arquivado</Badge>}{deadlineState && <span className={`project-deadline-badge project-deadline-badge--${deadlineState.kind}`}>{deadlineState.label}</span>}</div></div><div className="detail-actions"><Link className="button button--secondary" to={`/projetos/${project.id}/editar`}><Icon name="file" />Editar</Link><Button onClick={() => setArchiveDialog(true)}>{project.is_archived ? 'Restaurar projeto' : 'Arquivar projeto'}</Button></div></section>
    <div className="project-detail-grid"><div className="detail-main-column">
      <section className="dashboard-section"><div className="section-heading"><div><h2>Resumo</h2><p>{project.service}</p></div><span className="project-value">{formatCurrency(project.value)}</span></div><dl className="project-info-grid"><Info label="Cliente" value={client.company_name} href={`/clientes/${client.id}`} /><Info label="Serviço" value={project.service} /><Info label="Valor" value={formatCurrency(project.value)} /><Info label="Início" value={formatShortDate(project.start_date)} /><Info label="Prazo" value={formatShortDate(project.deadline)} /><Info label="Criado em" value={formatShortDate(project.created_at)} /><div className="lead-info-item lead-info-item--wide"><dt>Observações</dt><dd className="lead-notes">{project.notes || 'Nenhuma observação registrada.'}</dd></div></dl></section>
      <section className="dashboard-section project-links-section"><div className="section-heading"><div><h2>Links e ambiente</h2><p>Acessos relacionados a este projeto</p></div></div><div className="project-links-list">{links.map(([label, raw]) => { const href = safeExternalUrl(raw); return <div className="project-link-row" key={label}><span>{label}</span>{raw ? href ? <a href={href} target="_blank" rel="noreferrer">{raw}<Icon name="arrow" /></a> : <span className="project-link-invalid">{raw}</span> : <span>—</span>}</div> })}</div></section>
      <section className="dashboard-section timeline-section project-history-section"><div className="section-heading"><div><h2>Histórico de status</h2><p>Alterações registradas automaticamente</p></div></div>{history.length === 0 ? <div className="timeline-empty"><p>Nenhum histórico de status registrado.</p></div> : <div className="timeline-list">{history.map((entry) => <article className="timeline-item timeline-item--status" key={entry.id}><span className="timeline-marker" aria-hidden="true" /><div className="timeline-entry-content"><div className="timeline-entry-heading"><h3>{entry.previous_status ? 'Status alterado' : 'Projeto criado'}</h3><time dateTime={entry.changed_at}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.changed_at))}</time></div><p>{entry.previous_status ? `${projectStatusLabel(entry.previous_status)} → ${projectStatusLabel(entry.new_status)}` : projectStatusLabel(entry.new_status)}</p></div></article>)}</div>}</section>
    </div><aside className="dashboard-section project-controls"><div className="section-heading"><div><h2>Acompanhamento</h2><p>Status separado do arquivamento</p></div></div><div className="control-group"><h3>Status operacional</h3><Select id="project-status-current" label="Etapa atual" value={project.status} disabled={saving} onChange={(event) => void saveStatus(event.target.value)}>{projectStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select><p>O histórico registra cada mudança de etapa.</p></div><div className="control-group"><h3>Cliente</h3><Link className="client-context-link" to={`/clientes/${client.id}`}>{client.company_name}<Icon name="arrow" /></Link></div></aside></div>
    <ConfirmDialog open={archiveDialog} title={project.is_archived ? 'Restaurar projeto' : 'Arquivar projeto'} confirmLabel={saving ? 'Salvando…' : project.is_archived ? 'Restaurar' : 'Arquivar projeto'} onOpenChange={setArchiveDialog} onConfirm={() => void toggleArchive()}>{project.is_archived ? 'O projeto voltará para a lista ativa deste cliente.' : 'O projeto sairá da lista ativa, preservando seu status e histórico.'}</ConfirmDialog>
  </div>
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="lead-info-item"><dt>{label}</dt><dd>{href ? <Link to={href}>{value}</Link> : value}</dd></div>
}

function getDeadlineState(deadline: string): { kind: 'overdue' | 'soon'; label: string } | null {
  const endOfDeadline = new Date(`${deadline.slice(0, 10)}T23:59:59`)
  const remaining = endOfDeadline.getTime() - Date.now()
  if (remaining < 0) return { kind: 'overdue', label: 'Prazo vencido' }
  if (remaining <= 7 * 24 * 60 * 60 * 1000) return { kind: 'soon', label: 'Prazo próximo' }
  return null
}
