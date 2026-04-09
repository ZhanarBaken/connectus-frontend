import { CSSProperties } from "react"

interface Props {
  /** Material Symbols icon name, e.g. "school", "lock", "chat" */
  name: string
  /** Pixel size — sets font-size and inline width/height */
  size?: number
  /** Tailwind text color class is applied via className */
  className?: string
  /** Filled vs outlined (default) */
  filled?: boolean
  /** Stroke weight 100..700 (default 400) */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  /** Decorative? Then aria-hidden */
  ariaLabel?: string
}

/**
 * Material Symbols Outlined icon.
 *
 * Loads the variable font from Google Fonts (see app/layout.tsx).
 * Use as a drop-in replacement for emoji:
 *   <Icon name="school" />
 *   <Icon name="lock" size={16} className="text-indigo-600" />
 */
export default function Icon({
  name,
  size = 20,
  className = "",
  filled = false,
  weight = 400,
  ariaLabel,
}: Props) {
  const fontVariationSettings = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`
  const style: CSSProperties = {
    fontFamily: "'Material Symbols Outlined'",
    fontWeight: "normal",
    fontStyle: "normal",
    fontSize: `${size}px`,
    lineHeight: 1,
    letterSpacing: "normal",
    textTransform: "none",
    display: "inline-flex",
    whiteSpace: "nowrap",
    wordWrap: "normal",
    direction: "ltr",
    WebkitFontFeatureSettings: "'liga'",
    WebkitFontSmoothing: "antialiased",
    fontVariationSettings,
  }

  return (
    <span
      className={`material-symbols-outlined select-none align-middle ${className}`}
      style={style}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    >
      {name}
    </span>
  )
}
