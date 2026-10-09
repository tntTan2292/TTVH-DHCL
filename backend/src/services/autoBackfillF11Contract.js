'use strict';

// F11-PHASE-3 - executor identities for F1.1 (toan trinh noi tinh) Auto Backfill.
//
// Every value below was OBSERVED on the real DKCL portal on 2026-10-09 (docs/10_TICKETS/
// F11-PHASE-3_MANIFEST.md Section 12), none is derived from a display name:
//   report route       /kpi/chat-luong-toan-trinh-buu-gui-noi-tinh   ("buu-gui", the file slug says "buu_giay")
//   HUE detail         /kpi/...-chi-tiet  store sp_TT_NoiTinh_ChiTiet, export /export/sp_TT_NoiTinh_ChiTiet/all
//   TCT summary        store sp_TT_NoiTinh_Tinh,                      export /export/sp_TT_NoiTinh_Tinh/all
//
// generatedFileMatch is applied with String.includes() by selectNewestGeneratedFile(). The TCT slug is
// a PREFIX of the HUE detail slug (`..._noi_tinh(1).xlsx` vs `..._noi_tinh_chi_tiet(1).xlsx`), so the
// TCT match keeps the `(1)` that follows the slug: it matches the summary file and can never match a
// detail file. The HUE match keeps `_chi_tiet`, which a summary file does not contain.

const F11_EXECUTOR_IDENTITIES = Object.freeze({
    HUE: Object.freeze({
        id: 'DKCL_F11_HUE_SINGLE_DATE_V1',
        indicator: 'F1.1',
        sourceLane: 'HUE',
        reportIdentity: 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_ChiTiet|GR=BC|TINH_CHAP_NHAN=53|TINH_PHAT=53',
        resourceIdentity: 'sp_TT_NoiTinh_ChiTiet',
        exportAction: '/export/sp_TT_NoiTinh_ChiTiet/all',
        detailEndpoint: '/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh-chi-tiet',
        detailResourceIdentity: 'sp_TT_NoiTinh_ChiTiet',
        generatedFileMatch: 'F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet',
    }),
    TCT: Object.freeze({
        id: 'DKCL_F11_TCT_SINGLE_DATE_V1',
        indicator: 'F1.1',
        sourceLane: 'TCT',
        reportIdentity: 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_Tinh|GR=TINH|TINH_CHAP_NHAN=ALL|TINH_PHAT=ALL',
        resourceIdentity: 'sp_TT_NoiTinh_Tinh',
        exportAction: '/export/sp_TT_NoiTinh_Tinh/all',
        generatedFileMatch: 'F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1)',
    }),
});

module.exports = { F11_EXECUTOR_IDENTITIES };
