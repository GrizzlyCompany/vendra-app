import { z } from 'zod';

// Base validation schemas
export const PropertySchema = z.object({
  id: z.string().uuid('Invalid property ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().nullable().optional(),
  price: z.number().positive('Price must be positive').max(999999999, 'Price is too high'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location is too long'),
  images: z.array(z.string().url('Invalid image URL')).nullable(),
  owner_id: z.string().uuid('Invalid owner ID'),
  type: z.string().nullable().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD').optional(),
  address: z.string().nullable().optional(),
  bedrooms: z.number().int().positive().nullable().optional(),
  bathrooms: z.number().int().positive().nullable().optional(),
  area: z.number().positive().nullable().optional(),
  features: z.array(z.string()).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  inserted_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

export const UserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long').nullable().optional(),
  bio: z.string().max(500, 'Bio is too long').nullable().optional(),
  role: z.enum(['comprador', 'vendedor_agente', 'empresa_constructora'], {
    message: 'Invalid user role'
  }).nullable().optional(),
  avatar_url: z.string().url('Invalid avatar URL').nullable().optional(),
  subscription_active: z.boolean().default(false).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviews_count: z.number().int().min(0).nullable().optional(),
  // Company fields
  rnc: z.string().max(20, 'RNC is too long').nullable().optional(),
  website: z.string().url('Invalid website URL').nullable().optional(),
  headquarters_address: z.string().max(300, 'Address is too long').nullable().optional(),
  operational_areas: z.array(z.string().max(100, 'Area name is too long')).nullable().optional(),
  contact_person: z.string().max(150, 'Contact person name is too long').nullable().optional(),
  primary_phone: z.string().max(20, 'Phone number is too long').nullable().optional(),
  secondary_phone: z.string().max(20, 'Phone number is too long').nullable().optional(),
  legal_documents: z.array(z.string().url('Invalid document URL')).nullable().optional(),
  inserted_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
  project_name: z.string().min(3, 'Project name must be at least 3 characters').max(100, 'Project name is too long'),
  description_title: z.string().max(100, 'Description title is too long').nullable().optional(),
  short_description: z.string().max(500, 'Short description is too long').nullable().optional(),
  category: z.string().max(50, 'Category is too long').nullable().optional(),
  address: z.string().max(200, 'Address is too long').nullable().optional(),
  city_province: z.string().max(100, 'City/Province is too long').nullable().optional(),
  zone_sector: z.string().max(100, 'Zone/Sector is too long').nullable().optional(),
  project_status: z.string().max(50, 'Project status is too long').nullable().optional(),
  delivery_date: z.string().max(20, 'Delivery date is too long').nullable().optional(),
  units_count: z.number().int().positive().max(10000, 'Too many units').nullable().optional(),
  floors: z.number().int().positive().max(100, 'Too many floors').nullable().optional(),
  land_size: z.number().positive().max(1000000, 'Land size is too large').nullable().optional(),
  built_areas: z.number().positive().max(1000000, 'Built area is too large').nullable().optional(),
  unit_types: z.string().max(200, 'Unit types is too long').nullable().optional(),
  size_range: z.string().max(100, 'Size range is too long').nullable().optional(),
  price_range: z.string().max(100, 'Price range is too long').nullable().optional(),
  quantity_per_type: z.string().max(200, 'Quantity per type is too long').nullable().optional(),
  amenities: z.array(z.string().max(100, 'Amenity name is too long')).max(50, 'Too many amenities').nullable().optional(),
  images: z.array(z.string().url('Invalid image URL')).max(20, 'Too many images').nullable(),
  promo_video: z.string().url('Invalid video URL').nullable().optional(),
  plans: z.array(z.string().url('Invalid plan URL')).max(10, 'Too many plans').nullable(),
  unit_price_range: z.string().max(100, 'Unit price range is too long').nullable().optional(),
  payment_methods: z.string().max(200, 'Payment methods is too long').nullable().optional(),
  partner_bank: z.string().max(100, 'Partner bank is too long').nullable().optional(),
  owner_id: z.string().uuid('Invalid owner ID'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// Form validation schemas
export const PropertyFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  price: z.number().positive('Price must be positive').max(999999999, 'Price is too high'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location is too long'),
  type: z.string().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD').optional(),
  address: z.string().max(200, 'Address is too long').optional(),
  bedrooms: z.number().int().positive().max(20, 'Too many bedrooms').optional(),
  bathrooms: z.number().int().positive().max(20, 'Too many bathrooms').optional(),
  area: z.number().positive().max(10000, 'Area is too large').optional(),
  features: z.array(z.string().max(50, 'Feature name is too long')).max(20, 'Too many features').optional(),
});

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['comprador', 'vendedor_agente', 'empresa_constructora'], {
    message: 'Please select a valid role'
  }),
});

export const SearchFiltersSchema = z.object({
  query: z.string().max(100, 'Search query is too long').optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  location: z.string().max(100, 'Location is too long').optional(),
  type: z.string().max(50, 'Type is too long').optional(),
  bedrooms: z.number().int().positive().max(20).optional(),
  bathrooms: z.number().int().positive().max(20).optional(),
}).refine(data => {
  if (data.minPrice && data.maxPrice) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: 'Minimum price cannot be greater than maximum price',
  path: ['minPrice']
});

export const CompanyProfileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(1000, 'Bio is too long').optional(),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  logo_url: z.string().optional(),
  // Company fields
  rnc: z.string().min(1, 'RNC is required').max(20, 'RNC is too long'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  headquarters_address: z.string().max(300, 'Address is too long').optional(),
  operational_areas: z.string().optional(), // Will be processed into array
  contact_person: z.string().max(150, 'Contact person name is too long').optional(),
  primary_phone: z.string().max(20, 'Phone number is too long').optional(),
  secondary_phone: z.string().max(20, 'Phone number is too long').optional(),
  legal_documents: z.array(z.string().url('Invalid document URL')).optional(),
  banner_url: z.string().optional(),
  // Social media
  facebook_url: z.string().url('Invalid Facebook URL').optional().or(z.literal('')),
  instagram_url: z.string().url('Invalid Instagram URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  // Terms acceptance
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos y condiciones'
  }),
}).refine(data => {
  // Custom validation: require RNC for empresa_constructora users only
  // This will be checked at the component level based on user role
  return true;
}, {
  message: 'RNC is required for construction companies',
  path: ['rnc']
});

