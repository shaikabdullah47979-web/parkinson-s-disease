import React from 'react';
import { Subtitles, Volume2, Mic } from 'lucide-react';
import { SupportedLanguageCode } from '../../types';

interface Props {
  userTranscript: string;
  aiResponse: string;
  activeSpeaker: 'user' | 'ai' | 'none';
  language: SupportedLanguageCode;
}

export const LiveSubtitleBanner: React.FC<Props> = ({
  userTranscript,
  aiResponse,
  activeSpeaker,
  language
}) => {
  const isUrdu = language === 'ur-PK';

  if (activeSpeaker === 'none' && !userTranscript && !aiResponse) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center text-xs text-slate-400 italic">
        Speak into your microphone or ask a question to begin live consultation.
      </div>
    );
  }

  const displayText = activeSpeaker === 'user' ? userTranscript : aiResponse;
  const speakerLabel = activeSpeaker === 'user' ? 'You (Speaking)' : 'Dr. NeuroVoice AI';

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`rounded-2xl border p-4 transition-all duration-200 shadow-xs ${
        activeSpeaker === 'user'
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-white border-[#E0EFFA] text-slate-800'
      }`}
    >
      <div className={`flex items-center gap-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider ${
        activeSpeaker === 'user' ? 'text-emerald-700' : 'text-cyan-700'
      } ${isUrdu ? 'flex-row-reverse' : ''}`}>
        {activeSpeaker === 'user' ? (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span>{speakerLabel}</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5" />
            <span>{speakerLabel}</span>
          </>
        )}
      </div>

      <p
        className={`text-sm sm:text-base font-medium leading-relaxed ${
          isUrdu ? 'font-serif text-right text-lg' : 'text-left'
        }`}
      >
        {displayText || (activeSpeaker === 'user' ? 'Listening...' : 'Thinking...')}
      </p>
    </div>
  );
};

