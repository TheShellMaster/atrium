-- Atrium: cabinet de prédiction cardiovasculaire
-- À exécuter dans le SQL Editor Supabase si le MCP est en lecture seule.

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text,
  age integer not null check (age between 1 and 120),
  sex integer not null check (sex in (0, 1)),
  chest_pain integer not null check (chest_pain between 0 and 3),
  resting_bp integer not null,
  cholesterol integer not null,
  fasting_bs integer not null check (fasting_bs in (0, 1)),
  rest_ecg integer not null check (rest_ecg between 0 and 2),
  max_hr integer not null,
  exercise_angina integer not null check (exercise_angina in (0, 1)),
  oldpeak numeric(4,2) not null,
  slope integer not null check (slope between 0 and 2),
  ca integer not null check (ca between 0 and 4),
  thal integer not null check (thal between 0 and 3),
  predicted_label integer,
  predicted_proba numeric(8,6),
  actual_label integer,
  notes text
);

create table if not exists public.model_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model_name text not null,
  accuracy numeric(8,6),
  precision_score numeric(8,6),
  recall numeric(8,6),
  specificity numeric(8,6),
  f1 numeric(8,6),
  auc numeric(8,6),
  vp integer,
  vn integer,
  fp integer,
  fn integer,
  n_train integer,
  n_test integer,
  coefficients jsonb,
  intercept double precision,
  threshold numeric(8,6),
  notes text
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  patient_id uuid references public.patients(id) on delete set null,
  features jsonb not null,
  probability numeric(8,6) not null,
  label integer not null,
  threshold numeric(8,6) not null default 0.5,
  contributions jsonb
);

alter table public.patients enable row level security;
alter table public.model_metrics enable row level security;
alter table public.predictions enable row level security;

drop policy if exists patients_select on public.patients;
drop policy if exists patients_insert on public.patients;
drop policy if exists patients_update on public.patients;
drop policy if exists metrics_select on public.model_metrics;
drop policy if exists metrics_insert on public.model_metrics;
drop policy if exists predictions_select on public.predictions;
drop policy if exists predictions_insert on public.predictions;

create policy patients_select on public.patients for select to anon, authenticated using (true);
create policy patients_insert on public.patients for insert to anon, authenticated with check (true);
create policy patients_update on public.patients for update to anon, authenticated using (true) with check (true);
create policy metrics_select on public.model_metrics for select to anon, authenticated using (true);
create policy metrics_insert on public.model_metrics for insert to anon, authenticated with check (true);
create policy predictions_select on public.predictions for select to anon, authenticated using (true);
create policy predictions_insert on public.predictions for insert to anon, authenticated with check (true);

grant select, insert, update on public.patients to anon, authenticated;
grant select, insert on public.model_metrics to anon, authenticated;
grant select, insert on public.predictions to anon, authenticated;
