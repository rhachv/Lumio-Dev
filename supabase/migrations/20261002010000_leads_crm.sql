-- CRM / Leads. Every row belongs to the authenticated user that created it.
create or replace function public.normalize_lead_phone(value text)
returns text language sql immutable set search_path = '' as $$
  select case
    when pg_catalog.left(pg_catalog.btrim(coalesce(value, '')), 1) = '+'
      then pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g')
    when pg_catalog.left(pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g'), 2) = '00'
      then pg_catalog.substr(pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g'), 3)
    when pg_catalog.length(pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g')) in (10, 11)
      then '55' || pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g')
    else pg_catalog.regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.normalize_lead_instagram(value text)
returns text language sql immutable set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(value, '')), '^(https?://)?(www\.)?instagram\.com/', '', 'i'),
      '^@', ''
    ), '[/#?].*$', ''
  ));
$$;

create or replace function public.normalize_lead_text(value text)
returns text language sql immutable set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(value, '')), '[[:space:][:punct:]]', '', 'g'));
$$;

create table if not exists public.nichos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint nichos_id_user_id_key unique (id, user_id)
);
create unique index if not exists nichos_user_name_unique_idx on public.nichos (user_id, public.normalize_lead_text(name));

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null check (pg_catalog.length(pg_catalog.btrim(company_name)) > 0),
  responsible_name text,
  niche_id uuid,
  city text,
  state text,
  whatsapp text,
  instagram text,
  source text not null default 'manual' check (source in ('google_maps', 'instagram', 'referral', 'excel_list', 'manual', 'other')),
  status text not null default 'new' check (status in ('new', 'contacted', 'interested', 'negotiation', 'no_response', 'not_interested', 'won', 'lost')),
  notes text,
  is_blocked boolean not null default false,
  block_reason text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_id_user_id_key unique (id, user_id),
  constraint leads_niche_user_fkey foreign key (niche_id, user_id) references public.nichos (id, user_id) on delete restrict
);
create index if not exists leads_user_updated_idx on public.leads (user_id, updated_at desc);
create index if not exists leads_user_status_idx on public.leads (user_id, status);
create index if not exists leads_user_niche_idx on public.leads (user_id, niche_id);
create index if not exists leads_user_source_idx on public.leads (user_id, source);
create index if not exists leads_user_archive_block_idx on public.leads (user_id, is_archived, is_blocked);
create unique index if not exists leads_user_whatsapp_unique_idx on public.leads (user_id, public.normalize_lead_phone(whatsapp)) where nullif(public.normalize_lead_phone(whatsapp), '') is not null;
create unique index if not exists leads_user_instagram_unique_idx on public.leads (user_id, public.normalize_lead_instagram(instagram)) where nullif(public.normalize_lead_instagram(instagram), '') is not null;
create unique index if not exists leads_user_company_city_unique_idx on public.leads (user_id, public.normalize_lead_text(company_name), public.normalize_lead_text(city)) where nullif(public.normalize_lead_text(city), '') is not null;

create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid not null,
  type text not null check (type in ('whatsapp', 'instagram', 'phone', 'in_person', 'other')),
  occurred_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  constraint lead_interactions_lead_user_fkey foreign key (lead_id, user_id) references public.leads (id, user_id) on delete cascade
);
create index if not exists lead_interactions_user_lead_date_idx on public.lead_interactions (user_id, lead_id, occurred_at desc);

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid not null,
  previous_status text check (previous_status is null or previous_status in ('new', 'contacted', 'interested', 'negotiation', 'no_response', 'not_interested', 'won', 'lost')),
  new_status text not null check (new_status in ('new', 'contacted', 'interested', 'negotiation', 'no_response', 'not_interested', 'won', 'lost')),
  changed_at timestamptz not null default now(),
  constraint lead_status_history_lead_user_fkey foreign key (lead_id, user_id) references public.leads (id, user_id) on delete cascade
);
create index if not exists lead_status_history_user_lead_date_idx on public.lead_status_history (user_id, lead_id, changed_at desc);

create table if not exists public.lead_activity_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid not null,
  event_type text not null check (event_type in ('created', 'updated', 'blocked', 'unblocked', 'archived', 'restored')),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint lead_activity_history_lead_user_fkey foreign key (lead_id, user_id) references public.leads (id, user_id) on delete cascade
);
create index if not exists lead_activity_history_user_lead_date_idx on public.lead_activity_history (user_id, lead_id, occurred_at desc);

-- Seed the provided niche set for existing and newly provisioned Auth users.
insert into public.nichos (user_id, name)
select u.id, n.name from auth.users u
cross join (values ('Imobiliária'), ('Clínica'), ('Restaurante'), ('Advocacia'), ('Academia'), ('Pet Shop'), ('Contabilidade'), ('Odontologia'), ('Outro')) n(name)
on conflict do nothing;

create or replace function public.seed_default_nichos_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.nichos (user_id, name) values
    (new.id, 'Imobiliária'), (new.id, 'Clínica'), (new.id, 'Restaurante'), (new.id, 'Advocacia'),
    (new.id, 'Academia'), (new.id, 'Pet Shop'), (new.id, 'Contabilidade'), (new.id, 'Odontologia'), (new.id, 'Outro')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_seed_nichos on auth.users;
create trigger on_auth_user_created_seed_nichos after insert on auth.users for each row execute procedure public.seed_default_nichos_for_user();

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
    or old.source is distinct from new.source or old.notes is distinct from new.notes then
    insert into public.lead_activity_history (user_id, lead_id, event_type, details) values (new.user_id, new.id, 'updated', '{}'::jsonb);
  end if;
  return new;
