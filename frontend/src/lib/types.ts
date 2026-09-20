export type HeartMood = "idle" | "contract" | "expand" | "warn";

export type Term = {
  id: string;
  word: string;
  group: string;
  heart: HeartMood;
  def: string;
};

export type Formula = {
  id: string;
  title: string;
  latex: string;
  plain: string;
};

export type Contribution = {
  feature: string;
  label: string;
  value: number;
  contribution: number;
};

export type Prediction = {
  probability: number;
  label: number;
  threshold: number;
  risk: string;
  contributions: Contribution[];
  logit: number;
  patient?: Record<string, unknown> | null;
  features?: Record<string, number>;
  full_name?: string | null;
};

export type Catalog = {
  features: string[];
  meta: Record<string, { label: string; unit: string; hint: string }>;
  choices: Record<string, [number, string][]>;
  defaults: Record<string, number>;
  terms: Term[];
  formulas: Formula[];
};

export type ModelCard = {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  auc: number;
  vp: number;
  vn: number;
  fp: number;
  fn: number;
  n_train: number;
  n_test: number;
  n_total: number;
  threshold: number;
  intercept: number;
  coefficients: { name: string; coef: number }[];
  roc: { fpr: number[]; tpr: number[]; auc: number };
  dataset: string;
  notes: string;
  preview: Record<string, number>[];
  storage: { supabase: boolean; sqlite: string };
};

export type PatientRow = {
  id: string;
  created_at: string;
  full_name?: string | null;
  age: number;
  sex: number;
  predicted_label?: number | null;
  predicted_proba?: number | null;
  cholesterol?: number;
  resting_bp?: number;
};
