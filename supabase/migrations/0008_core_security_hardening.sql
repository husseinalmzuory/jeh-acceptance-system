-- JEH Publication Acceptance System
-- Core security hardening for production use.
-- All critical writes must go through the audited SECURITY DEFINER RPCs.

-- Block direct client writes to the core acceptance/version tables.
-- create_acceptance(), update_acceptance(), and revoke_acceptance() remain the only
-- supported write paths and run as SECURITY DEFINER functions.
drop policy if exists acceptances_insert_staff on public.acceptances;
drop policy if exists acceptances_update_staff on public.acceptances;

drop policy if exists researchers_insert_staff on public.researchers;
drop policy if exists researchers_update_staff on public.researchers;

drop policy if exists links_insert_staff on public.acceptance_researchers;
drop policy if exists links_update_staff on public.acceptance_researchers;
drop policy if exists links_delete_staff on public.acceptance_researchers;

drop policy if exists versions_insert_staff on public.acceptance_versions;

-- A revoked acceptance is an immutable historical record. The transition from
-- active -> revoked is allowed, but no later UPDATE can mutate that record.
create or replace function public.prevent_revoked_acceptance_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.document_status = 'revoked' then
    raise exception 'Revoked acceptances are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_revoked_acceptance on public.acceptances;
create trigger protect_revoked_acceptance
before update on public.acceptances
for each row
execute function public.prevent_revoked_acceptance_mutation();

-- Keep attachment metadata in the same audit trail as acceptance data.
drop trigger if exists attachments_audit on public.attachments;
create trigger attachments_audit
after insert or update or delete on public.attachments
for each row execute function public.write_audit_log();

-- settings.updated_at should reflect every administrative settings save.
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- Keep read access for the authenticated journal account. Public visitors
-- continue to see only the fields returned by the verification RPCs.
comment on function public.prevent_revoked_acceptance_mutation() is
'Prevents any mutation after an acceptance has been revoked. Revocation itself is allowed because OLD status is active.';
