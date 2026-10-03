-- Lead imports. Source labels are preserved without changing the existing source taxonomy.
alter table public.leads add column if not exists source_detail text;

create or replace function public.record_lead_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activity_history (user_id, lead_id, event_type) values (new.user_id, new.id, 'created');
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.lead_status_history (user_id, lead_id, previous_status, new_status) values (new.user_id, new.id, old.status, new.status);
  end if;
  if old.is_blocked is distinct from new.is_blocked then
    insert into public.lead_activity_history (user_id, lead_id, event_type, details)
    values (new.user_id, new.id, case when new.is_blocked then 'blocked' else 'unblocked' end,
      case when new.is_blocked then pg_catalog.jsonb_build_object('reason', new.block_reason) else '{}'::jsonb end);
  end if;
  if old.is_archived is distinct from new.is_archived then
    insert into public.lead_activity_history (user_id, lead_id, event_type)
    values (new.user_id, new.id, case when new.is_archived then 'archived' else 'restored' end);
  end if;
  if old.company_name is distinct from new.company_name or old.responsible_name is distinct from new.responsible_name
    or old.niche_id is distinct from new.niche_id or old.city is distinct from new.city or old.state is distinct from new.state
    or old.whatsapp is distinct from new.whatsapp or old.instagram is distinct from new.instagram
    or old.source is distinct from new.source or old.source_detail is distinct from new.source_detail or old.notes is distinct from new.notes then
    insert into public.lead_activity_history (user_id, lead_id, event_type, details) values (new.user_id, new.id, 'updated', '{}'::jsonb);
  end if;
  return new;
end;
$$;
revoke all on function public.record_lead_changes() from public, anon, authenticated;

create or replace function public.normalize_import_text(value text)
returns text language sql immutable set search_path = '' as $$
  select pg_catalog.regexp_replace(
    pg_catalog.translate(pg_catalog.lower(pg_catalog.btrim(coalesce(value, ''))),
      'àáâãäåèéêëìíîïòóôõöùúûüç', 'aaaaaaeeeeiiiiooooouuuuc'),
    '[[:space:][:punct:]]', '', 'g');
$$;
revoke all on function public.normalize_import_text(text) from public, anon;
grant execute on function public.normalize_import_text(text) to authenticated;

