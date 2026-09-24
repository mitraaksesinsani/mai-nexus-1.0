-- ============================================================
-- MAI NIMS - Enable RLS pada tabel yang MASIH TERTINGGAL
-- ============================================================
-- Tanggal: 2026-09-23
-- Tabel: consumption_request_approvals, consumption_request_items,
--        consumption_requests, settings, warehouse_projects
-- ============================================================

-- 1. CONSUMPTION_REQUESTS
ALTER TABLE consumption_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on consumption_requests"
  ON consumption_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. CONSUMPTION_REQUEST_ITEMS
ALTER TABLE consumption_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on consumption_request_items"
  ON consumption_request_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. CONSUMPTION_REQUEST_APPROVALS
ALTER TABLE consumption_request_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on consumption_request_approvals"
  ON consumption_request_approvals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. SETTINGS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on settings"
  ON settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. WAREHOUSE_PROJECTS
ALTER TABLE warehouse_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on warehouse_projects"
  ON warehouse_projects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- VERIFIKASI: Pastikan SEMUA tabel sudah rowsecurity = true
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
