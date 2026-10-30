import React from 'react';
import { X, Bot, User, MessageSquare } from 'lucide-react';
import { ConsultationChatMessage, SupportedLanguageCode } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: ConsultationChatMessage[];
  language: SupportedLanguageCode;
}

export const TranscriptDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  messages,
  language
}) => {
  if (!isOpen) return null;

  const isUrdu = language === 'ur-PK';

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-2xs flex justify-end">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E0EFFA] flex flex-col justify-between animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-slate-800 text-sm">Consultation Transcript</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <p className="text-xs">No conversation entries yet. Speak into your microphone to start talking.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    dir={isUrdu ? 'rtl' : 'ltr'}
                    className={`p-3 rounded-2xl text-xs max-w-[82%] leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white rounded-br-xs shadow-2xs'
                        : 'bg-slate-100 border border-slate-200/80 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <span className="text-[10px] opacity-75 font-semibold block mb-0.5">
                      {isUser ? 'You' : 'Dr. NeuroVoice AI'}
                    </span>
                    <p className={isUrdu ? 'font-serif text-sm' : ''}>{m.content}</p>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center">
          Transcripts are stored in active session memory only.
        </div>
      </div>
    </div>
  );
};
