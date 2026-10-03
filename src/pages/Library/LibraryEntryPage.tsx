import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, Input, Select, Textarea } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Dialog, Toast } from '../../components/ui/Overlays'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ImageUploader } from '../../components/library/ImageUploader'
import { TagSelector } from '../../components/library/TagSelector'
import { formatDate } from '../../components/leads/leadMeta'
import { getLibraryItem, listLibraryTags, saveLibraryItem, setLibraryArchived, setLibraryFavorite, type LibraryItemView } from '../../services/library'
import { libraryItemTypeLabels, normalizeReferenceUrl, validateLibraryDraft, type PreparedScreenshot } from '../../services/libraryValidation'
import { libraryItemTypes, type LibraryItemType, type Tag } from '../../types/database'

export function LibraryEntryPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  return id && params.get('editar') !== '1' ? <LibraryDetail id={id} onEdit={() => setParams({ editar: '1' })} /> : <LibraryForm id={id} />
}

function LibraryForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<LibraryItemType | ''>('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null)
  const [previousScreenshotPath, setPreviousScreenshotPath] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<PreparedScreenshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const load = async () => {
      const [allTags, item] = await Promise.all([listLibraryTags(), id ? getLibraryItem(id) : Promise.resolve(null)])
      if (!active) return
      setTags(allTags); setLoading(false)
      if (item) {
        setTitle(item.title); setDescription(item.description ?? ''); setType(item.type); setUrl(item.url ?? '')
        setNotes(item.notes ?? ''); setFavorite(item.is_favorite); setSelectedTagIds(item.tags.map((tag) => tag.id))
        setScreenshotPath(item.screenshot_path); setPreviousScreenshotPath(item.screenshot_path); setExistingImageUrl(item.screenshotUrl)
      }
    }
    load().catch(() => { if (active) { setError('Não foi possível carregar os dados da referência.'); setLoading(false) } })
    return () => { active = false }
  }, [id])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const validationError = validateLibraryDraft({ title, description, type, url, notes })
    if (validationError) { setSaving(false); setError(validationError); return }
    let normalizedUrl: string | null
    try { normalizedUrl = normalizeReferenceUrl(url) } catch (reason) { setSaving(false); setError(reason instanceof Error ? reason.message : 'Informe uma URL válida.'); return }
    try {
      const result = await saveLibraryItem({ id, title, description, type: type as LibraryItemType, url: normalizedUrl, notes, favorite, tagIds: selectedTagIds, screenshotPath }, selectedImage, previousScreenshotPath)
      navigate(`/biblioteca/${result.id}`, { replace: true, state: { notice: result.imageWarning ? 'Referência salva. O screenshot anterior ainda pode ser removido do armazenamento.' : editing ? 'Referência atualizada.' : 'Referência adicionada.' } })
    } catch (reason) {
      setError(typeof reason === 'object' && reason !== null && 'code' in reason && reason.code === '23503' ? 'Uma tag deixou de estar disponível. Atualize a página e tente novamente.' : reason instanceof Error ? reason.message : 'Não foi possível salvar a referência. Tente novamente.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="page-wrap library-page"><LoadingState label="Carregando referência…" /></div>
  if (error && editing && !type) return <div className="page-wrap library-page"><ErrorState>{error}</ErrorState><Link className="text-link" to="/biblioteca">Voltar para Biblioteca</Link></div>
  return <div className="page-wrap library-form-page">
    <div className="page-header library-form-heading"><div><Link className="back-link" to={editing && id ? `/biblioteca/${id}` : '/biblioteca'}><Icon name="chevron" />{editing ? 'Voltar à referência' : 'Voltar para Biblioteca'}</Link><p className="eyebrow">REFERÊNCIAS / ACERVO</p><h1>{editing ? 'Editar referência' : 'Adicionar referência'}</h1><p className="page-subtitle">Registre o que chamou sua atenção para encontrar depois.</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    <form className="library-form" onSubmit={(event) => void submit(event)}>
      <section className="form-section"><div className="form-section-heading"><h2>Referência</h2><p>Organize o conteúdo com um título, tipo e endereço seguro.</p></div>
        <div className="form-grid form-grid--two"><Input id="library-title" label="Título *" required autoFocus maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Landing page de imobiliária com CTA forte" /><Select id="library-type" label="Tipo *" required value={type} onChange={(event) => setType(event.target.value as LibraryItemType | '')}><option value="">Selecione um tipo</option>{libraryItemTypes.map((value) => <option key={value} value={value}>{libraryItemTypeLabels[value]}</option>)}</Select><Input id="library-url" label="URL (opcional)" type="url" maxLength={2048} hint="Aceita links HTTP ou HTTPS. Se omitir o protocolo, https:// será adicionado." value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://exemplo.com" /><Checkbox id="library-favorite" label="Adicionar aos favoritos" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /></div>
      </section>
      <section className="form-section"><div className="form-section-heading"><h2>Contexto</h2><p>Salve os detalhes úteis para lembrar por que guardou esta referência.</p></div><div className="form-grid"><Textarea id="library-description" label="Descrição" maxLength={1200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Um resumo curto da referência" /><Textarea id="library-notes" label="Notas pessoais" maxLength={10000} rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="O que vale estudar, adaptar ou testar?" /></div><TagSelector tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} onTagsChange={setTags} /></section>
      <section className="form-section"><div className="form-section-heading"><h2>Screenshot</h2><p>Adicione uma imagem de referência opcional.</p></div><ImageUploader existingUrl={existingImageUrl} onSelect={(image) => { setSelectedImage(image); setExistingImageUrl(null) }} onRemove={() => { setSelectedImage(null); setScreenshotPath(null); setExistingImageUrl(null) }} disabled={saving} /></section>
      <div className="form-actions"><Link className="button button--secondary" to={editing && id ? `/biblioteca/${id}` : '/biblioteca'}>Cancelar</Link><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar referência'}</Button></div>
    </form>
  </div>
}

function LibraryDetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [item, setItem] = useState<LibraryItemView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState(false)

  useEffect(() => { const state = location.state as { notice?: string } | null; if (state?.notice) setNotice(state.notice) }, [location.state])
  useEffect(() => {
    let active = true
    getLibraryItem(id).then((data) => { if (active) setItem(data) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  async function favorite() {
    if (!item) return
    setBusy(true)
    try { const next = !item.is_favorite; await setLibraryFavorite(id, next); setItem({ ...item, is_favorite: next }); setNotice(next ? 'Adicionada aos favoritos.' : 'Removida dos favoritos.') }
    catch { setNotice('Não foi possível atualizar o favorito.') } finally { setBusy(false) }
  }
  async function archive() {
    if (!item) return
    setBusy(true)
    try { await setLibraryArchived(id, !item.is_archived); if (!item.is_archived) navigate('/biblioteca', { replace: true, state: { notice: 'Referência arquivada.' } }); else { setItem({ ...item, is_archived: false }); setNotice('Referência restaurada.') } }
    catch { setNotice('Não foi possível atualizar o arquivamento.') } finally { setBusy(false); setArchiveDialog(false) }
  }
  if (loading) return <div className="page-wrap library-page"><LoadingState label="Carregando referência…" /></div>
  if (error || !item) return <div className="page-wrap library-page"><ErrorState onRetry={() => window.location.reload()}>Não foi possível carregar esta referência. Confira a conexão e tente novamente.</ErrorState><Link className="text-link" to="/biblioteca">Voltar à Biblioteca</Link></div>

  return <div className="page-wrap library-detail-page">
    <div className="library-detail-back"><Link className="back-link" to="/biblioteca"><Icon name="chevron" />Voltar para Biblioteca</Link></div>
    {notice && <Toast message={notice} tone={notice.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setNotice('')} />}
    <article className="library-detail panel"><div className="library-detail-heading"><div><span className="library-type-label">{libraryItemTypeLabels[item.type]}</span>{item.is_archived && <span className="library-archived-label">Arquivada</span>}<h1>{item.title}</h1></div><button type="button" className={`library-favorite library-favorite--large${item.is_favorite ? ' is-active' : ''}`} aria-label={item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={item.is_favorite} onClick={() => void favorite()} disabled={busy}><Icon name="star" /></button></div>
      <p className="library-detail-dates">Adicionada {formatDate(item.created_at, true)} · Atualizada {formatDate(item.updated_at, true)}</p>
      {item.screenshotUrl && <button type="button" className="library-detail-image" onClick={() => setImagePreview(true)} aria-label="Ampliar screenshot"><img src={item.screenshotUrl} alt={`Screenshot de referência: ${item.title}`} /><span>Ampliar imagem</span></button>}
      {item.url && <a className="library-open-reference" href={item.url} target="_blank" rel="noopener noreferrer"><Icon name="arrow" />Abrir referência<span>Abre em uma nova aba</span></a>}
      {item.description && <section className="library-detail-section"><h2>Descrição</h2><p>{item.description}</p></section>}
      {item.notes && <section className="library-detail-section"><h2>Notas pessoais</h2><p className="library-notes-content">{item.notes}</p></section>}
      <section className="library-detail-section"><h2>Tags</h2><div className="library-detail-tags">{item.tags.length ? item.tags.map((tag) => <span className="tag-chip" key={tag.id}>#{tag.name}{!tag.is_active && ' · inativa'}</span>) : <span className="tag-empty-hint">Nenhuma tag associada</span>}</div></section>
      <div className="library-detail-actions"><Button variant="primary" onClick={onEdit}>Editar referência</Button><Button onClick={() => setArchiveDialog(true)}><Icon name={item.is_archived ? 'restore' : 'archive'} />{item.is_archived ? 'Restaurar' : 'Arquivar'}</Button></div>
    </article>
    <Dialog open={imagePreview} title={`Screenshot: ${item.title}`} onOpenChange={setImagePreview} actions={<Button onClick={() => setImagePreview(false)}>Fechar</Button>}><img className="library-image-modal" src={item.screenshotUrl ?? ''} alt={`Screenshot ampliado: ${item.title}`} /></Dialog>
    <ConfirmDialog open={archiveDialog} title={item.is_archived ? 'Restaurar referência' : 'Arquivar referência'} confirmLabel={item.is_archived ? 'Restaurar' : 'Arquivar'} onOpenChange={setArchiveDialog} onConfirm={() => void archive()}>{item.is_archived ? 'Esta referência voltará para a visualização ativa.' : 'Esta referência sairá da visualização ativa e poderá ser restaurada depois.'}</ConfirmDialog>
  </div>
}
