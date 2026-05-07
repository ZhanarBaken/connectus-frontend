"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchMe, setEmail, updateStudentProfile, CooldownError } from "@/lib/api"
import Logo from "@/components/Logo"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

type Stage = "loading" | "email" | "verify" | "name" | "school"

const VERIFY_POLL_INTERVAL_MS = 5000

export default function StudentOnboarding() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("loading")
  const [needsEmail, setNeedsEmail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Step: Email
  const [email, setEmailValue] = useState("")
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyChecking, setVerifyChecking] = useState(false)

  // Step: Name
  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")

  // Step: School
  const [school, setSchool] = useState("")

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => {
        if (cancelled) return
        if (me.email && me.email_verified) {
          setStage("name")
        } else if (me.email) {
          setVerifyEmail(me.email)
          setNeedsEmail(true)
          setStage("verify")
        } else {
          setNeedsEmail(true)
          setStage("email")
        }
      })
      .catch(() => {
        if (cancelled) return
        router.replace("/auth/login")
      })
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    if (stage !== "verify") return
    const tick = async () => {
      const me = await fetchMe().catch(() => null)
      if (me?.email_verified) setStage("name")
    }
    pollTimer.current = setInterval(tick, VERIFY_POLL_INTERVAL_MS)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [stage])

  const handleSubmitEmail = async () => {
    setSaving(true)
    setError("")
    try {
      await setEmail(email.trim())
      setVerifyEmail(email.trim())
      setStage("verify")
    } catch (e: unknown) {
      if (e instanceof CooldownError) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : "Не удалось отправить письмо")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleManualVerifyCheck = async () => {
    setVerifyChecking(true)
    setError("")
    try {
      const me = await fetchMe()
      if (me.email_verified) {
        setStage("name")
      } else {
        setError("Email пока не подтверждён. Проверь почту, в том числе папку «Спам».")
      }
    } catch {
      setError("Не удалось проверить статус. Попробуй ещё раз.")
    } finally {
      setVerifyChecking(false)
    }
  }

  const handleFinish = async () => {
    const ageNum = Number(age)
    if (!Number.isInteger(ageNum) || ageNum < 10 || ageNum > 60) {
      setError("Укажи возраст от 10 до 60")
      return
    }
    setSaving(true)
    setError("")
    try {
      await updateStudentProfile({
        full_name: fullName,
        age: ageNum,
        current_school_or_university: school,
      })
      router.push("/student/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  const stepsForUser = needsEmail
    ? ["Email", "Основное", "Учёба"]
    : ["Основное", "Учёба"]
  const currentStepIndex = (() => {
    if (stage === "email" || stage === "verify") return 1
    if (stage === "name") return needsEmail ? 2 : 1
    if (stage === "school") return needsEmail ? 3 : 2
    return 0
  })()

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 justify-center mb-2">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-500 text-sm">Расскажи о себе — это займёт минуту</p>
        </div>

        {stage !== "loading" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {stepsForUser.map((label, i) => {
              const s = i + 1
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    currentStepIndex === s ? "bg-gray-900 text-white" : currentStepIndex > s ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {currentStepIndex > s ? "✓" : s}. {label}
                  </div>
                  {i < stepsForUser.length - 1 && <div className={`w-6 h-0.5 ${currentStepIndex > s ? "bg-gray-300" : "bg-gray-100"}`} />}
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {stage === "loading" && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {stage === "email" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Добавь email</h1>
              <p className="text-gray-400 text-sm mb-6">
                Нужен для подтверждения заказов и важных уведомлений. Без email нельзя оформить заказ.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">{error}</div>
              )}
              <button
                onClick={handleSubmitEmail}
                disabled={saving || !email.trim()}
                className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                {saving ? "Отправляем..." : "Отправить письмо для подтверждения"}
              </button>
            </div>
          )}

          {stage === "verify" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Проверь почту</h1>
              <p className="text-gray-400 text-sm mb-6">
                Мы отправили ссылку на <span className="text-gray-700 font-medium">{verifyEmail}</span>.
                Кликни на неё, и ты автоматически вернёшься сюда.
              </p>
              {error && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-4">{error}</div>
              )}
              <button
                onClick={handleManualVerifyCheck}
                disabled={verifyChecking}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                {verifyChecking ? "Проверяем..." : "Я подтвердил email"}
              </button>
              <button
                onClick={() => { setStage("email"); setError("") }}
                className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
              >
                Указать другой email
              </button>
            </div>
          )}

          {stage === "name" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Как тебя зовут?</h1>
              <p className="text-gray-400 text-sm mb-6">Эту информацию увидит твой ментор</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Полное имя</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Айгерим Бекова"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Возраст</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="17"
                    min={10}
                    max={60}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                onClick={() => setStage("school")}
                disabled={!fullName.trim()}
                className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {stage === "school" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Где ты учишься?</h1>
              <p className="text-gray-400 text-sm mb-6">Школа, колледж или университет</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Учебное заведение</label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="НИШ Алматы, школа №1..."
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStage("name")}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || !school.trim()}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  {saving ? "Сохраняем..." : "Готово →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Можно изменить позже в профиле
        </p>
      </div>
    </div>
  )
}
