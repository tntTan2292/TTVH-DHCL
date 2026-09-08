'use strict';

// F41-DASHBOARD-MINIMUM-01 - ITR-F41-NB-04 remediation.
// Product Owner decision (Phương án A), recorded in
// docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md Section 8:
// the F4.1 KPI total is computed over the ENTIRE fact_f41 table (unchanged
// from the original DC-2/Phase-B1 contract). The BCVH filter only ever
// offers the 6 official canonical units. Codes outside that list (observed:
// 531120, 531110, 531600) still count toward the KPI total but never appear
// as a filter option, so the 6 filtered totals do not partition the
// aggregate. This constant is the minimal, fixed contract text Phase F1
// must surface next to the KPI total so that fact is never presented as if
// the filter were exhaustive.
const F41_KPI_SCOPE_NOTE =
    'Tổng KPI được tính trên toàn bộ dữ liệu F4.1 (fact_f41). Bộ lọc BCVH chỉ gồm 6 đơn vị chính thức; ' +
    'một số mã đơn vị ngoài danh sách lọc vẫn được tính vào tổng KPI nhưng không xuất hiện trong bộ lọc.';

module.exports = { F41_KPI_SCOPE_NOTE };
