import { useEffect } from "react";
import { useSoundDetection } from "./useSoundDetection";

// ── paste your own styles or use Tailwind / CSS modules ──────────────────────
const styles = {
  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 20px",
    fontFamily: "sans-serif",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
    animation: "slideDown 0.3s ease",
  },
  warning: { background: "#e67e22" },   // orange  — early warnings
  danger:  { background: "#c0392b" },   // red     — near limit
  icon:    { fontSize: "20px" },
  count:   { marginLeft: "auto", opacity: 0.85, fontWeight: 400, fontSize: "13px" },
  terminated: {
    position: "fixed", inset: 0, zIndex: 99999,
    background: "rgba(0,0,0,0.85)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: "#fff", textAlign: "center", padding: "40px",
  },
};

/**
 * Drop this component anywhere inside your exam page.
 * It self-starts the microphone check and shows banners automatically.
 *
 * Props:
 *   threshold   – noise level 0-255 that fires a warning  (default 20)
 *   cooldown    – ms between warnings                     (default 5000)
 *   maxWarnings – warnings before exam is terminated      (default 3)
 *   onTerminate – callback when exam is force-ended
 */
export default function SoundWarningBanner({
  threshold = 20,
  cooldown = 5000,
  maxWarnings = 3,
  onTerminate,
}) {
  const {
    start,
    isActive,
    warningCount,
    permissionDenied,
    lastWarningTime,
    examTerminated,
  } = useSoundDetection({ threshold, cooldown, maxWarnings });

  // Auto-start when component mounts
  useEffect(() => {
    start();
  }, [start]);

  // Fire onTerminate callback
  useEffect(() => {
    if (examTerminated && onTerminate) onTerminate();
  }, [examTerminated, onTerminate]);

  // ── Exam terminated overlay ───────────────────────────────────────────────
  if (examTerminated) {
    return (
      <div style={styles.terminated}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🚫</div>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Exam Terminated</h2>
        <p style={{ opacity: 0.75, maxWidth: "420px" }}>
          Your exam has been ended due to repeated sound / voice activity
          detected during the session. Please contact your invigilator.
        </p>
      </div>
    );
  }

  // ── Microphone permission denied ──────────────────────────────────────────
  if (permissionDenied) {
    return (
      <div style={{ ...styles.banner, ...styles.danger }}>
        <span style={styles.icon}>🎙️</span>
        Microphone access is required to take this exam. Please allow access and reload.
      </div>
    );
  }

  // ── Active warning banner ─────────────────────────────────────────────────
  const isNearLimit = warningCount >= maxWarnings - 1;
  if (warningCount > 0) {
    return (
      <div style={{ ...styles.banner, ...(isNearLimit ? styles.danger : styles.warning) }}>
        <span style={styles.icon}>{isNearLimit ? "🔴" : "⚠️"}</span>
        <span>
          {isNearLimit
            ? `Final warning! Next violation will terminate your exam.`
            : `Warning ${warningCount}/${maxWarnings}: Voice / sound detected. Please stay silent.`}
          {lastWarningTime && (
            <span style={{ fontWeight: 400, marginLeft: "8px", opacity: 0.75 }}>
              ({lastWarningTime})
            </span>
          )}
        </span>
        <span style={styles.count}>
          {isActive ? "🎙 Monitoring" : "⏸ Paused"}
        </span>
      </div>
    );
  }

  return null; // no banner when all is quiet
}
