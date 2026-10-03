import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/Overlays'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatDate } from '../../components/leads/leadMeta'
import { deleteImport, getImportHistory } from '../../services/imports'
import { importResultLabels, type ImportHistoryItem, type ImportHistoryRow, type ImportRowResult } from '../../services/importTypes'

type DetailData = { item: ImportHistoryItem; rows: ImportHistoryRow[] }
function statusLabel(status: ImportHistoryItem['status']) { return status === 'completed' ? 'Concluída' : status === 'completed_with_errors' ? 'Concluída com falhas' : status === 'failed' ? 'Falhou' : 'Em processamento' }
function objectEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry ?? '')] as [string, string]).filter(([, entry]) => entry.trim())
}

export function ImportDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setDetail(await getImportHistory(id)) } catch { setError(true) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  async function removeHistory() {
    setDeleting(true); setDeleteError(false)
    try { await deleteImport(id); navigate('/importacao', { replace: true }) }
    catch { setDeleteError(true); setConfirmDelete(false) }
    finally { setDeleting(false) }
  }

  if (loading) return <div className="page-wrap import-page"><LoadingState label="Carregando detalhes da importação…" /></div>
  if (error || !detail) return <div className="page-wrap import-page"><ErrorState onRetry={() => void load()}>Não foi possível carregar os detalhes desta importação.</ErrorState><Link className="text-link" to="/importacao">Voltar ao histórico</Link></div>

  const { item, rows } = detail
  return <div className="page-wrap import-page import-detail-page">
    <div className="detail-back-row"><Link className="back-link" to="/importacao"><Icon name="chevron" />Voltar para Importação</Link></div>
    <div className="page-header import-detail-heading"><div><p className="eyebrow">HISTÓRICO DE IMPORTAÇÃO</p><h1>{item.file_name}</h1><p className="page-subtitle">{formatDate(item.created_at, true)} · {item.file_type.toLocaleUpperCase('pt-BR')} · {(item.file_size / 1024).toFixed(0)} KB</p></div><Button variant="secondary" onClick={() => setConfirmDelete(true)} disabled={deleting}><Icon name="close" />Excluir histórico</Button></div>
    {deleteError && <ErrorState>Não foi possível excluir este histórico. Tente novamente.</ErrorState>}
    {item.failure_message && <div className="notice notice--error" role="alert">{item.failure_message}</div>}
    <section className="import-history-summary panel"><div className="import-section-heading"><div><h2>Resultado</h2><p>Estado da importação: <strong>{statusLabel(item.status)}</strong></p></div><span className={`import-history-status import-history-status--${item.status}`}>{statusLabel(item.status)}</span></div>
      <dl className="import-confirm-grid"><div><dt>Linhas analisadas</dt><dd>{item.total_rows}</dd></div><div><dt>Novos leads</dt><dd>{item.new_rows}</dd></div><div><dt>Atualizações</dt><dd>{item.updated_rows}</dd></div><div><dt>Duplicados / ignorados</dt><dd>{item.duplicate_rows}</dd></div><div><dt>Inválidos</dt><dd>{item.invalid_rows}</dd></div><div><dt>Falhas</dt><dd>{item.failed_rows}</dd></div></dl>
    </section>
    <section className="import-history-rows"><div className="import-history-heading"><div><h2>Linhas da importação</h2><p>Somente campos reconhecidos foram mantidos para auditoria.</p></div><span>{rows.length} registros</span></div>
      {rows.length === 0 ? <EmptyState title="Nenhuma linha registrada" description="Esta importação não contém detalhes por linha." /> : <div className="import-history-row-list">{rows.map((row) => <HistoryRow key={row.id} row={row} />)}</div>}
    </section>
    <ConfirmDialog open={confirmDelete} title="Excluir histórico de importação" confirmLabel={deleting ? 'Excluindo…' : 'Excluir histórico'} onOpenChange={setConfirmDelete} onConfirm={() => void removeHistory()}>
      Excluir “{item.file_name}” removerá o resumo e os detalhes das linhas desta importação. Leads já criados ou atualizados permanecerão no CRM.
    </ConfirmDialog>
  </div>
}

function HistoryRow({ row }: { row: ImportHistoryRow }) {
  const normalized = objectEntries(row.normalized_data)
  const raw = objectEntries(row.raw_data)
  const result = row.result as ImportRowResult
  const tone = result === 'imported' || result === 'updated' ? 'success' : result === 'failed' || result === 'invalid' || result === 'conflict' ? 'error' : result === 'possible_duplicate' || result === 'duplicate_in_file' ? 'warning' : 'neutral'
  return <details className="import-history-row">
    <summary><span className="import-history-row-number">Linha {row.row_number}</span><strong>{normalized.find(([field]) => field === 'company_name')?.[1] || raw[0]?.[1] || 'Empresa não informada'}</strong><span className={`badge badge--${tone}`}>{importResultLabels[result]}</span><Icon name="chevron" /></summary>
    <div className="import-history-row-content">
      <div><h3>Valores normalizados para comparação</h3>{normalized.length ? <dl>{normalized.map(([field, value]) => <div key={field}><dt>{field === 'company_name_normalized' ? 'Empresa' : field === 'city_normalized' ? 'Cidade' : field === 'whatsapp_normalized' ? 'WhatsApp' : field === 'instagram_normalized' ? 'Instagram' : field === 'niche_normalized' ? 'Nicho' : field}</dt><dd>{value}</dd></div>)}</dl> : <p>Nenhum valor comparável foi registrado.</p>}</div>
      {raw.length > 0 && <div><h3>Valores de origem mapeados</h3><dl>{raw.map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{value}</dd></div>)}</dl></div>}
      {row.error_message && <p className="import-row-error" role="alert">{row.error_message}</p>}
      {row.matched_lead_id && <Link className="text-link" to={`/leads/${row.matched_lead_id}`}>Abrir lead relacionado</Link>}
    </div>
  </details>
}
