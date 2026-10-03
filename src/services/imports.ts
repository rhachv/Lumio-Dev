import { supabase } from '../lib/supabase/client'
import type { Database, Json, LeadImportRow, LeadSource, Niche } from '../types/database'
import { leadSourceByLabel, type ImportColumnMapping, type ImportDecision, type ImportFileMeta, type ImportHistoryItem, type ImportHistoryRow, type ImportLeadData, type ImportReviewRow, type ImportSummary } from './importTypes'
import { buildReviewRows, normalizeCompanyOrCity, normalizeInstagram, normalizePhone, type DuplicateResult, mapRows } from './importMapping'
import type { ParsedSheet } from './importTypes'

function requireSupabase() {
  if (!supabase) throw new Error('Conecte o Supabase para importar leads.')
  return supabase
}

function sourceFor(value: string | null): LeadSource {
  if (!value) return 'excel_list'
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
  return leadSourceByLabel[normalized] ?? 'other'
}

function comparisonData(data: ImportLeadData): Record<string, string | null> {
  return {
    company_name_normalized: normalizeCompanyOrCity(data.company_name),
    city_normalized: data.city ? normalizeCompanyOrCity(data.city) : null,
    whatsapp_normalized: data.whatsapp ? normalizePhone(data.whatsapp) : null,
    instagram_normalized: data.instagram ? normalizeInstagram(data.instagram) : null,
    niche_normalized: data.niche_label ? normalizeCompanyOrCity(data.niche_label) : null,
  }
}

export async function analyzeImport(sheet: ParsedSheet, mapping: ImportColumnMapping, niches: Niche[]): Promise<ImportReviewRow[]> {
  const mappedRows = mapRows(sheet, mapping)
  const requestRows = mappedRows.map(({ data }, rowIndex) => ({
    row_index: rowIndex, company_name: data.company_name,
    city: data.city, whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : null,
    instagram: data.instagram ? normalizeInstagram(data.instagram) : null,
  }))
  const { data, error } = await requireSupabase().rpc('match_leads_for_import', { p_rows: requestRows })
  if (error) throw error
  const candidates: Record<string, NonNullable<ImportReviewRow['matchedLead']>> = {}
  const matches: DuplicateResult[] = (data ?? []).map((row, index) => {
    const match = row as typeof data[number]
    const id = match.matched_lead_id
    if (id && match.company_name) {
      candidates[id] = {
        id, company_name: match.company_name, responsible_name: match.responsible_name,
        niche_id: match.niche_id, niche_name: match.niche_name, city: match.city, state: match.state,
        whatsapp: match.whatsapp, instagram: match.instagram, source: match.source ?? 'other',
        source_detail: match.source_detail, notes: match.notes,
      }
    }
    return { row_index: match.row_index ?? index, matched_lead_id: id, matched_on: match.matched_on }
  })
  const rows = buildReviewRows(mappedRows, matches, candidates)
  const nicheByName = new Map(niches.map((niche) => [normalizeCompanyOrCity(niche.name), niche]))
  return rows.map((row) => {
    const existing = row.normalizedData.niche_label ? nicheByName.get(normalizeCompanyOrCity(row.normalizedData.niche_label)) : undefined
    if (!existing) return row
    return { ...row, normalizedData: { ...row.normalizedData, niche_id: existing.id }, nicheResolution: { kind: 'existing', id: existing.id } }
  })
}

export function summarize(rows: ImportReviewRow[]): ImportSummary {
  const count = (value: ImportReviewRow['result']) => rows.filter((row) => row.result === value).length
  return {
    total: rows.length, new: count('new'), possibleDuplicate: count('possible_duplicate'),
    alreadyRegistered: count('already_registered') + count('existing_with_new_info'),
    duplicateInFile: count('duplicate_in_file'), invalid: count('invalid'), conflict: count('conflict'),
    updates: rows.filter((row) => row.decision === 'update').length,
    selected: rows.filter((row) => row.decision === 'import').length,
  }
}

export async function listImportHistory(): Promise<ImportHistoryItem[]> {
  const { data, error } = await requireSupabase().from('imports').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data as ImportHistoryItem[]
}

export async function getImportHistory(id: string): Promise<{ item: ImportHistoryItem; rows: ImportHistoryRow[] }> {
  const db = requireSupabase()
  async function readRows(): Promise<ImportHistoryRow[]> {
    const rows: ImportHistoryRow[] = []
    for (let start = 0; start < 2000; start += 500) {
      const { data, error } = await db.from('import_rows').select('*').eq('import_id', id).order('row_number').range(start, start + 499)
      if (error) throw error
      rows.push(...(data as LeadImportRow[] as ImportHistoryRow[]))
      if (!data || data.length < 500) break
    }
    return rows
  }
  const [itemResult, rowsResult] = await Promise.all([
    db.from('imports').select('*').eq('id', id).single(),
    readRows(),
  ])
  if (itemResult.error) throw itemResult.error
  return { item: itemResult.data as ImportHistoryItem, rows: rowsResult }
}

