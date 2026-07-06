-- Rollback cấu trúc bảng Phase D1
-- Lệnh sẽ gọi tuần tự DROP để xóa sạch sẽ cấu trúc, không lưu trữ rác.

-- 1. Drop Views
DROP VIEW IF EXISTS v_f13_dim_route;
DROP VIEW IF EXISTS v_f13_dim_bcvh;

-- 2. Drop Indexes (Fact)
DROP INDEX IF EXISTS idx_session_id;
DROP INDEX IF EXISTS idx_tuyen_ngay;
DROP INDEX IF EXISTS idx_bcvh_ngay;
DROP INDEX IF EXISTS idx_ngay_do_kiem;

-- 3. Drop Table Fact
DROP TABLE IF EXISTS f13_fact_buu_gui;

-- 4. Drop Indexes (Import Session)
DROP INDEX IF EXISTS idx_session_status;
DROP INDEX IF EXISTS idx_session_ngay;

-- 5. Drop Table Import Session
DROP TABLE IF EXISTS f13_import_sessions;
