import { z } from 'zod';
import { 
  PropertySchema, 
  UserSchema, 
  ProjectSchema,
  PropertyFormSchema,
  SearchFiltersSchema
} from '@/lib/validation';

// Use Zod-inferred types for runtime safety
export type Property = z.infer<typeof PropertySchema>;
export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type PropertyFormData = z.infer<typeof PropertyFormSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// User roles
export type UserRole = 'comprador' | 'vendedor_agente' | 'empresa_constructora';

// Dashboard types
export interface DashboardItem {
  id: string;
  title: string;
  location: string;
  images: string[] | null;
  price?: number | null;
  priceRangeText?: string | null;
  createdAt?: string | null;
  source: "property" | "project";
}

// Auth types
export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}

// Toast types
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  updated_at: string;
}

// Review types
export interface Review {
  id: string;
  target_user_id: string;
  author_user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

// Seller Application types
export interface SellerApplication {
  id: string;
  user_id: string;
  full_name?: string | null;
  id_document_type?: string | null;
  id_document_number?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  role_choice?: 'agente_inmobiliario' | 'vendedor_particular';
  company_name?: string | null;
  company_tax_id?: string | null;
  license_number?: string | null;
  job_title?: string | null;
  owner_relation?: string | null;
  ownership_proof_url?: string | null;
  doc_front_url?: string | null;
  doc_back_url?: string | null;
  selfie_url?: string | null;
  terms_accepted: boolean;
  confirm_truth: boolean;
  linkedin_url?: string | null;
  website_url?: string | null;
  social_urls?: string[] | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'needs_more_info';
  reviewer_id?: string | null;
  review_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}
