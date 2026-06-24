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

-- 2. import_log
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name VARCHAR(255) NOT NULL,
    ngay_do_kiem DATE NOT NULL,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'SUPERSEDED'
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
    ma_bg VARCHAR(50) NOT NULL,
    ma_tinh_phat VARCHAR(50),
    ten_tinh_phat VARCHAR(255),
    dia_ban_phat VARCHAR(255),
    ma_bckt_tinh_phat VARCHAR(50),
    ten_bckt_tinh_phat VARCHAR(255),
    ma_bcvh VARCHAR(50),
    ten_bcvh VARCHAR(255),
    loai_bc_phat VARCHAR(100),
    loai_bg VARCHAR(100),
    dich_vu VARCHAR(100),
    loai_dv VARCHAR(100),
    nhom_spdv VARCHAR(100),
    ma_spdv VARCHAR(100),
    so_hieu_lo VARCHAR(100),
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi REAL,
    ten_khl VARCHAR(255),
    nhom_khach_hang VARCHAR(255),
    ma_tuyen VARCHAR(50),
    ten_tuyen VARCHAR(255),
    loai_tuyen_phat VARCHAR(100),
    so_hieu_bd8 VARCHAR(100),
    thoi_gian_bckt_tinh_xnd_bd8 DATETIME,
    so_hieu_bd10 VARCHAR(100),
    thoi_gian_bd10_xnd_kttp DATETIME,
    thoi_gian_bd10_quet_tms DATETIME,
    thoi_gian_ptc DATETIME,
    thoi_gian_nop_tien DATETIME,
    thoi_gian_thuc_hien_thuc_te_gio REAL,
    ket_qua_f13 VARCHAR(50),
    danh_gia_2026 VARCHAR(50),
    thoi_gian_chi_tieu VARCHAR(50),
    ma_huyen VARCHAR(50),
    ten_huyen VARCHAR(255),
    ma_phuong_xa_chap_nhan VARCHAR(50),
    ten_phuong_xa_chap_nhan VARCHAR(255),
    ma_phuong_xa_phat VARCHAR(50),
    ten_phuong_xa_phat VARCHAR(255),

    -- Constraints
    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_f13_date_bcvh_covering ON fact_f13(ngay_do_kiem, ma_bcvh, ket_qua_f13);
CREATE INDEX IF NOT EXISTS idx_f13_date_tuyen_covering ON fact_f13(ngay_do_kiem, ma_tuyen, ket_qua_f13);