// API Response validation
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: z.string().nullable(),
    loading: z.boolean(),
  });

// Export types inferred from schemas
export type PropertyFormData = z.infer<typeof PropertyFormSchema>;
export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type SignupFormData = z.infer<typeof SignupFormSchema>;
export type SearchFiltersData = z.infer<typeof SearchFiltersSchema>;
export type CompanyProfileFormData = z.infer<typeof CompanyProfileFormSchema>;

// Validation helper functions
export const validateProperty = (data: unknown) => PropertySchema.safeParse(data);
export const validateUser = (data: unknown) => UserSchema.safeParse(data);
export const validateProject = (data: unknown) => ProjectSchema.safeParse(data);
export const validatePropertyForm = (data: unknown) => PropertyFormSchema.safeParse(data);
export const validateLoginForm = (data: unknown) => LoginFormSchema.safeParse(data);
export const validateSignupForm = (data: unknown) => SignupFormSchema.safeParse(data);
export const validateSearchFilters = (data: unknown) => SearchFiltersSchema.safeParse(data);
export const validateCompanyProfileForm = (data: unknown) => CompanyProfileFormSchema.safeParse(data);

// Safe validation wrapper for runtime data
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context = 'Data validation'
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      console.warn(`${context} failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error(`${context} error:`, error);
    return { success: false, error: 'Validation failed unexpectedly' };
  }
}
