'use strict';

// F13-V2-STRUCTURE-01: the one list of pages and blocks of the time-axis F1.3 module, each block tagged with its
// permission scope. GET /api/f13/v2/layout returns this list already filtered for the caller, so the screen can only
// draw what the backend allows (design Section 4).
//
//   city  - hidden for a BCVH-mode account (comparison with the other BCVH, city figures, recommendations)
//   unit  - shown; the response scoping keeps only the account's BCVH rows and drops city totals and ranks
//   own   - BCVH-mode accounts only: their own-row stand-in for a city block
//   drill - route / evidence level, shown for the account's own BCVH

const SCOPES = Object.freeze({ CITY: 'city', UNIT: 'unit', OWN: 'own', DRILL: 'drill' });

const PAGES = Object.freeze([
    { id: 'ngay', title: 'Theo ngày', path: '/f13/v2/ngay' },
    { id: 'tuan', title: 'Theo tuần', path: '/f13/v2/tuan' },
    { id: 'thang', title: 'Theo tháng', path: '/f13/v2/thang' },
    { id: 'chuyen-de', title: 'Chuyên đề', path: null },
]);

const BLOCKS = Object.freeze([
    { id: 'day.overview', page: 'ngay', title: 'Tổng quan điều hành', scope: SCOPES.UNIT },
    { id: 'day.operation', page: 'ngay', title: 'Bảng tổng hợp số liệu tại các BCVH', scope: SCOPES.CITY },
    { id: 'day.table', page: 'ngay', title: 'Bảng BCVH theo ngày', scope: SCOPES.OWN },
    { id: 'day.range', page: 'ngay', title: 'Bảng so sánh khoảng ngày', scope: SCOPES.UNIT },
    { id: 'day.trend', page: 'ngay', title: 'Xu hướng 7–30 ngày', scope: SCOPES.UNIT },
    { id: 'day.pattern', page: 'ngay', title: 'Quy luật vận hành theo thứ', scope: SCOPES.UNIT },
    { id: 'week.compare', page: 'tuan', title: 'So sánh BCVH theo tuần', scope: SCOPES.UNIT },
    { id: 'week.trend', page: 'tuan', title: 'Diễn biến chất lượng theo tuần', scope: SCOPES.UNIT },
    { id: 'month.compare', page: 'thang', title: 'So sánh BCVH theo tháng', scope: SCOPES.UNIT },
    { id: 'month.trend', page: 'thang', title: 'Xu hướng theo tháng + heatmap tháng', scope: SCOPES.UNIT },
    { id: 'month.pattern', page: 'thang', title: 'Quy luật vận hành theo tháng + heatmap ngày', scope: SCOPES.UNIT },
    { id: 'topic.journey', page: 'chuyen-de', title: 'Hành trình bưu gửi', scope: SCOPES.DRILL, path: '/f13/v2/hanh-trinh' },
    { id: 'topic.routes', page: 'chuyen-de', title: 'Phân tích tuyến phát', scope: SCOPES.DRILL, path: '/f13/ranking/route' },
    { id: 'topic.capacity', page: 'chuyen-de', title: 'Năng lực và chất lượng tuyến', scope: SCOPES.DRILL, path: '/f13/ranking/bcvh' },
    { id: 'topic.evidence', page: 'chuyen-de', title: 'Dữ liệu minh chứng', scope: SCOPES.DRILL, path: '/f13/evidence' },
]);

