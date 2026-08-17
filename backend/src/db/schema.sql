-- 1. sys_kpi_thresholds
CREATE TABLE IF NOT EXISTS sys_kpi_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_name VARCHAR(50) NOT NULL,
    min_value REAL,
    max_value REAL,
    color_code VARCHAR(20)
);

-- Insert default thresholds
INSERT INTO sys_kpi_thresholds (level_name, min_value, max_value, color_code) VALUES
('Xanh', 70.0, 100.0, 'green'),
('Hồng', 60.0, 69.99, 'pink'),
('Vàng', 50.0, 59.99, 'yellow'),
('Đỏ', 0.0, 49.99, 'red');

-- 1.1 system_config
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT
);

-- Insert default configurations
INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES
('default_province_code', '53', 'Mã tỉnh mặc định để lấy dữ liệu (53 = Thừa Thiên Huế)'),
('default_province_name', 'Bưu điện Tỉnh Thừa Thiên Huế', 'Tên tỉnh mặc định'),
('enable_national_ranking', 'true', 'Bật/Tắt tính năng hiển thị Xếp hạng toàn quốc');

-- 2. import_log
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    ngay_do_kiem TEXT NOT NULL,
    indicator TEXT DEFAULT 'F1.3',
    source_lane TEXT,
    trigger_source TEXT DEFAULT 'AUTO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED'
    total_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0
);

-- 3. fact_f13
CREATE TABLE IF NOT EXISTS fact_f13 (
    -- System Fields (4)
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Excel Fields (41)
    stt INTEGER,
    ma_bg TEXT NOT NULL,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    dia_ban_phat TEXT,
    ma_bckt_tinh_phat TEXT,
    ten_bckt_tinh_phat TEXT,
    ma_bcvh TEXT NOT NULL,
    ten_bcvh TEXT NOT NULL,
    loai_bc_phat TEXT,
    loai_bg TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    so_hieu_lo TEXT,
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi REAL,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    ma_tuyen TEXT,
    ten_tuyen TEXT,
    loai_tuyen_phat TEXT,
    so_hieu_bd8 TEXT,
    thoi_gian_bckt_tinh_xnd_bd8 DATETIME,
    so_hieu_bd10 TEXT,
    thoi_gian_bd10_xnd_kttp DATETIME,
    thoi_gian_bd10_quet_tms DATETIME,
    thoi_gian_ptc DATETIME,
    thoi_gian_nop_tien DATETIME,
    thoi_gian_thuc_hien_thuc_te_gio REAL,
    ket_qua_f13 TEXT,
    danh_gia_2026 TEXT,
    thoi_gian_chi_tieu TEXT,
    ma_huyen TEXT,
    ten_huyen TEXT,
    ma_phuong_xa_chap_nhan TEXT,
    ten_phuong_xa_chap_nhan TEXT,
    ma_phuong_xa_phat TEXT,
    ten_phuong_xa_phat TEXT,

    -- Constraints
    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

-- Indexes (Pre-existing covering indexes)
CREATE INDEX IF NOT EXISTS idx_f13_date_bcvh_covering ON fact_f13(ngay_do_kiem, ma_bcvh, danh_gia_2026);
CREATE INDEX IF NOT EXISTS idx_f13_date_tuyen_covering ON fact_f13(ngay_do_kiem, ma_tuyen, danh_gia_2026);

-- Indexes (Technical Design 1.3)
CREATE INDEX IF NOT EXISTS idx_ngay_do_kiem ON fact_f13(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_bcvh_ngay ON fact_f13(ma_bcvh, ngay_do_kiem);

-- 4. fact_f13_national
CREATE TABLE IF NOT EXISTS fact_f13_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    ma_tinh_phat TEXT NOT NULL,
    ten_tinh_phat TEXT,
    
    sl_bg_ptc INTEGER DEFAULT 0,
    sl_ptc_nop_tien INTEGER DEFAULT 0,
    sl_bg_bd10 INTEGER DEFAULT 0,
    
    sl_ptc_dung_qd_14h INTEGER DEFAULT 0,
    tl_ptc_dung_qd_14h REAL DEFAULT 0,
    sl_qua_qd_14h INTEGER DEFAULT 0,
    
    sl_ptc_dung_qd_ct INTEGER DEFAULT 0,
    tl_ptc_dung_qd_ct REAL DEFAULT 0,
    sl_qua_qd_ct INTEGER DEFAULT 0,
    tl_qua_qd_ct REAL DEFAULT 0,
    
    sl_chua_du_tt INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,
    sl_phat_ktc INTEGER DEFAULT 0,
    sl_ptc_kxd INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ngay_do_kiem, ma_tinh_phat)
);

-- Indexes for fact_f13_national
CREATE INDEX IF NOT EXISTS idx_f13_nat_ngay ON fact_f13_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f13_nat_tinh_ngay ON fact_f13_national(ma_tinh_phat, ngay_do_kiem);

