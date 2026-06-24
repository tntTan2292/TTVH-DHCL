const xlsx = require('xlsx');

function extractDateFromFilename(filename) {
    // Expected format: F1.3-YYYY.MM.DD.xlsx
    const match = filename.match(/F1\.3-(\d{4})\.(\d{2})\.(\d{2})/i);
    if (!match) {
        throw new Error("Invalid filename format. SSOT constraint failed. Expected 'F1.3-YYYY.MM.DD.xlsx'.");
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseF13Excel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to 2D array to dynamically locate the header row
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
        if (rawData[i].includes('Số hiệu bưu gửi')) {
            headerRowIdx = i;
            break;
        }
    }
    
    if (headerRowIdx === -1) {
        throw new Error("Invalid Excel format. Cannot find column 'Số hiệu bưu gửi'.");
    }

    const headers = rawData[headerRowIdx];
    const rows = rawData.slice(headerRowIdx + 1);

    // Strict Mapping matching 41 Frozen Columns
    const mapping = {
        'STT': 'stt',
        'Số hiệu bưu gửi': 'ma_bg',
        'Mã tỉnh phát': 'ma_tinh_phat',
        'Tên tỉnh phát': 'ten_tinh_phat',
        'Địa bàn phát': 'dia_ban_phat',
        'Mã BCKT Tỉnh phát': 'ma_bckt_tinh_phat',
        'Tên BCKT Tỉnh phát': 'ten_bckt_tinh_phat',
        'Mã BC phát': 'ma_bcvh',
        'Tên BC phát': 'ten_bcvh',
        'Loại BC Phát': 'loai_bc_phat',
        'Loại bg': 'loai_bg',
        'Dịch vụ': 'dich_vu',
        'Loại DV': 'loai_dv',
        'Nhóm SPDV': 'nhom_spdv',
        'Mã SPDV': 'ma_spdv',
        'Số hiệu lô': 'so_hieu_lo',
        'Số tiền COD': 'so_tien_cod',
        'Khối lượng thực tế': 'khoi_luong_thuc_te',
        'Khối lượng quy đổi': 'khoi_luong_quy_doi',
        'Tên KHL': 'ten_khl',
        'Nhóm khách hàng': 'nhom_khach_hang',
        'Mã tuyến phát': 'ma_tuyen',
        'Tên tuyến phát': 'ten_tuyen',
        'Loại tuyến phát': 'loai_tuyen_phat',
        'Số hiệu BĐ8 XNĐ BCKT phát': 'so_hieu_bd8',
        'Thời gian BCKT tỉnh XNĐ BĐ8': 'thoi_gian_bckt_tinh_xnd_bd8',
        'Số hiệu BĐ10 (XNĐ) KT tỉnh phát / đóng đi với Tỉnh có Hub': 'so_hieu_bd10',
        'Thời gian BĐ10 XNĐ KTTP trên BCCP / đóng đi với Tỉnh có Hub': 'thoi_gian_bd10_xnd_kttp',
        'Thời gian BĐ10 quét TMS xuống KT tỉnh phát / quét lên với Tỉnh có Hub': 'thoi_gian_bd10_quet_tms',
        'Thời gian PTC': 'thoi_gian_ptc',
        'Thời gian nộp tiền': 'thoi_gian_nop_tien',
        'Thời gian thực hiện thực tế (giờ)': 'thoi_gian_thuc_hien_thuc_te_gio',
        'Đánh giá (Đạt/Không đạt)': 'ket_qua_f13',
        'Đánh giá 2026 (Đạt/Không đạt)': 'danh_gia_2026',
        'Thời gian chi tiêu': 'thoi_gian_chi_tieu',
        'Mã Huyện': 'ma_huyen',
        'Tên Huyện': 'ten_huyen',
        'Mã Phường Xã Chấp Nhận': 'ma_phuong_xa_chap_nhan',
        'Tên Phường Xã Chấp Nhận': 'ten_phuong_xa_chap_nhan',
        'Mã Phường Xã Phát': 'ma_phuong_xa_phat',
        'Tên Phường Xã Phát': 'ten_phuong_xa_phat'
    };

    const parsedData = [];
    const dbColumnsFound = new Set();
    
    for (const header of headers) {
        if (mapping[header]) dbColumnsFound.add(mapping[header]);
    }

    for (const row of rows) {
        // Skip completely empty rows
        if (!row || row.length === 0 || !row[headers.indexOf('Số hiệu bưu gửi')]) continue;

        const item = {};
        headers.forEach((header, index) => {
            if (mapping[header]) {
                item[mapping[header]] = row[index] !== undefined ? row[index] : null;
            }
        });
        parsedData.push(item);
    }
    
    return {
        parsedData,
        dbColumns: Array.from(dbColumnsFound)
    };
}

module.exports = {
    extractDateFromFilename,
    parseF13Excel
};
