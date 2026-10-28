import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Play, Square, RotateCcw, AlertCircle, CheckCircle2, ShieldAlert, Activity, HeartPulse, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCamera } from '../../hooks/useCamera';
import { getPoseLandmarker } from '../../utils/mediaPipeVision';
import { calculateJointAngleDeg, ArmMetrics, analyzeArmKinematics } from '../../utils/movementAnalytics';

interface Props {
  onComplete: (metrics: ArmMetrics) => void;
  savedMetrics?: ArmMetrics | null;
}

export const ArmMovementTest: React.FC<Props> = ({ onComplete, savedMetrics }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [testState, setTestState] = useState<'idle' | 'running' | 'analyzing' | 'completed'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [bodyDetected, setBodyDetected] = useState<boolean>(false);
  const [liveAngle, setLiveAngle] = useState<number>(0);
  const [metrics, setMetrics] = useState<ArmMetrics | null>(savedMetrics || null);
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

  // Kinematic collection
  const recordedTimesRef = useRef<number[]>([]);
  const recordedAnglesRef = useRef<number[]>([]);

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    try {
      await getPoseLandmarker();
      const ok = await startCamera();
      if (!ok) setErrorMsg('Failed to access camera.');
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
      setBodyDetected(true);
      validLandmarkFramesRef.current += 1;
      const pose = results.landmarks[0];

      // Arm joints:
      // Right arm: 12 (Shoulder), 14 (Elbow), 16 (Wrist)
      // Left arm: 11 (Shoulder), 13 (Elbow), 15 (Wrist)
      const rShoulder = pose[12];
      const rElbow = pose[14];
      const rWrist = pose[16];

      const lShoulder = pose[11];
      const lElbow = pose[13];
      const lWrist = pose[15];

      const rightVis = (rShoulder?.visibility || 0) + (rElbow?.visibility || 0) + (rWrist?.visibility || 0);
      const leftVis = (lShoulder?.visibility || 0) + (lElbow?.visibility || 0) + (lWrist?.visibility || 0);

      const activeSide = rightVis >= leftVis ? 'right' : 'left';
      const shoulder = activeSide === 'right' ? rShoulder : lShoulder;
      const elbow = activeSide === 'right' ? rElbow : lElbow;
      const wrist = activeSide === 'right' ? rWrist : lWrist;

      if (shoulder && elbow && wrist) {
        const angle = calculateJointAngleDeg(shoulder, elbow, wrist);
        setLiveAngle(Math.round(angle));

        if (testState === 'running') {
          recordedTimesRef.current.push(nowInMs);
          recordedAnglesRef.current.push(angle);
        }

        // Draw arm skeleton
        const sx = shoulder.x * canvas.width;
        const sy = shoulder.y * canvas.height;
        const ex = elbow.x * canvas.width;
        const ey = elbow.y * canvas.height;
        const wx = wrist.x * canvas.width;
        const wy = wrist.y * canvas.height;

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();

        // Draw joints
        [shoulder, elbow, wrist].forEach((pt, idx) => {
          const px = pt.x * canvas.width;
          const py = pt.y * canvas.height;
          ctx.beginPath();
          ctx.arc(px, py, idx === 1 ? 8 : 6, 0, 2 * Math.PI);
          ctx.fillStyle = idx === 1 ? '#0d9488' : '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Label elbow angle
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${Math.round(angle)}°`, ex + 12, ey - 10);
      }
    } else {
      setBodyDetected(false);
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
    recordedAnglesRef.current = [];
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
      const calculated = await analyzeArmKinematics(
        recordedTimesRef.current,
        recordedAnglesRef.current,
        deliveredFramesRef.current,
        finalDuration
      );

      if (!completedNaturally) {
        calculated.status = 'Interrupted';
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

  const handleRestart = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTestState('idle');
    setTimeLeft(testDuration);
    setMetrics(null);
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
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
        <h4 className="font-bold text-navy-800 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Arm Movement & Excursion Range Protocol</span>
        </h4>
        <p className="text-slate-600 leading-relaxed">
          <strong>Instructions:</strong> Sit or stand comfortably with your upper body (shoulder, elbow, and wrist) in camera view. 
          Slowly bend and extend your arm through your natural comfortable range of motion for 20 seconds.
        </p>
        <p className="text-amber-800 text-[11px] flex items-center gap-1.5 font-medium pt-0.5">
          <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
          <span>Safety Notice: Never force motion through pain. Stop immediately if you experience discomfort.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative aspect-[4/3] bg-slate-900 rounded-2xl border border-slate-300 overflow-hidden flex items-center justify-center shadow-xs">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900/90 z-20">
              <Camera className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-200 max-w-sm">Webcam is inactive. Grant browser permission to begin arm movement analysis.</p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoading || modelLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading MediaPipe Pose Model...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Enable Webcam Stream</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xs ${
                  bodyDetected
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
                    : 'bg-amber-900/90 text-amber-200 border-amber-500/40'
                }`}>
                  {bodyDetected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{bodyDetected ? `Arm Joint: ${liveAngle}°` : 'Position Arm in Frame'}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-xs">
                  Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{liveQuality}</span>
                </div>
              </div>

              {testState === 'running' && (
                <div className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-teal-500/60 text-white font-mono font-bold text-sm shadow-md">
                  {timeLeft}s
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <h5 className="font-bold text-navy-800 text-xs uppercase tracking-wider">Test Controls</h5>

            <div className="space-y-2">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!isCameraActive || !bodyDetected}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 20s Arm Test</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  type="button"
                  onClick={() => handleStopTest(false)}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Test Early / Discomfort</span>
                </button>
              )}

              {testState === 'analyzing' && (
                <div className="w-full py-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Calculating Range & Smoothness...</span>
                </div>
              )}

              {testState === 'completed' && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Arm Motion</span>
                </button>
              )}
            </div>

            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Capturing joint flexion...</span>
                  <span className="font-mono">{Math.round(((testDuration - timeLeft) / testDuration) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-teal-500 transition-all duration-1000"
                    style={{ width: `${((testDuration - timeLeft) / testDuration) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {(errorMsg || cameraError) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg || cameraError}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Live Joint Angle:</span>
              <strong className="text-teal-700 font-mono text-sm">{liveAngle}°</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="text-navy-800 font-semibold">{testState === 'running' ? 'Active' : testState === 'completed' ? 'Done' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="space-y-5">
          {/* Plain-English Overview */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-xs uppercase tracking-wider text-teal-700 font-bold">Arm Movement Result</span>
                </div>
                <h3 className="text-lg font-bold text-navy-800">{metrics.plainEnglishTitle}</h3>
                <p className="text-slate-600 text-xs leading-relaxed max-w-2xl">{metrics.plainEnglishExplanation}</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                metrics.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {metrics.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <strong className="text-navy-800">Recommended Action: </strong>
              <span>{metrics.recommendedAction}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Excursion Range</span>
              <strong className="text-lg text-navy-800 font-mono">{metrics.excursionRangeDeg}°</strong>
              <span className="text-slate-400 block text-[10px]">[{metrics.minElbowAngleDeg}° – {metrics.maxElbowAngleDeg}°]</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Angular Velocity</span>
              <strong className="text-lg text-teal-700 font-mono">{metrics.meanAngularVelocityDegPerSec}°/s</strong>
              <span className="text-slate-400 block text-[10px]">peak: {metrics.peakAngularVelocityDegPerSec}°/s</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Movement Smoothness</span>
              <strong className="text-lg text-navy-800 font-mono">{metrics.movementSmoothnessScore}/100</strong>
              <span className="text-slate-400 block text-[10px]">SPARC consistency</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Tracking Continuity</span>
              <strong className="text-lg text-emerald-700 font-mono">{metrics.trackingContinuityPct}%</strong>
              <span className="text-slate-400 block text-[10px]">{metrics.repetitionCount} completed reps</span>
            </div>
          </div>

          {/* Recharts Joint Angle Chart */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                <span>Joint Angle Trajectory</span>
              </span>
              <span className="text-[10px] text-slate-500">Elbow Degrees vs Time</span>
            </div>
            <div className="h-44 w-full">
              {metrics.angleSeries && metrics.angleSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.angleSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="time_sec" stroke="#64748B" tick={{ fontSize: 10 }} unit="s" />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '11px', color: '#0F2D5B', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}°`, 'Elbow Angle']}
                      labelFormatter={(t) => `Time: ${t}s`}
                    />
                    <Line type="monotone" dataKey="displacement" stroke="#0F766E" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No angle series available</div>
              )}
            </div>
          </div>

          {/* Technical Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Advanced Biomechanical Telemetry</span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50 font-mono text-[11px] text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Delivered Frames</span>
                    <strong className="text-navy-800">{metrics.deliveredFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Processed Frames</span>
                    <strong className="text-navy-800">{metrics.processedFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Repetitions</span>
                    <strong className="text-navy-800">{metrics.repetitionCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Peak Speed</span>
                    <strong className="text-navy-800">{metrics.peakAngularVelocityDegPerSec}°/s</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement Limitation:</strong> Reduced observable excursion range <strong>cannot be equated with clinical muscle rigidity</strong>. 
              Muscle rigidity requires tactile passive tone examination by a neurologist to feel resistance to passive displacement, which cannot be detected through a computer camera.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
