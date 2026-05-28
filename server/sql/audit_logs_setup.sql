create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_email text not null default 'System',
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists user_id text,
  add column if not exists user_email text,
  add column if not exists action text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists details jsonb,
  add column if not exists ip_address text,
  add column if not exists created_at timestamptz;

update public.audit_logs
set
  user_email = coalesce(user_email, 'System'),
  action = coalesce(action, 'unknown'),
  entity_type = coalesce(entity_type, 'unknown'),
  details = coalesce(details, '{}'::jsonb),
  created_at = coalesce(created_at, now());

alter table public.audit_logs
  alter column user_email set default 'System',
  alter column user_email set not null,
  alter column action set not null,
  alter column entity_type set not null,
  alter column details set default '{}'::jsonb,
  alter column details set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

notify pgrst, 'reload schema';
