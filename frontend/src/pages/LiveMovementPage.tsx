import React, { useState } from 'react';
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
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
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

  // Helper for test card status pill
  const getCardStatusBadge = (testKey: ActiveTestTab, isDone: boolean, status?: string | null) => {
    const isSelected = activeTab === testKey;

    if (isSelected) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/25 text-white border border-white/40 tracking-wider">
          ACTIVE
        </span>
      );
    }
    if (isDone) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>COMPLETED</span>
        </span>
      );
    }
    if (status === 'Skipped') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          SKIPPED
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
        PENDING
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Main Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Live Movement Assessment
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Capture and review movement patterns for research and informational purposes
        </p>
      </div>

      {/* 2. Section Heading: Live Movement Screening Battery */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Video className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0ea5e9] tracking-tight">
              Live Movement Screening Battery
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
              Standardized 4-test computer-vision protocol assessing resting tremor, motor agility, joint excursion, and postural stability.
            </p>
          </div>
        </div>

        {/* Battery Progress Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-xs shrink-0 self-start sm:self-center">
          <Clock className="w-4 h-4 text-cyan-600" />
          <span className="text-slate-600">Battery Progress:</span>
          <strong className="text-slate-900 font-mono font-semibold">{completedCount} of 4 Tests</strong>
          <span className="text-slate-400">({Math.round((completedCount / 4) * 100)}%)</span>
        </div>
      </div>

      {/* 3. Research Screening Disclaimer Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#fffbeb] border border-amber-200 text-amber-900 text-xs flex items-center gap-3 shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="leading-relaxed">
          <strong>Research Screening Prototype:</strong> Outputs are computational classifications based on experimental biomedical telemetry and do not constitute a medical diagnosis or a substitute for assessment by a qualified healthcare professional.
        </p>
      </div>

      {/* 4. Active Participant Card */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5 min-w-[280px]">
          <div className="w-10 h-10 rounded-full border-2 border-sky-300 bg-gradient-to-tr from-sky-100 to-cyan-100 flex items-center justify-center text-sky-700 shrink-0 shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              ACTIVE PATIENT SUBJECT
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <strong className="text-sm font-bold text-slate-800">
                {patient.name.trim() ? patient.name : 'No active participant'}
              </strong>
              {patient.name.trim() && (
                <span className="text-slate-500 font-medium text-xs">
                  • {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIntakeModal(true)}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-cyan-700 font-medium text-xs transition-colors border border-sky-200"
            title="Edit patient intake"
          >
            <Edit3 className="w-3 h-3" />
            <span>{patient.name.trim() ? 'Edit' : 'Intake'}</span>
          </button>
        </div>

        {/* Clinical Summary Shortcut if tests are completed */}
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-xs ${
            activeTab === 'summary'
              ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white border-cyan-400 shadow-glow-pill'
              : isBatteryComplete
              ? 'bg-white hover:bg-sky-50 text-cyan-700 border-cyan-300'
              : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Full Clinical Summary & PDF</span>
          {isBatteryComplete ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              Ready
            </span>
          ) : (
            <Lock className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </div>

      {/* 5. Four Movement Test Cards (horizontally aligned) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hand Tremor */}
        <button
          type="button"
          onClick={() => setActiveTab('tremor')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'tremor'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-glow-cyan ring-2 ring-cyan-300 border-transparent'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs hover:border-cyan-300 hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className={`w-5 h-5 ${activeTab === 'tremor' ? 'text-white' : 'text-cyan-600'}`} />
            {getCardStatusBadge('tremor', isTest1Done, tremorMetrics?.status)}
          </div>
          <h4 className={`font-bold text-sm ${activeTab === 'tremor' ? 'text-white' : 'text-slate-900'}`}>
            1. Hand Tremor
          </h4>
          <p className={`text-xs mt-0.5 ${activeTab === 'tremor' ? 'text-white/90' : 'text-slate-500'}`}>
            30s resting & postural
          </p>
        </button>

        {/* Card 2: Finger Tapping */}
        <button
          type="button"
          onClick={() => setActiveTab('tapping')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'tapping'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-glow-cyan ring-2 ring-cyan-300 border-transparent'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs hover:border-cyan-300 hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className={`w-5 h-5 ${activeTab === 'tapping' ? 'text-white' : 'text-cyan-600'}`} />
            {getCardStatusBadge('tapping', isTest2Done, tappingMetrics?.status)}
          </div>
          <h4 className={`font-bold text-sm ${activeTab === 'tapping' ? 'text-white' : 'text-slate-900'}`}>
            2. Finger Tapping
          </h4>
          <p className={`text-xs mt-0.5 ${activeTab === 'tapping' ? 'text-white/90' : 'text-slate-500'}`}>
            30s agility/cadence
          </p>
        </button>

        {/* Card 3: Arm Movement */}
        <button
          type="button"
          onClick={() => setActiveTab('arm')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'arm'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-glow-cyan ring-2 ring-cyan-300 border-transparent'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs hover:border-cyan-300 hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <Armchair className={`w-5 h-5 ${activeTab === 'arm' ? 'text-white' : 'text-cyan-600'}`} />
            {getCardStatusBadge('arm', isTest3Done, armMetrics?.status)}
          </div>
          <h4 className={`font-bold text-sm ${activeTab === 'arm' ? 'text-white' : 'text-slate-900'}`}>
            3. Arm Movement
          </h4>
          <p className={`text-xs mt-0.5 ${activeTab === 'arm' ? 'text-white/90' : 'text-slate-500'}`}>
            Excursion & SPARC
          </p>
        </button>

        {/* Card 4: Posture / Walking */}
        <button
          type="button"
          onClick={() => setActiveTab('walking')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'walking'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-glow-cyan ring-2 ring-cyan-300 border-transparent'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs hover:border-cyan-300 hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <PersonStanding className={`w-5 h-5 ${activeTab === 'walking' ? 'text-white' : 'text-cyan-600'}`} />
            {getCardStatusBadge('walking', isTest4Done, walkingMetrics?.status)}
          </div>
          <h4 className={`font-bold text-sm ${activeTab === 'walking' ? 'text-white' : 'text-slate-900'}`}>
            4. Posture / Walking
          </h4>
          <p className={`text-xs mt-0.5 ${activeTab === 'walking' ? 'text-white/90' : 'text-slate-500'}`}>
            Axial alignment
          </p>
        </button>
      </div>

      {/* 6. Dynamic Test Instruction Panel (Matching bottom of reference screenshot) */}
      {activeTab !== 'summary' && (
        <div className="p-5 rounded-2xl bg-[#F0F8FF] border border-sky-200/90 shadow-xs space-y-1.5 text-xs">
          {activeTab === 'tremor' && (
            <>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <span>Hand Stability & Tremor Protocol</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                <strong>Instructions:</strong> Position your hand clearly in front of the camera, approximately 1–2 feet away. Keep your wrist and fingers comfortably supported and remain as still as possible for 30 seconds.
              </p>
            </>
          )}

          {activeTab === 'tapping' && (
            <>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-600" />
                <span>Finger Tapping Protocol</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                <strong>Instructions:</strong> Position your hand clearly in front of the camera, approximately 1–2 feet away. Repeatedly tap your index finger and thumb together as rapidly and rhythmically as possible for 30 seconds.
              </p>
            </>
          )}

          {activeTab === 'arm' && (
            <>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Armchair className="w-4 h-4 text-cyan-600" />
                <span>Arm Movement Protocol</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                <strong>Instructions:</strong> Position your upper body and arms within the camera frame, approximately 3–5 feet away. Flex and extend your elbow smoothly through its full range of motion for 20 seconds.
              </p>
            </>
          )}

          {activeTab === 'walking' && (
            <>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PersonStanding className="w-4 h-4 text-cyan-600" />
                <span>Walking & Posture Protocol</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                <strong>Instructions:</strong> Position your camera approximately 6–8 feet away so your full body is in view. Ensure your walking path is clear and well-lit, and maintain an upright standing posture or perform the requested steps for 20 seconds.
              </p>
            </>
          )}
        </div>
      )}

      {/* Sequential Stepper Navigation Guidance Banner */}
      {activeTab === 'tremor' && isTest1Done && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-sky-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>Test 1 (Hand Tremor) successfully tracked and analyzed. Ready for Test 2.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('tapping')}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
          >
            <span>Proceed to Test 2: Finger Tapping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'tapping' && isTest2Done && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-sky-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>Test 2 (Finger Tapping) completed with validated cadence metrics.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('arm')}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
          >
            <span>Proceed to Test 3: Arm Movement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'arm' && isTest3Done && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-sky-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>Test 3 (Arm Excursion & SPARC Smoothness) completed.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('walking')}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
          >
            <span>Proceed to Test 4: Walking & Posture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'walking' && isTest4Done && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-950 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All 4 tests in the screening battery are completed! The full clinical summary is now unlocked.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
          >
            <span>View Full Assessment Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. Active Test Viewport */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs">
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
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Consolidated Clinical Report Locked</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    To maintain diagnostic integrity and generate the aggregate Parkinson's Probability Index, all 4 movement tests must be completed.
                  </p>
                </div>

                {/* Progress Checklist */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
                  <span className="font-semibold text-slate-700 block uppercase tracking-wider text-[11px]">
                    Battery Completion Checklist ({completedCount} / 4)
                  </span>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      {isTest1Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                      )}
                      <span>1. Hand Tremor Test (30s)</span>
                    </div>
                    {isTest1Done ? (
                      <span className="text-emerald-700 font-semibold text-[11px]">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('tremor')}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      {isTest2Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                      )}
                      <span>2. Finger Tapping Cadence Test</span>
                    </div>
                    {isTest2Done ? (
                      <span className="text-emerald-700 font-semibold text-[11px]">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('tapping')}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      {isTest3Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                      )}
                      <span>3. Arm Movement Excursion & SPARC Test</span>
                    </div>
                    {isTest3Done ? (
                      <span className="text-emerald-700 font-semibold text-[11px]">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('arm')}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                      >
                        Start Test
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      {isTest4Done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                      )}
                      <span>4. Walking & Postural Alignment Test</span>
                    </div>
                    {isTest4Done ? (
                      <span className="text-emerald-700 font-semibold text-[11px]">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('walking')}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient Intake & Registration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Please enter the patient details for this clinical movement assessment session. These details will be recorded in the diagnostic PDF report.
              </p>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Patient Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sourabh"
                  value={patient.name}
                  onChange={(e) => setPatient((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Age (Years) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    placeholder="e.g. 23"
                    value={patient.age}
                    onChange={(e) => setPatient((prev) => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Gender</label>
                  <select
                    value={patient.gender}
                    onChange={(e) =>
                      setPatient((prev) => ({
                        ...prev,
                        gender: e.target.value as PatientInfo['gender']
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none text-sm"
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-medium text-sm shadow-xs transition-colors"
                >
                  Save & Begin Movement Battery
                </button>
              </div>

              {patient.name.trim() && (
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
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
