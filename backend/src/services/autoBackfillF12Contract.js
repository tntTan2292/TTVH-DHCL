'use strict';

// F12-PHASE-3 - executor identities for F1.2 (thu gom buu gui lien tinh) Auto Backfill.
//
// Every value below was OBSERVED on the real DKCL portal on 2026-10-11 (docs/10_TICKETS/
// F12-PHASE-3_MANIFEST.md Sections 3-6), none is derived from a display name:
//   report route       /kpi/chat-luong-thu-gom-buu-lien-tinh   (no "gui"; the file slug says "buu_giay")
//   HUE detail         /kpi/...-chi-tiet  store sp_TT_ThuGom_LienTinh_ChiTiet, export /export/sp_TT_ThuGom_LienTinh_ChiTiet/all
//   TCT summary        store sp_TT_ThuGom_LienTinh_Tinh,                       export /export/sp_TT_ThuGom_LienTinh_Tinh/all
//
// generatedFileMatch is applied with String.includes() by selectNewestGeneratedFile(). The TCT slug is
// a PREFIX of the HUE detail slug (`..._lien_tinh(1).xlsx` vs `..._lien_tinh_chi_tiet(1).xlsx`), so the
// TCT match keeps the `(1)` that follows the slug: it matches the summary file and can never match a
// detail file. The HUE match keeps `_chi_tiet`, which a summary file does not contain.
//
// 2026-10-28: the portal now names TCT files `<account>_DD-MM-YYYY_HH-mm-ss_<slug>_01.xlsx` instead of `<slug>(1).xlsx` (the
// summary and detail exports of one account used to differ only by `_chi_tiet`). So the TCT match is a RegExp that takes
// either suffix after the slug and still never matches a `_chi_tiet` detail file. HUE matches are unchanged.

const F12_EXECUTOR_IDENTITIES = Object.freeze({
    HUE: Object.freeze({
        id: 'DKCL_F12_HUE_SINGLE_DATE_V1',
        indicator: 'F1.2',
        sourceLane: 'HUE',
        reportIdentity: 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_ChiTiet|GR=BC|TINH_NHAN=53',
        resourceIdentity: 'sp_TT_ThuGom_LienTinh_ChiTiet',
        exportAction: '/export/sp_TT_ThuGom_LienTinh_ChiTiet/all',
        detailEndpoint: '/kpi/chat-luong-thu-gom-buu-lien-tinh-chi-tiet',
        detailResourceIdentity: 'sp_TT_ThuGom_LienTinh_ChiTiet',
        generatedFileMatch: 'F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet',
    }),
    TCT: Object.freeze({
        id: 'DKCL_F12_TCT_SINGLE_DATE_V1',
        indicator: 'F1.2',
        sourceLane: 'TCT',
        reportIdentity: 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_Tinh|GR=TINH|TINH_NHAN=ALL',
        resourceIdentity: 'sp_TT_ThuGom_LienTinh_Tinh',
        exportAction: '/export/sp_TT_ThuGom_LienTinh_Tinh/all',
        generatedFileMatch: /F1\.2_CL_thu_gom_buu_giay_lien_tinh(?:\(\d+\)|_\d+)\./,
    }),
});

module.exports = { F12_EXECUTOR_IDENTITIES };
