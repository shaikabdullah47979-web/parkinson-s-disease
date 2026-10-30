export interface DatasetStatus {
  dataset_name: string;
  row_count: number;
  column_count: number;
  unique_subjects: number;
  target_distribution: Record<string, number>;
  missing_values: number;
  duplicates: number;
  source_url?: string;
  citation?: string;
}

export interface FeatureDescription {
  name: string;
  description: string;
  category: string;
  unit: string;
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface ConfusionMatrix {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}

export interface MetricDetail {
  accuracy: number;
  precision: number;
  recall_sensitivity: number;
  specificity: number;
  f1_score: number;
  roc_auc: number | null;
  confusion_matrix: ConfusionMatrix;
}

export interface ModelMetrics {
  model_name: string;
  algorithm_family: string;
  training_timestamp_utc: string;
  test_metrics: MetricDetail;
  top_features: [string, number][];
  all_feature_importances: Record<string, number>;
  cross_validation_results: Record<string, any>;
  candidate_comparison: Record<string, MetricDetail>;
  disclaimer: string;
}

export interface ModelStatus {
  model_loaded: boolean;
  model_name?: string;
  algorithm_family?: string;
  training_timestamp_utc?: string;
  feature_count?: number;
  status: string;
}

export interface VoiceFeatures {
  "MDVP:Fo(Hz)": number;
  "MDVP:Fhi(Hz)": number;
  "MDVP:Flo(Hz)": number;
  "MDVP:Jitter(%)": number;
  "MDVP:Jitter(Abs)": number;
  "MDVP:RAP": number;
  "MDVP:PPQ": number;
  "Jitter:DDP": number;
  "MDVP:Shimmer": number;
  "MDVP:Shimmer(dB)": number;
  "Shimmer:APQ3": number;
  "Shimmer:APQ5": number;
  "MDVP:APQ": number;
  "Shimmer:DDA": number;
  "NHR": number;
  "HNR": number;
  "RPDE": number;
  "DFA": number;
  "spread1": number;
  "spread2": number;
  "D2": number;
  "PPE": number;
}

export interface PredictionResponse {
  prediction_label: number;
  prediction_text: string;
  confidence_score: number;
  probability_parkinsons: number | null;
  probability_healthy: number | null;
  model_name: string;
  record_id?: number;
  created_at: string;
  disclaimer: string;
}

export interface PredictionRecord {
  id: number;
  user_id?: number;
  model_name: string;
  input_features: Record<string, number>;
  prediction_label: number;
  prediction_text: string;
  confidence_score: number | null;
  created_at: string;
  notes?: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// AI Voice Consultation Types
export type SupportedLanguageCode = 'en-IN' | 'hi-IN' | 'kn-IN' | 'mr-IN' | 'ur-PK';

export interface SupportedLanguageInfo {
  code: SupportedLanguageCode;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
}

export interface ConsultationChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export interface ConsultationConfig {
  server_key_configured: boolean;
  default_model: string;
  supported_languages: SupportedLanguageInfo[];
}

export interface ConsultationSummary {
  title: string;
  date_time: string;
  duration_seconds: number;
  language: string;
  topics_discussed: string[];
  key_questions_asked: string[];
  educational_explanations: string[];
  questions_for_doctor: string[];
  disclaimer: string;
}


