import { Link } from 'react-router-dom'

export type StatusRow = { key: string; label: string; count: number; to?: string }
export function StatusSummary({ rows, total, blockedCount }: { rows: StatusRow[]; total: number; blockedCount?: number }) {
  const denominator = Math.max(total, 1)
  return <div className="status-summary-list">{rows.map((row) => <div className="status-summary-row" key={row.key}>
    <div className="status-summary-row-heading"><span>{row.to ? <Link to={row.to}>{row.label}</Link> : row.label}</span><strong>{row.count}</strong></div>
    <div className="status-summary-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round(row.count / denominator * 100))}%` }} /></div>
  </div>)}
    {blockedCount !== undefined && <div className="status-summary-footnote"><span>Bloqueados (contagem separada)</span><strong>{blockedCount}</strong></div>}
  </div>
}
