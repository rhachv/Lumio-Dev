import { useMemo, useState } from 'react'
import { Checkbox, Select, Button } from '../ui/FormControls'
import { importFieldLabels, importResultLabels, type ImportReviewRow, type ImportRowResult } from '../../services/importTypes'
import { normalizeCompanyOrCity } from '../../services/importMapping'
import type { Niche } from '../../types/database'

type Filter = 'all' | 'new' | 'possible_duplicate' | 'already_registered' | 'duplicate_in_file' | 'invalid' | 'conflict'
const filterOptions: Array<[Filter, string]> = [
  ['all', 'Todos'], ['new', 'Novos'], ['possible_duplicate', 'Possíveis duplicados'],
  ['already_registered', 'Já cadastrados'], ['duplicate_in_file', 'Duplicados no arquivo'], ['conflict', 'Conflitos'], ['invalid', 'Inválidos'],
]
const reviewFieldLabels: Record<string, string> = { ...importFieldLabels, source_detail: 'Origem' }

function resultGroup(result: ImportRowResult): Filter {
  if (result === 'existing_with_new_info') return 'already_registered'
  if (result === 'conflict') return 'conflict'
  return result === 'possible_duplicate' || result === 'already_registered' || result === 'duplicate_in_file' || result === 'invalid' ? result : 'new'
}

function FieldComparison({ row, onChoose }: { row: ImportReviewRow; onChoose: (field: keyof ImportReviewRow['normalizedData'], value: 'crm' | 'file') => void }) {
  return <div className="import-field-comparisons">
    {row.newFields.length > 0 && <div className="import-new-fields"><strong>Informações que podem ser adicionadas</strong><p>{row.newFields.map((field) => reviewFieldLabels[field]).join(', ')}</p></div>}
    {row.conflicts.map(({ field, crmValue, fileValue }) => <fieldset className="import-conflict-field" key={field}>
      <legend>{reviewFieldLabels[field] ?? field}</legend>
      <label><input type="radio" name={`field-${row.rowNumber}-${field}`} checked={row.fieldChoices[field] === 'crm'} onChange={() => onChoose(field, 'crm')} /><span><b>Manter CRM</b><em>{crmValue}</em></span></label>
      <label><input type="radio" name={`field-${row.rowNumber}-${field}`} checked={row.fieldChoices[field] === 'file'} onChange={() => onChoose(field, 'file')} /><span><b>Usar arquivo</b><em>{fileValue}</em></span></label>
    </fieldset>)}
    {row.matchedLead && <div className="import-match-context"><span>Correspondência: {row.matchedOn === 'whatsapp' ? 'WhatsApp' : row.matchedOn === 'instagram' ? 'Instagram' : 'empresa e cidade'}</span>{row.duplicateRowNumber && <span>Linha repetida: {row.duplicateRowNumber}</span>}</div>}
  </div>
}

function NicheChoice({ row, niches, onChoose }: { row: ImportReviewRow; niches: Niche[]; onChoose: (selection: ImportReviewRow['nicheResolution']) => void }) {
  const current = row.nicheResolution?.kind === 'existing' ? row.nicheResolution.id : row.nicheResolution?.kind === 'create' ? '__create__' : ''
  return <div className="import-niche-choice"><Select id={`import-niche-${row.rowNumber}`} label={`Nicho para ${row.normalizedData.company_name}`} value={current} onChange={(event) => {
    const value = event.target.value
    onChoose(value === '__create__' ? { kind: 'create' } : value ? { kind: 'existing', id: value } : null)
  }}>
    <option value="">Escolher nicho para “{row.normalizedData.niche_label}”</option>
    {niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}
    <option value="__create__">Criar novo nicho: {row.normalizedData.niche_label}</option>
  </Select><p>O nicho será criado ou associado ao confirmar a importação.</p></div>
}

function StatusBadge({ result }: { result: ImportRowResult }) {
  const tone = result === 'new' ? 'success' : result === 'conflict' || result === 'invalid' ? 'error' : result === 'possible_duplicate' || result === 'duplicate_in_file' ? 'warning' : 'neutral'
  return <span className={`badge badge--${tone}`}>{importResultLabels[result]}</span>
}

