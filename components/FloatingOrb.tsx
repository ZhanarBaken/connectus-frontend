"use client"

import { useEffect, useRef } from "react"

/**
 * A floating orb that subtly follows scroll position, creating depth.
 * Uses requestAnimationFrame for smooth GPU-accelerated movement.
 */
interface Props {
  color?: string
  size?: number
  speed?: number
  className?: string
  offsetX?: number
  offsetY?: number
}

export default function FloatingOrb({
  color = "rgba(99, 102, 241, 0.08)",
  size = 400,
  speed = 0.05,
  className = "",
  offsetX = 0,
  offsetY = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return

    let currentY = 0
    let targetY = 0

    const onScroll = () => {
      targetY = window.scrollY * speed
    }

    const tick = () => {
      currentY += (targetY - currentY) * 0.08
      el.style.transform = `translate3d(${offsetX}px, ${offsetY + currentY}px, 0)`
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [speed, offsetX, offsetY])

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        willChange: "transform",
      }}
    />
  )
}
