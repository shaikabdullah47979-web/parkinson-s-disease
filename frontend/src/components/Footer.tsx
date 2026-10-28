import React from 'react';
import { ShieldCheck, ExternalLink, Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 py-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <span>NeuroVoice ML Research Platform</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An educational and research machine learning system demonstrating voice dysphonia feature engineering,
              subject-aware cross-validation, and predictive classification.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h5 className="text-white font-medium text-xs tracking-wider uppercase">Authoritative Citation</h5>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. "Suitability of dysphonia measurements for telemonitoring of Parkinson's disease", IEEE Transactions on Biomedical Engineering, 2008.
            </p>
            <a
              href="https://archive.ics.uci.edu/dataset/174/parkinsons"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 transition-colors pt-1"
            >
              <span>UCI Machine Learning Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h5 className="text-white font-medium text-xs tracking-wider uppercase">System Architecture</h5>
            <ul className="text-xs text-slate-400 space-y-1">
              <li className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-teal-400" /> Frontend: React 18 + TypeScript + Vite + Tailwind</li>
              <li className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-teal-400" /> Backend: FastAPI + Pydantic + Uvicorn</li>
              <li className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-teal-400" /> ML: Scikit-learn (Subject-Grouped Validation)</li>
              <li className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-teal-400" /> Persistence: SQLAlchemy + SQLite (Relational)</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 NeuroVoice Educational ML Project. For educational and research purposes only.</p>
          <p className="text-amber-400/80 font-medium">Experimental Prototype • Not for Clinical Diagnosis</p>
        </div>
      </div>
    </footer>
  );
};

