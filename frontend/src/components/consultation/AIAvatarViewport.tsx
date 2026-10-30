import React, { useRef, useEffect, useState, useMemo } from 'react';
import { UserCheck, Sparkles, Volume2, Mic, Brain, Stethoscope } from 'lucide-react';

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
  languageName = "English",
  avatarSrc = "/assets/avatars/dr_ai_neurologist.jpg"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Preload and cache doctor portrait
  const doctorImage = useMemo(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = avatarSrc;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.warn('Avatar image failed to load, using fallback.');
      setImageError(true);
    };
    return img;
  }, [avatarSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Natural eye blinking & saccade tracking
    let blinkProgress = 0; // 0 = open, 1 = closed
    let isBlinking = false;
    let nextBlinkTime = performance.now() + 2500 + Math.random() * 2500;
    let eyeGazeX = 0;
    let eyeGazeY = 0;
    let nextGazeTime = performance.now() + 3000;

    // Calibrated eye coordinates on 1024x1024 portrait:
    const FACE = {
      width: 1024,
      height: 1024,
      // Left eye (viewer's left / doctor's right eye): pupil at (448, 348)
      leftEye: { x: 448, y: 348, rx: 25, ry: 15 },
      // Right eye (viewer's right / doctor's left eye): pupil at (573, 352)
      rightEye: { x: 573, y: 352, rx: 25, ry: 15 }
    };

    const render = (now: number) => {
      time += 0.024;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // --- 1. NATURAL INVOLUNTARY EYE BLINKING (Every 3.2 - 5.5s) ---
      if (now >= nextBlinkTime && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }
      if (isBlinking) {
        blinkProgress += 0.17; // Quick natural blink (~130ms)
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkProgress = 0;
          nextBlinkTime = now + 3200 + Math.random() * 2500;
        }
      }

      // --- 2. EYE MICRO-SACCADES (Subtle natural gaze shifts) ---
      if (now >= nextGazeTime) {
        eyeGazeX = (Math.random() - 0.5) * 1.8;
        eyeGazeY = (Math.random() - 0.5) * 1.2;
        nextGazeTime = now + 2400 + Math.random() * 2200;
      }

      // --- 3. SUBTLE POSTURE & BREATHING SWAY (Clean, lifelike presence) ---
      let swayX = Math.cos(time * 0.7) * 1.0 + eyeGazeX * 0.3;
      let swayY = Math.sin(time * 1.4) * 1.6;
      let headTilt = 0;

      if (state === 'LISTENING') {
        // Attentive clinical nod while listening to patient
        swayY += Math.sin(time * 2.1) * 2.2;
        headTilt = Math.sin(time * 1.0) * 0.005;
      } else if (state === 'PROCESSING') {
        // Thoughtful cognitive tilt
        headTilt = 0.008;
        swayY -= 0.8;
      } else if (state === 'SPEAKING') {
        // Conversational subtle cadence
        swayY += Math.sin(time * 3.6) * 1.2;
        swayX += Math.cos(time * 2.5) * 0.6;
      }

      ctx.save();

      // Deep clinical telemedicine backdrop
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#091528');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      if (imageLoaded && !imageError) {
        // Apply head posture transformation
        ctx.save();
        ctx.translate(w / 2 + swayX, h / 2 + swayY);
        ctx.rotate(headTilt);
        ctx.translate(-w / 2, -h / 2);

        // Aspect fit and center 1024x1024 portrait into canvas
        const scale = Math.max(w / FACE.width, h / FACE.height);
        const renderW = FACE.width * scale;
        const renderH = FACE.height * scale;
        const offsetX = (w - renderW) / 2;
        const offsetY = (h - renderH) / 2;

        // Draw Pristine Base Doctor Portrait (100% sharp, zero mouth cut-outs)
        ctx.drawImage(doctorImage, offsetX, offsetY, renderW, renderH);

        const toCanvasX = (imgX: number) => offsetX + imgX * scale;
        const toCanvasY = (imgY: number) => offsetY + imgY * scale;

        // --- 4. NATURAL EYE BLINKING OVERLAY ---
        if (blinkProgress > 0) {
          const blinkFactor = Math.sin(blinkProgress * Math.PI);

          const renderEyelid = (eye: typeof FACE.leftEye) => {
            const cx = toCanvasX(eye.x + eyeGazeX);
            const cy = toCanvasY(eye.y + eyeGazeY);
            const rx = eye.rx * scale * 1.05;
            const ry = eye.ry * scale * 1.15;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.clip();

            // Calibrated eyelid skin tone from doctor's portrait
            const lidGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
            lidGrad.addColorStop(0, '#c39379');
            lidGrad.addColorStop(0.7, '#a57358');
            lidGrad.addColorStop(1, '#66422d');
            ctx.fillStyle = lidGrad;

            const lidY = cy - ry + (ry * 2 * blinkFactor);
            ctx.beginPath();
            ctx.rect(cx - rx, cy - ry, rx * 2, lidY - (cy - ry));
            ctx.fill();

            // Natural eyelash margin
            ctx.strokeStyle = 'rgba(40, 25, 18, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cx - rx, lidY);
            ctx.quadraticCurveTo(cx, lidY + 1.2, cx + rx, lidY);
            ctx.stroke();
            ctx.restore();
          };

          renderEyelid(FACE.leftEye);
          renderEyelid(FACE.rightEye);
        }

        ctx.restore(); // Restore head transform
      } else {
        // Fallback procedural doctor placeholder
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Initializing Dr. AI Neurologist...', w / 2, h / 2);
      }

      // --- 5. CLINICAL TELEMEDICINE OPTICAL VIGNETTE ---
      const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.72);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(3, 7, 18, 0.20)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // --- 6. REAL-TIME SPEAKING ACTIVE GLOW (CYAN TELEMEDICINE BORDER) ---
      if (state === 'SPEAKING' && audioLevel > 5) {
        ctx.save();
        const pulseAlpha = Math.min(0.35, (audioLevel / 100) * 0.4);
        ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, w, h);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, audioLevel, imageLoaded, imageError, doctorImage]);

  // Status badge config
  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
        return {
          bg: 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400 animate-ping',
          text: 'Listening to Patient...',
          icon: Mic
        };
      case 'PROCESSING':
        return {
          bg: 'bg-indigo-950/85 border-indigo-500/50 text-indigo-300',
          dot: 'bg-indigo-400 animate-pulse',
          text: 'Analyzing & Thinking...',
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
          text: 'Ready · Waiting for Patient',
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
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-transparent">
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
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          <span>Male AI Telemedicine Active</span>
        </div>
      </div>
    </div>
  );
};
