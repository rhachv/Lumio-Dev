import { supabase } from '../lib/supabase/client'
import type { Project, ProjectStatus, ProjectStatusHistory } from '../types/database'

export type ProjectInput = Pick<Project, 'client_id' | 'name' | 'service'> & Partial<Pick<Project, 'value' | 'status' | 'start_date' | 'deadline' | 'project_url' | 'github_url' | 'vercel_url' | 'domain' | 'notes'>>

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar os projetos.')
  return supabase
}

export async function listClientProjects(clientId: string, archived: 'active' | 'archived' | 'all' = 'active'): Promise<Project[]> {
  let query = db().from('projects').select('*').eq('client_id', clientId).order('updated_at', { ascending: false })
  if (archived !== 'all') query = query.eq('is_archived', archived === 'archived')
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await db().from('projects').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getProjectStatusHistory(id: string): Promise<ProjectStatusHistory[]> {
  const { data, error } = await db().from('project_status_history').select('*').eq('project_id', id).order('changed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await db().from('projects').insert(normalize(input)).select('*').single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await db().from('projects').update(normalize(input)).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

function normalize(input: ProjectInput): ProjectInput {
  return {
    ...input,
    name: input.name.trim(),
    service: input.service.trim(),
    value: input.value ?? null,
    project_url: input.project_url?.trim() || null,
    github_url: input.github_url?.trim() || null,
    vercel_url: input.vercel_url?.trim() || null,
    domain: input.domain?.trim() || null,
    notes: input.notes?.trim() || null,
  }
}

export async function changeProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  const { error } = await db().from('projects').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setProjectArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await db().from('projects').update({ is_archived: isArchived }).eq('id', id)
  if (error) throw error
}
