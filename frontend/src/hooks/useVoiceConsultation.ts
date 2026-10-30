import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  ConsultationChatMessage,
  SupportedLanguageCode,
  ConsultationSummary
} from '../types';
import { AssistantState } from '../components/consultation/AIAvatarViewport';

export interface UseVoiceConsultationResult {
  // Assistant states
  assistantState: AssistantState;
  activeSpeaker: 'user' | 'ai' | 'none';
  userTranscript: string;
  aiResponse: string;
  messages: ConsultationChatMessage[];
  isAISpeaking: boolean;

  // Media & Devices
  isMicActive: boolean;
  toggleMic: () => void;
  userAnalyser: AnalyserNode | null;
  userAudioLevel: number;
  aiAudioLevel: number;

  // Audio Playback
  volume: number;
  setVolume: (v: number) => void;
  interruptAI: () => void;

  // Messaging & Language
  language: SupportedLanguageCode;
  setLanguage: (lang: SupportedLanguageCode) => void;
  sendTextMessage: (text: string) => Promise<void>;

  // Session & Summary
  durationSeconds: number;
  isConsultationActive: boolean;
  startConsultation: () => Promise<boolean>;
  endConsultation: () => Promise<ConsultationSummary | null>;
  resetConsultation: () => void;
  summary: ConsultationSummary | null;
  isGeneratingSummary: boolean;
  error: string | null;
}

