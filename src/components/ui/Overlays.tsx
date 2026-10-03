import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './FormControls'
import { Icon } from './Icon'

export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return <details className="dropdown"><summary>{label}</summary><div className="dropdown-panel">{children}</div></details>
}

export function Dialog({ open, title, onOpenChange, children, actions }: { open: boolean; title: string; onOpenChange: (open: boolean) => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={() => onOpenChange(false)}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => onOpenChange(false)}><Icon name="close" /></button></div>
    <div className="dialog-content">{children}</div>{actions && <div className="dialog-actions">{actions}</div>}
  </dialog>
}

export function ConfirmDialog({ open, title = 'Confirmar ação', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onOpenChange, onConfirm, children }: { open: boolean; title?: string; confirmLabel?: string; cancelLabel?: string; onOpenChange: (open: boolean) => void; onConfirm: () => void; children: ReactNode }) {
  return <Dialog open={open} title={title} onOpenChange={onOpenChange} actions={<><Button onClick={() => onOpenChange(false)}>{cancelLabel}</Button><Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button></>}><p>{children}</p></Dialog>
}

export function Toast({ message, onDismiss, tone = 'info' }: { message: string; onDismiss?: () => void; tone?: 'info' | 'success' | 'error' }) {
  return <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{message}{onDismiss && <button className="icon-button" onClick={onDismiss} aria-label="Dispensar notificação"><Icon name="close" /></button>}</div>
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; content: ReactNode }[]; value: string; onChange: (id: string) => void }) {
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === value))
  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (selectedIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[next].id)
    document.getElementById(`tab-${tabs[next].id}`)?.focus()
  }
  const selected = tabs[selectedIndex]
  return <div className="tabs"><div className="tab-list" role="tablist" aria-label="Seções" onKeyDown={moveFocus}>{tabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={tab.id === selected.id} aria-controls={`panel-${tab.id}`} tabIndex={tab.id === selected.id ? 0 : -1} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div><div id={`panel-${selected.id}`} role="tabpanel" aria-labelledby={`tab-${selected.id}`} tabIndex={0}>{selected.content}</div></div>
}
