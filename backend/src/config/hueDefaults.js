'use strict';

// PROV-PKG-01 (C1): the ONLY file that holds the Hue default of every province-configurable value.
//
// provinceConfig.js and the system_config key migration reach it through a lazy require(), and only in the
// `full` edition. The province package build (S4/S5) replaces this path with an empty stub, so no Hue value
// is left in the province bundle. Do not import this file from anywhere else.
//
// Keep the values byte-identical to what the code used before PROV-PKG-01 (the Hue edition must not change).

module.exports = Object.freeze({
    default_province_code: '53',
    default_province_name: 'Bưu điện Tỉnh Thừa Thiên Huế',
    display_unit_name: 'Bưu điện thành phố Huế',
    display_legal_name: 'Bưu điện tỉnh Thừa Thiên Huế',
    display_short_name: 'Huế',
    display_brand_short: 'VNPost Huế',
    unit_leader_label: 'BĐTP',
    province_configured: '1',
    unit_catalog_autofill: 'off',
});
