"use client"

import { ReactNode } from "react"
import { useScrollFadeIn, useStaggerAnimation } from "@/hooks/useGSAP"

interface AnimatedSectionProps {
    children: ReactNode
    className?: string
    direction?: "up" | "down" | "left" | "right"
    distance?: number
    duration?: number
    delay?: number
    threshold?: number
}

/**
 * Animated wrapper component for scroll reveal effects
 */
export default function AnimatedSection({
    children,
    className = "",
    direction = "up",
    distance = 40,
    duration = 0.7,
    delay = 0,
    threshold = 0.1,
}: AnimatedSectionProps) {
    const ref = useScrollFadeIn<HTMLDivElement>({
        direction,
        distance,
        duration,
        delay,
        threshold,
    })

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    )
}

/**
 * Animated card with fade-in effect
 */
export function AnimatedCard({
    children,
    className = "",
    delay = 0,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const ref = useScrollFadeIn<HTMLDivElement>({
        direction: "up",
        distance: 30,
        duration: 0.5,
        delay,
    })

    return (
        <div ref={ref} className={`transform-gpu ${className}`}>
            {children}
        </div>
    )
}

/**
 * Animated header with slide down effect
 */
export function AnimatedHeader({
    children,
    className = "",
    delay = 0,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const ref = useScrollFadeIn<HTMLDivElement>({
        direction: "down",
        distance: 20,
        duration: 0.6,
        delay,
    })
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    )
}

/**
 * Container for staggered child animations
 * Children with data-animate attribute will be animated in sequence
 */
export function StaggerContainer({
    children,
    className = "",
    stagger = 0.1,
    delay = 0,
}: {
    children: ReactNode
    className?: string
    stagger?: number
    delay?: number
}) {
    const ref = useStaggerAnimation<HTMLDivElement>({
        stagger,
        delay,
        direction: "up",
        distance: 25,
    })

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    )
}