export function useVoiceConsultation(
  userApiKey: string,
  patientContext?: any
): UseVoiceConsultationResult {
  const [assistantState, setAssistantState] = useState<AssistantState>('READY');
  const [activeSpeaker, setActiveSpeaker] = useState<'user' | 'ai' | 'none'>('none');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [messages, setMessages] = useState<ConsultationChatMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(false);

  // Audio & Speech controls
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [language, setLanguage] = useState<SupportedLanguageCode>('en-IN');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isConsultationActive, setIsConsultationActive] = useState<boolean>(false);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);
  const [aiAudioLevel, setAiAudioLevel] = useState<number>(0);
  const [summary, setSummary] = useState<ConsultationSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking without stale closures
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioMeterAnimRef = useRef<number | null>(null);
  const aiAudioSimIntervalRef = useRef<number | null>(null);
  const messagesRef = useRef<ConsultationChatMessage[]>([]);
  messagesRef.current = messages;
  const isMicActiveRef = useRef<boolean>(false);
  isMicActiveRef.current = isMicActive;
  const languageRef = useRef<SupportedLanguageCode>('en-IN');
  languageRef.current = language;

  // Initialize Web Audio Analyser for User Voice
  const setupAudioAnalyser = async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      // Real-time audio meter animation loop
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current || !isMicActiveRef.current) {
          setUserAudioLevel(0);
          audioMeterAnimRef.current = requestAnimationFrame(updateMeter);
          return;
        }

        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setUserAudioLevel(normalized);

        audioMeterAnimRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (e) {
      console.warn('Web Audio Analyser setup warning:', e);
    }
  };

  // Stop Mic Stream & Audio Context
  const stopAudioStreams = useCallback(() => {
    if (audioMeterAnimRef.current) {
      cancelAnimationFrame(audioMeterAnimRef.current);
      audioMeterAnimRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setUserAudioLevel(0);
  }, []);

  // Speak AI response via SpeechSynthesis
  const speakText = useCallback((text: string, langCode: SupportedLanguageCode) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (aiAudioSimIntervalRef.current) {
      clearInterval(aiAudioSimIntervalRef.current);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Map locale code for SpeechSynthesis
    const speechLangMap: Record<SupportedLanguageCode, string> = {
      'en-IN': 'en-IN',
      'hi-IN': 'hi-IN',
      'kn-IN': 'kn-IN',
      'mr-IN': 'mr-IN',
      'ur-PK': 'ur-PK'
    };
    utterance.lang = speechLangMap[langCode] || 'en-IN';

    // Find closest matching voice
    const voices = window.speechSynthesis.getVoices();
    const primaryPrefix = utterance.lang.split('-')[0].toLowerCase();
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase() === utterance.lang.toLowerCase() || v.lang.toLowerCase().startsWith(primaryPrefix)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsAISpeaking(true);
      setActiveSpeaker('ai');
      setAssistantState('SPEAKING');

      // Modulate AI Audio Level for visualizer
      aiAudioSimIntervalRef.current = window.setInterval(() => {
        setAiAudioLevel(Math.floor(Math.random() * 50) + 40);
      }, 100);
    };

    utterance.onend = () => {
      setIsAISpeaking(false);
      setAiAudioLevel(0);
      setActiveSpeaker('none');
      setAssistantState('LISTENING');
      if (aiAudioSimIntervalRef.current) {
        clearInterval(aiAudioSimIntervalRef.current);
        aiAudioSimIntervalRef.current = null;
      }
    };

    utterance.onerror = () => {
      setIsAISpeaking(false);
      setAiAudioLevel(0);
      setActiveSpeaker('none');
      setAssistantState('READY');
      if (aiAudioSimIntervalRef.current) {
        clearInterval(aiAudioSimIntervalRef.current);
        aiAudioSimIntervalRef.current = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [volume]);

  // Send message to Gemini API and trigger spoken response
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ConsultationChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserTranscript(text);
    setActiveSpeaker('user');
    setAssistantState('PROCESSING');
    setError(null);

    try {
      const historyPayload = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.chatConsultation(
        text,
        languageRef.current,
        historyPayload,
        patientContext,
        userApiKey || undefined
      );

      const aiMsg: ConsultationChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        role: 'model',
        content: res.reply,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, aiMsg]);
      setAiResponse(res.reply);

      // Trigger spoken output
      speakText(res.reply, languageRef.current);
    } catch (err: any) {
      console.error('Consultation chat error:', err);
      setError(err.message || 'Failed to receive AI response.');
      setAssistantState('READY');
      setActiveSpeaker('none');
    }
  }, [patientContext, userApiKey, speakText]);

  // Setup Web Speech API Recognition
  const setupSpeechRecognition = useCallback(() => {
    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRec) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge for full hands-free voice consultation.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = languageRef.current;

      rec.onstart = () => {
        setAssistantState('LISTENING');
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        if (interimText.trim()) {
          setUserTranscript(interimText.trim());
          setActiveSpeaker('user');
        }

        if (finalText.trim()) {
          setUserTranscript(finalText.trim());
          sendTextMessage(finalText.trim());
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition warning:', e.error);
        }
      };

      rec.onend = () => {
        // Auto-restart if mic is still active and user is not speaking
        if (isMicActiveRef.current && !isAISpeaking) {
          try { rec.start(); } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
    }
  }, [isAISpeaking, sendTextMessage]);

  // Start Consultation Session
  const startConsultation = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSummary(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      await setupAudioAnalyser(stream);

      setIsMicActive(true);
      setIsConsultationActive(true);
      setAssistantState('LISTENING');
      setDurationSeconds(0);

      // Start duration counter
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = window.setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);

      setupSpeechRecognition();
      return true;
    } catch (err: any) {
      setIsMicActive(false);
      setError('Microphone permission was denied. Please allow microphone access to talk with Dr. NeuroVoice AI.');
      return false;
    }
  }, [setupSpeechRecognition]);

  // Toggle Mic Mute/Unmute
  const toggleMic = useCallback(() => {
    if (isMicActive) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      stopAudioStreams();
      setIsMicActive(false);
      setAssistantState('READY');
      setActiveSpeaker('none');
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        micStreamRef.current = stream;
        setupAudioAnalyser(stream);
        setIsMicActive(true);
        setupSpeechRecognition();
      }).catch(() => {
        setError('Microphone access unavailable.');
      });
    }
  }, [isMicActive, setupSpeechRecognition, stopAudioStreams]);

  // Interrupt ongoing AI speech immediately
  const interruptAI = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (aiAudioSimIntervalRef.current) {
      clearInterval(aiAudioSimIntervalRef.current);
      aiAudioSimIntervalRef.current = null;
    }
    setIsAISpeaking(false);
    setAiAudioLevel(0);
    setActiveSpeaker('none');
    setAssistantState('LISTENING');

    // Resume speech recognition if mic is active
    if (isMicActiveRef.current && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch {}
    }
  }, []);

  // Update speech recognition language on language change
  const handleLanguageChange = useCallback((newLang: SupportedLanguageCode) => {
    setLanguage(newLang);
    languageRef.current = newLang;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.lang = newLang;
        if (isMicActiveRef.current) {
          recognitionRef.current.start();
        }
      } catch {}
    }
  }, []);

  // End Consultation and Generate Clinical Summary
  const endConsultation = useCallback(async (): Promise<ConsultationSummary | null> => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    interruptAI();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    stopAudioStreams();
    setIsMicActive(false);
    setIsConsultationActive(false);

    if (messagesRef.current.length === 0) {
      return null;
    }

    setIsGeneratingSummary(true);
    try {
      const historyPayload = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const sum = await api.generateConsultationSummary(
        historyPayload,
        languageRef.current,
        durationSeconds,
        userApiKey || undefined
      );

      setSummary(sum);
      return sum;
    } catch (err: any) {
      console.error('Error generating summary:', err);
      // Fallback client summary
      const fallbackSummary: ConsultationSummary = {
        title: 'NeuroVoice AI Consultation Record',
        date_time: new Date().toLocaleDateString(),
        duration_seconds: durationSeconds,
        language: languageRef.current,
        topics_discussed: ["Parkinson's Disease Motor & Non-Motor Inquiries"],
        key_questions_asked: messagesRef.current.filter((m) => m.role === 'user').map((m) => m.content),
        educational_explanations: ['Reviewed screening metrics and Parkinsonian symptom guidance.'],
        questions_for_doctor: ['Please review these motor assessment findings with your neurologist.'],
        disclaimer: 'This consultation is for educational research screening only.'
      };
      setSummary(fallbackSummary);
      return fallbackSummary;
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [durationSeconds, interruptAI, stopAudioStreams, userApiKey]);

  const resetConsultation = useCallback(() => {
    setMessages([]);
    setUserTranscript('');
    setAiResponse('');
    setDurationSeconds(0);
    setSummary(null);
    setAssistantState('READY');
    setActiveSpeaker('none');
    setError(null);
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (aiAudioSimIntervalRef.current) clearInterval(aiAudioSimIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      stopAudioStreams();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopAudioStreams]);

  return {
    assistantState,
    activeSpeaker,
    userTranscript,
    aiResponse,
    messages,
    isAISpeaking,
    isMicActive,
    toggleMic,
    userAnalyser: analyserRef.current,
    userAudioLevel,
    aiAudioLevel,
    volume,
    setVolume,
    interruptAI,
    language,
    setLanguage: handleLanguageChange,
    sendTextMessage,
    durationSeconds,
    isConsultationActive,
    startConsultation,
    endConsultation,
    resetConsultation,
    summary,
    isGeneratingSummary,
    error
  };
}

