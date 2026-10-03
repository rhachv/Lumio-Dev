import type { LibraryItemType } from '../types/database'

export const MAX_LIBRARY_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_LIBRARY_IMAGE_EDGE = 1600
export const libraryItemTypeLabels: Record<LibraryItemType, string> = {
  site: 'Site', landing_page: 'Landing Page', design: 'Design', copy: 'Copy', offer: 'Oferta',
  idea: 'Ideia', prompt: 'Prompt', sales: 'Vendas', other: 'Outro',
}
export type PreparedScreenshot = { blob: Blob; mimeType: string; extension: 'png' | 'jpg' | 'webp' }

export type LibraryDraft = { title: string; type: LibraryItemType | ''; url: string; description: string; notes: string }

export function normalizeLibraryTagName(value: string): string {
  return value.trim().replace(/^#+/, '').trim()
}

export function libraryTagComparisonKey(value: string): string {
  return normalizeLibraryTagName(value).toLocaleLowerCase('pt-BR')
}

export function normalizeReferenceUrl(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error('Use um endereço HTTP ou HTTPS.')
  let parsed: URL
  try { parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) }
  catch { throw new Error('Informe um endereço válido, como https://exemplo.com.') }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error('Use um endereço HTTP ou HTTPS válido sem credenciais embutidas.')
  if (parsed.href.length > 2048) throw new Error('O endereço pode ter até 2.048 caracteres.')
  return parsed.href
}

export function validateLibraryDraft(draft: LibraryDraft): string | null {
  if (!draft.title.trim()) return 'Informe um título para a referência.'
  if (draft.title.trim().length > 180) return 'O título pode ter até 180 caracteres.'
  if (!draft.type) return 'Escolha o tipo de referência.'
  if (draft.description.length > 1200) return 'A descrição pode ter até 1.200 caracteres.'
  if (draft.notes.length > 10000) return 'As notas podem ter até 10.000 caracteres.'
  try { normalizeReferenceUrl(draft.url) } catch (error) { return error instanceof Error ? error.message : 'Informe um endereço HTTP ou HTTPS válido.' }
  return null
}

export function imageSignatureMatches(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

export async function prepareLibraryScreenshot(file: File): Promise<PreparedScreenshot> {
  if (!file.size || file.size > MAX_LIBRARY_IMAGE_BYTES) throw new Error('A imagem precisa ter até 10 MB.')
  const mimeType = file.type.toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) throw new Error('Envie uma imagem PNG, JPG ou WEBP.')
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!imageSignatureMatches(bytes, mimeType)) throw new Error('O conteúdo do arquivo não corresponde ao tipo de imagem informado.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('Não foi possível abrir esta imagem. Verifique o arquivo.') }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('A imagem não possui dimensões válidas.')
    const scale = Math.min(1, MAX_LIBRARY_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    if (scale === 1) return { blob: file, mimeType, extension: mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp' }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Seu navegador não conseguiu preparar esta imagem.')
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Não foi possível redimensionar esta imagem.')), mimeType, mimeType === 'image/png' ? undefined : 0.9))
    if (blob.type !== mimeType) throw new Error('Seu navegador não consegue salvar este formato de imagem com segurança.')
    if (blob.size > MAX_LIBRARY_IMAGE_BYTES) throw new Error('A imagem redimensionada ainda ultrapassa 10 MB.')
    return { blob, mimeType, extension: mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp' }
  } finally { bitmap.close() }
}
