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

  // Preload doctor portrait
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

  // Preload doctor gesturing hand sprites
  const handRightImage = useMemo(() => {
    const img = new Image();
    img.src = '/assets/avatars/dr_hand_right.png';
    return img;
  }, []);

  const handLeftImage = useMemo(() => {
    const img = new Image();
    img.src = '/assets/avatars/dr_hand_left.png';
    return img;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Smooth physics states
    let currentJawOpen = 0;
    let currentLipSpread = 0;
    let blinkProgress = 0; // 0 = open, 1 = closed
    let isBlinking = false;
    let nextBlinkTime = performance.now() + 2500 + Math.random() * 2500;
    let eyeGazeX = 0;
    let eyeGazeY = 0;
    let nextGazeTime = performance.now() + 3000;

    // Hand gesture physics
    let handProgress = 0; // 0 = below desk, 1 = active gesturing in view
    let targetHandProgress = 0;
    let activeHandSide: 'right' | 'left' = 'right';
    let gestureEmphasis = 0;

    // Exact anatomical coordinates from calibration on 1024x1024 portrait:
    const FACE = {
      width: 1024,
      height: 1024,
      // Left eye (viewer's left / doctor's right eye): pupil at (448, 346)
      leftEye: { x: 448, y: 348, rx: 25, ry: 15 },
      // Right eye (viewer's right / doctor's left eye): pupil at (573, 354)
      rightEye: { x: 573, y: 352, rx: 25, ry: 15 },
      // Calibrated mouth coordinates:
      mouth: {
        centerX: 510,
        centerY: 491,      // Exact lip contact line
        width: 140,        // X 440 to 580
        lipTopY: 475,      // Upper lip top
        lipBottomY: 512,   // Lower lip bottom
        chinY: 565         // Chin crease
      }
    };

    const render = (now: number) => {
      time += 0.024;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // --- 1. NATURAL INVOLUNTARY BLINKING (Every 3.2 - 5.5s) ---
      if (now >= nextBlinkTime && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }
      if (isBlinking) {
        blinkProgress += 0.17; // ~130ms quick natural blink
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkProgress = 0;
          nextBlinkTime = now + 3200 + Math.random() * 2500;
        }
      }

      // --- 2. EYE MICRO-SACCADES (Subtle natural gaze attention) ---
      if (now >= nextGazeTime) {
        eyeGazeX = (Math.random() - 0.5) * 1.8;
        eyeGazeY = (Math.random() - 0.5) * 1.2;
        nextGazeTime = now + 2400 + Math.random() * 2200;
      }

      // --- 3. SUBTLE POSTURE & BREATHING SWAY ---
      let swayX = Math.cos(time * 0.7) * 1.0 + eyeGazeX * 0.3;
      let swayY = Math.sin(time * 1.4) * 1.6;
      let headTilt = 0;

      if (state === 'LISTENING') {
        // Attentive clinical nod while listening to patient
        swayY += Math.sin(time * 2.1) * 2.2;
        headTilt = Math.sin(time * 1.0) * 0.005;
      } else if (state === 'PROCESSING') {
        headTilt = 0.008;
        swayY -= 0.8;
      } else if (state === 'SPEAKING') {
        // Conversational articulation cadence
        swayY += Math.sin(time * 3.8) * 1.4;
        swayX += Math.cos(time * 2.7) * 0.7;
      }

      // --- 4. ACCURATE SPEECH-DRIVEN LIP-SYNC (SYLLABLE ENVELOPE) ---
      let targetOpen = 0;
      let targetSpread = 0;

      if (state === 'SPEAKING' && audioLevel > 5) {
        // Organic syllable wave: modulates with speech energy and natural human cadence (~4.2 Hz)
        const syllableCadence = (Math.sin(time * 8.5) + 1) * 0.5; // Smooth 0 to 1 wave
        const intensity = Math.min(1.0, audioLevel / 75);
        targetOpen = intensity * (10 + syllableCadence * 8); // 10 to 18px opening
        targetSpread = intensity * (3 + syllableCadence * 4);
      }

      // Elastic muscle interpolation (no jitter, smooth human transitions)
      currentJawOpen += (targetOpen - currentJawOpen) * 0.35;
      currentLipSpread += (targetSpread - currentLipSpread) * 0.30;

      // Instant closure on interruption or speech completion
      if (state !== 'SPEAKING' || audioLevel <= 4) {
        currentJawOpen *= 0.60;
        currentLipSpread *= 0.60;
        if (currentJawOpen < 0.2) currentJawOpen = 0;
        if (currentLipSpread < 0.2) currentLipSpread = 0;
      }

      // --- 5. REALISTIC DOCTOR HAND GESTURE PHYSICS ---
      if (state === 'SPEAKING') {
        targetHandProgress = 1.0;
        // Periodic subtle cadence emphasis
        gestureEmphasis = Math.sin(time * 3.2) * 8;
      } else {
        targetHandProgress = 0.0;
        gestureEmphasis = 0;
      }

      // Smooth hand entry and retraction
      handProgress += (targetHandProgress - handProgress) * 0.08;

      ctx.save();

      // Deep clinical backdrop
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#091528');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      if (imageLoaded && !imageError) {
        // Apply head sway transformation
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

        // Base Doctor Portrait
        ctx.drawImage(doctorImage, offsetX, offsetY, renderW, renderH);

        const toCanvasX = (imgX: number) => offsetX + imgX * scale;
        const toCanvasY = (imgY: number) => offsetY + imgY * scale;

        // --- 6. NATURAL EYE BLINK OVERLAY ---
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

        // --- 7. ACCURATE, SEAMLESS LIP-SYNC & JAW MOVEMENT ---
        if (currentJawOpen > 0.6) {
          const mcx = toCanvasX(FACE.mouth.centerX);
          const mcy = toCanvasY(FACE.mouth.centerY);
          const mw = (FACE.mouth.width * 0.5 + currentLipSpread) * scale;
          const openH = currentJawOpen * scale * 1.05;

          ctx.save();

          // 7a. Oral Cavity Interior (Anatomical depth)
          ctx.beginPath();
          ctx.ellipse(mcx, mcy + (openH * 0.45), mw * 0.85, openH * 0.80, 0, 0, Math.PI * 2);

          const mouthGrad = ctx.createRadialGradient(mcx, mcy, 2, mcx, mcy + openH * 0.5, openH * 1.2);
          mouthGrad.addColorStop(0, '#150607');
          mouthGrad.addColorStop(0.65, '#280c10');
          mouthGrad.addColorStop(1, '#44191d');
          ctx.fillStyle = mouthGrad;
          ctx.fill();

          // 7b. Natural Upper Teeth Hint (Visible during vocal speech)
          if (currentJawOpen > 2.2) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(mcx, mcy + (openH * 0.45), mw * 0.85, openH * 0.80, 0, 0, Math.PI * 2);
            ctx.clip();

            ctx.fillStyle = '#f7f4ee';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 2.5;
            ctx.beginPath();
            const teethW = mw * 0.65;
            const teethH = Math.min(openH * 0.48, 5.2 * scale);
            ctx.ellipse(mcx, mcy + 1.2, teethW, teethH, 0, 0, Math.PI);
            ctx.fill();
            ctx.restore();
          }

          // 7c. Lower Lip & Chin Displacement (Seamless feathering, no cut lines)
          const sx = FACE.mouth.centerX - (FACE.mouth.width * 0.65);
          const sy = FACE.mouth.centerY - 2; // Exact lip contact line
          const sw = FACE.mouth.width * 1.3;
          const sh = 75; // Sample lower lip down into beard

          const dx = toCanvasX(sx);
          const dy = toCanvasY(sy) + openH * 0.82; // Drops down with jaw
          const dw = sw * scale;
          const dh = sh * scale;

          ctx.save();
          // Feathered ellipse mask around lower lip
          ctx.beginPath();
          ctx.ellipse(mcx, dy + (dh * 0.35), dw * 0.48, dh * 0.52, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(doctorImage, sx, sy, sw, sh, dx, dy, dw, dh);

          // Natural crease shadow under lower lip
          ctx.fillStyle = 'rgba(32, 16, 12, 0.28)';
          ctx.beginPath();
          ctx.ellipse(mcx, dy + 2, dw * 0.40, 2.2 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 7d. Stable Upper Lip & Mustache Preservation
          const usx = FACE.mouth.centerX - (FACE.mouth.width * 0.6);
          const usy = FACE.mouth.lipTopY - 14;
          const usw = FACE.mouth.width * 1.2;
          const ush = 24;

          const udx = toCanvasX(usx);
          const udy = toCanvasY(usy);
          const udw = usw * scale;
          const udh = ush * scale;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(mcx, udy + (udh * 0.6), udw * 0.46, udh * 0.5, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(doctorImage, usx, usy, usw, ush, udx, udy, udw, udh);
          ctx.restore();

          ctx.restore();
        }

        ctx.restore(); // Restore head transform
      }

      // --- 8. REALISTIC DOCTOR HAND GESTURE RENDERING ---
      if (handProgress > 0.02) {
        ctx.save();

        // Calculate hand position: enters smoothly from bottom right into lower foreground
        const handScale = 0.58;
        const handW = 500 * handScale;
        const handH = 600 * handScale;

        // Base resting Y is below the bottom edge (h + 50)
        // Active Y brings hand into lower right quadrant (h - 220)
        const restingY = h + 60;
        const activeY = h - handH + 90 + gestureEmphasis;
        const currentY = restingY - (restingY - activeY) * handProgress;
        const currentX = w - handW + 35 + (Math.sin(time * 2.4) * 4);

        // Hand gesture articulation rotation
        const handAngle = -0.05 + Math.sin(time * 3.0) * 0.035;

        ctx.translate(currentX + handW * 0.5, currentY + handH * 0.7);
        ctx.rotate(handAngle);
        ctx.translate(-(currentX + handW * 0.5), -(currentY + handH * 0.7));

        // Soft natural drop shadow behind doctor hand onto lab coat
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 8;

        // Render high-res doctor hand with white lab coat cuff
        ctx.drawImage(handRightImage, currentX, currentY, handW, handH);

        ctx.restore();
      }

      // --- 9. CLINICAL TELEMEDICINE OPTICAL VIGNETTE ---
      const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.72);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(3, 7, 18, 0.20)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // --- 10. REAL-TIME SPEAKING ACTIVE GLOW (CYAN TELEMEDICINE BORDER) ---
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
  }, [state, audioLevel, imageLoaded, imageError, doctorImage, handRightImage, handLeftImage]);

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
          text: 'Dr. AI Neurologist Speaking & Explaining...',
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
          <span>Telemedicine AI Active</span>
        </div>
      </div>
    </div>
  );
};
