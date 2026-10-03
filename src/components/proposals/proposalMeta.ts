import type { ProposalStatus, ProposalStatusHistory, ProposalStatus as Status } from '../../types/database'

export const proposalStatusOptions: [ProposalStatus, string][] = [
  ['draft', 'Rascunho'], ['sent', 'Enviada'], ['negotiation', 'Em negociação'], ['accepted', 'Aceita'], ['rejected', 'Recusada'],
]
export const proposalStatusLabel = (status: ProposalStatus) => proposalStatusOptions.find(([key]) => key === status)?.[1] ?? status
export const formatProposalValue = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const formatProposalDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '—'
export const proposalStatusTone = (status: Status) => status === 'accepted' ? 'success' : status === 'rejected' ? 'error' : status === 'negotiation' ? 'warning' : status === 'sent' ? 'info' : 'neutral'
export function newestFirst<T extends { changed_at: string }>(events: T[]) { return [...events].sort((a, b) => Date.parse(b.changed_at) - Date.parse(a.changed_at)) }
export function historyLabel(entry: ProposalStatusHistory) { return entry.previous_status ? `${proposalStatusLabel(entry.previous_status)} → ${proposalStatusLabel(entry.new_status)}` : `Proposta criada como ${proposalStatusLabel(entry.new_status)}` }