-- ============================================================
-- NETWORK-MANAGEMENT-001 Phase 1 — Nền tảng
-- Three independent modules: Mạng điểm phục vụ, Mạng đường thư cấp 2,
-- Sơ đồ tuyến phát. No required data linkage between them.
-- Schema only — no business data seeded by this phase.
-- ============================================================

-- 5. network_import_log (shared import-history table across the three modules)
CREATE TABLE IF NOT EXISTS network_import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL CHECK (module IN ('service_point', 'level2_route', 'delivery_route')),
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'REJECTED_DUPLICATE'
    total_records INTEGER DEFAULT 0,
    inserted_records INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_network_import_log_fingerprint ON network_import_log(module, file_fingerprint);

-- 6. network_service_point (Mạng điểm phục vụ)
CREATE TABLE IF NOT EXISTS network_service_point (
    ma_diem TEXT PRIMARY KEY,
    ten_diem TEXT,
    loai_diem TEXT,
    dia_chi TEXT,
    phuong_xa TEXT,
    don_vi_quan_ly TEXT,
    trang_thai TEXT,
    dien_thoai TEXT,
    lat REAL,
    lon REAL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);

-- 7. network_level2_route + network_level2_route_stop (Mạng đường thư cấp 2)
CREATE TABLE IF NOT EXISTS network_level2_route (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    declared_km REAL,
    trips_per_week INTEGER,
    operator TEXT,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);

