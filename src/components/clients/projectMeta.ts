import type { ProjectStatus } from '../../types/database'

export const projectStatusOptions: [ProjectStatus, string][] = [
  ['briefing', 'Briefing'], ['design', 'Design'], ['development', 'Desenvolvimento'],
  ['review', 'Revisão'], ['delivery', 'Entrega'], ['completed', 'Concluído'], ['cancelled', 'Cancelado'],
]

export function projectStatusLabel(status: ProjectStatus) {
  return projectStatusOptions.find(([value]) => value === status)?.[1] ?? status
}

export function formatCurrency(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatShortDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function safeExternalUrl(value: string | null) {
  if (!value) return null
  const input = value.trim()
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) return null
  try {
    const url = new URL(input.match(/^https?:\/\//i) ? input : `https://${input}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch { return null }
}
