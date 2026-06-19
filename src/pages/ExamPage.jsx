import React, { useState, useEffect, useRef, useCallback } from 'react'
import { examQuestions } from '../data/questions'
import { useFullscreen } from '../hooks/useFullscreen'
import { useTabSwitch } from '../hooks/useTabSwitch'
import { useNoiseDetection } from '../hooks/useNoiseDetection'
import { useFaceDetection } from '../hooks/useFaceDetection'
import WarningOverlay from '../components/WarningOverlay'

export default function ExamPage({ violations, addViolation, mediaStream }) {
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes
    const [showWarning, setShowWarning] = useState(null)
    const [isProctoring, setIsProctoring] = useState(false)
    const videoRef = useRef(null)
    const prevViolationCountRef = useRef(violations.length)

    // Initialize proctoring hooks
    const { isFullscreen, enterFullscreen } = useFullscreen(addViolation, isProctoring)
    useTabSwitch(addViolation, isProctoring)
    const { noiseLevel, noiseStatus } = useNoiseDetection(mediaStream, addViolation, isProctoring)
    const { faceCount, faceStatus, headDirection, eyeGaze } = useFaceDetection(videoRef, addViolation, isProctoring)

    // Setup video and enter fullscreen on mount
    useEffect(() => {
        const setupCamera = async () => {
            if (mediaStream && videoRef.current) {
                videoRef.current.srcObject = mediaStream
            } else if (videoRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    videoRef.current.srcObject = stream
                } catch (err) {
                    console.error('Camera access error in exam:', err)
                }
            }
        }
        setupCamera()

        const timer = setTimeout(async () => {
            await enterFullscreen()
            setIsProctoring(true)
        }, 1000)

        return () => clearTimeout(timer)
    }, [mediaStream, enterFullscreen])

    // Timer countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    // Show warning when new violation detected
    useEffect(() => {
        if (violations.length > prevViolationCountRef.current) {
            const latest = violations[violations.length - 1]
            setShowWarning(latest)
            prevViolationCountRef.current = violations.length
        }
    }, [violations])

    const handleAnswer = useCallback((questionId, optionIndex) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
    }, [])

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const getViolationLevel = () => {
        if (violations.length === 0) return 'safe'
        if (violations.length <= 2) return 'safe'
        if (violations.length <= 4) return 'warning'
        return 'danger'
    }

    const getFaceStatusText = () => {
        switch (faceStatus) {
            case 'initializing': return 'Loading AI...'
            case 'ok': return '1 Face ✓'
            case 'no_face': return '⚠ No Face'
            case 'multiple_faces': return `⚠ ${faceCount} Faces`
            case 'looking_away': return '⚠ Looking Away'
            case 'face_moving': return '⚠ Moving'
            case 'student_left': return '⚠ Left Seat'
            default: return 'Unknown'
        }
    }

    const getFaceStatusColor = () => {
        switch (faceStatus) {
            case 'ok': return 'ok'
            case 'initializing': return 'warn'
            default: return 'error'
        }
    }

    const getFaceMonitorDot = () => {
        switch (faceStatus) {
            case 'ok': return 'green'
            case 'initializing': return 'amber'
            default: return 'red'
        }
    }

    const getHeadDirDisplay = () => {
        if (headDirection === 'center') return '↑ Center'
        if (headDirection === 'left') return '← Left'
        if (headDirection === 'right') return '→ Right'
        if (headDirection === 'up') return '↑ Up'
        if (headDirection === 'down') return '↓ Down'
        return '—'
    }

    const getEyeGazeDisplay = () => {
        if (eyeGaze === 'forward') return '👁 Forward'
        if (eyeGaze === 'left') return '👁 Left'
        if (eyeGaze === 'right') return '👁 Right'
        if (eyeGaze === 'up') return '👁 Up'
        if (eyeGaze === 'down') return '👁 Down'
        return '—'
    }

    const getNoiseStatusDisplay = () => {
        if (noiseStatus === 'low') return 'Clear'
        if (noiseStatus === 'medium') return '⚠ >40%'
        return '⚠ Loud'
    }

    const question = examQuestions[currentQuestion]
    const letters = ['A', 'B', 'C', 'D']

    return (
        <div className="exam-page">
            {/* --- HEADER --- */}
            <div className="exam-header">
                <div className="exam-header-left">
                    <span className="exam-title">📝 Computer Science Exam</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="exam-timer">
                        ⏱️ {formatTime(timeLeft)}
                    </div>
                    <div className={`violation-counter ${getViolationLevel()}`}>
                        ⚠️ {violations.length}/5 Violations
                    </div>
                </div>
                <div className="exam-header-right">
                    {!isFullscreen && (
                        <button className="btn-secondary" onClick={enterFullscreen} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                            🖥️ Enter Fullscreen
                        </button>
                    )}
                </div>
            </div>

            {/* --- BODY --- */}
            <div className="exam-body">
                {/* Main exam area */}
                <div className="exam-main">
                    <div className="glass-card question-card">
                        <div className="question-number">
                            Question {currentQuestion + 1} of {examQuestions.length}
                        </div>
                        <p className="question-text">{question.question}</p>

                        <div className="options-list">
                            {question.options.map((option, index) => (
                                <div
                                    key={index}
                                    className={`option-item ${answers[question.id] === index ? 'selected' : ''}`}
                                    onClick={() => handleAnswer(question.id, index)}
                                    id={`option-${question.id}-${index}`}
                                >
                                    <div className="option-letter">{letters[index]}</div>
                                    <span className="option-text">{option}</span>
                                </div>
                            ))}
                        </div>

                        <div className="question-nav">
                            <div className="question-progress">
                                {examQuestions.map((q, i) => (
                                    <div
                                        key={q.id}
                                        className={`progress-dot ${i === currentQuestion ? 'active' : ''} ${answers[q.id] !== undefined ? 'answered' : ''}`}
                                        onClick={() => setCurrentQuestion(i)}
                                        title={`Question ${i + 1}`}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestion === 0}
                                    style={{ opacity: currentQuestion === 0 ? 0.5 : 1 }}
                                    id="prev-question-btn"
                                >
                                    ← Previous
                                </button>
                                {currentQuestion < examQuestions.length - 1 ? (
                                    <button
                                        className="btn-primary"
                                        onClick={() => setCurrentQuestion(prev => Math.min(examQuestions.length - 1, prev + 1))}
                                        id="next-question-btn"
                                        style={{ padding: '0.6rem 1.25rem' }}
                                    >
                                        Next →
                                    </button>
                                ) : (
                                    <button
                                        className="btn-success"
                                        onClick={() => alert('Exam submitted successfully! 🎉')}
                                        id="submit-exam-btn"
                                    >
                                        ✓ Submit Exam
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Camera & Monitoring */}
                <div className="exam-sidebar">
                    <div className="sidebar-camera">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <div className="sidebar-camera-badge">
                            <span className="dot"></span>
                            LIVE
                        </div>
                        {/* Face count overlay */}
                        {faceCount !== 1 && faceStatus !== 'initializing' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '0.5rem',
                                left: '0.5rem',
                                right: '0.5rem',
                                padding: '0.35rem 0.6rem',
                                background: faceCount === 0 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.85)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                animation: 'pulse-red 1.5s infinite'
                            }}>
                                {faceCount === 0 ? '⚠ NO FACE DETECTED — Return to camera' : `⚠ ${faceCount} FACES — Only 1 allowed`}
                            </div>
                        )}
                    </div>

                    {/* Monitoring Status */}
                    <div className="monitoring-section">
                        <h4>Monitoring Status</h4>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${isFullscreen ? 'green' : 'red'}`}></div>
                                <span>Fullscreen</span>
                            </div>
                            <span className={`monitor-value ${isFullscreen ? 'ok' : 'error'}`}>
                                {isFullscreen ? 'Active' : 'Off'}
                            </span>
                        </div>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${getFaceMonitorDot()}`}></div>
                                <span>Face ({faceCount})</span>
                            </div>
                            <span className={`monitor-value ${getFaceStatusColor()}`}>
                                {getFaceStatusText()}
                            </span>
                        </div>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${headDirection === 'center' ? 'green' : 'red'}`}></div>
                                <span>Head Direction</span>
                            </div>
                            <span className={`monitor-value ${headDirection === 'center' ? 'ok' : 'error'}`}>
                                {getHeadDirDisplay()}
                            </span>
                        </div>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${eyeGaze === 'forward' ? 'green' : eyeGaze === 'unknown' ? 'amber' : 'red'}`}></div>
                                <span>Eye Gaze</span>
                            </div>
                            <span className={`monitor-value ${eyeGaze === 'forward' ? 'ok' : eyeGaze === 'unknown' ? 'warn' : 'error'}`}>
                                {getEyeGazeDisplay()}
                            </span>
                        </div>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${mediaStream ? 'green' : 'red'}`}></div>
                                <span>Camera</span>
                            </div>
                            <span className={`monitor-value ${mediaStream ? 'ok' : 'error'}`}>
                                {mediaStream ? 'On' : 'Off'}
                            </span>
                        </div>

                        <div className="monitor-item">
                            <div className="monitor-item-left">
                                <div className={`monitor-dot ${noiseStatus === 'low' ? 'green' : noiseStatus === 'medium' ? 'amber' : 'red'}`}></div>
                                <span>Microphone</span>
                            </div>
                            <span className={`monitor-value ${noiseStatus === 'low' ? 'ok' : noiseStatus === 'medium' ? 'warn' : 'error'}`}>
                                {getNoiseStatusDisplay()}
                            </span>
                        </div>
                    </div>

                    {/* Noise Meter */}
                    <div className="noise-meter">
                        <div className="noise-meter-label">
                            <span>🔊 Noise Level</span>
                            <span style={{
                                color: noiseLevel > 40 ? 'var(--accent-red)' : 'inherit',
                                fontWeight: noiseLevel > 40 ? 700 : 400
                            }}>
                                {Math.round(noiseLevel)}%
                                {noiseLevel > 40 && ' ⚠'}
                            </span>
                        </div>
                        <div className="noise-bar-container">
                            <div
                                className={`noise-bar ${noiseStatus}`}
                                style={{ width: `${Math.min(100, noiseLevel)}%` }}
                            />
                        </div>
                        {/* 40% threshold marker */}
                        <div style={{ position: 'relative', height: '0' }}>
                            <div style={{
                                position: 'absolute',
                                left: '40%',
                                top: '-6px',
                                width: '1px',
                                height: '6px',
                                background: 'var(--accent-amber)',
                                opacity: 0.6
                            }} />
                            <div style={{
                                position: 'absolute',
                                left: '40%',
                                top: '2px',
                                transform: 'translateX(-50%)',
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap'
                            }}>
                                40% warn
                            </div>
                        </div>
                    </div>

                    {/* Violation Log */}
                    <div className="violation-log" style={{ marginTop: '1.5rem' }}>
                        <h4>Violation Log ({violations.length}/5)</h4>
                        {violations.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                                No violations recorded ✓
                            </p>
                        ) : (
                            violations.slice().reverse().map((v, i) => (
                                <div key={i} className="violation-entry">
                                    <span className="violation-entry-time">{v.time}</span>
                                    <span className="violation-entry-text">{v.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Warning Overlay — auto-dismisses, no button */}
            {showWarning && (
                <WarningOverlay
                    violation={showWarning}
                    violationCount={violations.length}
                    onDismiss={() => setShowWarning(null)}
                    onEnterFullscreen={enterFullscreen}
                    isFullscreen={isFullscreen}
                />
            )}
        </div>
    )
}
