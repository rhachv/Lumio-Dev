import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ProposalTimeline } from '../../components/proposals/ProposalTimeline'
import { ProposalStatusBadge } from '../../components/proposals/ProposalStatusBadge'
import { proposalStatusOptions, formatProposalDate, formatProposalValue } from '../../components/proposals/proposalMeta'
import { Button, Select } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { getClient } from '../../services/clients'
import { changeProposalStatus, duplicateProposal, getProposal, getProposalLeadOptions, getProposalStatusHistory, setProposalArchived, type ProposalLeadOption } from '../../services/proposals'
import type { Client, Proposal, ProposalStatusHistory } from '../../types/database'

export function ProposalDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [history, setHistory] = useState<ProposalStatusHistory[]>([])
  const [lead, setLead] = useState<ProposalLeadOption | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [record, events, leads] = await Promise.all([getProposal(id), getProposalStatusHistory(id), getProposalLeadOptions()])
      const [account] = record.client_id ? await Promise.all([getClient(record.client_id)]) : [null]
      setProposal(record); setHistory(events); setLead(leads.find((item) => item.id === record.lead_id) ?? null); setClient(account)
    } catch { setError('Não foi possível carregar esta proposta.') }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  async function setStatus(value: string) {
    if (!proposal || value === proposal.status) return
    setSaving(true); setError('')
    try { await changeProposalStatus(proposal.id, value as Proposal['status']); setNotice('Status atualizado.'); await load() }
    catch { setError('Não foi possível atualizar o status da proposta.') }
    finally { setSaving(false) }
  }
  async function archive() {
    if (!proposal) return
    setSaving(true); setError('')
    try { await setProposalArchived(proposal.id, !proposal.is_archived); setArchiveDialog(false); setNotice(proposal.is_archived ? 'Proposta restaurada.' : 'Proposta arquivada.'); await load() }
    catch { setError('Não foi possível atualizar o arquivamento da proposta.') }
    finally { setSaving(false) }
  }
  async function duplicate() {
    if (!proposal) return
    setSaving(true); setError('')
    try { const copy = await duplicateProposal(proposal.id); navigate(`/propostas/${copy.id}`, { state: { notice: 'Cópia criada como rascunho. A proposta original não foi alterada.' } }) }
    catch { setError('Não foi possível duplicar a proposta.') }
    finally { setSaving(false) }
  }
  if (loading) return <div className="page-wrap proposal-detail-page"><LoadingState label="Carregando proposta…" /></div>
  if (error && !proposal) return <div className="page-wrap proposal-detail-page"><ErrorState onRetry={() => void load()}>{error}</ErrorState><Link className="text-link" to="/propostas">Voltar para propostas</Link></div>
  if (!proposal) return <div className="page-wrap proposal-detail-page"><ErrorState>Esta proposta não foi encontrada ou você não tem acesso.</ErrorState><Link className="text-link" to="/propostas">Voltar para propostas</Link></div>
  return <div className="page-wrap proposal-detail-page">
    <div className="detail-back-row"><Link className="back-link" to="/propostas"><Icon name="chevron" />Voltar para propostas</Link></div>
    {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}{error && <ErrorState>{error}</ErrorState>}
    <section className="proposal-detail-heading"><div><p className="eyebrow">COMERCIAL / PROPOSTA</p><h1>{proposal.title}</h1><div className="detail-badges"><ProposalStatusBadge status={proposal.status} />{proposal.is_archived && <span className="archive-label">Arquivada</span>}</div></div><div className="detail-actions"><Link className="button button--secondary" to={`/propostas/${proposal.id}/editar`}><Icon name="file" />Editar</Link><Button onClick={() => void duplicate()} disabled={saving}><Icon name="file" />{saving ? 'Duplicando…' : 'Duplicar'}</Button><Button onClick={() => setArchiveDialog(true)}>{proposal.is_archived ? 'Restaurar' : 'Arquivar'}</Button></div></section>
    <div className="proposal-detail-grid"><div className="detail-main-column">
      <section className="dashboard-section"><div className="section-heading"><div><h2>Resumo comercial</h2><p>{proposal.service}</p></div><span className="proposal-detail-value">{formatProposalValue(proposal.value)}</span></div><dl className="proposal-info-grid">
        <Info label="Serviço" value={proposal.service} /><Info label="Valor" value={formatProposalValue(proposal.value)} /><Info label="Lead" value={lead?.company_name ?? null} href={lead ? `/leads/${lead.id}` : null} /><Info label="Cliente" value={client?.company_name ?? null} href={client ? `/clientes/${client.id}` : null} /><Info label="Criada em" value={formatProposalDate(proposal.created_at)} /><Info label="Validade" value={formatProposalDate(proposal.valid_until)} /><Info label="Enviada em" value={proposal.sent_at ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(proposal.sent_at)) : null} /><div className="lead-info-item lead-info-item--wide"><dt>Descrição</dt><dd className="proposal-description">{proposal.description || 'Nenhuma descrição informada.'}</dd></div><div className="lead-info-item lead-info-item--wide"><dt>Observações internas</dt><dd className="lead-notes">{proposal.notes || 'Nenhuma observação registrada.'}</dd></div>
      </dl></section>
      <section className="dashboard-section timeline-section"><div className="section-heading"><div><h2>Histórico de status</h2><p>Registro automático das mudanças</p></div></div><ProposalTimeline events={history} /></section>
    </div><aside className="dashboard-section proposal-controls"><div className="section-heading"><div><h2>Acompanhamento</h2><p>Controle interno da negociação</p></div></div><div className="control-group"><h3>Status</h3><Select id="proposal-status-current" label="Status atual" value={proposal.status} disabled={saving} onChange={(event) => void setStatus(event.target.value)}>{proposalStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select><p>O histórico registra cada alteração.</p></div>{proposal.status === 'accepted' && lead && <div className="proposal-manual-conversion"><strong>Proposta aceita</strong><p>A conversão de lead continua sob seu controle.</p><Link className="text-link" to={`/leads/${lead.id}`}>Abrir lead <Icon name="arrow" /></Link></div>}</aside></div>
    <ConfirmDialog open={archiveDialog} title={proposal.is_archived ? 'Restaurar proposta' : 'Arquivar proposta'} confirmLabel={saving ? 'Salvando…' : proposal.is_archived ? 'Restaurar' : 'Arquivar'} onOpenChange={setArchiveDialog} onConfirm={() => void archive()}>{proposal.is_archived ? 'A proposta voltará à visualização ativa.' : 'A proposta sairá da lista ativa, sem ser excluída.'}</ConfirmDialog>
  </div>
}

function Info({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return <div className="lead-info-item"><dt>{label}</dt><dd>{value && href ? <Link to={href}>{value}</Link> : value || '—'}</dd></div>
}
