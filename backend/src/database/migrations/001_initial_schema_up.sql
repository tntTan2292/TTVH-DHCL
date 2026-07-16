-- Khởi tạo cấu trúc bảng cho Phase D1 - F1.3
-- Tuyệt đối không chứa Business Logic, Trigger, Stored Procedure theo đúng Out of Scope.

-- 1. Table: f13_import_sessions
CREATE TABLE IF NOT EXISTS f13_import_sessions (
    session_id TEXT PRIMARY KEY,
    ngay_do_kiem TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index cho f13_import_sessions
CREATE INDEX IF NOT EXISTS idx_session_ngay ON f13_import_sessions(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_session_status ON f13_import_sessions(status);

-- 2. Table: f13_fact_buu_gui
CREATE TABLE IF NOT EXISTS f13_fact_buu_gui (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    ngay_do_kiem TEXT NOT NULL,
    ma_bg TEXT NOT NULL,
    ma_bcvh TEXT,
    ten_bcvh TEXT,
    ma_tuyen TEXT,
    ten_tuyen TEXT,
    ket_qua_f13 TEXT,
    thoi_gian_ptc TEXT,
    thoi_gian_nop_tien TEXT,
    extended_data TEXT, -- Lưu dữ liệu 41 cột dạng chuỗi JSON
    FOREIGN KEY(session_id) REFERENCES f13_import_sessions(session_id) ON DELETE CASCADE,
    UNIQUE(ma_bg, ngay_do_kiem)
);

-- Index cho f13_fact_buu_gui để tối ưu phân tích đa chiều
CREATE INDEX IF NOT EXISTS idx_ngay_do_kiem ON f13_fact_buu_gui(ngay_do_kiem, danh_gia_2026);
CREATE INDEX IF NOT EXISTS idx_bcvh_ngay ON f13_fact_buu_gui(ngay_do_kiem, ma_bcvh, danh_gia_2026);
CREATE INDEX IF NOT EXISTS idx_tuyen_ngay ON f13_fact_buu_gui(ngay_do_kiem, ma_bcvh, ma_tuyen, danh_gia_2026);
CREATE INDEX IF NOT EXISTS idx_session_id ON f13_fact_buu_gui(session_id);

-- 3. View: v_f13_dim_bcvh
-- Ánh xạ dẫn nguồn từ DATABASE_DESIGN_v1.0 (Trích xuất Dimension từ Fact)
CREATE VIEW IF NOT EXISTS v_f13_dim_bcvh AS
SELECT DISTINCT ma_bcvh, ten_bcvh
FROM f13_fact_buu_gui
WHERE ma_bcvh IS NOT NULL;

-- 4. View: v_f13_dim_route
CREATE VIEW IF NOT EXISTS v_f13_dim_route AS
SELECT DISTINCT ma_tuyen, ten_tuyen, ma_bcvh
FROM f13_fact_buu_gui
WHERE ma_tuyen IS NOT NULL;
