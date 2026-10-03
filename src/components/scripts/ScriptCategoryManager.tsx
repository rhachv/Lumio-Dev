import { useEffect, useState } from 'react'
import { Button, Input, Textarea } from '../ui/FormControls'
import { Dialog } from '../ui/Overlays'
import { ErrorState, LoadingState } from '../ui/States'
import { createScriptCategory, getScriptCategories, setScriptCategoryActive } from '../../services/scripts'
import type { ScriptCategory } from '../../types/database'

export function ScriptCategoryManager({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [categories, setCategories] = useState<ScriptCategory[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setError('')
    getScriptCategories().then((data) => { if (active) setCategories(data) }).catch(() => { if (active) setError('Não foi possível carregar as categorias.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open])

  async function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusyId('new')
    try {
      const created = await createScriptCategory({ name, description })
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setName(''); setDescription(''); onChanged()
    } catch (reason) {
      setError(typeof reason === 'object' && reason !== null && 'code' in reason && reason.code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível criar a categoria. Tente novamente.')
    } finally { setBusyId(null) }
  }

  async function toggleCategory(category: ScriptCategory) {
    setError(''); setBusyId(category.id)
    try {
      await setScriptCategoryActive(category.id, !category.is_active)
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, is_active: !item.is_active } : item))
      onChanged()
    } catch { setError('Não foi possível atualizar a categoria. Tente novamente.') }
    finally { setBusyId(null) }
  }

  return <Dialog open={open} title="Gerenciar categorias" onOpenChange={onOpenChange} actions={<Button onClick={() => onOpenChange(false)}>Concluir</Button>}>
    <div className="script-category-manager">
      <p>Categorias inativas continuam associadas aos scripts existentes e deixam de aparecer nas novas opções.</p>
      {error && <ErrorState>{error}</ErrorState>}
      {loading ? <LoadingState label="Carregando categorias…" /> : <ul className="script-category-list">{categories.map((category) => <li key={category.id}><div><strong>{category.name}</strong><span>{category.description || 'Sem descrição'}{!category.is_active && ' · Inativa'}</span></div><Button onClick={() => void toggleCategory(category)} disabled={Boolean(busyId)}>{category.is_active ? 'Inativar' : 'Reativar'}</Button></li>)}</ul>}
      <form className="script-category-form" onSubmit={(event) => void addCategory(event)}><h3>Nova categoria</h3><Input id="script-category-name" label="Nome *" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /><Textarea id="script-category-description" label="Descrição" maxLength={240} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /><Button variant="primary" type="submit" disabled={Boolean(busyId) || !name.trim()}>{busyId === 'new' ? 'Salvando…' : 'Criar categoria'}</Button></form>
    </div>
  </Dialog>
}
