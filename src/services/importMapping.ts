import type { ImportColumnMapping, ImportField, ImportLeadData, ImportReviewRow, ParsedSheet } from './importTypes'

const aliases: Record<ImportField, string[]> = {
  company_name: ['empresa', 'nome da empresa', 'nome', 'estabelecimento', 'negocio', 'business', 'company', 'company_name'],
  responsible_name: ['responsavel', 'contato', 'nome do responsavel', 'owner', 'contact', 'contact_name'],
  whatsapp: ['whatsapp', 'whats app', 'telefone', 'celular', 'telefone celular', 'phone', 'mobile', 'fone'],
  instagram: ['instagram', 'insta', 'instagram.com', 'perfil do instagram'],
  city: ['cidade', 'municipio', 'city'], state: ['estado', 'uf', 'state'],
  niche: ['nicho', 'segmento', 'categoria', 'ramo', 'setor', 'category'],
  source: ['origem', 'fonte', 'source'], notes: ['observacao', 'observacoes', 'notas', 'note', 'notes'],
}

export function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function suggestColumnMappings(headers: string[]): ImportColumnMapping {
  const mapping: ImportColumnMapping = {}
  const used = new Set<ImportField>()
  headers.forEach((header, index) => {
    const canonical = normalizeHeader(header)
    const match = (Object.entries(aliases) as Array<[ImportField, string[]]>).find(([field, names]) => !used.has(field) && (names.some((name) => normalizeHeader(name) === canonical) || (field === 'instagram' && canonical.includes('instagram com'))))
    if (match) { mapping[index] = match[0]; used.add(match[0]) }
    else mapping[index] = 'ignore'
  })
  return mapping
}

