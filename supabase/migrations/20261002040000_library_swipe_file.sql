-- Private, searchable reference library with user-owned tags and screenshots.
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (pg_catalog.length(pg_catalog.btrim(title)) between 1 and 180),
  description text check (description is null or pg_catalog.length(description) <= 1200),
  type text not null check (type in ('site', 'landing_page', 'design', 'copy', 'offer', 'idea', 'prompt', 'sales', 'other')),
  url text check (url is null or (pg_catalog.length(url) <= 2048 and url ~* '^https?://')),
  notes text check (notes is null or pg_catalog.length(notes) <= 10000),
  screenshot_path text,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_items_id_user_id_key unique (id, user_id)
);
create index library_items_user_created_idx on public.library_items (user_id, created_at desc);
create index library_items_user_type_idx on public.library_items (user_id, type, is_archived);
create index library_items_user_favorite_idx on public.library_items (user_id, is_favorite, is_archived);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) between 1 and 48 and pg_catalog.left(pg_catalog.btrim(name), 1) <> '#'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tags_id_user_id_key unique (id, user_id)
);
create unique index tags_user_name_unique_idx on public.tags (user_id, pg_catalog.lower(pg_catalog.btrim(name)));
create index tags_user_active_name_idx on public.tags (user_id, is_active, name);

create table public.library_item_tags (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  library_item_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (library_item_id, tag_id),
  constraint library_item_tags_item_user_fkey foreign key (library_item_id, user_id) references public.library_items (id, user_id) on delete cascade,
  constraint library_item_tags_tag_user_fkey foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade
);
create index library_item_tags_user_tag_idx on public.library_item_tags (user_id, tag_id, library_item_id);

alter table public.library_items enable row level security;
alter table public.tags enable row level security;
alter table public.library_item_tags enable row level security;
create policy "Users manage own library items" on public.library_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own tags" on public.tags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own library item tags" on public.library_item_tags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.library_items, public.tags, public.library_item_tags from anon, authenticated;
grant select, insert, update on public.library_items to authenticated;
grant select, insert, update, delete on public.library_item_tags to authenticated;
grant select, insert, update on public.tags to authenticated;

drop trigger if exists library_items_set_updated_at on public.library_items;
create trigger library_items_set_updated_at before update on public.library_items for each row execute function public.set_updated_at();

