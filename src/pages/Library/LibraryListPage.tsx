import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, Search } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { LibraryCard } from '../../components/library/LibraryCard'
import { TagManager } from '../../components/library/TagManager'
import { listLibraryItems, listLibraryTags, setLibraryArchived, setLibraryFavorite, type LibraryFilters, type LibraryItemView } from '../../services/library'
import { libraryItemTypeLabels } from '../../services/libraryValidation'
import { libraryItemTypes, type Tag } from '../../types/database'

const PAGE_SIZE = 24
export function LibraryListPage() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<LibraryFilters>({ query: '', type: null, tagIds: [], favoritesOnly: false, archived: 'active', sort: 'recent', page: 1 })
  const [items, setItems] = useState<LibraryItemView[]>([])
  const [total, setTotal] = useState(0)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [tagManager, setTagManager] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<LibraryItemView | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const activeTags = tags.filter((tag) => tag.is_active)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(query || filters.type || filters.tagIds.length || filters.favoritesOnly || filters.archived !== 'active')

  useEffect(() => { const state = location.state as { notice?: string } | null; if (state?.notice) setToast(state.notice) }, [location.state])
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, query, page: 1 })), 220)
    return () => window.clearTimeout(timer)
  }, [query])
  useEffect(() => {
    let active = true
    listLibraryTags().then((data) => { if (active) setTags(data) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [reload])
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    listLibraryItems(filters).then((result) => { if (active) { setItems(result.items); setTotal(result.total) } }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, reload])

  function change<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) { setFilters((current) => ({ ...current, [key]: value, ...(key === 'page' ? {} : { page: 1 }) })) }
  function toggleTag(tagId: string) { change('tagIds', filters.tagIds.includes(tagId) ? filters.tagIds.filter((id) => id !== tagId) : [...filters.tagIds, tagId]) }
  async function favorite(item: LibraryItemView) {
    setBusyId(item.id)
    try { const next = !item.is_favorite; await setLibraryFavorite(item.id, next); if (filters.favoritesOnly && !next) setReload((count) => count + 1); else setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_favorite: next } : entry)); setToast(item.is_favorite ? 'Referência removida dos favoritos.' : 'Referência adicionada aos favoritos.') }
    catch { setToast('Não foi possível atualizar o favorito.') } finally { setBusyId(null) }
  }
  async function archive() {
    if (!pendingArchive) return
    const item = pendingArchive
    setBusyId(item.id)
    try { await setLibraryArchived(item.id, !item.is_archived); setPendingArchive(null); setToast(item.is_archived ? 'Referência restaurada.' : 'Referência arquivada.'); setReload((count) => count + 1) }
    catch { setToast('Não foi possível atualizar o arquivamento.') } finally { setBusyId(null) }
  }

  return <div className="page-wrap library-page">
    <div className="page-header library-heading"><div><p className="eyebrow">REFERÊNCIAS / ACERVO</p><h1>Biblioteca</h1><p className="page-subtitle">Guarde referências de sites, design, copy e vendas num acervo pesquisável.</p></div><div className="library-header-actions"><Button onClick={() => setTagManager(true)}><Icon name="settings" />Gerenciar tags</Button><Link className="button button--primary" to="/biblioteca/novo"><Icon name="plus" />Adicionar referência</Link></div></div>
    {toast && <Toast message={toast} tone={toast.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setToast('')} />}
    <section className="library-workspace">
      <div className="library-toolbar"><Search id="library-search" label="Buscar título, descrição, notas ou tags" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="library-result-count">{loading ? 'Carregando…' : `${total} ${total === 1 ? 'referência' : 'referências'}`}</span></div>
      <div className="library-filters" aria-label="Filtros da biblioteca">
        <label><span>Tipo</span><select value={filters.type ?? ''} onChange={(event) => change('type', (event.target.value || null) as LibraryFilters['type'])}><option value="">Todos</option>{libraryItemTypes.map((type) => <option key={type} value={type}>{libraryItemTypeLabels[type]}</option>)}</select></label>
        <label><span>Arquivamento</span><select value={filters.archived} onChange={(event) => change('archived', event.target.value as LibraryFilters['archived'])}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label>
        <label><span>Ordenar</span><select value={filters.sort} onChange={(event) => change('sort', event.target.value as LibraryFilters['sort'])}><option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option><option value="title">Título</option></select></label>
        <label className="library-favorite-filter"><input type="checkbox" checked={filters.favoritesOnly} onChange={(event) => change('favoritesOnly', event.target.checked)} /><span><Icon name="star" />Favoritos</span></label>
        <details className="library-tag-filter"><summary>Tags{filters.tagIds.length ? ` · ${filters.tagIds.length}` : ''}</summary><div className="library-tag-options"><p>Exibir referências com todas as tags selecionadas.</p>{activeTags.length ? activeTags.map((tag) => <label key={tag.id}><input type="checkbox" checked={filters.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} /><span>#{tag.name}</span></label>) : <span>As tags adicionadas às referências aparecerão aqui.</span>}</div></details>
        {hasFilters && <button type="button" className="text-button" onClick={() => { setQuery(''); setFilters({ query: '', type: null, tagIds: [], favoritesOnly: false, archived: 'active', sort: 'recent', page: 1 }) }}>Limpar filtros</button>}
      </div>
      {error ? <ErrorState onRetry={() => setReload((count) => count + 1)}>Não foi possível carregar a biblioteca. Confira a conexão com o Supabase e tente novamente.</ErrorState> : loading && items.length === 0 ? <div className="library-loading"><LoadingState label="Carregando referências…" /></div> : items.length === 0 ? <EmptyState title={hasFilters ? 'Nenhuma referência encontrada' : 'Sua biblioteca ainda está vazia.'} description={hasFilters ? 'Ajuste os filtros ou adicione uma referência para este assunto.' : 'Salve um bom exemplo de site, texto ou oferta para consultar depois.'} action={!hasFilters && <Link className="button button--primary" to="/biblioteca/novo"><Icon name="plus" />Adicionar primeira referência</Link>} /> : <>
        <div className="library-grid" aria-busy={loading}>{items.map((item) => <LibraryCard key={item.id} item={item} busy={busyId === item.id} onFavorite={(entry) => void favorite(entry)} onArchive={setPendingArchive} onTag={toggleTag} />)}</div>
        {pageCount > 1 && <div className="library-pagination"><span>Mostrando {Math.min((filters.page - 1) * PAGE_SIZE + 1, total)}–{Math.min(filters.page * PAGE_SIZE, total)} de {total}</span><div><Button onClick={() => change('page', Math.max(1, filters.page - 1))} disabled={filters.page <= 1}>Anterior</Button><span>Página {filters.page} de {pageCount}</span><Button onClick={() => change('page', Math.min(pageCount, filters.page + 1))} disabled={filters.page >= pageCount}>Próxima</Button></div></div>}
      </>}
    </section>
    <TagManager open={tagManager} onOpenChange={setTagManager} onChanged={() => setReload((count) => count + 1)} />
    <ConfirmDialog open={Boolean(pendingArchive)} title={pendingArchive?.is_archived ? 'Restaurar referência' : 'Arquivar referência'} confirmLabel={pendingArchive?.is_archived ? 'Restaurar' : 'Arquivar'} onOpenChange={(open) => { if (!open) setPendingArchive(null) }} onConfirm={() => void archive()}>{pendingArchive?.is_archived ? `“${pendingArchive.title}” voltará para a visualização ativa.` : `“${pendingArchive?.title}” sairá da visualização ativa e poderá ser restaurada depois.`}</ConfirmDialog>
  </div>
}
