-- Supabase Vault Extension Setup
-- Creates vault schema for secure secrets management
-- Migration: 20260330_create_vault

-- Enable the pgsodium extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA extensions;

-- Create vault schema
CREATE SCHEMA IF NOT EXISTS vault;

-- Create vault.secrets table for storing encrypted secrets
CREATE TABLE IF NOT EXISTS vault.secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    secret TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault.access_log table for audit trail
CREATE TABLE IF NOT EXISTS vault.access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_id UUID REFERENCES vault.secrets(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_by TEXT,
    action TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secrets_name ON vault.secrets(name);
CREATE INDEX IF NOT EXISTS idx_access_log_secret_id ON vault.access_log(secret_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed_at ON vault.access_log(accessed_at);

-- Enable Row Level Security
ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.access_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read secrets" 
    ON vault.secrets FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow service role to manage secrets" 
    ON vault.secrets FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read access logs" 
    ON vault.access_log FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow service role to manage access logs" 
    ON vault.access_log FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION vault.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_secrets_updated_at
    BEFORE UPDATE ON vault.secrets
    FOR EACH ROW
    EXECUTE FUNCTION vault.update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA vault TO authenticated;
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON vault.secrets TO service_role;
GRANT SELECT, INSERT ON vault.access_log TO service_role;
GRANT SELECT ON vault.secrets TO authenticated;
GRANT SELECT ON vault.access_log TO authenticated;

-- Add comments
COMMENT ON SCHEMA vault IS 'Secure vault schema for managing encrypted secrets';
COMMENT ON TABLE vault.secrets IS 'Stores encrypted secrets with metadata';
COMMENT ON TABLE vault.access_log IS 'Audit trail for vault access';
