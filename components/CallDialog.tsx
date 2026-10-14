"use client"

import { useEffect, useRef, type ReactNode } from "react"

let scrollLocks = 0
let restoreScroll: (() => void) | null = null

function lockScroll() {
  if (scrollLocks++ === 0) {
    const body = document.body
    const { overflow, paddingRight } = body.style
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight || "0") + gap}px`
    body.style.overflow = "hidden"
    restoreScroll = () => { body.style.overflow = overflow; body.style.paddingRight = paddingRight }
  }
  return () => { if (--scrollLocks === 0) { restoreScroll?.(); restoreScroll = null } }
}

/** Native modal keeps keyboard focus and background interaction inside the call. */
export default function CallDialog({ label, onDismiss, fullscreen = false, children }: {
  label: string
  onDismiss: () => void
  fullscreen?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previousFocus = document.activeElement
    const unlock = lockScroll()
    dialog.showModal()
    return () => {
      dialog.close()
      unlock()
      // The caller button becomes enabled after its cancelled promise settles.
      requestAnimationFrame(() => {
        if (!document.querySelector("dialog[open]") && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
          previousFocus.focus({ preventScroll: true })
        }
      })
    }
  }, [])

  return (
    <dialog ref={ref} aria-label={label} aria-modal="true"
      onCancel={(event) => { event.preventDefault(); if (!fullscreen) onDismiss() }}
      className={fullscreen
        ? "fixed inset-0 m-0 h-[100dvh] w-full max-h-none max-w-none border-0 bg-black p-0 text-white open:flex flex-col backdrop:bg-black"
        : "fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl border-0 bg-white p-6 sm:p-8 text-center text-gray-900 shadow-2xl backdrop:bg-black/60"}
    >
      {children}
    </dialog>
  )
}
