-- Make sure the extensions schema is reachable
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- pg_net does not support ALTER ... SET SCHEMA, so drop + recreate.
-- Safe: pg_net only holds transient HTTP request rows, no app data.
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;