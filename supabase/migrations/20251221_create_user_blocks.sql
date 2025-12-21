-- =====================================================
-- Migración: Crear tabla user_blocks para bloqueo entre usuarios
-- Fecha: 2025-12-21
-- Descripción: Permite a usuarios bloquear a otros usuarios,
--              impidiendo la comunicación entre ellos.
-- =====================================================

-- 1) Crear tabla user_blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- No puede bloquearse a sí mismo
);

-- 2) Habilitar RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 3) Políticas RLS
-- Solo el bloqueador puede ver sus bloqueos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='user_blocks_select_own'
  ) THEN
    CREATE POLICY user_blocks_select_own ON public.user_blocks
      FOR SELECT TO authenticated USING (blocker_id = auth.uid());
  END IF;
END $$;

-- Solo puede insertar bloqueos para sí mismo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='user_blocks_insert_own'
  ) THEN
    CREATE POLICY user_blocks_insert_own ON public.user_blocks
      FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
  END IF;
END $$;

-- Solo puede eliminar sus propios bloqueos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='user_blocks_delete_own'
  ) THEN
    CREATE POLICY user_blocks_delete_own ON public.user_blocks
      FOR DELETE TO authenticated USING (blocker_id = auth.uid());
  END IF;
END $$;

-- 4) Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_pair ON public.user_blocks(blocker_id, blocked_id);

-- 5) Modificar política de INSERT en messages para prevenir mensajes a usuarios bloqueados
-- Primero eliminamos la política existente
DROP POLICY IF EXISTS messages_insert_self ON public.messages;

-- Crear nueva política que verifica bloqueos (falla silenciosamente - el mensaje simplemente no se inserta)
CREATE POLICY messages_insert_self ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = recipient_id AND ub.blocked_id = auth.uid())
         OR (ub.blocker_id = auth.uid() AND ub.blocked_id = recipient_id)
    )
  );

-- 6) Función para verificar estado de bloqueo entre dos usuarios
CREATE OR REPLACE FUNCTION public.check_block_status(other_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i_blocked_them boolean;
  they_blocked_me boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_blocks 
    WHERE blocker_id = auth.uid() AND blocked_id = other_user_id
  ) INTO i_blocked_them;
  
  SELECT EXISTS(
    SELECT 1 FROM public.user_blocks 
    WHERE blocker_id = other_user_id AND blocked_id = auth.uid()
  ) INTO they_blocked_me;
  
  RETURN jsonb_build_object(
    'i_blocked_them', i_blocked_them,
    'they_blocked_me', they_blocked_me,
    'any_block', i_blocked_them OR they_blocked_me
  );
END;
$$;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.check_block_status(uuid) TO authenticated;

-- 7) Función para bloquear usuario
CREATE OR REPLACE FUNCTION public.block_user(user_to_block uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que no se bloquee a sí mismo
  IF user_to_block = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes bloquearte a ti mismo');
  END IF;
  
  -- Insertar el bloqueo
  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), user_to_block)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

-- 8) Función para desbloquear usuario
CREATE OR REPLACE FUNCTION public.unblock_user(user_to_unblock uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_blocks
  WHERE blocker_id = auth.uid() AND blocked_id = user_to_unblock;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- 9) Función para obtener lista de usuarios bloqueados
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  blocked_id uuid,
  blocked_name text,
  blocked_avatar text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ub.blocked_id,
    pp.name as blocked_name,
    pp.avatar_url as blocked_avatar,
    ub.created_at as blocked_at
  FROM public.user_blocks ub
  LEFT JOIN public.public_profiles pp ON pp.id = ub.blocked_id
  WHERE ub.blocker_id = auth.uid()
  ORDER BY ub.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;
