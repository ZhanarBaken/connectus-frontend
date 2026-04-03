export type Role = "mentor" | "student"

export type ExpertiseArea = "admission" | "documents" | "scholarships" | "visa"

export type PayoutCategory = "consultation" | "delivery" | "milestone"

export type OrderStatus =
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
}

export interface MentorService {
  id: number
  title: string
  description: string
  price: string
  currency: string
  duration_minutes: number
  payout_category: PayoutCategory
  is_consultation: boolean
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
  is_active: boolean
  is_verified: boolean
  is_accepting_bookings: boolean
  services: MentorService[]
}

export interface StudentProfile {
  id: number
  full_name: string
  age: number
  current_school: string
}

export interface ChatMessage {
  id: number
  sender_id: number
  sender_role: Role
  content: string
  created_at: string
}

export interface ChatInquiry {
  messages: ChatMessage[]
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
  mentor_service: number
  service_title: string
  student_info: OrderStudentInfo
  mentor_email: string
  total_price: string
  platform_fee: string
  mentor_payout_amount: string
  payment_status: PaymentStatus
  order_status: OrderStatus
  payment_instructions: PaymentInstructions | null
  created_at: string
}
