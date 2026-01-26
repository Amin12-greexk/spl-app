"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

interface CountUpProps {
    end: number
    duration?: number
    delay?: number
    className?: string
    prefix?: string
    suffix?: string
    startOnView?: boolean
}

/**
 * Animated count-up number component
 * Respects reduced-motion preference
 */
export default function CountUp({
    end,
    duration = 1.5,
    delay = 0,
    className = "",
    prefix = "",
    suffix = "",
    startOnView = true,
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const hasAnimated = useRef(false)

    useEffect(() => {
        if (!ref.current) return

        const element = ref.current
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches

        // If reduced motion, just show the value
        if (prefersReducedMotion) {
            element.textContent = `${prefix}${end}${suffix}`
            return
        }

        const obj = { value: 0 }

        const animate = () => {
            if (hasAnimated.current) return
            hasAnimated.current = true

            gsap.to(obj, {
                value: end,
                duration,
                delay,
                ease: "power2.out",
                onUpdate: () => {
                    if (element) {
                        element.textContent = `${prefix}${Math.round(obj.value)}${suffix}`
                    }
                },
            })
        }

        // Set initial value
        element.textContent = `${prefix}0${suffix}`

        if (startOnView) {
            const trigger = ScrollTrigger.create({
                trigger: element,
                start: "top 90%",
                onEnter: animate,
                once: true,
            })

            return () => {
                trigger.kill()
            }
        } else {
            animate()
        }
    }, [end, duration, delay, prefix, suffix, startOnView])

    return <span ref={ref} className={className} />
}
