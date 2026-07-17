import { createHash } from 'node:crypto'

const OMITTED_KEYS = new Set(['created_at', 'completed_at', 'updated_at', 'session_id', 'provider_request_id'])

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !OMITTED_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonicalize(item)]))
  }
  return value
}

export function hashAnalysisInput(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}
