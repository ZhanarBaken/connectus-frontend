"use client"

import { useRouter } from "next/navigation"

interface Props {
  /** Fallback href if there's no history (e.g. opened in new tab) */
  fallbackHref?: string
  label?: string
  className?: string
}

/**
 * Universal back button. Uses router.back() so it returns to the
 * previous page in history. If history is empty (new tab), falls
 * back to the dashboard derived from the user's role.
 */
export default function BackButton({ fallbackHref, label = "Назад", className }: Props) {
  const router = useRouter()

  const handleClick = () => {
    if (typeof window === "undefined") return
    if (window.history.length > 1) {
      router.back()
      return
    }
    if (fallbackHref) {
      router.push(fallbackHref)
      return
    }
    const role = localStorage.getItem("role")
    router.push(role === "mentor" ? "/mentor/dashboard" : role === "student" ? "/student/dashboard" : "/")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors group [-webkit-tap-highlight-color:transparent]"
      }
    >
      <span className="transform-gpu transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
      {label}
    </button>
  )
}
