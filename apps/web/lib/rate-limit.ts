import { createServiceClient } from '@june/db';

// Postgres-backed counter via the check_rate_limit SECURITY DEFINER function
// added in 20260422191548_rate_limits.sql. Returns true if the request is
// within the limit for the key.
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open: a rate-limit infra failure should not block legit traffic.
    // Log and allow. Real incident handling in Briefing 20.
    console.error('[rate-limit] rpc failed', error);
    return true;
  }
  return data === true;
}

export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
