import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook to detect tab switching / window blur.
 * Uses both the Page Visibility API and the window blur/focus events.
 */
export function useTabSwitch(addViolation, isActive) {
    const wasHiddenRef = useRef(false)

    useEffect(() => {
        if (!isActive) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                wasHiddenRef.current = true
                addViolation({
                    type: 'tab_switch',
                    message: 'Switched away from exam tab'
                })
            }
        }

        const handleBlur = () => {
            // Only trigger if not already caught by visibility change
            if (!document.hidden && !wasHiddenRef.current) {
                addViolation({
                    type: 'window_blur',
                    message: 'Window lost focus'
                })
            }
            wasHiddenRef.current = false
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('blur', handleBlur)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('blur', handleBlur)
        }
    }, [isActive, addViolation])
}
