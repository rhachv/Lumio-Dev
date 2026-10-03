import { Link } from 'react-router-dom'
import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'

export function DashboardCard({ label, value, to, icon, note }: { label: string; value: number | string; to?: string; icon: IconName; note?: string }) {
  const content = <><span className="dashboard-card-icon"><Icon name={icon} /></span><span className="dashboard-card-label">{label}</span><strong>{value}</strong>{note && <span className="dashboard-card-note">{note}</span>}</>
  return to ? <Link className="dashboard-card dashboard-card--link" to={to}>{content}<span className="sr-only">Abrir {label}</span></Link> : <article className="dashboard-card">{content}</article>
}
