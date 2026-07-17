-- =====================================================
-- POLYAXIS FRESH INSTALL
-- Complete database setup for a NEW Supabase project.
--
-- Generated from a verified end-to-end application of schema.sql,
-- seeds, and every migration through 20260717030000, then dumped and
-- tested against a clean database. Contains the full current state:
-- all tables, RLS policies, functions, views, 15 axes, 288 questions
-- (286 active), and 383 question-axis links.
--
-- This file is Supabase SQL Editor compatible: plain SQL only
-- (multi-row INSERTs, no psql meta-commands, no COPY FROM stdin).
--
-- Usage: paste this whole file into the Supabase SQL Editor of a new
-- project and run it once. Do NOT also run schema.sql/seeds/migrations
-- afterward - this file replaces them for new projects. See
-- docs/supabase-migration.md for the full migration runbook.
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
-- Name: survey_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
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
 SELECT (axis.value ->> 'axis_id'::text) AS axis_id,
    (axis.value ->> 'name'::text) AS axis_name,
    avg(((axis.value ->> 'score'::text))::double precision) AS avg_score,
    stddev(((axis.value ->> 'score'::text))::double precision) AS std_dev,
    count(*) AS sample_size
   FROM public.survey_results,
    LATERAL jsonb_array_elements(survey_results.core_axes) axis(value)
  GROUP BY (axis.value ->> 'axis_id'::text), (axis.value ->> 'name'::text);


--
-- Name: axes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    pole_negative text,
    pole_positive text,
    created_at timestamp with time zone DEFAULT now()
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
    active boolean DEFAULT true,
    weight numeric(4,2) DEFAULT 1.0,
    question_type text DEFAULT 'conceptual'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT questions_key_check CHECK ((key = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['conceptual'::text, 'applied'::text])))
);


