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
  actual_label?: number | null;
  learning?: boolean;
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
  sigmoid: { curve: { z: number; p: number }[]; patients: { z: number; p: number; y: number }[] };
  sources: SourceSummary[];
  missing: Record<string, number>;
  n_reference: number;
  n_registry: number;
  trained_at?: string;
  cv?: {
    folds: number;
    accuracy_mean: number;
    accuracy_std: number;
    auc_mean: number;
    auc_std: number;
    recall_mean: number;
    precision_mean: number;
  };
  dataset: string;
  notes: string;
  preview: Record<string, number | string | null>[];
  storage: { supabase: boolean; sqlite: string };
};

export type SourceSummary = {
  source: string;
  label: string;
  n: number;
  positive_rate: number;
  missing_rate: number;
};

export type NumericStat = {
  feature: string;
  label: string;
  unit: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
  missing: number;
  histogram: { bin: string; start: number; count: number }[];
  by_target: { atteint: number; preserve: number };
};

export type Stats = {
  n: number;
  sources: SourceSummary[];
  target: { atteint: number; preserve: number; rate: number };
  numeric: NumericStat[];
  categorical: {
    feature: string;
    label: string;
    levels: { code: number; label: string; count: number; positive_rate: number }[];
  }[];
  correlations: { feature: string; label: string; r: number }[];
  matrix: { columns: string[]; cells: { x: string; y: string; r: number }[] };
};

export type Regression = {
  x: string;
  y: string;
  x_label: string;
  y_label: string;
  x_unit: string;
  y_unit: string;
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  rmse: number;
  n: number;
  points: { x: number; y: number; target: number }[];
  line: { x: number; y: number }[];
  equation: string;
};

export type ImportResult = {
  filename: string;
  rows: number;
  saved: number;
  positives: number;
  confirmed?: number;
  learning?: boolean;
  accuracy: number | null;
  items: {
    full_name: string | null;
    features: Record<string, number>;
    probability: number;
    label: number;
    risk: string;
    actual_label: number | null;
    store?: string;
  }[];
  storage: { supabase: boolean; sqlite: string };
};

export type PatientRow = {
  id: string;
  created_at: string;
  full_name?: string | null;
  age: number;
  sex: number;
  chest_pain?: number;
  resting_bp?: number;
  cholesterol?: number;
  fasting_bs?: number;
  rest_ecg?: number;
  max_hr?: number;
  exercise_angina?: number;
  oldpeak?: number | string;
  slope?: number;
  ca?: number;
  thal?: number;
  predicted_label?: number | null;
  predicted_proba?: number | string | null;
  actual_label?: number | null;
  notes?: string | null;
};
