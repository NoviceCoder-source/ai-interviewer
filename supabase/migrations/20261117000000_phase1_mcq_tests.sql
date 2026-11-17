-- Phase 1: question bank, topics, MCQ test engine, rule-based scoring, anti-cheating log,
-- credits and student levels.
--
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- It is safe to run more than once.
--
-- Trust model (same as the rest of the app): the browser can only READ a few harmless rows.
-- Every write — and every read that could leak correct answers — goes through the Next.js
-- API routes, which use the service-role key.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Credits
-- ---------------------------------------------------------------------------

alter table public.site_settings
  add column if not exists default_credits integer not null default 100 check (default_credits >= 0);

alter table public.profiles
  add column if not exists credits integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_credits_non_negative') then
    alter table public.profiles add constraint profiles_credits_non_negative check (credits >= 0);
  end if;
end $$;

-- Every change to a balance, so each number on the dashboard can be traced back.
create table if not exists public.credit_ledger (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  change        integer not null,
  balance_after integer not null,
  reason        text not null,
  ref_id        uuid,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Topics and question bank
-- ---------------------------------------------------------------------------

create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (subject, name)
);

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  topic_id      uuid not null references public.topics(id) on delete restrict,
  difficulty    text not null check (difficulty in ('basic', 'intermediate', 'advanced')),
  question      text not null,
  options       text[] not null check (array_length(options, 1) between 2 and 6),
  correct_index smallint not null check (correct_index >= 0 and correct_index < array_length(options, 1)),
  explanation   text,
  -- Lower-cased, punctuation-free question text: the exact-duplicate key.
  normalized    text not null,
  created_at    timestamptz not null default now(),
  unique (subject, normalized)
);
create index if not exists questions_pick_idx on public.questions (subject, topic_id, difficulty);

-- ---------------------------------------------------------------------------
-- 3. Test configuration (one row per test level)
-- ---------------------------------------------------------------------------

create table if not exists public.test_configs (
  level              text primary key check (level in ('basic', 'intermediate', 'advanced')),
  basic_count        integer not null check (basic_count >= 0),
  intermediate_count integer not null check (intermediate_count >= 0),
  advanced_count     integer not null check (advanced_count >= 0),
  duration_minutes   integer not null check (duration_minutes between 5 and 240),
  negative_marking   boolean not null default false,
  -- Fraction of the question's marks deducted for a wrong answer (0.25 = a quarter).
  negative_mark      numeric(4, 2) not null default 0.25 check (negative_mark >= 0 and negative_mark <= 1),
  credit_cost        integer not null default 5 check (credit_cost >= 0),
  updated_at         timestamptz not null default now(),
  -- Marks: basic 1, intermediate 2, advanced 4. Every test totals exactly 50 marks, minimum 20 questions.
  constraint test_configs_total_50 check (basic_count + 2 * intermediate_count + 4 * advanced_count = 50),
  constraint test_configs_min_20 check (basic_count + intermediate_count + advanced_count >= 20)
);

-- ~70/20/10, ~50/30/20 and 30/30/40 question splits that land exactly on 50 marks.
insert into public.test_configs (level, basic_count, intermediate_count, advanced_count, duration_minutes, credit_cost)
values
  ('basic',        24, 7, 3, 40, 5),
  ('intermediate', 14, 8, 5, 45, 8),
  ('advanced',      6, 6, 8, 50, 10)
on conflict (level) do nothing;

-- Optional per-subject price; falls back to test_configs.credit_cost.
create table if not exists public.credit_costs (
  subject text not null,
  level   text not null check (level in ('basic', 'intermediate', 'advanced')),
  cost    integer not null check (cost >= 0),
  primary key (subject, level)
);

-- ---------------------------------------------------------------------------
-- 4. Test attempts
-- ---------------------------------------------------------------------------

create table if not exists public.test_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  subject          text not null,
  topic_id         uuid,
  topic_name       text,
  level            text not null check (level in ('basic', 'intermediate', 'advanced')),
  -- Snapshot of the picked questions (incl. correct_index) so reports survive bank edits.
  questions        jsonb not null,
  answers          jsonb not null default '{}'::jsonb,
  status           text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at       timestamptz not null,
  deadline         timestamptz not null,
  submitted_at     timestamptz,
  submit_reason    text check (submit_reason in ('manual', 'time_up', 'tab_switch_limit', 'away_timeout', 'left_test')),
  tab_switches     integer not null default 0,
  away_since       timestamptz,
  proctor_log      jsonb not null default '[]'::jsonb,
  negative_marking boolean not null,
  negative_mark    numeric(4, 2) not null,
  credit_cost      integer not null,
  result           jsonb,
  report           jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists test_attempts_user_idx on public.test_attempts (user_id, created_at desc);
create index if not exists test_attempts_open_idx on public.test_attempts (user_id) where status = 'in_progress';

-- ---------------------------------------------------------------------------
-- 5. Student levels (admin groups tests into levels)
-- ---------------------------------------------------------------------------

