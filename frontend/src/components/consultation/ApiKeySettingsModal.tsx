import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, ShieldAlert, ExternalLink, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serverKeyConfigured: boolean;
  userApiKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiKeySettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  serverKeyConfigured,
  userApiKey,
  onSaveKey
}) => {
  const [inputKey, setInputKey] = useState<string>(userApiKey);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setInputKey(userApiKey);
  }, [userApiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E0EFFA] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-cyan-700 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Gemini API Key Settings</h3>
              <p className="text-[11px] text-slate-500">Multimodal AI Voice Engine Configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Status Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          serverKeyConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {serverKeyConfigured ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block">
              {serverKeyConfigured
                ? 'Server Default Key Active'
                : 'No Server Default Key Configured'}
            </span>
            <span className="text-[11px] leading-relaxed opacity-90">
              {serverKeyConfigured
                ? 'The backend has a default GEMINI_API_KEY. You may optionally override it with your personal key below.'
                : 'Please provide your Google AI Studio Gemini API key below to enable voice consultation.'}
            </span>
          </div>
        </div>

        {/* Custom Key Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Custom Gemini API Key (Optional Override)
          </label>
          <div className="relative">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            {inputKey && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600"
                title="Clear key"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Stored locally in your browser session. Never transmitted to third parties.
          </span>
        </div>

        {/* Free Key Helper */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
          <span>Need a free Google AI Studio key?</span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Get Free Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

