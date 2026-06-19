import { useState, useEffect, useRef } from 'react'

/**
 * Hook to monitor audio noise levels from the microphone.
 * Uses the Web Audio API to analyze the mic input for background noise.
 * WARNING threshold at 40%, VIOLATION at 60%.
 */
export function useNoiseDetection(mediaStream, addViolation, isActive) {
    const [noiseLevel, setNoiseLevel] = useState(0)
    const [noiseStatus, setNoiseStatus] = useState('low') // low, medium, high
    const analyserRef = useRef(null)
    const audioContextRef = useRef(null)
    const animFrameRef = useRef(null)
    const highNoiseCountRef = useRef(0)
    const moderateNoiseCountRef = useRef(0)
    const lastViolationTimeRef = useRef({})

    useEffect(() => {
        if (!isActive || !mediaStream) return

        const audioTracks = mediaStream.getAudioTracks()
        if (audioTracks.length === 0) return

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(mediaStream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            source.connect(analyser)
            analyserRef.current = analyser

            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            const checkNoise = () => {
                if (!analyserRef.current) return

                analyser.getByteFrequencyData(dataArray)

                // Calculate RMS (Root Mean Square) for noise level
                let sum = 0
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i] * dataArray[i]
                }
                const rms = Math.sqrt(sum / bufferLength)
                const normalizedLevel = Math.min(100, (rms / 128) * 100)

                setNoiseLevel(normalizedLevel)

                const now = Date.now()

                // HIGH noise (>60%) — immediate concern
                if (normalizedLevel > 60) {
                    setNoiseStatus('high')
                    highNoiseCountRef.current++
                    moderateNoiseCountRef.current = 0

                    // Trigger violation after ~2 seconds of high noise
                    if (highNoiseCountRef.current > 20) {
                        const lastTime = lastViolationTimeRef.current['high_noise'] || 0
                        if (now - lastTime > 5000) {
                            addViolation({
                                type: 'high_noise',
                                message: `High background noise detected (${Math.round(normalizedLevel)}%)`
                            })
                            lastViolationTimeRef.current['high_noise'] = now
                            highNoiseCountRef.current = 0
                        }
                    }
                }
                // MODERATE noise (>40%) — warning level
                else if (normalizedLevel > 40) {
                    setNoiseStatus('medium')
                    moderateNoiseCountRef.current++
                    highNoiseCountRef.current = Math.max(0, highNoiseCountRef.current - 1)

                    // Trigger violation after ~4 seconds of sustained moderate noise
                    if (moderateNoiseCountRef.current > 40) {
                        const lastTime = lastViolationTimeRef.current['moderate_noise'] || 0
                        if (now - lastTime > 8000) {
                            addViolation({
                                type: 'moderate_noise',
                                message: `Background noise above 40% threshold (${Math.round(normalizedLevel)}%)`
                            })
                            lastViolationTimeRef.current['moderate_noise'] = now
                            moderateNoiseCountRef.current = 0
                        }
                    }
                }
                // LOW noise (<40%) — acceptable
                else {
                    setNoiseStatus('low')
                    highNoiseCountRef.current = Math.max(0, highNoiseCountRef.current - 2)
                    moderateNoiseCountRef.current = Math.max(0, moderateNoiseCountRef.current - 3)
                }

                animFrameRef.current = requestAnimationFrame(checkNoise)
            }

            checkNoise()
        } catch (err) {
            console.error('Noise detection error:', err)
        }

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current)
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close()
            }
        }
    }, [isActive, mediaStream, addViolation])

    return { noiseLevel, noiseStatus }
}
