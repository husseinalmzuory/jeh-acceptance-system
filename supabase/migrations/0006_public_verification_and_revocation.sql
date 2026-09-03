-- Public verification and safe revocation for publication acceptance letters.
-- This migration intentionally exposes only public letter information.

-- Return one verification payload without exposing internal notes, audit data,
-- user profiles, or other archive records.
drop function if exists public.verify_acceptance(uuid);

create or replace function public.verify_acceptance(token uuid)
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
        jsonb_build_object(
          'name', r.name_ar,
          'workplace', r.workplace
        )
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
  where a.verification_token = token;
$$;

revoke all on function public.verify_acceptance(uuid) from public;
grant execute on function public.verify_acceptance(uuid) to anon, authenticated;

-- Authenticated staff can retrieve the verification token for one known
-- acceptance. Keeping this behind an RPC avoids exposing verification tokens
-- through the anonymous verification function.
drop function if exists public.get_acceptance_verification_token(uuid);

create or replace function public.get_acceptance_verification_token(p_acceptance_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  select verification_token
  into v_token
  from public.acceptances
  where id = p_acceptance_id;

  if v_token is null then
    raise exception 'Acceptance not found';
  end if;

  return v_token;
end;
$$;

revoke all on function public.get_acceptance_verification_token(uuid) from public;
grant execute on function public.get_acceptance_verification_token(uuid) to authenticated;

-- Revoke an issued acceptance without deleting it. The existing acceptance
-- audit trigger records the change automatically.
drop function if exists public.revoke_acceptance(uuid, text);

create or replace function public.revoke_acceptance(
  p_acceptance_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Revocation reason is required';
  end if;

  update public.acceptances
  set
    document_status = 'revoked',
    revoked_at = now(),
    revoked_by = auth.uid(),
    revocation_reason = trim(p_reason),
    updated_by = auth.uid()
  where id = p_acceptance_id
    and document_status = 'active';

  if not found then
    if exists (select 1 from public.acceptances where id = p_acceptance_id) then
      raise exception 'Acceptance is already revoked';
    end if;
    raise exception 'Acceptance not found';
  end if;
end;
$$;

revoke all on function public.revoke_acceptance(uuid, text) from public;
grant execute on function public.revoke_acceptance(uuid, text) to authenticated;
