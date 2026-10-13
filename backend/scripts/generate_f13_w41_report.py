import os
import sqlite3
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DB_PATH = r"d:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend\src\db\database.sqlite"
OUTPUT_PATH = r"d:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\exports\2026.10.12 - Bao_cao_chi_tiet_nguyen_nhan_giam_chat_luong_F13_tuan_41.docx"

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=70, bottom=70, left=110, right=110):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3"):
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), color)
        tblBorders.append(border)
    tblPr.append(tblBorders)

def add_heading_styled(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    h.paragraph_format.space_before = Pt(12)
    h.paragraph_format.space_after = Pt(4)
    run = h.runs[0]
    run.font.name = 'Arial'
    if level == 1:
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 51, 102) # Dark navy
    elif level == 2:
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 102, 153) # Teal blue
    elif level == 3:
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(51, 51, 51)
    return h

def format_cell(cell, text, bold=False, italic=False, font_size=8.5, color_rgb=(0,0,0), align=WD_ALIGN_PARAGRAPH.LEFT, bg_hex=None):
    if bg_hex:
        set_cell_background(cell, bg_hex)
    set_cell_margins(cell)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(str(text))
    run.font.name = 'Arial'
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    doc = docx.Document()
    
    # Page setup (A4, 0.75 in margins)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Header / Title
    p_header = doc.add_paragraph()
    p_header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_header.paragraph_format.space_after = Pt(2)
    r1 = p_header.add_run("TỔNG CÔNG TY BƯU ĐIỆN VIỆT NAM\nBƯU ĐIỆN THÀNH PHỐ HUẾ - TRUNG TÂM VẬN HÀNH\n")
    r1.font.name = 'Arial'
    r1.font.size = Pt(9.5)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(90, 90, 90)
    
    r_div = p_header.add_run("―――――――――――――――――――――――――\n")
    r_div.font.color.rgb = RGBColor(180, 180, 180)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(4)
    r2 = p_title.add_run("BÁO CÁO PHÂN TÍCH CHUYÊN SÂU NGUYÊN NHÂN SUY GIẢM CHẤT LƯỢNG F1.3\nTUẦN 41 SO VỚI TUẦN 40 (TRỌNG TÂM CUỐI TUẦN)")
    r2.font.name = 'Arial'
    r2.font.size = Pt(14)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(180, 0, 0) # Deep Red

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(12)
    r3 = p_sub.add_run("Bóc tách dữ liệu đo kiểm thời gian phát thực tế (PTC) cấp Tuyến phát phục vụ điều hành\nNgày lập báo cáo: 12/10/2026")
    r3.font.name = 'Arial'
    r3.font.size = Pt(9.5)
    r3.font.italic = True
    r3.font.color.rgb = RGBColor(80, 80, 80)

    # -------------------------------------------------------------------------
    # PHẦN I: TỔNG HỢP TOÀN TỈNH VÀ 6 BCVH
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "I. TỔNG HỢP BIẾN ĐỘNG CHẤT LƯỢNG F1.3 TOÀN BĐTP VÀ CÁC BCVH", level=1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run(
        "Theo chuẩn đo kiểm chỉ số F1.3 hiện hành (Đánh giá 2026 - tính theo thời gian từ khi bưu gửi xác nhận đến bưu cục/KTT phát "
        "đến khi Phát thành công PTC so với chỉ tiêu quy định), trong 2 ngày cuối tuần Tuần 41 (Thứ 7 ngày 10/10 và Chủ nhật ngày 11/10/2026), "
        "chỉ số F1.3 toàn BĐTP Huế đạt tỷ lệ "
    )
    r_bold = p.add_run("54,2% (3.532 / 6.522 bưu gửi)")
    r_bold.font.bold = True
    p.add_run(", giảm ")
    r_red = p.add_run("1,5% điểm")
    r_red.font.bold = True
    r_red.font.color.rgb = RGBColor(200, 0, 0)
    p.add_run(
        " so với cuối tuần Tuần 40 (55,7% - 3.317 / 5.959 bưu gửi). Trong đó:\n"
        "• Thứ 7 (10/10 vs 03/10): Đạt 53,9% (giảm -2,1%), sản lượng tăng +335 BG (+10,7%).\n"
        "• Chủ nhật (11/10 vs 04/10): Đạt 54,4% (giảm -0,9%), sản lượng tăng +228 BG (+8,1%).\n"
        "• Đáng báo động: Có tới 5/6 BCVH đồng loạt suy giảm chất lượng, đặc biệt các huyện ngoại thành giảm rất sâu (A Lưới giảm -21,3%, Thuận An giảm -5,8%, Hương Trà giảm -5,5%, Hương Thủy giảm -4,3%)."
    )

    # Table 1: Overview
    cursor.execute("""
        SELECT 
            ten_bcvh,
            SUM(CASE WHEN ngay_do_kiem = '2026-10-03' THEN 1 ELSE 0 END) as t7_w40_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem = '2026-10-03' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem = '2026-10-03' THEN 1.0 ELSE 0 END), 0), 1) as t7_w40_tl,
            SUM(CASE WHEN ngay_do_kiem = '2026-10-10' THEN 1 ELSE 0 END) as t7_w41_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem = '2026-10-10' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem = '2026-10-10' THEN 1.0 ELSE 0 END), 0), 1) as t7_w41_tl,
            SUM(CASE WHEN ngay_do_kiem = '2026-10-04' THEN 1 ELSE 0 END) as cn_w40_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem = '2026-10-04' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as cn_w40_tl,
            SUM(CASE WHEN ngay_do_kiem = '2026-10-11' THEN 1 ELSE 0 END) as cn_w41_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem = '2026-10-11' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as cn_w41_tl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as wk_w40_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END), 0), 1) as wk_w40_tl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as wk_w41_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1.0 ELSE 0 END), 0), 1) as wk_w41_tl
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ten_bcvh
    """)
    bcvh_rows = cursor.fetchall()
    order_map = ['BCVH Thuận Hóa', 'BCVH Hương Trà', 'BCVH A Lưới', 'BCVH Hương Thủy', 'BCVH Thuận An', 'BCVH Phú Lộc']
    sorted_rows = sorted(bcvh_rows, key=lambda x: order_map.index(x[0]) if x[0] in order_map else 99)

    table1 = doc.add_table(rows=1, cols=11)
    set_table_borders(table1)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers1 = [
        "STT", "BCVH", 
        "T7 Tuần 40", "T7 Tuần 41", "T7 Tăng/giảm",
        "CN Tuần 40", "CN Tuần 41", "CN Tăng/giảm",
        "Cuối T40", "Cuối T41", "Cuối tuần Tăng/giảm"
    ]
    hdr_cells1 = table1.rows[0].cells
    for i, title in enumerate(headers1):
        format_cell(hdr_cells1[i], title, bold=True, font_size=8, color_rgb=(255,255,255), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="003366")

    for idx, row in enumerate(sorted_rows, 1):
        name = row[0].replace('BCVH ', '')
        t7_40_sl, t7_40_tl, t7_41_sl, t7_41_tl = row[1], row[2], row[3], row[4]
        cn_40_sl, cn_40_tl, cn_41_sl, cn_41_tl = row[5], row[6], row[7], row[8]
        wk_40_sl, wk_40_tl, wk_41_sl, wk_41_tl = row[9], row[10], row[11], row[12]

        diff_t7 = round(t7_41_tl - t7_40_tl, 1)
        diff_cn = round(cn_41_tl - cn_40_tl, 1)
        diff_wk = round(wk_41_tl - wk_40_tl, 1)

        r_cells = table1.add_row().cells
        bg = "F9FBFD" if idx % 2 == 1 else "FFFFFF"

        format_cell(r_cells[0], str(idx), font_size=8, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
        format_cell(r_cells[1], name, bold=True, font_size=8, bg_hex=bg)
        
        format_cell(r_cells[2], f"{t7_40_tl}%\n({t7_40_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[3], f"{t7_41_tl}%\n({t7_41_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[4], f"{'+' if diff_t7>0 else ''}{diff_t7}%", bold=True, font_size=8, 
                    color_rgb=(0,150,0) if diff_t7>0 else (200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

        format_cell(r_cells[5], f"{cn_40_tl}%\n({cn_40_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[6], f"{cn_41_tl}%\n({cn_41_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[7], f"{'+' if diff_cn>0 else ''}{diff_cn}%", bold=True, font_size=8, 
                    color_rgb=(0,150,0) if diff_cn>0 else (200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

        format_cell(r_cells[8], f"{wk_40_tl}%\n({wk_40_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[9], f"{wk_41_tl}%\n({wk_41_sl:,})", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(r_cells[10], f"{'+' if diff_wk>0 else ''}{diff_wk}%", bold=True, font_size=8, 
                    color_rgb=(0,150,0) if diff_wk>0 else (200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

    # Total Row
    r_tot = table1.add_row().cells
    format_cell(r_tot[0], "", font_size=8, bg_hex="E6F0FA")
    format_cell(r_tot[1], "TỔNG CỘNG", bold=True, font_size=8, bg_hex="E6F0FA")
    format_cell(r_tot[2], "56.0%\n(3,129)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[3], "53.9%\n(3,464)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[4], "-2.1%", bold=True, font_size=8, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="E6F0FA")
    format_cell(r_tot[5], "55.3%\n(2,830)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[6], "54.4%\n(3,058)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[7], "-0.9%", bold=True, font_size=8, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="E6F0FA")
    format_cell(r_tot[8], "55.7%\n(5,959)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[9], "54.2%\n(6,522)", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex="E6F0FA")
    format_cell(r_tot[10], "-1.5%", bold=True, font_size=8.5, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="E6F0FA")

    # -------------------------------------------------------------------------
    # PHẦN II: 3 NGUYÊN NHÂN CỐT LÕI VỀ VẬN HÀNH PHÁT
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "II. PHÂN TÍCH 3 NGUYÊN NHÂN VẬN HÀNH THỰC TẾ LÀM TĂNG TỶ LỆ TRỄ HẠN", level=1)

    p = doc.add_paragraph()
    p.add_run(
        "Lưu ý nghiệp vụ: Tiêu chí đo kiểm F1.3 hiện hành đánh giá hoàn toàn dựa trên mốc thời gian phát thành công (PTC) "
        "so với mốc bưu gửi xác nhận đến bưu cục/KTT phát (chỉ tiêu thường là 12h, 14h, 16h hoặc 24h tùy khu vực). "
        "Số liệu bóc tách từ 2.708 bưu gửi Không đạt cuối tuần 41 cho thấy 100% bưu gửi Không đạt là do THỜI GIAN THỰC HIỆN THỰC TẾ VƯỢT QUÁ CHỈ TIÊU. "
        "Ba nguyên nhân vận hành cốt lõi gồm có:"
    )

    # 1. Tồn đọng
    add_heading_styled(doc, "1. Hàng tồn lưu lâu ngày từ giữa tuần (06 - 08/10) bị dồn lại phát vét vào cuối tuần (+42% bưu gửi trễ > 48h)", level=2)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run(
        "Khi phân tích mốc thời gian xác nhận đến bưu cục (thoi_gian_bckt_tinh_xnd_bd8 / thoi_gian_bd10_quet_tms), hệ thống ghi nhận:\n"
        "• Cuối tuần 41 xuất hiện tới "
    )
    r = p.add_run("582 bưu gửi bị trễ trên 48 giờ (tăng vọt +42,0% so với 410 bưu gửi ở cuối tuần 40)")
    r.font.bold = True
    r.font.color.rgb = RGBColor(200, 0, 0)
    p.add_run(
        "; số bưu gửi trễ từ 25 - 48 giờ tăng từ 514 lên 662 bưu gửi (+28,8%).\n"
        "• Đây là các bưu gửi đã về bưu cục từ Thứ 3, Thứ 4, Thứ 5 (06 - 08/10) nhưng không được phát dứt điểm, bưu tá giữ lại để đến T7 và CN mới đi phát vét. "
        "Thời gian thực hiện thực tế lên tới 48h - 99h (trong khi chỉ tiêu chỉ 12h - 17h), dẫn đến toàn bộ lượng bưu gửi này bị hệ thống chấm điểm Không đạt."
    )

    # 2. Sản lượng bùng nổ
    add_heading_styled(doc, "2. Sản lượng bùng nổ cục bộ tại các huyện/thị xã gây nghẽn lưới phát trong ngày", level=2)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run(
        "Lực lượng bưu tá trực nhật vào cuối tuần thường bố trí giảm so với ngày thường. Tuy nhiên, sản lượng đến cuối tuần 41 lại tăng đột biến tại các huyện ngoại thành:\n"
        "• BCVH A Lưới: Sản lượng tăng vọt +45,2% (từ 186 lên 270 BG), khiến tỷ lệ đạt tụt dốc -21,3% (từ 71,0% xuống 49,6%).\n"
        "• BCVH Thuận An: Sản lượng tăng vọt +42,3% (từ 336 lên 478 BG), tỷ lệ đạt giảm -5,8% (từ 71,7% xuống 65,9%).\n"
        "• BCVH Hương Trà: Sản lượng tăng mạnh +28,4% (từ 661 lên 849 BG), tỷ lệ đạt giảm -5,5% (từ 58,5% xuống 53,0%).\n"
        "• BCVH Hương Thủy: Sản lượng tăng +12,4% (từ 879 lên 988 BG), tỷ lệ đạt giảm -4,3% (từ 41,5% xuống 37,2%).\n"
        "Sản lượng tăng quá tải khiến bưu tá không thể hoàn thành phát hết các bưu gửi đến trong ngày đúng khung giờ chỉ tiêu."
    )

    # 3. Giờ phát dồn vào chiều muộn
    add_heading_styled(doc, "3. Bưu tá phát dồn vào chiều muộn và buổi tối (sau 17h00)", level=2)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run(
        "Phân tích mốc giờ phát thành công (thoi_gian_ptc) trên thẻ bưu gửi cho thấy:\n"
        "• Có tới 1.194 bưu gửi phát sau 17h00 trong 2 ngày cuối tuần (chiếm hơn 18% tổng sản lượng).\n"
        "• Riêng khung giờ 20h00 – 21h00 ban đêm, cuối tuần 41 ghi nhận tới 336 bưu gửi phát vào khung giờ này (trong khi tuần 40 chỉ có 105 bưu gửi). "
        "Việc đi phát trễ vào chiều tối khiến các bưu gửi đến bưu cục ca sáng bị vượt quá chỉ tiêu thời gian 12h."
    )

    # Bảng phân loại mức độ trễ W40 vs W41
    cursor.execute("""
        SELECT 
            CASE 
                WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40 (03 - 04/10)'
                WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41 (10 - 11/10)'
            END as giai_doan,
            COUNT(*) as tong_sl,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_khong_dat,
            ROUND(AVG(CASE WHEN danh_gia_2026 = 'Không đạt' THEN CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) END), 1) as avg_gio_kd,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= 24 THEN 1 ELSE 0 END) as tre_duoi_24h,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) BETWEEN 25 AND 48 THEN 1 ELSE 0 END) as tre_25_48h,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > 48 THEN 1 ELSE 0 END) as tre_tren_48h
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY giai_doan
    """)
    delay_stats = cursor.fetchall()

    tbl_delay = doc.add_table(rows=1, cols=8)
    set_table_borders(tbl_delay)
    tbl_delay.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdrs_d = ["Giai đoạn", "Tổng SL", "SL Đạt", "SL Không đạt", "TG thực tế bình quân", "Trễ ≤ 24h", "Trễ 25 - 48h", "Trễ > 48h (Tồn đọng)"]
    for i, h in enumerate(hdrs_d):
        format_cell(tbl_delay.rows[0].cells[i], h, bold=True, font_size=8, color_rgb=(255,255,255), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="2E4053")

    for idx, r in enumerate(delay_stats, 1):
        rc = tbl_delay.add_row().cells
        bg = "F8F9F9" if idx % 2 == 1 else "FFFFFF"
        format_cell(rc[0], r[0], bold=True, font_size=8, bg_hex=bg)
        format_cell(rc[1], f"{r[1]:,}", font_size=8, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[2], f"{r[2]:,}", font_size=8, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[3], f"{r[3]:,}", bold=True, font_size=8, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[4], f"{r[4]} giờ", bold=True, font_size=8, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
        format_cell(rc[5], f"{r[5]:,} BG", font_size=8, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[6], f"{r[6]:,} BG", font_size=8, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[7], f"{r[7]:,} BG", bold=True, font_size=8, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)

    # -------------------------------------------------------------------------
    # PHẦN III: CHI TIẾT CÁC TUYẾN SUY GIẢM TẠI TỪNG BCVH
    # -------------------------------------------------------------------------
    doc.add_page_break()
    add_heading_styled(doc, "III. BẢNG PHÂN TÍCH CHI TIẾT SỐ LIỆU TỪNG TUYẾN PHÁT BỊ GIẢM THEO BCVH", level=1)
    
    p = doc.add_paragraph()
    p.add_run(
        "Bảng số liệu dưới đây tổng hợp chi tiết cấp Tuyến phát trong ngày Chủ nhật (11/10/2026 vs 04/10/2026), "
        "bóc tách rõ số bưu gửi phát trễ theo từng dải thời gian (Trễ trong ngày ≤24h, Trễ 25-48h, Trễ >48h do hàng tồn) "
        "kèm danh sách các bưu gửi trễ kỷ lục để Giám đốc BCVH đối chiếu, triệu tập bưu tá xử lý."
    )

    # Lấy dữ liệu tuyến Chủ nhật 11/10 vs 04/10
    cursor.execute("""
        SELECT 
            f.ten_bcvh,
            f.ma_tuyen,
            f.ten_tuyen,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1 ELSE 0 END) as sl_w40,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as tl_w40,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1 ELSE 0 END) as sl_w41,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as tl_w41,
            ROUND(
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0)) -
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0))
            , 1) as diff_tl,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_kd,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= 24 THEN 1 ELSE 0 END) as tre_duoi_24h,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) BETWEEN 25 AND 48 THEN 1 ELSE 0 END) as tre_25_48h,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > 48 THEN 1 ELSE 0 END) as tre_tren_48h,
            ROUND(AVG(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' THEN CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) END), 1) as avg_thuc_te
        FROM fact_f13 f
        WHERE f.ngay_do_kiem IN ('2026-10-04', '2026-10-11')
        GROUP BY f.ten_bcvh, f.ma_tuyen, f.ten_tuyen
        HAVING sl_w41 >= 5
        ORDER BY f.ten_bcvh, diff_tl ASC
    """)
    all_routes = cursor.fetchall()

    bcvh_list = [
        ('BCVH A Lưới', 'A Lưới (Đơn vị tụt giảm sâu nhất toàn tỉnh: -21,3%)'),
        ('BCVH Hương Trà', 'Hương Trà (Sản lượng tăng +28,4%, tỷ lệ đạt giảm -5,5%)'),
        ('BCVH Thuận An', 'Thuận An (Sản lượng tăng +42,3%, tỷ lệ đạt giảm -5,8%)'),
        ('BCVH Hương Thủy', 'Hương Thủy (Tỷ lệ đạt thấp 37,2%, giảm -4,3%)'),
        ('BCVH Phú Lộc', 'Phú Lộc (Chủ nhật giảm sâu -7,8%, tồn đọng trễ >90h)'),
        ('BCVH Thuận Hóa', 'Thuận Hóa (Tổng thể tăng nhẹ +1,5%, nhưng một số tuyến lớn suy giảm)')
    ]

    for bcvh_code, bcvh_title in bcvh_list:
        add_heading_styled(doc, f"1. {bcvh_title}", level=2)
        
        routes_in_bcvh = [r for r in all_routes if r[0] == bcvh_code and (r[7] is not None and r[7] < 0)]
        if not routes_in_bcvh:
            routes_in_bcvh = [r for r in all_routes if r[0] == bcvh_code]
            routes_in_bcvh = sorted(routes_in_bcvh, key=lambda x: x[6])[:5]

        # Table for routes
        tbl = doc.add_table(rows=1, cols=10)
        set_table_borders(tbl)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        hdrs = ["Mã tuyến", "Tên tuyến", "SL W40", "TL W40", "SL W41", "TL W41", "Tăng/giảm", "Trễ ≤24h", "Trễ 25-48h", "Trễ >48h (Tồn)"]
        for i, h in enumerate(hdrs):
            format_cell(tbl.rows[0].cells[i], h, bold=True, font_size=8, color_rgb=(255,255,255), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="1A5276")

        for idx, r in enumerate(routes_in_bcvh[:8], 1):
            m_tuyen, t_tuyen = r[1], r[2]
            sl40, tl40 = r[3], r[4]
            sl41, tl41 = r[5], r[6]
            diff = r[7]
            tre_24, tre_48, tre_ton = r[9], r[10], r[11]

            row_cells = tbl.add_row().cells
            bg = "FDFEFE" if idx % 2 == 1 else "F4F6F6"

            format_cell(row_cells[0], str(m_tuyen), font_size=7.5, bg_hex=bg)
            format_cell(row_cells[1], str(t_tuyen)[:26], bold=True, font_size=7.5, bg_hex=bg)
            format_cell(row_cells[2], f"{sl40:,}" if sl40 else "-", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
            format_cell(row_cells[3], f"{tl40}%" if tl40 is not None else "-", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
            format_cell(row_cells[4], f"{sl41:,}", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
            format_cell(row_cells[5], f"{tl41}%", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
            
            diff_text = f"{'+' if diff and diff>0 else ''}{diff}%" if diff is not None else "-"
            diff_col = (200,0,0) if (diff and diff<0) else (0,150,0)
            format_cell(row_cells[6], diff_text, bold=True, font_size=7.5, color_rgb=diff_col, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

            format_cell(row_cells[7], f"{tre_24:,} BG", font_size=7.5, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
            format_cell(row_cells[8], f"{tre_48:,} BG", font_size=7.5, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
            format_cell(row_cells[9], f"{tre_ton:,} BG", bold=True, font_size=7.5, color_rgb=(200,0,0) if tre_ton>0 else (0,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

        # Get top 3 delayed samples for this BCVH on 10/10 or 11/10
        cursor.execute("""
            SELECT ma_bg, ten_tuyen, thoi_gian_bckt_tinh_xnd_bd8, thoi_gian_ptc, thoi_gian_thuc_hien_thuc_te_gio, thoi_gian_chi_tieu
            FROM fact_f13
            WHERE ten_bcvh = ? AND ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Không đạt'
            ORDER BY CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS INT) DESC
            LIMIT 3
        """, (bcvh_code,))
        samples = cursor.fetchall()

        if samples:
            p_sample = doc.add_paragraph()
            p_sample.paragraph_format.space_before = Pt(4)
            p_sample.paragraph_format.space_after = Pt(6)
            r_s = p_sample.add_run(f"• Bưu gửi phát trễ điển hình (tồn lưu nhiều ngày) tại {bcvh_code}:")
            r_s.font.bold = True
            r_s.font.size = Pt(8.5)
            r_s.font.color.rgb = RGBColor(120, 0, 0)

            tbl_s = doc.add_table(rows=1, cols=5)
            set_table_borders(tbl_s)
            tbl_s.alignment = WD_TABLE_ALIGNMENT.CENTER
            hdrs_s = ["Mã bưu gửi", "Tuyến phát", "TG Bưu cục nhận (BD8)", "TG Phát thành công (PTC)", "Thực tế / Chỉ tiêu"]
            for i, h in enumerate(hdrs_s):
                format_cell(tbl_s.rows[0].cells[i], h, bold=True, font_size=7.5, color_rgb=(255,255,255), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="5D6D7E")
            
            for s in samples:
                r_c = tbl_s.add_row().cells
                format_cell(r_c[0], s[0], bold=True, font_size=7.5, bg_hex="FBFCFC")
                format_cell(r_c[1], str(s[1])[:24] if s[1] else "KXD", font_size=7.5, bg_hex="FBFCFC")
                format_cell(r_c[2], s[2], font_size=7.5, bg_hex="FBFCFC")
                format_cell(r_c[3], s[3], font_size=7.5, bg_hex="FBFCFC")
                format_cell(r_c[4], f"{s[4]} / {s[5]}h", bold=True, font_size=7.5, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="FBFCFC")

    # -------------------------------------------------------------------------
    # PHẦN IV: TOP 20 TUYẾN GIẢM SÂU NHẤT TOÀN TỈNH
    # -------------------------------------------------------------------------
    doc.add_page_break()
    add_heading_styled(doc, "IV. DANH SÁCH TOP 20 TUYẾN SUY GIẢM CHẤT LƯỢNG MẠNH NHẤT TOÀN TỈNH", level=1)

    p = doc.add_paragraph()
    p.add_run(
        "Dưới đây là 20 tuyến phát có tỷ lệ Đạt sụt giảm mạnh nhất trong ngày Chủ nhật (11/10/2026 vs 04/10/2026) có sản lượng ≥10 BG, "
        "kèm bóc tách số bưu gửi trễ trong ngày và trễ do tồn đọng để Giám đốc Trung tâm chỉ đạo cụ thể:"
    )

    cursor.execute("""
        SELECT 
            f.ten_bcvh,
            f.ma_tuyen,
            f.ten_tuyen,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1 ELSE 0 END) as sl_w40,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as tl_w40,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1 ELSE 0 END) as sl_w41,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as tl_w41,
            ROUND(
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0)) -
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0))
            , 1) as diff_tl,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= 24 THEN 1 ELSE 0 END) as tre_24,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > 24 THEN 1 ELSE 0 END) as tre_ton,
            ROUND(AVG(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' THEN CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) END), 1) as avg_thuc_te
        FROM fact_f13 f
        WHERE f.ngay_do_kiem IN ('2026-10-04', '2026-10-11')
          AND f.ma_tuyen IS NOT NULL AND f.ma_tuyen != 'Khong Xac Dinh'
        GROUP BY f.ten_bcvh, f.ma_tuyen, f.ten_tuyen
        HAVING sl_w41 >= 10
        ORDER BY diff_tl ASC
        LIMIT 20
    """)
    top20 = cursor.fetchall()

    tbl_top20 = doc.add_table(rows=1, cols=11)
    set_table_borders(tbl_top20)
    tbl_top20.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdrs20 = ["STT", "BCVH", "Mã tuyến", "Tên tuyến", "SL W40", "TL W40", "SL W41", "TL W41", "Tăng/giảm", "Trễ ≤24h", "Trễ >24h (Tồn)"]
    for i, h in enumerate(hdrs20):
        format_cell(tbl_top20.rows[0].cells[i], h, bold=True, font_size=7.5, color_rgb=(255,255,255), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex="7B241C")

    for idx, r in enumerate(top20, 1):
        bcvh_name = r[0].replace('BCVH ', '')
        m_tuyen, t_tuyen = r[1], r[2]
        sl40, tl40 = r[3], r[4]
        sl41, tl41 = r[5], r[6]
        diff = r[7]
        t24, t_ton = r[8], r[9]

        rc = tbl_top20.add_row().cells
        bg = "FDEDEC" if idx % 2 == 1 else "FFFFFF"

        format_cell(rc[0], str(idx), font_size=7.5, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
        format_cell(rc[1], bcvh_name, bold=True, font_size=7.5, bg_hex=bg)
        format_cell(rc[2], str(m_tuyen), font_size=7.5, bg_hex=bg)
        format_cell(rc[3], str(t_tuyen)[:22], font_size=7.5, bg_hex=bg)
        format_cell(rc[4], f"{sl40:,}" if sl40 else "-", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[5], f"{tl40}%" if tl40 is not None else "-", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[6], f"{sl41:,}", font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        format_cell(rc[7], f"{tl41}%", bold=True, font_size=7.5, align=WD_ALIGN_PARAGRAPH.RIGHT, bg_hex=bg)
        
        diff_text = f"{'+' if diff and diff>0 else ''}{diff}%" if diff is not None else "-"
        format_cell(rc[8], diff_text, bold=True, font_size=7.5, color_rgb=(200,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
        format_cell(rc[9], f"{t24:,} BG", font_size=7.5, align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)
        format_cell(rc[10], f"{t_ton:,} BG", bold=True, font_size=7.5, color_rgb=(200,0,0) if t_ton>0 else (0,0,0), align=WD_ALIGN_PARAGRAPH.CENTER, bg_hex=bg)

    # -------------------------------------------------------------------------
    # PHẦN V: CÁC BIỆN PHÁP ĐIỀU HÀNH
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "V. CÁC BIỆN PHÁP ĐIỀU HÀNH CẤP BÁCH CHO TUẦN 42", level=1)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.add_run(
        "Căn cứ vào dữ liệu phát trễ thực tế, Trung tâm Vận hành đề nghị Giám đốc các BCVH triển khai ngay 4 giải pháp sau:\n\n"
        "1. Giải quyết triệt để bưu gửi tồn đọng trước cuối tuần (Thứ 5 và Thứ 6):\n"
        "   - Yêu cầu kiểm soát 100% bưu phẩm đến sàn KTT và bưu cục phát trong ngày phải được phát dứt điểm (phát róc), không để tồn sang ngày hôm sau.\n"
        "   - Chấm dứt triệt để tình trạng bưu tá dồn hàng từ giữa tuần sang Thứ 7/CN mới đi phát vét, dẫn đến thời gian thực hiện trễ 48h - 99h.\n\n"
        "2. Điều tiết lao động và phương tiện dự phòng ngày cuối tuần:\n"
        "   - Các BCVH A Lưới, Thuận An, Hương Trà, Hương Thủy phải chủ động lập phương án tăng cường bưu tá đi làm ngày T7 và CN khi sản lượng tăng >20%.\n"
        "   - Tuyệt đối không để xảy ra quá tải lưới phát cục bộ dẫn đến bỏ sót tuyến không đi phát trong ngày.\n\n"
        "3. Đẩy sớm khung giờ ra đường và giờ phát thành công (PTC):\n"
        "   - Giám sát chặt chẽ giờ nhận hàng và ra đường của bưu tá ca sáng (trước 8h00) và ca chiều (trước 14h00).\n"
        "   - Hạn chế tối đa việc đi phát muộn dồn về sau 17h00 và ban đêm, đảm bảo bưu gửi đến trong ngày phải được phát trong khung giờ chỉ tiêu 12h - 14h.\n\n"
        "4. Cập nhật chính xác Thông tin phát (TTP 37/22) để loại trừ đo kiểm hợp lệ:\n"
        "   - Đối với các bưu gửi khách hàng hẹn giao lại hoặc cơ quan, doanh nghiệp nghỉ làm việc ngày cuối tuần: Bưu tá phải thực hiện cập nhật đầy đủ trạng thái TTP 37/22 đúng quy định để hệ thống loại trừ đo kiểm tự động, tránh bị tính lỗi phát trễ."
    )

    # Signatures
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(20)
    tbl_sign = doc.add_table(rows=1, cols=2)
    tbl_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    c1, c2 = tbl_sign.rows[0].cells
    format_cell(c1, "NGƯỜI LẬP BÁO CÁO\n\n\n\nBộ phận Điều hành Chất lượng", bold=True, font_size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
    format_cell(c2, "GIÁM ĐỐC TRUNG TÂM VẬN HÀNH\n\n\n\nTrần Như Thủy", bold=True, font_size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)

    doc.save(OUTPUT_PATH)
    print(f"Updated report generated successfully at: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
