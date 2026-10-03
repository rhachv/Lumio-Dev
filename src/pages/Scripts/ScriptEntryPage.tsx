import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, Input, Select, Textarea } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog, Toast } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ScriptCategoryManager } from '../../components/scripts/ScriptCategoryManager'
import { highlightVariables } from '../../components/scripts/ScriptText'
import { formatDate } from '../../components/leads/leadMeta'
import { createScript, getScript, getScriptCategories, getScriptNiches, setScriptArchived, setScriptFavorite, updateScript } from '../../services/scripts'
import { validateScriptDraft } from '../../services/scriptValidation'
import type { Niche, Script, ScriptCategory } from '../../types/database'

export function ScriptEntryPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const editing = params.get('editar') === '1'
  return id && !editing ? <ScriptDetail id={id} onEdit={() => setParams({ editar: '1' })} /> : <ScriptForm id={id} />
}

function ScriptForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [script, setScript] = useState<Script | null>(null)
  const [categories, setCategories] = useState<ScriptCategory[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [title, setTitle] = useState('')
  const [objective, setObjective] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [nicheId, setNicheId] = useState('')
  const [content, setContent] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categoryManager, setCategoryManager] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    Promise.all([getScriptCategories(), getScriptNiches(true), id ? getScript(id) : Promise.resolve(null)])
      .then(([nextCategories, nextNiches, nextScript]) => {
        if (!active) return
        setCategories(nextCategories); setNiches(nextNiches); setScript(nextScript)
        if (nextScript) {
          setTitle(nextScript.title); setObjective(nextScript.objective ?? ''); setCategoryId(nextScript.category_id)
          setNicheId(nextScript.niche_id ?? ''); setContent(nextScript.content); setFavorite(nextScript.is_favorite)
        } else if (nextCategories[0]) setCategoryId(nextCategories.find((category) => category.is_active)?.id ?? '')
      }).catch(() => { if (active) setError('Não foi possível carregar os dados do formulário. Confira a conexão e tente novamente.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const validationError = validateScriptDraft({ title, categoryId, content })
    if (validationError) { setSaving(false); setError(validationError); return }
    try {
      const payload = { title: title.trim(), objective: objective.trim() || null, category_id: categoryId, niche_id: nicheId || null, content: content.trim(), is_favorite: favorite }
      if (id) { const updated = await updateScript(id, payload); navigate(`/scripts/${updated.id}`, { replace: true, state: { notice: 'Script atualizado.' } }) }
      else { const created = await createScript(payload); navigate(`/scripts/${created.id}`, { replace: true, state: { notice: 'Script salvo.' } }) }
    } catch (reason) {
      setError(typeof reason === 'object' && reason !== null && 'code' in reason && reason.code === '23503' ? 'A categoria ou o nicho selecionado deixou de estar disponível. Atualize a página.' : 'Não foi possível salvar o script. Confira os campos e tente novamente.')
    } finally { setSaving(false) }
  }

  const usableCategories = categories.filter((category) => category.is_active || category.id === script?.category_id)
  if (loading) return <div className="page-wrap scripts-page"><LoadingState label="Carregando formulário…" /></div>
  if (error && !categories.length && !niches.length && editing && !script) return <div className="page-wrap scripts-page"><ErrorState>{error}</ErrorState></div>

  return <div className="page-wrap script-form-page">
    <div className="page-header script-form-heading"><div><Link className="back-link" to={editing && id ? `/scripts/${id}` : '/scripts'}><Icon name="chevron" />{editing ? 'Voltar ao script' : 'Voltar para scripts'}</Link><p className="eyebrow">PROSPECÇÃO / MENSAGENS</p><h1>{editing ? 'Editar script' : 'Novo script'}</h1><p className="page-subtitle">Organize um roteiro para consultar e adaptar durante sua prospecção.</p></div></div>
    {error && <ErrorState>{error}</ErrorState>}
    {!usableCategories.length ? <EmptyState title="Nenhuma categoria disponível" description="Crie ou reative uma categoria para salvar seu script." action={<Button variant="primary" onClick={() => setCategoryManager(true)}><Icon name="settings" />Gerenciar categorias</Button>} /> : <form className="script-form" onSubmit={(event) => void submit(event)}>
      <section className="form-section"><div className="form-section-heading"><h2>Organização</h2><p>Escolha onde este roteiro fica e em qual contexto usá-lo.</p></div>
        <div className="form-grid form-grid--two"><Input id="script-title" label="Título *" required autoFocus maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Primeiro contato com imobiliárias" /><Input id="script-objective" label="Objetivo" maxLength={240} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="O que este roteiro pretende alcançar?" />
          <div className="script-category-field"><Select id="script-category" label="Categoria *" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Selecione uma categoria</option>{usableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{!category.is_active ? ' (inativa)' : ''}</option>)}</Select><button type="button" className="text-button" onClick={() => setCategoryManager(true)}>Gerenciar categorias</button></div>
          <Select id="script-niche" label="Nicho (opcional)" value={nicheId} onChange={(event) => setNicheId(event.target.value)}><option value="">Geral</option>{niches.filter((niche) => niche.is_active || niche.id === nicheId).map((niche) => <option key={niche.id} value={niche.id}>{niche.name}{!niche.is_active ? ' (inativo)' : ''}</option>)}</Select>
        </div>
      </section>
      <section className="form-section"><div className="form-section-heading"><h2>Conteúdo do roteiro</h2><p>Variáveis entre colchetes ficam destacadas na visualização.</p></div><Textarea id="script-content" label="Conteúdo *" required minLength={1} maxLength={12000} rows={14} value={content} onChange={(event) => setContent(event.target.value)} placeholder={'Olá, [NOME]! Vi a [EMPRESA] e percebi que vocês trabalham com [NICHO] em [CIDADE].'} /><div className="script-variable-guide"><span>Variáveis sugeridas</span><code>[NOME]</code><code>[EMPRESA]</code><code>[NICHO]</code><code>[CIDADE]</code></div><Checkbox id="script-favorite" label="Adicionar aos favoritos" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /></section>
      <div className="form-actions"><Link className="button button--secondary" to={editing && id ? `/scripts/${id}` : '/scripts'}>Cancelar</Link><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar script'}</Button></div>
    </form>}
    <ScriptCategoryManager open={categoryManager} onOpenChange={setCategoryManager} onChanged={() => { void getScriptCategories().then(setCategories).catch(() => setError('Não foi possível atualizar as categorias.')) }} />
  </div>
}

function ScriptDetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [script, setScript] = useState<Script | null>(null)
  const [categories, setCategories] = useState<ScriptCategory[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { const state = location.state as { notice?: string } | null; if (state?.notice) setNotice(state.notice) }, [location.state])
  useEffect(() => {
    let active = true
    Promise.all([getScript(id), getScriptCategories(), getScriptNiches(true)]).then(([item, categoryRows, nicheRows]) => {
      if (active) { setScript(item); setCategories(categoryRows); setNiches(nicheRows) }
    }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function copy() { if (!script) return; try { await navigator.clipboard.writeText(script.content); setToast('Script copiado.') } catch { setToast('Não foi possível copiar o script.') } }
  async function toggleFavorite() {
    if (!script) return
    setBusy(true)
    try { const next = !script.is_favorite; await setScriptFavorite(script.id, next); setScript({ ...script, is_favorite: next }); setToast(next ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.') }
    catch { setToast('Não foi possível atualizar o favorito.') } finally { setBusy(false) }
  }
  async function toggleArchive() {
    if (!script) return
    setBusy(true)
    try { await setScriptArchived(script.id, !script.is_archived); if (!script.is_archived) navigate('/scripts', { replace: true, state: { notice: 'Script arquivado.' } }); else { setScript({ ...script, is_archived: false }); setToast('Script restaurado.') } }
    catch { setToast('Não foi possível atualizar o arquivamento.') } finally { setBusy(false); setConfirmArchive(false) }
  }

  if (loading) return <div className="page-wrap scripts-page"><LoadingState label="Carregando script…" /></div>
  if (error || !script) return <div className="page-wrap scripts-page"><ErrorState onRetry={() => window.location.reload()}>Não foi possível carregar este script. Confira a conexão e tente novamente.</ErrorState><Link className="text-link" to="/scripts">Voltar para scripts</Link></div>
  const category = categories.find((item) => item.id === script.category_id)
  const niche = niches.find((item) => item.id === script.niche_id)
  return <div className="page-wrap script-detail-page">
    <div className="script-detail-back"><Link className="back-link" to="/scripts"><Icon name="chevron" />Voltar para scripts</Link></div>
    {notice && <Toast message={notice} tone="success" onDismiss={() => setNotice('')} />}{toast && <Toast message={toast} tone={toast.startsWith('Não') ? 'error' : 'success'} onDismiss={() => setToast('')} />}
    <article className="script-detail panel"><div className="script-detail-top"><div><span className="script-category-badge">{category?.name ?? 'Categoria inativa'}</span>{script.is_archived && <span className="script-archived-label">Arquivado</span>}</div><button type="button" className={`script-favorite script-favorite--large${script.is_favorite ? ' is-active' : ''}`} aria-label={script.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={script.is_favorite} disabled={busy} onClick={() => void toggleFavorite()}><Icon name="star" /></button></div>
      <p className="eyebrow">SCRIPT DE PROSPECÇÃO</p><h1>{script.title}</h1>{script.objective && <p className="script-detail-objective">{script.objective}</p>}
      <div className="script-detail-meta"><span>{niche?.name || 'Geral'}</span><span>Criado {formatDate(script.created_at, true)}</span><span>Atualizado {formatDate(script.updated_at, true)}</span></div>
      <div className="script-detail-content" aria-label="Conteúdo do script">{highlightVariables(script.content)}</div>
      <div className="script-detail-vars"><strong>Variáveis reconhecidas</strong><span>[NOME]</span><span>[EMPRESA]</span><span>[NICHO]</span><span>[CIDADE]</span><p>Adapte esses marcadores antes de usar o roteiro. O Lumio não envia mensagens.</p></div>
      <div className="script-detail-actions"><Button variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar conteúdo</Button><Button onClick={onEdit}>Editar script</Button><Button onClick={() => setConfirmArchive(true)} disabled={busy}><Icon name={script.is_archived ? 'restore' : 'archive'} />{script.is_archived ? 'Restaurar' : 'Arquivar'}</Button></div>
    </article>
    <ConfirmDialog open={confirmArchive} title={script.is_archived ? 'Restaurar script' : 'Arquivar script'} confirmLabel={script.is_archived ? 'Restaurar' : 'Arquivar'} onOpenChange={setConfirmArchive} onConfirm={() => void toggleArchive()}>{script.is_archived ? 'Este script voltará para a visualização ativa.' : 'Este script sairá da visualização ativa, mas continuará salvo e poderá ser restaurado.'}</ConfirmDialog>
  </div>
}
