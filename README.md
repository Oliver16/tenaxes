# Polyaxis

A Next.js application with Supabase backend for a 350-item political orientation survey (108 conceptual + 242 applied questions, including 48 deliberate collision scenarios and a 50-item controversy-stress layer). The current bank is **v2.2**, which appends 50 overt, neutrally worded high-conflict items (abortion, economic systems, extreme wealth, reparations, firearms, gender identity, immigration enforcement, capital punishment, nuclear first use) to the v2.1 comprehension revision. From v2.1: every question pairs a technical proposition with a plain-language "In other words" restatement, 152 scenarios carry an explicit "Assume that" premise, and the response scale separates "Neither / genuinely balanced" (scored 0) from "Not sure / need more information" (recorded as null, excluded from scoring). v2.1 is not assumed psychometrically interchangeable with v2.0; results store their bank version.

## Features

- **11 Core Axes**: Economic coordination, distribution & property, liberty & public order, territorial authority, cultural continuity, scope of obligation, sovereignty, technology, ecology, moral objectivity, value structure
- **7 Style Facets**: Change strategy, institutional confidence, justice style, democratic constraint, epistemic authority, democratic mediation, force & peace
- **38 Political Archetypes**: Automatically matched based on your profile
- **48 Collision Scenarios**: 24 mirrored axis pairs that price one value against another
- **Rich Visualizations**: Radar charts, axis scales, flavor bar charts
- **Admin Analytics Dashboard**: Response trends, population averages, popular types
- **Anonymous survey**: No login is required; optional AI context is disclosed and consented to separately
- **Shareable Results**: Unique URL for each completion
- **Optional AI-assisted interpretation**: Consent-based, cached, evidence-linked analysis of commitments, center scores, tensions, possible hypocrisy, low salience, and knowledge gaps

---

## Quick Deploy

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor**
3. Paste the contents of `supabase/fresh_install.sql` and run it once — this installs the complete current state (schema, policies, 18 constructs, 350 questions, all links, semantic coverage metadata, and the private AI analysis cache). Do not run `schema.sql`/seeds/migrations separately for a new project; see `docs/supabase-migration.md` for details and for migrating data from an old project.
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (server-only; required for AI analysis and admin routes)

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_REPO)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy with env vars
vercel --prod
```

### 3. Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional; remains unavailable unless explicitly enabled and configured.
AI_ANALYSIS_ENABLED=false
AI_ANALYSIS_PROVIDER=openai
AI_ANALYSIS_PROMPT_VERSION=v1
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_ANALYSIS_MODEL=
AI_ANALYSIS_MAX_REGENERATIONS=3
AI_ANALYSIS_CONTEXT_MAX_CHARS=2000
RUN_LIVE_AI_EVALS=false
```

Set exactly one selected provider's key/model pair, then change
`AI_ANALYSIS_ENABLED` to `true`. Provider keys and the Supabase service role are
server-only and must never use a `NEXT_PUBLIC_` prefix. See
[`docs/ai-analysis.md`](docs/ai-analysis.md) for architecture, safety,
thresholds, caching, and evaluation.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/survey` | 350-question questionnaire (108 conceptual + 242 applied), resumable across sittings |
| `/results/[sessionId]` | Individual results with visualizations |
| `/results/[sessionId]/analysis` | Optional candid AI-assisted interpretation and refinement |
| `/admin` | Analytics dashboard |
| `/admin/questions` | Question management (add/edit/delete) |

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
polyaxis/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── survey/page.tsx       # Survey questionnaire
│   │   ├── results/[sessionId]/  # Results display
│   │   └── admin/
│   │       ├── page.tsx          # Analytics dashboard
│   │       └── questions/page.tsx # Question manager
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CoreAxesRadar.tsx # Spider/radar chart
│   │   │   ├── AxisScale.tsx     # Horizontal scale bars
│   │   │   ├── FlavorCharts.tsx  # Flavor visualizations
│   │   │   └── AdminCharts.tsx   # Analytics charts
│   │   ├── admin/
│   │   │   ├── QuestionEditor.tsx # Add/edit question form
│   │   │   └── QuestionList.tsx   # Question list with actions
│   │   └── ResultsActions.tsx    # Share/copy buttons
│   └── lib/
│       ├── instrument.ts         # Axis definitions & default questions
│       ├── questions.ts          # Question CRUD operations
│       ├── scorer.ts             # Scoring calculations
│       ├── analytics.ts          # Admin data fetching
│       └── supabase.ts           # Database client
└── supabase/
    ├── schema.sql                # Database schema
    ├── seed.sql                  # Conceptual questions (98 items)
    └── seed_applied.sql          # Applied questions (52 items)
```

