create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid,
  client_id uuid,
  title text not null check (pg_catalog.length(pg_catalog.btrim(title)) > 0),
  service text not null check (pg_catalog.length(pg_catalog.btrim(service)) > 0),
  description text,
  value numeric(12,2) check (value is null or value >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'negotiation', 'accepted', 'rejected')),
  valid_until date,
  sent_at timestamptz,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_id_user_id_key unique (id, user_id),
  constraint proposals_lead_user_fkey foreign key (lead_id, user_id) references public.leads (id, user_id) on delete restrict,
  constraint proposals_client_user_fkey foreign key (client_id, user_id) references public.clients (id, user_id) on delete restrict
);
create index if not exists proposals_user_updated_idx on public.proposals (user_id, updated_at desc);
create index if not exists proposals_user_status_idx on public.proposals (user_id, status, created_at desc);
create index if not exists proposals_user_client_idx on public.proposals (user_id, client_id, created_at desc);
create index if not exists proposals_user_lead_idx on public.proposals (user_id, lead_id, created_at desc);
create index if not exists proposals_user_archive_idx on public.proposals (user_id, is_archived, created_at desc);

create table if not exists public.proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  proposal_id uuid not null,
  previous_status text check (previous_status is null or previous_status in ('draft', 'sent', 'negotiation', 'accepted', 'rejected')),
  new_status text not null check (new_status in ('draft', 'sent', 'negotiation', 'accepted', 'rejected')),
  changed_at timestamptz not null default now(),
  constraint proposal_status_history_proposal_user_fkey foreign key (proposal_id, user_id) references public.proposals (id, user_id) on delete cascade
);
create index if not exists proposal_status_history_user_proposal_date_idx on public.proposal_status_history (user_id, proposal_id, changed_at desc);

create or replace function public.search_proposals(
  p_query text default '', p_status text default null, p_client_id uuid default null,
  p_lead_id uuid default null, p_from date default null, p_to date default null,
  p_archived text default 'active'
)
returns table (
  id uuid, user_id uuid, lead_id uuid, client_id uuid, title text, service text, description text,
  value numeric, status text, valid_until date, sent_at timestamptz, notes text, is_archived boolean,
  created_at timestamptz, updated_at timestamptz, lead_company_name text, client_company_name text
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.user_id, p.lead_id, p.client_id, p.title, p.service, p.description,
    p.value, p.status, p.valid_until, p.sent_at, p.notes, p.is_archived, p.created_at, p.updated_at,
    l.company_name, c.company_name
  from public.proposals p
  left join public.leads l on l.id = p.lead_id and l.user_id = p.user_id
  left join public.clients c on c.id = p.client_id and c.user_id = p.user_id
  where p.user_id = (select auth.uid())
    and (p_status is null or p.status = p_status)
    and (p_client_id is null or p.client_id = p_client_id)
    and (p_lead_id is null or p.lead_id = p_lead_id)
    and (p_from is null or p.created_at::date >= p_from)
    and (p_to is null or p.created_at::date <= p_to)
    and (p_archived = 'all' or (p_archived = 'archived' and p.is_archived) or (p_archived = 'active' and not p.is_archived))
    and (pg_catalog.btrim(coalesce(p_query, '')) = '' or
      pg_catalog.strpos(pg_catalog.lower(p.title), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(p.service), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(l.company_name, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(c.company_name, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0)
  order by p.created_at desc, p.id;
$$;

create or replace function public.proposal_summary()
returns table (status text, proposal_count bigint, total_value numeric)
language sql stable security invoker set search_path = '' as $$
  select p.status, pg_catalog.count(*), coalesce(pg_catalog.sum(p.value), 0)
  from public.proposals p
  where p.user_id = (select auth.uid()) and not p.is_archived
  group by p.status;
$$;

create or replace function public.record_proposal_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.proposal_status_history (user_id, proposal_id, previous_status, new_status)
    values (new.user_id, new.id, null, new.status);
  elsif old.status is distinct from new.status then
    insert into public.proposal_status_history (user_id, proposal_id, previous_status, new_status)
    values (new.user_id, new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create or replace function public.record_proposal_sent_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sent' and old.status is distinct from new.status then
    new.sent_at := coalesce(new.sent_at, pg_catalog.now());
  end if;
  return new;
end;
$$;

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals for each row execute procedure public.set_updated_at();
drop trigger if exists proposals_record_sent_at on public.proposals;
create trigger proposals_record_sent_at before update of status on public.proposals for each row execute procedure public.record_proposal_sent_at();
drop trigger if exists proposals_record_status on public.proposals;
create trigger proposals_record_status after insert or update of status on public.proposals for each row execute procedure public.record_proposal_status_change();

alter table public.proposals enable row level security;
alter table public.proposal_status_history enable row level security;
drop policy if exists "Users manage own proposals" on public.proposals;
create policy "Users manage own proposals" on public.proposals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own proposal status history" on public.proposal_status_history;
create policy "Users read own proposal status history" on public.proposal_status_history for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.proposals, public.proposal_status_history from anon, authenticated;
grant select, insert, update on public.proposals to authenticated;
grant select on public.proposal_status_history to authenticated;
revoke all on function public.search_proposals(text, text, uuid, uuid, date, date, text) from public, anon;
grant execute on function public.search_proposals(text, text, uuid, uuid, date, date, text) to authenticated;
revoke all on function public.proposal_summary() from public, anon;
grant execute on function public.proposal_summary() to authenticated;
revoke all on function public.record_proposal_status_change() from public, anon, authenticated;
revoke all on function public.record_proposal_sent_at() from public, anon, authenticated;
