-- Editor signature and official stamp assets for acceptance letters.
-- Files live in the existing public journal-assets bucket; only their paths
-- are stored in settings so they can be replaced without changing code.

insert into public.settings (key, value, description)
values
  ('editor_signature', '{}'::jsonb, 'توقيع رئيس هيئة التحرير'),
  ('journal_stamp', '{}'::jsonb, 'ختم المجلة الرسمي')
on conflict (key) do nothing;

create or replace function public.set_editor_signature(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if p_path is not null and trim(p_path) <> ''
     and trim(p_path) not like 'signatures/%' then
    raise exception 'Invalid signature path';
  end if;

  insert into public.settings (key, value, description, updated_by)
  values (
    'editor_signature',
    case
      when p_path is null or trim(p_path) = '' then '{}'::jsonb
      else jsonb_build_object('path', trim(p_path))
    end,
    'توقيع رئيس هيئة التحرير',
    auth.uid()
  )
  on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_by = auth.uid();
end;
$$;

create or replace function public.get_editor_signature_path()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select nullif(trim(value ->> 'path'), '')
  from public.settings
  where key = 'editor_signature'
  limit 1;
$$;

create or replace function public.set_journal_stamp(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if p_path is not null and trim(p_path) <> ''
     and trim(p_path) not like 'stamps/%' then
    raise exception 'Invalid stamp path';
  end if;

  insert into public.settings (key, value, description, updated_by)
  values (
    'journal_stamp',
    case
      when p_path is null or trim(p_path) = '' then '{}'::jsonb
      else jsonb_build_object('path', trim(p_path))
    end,
    'ختم المجلة الرسمي',
    auth.uid()
  )
  on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_by = auth.uid();
end;
$$;

create or replace function public.get_journal_stamp_path()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select nullif(trim(value ->> 'path'), '')
  from public.settings
  where key = 'journal_stamp'
  limit 1;
$$;

revoke all on function public.set_editor_signature(text) from public;
revoke all on function public.set_journal_stamp(text) from public;
grant execute on function public.set_editor_signature(text) to authenticated;
grant execute on function public.set_journal_stamp(text) to authenticated;
grant execute on function public.get_editor_signature_path() to anon, authenticated;
grant execute on function public.get_journal_stamp_path() to anon, authenticated;
