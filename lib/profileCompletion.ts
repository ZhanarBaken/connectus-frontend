import { MentorProfile } from "@/types"

// Единая формула «сколько процентов профиля ментора заполнено». Считается
// в одной точке, используется и на дашборде (`/mentor/dashboard`), и на
// странице редактирования (`/mentors/profile`) — раньше формулы были
// разные (7 vs 8 полей), и одна и та же страница показывала «86 %» в
// одном месте и «88 %» в другом.
//
// Это просто UX-индикатор «как ты выглядишь для студентов» — не gate
// для submit. Гейт собирается на бэке в `MentorProfile.submission_errors()`
// и проверяет другой набор полей (включая gpa, exam_results, documents,
// telegram), который не нужен в виде прогресс-бара.
export function calcProfileCompletion(p: MentorProfile): {
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
    (p.expertise_areas ?? []).length > 0,
  ]
  const filled = checks.filter(Boolean).length
  const total = checks.length
  return {
    filled,
    total,
    percent: Math.round((filled / total) * 100),
  }
}
