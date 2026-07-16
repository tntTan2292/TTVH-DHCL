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
