import React, { useEffect, useState } from 'react';
import { History, Trash2, Eye, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <History className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Prediction Audit Trail & History
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Persisted research inference history saved with relational integrity in the database.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-sky-50 transition-colors self-start sm:self-auto border border-slate-200 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <MedicalDisclaimer compact />

      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Prediction List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing {predictions.length} recorded inference run{predictions.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 space-y-2 shadow-xs">
            <RefreshCw className="w-8 h-8 text-cyan-600 mx-auto animate-spin" />
            <p className="text-sm font-medium text-slate-700">Loading prediction history...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 space-y-2 shadow-xs">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No predictions recorded yet</p>
            <p className="text-xs text-slate-500">Run a prediction from the Predictor tab to log records here.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0F8FF] text-slate-600 uppercase text-[11px] border-b border-sky-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Classification Result</th>
                    <th className="py-3 px-4 font-semibold">Confidence</th>
                    <th className="py-3 px-4 font-semibold">Specimen Notes</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {predictions.map((p) => {
                    const isPD = p.prediction_label === 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0ea5e9]">#{p.id}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPD
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isPD ? <AlertCircle className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            <span>{p.prediction_text}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {p.confidence_score ? `${(p.confidence_score * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{p.notes || '—'}</td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedRecord(p)}
                            title="View features"
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Delete record"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#F0F8FF] border-b border-sky-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record #{selectedRecord.id} Acoustic Telemetry Features</h3>
                <p className="text-xs text-slate-500">{new Date(selectedRecord.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 shadow-xs transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {Object.entries(selectedRecord.input_features).map(([feat, val]) => (
                  <div key={feat} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate" title={feat}>
                      {feat}
                    </span>
                    <strong className="text-slate-900 font-mono font-bold block mt-0.5 text-xs">
                      {typeof val === 'number' ? val.toFixed(4) : String(val)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
