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

  // Determine active speaker label and content
  let speakerLabel = 'Dr. AI Neurologist';
  let displayText = aiResponse;
  let isUser = false;

  if (activeSpeaker === 'user') {
    speakerLabel = 'You (Speaking)';
    displayText = userTranscript || 'Listening to your voice...';
    isUser = true;
  } else if (activeSpeaker === 'ai') {
    speakerLabel = 'Dr. AI Neurologist';
    displayText = aiResponse || 'Responding...';
    isUser = false;
  } else {
    // Idle / transition between turns
    if (userTranscript) {
      speakerLabel = 'You (Recognized)';
      displayText = userTranscript;
      isUser = true;
    } else if (aiResponse) {
      speakerLabel = 'Dr. AI Neurologist';
      displayText = aiResponse;
      isUser = false;
    } else {
      return (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-xs text-slate-500 italic flex items-center justify-center gap-2">
          <Mic className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
          <span>Microphone active. Speak naturally or ask any question to begin live consultation.</span>
        </div>
      );
    }
  }

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`rounded-2xl border p-4 transition-all duration-200 shadow-xs ${
        isUser
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
          : 'bg-white border-[#E0EFFA] text-slate-800'
      }`}
    >
      <div className={`flex items-center gap-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider ${
        isUser ? 'text-emerald-700' : 'text-cyan-700'
      } ${isUrdu ? 'flex-row-reverse' : ''}`}>
        {isUser ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <Mic className="w-3.5 h-3.5" />
            <span>{speakerLabel}</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
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
        {displayText}
      </p>
    </div>
  );
};

