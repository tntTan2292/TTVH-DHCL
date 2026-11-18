'use strict';

// PROV-PKG-01: the province code of the HUE (province) lane comes from provinceConfig; with code 53 the string is
// byte-identical to what the queue stored before. The TCT lane (ALL) is not province-specific.
const provinceConfig = require('../config/provinceConfig');

const F13_EXECUTOR_IDENTITIES = Object.freeze({
    HUE: Object.freeze({
        id: 'DKCL_F13_HUE_SINGLE_DATE_V1',
        indicator: 'F1.3',
        sourceLane: 'HUE',
        get reportIdentity() {
            return `DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=BC|TINH_PHAT=${provinceConfig.formatForPortal('plain')}|DETAIL`;
        },
        resourceIdentity: 'F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet',
    }),
    TCT: Object.freeze({
        id: 'DKCL_F13_TCT_SINGLE_DATE_V1',
        indicator: 'F1.3',
        sourceLane: 'TCT',
        reportIdentity: 'DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=TINH|TINH_PHAT=ALL|SUMMARY',
        resourceIdentity: 'F1.3_chat_luong_phat_buu_giay_lien_tinh',
    }),
});

module.exports = { F13_EXECUTOR_IDENTITIES };
