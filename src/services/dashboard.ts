import { supabase } from '../lib/supabase/client'
import { listLeads } from './leads'
import type { DashboardActivity, DashboardRecentProposal, DashboardSummary } from '../types/database'
import type { LeadListRow } from './leads'

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para carregar o Dashboard.')
  return supabase
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await db().rpc('get_dashboard_summary')
  if (error) throw error
  const summary = data?.[0]
  if (!summary) throw new Error('Resumo do Dashboard indisponível.')
  return summary
}

export async function getRecentDashboardLeads(): Promise<LeadListRow[]> {
  const { rows } = await listLeads({ query: '', status: null, nicheId: null, source: null, blocked: null, archived: 'active', page: 1, pageSize: 5 })
  return rows
}

export async function getRecentDashboardProposals(): Promise<DashboardRecentProposal[]> {
  const { data, error } = await db().rpc('get_dashboard_recent_proposals')
  if (error) throw error
  return data ?? []
}

export async function getRecentDashboardActivity(): Promise<DashboardActivity[]> {
  const { data, error } = await db().rpc('get_dashboard_recent_activity')
  if (error) throw error
  return data ?? []
}
