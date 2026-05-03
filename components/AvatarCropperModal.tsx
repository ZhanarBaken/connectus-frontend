"use client"

import { useEffect, useRef, useState } from "react"
import Icon from "./Icon"

const CONTAINER_SIZE = 280
const OUTPUT_SIZE = 512
const MIN_USER_SCALE = 1
const MAX_USER_SCALE = 3

type Props = {
  file: File | null
  onSave: (blob: Blob) => void
  onClose: () => void
}

type Position = { x: number; y: number }

/** Pre-upload avatar cropper. Lets the user drag and zoom inside a
 *  circular preview before sending the result to the backend. We crop
 *  in-browser so the server stores a square 512×512 image — mentor
 *  cards on the public side can just use `object-cover` without
 *  worrying about subject alignment.
 *
 *  No external dependency: plain pointer events + canvas. Pointer
 *  events cover both touch and mouse on every supported browser.
 */
export default function AvatarCropperModal({ file, onSave, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [userScale, setUserScale] = useState(MIN_USER_SCALE)
  const [saving, setSaving] = useState(false)
  const dragStateRef = useRef<{ startX: number; startY: number; origin: Position } | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Build the object URL once per file, revoke on unmount / file swap
  // — leaks blob memory otherwise.
  useEffect(() => {
    if (!file) {
      setImageUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setPosition({ x: 0, y: 0 })
    setUserScale(MIN_USER_SCALE)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Lock body scroll while open — otherwise dragging inside the modal
  // bleeds through to the page on iOS.
  useEffect(() => {
    if (!file) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [file])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // Cover-fit scale: smallest factor that makes the image fill the
  // circle on the short side. Multiplied by userScale at render time.
  const fitScale = naturalSize
    ? Math.max(CONTAINER_SIZE / naturalSize.w, CONTAINER_SIZE / naturalSize.h)
    : 1
  const displayedScale = fitScale * userScale

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: position,
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag) return
    setPosition({
      x: drag.origin.x + (e.clientX - drag.startX),
      y: drag.origin.y + (e.clientY - drag.startY),
    })
  }
  const onPointerUp = () => {
    dragStateRef.current = null
  }

  const handleSave = async () => {
    const img = imageRef.current
    if (!img || !naturalSize) return
    setSaving(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas 2D context unavailable")

      // Mirror the on-screen transform onto the canvas: same translate
      // around the centre, same scale, then draw the image with its
      // own centre at the origin.
      const ratio = OUTPUT_SIZE / CONTAINER_SIZE
      ctx.translate(
        OUTPUT_SIZE / 2 + position.x * ratio,
        OUTPUT_SIZE / 2 + position.y * ratio,
      )
      ctx.scale(displayedScale * ratio, displayedScale * ratio)
      ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      )
      if (!blob) throw new Error("Не удалось обработать изображение")
      onSave(blob)
    } finally {
      setSaving(false)
    }
  }

  if (!file || !imageUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Подгони аватарку</h3>
          <button
            onClick={onClose}
            disabled={saving}
            type="button"
            aria-label="Закрыть"
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Icon name="close" size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {/* Square stage with circular mask. Image lives behind the
              mask; user drags freely inside. */}
          <div
            className="relative bg-gray-900 rounded-2xl overflow-hidden touch-none select-none"
            style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${displayedScale})`,
                transformOrigin: "center center",
                maxWidth: "none",
              }}
            />
            {/* Circular cutout — outer dark area, inner ring */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  `radial-gradient(circle at center, transparent ${CONTAINER_SIZE / 2}px, rgba(0,0,0,0.55) ${CONTAINER_SIZE / 2 + 1}px)`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none"
              style={{
                top: 0, left: 0,
                width: CONTAINER_SIZE, height: CONTAINER_SIZE,
              }}
            />
          </div>

          <div className="w-full mt-5">
            <label className="flex items-center gap-3 text-xs text-gray-500">
              <Icon name="zoom_out" size={16} />
              <input
                type="range"
                min={MIN_USER_SCALE}
                max={MAX_USER_SCALE}
                step={0.01}
                value={userScale}
                onChange={(e) => setUserScale(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
                aria-label="Масштаб"
              />
              <Icon name="zoom_in" size={16} />
            </label>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Перетаскивай фото и подкручивай масштаб ползунком
          </p>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            type="button"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !naturalSize}
            type="button"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  )
}
