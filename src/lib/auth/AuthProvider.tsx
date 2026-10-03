import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../supabase/client'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      setError(sessionError?.message ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      setError(null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    configured: isSupabaseConfigured,
    error,
    async signIn(email, password) {
      if (!supabase) return 'Configure o Supabase para entrar.'
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) return 'Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.'
      return null
    },
    async signOut() {
      if (!supabase) return false
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) { setError('Não foi possível encerrar a sessão. Tente novamente.'); return false }
      return true
    },
  }), [session, loading, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa ser usado dentro de AuthProvider.')
  return value
}
