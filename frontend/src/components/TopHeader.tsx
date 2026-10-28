import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Menu } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  onToggleMobileSidebar: () => void;
}

export const TopHeader: React.FC<Props> = ({ onToggleMobileSidebar }) => {
  const location = useLocation();
  const [modelOnline, setModelOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.getHealth();
        setModelOnline(res.ml_model_ready);
      } catch {
        setModelOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string): { title: string; subtitle: string } => {
    switch (path) {
      case '/':
        return {
          title: 'Platform Overview',
          subtitle: 'Biomedical Machine Learning & Dysphonia Research'
        };
      case '/dashboard':
        return {
          title: 'Research Dashboard',
          subtitle: 'Monitor model evaluation, dataset quality, and research workflows'
        };
      case '/predict':
        return {
          title: 'Acoustic Dysphonia Predictor',
          subtitle: '22-Dimensional Vocal Perturbation Feature Classification'
        };
      case '/movement':
        return {
          title: 'Live Movement Assessment',
          subtitle: 'Capture and review movement patterns for research and informational purposes'
        };
      case '/models':
        return {
          title: 'Model Evaluation & Benchmarks',
          subtitle: 'Cross-Validation Performance & Feature Importance'
        };
      case '/dataset':
        return {
          title: 'UCI Dataset Provenance',
          subtitle: '195 Biomedical Phonation Samples Across 32 Individuals'
        };
      case '/history':
        return {
          title: 'Inference Audit History',
          subtitle: 'Persisted Research Prediction Log & Telemetry Records'
        };
      default:
        return {
          title: 'NeuroVoice Research',
          subtitle: 'Parkinson\'s Disease Analysis Platform'
        };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-navy-800 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title & Breadcrumb */}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-navy-800 leading-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Model Online Status Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-200 shadow-sm">
          {modelOnline === true ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Model Ready</span>
            </>
          ) : modelOnline === false ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-rose-700 font-medium">Model Offline</span>
            </>
          ) : (
            <span className="text-slate-500">Checking model...</span>
          )}
        </div>
      </div>
    </header>
  );
};
