import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { discountCodeSchema } from '@/lib/discount-code-schema';

export const metadata = { title: 'New discount code — June CMS' };

export default async function NewDiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId } = await params;

  const supabase = createServiceClient();
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name')
    .eq('id', partnerId)
    .single();

  if (!partner) notFound();

  async function createDiscount(formData: FormData): Promise<{ error: string } | never> {
    'use server';

    const raw = {
      code:      (formData.get('code') as string | null)?.trim().toUpperCase() ?? '',
      type:      formData.get('type') as string | null,
      amount:    Number(formData.get('amount')),
      valid_from: (formData.get('valid_from') as string | null) || null,
      valid_to:   (formData.get('valid_to') as string | null) || null,
      max_uses:   formData.get('max_uses') ? Number(formData.get('max_uses')) : null,
      active:     formData.get('active') === 'on',
    };

    const parsed = discountCodeSchema.safeParse(raw);
    if (!parsed.success) {
      // Server-side re-validation failure — return generic error; client validation
      // should prevent this in normal usage.
      return { error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const svc = createServiceClient();
    const { data, error } = await svc
      .from('discount_codes')
      .insert({
        partner_id: partnerId,
        code:       parsed.data.code,
        type:       parsed.data.type,
        amount:     parsed.data.amount,
        valid_from: parsed.data.valid_from ?? null,
        valid_to:   parsed.data.valid_to ?? null,
        max_uses:   parsed.data.max_uses ?? null,
        active:     parsed.data.active,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: `A code named "${parsed.data.code}" already exists for this partner.` };
      }
      return { error: 'Failed to create code. Please try again.' };
    }

    redirect(`/admin/partners/${partnerId}/discounts`);
    return { error: '' }; // unreachable, satisfies return type
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/discounts`} className="hover:text-gray-700">Discount codes</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">New</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">New discount code</h1>

        <DiscountForm partnerId={partnerId} action={createDiscount} />
      </div>
    </main>
  );
}

// Client form is in a separate component so Server Actions compose cleanly.
// Import inline to keep the page self-contained for this route.
import { DiscountForm } from '@/components/cms/DiscountForm';
