import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_OPTIONS = {
  threshold: 20,        // noise level (0–255) that triggers a warning
  cooldown: 5000,       // ms before another warning can fire
  maxWarnings: 3,       // warnings before escalating to exam termination
};

export function useSoundDetection(options = {}) {
  const { threshold, cooldown, maxWarnings } = { ...DEFAULT_OPTIONS, ...options };

  const [warningCount, setWarningCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastWarningTime, setLastWarningTime] = useState(null);
  const [examTerminated, setExamTerminated] = useState(false);

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastWarnRef = useRef(0);

  const stop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsActive(true);
      setPermissionDenied(false);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;

        if (avg > threshold) {
          const now = Date.now();
          if (now - lastWarnRef.current > cooldown) {
            lastWarnRef.current = now;
            setLastWarningTime(new Date().toLocaleTimeString());
            setWarningCount((prev) => {
              const next = prev + 1;
              if (next >= maxWarnings) setExamTerminated(true);
              return next;
            });
          }
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      if (err.name === "NotAllowedError") setPermissionDenied(true);
      console.error("Microphone error:", err);
    }
  }, [threshold, cooldown, maxWarnings]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    start,
    stop,
    isActive,
    warningCount,
    maxWarnings,
    permissionDenied,
    lastWarningTime,
    examTerminated,
  };
}
