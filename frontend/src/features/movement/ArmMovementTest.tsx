import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Play,
  Square,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCamera } from '../../hooks/useCamera';
import { getPoseLandmarker } from '../../utils/mediaPipeVision';
import { calculateJointAngleDeg, ArmMetrics, analyzeArmKinematics, Point2D } from '../../utils/movementAnalytics';

interface Props {
  onComplete: (metrics: ArmMetrics) => void;
  savedMetrics?: ArmMetrics | null;
}

type ArmSideSelection = 'right' | 'left' | 'auto';

export const ArmMovementTest: React.FC<Props> = ({ onComplete, savedMetrics }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Arm side selection: 'right' | 'left' | 'auto'
  const [selectedArm, setSelectedArm] = useState<ArmSideSelection>('right');
  const [activeSide, setActiveSide] = useState<'right' | 'left'>('right');

  // Test states: idle -> countdown -> running -> analyzing -> completed
  const [testState, setTestState] = useState<'idle' | 'countdown' | 'running' | 'analyzing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Landmark lock & quality states
  const [bodyDetected, setBodyDetected] = useState<boolean>(false);
  const [landmarksLocked, setLandmarksLocked] = useState<boolean>(false);
  const [lockGuidance, setLockGuidance] = useState<string>('Enable camera to begin');
  const [liveAngle, setLiveAngle] = useState<number>(0);
  const [liveQuality, setLiveQuality] = useState<'Good' | 'Limited' | 'Insufficient'>('Good');

  // Completed metrics
  const [metrics, setMetrics] = useState<ArmMetrics | null>(savedMetrics || null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  const testDuration = 20;

  // Refs for tracking loop to prevent unnecessary re-bindings and memory leaks
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const testStateRef = useRef<'idle' | 'countdown' | 'running' | 'analyzing' | 'completed'>('idle');
  testStateRef.current = testState;

  const isCameraActiveRef = useRef<boolean>(false);
  isCameraActiveRef.current = isCameraActive;

  const selectedArmRef = useRef<ArmSideSelection>('right');
  selectedArmRef.current = selectedArm;

  // Locked arm side during active recording session to strictly eliminate mid-test switching
  const lockedSideRef = useRef<'right' | 'left'>('right');

  // Telemetry buffers
  const deliveredFramesRef = useRef<number>(0);
  const processedFramesRef = useRef<number>(0);
  const validLandmarkFramesRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  const recordedTimesRef = useRef<number[]>([]);
  const recordedAnglesRef = useRef<number[]>([]);

  // Landmark confidence filter
  const isJointValid = (pt?: Point2D): boolean => {
    return !!pt && typeof pt.x === 'number' && typeof pt.y === 'number' && (pt.visibility === undefined || pt.visibility >= 0.45);
  };

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    setLockGuidance('Loading vision landmarking model...');
    try {
      await getPoseLandmarker();
      setLockGuidance('Requesting webcam access...');
      const ok = await startCamera();
      if (!ok) {
        setErrorMsg('Failed to access camera.');
        setLockGuidance('Camera access failed');
      } else {
        setLockGuidance('Position upper body in frame');
      }
    } catch (e: any) {
      setErrorMsg(`Failed to initialize MediaPipe Pose model: ${e.message}`);
      setLockGuidance('Model initialization failed');
    } finally {
      setModelLoading(false);
    }
  };

  // Tracking loop executed once per browser animation frame
  const runTrackingLoop = useCallback(async () => {
    if (!isCameraActiveRef.current) return;

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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nowInMs = performance.now();
    if (nowInMs <= lastTimestampRef.current) {
      nowInMs = lastTimestampRef.current + 1;
    }
    lastTimestampRef.current = nowInMs;

    let results: any = null;
    try {
      const landmarker = await getPoseLandmarker();
      results = landmarker.detectForVideo(video, nowInMs);
      processedFramesRef.current += 1;
    } catch {
      // transient frame drop
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results && results.landmarks && results.landmarks.length > 0) {
      const pose: Point2D[] = results.landmarks[0];

      // Anatomical upper body landmarks:
      // Right arm: 12 (Shoulder), 14 (Elbow), 16 (Wrist)
      // Left arm: 11 (Shoulder), 13 (Elbow), 15 (Wrist)
      const rShoulder = pose[12];
      const rElbow = pose[14];
      const rWrist = pose[16];

      const lShoulder = pose[11];
      const lElbow = pose[13];
      const lWrist = pose[15];

      const rightArmValid = isJointValid(rShoulder) && isJointValid(rElbow) && isJointValid(rWrist);
      const leftArmValid = isJointValid(lShoulder) && isJointValid(lElbow) && isJointValid(lWrist);

      // Determine which arm to track:
      let sideToTrack: 'right' | 'left' = 'right';

      if (testStateRef.current === 'running') {
        // STRICT RULE: Once recording starts, lock to the pre-selected arm. NEVER flip sides!
        sideToTrack = lockedSideRef.current;
      } else {
        // When idle/countdown, respect selection or auto-detect based on best visibility
        if (selectedArmRef.current === 'right') {
          sideToTrack = 'right';
        } else if (selectedArmRef.current === 'left') {
          sideToTrack = 'left';
        } else {
          // Auto
          const rVis = (rShoulder?.visibility || 0) + (rElbow?.visibility || 0) + (rWrist?.visibility || 0);
          const lVis = (lShoulder?.visibility || 0) + (lElbow?.visibility || 0) + (lWrist?.visibility || 0);
          sideToTrack = rVis >= lVis ? 'right' : 'left';
        }
        lockedSideRef.current = sideToTrack;
        setActiveSide(sideToTrack);
      }

      const activeArmValid = sideToTrack === 'right' ? rightArmValid : leftArmValid;
      const shoulder = sideToTrack === 'right' ? rShoulder : lShoulder;
      const elbow = sideToTrack === 'right' ? rElbow : lElbow;
      const wrist = sideToTrack === 'right' ? rWrist : lWrist;

      setBodyDetected(true);

      if (activeArmValid && shoulder && elbow && wrist) {
        validLandmarkFramesRef.current += 1;
        setLandmarksLocked(true);
        setLockGuidance(`${sideToTrack === 'right' ? 'Right' : 'Left'} arm landmarks locked`);

        const angle = calculateJointAngleDeg(shoulder, elbow, wrist);
        const roundedAngle = Math.round(angle);
        setLiveAngle(roundedAngle);

        if (testStateRef.current === 'running') {
          recordedTimesRef.current.push(nowInMs);
          recordedAnglesRef.current.push(angle);
        }

        // Draw mirrored skeleton:
        // Video is mirrored via CSS scale-x-[-1]. To match video without mirroring canvas text,
        // we invert X in coordinates: x_canvas = (1.0 - pt.x) * width
        const toCanvasX = (normX: number) => (1.0 - normX) * canvas.width;
        const toCanvasY = (normY: number) => normY * canvas.height;

        const sx = toCanvasX(shoulder.x);
        const sy = toCanvasY(shoulder.y);
        const ex = toCanvasX(elbow.x);
        const ey = toCanvasY(elbow.y);
        const wx = toCanvasX(wrist.x);
        const wy = toCanvasY(wrist.y);

        // Arm limb segments
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();

        // Joint markers
        const joints = [
          { x: sx, y: sy, r: 6, color: '#38bdf8' },
          { x: ex, y: ey, r: 8, color: '#0284c7' }, // Elbow vertex
          { x: wx, y: wy, r: 6, color: '#38bdf8' }
        ];

        joints.forEach((j) => {
          ctx.beginPath();
          ctx.arc(j.x, j.y, j.r, 0, 2 * Math.PI);
          ctx.fillStyle = j.color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        });

        // Joint angle label (Renders upright and readable, never backwards!)
        ctx.save();
        ctx.font = 'bold 15px Inter, system-ui, sans-serif';
        const labelText = `${roundedAngle}°`;
        const textWidth = ctx.measureText(labelText).width;
        const labelX = ex + 14;
        const labelY = ey - 12;

        // Label pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(labelX - 4, labelY - 14, textWidth + 8, 20, 6);
        ctx.fill();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, labelX, labelY);
        ctx.restore();
      } else {
        setLandmarksLocked(false);
        setLockGuidance(`Adjust position: ${sideToTrack === 'right' ? 'right' : 'left'} arm partially out of view`);
      }
    } else {
      setBodyDetected(false);
      setLandmarksLocked(false);
      setLockGuidance('Step back 3–5 ft into camera view');
    }

    // Telemetry ratio calculation
    const validCount = validLandmarkFramesRef.current;
    const deliveredCount = deliveredFramesRef.current;
    const ratio = deliveredCount > 0 ? (validCount / deliveredCount) * 100 : 100;
    if (ratio >= 80) setLiveQuality('Good');
    else if (ratio >= 50) setLiveQuality('Limited');
    else setLiveQuality('Insufficient');

    animationFrameId.current = requestAnimationFrame(runTrackingLoop);
  }, [videoRef]);

  // Handle camera start/stop synchronization
  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(runTrackingLoop);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isCameraActive, runTrackingLoop]);

  // Initiate countdown before active recording
  const handleStartCountdown = () => {
    if (!landmarksLocked) return;

    setErrorMsg(null);
    setTestState('countdown');
    setCountdown(3);

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          startActiveRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActiveRecording = () => {
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
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
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
        calculated.plainEnglishExplanation = 'The participant or clinician stopped the arm screening session before the 20-second protocol concluded.';
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
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTestState('idle');
    setTimeLeft(testDuration);
    setCountdown(3);
    setMetrics(null);
  };

  // Safe unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Feed & Overlay */}
        <div className="lg:col-span-2 relative aspect-[4/3] bg-slate-900 rounded-2xl border border-[#E0EFFA] overflow-hidden flex items-center justify-center shadow-xs">
          {/* Mirrored video stream */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
          />
          {/* Normal canvas orientation with X-coordinates mirrored in math so text is never backwards */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {/* Camera Inactive State */}
          {!isCameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900/90 z-20">
              <Camera className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-200 max-w-sm">
                Webcam is inactive. Grant browser permission to begin real-time arm excursion and velocity analysis.
              </p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-semibold text-xs transition-all shadow-glow-pill disabled:opacity-50 inline-flex items-center gap-2"
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
              {/* Top Bar Badges */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap">
                <div
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xs ${
                    landmarksLocked
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : bodyDetected
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700'
                  }`}
                >
                  {landmarksLocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{lockGuidance}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-200 border border-slate-700 backdrop-blur-md shadow-xs">
                  Side: <span className="text-[#0ea5e9] font-bold uppercase">{activeSide} Arm</span>
                </div>
              </div>

              {/* Countdown Overlay */}
              {testState === 'countdown' && (
                <div className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <span className="text-xs uppercase tracking-wider text-cyan-300 font-bold">Prepare Arm Motion</span>
                  <div className="text-6xl sm:text-7xl font-mono font-extrabold text-white animate-pulse">
                    {countdown}
                  </div>
                  <span className="text-xs text-slate-300">Assume starting flexed or extended posture...</span>
                </div>
              )}

              {/* Running Timer Badge */}
              {testState === 'running' && (
                <div className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-400 text-white font-mono font-bold text-sm shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Controls & Protocol Settings */}
        <div className="bg-white border border-[#E0EFFA] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0EFFA] pb-3">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Arm Protocol Controls</h5>
              <span className="text-[10px] text-slate-400">UPDRS Item 3.5</span>
            </div>

            {/* Arm Side Selector */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-semibold text-xs">Target Arm for Assessment</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedArm('right')}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition-all ${
                    selectedArm === 'right'
                      ? 'bg-[#F0F8FF] border-cyan-400 text-[#0ea5e9] shadow-xs'
                      : 'bg-white border-[#E0EFFA] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Right Arm
                </button>
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedArm('left')}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition-all ${
                    selectedArm === 'left'
                      ? 'bg-[#F0F8FF] border-cyan-400 text-[#0ea5e9] shadow-xs'
                      : 'bg-white border-[#E0EFFA] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Left Arm
                </button>
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedArm('auto')}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition-all ${
                    selectedArm === 'auto'
                      ? 'bg-[#F0F8FF] border-cyan-400 text-[#0ea5e9] shadow-xs'
                      : 'bg-white border-[#E0EFFA] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartCountdown}
                  disabled={!isCameraActive || !landmarksLocked}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-bold text-xs shadow-glow-pill transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 20s Arm Test (with 3s Prep)</span>
                </button>
              )}

              {testState === 'countdown' && (
                <button
                  type="button"
                  onClick={() => {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    setTestState('idle');
                  }}
                  className="w-full py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Cancel Countdown</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  type="button"
                  onClick={() => handleStopTest(false)}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Test Early / In Discomfort</span>
                </button>
              )}

              {testState === 'analyzing' && (
                <div className="w-full py-3 rounded-xl bg-[#F0F8FF] border border-[#E0EFFA] text-cyan-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
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

            {/* Test Progress Bar */}
            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Recording joint flexion-extension...</span>
                  <span className="font-mono">{Math.round(((testDuration - timeLeft) / testDuration) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-1000"
                    style={{ width: `${((testDuration - timeLeft) / testDuration) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {(errorMsg || cameraError) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg || cameraError}</span>
              </div>
            )}
          </div>

          {/* Live Telemetry Pill */}
          <div className="p-3.5 bg-[#F0F8FF] rounded-xl border border-[#E0EFFA] text-xs space-y-1.5 shadow-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Live Joint Angle:</span>
              <strong className="text-[#0ea5e9] font-mono text-sm">{liveAngle}°</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tracking Continuity:</span>
              <span className={liveQuality === 'Good' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {liveQuality}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {metrics && (
        <div className="space-y-5">
          {/* Plain-English Overview Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs uppercase tracking-wider text-cyan-700 font-bold">Arm Movement Screening Result</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{metrics.plainEnglishTitle}</h3>
                <p className="text-slate-600 text-xs leading-relaxed max-w-2xl">{metrics.plainEnglishExplanation}</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  metrics.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : metrics.status === 'Limited Excursion'
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {metrics.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-[#E0EFFA] text-xs text-slate-700">
              <strong className="text-slate-900">Recommended Action: </strong>
              <span>{metrics.recommendedAction}</span>
            </div>
          </div>

          {/* 4 Summary Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Excursion Range</span>
              <strong className="text-lg text-slate-900 font-mono">{metrics.excursionRangeDeg}°</strong>
              <span className="text-slate-400 block text-[10px]">[{metrics.minElbowAngleDeg}° – {metrics.maxElbowAngleDeg}°]</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Angular Velocity</span>
              <strong className="text-lg text-[#0ea5e9] font-mono">{metrics.meanAngularVelocityDegPerSec}°/s</strong>
              <span className="text-slate-400 block text-[10px]">peak: {metrics.peakAngularVelocityDegPerSec}°/s</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Movement Smoothness</span>
              <strong className="text-lg text-slate-900 font-mono">{metrics.movementSmoothnessScore}/100</strong>
              <span className="text-slate-400 block text-[10px]">SPARC consistency</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Tracking Continuity</span>
              <strong className="text-lg text-emerald-700 font-mono">{metrics.trackingContinuityPct}%</strong>
              <span className="text-slate-400 block text-[10px]">{metrics.repetitionCount} completed reps</span>
            </div>
          </div>

          {/* Recharts Joint Angle Chart */}
          <div className="p-4 rounded-xl bg-white border border-[#E0EFFA] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-600" />
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
                    <Line type="monotone" dataKey="displacement" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No angle series available</div>
              )}
            </div>
          </div>

          {/* Advanced Biomechanical Telemetry Collapsible */}
          <div className="border border-[#E0EFFA] rounded-xl overflow-hidden bg-white shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Advanced Biomechanical Telemetry & SPARC Spectral Arc</span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-[#E0EFFA] space-y-3 bg-[#F0F8FF] font-mono text-[11px] text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Delivered Frames</span>
                    <strong className="text-slate-900">{metrics.deliveredFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Processed Frames</span>
                    <strong className="text-slate-900">{metrics.processedFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Repetitions</span>
                    <strong className="text-slate-900">{metrics.repetitionCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Peak Speed</span>
                    <strong className="text-slate-900">{metrics.peakAngularVelocityDegPerSec}°/s</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rigidity Measurement Limitation Alert */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
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
