import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { POST } from '@/app/api/admin/auth/dev-login/route';

// Capture the admin.generateLink mock so individual tests can control it.
const mockGenerateLink = vi.fn();

vi.mock('@june/db', () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
      },
    },
  }),
}));

function makeRequest() {
  return new Request('http://localhost/api/admin/auth/dev-login', {
    method: 'POST',
  });
}

describe('POST /api/admin/auth/dev-login', () => {
  const originalBypass = process.env.DEV_AUTH_BYPASS;

  afterEach(() => {
    // Restore env after each test
    if (originalBypass === undefined) {
      delete process.env.DEV_AUTH_BYPASS;
    } else {
      process.env.DEV_AUTH_BYPASS = originalBypass;
    }
    vi.clearAllMocks();
  });

  describe('when DEV_AUTH_BYPASS is not set', () => {
    beforeEach(() => {
      delete process.env.DEV_AUTH_BYPASS;
    });

    test('returns 403', async () => {
      const res = await POST(makeRequest() as any);
      expect(res.status).toBe(403);
    });

    test('does not call generateLink', async () => {
      await POST(makeRequest() as any);
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });
  });

  describe('when DEV_AUTH_BYPASS is false', () => {
    beforeEach(() => {
      process.env.DEV_AUTH_BYPASS = 'false';
    });

    test('returns 403', async () => {
      const res = await POST(makeRequest() as any);
      expect(res.status).toBe(403);
    });
  });

  describe('when DEV_AUTH_BYPASS is true', () => {
    beforeEach(() => {
      process.env.DEV_AUTH_BYPASS = 'true';
    });

    test('redirects to the Supabase action_link when generateLink succeeds', async () => {
      mockGenerateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://supabase.example.co/auth/v1/verify?token=abc&type=magiclink',
          },
        },
        error: null,
      });

      const res = await POST(makeRequest() as any);

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(
        'https://supabase.example.co/auth/v1/verify?token=abc&type=magiclink'
      );
    });

    test('returns 500 when generateLink returns an error', async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: null },
        error: { message: 'Rate limited' },
      });

      const res = await POST(makeRequest() as any);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Rate limited');
    });

    test('calls generateLink with the dev admin email', async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: { action_link: 'https://example.com' } },
        error: null,
      });

      await POST(makeRequest() as any);

      expect(mockGenerateLink).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'georgeslieben@gmail.com', type: 'magiclink' })
      );
    });
  });
});
