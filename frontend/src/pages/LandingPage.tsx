import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight, Database, BarChart3, ShieldCheck, Microscope, Cpu, Layers } from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/60 p-8 sm:p-12 lg:p-16">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-medium">
            <Microscope className="w-3.5 h-3.5" />
            <span>Biomedical Acoustic Dysphonia Research</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Parkinson's Disease Prediction & ML Research Platform
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            An open educational platform exploring machine learning pipelines on biomedical voice measurements. 
            Investigate how vocal fold oscillation perturbation (jitter, shimmer, and nonlinear dynamics) correlates 
            with Parkinsonian dysphonia under rigorous, subject-aware cross-validation.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/predict"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold text-sm hover:from-sky-400 hover:to-teal-400 transition-all shadow-lg glow-sky"
            >
              <Brain className="w-4 h-4" />
              <span>Launch Acoustic Predictor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Research Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="max-w-5xl mx-auto">
        <MedicalDisclaimer />
      </section>

      {/* Key Pillars */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Scientific Rigor & Machine Learning Integrity
          </h2>
          <p className="text-sm text-slate-400">
            Engineered with honest validation protocols that prevent common research pitfalls like participant data leakage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-3 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Legitimate UCI Benchmark</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trained on 195 verified biomedical voice recordings from 32 individuals (Max Little et al.), capturing sustained vowel phonation across 22 acoustic dimensions.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-3 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Subject-Aware Validation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guarantees recordings from the same individual never leak between training and test sets. Delivers realistic generalization scores on unseen subjects.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-3 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Full-Stack Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete end-to-end integration: React TypeScript frontend communicating via typed REST APIs to FastAPI, backed by Scikit-learn pipelines and SQLite persistence.
            </p>
          </div>
        </div>
      </section>

      {/* Acoustic Dysphonia Workflow */}
      <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          <span>Biomedical Acoustic Pipeline Workflow</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-sky-400 font-bold">01. Phonation</span>
            <h4 className="font-semibold text-white text-sm">Sustained Vowel /a/</h4>
            <p className="text-slate-400">Microphone recording of steady vowel phonation isolating intrinsic vocal fold biomechanics.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-sky-400 font-bold">02. Extraction</span>
            <h4 className="font-semibold text-white text-sm">22 Perturbation Measures</h4>
            <p className="text-slate-400">Frequency variation (jitter), amplitude variation (shimmer), harmonics-to-noise ratio, and RPDE complexity.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-sky-400 font-bold">03. Pipeline Inference</span>
            <h4 className="font-semibold text-white text-sm">StandardScaler + Gradient Boosting</h4>
            <p className="text-slate-400">Feature normalization and non-linear decision ensemble trained on subject-grouped splits.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-sky-400 font-bold">04. Transparency</span>
            <h4 className="font-semibold text-white text-sm">Probabilities & Audit Trail</h4>
            <p className="text-slate-400">Classification confidence, model performance transparency, and database logging with user isolation.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

