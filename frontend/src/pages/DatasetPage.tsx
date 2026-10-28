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
    <div className="space-y-8 py-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="w-7 h-7 text-teal-400" />
          <span>Biomedical Voice Dataset Documentation</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed exploration of the authoritative UCI Parkinson's Telemonitoring Acoustic Dataset.
        </p>
      </div>

      <MedicalDisclaimer compact />

      {/* Dataset Metadata Summary Card */}
      {status && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs uppercase font-semibold text-teal-400 tracking-wider">Authoritative Source</span>
              <h2 className="text-xl font-bold text-white">{status.dataset_name}</h2>
            </div>
            <a
              href={status.source_url || 'https://archive.ics.uci.edu/dataset/174/parkinsons'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-medium hover:bg-teal-500/25 transition-colors self-start md:self-auto"
            >
              <span>UCI Archive Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Total Records</span>
              <strong className="text-lg text-white font-mono">{status.row_count}</strong>
              <span className="text-slate-500 block">phonation recordings</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Unique Subjects</span>
              <strong className="text-lg text-white font-mono">{status.unique_subjects}</strong>
              <span className="text-slate-500 block">patients & controls</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Class Distribution</span>
              <strong className="text-lg text-white font-mono">147 PD : 48 Ctrl</strong>
              <span className="text-slate-500 block">75.4% positive class</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Missing Values</span>
              <strong className="text-lg text-emerald-400 font-mono">0</strong>
              <span className="text-slate-500 block">clean dataset</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed pt-2">
            <strong>Citation:</strong> Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. 
            <em> "Suitability of dysphonia measurements for telemonitoring of Parkinson's disease"</em>, 
            IEEE Transactions on Biomedical Engineering, 56(4):1015-1022, 2008.
          </div>
        </div>
      )}

      {/* Feature Dictionary */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
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
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-sky-500 focus:outline-none w-44"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-sky-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading feature specifications...</div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Feature Column</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Unit</th>
                    <th className="py-3 px-4 font-semibold">Mean ± Std</th>
                    <th className="py-3 px-4 font-semibold">Observed Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredFeatures.map((f) => (
                    <tr key={f.name} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-sky-400">{f.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                          {f.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs">{f.description}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{f.unit || '—'}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {f.mean.toFixed(4)} ± {f.std.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
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
