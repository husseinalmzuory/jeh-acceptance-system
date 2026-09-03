-- Allow public verification by the acceptance number printed on the letter.
-- Only public-facing letter data is returned; internal notes and administrative data remain private.

create or replace function public.verify_acceptance_by_number(p_acceptance_number text)
returns table (
  acceptance_number text,
  research_title_ar text,
  research_title_en text,
  researchers jsonb,
  received_on date,
  reviewed_on date,
  accepted_on date,
  letter_date date,
  document_status public.document_status,
  revoked_at timestamptz,
  revocation_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.acceptance_number,
    a.research_title_ar,
    a.research_title_en,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('name', r.name_ar, 'workplace', r.workplace)
        order by ar.author_order
      )
      from public.acceptance_researchers ar
      join public.researchers r on r.id = ar.researcher_id
      where ar.acceptance_id = a.id
    ), '[]'::jsonb) as researchers,
    a.received_on,
    a.reviewed_on,
    a.accepted_on,
    a.letter_date,
    a.document_status,
    a.revoked_at,
    a.revocation_reason
  from public.acceptances a
  where lower(trim(a.acceptance_number)) = lower(trim(p_acceptance_number))
  limit 1;
$$;

revoke all on function public.verify_acceptance_by_number(text) from public;
grant execute on function public.verify_acceptance_by_number(text) to anon, authenticated;
