import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Input, Select, Textarea } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { listClients } from '../../services/clients'
import { createProject, getProject, updateProject, type ProjectInput } from '../../services/projects'
import { projectStatusOptions } from '../../components/clients/projectMeta'
import { safeExternalUrl } from '../../components/clients/projectMeta'
import type { ClientListItem, ProjectStatus } from '../../types/database'

type Values = { client_id: string; name: string; service: string; value: string; status: ProjectStatus; start_date: string; deadline: string; project_url: string; github_url: string; vercel_url: string; domain: string; notes: string }
const emptyValues: Values = { client_id: '', name: '', service: '', value: '', status: 'briefing', start_date: '', deadline: '', project_url: '', github_url: '', vercel_url: '', domain: '', notes: '' }

export function ProjectFormPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [values, setValues] = useState<Values>({ ...emptyValues, client_id: searchParams.get('cliente') ?? '' })
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([listClients({ query: '', archived: 'all' }), editing ? getProject(id) : Promise.resolve(null)]).then(([clientRows, project]) => {
      if (!active) return
      setClients(clientRows)
      if (project) setValues({ client_id: project.client_id, name: project.name, service: project.service, value: project.value === null ? '' : String(project.value), status: project.status, start_date: project.start_date ?? '', deadline: project.deadline ?? '', project_url: project.project_url ?? '', github_url: project.github_url ?? '', vercel_url: project.vercel_url ?? '', domain: project.domain ?? '', notes: project.notes ?? '' })
      else if (searchParams.get('cliente')) setValues((current) => ({ ...current, client_id: searchParams.get('cliente') ?? '' }))
    }).catch(() => { if (active) setError('Não foi possível carregar os dados necessários.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, id, searchParams])
  function field<K extends keyof Values>(key: K, value: Values[K]) { setValues((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const unsafeLink = [['URL do projeto', values.project_url], ['GitHub', values.github_url], ['Vercel', values.vercel_url], ['Domínio', values.domain]].find(([, value]) => value.trim() && !safeExternalUrl(value))
    if (unsafeLink) { setError(`${unsafeLink[0]} deve usar um endereço HTTP ou HTTPS válido.`); setSaving(false); return }
    const input: ProjectInput = { ...values, value: values.value.trim() === '' ? null : Number(values.value), start_date: values.start_date || null, deadline: values.deadline || null, project_url: values.project_url || null, github_url: values.github_url || null, vercel_url: values.vercel_url || null, domain: values.domain || null, notes: values.notes || null }
    try {
      const project = editing ? await updateProject(id, input) : await createProject(input)
      navigate(`/projetos/${project.id}`, { replace: true, state: { notice: editing ? 'Projeto atualizado.' : 'Projeto criado.' } })
    } catch { setError('Não foi possível salvar o projeto. Confira os dados e tente novamente.') }
    finally { setSaving(false) }
  }
  if (loading) return <div className="page-wrap form-page"><LoadingState label="Carregando projeto…" /></div>
  return <div className="page-wrap form-page project-form-page">
    <div className="page-header form-heading"><div><Link className="back-link" to={editing ? `/projetos/${id}` : values.client_id ? `/clientes/${values.client_id}` : '/clientes'}><Icon name="chevron" />Voltar</Link><p className="eyebrow">CARTEIRA / PROJETOS</p><h1>{editing ? 'Editar projeto' : 'Novo projeto'}</h1><p className="page-subtitle">Organize o escopo, o valor e as datas de entrega.</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    <form className="project-form" onSubmit={(event) => void submit(event)}>
      <section className="form-section"><div className="form-section-heading"><h2>Projeto</h2><p>O cliente é obrigatório. Os projetos ficam associados à sua conta.</p></div><div className="form-grid"><Select id="project-client" label="Cliente *" required value={values.client_id} onChange={(event) => field('client_id', event.target.value)}><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}{client.is_archived ? ' (arquivado)' : ''}</option>)}</Select><Input id="project-name" label="Nome do projeto *" required maxLength={180} value={values.name} onChange={(event) => field('name', event.target.value)} placeholder="Ex.: Site institucional" /><Input id="project-service" label="Serviço *" required maxLength={160} value={values.service} onChange={(event) => field('service', event.target.value)} placeholder="Ex.: Desenvolvimento de site" /><Input id="project-value" label="Valor (R$)" type="number" min="0" step="0.01" value={values.value} onChange={(event) => field('value', event.target.value)} /><Select id="project-status" label="Status" value={values.status} onChange={(event) => field('status', event.target.value as ProjectStatus)}>{projectStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select><div className="form-pair"><Input id="project-start" label="Início" type="date" value={values.start_date} onChange={(event) => field('start_date', event.target.value)} /><Input id="project-deadline" label="Prazo" type="date" value={values.deadline} onChange={(event) => field('deadline', event.target.value)} /></div></div></section>
      <section className="form-section"><div className="form-section-heading"><h2>Links e contexto</h2><p>Guarde os acessos e detalhes de acompanhamento em um só lugar.</p></div><div className="form-grid"><Input id="project-url" label="URL do projeto" type="url" maxLength={500} value={values.project_url} onChange={(event) => field('project_url', event.target.value)} placeholder="https://..." /><Input id="project-github" label="GitHub" type="url" maxLength={500} value={values.github_url} onChange={(event) => field('github_url', event.target.value)} placeholder="https://github.com/..." /><Input id="project-vercel" label="Vercel" type="url" maxLength={500} value={values.vercel_url} onChange={(event) => field('vercel_url', event.target.value)} placeholder="https://..." /><Input id="project-domain" label="Domínio" maxLength={255} value={values.domain} onChange={(event) => field('domain', event.target.value)} placeholder="exemplo.com.br" /><div className="project-notes-field"><Textarea id="project-notes" label="Observações" rows={5} maxLength={5000} value={values.notes} onChange={(event) => field('notes', event.target.value)} /></div></div></section>
      <div className="form-actions"><Link className="button button--secondary" to={editing ? `/projetos/${id}` : values.client_id ? `/clientes/${values.client_id}` : '/clientes'}>Cancelar</Link><button className="button button--primary" type="submit" disabled={saving || clients.length === 0}>{saving ? 'Salvando…' : editing ? 'Salvar projeto' : 'Criar projeto'}</button></div>
    </form>
  </div>
}
