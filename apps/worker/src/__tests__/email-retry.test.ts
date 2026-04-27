import { jest, test, expect, beforeEach } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSend = jest.fn<(...args: any[]) => any>();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

// Minimal chainable Supabase mock — typed loosely to avoid fighting the
// generated types (which are exhaustive and not worth duplicating here).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateMock = jest.fn<(...args: any[]) => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectMock = jest.fn<(...args: any[]) => any>();

jest.mock('../lib/supabase.js', () => ({
  supabase: {
    from: jest.fn().mockImplementation(() => ({
      select: selectMock,
      update: updateMock,
    })),
  },
}));

import { runEmailRetry } from '../jobs/email-retry.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const baseRow = {
  id:            'row-1',
  email_type:    'digest_summary',
  to_address:    'cs@june.energy',
  subject:       'Test digest',
  body_html:     '<p>test</p>',
  body_text:     'test',
  attachments:   [] as Array<{ filename: string; content_base64: string }>,
  failure_count: 0,
  max_failures:  3,
};

function mockQueue(rows: typeof baseRow[]) {
  selectMock.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  });
}

function mockUpdate() {
  updateMock.mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate();
});

test('marks row as sent when Resend succeeds', async () => {
  mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
  mockQueue([baseRow]);

  await runEmailRetry();

  expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
});

test('increments failure_count and keeps status pending when Resend throws below max', async () => {
  mockSend.mockRejectedValueOnce(new Error('Resend 500'));
  mockQueue([{ ...baseRow, failure_count: 1 }]);

  await runEmailRetry();

  expect(updateMock).toHaveBeenCalledWith(
    expect.objectContaining({ failure_count: 2, status: 'pending' }),
  );
});

test('sets permanent_failure when failure_count reaches max_failures', async () => {
  mockSend.mockRejectedValueOnce(new Error('Resend 500'));
  mockQueue([{ ...baseRow, failure_count: 2, max_failures: 3 }]);

  await runEmailRetry();

  expect(updateMock).toHaveBeenCalledWith(
    expect.objectContaining({ failure_count: 3, status: 'permanent_failure' }),
  );
});
