// Stub — Briefing 07 replaces this with a real Resend send + React Email template.
// Called fire-and-forget from /api/leads. Never throws into the caller's path.

export async function sendConfirmationEmail(
  leadId: string,
  partnerId: string,
): Promise<void> {
  console.info('[send-confirmation stub]', { leadId, partnerId });
}
