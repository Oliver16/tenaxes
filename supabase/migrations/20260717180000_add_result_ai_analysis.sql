-- Persist validated, provider-generated interpretations of bank-pinned results.
-- Rows are private to server-side routes: RLS is enabled with no client policies.
BEGIN;

CREATE TABLE public.result_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL
    REFERENCES public.survey_results(session_id)
    ON DELETE CASCADE,

  parent_analysis_id uuid
    REFERENCES public.result_ai_analyses(id)
    ON DELETE SET NULL,

  user_id uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  stage text NOT NULL
    CHECK (stage IN ('provisional', 'refined')),

  status text NOT NULL
    CHECK (status IN ('pending', 'completed', 'failed')),

  provider text NOT NULL
    CHECK (provider IN ('openai', 'anthropic')),

  model text NOT NULL,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  bank_version text,

  input_hash text NOT NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  deterministic_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis_json jsonb,

  error_code text,
  error_message text,

  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  provider_request_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_result_ai_analyses_session_created
  ON public.result_ai_analyses(session_id, created_at DESC);

CREATE INDEX idx_result_ai_analyses_status
  ON public.result_ai_analyses(status);

CREATE INDEX idx_result_ai_analyses_session_completed
  ON public.result_ai_analyses(session_id, completed_at DESC)
  WHERE status = 'completed';

CREATE UNIQUE INDEX uq_result_ai_analysis_cache
  ON public.result_ai_analyses(
    session_id,
    input_hash,
    provider,
    model,
    prompt_version,
    schema_version
  )
  WHERE status = 'completed';

-- Only one provider request may be in flight for a result at a time.
CREATE UNIQUE INDEX uq_result_ai_analysis_pending
  ON public.result_ai_analyses(session_id)
  WHERE status = 'pending';

ALTER TABLE public.result_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Defense in depth: access is exclusively through service-role server routes.
-- Deliberately do not create SELECT/INSERT/UPDATE/DELETE RLS policies.
REVOKE ALL ON TABLE public.result_ai_analyses FROM anon, authenticated;
GRANT ALL ON TABLE public.result_ai_analyses TO service_role;

COMMIT;
