import React, { useRef, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface Props {
  userAnalyser: AnalyserNode | null;
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
  aiAudioLevel?: number; // 0 to 100
}

export const AudioWaveformVisualizer: React.FC<Props> = ({
  userAnalyser,
  isUserSpeaking,
  isAISpeaking,
  aiAudioLevel = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const bufferLength = userAnalyser ? userAnalyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      time += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Subtle background grid lines
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Read real user frequency data if available
      if (userAnalyser && isUserSpeaking) {
        userAnalyser.getByteFrequencyData(dataArray);
      }

      // Draw User Voice Wave (Emerald / Teal)
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isUserSpeaking ? '#10b981' : '#94a3b8';

      const userPoints = 48;
      for (let i = 0; i <= userPoints; i++) {
        const x = (i / userPoints) * width;
        let amp = 0;

        if (isUserSpeaking) {
          const freqIndex = Math.floor((i / userPoints) * (bufferLength / 2));
          const freqVal = dataArray[freqIndex] || 0;
          amp = (freqVal / 255) * (height * 0.38) * Math.sin(i * 0.35 + time * 4);
        } else {
          // Idle gentle baseline ripple
          amp = Math.sin(i * 0.2 + time) * 3;
        }

        const y = centerY + amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw AI Speech Wave (Cyan / Blue)
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isAISpeaking ? '#0ea5e9' : 'rgba(148, 163, 184, 0.4)';

      for (let i = 0; i <= userPoints; i++) {
        const x = (i / userPoints) * width;
        let amp = 0;

        if (isAISpeaking) {
          const energy = Math.max(0.3, aiAudioLevel / 100);
          amp = Math.sin(i * 0.45 - time * 5) * (height * 0.38 * energy) * Math.cos(i * 0.15 + time);
        } else {
          amp = Math.sin(i * 0.25 - time * 0.8) * 2;
        }

        const y = centerY + amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [userAnalyser, isUserSpeaking, isAISpeaking, aiAudioLevel]);

  return (
    <div className="bg-white rounded-2xl border border-[#E0EFFA] p-3 sm:p-4 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
            Dual-Channel Acoustic Waveform
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${isUserSpeaking ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className={isUserSpeaking ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Patient Voice</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${isAISpeaking ? 'bg-cyan-500 animate-ping' : 'bg-cyan-500'}`} />
            <span className={isAISpeaking ? 'text-cyan-700 font-bold' : 'text-slate-500'}>AI Assistant</span>
          </span>
        </div>
      </div>

      <div className="w-full h-14 bg-slate-50/70 rounded-xl border border-slate-100 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={70}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};
