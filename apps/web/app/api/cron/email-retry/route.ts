import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@june/db';

const DIGEST_FROM  = 'June Energy <digests@pos.june-energy.app>';
const CONFIRM_FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@pos.june-energy.app';
const CS_FROM      = 'June POS — Nouveau lead <noreply@pos.june-energy.app>';

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('email_send_queue')
    .select('id, email_type, to_address, subject, body_html, body_text, attachments, failure_count, max_failures')
    .eq('status', 'pending')
    .lt('next_retry_at', now)
    .limit(50);

  if (error) {
    console.error('[cron/email-retry] fetch failed', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows as QueueRow[]) {
    try {
      const isDigest = row.email_type === 'digest_partner' || row.email_type === 'digest_summary';
      const from = isDigest ? DIGEST_FROM
        : row.email_type === 'june_cs_lead' ? CS_FROM
        : CONFIRM_FROM;

      const attachments = (row.attachments ?? []).map((a) => ({
        filename: a.filename,
        content:  Buffer.from(a.content_base64, 'base64'),
      }));

      await resend.emails.send({
        from,
        to:      row.to_address,
        subject: row.subject,
        html:    row.body_html ?? undefined,
        text:    row.body_text ?? undefined,
        ...(attachments.length > 0 ? { attachments } : {}),
      });

      await supabase
        .from('email_send_queue')
        .update({ status: 'sent' })
        .eq('id', row.id);

      sent++;

    } catch (err) {
      const newCount = row.failure_count + 1;
      const permanent = newCount >= row.max_failures;
      const backoffMs = Math.min(5 * 60 * 1000 * Math.pow(2, newCount - 1), 40 * 60 * 1000);
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from('email_send_queue')
        .update({
          failure_count: newCount,
          last_error:    String(err),
          status:        permanent ? 'permanent_failure' : 'pending',
          ...(permanent ? {} : { next_retry_at: nextRetry }),
        })
        .eq('id', row.id);

      console.error('[cron/email-retry]', permanent ? 'permanent_failure' : 'retry', {
        id: row.id,
        email_type: row.email_type,
        to: row.to_address,
        error: String(err),
      });

      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
