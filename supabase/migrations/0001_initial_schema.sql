-- JEH Publication Acceptance System
-- Initial Supabase schema
-- This schema manages acceptance letters only. OJS remains the research workflow system.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'editor', 'staff', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_status as enum ('active', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.acceptances (
  id uuid primary key default gen_random_uuid(),
  acceptance_number text not null unique,
  ojs_submission_id text,
  research_title_ar text not null,
  research_title_en text,
  recipient_name text not null,
  recipient_affiliation text not null,
  received_on date not null,
  accepted_on date not null,
  letter_date date not null default current_date,
  document_status public.document_status not null default 'active',
  verification_token uuid not null default gen_random_uuid() unique,
  current_pdf_path text,
  internal_notes text,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revocation_reason text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acceptance_dates_valid check (received_on <= accepted_on),
  constraint revoked_fields_valid check (
    (document_status = 'active' and revoked_at is null)
    or
    (document_status = 'revoked' and revoked_at is not null and revocation_reason is not null)
  )
);

create table if not exists public.researchers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  email text,
  phone text,
  university text,
  college text,
  department text,
  country text default 'العراق',
  created_by uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.acceptance_researchers (
  acceptance_id uuid not null references public.acceptances(id) on delete cascade,
  researcher_id uuid not null references public.researchers(id) on delete restrict,
  author_order integer not null,
  is_corresponding boolean not null default false,
  primary key (acceptance_id, researcher_id),
  unique (acceptance_id, author_order),
  constraint positive_author_order check (author_order > 0)
);

create table if not exists public.acceptance_versions (
  id uuid primary key default gen_random_uuid(),
  acceptance_id uuid not null references public.acceptances(id) on delete cascade,
  version_number integer not null,
  data_snapshot jsonb not null,
  pdf_path text,
  change_reason text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (acceptance_id, version_number),
  constraint positive_version_number check (version_number > 0)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  acceptance_id uuid not null references public.acceptances(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  description text,
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint nonnegative_file_size check (file_size_bytes is null or file_size_bytes >= 0)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid default auth.uid() references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index if not exists acceptances_number_idx on public.acceptances (acceptance_number);
create index if not exists acceptances_title_ar_idx on public.acceptances using gin (to_tsvector('simple', research_title_ar));
create index if not exists acceptances_recipient_idx on public.acceptances (recipient_name);
create index if not exists acceptances_accepted_on_idx on public.acceptances (accepted_on desc);
create index if not exists acceptances_ojs_idx on public.acceptances (ojs_submission_id);
create index if not exists researchers_name_idx on public.researchers (name_ar);
create index if not exists acceptance_researchers_acceptance_idx on public.acceptance_researchers (acceptance_id);
create index if not exists versions_acceptance_idx on public.acceptance_versions (acceptance_id, version_number desc);
create index if not exists attachments_acceptance_idx on public.attachments (acceptance_id);
create index if not exists audit_record_idx on public.audit_logs (table_name, record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists acceptances_set_updated_at on public.acceptances;
create trigger acceptances_set_updated_at
before update on public.acceptances
for each row execute function public.set_updated_at();

drop trigger if exists researchers_set_updated_at on public.researchers;
create trigger researchers_set_updated_at
before update on public.researchers
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.can_manage_acceptances()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'editor', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = 'admin'
  );
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    actor_id, action, table_name, record_id, old_data, new_data
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists acceptances_audit on public.acceptances;
create trigger acceptances_audit
after insert or update or delete on public.acceptances
for each row execute function public.write_audit_log();

drop trigger if exists researchers_audit on public.researchers;
create trigger researchers_audit
after insert or update or delete on public.researchers
for each row execute function public.write_audit_log();

drop trigger if exists versions_audit on public.acceptance_versions;
create trigger versions_audit
after insert or update or delete on public.acceptance_versions
for each row execute function public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.acceptances enable row level security;
alter table public.researchers enable row level security;
alter table public.acceptance_researchers enable row level security;
alter table public.acceptance_versions enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles
for select to authenticated using (is_active = true);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists acceptances_read_authenticated on public.acceptances;
create policy acceptances_read_authenticated on public.acceptances
for select to authenticated using (true);

drop policy if exists acceptances_insert_staff on public.acceptances;
create policy acceptances_insert_staff on public.acceptances
for insert to authenticated with check (public.can_manage_acceptances());

drop policy if exists acceptances_update_staff on public.acceptances;
create policy acceptances_update_staff on public.acceptances
for update to authenticated using (public.can_manage_acceptances()) with check (public.can_manage_acceptances());

drop policy if exists researchers_read_authenticated on public.researchers;
create policy researchers_read_authenticated on public.researchers
for select to authenticated using (true);

drop policy if exists researchers_insert_staff on public.researchers;
create policy researchers_insert_staff on public.researchers
for insert to authenticated with check (public.can_manage_acceptances());

drop policy if exists researchers_update_staff on public.researchers;
create policy researchers_update_staff on public.researchers
for update to authenticated using (public.can_manage_acceptances()) with check (public.can_manage_acceptances());

drop policy if exists links_read_authenticated on public.acceptance_researchers;
create policy links_read_authenticated on public.acceptance_researchers
for select to authenticated using (true);

drop policy if exists links_insert_staff on public.acceptance_researchers;
create policy links_insert_staff on public.acceptance_researchers
for insert to authenticated with check (public.can_manage_acceptances());

drop policy if exists links_update_staff on public.acceptance_researchers;
create policy links_update_staff on public.acceptance_researchers
for update to authenticated using (public.can_manage_acceptances()) with check (public.can_manage_acceptances());

drop policy if exists links_delete_staff on public.acceptance_researchers;
create policy links_delete_staff on public.acceptance_researchers
for delete to authenticated using (public.can_manage_acceptances());

drop policy if exists versions_read_authenticated on public.acceptance_versions;
create policy versions_read_authenticated on public.acceptance_versions
for select to authenticated using (true);

drop policy if exists versions_insert_staff on public.acceptance_versions;
create policy versions_insert_staff on public.acceptance_versions
for insert to authenticated with check (public.can_manage_acceptances());

drop policy if exists attachments_read_authenticated on public.attachments;
create policy attachments_read_authenticated on public.attachments
for select to authenticated using (true);

drop policy if exists attachments_insert_staff on public.attachments;
create policy attachments_insert_staff on public.attachments
for insert to authenticated with check (public.can_manage_acceptances());

drop policy if exists attachments_delete_staff on public.attachments;
create policy attachments_delete_staff on public.attachments
for delete to authenticated using (public.can_manage_acceptances());

drop policy if exists audit_read_authenticated on public.audit_logs;
create policy audit_read_authenticated on public.audit_logs
for select to authenticated using (true);

drop policy if exists settings_read_authenticated on public.settings;
create policy settings_read_authenticated on public.settings
for select to authenticated using (true);

drop policy if exists settings_manage_admin on public.settings;
create policy settings_manage_admin on public.settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value, description)
values
  ('journal', jsonb_build_object(
    'name_ar', 'مجلة التربية للعلوم الإنسانية',
    'name_en', 'Journal of Education for Humanities',
    'publisher_ar', 'كلية التربية للعلوم الإنسانية - جامعة الموصل',
    'issn', '2710-124X',
    'deposit_number', '2425 لسنة 2020',
    'established_year', 2021
  ), 'البيانات الرسمية الثابتة للمجلة'),
  ('numbering', jsonb_build_object(
    'mode', 'manual',
    'format', 'كما يظهر في كتاب القبول الرسمي'
  ), 'إعدادات ترقيم كتب القبول')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('acceptance-pdfs', 'acceptance-pdfs', false, 10485760, array['application/pdf']),
  ('acceptance-attachments', 'acceptance-attachments', false, 26214400, null)
on conflict (id) do nothing;

drop policy if exists acceptance_files_read_authenticated on storage.objects;
create policy acceptance_files_read_authenticated on storage.objects
for select to authenticated
using (bucket_id in ('acceptance-pdfs', 'acceptance-attachments'));

drop policy if exists acceptance_files_insert_staff on storage.objects;
create policy acceptance_files_insert_staff on storage.objects
for insert to authenticated
with check (
  bucket_id in ('acceptance-pdfs', 'acceptance-attachments')
  and public.can_manage_acceptances()
);

drop policy if exists acceptance_files_update_staff on storage.objects;
create policy acceptance_files_update_staff on storage.objects
for update to authenticated
using (
  bucket_id in ('acceptance-pdfs', 'acceptance-attachments')
  and public.can_manage_acceptances()
)
with check (
  bucket_id in ('acceptance-pdfs', 'acceptance-attachments')
  and public.can_manage_acceptances()
);

create or replace function public.verify_acceptance(token uuid)
returns table (
  acceptance_number text,
  research_title_ar text,
  research_title_en text,
  recipient_name text,
  recipient_affiliation text,
  accepted_on date,
  document_status public.document_status
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
    a.recipient_name,
    a.recipient_affiliation,
    a.accepted_on,
    a.document_status
  from public.acceptances a
  where a.verification_token = token;
$$;

revoke all on function public.verify_acceptance(uuid) from public;
grant execute on function public.verify_acceptance(uuid) to anon, authenticated;
