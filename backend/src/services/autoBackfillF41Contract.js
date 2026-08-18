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
    }),
});

module.exports = { F41_EXECUTOR_IDENTITIES };
