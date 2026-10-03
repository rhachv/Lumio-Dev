-- Clients are independent snapshots of converted winning leads. Projects keep
-- their operational status separate from their archive flag.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid not null,
  company_name text not null check (pg_catalog.length(pg_catalog.btrim(company_name)) > 0),
  responsible_name text,
  niche_name text,
  city text,
  state text,
  whatsapp text,
  instagram text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_id_user_id_key unique (id, user_id),
  constraint clients_lead_user_fkey foreign key (lead_id, user_id) references public.leads (id, user_id) on delete restrict,
  constraint clients_lead_unique unique (lead_id)
);
create index if not exists clients_user_updated_idx on public.clients (user_id, updated_at desc);
create index if not exists clients_user_archive_idx on public.clients (user_id, is_archived, updated_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null,
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) > 0),
  service text not null check (pg_catalog.length(pg_catalog.btrim(service)) > 0),
  value numeric(12,2) check (value is null or value >= 0),
  status text not null default 'briefing' check (status in ('briefing', 'design', 'development', 'review', 'delivery', 'completed', 'cancelled')),
  start_date date,
  deadline date,
  project_url text check (project_url is null or project_url ~* '^https?://[^[:space:]]+$'),
  github_url text check (github_url is null or github_url ~* '^https?://[^[:space:]]+$'),
  vercel_url text check (vercel_url is null or vercel_url ~* '^https?://[^[:space:]]+$'),
  domain text check (domain is null or (domain !~ '[[:space:]]' and (domain !~* '^[a-z][a-z0-9+.-]*:' or domain ~* '^https?://'))),
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_user_id_key unique (id, user_id),
  constraint projects_client_user_fkey foreign key (client_id, user_id) references public.clients (id, user_id) on delete restrict
);
create index if not exists projects_user_client_updated_idx on public.projects (user_id, client_id, updated_at desc);
create index if not exists projects_user_status_idx on public.projects (user_id, status);
create index if not exists projects_user_archive_idx on public.projects (user_id, is_archived, updated_at desc);

create table if not exists public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  previous_status text check (previous_status is null or previous_status in ('briefing', 'design', 'development', 'review', 'delivery', 'completed', 'cancelled')),
  new_status text not null check (new_status in ('briefing', 'design', 'development', 'review', 'delivery', 'completed', 'cancelled')),
  changed_at timestamptz not null default now(),
  constraint project_status_history_project_user_fkey foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index if not exists project_status_history_user_project_date_idx on public.project_status_history (user_id, project_id, changed_at desc);

create or replace function public.search_clients(p_query text default '', p_archived text default 'active', p_project_filter text default 'all')
returns table (
  id uuid, user_id uuid, lead_id uuid, company_name text, responsible_name text, niche_name text,
  city text, state text, whatsapp text, instagram text, notes text, is_archived boolean,
  created_at timestamptz, updated_at timestamptz, project_count bigint, project_total_value numeric
)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.user_id, c.lead_id, c.company_name, c.responsible_name, c.niche_name,
    c.city, c.state, c.whatsapp, c.instagram, c.notes, c.is_archived, c.created_at, c.updated_at,
    (select pg_catalog.count(*) from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived),
    (select coalesce(pg_catalog.sum(p.value), 0) from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived)
  from public.clients c
  where c.user_id = (select auth.uid())
    and (p_archived = 'all' or (p_archived = 'archived' and c.is_archived) or (p_archived = 'active' and not c.is_archived))
    and (pg_catalog.btrim(coalesce(p_query, '')) = '' or
      pg_catalog.strpos(pg_catalog.lower(c.company_name), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(c.responsible_name, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(c.city, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      (nullif(pg_catalog.regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g'), '') is not null and
        pg_catalog.strpos(pg_catalog.regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g'), pg_catalog.regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g')) > 0))
    and (p_project_filter = 'all'
      or (p_project_filter = 'with_projects' and exists (select 1 from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived))
      or (p_project_filter = 'without_projects' and not exists (select 1 from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived))
      or (p_project_filter = 'in_progress' and exists (select 1 from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived and p.status not in ('completed', 'cancelled')))
      or (p_project_filter = 'completed' and exists (select 1 from public.projects p where p.client_id = c.id and p.user_id = c.user_id and not p.is_archived and p.status = 'completed')))
  order by c.updated_at desc, c.id;
$$;

create or replace function public.convert_won_lead_to_client(p_lead_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads%rowtype;
  v_client_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into v_lead from public.leads where id = p_lead_id and user_id = (select auth.uid()) for update;
  if not found then raise exception 'Lead not found'; end if;
  if v_lead.status <> 'won' then raise exception 'Only winning leads can be converted to clients'; end if;
  select id into v_client_id from public.clients where lead_id = p_lead_id and user_id = (select auth.uid());
  if v_client_id is not null then return v_client_id; end if;
  insert into public.clients (user_id, lead_id, company_name, responsible_name, niche_name, city, state, whatsapp, instagram, notes)
  values (v_lead.user_id, v_lead.id, v_lead.company_name, v_lead.responsible_name,
    (select n.name from public.nichos n where n.id = v_lead.niche_id and n.user_id = v_lead.user_id),
    v_lead.city, v_lead.state, v_lead.whatsapp, v_lead.instagram, v_lead.notes)
  returning id into v_client_id;
  return v_client_id;
end;
$$;

create or replace function public.record_project_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_status_history (user_id, project_id, previous_status, new_status)
    values (new.user_id, new.id, null, new.status);
  elsif old.status is distinct from new.status then
    insert into public.project_status_history (user_id, project_id, previous_status, new_status)
    values (new.user_id, new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create or replace function public.prevent_client_lead_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.lead_id is distinct from new.lead_id then
    raise exception 'A client source lead cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
drop trigger if exists projects_record_status on public.projects;
create trigger projects_record_status after insert or update of status on public.projects for each row execute procedure public.record_project_status_change();
drop trigger if exists clients_keep_source_lead on public.clients;
create trigger clients_keep_source_lead before update of lead_id on public.clients for each row execute procedure public.prevent_client_lead_change();

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_status_history enable row level security;
drop policy if exists "Users manage own clients" on public.clients;
create policy "Users manage own clients" on public.clients for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects" on public.projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own project status history" on public.project_status_history;
create policy "Users read own project status history" on public.project_status_history for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.clients, public.projects, public.project_status_history from anon, authenticated;
grant select, insert, update on public.clients, public.projects to authenticated;
grant select on public.project_status_history to authenticated;
revoke all on function public.convert_won_lead_to_client(uuid) from public, anon;
grant execute on function public.convert_won_lead_to_client(uuid) to authenticated;
revoke all on function public.search_clients(text, text, text) from public, anon;
grant execute on function public.search_clients(text, text, text) to authenticated;
revoke all on function public.record_project_status_change() from public, anon, authenticated;
revoke all on function public.prevent_client_lead_change() from public, anon, authenticated;
