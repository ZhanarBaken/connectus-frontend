"use client"

import { useRef, useEffect, useState } from "react"

interface Props {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 1800,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState("0")
  const triggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      setDisplay(value.toLocaleString())
      return
    }

    // No IO support — show final value immediately.
    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value.toLocaleString())
      triggered.current = true
      return
    }

    function animate() {
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(eased * value)
        setDisplay(current.toLocaleString())
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    let observerFired = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        observerFired = true
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)

    // Safety net: if IO never fires (mobile Safari quirk), show
    // the final value after 1s so users don't see a stuck zero.
    const fallback = window.setTimeout(() => {
      if (!observerFired && !triggered.current) {
        triggered.current = true
        animate()
      }
    }, 1000)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
