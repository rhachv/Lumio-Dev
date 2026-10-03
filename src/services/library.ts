import { supabase } from '../lib/supabase/client'
import type { LibraryItemType, LibrarySearchResult, Tag } from '../types/database'
import type { PreparedScreenshot } from './libraryValidation'
import { libraryTagComparisonKey, normalizeLibraryTagName } from './libraryValidation'

export type LibraryFilters = { query: string; type: LibraryItemType | null; tagIds: string[]; favoritesOnly: boolean; archived: 'active' | 'archived' | 'all'; sort: 'recent' | 'oldest' | 'title'; page: number }
export type LibraryInput = { id?: string; title: string; description: string; type: LibraryItemType; url: string | null; notes: string; favorite: boolean; tagIds: string[]; screenshotPath: string | null }
export type LibraryItemView = LibrarySearchResult & { screenshotUrl: string | null }
export const libraryBucket = 'lumio-library-screenshots'

function db() {
  if (!supabase) throw new Error('Conecte o Supabase para acessar sua biblioteca.')
  return supabase
}

function decodeRows(rows: Array<LibrarySearchResult & { tags: unknown }>): LibrarySearchResult[] {
  return rows.map((row) => ({ ...row, tags: Array.isArray(row.tags) ? row.tags as LibrarySearchResult['tags'] : [] }))
}

async function attachSignedUrls(items: LibrarySearchResult[]): Promise<LibraryItemView[]> {
  const paths = [...new Set(items.map((item) => item.screenshot_path).filter((path): path is string => Boolean(path)))]
  if (!paths.length) return items.map((item) => ({ ...item, screenshotUrl: null }))
  let urls = new Map<string, string>()
  try {
    const { data, error } = await db().storage.from(libraryBucket).createSignedUrls(paths, 3600)
    if (!error && data) urls = new Map(data.flatMap((entry) => entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as [string, string]] : []))
  } catch { /* A missing private object remains a placeholder in the card. */ }
  return items.map((item) => ({ ...item, screenshotUrl: item.screenshot_path ? urls.get(item.screenshot_path) ?? null : null }))
}

export async function listLibraryItems(filters: LibraryFilters): Promise<{ items: LibraryItemView[]; total: number }> {
  const { data, error } = await db().rpc('search_library_items', {
    p_query: filters.query.trim(), p_type: filters.type, p_tag_ids: filters.tagIds,
    p_favorites_only: filters.favoritesOnly, p_archived: filters.archived, p_sort: filters.sort, p_page: filters.page, p_page_size: 24,
  })
  if (error) throw error
  const rows = (data ?? []) as unknown as Array<LibrarySearchResult & { tags: unknown; total_count: number }>
  return { items: await attachSignedUrls(decodeRows(rows)), total: rows[0]?.total_count ?? 0 }
}

export async function getLibraryItem(id: string): Promise<LibraryItemView> {
  const { data, error } = await db().rpc('search_library_items', {
    p_query: '', p_type: null, p_tag_ids: [], p_favorites_only: false, p_archived: 'all', p_sort: 'recent', p_item_id: id, p_page: 1, p_page_size: 1,
  })
  if (error) throw error
  const item = decodeRows((data ?? []) as unknown as Array<LibrarySearchResult & { tags: unknown }>)[0]
  if (!item) throw new Error('Referência não encontrada.')
  return (await attachSignedUrls([item]))[0]
}

export async function listLibraryTags(): Promise<Tag[]> {
  const { data, error } = await db().from('tags').select('*').order('name')
  if (error) throw error
  return data
}

export async function createLibraryTag(name: string): Promise<Tag> {
  const cleaned = normalizeLibraryTagName(name)
  if (!cleaned || cleaned.length > 48) throw new Error('A tag deve ter de 1 a 48 caracteres.')
  const { data, error } = await db().from('tags').insert({ name: cleaned }).select('*').single()
  if (error) throw error
  return data
}

export async function setLibraryTagActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await db().from('tags').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

export async function saveLibraryItem(input: LibraryInput, image: PreparedScreenshot | null, previousPath: string | null): Promise<{ id: string; imageWarning: boolean }> {
  const client = db()
  const id = input.id ?? crypto.randomUUID()
  let userId: string | null = null
  let newPath: string | null = null
  if (image) {
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) throw new Error('Sua sessão expirou. Entre novamente para enviar a imagem.')
    userId = data.user.id
    const suffix = crypto.randomUUID()
    newPath = `${userId}/${id}/${suffix}.${image.extension}`
    const { error: uploadError } = await client.storage.from(libraryBucket).upload(newPath, image.blob, { contentType: image.mimeType, cacheControl: '3600', upsert: false })
    if (uploadError) throw new Error('Não foi possível enviar a imagem para o armazenamento privado.')
  }

  const { error } = await client.rpc('save_library_item', {
    p_item_id: id, p_title: input.title.trim(), p_description: input.description.trim() || null,
    p_type: input.type, p_url: input.url, p_notes: input.notes.trim() || null,
    p_is_favorite: input.favorite, p_tag_ids: input.tagIds, p_screenshot_path: newPath ?? (image ? null : input.screenshotPath),
  })
  if (error) {
    if (newPath) await client.storage.from(libraryBucket).remove([newPath])
    throw error
  }

  const nextPath = newPath ?? (image ? null : input.screenshotPath)
  const shouldRemovePrevious = previousPath && previousPath !== nextPath
  let imageWarning = false
  if (shouldRemovePrevious) {
    const { error: removeError } = await client.storage.from(libraryBucket).remove([previousPath])
    imageWarning = Boolean(removeError)
  }
  return { id, imageWarning }
}

export async function setLibraryFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await db().from('library_items').update({ is_favorite: favorite }).eq('id', id)
  if (error) throw error
}

export async function setLibraryArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await db().from('library_items').update({ is_archived: archived }).eq('id', id)
  if (error) throw error
}

export async function createLibraryTagSafely(name: string, existing: Tag[]): Promise<Tag> {
  const cleaned = normalizeLibraryTagName(name)
  const duplicate = existing.find((tag) => libraryTagComparisonKey(tag.name) === libraryTagComparisonKey(cleaned))
  if (duplicate) return duplicate
  try { return await createLibraryTag(cleaned) }
  catch (reason) {
    if (typeof reason === 'object' && reason !== null && 'code' in reason && reason.code === '23505') throw new Error('Já existe uma tag com esse nome exato.')
    throw reason
  }
}
