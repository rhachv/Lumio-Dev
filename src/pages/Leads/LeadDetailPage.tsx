import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button, Input, Select, Textarea } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Dialog } from '../../components/ui/Overlays'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import { formatDate, interactionLabels, readableError, sourceLabels, statusOptions, toInstagramUrl, toWhatsAppUrl } from '../../components/leads/leadMeta'
import { addLeadInteraction, changeLeadStatus, getLead, getLeadTimeline, setLeadArchived, setLeadBlocked, type TimelineEntry } from '../../services/leads'
import { ErrorState, LoadingState } from '../../components/ui/States'
import type { InteractionType, LeadWithNiche } from '../../types/database'

type DetailDialog = 'block' | 'unblock' | 'archive' | 'restore' | null
function localDateTimeNow() { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [lead, setLead] = useState<LeadWithNiche | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DetailDialog>(null)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionType, setInteractionType] = useState<InteractionType>('whatsapp')
  const [occurredAt, setOccurredAt] = useState(localDateTimeNow)
  const [interactionNote, setInteractionNote] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? null)
  const [showFullTimeline, setShowFullTimeline] = useState(false)

  const load = useCallback(async (isRefresh = false, isActive: () => boolean = () => true) => {
    if (isActive()) { isRefresh ? setRefreshing(true) : setLoading(true); setError(null) }
    try {
      const [record, history] = await Promise.all([getLead(id), getLeadTimeline(id)])
      if (isActive()) { setLead(record); setTimeline(history) }
    } catch { if (isActive()) setError('Não foi possível carregar este lead. Tente novamente.') }
    finally { if (isActive()) { setLoading(false); setRefreshing(false) } }
  }, [id])

  useEffect(() => {
    let active = true
    void load(false, () => active)
    return () => { active = false }
  }, [load])

  async function mutate(action: () => Promise<void>, success: string): Promise<boolean> {
    setSaving(true); setError(null)
    try { await action(); setDialog(null); setInteractionOpen(false); setNotice(success); await load(true); return true }
    catch (reason) { setError(readableError(reason, 'Não foi possível salvar a alteração. Tente novamente.')); return false }
    finally { setSaving(false) }
  }

  async function onStatusChange(value: string) {
    if (!lead || value === lead.status) return
    await mutate(() => changeLeadStatus(lead.id, value as typeof lead.status), 'Status atualizado.')
  }

  async function submitInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!occurredAt) return
    const saved = await mutate(() => addLeadInteraction(id, interactionType, new Date(occurredAt).toISOString(), interactionNote), 'Interação registrada.')
    if (saved) { setInteractionNote(''); setOccurredAt(localDateTimeNow()) }
  }

  const visibleTimeline = useMemo(() => showFullTimeline ? timeline : timeline.slice(0, 8), [showFullTimeline, timeline])
  if (loading) return <div className="page-wrap lead-detail-page"><LoadingState label="Carregando lead…" /></div>
  if (error && !lead) return <div className="page-wrap lead-detail-page"><ErrorState onRetry={() => void load()}>Não foi possível carregar este lead. Tente novamente.</ErrorState><Link className="text-link" to="/leads">Voltar para prospecção</Link></div>
  if (!lead) return <div className="page-wrap lead-detail-page"><ErrorState>Este lead não foi encontrado ou você não tem acesso.</ErrorState><Link className="text-link" to="/leads">Voltar para prospecção</Link></div>

  const whatsappUrl = toWhatsAppUrl(lead.whatsapp)
  return <div className="page-wrap lead-detail-page">
    <div className="detail-back-row"><Link className="back-link" to="/leads"><Icon name="chevron" />Voltar para prospecção</Link>{refreshing && <span className="detail-saving"><span className="spinner" />Atualizando</span>}</div>
    {notice && <div className="notice notice--success" role="status">{notice}<button className="notice-dismiss" onClick={() => setNotice(null)} aria-label="Dispensar mensagem"><Icon name="close" /></button></div>}
    {error && <ErrorState>{error}</ErrorState>}
    <section className="lead-detail-heading"><div className="lead-detail-title"><p className="eyebrow">LEAD / {lead.niche?.name ?? 'SEM NICHO'}</p><h1>{lead.company_name}</h1><div className="detail-badges"><LeadStatusBadge status={lead.status} />{lead.is_blocked && <span className="blocked-label">Prospecção bloqueada</span>}{lead.is_archived && <span className="archive-label">Arquivado</span>}</div></div>
      <div className="detail-actions"><Link className="button button--secondary" to={`/leads/${lead.id}/editar`}><Icon name="file" />Editar</Link>{whatsappUrl ? <a className="button button--primary" href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="message" />Abrir WhatsApp</a> : <button className="button button--primary" disabled title="Adicione um WhatsApp para habilitar esta ação"><Icon name="message" />Abrir WhatsApp</button>}</div>
    </section>
    <div className="lead-detail-grid"><div className="detail-main-column">
      <section className="dashboard-section lead-info-section"><div className="section-heading"><div><h2>Informações do lead</h2><p>Dados de contato e origem</p></div></div><dl className="lead-info-grid">
        <Info label="Responsável" value={lead.responsible_name} /><Info label="Nicho" value={lead.niche?.name} /><Info label="Cidade" value={lead.city} /><Info label="Estado" value={lead.state} />
        <Info label="WhatsApp" value={lead.whatsapp} href={whatsappUrl} /><Info label="Instagram" value={lead.instagram} href={toInstagramUrl(lead.instagram)} external />
        <Info label="Origem" value={sourceLabels[lead.source]} /><Info label="Criado em" value={formatDate(lead.created_at, true)} /><Info label="Atualizado em" value={formatDate(lead.updated_at, true)} />
        <div className="lead-info-item lead-info-item--wide"><dt>Observações</dt><dd className="lead-notes">{lead.notes || 'Nenhuma observação registrada.'}</dd></div>
        {lead.is_blocked && lead.block_reason && <div className="lead-info-item lead-info-item--wide"><dt>Motivo do bloqueio</dt><dd>{lead.block_reason}</dd></div>}
      </dl></section>
      <section className="dashboard-section timeline-section"><div className="section-heading"><div><h2>Histórico</h2><p>Interações e alterações deste lead</p></div><Button variant="secondary" onClick={() => setInteractionOpen(true)}><Icon name="plus" />Registrar interação</Button></div>
        {timeline.length === 0 ? <div className="timeline-empty"><p>Nenhum registro no histórico.</p><Button variant="secondary" onClick={() => setInteractionOpen(true)}><Icon name="plus" />Registrar primeira interação</Button></div> : <div className="timeline-list">{visibleTimeline.map((entry) => <TimelineItem key={`${entry.kind}-${entry.id}`} entry={entry} />)}</div>}
        {timeline.length > 8 && <button className="text-button timeline-more" onClick={() => setShowFullTimeline((value) => !value)}>{showFullTimeline ? 'Mostrar menos' : `Ver histórico completo (${timeline.length})`}</button>}
      </section>
    </div><aside className="dashboard-section lead-controls"><div className="section-heading"><div><h2>Controles</h2><p>Organize a prospecção deste lead</p></div></div>
      <div className="control-group"><h3>Status</h3><Select id="lead-status" label="Status atual" className="control-select" value={lead.status} onChange={(event) => void onStatusChange(event.target.value)} disabled={saving}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><p>Indica o estágio atual da oportunidade.</p></div>
      <div className="control-group"><h3>Prospecção</h3><p>O bloqueio impede novas abordagens, sem alterar o status.</p>{lead.is_blocked ? <Button className="control-button" onClick={() => setDialog('unblock')}><Icon name="users" />Desbloquear prospecção</Button> : <Button className="control-button" onClick={() => { setBlockReason(''); setDialog('block') }}><Icon name="users" />Bloquear prospecção</Button>}</div>
      <div className="control-group"><h3>Arquivamento</h3><p>Leads arquivados saem da lista ativa e podem ser restaurados.</p>{lead.is_archived ? <Button className="control-button" onClick={() => setDialog('restore')}><Icon name="arrow" />Restaurar lead</Button> : <Button className="control-button" onClick={() => setDialog('archive')}><Icon name="file" />Arquivar lead</Button>}</div>
    </aside></div>

    <Dialog open={interactionOpen} title="Registrar interação" onOpenChange={setInteractionOpen} actions={<><Button onClick={() => setInteractionOpen(false)}>Cancelar</Button><Button variant="primary" type="submit" form="interaction-form" disabled={saving}>{saving ? 'Salvando…' : 'Salvar interação'}</Button></>}>
      <form id="interaction-form" className="interaction-form" onSubmit={submitInteraction}>{error && interactionOpen && <div className="notice notice--error" role="alert">{error}</div>}<Select id="interaction-type" label="Tipo" required value={interactionType} onChange={(event) => setInteractionType(event.target.value as InteractionType)}>{Object.entries(interactionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Input id="interaction-date" label="Data e horário" type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /><Textarea id="interaction-note" label="Observação" maxLength={2000} rows={3} value={interactionNote} onChange={(event) => setInteractionNote(event.target.value)} placeholder="O que aconteceu nesta interação?" /></form>
    </Dialog>
    <Dialog open={dialog === 'block'} title="Bloquear prospecção" onOpenChange={(open) => setDialog(open ? 'block' : null)} actions={<><Button onClick={() => setDialog(null)}>Cancelar</Button><Button variant="primary" onClick={() => void mutate(() => setLeadBlocked(lead.id, true, blockReason.trim() || null), 'Prospecção bloqueada.')} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar bloqueio'}</Button></>}>
      {error && <div className="notice notice--error" role="alert">{error}</div>}<p>Este lead continuará salvo no CRM e identificado como indisponível para novas prospecções. O status atual não será alterado.</p><Textarea id="block-reason" label="Motivo do bloqueio (opcional)" maxLength={500} rows={3} value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Ex.: pediu para não entrar em contato" />
    </Dialog>
    <ConfirmDialog open={dialog === 'unblock'} title="Desbloquear prospecção" confirmLabel="Desbloquear" onOpenChange={(open) => setDialog(open ? 'unblock' : null)} onConfirm={() => void mutate(() => setLeadBlocked(lead.id, false, null), 'Prospecção desbloqueada.')}>
      {error && <span className="field-error" role="alert">{error}</span>}O lead ficará disponível para futuras prospecções. O histórico do bloqueio será mantido.
    </ConfirmDialog>
    <ConfirmDialog open={dialog === 'archive'} title="Arquivar lead" confirmLabel="Arquivar lead" onOpenChange={(open) => setDialog(open ? 'archive' : null)} onConfirm={() => void mutate(() => setLeadArchived(lead.id, true), 'Lead arquivado.')}>
      {error && <span className="field-error" role="alert">{error}</span>}Este lead sairá da lista ativa. Você poderá encontrá-lo no filtro de arquivados e restaurá-lo quando quiser.
    </ConfirmDialog>
    <ConfirmDialog open={dialog === 'restore'} title="Restaurar lead" confirmLabel="Restaurar lead" onOpenChange={(open) => setDialog(open ? 'restore' : null)} onConfirm={() => void mutate(() => setLeadArchived(lead.id, false), 'Lead restaurado.')}>
      {error && <span className="field-error" role="alert">{error}</span>}Este lead voltará a aparecer na lista ativa de prospecção.
    </ConfirmDialog>
  </div>
}

function Info({ label, value, href, external = false }: { label: string; value: string | null | undefined; href?: string | null; external?: boolean }) {
  return <div className="lead-info-item"><dt>{label}</dt><dd>{value && href ? <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{value}</a> : value || '—'}</dd></div>
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  let title = ''
  let text = ''
  if (entry.kind === 'interaction') { title = interactionLabels[entry.type]; text = entry.note || 'Interação registrada.' }
  if (entry.kind === 'status') {
    const nextLabel = statusOptions.find(([status]) => status === entry.newStatus)?.[1] ?? entry.newStatus
    title = entry.previousStatus ? 'Status alterado' : 'Status inicial'
    text = entry.previousStatus ? `${statusOptions.find(([status]) => status === entry.previousStatus)?.[1] ?? entry.previousStatus} → ${nextLabel}` : nextLabel
  }
  if (entry.kind === 'activity') {
    const labels = { created: 'Lead cadastrado', updated: 'Dados atualizados', blocked: 'Prospecção bloqueada', unblocked: 'Prospecção desbloqueada', archived: 'Lead arquivado', restored: 'Lead restaurado' }
    title = labels[entry.eventType]
    text = entry.eventType === 'blocked' && entry.details && typeof entry.details === 'object' && 'reason' in entry.details && typeof entry.details.reason === 'string' ? entry.details.reason : ''
  }
  return <article className={`timeline-item timeline-item--${entry.kind}`}><span className="timeline-marker" aria-hidden="true" /><div className="timeline-entry-content"><div className="timeline-entry-heading"><h3>{title}</h3><time dateTime={entry.occurredAt}>{formatDate(entry.occurredAt, true)}</time></div>{text && <p>{text}</p>}</div></article>
}
