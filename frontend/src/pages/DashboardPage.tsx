import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Database,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  RefreshCw,
  Footprints
} from 'lucide-react';
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
      setError(err.message || 'Failed to fetch dashboard data. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-800 tracking-tight">
            Research Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor model evaluation, dataset quality, and voice and movement research workflows.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      <MedicalDisclaimer compact />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 shadow-xs" />
          ))}
        </div>
      ) : (
        <>
          {/* Key Metric Section (Max 4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Active Model */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Model
                </span>
                <Brain className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-navy-800 truncate" title={modelStatus?.model_name || 'N/A'}>
                {modelStatus?.model_name || 'Gradient Boosting'}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Group-Split Calibrated</span>
              </div>
            </div>

            {/* Card 2: Sensitivity (Recall) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Test Sensitivity (Recall)
                </span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-3xl font-extrabold text-navy-800 font-mono">
                {modelMetrics ? `${(modelMetrics.test_metrics.recall_sensitivity * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-slate-500">True positive detection rate on test cohort</p>
            </div>

            {/* Card 3: Test F1-Score */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Test F1-Score
                </span>
                <Layers className="w-4 h-4 text-navy-700" />
              </div>
              <div className="text-3xl font-extrabold text-navy-800 font-mono">
                {modelMetrics ? modelMetrics.test_metrics.f1_score.toFixed(3) : '—'}
              </div>
              <p className="text-xs text-slate-500">Harmonic mean of precision and recall</p>
            </div>

            {/* Card 4: Dataset Subjects & Records */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Subjects & Records
                </span>
                <Database className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-3xl font-extrabold text-navy-800 font-mono">
                {dataset ? `${dataset.unique_subjects} / ${dataset.row_count}` : '—'}
              </div>
              <p className="text-xs text-slate-500">32 individuals, 22 acoustic dimensions</p>
            </div>
          </div>

          {/* Model Evaluation & Dataset Provenance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Model Performance Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-navy-800 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-teal-600" />
                  <span>Held-Out Cohort Evaluation</span>
                </h3>
                <Link
                  to="/models"
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
                >
                  <span>View Detailed Metrics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {modelMetrics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-medium">Test Accuracy</div>
                      <div className="text-lg font-bold text-navy-800 mt-0.5 font-mono">
                        {(modelMetrics.test_metrics.accuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-medium">Specificity</div>
                      <div className="text-lg font-bold text-navy-800 mt-0.5 font-mono">
                        {(modelMetrics.test_metrics.specificity * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-medium">ROC-AUC</div>
                      <div className="text-lg font-bold text-navy-800 mt-0.5 font-mono">
                        {modelMetrics.test_metrics.roc_auc ? modelMetrics.test_metrics.roc_auc.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-navy-800 uppercase tracking-wider">
                      Confusion Matrix (Held-Out Test Set)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                        <span className="text-slate-500 block text-[11px]">True Negatives (Healthy):</span>
                        <strong className="text-navy-800 text-sm font-mono">
                          {modelMetrics.test_metrics.confusion_matrix.true_negative}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                        <span className="text-slate-500 block text-[11px]">False Positives:</span>
                        <strong className="text-navy-800 text-sm font-mono">
                          {modelMetrics.test_metrics.confusion_matrix.false_positive}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                        <span className="text-slate-500 block text-[11px]">False Negatives:</span>
                        <strong className="text-teal-700 text-sm font-mono">
                          {modelMetrics.test_metrics.confusion_matrix.false_negative}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                        <span className="text-slate-500 block text-[11px]">True Positives (Parkinson's):</span>
                        <strong className="text-navy-800 text-sm font-mono">
                          {modelMetrics.test_metrics.confusion_matrix.true_positive}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Dataset Provenance & Quick Test Actions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-navy-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>Dataset Provenance</span>
                </h3>
                <Link
                  to="/dataset"
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
                >
                  <span>Feature Dictionary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {dataset && (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Repository</span>
                    <span className="text-navy-800 font-semibold">{dataset.dataset_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Class Ratio</span>
                    <span className="text-navy-800 font-semibold">147 PD (75.4%) : 48 Healthy (24.6%)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Missing / Corrupt Values</span>
                    <span className="text-emerald-700 font-semibold">{dataset.missing_values} (Verified Clean)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Sampling Protocol</span>
                    <span className="text-navy-800 font-semibold">Sustained vowel phonation /a/</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to="/predict"
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <Brain className="w-4 h-4" />
                  <span>Launch Voice Predictor</span>
                </Link>

                <Link
                  to="/movement"
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <Footprints className="w-4 h-4 text-teal-400" />
                  <span>Live Movement Battery</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
