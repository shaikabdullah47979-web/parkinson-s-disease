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

  const getBreadcrumb = (path: string): string => {
    switch (path) {
      case '/':
        return 'Overview';
      case '/dashboard':
        return 'Research Dashboard';
      case '/predict':
        return 'Dysphonia Predictor';
      case '/movement':
        return 'Live Movement Assessment';
      case '/models':
        return 'Model Metrics & Benchmarks';
      case '/dataset':
        return 'UCI Dataset Provenance';
      case '/history':
        return 'Inference History';
      default:
        return 'Clinical Platform';
    }
  };

  const currentLabel = getBreadcrumb(location.pathname);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E0EFFA] px-4 sm:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-sky-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">NeuroVoice</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-cyan-700 font-semibold bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
            {currentLabel}
          </span>
        </div>
      </div>

      {/* Right: Model Online Status Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white border-slate-200 shadow-xs">
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
