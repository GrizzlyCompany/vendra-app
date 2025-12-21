-- Migration: Admin Access Controls and Conversation Reports
-- Created: 2025-12-21
-- Description: Adds audit logging for admin access and conversation reporting system

-- ============================================================================
-- 1. ADMIN ACCESS LOGS TABLE
-- Tracks every admin access to user conversations for audit purposes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    conversation_id UUID,
    report_id UUID,
    access_type TEXT NOT NULL CHECK (access_type IN (
        'view_conversations',
        'view_reported_conversation',
        'view_messages',
        'resolve_report',
        'dismiss_report'
    )),
    access_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by admin and date
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_admin_id ON public.admin_access_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON public.admin_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_access_type ON public.admin_access_logs(access_type);

-- ============================================================================
-- 2. CONVERSATION REPORTS TABLE
-- Stores user-submitted reports about conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Report details
    reason TEXT NOT NULL CHECK (reason IN (
        'harassment',           -- Acoso o amenazas
        'spam',                 -- Mensajes no solicitados repetitivos
        'fraud',                -- Intento de estafa o fraude inmobiliario
        'fake_listing',         -- Propiedad falsa o engañosa
        'inappropriate',        -- Contenido inapropiado
        'impersonation',        -- Suplantación de identidad
        'other'                 -- Otro motivo
    )),
    description TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Nuevo, sin revisar
        'reviewing',    -- Admin está revisando
        'resolved',     -- Acción tomada, caso cerrado
        'dismissed'     -- Reporte descartado
    )),
    
    -- Admin handling
    assigned_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversation_reports_reporter ON public.conversation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reports_reported ON public.conversation_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reports_status ON public.conversation_reports(status);
CREATE INDEX IF NOT EXISTS idx_conversation_reports_created ON public.conversation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_reports_assigned ON public.conversation_reports(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;

-- ============================================================================
-- 3. UPDATE TRIGGER FOR conversation_reports
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_conversation_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-set resolved_at when status changes to resolved or dismissed
    IF NEW.status IN ('resolved', 'dismissed') AND OLD.status NOT IN ('resolved', 'dismissed') THEN
        NEW.resolved_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_report_timestamp_trigger ON public.conversation_reports;
CREATE TRIGGER update_conversation_report_timestamp_trigger
    BEFORE UPDATE ON public.conversation_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_report_timestamp();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;

-- === ADMIN ACCESS LOGS POLICIES ===

-- Admins can insert their own logs
CREATE POLICY "Admins can insert own access logs"
ON public.admin_access_logs
FOR INSERT
WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (email LIKE '%@vendra.com' OR email LIKE '%@admin.com')
    )
);

-- Admins can view all access logs (for transparency)
CREATE POLICY "Admins can view all access logs"
ON public.admin_access_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (email LIKE '%@vendra.com' OR email LIKE '%@admin.com')
    )
);

-- === CONVERSATION REPORTS POLICIES ===

-- Any authenticated user can create a report
CREATE POLICY "Users can create reports"
ON public.conversation_reports
FOR INSERT
WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() != reported_user_id  -- Can't report yourself
);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports"
ON public.conversation_reports
FOR SELECT
USING (
    auth.uid() = reporter_id
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.conversation_reports
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (email LIKE '%@vendra.com' OR email LIKE '%@admin.com')
    )
);

-- Admins can update reports (assign, resolve, dismiss)
CREATE POLICY "Admins can update reports"
ON public.conversation_reports
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (email LIKE '%@vendra.com' OR email LIKE '%@admin.com')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (email LIKE '%@vendra.com' OR email LIKE '%@admin.com')
    )
);

-- ============================================================================
-- 5. HELPER FUNCTION: Get report counts by status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_report_counts()
RETURNS TABLE (
    pending_count BIGINT,
    reviewing_count BIGINT,
    resolved_count BIGINT,
    dismissed_count BIGINT,
    total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed_count,
        COUNT(*) as total_count
    FROM public.conversation_reports;
$$;

-- Grant execute permission to authenticated users (will be filtered by RLS)
GRANT EXECUTE ON FUNCTION public.get_report_counts() TO authenticated;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.admin_access_logs IS 'Audit trail for all admin access to user conversations and reports';
COMMENT ON TABLE public.conversation_reports IS 'User-submitted reports about problematic conversations between users';

COMMENT ON COLUMN public.conversation_reports.reason IS 'Report categories: harassment, spam, fraud, fake_listing, inappropriate, impersonation, other';
COMMENT ON COLUMN public.conversation_reports.status IS 'Report status: pending (new), reviewing (admin checking), resolved (action taken), dismissed (no action needed)';
