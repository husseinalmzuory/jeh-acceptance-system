-- Add review date and transactional creation for one to six researchers.

alter table public.acceptances
  add column if not exists reviewed_on date;

alter table public.acceptances
  drop constraint if exists acceptance_dates_valid;

alter table public.acceptances
  add constraint acceptance_dates_valid check (
    received_on <= reviewed_on
    and reviewed_on <= accepted_on
  );

alter table public.acceptances
  drop column if exists ojs_submission_id;

create or replace function public.create_acceptance(
  p_acceptance_number text,
  p_research_title_ar text,
  p_research_title_en text,
  p_recipient_affiliation text,
  p_received_on date,
  p_reviewed_on date,
  p_accepted_on date,
  p_letter_date date,
  p_internal_notes text,
  p_researchers jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_acceptance_id uuid;
  v_researcher_id uuid;
  v_researcher_name text;
  v_recipient_names text;
  v_author_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(p_researchers) <> 'array'
     or jsonb_array_length(p_researchers) < 1
     or jsonb_array_length(p_researchers) > 6 then
    raise exception 'Researchers count must be between 1 and 6';
  end if;

  if p_received_on > p_reviewed_on or p_reviewed_on > p_accepted_on then
    raise exception 'Dates must follow received, reviewed, accepted order';
  end if;

  select string_agg(trim(value), '، ' order by ordinality)
  into v_recipient_names
  from jsonb_array_elements_text(p_researchers) with ordinality as names(value, ordinality)
  where trim(value) <> '';

  if v_recipient_names is null then
    raise exception 'At least one researcher name is required';
  end if;

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
    trim(p_recipient_affiliation),
    p_received_on,
    p_reviewed_on,
    p_accepted_on,
    p_letter_date,
    nullif(trim(p_internal_notes), '')
  ) returning id into v_acceptance_id;

  for v_researcher_name in
    select trim(value)
    from jsonb_array_elements_text(p_researchers) with ordinality as names(value, ordinality)
    where trim(value) <> ''
    order by ordinality
  loop
    v_author_order := v_author_order + 1;

    insert into public.researchers (
      name_ar,
      university
    ) values (
      v_researcher_name,
      trim(p_recipient_affiliation)
    ) returning id into v_researcher_id;

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

  return v_acceptance_id;
end;
$$;

revoke all on function public.create_acceptance(
  text, text, text, text, date, date, date, date, text, jsonb
) from public;

grant execute on function public.create_acceptance(
  text, text, text, text, date, date, date, date, text, jsonb
) to authenticated;
