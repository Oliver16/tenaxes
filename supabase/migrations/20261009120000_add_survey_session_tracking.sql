-- Track in-progress survey sittings so admins can see which questions get
-- skipped, left blank, or are where people give up. Completed submissions
-- only ever contained fully-answered response sets, so none of this was
-- recoverable from survey_responses. Rows hold question ids only (never
-- answer values) and are private to service-role server routes.
BEGIN;

CREATE TABLE public.survey_sessions (
  client_session_id text PRIMARY KEY
    CHECK (client_session_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  bank_version text NOT NULL
    REFERENCES public.question_bank_versions(id),
  question_count integer NOT NULL DEFAULT 0,
  answered_ids integer[] NOT NULL DEFAULT '{}',
  not_sure_ids integer[] NOT NULL DEFAULT '{}',
  skipped_ids integer[] NOT NULL DEFAULT '{}',
  viewed_ids integer[] NOT NULL DEFAULT '{}',
  last_question_id integer,
  result_session_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_survey_sessions_bank_activity
  ON public.survey_sessions(bank_version, last_activity_at DESC);

ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;

-- Defense in depth: access is exclusively through service-role server routes.
-- Deliberately do not create SELECT/INSERT/UPDATE/DELETE RLS policies.
REVOKE ALL ON TABLE public.survey_sessions FROM anon, authenticated;
GRANT ALL ON TABLE public.survey_sessions TO service_role;

COMMIT;