create or replace function public.search_library_items(
  p_query text default '', p_type text default null, p_tag_ids uuid[] default '{}',
  p_favorites_only boolean default false, p_archived text default 'active',
  p_sort text default 'recent', p_item_id uuid default null, p_page integer default 1, p_page_size integer default 24
)
returns table (
  id uuid, user_id uuid, title text, description text, type text, url text, notes text,
  screenshot_path text, is_favorite boolean, is_archived boolean, created_at timestamptz,
  updated_at timestamptz, tags jsonb, total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.user_id, i.title, i.description, i.type, i.url, i.notes, i.screenshot_path,
    i.is_favorite, i.is_archived, i.created_at, i.updated_at,
    coalesce(tagset.items, '[]'::jsonb), pg_catalog.count(*) over ()
  from public.library_items i
  left join lateral (
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', t.id, 'name', t.name, 'is_active', t.is_active) order by t.name) as items
    from public.library_item_tags it
    join public.tags t on t.id = it.tag_id and t.user_id = it.user_id
    where it.library_item_id = i.id and it.user_id = i.user_id
  ) tagset on true
  where i.user_id = (select auth.uid())
    and (p_item_id is null or i.id = p_item_id)
    and (p_type is null or i.type = p_type)
    and (not coalesce(p_favorites_only, false) or i.is_favorite)
    and (p_archived = 'all' or (p_archived = 'archived' and i.is_archived) or (p_archived = 'active' and not i.is_archived))
    and (coalesce(pg_catalog.cardinality(p_tag_ids), 0) = 0 or not exists (
      select 1 from pg_catalog.unnest(p_tag_ids) as selected(tag_id)
      where not exists (select 1 from public.library_item_tags it where it.library_item_id = i.id and it.user_id = i.user_id and it.tag_id = selected.tag_id)
    ))
    and (pg_catalog.btrim(coalesce(p_query, '')) = '' or
      pg_catalog.strpos(pg_catalog.lower(i.title), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(i.description, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      pg_catalog.strpos(pg_catalog.lower(coalesce(i.notes, '')), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0 or
      exists (select 1 from public.library_item_tags it join public.tags t on t.id = it.tag_id and t.user_id = it.user_id
        where it.library_item_id = i.id and it.user_id = i.user_id and pg_catalog.strpos(pg_catalog.lower(t.name), pg_catalog.lower(pg_catalog.btrim(p_query))) > 0)
    )
  order by
    case when p_sort = 'oldest' then i.created_at end asc nulls last,
    case when coalesce(p_sort, 'recent') not in ('oldest', 'title') then i.created_at end desc nulls last,
    case when p_sort = 'title' then pg_catalog.lower(i.title) end asc nulls last,
    i.id
  limit least(greatest(coalesce(p_page_size, 24), 1), 100)
  offset greatest(coalesce(p_page, 1) - 1, 0) * least(greatest(coalesce(p_page_size, 24), 1), 100);
$$;
revoke all on function public.search_library_items(text, text, uuid[], boolean, text, text, uuid, integer, integer) from public, anon;
grant execute on function public.search_library_items(text, text, uuid[], boolean, text, text, uuid, integer, integer) to authenticated;

create or replace function public.save_library_item(
  p_item_id uuid, p_title text, p_description text, p_type text, p_url text,
  p_notes text, p_is_favorite boolean, p_tag_ids uuid[], p_screenshot_path text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item_id uuid := p_item_id;
  v_exists boolean;
  v_expected integer;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória.' using errcode = '42501'; end if;
  if p_item_id is null then raise exception 'O identificador da referência é obrigatório.' using errcode = '22023'; end if;
  if p_screenshot_path is not null and p_screenshot_path not like (v_user_id::text || '/' || p_item_id::text || '/%') then
    raise exception 'O caminho da imagem não corresponde à referência autenticada.' using errcode = '42501';
  end if;

  select exists(select 1 from public.library_items i where i.id = p_item_id and i.user_id = v_user_id) into v_exists;
  if not v_exists then
    insert into public.library_items (id, user_id, title, description, type, url, notes, is_favorite, screenshot_path)
      values (p_item_id, v_user_id, pg_catalog.btrim(p_title), nullif(pg_catalog.btrim(p_description), ''), p_type,
        nullif(pg_catalog.btrim(p_url), ''), nullif(pg_catalog.btrim(p_notes), ''), coalesce(p_is_favorite, false), p_screenshot_path);
  else
    update public.library_items i set title = pg_catalog.btrim(p_title), description = nullif(pg_catalog.btrim(p_description), ''),
      type = p_type, url = nullif(pg_catalog.btrim(p_url), ''), notes = nullif(pg_catalog.btrim(p_notes), ''),
      is_favorite = coalesce(p_is_favorite, false), screenshot_path = p_screenshot_path
      where i.id = p_item_id and i.user_id = v_user_id returning i.id into v_item_id;
    if not found then raise exception 'Referência não encontrada.' using errcode = 'P0002'; end if;
    delete from public.library_item_tags it where it.library_item_id = v_item_id and it.user_id = v_user_id;
  end if;

  select pg_catalog.count(distinct selected.tag_id)::integer into v_expected
    from pg_catalog.unnest(coalesce(p_tag_ids, '{}'::uuid[])) as selected(tag_id);
  insert into public.library_item_tags (user_id, library_item_id, tag_id)
    select v_user_id, v_item_id, selected.tag_id
    from (select distinct tag_id from pg_catalog.unnest(coalesce(p_tag_ids, '{}'::uuid[])) as input(tag_id)) selected
    join public.tags t on t.id = selected.tag_id and t.user_id = v_user_id;
  get diagnostics v_inserted = row_count;
  if v_inserted <> v_expected then raise exception 'Uma ou mais tags não estão disponíveis para este usuário.' using errcode = '23503'; end if;
  return v_item_id;
end;
$$;
revoke all on function public.save_library_item(uuid, text, text, text, text, text, boolean, uuid[], text) from public, anon;
grant execute on function public.save_library_item(uuid, text, text, text, text, text, boolean, uuid[], text) to authenticated;

-- Private images are stored under <auth.uid>/<item-id>/<random-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lumio-library-screenshots', 'lumio-library-screenshots', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read own library screenshots" on storage.objects for select to authenticated
  using (bucket_id = 'lumio-library-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own library screenshots" on storage.objects for insert to authenticated
  with check (bucket_id = 'lumio-library-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users replace own library screenshots" on storage.objects for update to authenticated
  using (bucket_id = 'lumio-library-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'lumio-library-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own library screenshots" on storage.objects for delete to authenticated
  using (bucket_id = 'lumio-library-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
