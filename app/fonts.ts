import { Geist, Instrument_Serif } from "next/font/google"

// Shared between app/[locale]/layout.tsx and app/crm/layout.tsx — two
// independent root layouts (see the "multiple root layouts" split) that
// both need identical typography without duplicating the next/font/google
// calls.
export const geist = Geist({ subsets: ["latin"] })
export const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})
