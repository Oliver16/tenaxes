-- Add an atomic, service-role-only workflow for creating a new question-bank
-- revision from an existing pinned version.

BEGIN;

ALTER TABLE public.question_bank_versions
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.question_bank_versions SET status = 'archived';
UPDATE public.question_bank_versions
SET status = 'published'
WHERE id = (
  SELECT id FROM public.question_bank_versions
  ORDER BY created_at DESC NULLS LAST, id DESC
  LIMIT 1
);

ALTER TABLE public.question_bank_versions
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.question_bank_versions
  DROP CONSTRAINT IF EXISTS question_bank_versions_status_check;
ALTER TABLE public.question_bank_versions
  ADD CONSTRAINT question_bank_versions_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS one_published_question_bank
  ON public.question_bank_versions ((status))
  WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.refresh_question_bank_version_counts(p_bank_version text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.question_bank_versions AS version
  SET question_count = (
        SELECT count(*)::integer
        FROM public.questions AS question
        WHERE question.bank_version = p_bank_version
      ),
      collision_count = (
        SELECT count(*)::integer
        FROM public.question_axis_links AS link
        JOIN public.questions AS question ON question.id = link.question_id
        WHERE question.bank_version = p_bank_version
          AND link.role = 'tradeoff'
      )
  WHERE version.id = p_bank_version;
$$;

CREATE OR REPLACE FUNCTION public.sync_question_bank_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_version text;
  new_version text;
BEGIN
  IF TG_TABLE_NAME = 'questions' THEN
    old_version := CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN OLD.bank_version ELSE NULL END;
    new_version := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.bank_version ELSE NULL END;

    IF TG_OP IN ('DELETE', 'UPDATE') AND (TG_OP = 'DELETE' OR old_version IS DISTINCT FROM new_version) THEN
      UPDATE public.question_bank_versions
      SET question_count = greatest(0, question_count - 1)
      WHERE id = old_version;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR old_version IS DISTINCT FROM new_version) THEN
      UPDATE public.question_bank_versions
      SET question_count = question_count + 1
      WHERE id = new_version;
    END IF;
    IF TG_OP = 'DELETE' THEN
      PERFORM public.refresh_question_bank_version_counts(old_version);
    ELSIF TG_OP = 'UPDATE' AND old_version IS DISTINCT FROM new_version THEN
      PERFORM public.refresh_question_bank_version_counts(old_version);
      PERFORM public.refresh_question_bank_version_counts(new_version);
    END IF;
  ELSE
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
      SELECT bank_version INTO old_version FROM public.questions WHERE id = OLD.question_id;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      SELECT bank_version INTO new_version FROM public.questions WHERE id = NEW.question_id;
    END IF;

    IF TG_OP IN ('DELETE', 'UPDATE') THEN
      IF OLD.role = 'tradeoff' AND old_version IS NOT NULL THEN
        UPDATE public.question_bank_versions
        SET collision_count = greatest(0, collision_count - 1)
        WHERE id = old_version;
      END IF;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      IF NEW.role = 'tradeoff' AND new_version IS NOT NULL THEN
        UPDATE public.question_bank_versions
        SET collision_count = collision_count + 1
        WHERE id = new_version;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_question_counts_from_questions ON public.questions;
CREATE TRIGGER sync_question_counts_from_questions
AFTER INSERT OR DELETE OR UPDATE OF bank_version ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.sync_question_bank_counts();

DROP TRIGGER IF EXISTS sync_question_counts_from_links ON public.question_axis_links;
CREATE TRIGGER sync_question_counts_from_links
AFTER INSERT OR DELETE OR UPDATE OF question_id, role ON public.question_axis_links
FOR EACH ROW EXECUTE FUNCTION public.sync_question_bank_counts();

CREATE OR REPLACE FUNCTION public.sync_question_primary_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.question_axis_links
  WHERE question_id = NEW.id AND role = 'primary';

  INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight)
  VALUES (NEW.id, NEW.axis_id, 'primary', NEW.key, NEW.weight);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_question_primary_link_from_question ON public.questions;
CREATE TRIGGER sync_question_primary_link_from_question
AFTER INSERT OR UPDATE OF axis_id, key, weight ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.sync_question_primary_link();

CREATE OR REPLACE FUNCTION public.clone_question_bank_version(
  p_source_version text,
  p_new_version text,
  p_name text,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_question public.questions%ROWTYPE;
  new_question_id bigint;
  cloned_count integer := 0;
BEGIN
  IF nullif(trim(p_source_version), '') IS NULL
     OR nullif(trim(p_new_version), '') IS NULL
     OR nullif(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Source version, new version, and name are required';
  END IF;
  IF p_source_version = p_new_version THEN
    RAISE EXCEPTION 'New version must differ from source version';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.question_bank_versions WHERE id = p_source_version) THEN
    RAISE EXCEPTION 'Source question bank does not exist';
  END IF;
  IF EXISTS (SELECT 1 FROM public.question_bank_versions WHERE id = p_new_version) THEN
    RAISE EXCEPTION 'Question bank version already exists';
  END IF;

  INSERT INTO public.question_bank_versions (id, name, notes, question_count, collision_count, status)
  VALUES (trim(p_new_version), trim(p_name), nullif(trim(p_notes), ''), 0, 0, 'draft');

  FOR source_question IN
    SELECT * FROM public.questions
    WHERE bank_version = p_source_version
    ORDER BY display_order
  LOOP
    INSERT INTO public.questions (
      axis_id, key, text, educational_content, display_order, active,
      weight, question_type, bank_version
    ) VALUES (
      source_question.axis_id, source_question.key, source_question.text,
      source_question.educational_content, source_question.display_order,
      source_question.active, source_question.weight,
      source_question.question_type, trim(p_new_version)
    ) RETURNING id INTO new_question_id;

    INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight)
    SELECT new_question_id, axis_id, role, axis_key, weight
    FROM public.question_axis_links
    WHERE question_id = source_question.id AND role <> 'primary';

    INSERT INTO public.question_metadata (
      question_id, bank_version, policy_domain, latent_conflict, actor_level,
      policy_instrument, scenario_conditions, item_family, collision_pair
    )
    SELECT new_question_id, trim(p_new_version), policy_domain, latent_conflict,
      actor_level, policy_instrument, scenario_conditions, item_family, collision_pair
    FROM public.question_metadata
    WHERE question_id = source_question.id;

    cloned_count := cloned_count + 1;
  END LOOP;

  PERFORM public.refresh_question_bank_version_counts(trim(p_new_version));
  RETURN cloned_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_question_bank_version(p_bank_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.question_bank_versions WHERE id = trim(p_bank_version)
  ) THEN
    RAISE EXCEPTION 'Question bank version does not exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE bank_version = trim(p_bank_version) AND active = true
  ) THEN
    RAISE EXCEPTION 'Cannot publish a bank with no active questions';
  END IF;

  UPDATE public.question_bank_versions
  SET status = 'archived'
  WHERE status = 'published' AND id <> trim(p_bank_version);

  UPDATE public.question_bank_versions
  SET status = 'published'
  WHERE id = trim(p_bank_version);
END;
$$;

REVOKE ALL ON FUNCTION public.clone_question_bank_version(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clone_question_bank_version(text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.publish_question_bank_version(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_question_bank_version(text) TO service_role;
REVOKE ALL ON FUNCTION public.refresh_question_bank_version_counts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_question_bank_version_counts(text) TO service_role;

COMMIT;
