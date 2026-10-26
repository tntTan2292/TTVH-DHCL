'use strict';

// F42-DASHBOARD-RANKING-01: the F4.2 module total covers every GBT row of the day (fact_f42); the BCVH filter and
// the ranking offer only the 6 official units, so a delivery code outside them counts in the module total but never
// appears as a BCVH. Rate = PTC dung quy dinh (11,5 h) / every GBT row, rows without a rating included (PD-F42-2).
// F4.2 target rate 90 % (PD-F42-5).
const F42_TARGET_RATE = 90;
const F42_KPI_SCOPE_NOTE =
    'Tổng KPI được tính trên toàn bộ dữ liệu F4.2 (fact_f42): tỷ lệ = số bưu gửi Đạt / số bưu gửi giao bưu tá trong ngày, ' +
    'gồm cả bưu gửi chưa phát hoặc chuyển hoàn (chưa có đánh giá). Bộ lọc BCVH chỉ gồm 6 đơn vị chính thức.';

module.exports = { F42_KPI_SCOPE_NOTE, F42_TARGET_RATE };
