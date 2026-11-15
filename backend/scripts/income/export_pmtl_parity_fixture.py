"""INC-PHAT-02 - exports the parity fixture of one or more periods from PMTL (the Python app TinhLuongBDTP), READ ONLY.

    python -I export_pmtl_parity_fixture.py --pmtl <TinhLuongBDTP folder> --out <fixture folder> 2026-08 2026-09

The PMTL database is only opened read-only; its own calculation (app/calc_phat.py) is run on TEMPORARY COPIES of it. Nothing is written
inside the PMTL folder. The output holds names, HRM codes and pay: keep it outside git (backend/storage/ is ignored).

Per period <ky> it writes:
  catalog_<ky>.json     routes, postmen, employees, CTV, postman->unit, parameters, price tables effective for <ky>, F4.2 rows, HSCL exemptions,
                        penalties, adjustments, Trại giam lines
  parcels_<ky>.csv      PMTL's sl_phat_ct rows in PMTL's own order (rowid)
  external_<ky>.json    what INC-PHAT-04 will calculate later and the calculator therefore takes as input: BP thường and PHBC detail lines
                        and DHL per HRM, all BEFORE HSCL (obtained by running PMTL on a copy with the HSCL forced to 1)
  kq_recompute_<ky>.csv PMTL's calculation run again today on a copy with its real HSCL (to tell "stored result" from "result today")
"""
import argparse
import csv
import json
import os
import shutil
import sqlite3
import sys
import tempfile

sys.dont_write_bytecode = True


def rows(con, sql, params=()):
    return [dict(r) for r in con.execute(sql, params)]


def temp_copy(src_path, tmp_dir, name):
    dst = os.path.join(tmp_dir, name)
    src = sqlite3.connect(f"file:{src_path}?mode=ro", uri=True)
    out = sqlite3.connect(dst)
    src.backup(out)
    src.close()
    out.close()
    return dst


def effective_param_rows(con, ky):
    return rows(con, "SELECT khoa, gia_tri, hieu_luc_tu, mo_ta FROM tham_so ORDER BY khoa, hieu_luc_tu")


def price_table(con, loai, ky):
    bg = con.execute("SELECT * FROM bang_gia WHERE loai=? AND hieu_luc_tu<=? ORDER BY hieu_luc_tu DESC, id DESC LIMIT 1", (loai, ky)).fetchone()
    if not bg:
        return None
    return {"loai": loai, "van_ban": bg["van_ban"], "hieu_luc_tu": bg["hieu_luc_tu"],
            "rows": [[r["khoan"], r["nhom"], r["don_gia"]] for r in con.execute("SELECT khoan, nhom, don_gia FROM bang_gia_dong WHERE bang_gia_id=?", (bg["id"],))]}


def run_pmtl(pmtl_dir, db_copy, ky, force_hscl_one):
    sys.path.insert(0, pmtl_dir)
    from app import calc_phat, db, hscl  # noqa: E402  (PMTL modules, imported from the PMTL folder, no bytecode written)
    db.DB_PATH = db_copy
    con = db.connect()
    original = hscl.tinh_hscl
    if force_hscl_one:
        hscl.tinh_hscl = lambda con, ky: {}
    try:
        calc_phat.tinh(con, ky)
    finally:
        hscl.tinh_hscl = original
    kq = rows(con, "SELECT * FROM kq_phat WHERE ky=? ORDER BY ma_hrm", (ky,))
    ct = rows(con, "SELECT * FROM kq_phat_ct WHERE ky=?", (ky,))
    con.close()
    return kq, ct


