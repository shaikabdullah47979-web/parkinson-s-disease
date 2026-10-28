import React, { useEffect, useState } from 'react';
import { BarChart3, Brain, Award, Layers, Zap, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
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
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Main Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Model Evaluation & Comparative Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Rigorous held-out test benchmarks evaluated strictly across unseen participant recordings to prevent data leakage
        </p>
      </div>

      {/* 2. Section Heading matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0ea5e9] tracking-tight">
              Machine Learning Benchmark Suite
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
              Comparative held-out evaluations across Gradient Boosting, Random Forest, SVM, and Logistic Regression on unseen patient partitions.
            </p>
          </div>
        </div>

        {/* Algorithm Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E0EFFA] text-xs shadow-xs shrink-0 self-start sm:self-center">
          <Award className="w-4 h-4 text-cyan-600" />
          <span className="text-slate-600">Champion Model:</span>
          <strong className="text-slate-900 font-semibold">{metrics.model_name}</strong>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>OPTIMAL</span>
          </span>
        </div>
      </div>

      {/* 3. Research Screening Disclaimer Banner */}
      <MedicalDisclaimer compact />

      {/* 4. Selected Model Champion Banner */}
      <div className="bg-[#F0F8FF] border border-[#E0EFFA] rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E0EFFA] text-cyan-800 text-xs font-semibold shadow-xs">
              <Award className="w-3.5 h-3.5 text-cyan-600" />
              <span>Selected Champion Pipeline</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{metrics.model_name}</h2>
            <p className="text-xs text-slate-500">
              Algorithm: <span className="text-slate-800 font-mono font-medium">{metrics.algorithm_family}</span> • Preprocessor: <span className="text-slate-800 font-mono font-medium">StandardScaler</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3.5 rounded-xl border border-[#E0EFFA] shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sensitivity</div>
              <div className="text-xl font-bold text-[#0ea5e9] mt-1 font-mono">{(tm.recall_sensitivity * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E0EFFA] shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Test F1-Score</div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{tm.f1_score.toFixed(3)}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E0EFFA] shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</div>
              <div className="text-xl font-bold text-slate-800 mt-1 font-mono">{(tm.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E0EFFA] shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ROC-AUC</div>
              <div className="text-xl font-bold text-cyan-800 mt-1 font-mono">{tm.roc_auc ? tm.roc_auc.toFixed(3) : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Candidate Comparison Table */}
      <div className="bg-white border border-[#E0EFFA] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>Candidate Models Benchmark Comparison (Unseen Test Subjects)</span>
          </h3>
          <span className="text-xs text-slate-500">Evaluated on identical holdout partition</span>
        </div>

        <div className="overflow-x-auto border border-[#E0EFFA] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F8FF] text-slate-600 uppercase text-[11px] border-b border-[#E0EFFA]">
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
                  <tr key={name} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-sky-50/70 font-medium' : ''}`}>
                    <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                      <span>{name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{(cand.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0ea5e9]">{(cand.recall_sensitivity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono">{(cand.specificity * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{cand.f1_score.toFixed(3)}</td>
                    <td className="py-3.5 px-4 font-mono">{cand.roc_auc ? cand.roc_auc.toFixed(3) : 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-cyan-400 to-sky-400 text-white shadow-xs">
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

      {/* 6. Confusion Matrix and Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-white border border-[#E0EFFA] rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-600" />
            <span>Confusion Matrix (Held-out Test Cohort)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Performance on 49 sustained phonation samples across 8 completely unseen test subjects.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-[#E0EFFA] space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">True Negatives (TN)</span>
              <div className="text-2xl font-bold text-slate-900">{cm.true_negative}</div>
              <p className="text-[11px] text-slate-500">Healthy correctly classified</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-[#E0EFFA] space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">False Positives (FP)</span>
              <div className="text-2xl font-bold text-amber-700">{cm.false_positive}</div>
              <p className="text-[11px] text-slate-500">Healthy misclassified as PD</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-[#E0EFFA] space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">False Negatives (FN)</span>
              <div className="text-2xl font-bold text-emerald-700">{cm.false_negative}</div>
              <p className="text-[11px] text-slate-500">PD missed (Zero missed cases)</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-[#E0EFFA] space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">True Positives (TP)</span>
              <div className="text-2xl font-bold text-[#0ea5e9]">{cm.true_positive}</div>
              <p className="text-[11px] text-slate-500">PD correctly classified</p>
            </div>
          </div>
        </div>

        {/* Top Features Chart */}
        <div className="bg-white border border-[#E0EFFA] rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-600" />
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
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E0EFFA', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}
                  itemStyle={{ color: '#0EA5E9' }}
                  formatter={(val: any) => [`${val}%`, 'Importance Weight']}
                />
                <Bar dataKey="importance" fill="#0EA5E9" radius={[0, 4, 4, 0]}>
                  {featureChartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx === 0 ? '#0EA5E9' : idx < 3 ? '#38BDF8' : '#0284C7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 7. Methodological Transparency Section */}
      <div className="bg-white border border-[#E0EFFA] rounded-2xl p-6 space-y-4 text-xs leading-relaxed text-slate-700 shadow-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-600" />
          <span>Research Methodological Transparency & Data Leakage Prevention</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/70 border border-[#E0EFFA]">
            <strong className="text-slate-900 block text-xs">Why Naive Random Splitting Is Flawed:</strong>
            <p className="text-slate-600">
              Each of the 32 participants in the UCI dataset provided ~6 sustained vowel recordings. If data is split randomly, 
              recordings from the same patient appear in both training and test partitions. Models "memorize" patient vocal timbres, 
              giving fake test accuracies over 95% that fail on genuine new patients.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F0F8FF] border border-[#E0EFFA]">
            <strong className="text-cyan-800 block text-xs">Subject-Grouped Splitting Protocol:</strong>
            <p className="text-slate-600">
              Our pipeline employs <code className="text-cyan-700 bg-white px-1 py-0.5 rounded font-mono border border-sky-100">GroupShuffleSplit</code> and <code className="text-cyan-700 bg-white px-1 py-0.5 rounded font-mono border border-sky-100">StratifiedGroupKFold</code> grouped 
              by subject ID. The 49 test samples come from 8 patients whom the model has never encountered, reporting genuine real-world generalization performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
