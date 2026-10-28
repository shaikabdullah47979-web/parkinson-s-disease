import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Send,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceFeatures, PredictionResponse } from '../types';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

// Sample actual records from the UCI dataset for instant demonstration
const PRESET_PARKINSONS: VoiceFeatures = {
  "MDVP:Fo(Hz)": 119.992,
  "MDVP:Fhi(Hz)": 157.302,
  "MDVP:Flo(Hz)": 74.997,
  "MDVP:Jitter(%)": 0.00784,
  "MDVP:Jitter(Abs)": 0.00007,
  "MDVP:RAP": 0.00370,
  "MDVP:PPQ": 0.00554,
  "Jitter:DDP": 0.01109,
  "MDVP:Shimmer": 0.04374,
  "MDVP:Shimmer(dB)": 0.426,
  "Shimmer:APQ3": 0.02182,
  "Shimmer:APQ5": 0.03130,
  "MDVP:APQ": 0.02971,
  "Shimmer:DDA": 0.06545,
  "NHR": 0.02211,
  "HNR": 21.033,
  "RPDE": 0.414783,
  "DFA": 0.815285,
  "spread1": -4.813031,
  "spread2": 0.266482,
  "D2": 2.301442,
  "PPE": 0.284654
};

const PRESET_HEALTHY: VoiceFeatures = {
  "MDVP:Fo(Hz)": 197.076,
  "MDVP:Fhi(Hz)": 206.896,
  "MDVP:Flo(Hz)": 192.055,
  "MDVP:Jitter(%)": 0.00289,
  "MDVP:Jitter(Abs)": 0.00001,
  "MDVP:RAP": 0.00166,
  "MDVP:PPQ": 0.00168,
  "Jitter:DDP": 0.00498,
  "MDVP:Shimmer": 0.01098,
  "MDVP:Shimmer(dB)": 0.097,
  "Shimmer:APQ3": 0.00563,
  "Shimmer:APQ5": 0.00680,
  "MDVP:APQ": 0.00802,
  "Shimmer:DDA": 0.01689,
  "NHR": 0.00339,
  "HNR": 26.775,
  "RPDE": 0.422229,
  "DFA": 0.741367,
  "spread1": -7.348300,
  "spread2": 0.177551,
  "D2": 1.743867,
  "PPE": 0.085569
};

