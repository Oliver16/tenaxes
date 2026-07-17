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

  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    LEFT JOIN public.question_metadata AS metadata ON metadata.question_id = question.id
    WHERE question.bank_version = trim(p_bank_version)
      AND question.active = true
      AND (metadata.question_id IS NULL OR metadata.bank_version <> question.bank_version)
  ) THEN
    RAISE EXCEPTION 'Cannot publish a bank with missing question metadata';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    LEFT JOIN public.question_axis_links AS primary_link
      ON primary_link.question_id = question.id AND primary_link.role = 'primary'
    WHERE question.bank_version = trim(p_bank_version)
      AND question.active = true
      AND (
        primary_link.id IS NULL
        OR primary_link.axis_id <> question.axis_id
        OR primary_link.axis_key <> question.key
        OR primary_link.weight <> question.weight
      )
  ) THEN
    RAISE EXCEPTION 'Cannot publish a bank with invalid primary scoring links';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    JOIN public.question_axis_links AS link ON link.question_id = question.id
    WHERE question.bank_version = trim(p_bank_version)
      AND question.active = true
      AND link.role <> 'primary'
      AND link.axis_id = question.axis_id
  ) THEN
    RAISE EXCEPTION 'Cannot publish a bank with a cross-axis link on its primary axis';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    JOIN public.question_metadata AS metadata ON metadata.question_id = question.id
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS tradeoff_count
      FROM public.question_axis_links AS link
      WHERE link.question_id = question.id AND link.role = 'tradeoff'
    ) AS tradeoffs ON true
    WHERE question.bank_version = trim(p_bank_version)
      AND question.active = true
      AND (
        (metadata.item_family = 'collision' AND (tradeoffs.tradeoff_count <> 1 OR nullif(trim(metadata.collision_pair), '') IS NULL))
        OR (metadata.item_family <> 'collision' AND tradeoffs.tradeoff_count > 0)
      )
  ) THEN
    RAISE EXCEPTION 'Cannot publish a bank with inconsistent collision metadata or tradeoff links';
  END IF;

  UPDATE public.question_bank_versions
  SET status = 'archived'
  WHERE status = 'published' AND id <> trim(p_bank_version);

  UPDATE public.question_bank_versions
  SET status = 'published'
  WHERE id = trim(p_bank_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_question_configuration(
  p_question_id bigint,
  p_axis_id text,
  p_key integer,
  p_text text,
  p_educational_content text,
  p_display_order integer,
  p_active boolean,
  p_weight numeric,
  p_question_type text,
  p_bank_version text,
  p_metadata jsonb,
  p_axis_links jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_id bigint;
  current_bank_version text;
  resolved_order integer;
  link jsonb;
BEGIN
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN
    RAISE EXCEPTION 'Question metadata is required';
  END IF;
  IF p_axis_links IS NULL OR jsonb_typeof(p_axis_links) <> 'array' THEN
    RAISE EXCEPTION 'Question axis links must be an array';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.question_bank_versions
    WHERE id = p_bank_version AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Only draft question banks can be edited';
  END IF;

  IF p_question_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.question_bank_versions WHERE id = p_bank_version) THEN
      RAISE EXCEPTION 'Question bank version does not exist';
    END IF;
    resolved_order := p_display_order;
    IF resolved_order IS NULL THEN
      SELECT coalesce(max(display_order), 0) + 1 INTO resolved_order
      FROM public.questions
      WHERE bank_version = p_bank_version;
    END IF;

    INSERT INTO public.questions (
      axis_id, key, text, educational_content, display_order, active,
      weight, question_type, bank_version
    ) VALUES (
      p_axis_id, p_key, trim(p_text), nullif(trim(p_educational_content), ''),
      resolved_order, p_active, p_weight, p_question_type, p_bank_version
    ) RETURNING id INTO saved_id;
  ELSE
    SELECT bank_version INTO current_bank_version
    FROM public.questions
    WHERE id = p_question_id
    FOR UPDATE;
    IF current_bank_version IS NULL THEN
      RAISE EXCEPTION 'Question does not exist';
    END IF;
    IF current_bank_version <> p_bank_version THEN
      RAISE EXCEPTION 'Questions cannot be moved between bank versions';
    END IF;

    UPDATE public.questions
    SET axis_id = p_axis_id,
        key = p_key,
        text = trim(p_text),
        educational_content = nullif(trim(p_educational_content), ''),
        display_order = coalesce(p_display_order, display_order),
        active = p_active,
        weight = p_weight,
        question_type = p_question_type,
        updated_at = now()
    WHERE id = p_question_id
    RETURNING id INTO saved_id;
  END IF;

  INSERT INTO public.question_metadata (
    question_id, bank_version, policy_domain, latent_conflict, actor_level,
    policy_instrument, scenario_conditions, item_family, collision_pair
  ) VALUES (
    saved_id,
    p_bank_version,
    trim(p_metadata->>'policy_domain'),
    nullif(trim(p_metadata->>'latent_conflict'), ''),
    nullif(trim(p_metadata->>'actor_level'), ''),
    nullif(trim(p_metadata->>'policy_instrument'), ''),
    nullif(trim(p_metadata->>'scenario_conditions'), ''),
    p_metadata->>'item_family',
    nullif(trim(p_metadata->>'collision_pair'), '')
  )
  ON CONFLICT (question_id) DO UPDATE SET
    bank_version = EXCLUDED.bank_version,
    policy_domain = EXCLUDED.policy_domain,
    latent_conflict = EXCLUDED.latent_conflict,
    actor_level = EXCLUDED.actor_level,
    policy_instrument = EXCLUDED.policy_instrument,
    scenario_conditions = EXCLUDED.scenario_conditions,
    item_family = EXCLUDED.item_family,
    collision_pair = EXCLUDED.collision_pair;

  DELETE FROM public.question_axis_links
  WHERE question_id = saved_id AND role <> 'primary';

  FOR link IN SELECT value FROM jsonb_array_elements(p_axis_links)
  LOOP
    INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight)
    VALUES (
      saved_id,
      link->>'axis_id',
      link->>'role',
      (link->>'axis_key')::integer,
      (link->>'weight')::numeric
    );
  END LOOP;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_question_bank_version(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clone_question_bank_version(text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.publish_question_bank_version(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_question_bank_version(text) TO service_role;
REVOKE ALL ON FUNCTION public.save_question_configuration(bigint, text, integer, text, text, integer, boolean, numeric, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_question_configuration(bigint, text, integer, text, text, integer, boolean, numeric, text, text, jsonb, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.refresh_question_bank_version_counts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_question_bank_version_counts(text) TO service_role;

COMMIT;
