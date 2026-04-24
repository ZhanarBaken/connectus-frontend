"use client"

import { useRef, useState, useCallback } from "react"

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  tiltDeg?: number
  glare?: boolean
  scale?: number
}

export default function TiltCard({
  children,
  className = "",
  tiltDeg = 8,
  glare = true,
  scale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    transition: "transform 0.6s cubic-bezier(0.03,0.98,0.52,0.99)",
  })
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 })

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      const rotateY = (x - 0.5) * tiltDeg * 2
      const rotateX = (0.5 - y) * tiltDeg * 2
      setStyle({
        transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale},${scale},${scale})`,
        transition: "transform 0.1s ease-out",
      })
      if (glare) {
        setGlareStyle({
          opacity: 0.15,
          background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.8), transparent 60%)`,
        })
      }
    },
    [tiltDeg, glare, scale]
  )

  const handleLeave = useCallback(() => {
    setStyle({
      transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      transition: "transform 0.6s cubic-bezier(0.03,0.98,0.52,0.99)",
    })
    setGlareStyle({ opacity: 0 })
  }, [])

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ ...style, transformStyle: "preserve-3d", willChange: "transform" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
          style={{ ...glareStyle, transition: "opacity 0.3s ease-out" }}
        />
      )}
    </div>
  )
}
