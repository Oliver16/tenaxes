-- Make full question configuration editable as one transaction and prevent
-- incomplete scoring/metadata records from being published.

BEGIN;

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

REVOKE ALL ON FUNCTION public.save_question_configuration(bigint, text, integer, text, text, integer, boolean, numeric, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_question_configuration(bigint, text, integer, text, text, integer, boolean, numeric, text, text, jsonb, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.publish_question_bank_version(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_question_bank_version(text) TO service_role;

COMMIT;
