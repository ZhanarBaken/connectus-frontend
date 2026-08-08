import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound")

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h1>
      <p className="text-gray-500 mb-6">{t("subtitle")}</p>
      <Link href="/" className="text-indigo-600 font-medium hover:underline">
        {t("home")}
      </Link>
    </main>
  )
}
