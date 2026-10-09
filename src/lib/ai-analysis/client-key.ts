import { createHmac } from 'node:crypto'

/**
 * Stable, non-reversible key for the requester of an AI generation, used for
 * per-visitor daily caps. Vercel overwrites X-Forwarded-For with the client IP,
 * so the first entry cannot be spoofed there. Returns null when no IP or
 * secret is available; callers then rely on the global cap alone rather than
 * lumping every unknown requester into one shared bucket.
 */
export function aiAnalysisClientKey(headers: Headers, secret: string | undefined): string | null {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim()
  if (!ip || !secret) return null
  return createHmac('sha256', secret).update(`ai-analysis-client:${ip}`).digest('hex').slice(0, 32)
}