CREATE TABLE IF NOT EXISTS network_level2_route_stop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    seq INTEGER NOT NULL,
    ma_diem TEXT,
    stop_name TEXT,
    arrival TEXT,
    handling TEXT,
    departure TEXT,
    leg_km REAL,
    note TEXT,
    lat REAL,
    lon REAL,
    FOREIGN KEY(route_id) REFERENCES network_level2_route(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_network_level2_route_stop_route ON network_level2_route_stop(route_id, seq);

-- 8. network_delivery_point (Sơ đồ tuyến phát)
CREATE TABLE IF NOT EXISTS network_delivery_point (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_phat TEXT NOT NULL,
    ma_bcvh TEXT NOT NULL,
    postman_code TEXT NOT NULL,
    bien_so TEXT,
    ma_buu_gui TEXT,
    lat REAL,
    lon REAL,
    status_time TEXT,
    loai_dich_vu TEXT,
    tien_thu_ho REAL,
    route_po_code TEXT,
    thoi_gian_nhap_phat TEXT,
    raw_thoi_gian_nhap_phat TEXT,
    ca_phat TEXT,
    ngay_nhap_phat TEXT,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_delivery_point_query ON network_delivery_point(ngay_phat, ma_bcvh, postman_code);
CREATE INDEX IF NOT EXISTS idx_network_delivery_point_import ON network_delivery_point(ngay_nhap_phat, ma_bcvh, postman_code, ca_phat);

-- ============================================================
-- NETWORK-MANAGEMENT-001 Phase 3 — Import/Export/Rollback foundation
-- ============================================================

-- 9. network_import_session (short-lived preview cache; Confirm never trusts client-echoed data)
CREATE TABLE IF NOT EXISTS network_import_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL CHECK (module IN ('service_point', 'level2_route', 'delivery_route')),
    session_token TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    parsed_payload TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_network_import_session_token ON network_import_session(session_token);
CREATE INDEX IF NOT EXISTS idx_network_import_session_expiry ON network_import_session(expires_at);

-- 10. network_import_snapshot (before-image + operation type per affected row, for Rollback)
CREATE TABLE IF NOT EXISTS network_import_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_log_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    before_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_import_snapshot_log ON network_import_snapshot(import_log_id);

-- network_import_log.rollback_of_import_log_id — on a fresh bootstrap this
-- column is included directly in network_import_log below via ALTER-free
-- CREATE ordering is not possible (network_import_log is defined earlier in
-- this file); recreate_db.js runs this whole script in one exec() pass, so
-- the column is added the same way the live-upgrade migration adds it:
ALTER TABLE network_import_log ADD COLUMN rollback_of_import_log_id INTEGER REFERENCES network_import_log(id);

-- Locked tuyến-phát row key, now DB-enforced. Safe unconditionally here
-- because schema.sql only runs against a fresh/empty database
-- (recreate_db.js); the live-database upgrade path in
-- migrate_network_management_001_phase3_schema.js additionally pre-flights
-- for existing violations before creating this same index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_network_delivery_point_unique_key ON network_delivery_point(ma_buu_gui, ngay_phat, route_po_code);

-- ============================================================
-- NETWORK-MANAGEMENT-001 Phase 4 — Sơ đồ tuyến phát data
-- contract remediation (PO-approved, 2026-08-06)
-- ============================================================

-- network_import_archive: one row per successfully-Confirmed Import,
-- recording where the original raw source file was archived on disk. No
-- retention/expiry logic — rows/files are never auto-deleted.
CREATE TABLE IF NOT EXISTS network_import_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_log_id INTEGER NOT NULL,
    module TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    declared_period TEXT,
    actual_period_months TEXT,
    archived_path TEXT NOT NULL,
    uploaded_by TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_import_archive_log ON network_import_archive(import_log_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_network_import_archive_fingerprint ON network_import_archive(module, file_fingerprint);

-- ============================================================
-- F41-PHASE-1 - HUE row-level data foundation
-- Additive only. TCT aggregate lane is not part of this phase.
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_f41 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    ma_huyen_phat TEXT,
    ten_huyen_phat TEXT,
    dia_ban_phat TEXT,
    ma_bc_phat TEXT,
    ten_bc_phat TEXT,
    loai_bcp TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    ma_bg TEXT NOT NULL,
    so_hieu_lo TEXT,
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    so_hieu_bd10_xnd_bcp TEXT,
    thoi_gian_bcp_xnd_bd10 TEXT,
    thoi_gian_bd10_quet_xuong_bcp TEXT,
    so_hieu_bd8_xnd_bcp TEXT,
    thoi_gian_bcp_xnd_bd8 TEXT,
    thoi_gian_xnd_bd1 TEXT,
    thoi_gian_ptc TEXT,
    thoi_gian_nop_tien TEXT,
    thoi_gian_tms_xnd_bcp TEXT,
    thoi_gian_khong_tms_thuc_hien_ptc TEXT,
    thoi_gian_co_tms_thuc_hien_ptc TEXT,
    thoi_gian_khong_tms_thuc_hien_pld TEXT,
    thoi_gian_co_tms_thuc_hien_pld TEXT,
    thoi_gian_chuyen_hoan TEXT,
    danh_gia_12_5h TEXT,
    danh_gia_72h TEXT,
    thoi_gian_phat_thanh_cong_lan_dau TEXT,
    danh_gia_khong_tms_ptc_8h TEXT,
    danh_gia_co_tms_ptc_8h TEXT,
    danh_gia_khong_tms_ptc_lan_dau_8h TEXT,
    danh_gia_co_tms_ptc_lan_dau_8h TEXT,

    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_f41_date ON fact_f41(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f41_date_bcvh_eval ON fact_f41(ngay_do_kiem, ma_bc_phat, danh_gia_co_tms_ptc_8h);
CREATE INDEX IF NOT EXISTS idx_f41_bcvh_date ON fact_f41(ma_bc_phat, ngay_do_kiem);

-- ============================================================
-- F41-PHASE-2 - National aggregate Import foundation
-- Additive only. Populated only by deliberate F4.1 TCT Import.
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_f41_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_don_vi TEXT NOT NULL,
    ten_don_vi TEXT,
    ma_huyen TEXT,
    ten_huyen TEXT,
    ma_bc TEXT,
    ten_bc TEXT,
    loai_bc TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    sl_ptc_nop_tien_ch INTEGER DEFAULT 0,
    sl_ptc_nop_tien INTEGER DEFAULT 0,
    tl_ptc_nop_tien REAL DEFAULT 0,
    sl_dung_12_5h INTEGER DEFAULT 0,
    tl_dung_12_5h REAL DEFAULT 0,
    sl_dung_72h INTEGER DEFAULT 0,
    tl_dung_72h REAL DEFAULT 0,
    sl_qua_12_5h INTEGER DEFAULT 0,
    tl_qua_12_5h REAL DEFAULT 0,
    sl_qua_72h INTEGER DEFAULT 0,
    tl_qua_72h REAL DEFAULT 0,
    sl_chua_du_thong_tin INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,
    sl_chuyen_hoan INTEGER DEFAULT 0,
    tl_chuyen_hoan REAL DEFAULT 0,
    sl_ptc_8h_xnd_bd1 INTEGER DEFAULT 0,
    tl_ptc_8h_xnd_bd1 REAL DEFAULT 0,
    sl_ptc_8h_co_tms INTEGER DEFAULT 0,
    tl_ptc_8h_co_tms REAL DEFAULT 0,
    sl_bucket_12h INTEGER DEFAULT 0,
    sl_bucket_14h INTEGER DEFAULT 0,
    sl_bucket_16h INTEGER DEFAULT 0,
    sl_bucket_36h INTEGER DEFAULT 0,
    sl_bucket_36h_plus INTEGER DEFAULT 0,
    sl_ptc_8h_lan_dau_xnd_bd1 INTEGER DEFAULT 0,
    tl_ptc_8h_lan_dau_xnd_bd1 REAL DEFAULT 0,
    sl_ptc_8h_lan_dau_co_tms INTEGER DEFAULT 0,
    tl_ptc_8h_lan_dau_co_tms REAL DEFAULT 0,

    UNIQUE(ngay_do_kiem, ma_don_vi),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_f41_nat_ngay ON fact_f41_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f41_nat_don_vi_ngay ON fact_f41_national(ma_don_vi, ngay_do_kiem);
