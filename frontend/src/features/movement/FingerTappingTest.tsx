import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Play, Square, RotateCcw, AlertCircle, CheckCircle2, ShieldAlert, Zap, ChevronDown, ChevronUp, Activity, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCamera } from '../../hooks/useCamera';
import { getHandLandmarker } from '../../utils/mediaPipeVision';
import { TappingMetrics, analyzeTappingKinematics, distance2D } from '../../utils/movementAnalytics';

interface Props {
  onComplete: (metrics: TappingMetrics) => void;
  savedMetrics?: TappingMetrics | null;
}

type HandSelection = 'right' | 'left' | 'auto';

export const FingerTappingTest: React.FC<Props> = ({ onComplete, savedMetrics }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hand selection and state
  const [selectedHand, setSelectedHand] = useState<HandSelection>('right');
  const [activeHand, setActiveHand] = useState<'right' | 'left'>('right');

  // Test states: idle -> countdown -> running -> analyzing -> completed
  const [testState, setTestState] = useState<'idle' | 'countdown' | 'running' | 'analyzing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [liveTapCount, setLiveTapCount] = useState<number>(0);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [lockGuidance, setLockGuidance] = useState<string>('Enable camera to begin');
  const [metrics, setMetrics] = useState<TappingMetrics | null>(savedMetrics || null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  // Live quality state
  const [liveQuality, setLiveQuality] = useState<'Good' | 'Limited' | 'Insufficient'>('Good');

  const animationFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const testDuration = 30;

  // Frame telemetry refs
  const deliveredFramesRef = useRef<number>(0);
  const processedFramesRef = useRef<number>(0);
  const validLandmarkFramesRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // State refs for animation loop
  const testStateRef = useRef<'idle' | 'countdown' | 'running' | 'analyzing' | 'completed'>('idle');
  testStateRef.current = testState;

  const selectedHandRef = useRef<HandSelection>('right');
  selectedHandRef.current = selectedHand;

  // Raw distance time-series
  const recordedTimesRef = useRef<number[]>([]);
  const recordedDistancesRef = useRef<number[]>([]);

  // Hysteresis live tap counting state
  const isClosedRef = useRef<boolean>(false);
  const cycleMaxDistRef = useRef<number>(0.6);
  const lastTapTimeRef = useRef<number>(0);

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    setLockGuidance('Loading vision landmarking model...');
    try {
      await getHandLandmarker();
      setLockGuidance('Requesting webcam access...');
      const ok = await startCamera();
      if (!ok) {
        setErrorMsg('Failed to access camera.');
        setLockGuidance('Camera access failed');
      } else {
        setLockGuidance('Hold hand in front of camera with fingers spread');
      }
    } catch (e: any) {
      setErrorMsg(`Failed to initialize MediaPipe vision model: ${e.message}`);
      setLockGuidance('Model initialization failed');
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

    const landmarker = await getHandLandmarker();
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
      // Target hand selection
      let handIndex = 0;
      if (results.handednesses && results.handednesses.length > 0) {
        if (selectedHandRef.current !== 'auto') {
          // On mirrored webcams, MediaPipe's "Left" is user's right side in preview
          const targetCategory = selectedHandRef.current === 'right' ? 'Left' : 'Right';
          const matchIdx = results.handednesses.findIndex((h: any) => h[0]?.categoryName === targetCategory);
          if (matchIdx !== -1) handIndex = matchIdx;
        }
        const detectedSide = results.handednesses[handIndex]?.[0]?.categoryName === 'Left' ? 'right' : 'left';
        setActiveHand(detectedSide);
      }

      const landmarks = results.landmarks[handIndex];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];

      if (thumbTip && indexTip && wrist && middleMcp) {
        setHandDetected(true);
        setLockGuidance('Fingers tracked — ready for tapping test');
        validLandmarkFramesRef.current += 1;

        // Normalized distance: distance between thumb tip and index tip divided by palm scale
        const palmScale = distance2D(wrist, middleMcp);
        const rawDist = distance2D(thumbTip, indexTip);
        const normalizedDist = palmScale > 0.05 ? rawDist / palmScale : rawDist * 2.5;

        // Video is mirrored via CSS scale-x-[-1]. To match video without mirroring canvas text,
        // we invert X in coordinates: x_canvas = (1.0 - pt.x) * width
        const toCanvasX = (normX: number) => (1.0 - normX) * canvas.width;
        const toCanvasY = (normY: number) => normY * canvas.height;

        const tx = toCanvasX(thumbTip.x);
        const ty = toCanvasY(thumbTip.y);
        const ix = toCanvasX(indexTip.x);
        const iy = toCanvasY(indexTip.y);

        const isContact = normalizedDist < 0.32;

        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ix, iy);
        ctx.strokeStyle = isContact ? '#10b981' : '#0ea5e9';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw fingertips
        [
          { pt: thumbTip, color: '#f59e0b', label: 'Thumb' },
          { pt: indexTip, color: '#0ea5e9', label: 'Index' }
        ].forEach((item) => {
          const px = toCanvasX(item.pt.x);
          const py = toCanvasY(item.pt.y);
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, 2 * Math.PI);
          ctx.fillStyle = item.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Track peak excursion for hysteresis state machine
        if (normalizedDist > cycleMaxDistRef.current) {
          cycleMaxDistRef.current = normalizedDist;
        }

        // Live approximate tap counter with excursion requirement & refractory period
        if (testStateRef.current === 'running') {
          recordedTimesRef.current.push(nowInMs);
          recordedDistancesRef.current.push(normalizedDist);

          if (!isClosedRef.current) {
            if (normalizedDist <= 0.30 && (cycleMaxDistRef.current - normalizedDist) >= 0.15) {
              if (nowInMs - lastTapTimeRef.current >= 100) {
                isClosedRef.current = true;
                lastTapTimeRef.current = nowInMs;
                cycleMaxDistRef.current = normalizedDist;
                setLiveTapCount((c) => c + 1);
              }
            }
          } else if (normalizedDist >= 0.48) {
            isClosedRef.current = false;
            cycleMaxDistRef.current = normalizedDist;
          }
        }
      } else {
        setHandDetected(false);
        setLockGuidance('Position fingers fully within frame');
      }
    } else {
      setHandDetected(false);
      setLockGuidance('Hold hand up to the camera');
    }

    const validCount = validLandmarkFramesRef.current;
    const deliveredCount = deliveredFramesRef.current;
    const ratio = deliveredCount > 0 ? (validCount / deliveredCount) * 100 : 100;
    if (ratio >= 80) setLiveQuality('Good');
    else if (ratio >= 50) setLiveQuality('Limited');
    else setLiveQuality('Insufficient');

    animationFrameId.current = requestAnimationFrame(runTrackingLoop);
  }, [videoRef]);

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
    if (!handDetected) {
      setErrorMsg('Please position your hand in view of the camera before starting.');
      return;
    }

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
    recordedDistancesRef.current = [];
    deliveredFramesRef.current = 0;
    processedFramesRef.current = 0;
    validLandmarkFramesRef.current = 0;
    isClosedRef.current = false;
    cycleMaxDistRef.current = 0.6;
    lastTapTimeRef.current = 0;

    setLiveTapCount(0);
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
      const calculated = await analyzeTappingKinematics(
        recordedTimesRef.current,
        recordedDistancesRef.current,
        deliveredFramesRef.current,
        finalDuration
      );

      if (!completedNaturally) {
        calculated.status = 'Interrupted';
        calculated.plainEnglishTitle = 'Test Interrupted by User';
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
    setLiveTapCount(0);
    setMetrics(null);
  };

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
      {/* Camera Viewport and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative aspect-[4/3] bg-slate-900 rounded-2xl border border-slate-300 overflow-hidden flex items-center justify-center shadow-xs">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
          />
          {/* Note: Canvas is kept unmirrored so coordinates and labels render upright */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {!isCameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900/90 z-20">
              <Camera className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-200 max-w-sm">Webcam is inactive. Grant browser permission to begin finger tapping analysis.</p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-semibold text-xs transition-all shadow-glow-pill disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoading || modelLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading MediaPipe AI Model...</span>
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
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xs ${
                  handDetected
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
                    : 'bg-amber-900/90 text-amber-200 border-amber-500/40'
                }`}>
                  {handDetected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{lockGuidance}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-xs">
                  Hand: <span className="text-cyan-400 font-bold uppercase">{activeHand}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-xs">
                  Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{liveQuality}</span>
                </div>
              </div>

              {/* Countdown Overlay */}
              {testState === 'countdown' && (
                <div className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <span className="text-xs uppercase tracking-wider text-cyan-300 font-bold">Prepare Hand & Fingers</span>
                  <div className="text-6xl sm:text-7xl font-mono font-extrabold text-white animate-pulse">
                    {countdown}
                  </div>
                  <span className="text-xs text-slate-300">Spread thumb and index finger wide...</span>
                </div>
              )}

              {/* Live Tap Counter Badge */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/60 text-cyan-300 font-mono font-bold text-sm shadow-md">
                  Taps: {liveTapCount}
                </div>
                {testState === 'running' && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700 text-white font-mono font-bold text-sm shadow-md flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Controls & Protocol Settings */}
        <div className="bg-white border border-[#E0EFFA] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <h5 className="font-bold text-navy-800 text-xs uppercase tracking-wider">Test Controls</h5>

            {/* Target Hand Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 block">Target Hand</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedHand('right')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedHand === 'right'
                      ? 'bg-white text-navy-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Right Hand
                </button>
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedHand('left')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedHand === 'left'
                      ? 'bg-white text-navy-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Left Hand
                </button>
                <button
                  type="button"
                  disabled={testState === 'running' || testState === 'countdown'}
                  onClick={() => setSelectedHand('auto')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedHand === 'auto'
                      ? 'bg-white text-navy-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartCountdown}
                  disabled={!isCameraActive || !handDetected}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 30s Tapping Test</span>
                </button>
              )}

              {testState === 'countdown' && (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-xl bg-cyan-600/80 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-wait"
                >
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Starting in {countdown}s...</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  type="button"
                  onClick={() => handleStopTest(false)}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Test Early</span>
                </button>
              )}

              {testState === 'analyzing' && (
                <div className="w-full py-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Tap Cadence & Fatigue...</span>
                </div>
              )}

              {testState === 'completed' && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Tapping</span>
                </button>
              )}
            </div>

            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Capturing tap rhythm...</span>
                  <span className="font-mono">{Math.round(((testDuration - timeLeft) / testDuration) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-1000"
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
              <span className="text-slate-500">Target Selection:</span>
              <strong className="text-navy-800 capitalize">{selectedHand} Hand ({activeHand} active)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Finger Detection:</span>
              <span className={handDetected ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-medium'}>
                {handDetected ? 'Thumb & Index Found' : 'Searching...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Live Tap Count:</span>
              <strong className="text-cyan-700 font-mono text-sm">{liveTapCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="space-y-5">
          {/* Plain-English Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E0EFFA] shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs uppercase tracking-wider text-cyan-700 font-bold">Tapping Kinematic Result</span>
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

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Tapping Cadence</span>
              <strong className="text-lg text-cyan-700 font-mono">{metrics.tapsPerMinute}</strong>
              <span className="text-slate-400 block text-[10px]">
                {metrics.tapsPerSecond ? `${metrics.tapsPerSecond} taps/s` : `${(metrics.tapsPerMinute / 60).toFixed(1)} taps/s`}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Mean Inter-Tap Interval</span>
              <strong className="text-lg text-navy-800 font-mono">{metrics.meanInterTapIntervalMs} ms</strong>
              <span className="text-slate-400 block text-[10px]">±{metrics.interTapIntervalStdMs} ms variation</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Rhythm Variation (CV)</span>
              <strong className="text-lg text-navy-800 font-mono">
                {metrics.totalTaps >= 3 ? `${metrics.rhythmCvPercent}%` : 'N/A (< 3 taps)'}
              </strong>
              <span className="text-slate-400 block text-[10px]">Lower is more regular</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E0EFFA] rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Amplitude Fatigue</span>
              <strong className="text-lg text-navy-800 font-mono">{metrics.amplitudeFatigueRatio}x</strong>
              <span className="text-slate-400 block text-[10px]">
                {metrics.amplitudeFatiguePct !== undefined && metrics.amplitudeFatiguePct !== null
                  ? `${metrics.amplitudeFatiguePct}% decrement`
                  : 'Initial vs late amplitude'}
              </span>
            </div>
          </div>

          {/* Recharts Distance Waveform */}
          <div className="p-4 rounded-xl bg-white border border-[#E0EFFA] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-600" />
                <span>Thumb-Index Distance Trajectory</span>
              </span>
              <span className="text-[10px] text-slate-500">Normalized Distance vs Time</span>
            </div>
            <div className="h-44 w-full">
              {metrics.distanceSeries && metrics.distanceSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.distanceSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="time_sec" stroke="#64748B" tick={{ fontSize: 10 }} unit="s" />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '11px', color: '#0F2D5B', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}`, 'Normalized Distance']}
                      labelFormatter={(t) => `Time: ${t}s`}
                    />
                    <Line type="monotone" dataKey="displacement" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No distance waveform available</div>
              )}
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div className="border border-[#E0EFFA] rounded-xl overflow-hidden bg-white shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Advanced Event Telemetry</span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50 font-mono text-[11px] text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Total Detected</span>
                    <strong className="text-navy-800">{metrics.totalTaps}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Validated Taps</span>
                    <strong className="text-navy-800">{metrics.validatedTaps}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Continuity</span>
                    <strong className="text-navy-800">{metrics.trackingContinuityPct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Recording Duration</span>
                    <strong className="text-navy-800">{metrics.durationSeconds}s</strong>
                  </div>
                </div>

                {metrics.technicalDetails && (
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-slate-500">
                    <span>Close Threshold: {metrics.technicalDetails.close_threshold}</span>
                    <span>Open Threshold: {metrics.technicalDetails.open_threshold}</span>
                    {metrics.technicalDetails.min_excursion && (
                      <span>Min Excursion: {metrics.technicalDetails.min_excursion}</span>
                    )}
                    {metrics.technicalDetails.taps_per_second && (
                      <span>Taps/sec: {metrics.technicalDetails.taps_per_second}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medical Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement Notice:</strong> Finger tapping rhythm variability and fatigue can be influenced by hand fatigue, room temperature, arthritis, or familiarity with the test. <strong>This screening test is for research exploration only.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
