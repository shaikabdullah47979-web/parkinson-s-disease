import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useVoiceConsultation } from '../hooks/useVoiceConsultation';
import { ConsultationTopBar } from '../components/consultation/ConsultationTopBar';
import { PatientVideoViewport } from '../components/consultation/PatientVideoViewport';
import { AIAvatarViewport } from '../components/consultation/AIAvatarViewport';
import { AudioWaveformVisualizer } from '../components/consultation/AudioWaveformVisualizer';
import { LiveSubtitleBanner } from '../components/consultation/LiveSubtitleBanner';
import { ConsultationControlBar } from '../components/consultation/ConsultationControlBar';
import { ApiKeySettingsModal } from '../components/consultation/ApiKeySettingsModal';
import { ConsultationSummaryModal } from '../components/consultation/ConsultationSummaryModal';
import { TranscriptDrawer } from '../components/consultation/TranscriptDrawer';
import { api } from '../services/api';
import {
  Video,
  Mic,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const USER_API_KEY_STORAGE = 'neurovoice_user_gemini_api_key';

export const VoiceConsultationPage: React.FC = () => {
  const navigate = useNavigate();

  // API Key state
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem(USER_API_KEY_STORAGE) || '';
  });
  const [serverKeyConfigured, setServerKeyConfigured] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState<boolean>(false);

  // Check backend server config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cfg = await api.getConsultationConfig();
        setServerKeyConfigured(cfg.server_key_configured);
      } catch {
        setServerKeyConfigured(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveUserKey = (key: string) => {
    setUserApiKey(key);
    if (key) {
      localStorage.setItem(USER_API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(USER_API_KEY_STORAGE);
    }
  };

  // Camera hook for patient video
  const {
    videoRef,
    isCameraActive,
    startCamera,
    stopCamera,
    cameraError
  } = useCamera();

  // Voice consultation hook for speech & Gemini interaction
  const {
    assistantState,
    activeSpeaker,
    userTranscript,
    aiResponse,
    messages,
    isAISpeaking,
    isMicActive,
    toggleMic,
    userAnalyser,
    userAudioLevel,
    aiAudioLevel,
    volume,
    setVolume,
    interruptAI,
    language,
    setLanguage,
    sendTextMessage,
    durationSeconds,
    isConsultationActive,
    startConsultation,
    endConsultation,
    resetConsultation,
    summary,
    error: voiceError
  } = useVoiceConsultation(userApiKey);

  // Initialize both camera and voice on Start Consultation
  const handleStartConsultationSession = async () => {
    await startCamera();
    await startConsultation();
  };

  // Trigger End Consultation Flow
  const handleTriggerEnd = () => {
    if (messages.length > 0) {
      setIsConfirmEndOpen(true);
    } else {
      stopCamera();
      endConsultation();
      navigate('/');
    }
  };

  const handleConfirmEnd = async () => {
    setIsConfirmEndOpen(false);
    stopCamera();
    await endConsultation();
  };

  const handleRestartConsultation = async () => {
    resetConsultation();
    await handleStartConsultationSession();
  };

  const handleExitToHome = () => {
    stopCamera();
    resetConsultation();
    navigate('/');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getLanguageLabel = () => {
    switch (language) {
      case 'hi-IN': return 'Hindi (हिंदी)';
      case 'kn-IN': return 'Kannada (ಕನ್ನಡ)';
      case 'mr-IN': return 'Marathi (मराठी)';
      case 'ur-PK': return 'Urdu (اردو)';
      case 'en-IN':
      default:
        return 'English (en-IN)';
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      {/* Consultation Top Bar */}
      <ConsultationTopBar
        currentLanguage={language}
        onLanguageChange={setLanguage}
        isConnected={serverKeyConfigured || Boolean(userApiKey)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleHistory={() => setIsTranscriptOpen(true)}
        onExit={handleTriggerEnd}
        durationSeconds={durationSeconds}
      />

      {/* Error Banners */}
      {(voiceError || (!serverKeyConfigured && !userApiKey)) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {!serverKeyConfigured && !userApiKey
                  ? 'Gemini API Key Required'
                  : 'Voice Consultation Notice'}
              </span>
              <p className="text-[11px] leading-relaxed text-amber-800">
                {!serverKeyConfigured && !userApiKey
                  ? 'No Gemini API key is currently detected on the server. Please click Settings to provide your personal Google AI Studio key.'
                  : voiceError}
              </p>
            </div>
          </div>
          {!serverKeyConfigured && !userApiKey && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors"
            >
              Configure Key
            </button>
          )}
        </div>
      )}

      {/* Main Split-Screen Consultation Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative">
        {/* Left Section: Live Patient Webcam Viewport */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Video className="w-3.5 h-3.5 text-cyan-600" />
              <span>Patient Webcam View</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Face-to-Face Video</span>
          </div>

          <PatientVideoViewport
            videoRef={videoRef}
            isCameraActive={isCameraActive}
            isMicActive={isMicActive}
            onToggleCamera={isCameraActive ? stopCamera : startCamera}
            onToggleMic={toggleMic}
            cameraError={cameraError}
            micLevel={userAudioLevel}
          />
        </div>

        {/* Right Section: 3D Holographic AI Assistant Avatar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Dr. NeuroVoice AI Avatar</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Multilingual Intelligence</span>
          </div>

          <AIAvatarViewport
            state={assistantState}
            audioLevel={aiAudioLevel}
            languageName={getLanguageLabel()}
          />
        </div>

        {/* Inactive Session Entry Overlay */}
        {!isConsultationActive && !summary && (
          <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-700/60 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-400 to-sky-500 text-white flex items-center justify-center shadow-glow-pill">
              <Mic className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Begin AI Voice Consultation
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect face-to-face with Dr. NeuroVoice AI for real-time educational guidance on Parkinson's disease symptoms, tremor analysis, and motor screening protocols.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Private & Encrypted</span>
              </span>
              <span>•</span>
              <span>5 Indian Languages</span>
              <span>•</span>
              <span>Multimodal Vision</span>
            </div>

            <button
              type="button"
              onClick={handleStartConsultationSession}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-bold text-sm transition-all shadow-glow-pill flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Start Voice Consultation</span>
            </button>
          </div>
        )}
      </div>

      {/* Center / Lower Section: Dual-Channel Waveform */}
      <AudioWaveformVisualizer
        userAnalyser={userAnalyser}
        isUserSpeaking={activeSpeaker === 'user' || userAudioLevel > 15}
        isAISpeaking={isAISpeaking}
        aiAudioLevel={aiAudioLevel}
      />

      {/* Live Subtitle HUD */}
      <LiveSubtitleBanner
        userTranscript={userTranscript}
        aiResponse={aiResponse}
        activeSpeaker={activeSpeaker}
        language={language}
      />

      {/* Interactive Control Bar */}
      <ConsultationControlBar
        isMicActive={isMicActive}
        onToggleMic={toggleMic}
        isCameraActive={isCameraActive}
        onToggleCamera={isCameraActive ? stopCamera : startCamera}
        volume={volume}
        onVolumeChange={setVolume}
        isAISpeaking={isAISpeaking}
        onInterruptAI={interruptAI}
        onEndConsultation={handleTriggerEnd}
        onSendMessage={sendTextMessage}
        language={language}
        disabled={!isConsultationActive}
      />

      {/* End Consultation Confirmation Modal */}
      {isConfirmEndOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">End Active Consultation?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your consultation will be concluded and an educational summary report will be generated.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmEndOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Session
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                End & Summarize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Consultation Summary Modal */}
      <ConsultationSummaryModal
        isOpen={Boolean(summary)}
        summary={summary}
        onRestart={handleRestartConsultation}
        onGoHome={handleExitToHome}
      />

      {/* API Key Configuration Modal */}
      <ApiKeySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        serverKeyConfigured={serverKeyConfigured}
        userApiKey={userApiKey}
        onSaveKey={handleSaveUserKey}
      />

      {/* Conversation Transcript Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        messages={messages}
        language={language}
      />
    </div>
  );
};
