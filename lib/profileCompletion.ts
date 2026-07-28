import { MentorProfile } from "@/types"

// Единая формула «сколько процентов профиля ментора заполнено». Считается
// в одной точке, используется и на дашборде (`/mentor/dashboard`), и на
// странице редактирования (`/mentors/profile`) — раньше формулы были
// разные (7 vs 8 полей), и одна и та же страница показывала «86 %» в
// одном месте и «88 %» в другом.
//
// Раньше считала только часть полей и не совпадала с реальным гейтом на
// бэке (`MentorProfile.submission_errors()`) — профиль мог показывать
// 100%, но не проходить отправку на проверку. Теперь считает по тому же
// набору, что и бэк: все текстовые поля, языки, документы, активная
// услуга, email и Telegram — тот самый набор extras передаёт вызывающая
// страница, так как эти данные не хранятся в самом MentorProfile.
export interface ProfileCompletionExtras {
  hasActiveService: boolean
  emailVerified: boolean
  hasTelegram: boolean
}

export function calcProfileCompletion(
  p: MentorProfile,
  extras: ProfileCompletionExtras,
): {
  filled: number
  total: number
  percent: number
} {
  const checks: boolean[] = [
    Boolean(p.profile_photo),
    Boolean(p.full_name?.trim()),
    Boolean(p.school_or_university?.trim()),
    (p.countries ?? []).length > 0,
    Boolean(p.major?.trim()),
    Boolean(p.detailed_bio?.trim()),
    Boolean(p.grant_or_scholarship?.trim()),
    Boolean(p.gpa?.trim()),
    Boolean(p.exam_results?.trim()),
    Boolean(p.phone?.trim()),
    (p.expertise_areas ?? []).length > 0,
    (p.languages ?? []).length > 0,
    Boolean(p.has_documents),
    extras.hasActiveService,
    extras.emailVerified,
    extras.hasTelegram,
  ]
  const filled = checks.filter(Boolean).length
  const total = checks.length
  return {
    filled,
    total,
    percent: Math.round((filled / total) * 100),
  }
}
