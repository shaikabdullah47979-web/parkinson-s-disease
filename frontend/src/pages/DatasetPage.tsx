import React, { useEffect, useState } from 'react';
import { Database, Search, ExternalLink, Layers } from 'lucide-react';
import { api } from '../services/api';
import { DatasetStatus, FeatureDescription } from '../types';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const DatasetPage: React.FC = () => {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [features, setFeatures] = useState<FeatureDescription[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const [st, ft] = await Promise.all([
          api.getDatasetStatus(),
          api.getDatasetFeatures()
        ]);
        setStatus(st);
        setFeatures(ft);
      } catch (e) {
        console.error('Failed to load dataset documentation', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDataset();
  }, []);

  const categories = ['All', ...Array.from(new Set(features.map((f) => f.category)))];

  const filteredFeatures = features.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                          f.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Title */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Database className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Biomedical Voice Dataset Documentation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Detailed exploration of the authoritative UCI Parkinson's Telemonitoring Acoustic Dataset.
          </p>
        </div>
      </div>

      <MedicalDisclaimer compact />

      {/* Dataset Metadata Summary Card */}
      {status && (
        <div className="bg-[#F0F8FF] border border-sky-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-200/60 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-cyan-700 tracking-wider">Authoritative Source</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{status.dataset_name}</h2>
            </div>
            <a
              href={status.source_url || 'https://archive.ics.uci.edu/dataset/174/parkinsons'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-cyan-800 text-xs font-semibold hover:bg-sky-50 transition-colors self-start md:self-auto shadow-xs"
            >
              <span>UCI Archive Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Total Records</span>
              <strong className="text-xl text-slate-900 font-mono font-bold mt-1 block">{status.row_count}</strong>
              <span className="text-slate-500 text-[11px] block">phonation recordings</span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Unique Subjects</span>
              <strong className="text-xl text-slate-900 font-mono font-bold mt-1 block">{status.unique_subjects}</strong>
              <span className="text-slate-500 text-[11px] block">patients & controls</span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Class Distribution</span>
              <strong className="text-xl text-slate-900 font-mono font-bold mt-1 block">147 PD : 48 Ctrl</strong>
              <span className="text-slate-500 text-[11px] block">75.4% positive class</span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Missing Values</span>
              <strong className="text-xl text-emerald-700 font-mono font-bold mt-1 block">0</strong>
              <span className="text-slate-500 text-[11px] block">clean dataset</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed pt-1">
            <strong className="text-slate-700">Citation:</strong> Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM.{' '}
            <em>"Suitability of dysphonia measurements for telemonitoring of Parkinson's disease"</em>,{' '}
            IEEE Transactions on Biomedical Engineering, 56(4):1015-1022, 2008.
          </div>
        </div>
      )}

      {/* Feature Dictionary */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-600" />
            <span>Acoustic Feature Dictionary ({features.length} Features)</span>
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search features..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none w-48 shadow-xs"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none shadow-xs font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading feature specifications...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0F8FF] text-slate-600 uppercase text-[11px] border-b border-sky-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Feature Column</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Unit</th>
                    <th className="py-3 px-4 font-semibold">Mean ± Std</th>
                    <th className="py-3 px-4 font-semibold">Observed Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredFeatures.map((f) => (
                    <tr key={f.name} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0ea5e9]">{f.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 border border-sky-200 text-cyan-800">
                          {f.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{f.description}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{f.unit || '—'}</td>
                      <td className="py-3 px-4 text-slate-900 font-mono">
                        {f.mean.toFixed(4)} ± {f.std.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        [{f.min.toFixed(3)}, {f.max.toFixed(3)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
