'use strict';

// F42-PHASE-3 - executor identities for F4.2 (chat luong phat giao buu ta) Auto Backfill.
//
// Every value below was OBSERVED on the real DKCL portal on 2026-10-26 (docs/10_TICKETS/
// F42-PHASE-3_MANIFEST.md Sections 3-6), none is derived from a display name:
//   report route       /kpi/chat-luong-phat-giao-buu-ta
//   HUE detail         /kpi/...-chi-tiet  store sp_Phat_GBT_PTC_ChiTiet_V2, export /export/sp_Phat_GBT_PTC_ChiTiet_V2/all
//                      delivered by Quan ly tep as a CSV  `<jobId>_DD-MM-YYYY_HH-mm-ss_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv`
//   TCT postman report store sp_Phat_GBT_PTC_BuuTa_V2,        export /export/sp_Phat_GBT_PTC_BuuTa_V2/all
//                      delivered as `DD-MM-YYYY_HH-mm-ss_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx`
//
// generatedFileMatch is applied with String.includes() by selectNewestGeneratedFile(). The TCT slug is a
// PREFIX of the HUE detail slug (`..._buu_ta(1).xlsx` vs `..._buu_ta_chi_tiet_01.csv`), so the TCT match
// keeps the `(1)` that follows the slug and can never match a detail file; the HUE match keeps `_chi_tiet_`.

const F42_EXECUTOR_IDENTITIES = Object.freeze({
    HUE: Object.freeze({
        id: 'DKCL_F42_HUE_SINGLE_DATE_V1',
        indicator: 'F4.2',
        sourceLane: 'HUE',
        reportIdentity: 'DKCL:/kpi/chat-luong-phat-giao-buu-ta|sp_Phat_GBT_PTC_ChiTiet_V2|GR=BT|TINH_PHAT=53',
        resourceIdentity: 'sp_Phat_GBT_PTC_ChiTiet_V2',
        exportAction: '/export/sp_Phat_GBT_PTC_ChiTiet_V2/all',
        detailEndpoint: '/kpi/chat-luong-phat-giao-buu-ta-chi-tiet',
        detailResourceIdentity: 'sp_Phat_GBT_PTC_ChiTiet_V2',
        generatedFileMatch: 'F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_',
        generatedFileFormat: 'csv',
    }),
    TCT: Object.freeze({
        id: 'DKCL_F42_TCT_SINGLE_DATE_V1',
        indicator: 'F4.2',
        sourceLane: 'TCT',
        reportIdentity: 'DKCL:/kpi/chat-luong-phat-giao-buu-ta|sp_Phat_GBT_PTC_BuuTa_V2|GR=BT|TINH_PHAT=ALL',
        resourceIdentity: 'sp_Phat_GBT_PTC_BuuTa_V2',
        exportAction: '/export/sp_Phat_GBT_PTC_BuuTa_V2/all',
        generatedFileMatch: 'F4.2_chat_luong_phat_giao_buu_ta(1)',
        generatedFileFormat: 'xlsx',
    }),
});

module.exports = { F42_EXECUTOR_IDENTITIES };
