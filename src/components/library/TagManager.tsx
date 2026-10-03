import { useEffect, useState } from 'react'
import { Button } from '../ui/FormControls'
import { Dialog } from '../ui/Overlays'
import { ErrorState, LoadingState } from '../ui/States'
import { listLibraryTags, setLibraryTagActive } from '../../services/library'
import type { Tag } from '../../types/database'

export function TagManager({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setError('')
    listLibraryTags().then((data) => { if (active) setTags(data) }).catch(() => { if (active) setError('Não foi possível carregar as tags.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open])
  async function toggle(tag: Tag) {
    setBusy(tag.id); setError('')
    try { await setLibraryTagActive(tag.id, !tag.is_active); setTags((items) => items.map((item) => item.id === tag.id ? { ...item, is_active: !item.is_active } : item)); onChanged() }
    catch { setError('Não foi possível atualizar esta tag.') } finally { setBusy(null) }
  }
  return <Dialog open={open} title="Gerenciar tags" onOpenChange={onOpenChange} actions={<Button onClick={() => onOpenChange(false)}>Concluir</Button>}>
    <div className="tag-manager"><p>Inativar uma tag mantém as referências vinculadas e não apaga seus dados.</p>{error && <ErrorState>{error}</ErrorState>}{loading ? <LoadingState label="Carregando tags…" /> : tags.length === 0 ? <p>As tags são criadas ao adicionar uma referência.</p> : <ul>{tags.map((tag) => <li key={tag.id}><span>#{tag.name}{!tag.is_active && ' · inativa'}</span><Button onClick={() => void toggle(tag)} disabled={Boolean(busy)}>{tag.is_active ? 'Inativar' : 'Reativar'}</Button></li>)}</ul>}</div>
  </Dialog>
}
