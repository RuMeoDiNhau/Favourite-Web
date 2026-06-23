# Walkthrough — Nhật ký Tiến độ Dự án Fav Web

Tài liệu này tổng hợp toàn bộ công việc theo từng giai đoạn của dự án **Fav Web — Application Development on AWS (Web on Cloud)**.

---

## Tuần 1 & 2: Xây Dựng Local & Thiết Kế Kiến Trúc

### A. Backend FastAPI — Các tính năng cốt lõi
- **AI Nhận diện Khuôn mặt (`backend/ai_core`):**
  - Tích hợp `facenet-pytorch` (mặc định). Hỗ trợ cấu hình chuyển sang `insightface` bằng biến môi trường `FACE_RECOGNIZER`.
  - Chuyển ảnh Base64 từ camera thành embedding vector 512 chiều, lưu thành file `.npy`.
- **Các API Dịch vụ ban đầu:**
  - **Games:** API lấy, tìm kiếm, tăng lượt xem/thích bài viết blog game.
  - **Music:** API quản lý bài hát, danh sách phát, tăng lượt nghe/thích.
  - **Knowledge:** API bài viết kiến thức, tìm kiếm, lọc thể loại, tăng lượt xem/thích.
- **Database SQLite local** (`database/app.db`) dùng SQLAlchemy:
  - Bảng: `users`, `logs`, `games`, `music`, `playlists`, `knowledge`.

### B. Frontend React (Vite)
- **CameraBox Component:** API `navigator.mediaDevices.getUserMedia` để truy cập webcam, chụp ảnh chuyển Base64.
- **Dashboard (Check-in):** Gửi ảnh webcam → Backend trả về kết quả nhận diện real-time.
- **Users (Quản lý):** Form đăng ký người dùng mới, upload ảnh khuôn mặt.
- **Logs:** Hiển thị lịch sử quét kèm ảnh webcam.
- **Games, Music, Knowledge:** Giao diện đọc nội dung từ backend.

### C. Thiết kế Kiến trúc Cloud AWS
- Phác thảo sơ đồ kiến trúc: S3 hosting frontend, EC2 chạy Docker cho backend, RDS PostgreSQL, S3 lưu trữ ảnh.

---

## Tuần 3: Tích Hợp AWS S3 & Triển Khai Docker EC2

