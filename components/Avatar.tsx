// Reusable avatar — renders the photo when present, falls back to the
// first letter of `name` on a colored wrapper otherwise. The caller
// owns sizing and the wrapper background via `className`, since each
// call site uses a different gradient/shape.

import React from "react"

interface AvatarProps {
  src?: string | null
  name?: string | null
  className?: string
  letterClassName?: string
}

export function Avatar({ src, name, className, letterClassName }: AvatarProps) {
  const initial = ((name ?? "").trim().charAt(0) || "?").toUpperCase()

  if (src) {
    return (
      <div className={`overflow-hidden flex items-center justify-center flex-shrink-0 ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name ?? ""} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center flex-shrink-0 ${className ?? ""}`}>
      <span className={letterClassName ?? "font-bold"}>{initial}</span>
    </div>
  )
}
