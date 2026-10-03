export type ScriptDraft = { title: string; categoryId: string; content: string }

export function validateScriptDraft(draft: ScriptDraft): string | null {
  if (!draft.title.trim()) return 'Informe um título para o script.'
  if (draft.title.trim().length > 160) return 'O título pode ter até 160 caracteres.'
  if (!draft.categoryId) return 'Escolha uma categoria.'
  if (!draft.content.trim()) return 'Informe o conteúdo do script.'
  if (draft.content.trim().length > 12000) return 'O conteúdo pode ter até 12.000 caracteres.'
  return null
}

export function normalizeScriptCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR')
}
