// Single source of truth for all support contacts shown to users.
// Update here and the footer + every "напишите в поддержку" hint
// across the app picks up the change.

export const SUPPORT_EMAIL = "connectus.platform@gmail.com"

// WhatsApp expects the number with country code, no `+`, no spaces.
// Display version keeps the human formatting.
const SUPPORT_WHATSAPP_RAW = "77782199741"
export const SUPPORT_WHATSAPP_DISPLAY = "+7 778 219 9741"
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_RAW}`

// Deep link with `?start=support` so the bot knows the user came from
// a support entry and can flag them as "in support mode" for the
// forwarding handler in run_telegram_bot.py.
export const SUPPORT_TELEGRAM_USERNAME = "@connectus_app_bot"
export const SUPPORT_TELEGRAM_URL = "https://t.me/connectus_app_bot?start=support"

export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`