create table if not exists public.student_levels (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  position     integer not null default 0,
  -- [{ "level": "basic", "count": 5, "min_score": 25, "subject": null }]
  requirements jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Functions (service role only)
-- ---------------------------------------------------------------------------

-- Adds or removes credits atomically and writes the ledger row.
create or replace function public.adjust_credits(p_user uuid, p_change integer, p_reason text, p_by uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  update profiles set credits = credits + p_change
   where id = p_user and credits + p_change >= 0
  returning credits into v_balance;
  if not found then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into credit_ledger (user_id, change, balance_after, reason, created_by)
  values (p_user, p_change, v_balance, p_reason, p_by);
  return v_balance;
end $$;

-- Charges the test price and creates the attempt in ONE transaction.
-- The balance row lock also stops two tabs starting two tests for the price of one.
create or replace function public.start_test_attempt(
  p_user uuid,
  p_cost integer,
  p_subject text,
  p_topic_id uuid,
  p_topic_name text,
  p_level text,
  p_questions jsonb,
  p_started_at timestamptz,
  p_deadline timestamptz,
  p_negative_marking boolean,
  p_negative_mark numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_id uuid;
begin
  update profiles set credits = credits - p_cost
   where id = p_user and credits >= p_cost
  returning credits into v_balance;
  if not found then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  if exists (
    select 1 from test_attempts
     where user_id = p_user and status = 'in_progress' and deadline > p_started_at
  ) then
    raise exception 'ACTIVE_ATTEMPT';
  end if;

  insert into test_attempts (
    user_id, subject, topic_id, topic_name, level, questions, started_at, deadline,
    negative_marking, negative_mark, credit_cost
  ) values (
    p_user, p_subject, p_topic_id, p_topic_name, p_level, p_questions, p_started_at, p_deadline,
    p_negative_marking, p_negative_mark, p_cost
  )
  returning id into v_id;

  insert into credit_ledger (user_id, change, balance_after, reason, ref_id)
  values (
    p_user, -p_cost, v_balance,
    format('%s %s test%s', p_subject, initcap(p_level), coalesce(' · ' || p_topic_name, '')),
    v_id
  );
  return v_id;
end $$;

-- Saves (or clears, when p_option is null) one answer atomically, so quick clicks on
-- different questions can never overwrite each other. Returns false if the test is closed.
create or replace function public.set_test_answer(
  p_attempt uuid,
  p_user uuid,
  p_question text,
  p_option integer,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update test_attempts
     set answers = case
           when p_option is null then answers - p_question
           else jsonb_set(answers, array[p_question], to_jsonb(p_option))
         end
   where id = p_attempt
     and user_id = p_user
     and status = 'in_progress'
     and deadline + interval '5 seconds' > p_now;
  return found;
end $$;

revoke all on function public.set_test_answer(uuid, uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.set_test_answer(uuid, uuid, text, integer, timestamptz) to service_role;

revoke all on function public.adjust_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.start_test_attempt(uuid, integer, text, uuid, text, text, jsonb, timestamptz, timestamptz, boolean, numeric) from public, anon, authenticated;
grant execute on function public.adjust_credits(uuid, integer, text, uuid) to service_role;
grant execute on function public.start_test_attempt(uuid, integer, text, uuid, text, text, jsonb, timestamptz, timestamptz, boolean, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.credit_ledger  enable row level security;
alter table public.topics         enable row level security;
alter table public.questions      enable row level security;
alter table public.test_configs   enable row level security;
alter table public.credit_costs   enable row level security;
alter table public.test_attempts  enable row level security;
alter table public.student_levels enable row level security;

drop policy if exists "credit_ledger: read own" on public.credit_ledger;
create policy "credit_ledger: read own"
  on public.credit_ledger for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "topics: read" on public.topics;
create policy "topics: read" on public.topics for select to authenticated using (true);

drop policy if exists "test_configs: read" on public.test_configs;
create policy "test_configs: read" on public.test_configs for select to authenticated using (true);

drop policy if exists "credit_costs: read" on public.credit_costs;
create policy "credit_costs: read" on public.credit_costs for select to authenticated using (true);

drop policy if exists "student_levels: read" on public.student_levels;
create policy "student_levels: read" on public.student_levels for select to authenticated using (true);

-- questions and test_attempts get NO policy: they hold correct answers, so only the server reads them.

-- ---------------------------------------------------------------------------
-- 8. Give existing students their starting credits (once)
-- ---------------------------------------------------------------------------

do $$
declare
  v_default integer;
  r record;
begin
  select default_credits into v_default from site_settings where id = 1;
  v_default := coalesce(v_default, 100);
  for r in
    select p.id from profiles p
     where coalesce(p.role, 'student') = 'student'
       and not exists (select 1 from credit_ledger l where l.user_id = p.id)
  loop
    perform adjust_credits(r.id, v_default, 'Starting credits');
  end loop;
end $$;

commit;
