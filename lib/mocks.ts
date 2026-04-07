import { MentorCard, MentorService, Order, StudentProfile } from "@/types"

// ─── Mock data — replace with real API calls when backend is ready ───────────
// Formats match current backend API

const mockServices: Record<number, MentorService[]> = {
  1: [
    {
      id: 1,
      title: "Консультация 30 минут",
      description: "Разбираем твою ситуацию и составляем план поступления",
      price: "30.00",
      currency: "USD",
      duration_minutes: 30,
      payout_category: "consultation",
      is_active: true,
    },
    {
      id: 2,
      title: "Проверка документов",
      description: "Проверяю и правлю essay, CV, рекомендательные письма",
      price: "80.00",
      currency: "USD",
      duration_minutes: 60,
      payout_category: "delivery",
      is_active: true,
    },
  ],
  2: [
    {
      id: 3,
      title: "Гайд по стипендиям",
      description: "Помогаю найти и подать на стипендии под твой профиль",
      price: "50.00",
      currency: "USD",
      duration_minutes: 60,
      payout_category: "consultation",
      is_active: true,
    },
  ],
  3: [
    {
      id: 4,
      title: "Консультация 60 минут",
      description: "Полный разбор поступления в Германию",
      price: "45.00",
      currency: "USD",
      duration_minutes: 60,
      payout_category: "consultation",
      is_active: true,
    },
  ],
}

export const MOCK_MENTORS: MentorCard[] = [
  {
    id: 1,
    full_name: "Назгуль Ахметова",
    country: "USA",
    school_or_university: "MIT",
    major: "Computer Science",
    grant_or_scholarship: "Болашак",
    expertise_areas: [{ area: "admission" }, { area: "scholarships" }],
    detailed_bio: "Помогаю поступить в топ университеты США. Прошла путь от НИШ до MIT.",
    profile_photo: null,
    is_verified: true,
    is_accepting_bookings: true,
  },
  {
    id: 2,
    full_name: "Айдана Сейткали",
    country: "UK",
    school_or_university: "University of Edinburgh",
    major: "Economics",
    grant_or_scholarship: "Chevening",
    expertise_areas: [{ area: "scholarships" }, { area: "visa" }, { area: "documents" }],
    detailed_bio: "Chevening scholar. Помогаю с грантами и визой в Великобританию.",
    profile_photo: null,
    is_verified: true,
    is_accepting_bookings: true,
  },
  {
    id: 3,
    full_name: "Ерлан Жаксыбеков",
    country: "Germany",
    school_or_university: "TU Munich",
    major: "Engineering",
    grant_or_scholarship: "DAAD",
    expertise_areas: [{ area: "admission" }, { area: "visa" }],
    detailed_bio: "Помогаю поступить в немецкие университеты. DAAD стипендиат.",
    profile_photo: null,
    is_verified: false,
    is_accepting_bookings: true,
  },
]

export const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Айгерим Бекова", current_school_or_university: "НИШ Алматы" },
    mentor: 1,
    mentor_email: "nazgul@example.com",
    mentor_service: 1,
    service_title: "Консультация 30 минут",
    total_price: "30.00",
    platform_fee: "4.50",
    mentor_payout_amount: "25.50",
    payment_status: "unpaid",
    order_status: "pending_payment",
    payment_instructions: {
      account_details: "Kaspi: +7 777 123 45 67, Иван Иванов",
      whatsapp_link: "https://wa.me/77771234567?text=Order 1 receipt",
    },
    conversation_id: null,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  },
  {
    id: 2,
    student: 1,
    student_info: { id: 1, full_name: "Айгерим Бекова", current_school_or_university: "НИШ Алматы" },
    mentor: 2,
    mentor_email: "aidana@example.com",
    mentor_service: 3,
    service_title: "Гайд по стипендиям",
    total_price: "50.00",
    platform_fee: "7.50",
    mentor_payout_amount: "42.50",
    payment_status: "paid",
    order_status: "in_progress",
    payment_instructions: null,
    conversation_id: null,
    created_at: "2026-03-20T14:00:00Z",
    updated_at: "2026-03-20T14:00:00Z",
  },
]

export const MOCK_STUDENT_PROFILE: StudentProfile = {
  id: 1,
  full_name: "Айгерим Бекова",
  age: 18,
  current_school_or_university: "НИШ Алматы",
}

export const getMockMentor = (id: number): MentorCard | undefined =>
  MOCK_MENTORS.find((m) => m.id === id)

export const getMockServices = (mentorId: number): MentorService[] =>
  mockServices[mentorId] ?? []