--
-- Name: TABLE questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questions IS 'Survey questions table - now includes 202 applied questions (99-202) covering all 13 axes';


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
-- Data for Name: axes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.axes VALUES
	('C1', 'Economic Control', NULL, 'State-Directed', 'Market-Directed', '2026-07-17 00:17:32.520474+00'),
	('C2', 'Economic Equality', NULL, 'Redistributionist', 'Property Rights', '2026-07-17 00:17:32.520474+00'),
	('C3', 'Coercive Power', NULL, 'Security/Order', 'Civil Liberties', '2026-07-17 00:17:32.520474+00'),
	('C4', 'Where Power Sits', NULL, 'Centralized', 'Localized', '2026-07-17 00:17:32.520474+00'),
	('C5', 'Cultural Orientation', NULL, 'Traditionalist', 'Progressivist', '2026-07-17 00:17:32.520474+00'),
	('C6', 'Group Boundaries', NULL, 'Particularist', 'Universalist', '2026-07-17 00:17:32.520474+00'),
	('C7', 'Sovereignty Scope', NULL, 'Sovereigntist', 'Integrationist', '2026-07-17 00:17:32.520474+00'),
	('C8', 'Technology Stance', NULL, 'Tech-Skeptical', 'Tech-Solutionist', '2026-07-17 00:17:32.520474+00'),
	('C9', 'Nature''s Moral Weight', NULL, 'Anthropocentric', 'Ecocentric', '2026-07-17 00:17:32.520474+00'),
	('F1', 'Change Strategy', NULL, 'Gradualist', 'Radical', '2026-07-17 00:17:32.520474+00'),
	('F2', 'Institutional Trust', NULL, 'Trusting', 'Skeptical', '2026-07-17 00:17:32.520474+00'),
	('F3', 'Justice Style', NULL, 'Retributive', 'Restorative', '2026-07-17 00:17:32.520474+00'),
	('F4', 'Decision Authority', NULL, 'Majoritarian', 'Constitutionalist', '2026-07-17 00:17:32.966753+00'),
	('F5', 'Force & Peace', NULL, 'Dove', 'Hawk', '2026-07-17 00:17:32.966753+00'),
	('C10', 'Moral Epistemology', NULL, 'Moral Universalist', 'Moral Pluralist', '2026-07-17 00:17:32.520474+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_axis_links; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.question_axis_links VALUES
	(1, 1, 'C1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(2, 2, 'C1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(3, 3, 'C1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(4, 4, 'C1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(5, 5, 'C1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(6, 6, 'C1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(7, 7, 'C1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(8, 8, 'C1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(9, 9, 'C2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(10, 10, 'C2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(11, 11, 'C2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(12, 12, 'C2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(13, 13, 'C2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(14, 14, 'C2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(15, 15, 'C2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(16, 16, 'C2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(17, 17, 'C3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(18, 18, 'C3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(19, 19, 'C3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(20, 20, 'C3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(21, 21, 'C3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(22, 22, 'C3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(23, 23, 'C3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(24, 24, 'C3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(25, 25, 'C4', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(26, 26, 'C4', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(27, 27, 'C4', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(28, 28, 'C4', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(29, 29, 'C4', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(30, 30, 'C4', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(31, 31, 'C4', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(32, 32, 'C4', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(33, 33, 'C5', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(34, 34, 'C5', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(35, 35, 'C5', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(36, 36, 'C5', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(37, 37, 'C5', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(38, 38, 'C5', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(39, 39, 'C5', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(40, 40, 'C5', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(41, 41, 'C6', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(42, 42, 'C6', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(43, 43, 'C6', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(44, 44, 'C6', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(45, 45, 'C6', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(46, 46, 'C6', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(47, 47, 'C6', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(48, 48, 'C6', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(49, 49, 'C7', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(50, 50, 'C7', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(51, 51, 'C7', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(52, 52, 'C7', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(53, 53, 'C7', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(54, 54, 'C7', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(55, 55, 'C7', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(56, 56, 'C7', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(57, 57, 'C8', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(58, 58, 'C8', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(59, 59, 'C8', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(60, 60, 'C8', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(61, 61, 'C8', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(62, 62, 'C8', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(63, 63, 'C8', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(64, 64, 'C8', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(65, 65, 'C9', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(66, 66, 'C9', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(67, 67, 'C9', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(68, 68, 'C9', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(69, 69, 'C9', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(70, 70, 'C9', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(71, 71, 'C9', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(72, 72, 'C9', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(73, 73, 'C10', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(74, 74, 'C10', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(75, 75, 'C10', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(76, 76, 'C10', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(77, 77, 'C10', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(78, 78, 'C10', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(79, 79, 'C10', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(80, 80, 'C10', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(81, 81, 'F1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(82, 82, 'F1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(83, 83, 'F1', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(84, 84, 'F1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(85, 85, 'F1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(86, 86, 'F1', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(87, 87, 'F2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(88, 88, 'F2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(89, 89, 'F2', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(90, 90, 'F2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(91, 91, 'F2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(92, 92, 'F2', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(93, 93, 'F3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(94, 94, 'F3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(95, 95, 'F3', 'primary', 1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(96, 96, 'F3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(97, 97, 'F3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(98, 98, 'F3', 'primary', -1, 1.00, '2026-07-17 00:17:32.799464+00'),
	(99, 99, 'C1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(100, 100, 'C1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00');
INSERT INTO public.question_axis_links VALUES
	(101, 101, 'C1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(102, 102, 'C1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(103, 103, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(104, 104, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(105, 105, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(106, 106, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(107, 107, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(108, 108, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(109, 109, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(110, 110, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(111, 111, 'C4', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(112, 112, 'C4', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(113, 113, 'C4', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(114, 114, 'C4', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(115, 115, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(116, 116, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(117, 117, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(118, 118, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(119, 119, 'C6', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(120, 120, 'C6', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(121, 121, 'C6', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(122, 122, 'C6', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(123, 123, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(124, 124, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(125, 125, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(126, 126, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(127, 127, 'C8', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(128, 128, 'C8', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(129, 129, 'C8', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(130, 130, 'C8', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(131, 131, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(132, 132, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(133, 133, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(134, 134, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(135, 135, 'C10', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(136, 136, 'C10', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(137, 137, 'C10', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(138, 138, 'C10', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(139, 139, 'F1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(140, 140, 'F1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(141, 141, 'F1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(142, 142, 'F1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(143, 143, 'F2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(144, 144, 'F2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(145, 145, 'F2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(146, 146, 'F2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(147, 147, 'F3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(148, 148, 'F3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(149, 149, 'F3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(150, 150, 'F3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(151, 151, 'C1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(152, 152, 'C1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(153, 153, 'C1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(154, 154, 'C1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(155, 155, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(156, 156, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(157, 157, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(158, 158, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(159, 159, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(160, 160, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(161, 161, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(162, 162, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(163, 163, 'C4', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(164, 164, 'C4', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(165, 165, 'C4', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(166, 166, 'C4', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(167, 167, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(168, 168, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(169, 169, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(170, 170, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(171, 171, 'C6', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(172, 172, 'C6', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(173, 173, 'C6', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(174, 174, 'C6', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(175, 175, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(176, 176, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(177, 177, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(178, 178, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(179, 179, 'C8', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(180, 180, 'C8', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(181, 181, 'C8', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(182, 182, 'C8', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(183, 183, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(184, 184, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(185, 185, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(186, 186, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(187, 187, 'C10', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(188, 188, 'C10', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(189, 189, 'C10', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(190, 190, 'C10', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(191, 191, 'F1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(192, 192, 'F1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(193, 193, 'F1', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(194, 194, 'F1', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(195, 195, 'F2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(196, 196, 'F2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(197, 197, 'F2', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(198, 198, 'F2', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(199, 199, 'F3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(200, 200, 'F3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00');
INSERT INTO public.question_axis_links VALUES
	(201, 201, 'F3', 'primary', 1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(202, 202, 'F3', 'primary', -1, 1.25, '2026-07-17 00:17:32.799464+00'),
	(218, 107, 'C8', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(246, 124, 'C2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(254, 128, 'F2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(262, 131, 'C2', 'tradeoff', -1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(266, 133, 'C2', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(268, 134, 'C2', 'tradeoff', 1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(278, 139, 'C3', 'tradeoff', 1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(281, 141, 'C3', 'tradeoff', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(296, 151, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(300, 153, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(310, 159, 'C8', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(313, 160, 'C8', 'tradeoff', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(315, 161, 'C8', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(319, 163, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(342, 176, 'C3', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(346, 178, 'C8', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(348, 179, 'C3', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(353, 182, 'C3', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(357, 184, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(359, 185, 'C2', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(361, 186, 'C2', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(368, 190, 'C7', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(370, 191, 'C3', 'tradeoff', 1, 0.8, '2026-07-17 00:17:32.810713+00'),
	(372, 192, 'C3', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(376, 194, 'C3', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(264, 132, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(355, 183, 'C2', 'tradeoff', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(204, 99, 'C8', 'secondary', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(206, 100, 'C2', 'secondary', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(208, 101, 'F2', 'secondary', 1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(214, 105, 'C1', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(216, 106, 'C1', 'secondary', 1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(228, 113, 'C1', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(233, 116, 'C6', 'secondary', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(235, 117, 'C10', 'secondary', 1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(248, 125, 'C1', 'secondary', -1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(250, 126, 'C9', 'secondary', 1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(256, 129, 'C9', 'secondary', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(259, 130, 'C5', 'secondary', -1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(273, 137, 'C5', 'secondary', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(275, 138, 'C7', 'secondary', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(276, 138, 'C2', 'secondary', -1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(291, 148, 'C10', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(304, 155, 'C1', 'secondary', -1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(321, 164, 'C3', 'secondary', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(323, 165, 'C5', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(325, 166, 'C6', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(333, 171, 'C7', 'secondary', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(335, 172, 'C7', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(344, 177, 'C6', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(351, 181, 'C2', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(364, 188, 'C5', 'secondary', 1, 0.7, '2026-07-17 00:17:32.810713+00'),
	(374, 193, 'F2', 'secondary', 1, 0.5, '2026-07-17 00:17:32.810713+00'),
	(378, 195, 'C8', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(382, 197, 'F1', 'secondary', 1, 0.4, '2026-07-17 00:17:32.810713+00'),
	(387, 200, 'C3', 'secondary', -1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(221, 109, 'F1', 'secondary', 1, 0.6, '2026-07-17 00:17:32.810713+00'),
	(390, 203, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(391, 203, 'C2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(392, 204, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(393, 204, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(394, 205, 'C8', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(395, 205, 'F2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(396, 206, 'C8', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(397, 206, 'F2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(398, 207, 'C4', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(399, 207, 'C2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(400, 208, 'C4', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(401, 208, 'C2', 'tradeoff', 1, 0.5, '2026-07-17 00:17:32.894091+00'),
	(402, 209, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(403, 209, 'C3', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(404, 210, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(405, 210, 'C3', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(406, 211, 'C7', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(407, 211, 'C8', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(408, 212, 'C7', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(409, 212, 'C8', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(410, 213, 'C10', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(411, 213, 'C7', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(412, 214, 'C10', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(413, 214, 'C7', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(414, 215, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(415, 215, 'C2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(416, 216, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(417, 216, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(418, 217, 'C1', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(419, 217, 'C2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(420, 218, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(421, 218, 'C3', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(422, 219, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(423, 219, 'C5', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(424, 220, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.894091+00'),
	(425, 220, 'C5', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.894091+00'),
	(426, 221, 'F4', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(427, 222, 'F4', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(428, 223, 'F4', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(429, 224, 'F4', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(430, 225, 'F4', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00');
INSERT INTO public.question_axis_links VALUES
	(431, 226, 'F4', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(432, 227, 'F4', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(433, 227, 'F2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(434, 228, 'F4', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(435, 228, 'F2', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(436, 229, 'F4', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(437, 230, 'F4', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(438, 231, 'F5', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(439, 232, 'F5', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(440, 233, 'F5', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(441, 234, 'F5', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(442, 235, 'F5', 'primary', 1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(443, 236, 'F5', 'primary', -1, 1.0, '2026-07-17 00:17:32.966753+00'),
	(444, 237, 'F5', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(445, 238, 'F5', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(446, 239, 'F5', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(447, 239, 'C7', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.966753+00'),
	(448, 240, 'F5', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(449, 241, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(450, 242, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(451, 242, 'C3', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(452, 243, 'C5', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(453, 243, 'C3', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(454, 244, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(455, 245, 'C1', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(456, 245, 'C2', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(457, 246, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(458, 246, 'C1', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(459, 247, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(460, 248, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(461, 248, 'C3', 'tradeoff', -1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(462, 249, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(463, 249, 'C3', 'tradeoff', 1, 0.6, '2026-07-17 00:17:32.966753+00'),
	(464, 250, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(465, 250, 'C3', 'tradeoff', -1, 0.5, '2026-07-17 00:17:32.966753+00'),
	(466, 251, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(467, 251, 'C5', 'secondary', 1, 0.4, '2026-07-17 00:17:32.966753+00'),
	(468, 252, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(469, 253, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(470, 254, 'C3', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(471, 255, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(472, 256, 'C3', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(473, 257, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(474, 258, 'C6', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(475, 259, 'C2', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(476, 260, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(477, 261, 'C2', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(478, 262, 'C9', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(479, 263, 'C9', 'primary', -1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(480, 264, 'C5', 'primary', 1, 1.25, '2026-07-17 00:17:32.966753+00'),
	(481, 265, 'F4', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(482, 266, 'F4', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(483, 267, 'F4', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(484, 267, 'F2', 'tradeoff', -1, 0.60, '2026-07-17 03:00:00+00'),
	(485, 268, 'F4', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(486, 269, 'F5', 'primary', 1, 1.00, '2026-07-17 03:00:00+00'),
	(487, 270, 'F5', 'primary', -1, 1.00, '2026-07-17 03:00:00+00'),
	(488, 271, 'F5', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(489, 271, 'C7', 'tradeoff', -1, 0.50, '2026-07-17 03:00:00+00'),
	(490, 272, 'F5', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(491, 272, 'C7', 'tradeoff', 1, 0.50, '2026-07-17 03:00:00+00'),
	(492, 273, 'F5', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(493, 274, 'F5', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(494, 275, 'F5', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(495, 276, 'F5', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(496, 277, 'C8', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(497, 277, 'C9', 'tradeoff', -1, 0.60, '2026-07-17 03:00:00+00'),
	(498, 278, 'C8', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(499, 278, 'C9', 'tradeoff', 1, 0.60, '2026-07-17 03:00:00+00'),
	(500, 279, 'C9', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(501, 279, 'C8', 'tradeoff', -1, 0.60, '2026-07-17 03:00:00+00'),
	(502, 280, 'C9', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(503, 280, 'C8', 'tradeoff', 1, 0.60, '2026-07-17 03:00:00+00'),
	(504, 281, 'C1', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(505, 282, 'C1', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(506, 283, 'C4', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(507, 284, 'C4', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(508, 285, 'C5', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(509, 286, 'C6', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(510, 287, 'C5', 'primary', 1, 1.25, '2026-07-17 03:00:00+00'),
	(511, 287, 'C3', 'tradeoff', -1, 0.60, '2026-07-17 03:00:00+00'),
	(512, 288, 'C5', 'primary', -1, 1.25, '2026-07-17 03:00:00+00'),
	(513, 288, 'C3', 'tradeoff', 1, 0.60, '2026-07-17 03:00:00+00');


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.questions VALUES
	(1, 'C1', 1, 'Private enterprise generally delivers goods and services more efficiently than government agencies.', NULL, 1, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(2, 'C1', 1, 'Prices for essential goods should be determined by supply and demand, not government regulation.', NULL, 3, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(3, 'C1', 1, 'Governments should allow failing businesses to collapse rather than intervene with bailouts.', NULL, 5, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(4, 'C1', 1, 'Competition between private companies benefits consumers more than public alternatives would.', NULL, 6, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(5, 'C1', -1, 'Governments should set price controls on necessities like housing, food, and medicine.', NULL, 7, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(6, 'C1', -1, 'The state should directly control strategic industries like energy, transportation, and banking.', NULL, 8, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(7, 'C1', -1, 'Central planning can distribute resources more fairly than markets do.', NULL, 9, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(8, 'C1', -1, 'Essential services (water, electricity, internet) should be publicly owned and operated.', NULL, 10, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(9, 'C2', -1, 'Narrowing the gap between rich and poor should be a central goal of economic policy.', NULL, 12, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(11, 'C2', -1, 'Large concentrations of private wealth are corrosive to democracy and social cohesion.', NULL, 14, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(12, 'C2', -1, 'Society has an obligation to ensure that no one falls below a decent standard of living.', NULL, 15, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(13, 'C2', 1, 'People have a fundamental right to keep what they earn, regardless of how much others have.', NULL, 17, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(14, 'C2', 1, 'Inheritance taxes unfairly prevent families from passing on what they have built.', NULL, 18, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(15, 'C2', 1, 'High taxes on top earners discourage the productive effort that benefits everyone.', NULL, 19, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(16, 'C2', 1, 'Wealth inequality is a natural outcome of differences in talent, effort, and choices.', NULL, 20, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(17, 'C3', 1, 'Protecting individual privacy is more important than making law enforcement''s job easier.', NULL, 22, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(18, 'C3', 1, 'People should be free to express offensive views without legal penalty.', NULL, 23, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(19, 'C3', 1, 'Citizens should have access to strong encryption without government back-doors.', NULL, 24, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(21, 'C3', -1, 'Strict law enforcement and visible policing are necessary to maintain public safety.', NULL, 26, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(22, 'C3', -1, 'Governments should be able to detain terrorism suspects without trial when security demands it.', NULL, 27, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(23, 'C3', -1, 'Some speech is so harmful that it should be legally prohibited.', NULL, 28, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(25, 'C4', 1, 'Local communities should have the final word on matters like zoning, schooling, and policing.', NULL, 29, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(26, 'C4', 1, 'States or provinces should be able to pass laws that differ from national policy.', NULL, 30, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(27, 'C4', 1, 'Decisions made closest to the people affected tend to produce better outcomes.', NULL, 31, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(28, 'C4', 1, 'Taxes should mostly be raised and spent by local and regional governments, not the national one.', NULL, 32, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(29, 'C4', -1, 'National standards are necessary to guarantee equal rights and services everywhere.', NULL, 33, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(30, 'C4', -1, 'Only a strong central government can coordinate responses to large-scale challenges.', NULL, 34, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(31, 'C4', -1, 'When every region goes its own way, problems that cross borders - pollution, crime, infrastructure - go unsolved.', NULL, 35, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(32, 'C4', -1, 'Some issues are too important to leave to local jurisdictions with varying capacities.', NULL, 36, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(33, 'C5', 1, 'Cultural norms should evolve to reflect new understandings of identity and relationships.', NULL, 37, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(34, 'C5', 1, 'Society benefits when people question inherited customs and experiment with new ways of living.', NULL, 38, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(35, 'C5', 1, 'Traditional expectations about gender and family are outdated constraints that should be discarded.', NULL, 39, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(36, 'C5', 1, 'Moral progress often requires abandoning practices that previous generations considered normal.', NULL, 40, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(37, 'C5', -1, 'Longstanding traditions carry wisdom that modern generations too easily dismiss.', NULL, 41, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(38, 'C5', -1, 'Stable families built on time-tested structures are the foundation of a healthy society.', NULL, 42, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(39, 'C5', -1, 'Rapid cultural change destabilizes communities and erodes the values that bind people together.', NULL, 43, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(40, 'C5', -1, 'There is value in preserving customs and rituals even when their original purpose has faded.', NULL, 44, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(41, 'C6', -1, 'People naturally and rightly owe more loyalty to their own community than to outsiders.', NULL, 44, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(42, 'C6', -1, 'A society that does not put its own members first will eventually be unable to help anyone.', NULL, 45, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(43, 'C6', -1, 'It is reasonable to prioritize people who share your culture or heritage in hiring and assistance.', NULL, 46, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(44, 'C6', -1, 'Strong group identity and mutual obligation within communities produce better outcomes than abstract universalism.', NULL, 60, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(45, 'C6', 1, 'Treating a stranger''s child as no less important than a neighbor''s child is a moral ideal worth striving for.', NULL, 63, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(46, 'C6', 1, 'Moral rules should apply equally to all people regardless of nationality, ethnicity, or religion.', NULL, 64, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(47, 'C6', 1, 'Aid and assistance should be allocated based on need, not on shared identity or proximity.', NULL, 67, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(49, 'C7', -1, 'A nation must control its own borders and immigration without outside interference.', NULL, 47, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(50, 'C7', -1, 'Trade agreements that constrain domestic policy undermine democratic self-determination.', NULL, 48, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(51, 'C7', -1, 'Supranational bodies like the UN, EU, or WTO have accumulated too much power over national affairs.', NULL, 49, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(52, 'C7', -1, 'Citizens of a country, not international bodies, should decide the laws that govern them.', NULL, 50, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(53, 'C7', 1, 'International courts should be able to override national laws that violate human rights.', NULL, 52, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(54, 'C7', 1, 'Nations should transfer some sovereignty to global institutions to address climate change.', NULL, 53, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(56, 'C7', 1, 'Global problems require global governance that nations cannot opt out of.', NULL, 55, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(57, 'C8', -1, 'Technology tends to create new problems as fast as it solves existing ones.', NULL, 56, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(58, 'C8', -1, 'Society has become dangerously dependent on complex systems that few people understand.', NULL, 57, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(59, 'C8', -1, 'Some technologies—certain weapons, surveillance tools, AI systems—should never have been built.', NULL, 58, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(60, 'C8', -1, 'Complex technologies fail in ways that even their designers cannot predict or control.', NULL, 66, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(61, 'C8', 1, 'Automation and AI will create more prosperity than they destroy over time.', NULL, 61, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(62, 'C8', 1, 'New technologies should generally be deployed quickly; we can address problems as they arise.', NULL, 62, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(63, 'C8', 1, 'Most major problems—health, poverty, climate—can be solved primarily through technological innovation.', NULL, 65, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(64, 'C8', 1, 'Genetic engineering of crops and humans should be embraced as a tool for improving life.', NULL, 68, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(65, 'C9', 1, 'Humans have a duty to preserve wild nature even at significant cost to our own prosperity.', NULL, 69, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(66, 'C9', -1, 'The natural world exists as a resource for human use and flourishing.', NULL, 70, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(67, 'C9', 1, 'Ecosystems and species have intrinsic value that does not depend on their usefulness to humans.', NULL, 71, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(68, 'C9', 1, 'Economic development should be constrained when it threatens biodiversity or ecosystem health.', NULL, 72, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(69, 'C9', 1, 'Animals'' interests should carry moral weight even when protecting them benefits no human.', NULL, 73, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(70, 'C9', -1, 'Human beings matter morally in a way that animals and ecosystems simply do not.', NULL, 74, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(71, 'C9', -1, 'When human well-being and environmental preservation conflict, human needs should come first.', NULL, 75, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(72, 'C9', -1, 'Protecting endangered species is not worth major economic sacrifice.', NULL, 76, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(73, 'C10', 1, 'What counts as right and wrong depends largely on cultural context and historical circumstances.', NULL, 77, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(74, 'C10', -1, 'Some actions are objectively wrong regardless of what any culture or individual believes.', NULL, 78, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(75, 'C10', -1, 'Moral truths exist and can be discovered through reason, experience, or revelation.', NULL, 79, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(76, 'C10', -1, 'Without grounding in universal principles, ethics becomes arbitrary and unstable.', NULL, 80, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(77, 'C10', -1, 'Across all cultures and eras, certain core moral standards remain constant.', NULL, 2, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(78, 'C10', 1, 'Morality is a human construction that evolves as societies develop new understandings.', NULL, 4, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(79, 'C10', 1, 'Ethical disagreements often cannot be resolved because people are starting from incompatible premises.', NULL, 16, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(80, 'C10', 1, 'There is no single correct moral framework; reasonable people can hold fundamentally different values.', NULL, 98, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(81, 'F1', 1, 'Sometimes dramatic, disruptive action is the only way to overcome entrenched injustice.', NULL, 81, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(82, 'F1', 1, 'Protest and civil disobedience are legitimate tools when institutions fail to respond.', NULL, 82, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(83, 'F1', 1, 'Fundamental change requires confrontation, not negotiation with those who benefit from the status quo.', NULL, 83, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(84, 'F1', -1, 'Lasting reform comes through patient, incremental work within existing institutions.', NULL, 86, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(85, 'F1', -1, 'Stability and continuity are valuable even when change is desirable in principle.', NULL, 11, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(86, 'F1', -1, 'Revolutionary movements usually cause more suffering than the injustices they aimed to correct.', NULL, 94, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(87, 'F2', 1, 'Major institutions—government, media, corporations—routinely mislead the public to serve their own interests.', NULL, 83, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(88, 'F2', 1, 'Official experts often conceal important information or present biased conclusions.', NULL, 84, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(89, 'F2', 1, 'Even well-designed institutions end up serving the industries and interest groups they were meant to oversee.', NULL, 85, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(90, 'F2', -1, 'On balance, the institutions that run society are genuinely trying to do the right thing.', NULL, 87, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(91, 'F2', -1, 'Most professionals—doctors, scientists, judges—can be trusted to act with integrity.', NULL, 88, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(92, 'F2', -1, 'Democratic institutions, despite their flaws, generally produce fair outcomes over time.', NULL, 89, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(93, 'F3', 1, 'The primary goal of justice should be repairing harm and reintegrating offenders into society.', NULL, 91, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(94, 'F3', 1, 'Bringing victims and offenders together to seek understanding produces better outcomes than punishment alone.', NULL, 92, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(95, 'F3', 1, 'Most people who commit crimes need support and rehabilitation, not cages.', NULL, 93, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(96, 'F3', -1, 'Wrongdoers deserve punishment proportional to the severity of their offense.', NULL, 95, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(97, 'F3', -1, 'A justice system that does not punish crime fails to uphold moral order.', NULL, 96, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(98, 'F3', -1, 'Accountability means facing real consequences, not just dialogue and reconciliation.', NULL, 97, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.674929+00'),
	(99, 'C1', 1, 'When ride-sharing apps like Uber entered my city, I supported letting them compete with traditional taxis rather than banning or heavily restricting them.', NULL, 101, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(100, 'C1', -1, 'During the recent spike in gas prices, I would have supported the government temporarily capping fuel prices, even knowing it might cause some supply issues.', NULL, 102, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(101, 'C1', 1, 'If a local hospital is struggling financially, it''s better to let a private company take it over than to have the government step in to run it.', NULL, 103, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(102, 'C1', -1, 'Electricity should be provided by a single public utility rather than competing private companies, even if competition might lower some prices.', NULL, 104, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(103, 'C2', -1, 'If a billionaire dies and leaves $5 billion to their adult children, I support taxing at least half of that inheritance.', NULL, 105, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(104, 'C2', 1, 'A family farm that''s been passed down for generations shouldn''t face estate taxes that might force a sale, even if it''s now worth millions.', NULL, 106, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(105, 'C2', -1, 'My city should add a tax on homes worth over $2 million to fund affordable housing, even if it reduces property values for wealthy homeowners.', NULL, 107, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00');
INSERT INTO public.questions VALUES
	(106, 'C2', 1, 'A business owner who built a successful company from nothing has earned the right to pay themselves whatever they want, regardless of what their employees make.', NULL, 108, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(107, 'C3', 1, 'Even if it makes catching criminals harder, I oppose requiring tech companies to build ''back doors'' that let police access encrypted messages.', NULL, 109, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(108, 'C3', -1, 'Schools should be allowed to randomly search student lockers and backpacks for weapons and drugs without needing specific suspicion.', NULL, 110, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(109, 'C3', 1, 'Protesters who block a highway to demand political action shouldn''t face serious criminal charges, even though they disrupted traffic.', NULL, 111, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(110, 'C3', -1, 'Social media platforms should be required to quickly remove content that authorities flag as potentially dangerous misinformation.', NULL, 112, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(111, 'C4', 1, 'If my state wants to set a minimum wage different from the federal level, it should be free to do so without federal interference.', NULL, 113, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(112, 'C4', -1, 'When some local governments refused to enforce public health measures during COVID, state governments were right to override them.', NULL, 114, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(113, 'C4', 1, 'My city should be able to set its own rules about short-term rentals like Airbnb, even if state law tries to prevent local regulation.', NULL, 115, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(114, 'C4', -1, 'Education standards should be set nationally so that a high school diploma means the same thing whether you''re in Mississippi or Massachusetts.', NULL, 116, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(115, 'C5', 1, 'Elementary schools should teach that families come in many forms—single parents, same-sex parents, grandparents raising kids—as equally valid.', NULL, 117, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(116, 'C5', -1, 'A historic nativity scene on public land should stay up during Christmas, even if some residents object to religious displays.', NULL, 118, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(117, 'C5', 1, 'Workplaces that ask employees to share their preferred pronouns are making a reasonable accommodation for changing social norms.', NULL, 119, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(118, 'C5', -1, 'When a century-old statue becomes controversial, communities should lean toward keeping it with added historical context rather than removing it.', NULL, 120, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(119, 'C6', 1, 'Universities should award scholarships to the most qualified applicants worldwide, even if that means fewer go to students from our own country.', NULL, 121, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(120, 'C6', -1, 'When affordable housing is limited, long-term residents and their families should get priority over recent arrivals.', NULL, 122, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(121, 'C6', 1, 'If our country has more vaccines than we need, we should donate the surplus based on global need rather than stockpiling for ourselves.', NULL, 123, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(122, 'C6', -1, 'A small business owner isn''t wrong to prefer hiring people from their own community, all else being equal.', NULL, 124, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(123, 'C7', -1, 'If an international trade court rules against our country''s policy, we should be able to ignore that ruling if we disagree.', NULL, 125, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(124, 'C7', 1, 'I support a global minimum corporate tax rate, even though it limits our country''s ability to attract businesses with lower rates.', NULL, 126, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(125, 'C7', -1, 'Our country shouldn''t have to change its food safety standards just to comply with international trade agreements.', NULL, 127, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(126, 'C7', 1, 'Countries that fail to meet binding international climate commitments should face real penalties, even wealthy powerful ones.', NULL, 128, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(127, 'C8', 1, 'A city should replace bus drivers with autonomous vehicles if data shows it would reduce accidents, even though it eliminates jobs.', NULL, 129, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(128, 'C8', -1, 'I would decline a free genetic test that predicts disease risk if it meant a company would store my DNA data indefinitely.', NULL, 130, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(129, 'C8', 1, 'If lab-grown meat becomes affordable, society should actively encourage switching from traditional beef, even if it hurts ranchers.', NULL, 131, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(130, 'C8', -1, 'Schools should limit students'' use of AI writing tools even if it makes them less competitive, because learning to write matters.', NULL, 132, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(131, 'C9', 1, 'A hydroelectric dam that would provide clean energy to 50,000 homes should be blocked if it destroys habitat for an endangered species.', NULL, 133, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(132, 'C9', -1, 'If reintroduced wolves are killing livestock, ranchers should be allowed to shoot them even if wolf populations are still recovering.', NULL, 134, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(133, 'C9', 1, 'Old-growth forest shouldn''t be logged even for well-paying jobs, because some ecosystems can never be replaced once destroyed.', NULL, 135, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(134, 'C9', -1, 'A mining project that would create 500 good jobs should proceed even if it damages a remote wilderness area few people ever visit.', NULL, 136, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(135, 'C10', 1, 'Different cultures can reach opposite conclusions about end-of-life care, and neither position is more objectively correct.', NULL, 137, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(136, 'C10', -1, 'If a close friend from another culture defended a practice I find deeply wrong, I would say it is wrong - not just ''different''.', NULL, 138, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(137, 'C10', 1, 'On abortion, I believe reasonable people with good intentions can reach completely different conclusions based on equally valid moral frameworks.', NULL, 139, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(138, 'C10', -1, 'Some business practices are simply unethical everywhere—it''s not just ''cultural differences'' when companies exploit workers in poor countries.', NULL, 140, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(139, 'F1', 1, 'When activists block traffic or disrupt businesses to demand urgent action, their tactics can be justified by the importance of their cause.', NULL, 141, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(140, 'F1', -1, 'A political movement should accept a partial compromise now rather than holding out for everything, even if full victory might come later.', NULL, 142, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(141, 'F1', 1, 'Sometimes you have to break rules to expose injustice—whistleblowers who leak classified documents can be heroes even if they broke the law.', NULL, 143, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(142, 'F1', -1, 'I''d rather see a modest reform pass with broad support than a sweeping overhaul rammed through that the next government could reverse.', NULL, 144, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(144, 'F2', -1, 'When a major newspaper retracts a story after discovering errors, it shows the system works—media can correct itself.', NULL, 146, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(145, 'F2', 1, 'When a big company settles a fraud case without admitting guilt, I assume the misconduct went far beyond what was proven.', NULL, 147, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(146, 'F2', -1, 'When a study passes peer review at a major scientific journal, I take its findings seriously even when they cut against my politics.', NULL, 148, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(147, 'F3', 1, 'If a teenager vandalized my car, I''d prefer they do community service and pay me back directly rather than go through the criminal system.', NULL, 149, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(148, 'F3', -1, 'An executive who defrauded retirees of their savings should go to prison even if they''ve repaid every penny and shown genuine remorse.', NULL, 150, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(149, 'F3', 1, 'For most non-violent crimes, programs that connect offenders with victims and community members work better than jail time.', NULL, 151, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(150, 'F3', -1, 'Some crimes are so serious that punishment is deserved regardless of whether it rehabilitates the offender or deters others.', NULL, 152, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.724525+00'),
	(151, 'C1', 1, 'In cities where rents are soaring, I oppose strict rent caps; it''s better to let landlords charge market rates so more housing gets built over time.', NULL, 153, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(152, 'C1', -1, 'Public transit should be owned and operated by the city, even if private bus companies say they could run the system more cheaply for a profit.', NULL, 154, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(153, 'C1', 1, 'If a supermarket chain replaces most cashiers with self-checkout machines to keep prices low, that tradeoff is acceptable even though it eliminates some jobs.', NULL, 155, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(154, 'C1', -1, 'During a recession, the government should directly subsidize struggling companies to keep workers employed, even if the businesses were poorly managed.', NULL, 156, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(155, 'C2', -1, 'If a city has many vacant luxury condos, I support taxing or converting them into affordable housing even if it reduces returns for investors.', NULL, 157, false, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(156, 'C2', 1, 'I oppose broad student loan forgiveness; borrowers should repay what they agreed to rather than shifting the cost to taxpayers.', NULL, 158, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(157, 'C2', -1, 'I support a yearly wealth tax on multimillionaires to fund universal childcare and healthcare, even if some wealthy people move away.', NULL, 159, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(158, 'C2', 1, 'A flat income tax where everyone pays the same percentage is fairer than higher tax rates on top earners.', NULL, 160, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(159, 'C3', 1, 'I oppose installing facial-recognition cameras throughout my city, even if police argue it would significantly reduce crime.', NULL, 161, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(160, 'C3', -1, 'Police should be allowed to use predictive algorithms to identify likely offenders, even if those systems sometimes reflect biased historical data.', NULL, 162, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(161, 'C3', 1, 'During a pandemic, I am uncomfortable with smartphone location tracking to enforce quarantine, even if it would slow the spread of disease.', NULL, 163, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(162, 'C3', -1, 'In high-crime neighborhoods, I support imposing temporary curfews even though it restricts the freedom of residents who have done nothing wrong.', NULL, 164, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(163, 'C4', 1, 'Neighborhoods should have real power over local zoning decisions, even if that slows down new housing construction citywide.', NULL, 165, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(164, 'C4', -1, 'Use-of-force standards for police should be set at the national level so departments can''t adopt looser local policies.', NULL, 166, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(165, 'C4', 1, 'Local school boards should be free to adopt their own curriculum on controversial topics, even if national experts disagree.', NULL, 167, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(166, 'C4', -1, 'The national government should be able to override cities that declare themselves sanctuary cities for undocumented immigrants.', NULL, 168, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(167, 'C5', 1, 'Adults should be allowed to change the gender marker on their IDs based on self-identification, without requiring medical procedures or court hearings.', NULL, 169, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(168, 'C5', -1, 'Classic books that contain racist or sexist language should be taught in their original form, not replaced with edited versions or removed from classes.', NULL, 170, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(169, 'C5', 1, 'Public schools should allow students to form clubs around any gender or sexual identity, even if some parents strongly object.', NULL, 171, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(170, 'C5', -1, 'Elementary school teachers should avoid discussing topics like open relationships or nontraditional sexual lifestyles, even if some families are comfortable with them.', NULL, 172, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(171, 'C6', 1, 'When our country accepts refugees, priority should go to the most vulnerable people globally rather than those from allied or culturally similar nations.', NULL, 173, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(172, 'C6', -1, 'If my country faces a natural disaster, I think we should fully fund domestic recovery before sending major aid to other countries.', NULL, 174, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(173, 'C6', 1, 'I''d rather donate to a charity that fights extreme poverty overseas than one that funds relatively minor improvements in my own neighborhood.', NULL, 175, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(174, 'C6', -1, 'Public agencies should buy from suppliers in our own country even when foreign firms offer taxpayers a better price.', NULL, 176, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(175, 'C7', -1, 'I oppose international courts having the power to prosecute my country''s soldiers for actions taken in war.', NULL, 177, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(176, 'C7', 1, 'During serious global pandemics, the World Health Organization should be able to impose binding travel restrictions that member countries must follow.', NULL, 178, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(177, 'C7', -1, 'Our national legislature should set immigration levels on its own; international refugee agreements shouldn''t force us to take more people than we choose.', NULL, 179, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(178, 'C7', 1, 'I support a binding global treaty that limits autonomous weapons and AI military systems, even if it restricts my country''s technological edge.', NULL, 180, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(179, 'C8', 1, 'My city should install a dense network of traffic and air-quality sensors to optimize flows and health, even though it means constant monitoring of public spaces.', NULL, 181, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(180, 'C8', -1, 'I would rather have a human judge decide criminal sentences than rely on an algorithm, even if data shows the algorithm is slightly more consistent.', NULL, 182, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(181, 'C8', 1, 'If advanced AI and automation dramatically increase profits, I support funding a universal basic income from those gains to soften job losses.', NULL, 183, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(182, 'C8', -1, 'Even if brain–computer interfaces could treat serious disabilities, I am uneasy about normalizing implants that let companies or governments access people''s thoughts.', NULL, 184, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(183, 'C9', 1, 'I support banning commercial fishing in fragile coral reef areas, even if it raises seafood prices and hurts some local businesses.', NULL, 185, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(184, 'C9', -1, 'Building a new highway through a rural area is acceptable if it significantly cuts commute times, even though it fragments wildlife habitat.', NULL, 186, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(185, 'C9', 1, 'To fight climate change, I would back strict limits on frequent air travel, even if it makes personal vacations much harder.', NULL, 187, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(186, 'C9', -1, 'In dense cities, converting remaining vacant green lots into affordable housing is an acceptable tradeoff, even if it reduces access to nature.', NULL, 188, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(187, 'C10', 1, 'When two countries handle hate speech very differently, I think each approach can be morally appropriate for its own culture.', NULL, 189, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(188, 'C10', -1, 'Cultural traditions that involve permanently harming children''s bodies, like genital cutting, are wrong everywhere and should be discouraged globally.', NULL, 190, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(189, 'C10', 1, 'If I moved to a country whose laws were built on moral views very different from mine, I would accept its system as no less legitimate than ours.', NULL, 191, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(190, 'C10', -1, 'I believe there are universal human rights that all governments must respect, even when those rights conflict with long-standing local customs.', NULL, 192, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(191, 'F1', 1, 'Physically blocking construction of a project you believe is deeply harmful - a pipeline, a prison, a highway - can be a legitimate political tactic.', NULL, 193, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(192, 'F1', -1, 'Even when I''m deeply frustrated with the system, political change should come through elections and courts, not property damage or street clashes.', NULL, 194, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(193, 'F1', 1, 'I admire movements that refuse to compromise on core demands, even if it means they lose in the short term.', NULL, 195, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(194, 'F1', -1, 'I prefer leaders who avoid inflaming tensions and seek incremental agreements, even if that means slower progress on issues I care about.', NULL, 196, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(195, 'F2', 1, 'I assume large tech companies are hiding important information about how they collect and use people''s data.', NULL, 197, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(196, 'F2', -1, 'When multiple levels of courts uphold a law over many years, I generally trust that the law is constitutional even if I dislike it.', NULL, 198, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(197, 'F2', 1, 'I think official economic statistics and political polls are often manipulated, so I don''t put much stock in them.', NULL, 199, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(198, 'F2', -1, 'If several independent news outlets report the same event, I usually trust the basic facts even if details might be off.', NULL, 200, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(199, 'F3', 1, 'Criminal records for non-violent offenses should be sealed after a few years, so people can genuinely start over.', NULL, 201, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(200, 'F3', -1, 'People who repeatedly commit serious violent crimes should receive long mandatory prison sentences, even if rehabilitation programs might work in some cases.', NULL, 202, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(201, 'F3', 1, 'I support giving victims a say in restorative justice programs, even when the law would allow a much harsher sentence.', NULL, 203, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(202, 'F3', -1, 'Publicly naming and shaming serious offenders is important, even after they have completed their prison sentences.', NULL, 204, true, 1.25, 'applied', '2026-07-17 00:17:32.760727+00', '2026-07-17 00:17:32.760727+00'),
	(203, 'C7', 1, 'Trade agreements should include enforceable minimum labor standards for all member countries, even if that raises prices at home.', NULL, 205, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(204, 'C7', -1, 'Our country should be free to offer special tax breaks to attract global companies, even if international bodies say it undercuts poorer nations.', NULL, 206, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(205, 'C8', 1, 'I would use an AI assistant for everyday medical questions, even though that means a tech company handles my health information.', NULL, 207, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(206, 'C8', -1, 'I avoid smart-home devices like voice assistants, even though they are convenient, because I don''t trust companies with always-on microphones in my house.', NULL, 208, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00');
INSERT INTO public.questions VALUES
	(207, 'C4', -1, 'The state should be able to override local zoning rules to require that every town allows apartments and affordable housing.', NULL, 209, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(208, 'C4', 1, 'A neighborhood should be able to block a homeless shelter from opening on its street, even if the city says the shelter is badly needed.', NULL, 210, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(209, 'C7', 1, 'To fight cross-border crime, international agencies should be able to require member countries to check travelers against shared biometric watchlists, even though ordinary people end up tracked.', NULL, 211, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(210, 'C7', -1, 'Our country should refuse international data-sharing rules that require logging citizens'' travel and communications, even if that makes cross-border crime harder to fight.', NULL, 212, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(211, 'C7', 1, 'Nations should accept binding global limits on editing human embryos, even if it slows medical breakthroughs at home.', NULL, 213, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(212, 'C7', -1, 'Our country should push ahead with cutting-edge genetic and AI research even when international bodies call for a global pause.', NULL, 214, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(213, 'C10', -1, 'International institutions should pressure countries that criminalize homosexuality to change those laws, even where the laws reflect majority local values.', NULL, 215, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(214, 'C10', 1, 'Even when I find another culture''s practices deeply wrong, international bodies shouldn''t force that culture to change.', NULL, 216, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(215, 'C9', -1, 'Environmental review should be fast-tracked or waived for affordable housing projects, even if some habitat and green space is lost.', NULL, 217, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(216, 'C9', 1, 'A city should keep its large parks intact even if selling part of the land could fund thousands of subsidized homes.', NULL, 218, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(217, 'C1', -1, 'Emergency laws should ban ride-price surges during disasters, even if that means fewer drivers show up exactly when demand spikes.', NULL, 219, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(218, 'C5', -1, 'The government should be able to restrict art or entertainment that mocks sacred religious traditions.', NULL, 220, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(219, 'C3', 1, 'Even when public behavior offends community standards of decency, the government shouldn''t have the power to ban it.', NULL, 221, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(220, 'C3', -1, 'Schools should be able to enforce dress codes that reflect traditional community values, even when students say it limits their self-expression.', NULL, 222, true, 1.25, 'applied', '2026-07-17 00:17:32.894091+00', '2026-07-17 00:17:32.894091+00'),
	(10, 'C2', -1, 'Guaranteeing every citizen a basic income would create a more just society.', 'A universal basic income provides a guaranteed income floor for all citizens. Supporters argue it reduces poverty and provides security in a changing economy. Critics view it as an inefficient transfer that discourages work and production. How it would be funded is a separate question - this item asks only about the goal.', 13, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.930816+00'),
	(20, 'C3', 1, 'Governments should not have the power to shut down protests just because they are disruptive.', 'This question asks about the limits of state power over assembly. Civil liberties advocates view protest rights as a fundamental check on government, even when protests disrupt daily life. Order-focused perspectives argue authorities need discretion to protect the public and keep society functioning.', 25, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.930816+00'),
	(24, 'C3', -1, 'Authorities should be able to ban public gatherings that risk disorder, even before any law has been broken.', 'Preventive restrictions raise the security-liberty tradeoff in its sharpest form: acting before harm occurs. Security-oriented perspectives argue prevention protects the public; civil libertarians counter that pre-emptive bans punish people for things that have not happened and invite abuse.', 90, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.930816+00'),
	(48, 'C6', 1, 'How much someone''s wellbeing matters shouldn''t depend on where they happen to have been born.', 'Universalists view birthplace as morally arbitrary - suffering matters equally wherever it occurs. Particularists argue that special obligations to family, community, and nation are natural and necessary, and that concern legitimately diminishes with distance.', 59, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.930816+00'),
	(55, 'C7', 1, 'Countries benefit from joining agreements that let people live and work freely across each other''s borders.', 'Free-movement agreements (like the EU''s) pool a core element of sovereignty. Integrationists argue such arrangements expand opportunity and bind nations together peacefully. Sovereigntists counter that control over who enters and settles is a defining national power that should not be delegated.', 54, true, 1.00, 'conceptual', '2026-07-17 00:17:32.674929+00', '2026-07-17 00:17:32.930816+00'),
	(143, 'F2', 1, 'When public health officials recommend a new vaccine, I assume politics or money shaped the guidance more than evidence.', NULL, 145, true, 1.25, 'applied', '2026-07-17 00:17:32.724525+00', '2026-07-17 00:17:32.930816+00'),
	(221, 'F4', 1, 'Fundamental rights belong in constitutions precisely so that no election result can take them away.', 'Constitutionalists entrench rights beyond the reach of ordinary majorities, arguing that what an election can grant, an election can revoke. Majoritarians counter that binding future voters to past decisions lets the dead govern the living, and that rights are safest when a live majority actively defends them.', 223, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(222, 'F4', -1, 'No court, expert body, or institution should be able to block the clearly expressed will of the majority for long.', 'Majoritarians hold that legitimacy flows only from the people, so institutional vetoes must ultimately yield. Constitutionalists argue that durable checks are what distinguish constitutional democracy from mob rule, protecting minorities and long-term interests.', 224, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(223, 'F4', 1, 'Some public questions are too technical for popular opinion to settle and are better delegated to qualified experts.', 'Advocates of delegation point to central banking, drug approval, and pandemic response as areas where expertise outperforms popular sentiment. Critics argue expert bodies escape accountability and smuggle value judgments in as technical ones.', 225, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(224, 'F4', -1, 'Ordinary citizens, not experts or judges, should make the big decisions about society''s direction - even on complex issues.', 'Democratic populists argue citizens are the rightful authors of their collective life and that "complexity" is often an excuse to exclude them. Constitutionalists respond that good judgment on technical questions requires knowledge most citizens lack the time to acquire.', 226, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(225, 'F4', 1, 'Constitutions should be hard to change, even when current majorities find them inconvenient.', 'Entrenchment protects fundamental rules from momentary passions and shifting majorities. Critics argue the dead hand of the past should not bind the living, and that rigid constitutions preserve outdated arrangements.', 227, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(226, 'F4', -1, 'Putting major national questions directly to voters in referendums produces more legitimate decisions than leaving them to politicians.', 'Direct-democracy advocates argue referendums cut out self-interested intermediaries and settle big questions with unmatched legitimacy. Skeptics point to campaigns that reduce complex tradeoffs to slogans and outcomes that swing on turnout.', 228, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(227, 'F4', -1, 'If a large majority of voters supports a policy, the government should implement it even when most experts warn it will backfire.', NULL, 229, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(228, 'F4', 1, 'An independent central bank should keep control of interest rates even when elected leaders demand cheaper borrowing before an election.', NULL, 230, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(229, 'F4', -1, 'Voters should be able to remove judges who repeatedly block popular laws.', NULL, 231, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(230, 'F4', 1, 'Even on divisive moral questions like assisted dying, careful legislative deliberation is better than a simple yes/no referendum.', NULL, 232, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(231, 'F5', 1, 'Sometimes military force is the only language aggressive regimes understand.', 'Hawks argue that appeasement invites escalation and that credible force is what keeps predatory states in check. Doves counter that force usually breeds the next conflict and that this framing forecloses diplomacy too early.', 233, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(232, 'F5', -1, 'War is almost never worth its cost in lives, even when the cause seems just.', 'Near-pacifists weigh the certain horrors of war against its speculative benefits and find almost no war justified. Interventionists respond that refusing to fight can carry even higher costs - conquest, atrocity, and the collapse of deterrence.', 234, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(233, 'F5', 1, 'A strong military prevents wars; weakness invites them.', 'Deterrence theory holds that visible strength raises the cost of aggression and so preserves peace. Critics argue arms build-ups feed security spirals in which each side''s "defensive" strength looks like a threat to the other.', 235, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(234, 'F5', -1, 'Most wars our country has fought could have been avoided through diplomacy and restraint.', 'Doves read history as a catalog of avoidable wars driven by pride, fear, and bad information. Hawks read the same history as proof that some adversaries cannot be talked out of aggression, only deterred or defeated.', 236, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(235, 'F5', 1, 'Countries with the power to stop mass atrocities abroad have a duty to intervene, with force if necessary.', 'Humanitarian interventionists argue sovereignty is no shield for genocide. Opponents - both dovish and sovereigntist - point to interventions that deepened the suffering they meant to stop, and question who authorizes such wars.', 237, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(236, 'F5', -1, 'Shifting military spending to domestic needs would make us better off, not less safe.', 'Advocates see defense budgets as bloated opportunity costs paid in schools and hospitals. Skeptics argue security underwrites everything else and that underfunded deterrence is the most expensive mistake a country can make.', 238, true, 1.00, 'conceptual', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(237, 'F5', 1, 'If an allied democracy is invaded, our country should be willing to send troops - not just weapons and aid.', NULL, 239, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(238, 'F5', -1, 'I would oppose striking a hostile country''s weapons programs unless we were attacked first.', NULL, 240, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(239, 'F5', 1, 'Targeting a terrorist leader hiding in another country without that country''s permission can be justified.', NULL, 241, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(240, 'F5', -1, 'Our country should pledge never to use nuclear weapons first, even if that weakens deterrence.', NULL, 242, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(241, 'C5', -1, 'Religious organizations should be able to run publicly funded schools that teach according to their faith.', NULL, 243, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(242, 'C5', 1, 'Government employees should keep religious symbols out of sight while serving the public, so the state stays neutral.', NULL, 244, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(243, 'C5', -1, 'People should be able to refuse work duties that conflict with their religious beliefs, even when it inconveniences employers or customers.', NULL, 245, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(244, 'C2', -1, 'Workers have the right to strike even when it shuts down services the public depends on.', NULL, 246, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(245, 'C1', 1, 'Companies should be able to hire replacements for striking workers to keep their business running.', NULL, 247, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(246, 'C2', -1, 'Gig workers like rideshare drivers should get employee benefits, even if it raises prices and means fewer flexible jobs.', NULL, 248, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(247, 'C2', 1, 'Employees who don''t want a union shouldn''t have to pay union dues, even if they benefit from the contract the union negotiated.', NULL, 249, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(248, 'C2', -1, 'Taxing people more to guarantee everyone housing and healthcare expands freedom overall, even though it limits what earners keep.', NULL, 250, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(249, 'C2', 1, 'Freedom means the government leaving you alone - even if some people end up without the means to make much of that freedom.', NULL, 251, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(250, 'C2', -1, 'Mandatory paycheck deductions for retirement and health coverage make people freer in the long run, even though they override individual choice.', NULL, 252, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(251, 'C3', 1, 'Terminally ill adults should have the legal right to end their lives with medical assistance.', NULL, 253, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(252, 'C3', 1, 'Adults should be free to use recreational drugs, with the state limited to regulating safety and purity.', NULL, 254, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(253, 'C3', -1, 'Governments should be able to require vaccination during dangerous outbreaks, with real penalties for refusing.', NULL, 255, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(254, 'C3', 1, 'Law-abiding adults should be able to own firearms for self-defense without having to prove a special need.', NULL, 256, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(255, 'C3', -1, 'Requiring licenses, training, and registration for all gun owners is a reasonable public-safety measure.', NULL, 257, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(256, 'C3', -1, 'Courts should be able to temporarily take guns from people shown to be a danger to themselves or others.', NULL, 258, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(257, 'C2', -1, 'Schools and employers should be able to give extra consideration to applicants from groups that faced historical exclusion.', NULL, 259, false, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(258, 'C6', 1, 'Admissions and hiring should be strictly colorblind - the same criteria for everyone, regardless of group history.', NULL, 260, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(259, 'C2', -1, 'Communities that were dispossessed through slavery, segregation, or seized land are owed real compensation today.', NULL, 261, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(260, 'C2', 1, 'Preferences based on group identity are unfair to individuals who did nothing wrong, whatever the historical justification.', NULL, 262, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(261, 'C2', 1, 'Public borrowing that pushes today''s costs onto future generations is unfair, even when it funds programs people want now.', NULL, 263, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(262, 'C9', 1, 'Harms to people fifty years from now should weigh as heavily in policy as harms to people today.', NULL, 264, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(263, 'C9', -1, 'It''s reasonable to focus on today''s poverty and disease before spending heavily against risks that mainly affect future generations.', NULL, 265, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(264, 'C5', 1, 'Ending a pregnancy in its early months should be legal, with the decision left to the woman and her doctor.', NULL, 266, true, 1.25, 'applied', '2026-07-17 00:17:32.966753+00', '2026-07-17 00:17:32.966753+00'),
	(265, 'F4', 1, 'Election district maps should be drawn by independent commissions, not by the party in power.', NULL, 267, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(266, 'F4', -1, 'In a genuine emergency, elected leaders should be able to act immediately without waiting for courts or oversight bodies to approve.', NULL, 268, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(267, 'F4', 1, 'If most residents vote to ban water fluoridation against overwhelming scientific advice, the city should keep fluoridating.', NULL, 269, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(268, 'F4', -1, 'Mega-projects like new airports, rail lines, and power plants should be approved by public vote, not by planning agencies.', NULL, 270, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(269, 'F5', 1, 'Backing down from a military commitment invites more aggression than honoring it, whatever the cost.', 'Credibility hawks argue that reneging on commitments teaches adversaries that threats work, making every future crisis more dangerous. Critics call this the commitment trap: fighting unwanted wars to preserve a reputation whose deterrent value is unproven.', 271, true, 1.00, 'conceptual', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(270, 'F5', -1, 'A society that celebrates its military too much ends up finding reasons to use it.', 'Critics of militarism argue that glorifying armed force builds political pressure to use it and crowds out diplomatic instincts. Others respond that honoring service sustains the morale and recruitment a credible defense requires, and implies nothing about eagerness for war.', 272, true, 1.00, 'conceptual', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(271, 'F5', 1, 'Our country should be willing to strike militarily to stop a genocide, even without UN authorization.', NULL, 273, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(272, 'F5', -1, 'We should hold off on military action until international bodies authorize it, even if that means acting too late to help.', NULL, 274, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(273, 'F5', 1, 'If our country faced a serious military threat, bringing back mandatory military service would be justified.', NULL, 275, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(274, 'F5', -1, 'Even with hostile regimes, keeping embassies open and talking is better than cutting ties and isolating them.', NULL, 276, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(275, 'F5', 1, 'Our country should sell weapons to friendly governments, even knowing some deals will end up in conflicts we regret.', NULL, 277, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(276, 'F5', -1, 'Our country should close most of its overseas military bases and bring the troops home.', NULL, 278, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(277, 'C8', 1, 'Expanding nuclear power is a good climate strategy, even accepting the waste and accident risks that come with it.', NULL, 279, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(278, 'C8', -1, 'Even to fight climate change, we shouldn''t deploy planet-scale technologies like solar geoengineering that tinker with systems we barely understand.', NULL, 280, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(279, 'C9', 1, 'Removing aging dams to restore wild rivers and salmon runs is worth losing the clean power they generate.', NULL, 281, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(280, 'C9', -1, 'Dams that still provide clean power and flood control should be kept, even where removing them would revive lost ecosystems.', NULL, 282, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(281, 'C1', 1, 'Private companies financing roads and bridges through tolls will build and maintain them better than government agencies funded by taxes.', NULL, 283, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(282, 'C1', -1, 'Projects like high-speed rail are worth building even when no private investor would fund them - only government can build at that scale.', NULL, 284, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(283, 'C4', 1, 'Communities should be able to say no to wind farms and transmission lines in their area, even if it slows the national energy transition.', NULL, 285, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(284, 'C4', -1, 'The national government should be able to fast-track critical energy and transport projects over local objections.', NULL, 286, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(285, 'C5', 1, 'When a community asks to be described by a new name or term, adopting the new language is a matter of respect, not ''political correctness''.', NULL, 287, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(286, 'C6', -1, 'It''s fair for a country to favor citizenship applicants who already share its language, culture, or ancestry.', NULL, 288, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(287, 'C5', 1, 'Religious slaughter practices should have to meet the same animal-welfare rules as everyone else, with no exemptions.', NULL, 289, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00'),
	(288, 'C5', -1, 'Parents should be free to raise and school their children according to their religious traditions, even when that means opting out of mainstream curriculum requirements.', NULL, 290, true, 1.25, 'applied', '2026-07-17 03:00:00+00', '2026-07-17 03:00:00+00');


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

SELECT pg_catalog.setval('public.question_axis_links_id_seq', 513, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 288, true);


--
-- Name: axes axes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes
    ADD CONSTRAINT axes_pkey PRIMARY KEY (id);


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
-- Note: profiles intentionally has NO admin SELECT/UPDATE policy. Any policy on
-- profiles that sub-selects profiles to check is_admin causes infinite recursion
-- (error 42P17), which also propagates to any table whose admin policy sub-selects
-- profiles (e.g. question_axis_links). Admin access to profiles uses the service
-- role key on the backend or JWT claims instead. See schema.sql and
-- supabase/migrations/011_*_profiles_policies_*.sql.
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
-- Auth trigger (lives on auth.users, outside the public schema dump):
-- auto-creates a profile row whenever a user signs up.
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
