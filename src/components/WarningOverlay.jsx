import React, { useState, useEffect, useRef } from 'react'

const AUTO_DISMISS_SECONDS = 5

export default function WarningOverlay({ violation, violationCount, onDismiss, onEnterFullscreen, isFullscreen }) {
    const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS)
    const timerRef = useRef(null)

    // Auto-dismiss countdown
    useEffect(() => {
        setCountdown(AUTO_DISMISS_SECONDS)
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    onDismiss()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [violation])

    const getWarningTitle = () => {
        switch (violation.type) {
            case 'fullscreen_exit': return 'Fullscreen Required!'
            case 'tab_switch': return 'Tab Switch Detected!'
            case 'window_blur': return 'Window Focus Lost!'
            case 'no_face': return 'Face Not Detected!'
            case 'multiple_faces': return 'Multiple Faces Detected!'
            case 'looking_away': return 'Looking Away Alert!'
            case 'face_movement': return 'Suspicious Face Movement!'
            case 'eye_movement': return 'Eye Movement Detected!'
            case 'student_left': return 'Student Left the Seat!'
            case 'high_noise': return 'High Noise Detected!'
            case 'moderate_noise': return 'Background Noise Warning!'
            default: return 'Violation Detected!'
        }
    }

    const getWarningMessage = () => {
        switch (violation.type) {
            case 'fullscreen_exit':
                return 'You have exited fullscreen mode. The exam must be taken in fullscreen. Please return to fullscreen immediately.'
            case 'tab_switch':
                return 'You switched away from the exam tab. This is not allowed during the examination. Stay on the exam page.'
            case 'window_blur':
                return 'The exam window lost focus. You may have clicked outside the browser. Keep the exam window active.'
            case 'no_face':
                return 'Your face is not visible in the camera. You must remain visible at all times during the exam.'
            case 'multiple_faces':
                return 'More than one person is detected in the camera frame. Only the exam taker must be visible. Remove any other person immediately.'
            case 'looking_away':
                return 'You appear to be looking away from the screen. Keep your face centered and eyes on the exam at all times.'
            case 'face_movement':
                return 'Excessive head movement detected. Please keep your head steady and face the screen directly.'
            case 'eye_movement':
                return 'Your eyes appear to be looking away from the screen. Keep your gaze focused on the exam.'
            case 'student_left':
                return 'No face has been detected for an extended period. You must remain seated in front of the camera throughout the exam.'
            case 'high_noise':
                return 'Unusually high background noise has been detected. Please ensure you are in a completely quiet environment.'
            case 'moderate_noise':
                return 'Background noise above acceptable levels (40%). Please reduce noise in your environment.'
            default:
                return violation.message
        }
    }

    const getWarningIcon = () => {
        switch (violation.type) {
            case 'fullscreen_exit': return '🖥️'
            case 'tab_switch': return '🔀'
            case 'window_blur': return '👁️'
            case 'no_face': return '👤'
            case 'multiple_faces': return '👥'
            case 'looking_away': return '👀'
            case 'face_movement': return '🔄'
            case 'eye_movement': return '👁️'
            case 'student_left': return '🚶'
            case 'high_noise': return '🔊'
            case 'moderate_noise': return '🔉'
            default: return '⚠️'
        }
    }

    return (
        <div className="warning-overlay">
            <div className="glass-card warning-modal">
                <div className="warning-icon">
                    {getWarningIcon()}
                </div>
                <h2>{getWarningTitle()}</h2>
                <p>{getWarningMessage()}</p>
                <div className="warning-count">
                    ⚠️ Violation {violationCount} of 5 — {5 - violationCount} remaining before termination
                </div>

                {violationCount >= 4 && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                        color: 'var(--accent-red)',
                        fontWeight: 600
                    }}>
                        🚨 CRITICAL: One more violation will terminate your exam!
                    </div>
                )}

                {/* Auto-enter fullscreen button for fullscreen violations */}
                {violation.type === 'fullscreen_exit' && !isFullscreen && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button
                            className="btn-primary"
                            onClick={() => { onEnterFullscreen(); onDismiss() }}
                            style={{ padding: '0.6rem 1.25rem' }}
                        >
                            🖥️ Return to Fullscreen
                        </button>
                    </div>
                )}

                {/* Auto-dismiss countdown bar */}
                <div className="warning-countdown">
                    <div className="warning-countdown-text">
                        Auto-dismissing in {countdown}s
                    </div>
                    <div className="warning-countdown-bar-container">
                        <div
                            className="warning-countdown-bar"
                            style={{
                                width: `${(countdown / AUTO_DISMISS_SECONDS) * 100}%`,
                                transition: 'width 1s linear'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
