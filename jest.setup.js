import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Extend Jest matchers
import { jest } from '@jest/globals';

// Add custom matchers for better testing
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined;
    if (pass) {
      return {
        message: () => `expected ${received} not to be in the document`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be in the document`,
        pass: false,
      };
    }
  },
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Supabase client
jest.mock('./src/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

// Global test utilities
global.testUtils = {
  createMockProperty: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Property',
    description: 'A test property',
    price: 100000,
    location: 'Test Location',
    images: ['https://example.com/image.jpg'],
    owner_id: '123e4567-e89b-12d3-a456-426614174001',
    type: 'Apartamento',
    inserted_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  createMockUser: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'comprador',
    inserted_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),
};
