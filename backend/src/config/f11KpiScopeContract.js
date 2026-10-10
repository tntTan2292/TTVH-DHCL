'use strict';

// F11-DASHBOARD-RANKING-01: the F1.1 module total covers every row of the day; the BCVH filter and the
// ranking offer only the 6 official units, so a delivery code outside them (e.g. 531110/531120) counts in
// the module total but never appears as a BCVH. The pair table shows those rows in its "Khác" column.
const F11_KPI_SCOPE_NOTE =
    'Tổng KPI được tính trên toàn bộ dữ liệu F1.1 (fact_f11). Bộ lọc BCVH chỉ gồm 6 đơn vị chính thức; ' +
    'các mã đơn vị phát khác vẫn được tính vào tổng KPI và hiện ở cột "Khác" của bảng bưu cục chấp nhận.';

module.exports = { F11_KPI_SCOPE_NOTE };
