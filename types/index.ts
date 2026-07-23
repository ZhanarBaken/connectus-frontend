export type Role = "mentor" | "student"

export type ExpertiseArea = "admission" | "documents" | "scholarships" | "visa"

export type PayoutCategory = "consultation" | "primary_consultation" | "delivery" | "milestone" | "support"

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
  // null when is_price_negotiable is true — backend masks the stored value,
  // students only ever see "Договорная".
  price: string | null
  currency: string
  duration_minutes: number
  payout_category: PayoutCategory
  // Target audience — "useful for grades X-Y". Optional for every category.
  grade_min: number | null
  grade_max: number | null
  // SUPPORT-only fields (null for every other category).
  meetings_min: number | null
  meetings_max: number | null
  duration_months_min: number | null
  duration_months_max: number | null
  is_price_negotiable: boolean
  intro_call_enabled: boolean
  is_active: boolean
}

export interface MentorExpertise {
  area: ExpertiseArea
}

// Backend returns ISO-2 codes like "US", "DE" via django-countries.
export interface MentorCountry {
  country: string
}

export interface MentorLanguage {
  language: string
}

export interface MentorProfile {
  id: number
  full_name: string
  age: number
  countries: MentorCountry[]
  languages: MentorLanguage[]
  school_or_university: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  detailed_bio: string
  linkedin_url: string
  university_email: string
  profile_photo: string | null
  expertise_areas: MentorExpertise[]
  contacts: string
  phone: string
  payout_details: string
  graduation_year_or_current_course: string
  is_approved: boolean
  is_submitted: boolean
  is_public: boolean
  is_accepting_bookings: boolean
  is_universal: boolean
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
  languages: MentorLanguage[]
  school_or_university: string
  grant_or_scholarship: string
  major: string
  expertise_areas: MentorExpertise[]
  detailed_bio: string
  is_accepting_bookings: boolean
  is_universal: boolean
  rating_avg: number | null
  rating_count: number
}

// Matches backend MentorProfilePublicSerializer
export interface Mentor {
  id: number
  full_name: string
  countries: MentorCountry[]
  languages: MentorLanguage[]
  school_or_university: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  expertise_areas: MentorExpertise[]
  detailed_bio: string
  linkedin_url: string
  profile_photo: string | null
  is_public: boolean
  is_accepting_bookings: boolean
  is_universal: boolean
  rating_avg: number | null
  rating_count: number
  services: MentorService[]
}

export interface StudentProfile {
  id: number
  full_name: string
  date_of_birth: string | null
  age: number | null
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

// ─── CRM admin types ──────────────────────────────────────────────────────────

export interface AdminMentorProfile extends MentorProfile {
  user_email: string
  telegram_username: string
  telegram_id: string
}

export interface AdminDispute {
  id: number
  order: number
  opened_by: number
  opened_by_email: string
  reason: string
  opened_at: string
  resolution: string | null
  resolved_by: number | null
  resolved_by_email: string | null
  resolved_at: string | null
  refund_amount: string | null
}

export interface AdminConversation {
  id: number
  mentor: number
  mentor_name: string
  mentor_email: string
  student: number
  student_name: string
  student_email: string
  created_at: string
  closed_at: string | null
  last_message_at: string | null
}

export interface SiteSettings {
  id: number
  dispute_window_hours: number
  terms_text: string
  platform_rules_text: string
  data_consent_text: string
  privacy_policy_text: string
  support_url: string
  payment_account_details: string
  whatsapp_number: string
  consultation_complete_chat_message: string
  // Email: verify
  verify_email_subject: string
  verify_email_heading: string
  verify_email_body: string
  // Email: password reset
  password_reset_email_subject: string
  password_reset_email_heading: string
  password_reset_email_body: string
  // Email: consultation complete (to student)
  consultation_complete_email_subject: string
  consultation_complete_email_heading: string
  consultation_complete_email_body: string
  // Email: order created (to mentor)
  order_created_email_subject: string
  order_created_email_heading: string
  order_created_email_body: string
  // Email: order completed (to student)
  order_completed_email_subject: string
  order_completed_email_heading: string
  order_completed_email_body: string
  // Email: consultation confirmed (to student)
  consultation_confirmed_email_subject: string
  consultation_confirmed_email_heading: string
  consultation_confirmed_email_body: string
  // Email: review reply (to student)
  review_reply_email_subject: string
  review_reply_email_heading: string
  review_reply_email_body: string
  // Email: new chat message
  new_chat_message_email_subject: string
  new_chat_message_email_heading: string
  new_chat_message_email_body: string
  // Email: payment events
  payment_confirmed_email_subject: string
  payment_confirmed_email_heading: string
  payment_confirmed_email_body: string
  payment_received_email_subject: string
  payment_received_email_heading: string
  payment_received_email_body: string
  payment_rejected_email_subject: string
  payment_rejected_email_heading: string
  payment_rejected_email_body: string
  payment_expired_student_email_subject: string
  payment_expired_student_email_heading: string
  payment_expired_student_email_body: string
  payment_expired_mentor_email_subject: string
  payment_expired_mentor_email_heading: string
  payment_expired_mentor_email_body: string
  // Telegram bot messages
  bot_payment_requisites_message: string
  bot_payment_received_student: string
  bot_payment_received_mentor: string
  bot_payment_rejected_student: string
  // In-app notification titles
  notif_order_created_title: string
  notif_review_new_title: string
  notif_payment_receipt_pending_title: string
  notif_payment_confirmed_student_title: string
  notif_payment_received_mentor_title: string
  notif_payment_rejected_student_title: string
  notif_payment_expired_student_title: string
  notif_payment_expired_mentor_title: string
}
