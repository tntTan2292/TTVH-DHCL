const CONFIRMED_NON_POSTMAN_ROUTES = [
    {
        ma_bcvh: '533140',
        ten_bcvh: 'BCVH Thuận Hóa',
        ma_tuyen: '53314018',
        ten_tuyen: '533140 - Phát tại quầy',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-01-03',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '531120',
        ten_bcvh: 'Khách hàng lớn',
        ma_tuyen: '5311203',
        ten_tuyen: '531120 - Phát tại Bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-04-04',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '535470',
        ten_bcvh: 'BCVH Hương Trà',
        ma_tuyen: '53547010',
        ten_tuyen: '535470 - Phát tại Bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-01-03',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Lưới',
        ma_tuyen: '53579027',
        ten_tuyen: '535790 - Phát tại bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-01-05',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '536250',
        ten_bcvh: 'BCVH Hương Thủy',
        ma_tuyen: '53625013',
        ten_tuyen: '536250 - Phát tại Bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-01-03',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '537015',
        ten_bcvh: 'BCVH Thuận An',
        ma_tuyen: '5370155',
        ten_tuyen: 'Phát tại bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-01-03',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
    {
        ma_bcvh: '537220',
        ten_bcvh: 'BCVH Phú Lộc',
        ma_tuyen: '5372204',
        ten_tuyen: '537220 - Phát tại Bưu cục',
        classification: 'customer_pickup_internal_post_office',
        effective_date: '2026-02-12',
        po_decision_date: '2026-07-28',
        decision_basis: 'PO confirmed customer pickup at delivery post office; not counted as a postman delivery route.',
    },
];

const CONFIRMED_NON_POSTMAN_ROUTE_CODES = new Set(
    CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen)
);

function isHueRouteCode(routeCode) {
    return String(routeCode || '').trim().startsWith('53');
}

function isConfirmedNonPostmanRoute(routeCode) {
    return CONFIRMED_NON_POSTMAN_ROUTE_CODES.has(String(routeCode || '').trim());
}

function classifyRoute(routeCode) {
    if (!isHueRouteCode(routeCode)) {
        return {
            route_scope: 'non_hue',
            route_classification: 'excluded_non_hue',
            is_postman_delivery_route: false,
            classification_source: 'route_code_prefix',
            classification_confirmed: true,
        };
    }

    if (isConfirmedNonPostmanRoute(routeCode)) {
        return {
            route_scope: 'hue',
            route_classification: 'customer_pickup_internal_post_office',
            is_postman_delivery_route: false,
            classification_source: 'po_catalog',
            classification_confirmed: true,
        };
    }

    return {
        route_scope: 'hue',
        route_classification: 'postman_delivery_route',
        is_postman_delivery_route: true,
        classification_source: 'operational_default_not_catalog_confirmed',
        classification_confirmed: false,
    };
}

module.exports = {
    CONFIRMED_NON_POSTMAN_ROUTES,
    CONFIRMED_NON_POSTMAN_ROUTE_CODES,
    classifyRoute,
    isConfirmedNonPostmanRoute,
    isHueRouteCode,
};
