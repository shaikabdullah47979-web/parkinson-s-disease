import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Play, Square, RotateCcw, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert, SkipForward, PersonStanding, ChevronDown, ChevronUp, Sparkles, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCamera } from '../../hooks/useCamera';
import { getPoseLandmarker } from '../../utils/mediaPipeVision';
import { WalkingMetrics, analyzeWalkingKinematics } from '../../utils/movementAnalytics';

interface Props {
  onComplete: (metrics: WalkingMetrics) => void;
  savedMetrics?: WalkingMetrics | null;
  onSkip: () => void;
}

export const WalkingPostureTest: React.FC<Props> = ({ onComplete, savedMetrics, onSkip }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [testState, setTestState] = useState<'safety' | 'ready' | 'running' | 'analyzing' | 'completed'>('safety');
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [fullBodyVisible, setFullBodyVisible] = useState<boolean>(false);
  const [liveTrunkAngle, setLiveTrunkAngle] = useState<number>(0);
  const [metrics, setMetrics] = useState<WalkingMetrics | null>(savedMetrics || null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  // Live quality
  const [liveQuality, setLiveQuality] = useState<'Good' | 'Limited' | 'Insufficient'>('Good');

  const animationFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const testDuration = 20;

  // Frame telemetry refs
  const deliveredFramesRef = useRef<number>(0);
  const processedFramesRef = useRef<number>(0);
  const validLandmarkFramesRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Gait / Posture tracking collectors
  const recordedTimesRef = useRef<number[]>([]);
  const recordedTrunkRef = useRef<number[]>([]);
  const recordedLeftAnkleRef = useRef<number[]>([]);
  const recordedRightAnkleRef = useRef<number[]>([]);

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    try {
      await getPoseLandmarker();
      const ok = await startCamera();
      if (!ok) setErrorMsg('Failed to access camera.');
      else setTestState('ready');
    } catch (e: any) {
      setErrorMsg(`Failed to initialize MediaPipe Pose model: ${e.message}`);
    } finally {
      setModelLoading(false);
    }
  };

  const runTrackingLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(runTrackingLoop);
      return;
    }

    deliveredFramesRef.current += 1;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const landmarker = await getPoseLandmarker();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nowInMs = performance.now();
    if (nowInMs <= lastTimestampRef.current) {
      nowInMs = lastTimestampRef.current + 1;
    }
    lastTimestampRef.current = nowInMs;

    let results: any = null;
    try {
      results = landmarker.detectForVideo(video, nowInMs);
      processedFramesRef.current += 1;
    } catch {
      // transient frame drop
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results && results.landmarks && results.landmarks.length > 0) {
      const pose = results.landmarks[0];

      // Key posture and gait landmarks:
      // Shoulders (11, 12), Hips (23, 24), Knees (25, 26), Ankles (27, 28)
      const ls = pose[11], rs = pose[12];
      const lh = pose[23], rh = pose[24];
      const lk = pose[25], rk = pose[26];
      const la = pose[27], ra = pose[28];

      const isBodyInFrame =
        (ls?.visibility || 0) > 0.35 && (rs?.visibility || 0) > 0.35 &&
        (lh?.visibility || 0) > 0.35 && (rh?.visibility || 0) > 0.35 &&
        (la?.visibility || 0) > 0.25 && (ra?.visibility || 0) > 0.25;

      setFullBodyVisible(isBodyInFrame);
      if (isBodyInFrame) validLandmarkFramesRef.current += 1;

      if (ls && rs && lh && rh) {
        const midShoulderX = (ls.x + rs.x) / 2;
        const midShoulderY = (ls.y + rs.y) / 2;
        const midHipX = (lh.x + rh.x) / 2;
        const midHipY = (lh.y + rh.y) / 2;

        const dx = midShoulderX - midHipX;
        const dy = midHipY - midShoulderY;
        const leanAngle = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
        setLiveTrunkAngle(Math.round(leanAngle));

        if (testState === 'running') {
          recordedTimesRef.current.push(nowInMs);
          recordedTrunkRef.current.push(leanAngle);
          recordedLeftAnkleRef.current.push(la ? la.y : 0.8);
          recordedRightAnkleRef.current.push(ra ? ra.y : 0.8);
        }

        // Draw body posture skeleton line
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(midShoulderX * canvas.width, midShoulderY * canvas.height);
        ctx.lineTo(midHipX * canvas.width, midHipY * canvas.height);
        ctx.stroke();

        // Draw legs skeleton
        if (lk && rk && la && ra) {
          ctx.beginPath();
          ctx.moveTo(lh.x * canvas.width, lh.y * canvas.height);
          ctx.lineTo(lk.x * canvas.width, lk.y * canvas.height);
          ctx.lineTo(la.x * canvas.width, la.y * canvas.height);
          ctx.moveTo(rh.x * canvas.width, rh.y * canvas.height);
          ctx.lineTo(rk.x * canvas.width, rk.y * canvas.height);
          ctx.lineTo(ra.x * canvas.width, ra.y * canvas.height);
          ctx.strokeStyle = '#0d9488';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    } else {
      setFullBodyVisible(false);
    }

    const validCount = validLandmarkFramesRef.current;
    const deliveredCount = deliveredFramesRef.current;
    const ratio = deliveredCount > 0 ? (validCount / deliveredCount) * 100 : 100;
    if (ratio >= 80) setLiveQuality('Good');
    else if (ratio >= 50) setLiveQuality('Limited');
    else setLiveQuality('Insufficient');

    animationFrameId.current = requestAnimationFrame(runTrackingLoop);
  }, [videoRef, testState]);

  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(runTrackingLoop);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isCameraActive, runTrackingLoop]);

  const handleStartTest = () => {
    recordedTimesRef.current = [];
    recordedTrunkRef.current = [];
    recordedLeftAnkleRef.current = [];
    recordedRightAnkleRef.current = [];
    deliveredFramesRef.current = 0;
    processedFramesRef.current = 0;
    validLandmarkFramesRef.current = 0;

    setTimeLeft(testDuration);
    setTestState('running');
    setMetrics(null);

    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleStopTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopTest = async (completedNaturally = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsed = testDuration - timeLeft;
    const finalDuration = completedNaturally ? testDuration : Math.max(1, elapsed);
    setTestState('analyzing');

    try {
      const calculated = await analyzeWalkingKinematics(
        recordedTimesRef.current,
        recordedTrunkRef.current,
        recordedLeftAnkleRef.current,
        recordedRightAnkleRef.current,
        deliveredFramesRef.current,
        finalDuration
      );

      if (!completedNaturally) {
        calculated.status = 'Inconclusive';
        calculated.plainEnglishTitle = 'Test Stopped Early';
      }

      setMetrics(calculated);
      onComplete(calculated);
    } catch (e: any) {
      setErrorMsg(`Analysis error: ${e.message}`);
    } finally {
      setTestState('completed');
    }
  };

  const handleSkip = () => {
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
      plainEnglishTitle: 'Walking Test Skipped',
      plainEnglishExplanation: 'Walking test was omitted upon user request.',
      recommendedAction: 'You may test again later in a clear, safe room.',
      leanSeries: []
    };
    onComplete(skipped);
    onSkip();
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      {/* Fall Risk Safety Notice Modal / Gate */}
      {testState === 'safety' && (
        <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-amber-300 text-sm">Fall Risk & Environmental Safety Notice</h4>
              <p className="text-amber-200/90 leading-relaxed">
                Walking assessments require a spacious, level, well-lit, and unobstructed walking area. 
                <strong> Do not attempt this test unsupervised if you experience dizziness, freezing of gait, unsteady balance, or risk of falling.</strong>
              </p>
              <p className="text-amber-200/80">
                You may skip this test at any time without affecting your other completed screening results.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
              <input
                type="checkbox"
                checked={safetyAcknowledged}
                onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <span>I confirm I am in a safe, clear space and do not have unassisted fall risks</span>
            </label>

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Walking Test</span>
              </button>

              <button
                type="button"
                disabled={!safetyAcknowledged}
                onClick={handleStartCamera}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Enable Camera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {testState !== 'safety' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 relative aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-700/80 overflow-hidden flex items-center justify-center shadow-lg">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {!isCameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-950/95 z-20">
                <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Position camera approximately 6–8 feet away so your full body is visible.</p>
                <button
                  type="button"
                  onClick={handleStartCamera}
                  disabled={isLoading || modelLoading}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              </div>
            ) : (
              <>
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border ${
                    fullBodyVisible
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  }`}>
                    {fullBodyVisible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{fullBodyVisible ? 'Full Body in Frame' : 'Step Back (Head to Feet Required)'}</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                    Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400' : 'text-amber-400'}>{liveQuality}</span>
                  </div>
                </div>

                {testState === 'running' && (
                  <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/50 text-white font-mono font-bold text-sm">
                    {timeLeft}s
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h5 className="font-semibold text-white text-xs uppercase tracking-wider">Walking Protocol Controls</h5>

              <div className="space-y-2">
                {testState === 'ready' && (
                  <button
                    type="button"
                    onClick={handleStartTest}
                    disabled={!isCameraActive || !fullBodyVisible}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start 20s Walking Test</span>
                  </button>
                )}

                {testState === 'running' && (
                  <button
                    type="button"
                    onClick={() => handleStopTest(false)}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Walking Test</span>
                  </button>
                )}

                {testState === 'analyzing' && (
                  <div className="w-full py-3 rounded-xl bg-sky-900/50 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating Gait Symmetry...</span>
                  </div>
                )}

                {testState === 'completed' && (
                  <button
                    type="button"
                    onClick={() => setTestState('ready')}
                    className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retest Walking</span>
                  </button>
                )}
              </div>

              {testState === 'running' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Recording gait cycles...</span>
                    <span>{Math.round(((testDuration - timeLeft) / testDuration) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-1000"
                      style={{ width: `${((testDuration - timeLeft) / testDuration) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {(errorMsg || cameraError) && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg || cameraError}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Trunk Lean:</span>
                <strong className="text-sky-400 font-mono text-sm">{liveTrunkAngle}°</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-white font-medium">{testState === 'running' ? 'Active' : testState === 'completed' ? 'Done' : 'Ready'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {metrics && metrics.status !== 'Skipped' && (
        <div className="space-y-5">
          {/* Plain-English Overview */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-sky-500/30 shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Gait Screening Result</span>
                </div>
                <h3 className="text-lg font-bold text-white">{metrics.plainEnglishTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">{metrics.plainEnglishExplanation}</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                metrics.status === 'Completed'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              }`}>
                {metrics.status}
              </span>
            </div>

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-300">
              <strong className="text-white">Recommended Action: </strong>
              <span>{metrics.recommendedAction}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Trunk Lean Angle</span>
              <strong className="text-lg text-white font-mono">{metrics.meanTrunkLeanAngleDeg}°</strong>
              <span className="text-slate-500 block text-[10px]">relative to vertical</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Stepping Cadence</span>
              <strong className="text-lg text-teal-400 font-mono">{metrics.cadenceStepsPerMin}</strong>
              <span className="text-slate-500 block text-[10px]">steps per minute</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Bilateral Symmetry</span>
              <strong className="text-lg text-sky-400 font-mono">{metrics.stepSymmetryIndexPct}%</strong>
              <span className="text-slate-500 block text-[10px]">step regularity</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Posture Stability</span>
              <strong className="text-lg text-emerald-400 font-mono">{metrics.postureStabilityScore}/100</strong>
              <span className="text-slate-500 block text-[10px]">sway consistency</span>
            </div>
          </div>

          {/* Recharts Posture Lean Chart */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Trunk Posture Trajectory</span>
              </span>
              <span className="text-[10px] text-slate-400">Lean Degrees vs Time</span>
            </div>
            <div className="h-44 w-full">
              {metrics.leanSeries && metrics.leanSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.leanSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="time_sec" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="s" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}°`, 'Trunk Lean']}
                      labelFormatter={(t) => `Time: ${t}s`}
                    />
                    <Line type="monotone" dataKey="displacement" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">No posture series available</div>
              )}
            </div>
          </div>

          {/* Technical Section */}
          <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/30 text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-semibold text-slate-300">Advanced Gait Telemetry</span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-700/60 space-y-3 bg-slate-900/60 font-mono text-[11px] text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Delivered Frames</span>
                    <strong className="text-white">{metrics.deliveredFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Continuity</span>
                    <strong className="text-white">{metrics.trackingContinuityPct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Steps</span>
                    <strong className="text-white">{metrics.stepCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Test Duration</span>
                    <strong className="text-white">{metrics.durationSeconds}s</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement Limitation:</strong> 2D camera stepping patterns <strong>cannot substitute for clinical gait laboratories or multi-camera optical motion capture</strong>. Floor friction, camera distance, and loose clothing can distort visual landmark tracking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
