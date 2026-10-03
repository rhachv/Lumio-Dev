import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { Button, Select } from '../../components/ui/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ImportDropzone } from '../../components/imports/ImportDropzone'
import { ColumnMapper } from '../../components/imports/ColumnMapper'
import { ImportReview } from '../../components/imports/ImportReview'
import { formatDate } from '../../components/leads/leadMeta'
import { analyzeImport, confirmImport, listImportHistory, summarize } from '../../services/imports'
import { getLeadNiches } from '../../services/leads'
import { suggestColumnMappings } from '../../services/importMapping'
import { readSpreadsheet } from '../../services/spreadsheetReader'
import type { ImportColumnMapping, ImportFileMeta, ImportHistoryItem, ImportReviewRow, ParsedWorkbook } from '../../services/importTypes'
import type { Niche } from '../../types/database'

type Step = 'upload' | 'mapping' | 'review' | 'confirm'
const stepLabels: Array<[Step, string]> = [['upload', 'Arquivo'], ['mapping', 'Colunas'], ['review', 'Revisão'], ['confirm', 'Confirmação']]

function statusLabel(status: ImportHistoryItem['status']) {
  return status === 'completed' ? 'Concluída' : status === 'completed_with_errors' ? 'Concluída com falhas' : status === 'failed' ? 'Falhou' : 'Em processamento'
}

