import { useMemo, useState, type KeyboardEvent } from 'react'
import { Button } from '../ui/FormControls'
import { Icon } from '../ui/Icon'
import { createLibraryTagSafely } from '../../services/library'
import { libraryTagComparisonKey } from '../../services/libraryValidation'
import type { Tag } from '../../types/database'

export function TagSelector({ tags, selectedIds, onChange, onTagsChange, disabled = false }: {
  tags: Tag[]; selectedIds: string[]; onChange: (ids: string[]) => void; onTagsChange: (tags: Tag[]) => void; disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = tags.filter((tag) => selectedIds.includes(tag.id))
  const suggestions = useMemo(() => tags.filter((tag) => tag.is_active && !selectedIds.includes(tag.id) && (!query.trim() || libraryTagComparisonKey(tag.name).includes(libraryTagComparisonKey(query)))).slice(0, 8), [tags, selectedIds, query])

  function add(tag: Tag) {
    if (!selectedIds.includes(tag.id)) onChange([...selectedIds, tag.id])
    setQuery(''); setError('')
  }
  async function addOrCreate() {
    if (!query.trim()) return
    setBusy(true); setError('')
    try {
      const tag = await createLibraryTagSafely(query, tags)
      if (!tag.is_active) { setError('Esta tag está inativa. Reative-a em Gerenciar tags para usá-la.'); return }
      onTagsChange([...tags.filter((item) => item.id !== tag.id), tag].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      add(tag)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar a tag.') }
    finally { setBusy(false) }
  }
  function submitTag(event: KeyboardEvent<HTMLInputElement>) { if (event.key === 'Enter' && query.trim()) { event.preventDefault(); void addOrCreate() } }

  return <div className="tag-selector">
    <label htmlFor="library-tags">Tags</label>
    <div className="tag-selector-input"><input id="library-tags" type="text" value={query} maxLength={49} disabled={disabled || busy} onChange={(event) => { setQuery(event.target.value); setError('') }} onKeyDown={submitTag} placeholder="Digite uma tag e pressione Enter" /><Button onClick={() => void addOrCreate()} disabled={disabled || busy || !query.trim()}>{busy ? 'Adicionando…' : 'Adicionar'}</Button></div>
    {error && <span className="field-error" role="alert">{error}</span>}
    {query.trim() && suggestions.length > 0 && <div className="tag-suggestions" aria-label="Tags existentes">{suggestions.map((tag) => <button key={tag.id} type="button" onClick={() => add(tag)}>#{tag.name}</button>)}</div>}
    <div className="tag-chip-list" aria-label="Tags selecionadas">{selected.map((tag) => <span className="tag-chip" key={tag.id}>#{tag.name}<button type="button" aria-label={`Remover tag ${tag.name}`} disabled={disabled} onClick={() => onChange(selectedIds.filter((id) => id !== tag.id))}><Icon name="close" /></button></span>)}{selected.length === 0 && <span className="tag-empty-hint">Nenhuma tag selecionada</span>}</div>
    <p className="field-hint">Tags com nomes parecidos continuam separadas. Digite o nome exato para reutilizar uma existente.</p>
  </div>
}