export function normalizeCompanyOrCity(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  const international = value.trim().startsWith('+') || digits.startsWith('00')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!international && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`
  return digits
}

export function normalizeInstagram(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^instagram\.com\//, '').replace(/^@/, '').replace(/[/?#].*$/, '').replace(/\/+$/, '')
}

export function mapRows(sheet: ParsedSheet, mapping: ImportColumnMapping): Array<{ rowNumber: number; rawData: Record<string, string>; data: ImportLeadData }> {
  return sheet.rows.map((cells, index) => {
    const rawData: Record<string, string> = {}
    const values: Partial<Record<ImportField, string>> = {}
    Object.entries(mapping).forEach(([rawIndex, field]) => {
      if (field === 'ignore') return
      const column = Number(rawIndex)
      const rawValue = cells[column]?.trim() ?? ''
      rawData[sheet.headers[column]] = rawValue
      if (rawValue && !values[field]) values[field] = rawValue
    })
    const data: ImportLeadData = {
      company_name: values.company_name?.trim() ?? '',
      responsible_name: values.responsible_name?.trim() || null,
      niche_label: values.niche?.trim() || null,
      niche_id: null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      whatsapp: values.whatsapp?.trim() || null,
      instagram: values.instagram?.trim() || null,
      source_detail: values.source?.trim() || null,
      notes: values.notes?.trim() || null,
    }
    return { rowNumber: sheet.rowNumbers[index] ?? index + 2, rawData, data }
  })
}

export type DuplicateResult = { row_index: number; matched_lead_id: string | null; matched_on: 'whatsapp' | 'instagram' | 'company_city' | null }

type Candidate = ImportReviewRow['matchedLead']

function hasContent(value: string | null | undefined): value is string { return Boolean(value?.trim()) }
function normalizedOptional(value: string | null | undefined): string { return normalizeCompanyOrCity(value ?? '') }
function normalizedText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ')
}

function compareExisting(data: ImportLeadData, candidate: NonNullable<Candidate>): { newFields: Array<keyof ImportLeadData>; conflicts: ImportReviewRow['conflicts'] } {
  const pairs: Array<[keyof ImportLeadData, string | null, string | null]> = [
    ['company_name', candidate.company_name, data.company_name],
    ['responsible_name', candidate.responsible_name, data.responsible_name],
    ['niche_label', candidate.niche_name, data.niche_label],
    ['city', candidate.city, data.city], ['state', candidate.state, data.state],
    ['whatsapp', candidate.whatsapp, data.whatsapp], ['instagram', candidate.instagram, data.instagram],
    ['source_detail', candidate.source_detail, data.source_detail], ['notes', candidate.notes, data.notes],
  ]
  const newFields: Array<keyof ImportLeadData> = []
  const conflicts: ImportReviewRow['conflicts'] = []
  pairs.forEach(([field, current, incoming]) => {
    if (!hasContent(incoming)) return
    if (!hasContent(current)) { newFields.push(field); return }
    const normalizedCurrent = field === 'whatsapp' ? normalizePhone(current) : field === 'instagram' ? normalizeInstagram(current) : field === 'company_name' || field === 'city' || field === 'niche_label' ? normalizedOptional(current) : normalizedText(current)
    const normalizedIncoming = field === 'whatsapp' ? normalizePhone(incoming) : field === 'instagram' ? normalizeInstagram(incoming) : field === 'company_name' || field === 'city' || field === 'niche_label' ? normalizedOptional(incoming) : normalizedText(incoming)
    if (normalizedCurrent !== normalizedIncoming) conflicts.push({ field, crmValue: current, fileValue: incoming })
  })
  return { newFields, conflicts }
}

export function buildReviewRows(
  mapped: ReturnType<typeof mapRows>,
  matches: DuplicateResult[],
  candidates: Record<string, NonNullable<Candidate>>,
): ImportReviewRow[] {
  const matchByRow = new Map(matches.map((match) => [match.row_index, match]))
  const firstByPhone = new Map<string, number>()
  const firstByInstagram = new Map<string, number>()
  const firstByCompanyCity = new Map<string, number>()
  const built: ImportReviewRow[] = []

  mapped.forEach((row, index) => {
    const { data } = row
    const phoneDigits = data.whatsapp?.replace(/\D/g, '') ?? ''
    const invalidReason = !data.company_name.trim() ? 'Informe a empresa para criar um lead no CRM.'
      : data.company_name.length > 160 ? 'O nome da empresa ultrapassa 160 caracteres.'
        : data.responsible_name && data.responsible_name.length > 160 ? 'O nome do responsável ultrapassa 160 caracteres.'
          : data.city && data.city.length > 100 ? 'A cidade ultrapassa 100 caracteres.'
            : data.state && data.state.length > 80 ? 'O estado ultrapassa 80 caracteres.'
              : data.whatsapp && /\d+(?:[.,]\d+)?e[+-]?\d+/i.test(data.whatsapp) ? 'O telefone parece estar em notação científica. Formate a coluna como texto e selecione o arquivo novamente.'
                : data.whatsapp && (phoneDigits.length < 10 || phoneDigits.length > 15) ? 'O WhatsApp precisa ter 10 a 15 dígitos, incluindo o código do país quando informado.'
                  : data.instagram && data.instagram.length > 160 ? 'O Instagram ultrapassa 160 caracteres.'
                    : data.source_detail && data.source_detail.length > 120 ? 'A origem ultrapassa 120 caracteres.'
                      : data.notes && data.notes.length > 4000 ? 'As observações ultrapassam 4.000 caracteres.'
                        : null
    if (invalidReason) {
      built.push({ ...row, normalizedData: data, result: 'invalid', matchedLead: null, matchedOn: null, conflicts: [], newFields: [], fieldChoices: {}, nicheResolution: null, duplicateRowNumber: null, selected: false, decision: 'ignore', errorMessage: invalidReason })
      return
    }
    const phoneKey = data.whatsapp ? normalizePhone(data.whatsapp) : ''
    const instagramKey = data.instagram ? normalizeInstagram(data.instagram) : ''
    const cityKey = data.city ? `${normalizeCompanyOrCity(data.company_name)}|${normalizeCompanyOrCity(data.city)}` : ''
    const duplicateRow = (phoneKey && firstByPhone.get(phoneKey)) || (instagramKey && firstByInstagram.get(instagramKey)) || (cityKey && firstByCompanyCity.get(cityKey)) || null
    if (duplicateRow) {
      const previous = built.find((item) => item.rowNumber === duplicateRow)
      built.push({ ...row, normalizedData: data, result: 'duplicate_in_file', matchedLead: previous?.matchedLead ?? null, matchedOn: previous?.matchedOn ?? null, conflicts: [], newFields: [], fieldChoices: {}, nicheResolution: null, duplicateRowNumber: duplicateRow, selected: false, decision: 'ignore', errorMessage: `Esta linha repete a linha ${duplicateRow} do arquivo.` })
      return
    }
    if (phoneKey) firstByPhone.set(phoneKey, row.rowNumber)
    if (instagramKey) firstByInstagram.set(instagramKey, row.rowNumber)
    if (cityKey) firstByCompanyCity.set(cityKey, row.rowNumber)

    const match = matchByRow.get(index)
    const candidate = match?.matched_lead_id ? candidates[match.matched_lead_id] ?? null : null
    if (!match?.matched_lead_id || !candidate) {
      built.push({ ...row, normalizedData: data, result: 'new', matchedLead: null, matchedOn: null, conflicts: [], newFields: [], fieldChoices: {}, nicheResolution: null, duplicateRowNumber: null, selected: true, decision: 'import', errorMessage: null })
      return
    }
    const comparison = compareExisting(data, candidate)
    const result = comparison.conflicts.length ? 'conflict' : comparison.newFields.length ? 'existing_with_new_info' : match.matched_on === 'company_city' ? 'possible_duplicate' : 'already_registered'
    built.push({ ...row, normalizedData: data, result, matchedLead: candidate, matchedOn: match.matched_on, conflicts: comparison.conflicts, newFields: comparison.newFields, fieldChoices: {}, nicheResolution: null, duplicateRowNumber: null, selected: false, decision: 'ignore', errorMessage: null })
  })
  return built
}

export function summarizeImport(rows: ImportReviewRow[]): { total: number; new: number; possibleDuplicate: number; alreadyRegistered: number; duplicateInFile: number; invalid: number; conflict: number; updates: number; selected: number } {
  const count = (result: ImportReviewRow['result']) => rows.filter((row) => row.result === result).length
  return {
    total: rows.length, new: count('new'), possibleDuplicate: count('possible_duplicate'),
    alreadyRegistered: count('already_registered') + count('existing_with_new_info'), duplicateInFile: count('duplicate_in_file'),
    invalid: count('invalid'), conflict: count('conflict'), updates: rows.filter((row) => row.decision === 'update').length,
    selected: rows.filter((row) => row.decision === 'import').length,
  }
}
