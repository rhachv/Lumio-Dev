import { supabase } from '../lib/supabase/client'
import type { Client, ClientListItem } from '../types/database'

export type ClientInput = Pick<Client, 'company_name'> & Partial<Pick<Client, 'responsible_name' | 'niche_name' | 'city' | 'state' | 'whatsapp' | 'instagram' | 'notes'>>
export type ClientFilters = { query: string; archived: 'active' | 'archived' | 'all'; projects?: 'all' | 'with_projects' | 'without_projects' | 'in_progress' | 'completed' }

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar os clientes.')
  return supabase
}

export async function listClients(filters: ClientFilters): Promise<ClientListItem[]> {
  const { data, error } = await db().rpc('search_clients', { p_query: filters.query.trim(), p_archived: filters.archived, p_project_filter: filters.projects ?? 'all' })
  if (error) throw error
  return data ?? []
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await db().from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getClientForLead(leadId: string): Promise<Client | null> {
  const { data, error } = await db().from('clients').select('*').eq('lead_id', leadId).maybeSingle()
  if (error) throw error
  return data
}

export async function convertWonLeadToClient(leadId: string): Promise<Client> {
  const { data: clientId, error } = await db().rpc('convert_won_lead_to_client', { p_lead_id: leadId })
  if (error) throw error
  return getClient(clientId)
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await db().from('clients').update({
    ...input,
    company_name: input.company_name.trim(),
    responsible_name: input.responsible_name?.trim() || null,
    niche_name: input.niche_name?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    instagram: input.instagram?.trim() || null,
    notes: input.notes?.trim() || null,
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function setClientArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await db().from('clients').update({ is_archived: isArchived }).eq('id', id)
  if (error) throw error
}
