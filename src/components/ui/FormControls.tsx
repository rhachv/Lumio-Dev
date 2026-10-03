import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'

type FieldProps = { label: string; hint?: string; error?: string; id: string }

export function Button({ variant = 'secondary', className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button type={props.type ?? 'button'} className={`button button--${variant} ${className}`.trim()} {...props}>{children}</button>
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input({ label, hint, error, id, ...props }, ref) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  return <div className="field"><label htmlFor={id}>{label}</label><input ref={ref} id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...props} />{hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}{error && <span id={`${id}-error`} className="field-error" role="alert">{error}</span>}</div>
})

export function Select({ label, hint, error, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { children: ReactNode }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...props}>{children}</select>{hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}{error && <span id={`${id}-error`} className="field-error" role="alert">{error}</span>}</div>
}

export function Textarea({ label, hint, error, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  return <div className="field"><label htmlFor={id}>{label}</label><textarea id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...props} />{hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}{error && <span id={`${id}-error`} className="field-error" role="alert">{error}</span>}</div>
}

export function Checkbox({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return <div className="checkbox-field"><input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} type="checkbox" /><label htmlFor={id}>{label}</label>{hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}</div>
}

export function Search({ label = 'Buscar', id = 'search', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; id?: string }) {
  return <div className="search-field"><label className="sr-only" htmlFor={id}>{label}</label><Icon name="search" /><input id={id} type="search" placeholder={label} {...props} /></div>
}

export function Filter({ label, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; children: ReactNode }) {
  return <div className="filter-field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>
}
