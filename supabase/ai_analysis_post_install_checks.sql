-- Read-only structural checks for the optional AI-analysis persistence layer.
-- Run after 20260717180000_add_result_ai_analysis.sql with psql -v ON_ERROR_STOP=1.
BEGIN;

DO $$
DECLARE
  definition text;
BEGIN
  IF to_regclass('public.result_ai_analyses') IS NULL THEN
    RAISE EXCEPTION 'result_ai_analyses table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.result_ai_analyses'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on result_ai_analyses';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'result_ai_analyses'
      AND grantee IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'client roles have direct result_ai_analyses privileges';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'result_ai_analyses'
      AND grantee = 'service_role'
  ) THEN
    RAISE EXCEPTION 'service_role grant is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.result_ai_analyses'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%provisional%refined%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.result_ai_analyses'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%pending%completed%failed%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.result_ai_analyses'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%openai%anthropic%'
  ) THEN
    RAISE EXCEPTION 'stage, status, or provider check constraint is missing';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.result_ai_analyses'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%likely_hypocrisy%' LIMIT 1;
  -- Analysis taxonomy is JSON-schema validated by the application, not a SQL
  -- enum. This guard merely prevents accidentally moving it into a mutable
  -- client-facing database constraint.
  IF definition IS NOT NULL THEN
    RAISE EXCEPTION 'analysis taxonomy unexpectedly duplicated in a SQL check constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'result_ai_analyses'
      AND indexname = 'uq_result_ai_analysis_cache'
      AND indexdef LIKE '%WHERE (status = %completed%'
  ) THEN
    RAISE EXCEPTION 'completed cache uniqueness index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'result_ai_analyses'
      AND indexname = 'uq_result_ai_analysis_pending'
      AND indexdef LIKE '%WHERE (status = %pending%'
  ) THEN
    RAISE EXCEPTION 'single-pending uniqueness index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'result_ai_analyses'
      AND indexname = 'idx_result_ai_analyses_session_completed'
  ) THEN
    RAISE EXCEPTION 'rolling completed-generation index is missing';
  END IF;

  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'result_ai_analyses'
      AND column_name IN (
        'session_id', 'parent_analysis_id', 'stage', 'status', 'provider', 'model',
        'prompt_version', 'schema_version', 'bank_version', 'input_hash',
        'context_json', 'deterministic_signals', 'analysis_json', 'error_code',
        'input_tokens', 'output_tokens', 'latency_ms', 'provider_request_id',
        'created_at', 'completed_at'
      )
  ) <> 20 THEN
    RAISE EXCEPTION 'one or more required result_ai_analyses columns are missing';
  END IF;
END $$;

DO $$
DECLARE
  check_session text := 'ai-analysis-db-check-' || gen_random_uuid()::text;
  first_id uuid;
BEGIN
  INSERT INTO public.survey_responses(session_id, responses)
  VALUES (check_session, '{}'::jsonb);
  INSERT INTO public.survey_results(session_id) VALUES (check_session);

  BEGIN
    INSERT INTO public.result_ai_analyses(
      session_id, stage, status, provider, model, prompt_version, schema_version, input_hash
    ) VALUES (check_session, 'invalid', 'pending', 'openai', 'test', 'v1', '1', 'invalid-stage');
    RAISE EXCEPTION 'stage constraint did not reject an invalid value';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.result_ai_analyses(
    session_id, stage, status, provider, model, prompt_version, schema_version, input_hash
  ) VALUES (check_session, 'provisional', 'pending', 'openai', 'test', 'v1', '1', 'same-input')
  RETURNING id INTO first_id;

  BEGIN
    INSERT INTO public.result_ai_analyses(
      session_id, stage, status, provider, model, prompt_version, schema_version, input_hash
    ) VALUES (check_session, 'provisional', 'pending', 'openai', 'test', 'v1', '1', 'different-input');
    RAISE EXCEPTION 'pending uniqueness did not reject a concurrent row';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  UPDATE public.result_ai_analyses
  SET status = 'completed', completed_at = now()
  WHERE id = first_id;

  BEGIN
    INSERT INTO public.result_ai_analyses(
      session_id, stage, status, provider, model, prompt_version, schema_version,
      input_hash, completed_at
    ) VALUES (
      check_session, 'provisional', 'completed', 'openai', 'test', 'v1', '1',
      'same-input', now()
    );
    RAISE EXCEPTION 'cache uniqueness did not reject a duplicate completed row';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

ROLLBACK;
