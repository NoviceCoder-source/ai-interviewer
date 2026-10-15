-- Lock down direct (browser) database access.
--
-- After this migration the browser, using the public anon key, can only:
--   * read its OWN profile row and its OWN interviews
--   * read site_settings (branding is public)
-- Everything else (login lookup, admin views, writes, grading, resume upload)
-- goes through the Next.js API routes, which use the service-role key.
--
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- It is safe to run more than once.

begin;

-- 1. Remove every existing policy on these tables so no old "allow all" rule survives.
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'interviews', 'admin_config', 'site_settings')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2. Make sure RLS is on everywhere.
alter table public.profiles      enable row level security;
alter table public.interviews    enable row level security;
alter table public.admin_config  enable row level security;
alter table public.site_settings enable row level security;

-- 3. Read-only policies. No insert/update/delete policies: writes are server-only.
create policy "profiles: read own row"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "interviews: read own"
  on public.interviews for select to authenticated
  using (auth.uid() = user_id);

create policy "site_settings: public read"
  on public.site_settings for select to anon, authenticated
  using (true);

-- admin_config gets no policy at all: only the service role can read the secret code.

-- 4. Resumes are personal documents: make the bucket private.
--    Files stay in place; only the server (service role) can read them now.
update storage.buckets set public = false where id = 'resumes';

commit;
