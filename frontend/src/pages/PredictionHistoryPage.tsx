import React, { useEffect, useState } from 'react';
import { History, Trash2, Eye, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { PredictionRecord } from '../types';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const PredictionHistoryPage: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected record for details view
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const list = await api.getPredictions();
      setPredictions(list || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch prediction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this prediction record from history?')) return;
    try {
      await api.deletePrediction(id);
      setPredictions((prev) => prev.filter((p) => p.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      alert(`Failed to delete record: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-sky-400" />
            <span>Prediction Audit Trail & History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persisted research inference history saved with relational integrity in the database.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors self-start sm:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <MedicalDisclaimer compact />

      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Prediction List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {predictions.length} recorded inference run{predictions.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-slate-800/40 border border-slate-700/60 text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 text-sky-400 mx-auto animate-spin" />
            <p className="text-sm font-medium text-slate-300">Loading prediction history...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-800/40 border border-slate-700/60 text-slate-400 space-y-2">
            <History className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No predictions recorded yet</p>
            <p className="text-xs">Run a prediction from the Predictor tab to log records here.</p>
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Classification Result</th>
                    <th className="py-3 px-4 font-semibold">Confidence</th>
                    <th className="py-3 px-4 font-semibold">Specimen Notes</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {predictions.map((p) => {
                    const isPD = p.prediction_label === 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">#{p.id}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPD
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {isPD ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{p.prediction_text}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {p.confidence_score ? `${(p.confidence_score * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{p.notes || '—'}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedRecord(p)}
                            title="View features"
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Delete record"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Feature Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Record #{selectedRecord.id} Acoustic Features</h3>
                <p className="text-xs text-slate-400">{new Date(selectedRecord.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(selectedRecord.input_features).map(([feat, val]) => (
                <div key={feat} className="p-2 rounded bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block truncate" title={feat}>{feat}</span>
                  <strong className="text-white font-mono">{typeof val === 'number' ? val.toFixed(4) : String(val)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
