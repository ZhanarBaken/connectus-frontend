// Subset of the Telegram WebApp API we actually consume. The full SDK
// surface is large and unstable across Telegram client versions —
// declaring only what we use keeps refactors contained.
//
// Spec: https://core.telegram.org/bots/webapps#initializing-mini-apps

declare global {
  interface TelegramWebAppUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
    photo_url?: string
  }

  interface TelegramWebAppInitDataUnsafe {
    user?: TelegramWebAppUser
    auth_date?: number
    hash?: string
    query_id?: string
    start_param?: string
  }

  interface TelegramWebApp {
    initData: string
    initDataUnsafe: TelegramWebAppInitDataUnsafe
    version: string
    platform: string
    colorScheme: "light" | "dark"
    themeParams: Record<string, string>
    isExpanded: boolean
    viewportHeight: number
    ready: () => void
    expand: () => void
    close: () => void
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export {}
