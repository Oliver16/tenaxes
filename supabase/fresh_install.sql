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
    bank_version text DEFAULT 'v2.0'::text NOT NULL,
    core_axes jsonb,
    facets jsonb,
    top_flavors jsonb,
    scores jsonb,
    conceptual_scores jsonb,
    applied_scores jsonb,
    collision_pairs jsonb,
    responses jsonb,
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
    bank_version text DEFAULT 'v2.0'::text NOT NULL,
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
    bank_version text DEFAULT 'v2.0'::text NOT NULL,
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
    ('v2.0', 'Polyaxis Comprehensive Question Bank', '18 constructs; 108 conceptual anchors; 144 single-axis applied scenarios; 48 deliberate collision scenarios across 24 mirrored pairs.', 300, 48);


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
    (1, 'C1', -1, 'Markets do not reliably provide essential services fairly without direct public control.', NULL, 1, TRUE, 1.0, 'conceptual', 'v2.0'),
    (2, 'C1', -1, 'Governments should steer investment toward strategic social goals rather than leave capital allocation mainly to private investors.', NULL, 2, TRUE, 1.0, 'conceptual', 'v2.0'),
    (3, 'C1', -1, 'Public ownership is often justified when an industry is a natural monopoly or basic necessity.', NULL, 3, TRUE, 1.0, 'conceptual', 'v2.0'),
    (4, 'C1', 1, 'Decentralized prices usually coordinate complex economic activity better than administrative plans.', NULL, 4, TRUE, 1.0, 'conceptual', 'v2.0'),
    (5, 'C1', 1, 'Competition among private providers generally improves quality and lowers costs.', NULL, 5, TRUE, 1.0, 'conceptual', 'v2.0'),
    (6, 'C1', 1, 'Businesses should normally be allowed to fail when they cannot serve customers profitably.', NULL, 6, TRUE, 1.0, 'conceptual', 'v2.0'),
    (7, 'C1', -1, 'Electricity transmission and distribution should be operated as a regulated public utility rather than as competing private networks.', 'Electric grids are network systems in which duplicating wires is often inefficient, so many jurisdictions use regulated monopolies or public utilities.', 7, TRUE, 1.15, 'applied', 'v2.0'),
    (8, 'C1', -1, 'The government should use a public development bank to direct long-term credit toward regions that private lenders consistently neglect.', 'A public development bank is a government-backed lender created to finance long-term projects or sectors that private credit may underserve.', 8, TRUE, 1.15, 'applied', 'v2.0'),
    (9, 'C1', -1, 'The state should take an ownership stake in domestic semiconductor production when dependence on foreign suppliers threatens national resilience.', 'An ownership stake gives the government partial equity and influence rather than only offering a grant, loan, or tax credit.', 9, TRUE, 1.15, 'applied', 'v2.0'),
    (10, 'C1', -1, 'During a severe shortage of a life-saving medicine, the government should temporarily cap prices and allocate supplies by medical need.', 'A temporary price cap limits the maximum legal price, while allocation rules determine who receives scarce supply.', 10, TRUE, 1.15, 'applied', 'v2.0'),
    (11, 'C1', 1, 'New private clinics should be allowed to compete with public hospitals when they meet the same safety and transparency standards.', 'Competition here assumes all providers must meet the same licensing, safety, and disclosure requirements.', 11, TRUE, 1.15, 'applied', 'v2.0'),
    (12, 'C1', 1, 'Occupational licensing should be removed when it mainly restricts entry and cannot be shown to protect public safety.', 'Occupational licensing requires government permission to enter a profession, often through education, examination, or fee requirements.', 12, TRUE, 1.15, 'applied', 'v2.0'),
    (13, 'C1', 1, 'A poorly managed airline should be allowed to enter bankruptcy rather than receive repeated public subsidies to preserve every route and job.', 'Bankruptcy can reorganize or liquidate a firm while applying established rules to creditors, workers, and customers.', 13, TRUE, 1.15, 'applied', 'v2.0'),
    (14, 'C1', 1, 'Municipal broadband systems should face competition from private providers rather than receive an exclusive local monopoly.', 'Municipal broadband is internet service owned or operated by a local government.', 14, TRUE, 1.15, 'applied', 'v2.0'),
    (15, 'C2', -1, 'Reducing large inequalities should be a central aim of economic policy.', NULL, 15, TRUE, 1.0, 'conceptual', 'v2.0'),
    (16, 'C2', -1, 'Society should guarantee everyone a decent material floor regardless of market income.', NULL, 16, TRUE, 1.0, 'conceptual', 'v2.0'),
    (17, 'C2', -1, 'Extreme concentrations of wealth undermine equal citizenship.', NULL, 17, TRUE, 1.0, 'conceptual', 'v2.0'),
    (18, 'C2', 1, 'People have a strong claim to keep lawfully acquired income and property.', NULL, 18, TRUE, 1.0, 'conceptual', 'v2.0'),
    (19, 'C2', 1, 'Unequal outcomes are acceptable when the rules are fair and opportunities are open.', NULL, 19, TRUE, 1.0, 'conceptual', 'v2.0'),
    (20, 'C2', 1, 'Passing property to one''s family is a legitimate extension of ownership.', NULL, 20, TRUE, 1.0, 'conceptual', 'v2.0'),
    (21, 'C2', -1, 'A universal basic income funded by higher taxes on top incomes should guarantee every adult a minimum cash floor.', 'A universal basic income is a regular cash payment provided without a work requirement or means test.', 21, TRUE, 1.15, 'applied', 'v2.0'),
    (22, 'C2', -1, 'State funding should equalize per-pupil school resources across wealthy and poor districts, even when it requires transferring local tax revenue.', 'Fiscal equalization shifts revenue so jurisdictions with different tax bases can provide more comparable services.', 22, TRUE, 1.15, 'applied', 'v2.0'),
    (23, 'C2', -1, 'Long-term care for older adults and people with severe disabilities should be publicly guaranteed and financed according to ability to pay.', 'Long-term care includes ongoing help with daily living in homes, community settings, or residential facilities.', 23, TRUE, 1.15, 'applied', 'v2.0'),
    (24, 'C2', -1, 'Very large financial inheritances should face progressive taxation, with clearly defined exemptions for genuinely operating family businesses.', 'An estate tax is assessed on transferred wealth at death; progressive rates rise with the size of the taxable estate.', 24, TRUE, 1.15, 'applied', 'v2.0'),
    (25, 'C2', 1, 'People who signed standard student loans should generally repay them rather than receive broad cancellation funded by taxpayers who did not borrow.', 'Broad cancellation forgives debt across a large class of borrowers rather than only in cases such as fraud, disability, or insolvency.', 25, TRUE, 1.15, 'applied', 'v2.0'),
    (26, 'C2', 1, 'Owner-occupied homes should not be subject to an annual wealth tax merely because neighborhood values have risen.', 'An annual wealth tax is based on the value of owned assets rather than only on income or a sale.', 26, TRUE, 1.15, 'applied', 'v2.0'),
    (27, 'C2', 1, 'Private firms should not be required to transfer ownership shares to employees as a condition of remaining in business.', 'Mandatory employee equity would require firms to transfer part of ownership, not merely share profits or offer optional stock plans.', 27, TRUE, 1.15, 'applied', 'v2.0'),
    (28, 'C2', 1, 'A flat income tax with a generous personal exemption is fairer than progressively higher marginal tax rates.', 'A flat tax applies one marginal rate above an exemption; a progressive system applies higher marginal rates to higher income brackets.', 28, TRUE, 1.15, 'applied', 'v2.0'),
    (29, 'C3', -1, 'Preventing serious harm can justify restrictions before an individual offense occurs.', NULL, 29, TRUE, 1.0, 'conceptual', 'v2.0'),
    (30, 'C3', -1, 'Law enforcement needs broad powers when public safety is under substantial threat.', NULL, 30, TRUE, 1.0, 'conceptual', 'v2.0'),
    (31, 'C3', -1, 'Maintaining public order sometimes requires limiting movement, assembly, or privacy.', NULL, 31, TRUE, 1.0, 'conceptual', 'v2.0'),
    (32, 'C3', 1, 'Government should need specific evidence before restricting a peaceful person''s liberty.', NULL, 32, TRUE, 1.0, 'conceptual', 'v2.0'),
    (33, 'C3', 1, 'Privacy should not be sacrificed merely because surveillance would make enforcement easier.', NULL, 33, TRUE, 1.0, 'conceptual', 'v2.0'),
    (34, 'C3', 1, 'Offensive or unpopular expression should remain legal unless it directly threatens others.', NULL, 34, TRUE, 1.0, 'conceptual', 'v2.0'),
    (35, 'C3', -1, 'A court should be able to order temporary inpatient treatment for a person in an acute psychotic crisis who poses a serious and immediate danger.', 'Involuntary inpatient treatment confines a person for care without consent and is normally subject to legal standards and review.', 35, TRUE, 1.15, 'applied', 'v2.0'),
    (36, 'C3', -1, 'Authorities should be able to impose a narrowly limited quarantine on people confirmed to carry a highly lethal contagious disease.', 'Quarantine restricts the movement of people exposed to or carrying an infectious disease.', 36, TRUE, 1.15, 'applied', 'v2.0'),
    (37, 'C3', -1, 'After several nights of organized violence, a city may impose a temporary nighttime curfew with judicial review.', 'A curfew restricts presence in public places during specified hours and may include exemptions for work, care, and emergencies.', 37, TRUE, 1.15, 'applied', 'v2.0'),
    (38, 'C3', -1, 'Large public events may require universal bag screening even when there is no individualized suspicion.', 'Universal screening applies the same search procedure to all entrants rather than selecting individuals based on suspicion.', 38, TRUE, 1.15, 'applied', 'v2.0'),
    (39, 'C3', 1, 'Police should need a warrant to obtain a person''s historical cellphone-location records.', 'Historical cellphone-location records can reconstruct where a device was located over time.', 39, TRUE, 1.15, 'applied', 'v2.0'),
    (40, 'C3', 1, 'Property should not be permanently seized through civil forfeiture unless its owner is convicted or the government proves the property''s involvement in court.', 'Civil forfeiture allows property connected to alleged wrongdoing to be seized through a civil process that may not require an owner''s criminal conviction.', 40, TRUE, 1.15, 'applied', 'v2.0'),
    (41, 'C3', 1, 'Emergency powers should expire automatically unless the legislature affirmatively renews them after public debate.', 'A sunset clause makes a legal power expire on a set date unless lawmakers renew it.', 41, TRUE, 1.15, 'applied', 'v2.0'),
    (42, 'C3', 1, 'Adults should be permitted to possess small amounts of currently illegal drugs for personal use, subject to health and age regulations.', 'Decriminalization removes criminal penalties for possession; legalization also permits regulated production or sale.', 42, TRUE, 1.15, 'applied', 'v2.0'),
    (43, 'C4', -1, 'National standards are necessary when local variation would produce unequal basic rights or services.', NULL, 43, TRUE, 1.0, 'conceptual', 'v2.0'),
    (44, 'C4', -1, 'Large-scale problems are usually handled best by a central government with broad coordinating authority.', NULL, 44, TRUE, 1.0, 'conceptual', 'v2.0'),
    (45, 'C4', -1, 'Higher levels of government should prevent local decisions that impose serious costs on neighboring regions.', NULL, 45, TRUE, 1.0, 'conceptual', 'v2.0'),
    (46, 'C4', 1, 'Decisions should normally be made by the smallest jurisdiction capable of handling them.', NULL, 46, TRUE, 1.0, 'conceptual', 'v2.0'),
    (47, 'C4', 1, 'Regions should be free to experiment with substantially different policies.', NULL, 47, TRUE, 1.0, 'conceptual', 'v2.0'),
    (48, 'C4', 1, 'Subnational governments should retain meaningful authority that the national government cannot easily revoke.', NULL, 48, TRUE, 1.0, 'conceptual', 'v2.0'),
    (49, 'C4', -1, 'National election-administration standards should govern ballot access, counting procedures, and post-election audits in every region.', 'Election administration includes registration, ballot handling, counting, certification, and auditing procedures.', 49, TRUE, 1.15, 'applied', 'v2.0'),
    (50, 'C4', -1, 'The national government should be able to approve interstate transmission lines after a uniform review, even when individual localities object.', 'Transmission lines move electricity over long distances and often cross many local jurisdictions.', 50, TRUE, 1.15, 'applied', 'v2.0'),
    (51, 'C4', -1, 'A national disaster agency should be able to direct resources and personnel across state or provincial boundaries during a major catastrophe.', 'Central command allows one authority to allocate scarce personnel and equipment across jurisdictions.', 51, TRUE, 1.15, 'applied', 'v2.0'),
    (52, 'C4', -1, 'A national minimum school-funding floor should prevent poor regions from offering substantially fewer basic educational resources.', 'A funding floor sets a national minimum while allowing regions to spend more.', 52, TRUE, 1.15, 'applied', 'v2.0'),
    (53, 'C4', 1, 'States or provinces should set most school curricula rather than follow a single national curriculum.', 'Curriculum authority determines required subjects, standards, and instructional frameworks.', 53, TRUE, 1.15, 'applied', 'v2.0'),
    (54, 'C4', 1, 'Municipalities should control zoning and housing density unless their decisions create clearly demonstrated harms outside their borders.', 'Zoning regulates land uses, building types, and development density.', 54, TRUE, 1.15, 'applied', 'v2.0'),
    (55, 'C4', 1, 'Indigenous or tribal governments should have primary authority over land use and natural resources within their recognized territories.', 'Primary authority means other governments intervene only under clearly defined legal exceptions.', 55, TRUE, 1.15, 'applied', 'v2.0'),
    (56, 'C4', 1, 'Regions should be free to adopt different tax and social-policy models so voters can compare real alternatives.', 'Policy experimentation allows jurisdictions to test different approaches under comparable national rules.', 56, TRUE, 1.15, 'applied', 'v2.0'),
    (57, 'C5', -1, 'Longstanding traditions often contain social knowledge that reformers underestimate.', NULL, 57, TRUE, 1.0, 'conceptual', 'v2.0'),
    (58, 'C5', -1, 'Stable family and civic institutions are more important than constant adaptation to changing preferences.', NULL, 58, TRUE, 1.0, 'conceptual', 'v2.0'),
    (59, 'C5', -1, 'Rapid cultural change can weaken the shared norms needed for social trust.', NULL, 59, TRUE, 1.0, 'conceptual', 'v2.0'),
    (60, 'C5', 1, 'Social norms should change when inherited roles unnecessarily restrict people''s lives.', NULL, 60, TRUE, 1.0, 'conceptual', 'v2.0'),
    (61, 'C5', 1, 'Institutions should revise traditions that exclude people without sufficient justification.', NULL, 61, TRUE, 1.0, 'conceptual', 'v2.0'),
    (62, 'C5', 1, 'New family and cultural forms can be as socially valuable as inherited ones.', NULL, 62, TRUE, 1.0, 'conceptual', 'v2.0'),
    (63, 'C5', -1, 'Public schools should emphasize a shared national language even while offering additional support to students who speak other languages at home.', 'A shared-language policy can coexist with transitional or supplemental multilingual support.', 63, TRUE, 1.15, 'applied', 'v2.0'),
    (64, 'C5', -1, 'Communities should generally retain historic monuments and civic rituals while adding context rather than removing them when values change.', 'Contextualization adds interpretation or counter-perspectives without removing the original object or ritual.', 64, TRUE, 1.15, 'applied', 'v2.0'),
    (65, 'C5', -1, 'The law should make it harder to dissolve a marriage when dependent children are involved, except in cases of abuse or abandonment.', 'No-fault divorce allows dissolution without proving wrongdoing; this scenario asks whether additional procedural barriers should apply when children are involved.', 65, TRUE, 1.15, 'applied', 'v2.0'),
    (66, 'C5', -1, 'Public institutions may preserve longstanding religiously rooted holidays and ceremonies when participation is voluntary.', 'A religiously rooted civic practice may retain historical meaning even when formal participation is optional.', 66, TRUE, 1.15, 'applied', 'v2.0'),
    (67, 'C5', 1, 'Adoption eligibility should be based on caregiving ability rather than marital status, sexual orientation, or whether a household fits a traditional family model.', 'Adoption screening can evaluate safety, stability, and caregiving capacity without requiring one household structure.', 67, TRUE, 1.15, 'applied', 'v2.0'),
    (68, 'C5', 1, 'Adults should have access to no-fault divorce without proving misconduct by a spouse.', 'No-fault divorce permits a marriage to end without proving adultery, abandonment, or another legal wrong.', 68, TRUE, 1.15, 'applied', 'v2.0'),
    (69, 'C5', 1, 'Official civic ceremonies should be revised over time to include secular and minority traditions rather than preserve one inherited form.', 'Inclusive redesign changes shared public ceremonies rather than merely adding private alternatives.', 69, TRUE, 1.15, 'applied', 'v2.0'),
    (70, 'C5', 1, 'Schools should teach that family and household arrangements have changed across history without presenting one current model as universally preferred.', 'The question concerns descriptive and normative framing, not whether schools must endorse every arrangement.', 70, TRUE, 1.15, 'applied', 'v2.0'),
    (71, 'C6', -1, 'People legitimately owe stronger duties to family, community, and fellow citizens than to strangers.', NULL, 71, TRUE, 1.0, 'conceptual', 'v2.0'),
    (72, 'C6', -1, 'Shared membership and contribution can create special claims on common resources.', NULL, 72, TRUE, 1.0, 'conceptual', 'v2.0'),
    (73, 'C6', -1, 'A community may preserve benefits for its members without treating outsiders as morally inferior.', NULL, 73, TRUE, 1.0, 'conceptual', 'v2.0'),
    (74, 'C6', 1, 'A person''s nationality, ancestry, or distance should not reduce the moral weight of their basic needs.', NULL, 74, TRUE, 1.0, 'conceptual', 'v2.0'),
    (75, 'C6', 1, 'Aid should be allocated primarily according to need rather than group membership.', NULL, 75, TRUE, 1.0, 'conceptual', 'v2.0'),
    (76, 'C6', 1, 'Public institutions should apply the same basic rules across ethnic, religious, and national lines.', NULL, 76, TRUE, 1.0, 'conceptual', 'v2.0'),
    (77, 'C6', -1, 'When public housing is scarce, long-term local residents may receive priority among applicants with comparable levels of need.', 'A residency preference ranks otherwise similar applicants by length or continuity of local residence.', 77, TRUE, 1.15, 'applied', 'v2.0'),
    (78, 'C6', -1, 'Veterans may receive a modest preference in public hiring because military service creates a special reciprocal obligation.', 'A modest preference can affect ranking without guaranteeing selection over substantially better-qualified applicants.', 78, TRUE, 1.15, 'applied', 'v2.0'),
    (79, 'C6', -1, 'A locally funded mutual-aid program may reserve some benefits for people who have contributed to it over time.', 'Mutual-aid programs pool contributions among members and distribute benefits under agreed rules.', 79, TRUE, 1.15, 'applied', 'v2.0'),
    (80, 'C6', -1, 'A diaspora charity may reasonably prioritize members of its own dispersed community before assisting unrelated groups.', 'A diaspora is a community dispersed from an ancestral homeland while maintaining shared ties.', 80, TRUE, 1.15, 'applied', 'v2.0'),
    (81, 'C6', 1, 'Refugee admissions should prioritize vulnerability and danger rather than cultural similarity to the receiving country.', 'Vulnerability criteria can include persecution risk, medical need, family separation, and immediate danger.', 81, TRUE, 1.15, 'applied', 'v2.0'),
    (82, 'C6', 1, 'After domestic high-risk groups are protected, surplus vaccines should be distributed internationally according to medical need.', 'The domestic threshold is satisfied before the question turns to allocation of remaining supply.', 82, TRUE, 1.15, 'applied', 'v2.0'),
    (83, 'C6', 1, 'Public hiring and services should apply the same eligibility rules regardless of an applicant''s ethnicity, religion, or ancestry.', 'Uniform eligibility does not preclude accommodations tied to disability, language access, or other functional needs.', 83, TRUE, 1.15, 'applied', 'v2.0'),
    (84, 'C6', 1, 'Humanitarian aid should be allocated where it prevents the most severe suffering rather than primarily to allied countries.', 'This contrasts humanitarian need with strategic or alliance-based allocation.', 84, TRUE, 1.15, 'applied', 'v2.0'),
    (85, 'C7', -1, 'Domestic voters should retain final authority over laws that govern them.', NULL, 85, TRUE, 1.0, 'conceptual', 'v2.0'),
    (86, 'C7', -1, 'International agreements should not permanently bind a country against sustained democratic opposition.', NULL, 86, TRUE, 1.0, 'conceptual', 'v2.0'),
    (87, 'C7', -1, 'Nations need the ability to act unilaterally when common institutions fail.', NULL, 87, TRUE, 1.0, 'conceptual', 'v2.0'),
    (88, 'C7', 1, 'Countries should accept binding common rules when unilateral action cannot solve shared problems.', NULL, 88, TRUE, 1.0, 'conceptual', 'v2.0'),
    (89, 'C7', 1, 'Some sovereignty should be pooled in institutions capable of enforcing international commitments.', NULL, 89, TRUE, 1.0, 'conceptual', 'v2.0'),
    (90, 'C7', 1, 'International courts and regulators can legitimately constrain national governments.', NULL, 90, TRUE, 1.0, 'conceptual', 'v2.0'),
    (91, 'C7', -1, 'A country should retain an independent currency rather than join a monetary union that limits its control over interest rates and public spending.', 'A monetary union uses a shared currency and normally centralizes monetary policy.', 91, TRUE, 1.15, 'applied', 'v2.0'),
    (92, 'C7', -1, 'National food-safety rules should not be weakened merely because an international trade tribunal considers them a barrier to commerce.', 'Trade tribunals assess whether domestic rules violate treaty commitments; they do not necessarily determine the scientific merits of the rule.', 92, TRUE, 1.15, 'applied', 'v2.0'),
    (93, 'C7', -1, 'Foreign purchases of strategically important infrastructure should be subject to national-security screening even when treaties favor open investment.', 'Investment screening reviews foreign acquisitions for security or resilience risks.', 93, TRUE, 1.15, 'applied', 'v2.0'),
    (94, 'C7', -1, 'A government should be able to withdraw from a treaty when its voters reject the continuing obligations.', 'Treaties often include withdrawal procedures and notice periods.', 94, TRUE, 1.15, 'applied', 'v2.0'),
    (95, 'C7', 1, 'Countries should accept a common minimum corporate-tax floor to reduce profit shifting between jurisdictions.', 'A minimum corporate-tax floor reduces incentives to book profits in very low-tax jurisdictions.', 95, TRUE, 1.15, 'applied', 'v2.0'),
    (96, 'C7', 1, 'Member states in a regional union should share responsibility for asylum claims according to population and capacity.', 'Burden sharing allocates responsibilities across jurisdictions rather than leaving claims where migrants first arrive.', 96, TRUE, 1.15, 'applied', 'v2.0'),
    (97, 'C7', 1, 'Cross-border supply chains should be subject to enforceable international labor standards.', 'Enforceable standards may use inspections, complaints, trade consequences, or corporate liability.', 97, TRUE, 1.15, 'applied', 'v2.0'),
    (98, 'C7', 1, 'Countries should accept binding international rules for reporting dangerous disease outbreaks and sharing pathogen data.', 'Pathogen data can support diagnosis, vaccines, and outbreak tracking but may carry economic or security concerns.', 98, TRUE, 1.15, 'applied', 'v2.0'),
    (99, 'C8', -1, 'New technologies should face strong precaution when their harms could be irreversible.', NULL, 99, TRUE, 1.0, 'conceptual', 'v2.0'),
    (100, 'C8', -1, 'Resilience and human control are often more important than maximum technological efficiency.', NULL, 100, TRUE, 1.0, 'conceptual', 'v2.0'),
    (101, 'C8', -1, 'Some technologies create risks that society cannot responsibly manage after deployment.', NULL, 101, TRUE, 1.0, 'conceptual', 'v2.0'),
    (102, 'C8', 1, 'Innovation should generally proceed unless there is clear evidence of serious harm.', NULL, 102, TRUE, 1.0, 'conceptual', 'v2.0'),
    (103, 'C8', 1, 'Technological progress can solve constraints that political redistribution alone cannot.', NULL, 103, TRUE, 1.0, 'conceptual', 'v2.0'),
    (104, 'C8', 1, 'Society should accept some disruption and uncertainty to gain the long-term benefits of innovation.', NULL, 104, TRUE, 1.0, 'conceptual', 'v2.0'),
    (105, 'C8', -1, 'Heritable editing of human embryos should remain prohibited until safety, consent across generations, and governance problems are substantially resolved.', 'Heritable editing changes DNA in ways that may be passed to future generations.', 105, TRUE, 1.15, 'applied', 'v2.0'),
    (106, 'C8', -1, 'Critical infrastructure should retain manual and offline backups even when full automation would be cheaper and more efficient.', 'Offline and manual backups reduce dependence on connected automated systems during cyberattack or system failure.', 106, TRUE, 1.15, 'applied', 'v2.0'),
    (107, 'C8', -1, 'Routine police use of facial recognition in public spaces should be prohibited until accuracy, bias, and abuse risks are demonstrably controlled.', 'Facial-recognition systems compare images to stored templates and can produce false matches that vary across populations.', 107, TRUE, 1.15, 'applied', 'v2.0'),
    (108, 'C8', -1, 'Large outdoor geoengineering experiments should require international authorization and strong evidence that harms are reversible.', 'Geoengineering deliberately alters large-scale Earth systems to affect climate.', 108, TRUE, 1.15, 'applied', 'v2.0'),
    (109, 'C8', 1, 'Cities should deploy autonomous buses once independent evidence shows they are safer than human-driven fleets.', 'Autonomous buses operate without a human driver but may still use remote supervision and defined routes.', 109, TRUE, 1.15, 'applied', 'v2.0'),
    (110, 'C8', 1, 'Gene-edited crops should be approved when they pass the same evidence-based safety standards as conventionally bred crops.', 'Gene editing changes selected DNA sequences and differs from adding genes from unrelated organisms.', 110, TRUE, 1.15, 'applied', 'v2.0'),
    (111, 'C8', 1, 'Nuclear power should be expanded when modern designs can meet transparent safety and waste-management requirements.', 'Nuclear expansion can include existing reactor life extension, new large reactors, or smaller modular designs.', 111, TRUE, 1.15, 'applied', 'v2.0'),
    (112, 'C8', 1, 'Clinicians should be allowed to use validated AI diagnostic systems with human oversight rather than wait for decades of additional experience.', 'A diagnostic AI estimates conditions from clinical data; human oversight retains a professional responsible for the final decision.', 112, TRUE, 1.15, 'applied', 'v2.0'),
    (113, 'C9', -1, 'Environmental protection is ultimately justified by its contribution to human well-being.', NULL, 113, TRUE, 1.0, 'conceptual', 'v2.0'),
    (114, 'C9', -1, 'Human livelihoods should usually take priority when they directly conflict with ecological preservation.', NULL, 114, TRUE, 1.0, 'conceptual', 'v2.0'),
    (115, 'C9', -1, 'Nature may be responsibly transformed to meet important human needs.', NULL, 115, TRUE, 1.0, 'conceptual', 'v2.0'),
    (116, 'C9', 1, 'Species and ecosystems have value independent of their usefulness to people.', NULL, 116, TRUE, 1.0, 'conceptual', 'v2.0'),
    (117, 'C9', 1, 'Future generations and nonhuman life create moral duties for people living today.', NULL, 117, TRUE, 1.0, 'conceptual', 'v2.0'),
    (118, 'C9', 1, 'Some natural places should remain undeveloped even when development would produce substantial economic benefits.', NULL, 118, TRUE, 1.0, 'conceptual', 'v2.0'),
    (119, 'C9', -1, 'A renewable-energy transmission line may cross already disturbed habitat when it is necessary to provide reliable low-carbon power to large populations.', 'Disturbed habitat has already been substantially altered but may still retain ecological value.', 119, TRUE, 1.15, 'applied', 'v2.0'),
    (120, 'C9', -1, 'Predators that repeatedly kill livestock may be lethally controlled when nonlethal measures have failed.', 'Nonlethal measures can include fencing, guard animals, relocation, and compensation.', 120, TRUE, 1.15, 'applied', 'v2.0'),
    (121, 'C9', -1, 'Housing may be built on degraded habitat if developers restore comparable habitat elsewhere and prevent net pollution.', 'A habitat offset funds restoration or protection elsewhere to compensate for ecological loss.', 121, TRUE, 1.15, 'applied', 'v2.0'),
    (122, 'C9', -1, 'Coastal flood defenses for dense communities should take priority over preserving every natural shoreline in its existing form.', 'Flood defenses can include seawalls, barriers, elevation, dunes, wetlands, and managed retreat.', 122, TRUE, 1.15, 'applied', 'v2.0'),
    (123, 'C9', 1, 'Farming practices that cause severe, avoidable animal suffering should be phased out even if meat becomes more expensive.', 'Animal-welfare regulation can address confinement, handling, transport, and slaughter practices.', 123, TRUE, 1.15, 'applied', 'v2.0'),
    (124, 'C9', 1, 'Mining should be denied in an intact watershed whose ecological functions cannot realistically be replaced.', 'A watershed includes the land and water systems draining to a shared river, lake, or aquifer.', 124, TRUE, 1.15, 'applied', 'v2.0'),
    (125, 'C9', 1, 'Governments should restore wetlands and floodplains even when doing so removes some land from future development.', 'Wetlands and floodplains can reduce floods, filter water, and support habitat.', 125, TRUE, 1.15, 'applied', 'v2.0'),
    (126, 'C9', 1, 'Groundwater extraction should be limited when continued pumping would irreversibly damage rivers, springs, or dependent ecosystems.', 'Groundwater pumping can reduce connected surface flows and permanently compact aquifers.', 126, TRUE, 1.15, 'applied', 'v2.0'),
    (127, 'C10', -1, 'Some actions are objectively wrong regardless of what any culture or majority believes.', NULL, 127, TRUE, 1.0, 'conceptual', 'v2.0'),
    (128, 'C10', -1, 'Moral truth is not created by social approval or historical circumstance.', NULL, 128, TRUE, 1.0, 'conceptual', 'v2.0'),
    (129, 'C10', -1, 'Universal principles can legitimately be used to judge inherited customs.', NULL, 129, TRUE, 1.0, 'conceptual', 'v2.0'),
    (130, 'C10', 1, 'Moral standards are substantially shaped by culture and historical experience.', NULL, 130, TRUE, 1.0, 'conceptual', 'v2.0'),
    (131, 'C10', 1, 'There is no fully neutral standpoint outside human practices from which all moral disputes can be settled.', NULL, 131, TRUE, 1.0, 'conceptual', 'v2.0'),
    (132, 'C10', 1, 'Societies can create new moral standards as their understanding and circumstances change.', NULL, 132, TRUE, 1.0, 'conceptual', 'v2.0'),
    (133, 'C10', -1, 'Forced marriage is wrong even when families and local custom strongly approve of it.', 'Forced marriage lacks the free and ongoing consent of at least one person.', 133, TRUE, 1.15, 'applied', 'v2.0'),
    (134, 'C10', -1, 'Torture remains morally wrong even when a large majority believes it would protect the country.', 'Torture intentionally inflicts severe pain or suffering to punish, intimidate, or obtain information.', 134, TRUE, 1.15, 'applied', 'v2.0'),
    (135, 'C10', -1, 'Deliberately targeting civilians in war is wrong regardless of the cause being defended.', 'The principle of distinction requires separating military targets from civilians.', 135, TRUE, 1.15, 'applied', 'v2.0'),
    (136, 'C10', -1, 'Using forced labor is unethical regardless of whether it is legal or culturally accepted where it occurs.', 'Forced labor is work extracted through coercion, threats, or inability to leave.', 136, TRUE, 1.15, 'applied', 'v2.0'),
    (137, 'C10', 1, 'Societies may legitimately adopt different end-of-life practices because ideas about dignity and obligation are partly shaped by culture.', 'End-of-life practices can include treatment refusal, assisted dying, family decision roles, and definitions of appropriate care.', 137, TRUE, 1.15, 'applied', 'v2.0'),
    (138, 'C10', 1, 'There is no single objectively correct model for how extended families should divide caregiving and inheritance responsibilities.', 'Extended-family systems assign duties across relatives in different ways.', 138, TRUE, 1.15, 'applied', 'v2.0'),
    (139, 'C10', 1, 'Public policy should allow substantial moral disagreement about reproductive technology when consenting adults are involved and clear harm is uncertain.', 'Reproductive technologies can include donor conception, surrogacy, embryo selection, and fertility treatment.', 139, TRUE, 1.15, 'applied', 'v2.0'),
    (140, 'C10', 1, 'Schools should present major ethical controversies as disputes shaped by different traditions rather than teach that one framework has settled every issue.', 'A plural curriculum can explain competing frameworks without treating every claim as equally well supported.', 140, TRUE, 1.15, 'applied', 'v2.0'),
    (141, 'C11', -1, 'A coherent moral framework should be able to rank competing values in every case.', NULL, 141, TRUE, 1.0, 'conceptual', 'v2.0'),
    (142, 'C11', -1, 'Even difficult moral conflicts have a best answer in principle.', NULL, 142, TRUE, 1.0, 'conceptual', 'v2.0'),
    (143, 'C11', -1, 'Public institutions need a stable hierarchy of values rather than case-by-case balancing.', NULL, 143, TRUE, 1.0, 'conceptual', 'v2.0'),
    (144, 'C11', 1, 'Several values can be genuine and important without being reducible to one master principle.', NULL, 144, TRUE, 1.0, 'conceptual', 'v2.0'),
    (145, 'C11', 1, 'Reasonable people can continue to disagree even when they share the relevant facts.', NULL, 145, TRUE, 1.0, 'conceptual', 'v2.0'),
    (146, 'C11', 1, 'Some moral conflicts involve unavoidable loss because no option fully honors every value.', NULL, 146, TRUE, 1.0, 'conceptual', 'v2.0'),
    (147, 'C11', -1, 'When constitutional rights conflict, courts should apply a stable hierarchy rather than balance the values differently in each case.', 'A fixed hierarchy gives one right presumptive or categorical priority over another.', 147, TRUE, 1.15, 'applied', 'v2.0'),
    (148, 'C11', -1, 'Emergency medical triage should follow one transparent priority rule rather than combine several competing principles case by case.', 'Triage rules may prioritize survival probability, urgency, life-years, waiting time, or equal chance.', 148, TRUE, 1.15, 'applied', 'v2.0'),
    (149, 'C11', -1, 'Public institutions should adopt one consistent definition of human dignity across criminal, medical, and family law.', 'A single definition would guide multiple legal fields rather than allowing context-specific meanings.', 149, TRUE, 1.15, 'applied', 'v2.0'),
    (150, 'C11', -1, 'When equal treatment conflicts with religious custom, equal treatment should have presumptive priority rather than be balanced anew in every case.', 'A presumptive priority can still allow narrow exceptions when the competing burden is unusually severe.', 150, TRUE, 1.15, 'applied', 'v2.0'),
    (151, 'C11', 1, 'Conscientious exemptions should sometimes be allowed when they protect a serious moral commitment without imposing substantial harm on others.', 'A conscientious exemption excuses a person or institution from a generally applicable rule for a serious moral or religious reason.', 151, TRUE, 1.15, 'applied', 'v2.0'),
    (152, 'C11', 1, 'End-of-life law should offer more than one ethically defensible option rather than enforce a single view of dignity.', 'Multiple options can include continued treatment, refusal, palliative sedation, or other legally defined choices.', 152, TRUE, 1.15, 'applied', 'v2.0'),
    (153, 'C11', 1, 'Land-use decisions should openly balance housing, heritage, livelihoods, and ecology rather than treat one value as overriding in every case.', 'Multi-criteria balancing explicitly weighs several goals instead of maximizing only one.', 153, TRUE, 1.15, 'applied', 'v2.0'),
    (154, 'C11', 1, 'Courts should acknowledge that some rights conflicts involve genuine losses on both sides rather than pretend one value always fully defeats the other.', 'Proportional balancing asks whether a restriction is suitable, necessary, and justified relative to its burden.', 154, TRUE, 1.15, 'applied', 'v2.0'),
    (155, 'F1', -1, 'Durable reform usually comes from incremental changes that institutions can absorb.', NULL, 155, TRUE, 1.0, 'conceptual', 'v2.0'),
    (156, 'F1', -1, 'Rapid transformation often creates unintended harms greater than the problems it addresses.', NULL, 156, TRUE, 1.0, 'conceptual', 'v2.0'),
    (157, 'F1', -1, 'Stability and continuity have value even when significant reform is needed.', NULL, 157, TRUE, 1.0, 'conceptual', 'v2.0'),
    (158, 'F1', 1, 'Entrenched systems sometimes require rapid structural change rather than gradual adjustment.', NULL, 158, TRUE, 1.0, 'conceptual', 'v2.0'),
    (159, 'F1', 1, 'Disruption can be legitimate when ordinary channels consistently protect injustice.', NULL, 159, TRUE, 1.0, 'conceptual', 'v2.0'),
    (160, 'F1', 1, 'Compromise can preserve a harmful system by relieving the pressure for deeper reform.', NULL, 160, TRUE, 1.0, 'conceptual', 'v2.0'),
    (161, 'F1', -1, 'A national social program should be tested in several regions and revised before being implemented everywhere.', 'A pilot tests a policy on a limited scale before wider adoption.', 161, TRUE, 1.15, 'applied', 'v2.0'),
    (162, 'F1', -1, 'A movement should accept a meaningful partial emissions law now rather than reject it while waiting for a complete climate package.', 'The scenario assumes the partial law creates a real improvement but does not achieve the movement''s full goal.', 162, TRUE, 1.15, 'applied', 'v2.0'),
    (163, 'F1', -1, 'Police reform should proceed through staged standards, training, and oversight unless evidence shows the institutions cannot be repaired.', 'Staged reform changes rules and oversight over time rather than abolishing and replacing the institution at once.', 163, TRUE, 1.15, 'applied', 'v2.0'),
    (164, 'F1', -1, 'Employees who uncover wrongdoing should normally use protected reporting channels before releasing confidential material publicly.', 'Protected channels may include inspectors general, regulators, unions, courts, or designated compliance offices.', 164, TRUE, 1.15, 'applied', 'v2.0'),
    (165, 'F1', 1, 'A constitutional convention may be justified when ordinary amendment procedures repeatedly protect a failing political system.', 'A constitutional convention is a specially authorized body that proposes broad changes to fundamental political rules.', 165, TRUE, 1.15, 'applied', 'v2.0'),
    (166, 'F1', 1, 'A general strike can be legitimate when normal bargaining and elections cannot overcome entrenched labor abuses.', 'A general strike is a broad work stoppage across multiple industries or sectors.', 166, TRUE, 1.15, 'applied', 'v2.0'),
    (167, 'F1', 1, 'A movement may reject a partial compromise when accepting it would remove the pressure needed for structural reform.', 'The question assumes the partial measure provides some benefit but may reduce momentum for broader change.', 167, TRUE, 1.15, 'applied', 'v2.0'),
    (168, 'F1', 1, 'A deeply discredited agency may need to be abolished and rebuilt rather than improved through another round of internal reforms.', 'Abolition and rebuilding replace the organization, mandate, and operating rules rather than only changing leadership or procedures.', 168, TRUE, 1.15, 'applied', 'v2.0'),
    (169, 'F2', -1, 'Professional norms and oversight usually constrain misconduct within major institutions.', NULL, 169, TRUE, 1.0, 'conceptual', 'v2.0'),
    (170, 'F2', -1, 'Institutions that expose errors and correct them deserve a presumption of good faith.', NULL, 170, TRUE, 1.0, 'conceptual', 'v2.0'),
    (171, 'F2', -1, 'Stable institutions generally produce more reliable decisions than improvised alternatives.', NULL, 171, TRUE, 1.0, 'conceptual', 'v2.0'),
    (172, 'F2', 1, 'Powerful institutions often protect their own interests while presenting their choices as neutral.', NULL, 172, TRUE, 1.0, 'conceptual', 'v2.0'),
    (173, 'F2', 1, 'Official expertise should be independently verifiable rather than accepted on authority.', NULL, 173, TRUE, 1.0, 'conceptual', 'v2.0'),
    (174, 'F2', 1, 'Transparency and external audit are more reliable than institutional assurances.', NULL, 174, TRUE, 1.0, 'conceptual', 'v2.0'),
    (175, 'F2', -1, 'A certified election result should be accepted after transparent procedures, bipartisan observation, and a completed independent audit.', 'An election audit checks records or paper ballots using procedures independent of the original count.', 175, TRUE, 1.15, 'applied', 'v2.0'),
    (176, 'F2', -1, 'When several independent research groups converge on the same finding, public policy should generally treat that consensus as reliable.', 'Convergent evidence comes from separate teams, methods, or datasets reaching compatible conclusions.', 176, TRUE, 1.15, 'applied', 'v2.0'),
    (177, 'F2', -1, 'Judges should be presumed to be acting in good faith unless evidence shows corruption or undisclosed conflicts.', 'A presumption of good faith can be rebutted by evidence and does not prevent appeals or oversight.', 177, TRUE, 1.15, 'applied', 'v2.0'),
    (178, 'F2', -1, 'A public-health agency may receive temporary operational discretion during an outbreak when it publishes its evidence and decisions for review.', 'Operational discretion allows an agency to act within delegated limits without obtaining new legislative approval for every step.', 178, TRUE, 1.15, 'applied', 'v2.0'),
    (179, 'F2', 1, 'Regulators should be required to publish models, assumptions, and uncertainty ranges before major rules take effect.', 'Models and uncertainty ranges show how projected effects depend on assumptions and incomplete evidence.', 179, TRUE, 1.15, 'applied', 'v2.0'),
    (180, 'F2', 1, 'Clinical-trial data supporting public recommendations should be available for independent reanalysis, not only summarized by sponsors or agencies.', 'Independent reanalysis checks whether results depend on analytic choices, exclusions, or reporting.', 180, TRUE, 1.15, 'applied', 'v2.0'),
    (181, 'F2', 1, 'Senior officials should face strict cooling-off periods before taking paid roles in industries they regulated.', 'A cooling-off period delays lobbying or employment connected to an official''s former responsibilities.', 181, TRUE, 1.15, 'applied', 'v2.0'),
    (182, 'F2', 1, 'Police and welfare algorithms should be subject to outside audits because agencies cannot be trusted to assess their own systems.', 'An outside audit can evaluate accuracy, bias, security, documentation, and appeal procedures.', 182, TRUE, 1.15, 'applied', 'v2.0'),
    (183, 'F3', -1, 'Wrongdoers deserve punishment proportionate to the seriousness of their offense.', NULL, 183, TRUE, 1.0, 'conceptual', 'v2.0'),
    (184, 'F3', -1, 'Public condemnation and punishment help reaffirm the moral boundaries of a community.', NULL, 184, TRUE, 1.0, 'conceptual', 'v2.0'),
    (185, 'F3', -1, 'Some offenses merit punishment even when it does not rehabilitate the offender.', NULL, 185, TRUE, 1.0, 'conceptual', 'v2.0'),
    (186, 'F3', 1, 'Justice should focus primarily on repairing harm and reintegrating people into society.', NULL, 186, TRUE, 1.0, 'conceptual', 'v2.0'),
    (187, 'F3', 1, 'Victims and affected communities should have a meaningful role in resolving wrongdoing.', NULL, 187, TRUE, 1.0, 'conceptual', 'v2.0'),
    (188, 'F3', 1, 'Accountability can be achieved through restitution, treatment, and changed behavior rather than punishment alone.', NULL, 188, TRUE, 1.0, 'conceptual', 'v2.0'),
    (189, 'F3', -1, 'A professional who deliberately defrauds clients should lose their license even after full repayment and genuine remorse.', 'Professional discipline protects the public and can also express condemnation independent of criminal punishment.', 189, TRUE, 1.15, 'applied', 'v2.0'),
    (190, 'F3', -1, 'A commander responsible for war crimes should face punishment even if prosecution complicates a peace agreement.', 'Peace agreements sometimes offer amnesty or reduced punishment in exchange for ending conflict.', 190, TRUE, 1.15, 'applied', 'v2.0'),
    (191, 'F3', -1, 'A repeat violent offender may deserve a long prison sentence even when rehabilitation appears unlikely.', 'This scenario separates deserved punishment and incapacitation from confidence in rehabilitation.', 191, TRUE, 1.15, 'applied', 'v2.0'),
    (192, 'F3', -1, 'A public official who knowingly sells decisions for bribes should serve prison time rather than receive only restitution and a ban from office.', 'Restitution returns illicit gains; a ban from office prevents future public service.', 192, TRUE, 1.15, 'applied', 'v2.0'),
    (193, 'F3', 1, 'A juvenile who commits a serious assault should be offered intensive treatment, restitution, and supervised reintegration rather than automatically being sentenced as an adult.', 'A restorative sentence can include confinement or supervision while emphasizing treatment, repair, and reintegration.', 193, TRUE, 1.15, 'applied', 'v2.0'),
    (194, 'F3', 1, 'A company that causes major pollution should be required to repair the damage, compensate communities, and submit to monitoring rather than rely mainly on punitive fines.', 'Remediation repairs environmental damage; monitoring verifies future compliance.', 194, TRUE, 1.15, 'applied', 'v2.0'),
    (195, 'F3', 1, 'A school response to serious student violence should include victim participation, treatment, and a safety plan rather than rely only on exclusion.', 'Victim participation must be voluntary and can occur without face-to-face contact.', 195, TRUE, 1.15, 'applied', 'v2.0'),
    (196, 'F3', 1, 'A truth commission may offer reduced punishment for full disclosure and victim reparations after a civil conflict.', 'Truth commissions investigate patterns of abuse and may trade reduced punishment for disclosure, acknowledgment, and reparations.', 196, TRUE, 1.15, 'applied', 'v2.0'),
    (197, 'F4', -1, 'Elected majorities should normally prevail over judges and unelected constitutional bodies.', NULL, 197, TRUE, 1.0, 'conceptual', 'v2.0'),
    (198, 'F4', -1, 'A sustained democratic majority should be able to change most fundamental rules.', NULL, 198, TRUE, 1.0, 'conceptual', 'v2.0'),
    (199, 'F4', -1, 'Minority protections should not become a general excuse for overriding ordinary democratic decisions.', NULL, 199, TRUE, 1.0, 'conceptual', 'v2.0'),
    (200, 'F4', 1, 'Majority rule must be limited by rights that majorities cannot easily remove.', NULL, 200, TRUE, 1.0, 'conceptual', 'v2.0'),
    (201, 'F4', 1, 'Courts may legitimately invalidate laws that violate constitutional protections.', NULL, 201, TRUE, 1.0, 'conceptual', 'v2.0'),
    (202, 'F4', 1, 'Fundamental political rules should require broader agreement than a temporary majority.', NULL, 202, TRUE, 1.0, 'conceptual', 'v2.0'),
    (203, 'F4', -1, 'Elected legislatures, not courts, should normally have the final word on contested social policy.', 'Legislative supremacy gives elected lawmakers final authority, subject to elections rather than constitutional invalidation by courts.', 203, TRUE, 1.15, 'applied', 'v2.0'),
    (204, 'F4', -1, 'A constitution should be amendable through two successive national majority votes without requiring a supermajority.', 'A supermajority requires more than half, such as two-thirds, to approve a change.', 204, TRUE, 1.15, 'applied', 'v2.0'),
    (205, 'F4', -1, 'A national referendum should be able to reverse a policy created by judicial interpretation when voters clearly reject it.', 'A popular override allows voters to reverse a court-created rule through a defined democratic process.', 205, TRUE, 1.15, 'applied', 'v2.0'),
    (206, 'F4', -1, 'Election rules may be changed by an elected majority after public debate rather than being insulated from ordinary politics.', 'Insulation can require independent commissions, supermajorities, or constitutional rules.', 206, TRUE, 1.15, 'applied', 'v2.0'),
    (207, 'F4', 1, 'Courts should invalidate a popular law that denies equal civil rights to a religious or ethnic minority.', 'Constitutional invalidation prevents enforcement even when the law was democratically enacted.', 207, TRUE, 1.15, 'applied', 'v2.0'),
    (208, 'F4', 1, 'Suspending core civil liberties during an emergency should require a legislative supermajority and prompt judicial review.', 'Prompt review requires courts to assess legality during, not only after, the emergency.', 208, TRUE, 1.15, 'applied', 'v2.0'),
    (209, 'F4', 1, 'Independent election-administration rules should be protected from unilateral change by the party currently in power.', 'Entrenchment makes rules harder to change than ordinary legislation.', 209, TRUE, 1.15, 'applied', 'v2.0'),
    (210, 'F4', 1, 'Fundamental constitutional amendments should require broader and more durable agreement than a single election majority.', 'Broader agreement may require supermajorities, regional consent, or approval across multiple elections.', 210, TRUE, 1.15, 'applied', 'v2.0'),
    (211, 'F5', -1, 'Experts should advise democratic leaders but should not make value-laden public decisions for them.', NULL, 211, TRUE, 1.0, 'conceptual', 'v2.0'),
    (212, 'F5', -1, 'Democratic accountability is more important than technically optimal policy.', NULL, 212, TRUE, 1.0, 'conceptual', 'v2.0'),
    (213, 'F5', -1, 'Elected officials should retain authority even when professional bodies strongly disagree.', NULL, 213, TRUE, 1.0, 'conceptual', 'v2.0'),
    (214, 'F5', 1, 'Technical decisions should often be delegated to qualified professionals insulated from day-to-day politics.', NULL, 214, TRUE, 1.0, 'conceptual', 'v2.0'),
    (215, 'F5', 1, 'Expertise can justify limiting the discretion of elected officials in specialized fields.', NULL, 215, TRUE, 1.0, 'conceptual', 'v2.0'),
    (216, 'F5', 1, 'Evidence-based standards should constrain popular preferences when the public cannot easily evaluate complex risks.', NULL, 216, TRUE, 1.0, 'conceptual', 'v2.0'),
    (217, 'F5', -1, 'Elected lawmakers should decide whether government may use AI surveillance rather than delegate the value judgment to a technical commission.', 'A technical commission can assess feasibility and risk, but the question concerns who makes the final normative choice.', 217, TRUE, 1.15, 'applied', 'v2.0'),
    (218, 'F5', -1, 'Local voters should make the final land-use tradeoff after experts present the evidence.', 'Experts provide analysis, while voters retain final authority over the tradeoff.', 218, TRUE, 1.15, 'applied', 'v2.0'),
    (219, 'F5', -1, 'Civilian elected leaders should determine military objectives rather than defer to commanders because the issue is technically complex.', 'Civilian control gives elected authorities final responsibility for political objectives and acceptable risk.', 219, TRUE, 1.15, 'applied', 'v2.0'),
    (220, 'F5', -1, 'Elected school boards should set curriculum priorities rather than delegate them entirely to academic specialists.', 'Curriculum priorities combine technical pedagogy with public judgments about goals and content.', 220, TRUE, 1.15, 'applied', 'v2.0'),
    (221, 'F5', 1, 'An independent central bank should set short-term interest rates without needing approval from elected officials.', 'Central-bank independence separates routine monetary decisions from direct electoral control.', 221, TRUE, 1.15, 'applied', 'v2.0'),
    (222, 'F5', 1, 'A scientific public-health body should set vaccine schedules using published evidence rather than popular vote.', 'Vaccine schedules determine recommended timing and eligibility based on disease risk and evidence.', 222, TRUE, 1.15, 'applied', 'v2.0'),
    (223, 'F5', 1, 'An independent grid operator should be able to order reliability investments that elected officials may find politically unpopular.', 'A grid operator coordinates electricity supply and transmission to prevent instability and outages.', 223, TRUE, 1.15, 'applied', 'v2.0'),
    (224, 'F5', 1, 'Exposure limits for toxic chemicals should be set by technical panels using transparent risk methods.', 'Exposure limits estimate acceptable risk using toxicology, epidemiology, and uncertainty factors.', 224, TRUE, 1.15, 'applied', 'v2.0'),
    (225, 'F6', -1, 'Citizens should decide major public questions directly whenever practical.', NULL, 225, TRUE, 1.0, 'conceptual', 'v2.0'),
    (226, 'F6', -1, 'Referendums and initiatives are necessary checks on a self-protecting political class.', NULL, 226, TRUE, 1.0, 'conceptual', 'v2.0'),
    (227, 'F6', -1, 'Voters should be able to recall officials who lose public confidence before the next scheduled election.', NULL, 227, TRUE, 1.0, 'conceptual', 'v2.0'),
    (228, 'F6', 1, 'Representatives can weigh evidence and negotiate tradeoffs better than mass referendums.', NULL, 228, TRUE, 1.0, 'conceptual', 'v2.0'),
    (229, 'F6', 1, 'Complex policies should be shaped through deliberation and amendment rather than a single popular vote.', NULL, 229, TRUE, 1.0, 'conceptual', 'v2.0'),
    (230, 'F6', 1, 'Elected representatives should have discretion to make decisions that differ from current polling.', NULL, 230, TRUE, 1.0, 'conceptual', 'v2.0'),
    (231, 'F6', -1, 'Voters should be able to legalize or prohibit major policies through ballot initiatives even when the legislature disagrees.', 'A ballot initiative lets voters enact or repeal law directly after a petition process.', 231, TRUE, 1.15, 'applied', 'v2.0'),
    (232, 'F6', -1, 'A mayor should be subject to recall before the next election when a petition reaches a high signature threshold.', 'A recall election asks voters whether to remove an official before the scheduled end of the term.', 232, TRUE, 1.15, 'applied', 'v2.0'),
    (233, 'F6', -1, 'Major long-term public borrowing should require approval in a referendum.', 'Public borrowing commits future revenue to repay principal and interest.', 233, TRUE, 1.15, 'applied', 'v2.0'),
    (234, 'F6', -1, 'Residents should directly vote on a meaningful share of the municipal budget.', 'Participatory budgeting lets residents propose and vote on specified public expenditures.', 234, TRUE, 1.15, 'applied', 'v2.0'),
    (235, 'F6', 1, 'Complex tax reform should be decided by elected representatives after hearings and amendment rather than by a single up-or-down referendum.', 'Hearings and amendment allow provisions to be revised separately before final passage.', 235, TRUE, 1.15, 'applied', 'v2.0'),
    (236, 'F6', 1, 'Legislatures should be allowed to make unpopular compromises that would be difficult to assemble through separate ballot questions.', 'A legislative package can link concessions across issues that voters would otherwise consider separately.', 236, TRUE, 1.15, 'applied', 'v2.0'),
    (237, 'F6', 1, 'Citizens'' views should inform policy, but representatives should retain discretion to change position after reviewing evidence.', 'A trustee model asks representatives to use judgment rather than follow constituent instructions mechanically.', 237, TRUE, 1.15, 'applied', 'v2.0'),
    (238, 'F6', 1, 'Minority-rights protections should not be submitted to frequent popular referendums.', 'Frequent referendums can repeatedly reopen settled legal status and expose small groups to majority campaigns.', 238, TRUE, 1.15, 'applied', 'v2.0'),
    (239, 'F7', -1, 'Military force usually creates new dangers that outlast the problem it was meant to solve.', NULL, 239, TRUE, 1.0, 'conceptual', 'v2.0'),
    (240, 'F7', -1, 'Diplomacy and economic engagement should be preferred even when they take longer.', NULL, 240, TRUE, 1.0, 'conceptual', 'v2.0'),
    (241, 'F7', -1, 'The risk to civilians should create a strong presumption against using force.', NULL, 241, TRUE, 1.0, 'conceptual', 'v2.0'),
    (242, 'F7', 1, 'Peace often depends on a credible willingness to use military force.', NULL, 242, TRUE, 1.0, 'conceptual', 'v2.0'),
    (243, 'F7', 1, 'Military intervention can be justified to prevent a substantially worse outcome.', NULL, 243, TRUE, 1.0, 'conceptual', 'v2.0'),
    (244, 'F7', 1, 'Alliances are meaningful only when members are willing to fight for one another.', NULL, 244, TRUE, 1.0, 'conceptual', 'v2.0'),
    (245, 'F7', -1, 'A country should not launch a preventive war based only on suspicion that another state may develop dangerous weapons.', 'Preventive war attacks a potential future threat before an imminent attack exists.', 245, TRUE, 1.15, 'applied', 'v2.0'),
    (246, 'F7', -1, 'Diplomacy, inspections, and targeted sanctions should be exhausted before conventional military force is used.', 'Targeted sanctions focus on leaders, firms, or sectors rather than broadly restricting an entire population.', 246, TRUE, 1.15, 'applied', 'v2.0'),
    (247, 'F7', -1, 'Arms sales should end when an allied government repeatedly uses the weapons against civilians.', 'Arms transfers can include sales, grants, maintenance, ammunition, and technical support.', 247, TRUE, 1.15, 'applied', 'v2.0'),
    (248, 'F7', -1, 'Military conscription should be reserved for defense against a direct and severe threat to the country.', 'Conscription requires eligible people to perform military service.', 248, TRUE, 1.15, 'applied', 'v2.0'),
    (249, 'F7', 1, 'A treaty ally that is invaded should be defended militarily even when doing so creates serious costs and escalation risks.', 'Collective-defense treaties commit members to assist one another after an attack.', 249, TRUE, 1.15, 'applied', 'v2.0'),
    (250, 'F7', 1, 'Limited military strikes can be justified to stop an imminent mass killing when no effective peaceful option remains.', 'A limited strike uses force for a narrow objective rather than broader regime change or occupation.', 250, TRUE, 1.15, 'applied', 'v2.0'),
    (251, 'F7', 1, 'A credible nuclear deterrent should be maintained as long as rival states possess nuclear weapons.', 'Nuclear deterrence aims to prevent attack by preserving a credible retaliatory capability.', 251, TRUE, 1.15, 'applied', 'v2.0'),
    (252, 'F7', 1, 'A major state-sponsored cyberattack on critical infrastructure may justify proportionate offensive retaliation.', 'Proportionate retaliation may be cyber, economic, or military and should be limited to the scale and nature of the attack.', 252, TRUE, 1.15, 'applied', 'v2.0'),
    (253, 'C1', 1, 'Private firms should be allowed to use biometric screening with customer consent, even if it substantially reduces privacy.', 'Biometric screening uses traits such as face, fingerprint, or voice to verify identity.', 253, TRUE, 1.25, 'applied', 'v2.0'),
    (254, 'C1', -1, 'Government should require private venues to install standardized surveillance systems as a condition of operating, even if the mandate raises costs and reduces privacy.', 'A surveillance mandate can require cameras, identity checks, data retention, or reporting as a condition of operating.', 254, TRUE, 1.25, 'applied', 'v2.0'),
    (255, 'C4', 1, 'Cities should be free to cap fees charged by delivery platforms, even if some firms leave those markets.', 'Platform fee caps limit the commission charged to restaurants, drivers, or customers.', 255, TRUE, 1.25, 'applied', 'v2.0'),
    (256, 'C4', -1, 'The national government should require public ownership of water utilities in every region even when local voters prefer private provision.', 'A national mandate would remove local choice over whether the utility is publicly or privately owned.', 256, TRUE, 1.25, 'applied', 'v2.0'),
    (257, 'C1', 1, 'Countries should accept binding international competition rules that prohibit subsidies and favoritism toward domestic firms.', 'Competition rules can restrict state aid, procurement favoritism, and subsidies that distort cross-border markets.', 257, TRUE, 1.25, 'applied', 'v2.0'),
    (258, 'C1', -1, 'A group of countries should coordinate public subsidies for strategic industries through a binding international agreement.', 'The agreement would pool or coordinate state support rather than prohibit industrial policy.', 258, TRUE, 1.25, 'applied', 'v2.0'),
    (259, 'C6', 1, 'Charitable donors should be free to direct their money to the neediest people worldwide without tax rules favoring domestic beneficiaries.', 'Tax neutrality means the government does not favor domestic over foreign beneficiaries when recognizing charitable gifts.', 259, TRUE, 1.25, 'applied', 'v2.0'),
    (260, 'C2', 1, 'Charitable donors should be free to restrict privately funded scholarships to members of their own community even when equally needy outsiders apply.', 'A donor-directed restriction uses private funds but limits eligibility according to community membership.', 260, TRUE, 1.25, 'applied', 'v2.0'),
    (261, 'C2', -1, 'Religious schools receiving public funds should follow the same nondiscrimination rules as other publicly funded schools, even when those rules conflict with doctrine.', 'A funding condition applies rules to institutions choosing to receive public money.', 261, TRUE, 1.25, 'applied', 'v2.0'),
    (262, 'C5', -1, 'Government should provide a family allowance only to married couples raising children in a traditional household.', 'A family allowance is a public cash benefit tied to children or household status.', 262, TRUE, 1.25, 'applied', 'v2.0'),
    (263, 'C9', 1, 'Government may prohibit private development in a critical wildlife corridor even when owners are willing to accept environmental mitigation.', 'A wildlife corridor connects habitats needed for migration, breeding, and genetic diversity.', 263, TRUE, 1.25, 'applied', 'v2.0'),
    (264, 'C3', -1, 'During a severe food shortage, government may require landowners to clear protected habitat for emergency crop production.', 'The scenario uses compulsory production to increase food supply at direct ecological cost.', 264, TRUE, 1.25, 'applied', 'v2.0'),
    (265, 'C7', 1, 'A state or province should be allowed to join an international climate compact even when the national government objects.', 'A compact is a formal cooperation agreement that may set shared targets or reporting rules.', 265, TRUE, 1.25, 'applied', 'v2.0'),
    (266, 'C7', -1, 'Regions should be free to reject an international agreement adopted by the national government when the agreement intrudes on local authority.', 'A regional opt-out lets a subnational government refuse implementation within its jurisdiction.', 266, TRUE, 1.25, 'applied', 'v2.0'),
    (267, 'C5', 1, 'Fertility clinics should be allowed to offer new reproductive technologies once safety is established, even when the technologies challenge traditional ideas about family.', 'Reproductive technologies can change biological, gestational, and social relationships within families.', 267, TRUE, 1.25, 'applied', 'v2.0'),
    (268, 'C8', -1, 'Government should restrict automated systems that reproduce traditional gender and family assumptions, even if doing so slows deployment of useful AI.', 'Automated systems can reproduce assumptions embedded in training data, labels, objectives, or design choices.', 268, TRUE, 1.25, 'applied', 'v2.0'),
    (269, 'C7', 1, 'A regional union should allocate asylum seekers among member states by capacity and need, even when voters in one state want to prioritize co-nationals.', 'Allocation formulas can consider population, fiscal capacity, prior admissions, and claimant vulnerability.', 269, TRUE, 1.25, 'applied', 'v2.0'),
    (270, 'C6', -1, 'A country should join a regional trade and migration union while retaining citizen-only access to selected welfare benefits.', 'The country accepts common regional rules while preserving particular benefits for its own citizens.', 270, TRUE, 1.25, 'applied', 'v2.0'),
    (271, 'C9', -1, 'Large desalination plants should be built to secure water for cities even when they cause manageable but significant harm to marine ecosystems.', 'Desalination removes salt from water and can affect marine life through intake systems, energy use, and concentrated brine discharge.', 271, TRUE, 1.25, 'applied', 'v2.0'),
    (272, 'C9', 1, 'Precision fermentation and cultivated meat should be deployed to reduce land use and animal suffering even if they disrupt conventional agriculture.', 'Precision fermentation uses microbes to produce food ingredients; cultivated meat grows animal cells without raising whole animals.', 272, TRUE, 1.25, 'applied', 'v2.0'),
    (273, 'C8', -1, 'Heritable gene editing should remain prohibited because altering future persons crosses a moral boundary even if it could prevent serious disease.', 'Heritable changes can affect descendants who cannot consent to the intervention.', 273, TRUE, 1.25, 'applied', 'v2.0'),
    (274, 'C10', 1, 'Because societies hold different moral views about human enhancement, deployment should be paused until broad cross-cultural consent exists.', 'Broad cross-cultural consent means agreement across diverse societies, not unanimity by every individual.', 274, TRUE, 1.25, 'applied', 'v2.0'),
    (275, 'C11', 1, 'Environmental law should balance species protection, housing, livelihoods, and cultural use case by case rather than give any one value automatic priority.', 'Case-by-case balancing can still set minimum protections while weighing context-specific losses.', 275, TRUE, 1.25, 'applied', 'v2.0'),
    (276, 'C9', -1, 'Environmental law should permit essential human development to override habitat protection when several legitimate values conflict and no single value has absolute priority.', 'The scenario treats ecological protection as one important value among several rather than an absolute side constraint.', 276, TRUE, 1.25, 'applied', 'v2.0'),
    (277, 'C3', 1, 'A movement may nonviolently occupy a government building to force urgent reform when lawful channels have repeatedly failed.', 'An occupation remains nonviolent but interferes with normal use of a public building.', 277, TRUE, 1.25, 'applied', 'v2.0'),
    (278, 'F5', 1, 'An expert regulatory agency should receive broad discretion only when its data, models, and conflicts of interest are fully open to independent audit.', 'Broad discretion allows an agency to choose methods and timing within a general legal mandate.', 278, TRUE, 1.25, 'applied', 'v2.0'),
    (279, 'F4', 1, 'A court may replace a voter-approved mandatory prison sentence with a restorative sentence when the mandate violates constitutional proportionality.', 'Proportionality review asks whether a punishment is excessive relative to the offense and legal rights.', 279, TRUE, 1.25, 'applied', 'v2.0'),
    (280, 'F6', -1, 'A citywide referendum should be able to overturn a neighborhood board''s zoning decision.', 'The citywide electorate is a higher territorial level than the neighborhood board.', 280, TRUE, 1.25, 'applied', 'v2.0'),
    (281, 'F7', 1, 'A country should join a mutual-defense alliance that obligates it to fight if any member is attacked.', 'A mutual-defense clause creates a standing obligation rather than a case-by-case promise.', 281, TRUE, 1.25, 'applied', 'v2.0'),
    (282, 'F6', 1, 'Legislators should negotiate and enact one limited reform at a time rather than submit a sweeping package directly to voters.', 'The scenario combines incremental sequencing with representative bargaining rather than direct plebiscitary decision.', 282, TRUE, 1.25, 'applied', 'v2.0'),
    (283, 'F1', 1, 'A newly elected reform government should use short, court-supervised restrictions on the travel and assets of implicated officials while it rapidly restructures deeply compromised institutions.', 'Temporary restraints limit liberty before final adjudication and therefore require narrow scope, evidence, and review.', 283, TRUE, 1.25, 'applied', 'v2.0'),
    (284, 'F6', -1, 'Residents of a municipality should decide a major local land-use plan by binding referendum rather than leave the decision to the national legislature.', 'A binding referendum gives voters direct decision authority rather than an advisory role.', 284, TRUE, 1.25, 'applied', 'v2.0'),
    (285, 'C7', -1, 'A country should launch a limited unilateral strike against an imminent external threat even when international institutions refuse authorization.', 'Unilateral force is undertaken without authorization from a treaty body, regional organization, or the United Nations.', 285, TRUE, 1.25, 'applied', 'v2.0'),
    (286, 'F6', 1, 'A newly elected legislature should enact a comprehensive constitutional package quickly rather than divide it into separate referendums or incremental bills.', 'A comprehensive package changes several connected institutions through representative legislation in one reform window.', 286, TRUE, 1.25, 'applied', 'v2.0'),
    (287, 'F2', -1, 'An independent central bank should be allowed to set interest rates without elected interference because its professional safeguards are generally trustworthy.', 'Central-bank independence delegates monetary decisions to appointed specialists within a statutory mandate.', 287, TRUE, 1.25, 'applied', 'v2.0'),
    (288, 'F3', -1, 'A constitutional court should strike down a voter-approved amnesty for officials who committed torture because some offenses require proportionate punishment.', 'An amnesty removes criminal liability; constitutional review may limit amnesties for grave abuses.', 288, TRUE, 1.25, 'applied', 'v2.0'),
    (289, 'C10', -1, 'A hospital ethics board should apply a single objective rule that protection of innocent life overrides autonomy, dignity, and social cost whenever they conflict.', 'A categorical rule gives one value lexical priority rather than balancing several values case by case.', 289, TRUE, 1.25, 'applied', 'v2.0'),
    (290, 'C11', -1, 'A society may ground public ethics in one coherent moral tradition even if that tradition is historically contingent rather than objectively true.', 'A moral framework can be socially constructed yet still rank values coherently within the society that adopts it.', 290, TRUE, 1.25, 'applied', 'v2.0'),
    (291, 'F2', 1, 'When watchdog evidence shows that an agency has repeatedly concealed corruption, its structure should be replaced quickly rather than repaired through gradual internal reforms.', 'Structural replacement changes authority, staffing, and procedures rather than relying only on internal corrective measures.', 291, TRUE, 1.25, 'applied', 'v2.0'),
    (292, 'F1', -1, 'Even when major institutions are untrustworthy, reform should proceed through audited incremental changes rather than wholesale replacement.', 'Audited incremental reform changes bounded components while measuring results before broader restructuring.', 292, TRUE, 1.25, 'applied', 'v2.0'),
    (293, 'C3', -1, 'Repeat violent offenders should receive long incapacitating sentences when necessary to protect the public, even if rehabilitation remains possible.', 'Incapacitation prevents further offenses during confinement independently of rehabilitation or moral desert.', 293, TRUE, 1.25, 'applied', 'v2.0'),
    (294, 'F3', 1, 'A person convicted of serious assault should receive a shorter custodial sentence plus intensive restorative supervision when evidence shows that approach better reduces repeat violence.', 'Restorative supervision may combine restitution, treatment, victim participation, and close monitoring after a shorter period of custody.', 294, TRUE, 1.25, 'applied', 'v2.0'),
    (295, 'F5', -1, 'Elected legislatures should be able to overrule expert agencies on major policy choices, and courts should not intervene unless a clear constitutional rule is violated.', 'Legislative override returns final value judgments to elected representatives while preserving only narrow constitutional review.', 295, TRUE, 1.25, 'applied', 'v2.0'),
    (296, 'F4', -1, 'A legislative majority should be able to delegate binding emergency decisions to an expert agency without judicial review when the delegation is explicit, narrow, and temporary.', 'The legislature authorizes expert control, but constitutional courts are temporarily excluded from reviewing individual decisions.', 296, TRUE, 1.25, 'applied', 'v2.0'),
    (297, 'F7', -1, 'Instead of overseas military action, government should rely on expanded domestic screening and surveillance to prevent attacks.', 'The strategy avoids military force but accepts broader coercive prevention within the country.', 297, TRUE, 1.25, 'applied', 'v2.0'),
    (298, 'C3', 1, 'A country should reject both military retaliation and broad domestic surveillance after a foreign-sponsored attack, relying on ordinary criminal investigation and diplomacy.', 'The response uses ordinary legal powers and diplomatic pressure rather than war powers or exceptional domestic surveillance.', 298, TRUE, 1.25, 'applied', 'v2.0'),
    (299, 'C8', 1, 'Private firms should be free to deploy labor-saving automation once safety standards are met, without job-preservation quotas or public ownership requirements.', 'Job-preservation quotas require firms to retain a specified amount of human labor despite available automation.', 299, TRUE, 1.25, 'applied', 'v2.0'),
    (300, 'C8', 1, 'Government should build and operate a national advanced-computing utility so access to powerful AI is not controlled by a few private firms.', 'A public computing utility would own or operate large-scale computing capacity and allocate access under public rules.', 300, TRUE, 1.25, 'applied', 'v2.0');


