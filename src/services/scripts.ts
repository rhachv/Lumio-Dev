import { supabase } from '../lib/supabase/client'
import type { Niche, Script, ScriptCategory, ScriptListItem } from '../types/database'

export type ScriptFilters = {
  query: string
  categoryId: string | null
  nicheId: string | null
  favoritesOnly: boolean
  archived: 'active' | 'archived' | 'all'
}
export type ScriptInput = Pick<Script, 'title' | 'content' | 'category_id'> & Partial<Pick<Script, 'objective' | 'niche_id' | 'is_favorite'>>

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar seus scripts.')
  return supabase
}

export async function listScripts(filters: ScriptFilters): Promise<ScriptListItem[]> {
  const { data, error } = await db().rpc('search_scripts', {
    p_query: filters.query.trim(), p_category_id: filters.categoryId, p_niche_id: filters.nicheId,
    p_favorites_only: filters.favoritesOnly, p_archived: filters.archived,
  })
  if (error) throw error
  return data ?? []
}

export async function getScript(id: string): Promise<Script> {
  const { data, error } = await db().from('scripts').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getScriptCategories(): Promise<ScriptCategory[]> {
  const { data, error } = await db().from('script_categories').select('*').order('name')
  if (error) throw error
  return data
}

export async function getScriptNiches(includeInactive = false): Promise<Niche[]> {
  let query = db().from('nichos').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createScript(input: ScriptInput): Promise<Script> {
  const { data, error } = await db().from('scripts').insert({
    ...input, title: input.title.trim(), objective: input.objective?.trim() || null, content: input.content.trim(),
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updateScript(id: string, input: ScriptInput): Promise<Script> {
  const { data, error } = await db().from('scripts').update({
    ...input, title: input.title.trim(), objective: input.objective?.trim() || null, content: input.content.trim(),
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function setScriptFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { error } = await db().from('scripts').update({ is_favorite: isFavorite }).eq('id', id)
  if (error) throw error
}

export async function setScriptArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await db().from('scripts').update({ is_archived: isArchived }).eq('id', id)
  if (error) throw error
}

export async function createScriptCategory(input: { name: string; description: string }): Promise<ScriptCategory> {
  const { data, error } = await db().from('script_categories').insert({
    name: input.name.trim(), description: input.description.trim() || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function setScriptCategoryActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await db().from('script_categories').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}
