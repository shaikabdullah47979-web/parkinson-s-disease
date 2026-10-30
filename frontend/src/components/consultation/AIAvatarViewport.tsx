import React, { useRef, useEffect } from 'react';
import { Sparkles, Bot } from 'lucide-react';

export type AssistantState = 'READY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface Props {
  state: AssistantState;
  audioLevel?: number; // 0 to 100
  languageName?: string;
}

export const AIAvatarViewport: React.FC<Props> = ({
  state,
  audioLevel = 0,
  languageName = "English"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Particle nodes for holographic 3D orbital cloud
    const particles = Array.from({ length: 48 }, (_, i) => ({
      orbitRadius: 70 + (i % 6) * 16,
      angle: (i / 48) * Math.PI * 2,
      speed: 0.015 + ((i % 5) * 0.005),
      yOffset: ((i % 7) - 3) * 18,
      size: 2 + (i % 3) * 1.5,
      color: i % 2 === 0 ? '#38bdf8' : '#0ea5e9'
    }));

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Deep medical sci-fi gradient background
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.7);
      bgGrad.addColorStop(0, '#0c1b33');
      bgGrad.addColorStop(0.6, '#081020');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Dynamic parameters based on state
      let pulse = Math.sin(time * 2.0) * 6;
      let coreColor = '#0ea5e9';
      let haloColor = 'rgba(14, 165, 233, ';
      let ringSpeed = 1.0;

      if (state === 'LISTENING') {
        pulse = Math.sin(time * 4.5) * 12 + (audioLevel * 0.3);
        coreColor = '#10b981';
        haloColor = 'rgba(16, 185, 129, ';
        ringSpeed = 1.5;
      } else if (state === 'PROCESSING') {
        pulse = Math.sin(time * 6.0) * 8;
        coreColor = '#818cf8';
        haloColor = 'rgba(129, 140, 248, ';
        ringSpeed = 3.2;
      } else if (state === 'SPEAKING') {
        pulse = Math.sin(time * 5.0) * (14 + (audioLevel * 0.4));
        coreColor = '#06b6d4';
        haloColor = 'rgba(6, 182, 212, ';
        ringSpeed = 2.0;
      }

      const coreRadius = Math.max(36, 52 + pulse);

      // 1. Outer Holographic Atmospheric Glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.4, centerX, centerY, coreRadius * 2.5);
      glowGrad.addColorStop(0, haloColor + '0.35)');
      glowGrad.addColorStop(0.5, haloColor + '0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Radiating Rings in Speaking & Listening states
      if (state === 'SPEAKING' || state === 'LISTENING') {
        for (let r = 1; r <= 3; r++) {
          const waveRadius = coreRadius + ((time * 30 * r) % 110);
          const alpha = Math.max(0, 1 - (waveRadius / (coreRadius + 110)));
          ctx.beginPath();
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = haloColor + (alpha * 0.5) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 3. Holographic 3D Orbiting Particles (Depth projection)
      particles.forEach((p) => {
        p.angle += p.speed * ringSpeed;
        const currentRadius = p.orbitRadius + (pulse * 0.5);

        // 3D elliptical orbit projection
        const x = centerX + Math.cos(p.angle) * currentRadius;
        const z = Math.sin(p.angle); // -1 (behind) to +1 (in front)
        const y = centerY + Math.sin(p.angle) * (currentRadius * 0.35) + p.yOffset;

        const scale = 0.65 + (z + 1) * 0.35; // 0.65 to 1.35 scale
        const alpha = 0.2 + (z + 1) * 0.4;

        ctx.beginPath();
        ctx.arc(x, y, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = haloColor + alpha + ')';
        ctx.fill();

        // Connect nearby particles with subtle neural synapse lines
        if (z > 0 && state === 'PROCESSING') {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(centerX, centerY);
          ctx.strokeStyle = haloColor + '0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // 4. Central 3D Shaded Glowing Sphere
      const sphereGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.3,
        centerY - coreRadius * 0.35,
        coreRadius * 0.1,
        centerX,
        centerY,
        coreRadius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.25, coreColor);
      sphereGrad.addColorStop(0.85, '#0369a1');
      sphereGrad.addColorStop(1, '#082f49');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 28;
      ctx.fill();
      ctx.restore();

      // 5. Digital Optical Grid Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.25 * ringSpeed);
      ctx.beginPath();
      ctx.ellipse(0, 0, coreRadius * 1.45, coreRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.strokeStyle = haloColor + '0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400 animate-ping',
          text: 'Listening to Patient...'
        };
      case 'PROCESSING':
        return {
          bg: 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300',
          dot: 'bg-indigo-400 animate-pulse',
          text: 'Analyzing & Thinking...'
        };
      case 'SPEAKING':
        return {
          bg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
          text: 'Speaking Response...'
        };
      case 'READY':
      default:
        return {
          bg: 'bg-slate-900/80 border-slate-700/60 text-slate-300',
          dot: 'bg-cyan-400',
          text: 'Ready · Waiting for User'
        };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
      {/* 3D Canvas Visualizer */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Overlay: Assistant Persona */}
      <div className="relative z-20 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-white text-xs font-bold tracking-tight">Dr. NeuroVoice AI</h4>
            <span className="text-[10px] text-slate-400 block -mt-0.5">Clinical Research Assistant</span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>{languageName}</span>
        </div>
      </div>

      {/* Bottom Overlay: AI Current State Badge */}
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent">
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 backdrop-blur-md ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          <span>{badge.text}</span>
        </div>

        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
          Gemini 2.0 Multimodal
        </span>
      </div>
    </div>
  );
};

