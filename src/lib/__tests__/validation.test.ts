import {
  PropertySchema,
  UserSchema,
  ProjectSchema,
  PropertyFormSchema,
  LoginFormSchema,
  SignupFormSchema,
  SearchFiltersSchema,
  validateProperty,
  validateUser,
  validateProject,
  validatePropertyForm,
  validateLoginForm,
  validateSignupForm,
  validateSearchFilters,
  safeValidate
} from '../validation';

describe('Schema Validation', () => {
  describe('PropertySchema', () => {
    it('should validate valid property data', () => {
      const validProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Beautiful Apartment',
        description: 'A nice place to live',
        price: 100000,
        location: 'Santo Domingo',
        images: ['https://example.com/image.jpg'],
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'Apartamento',
        currency: 'USD',
        address: 'Calle 123',
        bedrooms: 2,
        bathrooms: 1,
        area: 80,
        features: ['Parking', 'Garden'],
        inserted_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const result = PropertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('should reject invalid property data', () => {
      const invalidProperty = {
        id: 'invalid-uuid',
        title: '', // Too short
        price: -100, // Negative price
        location: 'SD', // Too short
        images: ['not-a-url'],
        owner_id: 'invalid-owner-id'
      };

      const result = PropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(6); // Should have multiple validation errors
    });
  });

  describe('UserSchema', () => {
    it('should validate valid user data', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        bio: 'A real estate professional',
        role: 'vendedor_agente' as const,
        avatar_url: 'https://example.com/avatar.jpg',
        subscription_active: true,
        rating: 4.5,
        reviews_count: 10,
        inserted_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should validate partial user data', () => {
      const partialUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      const result = UserSchema.safeParse(partialUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid user data', () => {
      const invalidUser = {
        id: 'invalid-uuid',
        email: 'not-an-email',
        name: 'A', // Too short
        role: 'invalid-role'
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('PropertyFormSchema', () => {
    it('should validate valid form data', () => {
      const validForm = {
        title: 'Beautiful Apartment',
        description: 'A nice place to live',
        price: 100000,
        location: 'Santo Domingo',
        type: 'Apartamento',
        currency: 'USD',
        address: 'Calle 123',
        bedrooms: 2,
        bathrooms: 1,
        area: 80,
        features: ['Parking', 'Garden']
      };

      const result = PropertyFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it('should reject invalid form data', () => {
      const invalidForm = {
        title: 'Hi', // Too short
        price: 0, // Must be positive
        location: 'SD' // Too short
      };

      const result = PropertyFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
    });
  });

  describe('LoginFormSchema', () => {
    it('should validate valid login data', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = LoginFormSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject invalid login data', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: '123' // Too short
      };

      const result = LoginFormSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('SignupFormSchema', () => {
    it('should validate valid signup data', () => {
      const validSignup = {
        name: 'John Doe',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'comprador' as const
      };

      const result = SignupFormSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('should reject weak passwords', () => {
      const weakPassword = {
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password', // No uppercase, no number
        role: 'comprador' as const
      };

      const result = SignupFormSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchFiltersSchema', () => {
    it('should validate valid search filters', () => {
      const validFilters = {
        query: 'apartment',
        minPrice: 50000,
        maxPrice: 200000,
        location: 'Santo Domingo',
        type: 'Apartamento',
        bedrooms: 2,
        bathrooms: 1
      };

      const result = SearchFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid price range', () => {
      const invalidFilters = {
        minPrice: 200000,
        maxPrice: 50000 // min > max
      };

      const result = SearchFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Helper Functions', () => {
  describe('validateProperty', () => {
    it('should return success for valid data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Property',
        price: 100000,
        location: 'Test Location',
        images: [],
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        inserted_at: '2023-01-01T00:00:00Z'
      };

      const result = validateProperty(validData);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid data', () => {
      const result = validateProperty({ invalid: 'data' });
      expect(result.success).toBe(false);
    });
  });

  describe('safeValidate', () => {
    it('should handle successful validation', () => {
      const result = safeValidate(PropertyFormSchema, {
        title: 'Test',
        price: 1000,
        location: 'Test'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('title', 'Test');
      }
    });

    it('should handle validation errors gracefully', () => {
      const result = safeValidate(PropertyFormSchema, { invalid: 'data' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle unexpected errors', () => {
      // Mock a schema that throws
      const mockSchema = {
        safeParse: () => { throw new Error('Unexpected error'); }
      };

      const result = safeValidate(mockSchema as any, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Validation failed unexpectedly');
      }
    });
  });
});