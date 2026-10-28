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

export const FingerTappingTest: React.FC<Props> = ({ onComplete, savedMetrics }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [testState, setTestState] = useState<'idle' | 'running' | 'analyzing' | 'completed'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [liveTapCount, setLiveTapCount] = useState<number>(0);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<TappingMetrics | null>(savedMetrics || null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  // Live quality state
  const [liveQuality, setLiveQuality] = useState<'Good' | 'Limited' | 'Insufficient'>('Good');

  const animationFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const testDuration = 30;

  // Frame telemetry refs
  const deliveredFramesRef = useRef<number>(0);
  const processedFramesRef = useRef<number>(0);
  const validLandmarkFramesRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Raw distance time-series
  const recordedTimesRef = useRef<number[]>([]);
  const recordedDistancesRef = useRef<number[]>([]);

  // Local live tap counting state
  const isClosedRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    try {
      await getHandLandmarker();
      const ok = await startCamera();
      if (!ok) setErrorMsg('Failed to access camera.');
    } catch (e: any) {
      setErrorMsg(`Failed to initialize MediaPipe vision model: ${e.message}`);
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
      setHandDetected(true);
      validLandmarkFramesRef.current += 1;
      const landmarks = results.landmarks[0];

      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];

      // Normalized distance scale: palm size between wrist and middle MCP
      const palmScale = distance2D(wrist, middleMcp);
      const rawDist = distance2D(thumbTip, indexTip);
      const normalizedDist = palmScale > 0.05 ? rawDist / palmScale : rawDist * 2.5;

      const tx = thumbTip.x * canvas.width;
      const ty = thumbTip.y * canvas.height;
      const ix = indexTip.x * canvas.width;
      const iy = indexTip.y * canvas.height;

      const isContact = normalizedDist < 0.35;

      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = isContact ? '#10b981' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw fingertips
      [thumbTip, indexTip].forEach((pt, idx) => {
        const px = pt.x * canvas.width;
        const py = pt.y * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, 2 * Math.PI);
        ctx.fillStyle = idx === 0 ? '#f59e0b' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      if (testState === 'running') {
        recordedTimesRef.current.push(nowInMs);
        recordedDistancesRef.current.push(normalizedDist);

        // Live approximate tap counter with refractory period
        if (!isClosedRef.current && normalizedDist <= 0.32) {
          if (nowInMs - lastTapTimeRef.current >= 120) {
            isClosedRef.current = true;
            lastTapTimeRef.current = nowInMs;
            setLiveTapCount(c => c + 1);
          }
        } else if (isClosedRef.current && normalizedDist >= 0.52) {
          isClosedRef.current = false;
        }
      }
    } else {
      setHandDetected(false);
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
    recordedDistancesRef.current = [];
    deliveredFramesRef.current = 0;
    processedFramesRef.current = 0;
    validLandmarkFramesRef.current = 0;
    isClosedRef.current = false;
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
    setTestState('idle');
    setTimeLeft(testDuration);
    setLiveTapCount(0);
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
      {/* Guidance */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-400" />
          <span>Finger Tapping Speed & Rhythm Protocol</span>
        </h4>
        <p className="text-slate-300 leading-relaxed">
          <strong>Instructions:</strong> Position your dominant hand in front of the camera with your thumb and index finger clearly visible. 
          Tap your index finger against your thumb repeatedly as rapidly and as widely as possible for 30 seconds.
        </p>
      </div>

      {/* Camera Viewport and Controls */}
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
              <p className="text-xs text-slate-400">Camera inactive. Grant permission to begin finger tapping analysis.</p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoading || modelLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading MediaPipe AI Model...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Webcam Stream</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border ${
                  handDetected
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}>
                  {handDetected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{handDetected ? 'Fingers Tracked' : 'Position Fingers in Frame'}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                  Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400' : 'text-amber-400'}>{liveQuality}</span>
                </div>
              </div>

              {/* Live Tap Counter Badge */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/50 text-teal-300 font-mono font-bold text-sm">
                  Taps: {liveTapCount}
                </div>
                {testState === 'running' && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/50 text-white font-mono font-bold text-sm">
                    {timeLeft}s
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider">Test Controls</h5>

            <div className="space-y-2">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!isCameraActive || !handDetected}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 30s Tapping Test</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  type="button"
                  onClick={() => handleStopTest(false)}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Test Early</span>
                </button>
              )}

              {testState === 'analyzing' && (
                <div className="w-full py-3 rounded-xl bg-teal-900/50 border border-teal-500/50 text-teal-200 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Tap Cadence & Fatigue...</span>
                </div>
              )}

              {testState === 'completed' && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Tapping</span>
                </button>
              )}
            </div>

            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Capturing tap rhythm...</span>
                  <span>{Math.round(((testDuration - timeLeft) / testDuration) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-1000"
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
              <span className="text-slate-400">Finger Detection:</span>
              <span className={handDetected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                {handDetected ? 'Thumb & Index Found' : 'Searching...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Live Tap Count:</span>
              <strong className="text-teal-400 font-mono text-sm">{liveTapCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="space-y-5">
          {/* Plain-English Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-teal-500/30 shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span className="text-xs uppercase tracking-wider text-teal-400 font-semibold">Tapping Kinematic Result</span>
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

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Tapping Cadence</span>
              <strong className="text-lg text-teal-400 font-mono">{metrics.tapsPerMinute}</strong>
              <span className="text-slate-500 block text-[10px]">taps per minute</span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Mean Inter-Tap Interval</span>
              <strong className="text-lg text-white font-mono">{metrics.meanInterTapIntervalMs} ms</strong>
              <span className="text-slate-500 block text-[10px]">±{metrics.interTapIntervalStdMs} ms variation</span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Rhythm Variability (CV)</span>
              <strong className="text-lg text-sky-400 font-mono">{metrics.rhythmCvPercent}%</strong>
              <span className="text-slate-500 block text-[10px]">coefficient of variation</span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Amplitude Fatigue Ratio</span>
              <strong className="text-lg text-white font-mono">{metrics.amplitudeFatigueRatio}</strong>
              <span className="text-slate-500 block text-[10px]">final vs initial ratio</span>
            </div>
          </div>

          {/* Recharts Distance Waveform */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>Thumb-Index Distance Trajectory</span>
              </span>
              <span className="text-[10px] text-slate-400">Normalized Distance vs Time</span>
            </div>
            <div className="h-44 w-full">
              {metrics.distanceSeries && metrics.distanceSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.distanceSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="time_sec" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="s" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}`, 'Normalized Distance']}
                      labelFormatter={(t) => `Time: ${t}s`}
                    />
                    <Line type="monotone" dataKey="displacement" stroke="#14b8a6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">No distance waveform available</div>
              )}
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/30 text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-semibold text-slate-300">Advanced Event Telemetry</span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-700/60 space-y-3 bg-slate-900/60 font-mono text-[11px] text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Total Detected</span>
                    <strong className="text-white">{metrics.totalTaps}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Validated Taps</span>
                    <strong className="text-white">{metrics.validatedTaps}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Continuity</span>
                    <strong className="text-white">{metrics.trackingContinuityPct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Recording Duration</span>
                    <strong className="text-white">{metrics.durationSeconds}s</strong>
                  </div>
                </div>

                {metrics.technicalDetails && (
                  <div className="pt-2 border-t border-slate-800 flex gap-4 text-slate-400">
                    <span>Close Threshold: {metrics.technicalDetails.close_threshold}</span>
                    <span>Open Threshold: {metrics.technicalDetails.open_threshold}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medical Notice */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement Notice:</strong> Finger tapping rhythm variability and fatigue can be influenced by hand fatigue, room temperature, arthritis, or familiarity with the test. <strong>This screening test is for research exploration only.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