export function ImportReview({ rows, niches, onChange }: { rows: ImportReviewRow[]; niches: Niche[]; onChange: (rows: ImportReviewRow[]) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const counts = useMemo(() => Object.fromEntries(filterOptions.map(([key]) => [key, key === 'all' ? rows.length : rows.filter((row) => resultGroup(row.result) === key).length])) as Record<Filter, number>, [rows])
  const visibleRows = rows.filter((row) => filter === 'all' || resultGroup(row.result) === filter)
  function patchRow(rowNumber: number, update: Partial<ImportReviewRow>, applySameNiche = false) {
    const selected = rows.find((row) => row.rowNumber === rowNumber)
    const label = selected?.normalizedData.niche_label
    const { normalizedData: updatedData, ...rest } = update
    onChange(rows.map((row) => {
      const applies = row.rowNumber === rowNumber || (applySameNiche && label && row.normalizedData.niche_label && normalizeCompanyOrCity(label) === normalizeCompanyOrCity(row.normalizedData.niche_label))
      if (!applies) return row
      return { ...row, ...rest, ...(updatedData ? { normalizedData: { ...row.normalizedData, niche_id: updatedData.niche_id } } : {}) }
    }))
  }
  function toggleDetails(rowNumber: number) { setExpanded((previous) => { const next = new Set(previous); next.has(rowNumber) ? next.delete(rowNumber) : next.add(rowNumber); return next }) }

  return <section className="import-review">
    <div className="import-review-summary" aria-label="Resumo da análise">
      <div><strong>{rows.filter((row) => row.result === 'new').length}</strong><span>Novos</span></div>
      <div><strong>{rows.filter((row) => row.result === 'possible_duplicate').length}</strong><span>Possíveis duplicados</span></div>
      <div><strong>{rows.filter((row) => row.result === 'already_registered' || row.result === 'existing_with_new_info').length}</strong><span>Já cadastrados</span></div>
      <div><strong>{rows.filter((row) => row.result === 'duplicate_in_file').length}</strong><span>Duplicados no arquivo</span></div>
      <div><strong>{rows.filter((row) => row.result === 'invalid').length}</strong><span>Inválidos</span></div>
      <div><strong>{rows.filter((row) => row.result === 'conflict').length}</strong><span>Conflitos</span></div>
    </div>
    <div className="import-review-toolbar"><div><h2>Revise os registros</h2><p>Leads novos ficam selecionados. Duplicados só são alterados após sua escolha.</p></div><span className="import-selected-count">{rows.filter((row) => row.decision === 'import').length} selecionados para importar</span></div>
    <div className="import-review-filters" role="group" aria-label="Filtrar linhas da importação">
      {filterOptions.map(([key, label]) => <button key={key} type="button" className={filter === key ? 'is-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}
    </div>
    <div className="table-scroll import-review-scroll"><table className="import-review-table"><thead><tr><th scope="col">Empresa</th><th scope="col">Responsável / nicho</th><th scope="col">Cidade</th><th scope="col">WhatsApp</th><th scope="col">Resultado</th><th scope="col">Ação</th></tr></thead>
      <tbody>{visibleRows.map((row) => <ReviewTableRows key={row.rowNumber} row={row} expanded={expanded.has(row.rowNumber)} niches={niches} onToggle={() => toggleDetails(row.rowNumber)} onPatch={(update, applySameNiche) => patchRow(row.rowNumber, update, applySameNiche)} />)}</tbody>
    </table>{visibleRows.length === 0 && <p className="import-filter-empty">Não há linhas nesta categoria.</p>}</div>
  </section>
}

function ReviewTableRows({ row, expanded, niches, onToggle, onPatch }: { row: ImportReviewRow; expanded: boolean; niches: Niche[]; onToggle: () => void; onPatch: (update: Partial<ImportReviewRow>, applySameNiche?: boolean) => void }) {
  const hasReview = Boolean(row.matchedLead && (row.newFields.length || row.conflicts.length))
  const conflictsResolved = row.conflicts.every(({ field }) => row.fieldChoices[field] !== undefined)
  const hasUpdateData = row.newFields.some((field) => field !== 'niche_label' && field !== 'niche_id') || (row.newFields.includes('niche_label') && row.nicheResolution !== null) || row.conflicts.some(({ field }) => row.fieldChoices[field] === 'file')
  const needsNicheResolution = (row.newFields.includes('niche_label') || row.conflicts.some(({ field }) => field === 'niche_label' && row.fieldChoices[field] === 'file')) && row.nicheResolution === null
  const canUpdate = Boolean(conflictsResolved && hasUpdateData && !needsNicheResolution)
  const active = row.decision === 'import' || row.decision === 'update'
  return <>
    <tr className={`import-review-line${active ? ' import-review-line--selected' : ''}`}>
      <td data-label="Empresa"><div className="import-company-cell"><strong>{row.normalizedData.company_name || 'Empresa não informada'}</strong><span>Linha {row.rowNumber}</span></div></td>
      <td data-label="Responsável / nicho"><span>{row.normalizedData.responsible_name || '—'}</span><small>{row.normalizedData.niche_label || 'Sem nicho'}</small></td>
      <td data-label="Cidade">{[row.normalizedData.city, row.normalizedData.state].filter(Boolean).join(' / ') || '—'}</td>
      <td data-label="WhatsApp">{row.normalizedData.whatsapp || '—'}</td>
      <td data-label="Resultado"><StatusBadge result={row.result} />{row.errorMessage && <small className="import-row-error">{row.errorMessage}</small>}</td>
      <td data-label="Ação"><div className="import-row-actions">
        {row.result === 'new' && <Checkbox id={`import-selected-${row.rowNumber}`} label="Importar" checked={row.decision === 'import'} onChange={(event) => onPatch({ decision: event.target.checked ? 'import' : 'ignore' })} />}
        {row.result === 'duplicate_in_file' && <span>Ignorar</span>}
        {row.result === 'invalid' && <span>Corrigir arquivo</span>}
        {row.matchedLead && row.result !== 'duplicate_in_file' && <><Button variant="ghost" onClick={onToggle}>{expanded ? 'Fechar revisão' : 'Revisar'}</Button><Button variant="ghost" onClick={() => onPatch({ decision: 'ignore' })}>Ignorar</Button>{row.decision === 'update' && <span className="import-update-selected">Atualização selecionada</span>}</>}
      </div></td>
    </tr>
    {expanded && row.matchedLead && <tr className="import-review-detail"><td colSpan={6}>
      <div className="import-review-detail-inner"><div className="import-review-existing"><p className="import-detail-eyebrow">Lead no CRM</p><h3>{row.matchedLead.company_name}</h3><dl><div><dt>Cidade</dt><dd>{[row.matchedLead.city, row.matchedLead.state].filter(Boolean).join(' / ') || '—'}</dd></div><div><dt>WhatsApp</dt><dd>{row.matchedLead.whatsapp || '—'}</dd></div><div><dt>Instagram</dt><dd>{row.matchedLead.instagram || '—'}</dd></div><div><dt>Nicho</dt><dd>{row.matchedLead.niche_name || '—'}</dd></div></dl></div>
        <div className="import-review-change"><p className="import-detail-eyebrow">Dados do arquivo</p><h3>{row.normalizedData.company_name}</h3>
          <FieldComparison row={row} onChoose={(field, value) => onPatch({ fieldChoices: { ...row.fieldChoices, [field]: value } })} />
          {row.normalizedData.niche_label && <NicheChoice row={row} niches={niches} onChoose={(selection) => onPatch({ nicheResolution: selection, normalizedData: { ...row.normalizedData, niche_id: selection?.kind === 'existing' ? selection.id : null } }, true)} />}
          <div className="import-review-detail-actions"><Button onClick={() => onPatch({ decision: 'ignore' })}>Ignorar</Button>
            {hasReview && <Button variant="primary" disabled={!canUpdate} onClick={() => onPatch({ decision: 'update' })}>Atualizar lead</Button>}
          </div>
        </div>
      </div>
    </td></tr>}
    {active && row.normalizedData.niche_label && row.nicheResolution === null && <tr className="import-niche-row"><td colSpan={6}><NicheChoice row={row} niches={niches} onChoose={(selection) => onPatch({ nicheResolution: selection, normalizedData: { ...row.normalizedData, niche_id: selection?.kind === 'existing' ? selection.id : null } }, true)} /></td></tr>}
  </>
}
