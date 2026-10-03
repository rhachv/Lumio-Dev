import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Input, Textarea } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { getClient, updateClient, type ClientInput } from '../../services/clients'

type Values = { company_name: string; responsible_name: string; niche_name: string; city: string; state: string; whatsapp: string; instagram: string; notes: string }
const blank: Values = { company_name: '', responsible_name: '', niche_name: '', city: '', state: '', whatsapp: '', instagram: '', notes: '' }

export function ClientFormPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Values>(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getClient(id).then((client) => { if (active) setValues({ company_name: client.company_name, responsible_name: client.responsible_name ?? '', niche_name: client.niche_name ?? '', city: client.city ?? '', state: client.state ?? '', whatsapp: client.whatsapp ?? '', instagram: client.instagram ?? '', notes: client.notes ?? '' }) }).catch(() => { if (active) setError('Não foi possível carregar os dados do cliente.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function field<K extends keyof Values>(key: K, value: Values[K]) { setValues((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try { const client = await updateClient(id, values as ClientInput); navigate(`/clientes/${client.id}`, { replace: true, state: { notice: 'Dados do cliente atualizados.' } }) }
    catch { setError('Não foi possível salvar os dados. Confira a conexão com o Supabase e tente novamente.') }
    finally { setSaving(false) }
  }
  if (loading) return <div className="page-wrap form-page"><LoadingState label="Carregando cliente…" /></div>
  return <div className="page-wrap form-page client-form-page">
    <div className="page-header form-heading"><div><Link className="back-link" to={`/clientes/${id}`}><Icon name="chevron" />Voltar para o cliente</Link><p className="eyebrow">CARTEIRA / CLIENTES</p><h1>Editar cliente</h1><p className="page-subtitle">Atualize os dados da conta, sem alterar o lead de origem.</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    <form className="client-form" onSubmit={(event) => void submit(event)}>
      <section className="form-section"><div className="form-section-heading"><h2>Informações da empresa</h2><p>Dados independentes do registro de prospecção.</p></div><div className="form-grid"><Input id="client-company" label="Empresa *" required maxLength={160} value={values.company_name} onChange={(event) => field('company_name', event.target.value)} /><Input id="client-contact" label="Responsável" maxLength={160} value={values.responsible_name} onChange={(event) => field('responsible_name', event.target.value)} /><Input id="client-niche" label="Nicho" maxLength={120} value={values.niche_name} onChange={(event) => field('niche_name', event.target.value)} /><div className="form-pair"><Input id="client-city" label="Cidade" maxLength={100} value={values.city} onChange={(event) => field('city', event.target.value)} /><Input id="client-state" label="Estado" maxLength={80} value={values.state} onChange={(event) => field('state', event.target.value)} /></div></div></section>
      <section className="form-section"><div className="form-section-heading"><h2>Contato e observações</h2><p>Os canais ajudam a manter o relacionamento próximo.</p></div><div className="form-grid form-grid--two"><Input id="client-whatsapp" label="WhatsApp" type="tel" maxLength={40} value={values.whatsapp} onChange={(event) => field('whatsapp', event.target.value)} /><Input id="client-instagram" label="Instagram" maxLength={160} value={values.instagram} onChange={(event) => field('instagram', event.target.value)} /><div className="client-notes-field"><Textarea id="client-notes" label="Observações" rows={5} maxLength={4000} value={values.notes} onChange={(event) => field('notes', event.target.value)} /></div></div></section>
      <div className="form-actions"><Link className="button button--secondary" to={`/clientes/${id}`}>Cancelar</Link><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar cliente'}</button></div>
    </form>
  </div>
}
