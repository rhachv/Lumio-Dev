import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Logo } from '../../components/layout/Logo'
import { LoadingState } from '../../components/ui/States'

export function LoginPage() {
  const { user, loading, configured, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (loading) return <div className="login-loading"><LoadingState label="Verificando sessão…" /></div>
  if (user) return <Navigate to={destination} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSubmitting(true)
    const result = await signIn(email.trim(), password)
    if (result) setError(result)
    setSubmitting(false)
  }

  return <main className="login-page"><section className="login-panel">
    <Logo /><div className="login-copy"><p className="eyebrow">ACESSO PRIVADO</p><h1>Entre na sua conta</h1><p>Use suas credenciais para acessar o Lumio Dev.</p></div>
    <form onSubmit={submit} className="login-form">
      <label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="username" required aria-describedby={error ? 'login-error' : undefined} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
      <label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required aria-describedby={error ? 'login-error' : undefined} value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <div id="login-error" className="notice notice--error" role="alert">{error}</div>}
      {!configured && <div className="notice notice--info" role="status"><span>Conecte um projeto Supabase para habilitar o acesso. Adicione as variáveis indicadas em <code>.env.example</code> e reinicie a aplicação.</span></div>}
      <button className="button button--primary login-submit" type="submit" disabled={!configured || submitting}>{submitting ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <p className="login-footnote">Acesso restrito. As contas são gerenciadas pelo administrador do projeto.</p>
  </section><div className="login-aside"><div className="login-aside-inner"><div className="aside-rule" /><p>Uma visão clara da sua operação comercial.</p><span>LUMIO DEV</span></div></div></main>
}
