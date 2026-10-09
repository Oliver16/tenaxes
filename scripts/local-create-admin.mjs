// Create (or promote) an admin account on the LOCAL Supabase stack.
//
//   npm run db:admin                         # admin@polyaxis.local / polyaxis-admin
//   npm run db:admin -- you@example.com pw   # custom credentials
//
// Refuses to run against anything but localhost so it can never touch prod.
import { createClient } from '@supabase/supabase-js'

try { process.loadEnvFile('.env.development.local') } catch {
  console.error('Missing .env.development.local. Run: npm run db:env')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set in .env.development.local')
  process.exit(1)
}
const { hostname } = new URL(url)
if (!['127.0.0.1', 'localhost'].includes(hostname)) {
  console.error(`Refusing to create an admin on non-local Supabase (${hostname}).`)
  process.exit(1)
}

const [email = 'admin@polyaxis.local', password = 'polyaxis-admin'] = process.argv.slice(2)
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

let userId
const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
if (created.error) {
  // Already exists: look the user up and just (re)promote it.
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (error || !data) {
    console.error(`Could not create or find ${email}: ${created.error.message}`)
    process.exit(1)
  }
  userId = data.id
} else {
  userId = created.data.user.id
}

// Admin checks read both flags (src/lib/admin-auth.ts) and RLS policies read
// profiles.is_admin, so set both, as /api/admin/users does.
const profile = await supabase.from('profiles').update({ is_admin: true }).eq('id', userId)
const role = await supabase.from('user_roles')
  .upsert({ user_id: userId, role_id: 'admin' }, { onConflict: 'user_id,role_id' })
for (const { error } of [profile, role]) {
  if (error) {
    console.error(`Failed to grant admin: ${error.message}`)
    process.exit(1)
  }
}

console.log(`Admin ready: ${email} / ${password}  (sign in at http://localhost:3000, then open /admin)`)