### A. Tích hợp Lưu trữ AWS S3
- **File mới:** [`s3_service.py`](file:///d:/file_hoc_tap/Fav_Web/backend/services/s3_service.py) dùng `boto3` kết nối bucket `amzn-bucket-fav-web-906548968055-ap-southeast-2-an`.
- **Cập nhật `db_service.py`:**
  - Ảnh đăng ký User → upload thư mục `raw/{user_id}/` trên S3.
  - File embedding `.npy` → backup lên `embeddings/{user_id}.npy` trên S3.
  - Ảnh webcam lúc check-in → lưu thẳng vào `logs/` trên S3, trả về URL công khai.
  - **Cơ chế Fallback:** Nếu mất kết nối S3 hoặc thiếu `.env`, tự động lưu file local.
- **Đồng bộ khi khởi động:** `main.py` tự tải toàn bộ vector `.npy` từ S3 về local khi start.

### B. Container hóa Backend (Docker)
- Tạo [`Dockerfile`](file:///d:/file_hoc_tap/Fav_Web/backend/Dockerfile):
  - PyTorch CPU-only để tránh OOM trên EC2 t2.micro (RAM 1GB).
  - Cài sẵn `numpy`, `cython` để tránh lỗi build `insightface`.

### C. Triển khai lên AWS EC2
- **Địa chỉ:** EC2 Public IP `52.63.251.110`, port `8000`.
- **Script:** [`deploy_ec2.sh`](file:///d:/file_hoc_tap/Fav_Web/deploy_ec2.sh) — cài Docker, phân quyền user `ubuntu`.
- **Mở rộng ổ cứng:** EBS 8GB → 30GB:
  ```bash
  sudo growpart /dev/nvme0n1 1
  sudo resize2fs /dev/nvme0n1p1
  ```

### D. Build & Deploy Frontend
- Cập nhật [`frontend/.env.production`](file:///d:/file_hoc_tap/Fav_Web/frontend/.env.production):
  ```
  VITE_API_URL=http://52.63.251.110:8000/api/v1
  ```
- Build production: `npm run build` → upload `frontend/dist/` lên S3 bucket frontend.

---

## Tuần 4: Hệ thống Đăng nhập & Bảng tin Đa Phương Tiện

### A. Hệ thống Đăng nhập Bảo mật (Login Gate)
- **Tất cả tính năng web** được bảo vệ bởi màn hình đăng nhập.
- **3 phương thức đăng nhập:**
  1. **Username hoặc Email + Mật khẩu:** Mật khẩu được băm bằng `PBKDF2-HMAC-SHA256` với salt ngẫu nhiên.
  2. **Nhận diện Khuôn mặt:** Chụp ảnh từ camera → AI nhận diện → đăng nhập tự động.
  3. **Đăng ký tài khoản mới:** Form điền thông tin + upload ảnh khuôn mặt.
- **Frontend:** Token và thông tin user lưu `localStorage`. Axios interceptor tự động gắn header `X-User-Id` vào mọi request.
- **Files:** [`Login.jsx`](file:///d:/file_hoc_tap/Fav_Web/frontend/src/pages/Login/Login.jsx), [`Login.css`](file:///d:/file_hoc_tap/Fav_Web/frontend/src/pages/Login/Login.css)
- **Backend endpoints mới:**
  - `POST /api/v1/auth/login` — đăng nhập bằng mật khẩu
  - `POST /api/v1/auth/login-face` — đăng nhập nhận diện khuôn mặt

### B. Bảng tin Đa Phương Tiện (Unified Posts Feed)

#### Database
- Thêm bảng `posts` vào [`db_models.py`](file:///d:/file_hoc_tap/Fav_Web/backend/services/db_models.py):
  - Các cột: `user_id`, `post_type` (image/video/audio/game/text), `title`, `description`, `media_url`, `thumbnail`, `status`, `created_at`.

#### Backend
- **Schemas mới** trong [`schemas.py`](file:///d:/file_hoc_tap/Fav_Web/backend/services/schemas.py): `PostCreateRequest`, `PostResponse`.
- **Service mới** [`posts_service.py`](file:///d:/file_hoc_tap/Fav_Web/backend/services/posts_service.py):
  - `upload_media_file()`: upload file lên S3 hoặc lưu local (game .zip luôn lưu local để giải nén).
  - `create_post()`: lưu metadata bài đăng. Nếu là game .zip, tự giải nén vào `static/games/{post_id}/`, tìm `index.html`, cập nhật `media_url`, xóa file .zip tạm.
  - `get_posts()`: trả về danh sách bài đăng mới nhất.
- **Endpoints mới** trong [`routes.py`](file:///d:/file_hoc_tap/Fav_Web/backend/api/routes.py):
  - `POST /api/v1/posts/upload` — upload tệp media (multipart/form-data)
  - `POST /api/v1/posts` — tạo bài đăng mới
  - `GET /api/v1/posts` — lấy bảng tin

#### Frontend
- **Feed Page** ([`Feed.jsx`](file:///d:/file_hoc_tap/Fav_Web/frontend/src/pages/Feed/Feed.jsx), [`Feed.css`](file:///d:/file_hoc_tap/Fav_Web/frontend/src/pages/Feed/Feed.css)):
  - Lưới bài đăng dạng Card glassmorphism với animation hover.
  - Lọc theo loại: Tất cả / Ảnh / Video / Nhạc / Game / Bài viết.
  - Render tùy theo `post_type`: ảnh gallery, video player, audio player inline (toggle play/pause với album art), game overlay modal (iframe).
- **PostModal** ([`PostModal.jsx`](file:///d:/file_hoc_tap/Fav_Web/frontend/src/pages/Feed/PostModal.jsx)):
  - Chọn loại bài đăng → form tự thay đổi fields phù hợp.
  - Thanh tiến trình upload % thời gian thực (Axios `onUploadProgress`).
- **App.jsx:**
  - Tab "📰 Bảng tin (Feed)" làm trang mặc định sau khi đăng nhập.
  - Nút "➕ Đăng bài" trên thanh header mở PostModal.
  - `feedKey` state để reload Feed ngay sau khi đăng bài mới.
- **API.js:** Thêm `fetchPosts()`, `createPost()`, `uploadPostFile(..., onProgress)`. Interceptor tự gắn `X-User-Id`.

#### Kết quả kiểm thử
Integration test xác nhận toàn bộ quy trình:
- Upload PNG → S3 ✅
- Upload WAV → S3 ✅  
- Upload game.zip → giải nén local `static/games/9/index.html` ✅
- Tạo Text/Image/Audio/Game Post → `201 Created` ✅
- Lấy Feed với 9 bài đăng → `200 OK` ✅

---

## Kế hoạch Tiếp theo

1. **AWS RDS Migration:** Thay SQLite bằng PostgreSQL/MySQL trên RDS, cập nhật `DATABASE_URL` trong `db_models.py`.
2. **Video Upload:** Test upload video thực tế qua bảng tin.
3. **CORS / CloudFront:** Cấu hình HTTPS cho frontend trên CloudFront.
