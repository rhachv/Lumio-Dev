import { describe, expect, it } from 'vitest'
import { extractScriptVariables } from '../src/components/scripts/ScriptText'
import { normalizeScriptCategoryName, validateScriptDraft } from '../src/services/scriptValidation'

describe('scripts', () => {
  it('validates required fields and database limits', () => {
    expect(validateScriptDraft({ title: ' ', categoryId: 'c1', content: 'Texto' })).toBe('Informe um título para o script.')
    expect(validateScriptDraft({ title: 'Roteiro', categoryId: '', content: 'Texto' })).toBe('Escolha uma categoria.')
    expect(validateScriptDraft({ title: 'Roteiro', categoryId: 'c1', content: ' ' })).toBe('Informe o conteúdo do script.')
    expect(validateScriptDraft({ title: 'Roteiro', categoryId: 'c1', content: 'Olá, [NOME]!' })).toBeNull()
    expect(validateScriptDraft({ title: 'x'.repeat(161), categoryId: 'c1', content: 'Texto' })).toContain('160')
    expect(validateScriptDraft({ title: 'Roteiro', categoryId: 'c1', content: 'x'.repeat(12001) })).toContain('12.000')
  })

  it('recognizes reusable variables once and preserves their spelling', () => {
    expect(extractScriptVariables('Oi [NOME], vi a [EMPRESA] em [CIDADE]. [NOME]')).toEqual(['[NOME]', '[EMPRESA]', '[CIDADE]'])
    expect(extractScriptVariables('Use [nome] ou [EMPRESA_SITE]')).toEqual(['[EMPRESA_SITE]'])
  })

  it('blocks exact case-insensitive duplicate category names without merging similar names', () => {
    expect(normalizeScriptCategoryName(' Oferta ')).toBe(normalizeScriptCategoryName('oferta'))
    expect(normalizeScriptCategoryName('landingpage')).not.toBe(normalizeScriptCategoryName('landing-page'))
  })
})
