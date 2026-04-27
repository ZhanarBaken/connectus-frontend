interface Props {
  size?: number
  className?: string
}

export default function Logo({ size = 32, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      className={className}
      aria-label="Connectus"
    >
      {/* Top-left puzzle piece — dark navy */}
      <path
        d="M6 3C6 1.34 7.34 0 9 0H44V18C44 18 39 18 39 23S44 28 44 28V48H6V28C6 28 11 28 11 23S6 18 6 18V3Z"
        fill="#0D1B6F"
      />

      {/* Top-right puzzle piece — periwinkle */}
      <path
        d="M48 0H83C84.66 0 86 1.34 86 3V48H66C66 48 66 43 61 43S56 48 56 48H48V28C48 28 53 28 53 23S48 18 48 18V0Z"
        fill="#97A3D8"
      />

      {/* Bottom-left puzzle piece — periwinkle */}
      <path
        d="M6 52H26C26 52 26 57 31 57S36 52 36 52H44V86C44 87.66 42.66 89 41 89H6V52Z"
        fill="#97A3D8"
      />

      {/* Bottom-right piece — dark navy, rotated slightly */}
      <g transform="rotate(12, 67, 75)">
        <path
          d="M48 52H66C66 52 66 57 71 57S76 52 76 52H86V89C86 90.66 84.66 92 83 92H48V72C48 72 43 72 43 67S48 62 48 62V52Z"
          fill="#0D1B6F"
        />
      </g>
    </svg>
  )
}