export const PredictionPage: React.FC = () => {
  const [formData, setFormData] = useState<VoiceFeatures>(PRESET_PARKINSONS);
  const [notes, setNotes] = useState<string>('Research trial specimen');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (key: keyof VoiceFeatures, valStr: string) => {
    const val = parseFloat(valStr);
    setFormData((prev) => ({
      ...prev,
      [key]: isNaN(val) ? 0 : val
    }));
  };

  const loadPreset = (preset: VoiceFeatures, label: string) => {
    setFormData(preset);
    setNotes(`Loaded preset: ${label}`);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.predict(formData, notes);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error executing model inference.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Title & Introduction */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Acoustic Dysphonia Feature Predictor
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit 22 vocal fold acoustic perturbation measurements to evaluate against the trained machine learning pipeline.
        </p>
      </div>

      <MedicalDisclaimer compact />

      {/* Preset Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#F0F8FF] border border-sky-200/90 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span>Quick Baseline Presets (UCI Benchmark Records):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadPreset(PRESET_PARKINSONS, "Parkinson's Subject Recording")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs"
          >
            Load PD Specimen
          </button>
          <button
            type="button"
            onClick={() => loadPreset(PRESET_HEALTHY, "Healthy Control Recording")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            Load Healthy Specimen
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(PRESET_PARKINSONS);
              setResult(null);
              setError(null);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-1 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Prediction Result Display */}
      {result && (
        <div className={`p-6 rounded-2xl border transition-all ${
          result.prediction_label === 1
            ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
        }`}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-4">
              <div className="flex items-center space-x-3">
                {result.prediction_label === 1 ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                    Inference Output Classification
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {result.prediction_text}
                  </h3>
                </div>
              </div>
              <div className="text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 shadow-xs self-start sm:self-auto font-mono">
                Pipeline: <strong className="text-slate-900">{result.model_name}</strong>
              </div>
            </div>

            {/* Probabilities */}
            {result.probability_parkinsons !== null && result.probability_healthy !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Confidence: {(result.confidence_score * 100).toFixed(1)}%</span>
                  <span>PD: {(result.probability_parkinsons * 100).toFixed(1)}% | Healthy: {(result.probability_healthy * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-amber-500 transition-all duration-500"
                    style={{ width: `${result.probability_parkinsons * 100}%` }}
                    title={`Parkinson's Probability: ${(result.probability_parkinsons * 100).toFixed(1)}%`}
                  />
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${result.probability_healthy * 100}%` }}
                    title={`Healthy Control Probability: ${(result.probability_healthy * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-white/90 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-600 flex items-start gap-2 shadow-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{result.disclaimer}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Feature Input Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category 1: Fundamental Frequency */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>1. Fundamental Vocal Frequency Measures (Hz)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Average Frequency (MDVP:Fo)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={formData["MDVP:Fo(Hz)"]}
                onChange={(e) => handleInputChange("MDVP:Fo(Hz)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Typical range: 88 – 260 Hz</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Maximum Frequency (MDVP:Fhi)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={formData["MDVP:Fhi(Hz)"]}
                onChange={(e) => handleInputChange("MDVP:Fhi(Hz)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Upper pitch boundary in phonation</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Minimum Frequency (MDVP:Flo)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={formData["MDVP:Flo(Hz)"]}
                onChange={(e) => handleInputChange("MDVP:Flo(Hz)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Lower pitch boundary in phonation</span>
            </div>
          </div>
        </div>

        {/* Category 2: Jitter (Frequency Variation) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>2. Frequency Perturbation (Jitter Measures)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jitter Percentage (%)</label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData["MDVP:Jitter(%)"]}
                onChange={(e) => handleInputChange("MDVP:Jitter(%)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Absolute Jitter (Abs)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData["MDVP:Jitter(Abs)"]}
                onChange={(e) => handleInputChange("MDVP:Jitter(Abs)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">RAP</label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData["MDVP:RAP"]}
                onChange={(e) => handleInputChange("MDVP:RAP", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">PPQ (5-point)</label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData["MDVP:PPQ"]}
                onChange={(e) => handleInputChange("MDVP:PPQ", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jitter:DDP</label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData["Jitter:DDP"]}
                onChange={(e) => handleInputChange("Jitter:DDP", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Category 3: Shimmer (Amplitude Variation) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>3. Amplitude Perturbation (Shimmer Measures)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shimmer (Local)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["MDVP:Shimmer"]}
                onChange={(e) => handleInputChange("MDVP:Shimmer", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shimmer (dB)</label>
              <input
                type="number"
                step="0.001"
                required
                value={formData["MDVP:Shimmer(dB)"]}
                onChange={(e) => handleInputChange("MDVP:Shimmer(dB)", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">APQ3</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["Shimmer:APQ3"]}
                onChange={(e) => handleInputChange("Shimmer:APQ3", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">APQ5</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["Shimmer:APQ5"]}
                onChange={(e) => handleInputChange("Shimmer:APQ5", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">MDVP:APQ</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["MDVP:APQ"]}
                onChange={(e) => handleInputChange("MDVP:APQ", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shimmer:DDA</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["Shimmer:DDA"]}
                onChange={(e) => handleInputChange("Shimmer:DDA", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Category 4: Noise & Nonlinear Dynamics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>4. Noise Harmonics & Nonlinear Dynamical Complexity</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">NHR (Noise-to-Harmonics)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["NHR"]}
                onChange={(e) => handleInputChange("NHR", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">HNR (Harmonics dB)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData["HNR"]}
                onChange={(e) => handleInputChange("HNR", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">RPDE (Recurrence Entropy)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["RPDE"]}
                onChange={(e) => handleInputChange("RPDE", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">DFA (Fractal Exponent)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["DFA"]}
                onChange={(e) => handleInputChange("DFA", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">spread1 (Nonlinear F0 Var 1)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["spread1"]}
                onChange={(e) => handleInputChange("spread1", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">spread2 (Nonlinear F0 Var 2)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["spread2"]}
                onChange={(e) => handleInputChange("spread2", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">D2 (Correlation Dimension)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["D2"]}
                onChange={(e) => handleInputChange("D2", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">PPE (Pitch Period Entropy)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData["PPE"]}
                onChange={(e) => handleInputChange("PPE", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
          <label className="block text-xs text-slate-700 font-semibold">
            Specimen Identifier / Researcher Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Clinical trial session 3 specimen"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-semibold text-sm shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Acoustic Model...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Execute Prediction Pipeline</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
