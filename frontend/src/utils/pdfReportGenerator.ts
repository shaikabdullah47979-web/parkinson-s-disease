import { jsPDF } from 'jspdf';
import { ScreeningReport, PatientInfo, evaluateCompositeDiagnosis } from './movementAnalytics';

export function generateMovementPdfReport(report: ScreeningReport, patient: PatientInfo | null): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const diagnosis = evaluateCompositeDiagnosis(report);
  const { handTremor, fingerTapping, armMovement, walkingPosture } = report;

  // Colors
  const navyDark: [number, number, number] = [15, 23, 42]; // slate-900
  const skyBlue: [number, number, number] = [14, 165, 233]; // sky-500
  const slateText: [number, number, number] = [71, 85, 105]; // slate-600
  const darkText: [number, number, number] = [30, 41, 59]; // slate-800
  const lightBg: [number, number, number] = [248, 250, 252]; // slate-50
  const borderGray: [number, number, number] = [226, 232, 240]; // slate-200

  let y = 14;

  // --- HEADER BAR ---
  doc.setFillColor(...navyDark);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('NEUROVOICE MOTOR KINEMATICS ANALYSIS', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253);
  doc.text('Comprehensive 4-Test Battery Assessment & Telemetry Report', margin + 6, y + 14);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const nowStr = new Date(report.timestamp || Date.now()).toLocaleString();
  doc.text(`Date & Time: ${nowStr}`, pageWidth - margin - 6, y + 14, { align: 'right' });

  y += 26;

  // --- PATIENT PROFILE BOX ---
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkText);
  doc.text('PATIENT INTAKE INFORMATION', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateText);

  const pName = patient?.name?.trim() || 'Anonymous Subject';
  const pAge = patient?.age ? `${patient.age} yrs` : 'Not Specified';
  const pGender = patient?.gender || 'Not Specified';
  const sessionUid = `NV-${Math.abs(report.timestamp ? report.timestamp.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) : Date.now()).toString(16).toUpperCase().slice(0, 8)}`;

  doc.text(`Patient Name:`, margin + 4, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(pName, margin + 26, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`Age:`, margin + 70, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(pAge, margin + 78, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`Gender:`, margin + 110, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(pGender, margin + 123, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`Session ID:`, margin + 145, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(sessionUid, margin + 162, y + 13);

  y += 24;

  // --- EXECUTIVE DIAGNOSTIC CONCLUSION BOX ---
  let bannerBg: [number, number, number] = [240, 253, 244]; // emerald-50
  let bannerBorder: [number, number, number] = [34, 197, 94]; // emerald-500
  let bannerText: [number, number, number] = [21, 128, 61]; // emerald-700

  if (diagnosis.riskLevel === 'HIGH_PROBABILITY') {
    bannerBg = [255, 241, 242]; // rose-50
    bannerBorder = [244, 63, 94]; // rose-500
    bannerText = [190, 18, 60]; // rose-700
  } else if (diagnosis.riskLevel === 'MODERATE_BORDERLINE') {
    bannerBg = [254, 243, 199]; // amber-50
    bannerBorder = [245, 158, 11]; // amber-500
    bannerText = [180, 83, 9]; // amber-700
  }

  doc.setFillColor(...bannerBg);
  doc.setDrawColor(...bannerBorder);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 31, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...bannerText);
  doc.text('EXECUTIVE DIAGNOSTIC CONCLUSION & AGGREGATE RISK VERDICT', margin + 4, y + 6);

  doc.setFontSize(11);
  doc.text(`${diagnosis.verdictTitle}`, margin + 4, y + 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Indicative Probability: ${diagnosis.probabilityPct}% (${diagnosis.totalAbnormalCount} of 4 hallmark criteria flagged)`, pageWidth - margin - 4, y + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...darkText);
  const summaryLines = doc.splitTextToSize(diagnosis.clinicalSummary, contentWidth - 8);
  doc.text(summaryLines, margin + 4, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...bannerText);
  doc.text(`Recommendation: ${diagnosis.recommendation}`, margin + 4, y + 27);

  y += 36;

  // --- GRANULAR 4-TEST TELEMETRY BREAKDOWN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...navyDark);
  doc.text('GRANULAR 4-TEST BATTERY TELEMETRY BREAKDOWN', margin, y);

  y += 4;

  const testCardHeight = 31;
  const cardGap = 3;

  // Module 1: Hand Tremor
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, testCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  doc.text('1. Hand Resting Tremor & Frequency Analysis (30s Spectral Estimation)', margin + 4, y + 6);

  doc.setFontSize(7.5);
  if (handTremor) {
    const isTremorFlagged = (handTremor.dominantFrequencyHz && handTremor.dominantFrequencyHz >= 3.5 && handTremor.dominantFrequencyHz <= 7.0);
    doc.setTextColor(isTremorFlagged ? 190 : 21, isTremorFlagged ? 18 : 128, isTremorFlagged ? 60 : 61);
    doc.text(isTremorFlagged ? 'PATHOLOGICAL OSCILLATION DETECTED' : 'NORMAL STABILITY', pageWidth - margin - 4, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Dominant Oscillation:`, margin + 4, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(handTremor.dominantFrequencyHz ? `${handTremor.dominantFrequencyHz.toFixed(2)} Hz` : 'Inconclusive / No Peak', margin + 35, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Peak SNR:`, margin + 85, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(handTremor.snrDb ? `${handTremor.snrDb.toFixed(1)} dB` : 'N/A', margin + 102, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Tracking Continuity:`, margin + 130, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${handTremor.trackingContinuityPct}% (${handTremor.effectiveFps} FPS)`, margin + 158, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Mean Micro-Displacement:`, margin + 4, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${handTremor.meanDisplacement} px`, margin + 40, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Signal Quality:`, margin + 85, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${handTremor.signalQuality}`, margin + 107, y + 18);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...slateText);
    doc.text(`Finding: ${handTremor.plainEnglishTitle} — ${handTremor.plainEnglishExplanation}`, margin + 4, y + 25);
  } else {
    doc.setTextColor(...slateText);
    doc.text('Test not completed in this battery.', margin + 4, y + 16);
  }

  y += testCardHeight + cardGap;

  // Module 2: Finger Tapping
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, testCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  doc.text('2. Finger Tapping Agility & Bradykinesia Cadence Test (30s Motor Sequencing)', margin + 4, y + 6);

  doc.setFontSize(7.5);
  if (fingerTapping) {
    const isTapFlagged = fingerTapping.tapsPerMinute < 110 || fingerTapping.rhythmCvPercent > 25.0 || fingerTapping.amplitudeFatigueRatio < 0.70;
    doc.setTextColor(isTapFlagged ? 190 : 21, isTapFlagged ? 18 : 128, isTapFlagged ? 60 : 61);
    doc.text(isTapFlagged ? 'BRADYKINESIA / FATIGUE FLAGGED' : 'NORMAL CADENCE & RHYTHM', pageWidth - margin - 4, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Total Validated Taps:`, margin + 4, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${fingerTapping.validatedTaps} taps`, margin + 35, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Cadence:`, margin + 85, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${fingerTapping.tapsPerMinute} taps/min`, margin + 100, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Rhythm CV:`, margin + 130, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${fingerTapping.rhythmCvPercent}%`, margin + 150, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Amplitude Fatigue Ratio:`, margin + 4, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${fingerTapping.amplitudeFatigueRatio}x (Initial vs Late)`, margin + 40, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Mean Interval:`, margin + 85, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${fingerTapping.meanInterTapIntervalMs} ms (±${fingerTapping.interTapIntervalStdMs} ms)`, margin + 107, y + 18);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...slateText);
    doc.text(`Finding: ${fingerTapping.plainEnglishTitle} — ${fingerTapping.plainEnglishExplanation}`, margin + 4, y + 25);
  } else {
    doc.setTextColor(...slateText);
    doc.text('Test not completed in this battery.', margin + 4, y + 16);
  }

  y += testCardHeight + cardGap;

  // Module 3: Arm Movement
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, testCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  doc.text('3. Arm Movement Kinematics, Rigidity & Smoothness (SPARC Algorithm)', margin + 4, y + 6);

  doc.setFontSize(7.5);
  if (armMovement) {
    const isArmFlagged = armMovement.excursionRangeDeg < 45.0 || armMovement.movementSmoothnessScore < 60.0;
    doc.setTextColor(isArmFlagged ? 190 : 21, isArmFlagged ? 18 : 128, isArmFlagged ? 60 : 61);
    doc.text(isArmFlagged ? 'REDUCED EXCURSION / RIGIDITY' : 'NORMAL ARTICULATION RANGE', pageWidth - margin - 4, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Excursion Range:`, margin + 4, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${armMovement.excursionRangeDeg}° (${armMovement.minElbowAngleDeg}° – ${armMovement.maxElbowAngleDeg}°)`, margin + 30, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Angular Speed:`, margin + 85, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${armMovement.meanAngularVelocityDegPerSec}°/s (Peak: ${armMovement.peakAngularVelocityDegPerSec}°/s)`, margin + 107, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`SPARC Smoothness:`, margin + 4, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${armMovement.movementSmoothnessScore} / 100`, margin + 36, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Repetition Cycles:`, margin + 85, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${armMovement.repetitionCount} cycles`, margin + 112, y + 18);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...slateText);
    doc.text(`Finding: ${armMovement.plainEnglishTitle} — ${armMovement.plainEnglishExplanation}`, margin + 4, y + 25);
  } else {
    doc.setTextColor(...slateText);
    doc.text('Test not completed in this battery.', margin + 4, y + 16);
  }

  y += testCardHeight + cardGap;

  // Module 4: Walking & Posture
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, testCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  doc.text('4. Walking Posture Alignment, Axial Lean & Step Symmetry Test', margin + 4, y + 6);

  doc.setFontSize(7.5);
  if (walkingPosture) {
    const isWalkFlagged = walkingPosture.meanTrunkLeanAngleDeg > 12.0 || walkingPosture.stepSymmetryIndexPct < 68.0;
    doc.setTextColor(isWalkFlagged ? 190 : 21, isWalkFlagged ? 18 : 128, isWalkFlagged ? 60 : 61);
    doc.text(isWalkFlagged ? 'AXIAL LEAN / ASYMMETRY FLAGGED' : 'STABLE POSTURAL BALANCE', pageWidth - margin - 4, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Mean Trunk Lean:`, margin + 4, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${walkingPosture.meanTrunkLeanAngleDeg}°`, margin + 30, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Step Symmetry:`, margin + 65, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${walkingPosture.stepSymmetryIndexPct}%`, margin + 88, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Cadence:`, margin + 125, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${walkingPosture.cadenceStepsPerMin} steps/min`, margin + 140, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Posture Stability Score:`, margin + 4, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${walkingPosture.postureStabilityScore} / 100`, margin + 38, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(`Detected Steps:`, margin + 65, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`${walkingPosture.stepCount} steps`, margin + 88, y + 18);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...slateText);
    doc.text(`Finding: ${walkingPosture.plainEnglishTitle} — ${walkingPosture.plainEnglishExplanation}`, margin + 4, y + 25);
  } else {
    doc.setTextColor(...slateText);
    doc.text('Test not completed in this battery.', margin + 4, y + 16);
  }

  y += testCardHeight + 5;

  // --- MULTIVARIATE DIAGNOSTIC FLAGS SUMMARY ---
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navyDark);
  doc.text('MULTIVARIATE DIAGNOSTIC FLAGS AUDIT TRAIL', margin + 4, y + 5);

  let flagY = y + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  diagnosis.flags.forEach((f) => {
    if (f.isAbnormal) {
      doc.setTextColor(190, 18, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(`[FLAGGED]`, margin + 4, flagY);
    } else {
      doc.setTextColor(21, 128, 61);
      doc.setFont('helvetica', 'normal');
      doc.text(`[NORMAL]`, margin + 4, flagY);
    }
    doc.setTextColor(...darkText);
    doc.text(`${f.category}: ${f.finding}`, margin + 22, flagY);
    flagY += 3.8;
  });

  y += 27;

  // --- CLINICAL DISCLAIMER & REGULATORY ATTESTATION ---
  doc.setFillColor(254, 252, 232); // yellow-50
  doc.setDrawColor(234, 179, 8); // yellow-500
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 98, 7);
  doc.text('CLINICAL DISCLAIMER & COMPUTATIONAL SCREENING ATTESTATION', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(113, 63, 18);
  const disclaimerText =
    'NOTICE: This assessment report is an experimental computational screening aid powered by client-side browser landmark ' +
    'computer-vision telemetry. It is NOT an FDA/CE cleared diagnostic device and DOES NOT establish a definitive medical diagnosis ' +
    'of Parkinson\'s Disease or related movement disorders. Web-camera measurements are sensitive to illumination, frame dropping, ' +
    'and subject positioning. Comprehensive clinical neurological consultation, formal motor staging (MDS-UPDRS), and medical history ' +
    'evaluation by a licensed physician or movement disorder specialist are strictly required.';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  doc.text(disclaimerLines, margin + 4, y + 9.5);

  // --- FOOTER ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text('NeuroVoice Research Platform • Developed with Advanced Biomechanical Kinematics & Spectral Signal Processing', margin, pageHeight - 6);
  doc.text('CONFIDENTIAL MEDICAL SCREENING TELEMETRY', pageWidth - margin, pageHeight - 6, { align: 'right' });

  // Download Trigger
  const safeName = pName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`NeuroVoice_Movement_Report_${safeName}_${Date.now()}.pdf`);
}

