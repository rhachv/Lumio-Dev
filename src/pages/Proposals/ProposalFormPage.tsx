import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProposalForm, type ProposalFormValues } from '../../components/proposals/ProposalForm'
import { Icon } from '../../components/ui/Icon'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { listClients } from '../../services/clients'
import { createProposal, getProposal, getProposalLeadOptions, updateProposal, type ProposalInput, type ProposalLeadOption } from '../../services/proposals'
import type { ClientListItem, ProposalStatus } from '../../types/database'

const emptyValues: ProposalFormValues = { title: '', lead_id: '', client_id: '', service: '', description: '', value: '', status: 'draft', valid_until: '', sent_at: '', notes: '' }
function toLocal(value: string | null) { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export function ProposalFormPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [values, setValues] = useState<ProposalFormValues>(emptyValues)
  const [leads, setLeads] = useState<ProposalLeadOption[]>([])
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([getProposalLeadOptions(), listClients({ query: '', archived: 'all' }), editing ? getProposal(id) : Promise.resolve(null)]).then(([leadRows, clientRows, proposal]) => {
      if (!active) return
      setLeads(leadRows); setClients(clientRows)
      if (proposal) setValues({ title: proposal.title, lead_id: proposal.lead_id ?? '', client_id: proposal.client_id ?? '', service: proposal.service, description: proposal.description ?? '', value: proposal.value === null ? '' : String(proposal.value), status: proposal.status, valid_until: proposal.valid_until ?? '', sent_at: toLocal(proposal.sent_at), notes: proposal.notes ?? '' })
    }).catch(() => { if (active) setError('Não foi possível carregar os dados para esta proposta.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, id])
  function change<K extends keyof ProposalFormValues>(key: K, value: ProposalFormValues[K]) { setValues((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const input: ProposalInput = {
      title: values.title, service: values.service, lead_id: values.lead_id || null, client_id: values.client_id || null,
      description: values.description || null, value: values.value.trim() ? Number(values.value) : null,
      status: values.status as ProposalStatus, valid_until: values.valid_until || null,
      sent_at: values.sent_at ? new Date(values.sent_at).toISOString() : null, notes: values.notes || null,
    }
    try {
      const proposal = editing ? await updateProposal(id, input) : await createProposal(input)
      navigate(`/propostas/${proposal.id}`, { replace: true, state: { notice: editing ? 'Proposta atualizada.' : 'Proposta criada.' } })
    } catch { setError('Não foi possível salvar a proposta. Confira os campos e tente novamente.') }
    finally { setSaving(false) }
  }
  if (loading) return <div className="page-wrap form-page"><LoadingState label="Carregando proposta…" /></div>
  return <div className="page-wrap form-page proposal-form-page">
    <div className="page-header form-heading"><div><Link className="back-link" to={editing ? `/propostas/${id}` : '/propostas'}><Icon name="chevron" />Voltar para propostas</Link><p className="eyebrow">COMERCIAL / PROPOSTAS</p><h1>{editing ? 'Editar proposta' : 'Nova proposta'}</h1><p className="page-subtitle">Registre os detalhes para acompanhar internamente.</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    <ProposalForm values={values} leads={leads} clients={clients} saving={saving} editing={editing} onChange={change} onSubmit={(event) => void submit(event)} onCancel={() => navigate(editing ? `/propostas/${id}` : '/propostas')} />
  </div>
}
