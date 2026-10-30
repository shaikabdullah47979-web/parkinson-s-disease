import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  ConsultationChatMessage,
  SupportedLanguageCode,
  ConsultationSummary
} from '../types';
import { AssistantState } from '../components/consultation/AIAvatarViewport';

// Initial greetings in 5 supported Indian languages
export const INITIAL_GREETINGS: Record<SupportedLanguageCode, string> = {
  'en-IN': "Hello, I am Dr. AI Neurologist. I am here to help you explore your Parkinson's motor and speech assessments. How can I assist you today?",
  'hi-IN': "नमस्ते, मैं डॉ. एआई न्यूरोलॉजिस्ट हूँ। पार्किंसंस मोटर और लक्षण स्क्रीनिंग में आपकी सहायता के लिए मैं यहाँ हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
  'kn-IN': "ನಮಸ್ಕಾರ, ನಾನು ಡಾ. ಎಐ ನ್ಯೂರೋಲಜಿಸ್ಟ್. ಪಾರ್ಕಿನ್ಸನ್ ತಪಾಸಣೆಗೆ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನಿದ್ದೇನೆ. ನಾನು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  'mr-IN': "नमस्कार, मी डॉ. एआय न्यूरोलॉजिस्ट आहे. पार्किन्सन्स लक्षणे आणि मोटर तपासणीसाठी मी येथे आहे. आज मी तुम्हाला कशी मदत करू शकेन?",
  'ur-PK': "السلام علیکم، میں ڈاکٹر اے آئی نیورولوجسٹ ہوں۔ پارکنسنز اسکریننگ کے لیے میں حاضر ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟"
};

