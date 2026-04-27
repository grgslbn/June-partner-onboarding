import { Resend } from 'resend';
import { supabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const DIGEST_FROM = `June Energy <digests@pos.june-energy.app>`;
const CONFIRM_FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@pos.june-energy.app';

type QueueRow = {
  id: string;
  email_type: string;
  to_address: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  attachments: Array<{ filename: string; content_base64: string }>;
  failure_count: number;
  max_failures: number;
};

export async function runEmailRetry(): Promise<void> {
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('email_send_queue')
    .select('id, email_type, to_address, subject, body_html, body_text, attachments, failure_count, max_failures')
    .eq('status', 'pending')
    .lt('next_retry_at', now)
    .limit(50);

  if (error) {
    console.error('[email-retry] fetch failed', error.message);
    return;
  }
  if (!rows || rows.length === 0) return;

  for (const row of rows as QueueRow[]) {
    try {
      const isDigest = row.email_type === 'digest_partner' || row.email_type === 'digest_summary';
      const from = isDigest ? DIGEST_FROM : CONFIRM_FROM;

      const attachments = (row.attachments ?? []).map((a) => ({
        filename: a.filename,
        content:  Buffer.from(a.content_base64, 'base64'),
      }));

      await resend.emails.send({
        from,
        to:      row.to_address,
        subject: row.subject,
        html:    row.body_html ?? '',
        text:    row.body_text ?? undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      await supabase
        .from('email_send_queue')
        .update({ status: 'sent' })
        .eq('id', row.id);

    } catch (err) {
      const newCount = row.failure_count + 1;
      const permanent = newCount >= row.max_failures;
      // Exponential backoff: 5m, 10m, 20m, 40m
      const backoffMs = Math.min(5 * 60 * 1000 * Math.pow(2, newCount - 1), 40 * 60 * 1000);
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from('email_send_queue')
        .update({
          failure_count: newCount,
          last_error:    String(err),
          status:        permanent ? 'permanent_failure' : 'pending',
          next_retry_at: permanent ? undefined : nextRetry,
        })
        .eq('id', row.id);

      if (permanent) {
        console.error(JSON.stringify({
          job: 'email-retry',
          event: 'permanent_failure',
          queue_id: row.id,
          email_type: row.email_type,
          to: row.to_address,
          error: String(err),
        }));
      }
    }
  }
}
