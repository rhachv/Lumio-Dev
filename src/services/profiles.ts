import { supabase } from '../lib/supabase/client'
import type { Profile } from '../types/database'

export async function getOwnProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  if (!supabase) return { profile: null, error: 'Supabase não está configurado.' }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) return { profile: null, error: 'Não foi possível carregar seu perfil.' }
  return { profile: data, error: null }
}