-- search_leads returns the new source_detail value for the existing list screen.
drop function if exists public.search_leads(text, text, uuid, text, boolean, text, integer, integer);
create function public.search_leads(
  p_query text default '', p_status text default null, p_niche_id uuid default null,
  p_source text default null, p_blocked boolean default null, p_archived text default 'active',
  p_page integer default 1, p_page_size integer default 25
)
returns table (
  id uuid, user_id uuid, company_name text, responsible_name text, niche_id uuid, city text, state text,
  whatsapp text, instagram text, source text, source_detail text, status text, notes text, is_blocked boolean,
  block_reason text, is_archived boolean, created_at timestamptz, updated_at timestamptz,
  niche_name text, total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select l.*, n.name as resolved_niche_name
    from public.leads l
    left join public.nichos n on n.id = l.niche_id and n.user_id = l.user_id
    where l.user_id = (select auth.uid())
      and (p_status is null or l.status = p_status)
      and (p_niche_id is null or l.niche_id = p_niche_id)
      and (p_source is null or l.source = p_source)
      and (p_blocked is null or l.is_blocked = p_blocked)
      and (p_archived = 'all' or (p_archived = 'archived' and l.is_archived) or (p_archived = 'active' and not l.is_archived))
      and (
        pg_catalog.btrim(coalesce(p_query, '')) = ''
        or pg_catalog.strpos(pg_catalog.lower(l.company_name), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0
        or pg_catalog.strpos(pg_catalog.lower(coalesce(l.responsible_name, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0
        or pg_catalog.strpos(pg_catalog.lower(coalesce(l.city, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0
        or pg_catalog.strpos(pg_catalog.lower(coalesce(l.instagram, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0
        or (nullif(pg_catalog.regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g'), '') is not null
          and pg_catalog.strpos(pg_catalog.regexp_replace(coalesce(l.whatsapp, ''), '[^0-9]', '', 'g'), pg_catalog.regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g')) > 0)
      )
  )
  select f.id, f.user_id, f.company_name, f.responsible_name, f.niche_id, f.city, f.state,
    f.whatsapp, f.instagram, f.source, f.source_detail, f.status, f.notes, f.is_blocked, f.block_reason, f.is_archived,
    f.created_at, f.updated_at, f.resolved_niche_name, pg_catalog.count(*) over ()
  from filtered f
  order by f.updated_at desc, f.id
  limit least(greatest(coalesce(p_page_size, 25), 1), 100)
  offset greatest(coalesce(p_page, 1) - 1, 0) * least(greatest(coalesce(p_page_size, 25), 1), 100);
$$;
revoke all on function public.search_leads(text, text, uuid, text, boolean, text, integer, integer) from public, anon;
grant execute on function public.search_leads(text, text, uuid, text, boolean, text, integer, integer) to authenticated;

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null check (pg_catalog.length(pg_catalog.btrim(file_name)) between 1 and 240),
  file_type text not null check (file_type in ('csv', 'xlsx')),
  file_size integer not null check (file_size between 1 and 5242880),
  total_rows integer not null default 0 check (total_rows between 0 and 2000),
  new_rows integer not null default 0 check (new_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  status text not null default 'processing' check (status in ('processing', 'completed', 'completed_with_errors', 'failed')),
  failure_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint imports_id_user_id_key unique (id, user_id)
);
create index imports_user_created_idx on public.imports (user_id, created_at desc);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  import_id uuid not null,
  row_number integer not null check (row_number >= 2),
  raw_data jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(raw_data) = 'object'),
  normalized_data jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(normalized_data) = 'object'),
  lead_data jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(lead_data) = 'object'),
  result text not null check (result in ('new', 'possible_duplicate', 'already_registered', 'existing_with_new_info', 'duplicate_in_file', 'invalid', 'conflict', 'imported', 'updated', 'ignored', 'failed')),
  decision text check (decision is null or decision in ('import', 'update', 'ignore')),
  matched_lead_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  constraint import_rows_import_user_fkey foreign key (import_id, user_id) references public.imports (id, user_id) on delete cascade,
  constraint import_rows_import_row_unique unique (import_id, row_number)
);
create index import_rows_user_import_idx on public.import_rows (user_id, import_id, row_number);

alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
create policy "Users manage own imports" on public.imports for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own import rows" on public.import_rows for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.imports, public.import_rows from anon, authenticated;
grant select, insert, update, delete on public.imports, public.import_rows to authenticated;

-- One bounded request matches all reviewed rows against only the current user's leads.
create or replace function public.match_leads_for_import(p_rows jsonb)
returns table (
  row_index integer, matched_lead_id uuid, matched_on text,
  company_name text, responsible_name text, niche_id uuid, niche_name text,
  city text, state text, whatsapp text, instagram text, source text, source_detail text, notes text
)
language sql stable security invoker set search_path = '' as $$
  with incoming as (
    select * from pg_catalog.jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
      as x(row_index integer, company_name text, city text, whatsapp text, instagram text)
  )
  select i.row_index, found.id,
    case
      when found.id is null then null
      when nullif(public.normalize_lead_phone(i.whatsapp), '') is not null and public.normalize_lead_phone(found.whatsapp) = public.normalize_lead_phone(i.whatsapp) then 'whatsapp'
      when nullif(public.normalize_lead_instagram(i.instagram), '') is not null and public.normalize_lead_instagram(found.instagram) = public.normalize_lead_instagram(i.instagram) then 'instagram'
      else 'company_city'
    end,
    found.company_name, found.responsible_name, found.niche_id, found.niche_name,
    found.city, found.state, found.whatsapp, found.instagram, found.source, found.source_detail, found.notes
  from incoming i
  left join lateral (
    select l.id, l.company_name, l.responsible_name, l.niche_id, n.name as niche_name, l.city, l.state,
      l.whatsapp, l.instagram, l.source, l.source_detail, l.notes
    from public.leads l
    left join public.nichos n on n.id = l.niche_id and n.user_id = l.user_id
    where l.user_id = (select auth.uid()) and (
      (nullif(public.normalize_lead_phone(i.whatsapp), '') is not null and public.normalize_lead_phone(l.whatsapp) = public.normalize_lead_phone(i.whatsapp))
      or (nullif(public.normalize_lead_instagram(i.instagram), '') is not null and public.normalize_lead_instagram(l.instagram) = public.normalize_lead_instagram(i.instagram))
      or (nullif(public.normalize_import_text(i.city), '') is not null and public.normalize_import_text(l.company_name) = public.normalize_import_text(i.company_name)
        and public.normalize_import_text(l.city) = public.normalize_import_text(i.city))
    )
    order by case
      when nullif(public.normalize_lead_phone(i.whatsapp), '') is not null and public.normalize_lead_phone(l.whatsapp) = public.normalize_lead_phone(i.whatsapp) then 1
      when nullif(public.normalize_lead_instagram(i.instagram), '') is not null and public.normalize_lead_instagram(l.instagram) = public.normalize_lead_instagram(i.instagram) then 2
      else 3 end
    limit 1
  ) found on true;
$$;
revoke all on function public.match_leads_for_import(jsonb) from public, anon;
grant execute on function public.match_leads_for_import(jsonb) to authenticated;

-- Apply each selected row in a savepoint. A row failure is retained and reported; successful rows commit together.
create or replace function public.commit_lead_import(p_import_id uuid)
returns table (status text, imported_rows integer, updated_rows integer, failed_rows integer)
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_import public.imports%rowtype;
  v_row record;
  v_lead_data jsonb;
  v_niche_id uuid;
  v_matched_id uuid;
  v_result text;
  v_error text;
  v_imported integer := 0;
  v_updated integer := 0;
  v_failed integer := 0;
  v_new integer := 0;
  v_duplicates integer := 0;
  v_invalid integer := 0;
  v_decision text;
  v_resolved_status text;
begin
  select * into v_import from public.imports i where i.id = p_import_id and i.user_id = v_user_id and i.status = 'processing' for update;
  if not found then raise exception 'Importação não encontrada ou já processada.' using errcode = 'P0002'; end if;
  for v_row in select * from public.import_rows r where r.import_id = p_import_id and r.user_id = v_user_id order by r.row_number for update loop
    v_result := v_row.result;
    v_error := null;
    v_matched_id := v_row.matched_lead_id;
    v_lead_data := coalesce(v_row.lead_data, '{}'::jsonb);
    v_decision := v_row.decision;

    if v_decision in ('import', 'update') then
      begin
        if v_decision = 'import' then
          if pg_catalog.btrim(coalesce(v_lead_data->>'company_name', '')) = '' then raise exception 'Empresa obrigatória.' using errcode = '23514'; end if;
          v_niche_id := null;
          if nullif(v_lead_data->>'niche_id', '') is null and nullif(pg_catalog.btrim(v_lead_data->>'niche_label'), '') is not null then
            select n.id into v_niche_id from public.nichos n
              where n.user_id = v_user_id and public.normalize_import_text(n.name) = public.normalize_import_text(v_lead_data->>'niche_label') limit 1;
            if v_niche_id is null then
              insert into public.nichos (user_id, name) values (v_user_id, pg_catalog.btrim(v_lead_data->>'niche_label')) on conflict do nothing;
              select n.id into v_niche_id from public.nichos n
                where n.user_id = v_user_id and public.normalize_import_text(n.name) = public.normalize_import_text(v_lead_data->>'niche_label') limit 1;
            end if;
          end if;
          insert into public.leads (user_id, company_name, responsible_name, niche_id, city, state, whatsapp, instagram, source, source_detail, notes, status, is_blocked, is_archived)
          values (v_user_id, pg_catalog.btrim(v_lead_data->>'company_name'), nullif(pg_catalog.btrim(v_lead_data->>'responsible_name'), ''),
            coalesce(nullif(v_lead_data->>'niche_id', '')::uuid, v_niche_id), nullif(pg_catalog.btrim(v_lead_data->>'city'), ''),
            nullif(pg_catalog.btrim(v_lead_data->>'state'), ''), nullif(pg_catalog.btrim(v_lead_data->>'whatsapp'), ''),
            nullif(pg_catalog.btrim(v_lead_data->>'instagram'), ''), coalesce(nullif(v_lead_data->>'source', ''), 'excel_list'),
            coalesce(nullif(pg_catalog.btrim(v_lead_data->>'source_detail'), ''), 'Importação'), nullif(pg_catalog.btrim(v_lead_data->>'notes'), ''),
            'new', false, false) returning id into v_matched_id;
          v_result := 'imported';
        else
          if v_matched_id is null then raise exception 'Lead existente não identificado.' using errcode = 'P0002'; end if;
          v_niche_id := null;
          if nullif(v_lead_data->>'niche_id', '') is null and nullif(pg_catalog.btrim(v_lead_data->>'niche_label'), '') is not null then
            select n.id into v_niche_id from public.nichos n
              where n.user_id = v_user_id and public.normalize_import_text(n.name) = public.normalize_import_text(v_lead_data->>'niche_label') limit 1;
            if v_niche_id is null then
              insert into public.nichos (user_id, name) values (v_user_id, pg_catalog.btrim(v_lead_data->>'niche_label')) on conflict do nothing;
              select n.id into v_niche_id from public.nichos n
                where n.user_id = v_user_id and public.normalize_import_text(n.name) = public.normalize_import_text(v_lead_data->>'niche_label') limit 1;
            end if;
          end if;
          update public.leads l set
            company_name = case when v_lead_data ? 'company_name' then pg_catalog.btrim(v_lead_data->>'company_name') else l.company_name end,
            responsible_name = case when v_lead_data ? 'responsible_name' then nullif(pg_catalog.btrim(v_lead_data->>'responsible_name'), '') else l.responsible_name end,
            niche_id = case when v_lead_data ? 'niche_id' or v_lead_data ? 'niche_label' then coalesce(nullif(v_lead_data->>'niche_id', '')::uuid, v_niche_id) else l.niche_id end,
            city = case when v_lead_data ? 'city' then nullif(pg_catalog.btrim(v_lead_data->>'city'), '') else l.city end,
            state = case when v_lead_data ? 'state' then nullif(pg_catalog.btrim(v_lead_data->>'state'), '') else l.state end,
            whatsapp = case when v_lead_data ? 'whatsapp' then nullif(pg_catalog.btrim(v_lead_data->>'whatsapp'), '') else l.whatsapp end,
            instagram = case when v_lead_data ? 'instagram' then nullif(pg_catalog.btrim(v_lead_data->>'instagram'), '') else l.instagram end,
            source_detail = case when v_lead_data ? 'source_detail' then nullif(pg_catalog.btrim(v_lead_data->>'source_detail'), '') else l.source_detail end,
            notes = case when v_lead_data ? 'notes' then nullif(pg_catalog.btrim(v_lead_data->>'notes'), '') else l.notes end
          where l.id = v_matched_id and l.user_id = v_user_id;
          if not found then raise exception 'Lead não encontrado.' using errcode = 'P0002'; end if;
          v_result := 'updated';
        end if;
      exception
        when unique_violation then v_result := 'failed'; v_error := 'Esta linha entrou em conflito com um cadastro existente durante a confirmação.';
        when foreign_key_violation then v_result := 'failed'; v_error := 'O nicho escolhido não está mais disponível. Atualize a análise e tente novamente.';
        when others then v_result := 'failed'; v_error := 'Não foi possível salvar esta linha. Verifique os dados e tente novamente.';
      end;
    elsif v_decision = 'ignore' and v_result = 'new' then
      v_result := 'ignored';
    end if;

    update public.import_rows r set result = v_result, decision = v_decision, matched_lead_id = v_matched_id, error_message = v_error
      where r.id = v_row.id and r.user_id = v_user_id;
    if v_result = 'imported' then v_imported := v_imported + 1; v_new := v_new + 1;
    elsif v_result = 'updated' then v_updated := v_updated + 1;
    elsif v_result = 'failed' then v_failed := v_failed + 1;
    elsif v_result in ('possible_duplicate', 'already_registered', 'existing_with_new_info', 'duplicate_in_file') then v_duplicates := v_duplicates + 1;
    elsif v_result in ('invalid', 'conflict') then v_invalid := v_invalid + 1;
    end if;
  end loop;

  v_resolved_status := case when v_failed > 0 then 'completed_with_errors' else 'completed' end;
  update public.imports i set status = v_resolved_status, total_rows = v_import.total_rows,
    new_rows = v_new, duplicate_rows = v_duplicates, updated_rows = v_updated, invalid_rows = v_invalid,
    failed_rows = v_failed, failure_message = null, completed_at = pg_catalog.now()
  where i.id = p_import_id and i.user_id = v_user_id;
  return query select v_resolved_status, v_imported, v_updated, v_failed;
end;
$$;
revoke all on function public.commit_lead_import(uuid) from public, anon;
grant execute on function public.commit_lead_import(uuid) to authenticated;

create or replace function public.delete_lead_import(p_import_id uuid)
returns void language sql security invoker set search_path = '' as $$
  delete from public.imports where id = p_import_id and user_id = (select auth.uid());
$$;
revoke all on function public.delete_lead_import(uuid) from public, anon;
grant execute on function public.delete_lead_import(uuid) to authenticated;
