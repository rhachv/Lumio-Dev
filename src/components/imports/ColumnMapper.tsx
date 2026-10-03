import { type ImportField, type ImportColumnMapping, importFieldLabels } from '../../services/importTypes'
import { Button, Select } from '../ui/FormControls'
import type { ParsedSheet } from '../../services/importTypes'

const fields = Object.entries(importFieldLabels) as Array<[ImportField, string]>

export function ColumnMapper({ sheet, mapping, onChange }: { sheet: ParsedSheet; mapping: ImportColumnMapping; onChange: (mapping: ImportColumnMapping) => void }) {
  const companyMapped = Object.values(mapping).includes('company_name')
  function assign(index: number, next: string) {
    const field = next as ImportField | 'ignore'
    const result = { ...mapping, [index]: field }
    onChange(result)
  }
  return <section className="import-mapper panel">
    <div className="section-heading"><div><h2>Mapeie as colunas</h2><p>Confira os campos reconhecidos e ajuste o que for necessário.</p></div><span className="import-mapper-count">{sheet.headers.length} colunas</span></div>
    {!companyMapped && <div className="notice notice--error import-map-error" role="alert">Associe uma coluna a Empresa para continuar.</div>}
    <div className="import-map-list">
      {sheet.headers.map((header, index) => {
        const selected = mapping[index] ?? 'ignore'
        const usedElsewhere = new Set(Object.entries(mapping).filter(([key]) => Number(key) !== index).map(([, value]) => value))
        return <div className="import-map-row" key={`${index}-${header}`}>
          <div className="import-map-source"><span className="import-map-source-label">{selected === 'ignore' ? 'Coluna não identificada' : 'Coluna encontrada'}</span><strong title={header}>{header}</strong>
            <span className="import-map-sample">Exemplos: {sheet.rows.slice(0, 2).map((row) => row[index]).filter(Boolean).join(' · ') || 'sem valores'}</span></div>
          <span className="import-map-arrow" aria-hidden="true"><span /></span>
          <Select id={`import-map-${index}`} label={`Campo Lumio para ${header}`} value={selected} onChange={(event) => assign(index, event.target.value)}>
            <option value="ignore">Ignorar coluna</option>
            {fields.map(([field, label]) => <option key={field} value={field} disabled={usedElsewhere.has(field) && selected !== field}>{label}</option>)}
          </Select>
        </div>
      })}
    </div>
    <div className="import-map-footer"><p>Colunas ignoradas não serão usadas nem armazenadas no histórico.</p><Button variant="ghost" onClick={() => onChange(Object.fromEntries(sheet.headers.map((_, index) => [index, 'ignore'])))}>Ignorar todas</Button></div>
  </section>
}
