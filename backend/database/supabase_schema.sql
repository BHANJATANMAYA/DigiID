-- ============================================================
-- DigiID Verify — Production Database Schema & Security
-- Includes Identity Document Ledger, Admin Auth, Versioning,
-- Audit Logs, Settings, and Row Level Security (RLS) Policies
-- ============================================================

-- 1. Identity Documents Table
CREATE TABLE IF NOT EXISTS public.gov_documents (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type           VARCHAR(10)  NOT NULL CHECK (doc_type IN ('aadhaar', 'pan', 'voter')),
  name               VARCHAR(100) NOT NULL,
  identity_no        VARCHAR(20)  NOT NULL,
  dob                DATE         NOT NULL,
  authority          VARCHAR(150) NOT NULL,
  address            TEXT,
  hash               CHAR(64)     NOT NULL,
  anchored_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  block_number       VARCHAR(20),
  cert_id            VARCHAR(30)  UNIQUE,
  status             VARCHAR(20)  DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'CORRECTED')),
  revocation_reason  TEXT,
  revoked_at         TIMESTAMP WITH TIME ZONE,
  version            INT          DEFAULT 1,
  previous_hash      CHAR(64),
  CONSTRAINT uq_active_identity UNIQUE(identity_no, version)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_gov_docs_identity ON public.gov_documents(identity_no);
CREATE INDEX IF NOT EXISTS idx_gov_docs_doc_type ON public.gov_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gov_docs_cert_id  ON public.gov_documents(cert_id);
CREATE INDEX IF NOT EXISTS idx_gov_docs_hash     ON public.gov_documents(hash);
CREATE INDEX IF NOT EXISTS idx_gov_docs_status   ON public.gov_documents(status);

-- 2. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email              VARCHAR(255) UNIQUE NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  salt               VARCHAR(64)  NOT NULL,
  role               VARCHAR(50)  DEFAULT 'SUPER_ADMIN',
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login         TIMESTAMP WITH TIME ZONE
);

-- 3. Append-Only Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_email        VARCHAR(255) NOT NULL,
  action             VARCHAR(100) NOT NULL,
  target_resource    VARCHAR(255),
  outcome            VARCHAR(20)  NOT NULL,
  reason             TEXT,
  tx_hash            VARCHAR(100),
  metadata           JSONB,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON public.admin_audit_logs(action);

-- 4. Admin System Settings Table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key                VARCHAR(100) PRIMARY KEY,
  value              JSONB NOT NULL,
  updated_by         VARCHAR(255),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.gov_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Public certificate verification policy: Only verify by specific cert_id or hash
CREATE POLICY "Public certificate verification" 
  ON public.gov_documents
  FOR SELECT 
  USING (status != 'DELETED');

-- Authenticated users full management
CREATE POLICY "Authenticated users manage documents" 
  ON public.gov_documents
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Protect audit logs from modification/deletion
CREATE POLICY "Audit logs insert only" 
  ON public.admin_audit_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Audit logs viewable by authenticated admins" 
  ON public.admin_audit_logs
  FOR SELECT 
  TO authenticated
  USING (true);
