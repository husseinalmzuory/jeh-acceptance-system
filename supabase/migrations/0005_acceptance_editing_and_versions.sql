-- Safe acceptance editing with immutable version history.

insert into public.acceptance_versions (
  acceptance_id,
  version_number,
  data_snapshot,
  change_reason,
  created_by,
  created_at
)
select
  a.id,
  1,
  jsonb_build_object(
    'acceptance_number', a.acceptance_number,
    'research_title_ar', a.research_title_ar,
    'research_title_en', a.research_title_en,
    'received_on', a.received_on,
    'reviewed_on', a.reviewed_on,
    'accepted_on', a.accepted_on,
    'letter_date', a.letter_date,
    'internal_notes', a.internal_notes,
    'researchers', coalesce((
      select jsonb_agg(
        jsonb_build_object('name', r.name_ar, 'workplace', r.workplace)
        order by ar.author_order
      )
      from public.acceptance_researchers ar
      join public.researchers r on r.id = ar.researcher_id
      where ar.acceptance_id = a.id
    ), '[]'::jsonb)
  ),
  'الإصدار الأصلي',
  a.created_by,
  a.created_at
from public.acceptances a
where not exists (
  select 1
  from public.acceptance_versions v
  where v.acceptance_id = a.id
);

drop function if exists public.update_acceptance(
  uuid, text, text, text, date, date, date, date, text, jsonb, text
);

create or replace function public.update_acceptance(
  p_acceptance_id uuid,
  p_acceptance_number text,
  p_research_title_ar text,
  p_research_title_en text,
  p_received_on date,
  p_reviewed_on date,
  p_accepted_on date,
  p_letter_date date,
  p_internal_notes text,
  p_researchers jsonb,
  p_change_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acceptance public.acceptances%rowtype;
  v_researcher_id uuid;
  v_old_researcher_ids uuid[];
  v_item jsonb;
  v_name text;
  v_workplace text;
  v_recipient_names text;
  v_recipient_workplaces text;
  v_author_order integer := 0;
  v_next_version integer;
  v_snapshot jsonb;
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  if jsonb_typeof(p_researchers) <> 'array'
     or jsonb_array_length(p_researchers) < 1
     or jsonb_array_length(p_researchers) > 6 then
    raise exception 'Researchers count must be between 1 and 6';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_researchers) as items(item)
    where trim(coalesce(item ->> 'name', '')) = ''
       or trim(coalesce(item ->> 'workplace', '')) = ''
  ) then
    raise exception 'Every researcher must have a name and workplace';
  end if;

  if p_received_on > p_reviewed_on or p_reviewed_on > p_accepted_on then
    raise exception 'Dates must follow received, reviewed, accepted order';
  end if;

  select *
  into v_acceptance
  from public.acceptances
  where id = p_acceptance_id
  for update;

  if not found then
    raise exception 'Acceptance not found';
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.acceptance_versions
  where acceptance_id = p_acceptance_id;

  select string_agg(trim(item ->> 'name'), '، ' order by ordinality)
  into v_recipient_names
  from jsonb_array_elements(p_researchers) with ordinality as items(item, ordinality);

  select string_agg(workplace, '؛ ' order by first_order)
  into v_recipient_workplaces
  from (
    select trim(item ->> 'workplace') as workplace, min(ordinality) as first_order
    from jsonb_array_elements(p_researchers) with ordinality as items(item, ordinality)
    group by trim(item ->> 'workplace')
  ) as distinct_workplaces;

  select array_agg(researcher_id)
  into v_old_researcher_ids
  from public.acceptance_researchers
  where acceptance_id = p_acceptance_id;

  delete from public.acceptance_researchers
  where acceptance_id = p_acceptance_id;

  if v_old_researcher_ids is not null then
    delete from public.researchers
    where id = any(v_old_researcher_ids);
  end if;

  update public.acceptances
  set
    acceptance_number = trim(p_acceptance_number),
    research_title_ar = trim(p_research_title_ar),
    research_title_en = nullif(trim(p_research_title_en), ''),
    recipient_name = v_recipient_names,
    recipient_affiliation = v_recipient_workplaces,
    received_on = p_received_on,
    reviewed_on = p_reviewed_on,
    accepted_on = p_accepted_on,
    letter_date = p_letter_date,
    internal_notes = nullif(trim(p_internal_notes), ''),
    updated_by = auth.uid()
  where id = p_acceptance_id;

  for v_item in
    select item
    from jsonb_array_elements(p_researchers) with ordinality as items(item, ordinality)
    order by ordinality
  loop
    v_author_order := v_author_order + 1;
    v_name := trim(v_item ->> 'name');
    v_workplace := trim(v_item ->> 'workplace');

    insert into public.researchers (name_ar, workplace)
    values (v_name, v_workplace)
    returning id into v_researcher_id;

    insert into public.acceptance_researchers (
      acceptance_id,
      researcher_id,
      author_order,
      is_corresponding
    ) values (
      p_acceptance_id,
      v_researcher_id,
      v_author_order,
      v_author_order = 1
    );
  end loop;

  v_snapshot := jsonb_build_object(
    'acceptance_number', trim(p_acceptance_number),
    'research_title_ar', trim(p_research_title_ar),
    'research_title_en', nullif(trim(p_research_title_en), ''),
    'received_on', p_received_on,
    'reviewed_on', p_reviewed_on,
    'accepted_on', p_accepted_on,
    'letter_date', p_letter_date,
    'internal_notes', nullif(trim(p_internal_notes), ''),
    'researchers', p_researchers
  );

  insert into public.acceptance_versions (
    acceptance_id,
    version_number,
    data_snapshot,
    change_reason,
    created_by
  ) values (
    p_acceptance_id,
    v_next_version,
    v_snapshot,
    trim(p_change_reason),
    auth.uid()
  );

  return v_next_version;
end;
$$;

revoke all on function public.update_acceptance(
  uuid, text, text, text, date, date, date, date, text, jsonb, text
) from public;

grant execute on function public.update_acceptance(
  uuid, text, text, text, date, date, date, date, text, jsonb, text
) to authenticated;
