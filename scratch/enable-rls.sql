-- ============================================================
-- MAI NIMS - Enable Row-Level Security (RLS) on ALL tables
-- ============================================================
-- Tanggal: 2026-09-23
-- Tujuan: Memperbaiki kerentanan kritis "rls_disabled_in_public"
--
-- PENTING:
-- - Semua akses data melewati server-side API routes yang menggunakan
--   SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- - Script ini mengaktifkan RLS dan membuat policy yang HANYA mengizinkan
--   akses penuh untuk service_role.
-- - Setelah dijalankan, akses langsung via anon key akan DIBLOKIR.
-- ============================================================

-- 1. USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on projects"
  ON projects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. PROJECT_ACTIVITIES
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on project_activities"
  ON project_activities FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. MATERIAL_MASTERS
ALTER TABLE material_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on material_masters"
  ON material_masters FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. RFCS
ALTER TABLE rfcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on rfcs"
  ON rfcs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. RFC_ITEMS
ALTER TABLE rfc_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on rfc_items"
  ON rfc_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. PURCHASE_ORDERS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on purchase_orders"
  ON purchase_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. PURCHASE_ORDER_ITEMS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on purchase_order_items"
  ON purchase_order_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 9. DELIVERY_ORDERS
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on delivery_orders"
  ON delivery_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 10. DELIVERY_ORDER_ITEMS
ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on delivery_order_items"
  ON delivery_order_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 11. DELIVERY_TRACKING_LOGS
ALTER TABLE delivery_tracking_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on delivery_tracking_logs"
  ON delivery_tracking_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 12. WAREHOUSES
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on warehouses"
  ON warehouses FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 13. INVENTORY_STOCKS
ALTER TABLE inventory_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on inventory_stocks"
  ON inventory_stocks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 14. INVENTORY_TRANSACTIONS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on inventory_transactions"
  ON inventory_transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 15. VENDORS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on vendors"
  ON vendors FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 16. TRANSFERS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on transfers"
  ON transfers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 17. PROJECT_REQUIREMENTS
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on project_requirements"
  ON project_requirements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- VERIFIKASI: Cek semua tabel sudah memiliki RLS aktif
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