---

## Visualizations

### Results Page
- **Radar Chart**: 10-axis spider chart showing overall profile shape
- **Axis Scales**: Gradient bars with position markers for each dimension
- **Flavor Bar Chart**: Horizontal bars comparing archetype matches
- **Expandable Flavor List**: Detailed cards for all matching types

### Admin Dashboard
- **Line Chart**: Daily response volume over 30 days
- **Horizontal Bar Chart**: Population average by axis (red/green for polarity)
- **Flavor Popularity**: Most common archetype matches weighted by rank
- **Recent Sessions**: Quick links to individual results

### Question Manager (`/admin/questions`)
- **Axis Sidebar**: View all core axes and facets with question counts
- **Question Editor**: Add new questions with text and pole direction
- **Question List**: Edit, reorder, activate/deactivate, or delete questions
- **Balance Indicator**: Shows if questions are balanced between poles

---

## Question Management

Questions are stored in Supabase and can be edited without redeploying.

### First-Time Setup

After running `schema.sql`, seed the default questions:

```sql
-- Run in Supabase SQL Editor
-- First, load the 98 conceptual questions
\i seed.sql
-- Or paste contents of supabase/seed.sql

-- Then, load the 52 applied questions
\i seed_applied.sql
-- Or paste contents of supabase/seed_applied.sql
```

### Question Properties

| Field | Description |
|-------|-------------|
| `axis_id` | Which axis (C1-C10, F1-F3) |
| `key` | `-1` = agreement indicates negative pole, `+1` = positive pole |
| `text` | The question statement |
| `display_order` | Order in the survey |
| `active` | Whether to include in survey |
| `question_type` | `'conceptual'` or `'applied'` |
| `weight` | Scoring multiplier (1.0 conceptual, 1.15 applied, 1.25 collision scenarios) |

### Best Practices

1. **Balance poles**: Each axis should have ~equal questions for each pole
2. **Avoid double-barreled**: One concept per question
3. **Clear wording**: Avoid jargon, keep statements simple
4. **Test changes**: Deactivate rather than delete to preserve data

---

## Database Schema

### `survey_responses`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | TEXT | Unique session identifier |
| responses | JSONB | Raw responses `{item_id: value}` |
| created_at | TIMESTAMPTZ | Submission timestamp |

### `survey_results`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | TEXT | Links to responses |
| core_axes | JSONB | Array of axis scores |
| facets | JSONB | Array of facet scores |
| top_flavors | JSONB | Top 5 matching archetypes |
| created_at | TIMESTAMPTZ | Calculation timestamp |

### `result_ai_analyses`

Stores versioned provisional/refined structured reports, their deterministic
signals, cache identity, provider provenance, token/latency metadata, and safe
failure status. It references the bank-pinned result by `session_id`. RLS is
enabled with no browser policies; generation and retrieval are service-role
server operations. Existing v2.2 databases add it with
`supabase/migrations/20260717180000_add_result_ai_analysis.sql`.

---

## Content provenance

- Archetype descriptions and survey questions were authored specifically for this project by the Polyaxis contributors and are original to the repository. No third-party licensed text was incorporated.
- If future updates incorporate external wording or data, include clear attribution (source name, URL, and license) in this section and ensure the license permits reuse within this project.

### Contributor checklist for new archetypes or questions

