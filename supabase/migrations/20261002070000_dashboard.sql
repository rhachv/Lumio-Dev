create or replace function public.get_dashboard_summary()
returns table (
  leads_total bigint,
  blocked_leads bigint,
  leads_by_status jsonb,
  clients_total bigint,
  projects_total bigint,
  projects_by_status jsonb,
  proposals_total bigint,
  proposals_by_status jsonb,
  proposal_open_value numeric,
  proposal_accepted_value numeric,
  proposal_total_value numeric
)
language sql stable security invoker set search_path = '' as $$
  select
    (select pg_catalog.count(*) from public.leads l where l.user_id = (select auth.uid()) and not l.is_archived),
    (select pg_catalog.count(*) from public.leads l where l.user_id = (select auth.uid()) and not l.is_archived and l.is_blocked),
    coalesce((select pg_catalog.jsonb_object_agg(status_counts.status, status_counts.amount)
      from (select l.status, pg_catalog.count(*) as amount from public.leads l where l.user_id = (select auth.uid()) and not l.is_archived group by l.status) status_counts), '{}'::jsonb),
    (select pg_catalog.count(*) from public.clients c where c.user_id = (select auth.uid()) and not c.is_archived),
    (select pg_catalog.count(*) from public.projects p where p.user_id = (select auth.uid()) and not p.is_archived),
    coalesce((select pg_catalog.jsonb_object_agg(status_counts.status, status_counts.amount)
      from (select p.status, pg_catalog.count(*) as amount from public.projects p where p.user_id = (select auth.uid()) and not p.is_archived group by p.status) status_counts), '{}'::jsonb),
    (select pg_catalog.count(*) from public.proposals p where p.user_id = (select auth.uid()) and not p.is_archived),
    coalesce((select pg_catalog.jsonb_object_agg(status_counts.status, status_counts.amount)
      from (select p.status, pg_catalog.count(*) as amount from public.proposals p where p.user_id = (select auth.uid()) and not p.is_archived group by p.status) status_counts), '{}'::jsonb),
    coalesce((select pg_catalog.sum(p.value) from public.proposals p where p.user_id = (select auth.uid()) and not p.is_archived and p.status in ('sent', 'negotiation')), 0),
    coalesce((select pg_catalog.sum(p.value) from public.proposals p where p.user_id = (select auth.uid()) and not p.is_archived and p.status = 'accepted'), 0),
    coalesce((select pg_catalog.sum(p.value) from public.proposals p where p.user_id = (select auth.uid()) and not p.is_archived), 0);
$$;

