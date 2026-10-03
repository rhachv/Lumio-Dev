export type Profile = {
  id: string
  name: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export const leadStatuses = ['new', 'contacted', 'interested', 'negotiation', 'no_response', 'not_interested', 'won', 'lost'] as const
export type LeadStatus = (typeof leadStatuses)[number]
export type LeadSource = 'google_maps' | 'instagram' | 'referral' | 'excel_list' | 'manual' | 'other'
export type InteractionType = 'whatsapp' | 'instagram' | 'phone' | 'in_person' | 'other'
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Niche = { id: string; user_id: string; name: string; is_active: boolean; created_at: string }
export type Lead = {
  id: string
  user_id: string
  company_name: string
  responsible_name: string | null
  niche_id: string | null
  city: string | null
  state: string | null
  whatsapp: string | null
  instagram: string | null
  source: LeadSource
  status: LeadStatus
  notes: string | null
  is_blocked: boolean
  block_reason: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}
export type LeadWithNiche = Lead & { niche: Pick<Niche, 'id' | 'name'> | null }
export type LeadInteraction = { id: string; user_id: string; lead_id: string; type: InteractionType; occurred_at: string; note: string | null; created_at: string }
export type LeadStatusHistory = { id: string; user_id: string; lead_id: string; previous_status: LeadStatus | null; new_status: LeadStatus; changed_at: string }
export type LeadActivity = { id: string; user_id: string; lead_id: string; event_type: 'created' | 'updated' | 'blocked' | 'unblocked' | 'archived' | 'restored'; details: Json; occurred_at: string }

export type Database = {
  public: {
    Tables: {
      nichos: {
        Row: Niche
        Insert: { id?: string; user_id?: string; name: string; is_active?: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      leads: {
        Row: Lead
        Insert: { id?: string; user_id?: string; company_name: string; responsible_name?: string | null; niche_id?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; source?: LeadSource; status?: LeadStatus; notes?: string | null; is_blocked?: boolean; block_reason?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; company_name?: string; responsible_name?: string | null; niche_id?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; source?: LeadSource; status?: LeadStatus; notes?: string | null; is_blocked?: boolean; block_reason?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'leads_niche_user_fkey'; columns: ['niche_id', 'user_id']; isOneToOne: false; referencedRelation: 'nichos'; referencedColumns: ['id', 'user_id'] }]
      }
      lead_interactions: {
        Row: LeadInteraction
        Insert: { id?: string; user_id?: string; lead_id: string; type: InteractionType; occurred_at: string; note?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; lead_id?: string; type?: InteractionType; occurred_at?: string; note?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: 'lead_interactions_lead_user_fkey'; columns: ['lead_id', 'user_id']; isOneToOne: false; referencedRelation: 'leads'; referencedColumns: ['id', 'user_id'] }]
      }
      lead_status_history: {
        Row: LeadStatusHistory
        Insert: { id?: string; user_id?: string; lead_id: string; previous_status?: LeadStatus | null; new_status: LeadStatus; changed_at?: string }
        Update: { id?: string; user_id?: string; lead_id?: string; previous_status?: LeadStatus | null; new_status?: LeadStatus; changed_at?: string }
        Relationships: [{ foreignKeyName: 'lead_status_history_lead_user_fkey'; columns: ['lead_id', 'user_id']; isOneToOne: false; referencedRelation: 'leads'; referencedColumns: ['id', 'user_id'] }]
      }
      lead_activity_history: {
        Row: LeadActivity
        Insert: { id?: string; user_id?: string; lead_id: string; event_type: LeadActivity['event_type']; details?: Json; occurred_at?: string }
        Update: { id?: string; user_id?: string; lead_id?: string; event_type?: LeadActivity['event_type']; details?: Json; occurred_at?: string }
        Relationships: [{ foreignKeyName: 'lead_activity_history_lead_user_fkey'; columns: ['lead_id', 'user_id']; isOneToOne: false; referencedRelation: 'leads'; referencedColumns: ['id', 'user_id'] }]
      }
      profiles: {
        Row: Profile
        Insert: { id: string; name?: string | null; email?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string | null; email?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      search_leads: {
        Args: { p_query?: string; p_status?: string | null; p_niche_id?: string | null; p_source?: string | null; p_blocked?: boolean | null; p_archived?: 'active' | 'archived' | 'all'; p_page?: number; p_page_size?: number }
        Returns: (Lead & { niche_name: string | null; total_count: number })[]
      }
      find_duplicate_lead: {
        Args: { p_company_name: string; p_city?: string | null; p_whatsapp?: string | null; p_instagram?: string | null; p_exclude_id?: string | null }
        Returns: { id: string; company_name: string; niche_name: string | null; city: string | null; whatsapp: string | null; status: LeadStatus; matched_on: 'whatsapp' | 'instagram' | 'company_city' }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