end;
$$;

create or replace function public.touch_lead_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set updated_at = pg_catalog.now() where id = new.lead_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
drop trigger if exists leads_record_changes on public.leads;
create trigger leads_record_changes after insert or update on public.leads for each row execute procedure public.record_lead_changes();
drop trigger if exists lead_interactions_touch_lead on public.lead_interactions;
create trigger lead_interactions_touch_lead after insert on public.lead_interactions for each row execute procedure public.touch_lead_updated_at();

create or replace function public.find_duplicate_lead(p_company_name text, p_city text default null, p_whatsapp text default null, p_instagram text default null, p_exclude_id uuid default null)
returns table (id uuid, company_name text, niche_name text, city text, whatsapp text, status text, matched_on text)
language sql stable security invoker set search_path = '' as $$
  select l.id, l.company_name, n.name, l.city, l.whatsapp, l.status,
    case
      when nullif(public.normalize_lead_phone(p_whatsapp), '') is not null and public.normalize_lead_phone(l.whatsapp) = public.normalize_lead_phone(p_whatsapp) then 'whatsapp'
      when nullif(public.normalize_lead_instagram(p_instagram), '') is not null and public.normalize_lead_instagram(l.instagram) = public.normalize_lead_instagram(p_instagram) then 'instagram'
      else 'company_city'
    end
  from public.leads l left join public.nichos n on n.id = l.niche_id and n.user_id = l.user_id
  where l.user_id = (select auth.uid()) and l.id is distinct from p_exclude_id and (
    (nullif(public.normalize_lead_phone(p_whatsapp), '') is not null and public.normalize_lead_phone(l.whatsapp) = public.normalize_lead_phone(p_whatsapp))
    or (nullif(public.normalize_lead_instagram(p_instagram), '') is not null and public.normalize_lead_instagram(l.instagram) = public.normalize_lead_instagram(p_instagram))
    or (nullif(public.normalize_lead_text(p_city), '') is not null and public.normalize_lead_text(l.company_name) = public.normalize_lead_text(p_company_name)
      and public.normalize_lead_text(l.city) = public.normalize_lead_text(p_city))
  )
  order by case
    when nullif(public.normalize_lead_phone(p_whatsapp), '') is not null and public.normalize_lead_phone(l.whatsapp) = public.normalize_lead_phone(p_whatsapp) then 1
    when nullif(public.normalize_lead_instagram(p_instagram), '') is not null and public.normalize_lead_instagram(l.instagram) = public.normalize_lead_instagram(p_instagram) then 2
    else 3 end
  limit 1;
$$;

alter table public.nichos enable row level security;
alter table public.leads enable row level security;
alter table public.lead_interactions enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.lead_activity_history enable row level security;

drop policy if exists "Users manage own niches" on public.nichos;
create policy "Users manage own niches" on public.nichos for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own leads" on public.leads;
create policy "Users manage own leads" on public.leads for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own lead interactions" on public.lead_interactions;
create policy "Users read own lead interactions" on public.lead_interactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add own lead interactions" on public.lead_interactions;
create policy "Users add own lead interactions" on public.lead_interactions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own lead status history" on public.lead_status_history;
create policy "Users read own lead status history" on public.lead_status_history for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users read own lead activity history" on public.lead_activity_history;
create policy "Users read own lead activity history" on public.lead_activity_history for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.nichos, public.leads, public.lead_interactions, public.lead_status_history, public.lead_activity_history from anon, authenticated;
grant select, insert, update on public.nichos, public.leads to authenticated;
grant select, insert on public.lead_interactions to authenticated;
grant select on public.lead_status_history, public.lead_activity_history to authenticated;
revoke all on function public.find_duplicate_lead(text, text, text, text, uuid) from public, anon;
grant execute on function public.find_duplicate_lead(text, text, text, text, uuid) to authenticated;
revoke all on function public.seed_default_nichos_for_user() from public, anon, authenticated;
revoke all on function public.record_lead_changes() from public, anon, authenticated;
revoke all on function public.touch_lead_updated_at() from public, anon, authenticated;


-- Parameterized search keeps user text out of PostgREST filter syntax and pages results.
create or replace function public.search_leads(
  p_query text default '', p_status text default null, p_niche_id uuid default null,
  p_source text default null, p_blocked boolean default null, p_archived text default 'active',
  p_page integer default 1, p_page_size integer default 25
)
returns table (
  id uuid, user_id uuid, company_name text, responsible_name text, niche_id uuid, city text, state text,
  whatsapp text, instagram text, source text, status text, notes text, is_blocked boolean,
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
    f.whatsapp, f.instagram, f.source, f.status, f.notes, f.is_blocked, f.block_reason, f.is_archived,
    f.created_at, f.updated_at, f.resolved_niche_name, pg_catalog.count(*) over ()
  from filtered f
  order by f.updated_at desc, f.id
  limit least(greatest(coalesce(p_page_size, 25), 1), 100)
  offset greatest(coalesce(p_page, 1) - 1, 0) * least(greatest(coalesce(p_page_size, 25), 1), 100);
$$;
revoke all on function public.search_leads(text, text, uuid, text, boolean, text, integer, integer) from public, anon;
grant execute on function public.search_leads(text, text, uuid, text, boolean, text, integer, integer) to authenticated;
