-- DigiID Verify — Government ID Documents Schema
-- Drop old student table, create new gov_documents table

DROP TABLE IF EXISTS students;

CREATE TABLE IF NOT EXISTS gov_documents (
  id           SERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_gov_docs_identity ON gov_documents(identity_no);
CREATE INDEX IF NOT EXISTS idx_gov_docs_doc_type ON gov_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gov_docs_cert_id  ON gov_documents(cert_id);

-- ============================================================
-- MIGRATION for existing databases (run once in psql):
-- ============================================================
-- ALTER TABLE gov_documents ADD COLUMN IF NOT EXISTS block_number VARCHAR(20);
-- ALTER TABLE gov_documents ADD COLUMN IF NOT EXISTS cert_id      VARCHAR(30) UNIQUE;
-- CREATE INDEX IF NOT EXISTS idx_gov_docs_cert_id ON gov_documents(cert_id);
