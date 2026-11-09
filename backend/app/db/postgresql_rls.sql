-- ============================================================================
-- PostgreSQL Row-Level Security (RLS) Defense-in-Depth Specification
-- Patent Prior-Art Search Engine
-- ============================================================================
-- Enforced at the database engine level beneath application-level RBAC.
-- Application database role 'patent_app_user' runs without BYPASS RLS.

-- 1. Enable and Force RLS on Tenant-Scoped Tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

ALTER TABLE search_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_executions FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_mappings FORCE ROW LEVEL SECURITY;

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations FORCE ROW LEVEL SECURITY;

ALTER TABLE saved_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_documents FORCE ROW LEVEL SECURITY;

-- 2. Define Tenant Workspace Policies using PostgreSQL Session Variables
-- Connection sessions set 'app.current_workspace_id' and 'app.is_platform_admin'
-- SELECT set_config('app.current_workspace_id', 'ws-xxxx-xxxx', false);

DROP POLICY IF EXISTS tenant_isolation_projects ON projects;
CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL
    USING (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    )
    WITH CHECK (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    );

DROP POLICY IF EXISTS tenant_isolation_searches ON search_executions;
CREATE POLICY tenant_isolation_searches ON search_executions
    FOR ALL
    USING (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    )
    WITH CHECK (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    );

DROP POLICY IF EXISTS tenant_isolation_evidence ON evidence_mappings;
CREATE POLICY tenant_isolation_evidence ON evidence_mappings
    FOR ALL
    USING (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    )
    WITH CHECK (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    );

DROP POLICY IF EXISTS tenant_isolation_annotations ON annotations;
CREATE POLICY tenant_isolation_annotations ON annotations
    FOR ALL
    USING (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    )
    WITH CHECK (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    );

DROP POLICY IF EXISTS tenant_isolation_saved ON saved_documents;
CREATE POLICY tenant_isolation_saved ON saved_documents
    FOR ALL
    USING (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    )
    WITH CHECK (
        workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
        OR NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
    );

-- 3. Public Reference Data (Class 1) is Excluded from RLS
-- Patent documents (patent_documents) remain globally readable across all sessions.
