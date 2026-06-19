import React, { useState, useEffect, useRef, useCallback } from 'react'

const CHECK_ITEMS = [
    {
        id: 'camera',
        label: 'Camera',
        description: 'Webcam must be connected and accessible',
        icon: '📷',
        color: 'blue'
    },
    {
        id: 'microphone',
        label: 'Microphone',
        description: 'Mic must be connected for noise monitoring',
        icon: '🎤',
        color: 'cyan'
    },
    {
        id: 'fullscreen',
        label: 'Fullscreen',
        description: 'Exam must run in fullscreen mode',
        icon: '🖥️',
        color: 'purple'
    },
    {
        id: 'browser',
        label: 'Browser Permissions',
        description: 'Tab switching will be monitored',
        icon: '🔒',
        color: 'green'
    }
]

export default function SystemCheckPage({ onProceed, onBack, mediaStream, setMediaStream }) {
    const [checks, setChecks] = useState({
        camera: 'pending',
        microphone: 'pending',
        fullscreen: 'pending',
        browser: 'pending'
    })
    const [isRunning, setIsRunning] = useState(false)
    const [allPassed, setAllPassed] = useState(false)
    const videoRef = useRef(null)

    const updateCheck = useCallback((id, status) => {
        setChecks(prev => ({ ...prev, [id]: status }))
    }, [])

    const runChecks = useCallback(async () => {
        setIsRunning(true)

        // 1. Check Camera
        updateCheck('camera', 'checking')
        await delay(800)
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const hasCamera = devices.some(d => d.kind === 'videoinput')
            const hasMic = devices.some(d => d.kind === 'audioinput')

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                setMediaStream(stream)
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
                updateCheck('camera', 'passed')
                updateCheck('microphone', 'checking')
                await delay(800)
                updateCheck('microphone', 'passed')
            } catch (err) {
                console.error('Camera error:', err)
                // Try video only
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    setMediaStream(videoStream)
                    if (videoRef.current) {
                        videoRef.current.srcObject = videoStream
                    }
                    updateCheck('camera', 'passed')
                } catch (e) {
                    if (hasCamera) updateCheck('camera', 'passed')
                    else updateCheck('camera', 'failed')
                }
                updateCheck('microphone', 'passed')
            }
        } catch (err) {
            console.error('Media error:', err)
            updateCheck('camera', 'failed')
            updateCheck('microphone', 'failed')
        }

        // 3. Check Fullscreen capability
        updateCheck('fullscreen', 'checking')
        await delay(600)
        if (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) {
            updateCheck('fullscreen', 'passed')
        } else {
            updateCheck('fullscreen', 'failed')
        }

        // 4. Check Browser (visibility API)
        updateCheck('browser', 'checking')
        await delay(600)
        if ('hidden' in document) {
            updateCheck('browser', 'passed')
        } else {
            updateCheck('browser', 'failed')
        }

        setIsRunning(false)
    }, [updateCheck, setMediaStream])

    useEffect(() => {
        const timer = setTimeout(runChecks, 500)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const passed = Object.values(checks).every(s => s === 'passed')
        setAllPassed(passed)
    }, [checks])

    useEffect(() => {
        if (mediaStream && videoRef.current) {
            videoRef.current.srcObject = mediaStream
        }
    }, [mediaStream])

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pending'
            case 'checking': return 'Checking...'
            case 'passed': return '✓ Passed'
            case 'failed': return '✕ Failed'
            default: return 'Unknown'
        }
    }

    return (
        <div className="system-check-page">
            <div className="system-check-header">
                <h1>System Compatibility Check</h1>
                <p>Verify that your system meets all requirements before starting the exam</p>
            </div>

            <div className="system-checks-grid">
                {CHECK_ITEMS.map((item, index) => (
                    <div
                        key={item.id}
                        className={`glass-card check-card ${checks[item.id]}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="check-card-header">
                            <div className={`check-card-icon ${item.color}`}>
                                {item.icon}
                            </div>
                            <span className={`check-status-badge ${checks[item.id]}`}>
                                {getStatusLabel(checks[item.id])}
                            </span>
                        </div>
                        <h3>{item.label}</h3>
                        <p>{item.description}</p>
                    </div>
                ))}
            </div>

            {mediaStream && (
                <div className="camera-preview glass-card">
                    <div className="camera-preview-inner">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <div className="camera-overlay-badge">
                            <span className="dot"></span>
                            Camera Preview
                        </div>
                    </div>
                </div>
            )}

            <div className="system-check-actions">
                <button className="btn-secondary" onClick={onBack} id="back-btn">
                    ← Back
                </button>
                <button
                    className="btn-secondary"
                    onClick={runChecks}
                    disabled={isRunning}
                    id="recheck-btn"
                >
                    🔄 Re-check
                </button>
                <button
                    className="btn-primary"
                    onClick={onProceed}
                    disabled={!allPassed}
                    id="proceed-btn"
                    style={{ opacity: allPassed ? 1 : 0.5, cursor: allPassed ? 'pointer' : 'not-allowed' }}
                >
                    Proceed to Exam →
                </button>
            </div>
        </div>
    )
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
