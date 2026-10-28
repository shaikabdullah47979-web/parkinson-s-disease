import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-500 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          {/* Col 1: Platform Overview */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-navy-800 font-semibold">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>NeuroVoice Clinical ML Platform</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Biomedical machine learning system demonstrating voice perturbation feature extraction,
              subject-aware cross-validation, and browser-side kinematic telemetry.
            </p>
          </div>

          {/* Col 2: Authoritative Citation */}
          <div className="space-y-1.5">
            <h5 className="text-navy-800 font-semibold text-xs tracking-wider uppercase">Authoritative Citation</h5>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. "Suitability of dysphonia measurements for telemonitoring of Parkinson's disease", IEEE TBME, 2008.
            </p>
            <a
              href="https://archive.ics.uci.edu/dataset/174/parkinsons"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-teal-700 hover:text-teal-800 font-medium transition-colors pt-1"
            >
              <span>UCI Machine Learning Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Col 3: Architecture & Integrity */}
          <div className="space-y-1.5">
            <h5 className="text-navy-800 font-semibold text-xs tracking-wider uppercase">Research Integrity</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trained strictly on Subject-Grouped splits (GroupKFold) preventing record leakage.
              Kinematics evaluated via Welch PSD, Butterworth filtering, and SPARC algorithms.
            </p>
            <span className="text-[11px] text-slate-500 block pt-1">
              FastAPI • Scikit-Learn • React • MediaPipe Tasks
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} NeuroVoice Research Project. Developed for academic and clinical research purposes.</p>
          <p className="text-slate-500">Confidential Research Telemetry</p>
        </div>
      </div>
    </footer>
  );
};
