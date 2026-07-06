# PROJECT GOVERNANCE RULES

Độ ưu tiên:
Product Owner > SSOT Freeze > Project Governance Rules > Coding Roadmap

## RULE 1 — BUSINESS FIRST
Toàn bộ dự án phải được dẫn dắt theo trình tự:
Business -> Operation -> Decision -> Screen -> API -> Service -> Repository -> Database
Không được thiết kế API trước Business, không được thiết kế UI trước Operation, không được sửa Database trước khi Business được xác nhận.

## RULE 2 — SSOT IS THE SINGLE SOURCE OF TRUTH
Toàn bộ Requirement phải tuân thủ: RESEARCH_BASELINE, GAP_ANALYSIS, GAP_ANALYSIS_ADDENDUM, DASHBOARD_DESIGN, API_DESIGN, DATABASE_DESIGN, DEVELOPMENT_ARCHITECTURE.
Không được: tự sinh Business Rule, tự sửa Requirement, tự sửa API Contract, tự sửa Database Design.
Nếu SSOT chưa đủ: STOP. Báo Product Owner.

## RULE 3 — NO ASSUMPTION
Không được suy diễn, mặc định, hay tự bổ sung Requirement.
Nếu chưa chắc chắn: PHẢI hỏi, hoặc PHẢI Audit.

## RULE 4 — IMPLEMENTATION MUST FOLLOW BUSINESS
Không được để: Code -> Business.
Phải luôn theo: Business -> Implementation.
Không sửa Business để hợp thức hóa Code.

## RULE 5 — SSOT TRACEABILITY AUDIT (NEW)
Đây là bước BẮT BUỘC trước mọi đề xuất thay đổi.
Nếu phát hiện thiếu sót (Business, API, Database, UI...), KHÔNG được kết luận ngay. PHẢI thực hiện SSOT TRACEABILITY AUDIT:
1. Truy vết toàn bộ 7 tài liệu SSOT.
2. Đối chiếu toàn bộ các lớp kiến trúc (Business, Operation, Screen, API, Service, Repository, Database, Import Data, Extended Data).
3. Xác minh: Có thật sự thiếu? Hay đã có trong Database/Import/Extended Data, hoặc chưa đọc tới, hoặc chưa triển khai.
4. Phân loại sau khi truy vết: REAL BUSINESS GAP, IMPLEMENTATION GAP, FUTURE ENHANCEMENT, FALSE GAP.
Chỉ khi xác định là REAL BUSINESS GAP mới được kiến nghị mở lại SSOT.

## RULE 6 — IMPACT ANALYSIS
Mọi thay đổi đều phải đánh giá ảnh hưởng chi tiết (Business, SSOT, DB, Repo, Service, Rule Engine, API, Frontend API, UI/UX, Import, Dashboard, Testing). Không đánh giá chung chung.

## RULE 7 — PRODUCT OWNER DECISION
Nếu thay đổi ảnh hưởng Business, SSOT, Quy trình nghiệp vụ, API, Database, Dashboard: PHẢI dừng và trình Product Owner quyết định. Không được Coding trước.

## RULE 8 — CHATGPT & ANTIGRAVITY RESPONSIBILITY
- Antigravity: Coding Agent, Implementation, Evidence, Technical Report.
- ChatGPT: Principal Architect, Technical Commander, Technical Auditor, Business Auditor. Chịu trách nhiệm Audit, Phản biện, Kiểm tra SSOT, Architecture, Risk, PASS/FAIL.

## RULE 9 — PASS GATE
Một Phase chỉ được PASS khi: Đúng Business, Đúng SSOT, Đúng Architecture, Không suy diễn, Đã Self Audit, Đã Impact Analysis, Không còn REAL BUSINESS GAP. Nếu còn REAL BUSINESS GAP thì FAIL.

## RULE 10 — PRINCIPLE
Nguyên tắc cao nhất: "Không được kết luận thiếu chỉ vì chưa nhìn thấy."
Mọi kết luận đều phải có: Traceability, Evidence, SSOT Reference. Không có Evidence thì không có kết luận.
