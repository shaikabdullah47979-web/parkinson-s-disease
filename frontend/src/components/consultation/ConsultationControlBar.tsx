import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Square,
  MessageSquare,
  PhoneOff,
  Send
} from 'lucide-react';
import { SupportedLanguageCode } from '../../types';

interface Props {
  isMicActive: boolean;
  onToggleMic: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isAISpeaking: boolean;
  onInterruptAI: () => void;
  onEndConsultation: () => void;
  onSendMessage: (text: string) => void;
  language: SupportedLanguageCode;
  disabled?: boolean;
}

export const ConsultationControlBar: React.FC<Props> = ({
  isMicActive,
  onToggleMic,
  isCameraActive,
  onToggleCamera,
  volume,
  onVolumeChange,
  isAISpeaking,
  onInterruptAI,
  onEndConsultation,
  onSendMessage,
  language,
  disabled = false
}) => {
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [prevVolume, setPrevVolume] = useState<number>(volume || 1);

  const handleToggleVolumeMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume || 0.8);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const isUrdu = language === 'ur-PK';

  return (
    <div className="bg-white rounded-2xl border border-[#E0EFFA] p-3 sm:p-4 shadow-xs space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: AV Controls */}
        <div className="flex items-center gap-2">
          {/* Mic Toggle */}
          <button
            type="button"
            onClick={onToggleMic}
            disabled={disabled}
            className={`p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 shadow-xs ${
              isMicActive
                ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMicActive ? 'Mic Active' : 'Muted'}</span>
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={onToggleCamera}
            disabled={disabled}
            className={`p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 shadow-xs ${
              isCameraActive
                ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCameraActive ? <Camera className="w-4 h-4 text-cyan-400" /> : <CameraOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isCameraActive ? 'Camera On' : 'Camera Off'}</span>
          </button>

          {/* Speaker Volume & Slider */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={handleToggleVolumeMute}
              className="text-slate-600 hover:text-slate-900 transition-colors"
              title={volume === 0 ? 'Unmute Speaker' : 'Mute Speaker'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-cyan-600" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              title="Speaker Volume"
            />
          </div>
        </div>

        {/* Center / Right: Interactive Controls */}
        <div className="flex items-center gap-2">
          {/* Interrupt AI Button */}
          {isAISpeaking && (
            <button
              type="button"
              onClick={onInterruptAI}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 animate-pulse"
              title="Stop current AI speech playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt AI</span>
            </button>
          )}

          {/* Text Input Toggle */}
          <button
            type="button"
            onClick={() => setShowTextInput(!showTextInput)}
            className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showTextInput
                ? 'bg-cyan-50 border-cyan-200 text-cyan-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Type a message instead of speaking"
          >
            <MessageSquare className="w-4 h-4 text-cyan-600" />
            <span className="hidden sm:inline">Type Query</span>
          </button>

          {/* End Consultation Button */}
          <button
            type="button"
            onClick={onEndConsultation}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* Alternative Text Query Input Bar */}
      {showTextInput && (
        <form onSubmit={handleSend} className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            dir={isUrdu ? 'rtl' : 'ltr'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isUrdu
                ? 'اپنا سوال یہاں لکھیں...'
                : 'Type your Parkinson’s question or inquiry here...'
            }
            className={`flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
              isUrdu ? 'text-right font-serif' : ''
            }`}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || disabled}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
