"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { fetchMentorProfile, fetchMentorServices, fetchOrders, submitMentorProfile, fetchMe, clearAuth, fetchPendingSupportRequests, acceptSupportRequest, declineSupportRequest } from "@/lib/api"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contacts"
import { User } from "@/types"
import { fetchMentorReviews, type Review } from "@/lib/reviews"
import { countriesLabelInline } from "@/lib/countries"
import { calcProfileCompletion } from "@/lib/profileCompletion"
import { MentorProfile, MentorService, Order, SupportRequest } from "@/types"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

export default function MentorDashboard() {
  const t = useTranslations("Dashboard.Mentor")
  const tStatus = useTranslations("OrderStatus")
  const tExpertise = useTranslations("Landing.Expertise")
  const router = useRouter()
  const [profile, setProfile] = useState<MentorProfile | null>(null)
  const [services, setServices] = useState<MentorService[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([])
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const ORDER_STATUS_STYLES: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    pending_payment: "bg-yellow-50 text-yellow-700",
    paid: "bg-blue-50 text-blue-700",
    in_progress: "bg-indigo-50 text-indigo-700",
    completed: "bg-green-50 text-green-700",
    disputed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-400",
  }

  const orderStatusLabel = (status: string): string => {
    const key: Record<string, string> = {
      draft: "draft",
      pending_payment: "pendingPayment",
      paid: "paid",
      in_progress: "inProgress",
      completed: "completed",
      disputed: "disputed",
      cancelled: "cancelled",
    }
    const mapped = key[status]
    return mapped ? tStatus(mapped) : status
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "student") { router.replace("/student/dashboard"); return }

    Promise.all([fetchMentorProfile(), fetchMentorServices(), fetchOrders()])
      .then(([p, s, o]) => {
        setProfile(p)
        setServices(s)
        setOrders(o)
        fetchMentorReviews(p.id).then(setReviews)
        fetchPendingSupportRequests().then(setSupportRequests).catch(() => {})
        const token = localStorage.getItem("access_token")
        if (token) fetchMe(token).then(setMe).catch(() => {})
      })
      .catch(() => {
        // Clear the stale/invalid token before bouncing back — otherwise
        // the login page's token-presence check sends the user straight
        // back here, this catch sends them straight back to login, and
        // so on: an infinite redirect loop that ends in a hard browser
        // navigation failure instead of a clean re-login.
        clearAuth()
        router.replace("/auth/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({})

  const handleAcceptRequest = async (request: SupportRequest) => {
    setRespondingRequestId(request.id)
    try {
      await acceptSupportRequest(request.id)
      setSupportRequests((prev) => prev.filter((r) => r.id !== request.id))
    } catch {
      // ignore — the request just stays in the list, mentor can retry
    } finally {
      setRespondingRequestId(null)
    }
  }

  const handleDeclineRequest = async (request: SupportRequest) => {
    setRespondingRequestId(request.id)
    try {
      await declineSupportRequest(request.id)
      setSupportRequests((prev) => prev.filter((r) => r.id !== request.id))
    } catch {
      // ignore
    } finally {
      setRespondingRequestId(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    setSubmitErrors({})
    try {
      await submitMentorProfile()
      const updated = await fetchMentorProfile()
      setProfile(updated)
    } catch (e: unknown) {
      if (e instanceof Error) {
        // Try to parse field-level errors from backend
        try {
          const parsed = JSON.parse(e.message)
          if (typeof parsed === "object") {
            const errors: Record<string, string> = {}
            for (const [key, val] of Object.entries(parsed)) {
              errors[key] = Array.isArray(val) ? val[0] : String(val)
            }
            setSubmitErrors(errors)
            setSubmitError(t("errorFillRequiredFields"))
          } else {
            setSubmitError(e.message)
          }
        } catch {
          setSubmitError(e.message)
        }
      } else {
        setSubmitError(t("errorGeneric"))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const activeOrders = orders.filter((o) => ["paid", "in_progress"].includes(o.order_status))
  const pendingOrders = orders.filter((o) => o.order_status === "pending_payment")
  const totalEarned = orders
    .filter((o) => o.order_status === "completed")
    .reduce((sum, o) => sum + parseFloat(o.mentor_payout_amount), 0)

  const { percent: completionPercent } = calcProfileCompletion(profile)

  const FIELD_LABELS: Record<string, string> = {
    full_name: t("fields.fullName"),
    major: t("fields.major"),
    grant_or_scholarship: t("fields.grantOrScholarship"),
    school_or_university: t("fields.schoolOrUniversity"),
    gpa: t("fields.gpa"),
    exam_results: t("fields.examResults"),
    detailed_bio: t("fields.detailedBio"),
    phone: t("fields.phone"),
    expertise_areas: t("fields.expertiseAreas"),
    countries: t("fields.countries"),
    languages: t("fields.languages"),
    profile_photo: t("fields.profilePhoto"),
    documents: t("fields.documents"),
    email: t("fields.email"),
    telegram: t("fields.telegramField"),
  }
  const FIELD_LINKS: Record<string, { href: string; label: string }> = {
    profile_photo: { href: "/mentors/profile", label: t("toPhoto") },
    full_name: { href: "/mentors/profile", label: t("fillIn") },
    major: { href: "/mentors/profile", label: t("fillIn") },
    grant_or_scholarship: { href: "/mentors/profile", label: t("fillIn") },
    school_or_university: { href: "/mentors/profile", label: t("fillIn") },
    gpa: { href: "/mentors/profile", label: t("fillIn") },
    exam_results: { href: "/mentors/profile", label: t("fillIn") },
    detailed_bio: { href: "/mentors/profile", label: t("fillIn") },
    phone: { href: "/mentors/profile", label: t("fillIn") },
    expertise_areas: { href: "/mentors/profile", label: t("choose") },
    countries: { href: "/mentors/profile", label: t("choose") },
    languages: { href: "/mentors/profile", label: t("choose") },
    documents: { href: "/mentors/documents", label: t("upload") },
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner
        isSubmitted={profile.is_submitted}
        isApproved={profile.is_approved}
      />
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm text-gray-400 mb-1">{t("title")}</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {profile.full_name || t("myDashboard")}
              </h1>
              {profile.is_approved && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-medium px-2.5 py-1 rounded-full">
                  <Icon name="verified" size={14} filled className="text-indigo-500" /> {t("verified")}
                </span>
              )}
            </div>
            {profile.school_or_university && (
              <p className="text-gray-500 mt-1 text-sm">
                {profile.school_or_university}
                {profile.countries.length > 0 && ` · ${countriesLabelInline(profile.countries)}`}
              </p>
            )}
            {/* Auth badges */}
            {me && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {me.has_telegram && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 font-medium px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                    {t("telegram")}
                  </span>
                )}
                {me.has_google && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/></svg>
                    {t("google")}
                  </span>
                )}
                {me.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                    <Icon name="mark_email_read" size={12} /> {t("email")}
                  </span>
                ) : me.email ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                    <Icon name="mail" size={12} /> {t("confirmEmail")}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <Link
            href={profile.is_banned ? "#" : "/mentors/profile"}
            onClick={profile.is_banned ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            className={`hidden sm:inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              profile.is_banned ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {t("editProfile")}
          </Link>
        </div>

        {/* Identity banner — shown for legacy mentors who registered
            before the new identity-gate flow. Submission still requires
            verified email + linked Telegram on the backend, so we
            point them at the gate page to complete the missing piece. */}
        {me && !profile.is_banned && (!me.email || !me.email_verified || !me.has_telegram) && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
            <Icon name="warning" size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900">{t("identityBannerTitle")}</p>
              <p className="text-sm text-amber-800 mt-1">
                {t("identityBannerBody")}
              </p>
              <Link
                href="/onboarding/mentor/identity"
                className="inline-block mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {t("identityBannerCta")}
              </Link>
            </div>
          </div>
        )}

        {/* Ban banner */}
        {profile.is_banned && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
            <Icon name="block" size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">{t("bannedTitle")}</p>
              {profile.ban_reason && (
                <p className="text-sm text-red-700 mt-1">{profile.ban_reason}</p>
              )}
              <p className="text-xs text-red-500 mt-2">
                {t("bannedBody")} <a href={SUPPORT_EMAIL_HREF} className="underline">{SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>
        )}

        {/* Status banner */}
        {!profile.is_banned && !profile.is_approved && (
          <div className="mb-8">
            {profile.is_submitted ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-amber-800">{t("underReviewTitle")}</p>
                  <p className="text-sm text-amber-700 mt-1">{t("underReviewBody")}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t("completeProfileTitle")}</p>
                    <p className="text-sm text-gray-500">{t("completeProfileBody")}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-indigo-600">{completionPercent}%</div>
                    <div className="text-xs text-gray-400">{t("percentFilled")}</div>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {submitError && <p className="text-red-500 text-sm mt-3">{submitError}</p>}

                {/* Checklist for submit errors */}
                {Object.keys(submitErrors).length > 0 && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-800 mb-2">{t("whatToFixTitle")}</p>
                    <ul className="space-y-1.5">
                      {Object.entries(submitErrors).map(([key, msg]) => {
                        const label = FIELD_LABELS[key] ?? key
                        const link = FIELD_LINKS[key]
                        return (
                          <li key={key} className="text-xs text-red-600 flex items-center gap-1.5 flex-wrap">
                            <Icon name="close" size={12} className="text-red-400" />
                            <span>
                              <strong>{label}:</strong> {msg}
                            </span>
                            {link && (
                              <Link
                                href={link.href}
                                className="ml-auto text-xs font-semibold text-red-700 underline hover:text-red-900"
                              >
                                {link.label}
                              </Link>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Pre-submit checklist */}
                {me && (
                  <div className="mt-3 space-y-1">
                    <div className={`text-xs flex items-center gap-1.5 ${me.email && me.email_verified ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={me.email && me.email_verified ? "check_circle" : "cancel"} size={14} filled />
                      {me.email && me.email_verified ? t("emailVerified") : t("emailNotVerified")}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 ${me.has_telegram ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={me.has_telegram ? "check_circle" : "cancel"} size={14} filled />
                      {me.has_telegram ? t("telegramLinked") : t("telegramNotLinked")}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 ${profile.profile_photo ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={profile.profile_photo ? "check_circle" : "cancel"} size={14} filled />
                      {profile.profile_photo ? t("photoUploaded") : t("photoNotUploaded")}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 ${profile.has_documents ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={profile.has_documents ? "check_circle" : "cancel"} size={14} filled />
                      <span>{profile.has_documents ? t("documentsUploaded") : t("documentsNotUploaded")}</span>
                      {!profile.has_documents && (
                        <Link href="/mentors/documents" className="ml-auto text-red-600 underline font-medium">
                          {t("upload")}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4 flex-wrap">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || completionPercent < 50 || !profile.profile_photo || !profile.has_documents}
                    className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? t("submitting") : t("submitForReview")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: t("activeOrders"), value: activeOrders.length, color: "text-indigo-600", href: null },
            { label: t("pendingPayment"), value: pendingOrders.length, color: "text-yellow-600", href: null },
            {
              label: t("earnedMore"),
              value: totalEarned.toLocaleString("ru-RU"),
              color: "text-green-600",
              href: "/mentor/earnings",
            },
          ].map((stat) => {
            const card = (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center h-full">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            )
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="block hover:opacity-90 transition-opacity">
                {card}
              </Link>
            ) : (
              <div key={stat.label}>{card}</div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders */}
          <div className="lg:col-span-2 space-y-8">

            {/* Pending support requests (no-intro-call "Запросить" pings) */}
            {supportRequests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{t("supportRequestsTitle")}</h2>
                  <span className="text-sm text-gray-400">{supportRequests.length}</span>
                </div>
                <div className="space-y-3">
                  {supportRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-2xl border border-gray-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{request.service_title}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {request.student_name || t("applicant")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request)}
                          disabled={respondingRequestId === request.id}
                          className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {t("supportRequestAccept")}
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request)}
                          disabled={respondingRequestId === request.id}
                          className="flex-1 border border-red-200 text-red-700 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {t("supportRequestDecline")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{t("orders")}</h2>
                <span className="text-sm text-gray-400">{orders.length} {t("total")}</span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="mb-4 flex justify-center">
                    <Icon name="inbox" size={48} className="text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t("noOrdersTitle")}</h3>
                  <p className="text-sm text-gray-400">
                    {t("noOrdersBody")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{order.service_title}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {order.student_info?.full_name?.trim().split(/\s+/)[0] || t("applicant")}
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLES[order.order_status] || "bg-gray-100 text-gray-500"}`}>
                            {orderStatusLabel(order.order_status)}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            +{Number(order.mentor_payout_amount).toLocaleString("ru-RU")} ₸
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">{t("reviews")}</h2>
                {reviews.length > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    <span className="text-yellow-400">★</span> {profile.rating_avg?.toFixed(1) ?? "—"} · {reviews.length}
                  </span>
                )}
              </div>
              {reviews.length === 0 ? (
                <div className="text-center py-4">
                  <div className="mb-2 flex justify-center">
                    <Icon name="star" size={28} className="text-yellow-400" filled />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {t("noReviewsBody")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-xs ${s <= review.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-3">
                        &ldquo;{review.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400 truncate">
                          {review.student_full_name}
                        </span>
                        <span className="text-xs text-gray-300 flex-shrink-0">
                          {new Date(review.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {reviews.length > 3 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      {t("andMoreReviews", { count: reviews.length - 3 })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Services */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">{t("myServices")}</h2>
                <Link href="/mentors/services" className="text-xs text-indigo-600 hover:underline font-medium">
                  {t("manage")}
                </Link>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">{t("noServices")}</p>
                  <Link
                    href="/mentors/services"
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    {t("addService")}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">{s.duration_minutes} {t("minutes")}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">{Number(s.price).toLocaleString("ru-RU")} ₸</span>
                    </div>
                  ))}
                  {services.length > 4 && (
                    <Link href="/mentors/services" className="text-xs text-indigo-600 hover:underline">
                      {t("moreServices", { count: services.length - 4 })}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">{t("quickActions")}</h2>
              <div className="space-y-2">
                {[
                  { href: "/mentor/guide", icon: "menu_book", label: t("guide") },
                  { href: "/mentor/earnings", icon: "account_balance_wallet", label: t("finances") },
                  { href: "/mentor/clients", icon: "group", label: t("clients") },
                  { href: "/mentors/profile", icon: "person", label: t("editProfile") },
                  { href: "/mentors/schedule", icon: "calendar_month", label: t("setUpSchedule") },
                  { href: "/mentors/services", icon: "description", label: t("manageServices") },
                  { href: "/mentors/documents", icon: "folder", label: t("verificationDocuments") },
                  { href: `/mentors/${profile.id}`, icon: "visibility", label: t("previewProfile") },
                ].map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <Icon name={item.icon} size={20} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-indigo-600 transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Expertise */}
            {profile.expertise_areas?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{t("specializations")}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.expertise_areas.map((e) => (
                    <span key={e.area} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
                      {tExpertise.has(e.area) ? tExpertise(e.area) : e.area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
