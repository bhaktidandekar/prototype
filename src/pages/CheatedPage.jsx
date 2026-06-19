import React from 'react'

export default function CheatedPage({ violations }) {
    const getViolationIcon = (type) => {
        switch (type) {
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
        <div className="cheated-page">
            <div className="glass-card cheated-card">
                <div className="cheated-icon">🚫</div>
                <h1>Exam Terminated</h1>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    Your exam has been automatically terminated due to <strong>excessive violations</strong>.
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                    You have committed {violations.length} violations, exceeding the maximum limit of 5.
                    This exam attempt has been marked as <strong style={{ color: 'var(--accent-red)' }}>CHEATED</strong>.
                </p>

                <div className="cheated-violations">
                    <h3>📋 Violation Summary</h3>
                    {violations.map((v, i) => (
                        <div key={i} className="cheated-violation-item">
                            <span>{getViolationIcon(v.type)}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v.message}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                    at {v.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        ℹ️ This incident has been recorded. If you believe this was an error,
                        please contact your exam administrator for further assistance.
                    </p>
                </div>

                <button
                    className="btn-secondary"
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '1.5rem' }}
                    id="restart-btn"
                >
                    ← Return to Home
                </button>
            </div>
        </div>
    )
}