create or replace function public.get_dashboard_recent_proposals()
returns table (
  id uuid, title text, service text, value numeric, status text, updated_at timestamptz,
  lead_company_name text, client_company_name text
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.title, p.service, p.value, p.status, p.updated_at, l.company_name, c.company_name
  from public.proposals p
  left join public.leads l on l.id = p.lead_id and l.user_id = p.user_id
  left join public.clients c on c.id = p.client_id and c.user_id = p.user_id
  where p.user_id = (select auth.uid()) and not p.is_archived
  order by p.updated_at desc, p.id
  limit 5;
$$;

create or replace function public.get_dashboard_recent_activity()
returns table (id text, entity_type text, entity_name text, occurred_at timestamptz, description text, href text)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select 'lead-activity-' || a.id::text as id, 'lead'::text as entity_type, l.company_name as entity_name, a.occurred_at,
      case a.event_type
        when 'created' then 'Lead cadastrado'
        when 'updated' then 'Dados do lead atualizados'
        when 'blocked' then 'Prospecção bloqueada'
        when 'unblocked' then 'Prospecção desbloqueada'
        when 'archived' then 'Lead arquivado'
        when 'restored' then 'Lead restaurado'
        else 'Lead atualizado'
      end as description,
      '/leads/' || l.id::text as href
    from public.lead_activity_history a join public.leads l on l.id = a.lead_id and l.user_id = a.user_id
    where a.user_id = (select auth.uid()) and not l.is_archived

    union all
    select 'lead-status-' || h.id::text, 'lead', l.company_name, h.changed_at,
      (case h.previous_status when 'new' then 'Novo' when 'contacted' then 'Abordado' when 'interested' then 'Interessado' when 'negotiation' then 'Negociação' when 'no_response' then 'Sem resposta' when 'not_interested' then 'Não interessado' when 'won' then 'Ganho' when 'lost' then 'Perdido' else 'Status inicial' end)
      || ' → ' ||
      (case h.new_status when 'new' then 'Novo' when 'contacted' then 'Abordado' when 'interested' then 'Interessado' when 'negotiation' then 'Negociação' when 'no_response' then 'Sem resposta' when 'not_interested' then 'Não interessado' when 'won' then 'Ganho' when 'lost' then 'Perdido' else h.new_status end),
      '/leads/' || l.id::text
    from public.lead_status_history h join public.leads l on l.id = h.lead_id and l.user_id = h.user_id
    where h.user_id = (select auth.uid()) and not l.is_archived

    union all
    select 'lead-interaction-' || i.id::text, 'interaction', l.company_name, i.occurred_at,
      case i.type when 'whatsapp' then 'Interação por WhatsApp' when 'instagram' then 'Interação por Instagram' when 'phone' then 'Ligação registrada' when 'in_person' then 'Reunião presencial' else 'Interação registrada' end,
      '/leads/' || l.id::text
    from public.lead_interactions i join public.leads l on l.id = i.lead_id and l.user_id = i.user_id
    where i.user_id = (select auth.uid()) and not l.is_archived

    union all
    select 'project-status-' || h.id::text, 'project', p.name, h.changed_at,
      case when h.previous_status is null then 'Projeto criado · ' else '' end ||
      (case h.previous_status when 'briefing' then 'Briefing' when 'design' then 'Design' when 'development' then 'Desenvolvimento' when 'review' then 'Revisão' when 'delivery' then 'Entrega' when 'completed' then 'Concluído' when 'cancelled' then 'Cancelado' else '' end)
      || case when h.previous_status is null then '' else ' → ' end ||
      (case h.new_status when 'briefing' then 'Briefing' when 'design' then 'Design' when 'development' then 'Desenvolvimento' when 'review' then 'Revisão' when 'delivery' then 'Entrega' when 'completed' then 'Concluído' when 'cancelled' then 'Cancelado' else h.new_status end),
      '/projetos/' || p.id::text
    from public.project_status_history h join public.projects p on p.id = h.project_id and p.user_id = h.user_id
    where h.user_id = (select auth.uid()) and not p.is_archived

    union all
    select 'proposal-status-' || h.id::text, 'proposal', p.title, h.changed_at,
      case when h.previous_status is null then 'Proposta criada como ' else '' end ||
      (case h.previous_status when 'draft' then 'Rascunho' when 'sent' then 'Enviada' when 'negotiation' then 'Em negociação' when 'accepted' then 'Aceita' when 'rejected' then 'Recusada' else '' end)
      || case when h.previous_status is null then '' else ' → ' end ||
      (case h.new_status when 'draft' then 'Rascunho' when 'sent' then 'Enviada' when 'negotiation' then 'Em negociação' when 'accepted' then 'Aceita' when 'rejected' then 'Recusada' else h.new_status end),
      '/propostas/' || p.id::text
    from public.proposal_status_history h join public.proposals p on p.id = h.proposal_id and p.user_id = h.user_id
    where h.user_id = (select auth.uid()) and not p.is_archived
  ) recent
  order by occurred_at desc, id
  limit 12;
$$;

revoke all on function public.get_dashboard_summary() from public, anon;
grant execute on function public.get_dashboard_summary() to authenticated;
revoke all on function public.get_dashboard_recent_proposals() from public, anon;
grant execute on function public.get_dashboard_recent_proposals() to authenticated;
revoke all on function public.get_dashboard_recent_activity() from public, anon;
grant execute on function public.get_dashboard_recent_activity() to authenticated;
