-- Durcissement : l'API n'a jamais besoin de modifier ou supprimer un dossier depuis le client anonyme.
drop policy if exists patients_update on public.patients;
revoke update on public.patients from anon, authenticated;

-- Index pour les lectures triées du registre et des journaux.
create index if not exists patients_created_at_idx on public.patients (created_at desc);
create index if not exists predictions_created_at_idx on public.predictions (created_at desc);
create index if not exists predictions_patient_idx on public.predictions (patient_id);
create index if not exists model_metrics_created_at_idx on public.model_metrics (created_at desc);

-- Garde-fous sur les valeurs stockées.
alter table public.patients
  add constraint patients_proba_range check (predicted_proba is null or (predicted_proba >= 0 and predicted_proba <= 1));
alter table public.predictions
  add constraint predictions_proba_range check (probability >= 0 and probability <= 1);
