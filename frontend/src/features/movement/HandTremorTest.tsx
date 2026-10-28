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
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
        <h4 className="font-bold text-navy-800 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Hand Stability & Tremor Protocol</span>
        </h4>
        <p className="text-slate-600 leading-relaxed">
          <strong>Instructions:</strong> Position your hand clearly in front of the camera, approximately 1–2 feet away. 
          Keep your wrist and fingers comfortably supported or gently outstretched and hold as still as possible for 30 seconds.
        </p>
      </div>

      {/* Camera Viewport and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video / Canvas */}
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
              <p className="text-xs text-slate-200 max-w-sm">Webcam is currently inactive. Grant browser permission to begin live hand tracking.</p>
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={isLoading || modelLoading}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
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
              {/* Status Pill Overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xs ${
                  handDetected
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
                    : 'bg-amber-900/90 text-amber-200 border-amber-500/40'
                }`}>
                  {handDetected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{handDetected ? 'Hand Tracked' : 'Position Hand in Frame'}</span>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-xs">
                  Tracking: <span className={liveQuality === 'Good' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{liveQuality}</span>
                </div>
              </div>

              {/* Countdown Overlay when running */}
              {testState === 'running' && (
                <div className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-teal-500/60 text-white font-mono font-bold text-sm shadow-md">
                  {timeLeft}s
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Controls & Test Dashboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <h5 className="font-bold text-navy-800 text-xs uppercase tracking-wider">Test Controls & Status</h5>

            {/* Test Action Buttons */}
            <div className="space-y-2">
              {testState === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!isCameraActive || !handDetected}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 30s Tremor Test</span>
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
                <div className="w-full py-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Computing Welch Spectral Density...</span>
                </div>
              )}

              {testState === 'completed' && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Stability</span>
                </button>
              )}
            </div>

            {/* Live Progress Bar when running */}
            {testState === 'running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Recording Kinematic Frames...</span>
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

            {/* Error Message */}
            {(errorMsg || cameraError) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg || cameraError}</span>
              </div>
            )}
          </div>

          {/* Real-time Status Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Hand Detection:</span>
              <span className={handDetected ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-medium'}>
                {handDetected ? 'Active (21 Joints)' : 'Searching...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tracking Quality:</span>
              <span className={`font-semibold ${liveQuality === 'Good' ? 'text-emerald-700' : 'text-amber-700'}`}>{liveQuality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Test Phase:</span>
              <span className="text-navy-800 font-semibold">
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-xs uppercase tracking-wider text-teal-700 font-bold">Screening Result</span>
                </div>
                <h3 className="text-lg font-bold text-navy-800">{metrics.plainEnglishTitle}</h3>
                <p className="text-slate-600 text-xs leading-relaxed max-w-2xl">{metrics.plainEnglishExplanation}</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                metrics.status === 'Reliable Estimate'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : metrics.status === 'Preliminary Estimate'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {metrics.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <strong className="text-navy-800">Recommended Action: </strong>
              <span>{metrics.recommendedAction}</span>
            </div>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Dominant Oscillation</span>
              <strong className="text-lg text-navy-800 font-mono">
                {metrics.dominantFrequencyHz ? `${metrics.dominantFrequencyHz} Hz` : 'Not Detected'}
              </strong>
              <span className="text-slate-400 block text-[10px]">
                {metrics.dominantCyclesPerMin ? `${metrics.dominantCyclesPerMin} cycles/min` : 'irregular rhythm'}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Tracking Continuity</span>
              <strong className="text-lg text-emerald-700 font-mono">{metrics.trackingContinuityPct}%</strong>
              <span className="text-slate-400 block text-[10px]">
                {metrics.validLandmarkFrames} / {metrics.deliveredFrames} frames valid
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Mean Displacement</span>
              <strong className="text-lg text-navy-800 font-mono">{metrics.meanDisplacement}</strong>
              <span className="text-slate-400 block text-[10px]">milli-units (drift-detrended)</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">Signal Quality</span>
              <strong className="text-lg text-teal-700 font-mono">{metrics.signalQuality}</strong>
              <span className="text-slate-400 block text-[10px]">{metrics.effectiveFps} effective FPS</span>
            </div>
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Time-Domain Trajectory */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Time-Domain Motion Trajectory</span>
                </span>
                <span className="text-[10px] text-slate-500">Displacement vs Time</span>
              </div>
              <div className="h-44 w-full">
                {metrics.timeSeries && metrics.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="time_sec" stroke="#64748B" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '11px', color: '#0F2D5B', borderRadius: '8px' }}
                        formatter={(val: any) => [`${val} milli-units`, 'Displacement']}
                        labelFormatter={(t) => `Time: ${t}s`}
                      />
                      <Line type="monotone" dataKey="displacement" stroke="#0F766E" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No time-series data</div>
                )}
              </div>
            </div>

            {/* Chart 2: Welch Power Spectral Density */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-teal-600" />
                  <span>Power Spectral Density (Welch PSD)</span>
                </span>
                <span className="text-[10px] text-slate-500">0 – 12 Hz Spectrum</span>
              </div>
              <div className="h-44 w-full">
                {metrics.psdSpectrum && metrics.psdSpectrum.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.psdSpectrum} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="freq_hz" stroke="#64748B" tick={{ fontSize: 10 }} unit="Hz" />
                      <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '11px', color: '#0F2D5B', borderRadius: '8px' }}
                        formatter={(val: any) => [`${val}`, 'Spectral Power']}
                        labelFormatter={(f) => `Frequency: ${f} Hz`}
                      />
                      <Area type="monotone" dataKey="power" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Spectrum unavailable for this recording duration
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Technical & Research Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span>Advanced Signal Processing & Engineering Telemetry</span>
              </span>
              {showTechnical ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnical && (
              <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50 font-mono text-[11px] text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Spectral SNR</span>
                    <strong className="text-navy-800">{metrics.snrDb ? `${metrics.snrDb} dB` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hardware Frames</span>
                    <strong className="text-navy-800">{metrics.deliveredFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Processed Frames</span>
                    <strong className="text-navy-800">{metrics.processedFrames}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valid Landmarks</span>
                    <strong className="text-navy-800">{metrics.validLandmarkFrames}</strong>
                  </div>
                </div>

                {metrics.technicalDetails && Object.keys(metrics.technicalDetails).length > 0 && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(metrics.technicalDetails).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-slate-500 block">{key}:</span>
                        <span className="text-teal-700">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medical Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Research Prototype Notice:</strong> Observable hand movement frequencies (even in the 4–6 Hz range) can arise from physiological tremor, stress, caffeine, fatigue, or essential tremor. 
              <strong> This measurement does not diagnose Parkinson's disease.</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
