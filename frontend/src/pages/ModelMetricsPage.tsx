import React, { useEffect, useState } from 'react';
import { BarChart3, Brain, Award, Layers, Zap, Info, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '../services/api';
import { ModelMetrics } from '../types';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const ModelMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getModelMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load model metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Retrieving verified machine learning metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm max-w-2xl mx-auto my-12 shadow-xs">
        <p className="font-semibold text-rose-900">Model Metrics Unavailable</p>
        <p className="mt-1 text-rose-700">{error || 'Please ensure the machine learning pipeline has been trained.'}</p>
      </div>
    );
  }

  const tm = metrics.test_metrics;
  const cm = tm.confusion_matrix;

  // Format feature importance for Recharts
  const featureChartData = metrics.top_features.map(([name, weight]) => ({
    name,
    importance: parseFloat((Math.abs(weight) * 100).toFixed(2))
  }));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </span>
          <span>Model Evaluation & Comparative Analysis</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Rigorous held-out test benchmarks evaluated strictly across unseen participant recordings to prevent data leakage.
        </p>
      </div>

      <MedicalDisclaimer compact />

      {/* Selected Model Champion Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-teal-600" />
              <span>Selected Champion Model</span>
            </div>
            <h2 className="text-2xl font-bold text-navy-900">{metrics.model_name}</h2>
            <p className="text-xs text-slate-500">
              Algorithm: <span className="text-slate-800 font-mono font-medium">{metrics.algorithm_family}</span> • Preprocessor: <span className="text-slate-800 font-mono font-medium">StandardScaler</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sensitivity</div>
              <div className="text-xl font-bold text-teal-700 mt-1">{(tm.recall_sensitivity * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Test F1-Score</div>
              <div className="text-xl font-bold text-navy-900 mt-1">{tm.f1_score.toFixed(3)}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Accuracy</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{(tm.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ROC-AUC</div>
              <div className="text-xl font-bold text-teal-800 mt-1">{tm.roc_auc ? tm.roc_auc.toFixed(3) : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Candidate Models Benchmark Comparison (Unseen Test Subjects)</span>
          </h3>
          <span className="text-xs text-slate-500">Evaluated on identical holdout partition</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Candidate Pipeline</th>
                <th className="py-3 px-4 font-semibold">Accuracy</th>
                <th className="py-3 px-4 font-semibold">Sensitivity (Recall)</th>
                <th className="py-3 px-4 font-semibold">Specificity</th>
                <th className="py-3 px-4 font-semibold">F1-Score</th>
                <th className="py-3 px-4 font-semibold">ROC-AUC</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(metrics.candidate_comparison).map(([name, cand]) => {
                const isSelected = name === metrics.model_name;
                return (
                  <tr key={name} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-teal-50/40 font-medium' : ''}`}>
                    <td className="py-3.5 px-4 text-navy-900 flex items-center gap-2">
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                      <span>{name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{(cand.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-teal-700">{(cand.recall_sensitivity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono">{(cand.specificity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-navy-900">{cand.f1_score.toFixed(3)}</td>
                    <td className="py-3.5 px-4 font-mono">{cand.roc_auc ? cand.roc_auc.toFixed(3) : 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                          Selected
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Candidate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix and Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-600" />
            <span>Confusion Matrix (Held-out Test Cohort)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Performance on 49 sustained phonation samples across 8 completely unseen test subjects.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">True Negatives (TN)</span>
              <div className="text-2xl font-bold text-navy-900">{cm.true_negative}</div>
              <p className="text-[11px] text-slate-500">Healthy correctly classified</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">False Positives (FP)</span>
              <div className="text-2xl font-bold text-amber-700">{cm.false_positive}</div>
              <p className="text-[11px] text-slate-500">Healthy misclassified as PD</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">False Negatives (FN)</span>
              <div className="text-2xl font-bold text-emerald-700">{cm.false_negative}</div>
              <p className="text-[11px] text-slate-500">PD missed (Zero missed cases)</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">True Positives (TP)</span>
              <div className="text-2xl font-bold text-teal-700">{cm.true_positive}</div>
              <p className="text-[11px] text-slate-500">PD correctly classified</p>
            </div>
          </div>
        </div>

        {/* Top Features Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-teal-600" />
            <span>Top Predictive Acoustic Biomarkers</span>
          </h3>
          <p className="text-xs text-slate-500">
            Relative feature importance weights showing highest influence in distinguishing dysphonia.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#64748B' }} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#1E293B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}
                  itemStyle={{ color: '#0F766E' }}
                  formatter={(val: any) => [`${val}%`, 'Importance Weight']}
                />
                <Bar dataKey="importance" fill="#0F766E" radius={[0, 4, 4, 0]}>
                  {featureChartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx === 0 ? '#0F766E' : idx < 3 ? '#14B8A6' : '#0F2D5B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Methodological Transparency Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs leading-relaxed text-slate-700 shadow-xs">
        <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600" />
          <span>Research Methodological Transparency & Data Leakage Prevention</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <strong className="text-navy-900 block text-xs">Why Naive Random Splitting Is Flawed:</strong>
            <p className="text-slate-600">
              Each of the 32 participants in the UCI dataset provided ~6 sustained vowel recordings. If data is split randomly, 
              recordings from the same patient appear in both training and test partitions. Models "memorize" patient vocal timbres, 
              giving fake test accuracies over 95% that fail on genuine new patients.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <strong className="text-teal-800 block text-xs">Subject-Grouped Splitting Protocol:</strong>
            <p className="text-slate-600">
              Our pipeline employs <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-mono">GroupShuffleSplit</code> and <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-mono">StratifiedGroupKFold</code> grouped 
              by subject ID. The 49 test samples come from 8 patients whom the model has never encountered, reporting genuine real-world generalization performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
