import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

export function DashboardSection({ title, description, action, children, className = '' }: { title: string; description?: string; action?: { label: string; to: string }; children: ReactNode; className?: string }) {
  return <section className={`dashboard-section ${className}`.trim()}><div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <Link className="text-link" to={action.to}>{action.label}<Icon name="arrow" /></Link>}</div>{children}</section>
}
