import React, { useRef, useEffect } from 'react';
import { UserCheck, Sparkles, Volume2, Mic, Brain, Stethoscope, Activity } from 'lucide-react';

export type AssistantState = 'READY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface Props {
  state: AssistantState;
  audioLevel?: number; // 0 to 100
  languageName?: string;
  avatarSrc?: string;
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

    let animId: number;
    let time = 0;

    // Generate orbiting neural synapse particles
    const particles = Array.from({ length: 42 }, (_, i) => ({
      angle: (i / 42) * Math.PI * 2,
      orbitRadius: 65 + (i % 5) * 18,
      speed: 0.015 + (i % 4) * 0.006,
      size: 2.0 + (i % 3) * 1.4,
      yTilt: ((i % 7) - 3) * 14,
      color: i % 2 === 0 ? '#38bdf8' : '#0ea5e9'
    }));

    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Deep medical sci-fi gradient background
      const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.75);
      bg.addColorStop(0, '#0a192f');
      bg.addColorStop(0.55, '#050d1a');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Dynamic reactive styling parameters based on state
      let pulse = Math.sin(time * 2.2) * 5;
      let coreColor = '#0ea5e9';
      let haloColor = 'rgba(14, 165, 233, ';
      let ringSpeed = 1.0;
      let waveCount = 2;

      if (state === 'LISTENING') {
        // High-energy Emerald: reacts dynamically to user speech
        pulse = Math.sin(time * 4.8) * 8 + (audioLevel * 0.35);
        coreColor = '#10b981';
        haloColor = 'rgba(16, 185, 129, ';
        ringSpeed = 1.6;
        waveCount = 3;
      } else if (state === 'PROCESSING') {
        // Fast-spinning Indigo/Violet: thinking and analyzing
        pulse = Math.sin(time * 6.5) * 7;
        coreColor = '#818cf8';
        haloColor = 'rgba(129, 140, 248, ';
        ringSpeed = 3.2;
        waveCount = 4;
      } else if (state === 'SPEAKING') {
        // Radiant Cyan/Teal: modulating with doctor voice output
        pulse = Math.sin(time * 5.2) * 10 + (audioLevel * 0.45);
        coreColor = '#06b6d4';
        haloColor = 'rgba(6, 182, 212, ';
        ringSpeed = 2.2;
        waveCount = 3;
      }

      const coreRadius = Math.max(38, 54 + pulse);

      // 1. Outer Atmospheric Radial Glow
      const glow = ctx.createRadialGradient(cx, cy, coreRadius * 0.3, cx, cy, coreRadius * 2.6);
      glow.addColorStop(0, haloColor + '0.40)');
      glow.addColorStop(0.5, haloColor + '0.14)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Radiating Sonic Wave Rings
      if (state === 'SPEAKING' || state === 'LISTENING') {
        for (let r = 1; r <= waveCount; r++) {
          const waveRadius = coreRadius + ((time * 35 * r) % 115);
          const alpha = Math.max(0, 1 - waveRadius / (coreRadius + 115));
          ctx.beginPath();
          ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = haloColor + (alpha * 0.55) + ')';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }

      // 3. Orbiting Neural Synapse Particles (Depth Projection)
      particles.forEach((p) => {
        p.angle += p.speed * ringSpeed;
        const currentRadius = p.orbitRadius + pulse * 0.4;

        // 3D elliptical orbit projection
        const x = cx + Math.cos(p.angle) * currentRadius;
        const z = Math.sin(p.angle); // -1 (behind) to +1 (front)
        const y = cy + Math.sin(p.angle) * (currentRadius * 0.38) + p.yTilt;

        const scale = 0.65 + (z + 1) * 0.35;
        const alpha = 0.25 + (z + 1) * 0.38;

        ctx.beginPath();
        ctx.arc(x, y, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = haloColor + alpha + ')';
        ctx.fill();

        // Synaptic connection beams during processing
        if (state === 'PROCESSING' && z > 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = haloColor + '0.10)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // 4. Central 3D Shaded Glowing Neural Sphere
      const sphereGrad = ctx.createRadialGradient(
        cx - coreRadius * 0.3,
        cy - coreRadius * 0.35,
        coreRadius * 0.08,
        cx,
        cy,
        coreRadius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.22, coreColor);
      sphereGrad.addColorStop(0.8, '#0369a1');
      sphereGrad.addColorStop(1, '#082f49');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.restore();

      // 5. Digital Optical Grid Rings (Equatorial Orbit)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.28 * ringSpeed);
      ctx.beginPath();
      ctx.ellipse(0, 0, coreRadius * 1.48, coreRadius * 0.46, 0, 0, Math.PI * 2);
      ctx.strokeStyle = haloColor + '0.65)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();

      // 6. Clinical Telemedicine Optical Vignette
      const vignette = ctx.createRadialGradient(cx, cy, w * 0.32, cx, cy, w * 0.72);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(2, 6, 23, 0.25)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // 7. Active State Perimeter Pulse
      if (state === 'SPEAKING' || state === 'LISTENING') {
        ctx.save();
        const borderAlpha = Math.min(0.35, 0.15 + (audioLevel / 100) * 0.25);
        ctx.strokeStyle = state === 'LISTENING'
          ? `rgba(16, 185, 129, ${borderAlpha})`
          : `rgba(6, 182, 212, ${borderAlpha})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, w, h);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, audioLevel]);

  // Status badge config
  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
        return {
          bg: 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400 animate-ping',
          text: 'Listening to Your Voice...',
          icon: Mic
        };
      case 'PROCESSING':
        return {
          bg: 'bg-indigo-950/85 border-indigo-500/50 text-indigo-300',
          dot: 'bg-indigo-400 animate-pulse',
          text: 'Analyzing Symptoms & Context...',
          icon: Brain
        };
      case 'SPEAKING':
        return {
          bg: 'bg-cyan-950/85 border-cyan-500/50 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
          text: 'Dr. AI Neurologist Speaking...',
          icon: Volume2
        };
      case 'READY':
      default:
        return {
          bg: 'bg-slate-900/85 border-slate-700/60 text-slate-300',
          dot: 'bg-cyan-400',
          text: 'Ready · Speak Naturally',
          icon: UserCheck
        };
    }
  };

  const badge = getStateBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between group">
      {/* Real-Time Canvas Video Feed */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Header Overlay: Doctor Name, Credentials & Language */}
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-400 flex items-center justify-center shadow-xs">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-white text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5">
              <span>Dr. AI Neurologist</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </h4>
            <span className="text-[10px] text-slate-300 block -mt-0.5 font-medium">
              AI Neurological Research Assistant
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="font-semibold">{languageName}</span>
        </div>
      </div>

      {/* Bottom Status Overlay: Active Speech / Listening HUD */}
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent">
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 backdrop-blur-md shadow-xs ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge.text}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-700/60 backdrop-blur-md">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>AI Telemedicine Active</span>
        </div>
      </div>
    </div>
  );
};
