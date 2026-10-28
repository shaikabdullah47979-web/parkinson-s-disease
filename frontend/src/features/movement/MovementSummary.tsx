import React from 'react';
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  RotateCcw,
  Printer,
  FileDown,
  User,
  HeartPulse,
  Activity,
  Zap,
  Armchair,
  PersonStanding
} from 'lucide-react';
import { ScreeningReport, PatientInfo, evaluateCompositeDiagnosis } from '../../utils/movementAnalytics';
import { generateMovementPdfReport } from '../../utils/pdfReportGenerator';

interface Props {
  report: ScreeningReport;
  patient: PatientInfo | null;
  onReset: () => void;
}

export const MovementSummary: React.FC<Props> = ({ report, patient, onReset }) => {
  const { handTremor, fingerTapping, armMovement, walkingPosture } = report;
  const diagnosis = evaluateCompositeDiagnosis(report);

  const handleDownloadPdf = () => {
    generateMovementPdfReport(report, patient);
  };

  const handlePrint = () => {
    window.print();
  };

  const completedCount = [
    handTremor && (handTremor.status === 'Reliable Estimate' || handTremor.status === 'Preliminary Estimate' || handTremor.status === 'No Reliable Dominant Frequency Detected'),
    fingerTapping && fingerTapping.status === 'Completed',
    armMovement && (armMovement.status === 'Completed' || armMovement.status === 'Limited Excursion'),
    walkingPosture && walkingPosture.status === 'Completed'
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-1">
            <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
            <span>Standardized 4-Test Battery Assessment</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-navy-800">
            Consolidated Movement Telemetry Report
          </h2>
          <p className="text-xs text-slate-500">
            Assessment Timestamp: {new Date(report.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Full Assessment Report (PDF)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Patient Intake Profile Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Evaluated Patient</span>
            <strong className="text-sm font-bold text-navy-800">{patient?.name || 'Anonymous Patient'}</strong>
          </div>
        </div>

        <div className="flex items-center gap-6 text-slate-600">
          <div>
            <span className="text-slate-400 text-[11px] block">Age</span>
            <strong className="text-navy-800 font-mono">{patient?.age ? `${patient.age} yrs` : 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Gender</span>
            <strong className="text-navy-800">{patient?.gender || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Battery Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{completedCount} / 4 Tests Completed</span>
            </span>
          </div>
        </div>
      </div>

      {/* Executive Diagnostic Conclusion Card */}
      <div className={`p-6 rounded-2xl border shadow-xs ${
        diagnosis.riskLevel === 'HIGH_PROBABILITY'
          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
          : diagnosis.riskLevel === 'MODERATE_BORDERLINE'
          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              diagnosis.riskLevel === 'HIGH_PROBABILITY'
                ? 'bg-rose-100 border-rose-200 text-rose-700'
                : diagnosis.riskLevel === 'MODERATE_BORDERLINE'
                ? 'bg-amber-100 border-amber-200 text-amber-700'
                : 'bg-emerald-100 border-emerald-200 text-emerald-700'
            }`}>
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Executive Diagnostic Conclusion
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-navy-800 tracking-tight">
                {diagnosis.verdictTitle}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Aggregate Biomarker Probability</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-navy-800">
              {diagnosis.probabilityPct}% <span className="text-xs font-normal text-slate-500">Indicative</span>
            </div>
            <div className="text-[11px] text-slate-500">{diagnosis.totalAbnormalCount} of 4 criteria flagged</div>
          </div>
        </div>

        <div className="py-4 space-y-2 text-xs sm:text-sm leading-relaxed text-slate-700">
          <p>{diagnosis.clinicalSummary}</p>
          <div className="flex items-start gap-2 pt-1 font-medium">
            <span className="font-bold text-navy-800 underline">Clinical Guidance:</span>
            <span>{diagnosis.recommendation}</span>
          </div>
        </div>

        {/* Multivariate Flags Audit */}
        <div className="mt-2 pt-4 border-t border-black/5">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-navy-800">
            Multi-Domain Kinematic Telemetry Audit
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {diagnosis.flags.map((flag, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-2.5"
              >
                {flag.isAbnormal ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : flag.severity === 'borderline' ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="text-navy-800 block font-semibold">{flag.name}</strong>
                  <span className="text-slate-600 text-[11px]">{flag.finding}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Breakdown Grid */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-navy-800 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Granular 4-Test Battery Telemetry</span>
        </h4>

        {/* 1. Hand Tremor */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>1. Hand Resting Tremor & Oscillation Analysis</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              handTremor?.status === 'Reliable Estimate' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              handTremor?.status === 'Preliminary Estimate' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
              'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {handTremor?.status || 'Not Tested'}
            </span>
          </div>
          {handTremor && handTremor.status !== 'Insufficient Data' && handTremor.status !== 'Interrupted' ? (
            <div className="space-y-2 pt-1">
              <div className="text-slate-800 font-medium">{handTremor.plainEnglishTitle} — <span className="text-slate-500">{handTremor.plainEnglishExplanation}</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div>Tracking Continuity: <strong className="text-navy-800 font-mono">{handTremor.trackingContinuityPct}%</strong></div>
                <div>Dominant Frequency: <strong className="text-teal-700 font-mono">{handTremor.dominantFrequencyHz ? `${handTremor.dominantFrequencyHz.toFixed(2)} Hz` : 'Not Detected'}</strong></div>
                <div>Signal-to-Noise (SNR): <strong className="text-navy-800 font-mono">{handTremor.snrDb ? `${handTremor.snrDb.toFixed(1)} dB` : 'N/A'}</strong></div>
                <div>Displacement: <strong className="text-navy-800 font-mono">{handTremor.meanDisplacement} px</strong></div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">No valid measurement recorded or test was interrupted.</p>
          )}
        </div>

        {/* 2. Finger Tapping */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy-800 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-600" />
              <span>2. Finger Tapping Speed & Motor Rhythm Test</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              fingerTapping?.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {fingerTapping?.status || 'Not Tested'}
            </span>
          </div>
          {fingerTapping && fingerTapping.status === 'Completed' ? (
            <div className="space-y-2 pt-1">
              <div className="text-slate-800 font-medium">{fingerTapping.plainEnglishTitle} — <span className="text-slate-500">{fingerTapping.plainEnglishExplanation}</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div>Total Validated: <strong className="text-navy-800 font-mono">{fingerTapping.validatedTaps} taps</strong></div>
                <div>Cadence: <strong className="text-teal-700 font-mono">{fingerTapping.tapsPerMinute} taps/min</strong></div>
                <div>Rhythm Variability: <strong className="text-navy-800 font-mono">CV {fingerTapping.rhythmCvPercent}%</strong></div>
                <div>Fatigue Ratio: <strong className="text-navy-800 font-mono">{fingerTapping.amplitudeFatigueRatio}x</strong></div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">No measurement recorded or test inconclusive.</p>
          )}
        </div>

        {/* 3. Arm Movement */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy-800 text-sm flex items-center gap-2">
              <Armchair className="w-4 h-4 text-navy-700" />
              <span>3. Arm Movement Excursion & SPARC Smoothness Test</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              armMovement?.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {armMovement?.status || 'Not Tested'}
            </span>
          </div>
          {armMovement && (armMovement.status === 'Completed' || armMovement.status === 'Limited Excursion') ? (
            <div className="space-y-2 pt-1">
              <div className="text-slate-800 font-medium">{armMovement.plainEnglishTitle} — <span className="text-slate-500">{armMovement.plainEnglishExplanation}</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div>Excursion Range: <strong className="text-navy-800 font-mono">{armMovement.excursionRangeDeg}°</strong></div>
                <div>Angular Velocity: <strong className="text-teal-700 font-mono">{armMovement.meanAngularVelocityDegPerSec}°/s</strong></div>
                <div>SPARC Smoothness: <strong className="text-navy-800 font-mono">{armMovement.movementSmoothnessScore} / 100</strong></div>
                <div>Repetition Cycles: <strong className="text-navy-800 font-mono">{armMovement.repetitionCount}</strong></div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">No measurement recorded or test inconclusive.</p>
          )}
        </div>

        {/* 4. Walking Posture */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy-800 text-sm flex items-center gap-2">
              <PersonStanding className="w-4 h-4 text-teal-600" />
              <span>4. Walking & Axial Postural Alignment Test</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              walkingPosture?.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              walkingPosture?.status === 'Skipped' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {walkingPosture?.status || 'Not Tested'}
            </span>
          </div>
          {walkingPosture && walkingPosture.status === 'Completed' ? (
            <div className="space-y-2 pt-1">
              <div className="text-slate-800 font-medium">{walkingPosture.plainEnglishTitle} — <span className="text-slate-500">{walkingPosture.plainEnglishExplanation}</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div>Mean Trunk Lean: <strong className="text-navy-800 font-mono">{walkingPosture.meanTrunkLeanAngleDeg}°</strong></div>
                <div>Step Cadence: <strong className="text-teal-700 font-mono">{walkingPosture.cadenceStepsPerMin} steps/min</strong></div>
                <div>Step Symmetry: <strong className="text-navy-800 font-mono">{walkingPosture.stepSymmetryIndexPct}%</strong></div>
                <div>Axial Stability: <strong className="text-emerald-700 font-mono">{walkingPosture.postureStabilityScore} / 100</strong></div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">
              {walkingPosture?.status === 'Skipped' ? 'Test skipped by user request.' : 'No measurement recorded.'}
            </p>
          )}
        </div>
      </div>

      {/* Mandatory Medical Safety Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Mandatory Medical Safety Disclaimer & Clinical Attestation</span>
        </div>
        <p className="leading-relaxed">
          This application is an educational and clinical research screening prototype. The aggregate probability index and kinematic metrics are computational estimates derived from webcam landmark computer vision and do not replace formal neurological diagnosis by a certified movement disorder clinician. Final diagnostic decisions must incorporate complete clinical history, physical neurological examination, and standardized clinical scales (MDS-UPDRS).
        </p>
      </div>
    </div>
  );
};
