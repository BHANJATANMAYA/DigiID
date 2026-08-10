-- DigiID Verify — Supabase Schema & Row Level Security (RLS) Policies

-- 1. Create Documents Table
CREATE TABLE IF NOT EXISTS public.gov_documents (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type     VARCHAR(10)  NOT NULL CHECK (doc_type IN ('aadhaar', 'pan', 'voter')),
  name         VARCHAR(100) NOT NULL,
  identity_no  VARCHAR(20)  NOT NULL UNIQUE,
  dob          DATE         NOT NULL,
  authority    VARCHAR(150) NOT NULL,
  address      TEXT,
  hash         CHAR(64)     NOT NULL,
  anchored_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  block_number VARCHAR(20),
  cert_id      VARCHAR(30)  UNIQUE
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_gov_docs_identity ON public.gov_documents(identity_no);
CREATE INDEX IF NOT EXISTS idx_gov_docs_doc_type ON public.gov_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gov_docs_cert_id  ON public.gov_documents(cert_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.gov_documents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to certificates via cert_id (for verification)
CREATE POLICY "Public certificate verification" 
  ON public.gov_documents
  FOR SELECT 
  USING (true);

-- Policy 2: Allow authenticated users full management access
CREATE POLICY "Authenticated users manage documents" 
  ON public.gov_documents
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);
