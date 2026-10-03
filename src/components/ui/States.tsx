import type { ReactNode } from 'react'
export function LoadingState({ label = 'Carregando…' }: { label?: string }) { return <div className="state-line" role="status"><span className="spinner" />{label}</div> }
export function ErrorState({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) { return <div className="notice notice--error" role="alert"><span>{children}</span>{onRetry && <button className="text-button" onClick={onRetry}>Tentar novamente</button>}</div> }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-mark" aria-hidden="true"><span /></span><h3>{title}</h3><p>{description}</p>{action}</div> }
