import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link to="/dashboard" className={`brand${compact ? ' brand--compact' : ''}`} aria-label="Lumio Dev — início">
    <span className="brand-mark" aria-hidden="true"><span /></span>
    {!compact && <span className="brand-name">lumio<span>dev</span></span>}
  </Link>
}