def write_csv(path, header, data):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pmtl", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("periods", nargs="+")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    src_path = os.path.join(args.pmtl, "data", "tinhluong.db")
    ro = sqlite3.connect(f"file:{src_path}?mode=ro", uri=True)
    ro.row_factory = sqlite3.Row
    for ky in args.periods:
        km = ro.execute("SELECT MAX(ky) FROM hscl_mien WHERE ky<=?", (ky,)).fetchone()[0]
        catalog = {
            "ky": ky,
            "routes": rows(ro, "SELECT ma_tuyen, ten_tuyen, nhom, ma_bc, ten_bc FROM tuyen_phat"),
            "postmen": rows(ro, "SELECT ma_buu_ta, ma_hrm, ho_ten, loai_hd, don_vi FROM buu_ta"),
            "employees": rows(ro, "SELECT ma_hrm, ho_ten, don_vi, loai_hd FROM nhan_vien"),
            "ctv": [r["ma_buu_ta"] for r in ro.execute("SELECT ma_buu_ta FROM ctv") if r["ma_buu_ta"]],
            "postman_unit": rows(ro, "SELECT ma_buu_ta, don_vi FROM phan_bcvh"),
            "params": effective_param_rows(ro, ky),
            "prices": {k: price_table(ro, k, ky) for k in ("PHAT", "PHAT_MA")},
            "hscl_f42": rows(ro, "SELECT ma_buu_ta, ho_ten, ten_bc, sl_mau, sl_dung FROM hscl_f42 WHERE ky=?", (ky,)),
            "hscl_mien_ky": km,
            "hscl_mien": rows(ro, "SELECT ma_buu_ta, ly_do FROM hscl_mien WHERE ky=?", (km,)) if km else [],
            "penalties": rows(ro, "SELECT ma_buu_ta, diem FROM hscl_diem_phat WHERE ky=?", (ky,)),
            "adjustments": rows(ro, "SELECT ma_hrm, SUM(so_tien) AS so_tien FROM dieu_chinh WHERE ky=? GROUP BY ma_hrm", (ky,)),
            "trai_giam": rows(ro, "SELECT ma_hrm, ho_ten, thanh_tien FROM ho_tro WHERE ky=? AND loai='TRAI_GIAM'", (ky,)),
        }
        with open(os.path.join(args.out, f"catalog_{ky}.json"), "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False)
        write_csv(os.path.join(args.out, f"parcels_{ky}.csv"),
                  ["so_hieu", "ma_buu_ta", "ma_tuyen", "trang_thai", "service_code", "type_code", "service_name", "area", "kg_gram", "quantity", "ma_lo", "ngay"],
                  [[r["so_hieu"], r["ma_buu_ta"], r["ma_tuyen"], r["trang_thai"], r["service_code"], r["type_code"], r["service_name"], r["area"], r["kg_gram"], r["quantity"], r["ma_lo"], r["ngay"]]
                   for r in ro.execute("SELECT * FROM sl_phat_ct WHERE ky=? ORDER BY rowid", (ky,))])
        with tempfile.TemporaryDirectory() as tmp:
            kq1, ct1 = run_pmtl(args.pmtl, temp_copy(src_path, tmp, "hs1.db"), ky, True)
            external = {
                "dhl_by_hrm": {r["ma_hrm"]: r["cp_dhl"] for r in kq1 if r["cp_dhl"]},
                "lines": [{"ma_buu_ta": r["ma_buu_ta"], "ma_tuyen": r["ma_tuyen"], "nhom": r["nhom"], "khoan": r["khoan"], "so_luong": r["so_luong"], "thanh_tien": r["thanh_tien"]}
                          for r in ct1 if r["khoan"] in ("BPT", "PHBC")],
            }
            with open(os.path.join(args.out, f"external_{ky}.json"), "w", encoding="utf-8") as f:
                json.dump(external, f, ensure_ascii=False)
            kq2, _ = run_pmtl(args.pmtl, temp_copy(src_path, tmp, "real.db"), ky, False)
            cols = list(kq2[0].keys()) if kq2 else []
            write_csv(os.path.join(args.out, f"kq_recompute_{ky}.csv"), cols, [[r[c] for c in cols] for r in kq2])
        print(f"{ky}: parcels exported, external lines {len(external['lines'])}, dhl HRM {len(external['dhl_by_hrm'])}, recompute rows {len(kq2)}")
    ro.close()


if __name__ == "__main__":
    main()
