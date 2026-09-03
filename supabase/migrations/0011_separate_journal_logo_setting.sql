-- Keep the current journal logo in its own settings row so saving the
-- journal metadata form can never overwrite or remove the logo path.

insert into public.settings (key, value, description)
select
  'journal_logo',
  jsonb_build_object('path', value ->> 'logo_path'),
  'شعار كتاب القبول الحالي'
from public.settings
where key = 'journal'
  and nullif(trim(value ->> 'logo_path'), '') is not null
on conflict (key) do update
set value = excluded.value,
    description = excluded.description;

update public.settings
set value = value - 'logo_path'
where key = 'journal'
  and value ? 'logo_path';

create or replace function public.set_journal_logo(p_logo_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_acceptances() then
    raise exception 'Not authorized';
  end if;

  if p_logo_path is not null and trim(p_logo_path) <> ''
     and trim(p_logo_path) not like 'logos/%' then
    raise exception 'Invalid logo path';
  end if;

  insert into public.settings (key, value, description, updated_by)
  values (
    'journal_logo',
    case
      when p_logo_path is null or trim(p_logo_path) = '' then '{}'::jsonb
      else jsonb_build_object('path', trim(p_logo_path))
    end,
    'شعار كتاب القبول الحالي',
    auth.uid()
  )
  on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_by = auth.uid();
end;
$$;

create or replace function public.get_journal_logo_path()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select nullif(trim(value ->> 'path'), '')
  from public.settings
  where key = 'journal_logo'
  limit 1;
$$;

revoke all on function public.set_journal_logo(text) from public;
grant execute on function public.set_journal_logo(text) to authenticated;

grant execute on function public.get_journal_logo_path() to anon, authenticated;
