# HƯỚNG DẪN

## 1. DƯỚI MÁY LOCAL 

### Cấu hình Môi trường (.env)
- Tại thư mục gốc dự án có sẵn tệp mẫu **`[./.env.example]`**. Hãy tạo một bản sao của tệp này tại thư mục gốc và đổi tên thành **`.env`** để cấu hình các biến môi trường của riêng con vợ.
- **RẤT QUAN TRỌNG (Về Database local):** Khi lập trình ở local, **không điền biến `DATABASE_URL`** trong file `.env` local của các con vợ.
  - *Lý do:* Khi biến này để trống, backend sẽ tự động kết nối và chạy bằng **SQLite cục bộ** (tự động tạo tệp `database/app.db` trên máy bro). Việc này giúp bro thoải mái thêm/xóa/sửa dữ liệu test mà không làm xáo trộn hay ghi đè lên dữ liệu thật của người dùng trên RDS AWS (Production).

### Quản lý file Vector Khuôn mặt (.npy)
- Dữ liệu ảnh khuôn mặt gốc và các tệp vector đặc trưng (`.npy`) được tự động đồng bộ chéo với **AWS S3** từ máy chủ EC2.(dữ liệu khuôn mặt có gì tui update sau)
- Khi code local, không cần phải copy hay commit các tệp `.npy` trong thư mục `backend/ai_core/data/` lên GitHub. Hệ thống đã cấu hình bỏ qua chúng qua `.gitignore`.

---

## 2. Ở Github

Để giữ mã nguồn của dự án luôn sạch sẽ và tránh xung đột code (Conflicts):
1. **Không commit trực tiếp lên nhánh `main`:** Nhánh `main` là nhánh chạy ổn định và tự động dùng để deploy lên EC2. Các thành viên tuyệt đối không push code trực tiếp lên đây.
2. **Quy trình tạo Nhánh (Branching Workflow):**
   - Từ nhánh `main` mới nhất, hãy tạo một nhánh tính năng riêng: `git checkout -b feature/ten-tinh-nang`.
   - Sau khi hoàn thành và test chạy ổn định ở local, đẩy nhánh đó lên GitHub: `git push origin feature/ten-tinh-nang`.
   - Tạo một **Pull Request (PR)** trên GitHub trỏ vào nhánh `main` để cả team cùng xem duyệt trước khi Merge.
3. **Bảo mật file cấu hình:** Tuyệt đối không chỉnh sửa quy tắc ẩn `.env` trong tệp `.gitignore`. Không đưa bất kỳ tài khoản, mật khẩu hay khóa AWS Access Key nào của cá nhân lên các file code public trên GitHub.

---

## 3. THÔNG TIN & LƯU Ý VỀ CÁC DỊCH VỤ AWS

Dự án hiện đang vận hành trên hạ tầng AWS với các thiết lập sau:

### AWS EC2 (Hosting Backend)
- **Địa chỉ API chính thức:** `http://52.63.251.110` (User truy cập SSH: `ubuntu`).
- **Cổng kết nối:** Backend chạy trên cổng **80** (mặc định HTTP) thay vì 8000. 
- **Cách deploy:** Khi cập nhật backend lên EC2, hãy đọc kỹ hướng dẫn trong tệp **`docs/guide`** để chạy các lệnh build Docker có gắn ổ đĩa (`-v`) nhằm tránh việc mất dữ liệu khi container bị restart.

### AWS RDS (PostgreSQL Database)
- **Endpoint kết nối:** `fav-web-database.cdgmgg0gcxar.ap-southeast-2.rds.amazonaws.com` (Port: `5432`, DB Name: `postgres`).
- **Lưu ý bảo mật (RẤT QUAN TRỌNG):** 
  - RDS được cấu hình chặn hoàn toàn mọi truy cập từ ngoài Internet, chỉ cho phép duy nhất IP của EC2 kết nối trực tiếp.
  - **Cách kết nối từ xa qua DBeaver:** Bạn **không thể** kết nối trực tiếp đến Endpoint trên. Để xem hoặc truy cập dữ liệu bảng bằng DBeaver, bạn phải thiết lập tính năng **SSH Tunnel** trong phần cấu hình DBeaver (bắc cầu qua IP EC2 `52.63.251.110` và khóa SSH `ec2_key.pem`). (cái phần mềm DBeaver cho phép mình xem database ở trên AWS, tại AWS RDS tui chặn truy cập bên ngoài rồi nha)

### AWS S3 (Lưu trữ ảnh & Nhạc)
- **Frontend Bucket:** `fav-web-frontend-bucket` (Dùng để host giao diện web tĩnh).
- **Backend Bucket:** `amzn-bucket-fav-web-906548968055-ap-southeast-2-an` (Dùng để lưu tệp nhạc mp3, ảnh check-in...).
- **Lưu ý:** Bucket backend đã được mở chặn truy cập công khai (Public Read). Đường dẫn tệp tin trên S3 là URL tĩnh trực tiếp, không sử dụng Presigned URL.

### AWS CloudWatch Logs (Giám sát hệ thống)
- Máy chủ EC2 đã được gán **IAM Instance Profile Role** (`EC2-CloudWatch-Role`) để tự động đẩy nhật ký hoạt động của backend lên CloudWatch.
- **Xem log:** Logs của backend được đẩy thời gian thực về Log Group **`fav-web-log-group`**, Stream **`backend-logs`** trên AWS CloudWatch Console. Có thể lên đây để debug thay vì phải SSH vào EC2 gõ lệnh.
