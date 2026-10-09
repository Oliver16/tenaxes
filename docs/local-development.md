# Local Development

Run Polyaxis entirely on your machine, against a local Supabase stack,
so changes can be built and tested without touching the live database.

## Prerequisites

- **Node.js 22.3 or newer.** `.nvmrc` pins 22, so `nvm use` picks it up.
- **Docker** (Docker Desktop, OrbStack, or Colima) must be running. The Supabase CLI runs Postgres, Auth, REST and Studio as containers.
- You don't need to install the Supabase CLI. The npm scripts run a pinned version (`supabase@2.120.0`) through `npx`.

## First run

```bash
git clone https://github.com/Oliver16/tenaxes.git && cd tenaxes
npm install
npm run db:start   # starts Supabase and writes .env.development.local
npm run db:admin   # creates admin@polyaxis.local / polyaxis-admin
npm run dev        # http://localhost:3000
```

The first `db:start` takes a few minutes because it pulls the Docker images. It builds the database from `supabase/fresh_install.sql`, which gives you:

- 18 axes
- 350 questions in bank v2.2 (published)
- 398 question-axis links
- the roles and every RLS policy

These are the same objects production has.

| Local service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio (table editor, SQL) | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit (catches auth emails such as magic links) | http://127.0.0.1:54324 |

## How the local environment is wired

`npm run db:env` (also run by `db:start`) writes the local URL and keys to `.env.development.local`.

- Next.js loads that file only for `next dev`, and it takes priority over `.env.local`. You can keep production values in `.env.local` without local development ever using them.
- `next build` and `next start` ignore `.env.development.local`.
- Both files are gitignored.
- `db:env` keeps any `AI_ANALYSIS_*` or provider settings you've added to the file.

AI analysis is off by default. To try it locally, add a provider key and model to `.env.development.local` and set `AI_ANALYSIS_ENABLED=true` (see `docs/ai-analysis.md`). Calls go to the real provider and are billed.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run check` | lint, typecheck and unit tests (run this before pushing) |
| `npm test` | unit and route tests only (no DB or network needed) |
| `npm run build` | production build, the same step Vercel runs |
| `npm run db:start` / `db:stop` | start or stop the local Supabase stack (data persists between stops) |
| `npm run db:reset` | wipe the local DB and reinstall it from `fresh_install.sql` (then rerun `db:admin`) |
| `npm run db:status` | show local URLs and keys |
| `npm run db:admin -- email pw` | create or promote a local admin (refuses non-local URLs) |
| `npm run db:security-check` | end-to-end data-access checks (needs `npm run dev` running) |

## Making database changes

`supabase/migrations/` is a historical log of SQL that was applied by hand in the production SQL Editor. It is not replayable: it mixes naming schemes and includes superseded files. For that reason `supabase/config.toml` disables CLI migrations and seeds from `fresh_install.sql`.

> ⚠️ **Do not run `supabase db push` or `supabase link` against production.** The CLI would try to apply the legacy timestamped files in `supabase/migrations/`.

The established workflow for a schema change:

1. Write `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`. Make it idempotent where possible.
2. Mirror the change into `supabase/fresh_install.sql` so new installs stay current. Tests such as `question-bank-revision.test.mjs` and `migration.test.mjs` check this parity for recent migrations.
3. Test it locally:
   ```bash
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/<file>.sql   # upgrade path
   npm run db:reset                                                                                    # fresh-install path
   ```
4. After the PR merges, run the migration once in the production SQL Editor, before or together with the deploy that depends on it.

## From local to production

1. Branch off `main` and develop against the local stack.
2. Run `npm run check && npm run build`.
3. Push the branch and open a PR. The Vercel project (`polyaxis`) is
   connected to this repo: every pushed branch gets a **Preview** deployment
   with its own URL, which is the place to check a change on real
   infrastructure. Previews use the *Preview* environment variables in Vercel,
   and unless those have been pointed elsewhere they share the **production
   Supabase database**. Surveys you submit on a preview therefore land in
   live data. To isolate previews, create a second Supabase project, install
   `fresh_install.sql` there, and set the Preview-scoped
   `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` variables to it.
4. Merge to `main`. Vercel deploys production automatically. Apply any SQL
   migration in the production SQL Editor as described above, and if old
   code can't run against the new schema, apply it immediately before the
   merge. Vercel's *Instant Rollback* reverts the app (not the database) if
   needed.