--
-- Data for Name: question_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.question_metadata (question_id, bank_version, policy_domain, latent_conflict, actor_level, policy_instrument, scenario_conditions, item_family, collision_pair) VALUES
    (1, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (2, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (3, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (4, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (5, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (6, 'v2.0', 'general principles', 'State-Directed vs Market-Directed', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (7, 'v2.0', 'energy & utilities', 'State-Directed vs Market-Directed', 'national/regional', 'public provision', 'ordinary', 'base', NULL),
    (8, 'v2.0', 'macroeconomics & finance', 'State-Directed vs Market-Directed', 'national', 'public credit', 'persistent market gap', 'base', NULL),
    (9, 'v2.0', 'industrial policy & trade', 'State-Directed vs Market-Directed', 'national', 'public ownership', 'strategic dependency', 'base', NULL),
    (10, 'v2.0', 'healthcare', 'State-Directed vs Market-Directed', 'national', 'temporary price control & allocation', 'emergency; scarcity', 'base', NULL),
    (11, 'v2.0', 'healthcare', 'State-Directed vs Market-Directed', 'national/regional', 'market entry', 'ordinary', 'base', NULL),
    (12, 'v2.0', 'labor & professional regulation', 'State-Directed vs Market-Directed', 'state/regional', 'deregulation', 'evidence-contingent', 'base', NULL),
    (13, 'v2.0', 'bankruptcy & transportation', 'State-Directed vs Market-Directed', 'national', 'bankruptcy instead of subsidy', 'recession/financial distress', 'base', NULL),
    (14, 'v2.0', 'digital infrastructure', 'State-Directed vs Market-Directed', 'local', 'competitive provision', 'ordinary', 'base', NULL),
    (15, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (16, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (17, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (18, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (19, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (20, 'v2.0', 'general principles', 'Redistributionist vs Property-Rights', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (21, 'v2.0', 'welfare & income support', 'Redistributionist vs Property-Rights', 'national', 'cash transfer & progressive tax', 'ordinary', 'base', NULL),
    (22, 'v2.0', 'education finance', 'Redistributionist vs Property-Rights', 'state/regional', 'fiscal equalization', 'persistent geographic inequality', 'base', NULL),
    (23, 'v2.0', 'healthcare & social insurance', 'Redistributionist vs Property-Rights', 'national', 'universal public guarantee', 'long-term need', 'base', NULL),
    (24, 'v2.0', 'taxation & inheritance', 'Redistributionist vs Property-Rights', 'national', 'progressive estate tax', 'intergenerational transfer', 'base', NULL),
    (25, 'v2.0', 'education debt', 'Redistributionist vs Property-Rights', 'national', 'contract enforcement', 'ordinary', 'base', NULL),
    (26, 'v2.0', 'property taxation', 'Redistributionist vs Property-Rights', 'national/local', 'tax limitation', 'asset appreciation', 'base', NULL),
    (27, 'v2.0', 'corporate governance & labor', 'Redistributionist vs Property-Rights', 'national', 'ownership mandate', 'ordinary', 'base', NULL),
    (28, 'v2.0', 'income taxation', 'Redistributionist vs Property-Rights', 'national', 'flat tax', 'ordinary', 'base', NULL),
    (29, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (30, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (31, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (32, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (33, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (34, 'v2.0', 'general principles', 'Security/Order vs Civil Liberties', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (35, 'v2.0', 'mental health & autonomy', 'Security/Order vs Civil Liberties', 'judiciary', 'involuntary treatment', 'immediate danger; temporary', 'base', NULL),
    (36, 'v2.0', 'public health', 'Security/Order vs Civil Liberties', 'national/local', 'mandatory quarantine', 'emergency; confirmed infection; temporary', 'base', NULL),
    (37, 'v2.0', 'public order & emergency powers', 'Security/Order vs Civil Liberties', 'local', 'curfew', 'emergency; temporary; reviewable', 'base', NULL),
    (38, 'v2.0', 'public security', 'Security/Order vs Civil Liberties', 'local/private venue', 'universal screening', 'high-crowd risk', 'base', NULL),
    (39, 'v2.0', 'privacy & policing', 'Security/Order vs Civil Liberties', 'judiciary/law enforcement', 'warrant requirement', 'ordinary', 'base', NULL),
    (40, 'v2.0', 'criminal procedure & property', 'Security/Order vs Civil Liberties', 'law enforcement/judiciary', 'forfeiture limitation', 'ordinary', 'base', NULL),
    (41, 'v2.0', 'emergency governance', 'Security/Order vs Civil Liberties', 'national/regional', 'sunset clause', 'emergency; temporary', 'base', NULL),
    (42, 'v2.0', 'drug policy', 'Security/Order vs Civil Liberties', 'national/regional', 'decriminalization or legalization', 'adult consent', 'base', NULL),
    (43, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (44, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (45, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (46, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (47, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (48, 'v2.0', 'general principles', 'Centralized vs Localized', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (49, 'v2.0', 'elections & democratic design', 'Centralized vs Localized', 'national', 'uniform standards', 'ordinary', 'base', NULL),
    (50, 'v2.0', 'energy infrastructure', 'Centralized vs Localized', 'national', 'central siting authority', 'cross-border externality', 'base', NULL),
    (51, 'v2.0', 'disaster response', 'Centralized vs Localized', 'national', 'central command', 'emergency', 'base', NULL),
    (52, 'v2.0', 'education finance', 'Centralized vs Localized', 'national', 'minimum service standard', 'persistent regional inequality', 'base', NULL),
    (53, 'v2.0', 'education governance', 'Centralized vs Localized', 'state/regional', 'devolved authority', 'ordinary', 'base', NULL),
    (54, 'v2.0', 'housing & land use', 'Centralized vs Localized', 'local', 'local zoning authority', 'ordinary; externality exception', 'base', NULL),
    (55, 'v2.0', 'indigenous sovereignty & land', 'Centralized vs Localized', 'tribal/local', 'self-government', 'recognized jurisdiction', 'base', NULL),
    (56, 'v2.0', 'fiscal federalism', 'Centralized vs Localized', 'state/regional', 'policy experimentation', 'ordinary', 'base', NULL),
    (57, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (58, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (59, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (60, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (61, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (62, 'v2.0', 'general principles', 'Traditionalist vs Progressivist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (63, 'v2.0', 'language & assimilation', 'Traditionalist vs Progressivist', 'national/local schools', 'curriculum priority', 'ordinary', 'base', NULL),
    (64, 'v2.0', 'heritage & public memory', 'Traditionalist vs Progressivist', 'local', 'preservation with contextualization', 'historical controversy', 'base', NULL),
    (65, 'v2.0', 'family law', 'Traditionalist vs Progressivist', 'national/regional', 'divorce restriction', 'dependent children; safety exception', 'base', NULL),
    (66, 'v2.0', 'religion & civic ritual', 'Traditionalist vs Progressivist', 'public institutions', 'tradition preservation', 'voluntary participation', 'base', NULL),
    (67, 'v2.0', 'family & adoption', 'Traditionalist vs Progressivist', 'national/regional', 'equal eligibility', 'ordinary', 'base', NULL),
    (68, 'v2.0', 'family law', 'Traditionalist vs Progressivist', 'national/regional', 'no-fault divorce', 'adult consent', 'base', NULL),
    (69, 'v2.0', 'civic culture & religion', 'Traditionalist vs Progressivist', 'public institutions', 'inclusive redesign', 'ordinary', 'base', NULL),
    (70, 'v2.0', 'education & family', 'Traditionalist vs Progressivist', 'public schools', 'curriculum inclusion', 'ordinary', 'base', NULL),
    (71, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (72, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (73, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (74, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (75, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (76, 'v2.0', 'general principles', 'Particularist vs Universalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (77, 'v2.0', 'housing allocation', 'Particularist vs Universalist', 'local', 'residency preference', 'scarcity; equal-need comparison', 'base', NULL),
    (78, 'v2.0', 'public employment', 'Particularist vs Universalist', 'national/local', 'service-based preference', 'ordinary', 'base', NULL),
    (79, 'v2.0', 'mutual aid & social insurance', 'Particularist vs Universalist', 'local/community', 'contribution-based eligibility', 'scarcity; reciprocal contribution', 'base', NULL),
    (80, 'v2.0', 'charity & diaspora', 'Particularist vs Universalist', 'civil society', 'group-priority giving', 'limited charitable resources', 'base', NULL),
    (81, 'v2.0', 'immigration & asylum', 'Particularist vs Universalist', 'national', 'needs-based admission', 'scarcity', 'base', NULL),
    (82, 'v2.0', 'global health', 'Particularist vs Universalist', 'national/international', 'needs-based allocation', 'surplus after domestic threshold', 'base', NULL),
    (83, 'v2.0', 'equal treatment & public administration', 'Particularist vs Universalist', 'public institutions', 'uniform eligibility', 'ordinary', 'base', NULL),
    (84, 'v2.0', 'foreign aid', 'Particularist vs Universalist', 'national/international', 'needs-based aid', 'scarcity', 'base', NULL),
    (85, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (86, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (87, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (88, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (89, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (90, 'v2.0', 'general principles', 'Sovereigntist vs Integrationist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (91, 'v2.0', 'currency & monetary integration', 'Sovereigntist vs Integrationist', 'national/international', 'retain monetary sovereignty', 'long-term institutional commitment', 'base', NULL),
    (92, 'v2.0', 'trade & food safety', 'Sovereigntist vs Integrationist', 'national/international', 'reject external ruling', 'regulatory conflict', 'base', NULL),
    (93, 'v2.0', 'foreign investment & security', 'Sovereigntist vs Integrationist', 'national', 'investment screening', 'strategic asset', 'base', NULL),
    (94, 'v2.0', 'treaties & democratic consent', 'Sovereigntist vs Integrationist', 'national/international', 'treaty withdrawal', 'sustained opposition', 'base', NULL),
    (95, 'v2.0', 'international taxation', 'Sovereigntist vs Integrationist', 'international', 'binding tax coordination', 'cross-border tax competition', 'base', NULL),
    (96, 'v2.0', 'migration & regional governance', 'Sovereigntist vs Integrationist', 'international/regional', 'burden sharing', 'uneven arrivals', 'base', NULL),
    (97, 'v2.0', 'trade & labor rights', 'Sovereigntist vs Integrationist', 'international', 'binding labor standards', 'cross-border production', 'base', NULL),
    (98, 'v2.0', 'global health governance', 'Sovereigntist vs Integrationist', 'international', 'mandatory reporting', 'transnational emergency risk', 'base', NULL),
    (99, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (100, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (101, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (102, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (103, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (104, 'v2.0', 'general principles', 'Tech-Cautious vs Tech-Accelerative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (105, 'v2.0', 'biotechnology & reproduction', 'Tech-Cautious vs Tech-Accelerative', 'national/international', 'moratorium', 'irreversible; intergenerational uncertainty', 'base', NULL),
    (106, 'v2.0', 'infrastructure resilience & cybersecurity', 'Tech-Cautious vs Tech-Accelerative', 'national/private operators', 'redundancy mandate', 'low-probability high-impact risk', 'base', NULL),
    (107, 'v2.0', 'surveillance technology', 'Tech-Cautious vs Tech-Accelerative', 'national/local', 'temporary prohibition', 'uncertain accuracy and abuse risk', 'base', NULL),
    (108, 'v2.0', 'climate technology', 'Tech-Cautious vs Tech-Accelerative', 'international', 'precautionary authorization', 'cross-border; uncertain; potentially irreversible', 'base', NULL),
    (109, 'v2.0', 'transport automation', 'Tech-Cautious vs Tech-Accelerative', 'local', 'technology deployment', 'validated safety threshold', 'base', NULL),
    (110, 'v2.0', 'agriculture & biotechnology', 'Tech-Cautious vs Tech-Accelerative', 'national', 'technology-neutral approval', 'validated safety threshold', 'base', NULL),
    (111, 'v2.0', 'energy technology', 'Tech-Cautious vs Tech-Accelerative', 'national/regional', 'technology deployment', 'regulated safety threshold', 'base', NULL),
    (112, 'v2.0', 'healthcare AI', 'Tech-Cautious vs Tech-Accelerative', 'national/professional', 'regulated deployment', 'validated performance; human oversight', 'base', NULL),
    (113, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (114, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (115, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (116, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (117, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (118, 'v2.0', 'general principles', 'Anthropocentric vs Ecocentric', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (119, 'v2.0', 'energy & habitat', 'Anthropocentric vs Ecocentric', 'national/regional', 'infrastructure approval with mitigation', 'human climate benefit; disturbed habitat', 'base', NULL),
    (120, 'v2.0', 'wildlife & agriculture', 'Anthropocentric vs Ecocentric', 'local/regional', 'lethal wildlife control', 'repeated losses; alternatives failed', 'base', NULL),
    (121, 'v2.0', 'housing & ecological mitigation', 'Anthropocentric vs Ecocentric', 'local/regional', 'development with offset', 'degraded site; compensatory restoration', 'base', NULL),
    (122, 'v2.0', 'climate adaptation & coasts', 'Anthropocentric vs Ecocentric', 'local/national', 'protective infrastructure', 'high population exposure', 'base', NULL),
    (123, 'v2.0', 'animal welfare & agriculture', 'Anthropocentric vs Ecocentric', 'national', 'welfare regulation', 'price tradeoff', 'base', NULL),
    (124, 'v2.0', 'mining & watersheds', 'Anthropocentric vs Ecocentric', 'national/regional', 'project prohibition', 'irreversible ecological loss', 'base', NULL),
    (125, 'v2.0', 'ecological restoration & land use', 'Anthropocentric vs Ecocentric', 'local/regional', 'public restoration & land restriction', 'long-term restoration', 'base', NULL),
    (126, 'v2.0', 'water resources', 'Anthropocentric vs Ecocentric', 'regional', 'withdrawal limit', 'irreversible depletion risk', 'base', NULL),
    (127, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (128, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (129, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (130, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (131, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (132, 'v2.0', 'general principles', 'Moral Objectivist vs Moral Contextualist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (133, 'v2.0', 'family ethics & human rights', 'Moral Objectivist vs Moral Contextualist', 'society/state', 'universal moral judgment', 'cultural approval', 'base', NULL),
    (134, 'v2.0', 'security ethics', 'Moral Objectivist vs Moral Contextualist', 'state', 'absolute prohibition', 'majority support; claimed emergency', 'base', NULL),
    (135, 'v2.0', 'war ethics', 'Moral Objectivist vs Moral Contextualist', 'state/military', 'universal prohibition', 'armed conflict', 'base', NULL),
    (136, 'v2.0', 'labor ethics & human rights', 'Moral Objectivist vs Moral Contextualist', 'private/state', 'universal prohibition', 'legal or cultural acceptance', 'base', NULL),
    (137, 'v2.0', 'end-of-life ethics', 'Moral Objectivist vs Moral Contextualist', 'society/state', 'context-sensitive policy', 'cultural variation', 'base', NULL),
    (138, 'v2.0', 'family ethics', 'Moral Objectivist vs Moral Contextualist', 'family/society', 'contextual norm', 'cultural and family variation', 'base', NULL),
    (139, 'v2.0', 'bioethics & reproduction', 'Moral Objectivist vs Moral Contextualist', 'state', 'permissive plural regulation', 'consent; uncertain harm', 'base', NULL),
    (140, 'v2.0', 'ethics education', 'Moral Objectivist vs Moral Contextualist', 'public schools', 'plural curriculum', 'ordinary', 'base', NULL),
    (141, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (142, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (143, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (144, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (145, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (146, 'v2.0', 'general principles', 'Moral Monist vs Value Pluralist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (147, 'v2.0', 'constitutional adjudication', 'Moral Monist vs Value Pluralist', 'judiciary', 'fixed priority rule', 'rights conflict', 'base', NULL),
    (148, 'v2.0', 'healthcare ethics', 'Moral Monist vs Value Pluralist', 'health institutions', 'single-principle allocation', 'emergency; scarcity', 'base', NULL),
    (149, 'v2.0', 'public ethics & law', 'Moral Monist vs Value Pluralist', 'state/judiciary', 'uniform moral standard', 'cross-domain consistency', 'base', NULL),
    (150, 'v2.0', 'equality & religious liberty', 'Moral Monist vs Value Pluralist', 'state/judiciary', 'presumptive priority', 'rights conflict', 'base', NULL),
    (151, 'v2.0', 'religious liberty & conscience', 'Moral Monist vs Value Pluralist', 'state/employer', 'case-specific exemption', 'limited third-party harm', 'base', NULL),
    (152, 'v2.0', 'end-of-life ethics', 'Moral Monist vs Value Pluralist', 'state/health institutions', 'multiple legal options', 'adult competence', 'base', NULL),
    (153, 'v2.0', 'land use & public values', 'Moral Monist vs Value Pluralist', 'local/regional', 'multi-criteria balancing', 'competing public values', 'base', NULL),
    (154, 'v2.0', 'rights adjudication', 'Moral Monist vs Value Pluralist', 'judiciary', 'proportional balancing', 'rights conflict', 'base', NULL),
    (155, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (156, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (157, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (158, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (159, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (160, 'v2.0', 'general principles', 'Gradualist vs Transformative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (161, 'v2.0', 'policy implementation', 'Gradualist vs Transformative', 'national/regional', 'pilot program', 'staged rollout', 'base', NULL),
    (162, 'v2.0', 'climate policy strategy', 'Gradualist vs Transformative', 'legislature/movement', 'incremental compromise', 'partial but immediate gain', 'base', NULL),
    (163, 'v2.0', 'criminal justice reform', 'Gradualist vs Transformative', 'national/local', 'incremental institutional reform', 'repairability uncertain', 'base', NULL),
    (164, 'v2.0', 'whistleblowing & accountability', 'Gradualist vs Transformative', 'workplace/state', 'internal escalation first', 'channels available', 'base', NULL),
    (165, 'v2.0', 'constitutional reform', 'Gradualist vs Transformative', 'national', 'system redesign', 'persistent institutional failure', 'base', NULL),
    (166, 'v2.0', 'labor movement strategy', 'Gradualist vs Transformative', 'civil society', 'mass work stoppage', 'ordinary channels failed', 'base', NULL),
    (167, 'v2.0', 'movement strategy', 'Gradualist vs Transformative', 'civil society', 'refuse compromise', 'strategic leverage', 'base', NULL),
    (168, 'v2.0', 'public administration reform', 'Gradualist vs Transformative', 'national/local', 'institutional replacement', 'persistent legitimacy failure', 'base', NULL),
    (169, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (170, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (171, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (172, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (173, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (174, 'v2.0', 'general principles', 'Trusting vs Skeptical', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (175, 'v2.0', 'elections & institutional legitimacy', 'Trusting vs Skeptical', 'election authorities', 'accept audited result', 'completed audit', 'base', NULL),
    (176, 'v2.0', 'science & evidence', 'Trusting vs Skeptical', 'research institutions/state', 'rely on convergent evidence', 'independent replication', 'base', NULL),
    (177, 'v2.0', 'judiciary', 'Trusting vs Skeptical', 'courts/public', 'presumption of integrity', 'ordinary', 'base', NULL),
    (178, 'v2.0', 'public health institutions', 'Trusting vs Skeptical', 'agency', 'conditional discretion', 'emergency; transparency', 'base', NULL),
    (179, 'v2.0', 'regulation & transparency', 'Trusting vs Skeptical', 'regulatory agencies', 'mandatory disclosure', 'major rule', 'base', NULL),
    (180, 'v2.0', 'health science & transparency', 'Trusting vs Skeptical', 'research sponsors/agencies', 'data access requirement', 'public recommendation', 'base', NULL),
    (181, 'v2.0', 'corruption & revolving doors', 'Trusting vs Skeptical', 'government/industry', 'post-employment restriction', 'conflict-of-interest risk', 'base', NULL),
    (182, 'v2.0', 'algorithmic accountability', 'Trusting vs Skeptical', 'public agencies', 'external audit', 'high-impact automated decisions', 'base', NULL),
    (183, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (184, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (185, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (186, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (187, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (188, 'v2.0', 'general principles', 'Retributive vs Restorative', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (189, 'v2.0', 'professional discipline', 'Retributive vs Restorative', 'licensing body', 'punitive license revocation', 'restitution completed', 'base', NULL),
    (190, 'v2.0', 'war crimes & transitional justice', 'Retributive vs Restorative', 'international/national courts', 'criminal prosecution', 'peace tradeoff', 'base', NULL),
    (191, 'v2.0', 'violent crime', 'Retributive vs Restorative', 'courts', 'incarceration', 'repeat serious harm', 'base', NULL),
    (192, 'v2.0', 'public corruption', 'Retributive vs Restorative', 'courts', 'incarceration', 'nonviolent serious offense', 'base', NULL),
    (193, 'v2.0', 'juvenile justice', 'Retributive vs Restorative', 'courts/community', 'restorative sentence', 'serious violence; youth', 'base', NULL),
    (194, 'v2.0', 'corporate & environmental justice', 'Retributive vs Restorative', 'regulators/courts', 'remediation & restitution', 'large-scale harm', 'base', NULL),
    (195, 'v2.0', 'school discipline', 'Retributive vs Restorative', 'school/community', 'restorative process', 'serious interpersonal harm', 'base', NULL),
    (196, 'v2.0', 'transitional justice', 'Retributive vs Restorative', 'national/international', 'conditional amnesty & truth process', 'post-conflict', 'base', NULL),
    (197, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (198, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (199, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (200, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (201, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (202, 'v2.0', 'general principles', 'Majoritarian vs Constitutionalist', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (203, 'v2.0', 'judicial review', 'Majoritarian vs Constitutionalist', 'legislature/judiciary', 'legislative supremacy', 'ordinary', 'base', NULL),
    (204, 'v2.0', 'constitutional amendment', 'Majoritarian vs Constitutionalist', 'national electorate', 'majority amendment', 'two-election persistence', 'base', NULL),
    (205, 'v2.0', 'referendum & judicial review', 'Majoritarian vs Constitutionalist', 'national electorate/judiciary', 'popular override', 'sustained public opposition', 'base', NULL),
    (206, 'v2.0', 'election governance', 'Majoritarian vs Constitutionalist', 'legislature', 'ordinary-law control', 'incumbent-party risk', 'base', NULL),
    (207, 'v2.0', 'minority rights & courts', 'Majoritarian vs Constitutionalist', 'judiciary', 'constitutional invalidation', 'popular law; minority burden', 'base', NULL),
    (208, 'v2.0', 'emergency powers', 'Majoritarian vs Constitutionalist', 'legislature/judiciary', 'supermajority & review', 'emergency', 'base', NULL),
    (209, 'v2.0', 'election governance', 'Majoritarian vs Constitutionalist', 'independent bodies/legislature', 'entrenchment', 'incumbent conflict', 'base', NULL),
    (210, 'v2.0', 'constitutional amendment', 'Majoritarian vs Constitutionalist', 'national electorate/regions', 'supermajority or multi-stage consent', 'fundamental change', 'base', NULL),
    (211, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (212, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (213, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (214, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (215, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (216, 'v2.0', 'general principles', 'Popular/Elected Judgment vs Expert Delegation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (217, 'v2.0', 'technology governance', 'Popular/Elected Judgment vs Expert Delegation', 'legislature/commission', 'elected decision', 'value-laden technology choice', 'base', NULL),
    (218, 'v2.0', 'land use governance', 'Popular/Elected Judgment vs Expert Delegation', 'local electorate/experts', 'democratic final authority', 'competing local values', 'base', NULL),
    (219, 'v2.0', 'civil-military governance', 'Popular/Elected Judgment vs Expert Delegation', 'elected executive/legislature', 'civilian control', 'armed conflict', 'base', NULL),
    (220, 'v2.0', 'education governance', 'Popular/Elected Judgment vs Expert Delegation', 'local elected board/experts', 'elected control', 'value-laden curriculum', 'base', NULL),
    (221, 'v2.0', 'monetary policy', 'Popular/Elected Judgment vs Expert Delegation', 'independent central bank', 'expert delegation', 'macroeconomic uncertainty', 'base', NULL),
    (222, 'v2.0', 'public health governance', 'Popular/Elected Judgment vs Expert Delegation', 'expert agency', 'expert delegation', 'technical risk assessment', 'base', NULL),
    (223, 'v2.0', 'energy governance', 'Popular/Elected Judgment vs Expert Delegation', 'independent system operator', 'expert delegation', 'technical reliability risk', 'base', NULL),
    (224, 'v2.0', 'environmental health regulation', 'Popular/Elected Judgment vs Expert Delegation', 'expert panel', 'expert standard setting', 'complex risk assessment', 'base', NULL),
    (225, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (226, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (227, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (228, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (229, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (230, 'v2.0', 'general principles', 'Direct Democracy vs Representative Deliberation', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (231, 'v2.0', 'ballot initiatives', 'Direct Democracy vs Representative Deliberation', 'electorate/legislature', 'direct initiative', 'ordinary', 'base', NULL),
    (232, 'v2.0', 'recall elections', 'Direct Democracy vs Representative Deliberation', 'local electorate', 'recall vote', 'midterm accountability', 'base', NULL),
    (233, 'v2.0', 'public finance', 'Direct Democracy vs Representative Deliberation', 'local/national electorate', 'debt referendum', 'long-term fiscal commitment', 'base', NULL),
    (234, 'v2.0', 'participatory budgeting', 'Direct Democracy vs Representative Deliberation', 'local electorate', 'direct budget allocation', 'annual budgeting', 'base', NULL),
    (235, 'v2.0', 'tax legislation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'representative lawmaking', 'high complexity', 'base', NULL),
    (236, 'v2.0', 'legislative negotiation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'representative compromise', 'multi-issue bargaining', 'base', NULL),
    (237, 'v2.0', 'representation', 'Direct Democracy vs Representative Deliberation', 'legislature', 'trustee representation', 'new evidence', 'base', NULL),
    (238, 'v2.0', 'minority rights & democratic process', 'Direct Democracy vs Representative Deliberation', 'electorate/legislature', 'representative or constitutional mediation', 'vulnerable minority', 'base', NULL),
    (239, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (240, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (241, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (242, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (243, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (244, 'v2.0', 'general principles', 'Dove vs Hawk', 'general', 'normative principle', 'ordinary', 'base', NULL),
    (245, 'v2.0', 'preventive war', 'Dove vs Hawk', 'national/international', 'reject preventive attack', 'uncertain future threat', 'base', NULL),
    (246, 'v2.0', 'coercive diplomacy', 'Dove vs Hawk', 'national/international', 'force as last resort', 'non-imminent threat', 'base', NULL),
    (247, 'v2.0', 'arms trade & alliances', 'Dove vs Hawk', 'national', 'suspend arms transfers', 'documented civilian harm', 'base', NULL),
    (248, 'v2.0', 'conscription', 'Dove vs Hawk', 'national', 'limit compulsory service', 'direct threat threshold', 'base', NULL),
    (249, 'v2.0', 'collective defense', 'Dove vs Hawk', 'international alliance', 'military defense', 'treaty commitment; invasion', 'base', NULL),
    (250, 'v2.0', 'humanitarian intervention', 'Dove vs Hawk', 'national/international', 'limited strike', 'imminent atrocity; last resort', 'base', NULL),
    (251, 'v2.0', 'nuclear deterrence', 'Dove vs Hawk', 'national/international', 'maintain deterrent', 'reciprocal possession', 'base', NULL),
    (252, 'v2.0', 'cyber conflict', 'Dove vs Hawk', 'national/international', 'offensive retaliation', 'attributed major attack', 'base', NULL),
    (253, 'v2.0', 'biometrics & private markets', 'Economic Coordination x Liberty & Public Order', 'private firms', 'permission/deregulation', 'consent; privacy tradeoff', 'collision', 'C1-C3-A'),
    (254, 'v2.0', 'public security & business mandates', 'Economic Coordination x Liberty & Public Order', 'national/regional', 'surveillance mandate', 'cost and privacy tradeoff', 'collision', 'C1-C3-B'),
    (255, 'v2.0', 'platform regulation & local power', 'Territorial Authority x Economic Coordination', 'local', 'local price regulation', 'service-exit risk', 'collision', 'C1-C4-A'),
    (256, 'v2.0', 'public utilities & national preemption', 'Territorial Authority x Economic Coordination', 'national/local', 'national public-ownership mandate', 'local opposition', 'collision', 'C1-C4-B'),
    (257, 'v2.0', 'international competition policy', 'Economic Coordination x Sovereignty Scope', 'international', 'binding competition rules', 'domestic industry tradeoff', 'collision', 'C1-C7-A'),
    (258, 'v2.0', 'international industrial policy', 'Economic Coordination x Sovereignty Scope', 'international', 'coordinated public subsidy', 'strategic dependency', 'collision', 'C1-C7-B'),
    (259, 'v2.0', 'charitable property & global need', 'Scope of Obligation x Distribution & Property', 'national/private donors', 'donor discretion with neutral tax treatment', 'cross-border giving', 'collision', 'C2-C6-A'),
    (260, 'v2.0', 'charitable property & community preference', 'Distribution & Property x Scope of Obligation', 'private donors/educational institutions', 'donor-directed eligibility rule', 'equal need; membership distinction', 'collision', 'C2-C6-B'),
    (261, 'v2.0', 'religious education & equality', 'Distribution & Property x Cultural Continuity', 'national/regional', 'funding condition', 'public subsidy; doctrinal conflict', 'collision', 'C2-C5-A'),
    (262, 'v2.0', 'family benefits & traditional norms', 'Cultural Continuity x Distribution & Property', 'national', 'targeted cash benefit', 'household-status condition', 'collision', 'C2-C5-B'),
    (263, 'v2.0', 'habitat protection & property liberty', 'Ecological Moral Standing x Liberty & Public Order', 'regional/local', 'development prohibition', 'critical corridor; mitigation offered', 'collision', 'C3-C9-A'),
    (264, 'v2.0', 'food emergency & habitat conversion', 'Liberty & Public Order x Ecological Moral Standing', 'national/regional', 'compulsory land use', 'emergency; scarcity; habitat loss', 'collision', 'C3-C9-B'),
    (265, 'v2.0', 'subnational diplomacy & climate', 'Sovereignty Scope x Territorial Authority', 'state/international', 'subnational compact', 'national objection', 'collision', 'C4-C7-A'),
    (266, 'v2.0', 'international agreements & local autonomy', 'Sovereignty Scope x Territorial Authority', 'national/regional/international', 'regional opt-out', 'authority conflict', 'collision', 'C4-C7-B'),
    (267, 'v2.0', 'reproductive technology & family norms', 'Cultural Continuity x Technology Orientation', 'national/private clinics', 'regulated permission', 'validated safety; cultural disruption', 'collision', 'C5-C8-A'),
    (268, 'v2.0', 'AI systems & cultural bias', 'Technology Orientation x Cultural Continuity', 'national/private firms', 'deployment restriction', 'cultural bias; innovation cost', 'collision', 'C5-C8-B'),
    (269, 'v2.0', 'asylum burden sharing', 'Sovereignty Scope x Scope of Obligation', 'international/national', 'binding allocation', 'scarcity; domestic opposition', 'collision', 'C6-C7-A'),
    (270, 'v2.0', 'regional integration & citizen benefits', 'Scope of Obligation x Sovereignty Scope', 'national/international', 'integration with welfare reservation', 'membership distinction', 'collision', 'C6-C7-B'),
    (271, 'v2.0', 'water technology & marine ecology', 'Ecological Moral Standing x Technology Orientation', 'national/local', 'technology deployment', 'water scarcity; ecological harm', 'collision', 'C8-C9-A'),
    (272, 'v2.0', 'food technology & ecological impact', 'Ecological Moral Standing x Technology Orientation', 'national/private industry', 'technology deployment', 'agricultural disruption', 'collision', 'C8-C9-B'),
    (273, 'v2.0', 'gene editing & moral limits', 'Technology Orientation x Moral Objectivity', 'national/international', 'prohibition', 'intergenerational; serious disease benefit', 'collision', 'C8-C10-A'),
    (274, 'v2.0', 'human enhancement & cross-cultural consent', 'Moral Objectivity x Technology Orientation', 'international', 'precautionary pause', 'moral disagreement; uncertain governance', 'collision', 'C8-C10-B'),
    (275, 'v2.0', 'environmental decision ethics', 'Value Structure x Ecological Moral Standing', 'national/local', 'multi-criteria balancing', 'competing public values', 'collision', 'C9-C11-A'),
    (276, 'v2.0', 'environmental development & value pluralism', 'Ecological Moral Standing x Value Structure', 'national/local', 'contextual balancing with development priority', 'essential development; habitat loss', 'collision', 'C9-C11-B'),
    (277, 'v2.0', 'civil disobedience & reform', 'Liberty & Public Order x Change Strategy', 'civil society/state', 'nonviolent occupation', 'lawful channels failed', 'collision', 'F1-C3'),
    (278, 'v2.0', 'expert governance & accountability', 'Epistemic Authority x Institutional Confidence', 'regulatory agency', 'conditional delegation', 'transparency and audit', 'collision', 'F2-F5'),
    (279, 'v2.0', 'sentencing & constitutional review', 'Democratic Constraint x Justice Style', 'judiciary/electorate', 'constitutional override', 'voter-approved mandate', 'collision', 'F3-F4'),
    (280, 'v2.0', 'direct democracy & localism', 'Democratic Mediation x Territorial Authority', 'city/neighborhood', 'referendum override', 'nested jurisdictions', 'collision', 'F6-C4'),
    (281, 'v2.0', 'collective defense & integration', 'Force & Peace x Sovereignty Scope', 'international alliance', 'binding defense commitment', 'future attack contingency', 'collision', 'F7-C7'),
    (282, 'v2.0', 'legislative gradualism & mediation', 'Democratic Mediation x Change Strategy', 'national legislature/electorate', 'incremental representative legislation', 'broad reform demand', 'collision', 'F1-F6-A'),
    (283, 'v2.0', 'anti-corruption transition & emergency powers', 'Change Strategy x Liberty & Public Order', 'national government/judiciary', 'temporary restraint & institutional restructuring', 'documented systemic corruption; judicial review', 'collision', 'F1-C3-B'),
    (284, 'v2.0', 'local land use & direct democracy', 'Democratic Mediation x Territorial Authority', 'municipal electorate/national legislature', 'binding local referendum', 'major local project; national interest', 'collision', 'F6-C4-B'),
    (285, 'v2.0', 'unilateral force & sovereignty', 'Sovereignty Scope x Force & Peace', 'national/international', 'limited military strike', 'imminent threat; no international authorization', 'collision', 'F7-C7-B'),
    (286, 'v2.0', 'constitutional transformation & representation', 'Democratic Mediation x Change Strategy', 'national legislature', 'comprehensive legislative package', 'electoral mandate; systemic reform', 'collision', 'F1-F6-B'),
    (287, 'v2.0', 'monetary policy & institutional trust', 'Institutional Confidence x Epistemic Authority', 'independent central bank/elected government', 'expert delegation', 'ordinary; inflation and employment tradeoff', 'collision', 'F2-F5-B'),
    (288, 'v2.0', 'transitional justice & constitutional limits', 'Justice Style x Democratic Constraint', 'judiciary/electorate', 'constitutional invalidation of amnesty', 'serious state crimes; voter-approved amnesty', 'collision', 'F3-F4-B'),
    (289, 'v2.0', 'healthcare ethics & moral hierarchy', 'Moral Objectivity x Value Structure', 'hospital ethics board', 'categorical decision rule', 'direct conflict among moral values', 'collision', 'C10-C11-A'),
    (290, 'v2.0', 'public ethics & contingent moral tradition', 'Value Structure x Moral Objectivity', 'national/community institutions', 'single-framework public ethic', 'historical contingency; internal coherence', 'collision', 'C10-C11-B'),
    (291, 'v2.0', 'institutional corruption & structural reform', 'Institutional Confidence x Change Strategy', 'national government/oversight bodies', 'rapid institutional replacement', 'documented repeated concealment', 'collision', 'F1-F2-A'),
    (292, 'v2.0', 'institutional reform & skepticism', 'Change Strategy x Institutional Confidence', 'government/oversight bodies', 'incremental audited reform', 'low trust; continuity risks', 'collision', 'F1-F2-B'),
    (293, 'v2.0', 'violent crime & sentencing', 'Liberty & Public Order x Justice Style', 'criminal courts', 'incapacitating sentence', 'repeat serious violence; rehabilitation possible', 'collision', 'F3-C3-A'),
    (294, 'v2.0', 'violent crime & restorative supervision', 'Justice Style x Liberty & Public Order', 'criminal courts/community supervision', 'reduced custody plus restorative program', 'serious violence; evidence of lower recidivism', 'collision', 'F3-C3-B'),
    (295, 'v2.0', 'administrative accountability & majority rule', 'Epistemic Authority x Democratic Constraint', 'legislature/expert agency/judiciary', 'legislative override', 'major policy disagreement', 'collision', 'F4-F5-A'),
    (296, 'v2.0', 'emergency delegation & expert authority', 'Democratic Constraint x Epistemic Authority', 'legislature/expert agency/judiciary', 'temporary expert delegation without review', 'declared emergency; explicit sunset', 'collision', 'F4-F5-B'),
    (297, 'v2.0', 'domestic prevention instead of military force', 'Force & Peace x Liberty & Public Order', 'national security institutions', 'expanded screening and surveillance', 'credible external threat; no overseas strike', 'collision', 'F7-C3-A'),
    (298, 'v2.0', 'nonmilitary response & civil liberties', 'Liberty & Public Order x Force & Peace', 'national government/law enforcement', 'criminal investigation and diplomacy', 'attributed attack; continuing threat', 'collision', 'F7-C3-B'),
    (299, 'v2.0', 'automation & market deployment', 'Technology Orientation x Economic Coordination', 'private firms/national regulator', 'regulated private deployment', 'validated safety; employment disruption', 'collision', 'C1-C8-A'),
    (300, 'v2.0', 'public AI infrastructure', 'Technology Orientation x Economic Coordination', 'national government', 'public ownership and provision', 'high market concentration; strategic technology', 'collision', 'C1-C8-B');

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

CREATE POLICY "Read questions policy" ON public.questions FOR SELECT USING (((active = true) OR (auth.uid() IS NOT NULL)));


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
