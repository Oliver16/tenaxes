# Migrating to a New Supabase Project

Runbook for standing up a fresh Supabase database (e.g. when a free-tier
project is paused or expiring) and moving existing data across.

> **Why this exists:** the old documented path (`schema.sql` + seeds) has
> been broken for fresh installs for a while — `schema.sql` references an
> `axes` table it never creates, three files fight over
> `question_axis_links`, and the historical link migration contains a
> duplicate-key bug. `supabase/fresh_install.sql` replaces all of that:
> the current file installs the v2.2 comprehensive bank
> (18 constructs, 350 questions, 398 links, 48 collision scenarios,
> semantic coverage metadata), the private `result_ai_analyses` table,
> and built-in validation DO blocks
> that abort the transaction if any count or pole-balance invariant
> fails.

## 1. Create the new project

Create a new project at [supabase.com](https://supabase.com). Save the
database password. From **Settings → API**, note the new Project URL,
`anon` key, and `service_role` key.

## 2. Install the schema and question bank

Open **SQL Editor**, paste the entire contents of
`supabase/fresh_install.sql`, and run it once.

Do **not** also run `schema.sql`, the seed files, or the migrations —
`fresh_install.sql` contains the complete current state (tables, RLS
policies, functions, triggers, views, all 18 constructs, all 350 questions,
all 398 question-axis links, and the server-only AI analysis cache).

The AI table has row-level security enabled with no client policies. Its
`anon` and `authenticated` privileges are revoked; only service-role server
routes generate or retrieve analyses.

### Upgrading a live v2.1 database to v2.2

Run `supabase/migrations/20260717140000_v2_2_controversy_expansion.sql`
once in the SQL Editor (requires the v2.1 migration to have run first).
It carries the 300 v2.1 questions forward as v2.2 rows, appends the 50
controversy-stress items (database IDs 901-950), duplicates all links
and metadata, deactivates earlier banks without deleting them, and
switches defaults to v2.2. The transaction validates its own counts and
aborts on any mismatch. Afterwards run
`supabase/v2_2_post_install_checks.sql` to verify.

### Adding AI analysis to a live v2.2 database

After the v2.2 migration succeeds, run
`supabase/migrations/20260717180000_add_result_ai_analysis.sql` once. It creates
the `result_ai_analyses` table, completed-cache and pending-request uniqueness
guards, foreign keys, and private RLS posture. It does not modify response,
score, question-bank, coverage, or collision data.

Apply migrations in this order when upgrading from v2.1:

1. `20260717140000_v2_2_controversy_expansion.sql`
2. `v2_2_post_install_checks.sql`
3. `20260717180000_add_result_ai_analysis.sql`
4. `ai_analysis_post_install_checks.sql`

### Upgrading a live v2.0 database to v2.1

Run `supabase/migrations/20260717060000_v2_1_comprehension_revision.sql`
once in the SQL Editor. It inserts the v2.1 bank as question IDs 301-600,
deactivates (without deleting) v2.0, switches bank-version defaults to
v2.1, adds `survey_results.response_coverage` / `not_sure_count`, and
makes versioned question text publicly readable so anonymous historical
result pages can still load inactive v2.0 items. The transaction
validates its own counts and aborts on any mismatch. Afterwards run
`supabase/v2_1_post_install_checks.sql` to verify.

### Already provisioned from an older `fresh_install.sql`?

Databases created before 2026-07-17 carry a recursive
`"Admins can view all profiles"` RLS policy on `profiles`. Any read whose
policy sub-selects `profiles` (including the anonymous survey submit, which
joins `question_axis_links`) then fails with
`42P17: infinite recursion detected in policy for relation "profiles"` and
returns a 500. Fix a live project by running
`supabase/migrations/20260717000000_fix_profiles_recursion_in_fresh_install.sql`
once in the SQL Editor — it drops the recursive policy and leaves the
non-recursive self-policies in place. Fresh installs from the current
`fresh_install.sql` are already correct.

## 3. Migrate response data (optional)

Two tables hold the source result data: `survey_responses` and
`survey_results`. If the AI feature has been used, `result_ai_analyses` holds
derived reports, minimized context, and generation provenance. Everything else
(questions, links, axes) is content that `fresh_install.sql` already installed.

Get both connection strings from each project's **Settings → Database →
Connection string** (URI form), then:

```bash
OLD="postgresql://postgres:<old-password>@db.<old-ref>.supabase.co:5432/postgres"
NEW="postgresql://postgres:<new-password>@db.<new-ref>.supabase.co:5432/postgres"

pg_dump "$OLD" --data-only \
  --table=public.survey_responses \
  --table=public.survey_results \
  --table=public.result_ai_analyses \
  > polyaxis_data.sql

psql "$NEW" -f polyaxis_data.sql
```

Omit the `result_ai_analyses` line when the old database predates the AI
migration or when historical generated reports should not be retained. Import
order matters because analyses reference `survey_results(session_id)` and
refined rows may reference a provisional parent; a `pg_dump` archive/restore is
preferred for a large dataset because it preserves dependency ordering.

> Old stored results migrate as-is and are automatically upgraded on
> view: the results page recomputes tensions from raw responses, and the
> archetype page rebuilds matches from raw scores, so historical
> sessions get the current methodology for free.

### If some results belong to logged-in users

`survey_responses.user_id`, `survey_results.user_id`, and (when present)
`result_ai_analyses.user_id` reference `auth.users`, so rows with a non-null
`user_id` will fail the import
unless those auth users exist first. Two options:

- **Migrate auth users first** (preserves logins and the linkage): use
  the Supabase CLI — `supabase db dump --db-url "$OLD" -f roles.sql
  --role-only` is not enough for auth; the supported route is
  **Database → Backups** restore, or the
  [auth admin API](https://supabase.com/docs/reference/javascript/auth-admin-listusers)
  to re-create users with the *same UUIDs*. Migrate `profiles` the same
  way as the data tables afterward (it carries the `is_admin` flags).
- **Or detach the results from accounts** (fine for mostly-anonymous
  data). On the NEW database, before importing:

  ```sql
  ALTER TABLE survey_responses DROP CONSTRAINT survey_responses_user_id_fkey;
  ALTER TABLE survey_results  DROP CONSTRAINT survey_results_user_id_fkey;
  ALTER TABLE result_ai_analyses DROP CONSTRAINT result_ai_analyses_user_id_fkey;
  ```

  Import, then:

  ```sql
  UPDATE survey_responses SET user_id = NULL
    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
  UPDATE survey_results  SET user_id = NULL
    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
  UPDATE result_ai_analyses SET user_id = NULL
    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

  ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE survey_results  ADD CONSTRAINT survey_results_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE result_ai_analyses ADD CONSTRAINT result_ai_analyses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  ```

Skip the `result_ai_analyses` statements when that table is not being migrated.

## 4. Point the app at the new project

Update the environment variables everywhere they live:

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel project env + local `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel project env + local `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel project env (used by the admin API routes) |

The optional AI feature also needs `AI_ANALYSIS_ENABLED`, provider/model
selection, and one provider API key. See `.env.example` and
`docs/ai-analysis.md`; none of the provider or service-role keys may use a
`NEXT_PUBLIC_` prefix.

Redeploy after changing Vercel env vars (they are baked in at build
time for `NEXT_PUBLIC_*`).

## 5. Verify

Run in the new project's SQL Editor — every row must say `t`:

```sql
SELECT 'questions'   AS chk, count(*) = 350 AS ok FROM questions WHERE active
UNION ALL SELECT 'split 108/242',
  count(*) FILTER (WHERE question_type='conceptual') = 108 AND
  count(*) FILTER (WHERE question_type='applied')   = 242 FROM questions WHERE active
UNION ALL SELECT 'axes',          count(*) = 18  FROM axes
UNION ALL SELECT 'links',         count(*) = 398 FROM question_axis_links
UNION ALL SELECT 'link roles',    count(DISTINCT role) = 2 FROM question_axis_links
UNION ALL SELECT 'collisions',    count(*) = 48 FROM question_axis_links WHERE role='tradeoff'
UNION ALL SELECT 'C10 split',     bool_and(name = 'Moral Objectivity') FROM axes WHERE id='C10'
UNION ALL SELECT 'C11 present',   count(*) = 1 FROM axes WHERE id='C11'
UNION ALL SELECT 'F7 force',      bool_and(name = 'Force & Peace') FROM axes WHERE id='F7'
UNION ALL SELECT 'metadata',      count(*) = 350 FROM question_metadata
UNION ALL SELECT 'views',         count(*) = 18 FROM axis_weight_audit
UNION ALL SELECT 'auth trigger',  count(*) = 1 FROM pg_trigger WHERE tgname='on_auth_user_created'
UNION ALL SELECT 'no recursive profiles policy',
  count(*) = 0 FROM pg_policies
  WHERE schemaname='public' AND tablename='profiles' AND qual ILIKE '%FROM profiles%';
```

Verify the private AI cache separately:

```sql
SELECT 'AI table exists' AS chk,
       to_regclass('public.result_ai_analyses') IS NOT NULL AS ok
UNION ALL
SELECT 'AI RLS enabled', relrowsecurity
  FROM pg_class
 WHERE oid = 'public.result_ai_analyses'::regclass
UNION ALL
SELECT 'AI has no client policies', count(*) = 0
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'result_ai_analyses'
UNION ALL
SELECT 'AI cache indexes', count(*) = 5
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'result_ai_analyses'
   AND indexname IN (
     'idx_result_ai_analyses_session_created',
     'idx_result_ai_analyses_status',
     'idx_result_ai_analyses_session_completed',
     'uq_result_ai_analysis_cache',
     'uq_result_ai_analysis_pending'
   );
```

Then smoke-test the app: `/survey` should load 350 questions, a
submission should produce a results page with tensions and archetypes,
and `/admin/validation` should render (after making your account admin:
`UPDATE profiles SET is_admin = true WHERE email = '<you>';`).

With `AI_ANALYSIS_ENABLED=false`, deterministic result pages should still work
and no provider request should occur. When enabling it, verify explicit consent,
one generated report, a cached reload with no second charge, and a refinement
that creates a separate linked row.

## 6. Avoid the next expiry

Free-tier Supabase projects pause after inactivity and can be deleted
after prolonged pausing. Cheap insurance: a weekly GitHub Action that
runs the `pg_dump` from step 3 and stores the artifact, so respondent
data is never hostage to project lifecycle again.
