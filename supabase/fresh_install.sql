BEGIN;

-- =====================================================
-- POLYAXIS FRESH INSTALL - 300 QUESTION COMPREHENSIVE BANK
--
-- Complete database setup for a NEW Supabase project.
-- Includes 18 clean ideological constructs, 300 active questions,
-- 48 deliberate collision scenarios across 24 mirrored axis pairs,
-- semantic coverage metadata, audit views, auth/profile support,
-- RLS policies, roles, responses, and results.
--
-- Run once in the Supabase SQL Editor on a new project.
-- This file replaces all prior schema, seed, and migration files.
-- =====================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: get_user_results(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_results(p_user_id uuid) RETURNS TABLE(id uuid, session_id text, core_axes jsonb, facets jsonb, top_flavors jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.session_id,
    r.core_axes,
    r.facets,
    r.top_flavors,
    r.created_at
  FROM survey_results r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$;


--
-- Name: get_user_roles(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_roles(user_id uuid) RETURNS TABLE(role_id text, role_name text, role_description text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, r.description
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(user_id uuid, role_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id AND r.id = role_name
  );
END;
$$;


--
-- Name: link_result_to_user(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_result_to_user(p_session_id text, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE survey_results
  SET user_id = p_user_id
  WHERE session_id = p_session_id
    AND (user_id IS NULL OR user_id = p_user_id);

  RETURN FOUND;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: question_bank_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_bank_versions (
    id text NOT NULL,
    name text NOT NULL,
    notes text,
    question_count integer NOT NULL,
    collision_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: survey_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    bank_version text DEFAULT 'v2.1'::text NOT NULL,
    core_axes jsonb,
    facets jsonb,
    top_flavors jsonb,
    scores jsonb,
    conceptual_scores jsonb,
    applied_scores jsonb,
    collision_pairs jsonb,
    responses jsonb,
    response_coverage jsonb,
    not_sure_count integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: aggregate_scores; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.aggregate_scores AS
 SELECT survey_results.bank_version,
    (axis.value ->> 'axis_id'::text) AS axis_id,
    (axis.value ->> 'name'::text) AS axis_name,
    avg(((axis.value ->> 'score'::text))::double precision) AS avg_score,
    stddev(((axis.value ->> 'score'::text))::double precision) AS std_dev,
    count(*) AS sample_size
   FROM public.survey_results,
    LATERAL jsonb_array_elements(survey_results.core_axes) axis(value)
  GROUP BY survey_results.bank_version,
    (axis.value ->> 'axis_id'::text),
    (axis.value ->> 'name'::text);

--
-- Name: axes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    pole_negative text NOT NULL,
    pole_positive text NOT NULL,
    family text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT axes_family_check CHECK ((family = ANY (ARRAY['core'::text, 'facet'::text])))
);


--
-- Name: question_axis_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_axis_links (
    id bigint NOT NULL,
    question_id bigint NOT NULL,
    axis_id text NOT NULL,
    role text NOT NULL,
    axis_key integer NOT NULL,
    weight numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT question_axis_links_axis_key_check CHECK ((axis_key = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT question_axis_links_role_check CHECK ((role = ANY (ARRAY['primary'::text, 'secondary'::text, 'tradeoff'::text])))
);


--
-- Name: TABLE question_axis_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_axis_links IS 'Multi-axis links. primary: the measured axis (full question weight). secondary: reinforcing cross-loading (capped scoring contribution, no tension info). tradeoff: the scenario prices this axis''s value against the primary (feeds tension analysis, excluded from axis scores). axis_key is always the direction agreement pushes the axis.';


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id bigint NOT NULL,
    axis_id text NOT NULL,
    key integer NOT NULL,
    text text NOT NULL,
    educational_content text,
    display_order integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    weight numeric(4,2) DEFAULT 1.0 NOT NULL,
    question_type text DEFAULT 'conceptual'::text NOT NULL,
    bank_version text DEFAULT 'v2.1'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT questions_key_check CHECK ((key = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['conceptual'::text, 'applied'::text]))),
    CONSTRAINT questions_bank_order_unique UNIQUE (bank_version, display_order)
);


--
-- Name: TABLE questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questions IS 'Comprehensive Polyaxis bank: 300 questions across 18 constructs, including 48 deliberate collision scenarios.';


--
-- Name: question_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_metadata (
    question_id bigint NOT NULL,
    bank_version text NOT NULL,
    policy_domain text NOT NULL,
    latent_conflict text,
    actor_level text,
    policy_instrument text,
    scenario_conditions text,
    item_family text NOT NULL,
    collision_pair text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT question_metadata_item_family_check CHECK ((item_family = ANY (ARRAY['base'::text, 'collision'::text])))
);

COMMENT ON TABLE public.question_metadata IS 'Semantic tags for coverage auditing, adaptive form assembly, and deliberate collision-scenario analysis.';


--
-- Name: axis_collision_matrix; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.axis_collision_matrix AS
 SELECT LEAST(p.axis_id, t.axis_id) AS axis_a,
    GREATEST(p.axis_id, t.axis_id) AS axis_b,
        CASE
            WHEN (p.axis_key = t.axis_key) THEN 1
            ELSE '-1'::integer
        END AS signature,
    count(*) AS tradeoff_questions
   FROM ((public.questions q
     JOIN public.question_axis_links p ON (((p.question_id = q.id) AND (p.role = 'primary'::text))))
     JOIN public.question_axis_links t ON (((t.question_id = q.id) AND (t.role = 'tradeoff'::text))))
  WHERE (q.active = true)
  GROUP BY LEAST(p.axis_id, t.axis_id), GREATEST(p.axis_id, t.axis_id),
        CASE
            WHEN (p.axis_key = t.axis_key) THEN 1
            ELSE '-1'::integer
        END
  ORDER BY (count(*)) DESC;


--
-- Name: VIEW axis_collision_matrix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.axis_collision_matrix IS 'Unordered axis pairs with genuine tradeoff questions, grouped by pole signature (1 = agreement pushes both axes toward same-sign poles).';


--
-- Name: axis_weight_audit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.axis_weight_audit AS
 SELECT l.axis_id,
    count(*) FILTER (WHERE (l.role = 'primary'::text)) AS primary_count,
    sum(l.weight) FILTER (WHERE (l.role = 'primary'::text)) AS primary_weight_sum,
    count(*) FILTER (WHERE (l.role = 'secondary'::text)) AS secondary_count,
    sum(l.weight) FILTER (WHERE (l.role = 'secondary'::text)) AS secondary_weight_sum,
    count(*) FILTER (WHERE (l.role = 'tradeoff'::text)) AS tradeoff_count,
    sum(l.weight) FILTER (WHERE (l.role = 'tradeoff'::text)) AS tradeoff_weight_sum
   FROM (public.question_axis_links l
     JOIN public.questions ON ((questions.id = l.question_id)))
  WHERE (questions.active = true)
  GROUP BY l.axis_id
  ORDER BY l.axis_id;


--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    bank_version text DEFAULT 'v2.1'::text NOT NULL,
    responses jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    question_order integer[]
);


--
-- Name: COLUMN survey_responses.question_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.survey_responses.question_order IS 'Array of question IDs in the order they were presented to the user. Used for per-user randomization analysis and reproducibility.';


--
-- Name: daily_responses; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_responses AS
 SELECT date(created_at) AS date,
    count(*) AS count
   FROM public.survey_responses
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;


--
-- Name: popular_flavors; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.popular_flavors AS
 SELECT (flavor.value ->> 'name'::text) AS flavor_name,
    count(*) AS count,
    avg(((flavor.value ->> 'affinity'::text))::double precision) AS avg_affinity
   FROM public.survey_results,
    LATERAL jsonb_array_elements(survey_results.top_flavors) flavor(value)
  GROUP BY (flavor.value ->> 'name'::text)
  ORDER BY (count(*)) DESC;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    is_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with application-specific data. Auto-created via trigger on user signup.';


--
-- Name: question_axis_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_axis_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_axis_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_axis_links_id_seq OWNED BY public.question_axis_links.id;


--
-- Name: questions_by_axis; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.questions_by_axis AS
 SELECT axis_id,
    count(*) FILTER (WHERE (active = true)) AS active_count,
    count(*) FILTER (WHERE (active = false)) AS inactive_count,
    count(*) AS total_count
   FROM public.questions
  GROUP BY axis_id
  ORDER BY axis_id;


--
-- Name: axis_pole_balance_audit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.axis_pole_balance_audit AS
 SELECT q.axis_id,
    count(*) FILTER (WHERE q.key = '-1'::integer) AS negative_primary,
    count(*) FILTER (WHERE q.key = 1) AS positive_primary,
    count(*) FILTER (WHERE q.question_type = 'conceptual'::text AND q.key = '-1'::integer) AS conceptual_negative,
    count(*) FILTER (WHERE q.question_type = 'conceptual'::text AND q.key = 1) AS conceptual_positive,
    count(*) FILTER (WHERE q.question_type = 'applied'::text AND q.key = '-1'::integer) AS applied_negative,
    count(*) FILTER (WHERE q.question_type = 'applied'::text AND q.key = 1) AS applied_positive,
    count(*) FILTER (WHERE m.item_family = 'collision'::text AND q.key = '-1'::integer) AS collision_negative,
    count(*) FILTER (WHERE m.item_family = 'collision'::text AND q.key = 1) AS collision_positive
   FROM public.questions q
     LEFT JOIN public.question_metadata m ON m.question_id = q.id
  WHERE q.active = true
  GROUP BY q.axis_id
  ORDER BY q.axis_id;


--
-- Name: policy_domain_coverage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.policy_domain_coverage AS
 SELECT m.policy_domain,
    count(*) AS question_count,
    count(*) FILTER (WHERE q.question_type = 'applied'::text) AS applied_count,
    count(DISTINCT q.axis_id) AS primary_axes,
    count(*) FILTER (WHERE m.item_family = 'collision'::text) AS collision_count
   FROM public.question_metadata m
     JOIN public.questions q ON q.id = m.question_id
  WHERE q.active = true
  GROUP BY m.policy_domain
  ORDER BY count(*) DESC, m.policy_domain;


--
-- Name: collision_pair_coverage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.collision_pair_coverage AS
 SELECT LEAST(p.axis_id, t.axis_id) AS axis_a,
    GREATEST(p.axis_id, t.axis_id) AS axis_b,
    count(*) AS scenario_count,
    count(*) FILTER (WHERE p.axis_key = t.axis_key) AS same_sign_count,
    count(*) FILTER (WHERE p.axis_key <> t.axis_key) AS opposite_sign_count
   FROM public.question_axis_links p
     JOIN public.question_axis_links t ON t.question_id = p.question_id AND t.role = 'tradeoff'::text
     JOIN public.questions q ON q.id = p.question_id
  WHERE p.role = 'primary'::text AND q.active = true
  GROUP BY LEAST(p.axis_id, t.axis_id), GREATEST(p.axis_id, t.axis_id)
  ORDER BY LEAST(p.axis_id, t.axis_id), GREATEST(p.axis_id, t.axis_id);



--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: question_axis_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_axis_links ALTER COLUMN id SET DEFAULT nextval('public.question_axis_links_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Data for Name: question_bank_versions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.question_bank_versions (id, name, notes, question_count, collision_count) VALUES
    ('v2.1', 'Polyaxis v2.1 — Comprehension Revision', '18 constructs; 300 questions; technical concepts retained with plain-language restatements; 152 explicit assumptions; 48 deliberate collision scenarios across 24 mirrored pairs.', 300, 48); 108 conceptual anchors; 144 single-axis applied scenarios; 48 deliberate collision scenarios across 24 mirrored pairs.', 300, 48);


--
-- Data for Name: axes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.axes (id, name, description, pole_negative, pole_positive, family) VALUES
    ('C1', 'Economic Coordination', 'Whether production, investment, and essential services should be directed primarily by public authority or decentralized markets.', 'State-Directed', 'Market-Directed', 'core'),
    ('C2', 'Distribution & Property', 'How strongly policy should redistribute resources versus protect holdings, contracts, and unequal outcomes.', 'Redistributionist', 'Property-Rights', 'core'),
    ('C3', 'Liberty & Public Order', 'How readily coercive power may restrict privacy, movement, expression, or conduct to prevent harm and maintain order.', 'Security/Order', 'Civil Liberties', 'core'),
    ('C4', 'Territorial Authority', 'Whether binding political authority should sit mainly at national or more local and regional levels.', 'Centralized', 'Localized', 'core'),
    ('C5', 'Cultural Continuity', 'Whether inherited social norms and institutions should be preserved or revised as identities, families, and values change.', 'Traditionalist', 'Progressivist', 'core'),
    ('C6', 'Scope of Obligation', 'Whether shared membership creates stronger moral claims or basic obligations should be allocated impartially across group boundaries.', 'Particularist', 'Universalist', 'core'),
    ('C7', 'Sovereignty Scope', 'Whether nation-states should retain final authority or accept binding regional and global institutions.', 'Sovereigntist', 'Integrationist', 'core'),
    ('C8', 'Technology Orientation', 'How readily society should deploy powerful technologies under uncertainty and accept disruption for prospective gains.', 'Tech-Cautious', 'Tech-Accelerative', 'core'),
    ('C9', 'Ecological Moral Standing', 'Whether nature is valued mainly for human benefit or has independent moral standing that can constrain human activity.', 'Anthropocentric', 'Ecocentric', 'core'),
    ('C10', 'Moral Objectivity', 'Whether moral truths exist independently of culture and approval or are substantially constructed through history and social practice.', 'Moral Objectivist', 'Moral Contextualist', 'core'),
    ('C11', 'Value Structure', 'Whether competing values can ultimately be ranked by one coherent framework or remain genuinely irreducible.', 'Moral Monist', 'Value Pluralist', 'core'),
    ('F1', 'Change Strategy', 'Whether durable change should proceed incrementally or through rapid, disruptive, and structural action.', 'Gradualist', 'Transformative', 'facet'),
    ('F2', 'Institutional Confidence', 'How much confidence established institutions and expert systems deserve absent independent verification.', 'Trusting', 'Skeptical', 'facet'),
    ('F3', 'Justice Style', 'Whether justice should emphasize deserved punishment and condemnation or repair, restitution, and reintegration.', 'Retributive', 'Restorative', 'facet'),
    ('F4', 'Democratic Constraint', 'Whether elected majorities should normally prevail or be limited by entrenched rights and constitutional checks.', 'Majoritarian', 'Constitutionalist', 'facet'),
    ('F5', 'Epistemic Authority', 'Whether specialized public decisions should remain under democratic control or be delegated to technically qualified bodies.', 'Popular/Elected Judgment', 'Expert Delegation', 'facet'),
    ('F6', 'Democratic Mediation', 'Whether citizens should decide major issues directly or act mainly through representatives who deliberate and negotiate.', 'Direct Democracy', 'Representative Deliberation', 'facet'),
    ('F7', 'Force & Peace', 'How readily military force, deterrence, and coercive retaliation should be used in international affairs.', 'Dove', 'Hawk', 'facet');

--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_axis_links; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight) VALUES
    (1, 'C1', 'primary', -1, 1.0),
    (2, 'C1', 'primary', -1, 1.0),
    (3, 'C1', 'primary', -1, 1.0),
    (4, 'C1', 'primary', 1, 1.0),
    (5, 'C1', 'primary', 1, 1.0),
    (6, 'C1', 'primary', 1, 1.0),
    (7, 'C1', 'primary', -1, 1.15),
    (8, 'C1', 'primary', -1, 1.15),
    (9, 'C1', 'primary', -1, 1.15),
    (10, 'C1', 'primary', -1, 1.15),
    (11, 'C1', 'primary', 1, 1.15),
    (12, 'C1', 'primary', 1, 1.15),
    (13, 'C1', 'primary', 1, 1.15),
    (14, 'C1', 'primary', 1, 1.15),
    (15, 'C2', 'primary', -1, 1.0),
    (16, 'C2', 'primary', -1, 1.0),
    (17, 'C2', 'primary', -1, 1.0),
    (18, 'C2', 'primary', 1, 1.0),
    (19, 'C2', 'primary', 1, 1.0),
    (20, 'C2', 'primary', 1, 1.0),
    (21, 'C2', 'primary', -1, 1.15),
    (22, 'C2', 'primary', -1, 1.15),
    (23, 'C2', 'primary', -1, 1.15),
    (24, 'C2', 'primary', -1, 1.15),
    (25, 'C2', 'primary', 1, 1.15),
    (26, 'C2', 'primary', 1, 1.15),
    (27, 'C2', 'primary', 1, 1.15),
    (28, 'C2', 'primary', 1, 1.15),
    (29, 'C3', 'primary', -1, 1.0),
    (30, 'C3', 'primary', -1, 1.0),
    (31, 'C3', 'primary', -1, 1.0),
    (32, 'C3', 'primary', 1, 1.0),
    (33, 'C3', 'primary', 1, 1.0),
    (34, 'C3', 'primary', 1, 1.0),
    (35, 'C3', 'primary', -1, 1.15),
    (36, 'C3', 'primary', -1, 1.15),
    (37, 'C3', 'primary', -1, 1.15),
    (38, 'C3', 'primary', -1, 1.15),
    (39, 'C3', 'primary', 1, 1.15),
    (40, 'C3', 'primary', 1, 1.15),
    (41, 'C3', 'primary', 1, 1.15),
    (42, 'C3', 'primary', 1, 1.15),
    (43, 'C4', 'primary', -1, 1.0),
    (44, 'C4', 'primary', -1, 1.0),
    (45, 'C4', 'primary', -1, 1.0),
    (46, 'C4', 'primary', 1, 1.0),
    (47, 'C4', 'primary', 1, 1.0),
    (48, 'C4', 'primary', 1, 1.0),
    (49, 'C4', 'primary', -1, 1.15),
    (50, 'C4', 'primary', -1, 1.15),
    (51, 'C4', 'primary', -1, 1.15),
    (52, 'C4', 'primary', -1, 1.15),
    (53, 'C4', 'primary', 1, 1.15),
    (54, 'C4', 'primary', 1, 1.15),
    (55, 'C4', 'primary', 1, 1.15),
    (56, 'C4', 'primary', 1, 1.15),
    (57, 'C5', 'primary', -1, 1.0),
    (58, 'C5', 'primary', -1, 1.0),
    (59, 'C5', 'primary', -1, 1.0),
    (60, 'C5', 'primary', 1, 1.0),
    (61, 'C5', 'primary', 1, 1.0),
    (62, 'C5', 'primary', 1, 1.0),
    (63, 'C5', 'primary', -1, 1.15),
    (64, 'C5', 'primary', -1, 1.15),
    (65, 'C5', 'primary', -1, 1.15),
    (66, 'C5', 'primary', -1, 1.15),
    (67, 'C5', 'primary', 1, 1.15),
    (68, 'C5', 'primary', 1, 1.15),
    (69, 'C5', 'primary', 1, 1.15),
    (70, 'C5', 'primary', 1, 1.15),
    (71, 'C6', 'primary', -1, 1.0),
    (72, 'C6', 'primary', -1, 1.0),
    (73, 'C6', 'primary', -1, 1.0),
    (74, 'C6', 'primary', 1, 1.0),
    (75, 'C6', 'primary', 1, 1.0),
    (76, 'C6', 'primary', 1, 1.0),
    (77, 'C6', 'primary', -1, 1.15),
    (78, 'C6', 'primary', -1, 1.15),
    (79, 'C6', 'primary', -1, 1.15),
    (80, 'C6', 'primary', -1, 1.15),
    (81, 'C6', 'primary', 1, 1.15),
    (82, 'C6', 'primary', 1, 1.15),
    (83, 'C6', 'primary', 1, 1.15),
    (84, 'C6', 'primary', 1, 1.15),
    (85, 'C7', 'primary', -1, 1.0),
    (86, 'C7', 'primary', -1, 1.0),
    (87, 'C7', 'primary', -1, 1.0),
    (88, 'C7', 'primary', 1, 1.0),
    (89, 'C7', 'primary', 1, 1.0),
    (90, 'C7', 'primary', 1, 1.0),
    (91, 'C7', 'primary', -1, 1.15),
    (92, 'C7', 'primary', -1, 1.15),
    (93, 'C7', 'primary', -1, 1.15),
    (94, 'C7', 'primary', -1, 1.15),
    (95, 'C7', 'primary', 1, 1.15),
    (96, 'C7', 'primary', 1, 1.15),
    (97, 'C7', 'primary', 1, 1.15),
    (98, 'C7', 'primary', 1, 1.15),
    (99, 'C8', 'primary', -1, 1.0),
    (100, 'C8', 'primary', -1, 1.0),
    (101, 'C8', 'primary', -1, 1.0),
    (102, 'C8', 'primary', 1, 1.0),
    (103, 'C8', 'primary', 1, 1.0),
    (104, 'C8', 'primary', 1, 1.0),
    (105, 'C8', 'primary', -1, 1.15),
    (106, 'C8', 'primary', -1, 1.15),
    (107, 'C8', 'primary', -1, 1.15),
    (108, 'C8', 'primary', -1, 1.15),
    (109, 'C8', 'primary', 1, 1.15),
    (110, 'C8', 'primary', 1, 1.15),
    (111, 'C8', 'primary', 1, 1.15),
    (112, 'C8', 'primary', 1, 1.15),
    (113, 'C9', 'primary', -1, 1.0),
    (114, 'C9', 'primary', -1, 1.0),
    (115, 'C9', 'primary', -1, 1.0),
    (116, 'C9', 'primary', 1, 1.0),
    (117, 'C9', 'primary', 1, 1.0),
    (118, 'C9', 'primary', 1, 1.0),
    (119, 'C9', 'primary', -1, 1.15),
    (120, 'C9', 'primary', -1, 1.15),
    (121, 'C9', 'primary', -1, 1.15),
    (122, 'C9', 'primary', -1, 1.15),
    (123, 'C9', 'primary', 1, 1.15),
    (124, 'C9', 'primary', 1, 1.15),
    (125, 'C9', 'primary', 1, 1.15),
    (126, 'C9', 'primary', 1, 1.15),
    (127, 'C10', 'primary', -1, 1.0),
    (128, 'C10', 'primary', -1, 1.0),
    (129, 'C10', 'primary', -1, 1.0),
    (130, 'C10', 'primary', 1, 1.0),
    (131, 'C10', 'primary', 1, 1.0),
    (132, 'C10', 'primary', 1, 1.0),
    (133, 'C10', 'primary', -1, 1.15),
    (134, 'C10', 'primary', -1, 1.15),
    (135, 'C10', 'primary', -1, 1.15),
    (136, 'C10', 'primary', -1, 1.15),
    (137, 'C10', 'primary', 1, 1.15),
    (138, 'C10', 'primary', 1, 1.15),
    (139, 'C10', 'primary', 1, 1.15),
    (140, 'C10', 'primary', 1, 1.15),
    (141, 'C11', 'primary', -1, 1.0),
    (142, 'C11', 'primary', -1, 1.0),
    (143, 'C11', 'primary', -1, 1.0),
    (144, 'C11', 'primary', 1, 1.0),
    (145, 'C11', 'primary', 1, 1.0),
    (146, 'C11', 'primary', 1, 1.0),
    (147, 'C11', 'primary', -1, 1.15),
    (148, 'C11', 'primary', -1, 1.15),
    (149, 'C11', 'primary', -1, 1.15),
    (150, 'C11', 'primary', -1, 1.15),
    (151, 'C11', 'primary', 1, 1.15),
    (152, 'C11', 'primary', 1, 1.15),
    (153, 'C11', 'primary', 1, 1.15),
    (154, 'C11', 'primary', 1, 1.15),
    (155, 'F1', 'primary', -1, 1.0),
    (156, 'F1', 'primary', -1, 1.0),
    (157, 'F1', 'primary', -1, 1.0),
    (158, 'F1', 'primary', 1, 1.0),
    (159, 'F1', 'primary', 1, 1.0),
    (160, 'F1', 'primary', 1, 1.0),
    (161, 'F1', 'primary', -1, 1.15),
    (162, 'F1', 'primary', -1, 1.15),
    (163, 'F1', 'primary', -1, 1.15),
    (164, 'F1', 'primary', -1, 1.15),
    (165, 'F1', 'primary', 1, 1.15),
    (166, 'F1', 'primary', 1, 1.15),
    (167, 'F1', 'primary', 1, 1.15),
    (168, 'F1', 'primary', 1, 1.15),
    (169, 'F2', 'primary', -1, 1.0),
    (170, 'F2', 'primary', -1, 1.0),
    (171, 'F2', 'primary', -1, 1.0),
    (172, 'F2', 'primary', 1, 1.0),
    (173, 'F2', 'primary', 1, 1.0),
    (174, 'F2', 'primary', 1, 1.0),
    (175, 'F2', 'primary', -1, 1.15),
    (176, 'F2', 'primary', -1, 1.15),
    (177, 'F2', 'primary', -1, 1.15),
    (178, 'F2', 'primary', -1, 1.15),
    (179, 'F2', 'primary', 1, 1.15),
    (180, 'F2', 'primary', 1, 1.15),
    (181, 'F2', 'primary', 1, 1.15),
    (182, 'F2', 'primary', 1, 1.15),
    (183, 'F3', 'primary', -1, 1.0),
    (184, 'F3', 'primary', -1, 1.0),
    (185, 'F3', 'primary', -1, 1.0),
    (186, 'F3', 'primary', 1, 1.0),
    (187, 'F3', 'primary', 1, 1.0),
    (188, 'F3', 'primary', 1, 1.0),
    (189, 'F3', 'primary', -1, 1.15),
    (190, 'F3', 'primary', -1, 1.15),
    (191, 'F3', 'primary', -1, 1.15),
    (192, 'F3', 'primary', -1, 1.15),
    (193, 'F3', 'primary', 1, 1.15),
    (194, 'F3', 'primary', 1, 1.15),
    (195, 'F3', 'primary', 1, 1.15),
    (196, 'F3', 'primary', 1, 1.15),
    (197, 'F4', 'primary', -1, 1.0),
    (198, 'F4', 'primary', -1, 1.0),
    (199, 'F4', 'primary', -1, 1.0),
    (200, 'F4', 'primary', 1, 1.0),
    (201, 'F4', 'primary', 1, 1.0),
    (202, 'F4', 'primary', 1, 1.0),
    (203, 'F4', 'primary', -1, 1.15),
    (204, 'F4', 'primary', -1, 1.15),
    (205, 'F4', 'primary', -1, 1.15),
    (206, 'F4', 'primary', -1, 1.15),
    (207, 'F4', 'primary', 1, 1.15),
    (208, 'F4', 'primary', 1, 1.15),
    (209, 'F4', 'primary', 1, 1.15),
    (210, 'F4', 'primary', 1, 1.15),
    (211, 'F5', 'primary', -1, 1.0),
    (212, 'F5', 'primary', -1, 1.0),
    (213, 'F5', 'primary', -1, 1.0),
    (214, 'F5', 'primary', 1, 1.0),
    (215, 'F5', 'primary', 1, 1.0),
    (216, 'F5', 'primary', 1, 1.0),
    (217, 'F5', 'primary', -1, 1.15),
    (218, 'F5', 'primary', -1, 1.15),
    (219, 'F5', 'primary', -1, 1.15),
    (220, 'F5', 'primary', -1, 1.15),
    (221, 'F5', 'primary', 1, 1.15),
    (222, 'F5', 'primary', 1, 1.15),
    (223, 'F5', 'primary', 1, 1.15),
    (224, 'F5', 'primary', 1, 1.15),
    (225, 'F6', 'primary', -1, 1.0),
    (226, 'F6', 'primary', -1, 1.0),
    (227, 'F6', 'primary', -1, 1.0),
    (228, 'F6', 'primary', 1, 1.0),
    (229, 'F6', 'primary', 1, 1.0),
    (230, 'F6', 'primary', 1, 1.0),
    (231, 'F6', 'primary', -1, 1.15),
    (232, 'F6', 'primary', -1, 1.15),
    (233, 'F6', 'primary', -1, 1.15),
    (234, 'F6', 'primary', -1, 1.15),
    (235, 'F6', 'primary', 1, 1.15),
    (236, 'F6', 'primary', 1, 1.15),
    (237, 'F6', 'primary', 1, 1.15),
    (238, 'F6', 'primary', 1, 1.15),
    (239, 'F7', 'primary', -1, 1.0),
    (240, 'F7', 'primary', -1, 1.0),
    (241, 'F7', 'primary', -1, 1.0),
    (242, 'F7', 'primary', 1, 1.0),
    (243, 'F7', 'primary', 1, 1.0),
    (244, 'F7', 'primary', 1, 1.0),
    (245, 'F7', 'primary', -1, 1.15),
    (246, 'F7', 'primary', -1, 1.15),
    (247, 'F7', 'primary', -1, 1.15),
    (248, 'F7', 'primary', -1, 1.15),
    (249, 'F7', 'primary', 1, 1.15),
    (250, 'F7', 'primary', 1, 1.15),
    (251, 'F7', 'primary', 1, 1.15),
    (252, 'F7', 'primary', 1, 1.15),
    (253, 'C1', 'primary', 1, 1.25),
    (253, 'C3', 'tradeoff', -1, 0.65),
    (254, 'C1', 'primary', -1, 1.25),
    (254, 'C3', 'tradeoff', -1, 0.65),
    (255, 'C4', 'primary', 1, 1.25),
    (255, 'C1', 'tradeoff', -1, 0.65),
    (256, 'C4', 'primary', -1, 1.25),
    (256, 'C1', 'tradeoff', -1, 0.65),
    (257, 'C1', 'primary', 1, 1.25),
    (257, 'C7', 'tradeoff', 1, 0.65),
    (258, 'C1', 'primary', -1, 1.25),
    (258, 'C7', 'tradeoff', 1, 0.65),
    (259, 'C6', 'primary', 1, 1.25),
    (259, 'C2', 'tradeoff', 1, 0.65),
    (260, 'C2', 'primary', 1, 1.25),
    (260, 'C6', 'tradeoff', -1, 0.65),
    (261, 'C2', 'primary', -1, 1.25),
    (261, 'C5', 'tradeoff', 1, 0.65),
    (262, 'C5', 'primary', -1, 1.25),
    (262, 'C2', 'tradeoff', -1, 0.65),
    (263, 'C9', 'primary', 1, 1.25),
    (263, 'C3', 'tradeoff', -1, 0.65),
    (264, 'C3', 'primary', -1, 1.25),
    (264, 'C9', 'tradeoff', -1, 0.65),
    (265, 'C7', 'primary', 1, 1.25),
    (265, 'C4', 'tradeoff', 1, 0.65),
    (266, 'C7', 'primary', -1, 1.25),
    (266, 'C4', 'tradeoff', 1, 0.65),
    (267, 'C5', 'primary', 1, 1.25),
    (267, 'C8', 'tradeoff', 1, 0.65),
    (268, 'C8', 'primary', -1, 1.25),
    (268, 'C5', 'tradeoff', 1, 0.65),
    (269, 'C7', 'primary', 1, 1.25),
    (269, 'C6', 'tradeoff', 1, 0.65),
    (270, 'C6', 'primary', -1, 1.25),
    (270, 'C7', 'tradeoff', 1, 0.65),
    (271, 'C9', 'primary', -1, 1.25),
    (271, 'C8', 'tradeoff', 1, 0.65),
    (272, 'C9', 'primary', 1, 1.25),
    (272, 'C8', 'tradeoff', 1, 0.65),
    (273, 'C8', 'primary', -1, 1.25),
    (273, 'C10', 'tradeoff', -1, 0.65),
    (274, 'C10', 'primary', 1, 1.25),
    (274, 'C8', 'tradeoff', -1, 0.65),
    (275, 'C11', 'primary', 1, 1.25),
    (275, 'C9', 'tradeoff', 1, 0.65),
    (276, 'C9', 'primary', -1, 1.25),
    (276, 'C11', 'tradeoff', 1, 0.65),
    (277, 'C3', 'primary', 1, 1.25),
    (277, 'F1', 'tradeoff', 1, 0.65),
    (278, 'F5', 'primary', 1, 1.25),
    (278, 'F2', 'tradeoff', 1, 0.65),
    (279, 'F4', 'primary', 1, 1.25),
    (279, 'F3', 'tradeoff', 1, 0.65),
    (280, 'F6', 'primary', -1, 1.25),
    (280, 'C4', 'tradeoff', -1, 0.65),
    (281, 'F7', 'primary', 1, 1.25),
    (281, 'C7', 'tradeoff', 1, 0.65),
    (282, 'F6', 'primary', 1, 1.25),
    (282, 'F1', 'tradeoff', -1, 0.65),
    (283, 'F1', 'primary', 1, 1.25),
    (283, 'C3', 'tradeoff', -1, 0.65),
    (284, 'F6', 'primary', -1, 1.25),
    (284, 'C4', 'tradeoff', 1, 0.65),
    (285, 'C7', 'primary', -1, 1.25),
    (285, 'F7', 'tradeoff', 1, 0.65),
    (286, 'F6', 'primary', 1, 1.25),
    (286, 'F1', 'tradeoff', 1, 0.65),
    (287, 'F2', 'primary', -1, 1.25),
    (287, 'F5', 'tradeoff', 1, 0.65),
    (288, 'F3', 'primary', -1, 1.25),
    (288, 'F4', 'tradeoff', 1, 0.65),
    (289, 'C10', 'primary', -1, 1.25),
    (289, 'C11', 'tradeoff', -1, 0.65),
    (290, 'C11', 'primary', -1, 1.25),
    (290, 'C10', 'tradeoff', 1, 0.65),
    (291, 'F2', 'primary', 1, 1.25),
    (291, 'F1', 'tradeoff', 1, 0.65),
    (292, 'F1', 'primary', -1, 1.25),
    (292, 'F2', 'tradeoff', 1, 0.65),
    (293, 'C3', 'primary', -1, 1.25),
    (293, 'F3', 'tradeoff', -1, 0.65),
    (294, 'F3', 'primary', 1, 1.25),
    (294, 'C3', 'tradeoff', -1, 0.65),
    (295, 'F5', 'primary', -1, 1.25),
    (295, 'F4', 'tradeoff', -1, 0.65),
    (296, 'F4', 'primary', -1, 1.25),
    (296, 'F5', 'tradeoff', 1, 0.65),
    (297, 'F7', 'primary', -1, 1.25),
    (297, 'C3', 'tradeoff', -1, 0.65),
    (298, 'C3', 'primary', 1, 1.25),
    (298, 'F7', 'tradeoff', -1, 0.65),
    (299, 'C8', 'primary', 1, 1.25),
    (299, 'C1', 'tradeoff', 1, 0.65),
    (300, 'C8', 'primary', 1, 1.25),
    (300, 'C1', 'tradeoff', -1, 0.65);

--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.questions (id, axis_id, key, text, educational_content, display_order, active, weight, question_type, bank_version) VALUES
    (1, 'C1', -1, 'Markets do not reliably provide essential services fairly without direct public control. In other words, markets alone may leave essential services unfair or unavailable, so government ownership or control may be needed.', NULL, 1, TRUE, 1.0, 'conceptual', 'v2.1'),
    (2, 'C1', -1, 'Governments should steer investment toward strategic social goals rather than leave capital allocation mainly to private investors. In other words, government should guide where major investment goes when public goals differ from what private investors would choose.', NULL, 2, TRUE, 1.0, 'conceptual', 'v2.1'),
    (3, 'C1', -1, 'Public ownership is often justified when an industry is a natural monopoly or basic necessity. In other words, public ownership can make sense when one provider naturally dominates or the service is essential.', NULL, 3, TRUE, 1.0, 'conceptual', 'v2.1'),
    (4, 'C1', 1, 'Decentralized prices usually coordinate complex economic activity better than administrative plans. In other words, prices and independent buying and selling usually organize the economy better than central planning.', NULL, 4, TRUE, 1.0, 'conceptual', 'v2.1'),
    (5, 'C1', 1, 'Competition among private providers generally improves quality and lowers costs. In other words, allowing multiple providers to compete usually benefits customers.', NULL, 5, TRUE, 1.0, 'conceptual', 'v2.1'),
    (6, 'C1', 1, 'Businesses should normally be allowed to fail when they cannot serve customers profitably. In other words, government should not routinely rescue firms that cannot remain viable.', NULL, 6, TRUE, 1.0, 'conceptual', 'v2.1'),
    (7, 'C1', -1, 'Electricity transmission and distribution should be operated as a regulated public utility rather than as competing private networks. In other words, the high-voltage grid and local delivery wires would be run by a public body or a tightly regulated monopoly instead of several companies building competing networks.', 'Assume that one integrated network is needed for reliable service, and either public ownership or regulation would still control prices and service standards.', 7, TRUE, 1.15, 'applied', 'v2.1'),
    (8, 'C1', -1, 'The government should use a public development bank to direct long-term credit toward regions that private lenders consistently neglect. In other words, a public development bank is a government-backed lender created to finance long-term projects or sectors that private credit may underserve.', 'Assume that the neglected regions contain viable long-term projects that ordinary lenders systematically underfinance.', 8, TRUE, 1.15, 'applied', 'v2.1'),
    (9, 'C1', -1, 'The state should take an ownership stake in domestic semiconductor production when dependence on foreign suppliers threatens national resilience. In other words, an ownership stake gives the government partial equity and influence rather than only offering a grant, loan, or tax credit.', 'Assume that dependence on foreign suppliers creates a serious resilience risk and the ownership stake is transparent and reviewable.', 9, TRUE, 1.15, 'applied', 'v2.1'),
    (10, 'C1', -1, 'During a severe shortage of a life-saving medicine, the government should temporarily cap prices and allocate supplies by medical need. In other words, a temporary price cap limits the maximum legal price, while allocation rules determine who receives scarce supply.', 'Assume that the medicine shortage is severe, the price cap is temporary, and allocation by medical need can be administered fairly.', 10, TRUE, 1.15, 'applied', 'v2.1'),
    (11, 'C1', 1, 'New private clinics should be allowed to compete with public hospitals when they meet the same safety and transparency standards. In other words, competition here assumes all providers must meet the same licensing, safety, and disclosure requirements.', 'Assume that public and private clinics face the same safety, reporting, and patient-access rules.', 11, TRUE, 1.15, 'applied', 'v2.1'),
    (12, 'C1', 1, 'Occupational licensing should be removed when it mainly restricts entry and cannot be shown to protect public safety. In other words, occupational licensing requires government permission to enter a profession, often through education, examination, or fee requirements.', 'Assume that independent evidence shows that the licensing rule does not materially improve public safety.', 12, TRUE, 1.15, 'applied', 'v2.1'),
    (13, 'C1', 1, 'A poorly managed airline should be allowed to enter bankruptcy rather than receive repeated public subsidies to preserve every route and job. In other words, bankruptcy can reorganize or liquidate a firm while applying established rules to creditors, workers, and customers.', 'Assume that ordinary bankruptcy law protects passengers, workers, and creditors and allows temporary continuity of essential routes where necessary.', 13, TRUE, 1.15, 'applied', 'v2.1'),
    (14, 'C1', 1, 'Municipal broadband systems should face competition from private providers rather than receive an exclusive local monopoly. In other words, municipal broadband is internet service owned or operated by a local government.', NULL, 14, TRUE, 1.15, 'applied', 'v2.1'),
    (15, 'C2', -1, 'Reducing large inequalities should be a central aim of economic policy. In other words, reducing the gap between rich and poor should be a major policy goal.', NULL, 15, TRUE, 1.0, 'conceptual', 'v2.1'),
    (16, 'C2', -1, 'Society should guarantee everyone a decent material floor regardless of market income. In other words, everyone should be guaranteed enough resources for a basic standard of living, even without sufficient earnings.', NULL, 16, TRUE, 1.0, 'conceptual', 'v2.1'),
    (17, 'C2', -1, 'Extreme concentrations of wealth undermine equal citizenship. In other words, very large wealth gaps can make citizens unequal in political and social power.', NULL, 17, TRUE, 1.0, 'conceptual', 'v2.1'),
    (18, 'C2', 1, 'People have a strong claim to keep lawfully acquired income and property. In other words, people should normally be allowed to keep income and property they obtained legally.', NULL, 18, TRUE, 1.0, 'conceptual', 'v2.1'),
    (19, 'C2', 1, 'Unequal outcomes are acceptable when the rules are fair and opportunities are open. In other words, unequal results can be fair when the process is fair and people had genuine chances to succeed.', NULL, 19, TRUE, 1.0, 'conceptual', 'v2.1'),
    (20, 'C2', 1, 'Passing property to one''s family is a legitimate extension of ownership. In other words, owners should generally be free to leave property to their families.', NULL, 20, TRUE, 1.0, 'conceptual', 'v2.1'),
    (21, 'C2', -1, 'A universal basic income funded by higher taxes on top incomes should guarantee every adult a minimum cash floor. In other words, a universal basic income is a regular cash payment provided without a work requirement or means test.', NULL, 21, TRUE, 1.15, 'applied', 'v2.1'),
    (22, 'C2', -1, 'State funding should equalize per-pupil school resources across wealthy and poor districts, even when it requires transferring local tax revenue. In other words, fiscal equalization shifts revenue so jurisdictions with different tax bases can provide more comparable services.', 'Assume that the transfer establishes a minimum resource level without preventing wealthier districts from spending additional local funds.', 22, TRUE, 1.15, 'applied', 'v2.1'),
    (23, 'C2', -1, 'Long-term care for older adults and people with severe disabilities should be publicly guaranteed and financed according to ability to pay. In other words, long-term care includes ongoing help with daily living in homes, community settings, or residential facilities.', NULL, 23, TRUE, 1.15, 'applied', 'v2.1'),
    (24, 'C2', -1, 'Very large financial inheritances should face progressive taxation, with clearly defined exemptions for genuinely operating family businesses. In other words, an estate tax is assessed on transferred wealth at death; progressive rates rise with the size of the taxable estate.', 'Assume that the exemption is limited to genuine operating businesses rather than passive investment assets.', 24, TRUE, 1.15, 'applied', 'v2.1'),
    (25, 'C2', 1, 'People who signed standard student loans should generally repay them rather than receive broad cancellation funded by taxpayers who did not borrow. In other words, broad cancellation forgives debt across a large class of borrowers rather than only in cases such as fraud, disability, or insolvency.', 'Assume that the loans were lawfully issued, clearly disclosed, and not affected by fraud, permanent disability, or insolvency.', 25, TRUE, 1.15, 'applied', 'v2.1'),
    (26, 'C2', 1, 'Owner-occupied homes should not be subject to an annual wealth tax merely because neighborhood values have risen. In other words, an annual wealth tax is based on the value of owned assets rather than only on income or a sale.', 'Assume that the annual tax is based on the home''s current value even though the owner has not sold it or received cash from the increase.', 26, TRUE, 1.15, 'applied', 'v2.1'),
    (27, 'C2', 1, 'Private firms should not be required to transfer ownership shares to employees as a condition of remaining in business. In other words, mandatory employee equity would require firms to transfer part of ownership, not merely share profits or offer optional stock plans.', NULL, 27, TRUE, 1.15, 'applied', 'v2.1'),
    (28, 'C2', 1, 'A flat income tax with a generous personal exemption is fairer than progressively higher marginal tax rates. In other words, a flat tax applies one marginal rate above an exemption; a progressive system applies higher marginal rates to higher income brackets.', 'Assume that the personal exemption is high enough that low-income households owe no income tax.', 28, TRUE, 1.15, 'applied', 'v2.1'),
    (29, 'C3', -1, 'Preventing serious harm can justify restrictions before an individual offense occurs. In other words, government may restrict someone before they commit a crime when there is strong evidence of serious danger.', NULL, 29, TRUE, 1.0, 'conceptual', 'v2.1'),
    (30, 'C3', -1, 'Law enforcement needs broad powers when public safety is under substantial threat. In other words, police and security agencies may need wide authority during a major threat.', NULL, 30, TRUE, 1.0, 'conceptual', 'v2.1'),
    (31, 'C3', -1, 'Maintaining public order sometimes requires limiting movement, assembly, or privacy. In other words, protecting public order can sometimes justify temporary limits on where people go, gather, or keep information private.', NULL, 31, TRUE, 1.0, 'conceptual', 'v2.1'),
    (32, 'C3', 1, 'Government should need specific evidence before restricting a peaceful person''s liberty. In other words, peaceful people should not lose freedom based only on general suspicion or administrative convenience.', NULL, 32, TRUE, 1.0, 'conceptual', 'v2.1'),
    (33, 'C3', 1, 'Privacy should not be sacrificed merely because surveillance would make enforcement easier. In other words, easier enforcement is not by itself a good enough reason for government surveillance.', NULL, 33, TRUE, 1.0, 'conceptual', 'v2.1'),
    (34, 'C3', 1, 'Offensive or unpopular expression should remain legal unless it directly threatens others. In other words, speech should remain legal even when offensive unless it creates a direct threat or harm.', NULL, 34, TRUE, 1.0, 'conceptual', 'v2.1'),
    (35, 'C3', -1, 'A court should be able to order temporary inpatient treatment for a person in an acute psychotic crisis who poses a serious and immediate danger. In other words, involuntary inpatient treatment confines a person for care without consent and is normally subject to legal standards and review.', 'Assume that qualified clinicians find a serious and immediate danger, confinement is temporary, and a court promptly reviews the order.', 35, TRUE, 1.15, 'applied', 'v2.1'),
    (36, 'C3', -1, 'Authorities should be able to impose a narrowly limited quarantine on people confirmed to carry a highly lethal contagious disease. In other words, quarantine restricts the movement of people exposed to or carrying an infectious disease.', 'Assume that infection is confirmed, the disease is highly lethal, the quarantine is no broader or longer than necessary, and basic needs are provided.', 36, TRUE, 1.15, 'applied', 'v2.1'),
    (37, 'C3', -1, 'After several nights of organized violence, a city may impose a temporary nighttime curfew with judicial review. In other words, a curfew restricts presence in public places during specified hours and may include exemptions for work, care, and emergencies.', 'Assume that organized violence is ongoing, the curfew is temporary, essential travel is exempt, and courts can review abuses promptly.', 37, TRUE, 1.15, 'applied', 'v2.1'),
    (38, 'C3', -1, 'Large public events may require universal bag screening even when there is no individualized suspicion. In other words, universal screening applies the same search procedure to all entrants rather than selecting individuals based on suspicion.', 'Assume that the same limited screening applies to every attendee and collected information is not kept for unrelated purposes.', 38, TRUE, 1.15, 'applied', 'v2.1'),
    (39, 'C3', 1, 'Police should need a warrant to obtain a person''s historical cellphone-location records. In other words, historical cellphone-location records can reconstruct where a device was located over time.', NULL, 39, TRUE, 1.15, 'applied', 'v2.1'),
    (40, 'C3', 1, 'Property should not be permanently seized through civil forfeiture unless its owner is convicted or the government proves the property''s involvement in court. In other words, the government could not permanently take property merely because it suspects a connection to wrongdoing; a conviction or a separate court finding would be required.', 'Assume that the owner can contest the seizure before an independent court and the government bears the burden of proof.', 40, TRUE, 1.15, 'applied', 'v2.1'),
    (41, 'C3', 1, 'Emergency powers should expire automatically unless the legislature affirmatively renews them after public debate. In other words, a sunset clause makes a legal power expire on a set date unless lawmakers renew it.', 'Assume that the legislature can renew the power through an ordinary public vote after reviewing current evidence.', 41, TRUE, 1.15, 'applied', 'v2.1'),
    (42, 'C3', 1, 'Adults should be permitted to possess small amounts of currently illegal drugs for personal use, subject to health and age regulations. In other words, decriminalization removes criminal penalties for possession; legalization also permits regulated production or sale.', NULL, 42, TRUE, 1.15, 'applied', 'v2.1'),
    (43, 'C4', -1, 'National standards are necessary when local variation would produce unequal basic rights or services. In other words, the national government should set minimum rules when local differences would deny people basic rights or services.', NULL, 43, TRUE, 1.0, 'conceptual', 'v2.1'),
    (44, 'C4', -1, 'Large-scale problems are usually handled best by a central government with broad coordinating authority. In other words, problems affecting many regions often need one central authority to coordinate the response.', NULL, 44, TRUE, 1.0, 'conceptual', 'v2.1'),
    (45, 'C4', -1, 'Higher levels of government should prevent local decisions that impose serious costs on neighboring regions. In other words, a higher government should step in when one locality seriously harms people outside its borders.', NULL, 45, TRUE, 1.0, 'conceptual', 'v2.1'),
    (46, 'C4', 1, 'Decisions should normally be made by the smallest jurisdiction capable of handling them. In other words, decisions should stay local unless a larger government is needed to solve the problem.', NULL, 46, TRUE, 1.0, 'conceptual', 'v2.1'),
    (47, 'C4', 1, 'Regions should be free to experiment with substantially different policies. In other words, different regions should be allowed to try different policies and learn from the results.', NULL, 47, TRUE, 1.0, 'conceptual', 'v2.1'),
    (48, 'C4', 1, 'Subnational governments should retain meaningful authority that the national government cannot easily revoke. In other words, states, provinces, or regions should have protected powers that the national government cannot easily take away.', NULL, 48, TRUE, 1.0, 'conceptual', 'v2.1'),
    (49, 'C4', -1, 'National election-administration standards should govern ballot access, counting procedures, and post-election audits in every region. In other words, one national set of minimum rules would govern who gets on the ballot, how votes are counted, and how results are checked.', 'Assume that the national rules are minimum procedural standards and regions may adopt additional safeguards that do not conflict with them.', 49, TRUE, 1.15, 'applied', 'v2.1'),
    (50, 'C4', -1, 'The national government should be able to approve interstate transmission lines after a uniform review, even when individual localities object. In other words, transmission lines move electricity over long distances and often cross many local jurisdictions.', 'Assume that the line serves a documented interstate need and the uniform review considers safety, environmental effects, and local alternatives.', 50, TRUE, 1.15, 'applied', 'v2.1'),
    (51, 'C4', -1, 'A national disaster agency should be able to direct resources and personnel across state or provincial boundaries during a major catastrophe. In other words, central command allows one authority to allocate scarce personnel and equipment across jurisdictions.', NULL, 51, TRUE, 1.15, 'applied', 'v2.1'),
    (52, 'C4', -1, 'A national minimum school-funding floor should prevent poor regions from offering substantially fewer basic educational resources. In other words, a funding floor sets a national minimum while allowing regions to spend more.', NULL, 52, TRUE, 1.15, 'applied', 'v2.1'),
    (53, 'C4', 1, 'States or provinces should set most school curricula rather than follow a single national curriculum. In other words, curriculum authority determines required subjects, standards, and instructional frameworks.', NULL, 53, TRUE, 1.15, 'applied', 'v2.1'),
    (54, 'C4', 1, 'Municipalities should control zoning and housing density unless their decisions create clearly demonstrated harms outside their borders. In other words, zoning regulates land uses, building types, and development density.', NULL, 54, TRUE, 1.15, 'applied', 'v2.1'),
    (55, 'C4', 1, 'Indigenous or tribal governments should have primary authority over land use and natural resources within their recognized territories. In other words, legally recognized Indigenous or tribal governments would make the first decision about land and resources in their own territories.', 'Assume that the territory and the Indigenous or tribal government''s governing authority are legally recognized.', 55, TRUE, 1.15, 'applied', 'v2.1'),
    (56, 'C4', 1, 'Regions should be free to adopt different tax and social-policy models so voters can compare real alternatives. In other words, policy experimentation allows jurisdictions to test different approaches under comparable national rules.', NULL, 56, TRUE, 1.15, 'applied', 'v2.1'),
    (57, 'C5', -1, 'Longstanding traditions often contain social knowledge that reformers underestimate. In other words, customs that have lasted a long time may contain practical wisdom that is not obvious to reformers.', NULL, 57, TRUE, 1.0, 'conceptual', 'v2.1'),
    (58, 'C5', -1, 'Stable family and civic institutions are more important than constant adaptation to changing preferences. In other words, preserving stable families and civic organizations can matter more than continually changing them to fit new preferences.', NULL, 58, TRUE, 1.0, 'conceptual', 'v2.1'),
    (59, 'C5', -1, 'Rapid cultural change can weaken the shared norms needed for social trust. In other words, very fast cultural change can weaken the shared expectations that help people trust one another.', NULL, 59, TRUE, 1.0, 'conceptual', 'v2.1'),
    (60, 'C5', 1, 'Social norms should change when inherited roles unnecessarily restrict people''s lives. In other words, traditions should be changed when they limit people without a strong reason.', NULL, 60, TRUE, 1.0, 'conceptual', 'v2.1'),
    (61, 'C5', 1, 'Institutions should revise traditions that exclude people without sufficient justification. In other words, institutions should revise customs that unfairly exclude people.', NULL, 61, TRUE, 1.0, 'conceptual', 'v2.1'),
    (62, 'C5', 1, 'New family and cultural forms can be as socially valuable as inherited ones. In other words, newer ways of forming families and communities can be just as valuable as traditional ones.', NULL, 62, TRUE, 1.0, 'conceptual', 'v2.1'),
    (63, 'C5', -1, 'Public schools should emphasize a shared national language even while offering additional support to students who speak other languages at home. In other words, a shared-language policy can coexist with transitional or supplemental multilingual support.', NULL, 63, TRUE, 1.15, 'applied', 'v2.1'),
    (64, 'C5', -1, 'Communities should generally retain historic monuments and civic rituals while adding context rather than removing them when values change. In other words, contextualization adds interpretation or counter-perspectives without removing the original object or ritual.', NULL, 64, TRUE, 1.15, 'applied', 'v2.1'),
    (65, 'C5', -1, 'When dependent children are involved, the law should require a waiting period and mediation before a no-fault divorce is finalized, except in cases of abuse or abandonment. In other words, parents could still end a marriage without proving fault, but they would normally complete a waiting period and mediation first when children depend on them.', 'Assume that mediation concerns practical arrangements and cannot force reconciliation; either spouse can still obtain the divorce after the waiting period.', 65, TRUE, 1.15, 'applied', 'v2.1'),
    (66, 'C5', -1, 'Public institutions may preserve longstanding religiously rooted holidays and ceremonies when participation is voluntary. In other words, a religiously rooted civic practice may retain historical meaning even when formal participation is optional.', NULL, 66, TRUE, 1.15, 'applied', 'v2.1'),
    (67, 'C5', 1, 'Adoption eligibility should be based on caregiving ability rather than marital status, sexual orientation, or whether a household fits a traditional family model. In other words, adoption agencies would judge whether applicants can provide a safe and stable home, not whether they fit a preferred family structure.', 'Assume that all applicants meet the same standards for safety, stability, and caregiving ability.', 67, TRUE, 1.15, 'applied', 'v2.1'),
    (68, 'C5', 1, 'Adults should have access to no-fault divorce without proving misconduct by a spouse. In other words, no-fault divorce permits a marriage to end without proving adultery, abandonment, or another legal wrong.', NULL, 68, TRUE, 1.15, 'applied', 'v2.1'),
    (69, 'C5', 1, 'Official civic ceremonies should be revised over time to include secular and minority traditions rather than preserve one inherited form. In other words, inclusive redesign changes shared public ceremonies rather than merely adding private alternatives.', NULL, 69, TRUE, 1.15, 'applied', 'v2.1'),
    (70, 'C5', 1, 'Schools should teach that family and household arrangements have changed across history without presenting one current model as universally preferred. In other words, the question concerns descriptive and normative framing, not whether schools must endorse every arrangement.', NULL, 70, TRUE, 1.15, 'applied', 'v2.1'),
    (71, 'C6', -1, 'People legitimately owe stronger duties to family, community, and fellow citizens than to strangers. In other words, people may reasonably owe more to those close to them or in their political community than to people everywhere.', NULL, 71, TRUE, 1.0, 'conceptual', 'v2.1'),
    (72, 'C6', -1, 'Shared membership and contribution can create special claims on common resources. In other words, contributing to and belonging to a community can justify receiving some benefits before nonmembers.', NULL, 72, TRUE, 1.0, 'conceptual', 'v2.1'),
    (73, 'C6', -1, 'A community may preserve benefits for its members without treating outsiders as morally inferior. In other words, a community can favor its own members without claiming outsiders have less human worth.', NULL, 73, TRUE, 1.0, 'conceptual', 'v2.1'),
    (74, 'C6', 1, 'A person''s nationality, ancestry, or distance should not reduce the moral weight of their basic needs. In other words, a person''s needs matter equally even if they live far away or belong to another nation or ancestry.', NULL, 74, TRUE, 1.0, 'conceptual', 'v2.1'),
    (75, 'C6', 1, 'Aid should be allocated primarily according to need rather than group membership. In other words, help should go first to those in greatest need rather than to members of a preferred group.', NULL, 75, TRUE, 1.0, 'conceptual', 'v2.1'),
    (76, 'C6', 1, 'Public institutions should apply the same basic rules across ethnic, religious, and national lines. In other words, government should apply the same basic standards regardless of ethnicity, religion, or nationality.', NULL, 76, TRUE, 1.0, 'conceptual', 'v2.1'),
    (77, 'C6', -1, 'When public housing is scarce, long-term local residents may receive priority among applicants with comparable levels of need. In other words, a residency preference ranks otherwise similar applicants by length or continuity of local residence.', 'Assume that applicants being compared have genuinely similar levels of housing need.', 77, TRUE, 1.15, 'applied', 'v2.1'),
    (78, 'C6', -1, 'Veterans may receive a modest preference in public hiring because military service creates a special reciprocal obligation. In other words, a modest preference can affect ranking without guaranteeing selection over substantially better-qualified applicants.', 'Assume that the preference is modest and does not automatically defeat substantially better-qualified applicants.', 78, TRUE, 1.15, 'applied', 'v2.1'),
    (79, 'C6', -1, 'A locally funded mutual-aid program may reserve some benefits for people who have contributed to it over time. In other words, mutual-aid programs pool contributions among members and distribute benefits under agreed rules.', NULL, 79, TRUE, 1.15, 'applied', 'v2.1'),
    (80, 'C6', -1, 'A diaspora charity may reasonably prioritize members of its own dispersed community before assisting unrelated groups. In other words, a diaspora is a community dispersed from an ancestral homeland while maintaining shared ties.', 'Assume that the organization is privately funded and is not distributing a government benefit.', 80, TRUE, 1.15, 'applied', 'v2.1'),
    (81, 'C6', 1, 'Refugee admissions should prioritize vulnerability and danger rather than cultural similarity to the receiving country. In other words, vulnerability criteria can include persecution risk, medical need, family separation, and immediate danger.', NULL, 81, TRUE, 1.15, 'applied', 'v2.1'),
    (82, 'C6', 1, 'After domestic high-risk groups are protected, surplus vaccines should be distributed internationally according to medical need. In other words, the domestic threshold is satisfied before the question turns to allocation of remaining supply.', 'Assume that the country''s highest-risk residents have already received reasonable protection and the remaining doses would otherwise be unused or delayed.', 82, TRUE, 1.15, 'applied', 'v2.1'),
    (83, 'C6', 1, 'Public hiring and services should apply the same eligibility rules regardless of an applicant''s ethnicity, religion, or ancestry. In other words, uniform eligibility does not preclude accommodations tied to disability, language access, or other functional needs.', NULL, 83, TRUE, 1.15, 'applied', 'v2.1'),
    (84, 'C6', 1, 'Humanitarian aid should be allocated where it prevents the most severe suffering rather than primarily to allied countries. In other words, this contrasts humanitarian need with strategic or alliance-based allocation.', NULL, 84, TRUE, 1.15, 'applied', 'v2.1'),
    (85, 'C7', -1, 'Domestic voters should retain final authority over laws that govern them. In other words, voters within a country should have the final say over the laws they must follow.', NULL, 85, TRUE, 1.0, 'conceptual', 'v2.1'),
    (86, 'C7', -1, 'International agreements should not permanently bind a country against sustained democratic opposition. In other words, a country should be able to leave an international commitment that its population persistently rejects.', NULL, 86, TRUE, 1.0, 'conceptual', 'v2.1'),
    (87, 'C7', -1, 'Nations need the ability to act unilaterally when common institutions fail. In other words, countries must sometimes act on their own when international organizations cannot respond.', NULL, 87, TRUE, 1.0, 'conceptual', 'v2.1'),
    (88, 'C7', 1, 'Countries should accept binding common rules when unilateral action cannot solve shared problems. In other words, countries should accept enforceable shared rules when no country can solve the problem alone.', NULL, 88, TRUE, 1.0, 'conceptual', 'v2.1'),
    (89, 'C7', 1, 'Some sovereignty should be pooled in institutions capable of enforcing international commitments. In other words, countries should transfer some decision-making power to international institutions so common commitments can be enforced.', NULL, 89, TRUE, 1.0, 'conceptual', 'v2.1'),
    (90, 'C7', 1, 'International courts and regulators can legitimately constrain national governments. In other words, international bodies may legitimately overrule or limit a national government''s choices in some areas.', NULL, 90, TRUE, 1.0, 'conceptual', 'v2.1'),
    (91, 'C7', -1, 'A country should retain an independent currency rather than join a monetary union that transfers interest-rate policy to a shared central bank and includes common fiscal rules. In other words, joining the union would move routine interest-rate decisions to a shared central bank and would also require compliance with agreed limits on national budgeting.', 'Assume that the monetary union has one shared central bank and expressly agreed fiscal rules; leaving those rules would require leaving or renegotiating the union.', 91, TRUE, 1.15, 'applied', 'v2.1'),
    (92, 'C7', -1, 'National food-safety rules should not be weakened merely because an international trade tribunal considers them a barrier to commerce. In other words, a trade body should not force a country to weaken a safety rule merely because the rule makes imported goods harder to sell.', 'Assume that the national food-safety rule is supported by credible evidence and is not disguised protectionism.', 92, TRUE, 1.15, 'applied', 'v2.1'),
    (93, 'C7', -1, 'Foreign purchases of strategically important infrastructure should be subject to national-security screening even when treaties favor open investment. In other words, the government would review foreign purchases of ports, power systems, communications networks, or similar assets for security risks.', 'Assume that the infrastructure is genuinely important to national security or resilience and the review applies clear published standards.', 93, TRUE, 1.15, 'applied', 'v2.1'),
    (94, 'C7', -1, 'A government should be able to withdraw from a treaty when its voters reject the continuing obligations. In other words, treaties often include withdrawal procedures and notice periods.', NULL, 94, TRUE, 1.15, 'applied', 'v2.1'),
    (95, 'C7', 1, 'Countries should accept a common minimum corporate-tax floor to reduce profit shifting between jurisdictions. In other words, a minimum corporate-tax floor reduces incentives to book profits in very low-tax jurisdictions.', NULL, 95, TRUE, 1.15, 'applied', 'v2.1'),
    (96, 'C7', 1, 'Member states in a regional union should share responsibility for asylum claims according to population and capacity. In other words, countries in the union would divide responsibility for asylum seekers using a common formula based on population and available resources.', 'Assume that the regional union has legal authority to enforce the allocation formula and provides funding for the assigned responsibilities.', 96, TRUE, 1.15, 'applied', 'v2.1'),
    (97, 'C7', 1, 'Cross-border supply chains should be subject to enforceable international labor standards. In other words, enforceable standards may use inspections, complaints, trade consequences, or corporate liability.', NULL, 97, TRUE, 1.15, 'applied', 'v2.1'),
    (98, 'C7', 1, 'Countries should accept binding international rules for reporting dangerous disease outbreaks and sharing pathogen data. In other words, pathogen data can support diagnosis, vaccines, and outbreak tracking but may carry economic or security concerns.', NULL, 98, TRUE, 1.15, 'applied', 'v2.1'),
    (99, 'C8', -1, 'New technologies should face strong precaution when their harms could be irreversible. In other words, society should be very cautious before using a technology that could cause permanent harm.', NULL, 99, TRUE, 1.0, 'conceptual', 'v2.1'),
    (100, 'C8', -1, 'Resilience and human control are often more important than maximum technological efficiency. In other words, systems that remain safe and controllable during failure can matter more than getting the greatest efficiency.', NULL, 100, TRUE, 1.0, 'conceptual', 'v2.1'),
    (101, 'C8', -1, 'Some technologies create risks that society cannot responsibly manage after deployment. In other words, some technologies may be too dangerous to release because their risks cannot be controlled afterward.', NULL, 101, TRUE, 1.0, 'conceptual', 'v2.1'),
    (102, 'C8', 1, 'Innovation should generally proceed unless there is clear evidence of serious harm. In other words, new technology should usually be allowed unless strong evidence shows it is seriously dangerous.', NULL, 102, TRUE, 1.0, 'conceptual', 'v2.1'),
    (103, 'C8', 1, 'Technological progress can solve constraints that political redistribution alone cannot. In other words, innovation can create more resources or capabilities instead of only redistributing what already exists.', NULL, 103, TRUE, 1.0, 'conceptual', 'v2.1'),
    (104, 'C8', 1, 'Society should accept some disruption and uncertainty to gain the long-term benefits of innovation. In other words, society should tolerate some short-term disruption and risk to obtain larger future benefits from innovation.', NULL, 104, TRUE, 1.0, 'conceptual', 'v2.1'),
    (105, 'C8', -1, 'Heritable editing of human embryos should remain prohibited until safety, consent across generations, and governance problems are substantially resolved. In other words, changes to an embryo''s DNA could pass to later generations, so deployment would wait until safety and governance questions are much more settled.', 'Assume that current evidence does not yet resolve major safety, consent, and governance concerns and the prohibition can be reconsidered as evidence improves.', 105, TRUE, 1.15, 'applied', 'v2.1'),
    (106, 'C8', -1, 'Critical infrastructure should retain manual and offline backups even when full automation would be cheaper and more efficient. In other words, offline and manual backups reduce dependence on connected automated systems during cyberattack or system failure.', NULL, 106, TRUE, 1.15, 'applied', 'v2.1'),
    (107, 'C8', -1, 'Routine police use of facial recognition in public spaces should be prohibited until accuracy, bias, and abuse risks are demonstrably controlled. In other words, facial-recognition systems compare images to stored templates and can produce false matches that vary across populations.', 'Assume that accuracy and abuse risks have not yet been brought within independently verified limits.', 107, TRUE, 1.15, 'applied', 'v2.1'),
    (108, 'C8', -1, 'Large outdoor geoengineering experiments should require approval from a treaty-based international body and strong evidence that any harm can be reversed. In other words, countries participating in a formal international agreement would have to approve the experiment before it could alter shared climate systems.', 'Assume that the authorizing body is established by treaty, participating countries share the affected climate risk, and emergency small-scale laboratory work remains possible.', 108, TRUE, 1.15, 'applied', 'v2.1'),
    (109, 'C8', 1, 'Cities should deploy autonomous buses once independent evidence shows they are safer than human-driven fleets. In other words, autonomous buses operate without a human driver but may still use remote supervision and defined routes.', 'Assume that independent evidence shows the buses are safer overall, routes are suitable, and a human can intervene during emergencies.', 109, TRUE, 1.15, 'applied', 'v2.1'),
    (110, 'C8', 1, 'Gene-edited crops should be approved when they pass the same evidence-based safety standards as conventionally bred crops. In other words, gene editing changes selected DNA sequences and differs from adding genes from unrelated organisms.', 'Assume that gene-edited and conventionally bred crops are judged under equally demanding standards based on their actual traits and risks.', 110, TRUE, 1.15, 'applied', 'v2.1'),
    (111, 'C8', 1, 'Nuclear power should be expanded when modern designs can meet transparent safety and waste-management requirements. In other words, nuclear expansion can include existing reactor life extension, new large reactors, or smaller modular designs.', 'Assume that the projects meet enforceable safety, waste, security, and decommissioning requirements and their costs are transparently compared with alternatives.', 111, TRUE, 1.15, 'applied', 'v2.1'),
    (112, 'C8', 1, 'Clinicians should be allowed to use validated AI diagnostic systems with human oversight rather than wait for decades of additional experience. In other words, a diagnostic AI estimates conditions from clinical data; human oversight retains a professional responsible for the final decision.', 'Assume that the AI has been independently validated for the relevant patients and a licensed clinician remains responsible for the final decision.', 112, TRUE, 1.15, 'applied', 'v2.1'),
    (113, 'C9', -1, 'Environmental protection is ultimately justified by its contribution to human well-being. In other words, nature deserves protection mainly because healthy environments benefit people.', NULL, 113, TRUE, 1.0, 'conceptual', 'v2.1'),
    (114, 'C9', -1, 'Human livelihoods should usually take priority when they directly conflict with ecological preservation. In other words, jobs, food, housing, and other human needs should usually come before preserving ecosystems unchanged.', NULL, 114, TRUE, 1.0, 'conceptual', 'v2.1'),
    (115, 'C9', -1, 'Nature may be responsibly transformed to meet important human needs. In other words, people may alter natural environments when doing so meets important human needs responsibly.', NULL, 115, TRUE, 1.0, 'conceptual', 'v2.1'),
    (116, 'C9', 1, 'Species and ecosystems have value independent of their usefulness to people. In other words, plants, animals, species, and ecosystems matter morally even when they provide no direct benefit to people.', NULL, 116, TRUE, 1.0, 'conceptual', 'v2.1'),
    (117, 'C9', 1, 'Future generations and nonhuman life create moral duties for people living today. In other words, people today owe duties to future humans and to other living beings.', NULL, 117, TRUE, 1.0, 'conceptual', 'v2.1'),
    (118, 'C9', 1, 'Some natural places should remain undeveloped even when development would produce substantial economic benefits. In other words, some places should be protected from development even when development would create major economic gains.', NULL, 118, TRUE, 1.0, 'conceptual', 'v2.1'),
    (119, 'C9', -1, 'A renewable-energy transmission line may cross already disturbed habitat when it is necessary to provide reliable low-carbon power to large populations. In other words, the project could use land that is already damaged if that route is genuinely needed to deliver reliable low-carbon electricity.', 'Assume that the selected route is necessary after serious review of lower-impact alternatives and the habitat is already substantially altered.', 119, TRUE, 1.15, 'applied', 'v2.1'),
    (120, 'C9', -1, 'Predators that repeatedly kill livestock may be lethally controlled when nonlethal measures have failed. In other words, nonlethal measures can include fencing, guard animals, relocation, and compensation.', NULL, 120, TRUE, 1.15, 'applied', 'v2.1'),
    (121, 'C9', -1, 'Housing may be built on degraded habitat if independent review confirms that developers will restore genuinely comparable habitat elsewhere and prevent a net increase in pollution. In other words, development would be allowed only if outside reviewers confirm that equivalent habitat will actually be restored and overall pollution will not increase.', 'Assume that independent reviewers verify ecological equivalence, restoration is funded before development, and failure triggers enforceable remedies.', 121, TRUE, 1.15, 'applied', 'v2.1'),
    (122, 'C9', -1, 'Coastal flood defenses for dense communities should take priority over preserving every natural shoreline in its existing form. In other words, flood defenses can include seawalls, barriers, elevation, dunes, wetlands, and managed retreat.', 'Assume that the community faces a serious flood risk and less damaging measures cannot provide adequate protection at reasonable cost.', 122, TRUE, 1.15, 'applied', 'v2.1'),
    (123, 'C9', 1, 'Farming practices that cause severe, avoidable animal suffering should be phased out even if meat becomes more expensive. In other words, animal-welfare regulation can address confinement, handling, transport, and slaughter practices.', NULL, 123, TRUE, 1.15, 'applied', 'v2.1'),
    (124, 'C9', 1, 'Mining should be denied in an intact watershed whose ecological functions cannot realistically be replaced. In other words, mining would be refused where the connected river, groundwater, and habitat system cannot realistically be recreated elsewhere.', 'Assume that independent evidence shows that the watershed''s functions are critical and cannot realistically be replaced through restoration elsewhere.', 124, TRUE, 1.15, 'applied', 'v2.1'),
    (125, 'C9', 1, 'Governments should restore wetlands and floodplains even when doing so removes some land from future development. In other words, wetlands and floodplains can reduce floods, filter water, and support habitat.', NULL, 125, TRUE, 1.15, 'applied', 'v2.1'),
    (126, 'C9', 1, 'Groundwater extraction should be limited when continued pumping would irreversibly damage rivers, springs, or dependent ecosystems. In other words, groundwater pumping can reduce connected surface flows and permanently compact aquifers.', 'Assume that continued pumping is projected to cause irreversible damage and users receive reasonable time and support to adapt.', 126, TRUE, 1.15, 'applied', 'v2.1'),
    (127, 'C10', -1, 'Some actions are objectively wrong regardless of what any culture or majority believes. In other words, at least some actions are wrong even if every society approves of them.', NULL, 127, TRUE, 1.0, 'conceptual', 'v2.1'),
    (128, 'C10', -1, 'Moral truth is not created by social approval or historical circumstance. In other words, moral truth does not become true merely because a society accepts it or because it fits a particular era.', NULL, 128, TRUE, 1.0, 'conceptual', 'v2.1'),
    (129, 'C10', -1, 'Universal principles can legitimately be used to judge inherited customs. In other words, broad moral rules can be used to criticize traditions, even when those traditions are old and widely accepted.', NULL, 129, TRUE, 1.0, 'conceptual', 'v2.1'),
    (130, 'C10', 1, 'Moral standards are substantially shaped by culture and historical experience. In other words, what a society considers right or wrong is partly formed by its culture and history, not only discovered independently.', NULL, 130, TRUE, 1.0, 'conceptual', 'v2.1'),
    (131, 'C10', 1, 'There is no fully neutral standpoint outside human practices from which all moral disputes can be settled. In other words, no one can judge morality from a completely culture-free and history-free point of view.', NULL, 131, TRUE, 1.0, 'conceptual', 'v2.1'),
    (132, 'C10', 1, 'Societies can create new moral standards as their understanding and circumstances change. In other words, societies can develop genuinely new ideas of right and wrong rather than only uncover timeless rules that already existed.', NULL, 132, TRUE, 1.0, 'conceptual', 'v2.1'),
    (133, 'C10', -1, 'Forced marriage is wrong even when families and local custom strongly approve of it. In other words, forced marriage lacks the free and ongoing consent of at least one person.', 'Assume that at least one person lacks free and continuing consent, regardless of family approval.', 133, TRUE, 1.15, 'applied', 'v2.1'),
    (134, 'C10', -1, 'A prison should prohibit prolonged solitary confinement for nonviolent rule violations even when most citizens believe harsh isolation is necessary for order. In other words, the rule would set a moral limit on isolation even when the punishment is lawful, traditional, and publicly popular.', 'Assume that the isolation is prolonged, the violation is nonviolent, and safer disciplinary methods are available.', 134, TRUE, 1.15, 'applied', 'v2.1'),
    (135, 'C10', -1, 'Deliberately targeting civilians in war is wrong regardless of the cause being defended. In other words, the principle of distinction requires separating military targets from civilians.', 'Assume that the civilians are deliberately selected as targets rather than harmed incidentally during an otherwise lawful attack.', 135, TRUE, 1.15, 'applied', 'v2.1'),
    (136, 'C10', -1, 'Employers should have to meet a universal minimum safety standard even when strict enforcement would close factories that provide scarce local jobs. In other words, the same basic workplace-safety rule would apply across countries even when compliance causes serious local economic costs.', 'Assume that the safety standard prevents a substantial risk of serious injury, applies equally across countries, and transition assistance has been considered.', 136, TRUE, 1.15, 'applied', 'v2.1'),
    (137, 'C10', 1, 'Societies may legitimately adopt different laws on assisted dying because ideas about dignity and obligation are partly shaped by culture. In other words, different societies could reach different legitimate answers about assisted dying because their ideas of dignity and family duty differ.', 'Assume that the adults are competent, acting voluntarily, and protected by clear safeguards against coercion and abuse.', 137, TRUE, 1.15, 'applied', 'v2.1'),
    (138, 'C10', 1, 'There is no single objectively correct model for how extended families should divide long-term caregiving responsibilities. In other words, there may be several legitimate ways for relatives to share elder care, rather than one arrangement that is morally correct everywhere.', NULL, 138, TRUE, 1.15, 'applied', 'v2.1'),
    (139, 'C10', 1, 'Public policy should allow substantial moral disagreement about gestational surrogacy when the adults consent and evidence of serious harm is uncertain. In other words, the law would leave room for consenting adults to use gestational surrogacy while societies continue to disagree morally about it.', 'Assume that the adults give informed consent, payment and parentage rules are clear, and reliable evidence of serious harm remains uncertain.', 139, TRUE, 1.15, 'applied', 'v2.1'),
    (140, 'C10', 1, 'Schools should present major ethical controversies as disputes shaped by different traditions rather than teach that one framework has settled every issue. In other words, schools would explain the leading moral traditions and their disagreements instead of presenting one theory as having resolved every controversy.', NULL, 140, TRUE, 1.15, 'applied', 'v2.1'),
    (141, 'C11', -1, 'A coherent moral framework should be able to rank competing values in every case. In other words, one consistent moral system should ultimately be able to decide which value comes first in any conflict.', NULL, 141, TRUE, 1.0, 'conceptual', 'v2.1'),
    (142, 'C11', -1, 'Even difficult moral conflicts have a best answer in principle. In other words, even when every option has costs, there is still one morally best answer in principle.', NULL, 142, TRUE, 1.0, 'conceptual', 'v2.1'),
    (143, 'C11', -1, 'Public institutions need a stable hierarchy of values rather than case-by-case balancing. In other words, public institutions should use a consistent ordering of values instead of weighing them differently in each case.', NULL, 143, TRUE, 1.0, 'conceptual', 'v2.1'),
    (144, 'C11', 1, 'Several values can be genuine and important without being reducible to one master principle. In other words, values such as liberty, equality, loyalty, and compassion may all matter without one rule always deciding between them.', NULL, 144, TRUE, 1.0, 'conceptual', 'v2.1'),
    (145, 'C11', 1, 'Reasonable people can continue to disagree even when they share the relevant facts. In other words, informed and reasonable people may still disagree because the conflict is not settled by facts alone.', NULL, 145, TRUE, 1.0, 'conceptual', 'v2.1'),
    (146, 'C11', 1, 'Some moral conflicts involve unavoidable loss because no option fully honors every value. In other words, some choices require sacrificing a real value even when the best available decision is made.', NULL, 146, TRUE, 1.0, 'conceptual', 'v2.1'),
    (147, 'C11', -1, 'When constitutional rights conflict, courts should apply a stable hierarchy rather than balance the values differently in each case. In other words, courts would decide in advance that certain rights generally outrank others instead of weighing the competing rights differently in each case.', 'Assume that the conflicting rights have comparable constitutional status and no explicit constitutional text already settles the conflict.', 147, TRUE, 1.15, 'applied', 'v2.1'),
    (148, 'C11', -1, 'Emergency medical triage should follow one transparent priority rule rather than combine several competing principles case by case. In other words, medical staff would follow one published rule, such as urgency or chance of survival, rather than combine several rules for each patient.', 'Assume that the emergency involves real scarcity and the chosen rule is published before clinicians know which individual patients will benefit.', 148, TRUE, 1.15, 'applied', 'v2.1'),
    (149, 'C11', -1, 'Public institutions should adopt one consistent definition of human dignity across criminal, medical, and family law. In other words, the same basic meaning of human dignity would guide decisions in prisons, hospitals, and family law.', NULL, 149, TRUE, 1.15, 'applied', 'v2.1'),
    (150, 'C11', -1, 'When equal treatment conflicts with religious custom, equal treatment should have presumptive priority rather than be balanced anew in every case. In other words, equal treatment would normally come first, although an exceptional religious burden could still justify a narrow exception.', 'Assume that the equal-treatment rule applies generally, the religious burden is serious, and any exception would affect other people''s access or rights.', 150, TRUE, 1.15, 'applied', 'v2.1'),
    (151, 'C11', 1, 'Conscientious exemptions should sometimes be allowed when they protect a serious moral commitment without imposing substantial harm on others. In other words, a person or institution could receive an exception from a general rule when the moral commitment is serious and other people are not substantially harmed.', 'Assume that the commitment is sincere and serious, and the exemption does not impose substantial costs, exclusion, or loss of rights on others.', 151, TRUE, 1.15, 'applied', 'v2.1'),
    (152, 'C11', 1, 'End-of-life law should offer more than one ethically defensible option rather than enforce a single view of dignity. In other words, multiple options can include continued treatment, refusal, palliative sedation, or other legally defined choices.', NULL, 152, TRUE, 1.15, 'applied', 'v2.1'),
    (153, 'C11', 1, 'Land-use decisions should openly balance housing, heritage, livelihoods, and ecology rather than treat one value as overriding in every case. In other words, multi-criteria balancing explicitly weighs several goals instead of maximizing only one.', NULL, 153, TRUE, 1.15, 'applied', 'v2.1'),
    (154, 'C11', 1, 'Courts should acknowledge that some rights conflicts involve genuine losses on both sides rather than pretend one value always fully defeats the other. In other words, a court would admit that protecting one right can genuinely injure another and would explain why the chosen limit is justified.', 'Assume that both rights are genuine, neither is absolute under the constitution, and the court must publicly justify any limit.', 154, TRUE, 1.15, 'applied', 'v2.1'),
    (155, 'F1', -1, 'Durable reform usually comes from incremental changes that institutions can absorb. In other words, reforms are more likely to last when introduced step by step so institutions and people can adjust.', NULL, 155, TRUE, 1.0, 'conceptual', 'v2.1'),
    (156, 'F1', -1, 'Rapid transformation often creates unintended harms greater than the problems it addresses. In other words, changing a system too quickly can create problems worse than the original problem.', NULL, 156, TRUE, 1.0, 'conceptual', 'v2.1'),
    (157, 'F1', -1, 'Stability and continuity have value even when significant reform is needed. In other words, keeping systems stable and continuous has value even while they are being improved.', NULL, 157, TRUE, 1.0, 'conceptual', 'v2.1'),
    (158, 'F1', 1, 'Entrenched systems sometimes require rapid structural change rather than gradual adjustment. In other words, deeply rooted problems may require replacing major structures quickly instead of making small adjustments.', NULL, 158, TRUE, 1.0, 'conceptual', 'v2.1'),
    (159, 'F1', 1, 'Disruption can be legitimate when ordinary channels consistently protect injustice. In other words, disruptive action can be justified when normal political or legal processes repeatedly preserve injustice.', NULL, 159, TRUE, 1.0, 'conceptual', 'v2.1'),
    (160, 'F1', 1, 'Compromise can preserve a harmful system by relieving the pressure for deeper reform. In other words, accepting a partial deal can sometimes weaken the pressure needed to fix the larger problem.', NULL, 160, TRUE, 1.0, 'conceptual', 'v2.1'),
    (161, 'F1', -1, 'A national social program should be tested in several regions and revised before being implemented everywhere. In other words, a pilot tests a policy on a limited scale before wider adoption.', 'Assume that the pilot regions are reasonably representative and the results will be independently evaluated before national expansion.', 161, TRUE, 1.15, 'applied', 'v2.1'),
    (162, 'F1', -1, 'A movement should accept a meaningful partial emissions law now rather than reject it while waiting for a complete climate package. In other words, the scenario assumes the partial law creates a real improvement but does not achieve the movement''s full goal.', 'Assume that the partial law creates a meaningful near-term improvement but falls well short of the movement''s full program.', 162, TRUE, 1.15, 'applied', 'v2.1'),
    (163, 'F1', -1, 'Police reform should proceed through staged standards, training, and oversight unless evidence shows the institutions cannot be repaired. In other words, staged reform changes rules and oversight over time rather than abolishing and replacing the institution at once.', NULL, 163, TRUE, 1.15, 'applied', 'v2.1'),
    (164, 'F1', -1, 'Employees who uncover wrongdoing should normally use protected reporting channels before releasing confidential material publicly. In other words, protected channels may include inspectors general, regulators, unions, courts, or designated compliance offices.', 'Assume that the protected channels are independent enough to investigate the allegation and can protect the employee from retaliation.', 164, TRUE, 1.15, 'applied', 'v2.1'),
    (165, 'F1', 1, 'A constitutional convention may be justified when ordinary amendment procedures repeatedly prevent reform of a political system that is failing basic democratic functions. In other words, a specially authorized body could propose broad constitutional changes after normal amendment rules repeatedly block repairs to a failing system.', 'Assume that ordinary amendment procedures have repeatedly failed despite broad support and the proposed convention is legally authorized.', 165, TRUE, 1.15, 'applied', 'v2.1'),
    (166, 'F1', 1, 'A general strike can be legitimate when normal bargaining and elections cannot overcome entrenched labor abuses. In other words, a general strike is a broad work stoppage across multiple industries or sectors.', 'Assume that the labor abuses are severe, normal bargaining and elections have repeatedly failed, and the strike remains nonviolent.', 166, TRUE, 1.15, 'applied', 'v2.1'),
    (167, 'F1', 1, 'A movement may reject a partial compromise when accepting it would remove the pressure needed for structural reform. In other words, the question assumes the partial measure provides some benefit but may reduce momentum for broader change.', NULL, 167, TRUE, 1.15, 'applied', 'v2.1'),
    (168, 'F1', 1, 'A deeply discredited agency may need to be abolished and rebuilt rather than improved through another round of internal reforms. In other words, abolition and rebuilding replace the organization, mandate, and operating rules rather than only changing leadership or procedures.', 'Assume that independent evidence shows persistent institutional failure that cannot be corrected merely by replacing current leaders.', 168, TRUE, 1.15, 'applied', 'v2.1'),
    (169, 'F2', -1, 'Professional norms and oversight usually constrain misconduct within major institutions. In other words, professional rules, peer review, and oversight usually keep large institutions from serious misconduct.', NULL, 169, TRUE, 1.0, 'conceptual', 'v2.1'),
    (170, 'F2', -1, 'Institutions that expose errors and correct them deserve a presumption of good faith. In other words, an institution that openly admits and fixes mistakes should usually be trusted unless contrary evidence appears.', NULL, 170, TRUE, 1.0, 'conceptual', 'v2.1'),
    (171, 'F2', -1, 'Stable institutions generally produce more reliable decisions than improvised alternatives. In other words, established organizations with stable procedures usually make better decisions than temporary or improvised groups.', NULL, 171, TRUE, 1.0, 'conceptual', 'v2.1'),
    (172, 'F2', 1, 'Powerful institutions often protect their own interests while presenting their choices as neutral. In other words, institutions may present decisions as objective while quietly protecting their own power, reputation, or funding.', NULL, 172, TRUE, 1.0, 'conceptual', 'v2.1'),
    (173, 'F2', 1, 'Official expertise should be independently verifiable rather than accepted on authority. In other words, expert claims should be supported by evidence that outsiders can check, not accepted only because an authority says so.', NULL, 173, TRUE, 1.0, 'conceptual', 'v2.1'),
    (174, 'F2', 1, 'Transparency and external audit are more reliable than institutional assurances. In other words, independent review and open information provide more confidence than an institution simply asking to be trusted.', NULL, 174, TRUE, 1.0, 'conceptual', 'v2.1'),
    (175, 'F2', -1, 'A certified election result should be accepted after transparent procedures, bipartisan observation, and a completed independent audit. In other words, an election audit checks records or paper ballots using procedures independent of the original count.', 'Assume that the audit is genuinely independent, uses reliable records, and is completed before the result is treated as final.', 175, TRUE, 1.15, 'applied', 'v2.1'),
    (176, 'F2', -1, 'When several independent research groups converge on the same finding, public policy should generally treat that consensus as reliable. In other words, independent studies reaching similar conclusions comes from separate teams, methods, or datasets reaching compatible conclusions.', 'Assume that the studies are methodologically sound, genuinely independent, and reach similar conclusions using different data or methods.', 176, TRUE, 1.15, 'applied', 'v2.1'),
    (177, 'F2', -1, 'Judges should be presumed to be acting in good faith unless evidence shows corruption or undisclosed conflicts. In other words, a presumption of good faith can be rebutted by evidence and does not prevent appeals or oversight.', NULL, 177, TRUE, 1.15, 'applied', 'v2.1'),
    (178, 'F2', -1, 'A public-health agency may receive temporary operational discretion during an outbreak when it publishes its evidence and decisions for review. In other words, the agency could make day-to-day outbreak decisions within limits already set by law, without asking lawmakers to approve every action.', 'Assume that the discretion is temporary, limited by law, transparent, and subject to later legislative and judicial review.', 178, TRUE, 1.15, 'applied', 'v2.1'),
    (179, 'F2', 1, 'Regulators should be required to publish models, assumptions, and uncertainty ranges before major rules take effect. In other words, models and uncertainty ranges show how projected effects depend on assumptions and incomplete evidence.', 'Assume that publication can protect legitimate personal privacy and security secrets while still allowing meaningful outside scrutiny.', 179, TRUE, 1.15, 'applied', 'v2.1'),
    (180, 'F2', 1, 'Clinical-trial data supporting public recommendations should be available for independent reanalysis, not only summarized by sponsors or agencies. In other words, independent an independent check of the same data checks whether results depend on analytic choices, exclusions, or reporting.', 'Assume that qualified independent researchers can access sufficiently detailed data under privacy and security safeguards.', 180, TRUE, 1.15, 'applied', 'v2.1'),
    (181, 'F2', 1, 'Senior officials should face strict cooling-off periods before taking paid roles in industries they regulated. In other words, a cooling-off period delays lobbying or employment connected to an official''s former responsibilities.', 'Assume that the restriction applies only to industries directly connected to the official''s recent regulatory authority.', 181, TRUE, 1.15, 'applied', 'v2.1'),
    (182, 'F2', 1, 'Police and welfare algorithms should be subject to outside audits because agencies cannot be trusted to assess their own systems. In other words, an outside audit can evaluate accuracy, bias, security, documentation, and appeal procedures.', 'Assume that the outside auditor is institutionally independent and can examine data, design, outcomes, and appeal procedures.', 182, TRUE, 1.15, 'applied', 'v2.1'),
    (183, 'F3', -1, 'Wrongdoers deserve punishment proportionate to the seriousness of their offense. In other words, the severity of punishment should match how serious the wrongdoing was.', NULL, 183, TRUE, 1.0, 'conceptual', 'v2.1'),
    (184, 'F3', -1, 'Public condemnation and punishment help reaffirm the moral boundaries of a community. In other words, punishment can publicly show which conduct a community considers unacceptable.', NULL, 184, TRUE, 1.0, 'conceptual', 'v2.1'),
    (185, 'F3', -1, 'Some offenses merit punishment even when it does not rehabilitate the offender. In other words, a person may deserve punishment even when punishment will not improve their future behavior.', NULL, 185, TRUE, 1.0, 'conceptual', 'v2.1'),
    (186, 'F3', 1, 'Justice should focus primarily on repairing harm and reintegrating people into society. In other words, justice should mainly repair the damage and help the offender return safely to the community.', NULL, 186, TRUE, 1.0, 'conceptual', 'v2.1'),
    (187, 'F3', 1, 'Victims and affected communities should have a meaningful role in resolving wrongdoing. In other words, people harmed by wrongdoing and their communities should help shape how the harm is addressed.', NULL, 187, TRUE, 1.0, 'conceptual', 'v2.1'),
    (188, 'F3', 1, 'Accountability can be achieved through restitution, treatment, and changed behavior rather than punishment alone. In other words, repayment, treatment, apology, supervision, and changed conduct can sometimes provide accountability without relying mainly on punishment.', NULL, 188, TRUE, 1.0, 'conceptual', 'v2.1'),
    (189, 'F3', -1, 'A professional who deliberately defrauds clients should lose their license even after full repayment and genuine remorse. In other words, professional discipline protects the public and can also express condemnation independent of criminal punishment.', 'Assume that the fraud was deliberate, serious, and directly related to the trust required by the profession.', 189, TRUE, 1.15, 'applied', 'v2.1'),
    (190, 'F3', -1, 'A commander responsible for war crimes should face punishment even if prosecution complicates a peace agreement. In other words, peace agreements sometimes offer amnesty or reduced punishment in exchange for ending conflict.', 'Assume that credible evidence establishes responsibility and the prosecution is conducted by a fair court.', 190, TRUE, 1.15, 'applied', 'v2.1'),
    (191, 'F3', -1, 'A repeat violent offender may deserve a long prison sentence even when rehabilitation appears unlikely. In other words, this scenario separates deserved punishment and confinement intended to prevent further harm from confidence in rehabilitation.', 'Assume that the prior violence is serious and repeated, and the sentence remains subject to lawful review.', 191, TRUE, 1.15, 'applied', 'v2.1'),
    (192, 'F3', -1, 'A public official who knowingly sells decisions for bribes should serve prison time rather than receive only restitution and a ban from office. In other words, restitution returns illicit gains; a ban from office prevents future public service.', NULL, 192, TRUE, 1.15, 'applied', 'v2.1'),
    (193, 'F3', 1, 'A juvenile who commits a serious assault should be offered intensive treatment, restitution, and supervised reintegration rather than automatically being sentenced as an adult. In other words, a restorative sentence can include confinement or supervision while emphasizing treatment, repair, and reintegration.', 'Assume that the treatment and supervision plan can protect the public and is not automatic release without accountability.', 193, TRUE, 1.15, 'applied', 'v2.1'),
    (194, 'F3', 1, 'A company that causes major pollution should be required to repair the damage, compensate communities, and submit to monitoring rather than rely mainly on punitive fines. In other words, remediation repairs environmental damage; monitoring verifies future compliance.', NULL, 194, TRUE, 1.15, 'applied', 'v2.1'),
    (195, 'F3', 1, 'A school response to serious student violence should include victim participation, treatment, and a safety plan rather than rely only on exclusion. In other words, victim participation must be voluntary and can occur without face-to-face contact.', NULL, 195, TRUE, 1.15, 'applied', 'v2.1'),
    (196, 'F3', 1, 'A truth commission may offer reduced punishment for full disclosure and victim reparations after a civil conflict. In other words, truth commissions investigate patterns of abuse and may trade reduced punishment for disclosure, acknowledgment, and reparations.', 'Assume that full disclosure is verified, victims receive meaningful reparations, and the reduced punishment remains proportionate to the agreement.', 196, TRUE, 1.15, 'applied', 'v2.1'),
    (197, 'F4', -1, 'Elected majorities should normally prevail over judges and unelected constitutional bodies. In other words, elected lawmakers and voters should usually have the final say rather than judges or other unelected bodies.', NULL, 197, TRUE, 1.0, 'conceptual', 'v2.1'),
    (198, 'F4', -1, 'A sustained democratic majority should be able to change most fundamental rules. In other words, a clear majority that continues over time should be able to change most constitutional or basic political rules.', NULL, 198, TRUE, 1.0, 'conceptual', 'v2.1'),
    (199, 'F4', -1, 'Minority protections should not become a general excuse for overriding ordinary democratic decisions. In other words, claims about protecting minorities should not routinely allow courts or unelected bodies to block normal majority decisions.', NULL, 199, TRUE, 1.0, 'conceptual', 'v2.1'),
    (200, 'F4', 1, 'Majority rule must be limited by rights that majorities cannot easily remove. In other words, some basic rights should remain protected even when most voters want to remove them.', NULL, 200, TRUE, 1.0, 'conceptual', 'v2.1'),
    (201, 'F4', 1, 'Courts may legitimately invalidate laws that violate constitutional protections. In other words, courts may properly stop a democratically passed law when it violates rights protected by the constitution.', NULL, 201, TRUE, 1.0, 'conceptual', 'v2.1'),
    (202, 'F4', 1, 'Fundamental political rules should require broader agreement than a temporary majority. In other words, changing the basic rules of government should require more lasting and widespread support than winning one ordinary election.', NULL, 202, TRUE, 1.0, 'conceptual', 'v2.1'),
    (203, 'F4', -1, 'Elected legislatures, not courts, should normally have the final word on contested social policy. In other words, on disputed social policy, courts would generally leave the final decision to elected lawmakers unless the constitution clearly requires otherwise.', 'Assume that the dispute concerns policy judgment rather than a clear violation of explicit constitutional text.', 203, TRUE, 1.15, 'applied', 'v2.1'),
    (204, 'F4', -1, 'A constitution should be amendable through two successive national majority votes without requiring a supermajority. In other words, a supermajority requires more than half, such as two-thirds, to approve a change.', 'Assume that the two majority votes occur at separate elections, allowing time for public reconsideration.', 204, TRUE, 1.15, 'applied', 'v2.1'),
    (205, 'F4', -1, 'A national referendum should be able to reverse a policy created by judicial interpretation when voters clearly reject it. In other words, voters could use a formally authorized national vote to reverse a rule that arose from a court''s interpretation.', 'Assume that the constitution expressly permits the referendum override and basic individual rights remain protected.', 205, TRUE, 1.15, 'applied', 'v2.1'),
    (206, 'F4', -1, 'Election rules may be changed by an elected majority after public debate rather than being insulated from ordinary politics. In other words, election law would remain changeable through the ordinary democratic process rather than requiring a commission, supermajority, or constitutional amendment.', 'Assume that the proposed change is public before the vote and applies prospectively rather than altering rules to decide an election already underway.', 206, TRUE, 1.15, 'applied', 'v2.1'),
    (207, 'F4', 1, 'Courts should invalidate a popular law that denies equal civil rights to a religious or ethnic minority. In other words, constitutional invalidation prevents enforcement even when the law was democratically enacted.', 'Assume that the law clearly denies an equal civil right rather than merely creating an incidental or disputed burden.', 207, TRUE, 1.15, 'applied', 'v2.1'),
    (208, 'F4', 1, 'Suspending core civil liberties during an emergency should require a legislative supermajority and prompt judicial review. In other words, prompt review requires courts to assess legality during, not only after, the emergency.', 'Assume that the emergency is genuine and the review occurs while the restriction is still operating.', 208, TRUE, 1.15, 'applied', 'v2.1'),
    (209, 'F4', 1, 'Independent election-administration rules should be protected from unilateral change by the party currently in power. In other words, the governing party could not change election-administration rules by itself through an ordinary majority vote.', 'Assume that the protection applies symmetrically regardless of which party is in power.', 209, TRUE, 1.15, 'applied', 'v2.1'),
    (210, 'F4', 1, 'Fundamental constitutional amendments should require broader and more durable agreement than a single election majority. In other words, broader agreement may require supermajorities, regional consent, or approval across multiple elections.', 'Assume that the amendment concerns the basic structure of government rather than an ordinary policy detail.', 210, TRUE, 1.15, 'applied', 'v2.1'),
    (211, 'F5', -1, 'Experts should advise democratic leaders but should not make value-laden public decisions for them. In other words, experts should explain evidence and options, but elected leaders should make decisions involving moral goals or political tradeoffs.', NULL, 211, TRUE, 1.0, 'conceptual', 'v2.1'),
    (212, 'F5', -1, 'Democratic accountability is more important than technically optimal policy. In other words, it is more important that decision-makers answer to voters than that specialists choose the policy they consider most effective.', NULL, 212, TRUE, 1.0, 'conceptual', 'v2.1'),
    (213, 'F5', -1, 'Elected officials should retain authority even when professional bodies strongly disagree. In other words, elected officials should make the final decision even when expert organizations strongly oppose it.', NULL, 213, TRUE, 1.0, 'conceptual', 'v2.1'),
    (214, 'F5', 1, 'Technical decisions should often be delegated to qualified professionals insulated from day-to-day politics. In other words, trained specialists should often make technical decisions without direct political control over each choice.', NULL, 214, TRUE, 1.0, 'conceptual', 'v2.1'),
    (215, 'F5', 1, 'Expertise can justify limiting the discretion of elected officials in specialized fields. In other words, in highly specialized areas, expert bodies may be allowed to restrict or overrule some choices by elected officials.', NULL, 215, TRUE, 1.0, 'conceptual', 'v2.1'),
    (216, 'F5', 1, 'Evidence-based standards should constrain popular preferences when the public cannot easily evaluate complex risks. In other words, technical safety rules may properly limit what most voters want when the risks are too complex for ordinary public judgment.', NULL, 216, TRUE, 1.0, 'conceptual', 'v2.1'),
    (217, 'F5', -1, 'Elected lawmakers should decide whether government may use AI surveillance rather than delegate the value judgment to a technical commission. In other words, a technical commission can assess feasibility and risk, but the question concerns who makes the final moral or political choice.', 'Assume that experts still assess technical feasibility and risk; the question is who makes the final moral and political choice.', 217, TRUE, 1.15, 'applied', 'v2.1'),
    (218, 'F5', -1, 'Local voters should make the final land-use tradeoff after experts present the evidence. In other words, experts provide analysis, while voters retain final authority over the tradeoff.', 'Assume that experts present credible evidence and practical options before the vote.', 218, TRUE, 1.15, 'applied', 'v2.1'),
    (219, 'F5', -1, 'Civilian elected leaders should determine military objectives rather than defer to commanders because the issue is technically complex. In other words, civilian control gives elected authorities final responsibility for political objectives and acceptable risk.', 'Assume that civilian leaders have access to the relevant military advice and intelligence.', 219, TRUE, 1.15, 'applied', 'v2.1'),
    (220, 'F5', -1, 'Elected school boards should set curriculum priorities rather than delegate them entirely to academic specialists. In other words, curriculum priorities combine technical pedagogy with public judgments about goals and content.', 'Assume that academic specialists advise the board and professional teaching standards remain enforceable.', 220, TRUE, 1.15, 'applied', 'v2.1'),
    (221, 'F5', 1, 'An independent central bank should set short-term interest rates without needing approval from elected officials. In other words, appointed monetary officials would raise or lower short-term interest rates within a legal mandate without seeking approval from elected leaders.', 'Assume that the bank operates under a clear legal mandate, publishes its reasoning, and remains accountable for meeting stated goals.', 221, TRUE, 1.15, 'applied', 'v2.1'),
    (222, 'F5', 1, 'A scientific public-health body should set vaccine schedules using published evidence rather than popular vote. In other words, vaccine schedules determine recommended timing and eligibility based on disease risk and evidence.', 'Assume that the scientific body publishes its evidence, conflicts, and reasoning and its schedule can be reviewed as evidence changes.', 222, TRUE, 1.15, 'applied', 'v2.1'),
    (223, 'F5', 1, 'An independent grid operator should be able to order reliability investments that elected officials may find politically unpopular. In other words, a grid operator coordinates electricity supply and transmission to prevent instability and outages.', 'Assume that the operator is independent of market participants, uses published reliability standards, and must justify the investment.', 223, TRUE, 1.15, 'applied', 'v2.1'),
    (224, 'F5', 1, 'Exposure limits for toxic chemicals should be set by technical panels using transparent risk methods. In other words, specialists would set the maximum amount of a toxic substance people may safely encounter, using public evidence and stated safety margins.', 'Assume that the panel publishes the evidence, assumptions, safety margins, conflicts of interest, and a process for later revision.', 224, TRUE, 1.15, 'applied', 'v2.1'),
    (225, 'F6', -1, 'Citizens should decide major public questions directly whenever practical. In other words, voters should make major decisions themselves instead of always acting through representatives.', NULL, 225, TRUE, 1.0, 'conceptual', 'v2.1'),
    (226, 'F6', -1, 'Referendums and initiatives are necessary checks on a self-protecting political class. In other words, direct votes and citizen-proposed laws help prevent elected officials from protecting their own power.', NULL, 226, TRUE, 1.0, 'conceptual', 'v2.1'),
    (227, 'F6', -1, 'Voters should be able to recall officials who lose public confidence before the next scheduled election. In other words, voters should be able to remove an official before the next election if enough public support for removal exists.', NULL, 227, TRUE, 1.0, 'conceptual', 'v2.1'),
    (228, 'F6', 1, 'Representatives can weigh evidence and negotiate tradeoffs better than mass referendums. In other words, representatives can study evidence, revise proposals, and make compromises more effectively than a single yes-or-no public vote.', NULL, 228, TRUE, 1.0, 'conceptual', 'v2.1'),
    (229, 'F6', 1, 'Complex policies should be shaped through deliberation and amendment rather than a single popular vote. In other words, complicated laws should be developed through debate and revision rather than accepted or rejected as one fixed proposal.', NULL, 229, TRUE, 1.0, 'conceptual', 'v2.1'),
    (230, 'F6', 1, 'Elected representatives should have discretion to make decisions that differ from current polling. In other words, representatives should sometimes use their own judgment instead of following the latest opinion poll.', NULL, 230, TRUE, 1.0, 'conceptual', 'v2.1'),
    (231, 'F6', -1, 'Voters should be able to legalize or prohibit major policies through ballot initiatives even when the legislature disagrees. In other words, a ballot initiative lets voters enact or repeal law directly after a petition process.', 'Assume that the initiative follows a valid petition and voting process and does not remove protected constitutional rights.', 231, TRUE, 1.15, 'applied', 'v2.1'),
    (232, 'F6', -1, 'A mayor should be subject to recall before the next election when a petition reaches a high signature threshold. In other words, a recall election asks voters whether to remove an official before the scheduled end of the term.', 'Assume that the signature threshold is high enough to show broad concern and the official receives a fair public vote.', 232, TRUE, 1.15, 'applied', 'v2.1'),
    (233, 'F6', -1, 'Major long-term public borrowing should require approval in a referendum. In other words, public borrowing commits future revenue to repay principal and interest.', 'Assume that the requirement applies only above a clearly defined long-term borrowing threshold.', 233, TRUE, 1.15, 'applied', 'v2.1'),
    (234, 'F6', -1, 'Residents should directly vote on a meaningful share of the municipal budget. In other words, participatory budgeting lets residents propose and vote on specified public expenditures.', 'Assume that the share is large enough to affect priorities but leaves legally required services and debt payments outside the vote.', 234, TRUE, 1.15, 'applied', 'v2.1'),
    (235, 'F6', 1, 'Complex tax reform should be decided by elected representatives after hearings and amendment rather than by a single up-or-down referendum. In other words, hearings and amendment allow provisions to be revised separately before final passage.', 'Assume that the reform is technically interconnected and lawmakers publish the proposed changes before voting.', 235, TRUE, 1.15, 'applied', 'v2.1'),
    (236, 'F6', 1, 'Legislatures should be allowed to make unpopular compromises that would be difficult to assemble through separate ballot questions. In other words, a legislative package can link concessions across issues that voters would otherwise consider separately.', 'Assume that the compromise package is transparent and each linked concession is disclosed to voters.', 236, TRUE, 1.15, 'applied', 'v2.1'),
    (237, 'F6', 1, 'Citizens'' views should inform policy, but representatives should retain discretion to change position after reviewing evidence. In other words, representatives would listen to voters but could change their position after studying evidence and would be expected to explain why.', 'Assume that representatives must explain their reasoning publicly and remain accountable at the next election.', 237, TRUE, 1.15, 'applied', 'v2.1'),
    (238, 'F6', 1, 'Minority-rights protections should not be submitted to frequent popular referendums. In other words, frequent referendums can repeatedly reopen settled legal status and expose small groups to majority campaigns.', 'Assume that the protections concern basic legal status and remain open to ordinary legislative and judicial review when circumstances materially change.', 238, TRUE, 1.15, 'applied', 'v2.1'),
    (239, 'F7', -1, 'Military force usually creates new dangers that outlast the problem it was meant to solve. In other words, war often creates lasting instability, retaliation, or suffering beyond the original dispute.', NULL, 239, TRUE, 1.0, 'conceptual', 'v2.1'),
    (240, 'F7', -1, 'Diplomacy and economic engagement should be preferred even when they take longer. In other words, negotiation, trade, and other peaceful tools should be used even when they work slowly.', NULL, 240, TRUE, 1.0, 'conceptual', 'v2.1'),
    (241, 'F7', -1, 'The risk to civilians should create a strong presumption against using force. In other words, the chance of civilian deaths should make governments strongly reluctant to use military force.', NULL, 241, TRUE, 1.0, 'conceptual', 'v2.1'),
    (242, 'F7', 1, 'Peace often depends on a credible willingness to use military force. In other words, other countries may avoid aggression only when they believe military retaliation is possible.', NULL, 242, TRUE, 1.0, 'conceptual', 'v2.1'),
    (243, 'F7', 1, 'Military intervention can be justified to prevent a substantially worse outcome. In other words, using force can be right when it prevents a much greater harm that cannot otherwise be stopped.', NULL, 243, TRUE, 1.0, 'conceptual', 'v2.1'),
    (244, 'F7', 1, 'Alliances are meaningful only when members are willing to fight for one another. In other words, a defense alliance has little value unless members are prepared to use force when another member is attacked.', NULL, 244, TRUE, 1.0, 'conceptual', 'v2.1'),
    (245, 'F7', -1, 'A country should not launch a preventive war based only on suspicion that another state may develop dangerous weapons. In other words, a preventive war attacks a possible future danger before the other country has begun or is about to begin an attack.', 'Assume that the suspected threat is not imminent and reliable peaceful monitoring remains available.', 245, TRUE, 1.15, 'applied', 'v2.1'),
    (246, 'F7', -1, 'Diplomacy, inspections, and targeted sanctions should be exhausted before conventional military force is used. In other words, targeted sanctions focus on leaders, firms, or sectors rather than broadly restricting an entire population.', 'Assume that the listed peaceful measures are feasible, targeted, and given a reasonable chance to work.', 246, TRUE, 1.15, 'applied', 'v2.1'),
    (247, 'F7', -1, 'Arms sales should end when an allied government repeatedly uses the weapons against civilians. In other words, arms transfers can include sales, grants, maintenance, ammunition, and technical support.', 'Assume that the civilian harm is repeated, credibly documented, and caused with weapons or support supplied by the country.', 247, TRUE, 1.15, 'applied', 'v2.1'),
    (248, 'F7', -1, 'Military conscription should be reserved for defense against a direct and severe threat to the country. In other words, conscription requires eligible people to perform military service.', 'Assume that the service requirement is limited to the duration and scale of the direct severe threat.', 248, TRUE, 1.15, 'applied', 'v2.1'),
    (249, 'F7', 1, 'A treaty ally that is invaded should be defended militarily even when doing so creates serious costs and escalation risks. In other words, collective-defense treaties commit members to assist one another after an attack.', 'Assume that the treaty obligation is clear, the ally did not provoke the invasion, and defensive aims remain limited.', 249, TRUE, 1.15, 'applied', 'v2.1'),
    (250, 'F7', 1, 'Limited military strikes can be justified to stop an imminent mass killing when no effective peaceful option remains. In other words, a limited strike uses force for a narrow objective rather than broader regime change or occupation.', 'Assume that the mass killing is imminent, attribution is reliable, and no effective peaceful option can act in time.', 250, TRUE, 1.15, 'applied', 'v2.1'),
    (251, 'F7', 1, 'A credible nuclear deterrent should be maintained as long as rival states possess nuclear weapons. In other words, the country would keep nuclear weapons capable of surviving an attack and striking back so rivals expect aggression to be met with devastating retaliation.', 'Assume that rival nuclear forces remain capable of attacking and the deterrent is maintained under strict command, safety, and civilian-control rules.', 251, TRUE, 1.15, 'applied', 'v2.1'),
    (252, 'F7', 1, 'A major state-sponsored cyberattack on critical infrastructure may justify proportionate offensive retaliation. In other words, after reliable attribution, the country could use a limited cyber, economic, or military response matched to the scale of the attack.', 'Assume that attribution is based on high-confidence evidence and the response is limited to what is necessary to deter or stop comparable attacks.', 252, TRUE, 1.15, 'applied', 'v2.1'),
    (253, 'C1', 1, 'Private firms should be allowed to use biometric screening with customer consent, even if it substantially reduces privacy. In other words, biometric screening uses traits such as face, fingerprint, or voice to verify identity.', 'Assume that consent is informed, refusal remains practical, and the company does not use the biometric data for unrelated purposes.', 253, TRUE, 1.25, 'applied', 'v2.1'),
    (254, 'C1', -1, 'Government should require private venues to install standardized surveillance systems as a condition of operating, even if the mandate raises costs and reduces privacy. In other words, a surveillance mandate can require cameras, identity checks, data retention, or reporting as a condition of operating.', 'Assume that the mandate is publicly defined, applies consistently, and includes enforceable limits on data access and retention.', 254, TRUE, 1.25, 'applied', 'v2.1'),
    (255, 'C4', 1, 'Cities should be free to cap fees charged by delivery platforms, even if some firms leave those markets. In other words, platform fee caps limit the commission charged to restaurants, drivers, or customers.', 'Assume that the city has legal authority over the fees and the cap is publicly stated before firms decide whether to remain.', 255, TRUE, 1.25, 'applied', 'v2.1'),
    (256, 'C4', -1, 'The national government should require public ownership of water utilities in every region even when local voters prefer private provision. In other words, a national mandate would remove local choice over whether the utility is publicly or privately owned.', 'Assume that the national law provides compensation for lawful private assets and preserves ordinary service and rate protections.', 256, TRUE, 1.25, 'applied', 'v2.1'),
    (257, 'C1', 1, 'Countries should accept binding international competition rules that prohibit subsidies and favoritism toward domestic firms. In other words, the international rules would stop governments from giving domestic firms special subsidies, contracts, or legal advantages that distort competition.', 'Assume that the rules apply symmetrically, distinguish legitimate safety rules from favoritism, and use an independent dispute process.', 257, TRUE, 1.25, 'applied', 'v2.1'),
    (258, 'C1', -1, 'A group of countries should coordinate public subsidies for strategic industries through a binding international agreement. In other words, the agreement would pool or coordinate state support rather than prohibit industrial policy.', 'Assume that participating countries voluntarily accept the binding agreement and disclose the subsidies they coordinate.', 258, TRUE, 1.25, 'applied', 'v2.1'),
    (259, 'C6', 1, 'Charitable donors should be free to direct their money to the neediest people worldwide without tax rules favoring domestic beneficiaries. In other words, tax neutrality means the government does not favor domestic over foreign beneficiaries when recognizing charitable gifts.', 'Assume that the issue is only whether tax law favors domestic beneficiaries, not whether government must subsidize the donation.', 259, TRUE, 1.25, 'applied', 'v2.1'),
    (260, 'C2', 1, 'Charitable donors should be free to restrict privately funded scholarships to members of their own community even when equally needy outsiders apply. In other words, a donor-directed restriction uses private funds but limits eligibility according to community membership.', 'Assume that the scholarship uses private funds and the donor''s restriction does not violate an independently applicable law.', 260, TRUE, 1.25, 'applied', 'v2.1'),
    (261, 'C2', -1, 'Religious schools receiving public funds should follow the same nondiscrimination rules as other publicly funded schools, even when those rules conflict with doctrine. In other words, a religious school could choose whether to accept public money, but accepting it would require following the same equal-treatment rules as other publicly funded schools.', 'Assume that accepting public funds is voluntary and the nondiscrimination rules are clear before the school accepts them.', 261, TRUE, 1.25, 'applied', 'v2.1'),
    (262, 'C5', -1, 'Government should provide a family allowance only to married couples raising children in a traditional household. In other words, a family allowance is a public cash benefit tied to children or household status.', 'Assume that the benefit is genuinely unavailable to unmarried or nontraditional households with otherwise similar children and needs.', 262, TRUE, 1.25, 'applied', 'v2.1'),
    (263, 'C9', 1, 'Government may prohibit private development in a critical wildlife corridor even when owners are willing to accept environmental mitigation. In other words, a wildlife corridor connects habitats needed for migration, breeding, and genetic diversity.', 'Assume that the corridor is critical to species survival and proposed mitigation cannot preserve its connecting function.', 263, TRUE, 1.25, 'applied', 'v2.1'),
    (264, 'C3', -1, 'During a severe food shortage, government may require landowners to clear protected habitat for emergency crop production. In other words, the scenario uses compulsory production to increase food supply at direct ecological cost.', 'Assume that the shortage threatens widespread severe hunger and less damaging ways to increase food supply cannot act in time.', 264, TRUE, 1.25, 'applied', 'v2.1'),
    (265, 'C7', 1, 'A state or province should be allowed to join an international climate compact even when the national government objects. In other words, a subnational government could enter a formal cross-border climate agreement even though the national government opposes it.', 'Assume that the constitution permits subnational governments to join this kind of compact and the agreement does not bind the national government beyond that region.', 265, TRUE, 1.25, 'applied', 'v2.1'),
    (266, 'C7', -1, 'Regions should be free to reject an international agreement adopted by the national government when the agreement intrudes on local authority. In other words, a region could decline to carry out a national government''s international commitment when that commitment overrides powers normally reserved to the region.', 'Assume that the constitution permits a regional opt-out and the agreement mainly governs matters normally controlled by the region.', 266, TRUE, 1.25, 'applied', 'v2.1'),
    (267, 'C5', 1, 'Fertility clinics should be allowed to offer new reproductive technologies once safety is established, even when the technologies challenge traditional ideas about family. In other words, reproductive technologies can change biological, gestational, and social relationships within families.', 'Assume that independent evidence establishes safety and participants receive clear information and voluntary choice.', 267, TRUE, 1.25, 'applied', 'v2.1'),
    (268, 'C8', -1, 'Government should restrict automated systems that reproduce traditional gender and family assumptions, even if doing so slows deployment of useful AI. In other words, government would slow or limit an automated system when testing shows that it carries traditional assumptions about gender or family into important decisions.', 'Assume that the biased assumptions are documented, the restriction is targeted to the affected uses, and less restrictive corrections are insufficient.', 268, TRUE, 1.25, 'applied', 'v2.1'),
    (269, 'C7', 1, 'A regional union should allocate asylum seekers among member states by capacity and need, even when voters in one state want to prioritize co-nationals. In other words, the union would use one transparent formula to place asylum seekers according to capacity and vulnerability rather than national preference.', 'Assume that the formula, funding, and capacity measures are public and applicants retain ordinary legal protections.', 269, TRUE, 1.25, 'applied', 'v2.1'),
    (270, 'C6', -1, 'As one policy package, a country should join a regional trade-and-migration union while reserving selected welfare benefits for its own citizens. In other words, the country would accept shared trade and migration rules while keeping specified public benefits available only to its own citizens.', 'Assume that the union legally permits the welfare reservation and the package is considered as a whole rather than as three separate questions.', 270, TRUE, 1.25, 'applied', 'v2.1'),
    (271, 'C9', -1, 'Large desalination plants should be built to secure water for cities even when they cause manageable but significant harm to marine ecosystems. In other words, desalination removes salt from water and can affect marine life through intake systems, energy use, and concentrated brine discharge.', 'Assume that the water need is serious, the ecological damage is significant but technically manageable, and lower-impact alternatives are insufficient.', 271, TRUE, 1.25, 'applied', 'v2.1'),
    (272, 'C9', 1, 'Precision fermentation and cultivated meat should be deployed to reduce land use and animal suffering even if they disrupt conventional agriculture. In other words, new food technologies would replace some conventional livestock farming, reducing land use and animal suffering while disrupting existing farmers and industries.', 'Assume that the products meet ordinary food-safety standards and the disruption to existing agriculture is expected to be substantial.', 272, TRUE, 1.25, 'applied', 'v2.1'),
    (273, 'C8', -1, 'Heritable gene editing should remain prohibited because altering future persons crosses a moral boundary even if it could prevent serious disease. In other words, heritable changes can affect descendants who cannot consent to the intervention.', 'Assume that the intervention could prevent serious disease but would create changes inherited by people who cannot consent.', 273, TRUE, 1.25, 'applied', 'v2.1'),
    (274, 'C10', 1, 'Because societies hold different moral views about human enhancement, deployment should be paused until broad cross-cultural consent exists. In other words, deployment would wait for broad agreement across different cultures because the technology changes human abilities in morally disputed ways.', 'Assume that broad cross-cultural consent means strong agreement across diverse societies, not unanimity by every person or government.', 274, TRUE, 1.25, 'applied', 'v2.1'),
    (275, 'C11', 1, 'Environmental law should balance species protection, housing, livelihoods, and cultural use case by case rather than give any one value automatic priority. In other words, officials would weigh several genuine interests in each case while still enforcing minimum protections for species and ecosystems.', 'Assume that minimum legal protections remain in force and the case-by-case process must publicly explain how each value was weighed.', 275, TRUE, 1.25, 'applied', 'v2.1'),
    (276, 'C9', -1, 'Environmental law should permit essential human development to override habitat protection when several legitimate values conflict and no single value has absolute priority. In other words, the scenario treats ecological protection as one important value among several rather than an absolute side constraint.', 'Assume that the development is essential, lower-harm alternatives are unavailable, and habitat protection remains an important consideration rather than being ignored.', 276, TRUE, 1.25, 'applied', 'v2.1'),
    (277, 'C3', 1, 'A movement may nonviolently occupy a government building to force urgent reform when lawful channels have repeatedly failed. In other words, an occupation remains nonviolent but interferes with normal use of a public building.', 'Assume that the occupation is nonviolent, lawful channels have repeatedly failed, and emergency services and personal safety are not obstructed.', 277, TRUE, 1.25, 'applied', 'v2.1'),
    (278, 'F5', 1, 'An expert regulatory agency should receive broad discretion only as part of a package requiring public data, public models, conflict disclosures, and independent audits. In other words, the agency would receive freedom to choose methods and timing only if outsiders can inspect the evidence, models, financial interests, and audit results.', 'Assume that the transparency and audit safeguards are treated as one mandatory package and remain enforceable throughout the delegation.', 278, TRUE, 1.25, 'applied', 'v2.1'),
    (279, 'F4', 1, 'A constitutional court may replace a voter-approved mandatory prison sentence with a restorative sentence when proportionality review finds the punishment excessive for the offense. In other words, the court would find the mandatory punishment excessively harsh for the offense and substitute a sentence focused more on repair and rehabilitation.', 'Assume that the court has lawful authority to conduct proportionality review and the finding of excessiveness is based on the offense and the person''s circumstances.', 279, TRUE, 1.25, 'applied', 'v2.1'),
    (280, 'F6', -1, 'A citywide referendum should be able to overturn a neighborhood board''s zoning decision. In other words, the citywide electorate is a higher territorial level than the neighborhood board.', 'Assume that the referendum is legally authorized, includes the whole municipality, and the neighborhood board''s decision is not protected by a higher constitutional right.', 280, TRUE, 1.25, 'applied', 'v2.1'),
    (281, 'F7', 1, 'A country should join a mutual-defense alliance that obligates it to fight if any member is attacked. In other words, a mutual-defense clause creates a standing obligation rather than a case-by-case promise.', 'Assume that the mutual-defense obligation is explicit, limited to an actual armed attack, and each member retains civilian control of its forces.', 281, TRUE, 1.25, 'applied', 'v2.1'),
    (282, 'F6', 1, 'Legislators should negotiate and enact one limited reform at a time rather than put one sweeping package to a direct public vote. In other words, elected representatives would pass smaller negotiated changes instead of asking voters to accept or reject one large package without amendment.', 'Assume that the limited reform and sweeping package address the same policy problem and the smaller reform is capable of producing a real benefit.', 282, TRUE, 1.25, 'applied', 'v2.1'),
    (283, 'F1', 1, 'A newly elected reform government should temporarily freeze the assets of officials credibly implicated in corruption while it rapidly restructures compromised agencies, before final judgments are complete. In other words, the government could freeze suspected corrupt officials'' assets before final judgments while rapidly rebuilding compromised agencies, subject to prompt court supervision.', 'Assume that credible evidence supports the corruption allegations, a court reviews each freeze promptly, and the restraints automatically expire unless renewed.', 283, TRUE, 1.25, 'applied', 'v2.1'),
    (284, 'F6', -1, 'Residents of a municipality should decide a major local land-use plan by binding referendum rather than leave the decision to the national legislature. In other words, a binding referendum gives voters direct decision authority rather than an advisory role.', 'Assume that the municipality has legal authority over the plan and the referendum is binding under existing law.', 284, TRUE, 1.25, 'applied', 'v2.1'),
    (285, 'C7', -1, 'A country should launch a limited unilateral strike against an imminent external threat even when international institutions refuse authorization. In other words, unilateral force is undertaken without authorization from a treaty body, regional organization, or the United Nations.', 'Assume that the threat is imminent and serious, peaceful alternatives cannot act in time, and international institutions have expressly refused authorization.', 285, TRUE, 1.25, 'applied', 'v2.1'),
    (286, 'F6', 1, 'A newly elected legislature should enact one comprehensive constitutional package quickly rather than divide the changes among separate referendums or smaller bills. In other words, representatives would pass several connected constitutional changes together during one reform period instead of sending each change to voters or passing it separately.', 'Assume that the legislature has legal authority to enact the package and the connected changes are publicly available before the vote.', 286, TRUE, 1.25, 'applied', 'v2.1'),
    (287, 'F2', -1, 'An independent central bank should be allowed to set interest rates without elected interference because its professional safeguards are generally trustworthy. In other words, appointed monetary officials would set interest rates without political interference because transparent rules, professional standards, and oversight are assumed to work.', 'Assume that the professional safeguards include transparency, conflict rules, independent review, and a clear legal mandate.', 287, TRUE, 1.25, 'applied', 'v2.1'),
    (288, 'F3', -1, 'A constitutional court should strike down a voter-approved amnesty for officials who committed torture because some offenses require proportionate punishment. In other words, the court would cancel an amnesty approved by voters because torture is treated as an offense for which some punishment is always required.', 'Assume that the torture findings are established through a fair process and the amnesty would otherwise remove all criminal liability.', 288, TRUE, 1.25, 'applied', 'v2.1'),
    (289, 'C10', -1, 'A hospital ethics board should give protection of innocent life lexical priority over autonomy, dignity, and social cost whenever those values conflict. In other words, lexical priority means that protecting innocent life would always come first instead of being weighed against autonomy, dignity, or cost case by case.', 'Assume that the values genuinely conflict in the case and the rule would apply categorically rather than only create a rebuttable presumption.', 289, TRUE, 1.25, 'applied', 'v2.1'),
    (290, 'C11', -1, 'A society may ground public ethics in one coherent moral tradition even if that tradition is historically contingent rather than objectively true. In other words, a society could consistently rank public values using one inherited tradition even while admitting that history created the tradition and that it is not objectively true.', 'Assume that the tradition can be publicly criticized and changed through lawful processes even though it supplies one coherent ranking of values.', 290, TRUE, 1.25, 'applied', 'v2.1'),
    (291, 'F2', 1, 'When watchdog evidence shows that an agency has repeatedly concealed corruption, its structure should be replaced quickly rather than repaired through gradual internal reforms. In other words, structural replacement changes authority, staffing, and procedures rather than relying only on internal corrective measures.', 'Assume that the concealment and corruption are established by credible independent evidence, not merely alleged.', 291, TRUE, 1.25, 'applied', 'v2.1'),
    (292, 'F1', -1, 'Even when major institutions are untrustworthy, reform should proceed through audited incremental changes rather than wholesale replacement. In other words, audited incremental reform changes bounded components while measuring results before broader restructuring.', 'Assume that each incremental change is independently audited, measurable, and reversible if it fails.', 292, TRUE, 1.25, 'applied', 'v2.1'),
    (293, 'C3', -1, 'Repeat violent offenders should receive long incapacitating sentences when confinement is necessary to protect the public, even if rehabilitation remains possible. In other words, a long incapacitating sentence means confinement long enough to prevent a person assessed as highly dangerous from committing further violence in the community.', 'Assume that a validated risk assessment shows a continuing serious danger, humane prison conditions are maintained, and the sentence receives periodic review.', 293, TRUE, 1.25, 'applied', 'v2.1'),
    (294, 'F3', 1, 'A person convicted of serious assault should receive a shorter custodial sentence followed by intensive restorative supervision when strong evidence shows that this reduces repeat violence more effectively. In other words, a custodial sentence is time in jail or prison; restorative supervision can include treatment, restitution, victim participation, close monitoring, and a safety plan after release.', 'Assume that strong comparative evidence shows the combined sentence protects the public at least as well as a longer prison term.', 294, TRUE, 1.25, 'applied', 'v2.1'),
    (295, 'F5', -1, 'Elected legislatures should be able to overrule expert agencies on major policy choices, while courts intervene only when the override violates a clear constitutional rule. In other words, lawmakers could reverse an expert agency''s major policy judgment, and courts would stop that reversal only when it clearly violates the constitution.', 'Assume that the expert agency remains responsible for technical implementation after the legislature makes the final policy choice.', 295, TRUE, 1.25, 'applied', 'v2.1'),
    (296, 'F4', -1, 'A legislative majority should be able to delegate narrow, temporary emergency powers to an expert agency and bar courts from reviewing the agency''s individual decisions during that period. In other words, lawmakers could temporarily give specialists final authority over individual emergency decisions and prevent immediate court review of those decisions.', 'Assume that the delegated powers are precisely defined, automatically expire, remain subject to legislative oversight, and courts may still review whether the agency exceeded the delegation after the emergency period.', 296, TRUE, 1.25, 'applied', 'v2.1'),
    (297, 'F7', -1, 'Instead of overseas military action, government should rely on expanded domestic screening and surveillance to prevent attacks. In other words, the strategy avoids military force but accepts broader coercive prevention within the country.', 'Assume that the expanded screening and surveillance remain subject to ordinary domestic law, time limits, and oversight.', 297, TRUE, 1.25, 'applied', 'v2.1'),
    (298, 'C3', 1, 'A country should reject both military retaliation and broad domestic surveillance after a foreign-sponsored attack, relying on ordinary criminal investigation and diplomacy. In other words, the country would respond through ordinary police investigation and diplomacy rather than either military force or exceptional domestic surveillance.', 'Assume that ordinary investigation is realistically capable of pursuing the responsible individuals, although it may provide less deterrence than force or exceptional surveillance.', 298, TRUE, 1.25, 'applied', 'v2.1'),
    (299, 'C8', 1, 'Private firms should be free to deploy labor-saving automation once safety standards are met, without job-preservation quotas or public ownership requirements. In other words, job-preservation quotas require firms to retain a specified amount of human labor despite available automation.', 'Assume that independent evidence shows the automation meets applicable safety standards and workers receive whatever transition protections ordinary law requires.', 299, TRUE, 1.25, 'applied', 'v2.1'),
    (300, 'C8', 1, 'Government should build and operate a national advanced-computing utility so access to powerful AI is not controlled by a few private firms. In other words, the government would own or operate large computing systems and allocate access under public rules instead of leaving the most powerful AI infrastructure to a few private companies.', 'Assume that the utility uses published access rules, protects sensitive information, and does not give government unrestricted control over private AI applications.', 300, TRUE, 1.25, 'applied', 'v2.1');


--
-- Data for Name: question_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.question_metadata (question_id, bank_version, policy_domain, latent_conflict, actor_level, policy_instrument, scenario_conditions, item_family, collision_pair) VALUES
    (1, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (2, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (3, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (4, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (5, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (6, 'v2.1', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (7, 'v2.1', 'energy & utilities', 'State-Directed vs Market-Directed', 'national/regional', 'public provision', 'ordinary', 'base', NULL),
    (8, 'v2.1', 'macroeconomics & finance', 'State-Directed vs Market-Directed', 'national', 'public credit', 'persistent market gap', 'base', NULL),
    (9, 'v2.1', 'industrial policy & trade', 'State-Directed vs Market-Directed', 'national', 'public ownership', 'strategic dependency', 'base', NULL),
    (10, 'v2.1', 'healthcare', 'State-Directed vs Market-Directed', 'national', 'temporary price control & allocation', 'emergency; scarcity', 'base', NULL),
    (11, 'v2.1', 'healthcare', 'State-Directed vs Market-Directed', 'national/regional', 'market entry', 'ordinary', 'base', NULL),
    (12, 'v2.1', 'labor & professional regulation', 'State-Directed vs Market-Directed', 'state/regional', 'deregulation', 'evidence-contingent', 'base', NULL),
    (13, 'v2.1', 'bankruptcy & transportation', 'State-Directed vs Market-Directed', 'national', 'bankruptcy instead of subsidy', 'recession/financial distress', 'base', NULL),
    (14, 'v2.1', 'digital infrastructure', 'State-Directed vs Market-Directed', 'local', 'competitive provision', 'ordinary', 'base', NULL),
    (15, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (16, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (17, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (18, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (19, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (20, 'v2.1', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (21, 'v2.1', 'welfare & income support', 'Redistributionist vs Property-Rights', 'national', 'cash transfer & progressive tax', 'ordinary', 'base', NULL),
    (22, 'v2.1', 'education finance', 'Redistributionist vs Property-Rights', 'state/regional', 'fiscal equalization', 'persistent geographic inequality', 'base', NULL),
    (23, 'v2.1', 'healthcare & social insurance', 'Redistributionist vs Property-Rights', 'national', 'universal public guarantee', 'long-term need', 'base', NULL),
    (24, 'v2.1', 'taxation & inheritance', 'Redistributionist vs Property-Rights', 'national', 'progressive estate tax', 'intergenerational transfer', 'base', NULL),
    (25, 'v2.1', 'education debt', 'Redistributionist vs Property-Rights', 'national', 'contract enforcement', 'ordinary', 'base', NULL),
    (26, 'v2.1', 'property taxation', 'Redistributionist vs Property-Rights', 'national/local', 'tax limitation', 'asset appreciation', 'base', NULL),
    (27, 'v2.1', 'corporate governance & labor', 'Redistributionist vs Property-Rights', 'national', 'ownership mandate', 'ordinary', 'base', NULL),
    (28, 'v2.1', 'income taxation', 'Redistributionist vs Property-Rights', 'national', 'flat tax', 'ordinary', 'base', NULL),
    (29, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (30, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (31, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (32, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (33, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (34, 'v2.1', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (35, 'v2.1', 'mental health & autonomy', 'Security/Order vs Civil Liberties', 'judiciary', 'involuntary treatment', 'immediate danger; temporary', 'base', NULL),
    (36, 'v2.1', 'public health', 'Security/Order vs Civil Liberties', 'national/local', 'mandatory quarantine', 'emergency; confirmed infection; temporary', 'base', NULL),
    (37, 'v2.1', 'public order & emergency powers', 'Security/Order vs Civil Liberties', 'local', 'curfew', 'emergency; temporary; reviewable', 'base', NULL),
    (38, 'v2.1', 'public security', 'Security/Order vs Civil Liberties', 'local/private venue', 'universal screening', 'high-crowd risk', 'base', NULL),
    (39, 'v2.1', 'privacy & policing', 'Security/Order vs Civil Liberties', 'judiciary/law enforcement', 'warrant requirement', 'ordinary', 'base', NULL),
    (40, 'v2.1', 'criminal procedure & property', 'Security/Order vs Civil Liberties', 'law enforcement/judiciary', 'forfeiture limitation', 'ordinary', 'base', NULL),
    (41, 'v2.1', 'emergency governance', 'Security/Order vs Civil Liberties', 'national/regional', 'sunset clause', 'emergency; temporary', 'base', NULL),
    (42, 'v2.1', 'drug policy', 'Security/Order vs Civil Liberties', 'national/regional', 'decriminalization or legalization', 'adult consent', 'base', NULL),
    (43, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (44, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (45, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (46, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (47, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (48, 'v2.1', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (49, 'v2.1', 'elections & democratic design', 'Centralized vs Localized', 'national', 'uniform standards', 'ordinary', 'base', NULL),
    (50, 'v2.1', 'energy infrastructure', 'Centralized vs Localized', 'national', 'central siting authority', 'cross-border externality', 'base', NULL),
    (51, 'v2.1', 'disaster response', 'Centralized vs Localized', 'national', 'central command', 'emergency', 'base', NULL),
    (52, 'v2.1', 'education finance', 'Centralized vs Localized', 'national', 'minimum service standard', 'persistent regional inequality', 'base', NULL),
    (53, 'v2.1', 'education governance', 'Centralized vs Localized', 'state/regional', 'devolved authority', 'ordinary', 'base', NULL),
    (54, 'v2.1', 'housing & land use', 'Centralized vs Localized', 'local', 'local zoning authority', 'ordinary; externality exception', 'base', NULL),
    (55, 'v2.1', 'indigenous sovereignty & land', 'Centralized vs Localized', 'tribal/local', 'self-government', 'recognized jurisdiction', 'base', NULL),
    (56, 'v2.1', 'fiscal federalism', 'Centralized vs Localized', 'state/regional', 'policy experimentation', 'ordinary', 'base', NULL),
    (57, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (58, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (59, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (60, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (61, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (62, 'v2.1', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (63, 'v2.1', 'language & assimilation', 'Traditionalist vs Progressivist', 'national/local schools', 'curriculum priority', 'ordinary', 'base', NULL),
    (64, 'v2.1', 'heritage & public memory', 'Traditionalist vs Progressivist', 'local', 'preservation with contextualization', 'historical controversy', 'base', NULL),
    (65, 'v2.1', 'family law', 'Traditionalist vs Progressivist', 'national/regional', 'divorce restriction', 'dependent children; safety exception', 'base', NULL),
    (66, 'v2.1', 'religion & civic ritual', 'Traditionalist vs Progressivist', 'public institutions', 'tradition preservation', 'voluntary participation', 'base', NULL),
    (67, 'v2.1', 'family & adoption', 'Traditionalist vs Progressivist', 'national/regional', 'equal eligibility', 'ordinary', 'base', NULL),
    (68, 'v2.1', 'family law', 'Traditionalist vs Progressivist', 'national/regional', 'no-fault divorce', 'adult consent', 'base', NULL),
    (69, 'v2.1', 'civic culture & religion', 'Traditionalist vs Progressivist', 'public institutions', 'inclusive redesign', 'ordinary', 'base', NULL),
    (70, 'v2.1', 'education & family', 'Traditionalist vs Progressivist', 'public schools', 'curriculum inclusion', 'ordinary', 'base', NULL),
    (71, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (72, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (73, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (74, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (75, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (76, 'v2.1', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (77, 'v2.1', 'housing allocation', 'Particularist vs Universalist', 'local', 'residency preference', 'scarcity; equal-need comparison', 'base', NULL),
    (78, 'v2.1', 'public employment', 'Particularist vs Universalist', 'national/local', 'service-based preference', 'ordinary', 'base', NULL),
    (79, 'v2.1', 'mutual aid & social insurance', 'Particularist vs Universalist', 'local/community', 'contribution-based eligibility', 'scarcity; reciprocal contribution', 'base', NULL),
    (80, 'v2.1', 'charity & diaspora', 'Particularist vs Universalist', 'civil society', 'group-priority giving', 'limited charitable resources', 'base', NULL),
    (81, 'v2.1', 'immigration & asylum', 'Particularist vs Universalist', 'national', 'needs-based admission', 'scarcity', 'base', NULL),
    (82, 'v2.1', 'global health', 'Particularist vs Universalist', 'national/international', 'needs-based allocation', 'surplus after domestic threshold', 'base', NULL),
    (83, 'v2.1', 'equal treatment & public administration', 'Particularist vs Universalist', 'public institutions', 'uniform eligibility', 'ordinary', 'base', NULL),
    (84, 'v2.1', 'foreign aid', 'Particularist vs Universalist', 'national/international', 'needs-based aid', 'scarcity', 'base', NULL),
    (85, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (86, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (87, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (88, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (89, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (90, 'v2.1', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (91, 'v2.1', 'currency & monetary integration', 'Sovereigntist vs Integrationist', 'national/international', 'retain monetary sovereignty', 'long-term institutional commitment', 'base', NULL),
    (92, 'v2.1', 'trade & food safety', 'Sovereigntist vs Integrationist', 'national/international', 'reject external ruling', 'regulatory conflict', 'base', NULL),
    (93, 'v2.1', 'foreign investment & security', 'Sovereigntist vs Integrationist', 'national', 'investment screening', 'strategic asset', 'base', NULL),
    (94, 'v2.1', 'treaties & democratic consent', 'Sovereigntist vs Integrationist', 'national/international', 'treaty withdrawal', 'sustained opposition', 'base', NULL),
    (95, 'v2.1', 'international taxation', 'Sovereigntist vs Integrationist', 'international', 'binding tax coordination', 'cross-border tax competition', 'base', NULL),
    (96, 'v2.1', 'migration & regional governance', 'Sovereigntist vs Integrationist', 'international/regional', 'burden sharing', 'uneven arrivals', 'base', NULL),
    (97, 'v2.1', 'trade & labor rights', 'Sovereigntist vs Integrationist', 'international', 'binding labor standards', 'cross-border production', 'base', NULL),
    (98, 'v2.1', 'global health governance', 'Sovereigntist vs Integrationist', 'international', 'mandatory reporting', 'transnational emergency risk', 'base', NULL),
    (99, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (100, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (101, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (102, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (103, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (104, 'v2.1', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (105, 'v2.1', 'biotechnology & reproduction', 'Tech-Cautious vs Tech-Accelerative', 'national/international', 'moratorium', 'irreversible; intergenerational uncertainty', 'base', NULL),
    (106, 'v2.1', 'infrastructure resilience & cybersecurity', 'Tech-Cautious vs Tech-Accelerative', 'national/private operators', 'redundancy mandate', 'low-probability high-impact risk', 'base', NULL),
    (107, 'v2.1', 'surveillance technology', 'Tech-Cautious vs Tech-Accelerative', 'national/local', 'temporary prohibition', 'uncertain accuracy and abuse risk', 'base', NULL),
    (108, 'v2.1', 'climate technology', 'Tech-Cautious vs Tech-Accelerative', 'international', 'precautionary authorization', 'cross-border; uncertain; potentially irreversible', 'base', NULL),
    (109, 'v2.1', 'transport automation', 'Tech-Cautious vs Tech-Accelerative', 'local', 'technology deployment', 'validated safety threshold', 'base', NULL),
    (110, 'v2.1', 'agriculture & biotechnology', 'Tech-Cautious vs Tech-Accelerative', 'national', 'technology-neutral approval', 'validated safety threshold', 'base', NULL),
    (111, 'v2.1', 'energy technology', 'Tech-Cautious vs Tech-Accelerative', 'national/regional', 'technology deployment', 'regulated safety threshold', 'base', NULL),
    (112, 'v2.1', 'healthcare AI', 'Tech-Cautious vs Tech-Accelerative', 'national/professional', 'regulated deployment', 'validated performance; human oversight', 'base', NULL),
    (113, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (114, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (115, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (116, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (117, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (118, 'v2.1', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (119, 'v2.1', 'energy & habitat', 'Anthropocentric vs Ecocentric', 'national/regional', 'infrastructure approval with mitigation', 'human climate benefit; disturbed habitat', 'base', NULL),
    (120, 'v2.1', 'wildlife & agriculture', 'Anthropocentric vs Ecocentric', 'local/regional', 'lethal wildlife control', 'repeated losses; alternatives failed', 'base', NULL),
    (121, 'v2.1', 'housing & ecological mitigation', 'Anthropocentric vs Ecocentric', 'local/regional', 'development with offset', 'degraded site; compensatory restoration', 'base', NULL),
    (122, 'v2.1', 'climate adaptation & coasts', 'Anthropocentric vs Ecocentric', 'local/national', 'protective infrastructure', 'high population exposure', 'base', NULL),
    (123, 'v2.1', 'animal welfare & agriculture', 'Anthropocentric vs Ecocentric', 'national', 'welfare regulation', 'price tradeoff', 'base', NULL),
    (124, 'v2.1', 'mining & watersheds', 'Anthropocentric vs Ecocentric', 'national/regional', 'project prohibition', 'irreversible ecological loss', 'base', NULL),
    (125, 'v2.1', 'ecological restoration & land use', 'Anthropocentric vs Ecocentric', 'local/regional', 'public restoration & land restriction', 'long-term restoration', 'base', NULL),
    (126, 'v2.1', 'water resources', 'Anthropocentric vs Ecocentric', 'regional', 'withdrawal limit', 'irreversible depletion risk', 'base', NULL),
    (127, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (128, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (129, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (130, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (131, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (132, 'v2.1', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (133, 'v2.1', 'family ethics & human rights', 'Moral Objectivist vs Moral Contextualist', 'society/state', 'universal moral judgment', 'cultural approval', 'base', NULL),
    (134, 'v2.1', 'prison discipline & human rights', 'Moral Objectivist vs Moral Contextualist', 'state/prison', 'prohibition on prolonged isolation', 'nonviolent violation; public support for harsh punishment', 'base', NULL),
    (135, 'v2.1', 'war ethics', 'Moral Objectivist vs Moral Contextualist', 'state/military', 'universal prohibition', 'armed conflict', 'base', NULL),
    (136, 'v2.1', 'labor safety & development', 'Moral Objectivist vs Moral Contextualist', 'employers/state', 'universal minimum safety standard', 'serious injury risk; local job losses', 'base', NULL),
    (137, 'v2.1', 'end-of-life ethics', 'Moral Objectivist vs Moral Contextualist', 'society/state', 'assisted-dying law', 'competent adults; voluntary choice; cultural variation', 'base', NULL),
    (138, 'v2.1', 'family ethics & caregiving', 'Moral Objectivist vs Moral Contextualist', 'family/society', 'contextual family-duty norm', 'extended-family variation', 'base', NULL),
    (139, 'v2.1', 'bioethics & reproduction', 'Moral Objectivist vs Moral Contextualist', 'state/adults', 'permissive surrogacy regulation', 'consent; uncertain serious harm', 'base', NULL),
    (140, 'v2.1', 'ethics education', 'Moral Objectivist vs Moral Contextualist', 'public schools', 'plural curriculum', 'ordinary', 'base', NULL),
    (141, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (142, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (143, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (144, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (145, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (146, 'v2.1', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (147, 'v2.1', 'constitutional adjudication', 'Moral Monist vs Value Pluralist', 'judiciary', 'fixed priority rule', 'rights conflict', 'base', NULL),
    (148, 'v2.1', 'healthcare ethics', 'Moral Monist vs Value Pluralist', 'health institutions', 'single-principle allocation', 'emergency; scarcity', 'base', NULL),
    (149, 'v2.1', 'public ethics & law', 'Moral Monist vs Value Pluralist', 'state/judiciary', 'uniform moral standard', 'cross-domain consistency', 'base', NULL),
    (150, 'v2.1', 'equality & religious liberty', 'Moral Monist vs Value Pluralist', 'state/judiciary', 'presumptive priority', 'rights conflict', 'base', NULL),
    (151, 'v2.1', 'religious liberty & conscience', 'Moral Monist vs Value Pluralist', 'state/employer', 'case-specific exemption', 'limited third-party harm', 'base', NULL),
    (152, 'v2.1', 'end-of-life ethics', 'Moral Monist vs Value Pluralist', 'state/health institutions', 'multiple legal options', 'adult competence', 'base', NULL),
    (153, 'v2.1', 'land use & public values', 'Moral Monist vs Value Pluralist', 'local/regional', 'multi-criteria balancing', 'competing public values', 'base', NULL),
    (154, 'v2.1', 'rights adjudication', 'Moral Monist vs Value Pluralist', 'judiciary', 'proportional balancing', 'rights conflict', 'base', NULL),
    (155, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (156, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (157, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (158, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (159, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (160, 'v2.1', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (161, 'v2.1', 'policy implementation', 'Gradualist vs Transformative', 'national/regional', 'pilot program', 'staged rollout', 'base', NULL),
    (162, 'v2.1', 'climate policy strategy', 'Gradualist vs Transformative', 'legislature/movement', 'incremental compromise', 'partial but immediate gain', 'base', NULL),
    (163, 'v2.1', 'criminal justice reform', 'Gradualist vs Transformative', 'national/local', 'incremental institutional reform', 'repairability uncertain', 'base', NULL),
    (164, 'v2.1', 'whistleblowing & accountability', 'Gradualist vs Transformative', 'workplace/state', 'internal escalation first', 'channels available', 'base', NULL),
    (165, 'v2.1', 'constitutional reform', 'Gradualist vs Transformative', 'national', 'system redesign', 'persistent institutional failure', 'base', NULL),
    (166, 'v2.1', 'labor movement strategy', 'Gradualist vs Transformative', 'civil society', 'mass work stoppage', 'ordinary channels failed', 'base', NULL),
    (167, 'v2.1', 'movement strategy', 'Gradualist vs Transformative', 'civil society', 'refuse compromise', 'strategic leverage', 'base', NULL),
    (168, 'v2.1', 'public administration reform', 'Gradualist vs Transformative', 'national/local', 'institutional replacement', 'persistent legitimacy failure', 'base', NULL),
    (169, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (170, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (171, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (172, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (173, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (174, 'v2.1', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (175, 'v2.1', 'elections & institutional legitimacy', 'Trusting vs Skeptical', 'election authorities', 'accept audited result', 'completed audit', 'base', NULL),
    (176, 'v2.1', 'science & evidence', 'Trusting vs Skeptical', 'research institutions/state', 'rely on convergent evidence', 'independent replication', 'base', NULL),
    (177, 'v2.1', 'judiciary', 'Trusting vs Skeptical', 'courts/public', 'presumption of integrity', 'ordinary', 'base', NULL),
    (178, 'v2.1', 'public health institutions', 'Trusting vs Skeptical', 'agency', 'conditional discretion', 'emergency; transparency', 'base', NULL),
    (179, 'v2.1', 'regulation & transparency', 'Trusting vs Skeptical', 'regulatory agencies', 'mandatory disclosure', 'major rule', 'base', NULL),
    (180, 'v2.1', 'health science & transparency', 'Trusting vs Skeptical', 'research sponsors/agencies', 'data access requirement', 'public recommendation', 'base', NULL),
    (181, 'v2.1', 'corruption & revolving doors', 'Trusting vs Skeptical', 'government/industry', 'post-employment restriction', 'conflict-of-interest risk', 'base', NULL),
    (182, 'v2.1', 'algorithmic accountability', 'Trusting vs Skeptical', 'public agencies', 'external audit', 'high-impact automated decisions', 'base', NULL),
    (183, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (184, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (185, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (186, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (187, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (188, 'v2.1', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (189, 'v2.1', 'professional discipline', 'Retributive vs Restorative', 'licensing body', 'punitive license revocation', 'restitution completed', 'base', NULL),
    (190, 'v2.1', 'war crimes & transitional justice', 'Retributive vs Restorative', 'international/national courts', 'criminal prosecution', 'peace tradeoff', 'base', NULL),
    (191, 'v2.1', 'violent crime', 'Retributive vs Restorative', 'courts', 'incarceration', 'repeat serious harm', 'base', NULL),
    (192, 'v2.1', 'public corruption', 'Retributive vs Restorative', 'courts', 'incarceration', 'nonviolent serious offense', 'base', NULL),
    (193, 'v2.1', 'juvenile justice', 'Retributive vs Restorative', 'courts/community', 'restorative sentence', 'serious violence; youth', 'base', NULL),
    (194, 'v2.1', 'corporate & environmental justice', 'Retributive vs Restorative', 'regulators/courts', 'remediation & restitution', 'large-scale harm', 'base', NULL),
    (195, 'v2.1', 'school discipline', 'Retributive vs Restorative', 'school/community', 'restorative process', 'serious interpersonal harm', 'base', NULL),
    (196, 'v2.1', 'transitional justice', 'Retributive vs Restorative', 'national/international', 'conditional amnesty & truth process', 'post-conflict', 'base', NULL),
    (197, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (198, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (199, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (200, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (201, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (202, 'v2.1', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (203, 'v2.1', 'judicial review', 'Majoritarian vs Constitutionalist', 'legislature/judiciary', 'legislative supremacy', 'ordinary', 'base', NULL),
    (204, 'v2.1', 'constitutional amendment', 'Majoritarian vs Constitutionalist', 'national electorate', 'majority amendment', 'two-election persistence', 'base', NULL),
    (205, 'v2.1', 'referendum & judicial review', 'Majoritarian vs Constitutionalist', 'national electorate/judiciary', 'popular override', 'sustained public opposition', 'base', NULL),
    (206, 'v2.1', 'election governance', 'Majoritarian vs Constitutionalist', 'legislature', 'ordinary-law control', 'incumbent-party risk', 'base', NULL),
    (207, 'v2.1', 'minority rights & courts', 'Majoritarian vs Constitutionalist', 'judiciary', 'constitutional invalidation', 'popular law; minority burden', 'base', NULL),
    (208, 'v2.1', 'emergency powers', 'Majoritarian vs Constitutionalist', 'legislature/judiciary', 'supermajority & review', 'emergency', 'base', NULL),
    (209, 'v2.1', 'election governance', 'Majoritarian vs Constitutionalist', 'independent bodies/legislature', 'entrenchment', 'incumbent conflict', 'base', NULL),
    (210, 'v2.1', 'constitutional amendment', 'Majoritarian vs Constitutionalist', 'national electorate/regions', 'supermajority or multi-stage consent', 'fundamental change', 'base', NULL),
    (211, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (212, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (213, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (214, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (215, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (216, 'v2.1', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (217, 'v2.1', 'technology governance', 'Popular/Elected Judgment vs Expert Delegation', 'legislature/commission', 'elected decision', 'value-laden technology choice', 'base', NULL),
    (218, 'v2.1', 'land use governance', 'Popular/Elected Judgment vs Expert Delegation', 'local electorate/experts', 'democratic final authority', 'competing local values', 'base', NULL),
    (219, 'v2.1', 'civil-military governance', 'Popular/Elected Judgment vs Expert Delegation', 'elected executive/legislature', 'civilian control', 'armed conflict', 'base', NULL),
    (220, 'v2.1', 'education governance', 'Popular/Elected Judgment vs Expert Delegation', 'local elected board/experts', 'elected control', 'value-laden curriculum', 'base', NULL),
    (221, 'v2.1', 'monetary policy', 'Popular/Elected Judgment vs Expert Delegation', 'independent central bank', 'expert delegation', 'macroeconomic uncertainty', 'base', NULL),
    (222, 'v2.1', 'public health governance', 'Popular/Elected Judgment vs Expert Delegation', 'expert agency', 'expert delegation', 'technical risk assessment', 'base', NULL),
    (223, 'v2.1', 'energy governance', 'Popular/Elected Judgment vs Expert Delegation', 'independent system operator', 'expert delegation', 'technical reliability risk', 'base', NULL),
    (224, 'v2.1', 'environmental health regulation', 'Popular/Elected Judgment vs Expert Delegation', 'expert panel', 'expert standard setting', 'complex risk assessment', 'base', NULL),
    (225, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (226, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (227, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (228, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (229, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (230, 'v2.1', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (231, 'v2.1', 'ballot initiatives', 'Direct Democracy vs Representative Deliberation', 'electorate/legislature', 'direct initiative', 'ordinary', 'base', NULL),
    (232, 'v2.1', 'recall elections', 'Direct Democracy vs Representative Deliberation', 'local electorate', 'recall vote', 'midterm accountability', 'base', NULL),
    (233, 'v2.1', 'public finance', 'Direct Democracy vs Representative Deliberation', 'local/national electorate', 'debt referendum', 'long-term fiscal commitment', 'base', NULL),
    (234, 'v2.1', 'participatory budgeting', 'Direct Democracy vs Representative Deliberation', 'local electorate', 'direct budget allocation', 'annual budgeting', 'base', NULL),
    (235, 'v2.1', 'tax legislation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'representative lawmaking', 'high complexity', 'base', NULL),
    (236, 'v2.1', 'legislative negotiation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'representative compromise', 'multi-issue bargaining', 'base', NULL),
    (237, 'v2.1', 'representation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'trustee representation', 'new evidence', 'base', NULL),
    (238, 'v2.1', 'minority rights & democratic process', 'Direct Democracy vs Representative Deliberation', 'electorate/legislature', 'representative or constitutional mediation', 'vulnerable minority', 'base', NULL),
    (239, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (240, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (241, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (242, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (243, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (244, 'v2.1', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (245, 'v2.1', 'preventive war', 'Dove vs Hawk', 'national/international', 'reject preventive attack', 'uncertain future threat', 'base', NULL),
    (246, 'v2.1', 'coercive diplomacy', 'Dove vs Hawk', 'national/international', 'force as last resort', 'non-imminent threat', 'base', NULL),
    (247, 'v2.1', 'arms trade & alliances', 'Dove vs Hawk', 'national', 'suspend arms transfers', 'documented civilian harm', 'base', NULL),
    (248, 'v2.1', 'conscription', 'Dove vs Hawk', 'national', 'limit compulsory service', 'direct threat threshold', 'base', NULL),
    (249, 'v2.1', 'collective defense', 'Dove vs Hawk', 'international alliance', 'military defense', 'treaty commitment; invasion', 'base', NULL),
    (250, 'v2.1', 'humanitarian intervention', 'Dove vs Hawk', 'national/international', 'limited strike', 'imminent atrocity; last resort', 'base', NULL),
    (251, 'v2.1', 'nuclear deterrence', 'Dove vs Hawk', 'national/international', 'maintain deterrent', 'reciprocal possession', 'base', NULL),
    (252, 'v2.1', 'cyber conflict', 'Dove vs Hawk', 'national/international', 'offensive retaliation', 'attributed major attack', 'base', NULL),
    (253, 'v2.1', 'biometrics & private markets', 'Economic Coordination x Liberty & Public Order', 'private firms', 'permission/deregulation', 'consent; privacy tradeoff', 'collision', 'C1-C3-A'),
    (254, 'v2.1', 'public security & business mandates', 'Economic Coordination x Liberty & Public Order', 'national/regional', 'surveillance mandate', 'cost and privacy tradeoff', 'collision', 'C1-C3-B'),
    (255, 'v2.1', 'platform regulation & local power', 'Territorial Authority x Economic Coordination', 'local', 'local price regulation', 'service-exit risk', 'collision', 'C1-C4-A'),
    (256, 'v2.1', 'public utilities & national preemption', 'Territorial Authority x Economic Coordination', 'national/local', 'national public-ownership mandate', 'local opposition', 'collision', 'C1-C4-B'),
    (257, 'v2.1', 'international competition policy', 'Economic Coordination x Sovereignty Scope', 'international', 'binding competition rules', 'domestic industry tradeoff', 'collision', 'C1-C7-A'),
    (258, 'v2.1', 'international industrial policy', 'Economic Coordination x Sovereignty Scope', 'international', 'coordinated public subsidy', 'strategic dependency', 'collision', 'C1-C7-B'),
    (259, 'v2.1', 'charitable property & global need', 'Scope of Obligation x Distribution & Property', 'national/private donors', 'donor discretion with neutral tax treatment', 'cross-border giving', 'collision', 'C2-C6-A'),
    (260, 'v2.1', 'charitable property & community preference', 'Distribution & Property x Scope of Obligation', 'private donors/educational institutions', 'donor-directed eligibility rule', 'equal need; membership distinction', 'collision', 'C2-C6-B'),
    (261, 'v2.1', 'religious education & equality', 'Distribution & Property x Cultural Continuity', 'national/regional', 'funding condition', 'public subsidy; doctrinal conflict', 'collision', 'C2-C5-A'),
    (262, 'v2.1', 'family benefits & traditional norms', 'Cultural Continuity x Distribution & Property', 'national', 'targeted cash benefit', 'household-status condition', 'collision', 'C2-C5-B'),
    (263, 'v2.1', 'habitat protection & property liberty', 'Ecological Moral Standing x Liberty & Public Order', 'regional/local', 'development prohibition', 'critical corridor; mitigation offered', 'collision', 'C3-C9-A'),
    (264, 'v2.1', 'food emergency & habitat conversion', 'Liberty & Public Order x Ecological Moral Standing', 'national/regional', 'compulsory land use', 'emergency; scarcity; habitat loss', 'collision', 'C3-C9-B'),
    (265, 'v2.1', 'subnational diplomacy & climate', 'Sovereignty Scope x Territorial Authority', 'state/international', 'subnational compact', 'national objection', 'collision', 'C4-C7-A'),
    (266, 'v2.1', 'international agreements & local autonomy', 'Sovereignty Scope x Territorial Authority', 'national/regional/international', 'regional opt-out', 'authority conflict', 'collision', 'C4-C7-B'),
    (267, 'v2.1', 'reproductive technology & family norms', 'Cultural Continuity x Technology Orientation', 'national/private clinics', 'regulated permission', 'validated safety; cultural disruption', 'collision', 'C5-C8-A'),
    (268, 'v2.1', 'AI systems & cultural bias', 'Technology Orientation x Cultural Continuity', 'national/private firms', 'deployment restriction', 'cultural bias; innovation cost', 'collision', 'C5-C8-B'),
    (269, 'v2.1', 'asylum burden sharing', 'Sovereignty Scope x Scope of Obligation', 'international/national', 'binding allocation', 'scarcity; domestic opposition', 'collision', 'C6-C7-A'),
    (270, 'v2.1', 'regional integration & citizen benefits', 'Scope of Obligation x Sovereignty Scope', 'national/international', 'integration with welfare reservation', 'membership distinction', 'collision', 'C6-C7-B'),
    (271, 'v2.1', 'water technology & marine ecology', 'Ecological Moral Standing x Technology Orientation', 'national/local', 'technology deployment', 'water scarcity; ecological harm', 'collision', 'C8-C9-A'),
    (272, 'v2.1', 'food technology & ecological impact', 'Ecological Moral Standing x Technology Orientation', 'national/private industry', 'technology deployment', 'agricultural disruption', 'collision', 'C8-C9-B'),
    (273, 'v2.1', 'gene editing & moral limits', 'Technology Orientation x Moral Objectivity', 'national/international', 'prohibition', 'intergenerational; serious disease benefit', 'collision', 'C8-C10-A'),
    (274, 'v2.1', 'human enhancement & cross-cultural consent', 'Moral Objectivity x Technology Orientation', 'international', 'precautionary pause', 'moral disagreement; uncertain governance', 'collision', 'C8-C10-B'),
    (275, 'v2.1', 'environmental decision ethics', 'Value Structure x Ecological Moral Standing', 'national/local', 'multi-criteria balancing', 'competing public values', 'collision', 'C9-C11-A'),
    (276, 'v2.1', 'environmental development & value pluralism', 'Ecological Moral Standing x Value Structure', 'national/local', 'contextual balancing with development priority', 'essential development; habitat loss', 'collision', 'C9-C11-B'),
    (277, 'v2.1', 'civil disobedience & reform', 'Liberty & Public Order x Change Strategy', 'civil society/state', 'nonviolent occupation', 'lawful channels failed', 'collision', 'F1-C3'),
    (278, 'v2.1', 'expert governance & accountability', 'Epistemic Authority x Institutional Confidence', 'regulatory agency', 'conditional delegation', 'transparency and audit', 'collision', 'F2-F5'),
    (279, 'v2.1', 'sentencing & constitutional review', 'Democratic Constraint x Justice Style', 'judiciary/electorate', 'constitutional override', 'voter-approved mandate', 'collision', 'F3-F4'),
    (280, 'v2.1', 'direct democracy & localism', 'Democratic Mediation x Territorial Authority', 'city/neighborhood', 'referendum override', 'nested jurisdictions', 'collision', 'F6-C4'),
    (281, 'v2.1', 'collective defense & integration', 'Force & Peace x Sovereignty Scope', 'international alliance', 'binding defense commitment', 'future attack contingency', 'collision', 'F7-C7'),
    (282, 'v2.1', 'legislative gradualism & mediation', 'Democratic Mediation x Change Strategy', 'national legislature/electorate', 'incremental representative legislation', 'broad reform demand', 'collision', 'F1-F6-A'),
    (283, 'v2.1', 'anti-corruption transition', 'Change Strategy x Liberty & Public Order', 'government/courts', 'temporary asset restraint & institutional restructuring', 'credible implication; prompt court review', 'collision', 'F1-C3-B'),
    (284, 'v2.1', 'local land use & direct democracy', 'Democratic Mediation x Territorial Authority', 'municipal electorate/national legislature', 'binding local referendum', 'major local project; national interest', 'collision', 'F6-C4-B'),
    (285, 'v2.1', 'unilateral force & sovereignty', 'Sovereignty Scope x Force & Peace', 'national/international', 'limited military strike', 'imminent threat; no international authorization', 'collision', 'F7-C7-B'),
    (286, 'v2.1', 'constitutional transformation & representation', 'Democratic Mediation x Change Strategy', 'national legislature', 'comprehensive legislative package', 'electoral mandate; systemic reform', 'collision', 'F1-F6-B'),
    (287, 'v2.1', 'monetary policy & institutional trust', 'Institutional Confidence x Epistemic Authority', 'independent central bank/elected government', 'expert delegation', 'ordinary; inflation and employment tradeoff', 'collision', 'F2-F5-B'),
    (288, 'v2.1', 'transitional justice & constitutional limits', 'Justice Style x Democratic Constraint', 'judiciary/electorate', 'constitutional invalidation of amnesty', 'serious state crimes; voter-approved amnesty', 'collision', 'F3-F4-B'),
    (289, 'v2.1', 'healthcare ethics & moral hierarchy', 'Moral Objectivity x Value Structure', 'hospital ethics board', 'categorical decision rule', 'direct conflict among moral values', 'collision', 'C10-C11-A'),
    (290, 'v2.1', 'public ethics & contingent moral tradition', 'Value Structure x Moral Objectivity', 'national/community institutions', 'single-framework public ethic', 'historical contingency; internal coherence', 'collision', 'C10-C11-B'),
    (291, 'v2.1', 'institutional corruption & structural reform', 'Institutional Confidence x Change Strategy', 'national government/oversight bodies', 'rapid institutional replacement', 'documented repeated concealment', 'collision', 'F1-F2-A'),
    (292, 'v2.1', 'institutional reform & skepticism', 'Change Strategy x Institutional Confidence', 'government/oversight bodies', 'incremental audited reform', 'low trust; continuity risks', 'collision', 'F1-F2-B'),
    (293, 'v2.1', 'violent crime & sentencing', 'Liberty & Public Order x Justice Style', 'criminal courts', 'incapacitating sentence', 'repeat serious violence; rehabilitation possible', 'collision', 'F3-C3-A'),
    (294, 'v2.1', 'violent crime & restorative supervision', 'Justice Style x Liberty & Public Order', 'criminal courts/community supervision', 'reduced custody plus restorative program', 'serious violence; evidence of lower recidivism', 'collision', 'F3-C3-B'),
    (295, 'v2.1', 'administrative accountability & majority rule', 'Epistemic Authority x Democratic Constraint', 'legislature/expert agency/judiciary', 'legislative override', 'major policy disagreement', 'collision', 'F4-F5-A'),
    (296, 'v2.1', 'emergency delegation & expert authority', 'Democratic Constraint x Epistemic Authority', 'legislature/expert agency/judiciary', 'temporary expert delegation without review', 'declared emergency; explicit sunset', 'collision', 'F4-F5-B'),
    (297, 'v2.1', 'domestic prevention instead of military force', 'Force & Peace x Liberty & Public Order', 'national security institutions', 'expanded screening and surveillance', 'credible external threat; no overseas strike', 'collision', 'F7-C3-A'),
    (298, 'v2.1', 'nonmilitary response & civil liberties', 'Liberty & Public Order x Force & Peace', 'national government/law enforcement', 'criminal investigation and diplomacy', 'attributed attack; continuing threat', 'collision', 'F7-C3-B'),
    (299, 'v2.1', 'automation & market deployment', 'Technology Orientation x Economic Coordination', 'private firms/national regulator', 'regulated private deployment', 'validated safety; employment disruption', 'collision', 'C1-C8-A'),
    (300, 'v2.1', 'public AI infrastructure', 'Technology Orientation x Economic Coordination', 'national government', 'public ownership and provision', 'high market concentration; strategic technology', 'collision', 'C1-C8-B');

--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles VALUES
	('admin', 'Administrator', 'Full system access including user management and analytics', '2026-07-17 00:17:32.316399+00'),
	('moderator', 'Moderator', 'Can manage questions and view analytics', '2026-07-17 00:17:32.316399+00'),
	('user', 'User', 'Standard user - can take surveys and view own results', '2026-07-17 00:17:32.316399+00');


--
-- Data for Name: survey_responses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: survey_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: question_axis_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.question_axis_links_id_seq', COALESCE((SELECT MAX(id) FROM public.question_axis_links), 1), true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', COALESCE((SELECT MAX(id) FROM public.questions), 1), true);


--
-- Name: axes axes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes
    ADD CONSTRAINT axes_pkey PRIMARY KEY (id);


--
-- Name: question_bank_versions question_bank_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_versions
    ADD CONSTRAINT question_bank_versions_pkey PRIMARY KEY (id);


--
-- Name: question_metadata question_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_metadata
    ADD CONSTRAINT question_metadata_pkey PRIMARY KEY (question_id);



--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: question_axis_links question_axis_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_axis_links
    ADD CONSTRAINT question_axis_links_pkey PRIMARY KEY (id);


--
-- Name: question_axis_links question_axis_links_question_id_axis_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_axis_links
    ADD CONSTRAINT question_axis_links_question_id_axis_id_role_key UNIQUE (question_id, axis_id, role);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_session_id_key UNIQUE (session_id);


--
-- Name: survey_results survey_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_results
    ADD CONSTRAINT survey_results_pkey PRIMARY KEY (id);


--
-- Name: survey_results survey_results_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_results
    ADD CONSTRAINT survey_results_session_id_key UNIQUE (session_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: idx_profiles_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_admin ON public.profiles USING btree (is_admin);


--
-- Name: idx_question_axis_links_axis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_axis_links_axis_id ON public.question_axis_links USING btree (axis_id);


--
-- Name: idx_question_axis_links_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_axis_links_question_id ON public.question_axis_links USING btree (question_id);


--
-- Name: idx_question_axis_links_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_axis_links_role ON public.question_axis_links USING btree (role);


--
-- Name: idx_question_metadata_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_metadata_domain ON public.question_metadata USING btree (policy_domain);


--
-- Name: idx_question_metadata_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_metadata_family ON public.question_metadata USING btree (item_family);


--
-- Name: idx_question_metadata_collision_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_metadata_collision_pair ON public.question_metadata USING btree (collision_pair) WHERE (collision_pair IS NOT NULL);


--
-- Name: idx_questions_bank_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_bank_version ON public.questions USING btree (bank_version);



--
-- Name: idx_questions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_active ON public.questions USING btree (active);


--
-- Name: idx_questions_axis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_axis ON public.questions USING btree (axis_id);


--
-- Name: idx_questions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_order ON public.questions USING btree (display_order);


--
-- Name: idx_questions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_type ON public.questions USING btree (question_type);


--
-- Name: idx_responses_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responses_created ON public.survey_responses USING btree (created_at);


--
-- Name: idx_responses_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responses_session ON public.survey_responses USING btree (session_id);


--
-- Name: idx_responses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responses_user ON public.survey_responses USING btree (user_id);


--
-- Name: idx_results_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_results_completed_at ON public.survey_results USING btree (completed_at);


--
-- Name: idx_results_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_results_created ON public.survey_results USING btree (created_at);


--
-- Name: idx_results_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_results_session ON public.survey_results USING btree (session_id);


--
-- Name: idx_results_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_results_user ON public.survey_results USING btree (user_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: questions questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_axis_links question_axis_links_axis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_axis_links
    ADD CONSTRAINT question_axis_links_axis_id_fkey FOREIGN KEY (axis_id) REFERENCES public.axes(id);


--
-- Name: question_axis_links question_axis_links_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_axis_links
    ADD CONSTRAINT question_axis_links_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_axis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_axis_id_fkey FOREIGN KEY (axis_id) REFERENCES public.axes(id);


--
-- Name: questions questions_bank_version_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_bank_version_fkey FOREIGN KEY (bank_version) REFERENCES public.question_bank_versions(id);


--
-- Name: question_metadata question_metadata_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_metadata
    ADD CONSTRAINT question_metadata_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_metadata question_metadata_bank_version_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_metadata
    ADD CONSTRAINT question_metadata_bank_version_fkey FOREIGN KEY (bank_version) REFERENCES public.question_bank_versions(id);


--
-- Name: survey_responses survey_responses_bank_version_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_bank_version_fkey FOREIGN KEY (bank_version) REFERENCES public.question_bank_versions(id);


--
-- Name: survey_results survey_results_bank_version_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_results
    ADD CONSTRAINT survey_results_bank_version_fkey FOREIGN KEY (bank_version) REFERENCES public.question_bank_versions(id);



--
-- Name: survey_responses survey_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: survey_results survey_results_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_results
    ADD CONSTRAINT survey_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.survey_responses(session_id);


--
-- Name: survey_results survey_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_results
    ADD CONSTRAINT survey_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: question_metadata Admins can manage question metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage question metadata" ON public.question_metadata USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: question_metadata Anyone can read question metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read question metadata" ON public.question_metadata FOR SELECT USING (true);


--
-- Name: question_bank_versions Admins can manage bank versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bank versions" ON public.question_bank_versions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: question_bank_versions Anyone can read bank versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read bank versions" ON public.question_bank_versions FOR SELECT USING (true);


--
-- Name: questions Admins can delete questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: questions Admins can insert questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert questions" ON public.questions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: question_axis_links Admins can manage question-axis links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage question-axis links" ON public.question_axis_links USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: survey_responses Admins can read all responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all responses" ON public.survey_responses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: questions Admins can update questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update questions" ON public.questions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- NOTE: No admin SELECT policy on profiles. Any policy on profiles that
-- sub-selects profiles recurses (Postgres error 42P17) and breaks unrelated
-- reads through other admin policies (see migration
-- 20260717000000_fix_profiles_recursion_in_fresh_install.sql). Admin access
-- to profiles goes through the backend service-role key instead.
--


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: survey_responses Anyone can insert responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert responses" ON public.survey_responses FOR INSERT WITH CHECK (true);


--
-- Name: survey_results Anyone can insert results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert results" ON public.survey_results FOR INSERT WITH CHECK (true);


--
-- Name: axes Anyone can read axes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read axes" ON public.axes FOR SELECT USING (true);


--
-- Name: question_axis_links Anyone can read question-axis links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read question-axis links" ON public.question_axis_links FOR SELECT USING (true);


--
-- Name: survey_responses Anyone can read responses by session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read responses by session" ON public.survey_responses FOR SELECT USING (true);


--
-- Name: survey_results Anyone can read results by session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read results by session" ON public.survey_results FOR SELECT USING (true);


--
-- Name: roles Anyone can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view roles" ON public.roles FOR SELECT USING (true);


--
-- Name: user_roles Only admins can assign roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can assign roles" ON public.user_roles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: roles Only admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete roles" ON public.roles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: roles Only admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert roles" ON public.roles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: user_roles Only admins can remove roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can remove roles" ON public.user_roles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: roles Only admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update roles" ON public.roles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: questions Read questions policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read questions policy" ON public.questions FOR SELECT USING (true);


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: survey_responses Users can read own responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own responses" ON public.survey_responses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: question_bank_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_bank_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: question_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: axes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.axes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: question_axis_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_axis_links ENABLE ROW LEVEL SECURITY;

--
-- Name: questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- =====================================================
-- Install validation: fail loudly if the bank is incomplete or unbalanced.
-- =====================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.axes;
  IF v_count <> 18 THEN RAISE EXCEPTION 'Expected 18 axes, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions WHERE active = true;
  IF v_count <> 300 THEN RAISE EXCEPTION 'Expected 300 active questions, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.question_metadata WHERE item_family = 'collision';
  IF v_count <> 48 THEN RAISE EXCEPTION 'Expected 48 collision scenarios, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE active = true AND bank_version = 'v2.1' AND text NOT LIKE '%In other words,%';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Expected every active v2.1 question to include a plain-language restatement; % do not', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE active = true AND bank_version = 'v2.1' AND educational_content LIKE 'Assume that %';
  IF v_count <> 152 THEN RAISE EXCEPTION 'Expected 152 explicit v2.1 assumptions, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.collision_pair_coverage
   WHERE scenario_count <> 2 OR same_sign_count <> 1 OR opposite_sign_count <> 1;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Collision pair mirroring validation failed for % pairs', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.axis_pole_balance_audit
   WHERE negative_primary <> positive_primary
      OR conceptual_negative <> conceptual_positive
      OR applied_negative <> applied_positive
      OR collision_negative <> collision_positive;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Axis pole balance validation failed for % axes', v_count; END IF;
END $$;


-- =====================================================
-- Auth trigger (lives on auth.users, outside the public schema dump):
-- auto-creates a profile row whenever a user signs up.
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
