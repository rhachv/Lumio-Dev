import type { FormEvent } from 'react'
import { Input, Select, Textarea } from '../ui/FormControls'
import type { ClientListItem, ProposalStatus } from '../../types/database'
import type { ProposalLeadOption } from '../../services/proposals'
import { proposalStatusOptions } from './proposalMeta'

export type ProposalFormValues = { title: string; lead_id: string; client_id: string; service: string; description: string; value: string; status: ProposalStatus; valid_until: string; sent_at: string; notes: string }
export function ProposalForm({ values, leads, clients, saving, editing, onChange, onSubmit, onCancel }: { values: ProposalFormValues; leads: ProposalLeadOption[]; clients: ClientListItem[]; saving: boolean; editing: boolean; onChange: <K extends keyof ProposalFormValues>(key: K, value: ProposalFormValues[K]) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="proposal-form" onSubmit={onSubmit}>
    <section className="form-section"><div className="form-section-heading"><h2>Informações comerciais</h2><p>Registre a proposta e seu vínculo com a prospecção ou carteira.</p></div>
      <div className="form-grid"><Input id="proposal-title" label="Título *" required maxLength={180} autoFocus value={values.title} onChange={(event) => onChange('title', event.target.value)} placeholder="Ex.: Site institucional — Empresa X" />
        <Input id="proposal-service" label="Serviço *" required maxLength={160} value={values.service} onChange={(event) => onChange('service', event.target.value)} placeholder="Ex.: Site institucional, Landing page" />
        <div className="proposal-relation-fields"><Select id="proposal-lead" label="Lead (opcional)" value={values.lead_id} onChange={(event) => onChange('lead_id', event.target.value)}><option value="">Sem lead vinculado</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}{lead.is_archived ? ' (arquivado)' : ''}</option>)}</Select><Select id="proposal-client" label="Cliente (opcional)" value={values.client_id} onChange={(event) => onChange('client_id', event.target.value)}><option value="">Sem cliente vinculado</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}{client.is_archived ? ' (arquivado)' : ''}</option>)}</Select></div>
        <div className="proposal-relation-hint">Você pode vincular um lead e manter esse histórico ao adicionar o cliente depois.</div>
        <Input id="proposal-value" label="Valor (R$)" type="number" min="0" step="0.01" value={values.value} onChange={(event) => onChange('value', event.target.value)} />
        <Select id="proposal-status" label="Status" value={values.status} onChange={(event) => onChange('status', event.target.value as ProposalStatus)}>{proposalStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select>
        <Input id="proposal-valid-until" label="Validade" type="date" value={values.valid_until} onChange={(event) => onChange('valid_until', event.target.value)} />
        <Input id="proposal-sent-at" label="Data de envio" type="datetime-local" value={values.sent_at} onChange={(event) => onChange('sent_at', event.target.value)} />
      </div>
    </section>
    <section className="form-section"><div className="form-section-heading"><h2>Escopo e observações</h2><p>Detalhes para consultar internamente. A proposta não é enviada por este módulo.</p></div><div className="form-grid"><div className="proposal-form-wide"><Textarea id="proposal-description" label="Descrição" rows={6} maxLength={8000} value={values.description} onChange={(event) => onChange('description', event.target.value)} placeholder="Escopo, entregáveis e condições principais" /></div><div className="proposal-form-wide"><Textarea id="proposal-notes" label="Observações internas" rows={4} maxLength={5000} value={values.notes} onChange={(event) => onChange('notes', event.target.value)} /></div></div></section>
    <div className="form-actions"><button className="button button--secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar proposta' : 'Criar proposta'}</button></div>
  </form>
}
