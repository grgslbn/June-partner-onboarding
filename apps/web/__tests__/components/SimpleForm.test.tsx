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

// ── modules under test ────────────────────────────────────────────────────
import SimpleForm from '@/components/public/SimpleForm';
import HeroRepPicker from '@/components/public/HeroRepPicker';

const PARTNER = { id: 'p1', name: 'IHPO', tcUrl: null };
const SHOP = { id: 's1', qr_token: 'demo-shop-brussels' };
const REP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ confirmationId: 'JUN-001' }) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, rep: { id: string } | null = null) {
  // Advance time past MIN_FILL_MS (1500ms) so the bot-speed guard doesn't fire.
  vi.useFakeTimers({ now: Date.now() - 2000 });
  render(
    <SimpleForm partner={PARTNER} shop={SHOP} rep={rep} locale="fr" slug="ihpo" />,
  );
  vi.useRealTimers();
  await user.type(screen.getByLabelText(/firstName/i), 'Alice');
  await user.type(screen.getByLabelText(/lastName/i), 'Dupont');
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await act(async () => { await user.click(screen.getByRole('checkbox')); });
  expect(screen.getByRole('button', { name: /submitButton/i })).toBeEnabled();
  await act(async () => { await user.click(screen.getByRole('button', { name: /submitButton/i })); });
}

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

  it('button enables on first checkbox tick when a rep is pre-selected', async () => {
    const user = userEvent.setup();
    render(
      <SimpleForm partner={PARTNER} shop={SHOP} rep={{ id: REP_ID }} locale="fr" slug="ihpo" />,
    );

    await user.type(screen.getByLabelText(/firstName/i), 'Alice');
    await user.type(screen.getByLabelText(/lastName/i), 'Dupont');
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');

    await act(async () => { await user.click(screen.getByRole('checkbox')); });

    expect(screen.getByRole('button', { name: /submitButton/i })).toBeEnabled();
  });
});

describe('SimpleForm — submit body', () => {
  it('submits salesRepId as uuid when rep is provided', async () => {
    fetchMock.mockClear();
    const user = userEvent.setup();
    await fillAndSubmit(user, { id: REP_ID });

    const [url, init] = fetchMock.mock.calls.find((args: unknown[]) => args[0] === '/api/leads') ?? [];
    expect(url).toBe('/api/leads');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.salesRepId).toBe(REP_ID);
    expect(body.tcAccepted).toBe(true);
  });

  it('submits salesRepId as null when no rep is selected', async () => {
    fetchMock.mockClear();
    const user = userEvent.setup();
    await fillAndSubmit(user, null);

    const [url, init] = fetchMock.mock.calls.find((args: unknown[]) => args[0] === '/api/leads') ?? [];
    expect(url).toBe('/api/leads');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.salesRepId).toBeNull();
    expect(body.tcAccepted).toBe(true);
  });
});

describe('HeroRepPicker — controlled/uncontrolled', () => {
  it('never warns about switching from uncontrolled to controlled', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSelect = vi.fn();
    const reps = [{ id: REP_ID, display_name: 'Alice' }];

    const { rerender } = render(
      <HeroRepPicker
        reps={reps}
        selectedId={null}
        onSelect={onSelect}
        labels={{ placeholder: 'Pick a rep', selected: (n) => n }}
      />,
    );
    rerender(
      <HeroRepPicker
        reps={reps}
        selectedId={REP_ID}
        onSelect={onSelect}
        labels={{ placeholder: 'Pick a rep', selected: (n) => n }}
      />,
    );

    const controlled = consoleSpy.mock.calls.some(([msg]) =>
      typeof msg === 'string' && msg.includes('uncontrolled'),
    );
    expect(controlled).toBe(false);
    consoleSpy.mockRestore();
  });
});
