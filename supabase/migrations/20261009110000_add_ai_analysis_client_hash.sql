-- =====================================================
-- AI analysis daily caps: requester key column
--
-- Apply BEFORE deploying the app version that enforces the per-visitor and
-- global daily caps (it writes and filters on client_hash). Purely additive;
-- the currently deployed app ignores the column. Idempotent.
-- =====================================================
BEGIN;

-- client_hash is an HMAC of the requester's IP
-- (never the raw address); rows from before this migration have NULL.
ALTER TABLE public.result_ai_analyses ADD COLUMN IF NOT EXISTS client_hash text;
CREATE INDEX IF NOT EXISTS idx_result_ai_analyses_created
  ON public.result_ai_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_ai_analyses_client_created
  ON public.result_ai_analyses (client_hash, created_at DESC)
  WHERE client_hash IS NOT NULL;

COMMIT;
