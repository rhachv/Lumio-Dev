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
  source_detail: string | null
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
export type ImportStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed'
export type ImportRowResult = 'new' | 'possible_duplicate' | 'already_registered' | 'existing_with_new_info' | 'duplicate_in_file' | 'invalid' | 'conflict' | 'imported' | 'updated' | 'ignored' | 'failed'
export type ImportDecision = 'import' | 'update' | 'ignore'
export type LeadImport = { id: string; user_id: string; file_name: string; file_type: 'csv' | 'xlsx'; file_size: number; total_rows: number; new_rows: number; duplicate_rows: number; updated_rows: number; invalid_rows: number; failed_rows: number; status: ImportStatus; failure_message: string | null; created_at: string; completed_at: string | null }
export type LeadImportRow = { id: string; user_id: string; import_id: string; row_number: number; raw_data: Json; normalized_data: Json; lead_data: Json; result: ImportRowResult; decision: ImportDecision | null; matched_lead_id: string | null; error_message: string | null; created_at: string }
export type ScriptCategory = { id: string; user_id: string; name: string; description: string | null; created_at: string; is_active: boolean }
export type Script = { id: string; user_id: string; title: string; objective: string | null; content: string; category_id: string; niche_id: string | null; is_favorite: boolean; is_archived: boolean; created_at: string; updated_at: string }
export type ScriptListItem = Script & { category_name: string; category_is_active: boolean; niche_name: string | null }
export const libraryItemTypes = ['site', 'landing_page', 'design', 'copy', 'offer', 'idea', 'prompt', 'sales', 'other'] as const
export type LibraryItemType = (typeof libraryItemTypes)[number]
export type LibraryItem = { id: string; user_id: string; title: string; description: string | null; type: LibraryItemType; url: string | null; notes: string | null; screenshot_path: string | null; is_favorite: boolean; is_archived: boolean; created_at: string; updated_at: string }
export type Tag = { id: string; user_id: string; name: string; is_active: boolean; created_at: string }
export type LibraryItemTag = { user_id: string; library_item_id: string; tag_id: string; created_at: string }
export type LibrarySearchResult = LibraryItem & { tags: Array<Pick<Tag, 'id' | 'name' | 'is_active'>> }

