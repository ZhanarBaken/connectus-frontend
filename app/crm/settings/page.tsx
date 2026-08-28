"use client"

import { useEffect, useState } from "react"
import { fetchAdminSettings, updateAdminSettings } from "@/lib/api"
import { SiteSettings } from "@/types"

type Section = "main" | "legal" | "bot" | "email" | "notif"

const SECTIONS: { id: Section; label: string }[] = [
  { id: "main", label: "Основные" },
  { id: "legal", label: "Юридика" },
  { id: "bot", label: "Telegram бот" },
  { id: "email", label: "Email-шаблоны" },
  { id: "notif", label: "Уведомления" },
]

export default function CRMSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [form, setForm] = useState<Partial<SiteSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [activeSection, setActiveSection] = useState<Section>("main")

  useEffect(() => {
    fetchAdminSettings()
      .then((s) => {
        setSettings(s)
        setForm(s)
      })
      .catch(() => setError("Не удалось загрузить настройки"))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof SiteSettings, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const updated = await updateAdminSettings(form)
      setSettings(updated)
      setForm(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
    } finally {
      setSaving(false)
    }
  }

  const val = (key: keyof SiteSettings): string => String(form[key] ?? "")

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
        {error || "Не удалось загрузить настройки"}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Сохранено ✓</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === s.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Form */}
        <div className="flex-1 space-y-6">
          {activeSection === "main" && (
            <Section title="Основные">
              <Field label="Реквизиты для оплаты" hint="Текст, который студент видит при оплате">
                <Textarea rows={4} value={val("payment_account_details")} onChange={(v) => set("payment_account_details", v)} />
              </Field>
              <Field label="Номер WhatsApp" hint="Только цифры, напр. 77771234567">
                <Input value={val("whatsapp_number")} onChange={(v) => set("whatsapp_number", v)} />
              </Field>
              <Field label="Ссылка на поддержку" hint="URL кнопки «Обратиться в поддержку»">
                <Input value={val("support_url")} onChange={(v) => set("support_url", v)} />
              </Field>
              <Field label="Окно для споров (часов)" hint="Сколько часов после завершения заказа можно открыть спор">
                <Input
                  type="number"
                  value={String(form.dispute_window_hours ?? "")}
                  onChange={(v) => set("dispute_window_hours", parseInt(v) || 24)}
                />
              </Field>
            </Section>
          )}

          {activeSection === "legal" && (
            <Section title="Юридические тексты">
              <Field label="Пользовательское соглашение (ToS)" hint="Страница /terms и чекбокс при регистрации. Пустой EN/KK = показывается русский текст.">
                <Textarea rows={10} value={val("terms_text")} onChange={(v) => set("terms_text", v)} />
              </Field>
              <Field label="Пользовательское соглашение — EN" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("terms_text_en")} onChange={(v) => set("terms_text_en", v)} />
              </Field>
              <Field label="Пользовательское соглашение — KK" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("terms_text_kk")} onChange={(v) => set("terms_text_kk", v)} />
              </Field>

              <Field label="Правила платформы" hint="Страница /platform-rules. Пустой EN/KK = показывается русский текст.">
                <Textarea rows={10} value={val("platform_rules_text")} onChange={(v) => set("platform_rules_text", v)} />
              </Field>
              <Field label="Правила платформы — EN" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("platform_rules_text_en")} onChange={(v) => set("platform_rules_text_en", v)} />
              </Field>
              <Field label="Правила платформы — KK" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("platform_rules_text_kk")} onChange={(v) => set("platform_rules_text_kk", v)} />
              </Field>

              <Field label="Согласие на обработку данных" hint="Модал при регистрации (требование Закона РК №94-V). Пустой EN/KK = показывается русский текст.">
                <Textarea rows={10} value={val("data_consent_text")} onChange={(v) => set("data_consent_text", v)} />
              </Field>
              <Field label="Согласие на обработку данных — EN" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("data_consent_text_en")} onChange={(v) => set("data_consent_text_en", v)} />
              </Field>
              <Field label="Согласие на обработку данных — KK" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("data_consent_text_kk")} onChange={(v) => set("data_consent_text_kk", v)} />
              </Field>

              <Field label="Политика конфиденциальности" hint="Страница /privacy. Пустой EN/KK = показывается русский текст.">
                <Textarea rows={10} value={val("privacy_policy_text")} onChange={(v) => set("privacy_policy_text", v)} />
              </Field>
              <Field label="Политика конфиденциальности — EN" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("privacy_policy_text_en")} onChange={(v) => set("privacy_policy_text_en", v)} />
              </Field>
              <Field label="Политика конфиденциальности — KK" hint="Пусто = fallback на русский текст выше">
                <Textarea rows={10} value={val("privacy_policy_text_kk")} onChange={(v) => set("privacy_policy_text_kk", v)} />
              </Field>
            </Section>
          )}

          {activeSection === "bot" && (
            <Section title="Telegram бот — тексты сообщений">
              <EmailGroup
                label="Реквизиты для оплаты (студенту при создании заказа)"
                hint="{service_title}, {total_price}, {payment_account_details}"
                fields={[]}
                bodyKey="bot_payment_requisites_message"
                bodyLabel="Текст сообщения"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Оплата подтверждена — студенту"
                hint="{service_title}"
                fields={[]}
                bodyKey="bot_payment_received_student"
                bodyLabel="Текст сообщения"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Оплата получена — ментору"
                hint="{student_name}, {service_title}, {total_price}"
                fields={[]}
                bodyKey="bot_payment_received_mentor"
                bodyLabel="Текст сообщения"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Чек отклонён — студенту"
                hint="{service_title}, {reason}"
                fields={[]}
                bodyKey="bot_payment_rejected_student"
                bodyLabel="Текст сообщения"
                val={val}
                set={set}
              />
            </Section>
          )}

          {activeSection === "email" && (
            <Section title="Email-шаблоны">
              <EmailGroup
                label="Подтверждение email"
                hint="{ttl_hours}"
                fields={[
                  { key: "verify_email_subject", label: "Тема" },
                  { key: "verify_email_heading", label: "Заголовок" },
                ]}
                bodyKey="verify_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Сброс пароля"
                hint="{ttl_hours}"
                fields={[
                  { key: "password_reset_email_subject", label: "Тема" },
                  { key: "password_reset_email_heading", label: "Заголовок" },
                ]}
                bodyKey="password_reset_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Новый заказ — ментору"
                hint="{student_name}, {service_title}, {total_price}"
                fields={[
                  { key: "order_created_email_subject", label: "Тема" },
                  { key: "order_created_email_heading", label: "Заголовок" },
                ]}
                bodyKey="order_created_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Заказ завершён — студенту"
                hint="{mentor_name}, {service_title}, {order_url}"
                fields={[
                  { key: "order_completed_email_subject", label: "Тема" },
                  { key: "order_completed_email_heading", label: "Заголовок" },
                ]}
                bodyKey="order_completed_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Ответ на отзыв — студенту"
                hint="{mentor_name}, {mentor_page_url}"
                fields={[
                  { key: "review_reply_email_subject", label: "Тема" },
                  { key: "review_reply_email_heading", label: "Заголовок" },
                ]}
                bodyKey="review_reply_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Новое сообщение в чате"
                hint="{sender_name}, {order_id}, {order_url}"
                fields={[
                  { key: "new_chat_message_email_subject", label: "Тема" },
                  { key: "new_chat_message_email_heading", label: "Заголовок" },
                ]}
                bodyKey="new_chat_message_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Оплата подтверждена — студенту"
                hint="{service_title}, {total_price}"
                fields={[
                  { key: "payment_confirmed_email_subject", label: "Тема" },
                  { key: "payment_confirmed_email_heading", label: "Заголовок" },
                ]}
                bodyKey="payment_confirmed_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Оплата получена — ментору"
                hint="{student_name}, {service_title}, {total_price}"
                fields={[
                  { key: "payment_received_email_subject", label: "Тема" },
                  { key: "payment_received_email_heading", label: "Заголовок" },
                ]}
                bodyKey="payment_received_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Чек отклонён — студенту"
                hint="{service_title}, {reason}"
                fields={[
                  { key: "payment_rejected_email_subject", label: "Тема" },
                  { key: "payment_rejected_email_heading", label: "Заголовок" },
                ]}
                bodyKey="payment_rejected_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Заказ отменён (студент не оплатил) — студенту"
                hint="{service_title}"
                fields={[
                  { key: "payment_expired_student_email_subject", label: "Тема" },
                  { key: "payment_expired_student_email_heading", label: "Заголовок" },
                ]}
                bodyKey="payment_expired_student_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Заказ отменён (студент не оплатил) — ментору"
                hint="{order_id}, {service_title}"
                fields={[
                  { key: "payment_expired_mentor_email_subject", label: "Тема" },
                  { key: "payment_expired_mentor_email_heading", label: "Заголовок" },
                ]}
                bodyKey="payment_expired_mentor_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Профиль ментора одобрен"
                hint="без плейсхолдеров"
                fields={[
                  { key: "mentor_profile_approved_email_subject", label: "Тема" },
                  { key: "mentor_profile_approved_email_heading", label: "Заголовок" },
                ]}
                bodyKey="mentor_profile_approved_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Профиль ментора отклонён"
                hint="без плейсхолдеров"
                fields={[
                  { key: "mentor_profile_rejected_email_subject", label: "Тема" },
                  { key: "mentor_profile_rejected_email_heading", label: "Заголовок" },
                ]}
                bodyKey="mentor_profile_rejected_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Консультация перенесена — студенту"
                hint="{mentor_name}, {scheduled_at}"
                fields={[
                  { key: "consultation_rescheduled_student_email_subject", label: "Тема" },
                  { key: "consultation_rescheduled_student_email_heading", label: "Заголовок" },
                ]}
                bodyKey="consultation_rescheduled_student_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
              <EmailGroup
                label="Консультация перенесена — ментору"
                hint="{student_name}, {scheduled_at}"
                fields={[
                  { key: "consultation_rescheduled_mentor_email_subject", label: "Тема" },
                  { key: "consultation_rescheduled_mentor_email_heading", label: "Заголовок" },
                ]}
                bodyKey="consultation_rescheduled_mentor_email_body"
                bodyLabel="Тело письма"
                val={val}
                set={set}
              />
            </Section>
          )}

          {activeSection === "notif" && (
            <Section title="Заголовки in-app уведомлений">
              {(
                [
                  ["notif_order_created_title", "Новый заказ — ментору", "{service_title}"],
                  ["notif_review_new_title", "Новый отзыв — ментору", "{rating}"],
                  ["notif_payment_receipt_pending_title", "Новый чек на проверку — админам", "{order_id}"],
                  ["notif_payment_confirmed_student_title", "Оплата подтверждена — студенту", "{service_title}"],
                  ["notif_payment_received_mentor_title", "Оплата получена — ментору", "{service_title}"],
                  ["notif_payment_rejected_student_title", "Чек отклонён — студенту", "{service_title}"],
                  ["notif_payment_expired_student_title", "Заказ отменён — студенту", "{days}"],
                  ["notif_payment_expired_mentor_title", "Заказ отменён — ментору", "{order_id}"],
                ] as [keyof SiteSettings, string, string][]
              ).map(([key, label, hint]) => (
                <Field key={key} label={label} hint={hint}>
                  <Input value={val(key)} onChange={(v) => set(key, v)} />
                </Field>
              ))}
            </Section>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Сохраняю..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
    />
  )
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 transition-colors resize-y font-mono"
    />
  )
}

function EmailGroup({
  label,
  hint,
  fields,
  bodyKey,
  bodyLabel,
  val,
  set,
}: {
  label: string
  hint?: string
  fields: { key: string; label: string }[]
  bodyKey: string
  bodyLabel: string
  val: (key: keyof SiteSettings) => string
  set: (key: keyof SiteSettings, v: string) => void
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-gray-400">Плейсхолдеры: {hint}</span>}
      </p>
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          <Input value={val(f.key as keyof SiteSettings)} onChange={(v) => set(f.key as keyof SiteSettings, v)} />
        </Field>
      ))}
      <Field label={bodyLabel}>
        <Textarea rows={4} value={val(bodyKey as keyof SiteSettings)} onChange={(v) => set(bodyKey as keyof SiteSettings, v)} />
      </Field>
    </div>
  )
}
