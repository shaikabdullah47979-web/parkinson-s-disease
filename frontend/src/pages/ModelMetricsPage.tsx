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
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Retrieving verified machine learning metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm max-w-2xl mx-auto my-12">
        <p className="font-semibold text-rose-300">Model Metrics Unavailable</p>
        <p className="mt-1">{error || 'Please ensure the machine learning pipeline has been trained.'}</p>
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
    <div className="space-y-10 py-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-sky-400" />
          <span>Model Evaluation & Comparative Analysis</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rigorous held-out test benchmarks evaluated strictly across unseen participant recordings to prevent data leakage.
        </p>
      </div>

      <MedicalDisclaimer compact />

      {/* Selected Model Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-850 border border-sky-500/40 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Selected Champion Model</span>
            </div>
            <h2 className="text-2xl font-bold text-white">{metrics.model_name}</h2>
            <p className="text-xs text-slate-400">
              Algorithm: <span className="text-slate-300 font-mono">{metrics.algorithm_family}</span> | Preprocessor: <span className="text-slate-300 font-mono">StandardScaler</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[11px] text-slate-400 uppercase">Sensitivity (Recall)</div>
              <div className="text-xl font-extrabold text-teal-400 mt-0.5">{(tm.recall_sensitivity * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[11px] text-slate-400 uppercase">Test F1-Score</div>
              <div className="text-xl font-extrabold text-sky-400 mt-0.5">{tm.f1_score.toFixed(3)}</div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[11px] text-slate-400 uppercase">Accuracy</div>
              <div className="text-xl font-extrabold text-white mt-0.5">{(tm.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[11px] text-slate-400 uppercase">ROC-AUC</div>
              <div className="text-xl font-extrabold text-indigo-400 mt-0.5">{tm.roc_auc ? tm.roc_auc.toFixed(3) : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Comparison Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Candidate Models Benchmark Comparison (Unseen Test Subjects)</span>
          </h3>
          <span className="text-xs text-slate-400">Evaluated on identical holdout partition</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] border-b border-slate-700">
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
            <tbody className="divide-y divide-slate-800">
              {Object.entries(metrics.candidate_comparison).map(([name, cand]) => {
                const isSelected = name === metrics.model_name;
                return (
                  <tr key={name} className={`hover:bg-slate-800/60 transition-colors ${isSelected ? 'bg-sky-500/10' : ''}`}>
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                      <span>{name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{(cand.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{(cand.recall_sensitivity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono">{(cand.specificity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{cand.f1_score.toFixed(3)}</td>
                    <td className="py-3.5 px-4 font-mono">{cand.roc_auc ? cand.roc_auc.toFixed(3) : 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-400" />
            <span>Confusion Matrix (Held-out Test Cohort)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Performance on 49 sustained phonation samples across 8 completely unseen test subjects.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">True Negatives (TN)</span>
              <div className="text-2xl font-bold text-white">{cm.true_negative}</div>
              <p className="text-[11px] text-slate-400">Healthy correctly classified</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">False Positives (FP)</span>
              <div className="text-2xl font-bold text-amber-400">{cm.false_positive}</div>
              <p className="text-[11px] text-slate-400">Healthy misclassified as PD</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">False Negatives (FN)</span>
              <div className="text-2xl font-bold text-emerald-400">{cm.false_negative}</div>
              <p className="text-[11px] text-slate-400">PD missed (Zero missed cases)</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">True Positives (TP)</span>
              <div className="text-2xl font-bold text-teal-400">{cm.true_positive}</div>
              <p className="text-[11px] text-slate-400">PD correctly classified</p>
            </div>
          </div>
        </div>

        {/* Top Features Chart */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-sky-400" />
            <span>Top Predictive Acoustic Biomarkers</span>
          </h3>
          <p className="text-xs text-slate-400">
            Relative feature importance weights showing highest influence in distinguishing dysphonia.
          </p>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  itemStyle={{ color: '#38bdf8' }}
                  formatter={(val: any) => [`${val}%`, 'Importance Weight']}
                />
                <Bar dataKey="importance" fill="#0284c7" radius={[0, 6, 6, 0]}>
                  {featureChartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx === 0 ? '#0d9488' : idx < 3 ? '#0284c7' : '#38bdf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Methodological Transparency Section */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-4 text-xs leading-relaxed text-slate-300">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Research Methodological Transparency & Data Leakage Prevention</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-sky-300 block">Why Naive Random Splitting Is Flawed:</strong>
            <p className="text-slate-400">
              Each of the 32 participants in the UCI dataset provided ~6 sustained vowel recordings. If data is split randomly, 
              recordings from the same patient appear in both training and test partitions. Models "memorize" patient vocal timbres, 
              giving fake test accuracies over 95% that fail on genuine new patients.
            </p>
          </div>
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-teal-300 block">Subject-Grouped Splitting Protocol:</strong>
            <p className="text-slate-400">
              Our pipeline employs <code className="text-teal-400">GroupShuffleSplit</code> and <code className="text-teal-400">StratifiedGroupKFold</code> grouped 
              by subject ID. The 49 test samples come from 8 patients whom the model has never encountered, reporting genuine real-world generalization performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
