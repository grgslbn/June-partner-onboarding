import { supabase } from './supabase.js';

type EmailType = 'confirmation' | 'digest_partner' | 'digest_summary' | 'stripe_redirect_backup';

type QueueEntry = {
  email_type: EmailType;
  to_address: string;
  subject: string;
  body_html?: string;
  body_text?: string;
  attachments?: Array<{ filename: string; content_base64: string }>;
  lead_id?: string;
  max_failures?: number;
};

export async function enqueue(entry: QueueEntry): Promise<void> {
  const { error } = await supabase.from('email_send_queue').insert({
    email_type:   entry.email_type,
    to_address:   entry.to_address,
    subject:      entry.subject,
    body_html:    entry.body_html ?? null,
    body_text:    entry.body_text ?? null,
    attachments:  entry.attachments ?? [],
    lead_id:      entry.lead_id ?? null,
    max_failures: entry.max_failures ?? 5,
    status:       'pending',
    next_retry_at: new Date().toISOString(),
  });
  if (error) throw new Error(`[queue] insert failed: ${error.message}`);
}
