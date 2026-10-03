import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { Search, Button } from '../../components/ui/FormControls'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ScriptCard } from '../../components/scripts/ScriptCard'
import { ScriptCategoryManager } from '../../components/scripts/ScriptCategoryManager'
import { getScriptCategories, getScriptNiches, listScripts, setScriptArchived, setScriptFavorite, type ScriptFilters } from '../../services/scripts'
import type { Niche, ScriptCategory, ScriptListItem } from '../../types/database'

export function ScriptListPage() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ScriptFilters>({ query: '', categoryId: null, nicheId: null, favoritesOnly: false, archived: 'active' })
  const [scripts, setScripts] = useState<ScriptListItem[]>([])
  const [categories, setCategories] = useState<ScriptCategory[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [categoryManager, setCategoryManager] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<ScriptListItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const sortedScripts = useMemo(() => [...scripts].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'pt-BR') : sort === 'oldest' ? Date.parse(a.updated_at) - Date.parse(b.updated_at) : Date.parse(b.updated_at) - Date.parse(a.updated_at)), [scripts, sort])

  useEffect(() => { const state = location.state as { notice?: string } | null; if (state?.notice) setToast(state.notice) }, [location.state])

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, query })), 220)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let active = true
    getScriptCategories().then((data) => { if (active) setCategories(data) }).catch(() => { if (active) setError(true) })
    getScriptNiches(true).then((data) => { if (active) setNiches(data) }).catch(() => { if (active) setNiches([]) })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    listScripts(filters).then((data) => { if (active) setScripts(data) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, reload])

  function change<K extends keyof ScriptFilters>(key: K, value: ScriptFilters[K]) { setFilters((current) => ({ ...current, [key]: value })) }
  async function copy(script: ScriptListItem) {
    try { await navigator.clipboard.writeText(script.content); setToast('Script copiado.') }
    catch { setToast('Não foi possível copiar. Verifique a permissão da área de transferência.') }
  }
  async function favorite(script: ScriptListItem) {
    setBusyId(script.id)
    try { await setScriptFavorite(script.id, !script.is_favorite); setScripts((current) => current.map((item) => item.id === script.id ? { ...item, is_favorite: !item.is_favorite } : item)); setToast(script.is_favorite ? 'Script removido dos favoritos.' : 'Script adicionado aos favoritos.') }
    catch { setToast('Não foi possível atualizar o favorito.') }
    finally { setBusyId(null) }
  }
  async function archive() {
    if (!pendingArchive) return
    const script = pendingArchive
    setBusyId(script.id)
    try { await setScriptArchived(script.id, !script.is_archived); setPendingArchive(null); setToast(script.is_archived ? 'Script restaurado.' : 'Script arquivado.'); setReload((count) => count + 1) }
    catch { setToast('Não foi possível atualizar o arquivamento.') }
    finally { setBusyId(null) }
  }

  const hasFilters = Boolean(query || filters.categoryId || filters.nicheId || filters.favoritesOnly || filters.archived !== 'active')
  return <div className="page-wrap scripts-page">
    <div className="page-header scripts-heading"><div><p className="eyebrow">PROSPECÇÃO / MENSAGENS</p><h1>Scripts</h1><p className="page-subtitle">Roteiros pessoais para consultar, adaptar e copiar durante sua prospecção.</p></div><Link className="button button--primary" to="/scripts/novo"><Icon name="plus" />Novo script</Link></div>
    {toast && <Toast message={toast} tone={toast.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setToast('')} />}
    <section className="scripts-workspace">
      <div className="scripts-toolbar"><Search id="scripts-search" label="Buscar título, objetivo ou conteúdo" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="scripts-result-count">{loading ? 'Carregando…' : `${scripts.length} ${scripts.length === 1 ? 'script' : 'scripts'}`}</span></div>
      <div className="scripts-filters" aria-label="Filtros de scripts">
        <label><span>Categoria</span><select value={filters.categoryId ?? ''} onChange={(event) => change('categoryId', event.target.value || null)}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{!category.is_active ? ' (inativa)' : ''}</option>)}</select></label>
        <label><span>Nicho</span><select value={filters.nicheId ?? ''} onChange={(event) => change('nicheId', event.target.value || null)}><option value="">Todos</option>{niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label>
        <label><span>Visualização</span><select value={filters.archived} onChange={(event) => change('archived', event.target.value as ScriptFilters['archived'])}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label>
        <label><span>Ordenar</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option><option value="title">Título</option></select></label>
        <label className="scripts-favorite-filter"><input type="checkbox" checked={filters.favoritesOnly} onChange={(event) => change('favoritesOnly', event.target.checked)} /><span><Icon name="star" />Favoritos</span></label>
        <Button onClick={() => setCategoryManager(true)}><Icon name="settings" />Categorias</Button>
        {hasFilters && <button className="text-button" onClick={() => { setQuery(''); setFilters({ query: '', categoryId: null, nicheId: null, favoritesOnly: false, archived: 'active' }) }}>Limpar filtros</button>}
      </div>
      {error ? <ErrorState onRetry={() => setReload((count) => count + 1)}>Não foi possível carregar os scripts. Confira a conexão com o Supabase e tente novamente.</ErrorState> : loading && scripts.length === 0 ? <div className="scripts-loading"><LoadingState label="Carregando scripts…" /></div> : scripts.length === 0 ? <EmptyState title={hasFilters ? 'Nenhum script encontrado' : 'Você ainda não possui scripts.'} description={hasFilters ? 'Ajuste os filtros ou crie um novo roteiro para esta categoria.' : 'Guarde aqui mensagens que você consulta e adapta na prospecção.'} action={!hasFilters && <Link className="button button--primary" to="/scripts/novo"><Icon name="plus" />Criar primeiro script</Link>} /> : <div className="script-grid" aria-busy={loading}>{sortedScripts.map((script) => <ScriptCard key={script.id} script={script} busy={busyId === script.id} onCopy={(item) => void copy(item)} onFavorite={(item) => void favorite(item)} onArchive={setPendingArchive} />)}</div>}
    </section>
    <ScriptCategoryManager open={categoryManager} onOpenChange={setCategoryManager} onChanged={() => setReload((count) => count + 1)} />
    <ConfirmDialog open={Boolean(pendingArchive)} title={pendingArchive?.is_archived ? 'Restaurar script' : 'Arquivar script'} confirmLabel={busyId ? 'Salvando…' : pendingArchive?.is_archived ? 'Restaurar' : 'Arquivar'} onOpenChange={(open) => { if (!open) setPendingArchive(null) }} onConfirm={() => void archive()}>
      {pendingArchive?.is_archived ? `“${pendingArchive.title}” voltará a aparecer na visualização de scripts ativos.` : `“${pendingArchive?.title}” sairá da visualização ativa, mas continuará salvo e poderá ser restaurado.`}
    </ConfirmDialog>
  </div>
}
