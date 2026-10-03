import type { Lead, LeadSource } from '../types/database'

export const importFieldKeys = [
  'company_name', 'responsible_name', 'whatsapp', 'instagram', 'city', 'state', 'niche', 'source', 'notes',
] as const

export type ImportField = (typeof importFieldKeys)[number]
export type ImportColumnMapping = Record<number, ImportField | 'ignore'>
export type ParsedSheet = { name: string; headers: string[]; rows: string[][]; rowNumbers: number[] }
export type ParsedWorkbook = { fileType: 'csv' | 'xlsx'; sheets: ParsedSheet[] }
export type ImportFileMeta = { fileName: string; fileType: 'csv' | 'xlsx'; fileSize: number }
export type ImportStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed'
export type ImportRowResult = 'new' | 'possible_duplicate' | 'already_registered' | 'existing_with_new_info' | 'duplicate_in_file' | 'invalid' | 'conflict' | 'imported' | 'updated' | 'ignored' | 'failed'
export type ImportDecision = 'import' | 'update' | 'ignore'

export type ImportLeadData = {
  company_name: string
  responsible_name: string | null
  niche_label: string | null
  niche_id: string | null
  city: string | null
  state: string | null
  whatsapp: string | null
  instagram: string | null
  source_detail: string | null
  notes: string | null
}

export type ImportCandidate = Pick<Lead, 'id' | 'company_name' | 'responsible_name' | 'niche_id' | 'city' | 'state' | 'whatsapp' | 'instagram' | 'source' | 'source_detail' | 'notes'> & { niche_name: string | null }

export type ImportReviewRow = {
  rowNumber: number
  rawData: Record<string, string>
  normalizedData: ImportLeadData
  result: ImportRowResult
  matchedLead: ImportCandidate | null
  matchedOn: 'whatsapp' | 'instagram' | 'company_city' | null
  conflicts: Array<{ field: keyof ImportLeadData; crmValue: string; fileValue: string }>
  newFields: Array<keyof ImportLeadData>
  fieldChoices: Partial<Record<keyof ImportLeadData, 'crm' | 'file'>>
  nicheResolution: { kind: 'existing'; id: string } | { kind: 'create' } | null
  duplicateRowNumber: number | null
  selected: boolean
  decision: ImportDecision | null
  errorMessage: string | null
}

export type ImportSummary = { total: number; new: number; possibleDuplicate: number; alreadyRegistered: number; duplicateInFile: number; invalid: number; conflict: number; updates: number; selected: number }
export type ImportHistoryItem = {
  id: string
  file_name: string
  file_type: 'csv' | 'xlsx'
  file_size: number
  total_rows: number
  new_rows: number
  duplicate_rows: number
  updated_rows: number
  invalid_rows: number
  failed_rows: number
  status: ImportStatus
  failure_message: string | null
  created_at: string
}
export type ImportHistoryRow = {
  id: string
  import_id: string
  row_number: number
  raw_data: Record<string, string>
  normalized_data: Record<string, string | null>
  result: ImportRowResult
  decision: ImportDecision | null
  matched_lead_id: string | null
  error_message: string | null
  created_at: string
}

export const importFieldLabels: Record<ImportField, string> = {
  company_name: 'Empresa', responsible_name: 'Responsável', whatsapp: 'WhatsApp', instagram: 'Instagram',
  city: 'Cidade', state: 'Estado', niche: 'Nicho', source: 'Origem', notes: 'Observações',
}

export const importResultLabels: Record<ImportRowResult, string> = {
  new: 'Novo', possible_duplicate: 'Possível duplicado', already_registered: 'Já cadastrado', existing_with_new_info: 'Lead existente com informações novas', duplicate_in_file: 'Duplicado no arquivo',
  invalid: 'Inválido', conflict: 'Conflito de informação', imported: 'Importado', updated: 'Atualizado', ignored: 'Ignorado', failed: 'Falhou',
}

export const leadSourceByLabel: Record<string, LeadSource> = {
  google_maps: 'google_maps', 'google maps': 'google_maps', instagram: 'instagram', indicação: 'referral', indicacao: 'referral', referral: 'referral',
  importação: 'excel_list', importacao: 'excel_list', excel: 'excel_list', planilha: 'excel_list', excel_list: 'excel_list', manual: 'manual', other: 'other', outro: 'other',
}
