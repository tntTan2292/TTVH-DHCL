'use strict';

const F41_EXECUTOR_IDENTITIES = Object.freeze({
    HUE: Object.freeze({
        id: 'DKCL_F41_HUE_SINGLE_DATE_V1',
        indicator: 'F4.1',
        sourceLane: 'HUE',
        reportIdentity: 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_BuuCuc_V2|GR=BC|TINH_PHAT=53',
        resourceIdentity: 'sp_Phat_ChatLuong_PTC_BuuCuc_V2',
        exportAction: '/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all',
        detailEndpoint: '/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc-chi-tiet',
        // AB-AUTH-17: F4.1 HUE exports the DETAIL table, not the outer summary -- `resourceIdentity`
        // above still names the outer report (which is what readF41HueOuterSummary() verifies it is
        // reading), but the workbook comes from the detail form the portal returns inside the detail
        // response. Both values are observed, not inferred: the outer response's own
        // `tr.tongquan_params` carries data-store="sp_Phat_ChatLuong_PTC_ChiTiet_V2" and
        // data-url=".../chat-luong-phat-thanh-cong-cua-buu-cuc-chi-tiet".
        detailResourceIdentity: 'sp_Phat_ChatLuong_PTC_ChiTiet_V2',
        detailExportAction: '/export/sp_Phat_ChatLuong_PTC_ChiTiet_V2/all',
        // AB-AUTH-17: pollGeneratedFile() matches against the portal's generated FILENAME (a slug of
        // the report), never against a stored-procedure identity -- see selectNewestGeneratedFile()
        // in dkclHueF13SyncService.js, and F1.3's own pair
        // ('F1.3_chat_luong_phat_buu_giay_lien_tinh' summary / '..._chi_tiet' detail). F4.1 HUE was
        // previously polling with `resourceIdentity`, which cannot match any filename, so this lane
        // could never have found its workbook.
        generatedFileMatch: 'F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc_chi_tiet',
    }),
    TCT: Object.freeze({
        id: 'DKCL_F41_TCT_SINGLE_DATE_V1',
        indicator: 'F4.1',
        sourceLane: 'TCT',
        reportIdentity: 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_Tinh_V2|GR=TINH|TINH_PHAT=ALL',
        resourceIdentity: 'sp_Phat_ChatLuong_PTC_Tinh_V2',
        generatedFileMatch: 'F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc',
        exportAction: '/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all',
        detailEndpoint: '/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc-chi-tiet',
    }),
});

module.exports = { F41_EXECUTOR_IDENTITIES };
