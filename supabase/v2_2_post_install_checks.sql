-- Polyaxis v2.2 post-install verification. Every row should return ok = true.
SELECT 'v2.2 questions' AS check_name, count(*) = 350 AS ok, count(*) AS observed
FROM public.questions WHERE bank_version='v2.2'
UNION ALL
SELECT 'v2.2 active', count(*) = 350, count(*) FROM public.questions WHERE bank_version='v2.2' AND active
UNION ALL
SELECT 'conceptual split', count(*) = 108, count(*) FROM public.questions WHERE bank_version='v2.2' AND question_type='conceptual'
UNION ALL
SELECT 'applied split', count(*) = 242, count(*) FROM public.questions WHERE bank_version='v2.2' AND question_type='applied'
UNION ALL
SELECT 'controversy additions', count(*) = 50, count(*) FROM public.question_metadata WHERE bank_version='v2.2' AND item_family='controversy_stress'
UNION ALL
SELECT 'metadata', count(*) = 350, count(*) FROM public.question_metadata WHERE bank_version='v2.2'
UNION ALL
SELECT 'links', count(*) = 398, count(*)
FROM public.question_axis_links l JOIN public.questions q ON q.id=l.question_id WHERE q.bank_version='v2.2'
UNION ALL
SELECT 'tradeoff links', count(*) = 48, count(*)
FROM public.question_axis_links l JOIN public.questions q ON q.id=l.question_id WHERE q.bank_version='v2.2' AND l.role='tradeoff'
UNION ALL
SELECT 'plain language', count(*) = 350, count(*) FROM public.questions WHERE bank_version='v2.2' AND text LIKE '%In other words,%'
UNION ALL
SELECT 'assumptions', count(*) = 202, count(*) FROM public.questions WHERE bank_version='v2.2' AND educational_content LIKE 'Assume that %';

-- Must return zero rows.
SELECT axis_id,
       count(*) FILTER (WHERE key=-1) AS negative_items,
       count(*) FILTER (WHERE key=1) AS positive_items
FROM public.questions
WHERE bank_version='v2.2'
GROUP BY axis_id
HAVING count(*) FILTER (WHERE key=-1) <> count(*) FILTER (WHERE key=1);

-- Must return one row per axis with balanced keys.
SELECT axis_id,
       count(*) AS total,
       count(*) FILTER (WHERE key=-1) AS negative_items,
       count(*) FILTER (WHERE key=1) AS positive_items
FROM public.questions
WHERE bank_version='v2.2'
GROUP BY axis_id
ORDER BY regexp_replace(axis_id, '\D', '', 'g')::int, axis_id;
