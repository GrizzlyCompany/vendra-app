-- Fix for specific users that exist in auth.users but not in public.users or public.public_profiles

-- Fix solutionsvendra@gmail.com (91a1add6-b082-4d78-97a8-ff1f096310d7)
INSERT INTO public.users (id, email, name, role, subscription_active)
VALUES (
  '91a1add6-b082-4d78-97a8-ff1f096310d7',
  'solutionsvendra@gmail.com',
  'Felix angel',
  'comprador',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_profiles (id, name, email, role)
VALUES (
  '91a1add6-b082-4d78-97a8-ff1f096310d7',
  'Felix angel',
  'solutionsvendra@gmail.com',
  'comprador'
)
ON CONFLICT (id) DO NOTHING;

-- Fix cricheldelarosa@gmail.com (1626206f-ce62-4ff1-8919-587382b259d6)
INSERT INTO public.users (id, email, name, role, subscription_active)
VALUES (
  '1626206f-ce62-4ff1-8919-587382b259d6',
  'cricheldelarosa@gmail.com',
  'Crichel',
  'comprador',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_profiles (id, name, email, role)
VALUES (
  '1626206f-ce62-4ff1-8919-587382b259d6',
  'Crichel',
  'cricheldelarosa@gmail.com',
  'comprador'
)
ON CONFLICT (id) DO NOTHING;

-- Fix lic.torres23@gmail.com (01e56fe9-5101-4749-8ee6-92c2cfe7c520)
INSERT INTO public.users (id, email, name, role, subscription_active)
VALUES (
  '01e56fe9-5101-4749-8ee6-92c2cfe7c520',
  'lic.torres23@gmail.com',
  'Yoanel de la cruz',
  'vendedor_agente',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_profiles (id, name, email, role)
VALUES (
  '01e56fe9-5101-4749-8ee6-92c2cfe7c520',
  'Yoanel de la cruz',
  'lic.torres23@gmail.com',
  'vendedor_agente'
)
ON CONFLICT (id) DO NOTHING;

-- Verify the fixes
SELECT 
  au.id,
  au.email,
  CASE WHEN pu.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_users,
  CASE WHEN pp.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_profiles
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id
WHERE au.email IN ('solutionsvendra@gmail.com', 'cricheldelarosa@gmail.com', 'lic.torres23@gmail.com')
ORDER BY au.created_at DESC;