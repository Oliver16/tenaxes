-- =====================================================
-- Lock down survey data
--
-- Apply AFTER deploying the app version that reads and writes results through
-- the server-side service-role client (src/lib/supabase-admin.ts). Older app
-- code reads results with the public anon key and would stop working.
--
-- 1. survey_results / survey_responses can no longer be listed, read, or
--    written with the public anon key. Result pages load by exact session ID
--    on the server; signed-in users can still read their own rows.
-- 2. link_result_to_user / get_user_results act only for the calling user.
-- 3. Aggregate views over survey data (which bypass RLS) are server-only.
--
-- Idempotent: safe to run more than once.
-- =====================================================
BEGIN;

-- 1. Replace every policy on the two survey tables with an explicit set.
-- Production databases have been provisioned from different historical
-- scripts, so drop whatever exists rather than relying on policy names.
DO $$
DECLARE
  policy record;
BEGIN
  FOR policy IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('survey_results', 'survey_responses')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy.policyname, policy.schemaname, policy.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results" ON public.survey_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can read own responses" ON public.survey_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all responses" ON public.survey_responses
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Writes happen only in server routes using the service role.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.survey_results FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.survey_responses FROM anon, authenticated;

-- 2. Result-ownership RPCs: the caller can only act as themselves.
CREATE OR REPLACE FUNCTION public.link_result_to_user(p_session_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Results can only be linked to your own account'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.survey_results
  SET user_id = auth.uid()
  WHERE session_id = p_session_id
    AND (user_id IS NULL OR user_id = auth.uid());

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_results(p_user_id uuid)
RETURNS TABLE(id uuid, session_id text, core_axes jsonb, facets jsonb, top_flavors jsonb, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.session_id, r.core_axes, r.facets, r.top_flavors, r.created_at
  FROM public.survey_results r
  WHERE r.user_id = auth.uid()
    AND p_user_id = auth.uid()
  ORDER BY r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.link_result_to_user(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_result_to_user(text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_user_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_results(uuid) TO authenticated, service_role;

-- 3. Views run with their owner's rights and so bypass RLS. Nothing in the
-- app reads these through the public API.
REVOKE ALL ON TABLE public.aggregate_scores FROM anon, authenticated;
REVOKE ALL ON TABLE public.daily_responses FROM anon, authenticated;
REVOKE ALL ON TABLE public.popular_flavors FROM anon, authenticated;

COMMIT;
