import React from 'react'

export default function LandingPage({ onStart }) {
    return (
        <div className="landing-page">
            <div className="landing-hero">
                <div className="landing-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h1 className="landing-title">
                    Secure Online <span>Exam Portal</span>
                </h1>
                <p className="landing-subtitle">
                    AI-powered proctoring system with real-time face detection, noise monitoring,
                    and comprehensive anti-cheating measures to ensure exam integrity.
                </p>

                <div className="landing-features">
                    <div className="glass-card landing-feature" style={{ animationDelay: '0.1s' }}>
                        <div className="landing-feature-icon blue">🎥</div>
                        <h3>Face Tracking</h3>
                        <p>AI monitors face presence and movement in real-time</p>
                    </div>
                    <div className="glass-card landing-feature" style={{ animationDelay: '0.2s' }}>
                        <div className="landing-feature-icon cyan">🔒</div>
                        <h3>Screen Lock</h3>
                        <p>Fullscreen enforcement with tab switch detection</p>
                    </div>
                    <div className="glass-card landing-feature" style={{ animationDelay: '0.3s' }}>
                        <div className="landing-feature-icon purple">🎤</div>
                        <h3>Noise Analysis</h3>
                        <p>Ambient noise monitoring to detect external help</p>
                    </div>
                </div>

                <button className="btn-primary" onClick={onStart} id="start-exam-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Start Exam Setup
                </button>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-blue)' }}>10</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Questions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>30 min</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-purple)' }}>5 max</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Violations</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
