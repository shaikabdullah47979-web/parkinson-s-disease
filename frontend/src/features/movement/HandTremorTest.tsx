import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Play, Square, RotateCcw, AlertCircle, CheckCircle2, ShieldAlert, Activity, ChevronDown, ChevronUp, Waves, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCamera } from '../../hooks/useCamera';
import { getHandLandmarker } from '../../utils/mediaPipeVision';
import { TremorMetrics, analyzeTremorKinematics } from '../../utils/movementAnalytics';

interface Props {
  onComplete: (metrics: TremorMetrics) => void;
  savedMetrics?: TremorMetrics | null;
}

export const HandTremorTest: React.FC<Props> = ({ onComplete, savedMetrics }) => {
  const { videoRef, isCameraActive, cameraError, isLoading, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [testState, setTestState] = useState<'idle' | 'running' | 'analyzing' | 'completed'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<TremorMetrics | null>(savedMetrics || null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  // Live Frame Telemetry
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveQuality, setLiveQuality] = useState<'Good' | 'Limited' | 'Insufficient'>('Good');

  // Tracking loop references
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const testDuration = 30;

  // Frame telemetry refs
  const deliveredFramesRef = useRef<number>(0);
  const processedFramesRef = useRef<number>(0);
  const validLandmarkFramesRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Raw time-series coordinate collection
  const recordedTimesRef = useRef<number[]>([]);
  const recordedXRef = useRef<number[]>([]);
  const recordedYRef = useRef<number[]>([]);

  // Initialize MediaPipe and Camera
  const handleStartCamera = async () => {
    setErrorMsg(null);
    setModelLoading(true);
    try {
      await getHandLandmarker();
      const cameraOk = await startCamera();
      if (!cameraOk) {
        setErrorMsg('Failed to access camera.');
      }
    } catch (e: any) {
      setErrorMsg(`Failed to initialize MediaPipe vision model: ${e.message}`);
    } finally {
      setModelLoading(false);
    }
  };

  // Tracking loop with hardware frame callback
  const runTrackingLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(runTrackingLoop);
      return;
    }

    deliveredFramesRef.current += 1;

    // Maintain canvas resolution without resizing on every frame
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const landmarker = await getHandLandmarker();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Strict monotonically increasing timestamp
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

      // Draw skeleton connections
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0284c7';
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17] // Palm
      ];

      for (const [s, e] of connections) {
        ctx.beginPath();
        ctx.moveTo(landmarks[s].x * canvas.width, landmarks[s].y * canvas.height);
        ctx.lineTo(landmarks[e].x * canvas.width, landmarks[e].y * canvas.height);
        ctx.stroke();
      }

      // Draw glowing landmark joints
      for (const pt of landmarks) {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // If test is currently running, record coordinates
      if (testState === 'running') {
        recordedTimesRef.current.push(nowInMs);
        recordedXRef.current.push(landmarks[0].x);
        recordedYRef.current.push(landmarks[0].y);
      }
    } else {
      setHandDetected(false);
    }

    // Update live tracking quality and FPS
    const validCount = validLandmarkFramesRef.current;
    const deliveredCount = deliveredFramesRef.current;
    const ratio = deliveredCount > 0 ? (validCount / deliveredCount) * 100 : 100;
    if (ratio >= 80) setLiveQuality('Good');
    else if (ratio >= 50) setLiveQuality('Limited');
    else setLiveQuality('Insufficient');

    if (deliveredCount % 30 === 0 && deliveredCount > 0) {
      setLiveFps(Math.round((deliveredCount / ((nowInMs - (recordedTimesRef.current[0] || nowInMs - 1000)) / 1000))));
    }

    animationFrameId.current = requestAnimationFrame(runTrackingLoop);
  }, [videoRef, testState]);

  // Start tracking loop when camera activates
  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(runTrackingLoop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isCameraActive, runTrackingLoop]);

  // Start 30-second test
  const handleStartTest = () => {
    recordedTimesRef.current = [];
    recordedXRef.current = [];
    recordedYRef.current = [];
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

  // Stop test and calculate metrics via backend scientific pipeline
  const handleStopTest = async (completedNaturally = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsed = testDuration - timeLeft;
    const finalDuration = completedNaturally ? testDuration : Math.max(1, elapsed);
    setTestState('analyzing');

    try {
      const calculated = await analyzeTremorKinematics(
        recordedTimesRef.current,
        recordedXRef.current,
        recordedYRef.current,
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
    setMetrics(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      {/* Test Guidance */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Hand Stability & Tremor Protocol</span>
        </h4>
        <p className="text-slate-300 leading-relaxed">
          <strong>Instructions:</strong> Position your hand clearly in front of the camera, approximately 1–2 feet away. 
          Keep your wrist and fingers comfortably supported or gently outstretched and hold as still as possible for 30 seconds.
        </p>
      </div>

      {/* Camera Viewport and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video / Canvas */}
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
              <p className="text-xs text-slate-400">Camera is currently inactive. Grant permission to begin live tracking.</p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50 inline-flex items-center gap-2"
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
              {/* Status Pill Overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border ${
                  handDetected
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}>
                  {handDetected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{handDetected ? 'Hand Tracked' : 'Position Hand in Frame'}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                  Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400' : 'text-amber-400'}>{liveQuality}</span>
                </div>
              </div>

              {/* Countdown Overlay when running */}
              {testState === 'running' && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/50 text-white font-mono font-bold text-sm">
                  {timeLeft}s
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Controls & Test Dashboard */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider">Test Controls & Status</h5>

            {/* Test Action Buttons */}
            <div className="space-y-2">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!isCameraActive || !handDetected}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 30s Tremor Test</span>
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
                <div className="w-full py-3 rounded-xl bg-sky-900/50 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span>Computing Welch Spectral Density...</span>
                </div>
              )}

              {testState === 'completed' && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Stability</span>
                </button>
              )}
            </div>

            {/* Live Progress Bar when running */}
            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Recording Kinematic Frames...</span>
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

            {/* Error Message */}
            {(errorMsg || cameraError) && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg || cameraError}</span>
              </div>
            )}
          </div>

          {/* Real-time Status Card */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Hand Detection:</span>
              <span className={handDetected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                {handDetected ? 'Active (21 Joints)' : 'Searching...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tracking Quality:</span>
              <span className={`font-semibold ${liveQuality === 'Good' ? 'text-emerald-400' : 'text-amber-400'}`}>{liveQuality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Test Phase:</span>
              <span className="text-white font-medium">
                {testState === 'running' ? 'Recording' : testState === 'analyzing' ? 'Signal Processing' : testState === 'completed' ? 'Done' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results View */}
      {metrics && (
        <div className="space-y-5">
          {/* Plain-English Overview Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-sky-500/30 shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Screening Result</span>
                </div>
                <h3 className="text-lg font-bold text-white">{metrics.plainEnglishTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">{metrics.plainEnglishExplanation}</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                metrics.status === 'Reliable Estimate'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : metrics.status === 'Preliminary Estimate'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {metrics.status}
              </span>
            </div>

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-300">
              <strong className="text-white">Recommended Action: </strong>
              <span>{metrics.recommendedAction}</span>
            </div>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Dominant Oscillation</span>
              <strong className="text-lg text-sky-400 font-mono">
                {metrics.dominantFrequencyHz ? `${metrics.dominantFrequencyHz} Hz` : 'Not Detected'}
              </strong>
              <span className="text-slate-500 block text-[10px]">
                {metrics.dominantCyclesPerMin ? `${metrics.dominantCyclesPerMin} cycles/min` : 'irregular rhythm'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Tracking Continuity</span>
              <strong className="text-lg text-emerald-400 font-mono">{metrics.trackingContinuityPct}%</strong>
              <span className="text-slate-500 block text-[10px]">
                {metrics.validLandmarkFrames} / {metrics.deliveredFrames} frames valid
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Mean Displacement</span>
              <strong className="text-lg text-white font-mono">{metrics.meanDisplacement}</strong>
              <span className="text-slate-500 block text-[10px]">milli-units (drift-detrended)</span>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Signal Quality</span>
              <strong className="text-lg text-teal-400 font-mono">{metrics.signalQuality}</strong>
              <span className="text-slate-500 block text-[10px]">{metrics.effectiveFps} effective FPS</span>
            </div>
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Time-Domain Trajectory */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Time-Domain Motion Trajectory</span>
                </span>
                <span className="text-[10px] text-slate-400">Displacement vs Time</span>
              </div>
              <div className="h-44 w-full">
                {metrics.timeSeries && metrics.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="time_sec" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                        formatter={(val: any) => [`${val} milli-units`, 'Displacement']}
                        labelFormatter={(t) => `Time: ${t}s`}
                      />
                      <Line type="monotone" dataKey="displacement" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">No time-series data</div>
                )}
              </div>
            </div>

            {/* Chart 2: Welch Power Spectral Density */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-teal-400" />
                  <span>Power Spectral Density (Welch PSD)</span>
                </span>
                <span className="text-[10px] text-slate-400">0 – 12 Hz Spectrum</span>
              </div>
              <div className="h-44 w-full">
                {metrics.psdSpectrum && metrics.psdSpectrum.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.psdSpectrum} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="freq_hz" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="Hz" />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                        formatter={(val: any) => [`${val}`, 'Spectral Power']}
                        labelFormatter={(f) => `Frequency: ${f} Hz`}
                      />
                      <Area type="monotone" dataKey="power" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Spectrum unavailable for this recording duration
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Technical & Research Details */}
          <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/30 text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <span>Advanced Signal Processing & Engineering Telemetry</span>
              </span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-700/60 space-y-3 bg-slate-900/60 font-mono text-[11px] text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Spectral SNR</span>
                    <strong className="text-white">{metrics.snrDb ? `${metrics.snrDb} dB` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hardware Frames</span>
                    <strong className="text-white">{metrics.deliveredFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Processed Frames</span>
                    <strong className="text-white">{metrics.processedFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valid Landmarks</span>
                    <strong className="text-white">{metrics.validLandmarkFrames}</strong>
                  </div>
                </div>

                {metrics.technicalDetails && Object.keys(metrics.technicalDetails).length > 0 && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(metrics.technicalDetails).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-slate-500 block">{key}:</span>
                        <span className="text-sky-300">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medical Notice */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Research Prototype Notice:</strong> Observable hand movement frequencies (even in the 4–6 Hz range) can arise from normal physiological tremor, anxiety, caffeine, fatigue, or essential tremor. 
              <strong> This measurement does not diagnose Parkinson's disease.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
