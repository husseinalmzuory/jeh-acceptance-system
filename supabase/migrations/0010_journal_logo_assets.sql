-- Managed journal logo for JEH acceptance letters.
-- The bucket is public because the logo is a public journal asset and must
-- render reliably inside browser-generated PDF files.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journal-assets',
  'journal-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public visitors may only read the public journal assets.
drop policy if exists journal_assets_public_read on storage.objects;
create policy journal_assets_public_read on storage.objects
for select to public
using (bucket_id = 'journal-assets');

-- Journal staff can upload and replace the current logo.
drop policy if exists journal_assets_staff_insert on storage.objects;
create policy journal_assets_staff_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'journal-assets'
  and public.can_manage_acceptances()
);

drop policy if exists journal_assets_staff_update on storage.objects;
create policy journal_assets_staff_update on storage.objects
for update to authenticated
using (
  bucket_id = 'journal-assets'
  and public.can_manage_acceptances()
)
with check (
  bucket_id = 'journal-assets'
  and public.can_manage_acceptances()
);

drop policy if exists journal_assets_staff_delete on storage.objects;
create policy journal_assets_staff_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'journal-assets'
  and public.can_manage_acceptances()
);

-- Store only the storage path in settings. The frontend resolves its public URL.
create or replace function public.set_journal_logo(p_logo_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current jsonb;
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if p_logo_path is not null and trim(p_logo_path) <> ''
     and trim(p_logo_path) not like 'logos/%' then
    raise exception 'Invalid logo path';
  end if;

  select value into v_current
  from public.settings
  where key = 'journal'
  for update;

  v_current := coalesce(v_current, '{}'::jsonb);

  if p_logo_path is null or trim(p_logo_path) = '' then
    v_current := v_current - 'logo_path';
  else
    v_current := jsonb_set(v_current, '{logo_path}', to_jsonb(trim(p_logo_path)), true);
  end if;

  insert into public.settings (key, value, description, updated_by)
  values (
    'journal',
    v_current,
    'البيانات الرسمية الثابتة للمجلة',
    auth.uid()
  )
  on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_by = auth.uid();
end;
$$;

revoke all on function public.set_journal_logo(text) from public;
grant execute on function public.set_journal_logo(text) to authenticated;