export function ImportPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<ImportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [meta, setMeta] = useState<ImportFileMeta | null>(null)
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [mapping, setMapping] = useState<ImportColumnMapping>({})
  const [rows, setRows] = useState<ImportReviewRow[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(() => {
    let active = true
    setHistoryLoading(true); setHistoryError(false)
    listImportHistory().then((items) => { if (active) setHistory(items) }).catch(() => { if (active) setHistoryError(true) }).finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => loadHistory(), [loadHistory])

  const selectedSheet = useMemo(() => workbook?.sheets.find((sheet) => sheet.name === sheetName) ?? workbook?.sheets[0] ?? null, [workbook, sheetName])
  const summary = useMemo(() => summarize(rows), [rows])
  const companyMapped = Object.values(mapping).includes('company_name')
  const unresolvedNiche = rows.some((row) => {
    if (row.decision !== 'import' && row.decision !== 'update') return false
    if (!row.normalizedData.niche_label) return false
    const fieldWillApply = row.decision === 'import' || row.newFields.includes('niche_label') || row.conflicts.some(({ field }) => field === 'niche_label' && row.fieldChoices[field] === 'file')
    return fieldWillApply && row.nicheResolution === null
  })

  function resetImport() {
    setStep('upload'); setMeta(null); setWorkbook(null); setSheetName(''); setMapping({}); setRows([]); setError(null); setProgress('')
  }

  async function acceptFile(nextFile: File) {
    setBusy(true); setError(null); setProgress('Lendo o arquivo…')
    try {
      const parsed = await readSpreadsheet(nextFile)
      const firstSheet = parsed.sheets[0]
      setWorkbook(parsed); setSheetName(firstSheet.name)
      setMapping(suggestColumnMappings(firstSheet.headers))
      setMeta({ fileName: nextFile.name, fileType: parsed.fileType, fileSize: nextFile.size })
      setStep('mapping')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível ler o arquivo. Verifique o formato e tente novamente.')
    } finally { setBusy(false); setProgress('') }
  }

  async function runAnalysis() {
    if (!selectedSheet || !companyMapped) return
    setBusy(true); setError(null); setProgress('Carregando nichos e verificando duplicidades…')
    try {
      const existingNiches = await getLeadNiches()
      const result = await analyzeImport(selectedSheet, mapping, existingNiches)
      setNiches(existingNiches); setRows(result); setStep('review')
    } catch {
      setError('Não foi possível analisar o arquivo contra o CRM. Confira a conexão e tente novamente.')
    } finally { setBusy(false); setProgress('') }
  }

  async function executeImport() {
    if (!meta || unresolvedNiche) return
    setBusy(true); setError(null)
    try {
      const result = await confirmImport(meta, rows, setProgress)
      navigate(`/importacao/${result.importId}`, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar a importação. Consulte o histórico antes de tentar novamente.')
      setBusy(false); setProgress('')
      loadHistory()
    }
  }

  const fileSize = meta ? `${(meta.fileSize / 1024).toFixed(0)} KB` : ''
  const canConfirm = Boolean(meta && rows.length && !unresolvedNiche)

  return <div className="page-wrap import-page">
    <div className="page-header import-heading"><div><p className="eyebrow">CRM / DADOS</p><h1>Importação</h1><p className="page-subtitle">Adicione listas de empresas ao CRM com revisão antes de salvar.</p></div>
      {(step !== 'upload') && <Button variant="secondary" onClick={resetImport}><Icon name="close" />Cancelar importação</Button>}
    </div>

    {error && <ErrorState>{error}</ErrorState>}
    {step === 'upload' ? <>
      <section className="import-upload-layout"><div className="import-upload-main panel"><div className="import-section-heading"><div><h2>Importar leads</h2><p>Envie uma lista de empresas em Excel ou CSV para adicionar ao seu CRM.</p></div><span className="import-step-number">01</span></div>
        <ImportDropzone onFile={(nextFile) => void acceptFile(nextFile)} busy={busy} />
        {progress && <LoadingState label={progress} />}
        <p className="import-privacy-note">O arquivo é lido no navegador e não é armazenado. O histórico guarda somente os campos mapeados.</p>
      </div><aside className="import-format-note"><h2>Antes de importar</h2><ul><li>Use um arquivo .xlsx ou .csv.</li><li>Inclua cabeçalhos na primeira linha.</li><li>O arquivo pode ter até 5 MB e 2.000 linhas.</li><li>Fórmulas em planilhas precisam ser convertidas em valores.</li></ul><p>Leads novos começam com status Novo, sem bloqueio ou arquivamento.</p></aside></section>
      <section className="import-history-section"><div className="import-history-heading"><div><h2>Histórico de importações</h2><p>Arquivos já analisados e resultados registrados.</p></div></div>
        {historyLoading ? <LoadingState label="Carregando histórico…" /> : historyError ? <ErrorState onRetry={() => loadHistory()}>Não foi possível carregar o histórico de importações.</ErrorState> : history.length === 0 ? <EmptyState title="Nenhuma importação realizada" description="As importações confirmadas aparecerão aqui." /> : <div className="table-scroll import-history-scroll"><table className="import-history-table"><thead><tr><th scope="col">Arquivo</th><th scope="col">Data</th><th scope="col">Linhas</th><th scope="col">Novos</th><th scope="col">Atualizados</th><th scope="col">Duplicados</th><th scope="col">Status</th></tr></thead><tbody>
          {history.map((item) => <tr key={item.id}><td data-label="Arquivo"><Link className="import-history-file" to={`/importacao/${item.id}`}><Icon name="file" />{item.file_name}</Link></td><td data-label="Data">{formatDate(item.created_at, true)}</td><td data-label="Linhas">{item.total_rows}</td><td data-label="Novos">{item.new_rows}</td><td data-label="Atualizados">{item.updated_rows}</td><td data-label="Duplicados">{item.duplicate_rows}</td><td data-label="Status"><span className={`import-history-status import-history-status--${item.status}`}>{statusLabel(item.status)}</span></td></tr>)}
        </tbody></table></div>}
      </section>
    </> : <>
      <ol className="import-stepper" aria-label="Etapas da importação">{stepLabels.map(([key, label], index) => <li key={key} aria-current={step === key ? 'step' : undefined} className={`import-stepper-item${step === key ? ' is-current' : stepLabels.findIndex(([value]) => value === step) > index ? ' is-complete' : ''}`}><span className="import-stepper-count">{String(index + 1).padStart(2, '0')}</span><span>{label}</span></li>)}</ol>
      {step === 'mapping' && selectedSheet && <>
        <div className="import-file-summary"><Icon name="file" /><div><strong>{meta?.fileName}</strong><span>{fileSize} · {selectedSheet.rows.length.toLocaleString('pt-BR')} linhas encontradas</span></div>
          {workbook && workbook.sheets.length > 1 && <Select id="import-sheet" label="Planilha" value={sheetName} onChange={(event) => { const sheet = workbook.sheets.find((value) => value.name === event.target.value); if (sheet) { setSheetName(sheet.name); setMapping(suggestColumnMappings(sheet.headers)) } }}>{workbook.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</Select>}
        </div>
        <ColumnMapper sheet={selectedSheet} mapping={mapping} onChange={setMapping} />
        {busy && <LoadingState label={progress || 'Analisando duplicidades…'} />}
        <div className="import-stage-actions"><Button onClick={() => setStep('upload')}>Voltar</Button><Button variant="primary" onClick={() => void runAnalysis()} disabled={!companyMapped || busy}>{busy ? 'Analisando…' : 'Analisar duplicidades'}</Button></div>
      </>}
      {step === 'review' && <>
        {meta && <div className="import-file-summary"><Icon name="file" /><div><strong>{meta.fileName}</strong><span>{rows.length.toLocaleString('pt-BR')} linhas · Dados comparados com o CRM</span></div><button type="button" className="text-button" onClick={() => setStep('mapping')}>Editar mapeamento</button></div>}
        {busy ? <LoadingState label={progress || 'Analisando linhas…'} /> : <ImportReview rows={rows} niches={niches} onChange={setRows} />}
        <div className="import-stage-actions"><Button onClick={() => setStep('mapping')}>Voltar ao mapeamento</Button><Button variant="primary" onClick={() => { setError(null); setStep('confirm') }} disabled={busy || rows.length === 0}>Continuar para confirmação</Button></div>
      </>}
      {step === 'confirm' && <section className="import-confirm panel"><div className="import-section-heading"><div><p className="import-step-kicker">ETAPA 04</p><h2>Pronto para importar</h2><p>Confira as alterações que serão feitas no CRM.</p></div><span className="import-step-number">04</span></div>
        <dl className="import-confirm-grid"><div><dt>Arquivo</dt><dd>{meta?.fileName}</dd></div><div><dt>Linhas analisadas</dt><dd>{summary.total}</dd></div><div><dt>Novos leads</dt><dd>{summary.selected}</dd></div><div><dt>Atualizações escolhidas</dt><dd>{summary.updates}</dd></div><div><dt>Duplicados ignorados</dt><dd>{rows.filter((row) => ['possible_duplicate', 'already_registered', 'existing_with_new_info', 'duplicate_in_file'].includes(row.result) && row.decision !== 'update').length}</dd></div><div><dt>Linhas inválidas ou em conflito</dt><dd>{summary.invalid + rows.filter((row) => row.result === 'conflict' && row.decision !== 'update').length}</dd></div></dl>
        {unresolvedNiche && <div className="notice notice--error" role="alert">Escolha um nicho existente ou confirme a criação antes de importar.</div>}
        <div className="import-confirm-note"><strong>As informações existentes só serão substituídas pelos conflitos que você escolheu usar.</strong><span>A importação será registrada por linha. Se alguma linha falhar, os demais resultados serão exibidos no histórico.</span></div>
        {busy && <LoadingState label={progress || 'Confirmando importação…'} />}
        <div className="import-stage-actions"><Button onClick={() => setStep('review')} disabled={busy}>Voltar para revisão</Button><Button variant="primary" onClick={() => void executeImport()} disabled={!canConfirm || busy}>{busy ? 'Importando…' : 'Confirmar importação'}</Button></div>
      </section>}
    </>}
  </div>
}