// Normalize text for acoustic echo comparison across Unicode scripts
function cleanTextForEchoComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detect if incoming transcript is acoustic leakage from speakers playing AI voice
function isAcousticEcho(transcript: string, aiSpeech: string): boolean {
  if (!aiSpeech || !transcript) return false;
  const normTranscript = cleanTextForEchoComparison(transcript);
  const normAi = cleanTextForEchoComparison(aiSpeech);

  if (!normTranscript || !normAi) return false;

  // Direct substring match
  if (normAi.includes(normTranscript)) return true;

  const transcriptWords = normTranscript.split(' ').filter((w) => w.length > 2);
  if (transcriptWords.length === 0) return false;

  let matchCount = 0;
  for (const word of transcriptWords) {
    if (normAi.includes(word)) {
      matchCount++;
    }
  }

  // If >= 40% of words in the recognized phrase match the current AI speech, it is speaker echo
  return (matchCount / transcriptWords.length) >= 0.4;
}

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

  // Refs for state-safe closures across async events & audio loops
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioMeterAnimRef = useRef<number | null>(null);
  const aiAudioSimIntervalRef = useRef<number | null>(null);

  // State synchronization refs
  const messagesRef = useRef<ConsultationChatMessage[]>([]);
  messagesRef.current = messages;
  const isMicActiveRef = useRef<boolean>(false);
  isMicActiveRef.current = isMicActive;
  const isConsultationActiveRef = useRef<boolean>(false);
  isConsultationActiveRef.current = isConsultationActive;
  const languageRef = useRef<SupportedLanguageCode>('en-IN');
  languageRef.current = language;
  const isAISpeakingRef = useRef<boolean>(false);
  isAISpeakingRef.current = isAISpeaking;
  const isProcessingRef = useRef<boolean>(false);

  // Acoustic echo cancellation and tracking refs
  const currentAiSpeechRef = useRef<string>('');
  const lastAiSpeechRef = useRef<string>('');
  const speechEndTimeRef = useRef<number>(0);

  // Hands-free VAD & silence detection refs
  const silenceTimerRef = useRef<number | null>(null);
  const pendingUtteranceRef = useRef<string>('');
  const currentInterimRef = useRef<string>('');
  const speechWatchdogRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const startRecognitionSessionRef = useRef<() => void>(() => {});

  // Setup Web Audio Analyser with echo cancellation
  const setupAudioAnalyser = async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[Audio] Web Audio API not supported in this browser');
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks && audioTracks.length > 0) {
        console.log('[Mic] Connected track:', audioTracks[0].label || 'Default Microphone', 'State:', audioTracks[0].readyState);
      }

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
      console.warn('[Audio] Analyser setup error:', e);
    }
  };

  // Stop Mic Stream & Audio Context cleanly
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

  // Internal interrupt helper to stop ongoing AI speech immediately
  const interruptAIInternal = useCallback(() => {
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    (window as any)._activeSpeechUtterance = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (aiAudioSimIntervalRef.current) {
      clearInterval(aiAudioSimIntervalRef.current);
      aiAudioSimIntervalRef.current = null;
    }
    isAISpeakingRef.current = false;
    currentAiSpeechRef.current = '';
    speechEndTimeRef.current = Date.now();
    setIsAISpeaking(false);
    setAiAudioLevel(0);
  }, []);

  // Public interrupt handler
  const interruptAI = useCallback(() => {
    interruptAIInternal();
    setActiveSpeaker('none');
    setAssistantState('LISTENING');
  }, [interruptAIInternal]);

  // Spoken response synthesis via Web SpeechSynthesis
  const speakText = useCallback((text: string, langCode: SupportedLanguageCode) => {
    if (!('speechSynthesis' in window)) {
      setAssistantState('LISTENING');
      return;
    }

    // Cancel any previous utterance to prevent overlapping or repeating
    window.speechSynthesis.cancel();
    if (aiAudioSimIntervalRef.current) {
      clearInterval(aiAudioSimIntervalRef.current);
      aiAudioSimIntervalRef.current = null;
    }

    const cleanSpokenText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
    utterance.volume = volume;
    utterance.rate = 1.0;    // Natural, engaging physician conversational pace
    utterance.pitch = 0.88;  // Authentic, resonant male doctor pitch

    // Supported language mapping
    const speechLangMap: Record<SupportedLanguageCode, string> = {
      'en-IN': 'en-IN',
      'hi-IN': 'hi-IN',
      'kn-IN': 'kn-IN',
      'mr-IN': 'mr-IN',
      'ur-PK': 'ur-PK'
    };
    const targetLocale = speechLangMap[langCode] || 'en-IN';
    utterance.lang = targetLocale;

    // --- MALE VOICE SELECTION ENGINE ---
    // Specifically filter out female voices and prioritize authentic male voices
    const voices = window.speechSynthesis.getVoices();
    const primaryPrefix = targetLocale.split('-')[0].toLowerCase();

    const femaleKeywords = [
      'female', 'woman', 'zira', 'heera', 'hazel', 'susan', 'catherine',
      'jenny', 'aria', 'sarah', 'kavya', 'priya', 'kalpana', 'swara',
      'neerja', 'ayanda', 'ananya', 'geeta', 'shruti', 'sunita'
    ];

    const maleKeywords = [
      'male', 'man', 'david', 'mark', 'ravi', 'hemant', 'george',
      'guy', 'prabhat', 'madhav', 'rohit', 'ajay', 'rahul', 'stefan',
      'james', 'richard', 'brian', 'tarik', 'salman', 'daniel', 'michael'
    ];

    const isExplicitMale = (v: any) => {
      const name = v.name.toLowerCase();
      return maleKeywords.some((kw) => name.includes(kw));
    };

    const isExplicitFemale = (v: any) => {
      const name = v.name.toLowerCase();
      return femaleKeywords.some((kw) => name.includes(kw));
    };

    // 1. Primary: Target locale voice with explicit male identifier
    let selectedVoice = voices.find(
      (v) =>
        (v.lang.toLowerCase() === targetLocale.toLowerCase() ||
          v.lang.toLowerCase().replace('_', '-').startsWith(primaryPrefix)) &&
        isExplicitMale(v) &&
        !isExplicitFemale(v)
    );

    // 2. Secondary: Target locale voice that is NOT explicitly female
    if (!selectedVoice) {
      selectedVoice = voices.find(
        (v) =>
          (v.lang.toLowerCase() === targetLocale.toLowerCase() ||
            v.lang.toLowerCase().replace('_', '-').startsWith(primaryPrefix)) &&
          !isExplicitFemale(v)
      );
    }

    // 3. Tertiary: Any high-quality male voice (e.g. David, Mark, Ravi)
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => isExplicitMale(v) && !isExplicitFemale(v));
    }

    // 4. Fallback: Any voice not matching female names
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => !isExplicitFemale(v));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Track speech boundaries and word events for organic audio levels
    utterance.onboundary = (event: any) => {
      if (event.name === 'word' || event.name === 'sentence') {
        const remaining = cleanSpokenText.slice(event.charIndex);
        const currentWord = remaining.split(/\s+/)[0] || '';
        const hasOpenVowel = /[aeouAEOUāīūēōअआईऊएओਆਈਊആഈഊ]/i.test(currentWord);
        setAiAudioLevel(hasOpenVowel ? 78 : 52);
      }
    };

    // Prevent V8 garbage collection of utterance during long speech playback
    (window as any)._activeSpeechUtterance = utterance;

    const handleSpeechEnd = () => {
      console.log('[TTS] Audio playback completed. Returning to LISTENING.');
      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      (window as any)._activeSpeechUtterance = null;

      isAISpeakingRef.current = false;
      currentAiSpeechRef.current = '';
      speechEndTimeRef.current = Date.now();
      setIsAISpeaking(false);
      setAiAudioLevel(0);
      setActiveSpeaker('none');
      setAssistantState('LISTENING');

      if (aiAudioSimIntervalRef.current) {
        clearInterval(aiAudioSimIntervalRef.current);
        aiAudioSimIntervalRef.current = null;
      }

      // Automatically return to listening mode for user with a fresh instance
      startRecognitionSessionRef.current();
    };

    // Safety watchdog timer: guarantees state reset if Chromium drops onend event
    const estimatedDurationMs = Math.max(3000, Math.round(cleanSpokenText.length * 85) + 1500);
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    speechWatchdogRef.current = window.setTimeout(() => {
      console.debug('[TTS] Speech watchdog safely transitioned back to LISTENING');
      handleSpeechEnd();
    }, estimatedDurationMs);

    utterance.onstart = () => {
      console.log('[TTS] Audio playback started for Dr. AI Neurologist');
      isAISpeakingRef.current = true;
      currentAiSpeechRef.current = cleanSpokenText.toLowerCase();
      lastAiSpeechRef.current = cleanSpokenText.toLowerCase();
      setIsAISpeaking(true);
      setActiveSpeaker('ai');
      setAssistantState('SPEAKING');

      // Start fresh recognition session with an empty buffer for instant barge-in detection
      startRecognitionSessionRef.current();

      // Organic syllable wave modulation (~4.2 Hz human vocal rhythm)
      let phase = 0;
      if (aiAudioSimIntervalRef.current) clearInterval(aiAudioSimIntervalRef.current);
      aiAudioSimIntervalRef.current = window.setInterval(() => {
        phase += 0.35;
        const wave = Math.sin(phase);
        if (wave > 0.05) {
          const level = Math.round(40 + wave * 45);
          setAiAudioLevel(level);
        } else {
          setAiAudioLevel(8);
        }
      }, 70);
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e: any) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[TTS] SpeechSynthesis notice:', e.error);
      }
      handleSpeechEnd();
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    window.speechSynthesis.speak(utterance);
  }, [volume]);

  // Send statement to Gemini API and trigger natural conversational reply
  const sendToGeminiAndSpeak = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setAssistantState('PROCESSING');
    setError(null);

    const userMsg: ConsultationChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserTranscript(trimmed);
    setActiveSpeaker('user');

    try {
      console.log('[AI] Querying Gemini for message:', trimmed, 'Language:', languageRef.current);
      const historyPayload = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.chatConsultation(
        trimmed,
        languageRef.current,
        historyPayload,
        patientContext,
        userApiKey || undefined
      );

      console.log('[AI] Gemini replied:', res.reply);

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
      console.error('[AI] Consultation chat error:', err);
      setError(err.message || 'Failed to receive AI response from Gemini.');
      setAssistantState('LISTENING');
      setActiveSpeaker('none');
      startRecognitionSessionRef.current();
    } finally {
      isProcessingRef.current = false;
    }
  }, [patientContext, userApiKey, speakText]);

  // Finalize speech when silence/pause is detected (VAD turn commit)
  const commitUserSpeech = useCallback(async () => {
    const fullText = `${pendingUtteranceRef.current} ${currentInterimRef.current}`.trim();
    pendingUtteranceRef.current = '';
    currentInterimRef.current = '';

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Reject empty or tiny noise fragments
    if (!fullText || fullText.length < 2) {
      setActiveSpeaker('none');
      return;
    }

    console.log('[VAD] Committing user statement:', fullText);

    // Abort active STT session to flush buffered results and avoid ghost barge-in
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    await sendToGeminiAndSpeak(fullText);
  }, [sendToGeminiAndSpeak]);

  // Start continuous hands-free speech recognition with fresh instance every time
  const startRecognitionSession = useCallback(() => {
    if (!isConsultationActiveRef.current || !isMicActiveRef.current) {
      return;
    }

    // Clean up previous recognition instance completely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRec) {
      setError(
        'Speech recognition is not supported in this browser. Please use Chrome or Edge for full hands-free voice consultation.'
      );
      setAssistantState('READY');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      // Locale mapping with fallback for Urdu
      const langMapping: Record<SupportedLanguageCode, string> = {
        'en-IN': 'en-IN',
        'hi-IN': 'hi-IN',
        'kn-IN': 'kn-IN',
        'mr-IN': 'mr-IN',
        'ur-PK': 'ur-PK'
      };
      rec.lang = langMapping[languageRef.current] || 'en-IN';

      rec.onstart = () => {
        console.log('[STT] SpeechRecognition session active in language:', rec.lang);
        if (!isAISpeakingRef.current && !isProcessingRef.current) {
          setAssistantState('LISTENING');
        }
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let newFinalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinalText += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const candidatePhrase = (newFinalText || interimText).trim();
        if (!candidatePhrase) return;

        console.debug('[STT] Captured speech segment:', candidatePhrase, { isFinal: Boolean(newFinalText), aiSpeaking: isAISpeakingRef.current });

        // --- BARGE-IN & ACOUSTIC ECHO GATING ---
        if (isAISpeakingRef.current) {
          if (isAcousticEcho(candidatePhrase, currentAiSpeechRef.current)) {
            console.debug('[VAD] Suppressed speaker acoustic bleed during AI speech:', candidatePhrase);
            return;
          }

          if (candidatePhrase.length >= 2) {
            console.log('[VAD] Genuine user barge-in detected:', candidatePhrase);
            interruptAIInternal();
            setAssistantState('LISTENING');
            setActiveSpeaker('user');
          }
        }

        // If currently processing with Gemini, drop incoming text
        if (isProcessingRef.current) {
          return;
        }

        // --- REGULAR SPEECH CAPTURE & FAST VAD ---
        let hasFinal = false;
        if (newFinalText.trim()) {
          hasFinal = true;
          pendingUtteranceRef.current = `${pendingUtteranceRef.current} ${newFinalText.trim()}`.trim();
          currentInterimRef.current = '';
          setUserTranscript(pendingUtteranceRef.current);
          setActiveSpeaker('user');
        } else if (interimText.trim()) {
          currentInterimRef.current = interimText.trim();
          setUserTranscript(`${pendingUtteranceRef.current} ${currentInterimRef.current}`.trim());
          setActiveSpeaker('user');
        }

        // Arm or reset silence detection timer:
        // 550ms for final recognized speech segments, 850ms for interim results
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        const silenceDelay = hasFinal ? 550 : 850;
        silenceTimerRef.current = window.setTimeout(() => {
          commitUserSpeech();
        }, silenceDelay);
      };

      rec.onerror = (e: any) => {
        console.warn('[STT] Speech recognition notice:', e.error);
        if (e.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
          setAssistantState('READY');
        } else if (e.error === 'audio-capture') {
          setError('No microphone hardware detected or it is in use by another application.');
          setAssistantState('READY');
        } else if (e.error === 'network') {
          console.warn('[STT] Network error reaching speech recognition service. Will retry automatically.');
        }
      };

      rec.onend = () => {
        console.debug('[STT] SpeechRecognition session ended.');
        // Automatically spawn a fresh instance if consultation is still active
        if (isConsultationActiveRef.current && isMicActiveRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = window.setTimeout(() => {
            startRecognitionSession();
          }, 150);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.warn('[STT] Speech recognition start exception:', err.message);
    }
  }, [interruptAIInternal, commitUserSpeech]);

  // Keep ref pointing to latest startRecognitionSession function
  startRecognitionSessionRef.current = startRecognitionSession;

  // Start Consultation Session: initializes camera, mic, greets user once, and starts listening
  const startConsultation = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSummary(null);
    try {
      // Audio capture with browser acoustic echo cancellation, noise suppression, and auto gain control
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: 1,
          sampleRate: 48000
        }
      });

      micStreamRef.current = stream;
      await setupAudioAnalyser(stream);

      isMicActiveRef.current = true;
      isConsultationActiveRef.current = true;
      setIsMicActive(true);
      setIsConsultationActive(true);
      setDurationSeconds(0);

      // Duration interval
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = window.setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);

      // Initialize speech recognition
      startRecognitionSession();

      // Step 2: AI greets user ONCE in the selected language
      const currentLang = languageRef.current;
      const greetingText = INITIAL_GREETINGS[currentLang] || INITIAL_GREETINGS['en-IN'];
      const greetingMsg: ConsultationChatMessage = {
        id: `msg-greeting-${Date.now()}`,
        role: 'model',
        content: greetingText,
        timestamp: Date.now()
      };

      setMessages([greetingMsg]);
      setAiResponse(greetingText);

      // Deliver spoken greeting naturally
      window.setTimeout(() => {
        speakText(greetingText, currentLang);
      }, 350);

      return true;
    } catch (err: any) {
      setIsMicActive(false);
      setError('Microphone permission was denied. Please allow microphone access to talk with Dr. AI Neurologist.');
      return false;
    }
  }, [setupAudioAnalyser, startRecognitionSession, speakText]);

  // Toggle Mic Mute/Unmute
  const toggleMic = useCallback(() => {
    if (isMicActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      stopAudioStreams();
      setIsMicActive(false);
      isMicActiveRef.current = false;
      setAssistantState('READY');
      setActiveSpeaker('none');
    } else {
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true },
            channelCount: 1,
            sampleRate: 48000
          }
        })
        .then(async (stream) => {
          micStreamRef.current = stream;
          await setupAudioAnalyser(stream);
          setIsMicActive(true);
          isMicActiveRef.current = true;
          startRecognitionSession();
        })
        .catch(() => {
          setError('Microphone access unavailable.');
        });
    }
  }, [isMicActive, setupAudioAnalyser, startRecognitionSession, stopAudioStreams]);

  // Update speech recognition language on language change
  const handleLanguageChange = useCallback(
    (newLang: SupportedLanguageCode) => {
      console.log('[Lang] Language changed to:', newLang);
      setLanguage(newLang);
      languageRef.current = newLang;

      if (isConsultationActiveRef.current && isMicActiveRef.current) {
        startRecognitionSession();
      }
    },
    [startRecognitionSession]
  );

  // Manual text query submission
  const sendTextMessage = useCallback(
    async (text: string) => {
      await sendToGeminiAndSpeak(text);
    },
    [sendToGeminiAndSpeak]
  );

  // End Consultation and Generate Clinical Summary
  const endConsultation = useCallback(async (): Promise<ConsultationSummary | null> => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    interruptAIInternal();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    stopAudioStreams();
    isMicActiveRef.current = false;
    isConsultationActiveRef.current = false;
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
      const fallbackSummary: ConsultationSummary = {
        title: 'Dr. AI Neurologist Consultation Record',
        date_time: new Date().toLocaleDateString(),
        duration_seconds: durationSeconds,
        language: languageRef.current,
        topics_discussed: ["Parkinson's Disease Motor & Speech Guidance"],
        key_questions_asked: messagesRef.current
          .filter((m) => m.role === 'user')
          .map((m) => m.content),
        educational_explanations: ['Reviewed screening metrics and Parkinsonian symptom guidance.'],
        questions_for_doctor: ['Please review these motor assessment findings with your neurologist.'],
        disclaimer: 'This consultation is for educational research screening only.'
      };
      setSummary(fallbackSummary);
      return fallbackSummary;
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [durationSeconds, interruptAIInternal, stopAudioStreams, userApiKey]);

  const resetConsultation = useCallback(() => {
    setMessages([]);
    setUserTranscript('');
    setAiResponse('');
    setDurationSeconds(0);
    setSummary(null);
    setAssistantState('READY');
    setActiveSpeaker('none');
    setError(null);
    pendingUtteranceRef.current = '';
    currentInterimRef.current = '';
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (aiAudioSimIntervalRef.current) clearInterval(aiAudioSimIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      (window as any)._activeSpeechUtterance = null;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
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
