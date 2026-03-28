export type Role = "mentor" | "student"

export type ExpertiseArea = "admission" | "documents" | "scholarships" | "visa"

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
}

export interface MentorService {
  id: number
  service_type: string
  title: string
  description: string
  price: string
  currency: string
  duration_minutes: number
  is_active: boolean
}

export interface Mentor {
  id: number
  full_name: string
  country: string
  school: string
  major: string
  grant_or_scholarship: string
  gpa: string
  exam_results: string
  expertise_areas: ExpertiseArea[]
  detailed_bio: string
  linkedin_url: string
  profile_photo: string | null
  is_active: boolean
  services: MentorService[]
}

export interface StudentProfile {
  id: number
  full_name: string
  age: number
  current_school: string
  target_country: string
  target_major: string
  goals: string
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
  messages_remaining: number  // до 5, потом нужна оплата
}

export interface Order {
  id: number
  mentor_service: number
  total_price: string
  platform_fee: string
  mentor_payout_amount: string
  payment_status: PaymentStatus
  order_status: OrderStatus
  created_at: string
}
