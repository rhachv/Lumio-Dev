import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { Button, Input, Select, Textarea } from '../../components/ui/FormControls'
import { Dialog } from '../../components/ui/Overlays'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import { readableError, sourceOptions } from '../../components/leads/leadMeta'
import { createLead, getLead, getLeadNiches, updateLead, type DuplicateLead, type LeadInput } from '../../services/leads'
import type { Niche } from '../../types/database'

type FormValues = { company_name: string; responsible_name: string; niche_id: string; city: string; state: string; whatsapp: string; instagram: string; source: string; source_detail: string; notes: string }
const emptyValues: FormValues = { company_name: '', responsible_name: '', niche_id: '', city: '', state: '', whatsapp: '', instagram: '', source: 'manual', source_detail: '', notes: '' }

function toLeadInput(values: FormValues): LeadInput {
  const clean = (value: string) => value.trim() || null
  return {
    company_name: values.company_name.trim(), source: values.source as LeadInput['source'], source_detail: clean(values.source_detail),
    responsible_name: clean(values.responsible_name), niche_id: values.niche_id || null,
    city: clean(values.city), state: clean(values.state), whatsapp: clean(values.whatsapp),
    instagram: clean(values.instagram), notes: clean(values.notes),
  }
}

function getDuplicate(error: unknown): DuplicateLead | null {
  return typeof error === 'object' && error !== null && 'duplicate' in error ? (error as { duplicate: DuplicateLead }).duplicate : null
}

