-- Restore secure acceptance creation after production RLS hardening.
-- The client may execute this RPC, but all table writes happen only inside
-- this SECURITY DEFINER function after an authenticated-session check.

create or replace function public.create_acceptance(
  p_acceptance_number text,
  p_research_title_ar text,
  p_research_title_en text,
  p_received_on date,
  p_reviewed_on date,
  p_accepted_on date,
  p_letter_date date,
  p_internal_notes text,
  p_researchers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acceptance_id uuid;
  v_researcher_id uuid;
  v_item jsonb;
  v_name text;
  v_workplace text;
  v_recipient_names text;
  v_recipient_workplaces text;
  v_author_order integer := 0;
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if trim(coalesce(p_acceptance_number, '')) = '' then
    raise exception 'Acceptance number is required';
  end if;

  if trim(coalesce(p_research_title_ar, '')) = '' then
    raise exception 'Arabic research title is required';
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

  insert into public.acceptances (
    acceptance_number,
    research_title_ar,
    research_title_en,
    recipient_name,
    recipient_affiliation,
    received_on,
    reviewed_on,
    accepted_on,
    letter_date,
    internal_notes
  ) values (
    trim(p_acceptance_number),
    trim(p_research_title_ar),
    nullif(trim(p_research_title_en), ''),
    v_recipient_names,
    v_recipient_workplaces,
    p_received_on,
    p_reviewed_on,
    p_accepted_on,
    p_letter_date,
    nullif(trim(p_internal_notes), '')
  ) returning id into v_acceptance_id;

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
      v_acceptance_id,
      v_researcher_id,
      v_author_order,
      v_author_order = 1
    );
  end loop;

  -- Store the original immutable version at creation time.
  insert into public.acceptance_versions (
    acceptance_id,
    version_number,
    data_snapshot,
    change_reason,
    created_by
  ) values (
    v_acceptance_id,
    1,
    jsonb_build_object(
      'acceptance_number', trim(p_acceptance_number),
      'research_title_ar', trim(p_research_title_ar),
      'research_title_en', nullif(trim(p_research_title_en), ''),
      'received_on', p_received_on,
      'reviewed_on', p_reviewed_on,
      'accepted_on', p_accepted_on,
      'letter_date', p_letter_date,
      'internal_notes', nullif(trim(p_internal_notes), ''),
      'researchers', p_researchers
    ),
    'الإصدار الأصلي',
    auth.uid()
  );

  return v_acceptance_id;
end;
$$;

revoke all on function public.create_acceptance(
  text, text, text, date, date, date, date, text, jsonb
) from public;

grant execute on function public.create_acceptance(
  text, text, text, date, date, date, date, text, jsonb
) to authenticated;

comment on function public.create_acceptance(
  text, text, text, date, date, date, date, text, jsonb
) is 'Authorized acceptance creation RPC. Direct table writes remain blocked by RLS.';
