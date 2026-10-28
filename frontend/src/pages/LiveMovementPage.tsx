import React, { useState, useEffect } from 'react';
import {
  Video,
  Activity,
  Zap,
  Armchair,
  PersonStanding,
  ClipboardList,
  CheckCircle2,
  Lock,
  ArrowRight,
  User,
  Edit3,
  ShieldAlert,
  AlertCircle,
  Clock
} from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { HandTremorTest } from '../features/movement/HandTremorTest';
import { FingerTappingTest } from '../features/movement/FingerTappingTest';
import { ArmMovementTest } from '../features/movement/ArmMovementTest';
import { WalkingPostureTest } from '../features/movement/WalkingPostureTest';
import { MovementSummary } from '../features/movement/MovementSummary';
import {
  TremorMetrics,
  TappingMetrics,
  ArmMetrics,
  WalkingMetrics,
  ScreeningReport,
  PatientInfo
} from '../utils/movementAnalytics';

type ActiveTestTab = 'tremor' | 'tapping' | 'arm' | 'walking' | 'summary';

export const LiveMovementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTestTab>('tremor');

  // Patient Intake State (Persisted in sessionStorage)
  const [patient, setPatient] = useState<PatientInfo>(() => {
    const saved = sessionStorage.getItem('nv_active_patient');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      name: '',
      age: '',
      gender: 'Male',
      sessionDate: new Date().toISOString()
    };
  });

  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('nv_active_patient');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return !p.name;
      } catch {
        return true;
      }
    }
    return true;
  });

  // Screening Session State
  const [tremorMetrics, setTremorMetrics] = useState<TremorMetrics | null>(null);
  const [tappingMetrics, setTappingMetrics] = useState<TappingMetrics | null>(null);
  const [armMetrics, setArmMetrics] = useState<ArmMetrics | null>(null);
  const [walkingMetrics, setWalkingMetrics] = useState<WalkingMetrics | null>(null);

  // Check completion states
  const isTest1Done = !!(
    tremorMetrics &&
    (tremorMetrics.status === 'Reliable Estimate' ||
      tremorMetrics.status === 'Preliminary Estimate' ||
      tremorMetrics.status === 'No Reliable Dominant Frequency Detected')
  );
  const isTest2Done = !!(tappingMetrics && tappingMetrics.status === 'Completed');
  const isTest3Done = !!(
    armMetrics &&
    (armMetrics.status === 'Completed' || armMetrics.status === 'Limited Excursion')
  );
  const isTest4Done = !!(
    walkingMetrics &&
    (walkingMetrics.status === 'Completed' || walkingMetrics.status === 'Skipped')
  );

  const completedCount = [isTest1Done, isTest2Done, isTest3Done, isTest4Done].filter(Boolean).length;
  const isBatteryComplete = completedCount === 4;

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient.name.trim()) return;
    sessionStorage.setItem('nv_active_patient', JSON.stringify(patient));
    setShowIntakeModal(false);
  };

  const handleResetSession = () => {
    if (window.confirm('Reset this movement screening session and clear all recorded test metrics?')) {
      setTremorMetrics(null);
      setTappingMetrics(null);
      setArmMetrics(null);
      setWalkingMetrics(null);
      setActiveTab('tremor');
    }
  };

  const handleSkipWalking = () => {
    const skipped: WalkingMetrics = {
      durationSeconds: 0,
      deliveredFrames: 0,
      processedFrames: 0,
      trackingContinuityPct: 0,
      stepCount: 0,
      cadenceStepsPerMin: 0,
      stepSymmetryIndexPct: 0,
      meanTrunkLeanAngleDeg: 0,
      postureStabilityScore: 0,
      status: 'Skipped',
      signalQuality: 'Poor',
      plainEnglishTitle: 'Walking / Posture Skipped',
      plainEnglishExplanation: 'Patient or clinician skipped the axial walking module due to mobility limitations or limited room spacing.',
      recommendedAction: 'Interpret other 3 tests or repeat in safe open environment.',
      leanSeries: []
    };
    setWalkingMetrics(skipped);
    setActiveTab('summary');
  };

  const currentReport: ScreeningReport = {
    timestamp: new Date().toISOString(),
    patient,
    handTremor: tremorMetrics,
    fingerTapping: tappingMetrics,
    armMovement: armMetrics,
    walkingPosture: walkingMetrics
  };

  const getStatusBadge = (isDone: boolean, status?: string | null) => {
    if (isDone) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>Completed</span>
        </span>
      );
    }
    if (status === 'Skipped') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Skipped
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 py-6 max-w-6xl mx-auto">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Video className="w-7 h-7 text-sky-400" />
            <span>Live Movement Screening Battery</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standardized 4-test computer-vision protocol assessing resting tremor, motor agility, joint excursion, and postural stability.
          </p>
        </div>

        {/* Battery Progress Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300">Battery Progress:</span>
          <strong className="text-sky-300 font-mono font-bold">{completedCount} of 4 Tests</strong>
          <span className="text-slate-500">({Math.round((completedCount / 4) * 100)}%)</span>
        </div>
      </div>

      <MedicalDisclaimer compact />

      {/* Patient Profile Intake Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-850 border border-slate-700/80 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Active Patient Subject</span>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-bold text-white">
                {patient.name.trim() ? patient.name : 'Unregistered Patient (Intake Required)'}
              </strong>
              {patient.name.trim() && (
                <span className="text-slate-400">
                  • {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowIntakeModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold border border-slate-700 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{patient.name.trim() ? 'Edit Patient Details' : 'Complete Patient Intake'}</span>
        </button>
      </div>

      {/* Sequential 4-Test Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Tab 1: Hand Tremor */}
        <button
          type="button"
          onClick={() => setActiveTab('tremor')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'tremor'
              ? 'bg-slate-800 border-sky-500/80 shadow-lg ring-1 ring-sky-500/50'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-sky-400" />
            {getStatusBadge(isTest1Done, tremorMetrics?.status)}
          </div>
          <h4 className="font-bold text-white text-xs">1. Hand Tremor</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">30s stability & PSD</p>
        </button>

        {/* Tab 2: Finger Tapping */}
        <button
          type="button"
          onClick={() => setActiveTab('tapping')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'tapping'
              ? 'bg-slate-800 border-teal-500/80 shadow-lg ring-1 ring-teal-500/50'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-teal-400" />
            {getStatusBadge(isTest2Done, tappingMetrics?.status)}
          </div>
          <h4 className="font-bold text-white text-xs">2. Finger Tapping</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">30s agility cadence</p>
        </button>

        {/* Tab 3: Arm Movement */}
        <button
          type="button"
          onClick={() => setActiveTab('arm')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'arm'
              ? 'bg-slate-800 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/50'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Armchair className="w-5 h-5 text-indigo-400" />
            {getStatusBadge(isTest3Done, armMetrics?.status)}
          </div>
          <h4 className="font-bold text-white text-xs">3. Arm Movement</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Excursion & SPARC</p>
        </button>

        {/* Tab 4: Walking / Posture */}
        <button
          type="button"
          onClick={() => setActiveTab('walking')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'walking'
              ? 'bg-slate-800 border-amber-500/80 shadow-lg ring-1 ring-amber-500/50'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <PersonStanding className="w-5 h-5 text-amber-400" />
            {getStatusBadge(isTest4Done, walkingMetrics?.status)}
          </div>
          <h4 className="font-bold text-white text-xs">4. Posture / Walking</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Axial alignment</p>
        </button>

        {/* Tab 5: Consolidated Summary */}
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`p-3.5 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 relative ${
            activeTab === 'summary'
              ? 'bg-gradient-to-br from-slate-800 to-sky-950 border-sky-400 shadow-lg'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <ClipboardList className="w-5 h-5 text-sky-400" />
            {isBatteryComplete ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )}
          </div>
          <h4 className="font-bold text-white text-xs">Clinical Summary</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Full PDF Report</p>
        </button>
      </div>

      {/* Sequential Stepper Navigation Guidance Banner */}
      {activeTab === 'tremor' && isTest1Done && (
        <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-sky-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Test 1 (Hand Tremor) successfully tracked and analyzed. Ready for Test 2.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('tapping')}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
          >
            <span>Proceed to Test 2: Finger Tapping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'tapping' && isTest2Done && (
        <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-teal-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Test 2 (Finger Tapping) completed with validated cadence metrics.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('arm')}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
          >
            <span>Proceed to Test 3: Arm Movement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'arm' && isTest3Done && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Test 3 (Arm Excursion & SPARC Smoothness) completed.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('walking')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
          >
            <span>Proceed to Test 4: Walking & Posture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'walking' && isTest4Done && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All 4 tests in the screening battery are completed! The full clinical summary is now unlocked.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-lg"
          >
            <span>View Full Assessment Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Test Viewport */}
      <div className="bg-slate-850 rounded-3xl p-6 border border-slate-800 shadow-xl">
        {activeTab === 'tremor' && (
          <HandTremorTest
            onComplete={(res) => setTremorMetrics(res)}
            savedMetrics={tremorMetrics}
          />
        )}

        {activeTab === 'tapping' && (
          <FingerTappingTest
            onComplete={(res) => setTappingMetrics(res)}
            savedMetrics={tappingMetrics}
          />
        )}

        {activeTab === 'arm' && (
          <ArmMovementTest
            onComplete={(res) => setArmMetrics(res)}
            savedMetrics={armMetrics}
          />
        )}

        {activeTab === 'walking' && (
          <WalkingPostureTest
            onComplete={(res) => setWalkingMetrics(res)}
            savedMetrics={walkingMetrics}
            onSkip={handleSkipWalking}
          />
        )}

        {activeTab === 'summary' && (
          <>
            {isBatteryComplete ? (
              <MovementSummary
                report={currentReport}
                patient={patient.name.trim() ? patient : null}
                onReset={handleResetSession}
              />
            ) : (
              /* Locked State Screen */
              <div className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Consolidated Clinical Report Locked</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    To maintain diagnostic integrity and generate the aggregate Parkinson's Probability Index, all 4 movement tests must be completed.
                  </p>
                </div>

                {/* Progress Checklist */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3 text-xs">
                  <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                    Battery Completion Checklist ({completedCount} / 4)
                  </span>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60">
                    <div className="flex items-center gap-2 text-white">
                      {isTest1Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                      )}
                      <span>1. Hand Tremor Test (30s)</span>
                    </div>
                    {isTest1Done ? (
                      <span className="text-emerald-400 font-semibold">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('tremor')}
                        className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60">
                    <div className="flex items-center gap-2 text-white">
                      {isTest2Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                      )}
                      <span>2. Finger Tapping Cadence Test</span>
                    </div>
                    {isTest2Done ? (
                      <span className="text-emerald-400 font-semibold">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('tapping')}
                        className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60">
                    <div className="flex items-center gap-2 text-white">
                      {isTest3Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                      )}
                      <span>3. Arm Movement Excursion & SPARC Test</span>
                    </div>
                    {isTest3Done ? (
                      <span className="text-emerald-400 font-semibold">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('arm')}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60">
                    <div className="flex items-center gap-2 text-white">
                      {isTest4Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                      )}
                      <span>4. Walking & Postural Alignment Test</span>
                    </div>
                    {isTest4Done ? (
                      <span className="text-emerald-400 font-semibold">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('walking')}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                      >
                        Start Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Patient Intake Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Patient Intake & Registration</h3>
              <p className="text-xs text-slate-400">
                Please enter the patient details for this clinical movement assessment session. These details will be included in the diagnostic PDF report.
              </p>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Patient Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={patient.name}
                  onChange={(e) => setPatient((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Age (Years) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    placeholder="e.g. 68"
                    value={patient.age}
                    onChange={(e) => setPatient((prev) => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender</label>
                  <select
                    value={patient.gender}
                    onChange={(e) =>
                      setPatient((prev) => ({
                        ...prev,
                        gender: e.target.value as PatientInfo['gender']
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-sky-500 focus:outline-none text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all"
                >
                  Save & Begin Movement Battery
                </button>
              </div>

              {patient.name.trim() && (
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel / Keep Current Details
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
