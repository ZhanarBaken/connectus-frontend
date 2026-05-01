"use client"

import { useRef, useEffect, useState, useMemo } from "react"

type Variant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom-in"
  | "zoom-out"
  | "flip-up"
  | "flip-left"
  | "rotate-in"
  | "slide-up"
  | "slide-right"
  | "blur-in"

interface Props {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  duration?: number
  threshold?: number
  className?: string
  once?: boolean
  distance?: number
  as?: keyof React.JSX.IntrinsicElements
}

const HIDDEN: Record<Variant, React.CSSProperties> = {
  "fade-up": { opacity: 0, transform: "translateY(40px)" },
  "fade-down": { opacity: 0, transform: "translateY(-40px)" },
  "fade-left": { opacity: 0, transform: "translateX(-40px)" },
  "fade-right": { opacity: 0, transform: "translateX(40px)" },
  "zoom-in": { opacity: 0, transform: "scale(0.85)" },
  "zoom-out": { opacity: 0, transform: "scale(1.15)" },
  "flip-up": { opacity: 0, transform: "perspective(800px) rotateX(20deg) translateY(30px)" },
  "flip-left": { opacity: 0, transform: "perspective(800px) rotateY(-15deg) translateX(-30px)" },
  "rotate-in": { opacity: 0, transform: "rotate(-8deg) scale(0.9)" },
  "slide-up": { opacity: 0, transform: "translateY(60px)" },
  "slide-right": { opacity: 0, transform: "translateX(-60px)" },
  "blur-in": { opacity: 0, filter: "blur(12px)", transform: "translateY(20px)" },
}

const VISIBLE: Record<Variant, React.CSSProperties> = {
  "fade-up": { opacity: 1, transform: "translateY(0)" },
  "fade-down": { opacity: 1, transform: "translateY(0)" },
  "fade-left": { opacity: 1, transform: "translateX(0)" },
  "fade-right": { opacity: 1, transform: "translateX(0)" },
  "zoom-in": { opacity: 1, transform: "scale(1)" },
  "zoom-out": { opacity: 1, transform: "scale(1)" },
  "flip-up": { opacity: 1, transform: "perspective(800px) rotateX(0deg) translateY(0)" },
  "flip-left": { opacity: 1, transform: "perspective(800px) rotateY(0deg) translateX(0)" },
  "rotate-in": { opacity: 1, transform: "rotate(0deg) scale(1)" },
  "slide-up": { opacity: 1, transform: "translateY(0)" },
  "slide-right": { opacity: 1, transform: "translateX(0)" },
  "blur-in": { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
}

export default function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.15,
  className = "",
  once = true,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      setVisible(true)
      return
    }

    // No IO support (very old browsers) — show content immediately.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    let observerFired = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        observerFired = true
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    )
    observer.observe(el)

    // Safety net: mobile Safari sometimes never fires IO on
    // already-visible above-the-fold elements. If the observer
    // hasn't reported anything within 1s, reveal the content
    // unconditionally so the page is never permanently empty.
    const fallback = window.setTimeout(() => {
      if (!observerFired) setVisible(true)
    }, 1000)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [threshold, once])

  const style = useMemo<React.CSSProperties>(
    () => ({
      ...(visible ? VISIBLE[variant] : HIDDEN[variant]),
      transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      willChange: "opacity, transform",
    }),
    [visible, variant, duration, delay]
  )

  return (
    // @ts-expect-error - dynamic element type
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  )
}

/**
 * Stagger helper — wraps children with incremental delays
 */
export function ScrollRevealGroup({
  children,
  variant = "fade-up",
  stagger = 100,
  className = "",
  baseDelay = 0,
}: {
  children: React.ReactNode[]
  variant?: Variant
  stagger?: number
  className?: string
  baseDelay?: number
}) {
  return (
    <>
      {children.map((child, i) => (
        <ScrollReveal
          key={i}
          variant={variant}
          delay={baseDelay + i * stagger}
          className={className}
        >
          {child}
        </ScrollReveal>
      ))}
    </>
  )
}
