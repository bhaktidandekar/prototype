import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook to enforce fullscreen mode during the exam.
 * Detects when user exits fullscreen and triggers a violation.
 */
export function useFullscreen(addViolation, isActive) {
    const [isFullscreen, setIsFullscreen] = useState(false)

    const enterFullscreen = useCallback(async () => {
        try {
            const docEl = document.documentElement
            if (docEl.requestFullscreen) {
                await docEl.requestFullscreen()
            } else if (docEl.webkitRequestFullscreen) {
                await docEl.webkitRequestFullscreen()
            } else if (docEl.mozRequestFullScreen) {
                await docEl.mozRequestFullScreen()
            } else if (docEl.msRequestFullscreen) {
                await docEl.msRequestFullscreen()
            }
            setIsFullscreen(true)
        } catch (err) {
            console.error('Failed to enter fullscreen:', err)
        }
    }, [])

    useEffect(() => {
        if (!isActive) return

        const handleFullscreenChange = () => {
            const isNowFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            )
            setIsFullscreen(isNowFullscreen)

            if (!isNowFullscreen && isActive) {
                addViolation({
                    type: 'fullscreen_exit',
                    message: 'Exited fullscreen mode'
                })
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.addEventListener('mozfullscreenchange', handleFullscreenChange)
        document.addEventListener('MSFullscreenChange', handleFullscreenChange)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
        }
    }, [isActive, addViolation])

    return { isFullscreen, enterFullscreen }
}
