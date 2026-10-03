import type * as XLSX from 'xlsx'
import type { ParsedSheet, ParsedWorkbook } from './importTypes'

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 2000
export const MAX_IMPORT_COLUMNS = 50

const csvMimeTypes = new Set(['text/csv', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'])
const xlsxMimeTypes = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed'])

function decodeCsv(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '') }
  catch { return new TextDecoder('windows-1252').decode(bytes).replace(/^\uFEFF/, '') }
}

function worksheetToRows(sheetjs: typeof import('xlsx'), worksheet: XLSX.WorkSheet, name: string): ParsedSheet {
  const XLSX = sheetjs
  const ref = worksheet['!fullref'] ?? worksheet['!ref']
  if (!ref) throw new Error('A planilha não contém dados.')
  const originalRange = XLSX.utils.decode_range(ref)
  if (originalRange.e.r - originalRange.s.r + 1 > MAX_IMPORT_ROWS + 1) throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_ROWS.toLocaleString('pt-BR')} linhas.`)
  if (originalRange.e.c - originalRange.s.c + 1 > MAX_IMPORT_COLUMNS) throw new Error(`A planilha excede o limite de ${MAX_IMPORT_COLUMNS} colunas.`)
  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? ref)

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
      if (cell?.f) throw new Error('A planilha contém fórmulas. Converta-as em valores antes de importar.')
    }
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: false, defval: '', blankrows: true })
  const firstNonEmpty = matrix.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (firstNonEmpty < 0) throw new Error('A planilha está vazia.')
  const headerCells = matrix[firstNonEmpty] ?? []
  const headerCount = new Map<string, number>()
  const headers = headerCells.map((cell, index) => {
    const label = String(cell ?? '').trim() || `Coluna sem cabeçalho (${index + 1})`
    const count = (headerCount.get(label) ?? 0) + 1
    headerCount.set(label, count)
    return count === 1 ? label : `${label} (${count})`
  })
  if (!headers.some((header) => !header.startsWith('Coluna sem cabeçalho'))) throw new Error('Não encontrei cabeçalhos para identificar os campos.')
  const content = matrix.slice(firstNonEmpty + 1).map((row, offset) => ({ row, rowNumber: range.s.r + firstNonEmpty + offset + 2 }))
  if (content.length > MAX_IMPORT_ROWS) throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_ROWS.toLocaleString('pt-BR')} linhas.`)
  const populated = content.map(({ row, rowNumber }) => ({ cells: headers.map((_, index) => String(row[index] ?? '').trim()), rowNumber })).filter(({ cells }) => cells.some(Boolean))
  const rows = populated.map(({ cells }) => cells)
  if (rows.length === 0) throw new Error('O arquivo contém cabeçalho, mas não possui linhas para importar.')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_ROWS.toLocaleString('pt-BR')} linhas.`)
  return { name, headers, rows, rowNumbers: populated.map(({ rowNumber }) => rowNumber) }
}

export async function readSpreadsheet(file: File): Promise<ParsedWorkbook> {
  if (!file || file.size === 0) throw new Error('Selecione um arquivo que não esteja vazio.')
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('O arquivo ultrapassa o limite de 5 MB.')
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('pt-BR')
  if (extension !== 'xlsx' && extension !== 'csv') throw new Error('Formato não aceito. Envie um arquivo .xlsx ou .csv.')
  if (file.type && !(extension === 'xlsx' ? xlsxMimeTypes : csvMimeTypes).has(file.type.toLocaleLowerCase())) {
    throw new Error('O tipo do arquivo não corresponde a um Excel .xlsx ou CSV válido.')
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const XLSX = await import('xlsx')
    if (extension === 'xlsx') {
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('O conteúdo não parece ser um arquivo Excel .xlsx válido.')
      const workbook = XLSX.read(bytes, { type: 'array', cellFormula: true, cellDates: false, cellHTML: false, dense: false, sheetRows: MAX_IMPORT_ROWS + 1, WTF: true })
      if (workbook.SheetNames.length === 0) throw new Error('O arquivo Excel não contém planilhas.')
      const sheets = workbook.SheetNames.map((name) => worksheetToRows(XLSX, workbook.Sheets[name], name))
      return { fileType: 'xlsx', sheets }
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) throw new Error('O conteúdo parece ser um Excel compactado, não um arquivo CSV.')
    if (bytes.includes(0) && bytes[0] !== 0xff && bytes[0] !== 0xfe) throw new Error('O CSV contém caracteres binários ou uma codificação não suportada.')
    const workbook = XLSX.read(decodeCsv(bytes), { type: 'string', cellFormula: true, raw: true })
    if (workbook.SheetNames.length === 0) throw new Error('O CSV não contém dados.')
    return { fileType: 'csv', sheets: [worksheetToRows(XLSX, workbook.Sheets[workbook.SheetNames[0]], 'CSV')] }
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('Invalid')) throw error
    throw new Error('Não foi possível ler o arquivo. Verifique se ele não está corrompido e tente novamente.')
  }
}
