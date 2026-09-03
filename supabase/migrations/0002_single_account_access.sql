-- JEH Publication Acceptance System
-- Single-account access model
-- The system intentionally uses one shared journal account and exposes no user-management UI.

create or replace function public.can_manage_acceptances()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

comment on function public.can_manage_acceptances() is
'Single-account model: any authenticated session is the authorized journal operator. Public sign-up must remain disabled.';

comment on function public.is_admin() is
'Compatibility helper for the initial schema. In the single-account model, the sole authenticated journal account has full access.';
