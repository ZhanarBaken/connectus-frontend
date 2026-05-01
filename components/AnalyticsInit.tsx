"use client"

import { useEffect } from "react"

import { init } from "@/lib/analytics"

// Mounts once at the root layout level and triggers the lazy
// Amplitude init. Rendered as a child of <body> so it never paints
// anything — its only job is the side-effect on mount.
//
// Init is idempotent + disabled-by-default, so calling it without
// the env vars set is a cheap noop.
export default function AnalyticsInit() {
  useEffect(() => {
    void init()
  }, [])
  return null
}
