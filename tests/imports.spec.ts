import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { normalizeCompanyOrCity, normalizeInstagram, normalizePhone, suggestColumnMappings, mapRows, buildReviewRows } from '../src/services/importMapping'
import { readSpreadsheet } from '../src/services/spreadsheetReader'
import { buildImportLeadData } from '../src/services/imports'
import type { ImportReviewRow, ParsedSheet } from '../src/services/importTypes'

function createSheet(headers: string[], rows: string[][], rowNumbers = rows.map((_, index) => index + 2)): ParsedSheet {
  return { name: 'Leads', headers, rows, rowNumbers }
}

const existingLead = {
  id: 'lead-1', company_name: 'Café Aurora', responsible_name: null, niche_id: null, niche_name: null,
  city: 'Rio de Janeiro', state: 'RJ', whatsapp: '5521999998888', instagram: null,
  source: 'manual' as const, source_detail: null, notes: null,
}

function reviewRows(sheet: ParsedSheet, matchedOn: 'whatsapp' | 'instagram' | 'company_city' | null = null, candidate = existingLead) {
  const mapped = mapRows(sheet, suggestColumnMappings(sheet.headers))
  const matches = matchedOn ? [{ row_index: 0, matched_lead_id: candidate.id, matched_on: matchedOn }] : []
  return buildReviewRows(mapped, matches, matchedOn ? { [candidate.id]: candidate } : {})
}

describe('spreadsheet reading', () => {
  it('reads CSV headers and keeps the original source row number', async () => {
    const file = new File(['Empresa;Telefone;Cidade\nCafé Aurora;(21) 99999-8888;Rio'], 'leads.csv', { type: 'text/csv' })
    const parsed = await readSpreadsheet(file)
    expect(parsed.fileType).toBe('csv')
    expect(parsed.sheets[0].headers).toEqual(['Empresa', 'Telefone', 'Cidade'])
    expect(parsed.sheets[0].rows[0]).toEqual(['Café Aurora', '(21) 99999-8888', 'Rio'])
    expect(parsed.sheets[0].rowNumbers[0]).toBe(2)
    const review = reviewRows(parsed.sheets[0])
    expect(review[0].result).toBe('new')
    expect(review[0].decision).toBe('import')
  })

  it('reads a valid XLSX workbook', async () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Empresa', 'Telefone'], ['Café Aurora', '(21) 99999-8888']]), 'Empresas')
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Uint8Array
    const file = new File([bytes as BlobPart], 'leads.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const parsed = await readSpreadsheet(file)
    expect(parsed.fileType).toBe('xlsx')
    expect(parsed.sheets[0].name).toBe('Empresas')
    expect(parsed.sheets[0].rows[0]).toEqual(['Café Aurora', '(21) 99999-8888'])
  })

  it('rejects formula cells without evaluating them', async () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([['Empresa', 'Telefone'], ['Café Aurora', '(21) 99999-8888']])
    worksheet.B2 = { t: 'n', f: '1+1', v: 2 }
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas')
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Uint8Array
    const file = new File([bytes as BlobPart], 'leads.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await expect(readSpreadsheet(file)).rejects.toThrow('contém fórmulas')
  })

  it('rejects a file whose MIME type conflicts with its extension', async () => {
    const file = new File(['not a spreadsheet'], 'leads.xlsx', { type: 'application/pdf' })
    await expect(readSpreadsheet(file)).rejects.toThrow('não corresponde')
  })
})

describe('mapping, normalization and duplicate classification', () => {
  it('maps common Portuguese headers and normalizes phone, Instagram and accents', () => {
    const mapping = suggestColumnMappings(['Nome da empresa', 'Celular', 'Instagram.com', 'Município'])
    expect(Object.values(mapping)).toEqual(['company_name', 'whatsapp', 'instagram', 'city'])
    expect(normalizePhone('(21) 99999-8888')).toBe('5521999998888')
    expect(normalizePhone('+1 (212) 555-0100')).toBe('12125550100')
    expect(normalizeInstagram('https://www.instagram.com/@CafeAurora/')).toBe('cafeaurora')
    expect(normalizeCompanyOrCity('  CAFÉ   São João ')).toBe('cafe sao joao')
  })

  it('marks strong WhatsApp and Instagram matches as already registered', () => {
    const whatsapp = reviewRows(createSheet(['Empresa', 'WhatsApp'], [['Café Aurora', '(21) 99999-8888']]), 'whatsapp')
    expect(whatsapp[0].result).toBe('already_registered')
    const instagram = reviewRows(createSheet(['Empresa', 'Instagram'], [['Café Aurora', '@cafeaurora']]), 'instagram', { ...existingLead, instagram: 'https://instagram.com/cafeaurora' })
    expect(instagram[0].result).toBe('already_registered')
  })

  it('marks matching company and city as a possible duplicate', () => {
    const rows = reviewRows(createSheet(['Empresa', 'Cidade'], [['Cafe Aurora', 'Rio de Janeiro']]), 'company_city')
    expect(rows[0].result).toBe('possible_duplicate')
  })

  it('marks repeated rows inside the file and invalid rows', () => {
    const repeated = reviewRows(createSheet(['Empresa', 'WhatsApp'], [['Café Aurora', '(21) 99999-8888'], ['Café Aurora Ltda.', '5521999998888']]))
    expect(repeated[1].result).toBe('duplicate_in_file')
    const invalid = reviewRows(createSheet(['Empresa', 'WhatsApp'], [['', '']]))
    expect(invalid[0].result).toBe('invalid')
    expect(invalid[0].decision).toBe('ignore')
  })

  it('offers updates for new information without using blank file fields to erase CRM values', () => {
    const rows = reviewRows(createSheet(['Empresa', 'WhatsApp', 'Instagram', 'Cidade'], [['Café Aurora', '(21) 99999-8888', '', 'Rio de Janeiro']]), 'whatsapp', { ...existingLead, instagram: '@cafeaurora' })
    const row: ImportReviewRow = rows[0]
    expect(row.result).toBe('already_registered')
    expect(row.newFields).not.toContain('instagram')
    expect(row.conflicts).not.toContainEqual(expect.objectContaining({ field: 'instagram' }))
    row.decision = 'update'
    const patch = buildImportLeadData(row, 'update')
    expect(patch).not.toHaveProperty('instagram')
  })

  it('lets the user select an update when a matched lead has a new Instagram value', () => {
    const rows = reviewRows(createSheet(['Empresa', 'WhatsApp', 'Instagram'], [['Café Aurora', '(21) 99999-8888', '@cafeaurora']]), 'whatsapp')
    const row = rows[0]
    expect(row.result).toBe('existing_with_new_info')
    expect(row.newFields).toContain('instagram')
    const patch = buildImportLeadData({ ...row, decision: 'update' }, 'update')
    expect(patch.instagram).toBe('@cafeaurora')
  })

  it('marks conflicting city values for an explicit choice before updating', () => {
    const rows = reviewRows(createSheet(['Empresa', 'WhatsApp', 'Cidade'], [['Café Aurora', '(21) 99999-8888', 'Niterói']]), 'whatsapp')
    expect(rows[0].result).toBe('conflict')
    expect(rows[0].fieldChoices.city).toBeUndefined()
  })
})