// TIME-AXIS-TEMPLATE-01: the other indicators have the three time pages only. Each Chuyên đề waits for the PO's explanation of
// how that indicator is calculated (PO 2026-11-03).
const COMMON_TIME_BLOCKS = Object.freeze([
    { id: 'day.overview', page: 'ngay', title: 'Tổng quan điều hành', scope: SCOPES.UNIT },
    { id: 'day.operation', page: 'ngay', title: 'Bảng tổng hợp số liệu', scope: SCOPES.CITY },
    { id: 'day.range', page: 'ngay', title: 'Bảng so sánh khoảng ngày', scope: SCOPES.UNIT },
    { id: 'day.trend', page: 'ngay', title: 'Xu hướng 7–30 ngày', scope: SCOPES.UNIT },
    { id: 'week.compare', page: 'tuan', title: 'So sánh theo tuần', scope: SCOPES.UNIT },
    { id: 'week.trend', page: 'tuan', title: 'Diễn biến chất lượng theo tuần', scope: SCOPES.UNIT },
    { id: 'month.compare', page: 'thang', title: 'So sánh theo tháng', scope: SCOPES.UNIT },
    { id: 'month.trend', page: 'thang', title: 'Xu hướng theo tháng + heatmap tháng', scope: SCOPES.UNIT },
]);

const BLOCKS_BY_INDICATOR = Object.freeze({
    f13: BLOCKS,
    f41: COMMON_TIME_BLOCKS,
    f11: Object.freeze([
        ...COMMON_TIME_BLOCKS,
        { id: 'day.pair', page: 'ngay', title: 'Bưu cục chấp nhận × BCVH phát', scope: SCOPES.UNIT },
        { id: 'week.pair', page: 'tuan', title: 'Bưu cục chấp nhận × BCVH phát', scope: SCOPES.UNIT },
        { id: 'month.pair', page: 'thang', title: 'Bưu cục chấp nhận × BCVH phát', scope: SCOPES.UNIT },
    ]),
    f12: Object.freeze([
        ...COMMON_TIME_BLOCKS,
        { id: 'month.cumulative12', page: 'thang', title: 'Lũy kế F1.2', scope: SCOPES.UNIT },
    ]),
    f42: Object.freeze([
        ...COMMON_TIME_BLOCKS,
        { id: 'day.strip', page: 'ngay', title: 'Sáu BCVH trong ngày', scope: SCOPES.UNIT },
        { id: 'day.postman', page: 'ngay', title: 'Bảng bưu tá', scope: SCOPES.UNIT },
        { id: 'week.postman', page: 'tuan', title: 'Bảng bưu tá', scope: SCOPES.UNIT },
        { id: 'month.postman', page: 'thang', title: 'Bảng bưu tá', scope: SCOPES.UNIT },
    ]),
});

/** Blocks a scope mode may see: 'all' sees all but the own-row stand-ins, 'bcvh' never sees a city block, anything else sees nothing. */
function visibleBlocks(mode, blocks = BLOCKS) {
    if (mode === 'all') return blocks.filter((block) => block.scope !== SCOPES.OWN);
    if (mode === 'bcvh') return blocks.filter((block) => block.scope !== SCOPES.CITY);
    return [];
}

/**
 * Layout for a caller. `scope` is req.scope from requireModule('f13') ({ mode, bcvh }).
 * Pages without a visible block are left out; the sub-title lists the visible block titles.
 */
function layoutFor(scope, indicatorId = 'f13') {
    const mode = scope?.mode;
    const blocks = visibleBlocks(mode, BLOCKS_BY_INDICATOR[indicatorId] || BLOCKS);
    const pages = PAGES
        .map((page) => {
            const own = blocks.filter((block) => block.page === page.id);
            return {
                id: page.id,
                title: page.title,
                path: page.path,
                subtitle: own.map((block) => block.title).join(' · '),
                blocks: own.map((block) => ({
                    id: block.id,
                    title: block.title,
                    scope: block.scope,
                    ...(block.path ? { path: block.path } : {}),
                })),
            };
        })
        .filter((page) => page.blocks.length > 0);

    return {
        indicator: indicatorId,
        scope: { mode: mode || 'none', bcvh: mode === 'bcvh' ? [...(scope.bcvh || [])] : [] },
        units: { allow_all: mode === 'all', bcvh: mode === 'bcvh' ? [...(scope.bcvh || [])] : [] },
        pages,
    };
}

module.exports = { SCOPES, PAGES, BLOCKS, visibleBlocks, layoutFor };
