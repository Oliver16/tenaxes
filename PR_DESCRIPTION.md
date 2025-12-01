# Add user roles system, fix survey questions documentation, and add debugging

## Summary

This PR addresses three main issues:

1. **Applied Questions Documentation** - Updated README to include the missing `seed_applied.sql` file
2. **User Roles System** - Implemented a comprehensive role-based permission system beyond just `is_admin`
3. **Profile Auto-Creation** - Verified and enhanced the user profile creation trigger
4. **Debugging** - Added console logging to diagnose question loading issues

---

## 1. Applied Questions Documentation

### Problem
- The `seed_applied.sql` file with 52 applied questions existed but was never documented
- README only mentioned `seed.sql`, so users only loaded 98 conceptual questions

### Changes
- ✅ Updated README from "98-item survey" to "150-item survey (98 conceptual + 52 applied)"
- ✅ Added step 5 to setup instructions: "Paste the contents of `supabase/seed_applied.sql`"
- ✅ Documented `question_type` and `weight` fields in Question Properties table
- ✅ Updated project structure to show both seed files

### Files Changed
- `README.md` - Lines 3, 24-25, 66, 121-122, 163-165, 176-177

---

## 2. User Roles System

### Problem
- Only had `is_admin` boolean flag - no granular permissions
- No way to assign roles like moderator, editor, etc.
- No UI to manage user permissions

### Solution
Implemented a complete role-based access control (RBAC) system with:

#### Database Layer
- **`roles` table** - Defines available roles (admin, moderator, user)
- **`user_roles` junction table** - Many-to-many relationship between users and roles
- **RLS policies** - Admins can manage roles, users can view their own
- **Helper functions** - `has_role()`, `get_user_roles()` for easy role checking
- **Updated trigger** - `handle_new_user()` now assigns default 'user' role on signup

#### TypeScript Layer
- **`src/lib/roles.ts`** - New library with role management functions:
  - `getAllRoles()` - Get all available roles
  - `getUserRoles(userId)` - Get a user's roles
  - `hasRole(userId, roleId)` - Check if user has specific role
  - `assignRole()` / `removeRole()` - Manage role assignments
  - `getAllUsersWithRoles()` - Get all users with their roles (admin only)

- **`src/lib/supabase.ts`** - Added TypeScript types:
  - `Role` - Role definition
  - `UserRole` - User-role assignment
  - `Profile` - Updated to include optional `roles[]` array

- **`src/contexts/AuthContext.tsx`** - Enhanced auth context:
  - `roles: Role[]` - Current user's roles
  - `hasRole(roleId)` - Check if current user has a role
  - `isModerator` - Helper for admin or moderator check
  - `isAdmin` - Now checks both `is_admin` flag AND 'admin' role

#### Admin UI
- **`src/app/admin/users/page.tsx`** - New user management page:
  - View all users with their emails and roles
  - Assign roles via dropdown selector
  - Remove roles with click-to-remove badges
  - Color-coded role badges (red=admin, blue=moderator, gray=user)
  - Display all available roles with descriptions

- **`src/app/admin/page.tsx`** - Added "Manage Users" button to admin dashboard

### Files Created
- `supabase/migrations/003_add_roles_system.sql` - Database migration
- `src/lib/roles.ts` - Role management library
- `src/app/admin/users/page.tsx` - User management UI

### Files Modified
- `supabase/schema.sql` - Added roles tables, RLS policies, helper functions
- `src/lib/supabase.ts` - Added Role, UserRole types
- `src/contexts/AuthContext.tsx` - Added roles state and helpers
- `src/app/admin/page.tsx` - Added "Manage Users" button

### How to Use

**1. Run the migration:**
```sql
-- In Supabase SQL Editor, paste contents of:
-- supabase/migrations/003_add_roles_system.sql
```

**2. Assign yourself as admin:**
```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Assign admin role
INSERT INTO user_roles (user_id, role_id)
VALUES ('your-user-id-here', 'admin');
```

**3. Access user management:**
- Navigate to `/admin` → Click "Manage Users"
- Or directly visit `/admin/users`

**4. Use roles in code:**
```typescript
const { roles, hasRole, isAdmin, isModerator } = useAuth()

if (hasRole('admin')) {
  // Admin-only logic
}

if (isModerator) {
  // Admin or moderator logic
}
```

---

## 3. Profile Auto-Creation

### Status
✅ Already working correctly

### Verification
- The `handle_new_user()` trigger at `schema.sql:153-166` automatically creates a profile when a user signs up
- Now also assigns the default 'user' role
- Properly references `auth.users(id)` with CASCADE delete
- Migration `002_consolidate_to_profiles.sql` already consolidated `users` → `profiles`

### Enhanced Trigger
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Debugging Questions Loading

### Problem
Only 98 questions showing up in survey despite 150 being in the database

### Changes
Added console logging to `fetchActiveQuestions()` in `src/lib/questions.ts`:

```typescript
console.log(`Loaded ${data.length} active questions from database`)
console.log('Question types:', data.reduce((acc: any, q: any) => {
  acc[q.question_type] = (acc[q.question_type] || 0) + 1
  return acc
}, {}))
```

### Expected Output (in browser console)
```
Loaded 150 active questions from database
Question types: { conceptual: 98, applied: 52 }
```

If you see a different output, it will help diagnose:
- RLS policy issues
- Database connection problems
- Missing questions in the database

---

## Testing Checklist

- [ ] Run migration `003_add_roles_system.sql` in Supabase SQL Editor
- [ ] Verify all 150 questions are active: `SELECT question_type, active, COUNT(*) FROM questions GROUP BY question_type, active;`
- [ ] Assign yourself admin role
- [ ] Test `/admin/users` page - can you see all users and manage roles?
- [ ] Test survey page - do all 150 questions load? (check browser console)
- [ ] Sign up a new user - do they automatically get a profile and 'user' role?

---

## Migration Notes

**Safe to merge because:**
- All database changes use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`
- Keeps backwards compatibility with `is_admin` boolean
- RLS policies prevent unauthorized access
- Trigger only runs on new user creation
- No breaking changes to existing code

**After merging:**
1. Run the migration in production Supabase
2. Assign admin roles to appropriate users
3. Monitor browser console for question loading logs
4. Remove debugging logs in a future PR if desired

---

## Files Changed

### Created
- `supabase/migrations/003_add_roles_system.sql`
- `src/lib/roles.ts`
- `src/app/admin/users/page.tsx`

### Modified
- `README.md`
- `supabase/schema.sql`
- `src/lib/supabase.ts`
- `src/lib/questions.ts`
- `src/contexts/AuthContext.tsx`
- `src/app/admin/page.tsx`