export const projectStatuses = ['briefing', 'design', 'development', 'review', 'delivery', 'completed', 'cancelled'] as const
export type ProjectStatus = (typeof projectStatuses)[number]
export type Client = {
  id: string; user_id: string; lead_id: string; company_name: string; responsible_name: string | null;
  niche_name: string | null; city: string | null; state: string | null; whatsapp: string | null;
  instagram: string | null; notes: string | null; is_archived: boolean; created_at: string; updated_at: string
}
export type ClientListItem = Client & { project_count: number; project_total_value: number }
export type Project = {
  id: string; user_id: string; client_id: string; name: string; service: string; value: number | null;
  status: ProjectStatus; start_date: string | null; deadline: string | null; project_url: string | null;
  github_url: string | null; vercel_url: string | null; domain: string | null; notes: string | null;
  is_archived: boolean; created_at: string; updated_at: string
}
export type ProjectStatusHistory = { id: string; user_id: string; project_id: string; previous_status: ProjectStatus | null; new_status: ProjectStatus; changed_at: string }
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
        Insert: { id?: string; user_id?: string; company_name: string; responsible_name?: string | null; niche_id?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; source?: LeadSource; source_detail?: string | null; status?: LeadStatus; notes?: string | null; is_blocked?: boolean; block_reason?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; company_name?: string; responsible_name?: string | null; niche_id?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; source?: LeadSource; source_detail?: string | null; status?: LeadStatus; notes?: string | null; is_blocked?: boolean; block_reason?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
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
      imports: {
        Row: LeadImport
        Insert: { id?: string; user_id?: string; file_name: string; file_type: 'csv' | 'xlsx'; file_size: number; total_rows?: number; new_rows?: number; duplicate_rows?: number; updated_rows?: number; invalid_rows?: number; failed_rows?: number; status?: ImportStatus; failure_message?: string | null; created_at?: string; completed_at?: string | null }
        Update: { id?: string; user_id?: string; file_name?: string; file_type?: 'csv' | 'xlsx'; file_size?: number; total_rows?: number; new_rows?: number; duplicate_rows?: number; updated_rows?: number; invalid_rows?: number; failed_rows?: number; status?: ImportStatus; failure_message?: string | null; created_at?: string; completed_at?: string | null }
        Relationships: []
      }
      import_rows: {
        Row: LeadImportRow
        Insert: { id?: string; user_id?: string; import_id: string; row_number: number; raw_data: Json; normalized_data: Json; lead_data?: Json; result: ImportRowResult; decision?: ImportDecision | null; matched_lead_id?: string | null; error_message?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; import_id?: string; row_number?: number; raw_data?: Json; normalized_data?: Json; lead_data?: Json; result?: ImportRowResult; decision?: ImportDecision | null; matched_lead_id?: string | null; error_message?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: 'import_rows_import_user_fkey'; columns: ['import_id', 'user_id']; isOneToOne: false; referencedRelation: 'imports'; referencedColumns: ['id', 'user_id'] }, { foreignKeyName: 'import_rows_matched_lead_user_fkey'; columns: ['matched_lead_id', 'user_id']; isOneToOne: false; referencedRelation: 'leads'; referencedColumns: ['id', 'user_id'] }]
      }
      script_categories: {
        Row: ScriptCategory
        Insert: { id?: string; user_id?: string; name: string; description?: string | null; created_at?: string; is_active?: boolean }
        Update: { id?: string; user_id?: string; name?: string; description?: string | null; created_at?: string; is_active?: boolean }
        Relationships: []
      }
      scripts: {
        Row: Script
        Insert: { id?: string; user_id?: string; title: string; objective?: string | null; content: string; category_id: string; niche_id?: string | null; is_favorite?: boolean; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; objective?: string | null; content?: string; category_id?: string; niche_id?: string | null; is_favorite?: boolean; is_archived?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'scripts_category_user_fkey'; columns: ['category_id', 'user_id']; isOneToOne: false; referencedRelation: 'script_categories'; referencedColumns: ['id', 'user_id'] }, { foreignKeyName: 'scripts_niche_user_fkey'; columns: ['niche_id', 'user_id']; isOneToOne: false; referencedRelation: 'nichos'; referencedColumns: ['id', 'user_id'] }]
      }
      library_items: {
        Row: LibraryItem
        Insert: { id?: string; user_id?: string; title: string; description?: string | null; type: LibraryItemType; url?: string | null; notes?: string | null; screenshot_path?: string | null; is_favorite?: boolean; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; description?: string | null; type?: LibraryItemType; url?: string | null; notes?: string | null; screenshot_path?: string | null; is_favorite?: boolean; is_archived?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      tags: {
        Row: Tag
        Insert: { id?: string; user_id?: string; name: string; is_active?: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      library_item_tags: {
        Row: LibraryItemTag
        Insert: { user_id?: string; library_item_id: string; tag_id: string; created_at?: string }
        Update: { user_id?: string; library_item_id?: string; tag_id?: string; created_at?: string }
        Relationships: [{ foreignKeyName: 'library_item_tags_item_user_fkey'; columns: ['library_item_id', 'user_id']; isOneToOne: false; referencedRelation: 'library_items'; referencedColumns: ['id', 'user_id'] }, { foreignKeyName: 'library_item_tags_tag_user_fkey'; columns: ['tag_id', 'user_id']; isOneToOne: false; referencedRelation: 'tags'; referencedColumns: ['id', 'user_id'] }]
      }
      clients: {
        Row: Client
        Insert: { id?: string; user_id?: string; lead_id: string; company_name: string; responsible_name?: string | null; niche_name?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; notes?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; lead_id?: string; company_name?: string; responsible_name?: string | null; niche_name?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; instagram?: string | null; notes?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'clients_lead_user_fkey'; columns: ['lead_id', 'user_id']; isOneToOne: true; referencedRelation: 'leads'; referencedColumns: ['id', 'user_id'] }]
      }
      projects: {
        Row: Project
        Insert: { id?: string; user_id?: string; client_id: string; name: string; service: string; value?: number | null; status?: ProjectStatus; start_date?: string | null; deadline?: string | null; project_url?: string | null; github_url?: string | null; vercel_url?: string | null; domain?: string | null; notes?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; client_id?: string; name?: string; service?: string; value?: number | null; status?: ProjectStatus; start_date?: string | null; deadline?: string | null; project_url?: string | null; github_url?: string | null; vercel_url?: string | null; domain?: string | null; notes?: string | null; is_archived?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'projects_client_user_fkey'; columns: ['client_id', 'user_id']; isOneToOne: false; referencedRelation: 'clients'; referencedColumns: ['id', 'user_id'] }]
      }
      project_status_history: {
        Row: ProjectStatusHistory
        Insert: { id?: string; user_id?: string; project_id: string; previous_status?: ProjectStatus | null; new_status: ProjectStatus; changed_at?: string }
        Update: { id?: string; user_id?: string; project_id?: string; previous_status?: ProjectStatus | null; new_status?: ProjectStatus; changed_at?: string }
        Relationships: [{ foreignKeyName: 'project_status_history_project_user_fkey'; columns: ['project_id', 'user_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id', 'user_id'] }]
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
      match_leads_for_import: {
        Args: { p_rows: Json }
        Returns: { row_index: number; matched_lead_id: string | null; matched_on: 'whatsapp' | 'instagram' | 'company_city' | null; company_name: string | null; responsible_name: string | null; niche_id: string | null; niche_name: string | null; city: string | null; state: string | null; whatsapp: string | null; instagram: string | null; source: LeadSource | null; source_detail: string | null; notes: string | null }[]
      }
      commit_lead_import: {
        Args: { p_import_id: string }
        Returns: { status: ImportStatus; imported_rows: number; updated_rows: number; failed_rows: number }[]
      }
      delete_lead_import: {
        Args: { p_import_id: string }
        Returns: undefined
      }
      search_scripts: {
        Args: { p_query?: string; p_category_id?: string | null; p_niche_id?: string | null; p_favorites_only?: boolean; p_archived?: 'active' | 'archived' | 'all' }
        Returns: ScriptListItem[]
      }
      search_library_items: {
        Args: { p_query?: string; p_type?: string | null; p_tag_ids?: string[]; p_favorites_only?: boolean; p_archived?: 'active' | 'archived' | 'all'; p_sort?: 'recent' | 'oldest' | 'title'; p_item_id?: string | null; p_page?: number; p_page_size?: number }
        Returns: Array<LibraryItem & { tags: Json; total_count: number }>
      }
      save_library_item: {
        Args: { p_item_id: string; p_title: string; p_description: string | null; p_type: LibraryItemType; p_url: string | null; p_notes: string | null; p_is_favorite: boolean; p_tag_ids: string[]; p_screenshot_path: string | null }
        Returns: string
      }
      convert_won_lead_to_client: {
        Args: { p_lead_id: string }
        Returns: string
      }
      search_clients: {
        Args: { p_query?: string; p_archived?: 'active' | 'archived' | 'all'; p_project_filter?: 'all' | 'with_projects' | 'without_projects' | 'in_progress' | 'completed' }
        Returns: ClientListItem[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