export async function createImport(meta: ImportFileMeta, totalRows: number): Promise<string> {
  const { data, error } = await requireSupabase().from('imports').insert({
    file_name: meta.fileName.slice(0, 240), file_type: meta.fileType, file_size: meta.fileSize, total_rows: totalRows,
  }).select('id').single()
  if (error) throw error
  return data.id
}

export function buildImportLeadData(row: ImportReviewRow, decision: ImportDecision): Record<string, Json> {
  const data = row.normalizedData
  const result: Record<string, Json> = {}
  const allowedFields = decision === 'import'
    ? (['company_name', 'responsible_name', 'city', 'state', 'whatsapp', 'instagram', 'source_detail', 'notes'] as Array<keyof ImportLeadData>)
    : [...row.newFields, ...row.conflicts.filter(({ field }) => row.fieldChoices[field] === 'file').map(({ field }) => field)]

  allowedFields.forEach((field) => {
    if (field === 'niche_label') {
      if (row.nicheResolution?.kind === 'create') result.niche_label = data.niche_label
      else if (row.nicheResolution?.kind === 'existing') {
        result.niche_id = row.nicheResolution.id
        result.niche_label = data.niche_label
      }
      return
    }
    if (field === 'niche_id') {
      if (row.nicheResolution?.kind === 'existing') result.niche_id = row.nicheResolution.id
      else if (row.nicheResolution?.kind === 'create') result.niche_label = data.niche_label
      return
    }
    result[field] = data[field]
  })

  if (decision === 'import') {
    result.niche_label = row.nicheResolution ? data.niche_label : null
    if (row.nicheResolution?.kind === 'existing') result.niche_id = row.nicheResolution.id
    result.source = sourceFor(data.source_detail)
    result.source_detail = data.source_detail || 'Importação'
  }
  return result
}

function historyStatus(item: ImportHistoryItem) {
  return { status: item.status as 'completed' | 'completed_with_errors', imported: item.new_rows, updated: item.updated_rows, failed: item.failed_rows }
}

async function markImportFailed(importId: string, rows: ImportReviewRow[], message: string) {
  const db = requireSupabase()
  await db.from('import_rows').update({ result: 'failed', error_message: message }).eq('import_id', importId)
  await db.from('imports').update({ status: 'failed', failed_rows: rows.length, failure_message: message, completed_at: new Date().toISOString() }).eq('id', importId).eq('status', 'processing')
}

export async function confirmImport(meta: ImportFileMeta, rows: ImportReviewRow[], onProgress: (message: string) => void): Promise<{ status: 'completed' | 'completed_with_errors'; imported: number; updated: number; failed: number; importId: string }> {
  const db = requireSupabase()
  const importId = await createImport(meta, rows.length)
  const payload: Database['public']['Tables']['import_rows']['Insert'][] = rows.map((row) => ({
    import_id: importId,
    row_number: row.rowNumber,
    raw_data: row.rawData,
    normalized_data: comparisonData(row.normalizedData),
    lead_data: row.decision === 'import' || row.decision === 'update' ? buildImportLeadData(row, row.decision) : {},
    result: row.result,
    decision: row.decision ?? 'ignore',
    matched_lead_id: row.matchedLead?.id ?? null,
  }))
  try {
    for (let start = 0; start < payload.length; start += 100) {
      onProgress(`Preparando linhas ${Math.min(start + 100, payload.length)} de ${payload.length}…`)
      const { error } = await db.from('import_rows').insert(payload.slice(start, start + 100))
      if (error) throw error
    }
    onProgress('Salvando leads e atualizando o histórico…')
    const { data, error } = await db.rpc('commit_lead_import', { p_import_id: importId })
    if (!error && data?.[0]) {
      const result = data[0]
      return { status: result.status as 'completed' | 'completed_with_errors', imported: result.imported_rows, updated: result.updated_rows, failed: result.failed_rows, importId }
    }

    // Resolve ambiguous network responses by checking whether the database committed.
    const { data: saved } = await db.from('imports').select('*').eq('id', importId).maybeSingle()
    if (saved && (saved.status === 'completed' || saved.status === 'completed_with_errors')) return { ...historyStatus(saved as ImportHistoryItem), importId }
    if (saved?.status === 'failed') throw new Error(saved.failure_message || 'A importação falhou. Consulte os detalhes no histórico.')
    const message = error?.code === '23505'
      ? 'Uma linha entrou em conflito com outro cadastro durante a confirmação.'
      : 'Não foi possível concluir esta importação. Nenhum lead foi confirmado.'
    await markImportFailed(importId, rows, message)
    throw new Error(message)
  } catch (reason) {
    const { data: saved } = await db.from('imports').select('status').eq('id', importId).maybeSingle()
    if (saved?.status === 'processing') await markImportFailed(importId, rows, 'A importação foi interrompida antes da confirmação dos leads.')
    throw reason
  }
}

export async function deleteImport(id: string): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_lead_import', { p_import_id: id })
  if (error) throw error
}
