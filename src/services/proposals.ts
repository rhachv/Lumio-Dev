import { supabase } from '../lib/supabase/client'
import type { Proposal, ProposalListItem, ProposalStatus, ProposalStatusHistory, ProposalSummary } from '../types/database'

export type ProposalFilters = { query: string; status: ProposalStatus | null; clientId: string | null; leadId: string | null; from: string | null; to: string | null; archived: 'active' | 'archived' | 'all' }
export type ProposalInput = Pick<Proposal, 'title' | 'service'> & Partial<Pick<Proposal, 'lead_id' | 'client_id' | 'description' | 'value' | 'status' | 'valid_until' | 'sent_at' | 'notes'>>
export type ProposalLeadOption = { id: string; company_name: string; status: string; is_archived: boolean }

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar as propostas.')
  return supabase
}

export async function listProposals(filters: ProposalFilters): Promise<ProposalListItem[]> {
  const { data, error } = await db().rpc('search_proposals', {
    p_query: filters.query.trim(), p_status: filters.status, p_client_id: filters.clientId,
    p_lead_id: filters.leadId, p_from: filters.from || null, p_to: filters.to || null, p_archived: filters.archived,
  })
  if (error) throw error
  return data ?? []
}

export async function getProposalSummary(): Promise<ProposalSummary[]> {
  const { data, error } = await db().rpc('proposal_summary')
  if (error) throw error
  return data ?? []
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data, error } = await db().from('proposals').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getProposalStatusHistory(id: string): Promise<ProposalStatusHistory[]> {
  const { data, error } = await db().from('proposal_status_history').select('*').eq('proposal_id', id).order('changed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProposalLeadOptions(): Promise<ProposalLeadOption[]> {
  const { data, error } = await db().from('leads').select('id, company_name, status, is_archived').order('company_name')
  if (error) throw error
  return data ?? []
}

export async function createProposal(input: ProposalInput): Promise<Proposal> {
  const { data, error } = await db().from('proposals').insert(normalize(input)).select('*').single()
  if (error) throw error
  return data
}

export async function updateProposal(id: string, input: ProposalInput): Promise<Proposal> {
  const { data, error } = await db().from('proposals').update(normalize(input)).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

function normalize(input: ProposalInput): ProposalInput {
  return {
    ...input,
    title: input.title.trim(),
    service: input.service.trim(),
    description: input.description?.trim() || null,
    value: input.value ?? null,
    valid_until: input.valid_until || null,
    sent_at: input.sent_at || null,
    notes: input.notes?.trim() || null,
  }
}

export async function changeProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  const { error } = await db().from('proposals').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateProposal(id: string): Promise<Proposal> {
  const original = await getProposal(id)
  return createProposal({
    lead_id: original.lead_id, client_id: original.client_id, title: `${original.title} (cópia)`,
    service: original.service, description: original.description, value: original.value,
    status: 'draft', valid_until: original.valid_until, sent_at: null, notes: original.notes,
  })
}

export async function setProposalArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await db().from('proposals').update({ is_archived: isArchived }).eq('id', id)
  if (error) throw error
}
