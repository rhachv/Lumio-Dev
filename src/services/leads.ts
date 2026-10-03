import { supabase } from '../lib/supabase/client'
import type { InteractionType, Lead, LeadActivity, LeadInteraction, LeadSource, LeadStatus, LeadStatusHistory, LeadWithNiche, Niche } from '../types/database'

export type LeadInput = Pick<Lead, 'company_name' | 'source'> & Partial<Pick<Lead, 'responsible_name' | 'niche_id' | 'city' | 'state' | 'whatsapp' | 'instagram' | 'source_detail' | 'notes'>>
export type LeadFilters = { query: string; status: LeadStatus | null; nicheId: string | null; source: LeadSource | null; blocked: boolean | null; archived: 'active' | 'archived' | 'all'; page: number; pageSize: number }
export type LeadListRow = Lead & { niche_name: string | null }
export type DuplicateLead = { id: string; company_name: string; niche_name: string | null; city: string | null; whatsapp: string | null; status: LeadStatus; matched_on: 'whatsapp' | 'instagram' | 'company_city' }
export type TimelineEntry =
  | { id: string; kind: 'interaction'; occurredAt: string; type: InteractionType; note: string | null }
  | { id: string; kind: 'status'; occurredAt: string; previousStatus: LeadStatus | null; newStatus: LeadStatus }
  | { id: string; kind: 'activity'; occurredAt: string; eventType: LeadActivity['event_type']; details: LeadActivity['details'] }

function requireSupabase() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar os leads.')
  return supabase
}

export async function getLeadNiches(): Promise<Niche[]> {
  const { data, error } = await requireSupabase().from('nichos').select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data
}

export async function listLeads(filters: LeadFilters): Promise<{ rows: LeadListRow[]; total: number }> {
  const { data, error } = await requireSupabase().rpc('search_leads', {
    p_query: filters.query.trim(), p_status: filters.status, p_niche_id: filters.nicheId,
    p_source: filters.source, p_blocked: filters.blocked, p_archived: filters.archived,
    p_page: filters.page, p_page_size: filters.pageSize,
  })
  if (error) throw error
  const rows = data ?? []
  return { rows: rows.map(({ niche_name, total_count, ...lead }) => ({ ...lead, niche_name })), total: rows[0]?.total_count ?? 0 }
}

export async function getLead(id: string): Promise<LeadWithNiche> {
  const { data, error } = await requireSupabase().from('leads').select('*, niche:nichos!leads_niche_user_fkey(id,name)').eq('id', id).single()
  if (error) throw error
  return data as LeadWithNiche
}

export async function getLeadTimeline(id: string): Promise<TimelineEntry[]> {
  const db = requireSupabase()
  const [interactions, statuses, activities] = await Promise.all([
    db.from('lead_interactions').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }),
    db.from('lead_status_history').select('*').eq('lead_id', id).order('changed_at', { ascending: false }),
    db.from('lead_activity_history').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }),
  ])
  const error = interactions.error ?? statuses.error ?? activities.error
  if (error) throw error
  return [
    ...(interactions.data as LeadInteraction[]).map((item): TimelineEntry => ({ id: item.id, kind: 'interaction', occurredAt: item.occurred_at, type: item.type, note: item.note })),
    ...(statuses.data as LeadStatusHistory[]).map((item): TimelineEntry => ({ id: item.id, kind: 'status', occurredAt: item.changed_at, previousStatus: item.previous_status, newStatus: item.new_status })),
    ...(activities.data as LeadActivity[]).map((item): TimelineEntry => ({ id: item.id, kind: 'activity', occurredAt: item.occurred_at, eventType: item.event_type, details: item.details })),
  ].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
}

export async function findDuplicateLead(input: LeadInput, excludeId?: string): Promise<DuplicateLead | null> {
  const { data, error } = await requireSupabase().rpc('find_duplicate_lead', {
    p_company_name: input.company_name, p_city: input.city ?? null, p_whatsapp: input.whatsapp ?? null,
    p_instagram: input.instagram ?? null, p_exclude_id: excludeId ?? null,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export async function createLead(input: LeadInput): Promise<{ lead: Lead | null; duplicate: DuplicateLead | null }> {
  const db = requireSupabase()
  const duplicate = await findDuplicateLead(input)
  if (duplicate) return { lead: null, duplicate }
  const { data, error } = await db.from('leads').insert(input).select('*').single()
  if (!error) return { lead: data, duplicate: null }
  if (error.code === '23505') {
    const racedDuplicate = await findDuplicateLead(input)
    if (racedDuplicate) return { lead: null, duplicate: racedDuplicate }
  }
  throw error
}

export async function updateLead(id: string, input: LeadInput): Promise<Lead> {
  const duplicate = await findDuplicateLead(input, id)
  if (duplicate) throw Object.assign(new Error('duplicate_lead'), { duplicate })
  const { data, error } = await requireSupabase().from('leads').update(input).eq('id', id).select('*').single()
  if (error?.code === '23505') {
    const racedDuplicate = await findDuplicateLead(input, id)
    if (racedDuplicate) throw Object.assign(new Error('duplicate_lead'), { duplicate: racedDuplicate })
  }
  if (error) throw error
  return data
}

export async function changeLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await requireSupabase().from('leads').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setLeadBlocked(id: string, blocked: boolean, reason: string | null): Promise<void> {
  const { error } = await requireSupabase().from('leads').update({ is_blocked: blocked, block_reason: blocked ? reason : null }).eq('id', id)
  if (error) throw error
}

export async function setLeadArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await requireSupabase().from('leads').update({ is_archived: archived }).eq('id', id)
  if (error) throw error
}

export async function addLeadInteraction(id: string, type: InteractionType, occurredAt: string, note: string): Promise<void> {
  const { error } = await requireSupabase().from('lead_interactions').insert({ lead_id: id, type, occurred_at: occurredAt, note: note.trim() || null })
  if (error) throw error
}
