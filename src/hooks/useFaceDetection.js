import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

/**
 * Hook for face detection, tracking face count, face position/movement, and eye gaze.
 *
 * FIXES APPLIED:
 * 1. Lowered minDetectionConfidence to 0.25 for better detection in varied lighting/skin tones
 * 2. Fixed race condition: detection loop now watches detectorRef reactively
 * 3. Increased noFaceCount threshold to reduce false "no face" alerts
 * 4. Eye gaze no longer overrides faceStatus to 'looking_away' when face IS present —
 *    it only logs the gaze direction without triggering a false no-face state
 * 5. Added smoothing: requires N consecutive missing frames before declaring no_face
 */
export function useFaceDetection(videoRef, addViolation, isActive) {
    const [faceCount, setFaceCount] = useState(0)
    const [faceStatus, setFaceStatus] = useState('initializing')
    const [facePosition, setFacePosition] = useState(null)
    const [headDirection, setHeadDirection] = useState('center')
    const [eyeGaze, setEyeGaze] = useState('forward')

    const detectorRef = useRef(null)
    const detectorReadyRef = useRef(false) // FIX: track readiness separately
    const animFrameRef = useRef(null)
    const lastViolationTimeRef = useRef({})

    const noFaceCountRef = useRef(0)
    const multipleFaceCountRef = useRef(0)
    const lookingAwayCountRef = useRef(0)
    const faceMovementCountRef = useRef(0)

    const positionHistoryRef = useRef([])

    // Initialize face detector
    useEffect(() => {
        if (!isActive) return

        let cancelled = false
        detectorReadyRef.current = false

        const createDetector = async (delegate) => {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            )
            if (cancelled) return null
            return await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    delegate,
                },
                runningMode: 'VIDEO',
                // FIX 1: Lower confidence threshold — 0.25 works better for
                // darker skin tones, backlit environments, and slight angles
                minDetectionConfidence: 0.25,
            })
        }

        const initDetector = async () => {
            try {
                const detector = await createDetector('GPU')
                if (cancelled) return
                detectorRef.current = detector
                detectorReadyRef.current = true
                setFaceStatus('ok')
            } catch {
                try {
                    const detector = await createDetector('CPU')
                    if (cancelled) return
                    detectorRef.current = detector
                    detectorReadyRef.current = true
                    setFaceStatus('ok')
                } catch (err) {
                    console.error('Face detector init failed:', err)
                }
            }
        }

        initDetector()

        return () => {
            cancelled = true
            detectorReadyRef.current = false
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            if (detectorRef.current) {
                detectorRef.current.close()
                detectorRef.current = null
            }
        }
    }, [isActive])

    const triggerViolation = useCallback(
        (type, message) => {
            const now = Date.now()
            const lastTime = lastViolationTimeRef.current[type] || 0
            if (now - lastTime > 6000) {
                addViolation({ type, message })
                lastViolationTimeRef.current[type] = now
            }
        },
        [addViolation]
    )

    const getHeadDirection = (centerX, centerY) => {
        if (centerX < 0.3) return 'left'
        if (centerX > 0.7) return 'right'
        if (centerY < 0.25) return 'up'
        if (centerY > 0.75) return 'down'
        return 'center'
    }

    const estimateEyeGaze = (face) => {
        const keypoints = face.keypoints
        if (!keypoints || keypoints.length < 3) return 'forward'

        const rightEye = keypoints.find((k) => k.name === 'rightEye') || keypoints[0]
        const leftEye = keypoints.find((k) => k.name === 'leftEye') || keypoints[1]
        const noseTip = keypoints.find((k) => k.name === 'noseTip') || keypoints[2]

        if (!rightEye || !leftEye || !noseTip) return 'forward'

        const eyeMidX = (rightEye.x + leftEye.x) / 2
        const eyeSpan = Math.abs(leftEye.x - rightEye.x)
        const noseOffsetX = (noseTip.x - eyeMidX) / (eyeSpan || 0.1)

        // FIX 2: Widened gaze thresholds — 0.4 was too sensitive, causing
        // false "looking away" on minor head tilts
        if (noseOffsetX < -0.55) return 'right'
        if (noseOffsetX > 0.55) return 'left'
        if (noseTip.y < 0.25) return 'up'
        if (noseTip.y > 0.75) return 'down'

        return 'forward'
    }

    const checkFaceMovement = (centerX, centerY) => {
        const now = Date.now()
        const history = positionHistoryRef.current

        history.push({ x: centerX, y: centerY, time: now })
        while (history.length > 0 && now - history[0].time > 2000) history.shift()
        if (history.length < 5) return false

        let totalMovement = 0
        for (let i = 1; i < history.length; i++) {
            const dx = history[i].x - history[i - 1].x
            const dy = history[i].y - history[i - 1].y
            totalMovement += Math.sqrt(dx * dx + dy * dy)
        }
        return totalMovement > 0.8
    }

    // FIX 3: Detection loop — poll until detector is ready instead of
    // depending on effect re-run order (race condition fix)
    useEffect(() => {
        if (!isActive) return

        let lastTimestamp = -1
        let stopped = false

        const detect = () => {
            if (stopped) return

            // Wait for detector to be ready before processing
            if (!detectorReadyRef.current || !detectorRef.current) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
            }

            const video = videoRef.current
            if (!video || video.readyState < 2) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
            }

            const now = performance.now()
            // Throttle to ~15fps
            if (now - lastTimestamp < 67) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
            }

            try {
                const results = detectorRef.current.detectForVideo(video, now)
                lastTimestamp = now
                const faces = results.detections || []
                setFaceCount(faces.length)

                if (faces.length === 0) {
                    setFacePosition(null)
                    setHeadDirection('unknown')
                    setEyeGaze('unknown')

                    // FIX 4: Require more consecutive missing frames before
                    // declaring no_face — reduces false alerts from brief occlusion
                    noFaceCountRef.current++
                    multipleFaceCountRef.current = 0

                    // ~2 seconds at 15fps before showing no_face status
                    if (noFaceCountRef.current > 30) {
                        setFaceStatus('no_face')
                    }
                    // ~3.5 seconds before violation
                    if (noFaceCountRef.current === 52) {
                        triggerViolation('no_face', 'Face not visible — please remain in front of the camera')
                    }
                    // ~5 seconds — student_left
                    if (noFaceCountRef.current > 75) {
                        setFaceStatus('student_left')
                        triggerViolation('student_left', 'Student left the seat — no face detected for extended period')
                        noFaceCountRef.current = 0
                    }
                } else if (faces.length > 1) {
                    noFaceCountRef.current = 0
                    setFaceStatus('multiple_faces')
                    multipleFaceCountRef.current++

                    if (multipleFaceCountRef.current > 6) {
                        triggerViolation('multiple_faces', `${faces.length} faces detected — only 1 person allowed`)
                        multipleFaceCountRef.current = 0
                    }
                } else {
                    // Exactly 1 face — good
                    noFaceCountRef.current = 0
                    multipleFaceCountRef.current = 0

                    const face = faces[0]
                    const bbox = face.boundingBox

                    if (bbox) {
                        const videoWidth = video.videoWidth || 640
                        const videoHeight = video.videoHeight || 480

                        const centerX = (bbox.originX + bbox.width / 2) / videoWidth
                        const centerY = (bbox.originY + bbox.height / 2) / videoHeight
                        const faceSize = (bbox.width * bbox.height) / (videoWidth * videoHeight)

                        setFacePosition({ centerX, centerY, faceSize })

                        const direction = getHeadDirection(centerX, centerY)
                        setHeadDirection(direction)

                        const gaze = estimateEyeGaze(face)
                        setEyeGaze(gaze)

                        // FIX 5: Widened "looking away" boundary — was too tight
                        const isLookingAway =
                            centerX < 0.2 || centerX > 0.8 || centerY < 0.15 || centerY > 0.85

                        const isMovingTooMuch = checkFaceMovement(centerX, centerY)

                        if (isMovingTooMuch) {
                            setFaceStatus('face_moving')
                            faceMovementCountRef.current++
                            if (faceMovementCountRef.current > 20) {
                                triggerViolation('face_movement', 'Excessive head movement detected')
                                faceMovementCountRef.current = 0
                            }
                        } else if (isLookingAway) {
                            setFaceStatus('looking_away')
                            lookingAwayCountRef.current++
                            faceMovementCountRef.current = 0

                            if (lookingAwayCountRef.current > 30) {
                                triggerViolation('looking_away', `Student looking away from screen (${direction})`)
                                lookingAwayCountRef.current = 0
                            }
                        } else if (gaze !== 'forward') {
                            // FIX 6: Don't set faceStatus to 'looking_away' here —
                            // face IS detected and centered, only gaze is off.
                            // This was causing the UI to show "no face" banner incorrectly.
                            // Instead, keep status 'ok' and only track the gaze violation.
                            setFaceStatus('ok')
                            lookingAwayCountRef.current++
                            faceMovementCountRef.current = 0

                            if (lookingAwayCountRef.current > 45) {
                                triggerViolation('eye_movement', `Eyes looking ${gaze} — keep your gaze on the screen`)
                                lookingAwayCountRef.current = 0
                            }
                        } else {
                            setFaceStatus('ok')
                            lookingAwayCountRef.current = Math.max(0, lookingAwayCountRef.current - 3)
                            faceMovementCountRef.current = Math.max(0, faceMovementCountRef.current - 2)
                        }
                    }
                }
            } catch {
                // Silently ignore frame errors
            }

            animFrameRef.current = requestAnimationFrame(detect)
        }

        // Small delay so video element has time to start
        const timeoutId = setTimeout(() => {
            animFrameRef.current = requestAnimationFrame(detect)
        }, 500)

        return () => {
            stopped = true
            clearTimeout(timeoutId)
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [isActive, videoRef, triggerViolation])

    return { faceCount, faceStatus, facePosition, headDirection, eyeGaze }
}
