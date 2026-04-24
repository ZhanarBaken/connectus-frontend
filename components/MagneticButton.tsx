"use client"

import { useRef, useCallback, useState } from "react"

interface Props {
  children: React.ReactNode
  className?: string
  strength?: number
  as?: "button" | "a" | "div"
  href?: string
  onClick?: () => void
}

export default function MagneticButton({
  children,
  className = "",
  strength = 0.3,
  as: Tag = "div",
  href,
  onClick,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  })

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength
      setStyle({
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`,
        transition: "transform 0.15s ease-out",
      })
    },
    [strength]
  )

  const handleLeave = useCallback(() => {
    setStyle({
      transform: "translate3d(0, 0, 0)",
      transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    })
  }, [])

  const props = {
    ref: ref as React.Ref<HTMLDivElement>,
    className,
    style,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onClick,
    ...(href && Tag === "a" ? { href } : {}),
  }

  // @ts-expect-error - dynamic element
  return <Tag {...props}>{children}</Tag>
}
