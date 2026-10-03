import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'

export function Badge({ tone = 'neutral', children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info' }) {
  return <span className={`badge badge--${tone}`} {...props}>{children}</span>
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`.trim()} {...props}>{children}</section>
}

export function Table({ children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <div className="table-scroll"><table {...props}>{children}</table></div>
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="tooltip" title={label} aria-label={label}>{children}</span>
}
