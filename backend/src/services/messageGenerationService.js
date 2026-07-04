const { all, get } = require('../config/db');

class MessageGenerationService {

    formatDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    }

    formatShortDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return dateStr;
    }

    formatListWithAnd(arr) {
        if (!arr || arr.length === 0) return "";
        if (arr.length === 1) return arr[0];
        if (arr.length === 2) return `${arr[0]} và ${arr[1]}`;
        const last = arr.pop();
        return `${arr.join(', ')} và ${last}`;
    }

    async generateMessages(toDate) {
        const d = new Date(toDate);
        
        const yesterday = new Date(d);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        const swc = new Date(d);
        swc.setDate(swc.getDate() - 7);
        const swcStr = swc.toISOString().split('T')[0];

        const getMetrics = async (dateStr) => {
            const sql = `
                SELECT 
                    ma_bcvh, ten_bcvh,
                    COUNT(*) as total,
                    SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
                FROM fact_f13
                WHERE ngay_do_kiem = ?
                GROUP BY ma_bcvh, ten_bcvh
                ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) DESC, COUNT(*) DESC
            `;
            const rows = await all(sql, [dateStr]);
            
            let total = 0, passed = 0;
            rows.forEach(r => {
                total += r.total; passed += r.passed;
                r.kpi = r.total > 0 ? (r.passed / r.total) * 100 : 0;
            });
            
            const kpi = total > 0 ? (passed / total) * 100 : 0;
            return { rows, total, passed, kpi };
        };

        const [curr, yest, lastW] = await Promise.all([
            getMetrics(toDate),
            getMetrics(yStr),
            getMetrics(swcStr)
        ]);

        if (curr.total === 0) {
            return {
                dieu_hanh: "Chưa có dữ liệu cho ngày được chọn.",
                bao_cao: "Chưa có dữ liệu cho ngày được chọn."
            };
        }

        // National Rank Logic
        const getNationalRank = async (dateStr) => {
            let myProvCode = '53';
            try {
                const configRow = await get("SELECT config_value FROM system_config WHERE config_key = 'default_province_code'");
                if (configRow) myProvCode = configRow.config_value;
            } catch (e) {}

            const rows = await all(`
                SELECT ma_tinh_phat, tl_ptc_dung_qd_ct 
                FROM fact_f13_national
                WHERE ngay_do_kiem = ?
                ORDER BY tl_ptc_dung_qd_ct DESC
            `, [dateStr]);
            
            const idx = rows.findIndex(r => r.ma_tinh_phat === myProvCode);
            return idx >= 0 ? { rank: idx + 1, total: rows.length } : null;
        };

        const [rankCurr, rankYest] = await Promise.all([
            getNationalRank(toDate),
            getNationalRank(yStr)
        ]);

        // KPI Calculations
        const dodKpi = curr.kpi - yest.kpi;
        const swcKpi = curr.kpi - lastW.kpi;
        
        const tang_giam_dod = dodKpi > 0 ? 'tăng' : (dodKpi < 0 ? 'giảm' : 'giữ nguyên');
        const tang_giam_swc = swcKpi > 0 ? 'tăng' : (swcKpi < 0 ? 'giảm' : 'giữ nguyên');

        // BCVH Comparisons
        let improved = [];
        let declined = [];
        const yMap = {};
        yest.rows.forEach(r => yMap[r.ma_bcvh] = r.kpi);
        
        curr.rows.forEach(r => {
            if (yMap[r.ma_bcvh] !== undefined) {
                const diff = r.kpi - yMap[r.ma_bcvh];
                if (diff > 0) improved.push({ name: r.ten_bcvh, diff: diff });
                else if (diff < 0) declined.push({ name: r.ten_bcvh, diff: diff });
            }
        });

        // Sort diffs
        improved.sort((a, b) => b.diff - a.diff);
        declined.sort((a, b) => a.diff - b.diff); // most negative first

        const top3 = curr.rows.slice(0, 3);
        const bottom3 = curr.rows.slice(-3).reverse(); // lowest first

        // --- DYNAMIC PHRASES ---

        // RANK
        let RANK_STATEMENT = "";
        let RANK_ANALYSIS_STATEMENT = "";
        if (rankCurr) {
            if (rankYest && rankCurr.rank !== rankYest.rank) {
                const rankDiff = rankYest.rank - rankCurr.rank;
                const rTrendText = rankDiff > 0 ? `tăng ${String(Math.abs(rankDiff)).padStart(2, '0')} bậc` : `giảm ${String(Math.abs(rankDiff)).padStart(2, '0')} bậc`;
                RANK_STATEMENT = `* Bưu điện thành phố Huế **xếp thứ ${rankCurr.rank}/${rankCurr.total}** Bưu điện tỉnh, thành phố, **${rTrendText}** so với ngày ${this.formatShortDate(yStr)} (**${rankYest.rank}/${rankYest.total} → ${rankCurr.rank}/${rankCurr.total}**).`;
                RANK_ANALYSIS_STATEMENT = `* **Thứ hạng toàn quốc** được cải thiện từ **${rankYest.rank}/${rankYest.total}** lên **${rankCurr.rank}/${rankCurr.total}**, ${rTrendText} so với ngày ${this.formatShortDate(yStr)}.`;
                if (rankDiff < 0) {
                    RANK_ANALYSIS_STATEMENT = `* **Thứ hạng toàn quốc** giảm từ **${rankYest.rank}/${rankYest.total}** xuống **${rankCurr.rank}/${rankCurr.total}**, ${rTrendText} so với ngày ${this.formatShortDate(yStr)}.`;
                }
            } else {
                RANK_STATEMENT = `* Bưu điện thành phố Huế **xếp thứ ${rankCurr.rank}/${rankCurr.total}** Bưu điện tỉnh, thành phố, **giữ nguyên thứ hạng** so với ngày ${this.formatShortDate(yStr)}.`;
                RANK_ANALYSIS_STATEMENT = `* **Thứ hạng toàn quốc** được duy trì ở vị trí **${rankCurr.rank}/${rankCurr.total}**, không đổi so với ngày ${this.formatShortDate(yStr)}.`;
            }
        }

        // TOP/BOTTOM
        const topBcvhStrs = top3.map(r => `**${r.ten_bcvh} (${r.kpi.toFixed(2)}%)**`);
        const TOP_BCVH_STATEMENT = this.formatListWithAnd(topBcvhStrs);

        const bottomBcvhStrs = bottom3.map(r => `**${r.ten_bcvh} (${r.kpi.toFixed(2)}%)**`);
        const BOTTOM_BCVH_STATEMENT = this.formatListWithAnd(bottomBcvhStrs);

        const TOP_NAMES_ONLY = this.formatListWithAnd(top3.map(r => r.ten_bcvh));
        const BOTTOM_NAMES_ONLY = this.formatListWithAnd(bottom3.map(r => r.ten_bcvh));

        // IMPROVED
        let INCREASED_BCVH_STATEMENT = "";
        let INCREASED_ANALYSIS_STATEMENT = "";
        if (improved.length > 0) {
            const impStrs = improved.map(i => `**${i.name} (+${i.diff.toFixed(2)}%)**`);
            INCREASED_BCVH_STATEMENT = `* Các BCVH có mức cải thiện so với ngày trước gồm ${this.formatListWithAnd(impStrs)}.`;
            INCREASED_ANALYSIS_STATEMENT = `* **${String(improved.length).padStart(2, '0')}/${String(curr.rows.length).padStart(2, '0')} BCVH** có mức tăng chất lượng so với ngày trước, nổi bật là ${this.formatListWithAnd(impStrs.slice(0, 2))}.`;
        }

        // DECLINED
        let DECREASED_BCVH_STATEMENT = "";
        let DECREASED_ANALYSIS_STATEMENT = "";
        let DECREASED_RECOMMENDATION_STATEMENT = "";
        if (declined.length > 0) {
            const decStrs = declined.map(i => `**${i.name} (${i.diff.toFixed(2)}%)**`);
            DECREASED_BCVH_STATEMENT = `* Các BCVH có tỷ lệ giảm so với ngày trước gồm ${this.formatListWithAnd(decStrs)}.`;
            const decNames = this.formatListWithAnd(declined.map(i => `**${i.name}**`));
            DECREASED_ANALYSIS_STATEMENT = `* ${decNames} là ${declined.length === 1 ? 'BCVH' : 'các BCVH'} có tỷ lệ giảm so với ngày trước, cần tiếp tục theo dõi để duy trì chất lượng.`;
            DECREASED_RECOMMENDATION_STATEMENT = `BCVH ${this.formatListWithAnd(declined.map(i => i.name))} rà soát nguyên nhân giảm tỷ lệ so với ngày trước để có giải pháp khắc phục kịp thời.`;
        }

        // BOTTOM REMAINING
        const BOTTOM_1_NAME = bottom3[0]?.ten_bcvh || "";
        const BOTTOM_1_KPI = bottom3[0] ? bottom3[0].kpi.toFixed(2) : "";
        const bottomRemains = bottom3.slice(1).map(r => `**${r.ten_bcvh}**`);
        const BOTTOM_REMAINING_NAMES = this.formatListWithAnd(bottomRemains);
        let BOTTOM_ANALYSIS_STMT = `* **${BOTTOM_1_NAME}** tiếp tục là đơn vị có tỷ lệ F1.3 thấp nhất toàn Bưu điện thành phố;`;
        if (bottomRemains.length > 0) {
            BOTTOM_ANALYSIS_STMT += ` bên cạnh đó ${BOTTOM_REMAINING_NAMES} vẫn là các đơn vị cần tiếp tục cải thiện để nâng cao chất lượng chung.`;
        }

        const dateFull = this.formatDate(toDate);
        const dateShort = this.formatShortDate(toDate);
        const yShort = this.formatShortDate(yStr);

        let kpiAnalysisStmt = `* Chỉ tiêu **F1.3** toàn Bưu điện thành phố Huế ${dodKpi > 0 ? 'tiếp tục cải thiện, tăng' : (dodKpi < 0 ? 'giảm' : 'giữ nguyên')} **${Math.abs(dodKpi).toFixed(2)}%** so với ngày trước và **${tang_giam_swc} ${Math.abs(swcKpi).toFixed(2)}%** so với cùng kỳ tuần trước.`;
        if (dodKpi === 0) {
            kpiAnalysisStmt = `* Chỉ tiêu **F1.3** toàn Bưu điện thành phố Huế giữ nguyên so với ngày trước và **${tang_giam_swc} ${Math.abs(swcKpi).toFixed(2)}%** so với cùng kỳ tuần trước.`;
        }

        // T1: TIN ĐIỀU HÀNH
        let t1 = `📊 **ĐÁNH GIÁ CHẤT LƯỢNG F1.3 NGÀY ${dateFull}**

**Kính gửi:**

* **Lãnh đạo TTVH (để b/c);**
* **Giám đốc các BCVH**

Trung tâm Vận hành kính gửi tình hình thực hiện chỉ tiêu **F1.3 - Tỷ lệ phát thành công liên tỉnh** ngày **${dateFull}** như sau:

🔹 **F1.3 TOÀN BĐTP**

* **Ngày ${dateShort}**, toàn Bưu điện thành phố Huế đạt **${curr.kpi.toFixed(2)}%**, **${tang_giam_dod} ${Math.abs(dodKpi).toFixed(2)}%** so với ngày **${yShort}** và **${tang_giam_swc} ${Math.abs(swcKpi).toFixed(2)}%** so với cùng kỳ tuần trước.

${RANK_STATEMENT}

* Các BCVH có tỷ lệ F1.3 cao trong ngày gồm ${TOP_BCVH_STATEMENT}.

* Các BCVH có tỷ lệ thấp cần tiếp tục tập trung cải thiện gồm ${BOTTOM_BCVH_STATEMENT}.

📌 **Nhận định:**

* **F1.3 toàn BĐTP** ngày **${dateShort}** đạt **${curr.kpi.toFixed(2)}%**, ${tang_giam_dod} **${Math.abs(dodKpi).toFixed(2)}%** so với ngày **${yShort}** và ${tang_giam_swc} **${Math.abs(swcKpi).toFixed(2)}%** so với cùng kỳ tuần trước.

${INCREASED_ANALYSIS_STATEMENT}

${DECREASED_ANALYSIS_STATEMENT}

${BOTTOM_ANALYSIS_STMT}

⚠️ **Đề nghị Giám đốc các BCVH tiếp tục duy trì kết quả tại các đơn vị có tỷ lệ cao; đồng thời rà soát các bưu gửi chưa đạt chỉ tiêu F1.3, điều hành phát ngay từ đầu ca và kiểm soát chặt việc cập nhật trạng thái phát. Đối với BCVH ${BOTTOM_NAMES_ONLY} cần tập trung nâng cao chất lượng; ${DECREASED_RECOMMENDATION_STATEMENT}**

Trân trọng./.`;

        // T2: BÁO CÁO LÃNH ĐẠO
        let t2 = `📊 **BÁO CÁO CHẤT LƯỢNG F1.3 NGÀY ${dateFull}**

**Kính gửi:** Lãnh đạo Bưu điện thành phố Huế.

Trung tâm Vận hành kính báo cáo tình hình thực hiện chỉ tiêu **F1.3 - Tỷ lệ phát thành công liên tỉnh** ngày **${dateFull}** như sau:

* **Ngày ${dateShort}**, toàn Bưu điện thành phố Huế đạt **${curr.kpi.toFixed(2)}%**, **${tang_giam_dod} ${Math.abs(dodKpi).toFixed(2)}%** so với ngày **${yShort}** và **${tang_giam_swc} ${Math.abs(swcKpi).toFixed(2)}%** so với cùng kỳ tuần trước.

${RANK_STATEMENT}

* Các BCVH có tỷ lệ F1.3 cao trong ngày gồm ${TOP_BCVH_STATEMENT}.

${INCREASED_BCVH_STATEMENT}

${DECREASED_BCVH_STATEMENT}

* Các BCVH có tỷ lệ F1.3 thấp trong ngày gồm ${BOTTOM_BCVH_STATEMENT}.

**Nhận định:**

${kpiAnalysisStmt}

${RANK_ANALYSIS_STATEMENT}

${INCREASED_ANALYSIS_STATEMENT}

${DECREASED_ANALYSIS_STATEMENT}

${BOTTOM_ANALYSIS_STMT}

Trung tâm Vận hành kính báo cáo Lãnh đạo Bưu điện thành phố theo dõi, chỉ đạo.

Trân trọng./.`;

        // Remove double newlines if statements are empty
        t1 = t1.replace(/\n\s*\n\s*\n/g, '\n\n');
        t2 = t2.replace(/\n\s*\n\s*\n/g, '\n\n');

        return {
            bao_cao: t2.trim(),
            dieu_hanh: t1.trim()
        };
    }
}

module.exports = new MessageGenerationService();
