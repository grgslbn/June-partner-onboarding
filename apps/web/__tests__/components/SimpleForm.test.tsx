// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// ── external deps SimpleForm pulls in ──────────────────────────────────────
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

// ── module under test ──────────────────────────────────────────────────────
import SimpleForm from '@/components/public/SimpleForm';

const PARTNER = { id: 'p1', name: 'IHPO', tcUrl: null };
const SHOP = { id: 's1', qr_token: 'demo-shop-brussels' };

beforeAll(() => {
  // jsdom doesn't implement fetch; stub it so form submission doesn't throw
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('SimpleForm — T&C checkbox / submit button integration', () => {
  it('submit button is disabled when form is empty', async () => {
    render(
      <SimpleForm partner={PARTNER} shop={SHOP} rep={null} locale="fr" slug="ihpo" />,
    );
    expect(screen.getByRole('button', { name: /submitButton/i })).toBeDisabled();
  });

  it('submit button enables immediately after filling all fields and ticking checkbox once', async () => {
    const user = userEvent.setup();
    render(
      <SimpleForm partner={PARTNER} shop={SHOP} rep={null} locale="fr" slug="ihpo" />,
    );

    await user.type(screen.getByLabelText(/firstName/i), 'Alice');
    await user.type(screen.getByLabelText(/lastName/i), 'Dupont');
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');

    const checkbox = screen.getByRole('checkbox');
    await act(async () => { await user.click(checkbox); });

    expect(screen.getByRole('button', { name: /submitButton/i })).toBeEnabled();
  });

  it('submit button disables again when checkbox is unticked', async () => {
    const user = userEvent.setup();
    render(
      <SimpleForm partner={PARTNER} shop={SHOP} rep={null} locale="fr" slug="ihpo" />,
    );

    await user.type(screen.getByLabelText(/firstName/i), 'Alice');
    await user.type(screen.getByLabelText(/lastName/i), 'Dupont');
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');

    const checkbox = screen.getByRole('checkbox');
    await act(async () => { await user.click(checkbox); });
    expect(screen.getByRole('button', { name: /submitButton/i })).toBeEnabled();

    await act(async () => { await user.click(checkbox); });
    expect(screen.getByRole('button', { name: /submitButton/i })).toBeDisabled();
  });
});
