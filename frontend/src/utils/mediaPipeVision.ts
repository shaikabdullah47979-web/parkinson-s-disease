/**
 * Singleton Google MediaPipe Vision task manager for browser-local hand and pose tracking.
 * Loads WebAssembly runtime from Google CDN and caches neural network task models.
 */

import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

let handLandmarkerInstance: HandLandmarker | null = null;
let poseLandmarkerInstance: PoseLandmarker | null = null;
let isInitializingHands = false;
let isInitializingPose = false;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarkerInstance) return handLandmarkerInstance;

  if (isInitializingHands) {
    // Wait for ongoing initialization
    while (isInitializingHands) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (handLandmarkerInstance) return handLandmarkerInstance;
  }

  isInitializingHands = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    } catch (gpuErr) {
      console.warn('GPU delegate unavailable, falling back to CPU for HandLandmarker:', gpuErr);
      handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    }
    return handLandmarkerInstance;
  } finally {
    isInitializingHands = false;
  }
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;

  if (isInitializingPose) {
    while (isInitializingPose) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (poseLandmarkerInstance) return poseLandmarkerInstance;
  }

  isInitializingPose = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL_URL,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    } catch (gpuErr) {
      console.warn('GPU delegate unavailable, falling back to CPU for PoseLandmarker:', gpuErr);
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL_URL,
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    }
    return poseLandmarkerInstance;
  } finally {
    isInitializingPose = false;
  }
}

