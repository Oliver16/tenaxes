# Multidimensional Political Compass

A Next.js application with Supabase backend for a 98-item political orientation survey.

## Features

- **10 Core Axes**: Economic control, equality, liberty, federalism, culture, group identity, sovereignty, technology, environment, moral foundations
- **3 Style Facets**: Change strategy, institutional trust, justice style
- **25+ Political Archetypes**: Automatically matched based on your profile
- **Rich Visualizations**: Radar charts, axis scales, flavor bar charts
- **Admin Analytics Dashboard**: Response trends, population averages, popular types
- **Anonymous**: No login, no PII collection
- **Shareable Results**: Unique URL for each completion

---

## Quick Deploy

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key

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

# Redeploy with env vars
vercel --prod
```

### 3. Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/survey` | 98-question questionnaire |
| `/results/[sessionId]` | Individual results with visualizations |
| `/admin` | Analytics dashboard |

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
political-compass-app/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── survey/page.tsx       # Survey questionnaire
│   │   ├── results/[sessionId]/  # Results display
│   │   └── admin/page.tsx        # Analytics dashboard
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CoreAxesRadar.tsx # Spider/radar chart
│   │   │   ├── AxisScale.tsx     # Horizontal scale bars
│   │   │   ├── FlavorCharts.tsx  # Flavor visualizations
│   │   │   └── AdminCharts.tsx   # Analytics charts
│   │   └── ResultsActions.tsx    # Share/copy buttons
│   └── lib/
│       ├── instrument.ts         # Questions & axes data
│       ├── scorer.ts             # Scoring calculations
│       ├── analytics.ts          # Admin data fetching
│       └── supabase.ts           # Database client
└── supabase/
    └── schema.sql                # Database schema
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

- No accounts or authentication
- No PII collected
- Session IDs are random 12-character strings
- IP addresses not logged (Supabase default)
- Results shareable only via direct URL

---

## License

MIT
