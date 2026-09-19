import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./PostmanCatalogPage.jsx', import.meta.url), 'utf8');

test('Data Minimization (PII Guard): phone number, HRM code, contract type are strictly never rendered or processed', () => {
  // Banned PII fields per Design of Record v2 Section 6.1
  assert.doesNotMatch(source, /so_dien_thoai/i, 'Must not process so_dien_thoai');
  assert.doesNotMatch(source, /ma_hrm/i, 'Must not process ma_hrm');
  assert.doesNotMatch(source, /loai_hop_dong/i, 'Must not process loai_hop_dong');
  assert.doesNotMatch(source, /Số điện thoại/i, 'Must not render Số điện thoại');
  assert.doesNotMatch(source, /Mã HRM/i, 'Must not render Mã HRM');
  assert.doesNotMatch(source, /Loại hợp đồng/i, 'Must not render Loại hợp đồng');
});

test('PostmanCatalogPage renders all 3 required tabs: Directory, Unnamed, Conflicts', () => {
  assert.match(source, /1\.\s*Danh mục bưu tá/);
  assert.match(source, /2\.\s*Mã mới chưa có tên/);
  assert.match(source, /3\.\s*Xung đột cần rà soát/);
});

test('PostmanCatalogPage dynamic counting: totals computed from live API data, never hard-coded', () => {
  assert.match(source, /directoryData\.length\.toLocaleString/);
  assert.match(source, /unnamedData\.length\.toLocaleString/);
  assert.match(source, /conflictsData\.length\.toLocaleString/);
  // Ensure "198" is not hard-coded as a static string count in the UI template
  assert.doesNotMatch(source, /<p[^>]*>\s*198\s*<\/p>/);
});

test('PostmanCatalogPage enforces RBAC: Admin write controls vs Viewer read-only', () => {
  assert.match(source, /const isAdmin = user\?\.role === ROLE_ADMIN/);
  // Write controls guarded by isAdmin
  assert.match(source, /\{isAdmin && <th className="px-3\.5 py-3 text-right">Thao tác<\/th>\}/);
  assert.match(source, /\{isAdmin && <th className="px-3\.5 py-3 text-center w-28">Thao tác<\/th>\}/);
  assert.match(source, /\{isAdmin && <th className="px-4 py-3 text-center w-52">Quyết định của Admin<\/th>\}/);
  assert.match(source, /Quyền: Xem danh mục \(Viewer\)/);
});

test('D1 decision support: conflict queue provides KEPT_MANUAL and APPLIED_FILE resolutions with confirmation', () => {
  assert.match(source, /handleResolveConflict\(row,\s*'KEPT_MANUAL'\)/);
  assert.match(source, /handleResolveConflict\(row,\s*'APPLIED_FILE'\)/);
  assert.match(source, /Giữ tên nhập tay/);
  assert.match(source, /Lấy theo file/);
  assert.match(source, /setConfirmDialog/);
});

test('D3 decision support: retained codes absent from newer file are flagged', () => {
  assert.match(source, /in_latest_import === 0/);
  assert.match(source, /Không có trong file mới/);
});

test('Unnamed codes tab allows inline editing and immediate manual saving with confirmation', () => {
  assert.match(source, /handleSaveUnnamed/);
  assert.match(source, /updatePostmanManual/);
  assert.match(source, /Xác nhận lưu tên bưu tá/);
});

test('Import modal defines 2-step process (Preview -> Confirm) with summary classification', () => {
  assert.match(source, /function ImportCatalogModal/);
  assert.match(source, /previewPostmanImport/);
  assert.match(source, /confirmPostmanImport/);
  assert.match(source, /Thêm mới \(Insert\)/);
  assert.match(source, /Cập nhật \(Update\)/);
  assert.match(source, /Xung đột \(Conflict\)/);
  assert.match(source, /Không có trong file \(D3\)/);
});

test('History & Rollback drawer provides batch listing and rollback confirmation', () => {
  assert.match(source, /function HistoryDrawer/);
  assert.match(source, /getPostmanHistory/);
  assert.match(source, /rollbackPostmanBatch/);
  assert.match(source, /Khôi phục/);
});
