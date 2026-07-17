-- Consolidate admin authorization while the application transitions from the
-- legacy profiles.is_admin flag to role-based access control.

BEGIN;

UPDATE public.profiles AS profile
SET is_admin = true,
    updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.user_roles AS user_role
  WHERE user_role.user_id = profile.id
    AND user_role.role_id = 'admin'
);

-- A signed-in user may edit ordinary profile fields, but must never be able to
-- promote themselves by writing profiles.is_admin through PostgREST.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (email, updated_at) ON TABLE public.profiles TO authenticated;

-- Harden SECURITY DEFINER helpers against caller-controlled search_path.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_user_roles(uuid) SET search_path = public;

COMMIT;
