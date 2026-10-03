import type { InteractionType, LeadSource, LeadStatus } from '../../types/database'

export const statusLabels: Record<LeadStatus, string> = {
  new: 'Novo', contacted: 'Abordado', interested: 'Interessado', negotiation: 'Negociação',
  no_response: 'Sem resposta', not_interested: 'Não interessado', won: 'Ganho', lost: 'Perdido',
}
export const statusOptions = Object.entries(statusLabels) as [LeadStatus, string][]
export const sourceLabels: Record<LeadSource, string> = {
  google_maps: 'Google Maps', instagram: 'Instagram', referral: 'Indicação', excel_list: 'Lista Excel', manual: 'Manual', other: 'Outro',
}
export const sourceOptions = Object.entries(sourceLabels) as [LeadSource, string][]
export const interactionLabels: Record<InteractionType, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', phone: 'Telefone', in_person: 'Presencial', other: 'Outro',
}

export function toWhatsAppUrl(value: string | null | undefined): string | null {
  const input = value?.trim()
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (!digits) return null
  const normalized = input.startsWith('+') ? digits
    : digits.startsWith('00') ? digits.slice(2)
      : digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  return `https://wa.me/${normalized}`
}

export function toInstagramUrl(value: string | null | undefined): string | null {
  const username = value?.trim()
    .replace(/^@/, '')
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .split(/[/?#]/, 1)[0]
  return username ? `https://www.instagram.com/${username}/` : null
}

export function formatDate(value: string, includeTime = false): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' as const } : {}) }).format(new Date(value))
}

export function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message === 'duplicate_lead') return 'Encontramos um lead parecido já cadastrado.'
  return fallback
}
