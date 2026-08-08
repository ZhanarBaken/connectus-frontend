"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { fetchMentorClients, type MentorClient, type MentorClients } from "@/lib/api"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import { Avatar } from "@/components/Avatar"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

type Tab = "active" | "inactive"

function ClientRow({ client }: { client: MentorClient }) {
  return (
    <Link
      href={`/mentor/clients/${client.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={client.profile_photo}
          name={client.full_name}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
          letterClassName="text-white font-bold"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{client.full_name}</p>
          <p className="text-xs text-gray-400 truncate">
            {[client.current_school_or_university, client.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Icon name="arrow_forward_ios" size={16} className="text-gray-300 flex-shrink-0" />
      </div>
    </Link>
  )
}

export default function MentorClientsPage() {
  const t = useTranslations("Dashboard.MentorClients")
  const router = useRouter()
  useMentorOnboardingGate()
  const [data, setData] = useState<MentorClients | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("active")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/auth/login?next=/mentor/clients")
      return
    }
    fetchMentorClients()
      .then(setData)
      .catch((e) => setError(e instanceof Error && e.message ? e.message : t("errorLoading")))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <BackButton fallbackHref="/mentor/dashboard" />
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">
            {error || t("errorGeneric")}
          </div>
        </div>
      </div>
    )
  }

  const list = data[tab]

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["active", "inactive"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {key === "active" ? t("activeTab") : t("inactiveTab")} · {data[key].length}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Icon name="group" size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {tab === "active" ? t("noActiveTitle") : t("noInactiveTitle")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === "active" ? t("noActiveBody") : t("noInactiveBody")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
