-- Run after polyaxis_v2_1_live_migration.sql or polyaxis_fresh_install_v2_1.sql.
-- Every row in the first result set should be true.

SELECT 'active v2.1 questions = 300' AS check_name,
       count(*) = 300 AS ok
FROM public.questions
WHERE active AND bank_version = 'v2.1'
UNION ALL
SELECT 'v2.0 questions inactive',
       count(*) = 0
FROM public.questions
WHERE active AND bank_version = 'v2.0'
UNION ALL
SELECT 'v2.1 split = 108 conceptual / 192 applied',
       count(*) FILTER (WHERE question_type = 'conceptual') = 108
       AND count(*) FILTER (WHERE question_type = 'applied') = 192
FROM public.questions
WHERE active AND bank_version = 'v2.1'
UNION ALL
SELECT 'v2.1 question links = 348',
       count(*) = 348
FROM public.question_axis_links l
JOIN public.questions q ON q.id = l.question_id
WHERE q.bank_version = 'v2.1'
UNION ALL
SELECT 'v2.1 primary links = 300',
       count(*) = 300
FROM public.question_axis_links l
JOIN public.questions q ON q.id = l.question_id
WHERE q.bank_version = 'v2.1' AND l.role = 'primary'
UNION ALL
SELECT 'v2.1 tradeoff links = 48',
       count(*) = 48
FROM public.question_axis_links l
JOIN public.questions q ON q.id = l.question_id
WHERE q.bank_version = 'v2.1' AND l.role = 'tradeoff'
UNION ALL
SELECT 'v2.1 metadata = 300',
       count(*) = 300
FROM public.question_metadata
WHERE bank_version = 'v2.1'
UNION ALL
SELECT 'all questions have plain-language restatement',
       count(*) = 0
FROM public.questions
WHERE bank_version = 'v2.1' AND text NOT LIKE '%In other words,%'
UNION ALL
SELECT 'explicit assumptions = 152',
       count(*) = 152
FROM public.questions
WHERE bank_version = 'v2.1' AND educational_content LIKE 'Assume that %'
UNION ALL
SELECT 'coverage result column exists',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'survey_results'
           AND column_name = 'response_coverage'
       )
UNION ALL
SELECT 'not-sure count column exists',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'survey_results'
           AND column_name = 'not_sure_count'
       );

-- No rows should be returned by the following diagnostics.

SELECT *
FROM public.axis_pole_balance_audit
WHERE negative_primary <> positive_primary
   OR conceptual_negative <> conceptual_positive
   OR applied_negative <> applied_positive
   OR collision_negative <> collision_positive;

SELECT *
FROM public.collision_pair_coverage
WHERE scenario_count <> 2
   OR same_sign_count <> 1
   OR opposite_sign_count <> 1;

SELECT q.id, count(*) AS primary_links
FROM public.questions q
LEFT JOIN public.question_axis_links l
  ON l.question_id = q.id AND l.role = 'primary'
WHERE q.bank_version = 'v2.1'
GROUP BY q.id
HAVING count(*) <> 1;
