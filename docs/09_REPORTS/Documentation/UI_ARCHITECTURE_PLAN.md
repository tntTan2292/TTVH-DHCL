# TTVH-DHCL UI ARCHITECTURE PLAN

## 1. SITEMAP & ROUTE TREE
Hệ thống sẽ sử dụng `react-router-dom` để điều hướng tĩnh, bọc bên trong một `MainLayout` thống nhất.

*   `/` -> `DashboardHome.jsx`
*   `/f13/dashboard` -> `F13Dashboard.jsx`
*   `/f13/bcvh-ranking` -> `F13BcvhRanking.jsx`
*   `/f13/route-ranking` -> `F13RouteRanking.jsx`
*   `/f13/rca` -> `F13RCA.jsx`
*   `/f13/pareto` -> `F13Pareto.jsx`
*   `/f11` -> `F11Quality.jsx`
*   `/f12` -> `F12Quality.jsx`
*   `/f41` -> `F41Quality.jsx`
*   `/import` -> `DataImportCenter.jsx`
*   `/kpi-config` -> `KpiConfiguration.jsx`
*   `/system-info` -> `SystemInformation.jsx`

## 2. MENU TREE (SIDEBAR HIERARCHY)
Cấu trúc thanh điều hướng bên trái (Left Sidebar) sử dụng icon từ `lucide-react`:

1.  **Dashboard Home**
2.  **Quản trị F1.3**
    *   Dashboard Tổng quan
    *   Xếp hạng BCVH
    *   Xếp hạng Tuyến
    *   Phân tích RCA
    *   Phân tích Pareto
3.  **F1.1 Quality Management** (Placeholder Page Only)
4.  **F1.2 Quality Management** (Placeholder Page Only)
5.  **F4.1 Quality Management** (Placeholder Page Only)
6.  **System Administration**
    *   Data Import Center
    *   KPI Configuration
    *   System Information

## 3. LIST OF FILES TO CREATE / MODIFY
**Files Config:**
*   `frontend/tailwind.config.js`: Bổ sung Color Palette từ CRM 3.0.

**Layouts & Core Components:**
*   `frontend/src/App.jsx`: Cấu hình Router.
*   `frontend/src/layouts/MainLayout.jsx`: Cấu trúc bọc ngoài.
*   `frontend/src/components/Sidebar.jsx`: Thanh Menu.
*   `frontend/src/components/Topbar.jsx`: Thanh tiêu đề trên cùng.

**Pages (Empty States):**
*   `frontend/src/pages/DashboardHome.jsx`
*   `frontend/src/pages/F13Dashboard.jsx`
*   `frontend/src/pages/F13BcvhRanking.jsx`
*   `frontend/src/pages/F13RouteRanking.jsx`
*   `frontend/src/pages/F13RCA.jsx`
*   `frontend/src/pages/F13Pareto.jsx`
*   `frontend/src/pages/F11Quality.jsx`
*   `frontend/src/pages/F12Quality.jsx`
*   `frontend/src/pages/F41Quality.jsx`
*   `frontend/src/pages/DataImportCenter.jsx`
*   `frontend/src/pages/KpiConfiguration.jsx`
*   `frontend/src/pages/SystemInformation.jsx`

## 4. CRM 3.0 FILES REUSED / REFERENCED
Vì lý do cô lập môi trường (Isolation Policy), chúng ta không "import" trực tiếp file của CRM 3.0 mà sẽ **Tham khảo Kiến trúc CSS & HTML** từ repository CRM cục bộ:

*   **Màu sắc & Spacing:** Copy các biến màu `vnpost-orange`, `vnpost-blue` từ `tailwind.config.js` của CRM 3.0 sang TTVH.
*   **Sidebar Component:** Tham chiếu `KHHH - Antigravity - V3.0/src/components/Sidebar.jsx`. Lấy hiệu ứng Gradient, cơ chế Collapse đóng mở, và cấu trúc flexbox list. Loại bỏ phân quyền cứng.
*   **Topbar Component:** Tham chiếu `KHHH - Antigravity - V3.0/src/components/Topbar.jsx`. Lấy hiệu ứng Glassmorphism (Kính mờ) và Sticky header.
