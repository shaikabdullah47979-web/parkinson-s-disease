import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ArrowRight,
  Database,
  BarChart3,
  ShieldCheck,
  Microscope,
  Cpu,
  Layers,
  Footprints
} from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm">
        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <Microscope className="w-3.5 h-3.5 text-teal-600" />
            <span>Biomedical Acoustic & Kinematic Research</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy-800 tracking-tight leading-tight">
            Parkinson's Disease Research & Multimodal Assessment Platform
          </h1>

          <p className="text-base text-slate-600 leading-relaxed">
            A comprehensive, scientific web application integrating machine learning classification on vocal fold perturbation (jitter, shimmer, and nonlinear dynamics) with real-time browser-based computer vision kinematics (tremor oscillation, motor cadence, and joint excursion).
          </p>

          <div className="flex flex-wrap gap-3.5 pt-2">
            <Link
              to="/predict"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <Brain className="w-4 h-4" />
              <span>Launch Acoustic Predictor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/movement"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <Footprints className="w-4 h-4 text-teal-400" />
              <span>Live Movement Battery</span>
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-navy-800 border border-slate-200 font-semibold text-sm transition-colors shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Research Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Safety Notice */}
      <section>
        <MedicalDisclaimer />
      </section>

      {/* Scientific Rigor & Key Pillars */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-navy-800 tracking-tight">
            Scientific Rigor & Machine Learning Integrity
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Engineered with honest validation protocols that prevent subject-level data leakage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-navy-800 text-base">UCI Benchmark Dataset</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trained on 195 verified biomedical voice recordings from 32 individuals (Max Little et al.), capturing sustained vowel phonation across 22 acoustic dimensions.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center border border-navy-100">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="font-bold text-navy-800 text-base">Subject-Aware Validation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guarantees recordings from the same individual never leak between training and test sets. Delivers realistic generalization scores on unseen subjects.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-navy-800 flex items-center justify-center border border-slate-200">
              <Cpu className="w-5 h-5 text-navy-700" />
            </div>
            <h3 className="font-bold text-navy-800 text-base">Full-Stack Architecture</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete end-to-end integration: React TypeScript frontend, typed REST APIs to FastAPI, backed by Scikit-learn Gradient Boosting and SQLite persistence.
            </p>
          </div>
        </div>
      </section>

      {/* Acoustic Dysphonia Workflow */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <h3 className="text-lg font-bold text-navy-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-600" />
          <span>Biomedical Acoustic Pipeline Workflow</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-mono text-teal-700 font-bold block">01. Phonation</span>
            <h4 className="font-semibold text-navy-800 text-sm">Sustained Vowel /a/</h4>
            <p className="text-slate-600">Microphone recording of steady vowel phonation isolating intrinsic vocal fold biomechanics.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-mono text-teal-700 font-bold block">02. Extraction</span>
            <h4 className="font-semibold text-navy-800 text-sm">22 Perturbation Measures</h4>
            <p className="text-slate-600">Frequency variation (jitter), amplitude variation (shimmer), harmonics-to-noise ratio, and RPDE complexity.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-mono text-teal-700 font-bold block">03. Pipeline Inference</span>
            <h4 className="font-semibold text-navy-800 text-sm">StandardScaler + Gradient Boosting</h4>
            <p className="text-slate-600">Feature normalization and decision ensemble trained on subject-grouped splits without leakage.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-mono text-teal-700 font-bold block">04. Transparency</span>
            <h4 className="font-semibold text-navy-800 text-sm">Probabilities & Audit Trail</h4>
            <p className="text-slate-600">Classification confidence, model performance transparency, and database logging with audit trail.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
