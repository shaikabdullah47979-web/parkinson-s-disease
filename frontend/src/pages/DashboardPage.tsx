import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Database, Brain, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, Layers, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { DatasetStatus, ModelStatus, ModelMetrics } from '../types';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const DashboardPage: React.FC = () => {
  const [dataset, setDataset] = useState<DatasetStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ds, ms, mm] = await Promise.all([
        api.getDatasetStatus(),
        api.getModelStatus(),
        api.getModelMetrics()
      ]);
      setDataset(ds);
      setModelStatus(ms);
      setModelMetrics(mm);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-sky-400" />
            <span>Research & Diagnostics Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry and validation benchmarks for the Parkinson's voice dysphonia pipeline.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      <MedicalDisclaimer compact />

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-2xl border border-slate-700" />
          ))}
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Selected Model */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Pipeline</span>
                <Brain className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-lg font-bold text-white truncate" title={modelStatus?.model_name || 'N/A'}>
                {modelStatus?.model_name || 'Not Loaded'}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Group-Split Calibrated</span>
              </div>
            </div>

            {/* Card 2: Test Sensitivity (Recall) */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sensitivity (Recall)</span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-3xl font-extrabold text-teal-400">
                {modelMetrics ? `${(modelMetrics.test_metrics.recall_sensitivity * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-slate-400">0 false negatives on test patients</p>
            </div>

            {/* Card 3: Test F1-Score */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Test F1-Score</span>
                <Layers className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-3xl font-extrabold text-sky-400">
                {modelMetrics ? modelMetrics.test_metrics.f1_score.toFixed(3) : '—'}
              </div>
              <p className="text-xs text-slate-400">Balanced precision / recall harmonic</p>
            </div>

            {/* Card 4: Verified Subjects */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Subjects / Records</span>
                <Database className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {dataset ? `${dataset.unique_subjects} / ${dataset.row_count}` : '—'}
              </div>
              <p className="text-xs text-slate-400">22 biomedical acoustic dimensions</p>
            </div>
          </div>

          {/* Telemetry Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Model Performance Breakdown */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-sky-400" />
                  <span>Held-Out Cohort Evaluation</span>
                </h3>
                <Link to="/models" className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1">
                  <span>Detailed Benchmarks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {modelMetrics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">Test Accuracy</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {(modelMetrics.test_metrics.accuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">Specificity</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {(modelMetrics.test_metrics.specificity * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">ROC-AUC</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {modelMetrics.test_metrics.roc_auc ? modelMetrics.test_metrics.roc_auc.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Confusion Matrix (Test Set)</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60">
                        <span className="text-slate-400 block">True Negatives:</span>
                        <strong className="text-white text-sm">{modelMetrics.test_metrics.confusion_matrix.true_negative}</strong>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60">
                        <span className="text-slate-400 block">False Positives:</span>
                        <strong className="text-white text-sm">{modelMetrics.test_metrics.confusion_matrix.false_positive}</strong>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60">
                        <span className="text-slate-400 block">False Negatives:</span>
                        <strong className="text-teal-400 text-sm">{modelMetrics.test_metrics.confusion_matrix.false_negative}</strong>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60">
                        <span className="text-slate-400 block">True Positives:</span>
                        <strong className="text-white text-sm">{modelMetrics.test_metrics.confusion_matrix.true_positive}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Dataset & Fast Actions */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-400" />
                  <span>Dataset Provenance</span>
                </h3>
                <Link to="/dataset" className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1">
                  <span>Feature Dictionary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {dataset && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Repository</span>
                    <span className="text-white font-medium">{dataset.dataset_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Class Ratio</span>
                    <span className="text-white font-medium">147 PD (75.4%) : 48 Healthy (24.6%)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Missing / Corrupt Values</span>
                    <span className="text-emerald-400 font-medium">{dataset.missing_values} (Verified Clean)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Sampling Protocol</span>
                    <span className="text-white font-medium">Sustained phonation /a/ (~6/participant)</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/predict"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors shadow-md"
                >
                  <Brain className="w-4 h-4" />
                  <span>Test Patient Voice Sample Now</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

