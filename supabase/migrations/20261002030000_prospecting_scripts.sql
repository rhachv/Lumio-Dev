-- Personal prospecting scripts, categories and optional niche links.
create table public.script_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) between 1 and 80),
  description text check (description is null or pg_catalog.length(description) <= 240),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint script_categories_id_user_id_key unique (id, user_id)
);
create unique index script_categories_user_name_unique_idx on public.script_categories (user_id, pg_catalog.lower(pg_catalog.btrim(name)));
create index script_categories_user_active_idx on public.script_categories (user_id, is_active, name);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (pg_catalog.length(pg_catalog.btrim(title)) between 1 and 160),
  objective text check (objective is null or pg_catalog.length(objective) <= 240),
  content text not null check (pg_catalog.length(pg_catalog.btrim(content)) between 1 and 12000),
  category_id uuid not null,
  niche_id uuid,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scripts_id_user_id_key unique (id, user_id),
  constraint scripts_category_user_fkey foreign key (category_id, user_id) references public.script_categories (id, user_id) on delete restrict,
  constraint scripts_niche_user_fkey foreign key (niche_id, user_id) references public.nichos (id, user_id) on delete restrict
);
create index scripts_user_updated_idx on public.scripts (user_id, updated_at desc);
create index scripts_user_category_idx on public.scripts (user_id, category_id, is_archived);
create index scripts_user_niche_idx on public.scripts (user_id, niche_id, is_archived);
create index scripts_user_favorite_idx on public.scripts (user_id, is_favorite, is_archived);

alter table public.script_categories enable row level security;
alter table public.scripts enable row level security;
create policy "Users manage own script categories" on public.script_categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own scripts" on public.scripts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.script_categories, public.scripts from anon, authenticated;
grant select, insert, update, delete on public.script_categories, public.scripts to authenticated;

drop trigger if exists scripts_set_updated_at on public.scripts;
create trigger scripts_set_updated_at before update on public.scripts for each row execute function public.set_updated_at();

create or replace function public.seed_default_script_categories_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.script_categories (user_id, name, description) values
    (new.id, 'Primeiro contato', 'Abrir uma conversa com um potencial cliente.'),
    (new.id, 'Apresentação', 'Apresentar você, seu trabalho ou uma solução.'),
    (new.id, 'Diagnóstico', 'Entender o cenário, as necessidades e os objetivos.'),
    (new.id, 'Oferta', 'Apresentar uma proposta de valor.'),
    (new.id, 'Objeções', 'Responder dúvidas e objeções com clareza.'),
    (new.id, 'Negociação', 'Conduzir condições e próximos passos.'),
    (new.id, 'Fechamento', 'Confirmar a decisão e formalizar o início.'),
    (new.id, 'Pós-venda', 'Manter uma boa experiência após a contratação.'),
    (new.id, 'Outros', 'Roteiros que não se encaixam nas categorias anteriores.')
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.seed_default_script_categories_for_user() from public, anon, authenticated;

insert into public.script_categories (user_id, name, description)
select u.id, c.name, c.description
from auth.users u
cross join (values
  ('Primeiro contato', 'Abrir uma conversa com um potencial cliente.'),
  ('Apresentação', 'Apresentar você, seu trabalho ou uma solução.'),
  ('Diagnóstico', 'Entender o cenário, as necessidades e os objetivos.'),
  ('Oferta', 'Apresentar uma proposta de valor.'),
  ('Objeções', 'Responder dúvidas e objeções com clareza.'),
  ('Negociação', 'Conduzir condições e próximos passos.'),
  ('Fechamento', 'Confirmar a decisão e formalizar o início.'),
  ('Pós-venda', 'Manter uma boa experiência após a contratação.'),
  ('Outros', 'Roteiros que não se encaixam nas categorias anteriores.')
) as c(name, description)
on conflict do nothing;

drop trigger if exists on_auth_user_created_seed_script_categories on auth.users;
create trigger on_auth_user_created_seed_script_categories after insert on auth.users
  for each row execute procedure public.seed_default_script_categories_for_user();

create or replace function public.search_scripts(
  p_query text default '', p_category_id uuid default null, p_niche_id uuid default null,
  p_favorites_only boolean default false, p_archived text default 'active'
)
returns table (
  id uuid, user_id uuid, title text, objective text, content text, category_id uuid,
  niche_id uuid, is_favorite boolean, is_archived boolean, created_at timestamptz,
  updated_at timestamptz, category_name text, category_is_active boolean, niche_name text
)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.user_id, s.title, s.objective, s.content, s.category_id, s.niche_id,
    s.is_favorite, s.is_archived, s.created_at, s.updated_at, c.name, c.is_active, n.name
  from public.scripts s
  join public.script_categories c on c.id = s.category_id and c.user_id = s.user_id
  left join public.nichos n on n.id = s.niche_id and n.user_id = s.user_id
  where s.user_id = (select auth.uid())
    and (p_category_id is null or s.category_id = p_category_id)
    and (p_niche_id is null or s.niche_id = p_niche_id)
    and (not coalesce(p_favorites_only, false) or s.is_favorite)
    and (p_archived = 'all' or (p_archived = 'archived' and s.is_archived) or (p_archived = 'active' and not s.is_archived))
    and (pg_catalog.btrim(coalesce(p_query, '')) = '' or
      pg_catalog.strpos(pg_catalog.lower(s.title), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(s.objective, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(s.content), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0)
  order by s.updated_at desc, s.id;
$$;
revoke all on function public.search_scripts(text, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.search_scripts(text, uuid, uuid, boolean, text) to authenticated;
