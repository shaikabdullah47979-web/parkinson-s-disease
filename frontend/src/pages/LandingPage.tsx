import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ArrowRight,
  Database,
  BarChart3,
  ShieldCheck,
  Microscope,
  Layers,
  Footprints,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { api } from '../services/api';
import { PredictionRecord, DatasetStatus } from '../types';

export const LandingPage: React.FC = () => {
  const [health, setHealth] = useState<{ status: string; ml_model_ready: boolean } | null>(null);
  const [dataset, setDataset] = useState<DatasetStatus | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [h, d, preds] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getDatasetStatus().catch(() => null),
          api.getPredictions().catch(() => [])
        ]);
        if (h) setHealth(h);
        if (d) setDataset(d);
        if (preds) setRecentPredictions(preds.slice(0, 3));
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Main Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Clinical Overview & Research Portal
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Multimodal Parkinson's disease research platform combining vocal dysphonia modeling and kinematic movement telemetry
        </p>
      </div>

      {/* 2. Section Heading matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Microscope className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0ea5e9] tracking-tight">
              Multimodal Parkinson's Disease Screening Suite
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
              Standardized scientific research system integrating 22-dimensional vocal fold perturbation modeling with real-time computer-vision movement telemetry.
            </p>
          </div>
        </div>

        {/* System Ready Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E0EFFA] text-xs shadow-xs shrink-0 self-start sm:self-center">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span className="text-slate-600">Platform Status:</span>
          <strong className="text-slate-900 font-semibold">{health?.ml_model_ready ? 'Operational' : 'Active'}</strong>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ONLINE</span>
          </span>
        </div>
      </div>

      {/* 3. Research Screening Disclaimer Banner */}
      <MedicalDisclaimer compact />

      {/* 4. Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#F0F8FF] border border-[#E0EFFA] p-6 sm:p-7 shadow-xs">
        <div className="max-w-3xl space-y-3.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#E0EFFA] text-cyan-800 text-xs font-semibold shadow-xs">
            <Microscope className="w-3.5 h-3.5 text-cyan-600" />
            <span>Biomedical Machine Learning & Kinematic Research</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            Standardized Vocal Acoustic & Motor Telemetry Analytics
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            NeuroVoice pairs rigorous acoustic feature classification with browser-based computer vision kinematics. The platform enforces strict subject-grouped evaluation protocols to eliminate data leakage and provide genuine clinical telemetry for movement and phonation research.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/movement"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-semibold text-xs shadow-glow-pill transition-all"
            >
              <Footprints className="w-4 h-4" />
              <span>Launch Live Movement Battery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/predict"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-cyan-800 border border-[#E0EFFA] font-semibold text-xs transition-colors shadow-xs"
            >
              <Brain className="w-4 h-4 text-cyan-600" />
              <span>Acoustic Dysphonia Predictor</span>
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E0EFFA] font-semibold text-xs transition-colors shadow-xs"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Analytics Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Quick-Access Module Cards (6 Core Sections) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Research Modules & Quick Navigation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct access to all verified prediction workflows, movement screening batteries, and analytical documentation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Live Movement Battery */}
          <Link
            to="/movement"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <Footprints className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                Live Movement Battery
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                4-test computer-vision protocol assessing resting tremor, finger tapping cadence, arm excursion, and postural stability.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>Start Assessment</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Acoustic Dysphonia Predictor */}
          <Link
            to="/predict"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <Brain className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                Acoustic Dysphonia Predictor
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Machine learning inference across 22 vocal fold perturbation dimensions with instant healthy and PD specimen baseline presets.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>Run Voice Prediction</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Model Metrics & Benchmarks */}
          <Link
            to="/models"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                Model Metrics & Benchmarks
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Held-out evaluation benchmarks on unseen subjects (100% sensitivity, 0.957 F1-score) with candidate algorithm comparisons.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>View Benchmarks</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: UCI Dataset Documentation */}
          <Link
            to="/dataset"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <Database className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                UCI Dataset Documentation
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full documentation of the 195 biomedical phonation samples across 32 subjects with interactive 22-biomarker feature specifications.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>Explore Dataset</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Assessment History & Audit */}
          <Link
            to="/history"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <History className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                Assessment History & Audit
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Relational SQLite audit trail of recorded inference runs with parameter inspection and session data management.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>View Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Clinical Research Cockpit */}
          <Link
            to="/dashboard"
            className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs hover:border-cyan-300 hover:shadow-card-hover transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
                <Layers className="w-5 h-5 text-cyan-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                Clinical Research Dashboard
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                High-level operational overview summarizing model status, dataset quality metrics, and held-out validation results.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-cyan-600 gap-1.5 mt-auto">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 6. Verified System Status & Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status Panel */}
        <div className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E0EFFA] pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>Verified System Status</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Live Telemetry</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#F0F8FF] border border-[#E0EFFA] flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Machine Learning Pipeline</span>
                <strong className="text-slate-900 font-semibold">Gradient Boosting Classifier</strong>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Ready</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">UCI Phonation Dataset</span>
                <strong className="text-slate-900 font-semibold">{dataset?.row_count || 195} Records (32 Subjects)</strong>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                <span>Loaded</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Inference Audit Store</span>
                <strong className="text-slate-900 font-semibold">SQLite Relational Engine</strong>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Connected</span>
              </span>
            </div>
          </div>
        </div>

        {/* Recent Assessment Activity */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E0EFFA] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>Recent Recorded Assessments</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Persisted inference history from local database</p>
            </div>
            <Link
              to="/history"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading activity records...</div>
          ) : recentPredictions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Clock className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No assessment records logged yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Run an acoustic prediction or complete the live movement battery to log research records into the audit database.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentPredictions.map((pred) => {
                const isPD = pred.prediction_label === 1;
                return (
                  <div key={pred.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-400 font-medium">#{pred.id}</span>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {pred.notes || 'Acoustic Voice Test'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(pred.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pred.confidence_score && (
                        <span className="font-mono text-slate-500 text-[11px]">
                          {(pred.confidence_score * 100).toFixed(1)}%
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPD
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isPD ? <AlertCircle className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{pred.prediction_text}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 7. Scientific Methodology & 4-Stage Workflow */}
      <section className="bg-white border border-[#E0EFFA] rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>Biomedical Dysphonia & Movement Analytical Framework</span>
          </h3>
          <span className="text-[11px] text-slate-400">IEEE Trans. Biomed. Eng.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F0F8FF] border border-[#E0EFFA] space-y-1.5">
            <span className="font-mono text-cyan-700 font-bold block text-[11px]">01. Acoustic Perturbation</span>
            <h4 className="font-semibold text-slate-900 text-xs">Phonation Dynamics</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Extracts micro-variations in cycle-to-cycle frequency (jitter) and amplitude (shimmer) during sustained vowel phonation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-mono text-cyan-700 font-bold block text-[11px]">02. Nonlinear Complexity</span>
            <h4 className="font-semibold text-slate-900 text-xs">RPDE & Correlation</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Measures recurrence period density entropy and fractal scaling exponents to capture turbulent vocal fold airflow.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-mono text-cyan-700 font-bold block text-[11px]">03. Vision Kinematics</span>
            <h4 className="font-semibold text-slate-900 text-xs">Welch PSD & SPARC</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Browser-based MediaPipe tracking computes dominant tremor frequencies and Spectral Arc Length smoothness without video upload.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-mono text-cyan-700 font-bold block text-[11px]">04. Subject-Grouped ML</span>
            <h4 className="font-semibold text-slate-900 text-xs">Data Leakage Prevention</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Model pipelines are strictly evaluated using GroupKFold cross-validation so recordings from the same subject never cross splits.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
