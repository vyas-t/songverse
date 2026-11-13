const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

/** Best-effort per-isolate throttle. Production must also configure Cloudflare edge rate limits. */
export function rateLimit(request: Request, key: string, max: number, windowMs = 60_000): Response | null {
  const now = Date.now();
  const bucketKey = `${key}:${clientIp(request)}`;
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    if (rateBuckets.size > 5000) {
      for (const [storedKey, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(storedKey);
    }
    return null;
  }
  if (current.count >= max) {
    return json({ error: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }, 429, {
      'Retry-After': String(Math.max(1, Math.ceil((current.resetAt - now) / 1000)))
    });
  }
  current.count += 1;
  return null;
}

export async function readJson(request: Request, maxBytes = 16_384): Promise<{ value?: any; error?: Response }> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) return { error: json({ error: 'PAYLOAD_TOO_LARGE' }, 413) };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > maxBytes) return { error: json({ error: 'PAYLOAD_TOO_LARGE' }, 413) };
    return { value: JSON.parse(raw) };
  } catch {
    return { error: json({ error: 'INVALID_JSON', message: 'A valid JSON body is required.' }, 400) };
  }
}

export function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization') || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match?.[1] || null;
}
