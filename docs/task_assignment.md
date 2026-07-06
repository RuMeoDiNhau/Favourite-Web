# BẢNG PHÂN CÔNG NHIỆM VỤ DỰ ÁN (TEAM WORK ASSIGNMENT)

Dưới đây là bảng phân chia vai trò, công việc chi tiết và sản phẩm đầu ra cho từng thành viên trong nhóm (gồm 5 người) để hoàn thiện dự án trong các tuần tiếp theo (Tuần 6 - 8):

---

## 1. THÀNH VIÊN 1: LEADER (DEVOP & SECURITY)
*   **Vai trò:** Quản trị hạ tầng AWS, Điều phối chung và Bảo mật Production.
*   **Nhiệm vụ chi tiết:**
    *   Cấp quyền truy cập GitHub, AWS EC2 SSH cho các thành viên cần thiết.
    *   Quản lý việc deploy Frontend lên S3 và Backend Docker lên máy chủ EC2.
    *   Giám sát logs và tài nguyên máy chủ thông qua AWS CloudWatch.
    *   Duyệt và Merge các Pull Request (PR) của thành viên từ GitHub vào nhánh `main`.
*   **Sản phẩm đầu ra:** Hệ thống chạy ổn định 24/7 trên AWS, không bị rò rỉ Key bảo mật.

---

## 2. THÀNH VIÊN 2: AI DEVELOPER
*   **Vai trò:** Nghiên cứu & Tối ưu mô hình AI (Face ID & Chatbot).
*   **Nhiệm vụ chi tiết:**
    *   Nghiên cứu tối ưu hóa tốc độ xử lý ảnh và độ chính xác của model nhận diện khuôn mặt.
    *   **Tích hợp Chatbot cá nhân hóa (Personalized Chatbot):** Tích hợp Gemini API hoặc OpenAI API để tạo chatbot có thể học hỏi và trả lời thông minh dựa trên dữ liệu cá nhân của người dùng.
*   **Sản phẩm đầu ra:**
    *   Model Face ID nhận dạng nhanh dưới 1 giây.
    *   Lõi API Chatbot thông minh xử lý câu hỏi mượt mà.

---

## 3. THÀNH VIÊN 3: BACKEND DEVELOPER
*   **Vai trò:** Phát triển API nâng cao, Caching & Bảo mật code.
*   **Nhiệm vụ chi tiết:**
    *   **Tối ưu truy xuất:** Viết cơ chế tự động nạp (cache) danh sách embeddings khuôn mặt vào RAM khi backend khởi động để tăng tốc độ so khớp Face ID.
    *   **Bảo mật thông tin nhạy cảm:** Chuyển cấu hình Key AWS, mật khẩu RDS từ file `.env` sang quản lý tập trung bằng **AWS Systems Manager (SSM) Parameter Store** hoặc **AWS Secrets Manager**.
    *   Cập nhật cấu hình CORS chặt chẽ (chỉ cho phép tên miền Frontend truy cập API).
    *   Xây dựng thêm các API endpoint phục vụ cho tính năng Chatbot và quản lý dữ liệu (nhạc, game).
*   **Sản phẩm đầu ra:** 
    *   Mã nguồn backend tối ưu bảo mật, đạt chuẩn an toàn thông tin AWS.
    *   Các API chạy mượt mà, phản hồi nhanh.

---

## 4. THÀNH VIÊN 4: FRONTEND DEVELOPER
*   **Vai trò:** Thiết kế giao diện UI/UX & Tích hợp tính năng.
*   **Nhiệm vụ chi tiết:**
    *   Xây dựng giao diện Khung Chatbot thông minh (bong bóng chat hoặc trang trò chuyện riêng).
    *   Tối ưu hóa khả năng hiển thị tương thích (Responsive) của website trên mọi thiết bị (Điện thoại, Máy tính bảng, PC).
    *   Đồng bộ dữ liệu động từ database cho các trang Games Blog, Music Player và Knowledge.
*   **Sản phẩm đầu ra:**
    *   Giao diện Web mượt mà, đẹp mắt, không còn phần cứng (hardcode) dữ liệu.
    *   Tính năng Chatbot và phát nhạc hoạt động hoàn hảo trên giao diện.

---

## 5. THÀNH VIÊN 5: QA / TESTER & TECHNICAL WRITER
*   **Vai trò:** Kiểm thử chất lượng hệ thống & Làm tài liệu báo cáo.
*   **Nhiệm vụ chi tiết:**
    *   **Kiểm thử hiệu năng:** Đo lường tốc độ phản hồi API, kiểm tra tải đồng thời của website.
    *   **Kiểm thử chịu lỗi (Failover):** Giả lập ngắt kết nối database hoặc S3 để kiểm tra cách hệ thống phản ứng và ghi log lỗi.
    *   **Viết tài liệu:** Vẽ sơ đồ kiến trúc hệ thống AWS, viết tài liệu hướng dẫn vận hành, chuẩn bị nội dung báo cáo tổng kết và quay video demo hoạt động của sản phẩm.
*   **Sản phẩm đầu ra:**
    *   Tài liệu sơ đồ kiến trúc và vận hành hệ thống.
    *   File báo cáo kết quả kiểm thử (Test Report).
    *   Video Demo sản phẩm hoàn thiện.