1. Confirm the text is original or properly licensed for inclusion; record attribution and license details here if external.
2. Keep wording concise, neutral, and free of jargon; avoid double-barreled statements.
3. Maintain balance across axes (similar counts per pole) and verify `axis_id`, `key`, and `display_order` values are consistent with schema expectations.
4. Run through the survey flow locally to ensure new items render correctly and results pages reflect the changes.
5. Update seed data or migration scripts if the additions require database changes.

---

## Analytics Queries

The schema includes views for aggregate analytics:

```sql
-- Daily response counts
SELECT * FROM daily_responses;

-- Average scores by axis
SELECT * FROM aggregate_scores;

-- Most popular flavor matches
SELECT * FROM popular_flavors;
```

Custom queries:

```sql
-- Distribution of a specific axis
SELECT 
  CASE 
    WHEN (axis->>'score')::float < -0.5 THEN 'Strong Left'
    WHEN (axis->>'score')::float < 0 THEN 'Lean Left'
    WHEN (axis->>'score')::float < 0.5 THEN 'Lean Right'
    ELSE 'Strong Right'
  END as bucket,
  COUNT(*) as count
FROM survey_results,
LATERAL jsonb_array_elements(core_axes) as axis
WHERE axis->>'axis_id' = 'C1'
GROUP BY bucket;

-- Correlation between axes (requires tablefunc extension)
SELECT 
  a.session_id,
  (SELECT (ax->>'score')::float FROM jsonb_array_elements(a.core_axes) ax WHERE ax->>'axis_id' = 'C1') as economic_control,
  (SELECT (ax->>'score')::float FROM jsonb_array_elements(a.core_axes) ax WHERE ax->>'axis_id' = 'C3') as coercive_power
FROM survey_results a;
```

---

## Customization

### Adding Questions

Edit `src/lib/instrument.ts`:

```typescript
export const ITEMS: Item[] = [
  // ... existing items
  {
    id: 99,
    order: 99,
    axis: "C1",
    key: 1,  // 1 = agree pushes score positive, -1 = agree pushes negative
    text: "Your new question here."
  }
]
```

### Adding Flavor Archetypes

```typescript
export const FLAVOR_ARCHETYPES: FlavorArchetype[] = [
  // ... existing archetypes
  {
    id: "new_type",
    name: "New Political Type",
    description: "Description of this archetype.",
    color: "#HEX",
    components: [
      { axis: "C1", direction: 1, weight: 1.0 },
      { axis: "F2", direction: -1, weight: 0.5 }
    ]
  }
]
```

---

## API Endpoints (if needed)

The app uses Supabase directly from the client. If you need server-side API routes:

```typescript
// src/app/api/submit/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateScores } from '@/lib/scorer'
import { nanoid } from 'nanoid'

export async function POST(request: Request) {
  const { responses } = await request.json()
  const sessionId = nanoid(12)
  const results = calculateScores(responses)

  await supabase.from('survey_responses').insert({
    session_id: sessionId,
    responses
  })

  await supabase.from('survey_results').insert({
    session_id: sessionId,
    ...results
  })

  return NextResponse.json({ sessionId, results })
}
```

---

## Performance

- **Bundle Size**: ~150KB gzipped (including all question data)
- **Time to Interactive**: <2s on 3G
- **Database**: Indexed queries, typically <50ms

---

## Privacy

- The survey can be completed anonymously; session IDs are random 12-character strings and results are shareable only by direct URL.
- AI analysis is optional, requires explicit consent, and never changes deterministic scores.
- Bank-pinned answers and optional context are sent only to the configured AI provider after consent. Do not enter identifying details in the context field.
- Provider payloads exclude session ID, user ID, email, IP, and auth claims; OpenAI request storage is disabled.
- Provider keys, raw stored context, and the Supabase service role are never exposed to the browser. The AI table has no direct client read/write policy.
- Application logs must not contain full prompts, raw answer maps, provider output, or user context.

---

## License

MIT
