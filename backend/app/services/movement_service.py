import logging
import numpy as np
from scipy import signal
from scipy.interpolate import interp1d
from typing import Dict, Any, List, Tuple

from backend.app.schemas.movement import (
    TremorAnalysisRequest, TremorAnalysisResponse, SpectralPoint, MotionPoint,
    TappingAnalysisRequest, TappingAnalysisResponse, TapEvent,
    ArmAnalysisRequest, ArmAnalysisResponse,
    WalkingAnalysisRequest, WalkingAnalysisResponse
)

logger = logging.getLogger(__name__)

class MovementService:
    @staticmethod
    def analyze_hand_tremor(req: TremorAnalysisRequest) -> TremorAnalysisResponse:
        n_raw = len(req.timestamps_ms)
        delivered_frames = req.total_delivered_frames or n_raw
        
        # Insufficient data gate
        if n_raw < 20 or len(req.x_coords) < 20 or len(req.y_coords) < 20:
            return TremorAnalysisResponse(
                status="Insufficient Data",
                effective_fps=0.0,
                delivered_frames=delivered_frames,
                tracked_frames=n_raw,
                tracking_continuity_pct=round((n_raw / max(1, delivered_frames)) * 100, 1),
                duration_seconds=req.duration_seconds or 0.0,
                mean_amplitude_displacement=0.0,
                signal_quality="Poor",
                plain_english_title="Insufficient Tracking Data",
                plain_english_explanation="The camera did not capture enough hand movement frames to perform a reliable analysis.",
                recommended_action="Ensure your hand is held steadily inside the camera outline and that your room is well-lit, then try again."
            )

        # 1. Clean timestamps and coordinates (remove duplicates and strictly enforce monotonicity)
        times_raw = np.array(req.timestamps_ms, dtype=np.float64)
        xs_raw = np.array(req.x_coords, dtype=np.float64)
        ys_raw = np.array(req.y_coords, dtype=np.float64)

        # Sort by timestamp
        sort_idx = np.argsort(times_raw)
        times_raw = times_raw[sort_idx]
        xs_raw = xs_raw[sort_idx]
        ys_raw = ys_raw[sort_idx]

        # Deduplicate timestamps
        unique_mask = np.diff(times_raw, prepend=times_raw[0] - 1.0) > 0.001
        times_clean = times_raw[unique_mask]
        xs_clean = xs_raw[unique_mask]
        ys_clean = ys_raw[unique_mask]

        n_clean = len(times_clean)
        if n_clean < 20:
            return TremorAnalysisResponse(
                status="Insufficient Data",
                effective_fps=0.0,
                delivered_frames=delivered_frames,
                tracked_frames=n_clean,
                tracking_continuity_pct=round((n_clean / max(1, delivered_frames)) * 100, 1),
                duration_seconds=req.duration_seconds or 0.0,
                mean_amplitude_displacement=0.0,
                signal_quality="Poor",
                plain_english_title="Insufficient Unique Frame Timestamps",
                plain_english_explanation="Recorded frames had duplicate timestamps, indicating camera hardware frame drops.",
                recommended_action="Close background camera apps (like Zoom or Teams) and repeat the test."
            )

        # Time range in seconds
        t_start = times_clean[0]
        t_elapsed = (times_clean - t_start) / 1000.0  # seconds
        total_sec = float(t_elapsed[-1])

        if total_sec < 2.0:
            return TremorAnalysisResponse(
                status="Insufficient Data",
                effective_fps=round(n_clean / max(0.1, total_sec), 1),
                delivered_frames=delivered_frames,
                tracked_frames=n_clean,
                tracking_continuity_pct=round((n_clean / max(1, delivered_frames)) * 100, 1),
                duration_seconds=round(total_sec, 1),
                mean_amplitude_displacement=0.0,
                signal_quality="Poor",
                plain_english_title="Recording Duration Too Brief",
                plain_english_explanation="Recording was shorter than 2 seconds, which is insufficient to evaluate oscillatory rhythm.",
                recommended_action="Hold your hand still for the full 30-second duration."
            )

        effective_fps = n_clean / total_sec

        # 2. Resample onto a regular uniform time grid
        # Choose target sampling rate: clamp between 20 Hz and 60 Hz based on observed FPS
        target_fs = max(20.0, min(60.0, effective_fps))
        uniform_t = np.arange(0.0, total_sec, 1.0 / target_fs)
        
        if len(uniform_t) < 32:
            target_fs = 30.0
            uniform_t = np.linspace(0.0, total_sec, max(32, int(total_sec * target_fs)))

        # Linear interpolation for resampling
        interp_x = interp1d(t_elapsed, xs_clean, kind='linear', fill_value="extrapolate")
        interp_y = interp1d(t_elapsed, ys_clean, kind='linear', fill_value="extrapolate")
        x_uniform = interp_x(uniform_t)
        y_uniform = interp_y(uniform_t)

        # 3. High-pass filter to separate voluntary slow drift (< 1.5 Hz) from tremor (3 - 12 Hz)
        # Apply 2nd-order Butterworth zero-phase highpass
        nyquist = 0.5 * target_fs
        cutoff_hz = min(1.5, nyquist * 0.4)
        
        b, a = signal.butter(2, cutoff_hz / nyquist, btype='highpass')
        x_filt = signal.filtfilt(b, a, x_uniform)
        y_filt = signal.filtfilt(b, a, y_uniform)

        # Project 2D coordinates onto principal displacement axis to isolate dominant vibration direction
        cov = np.cov(np.vstack([x_filt, y_filt]))
        eigvals, eigvecs = np.linalg.eigh(cov)
        principal_vec = eigvecs[:, -1]
        motion_1d = x_filt * principal_vec[0] + y_filt * principal_vec[1]

        # Mean displacement amplitude (scale to milli-units for intuitive viewing)
        mean_disp = float(np.mean(np.abs(motion_1d)) * 1000.0)

        # 4. Welch's Power Spectral Density (PSD)
        # Choose nperseg to balance frequency resolution and variance reduction
        nperseg = min(len(motion_1d), max(32, int(target_fs * 4.0)))
        freqs, psd = signal.welch(
            motion_1d,
            fs=target_fs,
            window='hann',
            nperseg=nperseg,
            noverlap=nperseg // 2,
            scaling='density'
        )

        # Restrict spectral evaluation to clinical tremor interest band: 2.5 Hz to 12.0 Hz
        band_mask = (freqs >= 2.5) & (freqs <= min(12.0, nyquist * 0.95))
        band_freqs = freqs[band_mask]
        band_psd = psd[band_mask]

        dominant_freq: Optional[float] = None
        dominant_cpm: Optional[float] = None
        peak_prominence: Optional[float] = None
        snr_db: Optional[float] = None
        status = "No Reliable Dominant Frequency Detected"
        signal_quality = "Good" if effective_fps >= 20.0 else "Moderate"

        if len(band_psd) > 2:
            peak_indices, properties = signal.find_peaks(band_psd, prominence=np.max(band_psd) * 0.15)
            
            if len(peak_indices) > 0:
                # Find the peak with highest prominence
                prominences = properties.get('prominences', np.zeros(len(peak_indices)))
                best_idx = peak_indices[np.argmax(prominences)]
                cand_freq = float(band_freqs[best_idx])
                cand_prom = float(prominences[np.argmax(prominences)])
                
                # Signal-to-noise ratio in band
                mean_noise = np.median(band_psd) + 1e-12
                peak_power = band_psd[best_idx]
                snr_ratio = peak_power / mean_noise
                snr_val = float(10.0 * np.log10(max(1.0, snr_ratio)))

                # Check Autocorrelation at candidate period
                cand_period_sec = 1.0 / cand_freq
                cand_lag_samples = int(round(cand_period_sec * target_fs))
                
                # Autocorrelation
                norm_motion = motion_1d - np.mean(motion_1d)
                autocorr = signal.correlate(norm_motion, norm_motion, mode='full')
                autocorr = autocorr[len(norm_motion)-1:]
                autocorr = autocorr / (autocorr[0] + 1e-12)
                
                corr_peak_val = 0.0
                if 0 < cand_lag_samples < len(autocorr):
                    # Check local window around expected lag
                    w_start = max(1, cand_lag_samples - 2)
                    w_end = min(len(autocorr), cand_lag_samples + 3)
                    corr_peak_val = float(np.max(autocorr[w_start:w_end]))

                peak_prominence = round(cand_prom, 4)
                snr_db = round(snr_val, 1)

                # Relative power concentration around peak (+- 0.6 Hz)
                near_peak_mask = np.abs(band_freqs - cand_freq) <= 0.6
                near_peak_power = float(np.sum(band_psd[near_peak_mask]))
                total_band_power = float(np.sum(band_psd)) + 1e-12
                power_concentration = near_peak_power / total_band_power

                # Classify reliability (requires both spectral concentration and autocorrelation verification)
                if snr_val >= 6.0 and corr_peak_val >= 0.25 and power_concentration >= 0.22 and effective_fps >= 15.0:
                    status = "Reliable Estimate"
                    dominant_freq = round(cand_freq, 1)
                    dominant_cpm = round(cand_freq * 60.0, 1)
                elif snr_val >= 4.0 and corr_peak_val >= 0.20 and power_concentration >= 0.18:
                    status = "Preliminary Estimate"
                    dominant_freq = round(cand_freq, 1)
                    dominant_cpm = round(cand_freq * 60.0, 1)
                else:
                    status = "No Reliable Dominant Frequency Detected"
                    dominant_freq = None
                    dominant_cpm = None

        # Prepare spectral chart points (up to 15 Hz)
        psd_points: List[SpectralPoint] = []
        max_chart_freq = min(15.0, nyquist)
        for f, p in zip(freqs, psd):
            if f <= max_chart_freq:
                psd_points.append(SpectralPoint(freq_hz=round(float(f), 2), power=round(float(p * 1e5), 3)))

        # Downsample time-series for chart (keep ~150 points max for snappy rendering)
        step = max(1, len(uniform_t) // 150)
        time_points: List[MotionPoint] = []
        for i in range(0, len(uniform_t), step):
            time_points.append(MotionPoint(
                time_sec=round(float(uniform_t[i]), 2),
                displacement=round(float(motion_1d[i] * 1000.0), 2)
            ))

        # Plain-English Titles, Explanations, and Recommendations
        continuity_pct = round((n_clean / max(1, delivered_frames)) * 100.0, 1)
        if status == "Reliable Estimate":
            pe_title = f"Periodic Oscillation Detected: {dominant_freq} Hz"
            pe_exp = f"A consistent, measurable movement oscillation was detected at {dominant_freq} Hz ({dominant_cpm} cycles/min) with high signal confidence."
            pe_act = "Maintain this hand position for future tests to track stability over time."
        elif status == "Preliminary Estimate":
            pe_title = f"Mild / Transient Oscillation: {dominant_freq} Hz"
            pe_exp = f"An intermittent movement rhythm was observed around {dominant_freq} Hz, but signal amplitude was low or varied during recording."
            pe_act = "Try resting your elbow on a table while holding your hand still to improve stability."
        else:
            pe_title = "No Prominent Oscillation Detected"
            pe_exp = "Hand movement was steady or characterized by minor irregular drift rather than a continuous periodic rhythm."
            pe_act = "Your hand appeared steady during this recording. Ensure good lighting and repeat if you wish to verify."

        tech_details = {
            "target_fs_hz": round(target_fs, 1),
            "nyquist_limit_hz": round(nyquist, 1),
            "spectral_window": f"Hann ({nperseg} samples)",
            "butterworth_highpass_hz": round(cutoff_hz, 2),
            "principal_axis_weight": [round(float(principal_vec[0]), 3), round(float(principal_vec[1]), 3)],
            "raw_frames_received": delivered_frames,
            "processed_frames": n_clean
        }

        return TremorAnalysisResponse(
            status=status,
            dominant_frequency_hz=dominant_freq,
            dominant_cycles_per_min=dominant_cpm,
            spectral_peak_prominence=peak_prominence,
            snr_db=snr_db,
            effective_fps=round(effective_fps, 1),
            delivered_frames=delivered_frames,
            tracked_frames=n_clean,
            tracking_continuity_pct=continuity_pct,
            duration_seconds=round(total_sec, 1),
            mean_amplitude_displacement=round(mean_disp, 2),
            psd_spectrum=psd_points,
            time_series=time_points,
            signal_quality=signal_quality,
            plain_english_title=pe_title,
            plain_english_explanation=pe_exp,
            recommended_action=pe_act,
            technical_details=tech_details
        )

    @staticmethod
    def analyze_finger_tapping(req: TappingAnalysisRequest) -> TappingAnalysisResponse:
        n_raw = len(req.timestamps_ms)
        delivered_frames = req.total_delivered_frames or n_raw
        
        if n_raw < 15 or len(req.distances) < 15:
            return TappingAnalysisResponse(
                status="Insufficient Data",
                total_taps=0,
                validated_taps=0,
                taps_per_minute=0.0,
                taps_per_second=0.0,
                mean_iti_ms=0.0,
                iti_std_ms=0.0,
                rhythm_cv_pct=0.0,
                amplitude_fatigue_ratio=1.0,
                amplitude_fatigue_pct=0.0,
                tracking_continuity_pct=0.0,
                duration_seconds=req.duration_seconds or 0.0,
                signal_quality="Poor",
                plain_english_title="Insufficient Finger Tracking Data",
                plain_english_explanation="The camera did not capture enough frames with finger landmarks clearly visible (minimum 15 frames required).",
                recommended_action="Ensure your hand is facing the camera with your thumb and index fingers spread."
            )

        times_ms = np.array(req.timestamps_ms, dtype=np.float64)
        dists = np.array(req.distances, dtype=np.float64)
        
        total_sec = max(0.5, (times_ms[-1] - times_ms[0]) / 1000.0)
        eval_sec = max(total_sec, float(req.duration_seconds or total_sec))

        # Dynamic Threshold Calibration with jitter guards
        # For a genuine tapping motion, distance moves between close (~0.25) and open (~0.70+).
        p10 = float(np.percentile(dists, 10))
        p90 = float(np.percentile(dists, 90))
        spread = p90 - p10

        if spread >= 0.20:
            # Active movement detected: adapt thresholds to user's range
            close_thresh = float(np.clip(p10 + 0.30 * spread, 0.20, 0.38))
            open_thresh = float(np.clip(p10 + 0.65 * spread, close_thresh + 0.12, 0.75))
            min_excursion = max(0.12, 0.25 * spread)
        else:
            # Low range / stationary hand: use standard fixed clinical boundaries
            close_thresh = 0.30
            open_thresh = 0.48
            min_excursion = 0.15

        is_closed = False
        tap_times: List[float] = []
        tap_amps: List[float] = []
        cycle_max_dist = dists[0]

        for i in range(len(dists)):
            d = dists[i]
            t = times_ms[i]

            if d > cycle_max_dist:
                cycle_max_dist = d

            if not is_closed:
                # Transition into tap closure: distance must drop below close_thresh,
                # AND there must have been sufficient excursion (opening) prior to tap,
                # AND refractory period of at least 100ms from last tap
                if d <= close_thresh and (cycle_max_dist - d) >= min_excursion:
                    if len(tap_times) == 0 or (t - tap_times[-1]) >= 100.0:
                        is_closed = True
                        tap_times.append(t)
                        tap_amps.append(float(cycle_max_dist))
                        cycle_max_dist = d
            else:
                # Hand is closed; wait until fingers open past open_thresh to arm next tap
                if d >= open_thresh:
                    is_closed = False
                    cycle_max_dist = d

        total_taps = len(tap_times)
        validated_taps = total_taps

        # Tap events & inter-tap interval calculation
        tap_events: List[TapEvent] = []
        itis: List[float] = []
        for i in range(total_taps):
            t_sec = round((tap_times[i] - times_ms[0]) / 1000.0, 2)
            if i == 0:
                interval = 0.0
            else:
                interval = round(tap_times[i] - tap_times[i - 1], 1)
                itis.append(interval)

            tap_events.append(TapEvent(
                time_sec=t_sec,
                interval_ms=interval,
                amplitude=round(tap_amps[i], 3)
            ))

        mean_iti = float(np.mean(itis)) if len(itis) > 0 else 0.0
        # Use sample standard deviation (ddof=1) when >= 2 intervals, else 0.0
        std_iti = float(np.std(itis, ddof=1)) if len(itis) >= 2 else 0.0
        cv_pct = float((std_iti / mean_iti) * 100.0) if mean_iti > 0.0 and len(itis) >= 2 else 0.0

        # Cadence calculation based on active recording duration
        tps = float(total_taps / eval_sec) if eval_sec > 0 else 0.0
        tpm = float(tps * 60.0)

        # Amplitude fatigue calculation (first 3 vs last 3 taps)
        fatigue_ratio = 1.0
        fatigue_pct = 0.0
        if len(tap_amps) >= 6:
            initial_mean = float(np.mean(tap_amps[:3]))
            final_mean = float(np.mean(tap_amps[-3:]))
            if initial_mean > 0.01:
                fatigue_ratio = round(final_mean / initial_mean, 2)
                fatigue_pct = round((1.0 - fatigue_ratio) * 100.0, 1)

        # Distance series downsampled for telemetry charts
        dist_points: List[MotionPoint] = []
        step = max(1, len(times_ms) // 150)
        for i in range(0, len(times_ms), step):
            dist_points.append(MotionPoint(
                time_sec=round((times_ms[i] - times_ms[0]) / 1000.0, 2),
                displacement=round(float(dists[i]), 3)
            ))

        continuity = round((n_raw / max(1, delivered_frames)) * 100.0, 1)

        if total_taps < 5:
            status = "Inconclusive"
            sig_qual = "Poor" if continuity < 60.0 else "Moderate"
            pe_title = f"{total_taps} Taps Recorded (Inconclusive)"
            pe_exp = f"Only {total_taps} distinct finger tap cycles were detected over {round(eval_sec, 1)}s. At least 5 continuous taps are required for reliable cadence and rhythm assessment."
            pe_act = "Spread your fingers wide between taps and tap steadily facing the camera."
        else:
            status = "Completed"
            sig_qual = "Good" if continuity >= 75.0 else "Moderate"
            pe_title = f"{total_taps} Validated Taps ({round(tpm, 1)} Taps/Min · {round(tps, 1)} Taps/s)"
            fatigue_desc = (
                f"{abs(fatigue_pct)}% amplitude reduction (decrement)" if fatigue_pct > 0
                else f"stable amplitude ({fatigue_ratio}x initial)"
            )
            pe_exp = f"Tapping cadence was {round(tps, 1)} taps/s ({round(tpm, 1)} taps/min) with a rhythm variation (CV) of {round(cv_pct, 1)}% and {fatigue_desc}."
            pe_act = "Maintain a steady, rhythmic cadence for the best measurement consistency."

        return TappingAnalysisResponse(
            status=status,
            total_taps=total_taps,
            validated_taps=validated_taps,
            taps_per_minute=round(tpm, 1),
            taps_per_second=round(tps, 2),
            mean_iti_ms=round(mean_iti, 1),
            iti_std_ms=round(std_iti, 1),
            rhythm_cv_pct=round(cv_pct, 1),
            amplitude_fatigue_ratio=fatigue_ratio,
            amplitude_fatigue_pct=fatigue_pct,
            tracking_continuity_pct=continuity,
            duration_seconds=round(eval_sec, 1),
            tap_events=tap_events,
            distance_series=dist_points,
            signal_quality=sig_qual,
            plain_english_title=pe_title,
            plain_english_explanation=pe_exp,
            recommended_action=pe_act,
            technical_details={
                "close_threshold": round(close_thresh, 3),
                "open_threshold": round(open_thresh, 3),
                "min_excursion": round(min_excursion, 3),
                "taps_per_second": round(tps, 2),
                "evaluated_seconds": round(eval_sec, 1)
            }
        )

    @staticmethod
    def analyze_arm_movement(req: ArmAnalysisRequest) -> ArmAnalysisResponse:
        n_raw = len(req.timestamps_ms)
        delivered_frames = req.total_delivered_frames or n_raw
        
        if n_raw < 15 or len(req.angles_deg) < 15:
            return ArmAnalysisResponse(
                status="Insufficient Data",
                min_elbow_angle_deg=0.0,
                max_elbow_angle_deg=0.0,
                excursion_range_deg=0.0,
                mean_angular_velocity_deg_per_sec=0.0,
                peak_angular_velocity_deg_per_sec=0.0,
                smoothness_score=0.0,
                repetition_count=0,
                tracking_continuity_pct=0.0,
                duration_seconds=req.duration_seconds or 0.0,
                signal_quality="Poor",
                plain_english_title="Insufficient Arm Tracking",
                plain_english_explanation="Shoulder, elbow, and wrist joints were not consistently visible in the camera frame.",
                recommended_action="Step back so your full upper body is visible to the camera."
            )

        times_ms = np.array(req.timestamps_ms, dtype=np.float64)
        angles = np.array(req.angles_deg, dtype=np.float64)
        total_sec = max(0.1, (times_ms[-1] - times_ms[0]) / 1000.0)

        # 1. Zero-phase Butterworth low-pass filter (3rd-order, fc=4.0 Hz) to discard camera sub-pixel noise
        eff_fs = max(10.0, len(times_ms) / total_sec)
        nyq = 0.5 * eff_fs
        cutoff = min(4.0, nyq * 0.75)
        
        if len(angles) >= 12:
            b, a = signal.butter(3, cutoff / nyq, btype='lowpass')
            filtered_angles = signal.filtfilt(b, a, angles)
        else:
            filtered_angles = signal.medfilt(angles, kernel_size=3) if len(angles) >= 3 else angles

        min_a = float(np.min(filtered_angles))
        max_a = float(np.max(filtered_angles))
        excursion = max_a - min_a

        # 2. Angular speed profile v(t) = |dtheta/dt|
        dt_sec = np.diff(times_ms) / 1000.0
        dt_sec = np.where(dt_sec <= 0.001, 1.0 / eff_fs, dt_sec)
        velocities = np.abs(np.diff(filtered_angles)) / dt_sec

        mean_vel = float(np.mean(velocities)) if len(velocities) > 0 else 0.0
        peak_vel = float(np.max(velocities)) if len(velocities) > 0 else 0.0

        # Repetition counting (extrema cycles)
        dist_samples = max(4, int(eff_fs * 0.8))
        peaks, _ = signal.find_peaks(filtered_angles, distance=dist_samples, prominence=max(5.0, excursion * 0.25))
        troughs, _ = signal.find_peaks(-filtered_angles, distance=dist_samples, prominence=max(5.0, excursion * 0.25))
        reps = max(len(peaks), len(troughs))

        # 3. Biomechanical Smoothness via Spectral Arc Length (SPARC)
        n_spd = len(velocities)
        n_fft = 2 ** int(np.ceil(np.log2(max(128, n_spd * 4))))
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / eff_fs)
        V = np.abs(np.fft.rfft(velocities, n=n_fft))
        V_max = float(np.max(V))

        if V_max > 1e-12:
            V_norm = V / V_max
            fc_max = min(10.0, nyq * 0.95)
            # Find highest frequency <= fc_max where normalized spectrum is above 0.05
            candidates = np.where((freqs <= fc_max) & (V_norm >= 0.05))[0]
            fc_idx = candidates[-1] + 1 if len(candidates) > 0 else np.where(freqs <= fc_max)[0][-1]
            fc_idx = max(4, min(len(freqs), fc_idx))

            freqs_cut = freqs[:fc_idx]
            V_cut = V_norm[:fc_idx]
            f_scaled = freqs_cut / (freqs_cut[-1] + 1e-12)

            df = np.diff(f_scaled)
            dV = np.diff(V_cut)
            sparc_val = float(-np.sum(np.sqrt(df**2 + dV**2)))
        else:
            sparc_val = -1.5

        # Calibrated SPARC mapping:
        # Smooth continuous rhythmic motion has SPARC between -3.0 and -3.8 (score 88-98)
        # Moderate hesitations: -4.0 to -5.5 (score 70-88)
        # Jerky / fragmented movement: <= -6.0 (score < 65)
        val = abs(sparc_val)
        if val <= 3.8:
            smoothness = 98.0 - (val / 3.8) * 8.0
        elif val <= 5.5:
            smoothness = 90.0 - ((val - 3.8) / 1.7) * 20.0
        elif val <= 8.0:
            smoothness = 70.0 - ((val - 5.5) / 2.5) * 30.0
        else:
            smoothness = max(20.0, 40.0 - ((val - 8.0) / 4.0) * 20.0)
        smoothness = round(smoothness, 1)

        # 4. Dimensionless Jerk for technical validation
        dt_mean = 1.0 / max(5.0, eff_fs)
        accel = np.gradient(velocities, dt_mean)
        jerk = np.gradient(accel, dt_mean)
        integrated_jerk_sq = float(np.sum(jerk**2 * dt_mean))
        dim_jerk = (total_sec**3 / max(1.0, peak_vel**2)) * integrated_jerk_sq
        ldlj = round(float(-np.log(max(1.0, dim_jerk))), 2)

        angle_points: List[MotionPoint] = []
        step = max(1, len(times_ms) // 150)
        for i in range(0, len(times_ms), step):
            angle_points.append(MotionPoint(
                time_sec=round((times_ms[i] - times_ms[0]) / 1000.0, 2),
                displacement=round(float(filtered_angles[i]), 1)
            ))

        if excursion < 15.0 or reps == 0:
            pe_title = "Minimal Arm Movement Detected" if excursion < 15.0 else f"{round(excursion, 1)}° Range of Motion ({reps} Repetitions)"
            pe_exp = "The arm remained mostly stationary with little observable elbow flexion or extension during recording." if excursion < 15.0 else f"Elbow angle moved through {round(excursion, 1)}° with limited cyclical repetitions."
            pe_act = "Please perform full, rhythmic bending and extending of the elbow for the full 20 seconds."
        else:
            pe_title = f"{round(excursion, 1)}° Range of Motion ({reps} Repetitions)"
            pe_exp = f"Elbow angle moved smoothly from {round(min_a, 1)}° to {round(max_a, 1)}° at an average rotational velocity of {round(mean_vel, 1)}°/s."
            pe_act = "Maintain comfortable, steady motion without overextending."

        return ArmAnalysisResponse(
            status="Completed" if excursion >= 15.0 else "Limited Excursion",
            min_elbow_angle_deg=round(min_a, 1),
            max_elbow_angle_deg=round(max_a, 1),
            excursion_range_deg=round(excursion, 1),
            mean_angular_velocity_deg_per_sec=round(mean_vel, 1),
            peak_angular_velocity_deg_per_sec=round(peak_vel, 1),
            smoothness_score=smoothness,
            repetition_count=reps,
            tracking_continuity_pct=round((n_raw / max(1, delivered_frames)) * 100.0, 1),
            duration_seconds=round(total_sec, 1),
            angle_series=angle_points,
            signal_quality="Good" if reps >= 2 else "Moderate",
            plain_english_title=pe_title,
            plain_english_explanation=pe_exp,
            recommended_action=pe_act,
            technical_details={
                "sparc_spectral_arc_length": round(sparc_val, 3),
                "log_dimensionless_jerk": ldlj,
                "butterworth_cutoff_hz": round(cutoff, 1)
            }
        )

    @staticmethod
    def analyze_walking(req: WalkingAnalysisRequest) -> WalkingAnalysisResponse:
        n_raw = len(req.timestamps_ms)
        delivered_frames = req.total_delivered_frames or n_raw
        
        if n_raw < 15 or len(req.trunk_angles_deg) < 15:
            return WalkingAnalysisResponse(
                status="Insufficient Data",
                step_count=0,
                cadence_steps_per_min=0.0,
                step_symmetry_pct=0.0,
                mean_trunk_lean_deg=0.0,
                posture_stability_score=0.0,
                tracking_continuity_pct=0.0,
                duration_seconds=req.duration_seconds or 0.0,
                signal_quality="Poor",
                plain_english_title="Insufficient Full-Body Tracking",
                plain_english_explanation="Full body was not visible from shoulders down to feet.",
                recommended_action="Ensure the camera is placed 6 to 8 feet away in a well-lit, unobstructed room."
            )

        times_ms = np.array(req.timestamps_ms, dtype=np.float64)
        trunk_angles = np.array(req.trunk_angles_deg, dtype=np.float64)
        l_ankle = np.array(req.left_ankle_y, dtype=np.float64)
        r_ankle = np.array(req.right_ankle_y, dtype=np.float64)
        total_sec = max(0.1, (times_ms[-1] - times_ms[0]) / 1000.0)

        mean_lean = float(np.mean(trunk_angles))
        lean_var = float(np.var(trunk_angles))
        stability_score = max(20.0, min(100.0, round(100.0 - min(80.0, lean_var * 4.0), 1)))

        # Step detection on vertical ankle excursions
        l_peaks, _ = signal.find_peaks(-l_ankle, distance=8, prominence=0.02)
        r_peaks, _ = signal.find_peaks(-r_ankle, distance=8, prominence=0.02)
        total_steps = len(l_peaks) + len(r_peaks)

        cadence = (total_steps / total_sec) * 60.0

        # Step symmetry: compare left vs right step counts and intervals
        if len(l_peaks) > 0 and len(r_peaks) > 0:
            diff = abs(len(l_peaks) - len(r_peaks))
            total_lr = len(l_peaks) + len(r_peaks)
            symmetry_pct = max(0.0, min(100.0, round(100.0 - (diff / total_lr) * 100.0, 1)))
        else:
            symmetry_pct = 75.0

        lean_points: List[MotionPoint] = []
        step = max(1, len(times_ms) // 150)
        for i in range(0, len(times_ms), step):
            lean_points.append(MotionPoint(
                time_sec=round((times_ms[i] - times_ms[0]) / 1000.0, 2),
                displacement=round(float(trunk_angles[i]), 1)
            ))

        pe_title = f"{total_steps} Steps Measured (Cadence: {round(cadence, 1)} Steps/Min)"
        pe_exp = f"Average postural trunk lean was {round(mean_lean, 1)}° with {symmetry_pct}% stepping symmetry."
        pe_act = "Maintain a steady pace in clear, safe surroundings."

        return WalkingAnalysisResponse(
            status="Completed" if total_steps >= 4 else "Inconclusive",
            step_count=total_steps,
            cadence_steps_per_min=round(cadence, 1),
            step_symmetry_pct=symmetry_pct,
            mean_trunk_lean_deg=round(mean_lean, 1),
            posture_stability_score=stability_score,
            tracking_continuity_pct=round((n_raw / max(1, delivered_frames)) * 100.0, 1),
            duration_seconds=round(total_sec, 1),
            lean_series=lean_points,
            signal_quality="Good" if total_steps >= 6 else "Moderate",
            plain_english_title=pe_title,
            plain_english_explanation=pe_exp,
            recommended_action=pe_act,
            technical_details={"left_steps": len(l_peaks), "right_steps": len(r_peaks)}
        )

movement_service = MovementService()
