import React from 'react';
import { Camera, CameraOff, Mic, MicOff, Shield, RefreshCw } from 'lucide-react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraActive: boolean;
  isMicActive: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSwitchCamera?: () => void;
  hasMultipleCameras?: boolean;
  cameraError?: string | null;
  patientName?: string;
  micLevel?: number; // 0 to 100
}

export const PatientVideoViewport: React.FC<Props> = ({
  videoRef,
  isCameraActive,
  isMicActive,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  hasMultipleCameras = false,
  cameraError,
  patientName = "Patient",
  micLevel = 0
}) => {
  return (
    <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between group">
      {/* Video Feed */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
          isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Camera Off Placeholder */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-400 space-y-2 z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
            <CameraOff className="w-7 h-7" />
          </div>
          <span className="text-xs font-semibold text-slate-300">Camera Inactive</span>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            {cameraError || "Enable camera for face-to-face AI clinical consultation."}
          </p>
          <button
            type="button"
            onClick={onToggleCamera}
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Turn On Camera
          </button>
        </div>
      )}

      {/* Top Overlay: Patient Label & Privacy Indicator */}
      <div className="relative z-20 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{patientName}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[10px] text-slate-300">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>Encrypted Local Stream</span>
          </div>
        </div>

        {hasMultipleCameras && onSwitchCamera && isCameraActive && (
          <button
            type="button"
            onClick={onSwitchCamera}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
            title="Switch Camera Device"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Overlay: Mic Activity Meter & Quick Controls */}
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent">
        {/* Mic Indicator & Real-Time Audio Level Meter */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border backdrop-blur-md ${
            isMicActive
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
          }`}>
            {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </div>

          {isMicActive && (
            <div className="flex items-center gap-0.5 h-3.5">
              {[1, 2, 3, 4, 5].map((bar) => {
                const active = micLevel >= bar * 18;
                return (
                  <div
                    key={bar}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      active ? 'bg-emerald-400 h-3.5' : 'bg-slate-700 h-1.5'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Local Stream Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCamera}
            className={`p-2 rounded-xl border backdrop-blur-md transition-colors ${
              isCameraActive
                ? 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
                : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
            }`}
            title={isCameraActive ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleMic}
            className={`p-2 rounded-xl border backdrop-blur-md transition-colors ${
              isMicActive
                ? 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
                : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
            }`}
            title={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

