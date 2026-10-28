import { useRef, useState, useEffect, useCallback } from 'react';

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraActive: boolean;
  isPermissionGranted: boolean | null;
  cameraError: string | null;
  isLoading: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setCameraError(null);

    // Stop any existing stream first
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam API is not supported by this browser. Please use Chrome, Edge, or Firefox.');
      setIsPermissionGranted(false);
      setIsLoading(false);
      return false;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (constraintErr: any) {
        console.warn('Retrying getUserMedia with basic unconstrained settings:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error on start:', playErr);
        }
      }

      setIsCameraActive(true);
      setIsPermissionGranted(true);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setIsCameraActive(false);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionGranted(false);
        setCameraError('Camera permission was denied. Please click the camera icon in your browser address bar to allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam was detected on this computer. Please connect a camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application (e.g., Zoom or Teams). Please close other apps and retry.');
      } else {
        setCameraError(`Camera initialization error: ${err.message || 'Unknown error'}`);
      }
      return false;
    }
  }, [stopCamera]);

  // Synchronize stream with video element whenever isCameraActive or stream changes
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Video play error on synchronization effect:', err);
      });
    }
  }, [isCameraActive]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isCameraActive,
    isPermissionGranted,
    cameraError,
    isLoading,
    startCamera,
    stopCamera
  };
}

