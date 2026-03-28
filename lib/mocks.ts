import { Mentor, MentorService } from "@/types"

// ─── Mock data — replace with real API calls when backend is ready ───────────
// Formats match API.md exactly

export const MOCK_MENTORS: Mentor[] = [
  {
    id: 1,
    full_name: "Назгуль Ахметова",
    country: "USA",
    school: "MIT",
    major: "Computer Science",
    grant_or_scholarship: "Болашак",
    gpa: "3.9",
    exam_results: "IELTS 7.5, SAT 1450",
    expertise_areas: ["admission", "scholarships"],
    detailed_bio: "Помогаю поступить в топ университеты США. Прошла путь от НИШ до MIT.",
    linkedin_url: "https://linkedin.com/in/mock",
    profile_photo: null,
    is_active: true,
    services: [
      {
        id: 1,
        service_type: "consultation_30min",
        title: "Консультация 30 минут",
        description: "Разбираем твою ситуацию и составляем план поступления",
        price: "30.00",
        currency: "USD",
        duration_minutes: 30,
        is_active: true,
      },
      {
        id: 2,
        service_type: "documents_review",
        title: "Проверка документов",
        description: "Проверяю и правлю essay, CV, рекомендательные письма",
        price: "80.00",
        currency: "USD",
        duration_minutes: 60,
        is_active: true,
      },
    ],
  },
  {
    id: 2,
    full_name: "Айдана Сейткали",
    country: "UK",
    school: "University of Edinburgh",
    major: "Economics",
    grant_or_scholarship: "Chevening",
    gpa: "3.7",
    exam_results: "IELTS 8.0",
    expertise_areas: ["scholarships", "visa", "documents"],
    detailed_bio: "Chevening scholar. Помогаю с грантами и визой в Великобританию.",
    linkedin_url: "https://linkedin.com/in/mock2",
    profile_photo: null,
    is_active: true,
    services: [
      {
        id: 3,
        service_type: "scholarship_guidance",
        title: "Гайд по стипендиям",
        description: "Помогаю найти и подать на стипендии под твой профиль",
        price: "50.00",
        currency: "USD",
        duration_minutes: 60,
        is_active: true,
      },
    ],
  },
  {
    id: 3,
    full_name: "Ерлан Жаксыбеков",
    country: "Germany",
    school: "TU Munich",
    major: "Engineering",
    grant_or_scholarship: "DAAD",
    gpa: "3.6",
    exam_results: "IELTS 7.0, TestDaF C1",
    expertise_areas: ["admission", "visa"],
    detailed_bio: "Помогаю поступить в немецкие университеты. DAAD стипендиат.",
    linkedin_url: "",
    profile_photo: null,
    is_active: true,
    services: [
      {
        id: 4,
        service_type: "consultation_60min",
        title: "Консультация 60 минут",
        description: "Полный разбор поступления в Германию",
        price: "45.00",
        currency: "USD",
        duration_minutes: 60,
        is_active: true,
      },
    ],
  },
]

export const getMockMentor = (id: number): Mentor | undefined =>
  MOCK_MENTORS.find((m) => m.id === id)
