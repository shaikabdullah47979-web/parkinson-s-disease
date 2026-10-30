import React from 'react';
import { Activity, Globe, Settings, History, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { SupportedLanguageCode } from '../../types';

interface Props {
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (lang: SupportedLanguageCode) => void;
  isConnected: boolean;
  onOpenSettings: () => void;
  onToggleHistory: () => void;
  onExit: () => void;
  durationSeconds: number;
}

const LANGUAGES: { code: SupportedLanguageCode; label: string; native: string; dir: string }[] = [
  { code: 'en-IN', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिंदी', dir: 'ltr' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी', dir: 'ltr' },
  { code: 'ur-PK', label: 'Urdu', native: 'اردو', dir: 'rtl' }
];

export const ConsultationTopBar: React.FC<Props> = ({
  currentLanguage,
  onLanguageChange,
  isConnected,
  onOpenSettings,
  onToggleHistory,
  onExit,
  durationSeconds
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E0EFFA] px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Brand & Room Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-sky-500 text-white flex items-center justify-center shadow-xs">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-800 text-sm tracking-tight">AI Voice Consultation</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-cyan-700 border border-sky-100 uppercase tracking-wider">
              Room Active
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
            Session Duration: {formatTime(durationSeconds)}
          </span>
        </div>
      </div>

      {/* Right Controls: Status, Language Selector, Settings, Chat, Exit */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Status Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {isConnected ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-600" />
          )}
          <span>{isConnected ? 'Live AI Online' : 'Standby'}</span>
        </div>

        {/* Premium Native-Script Language Selector */}
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-cyan-700 ml-2 mr-1 shrink-0" />
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguageCode)}
            className="bg-transparent text-xs font-bold text-slate-700 py-1.5 pr-2.5 pl-1 rounded-lg focus:outline-hidden cursor-pointer"
            aria-label="Select Consultation Language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="font-semibold text-slate-800">
                {lang.native} ({lang.label})
              </option>
            ))}
          </select>
        </div>

        {/* Transcript / Chat Toggle Button */}
        <button
          type="button"
          onClick={onToggleHistory}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="View Conversation Transcript"
          aria-label="Conversation Transcript"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Gemini API Key Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="Configure Gemini API Key"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Exit Consultation Button */}
        <button
          type="button"
          onClick={onExit}
          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit Consultation</span>
        </button>
      </div>
    </header>
  );
};
