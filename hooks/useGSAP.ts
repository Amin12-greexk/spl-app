"use client"

import { useEffect, useRef, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Hook for fade-in animation when element scrolls into view
 */
export function useScrollFadeIn<T extends HTMLElement>(
    options: {
        direction?: "up" | "down" | "left" | "right"
        distance?: number
        duration?: number
        delay?: number
        threshold?: number
    } = {}
) {
    const ref = useRef<T>(null)
    const {
        direction = "up",
        distance = 50,
        duration = 0.8,
        delay = 0,
        threshold = 0.1,
    } = options

    useEffect(() => {
        if (!ref.current || prefersReducedMotion()) return

        const element = ref.current

        // Set initial state
        const fromVars: gsap.TweenVars = {
            opacity: 0,
            y: direction === "up" ? distance : direction === "down" ? -distance : 0,
            x: direction === "left" ? distance : direction === "right" ? -distance : 0,
        }

        gsap.set(element, fromVars)

        // Create scroll trigger animation
        const animation = gsap.to(element, {
            opacity: 1,
            x: 0,
            y: 0,
            duration,
            delay,
            ease: "power3.out",
            scrollTrigger: {
                trigger: element,
                start: `top ${100 - threshold * 100}%`,
                toggleActions: "play none none none",
            },
        })

        return () => {
            animation.kill()
            ScrollTrigger.getAll().forEach((t) => {
                if (t.trigger === element) t.kill()
            })
        }
    }, [direction, distance, duration, delay, threshold])

    return ref
}

/**
 * Hook for staggered animation of multiple children
 */
export function useStaggerAnimation<T extends HTMLElement>(
    options: {
        stagger?: number
        duration?: number
        delay?: number
        direction?: "up" | "down" | "left" | "right"
        distance?: number
        trigger?: any
    } = {}
) {
    const ref = useRef<T>(null)
    const {
        stagger = 0.1,
        duration = 0.6,
        delay = 0,
        direction = "up",
        distance = 30,
        trigger = null,
    } = options

    useEffect(() => {
        if (trigger === false) return
        if (!ref.current || prefersReducedMotion()) return

        const container = ref.current
        const children = container.querySelectorAll("[data-animate]")

        if (children.length === 0) return

        // Set initial state for all children
        gsap.set(children, {
            opacity: 0,
            y: direction === "up" ? distance : direction === "down" ? -distance : 0,
            x: direction === "left" ? distance : direction === "right" ? -distance : 0,
        })

        // Create staggered animation
        const animation = gsap.to(children, {
            opacity: 1,
            x: 0,
            y: 0,
            duration,
            delay,
            stagger,
            ease: "power2.out",
            scrollTrigger: trigger === null ? {
                trigger: container,
                start: "top 85%",
                toggleActions: "play none none none",
            } : undefined,
        })

        return () => {
            animation.kill()
            ScrollTrigger.getAll().forEach((t) => {
                if (t.trigger === container) t.kill()
            })
        }
    }, [stagger, duration, delay, direction, distance, trigger])

    return ref
}

/**
 * Hook for counting up numbers animation
 */
export function useCountUp(
    endValue: number,
    options: {
        duration?: number
        delay?: number
        startOnView?: boolean
    } = {}
) {
    const ref = useRef<HTMLElement>(null)
    const { duration = 1.5, delay = 0, startOnView = true } = options

    useEffect(() => {
        if (!ref.current || prefersReducedMotion()) return

        const element = ref.current
        const obj = { value: 0 }

        const animate = () => {
            gsap.to(obj, {
                value: endValue,
                duration,
                delay,
                ease: "power2.out",
                onUpdate: () => {
                    if (element) {
                        element.textContent = Math.round(obj.value).toString()
                    }
                },
            })
        }

        if (startOnView) {
            ScrollTrigger.create({
                trigger: element,
                start: "top 90%",
                onEnter: animate,
                once: true,
            })
        } else {
            animate()
        }

        return () => {
            ScrollTrigger.getAll().forEach((t) => {
                if (t.trigger === element) t.kill()
            })
        }
    }, [endValue, duration, delay, startOnView])

    return ref
}

/**
 * Hook for page load animations
 */
export function usePageLoadAnimation<T extends HTMLElement>(
    options: {
        duration?: number
        delay?: number
        direction?: "up" | "down"
        distance?: number
    } = {}
) {
    const ref = useRef<T>(null)
    const { duration = 0.8, delay = 0, direction = "down", distance = 30 } = options

    useEffect(() => {
        if (!ref.current || prefersReducedMotion()) return

        const element = ref.current

        gsap.fromTo(
            element,
            {
                opacity: 0,
                y: direction === "down" ? -distance : distance,
            },
            {
                opacity: 1,
                y: 0,
                duration,
                delay,
                ease: "power3.out",
            }
        )
    }, [duration, delay, direction, distance])

    return ref
}

/**
 * Hook for hover scale effect
 */
export function useHoverScale<T extends HTMLElement>(
    scale: number = 1.02
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!ref.current || prefersReducedMotion()) return

        const element = ref.current

        const onEnter = () => {
            gsap.to(element, {
                scale,
                duration: 0.2,
                ease: "power2.out",
            })
        }

        const onLeave = () => {
            gsap.to(element, {
                scale: 1,
                duration: 0.2,
                ease: "power2.out",
            })
        }

        element.addEventListener("mouseenter", onEnter)
        element.addEventListener("mouseleave", onLeave)

        return () => {
            element.removeEventListener("mouseenter", onEnter)
            element.removeEventListener("mouseleave", onLeave)
        }
    }, [scale])

    return ref
}

/**
 * Hook for focus scale effect
 */
export function useFocusScale<T extends HTMLElement>(
    scale: number = 1.02
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!ref.current || prefersReducedMotion()) return

        const element = ref.current

        const onFocus = () => {
            gsap.to(element, {
                scale,
                borderColor: "#16a34a", // green-600
                boxShadow: "0 0 0 4px rgba(22, 163, 74, 0.1)",
                duration: 0.3,
                ease: "back.out(1.7)",
            })
        }

        const onBlur = () => {
            gsap.to(element, {
                scale: 1,
                borderColor: "#e5e7eb", // gray-200
                boxShadow: "none",
                duration: 0.2,
                ease: "power2.out",
            })
        }

        element.addEventListener("focus", onFocus)
        element.addEventListener("blur", onBlur)

        return () => {
            element.removeEventListener("focus", onFocus)
            element.removeEventListener("blur", onBlur)
        }
    }, [scale])

    return ref
}
