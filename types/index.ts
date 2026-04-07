export type Role = "mentor" | "student"

export type ExpertiseArea = "admission" | "documents" | "scholarships" | "visa"

export type PayoutCategory = "consultation" | "delivery" | "milestone"

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

export interface MentorProfile {
  id: number
  full_name: string
  country: string
  school_or_university: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  detailed_bio: string
  linkedin_url: string
  profile_photo: string | null
  expertise_areas: MentorExpertise[]
  contacts: string
  payout_details: string
  graduation_year_or_current_course: string
  university_email: string
  is_approved: boolean
  is_verified: boolean
  is_submitted: boolean
  is_public: boolean
  is_accepting_bookings: boolean
  created_at: string
  updated_at: string
}

export interface MentorCard {
  id: number
  profile_photo: string | null
  full_name: string
  country: string
  school_or_university: string
  grant_or_scholarship: string
  major: string
  expertise_areas: MentorExpertise[]
  detailed_bio: string
  is_verified: boolean
  is_accepting_bookings: boolean
}

// Matches backend MentorProfilePublicSerializer
export interface Mentor {
  id: number
  full_name: string
  country: string
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
  services: MentorService[]
}

export interface StudentProfile {
  id: number
  full_name: string
  age: number
  current_school_or_university: string
}

export interface PaymentInstructions {
  account_details: string
  whatsapp_link: string
}

export interface OrderStudentInfo {
  id: number
  full_name: string
  current_school_or_university: string
}

export interface Order {
  id: number
  student: number
  student_info: OrderStudentInfo
  mentor: number
  mentor_email: string
  mentor_service: number
  service_title: string
  total_price: string
  platform_fee: string
  mentor_payout_amount: string
  payment_status: PaymentStatus
  order_status: OrderStatus
  payment_instructions: PaymentInstructions | null
  conversation_id: number | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  sender: number
  sender_email: string
  text: string
  created_at: string
}
