import { syncUserRole, getUserRole } from '../roleUtils';

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
      upsert: jest.fn(() => ({
        onConflict: jest.fn(),
      })),
    })),
  },
}));

describe('roleUtils', () => {
  const { supabase } = require('@/lib/supabase/client');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return role from auth metadata when available', async () => {
      const mockAuthUser = {
        data: {
          user: {
            user_metadata: {
              role: 'empresa_constructora',
            },
          },
        },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockAuthUser);

      const result = await getUserRole('test-user-id');
      expect(result).toBe('empresa_constructora');
    });

    it('should return role from database when auth metadata is not available', async () => {
      const mockAuthUser = {
        data: {
          user: {
            user_metadata: {},
          },
        },
      };

      const mockDbUser = {
        data: {
          role: 'vendedor_agente',
        },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (supabase.from().select().eq().maybeSingle as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await getUserRole('test-user-id');
      expect(result).toBe('vendedor_agente');
    });

    it('should return null when no role is found', async () => {
      const mockAuthUser = {
        data: {
          user: {
            user_metadata: {},
          },
        },
      };

      const mockDbUser = {
        data: null,
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (supabase.from().select().eq().maybeSingle as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await getUserRole('test-user-id');
      expect(result).toBeNull();
    });
  });

  describe('syncUserRole', () => {
    it('should sync role from auth metadata to database when they differ', async () => {
      const mockAuthUser = {
        data: {
          user: {
            user_metadata: {
              role: 'empresa_constructora',
            },
          },
        },
      };

      const mockDbUser = {
        data: {
          role: 'comprador',
        },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (supabase.from().select().eq().maybeSingle as jest.Mock).mockResolvedValue(mockDbUser);
      (supabase.from().upsert as jest.Mock).mockResolvedValue({ error: null });

      const result = await syncUserRole('test-user-id');
      expect(result).toBe('empresa_constructora');
      expect(supabase.from().upsert).toHaveBeenCalledWith(
        { id: 'test-user-id', role: 'empresa_constructora' },
        { onConflict: 'id' }
      );
    });

    it('should not sync when roles are the same', async () => {
      const mockAuthUser = {
        data: {
          user: {
            user_metadata: {
              role: 'empresa_constructora',
            },
          },
        },
      };

      const mockDbUser = {
        data: {
          role: 'empresa_constructora',
        },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (supabase.from().select().eq().maybeSingle as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await syncUserRole('test-user-id');
      expect(result).toBe('empresa_constructora');
      expect(supabase.from().upsert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const result = await syncUserRole('test-user-id');
      expect(result).toBeNull();
    });
  });
});