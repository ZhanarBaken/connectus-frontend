export type Role = "mentor" | "student"

export type ExpertiseArea = "admission" | "documents" | "scholarships" | "visa"

export type PayoutCategory = "consultation" | "primary_consultation" | "delivery" | "milestone"

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "in_progress"
  | "completed"
  | "disputed"
  | "payout_pending"
  | "paid_out"
  | "cancelled"

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded"

export interface User {
  id: number
  email: string
  role: Role
  email_verified: boolean
  has_telegram: boolean
  telegram_username: string | null
  has_google: boolean
  google_email_at_signup: string | null
  // True for accounts with a usable password (set via /password/set/
  // or the email/password signup flow). False for TG-only or
  // Google-only users — the settings UI uses this to switch the
  // password button between "Установить" and "Изменить".
  has_password: boolean
  created_at: string
}

export interface MentorService {
  id: number
  title: string
  description: string
  price: string
  currency: string
  duration_minutes: number
  payout_category: PayoutCategory
  is_active: boolean
}

export interface MentorExpertise {
  area: ExpertiseArea
}

// Backend returns ISO-2 codes like "US", "DE" via django-countries.
export interface MentorCountry {
  country: string
}

export interface MentorProfile {
  id: number
  full_name: string
  age: number
  countries: MentorCountry[]
  school_or_university: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  detailed_bio: string
  consultation: string
  linkedin_url: string
  university_email: string
  profile_photo: string | null
  expertise_areas: MentorExpertise[]
  contacts: string
  payout_details: string
  graduation_year_or_current_course: string
  is_approved: boolean
  is_submitted: boolean
  is_public: boolean
  is_accepting_bookings: boolean
  is_banned: boolean
  ban_reason: string
  has_documents: boolean
  rating_avg: number | null
  rating_count: number
  created_at: string
  updated_at: string
}

export interface MentorCard {
  id: number
  profile_photo: string | null
  full_name: string
  countries: MentorCountry[]
  school_or_university: string
  grant_or_scholarship: string
  major: string
  expertise_areas: MentorExpertise[]
  detailed_bio: string
  is_accepting_bookings: boolean
  rating_avg: number | null
  rating_count: number
  // Primary consultation price/duration. Null when the mentor hasn't
  // got an auto-created consultation yet (legacy rows / race during signup).
  consultation_price: string | null
  consultation_duration_minutes: number | null
}

// Matches backend MentorProfilePublicSerializer
export interface Mentor {
  id: number
  full_name: string
  countries: MentorCountry[]
  school_or_university: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  expertise_areas: MentorExpertise[]
  detailed_bio: string
  // null when the mentor is not accepting bookings — frontend should hide the section
  consultation: string | null
  linkedin_url: string
  profile_photo: string | null
  is_public: boolean
  is_accepting_bookings: boolean
  rating_avg: number | null
  rating_count: number
  services: MentorService[]
}

export interface StudentProfile {
  id: number
  full_name: string
  age: number
  current_school_or_university: string
  contacts: string
  // Pre-consultation context the mentor reads before booking. The
  // first three are required in the form; the last four are optional.
  school_grade: string
  city: string
  school_graduation_year: number | null
  desired_major: string
  desired_countries: string
  exam_results: string
  gpa: string
  profile_photo: string | null
  is_public: boolean
  // Welcome promo: 50% off every primary_consultation order created in
  // the first 30 days after signup. Mentor still receives their full
  // 50% share — platform absorbs the discount from its own commission.
  welcome_bonus_available: boolean
  welcome_bonus_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentInstructions {
  account_details: string
  whatsapp_link: string
  // True when the student has a Telegram account linked and the bot
  // already DM'd the same requisites. UI shows a hint, not a hard hide.
  tg_sent_to_user: boolean
}

export interface OrderStudentInfo {
  id: number
  full_name: string
  current_school_or_university: string
  profile_photo: string | null
}

export interface Order {
  id: number
  student: number
  student_info: OrderStudentInfo
  mentor: number
  mentor_service: number
  service_title: string
  payout_category: PayoutCategory
  // Full price of the service at order time. Equals total_price when no
  // bonus was applied; otherwise total_price = subtotal - bonus_applied.
  subtotal: string
  bonus_applied: string
  total_price: string
  platform_fee: string
  mentor_payout_amount: string
  payment_status: PaymentStatus
  order_status: OrderStatus
  payment_instructions: PaymentInstructions | null
  conversation_id: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Dispute {
  id: number
  order: number
  reason: string
  opened_at: string
  resolution: string | null
}

export interface OrderDocument {
  id: number
  // 'general' for any working file; 'payment_receipt' for student-
  // submitted proof of payment on a PENDING_PAYMENT order.
  kind: "general" | "payment_receipt"
  original_filename: string
  content_type: string
  size_bytes: number
  description: string
  download_url: string
  uploaded_by_email: string
  uploaded_at: string
}

export interface ChatAttachment {
  id: number
  original_filename: string
  content_type: string
  size_bytes: number
  download_url: string
}

export interface ChatMessage {
  id: number
  sender: number | null
  sender_email: string | null
  is_system?: boolean
  text: string
  created_at: string
  attachments?: ChatAttachment[]
}
