import {
  DatasetStatus,
  FeatureDescription,
  ModelStatus,
  ModelMetrics,
  VoiceFeatures,
  PredictionResponse,
  PredictionRecord,
  User,
  AuthResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('parkinsons_jwt_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('parkinsons_jwt_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('parkinsons_jwt_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          errorDetail = errJson.detail.map((d: any) => `${d.loc?.join('.')} - ${d.msg}`).join(', ');
        }
      }
    } catch {
      // fallback to status text
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

export const api = {
  // Health & System
  getHealth: () => request<{ status: string; ml_model_ready: boolean }>('/health'),

  // Dataset
  getDatasetStatus: () => request<DatasetStatus>('/dataset/status'),
  getDatasetFeatures: () => request<FeatureDescription[]>('/dataset/features'),

  // Model
  getModelStatus: () => request<ModelStatus>('/model/status'),
  getModelMetrics: () => request<ModelMetrics>('/model/metrics'),

  // Prediction
  predict: (features: VoiceFeatures, notes?: string) =>
    request<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify({ features, notes })
    }),

  getPredictions: () => request<PredictionRecord[]>('/predictions'),
  getPredictionById: (id: number) => request<PredictionRecord>(`/predictions/${id}`),
  deletePrediction: (id: number) =>
    request<null>(`/predictions/${id}`, { method: 'DELETE' }),

  // Auth
  register: (email: string, password: string, fullName?: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName })
    }),

  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Invalid email or password');
    }

    const data: AuthResponse = await response.json();
    setAuthToken(data.access_token);
    return data;
  },

  getMe: () => request<User>('/auth/me'),

  // AI Voice Consultation
  getConsultationConfig: () => request<any>('/consultation/config'),

  chatConsultation: (
    message: string,
    language: string,
    history: any[],
    patientContext?: any,
    apiKey?: string
  ) =>
    request<{
      reply: string;
      language: string;
      is_rtl: boolean;
      disclaimer: string;
      model_used: string;
    }>('/consultation/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        language,
        history,
        patient_context: patientContext,
        api_key: apiKey || undefined
      })
    }),

  generateConsultationSummary: (
    history: any[],
    language: string,
    durationSeconds: number,
    apiKey?: string
  ) =>
    request<any>('/consultation/summary', {
      method: 'POST',
      body: JSON.stringify({
        history,
        language,
        duration_seconds: durationSeconds,
        api_key: apiKey || undefined
      })
    })
};