export function LeadFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nicheError, setNicheError] = useState(false)
  const [nicheRetry, setNicheRetry] = useState(0)
  const [duplicate, setDuplicate] = useState<DuplicateLead | null>(null)

  useEffect(() => {
    let active = true
    setNicheError(false)
    getLeadNiches().then((result) => { if (active) setNiches(result) }).catch(() => { if (active) setNicheError(true) })
    if (id) getLead(id).then((lead) => {
      if (!active) return
      setValues({ company_name: lead.company_name, responsible_name: lead.responsible_name ?? '', niche_id: lead.niche_id ?? '', city: lead.city ?? '', state: lead.state ?? '', whatsapp: lead.whatsapp ?? '', instagram: lead.instagram ?? '', source: lead.source, source_detail: lead.source_detail ?? '', notes: lead.notes ?? '' })
    }).catch(() => { if (active) setError('Não foi possível carregar este lead.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, nicheRetry])

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) { setValues((current) => ({ ...current, [key]: value })) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setDuplicate(null); setSaving(true)
    try {
      const input = toLeadInput(values)
      if (editing && id) {
        const lead = await updateLead(id, input)
        navigate(`/leads/${lead.id}`, { replace: true, state: { notice: 'Lead atualizado.' } })
      } else {
        const result = await createLead(input)
        if (result.duplicate) setDuplicate(result.duplicate)
        else if (result.lead) navigate(`/leads/${result.lead.id}`, { replace: true, state: { notice: 'Lead cadastrado.' } })
      }
    } catch (reason) {
      const existing = getDuplicate(reason)
      if (existing) setDuplicate(existing)
      else setError(readableError(reason, editing ? 'Não foi possível salvar as alterações. Tente novamente.' : 'Não foi possível cadastrar o lead. Tente novamente.'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="page-wrap form-page"><LoadingState label="Carregando lead…" /></div>

  return <div className="page-wrap form-page">
    <div className="page-header form-heading"><div><Link className="back-link" to={editing && id ? `/leads/${id}` : '/leads'}><Icon name="chevron" />{editing ? 'Voltar para o lead' : 'Voltar para prospecção'}</Link><p className="eyebrow">CRM / LEADS</p><h1>{editing ? 'Editar lead' : 'Novo lead'}</h1><p className="page-subtitle">{editing ? 'Atualize as informações deste contato.' : 'Adicione uma oportunidade à sua prospecção.'}</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    {nicheError && <div className="notice notice--info form-notice" role="status">Não foi possível carregar os nichos. <button type="button" className="text-button" onClick={() => setNicheRetry((count) => count + 1)}>Tentar novamente</button></div>}
    <form className="lead-form" onSubmit={submit}>
      <section className="form-section"><div className="form-section-heading"><h2>Informações principais</h2><p>Os campos marcados com * são obrigatórios.</p></div>
        <div className="form-grid"><Input id="company" label="Empresa *" required autoFocus maxLength={160} value={values.company_name} onChange={(event) => setField('company_name', event.target.value)} placeholder="Nome da empresa" />
          <Input id="responsible" label="Nome do responsável" maxLength={160} value={values.responsible_name} onChange={(event) => setField('responsible_name', event.target.value)} />
          <Select id="niche" label="Nicho" value={values.niche_id} onChange={(event) => setField('niche_id', event.target.value)}><option value="">Selecione um nicho</option>{niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</Select>
          <div className="form-pair"><Input id="city" label="Cidade" maxLength={100} value={values.city} onChange={(event) => setField('city', event.target.value)} /><Input id="state" label="Estado" maxLength={80} value={values.state} onChange={(event) => setField('state', event.target.value)} /></div>
        </div>
      </section>
      <section className="form-section"><div className="form-section-heading"><h2>Contato e origem</h2><p>Informe ao menos um canal se estiver disponível.</p></div>
        <div className="form-grid form-grid--two"><Input id="whatsapp" label="WhatsApp" type="tel" autoComplete="tel" maxLength={40} hint="Pode incluir o código do país. Números locais recebem +55 ao abrir o WhatsApp." value={values.whatsapp} onChange={(event) => setField('whatsapp', event.target.value)} placeholder="(11) 99999-9999" />
          <Input id="instagram" label="Instagram" maxLength={160} hint="Nome de usuário ou link do perfil." value={values.instagram} onChange={(event) => setField('instagram', event.target.value)} placeholder="@perfil" />
          <Select id="source" label="Origem *" required value={values.source} onChange={(event) => setField('source', event.target.value)}>{sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input id="source-detail" label="Detalhe da origem" maxLength={120} hint="Preserva o nome específico recebido de uma lista ou indicação." value={values.source_detail} onChange={(event) => setField('source_detail', event.target.value)} />
        </div>
      </section>
      <section className="form-section"><div className="form-section-heading"><h2>Observações</h2><p>Registre contexto útil para este relacionamento.</p></div><Textarea id="notes" label="Observações" maxLength={4000} rows={5} value={values.notes} onChange={(event) => setField('notes', event.target.value)} /></section>
      <div className="form-actions"><Link className="button button--secondary" to={editing && id ? `/leads/${id}` : '/leads'}>Cancelar</Link><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar lead'}</Button></div>
    </form>
    <Dialog open={Boolean(duplicate)} title="Encontramos um lead parecido" onOpenChange={(open) => { if (!open) setDuplicate(null) }} actions={<><Button onClick={() => setDuplicate(null)}>Cancelar</Button>{duplicate && <Link className="button button--primary" to={`/leads/${duplicate.id}`}>Visualizar lead existente</Link>}</>}>
      {duplicate && <div className="duplicate-preview"><p>Há um registro com informações semelhantes. Para evitar uma duplicidade, revise o lead existente antes de continuar.</p><dl><div><dt>Empresa</dt><dd>{duplicate.company_name}</dd></div><div><dt>Nicho</dt><dd>{duplicate.niche_name ?? '—'}</dd></div><div><dt>Cidade</dt><dd>{duplicate.city ?? '—'}</dd></div><div><dt>WhatsApp</dt><dd>{duplicate.whatsapp ?? '—'}</dd></div><div><dt>Status</dt><dd><LeadStatusBadge status={duplicate.status} /></dd></div><div><dt>Correspondência</dt><dd>{duplicate.matched_on === 'company_city' ? 'Empresa e cidade' : duplicate.matched_on === 'whatsapp' ? 'WhatsApp' : 'Instagram'}</dd></div></dl></div>}
    </Dialog>
  </div>
}
