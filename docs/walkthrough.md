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

## Phân quyền User/Admin & Chức năng Xóa bài hát

### A. Phân quyền vai trò User/Admin (RBAC)
*   **Database (`db_models.py`, `db_service.py`):**
    *   Thêm cột `role` (mặc định `'user'`) vào bảng `users`.
    *   Tự động gán quyền `'admin'` cho tài khoản đăng ký **đầu tiên** trên hệ thống hoặc tài khoản có username là `'admin'`. Các tài khoản đăng ký sau mặc định nhận quyền `'user'`.
*   **Backend API Guards (`routes.py`):**
    *   Cập nhật các API đăng nhập (`/auth/login` và `/auth/login-face`) để trả về thêm trường `role` của người dùng.
    *   Bảo vệ các route quản trị: `GET /users` và `GET /logs` bằng cách đối chiếu Header `X-User-Id`. Trả về lỗi `403 Forbidden` đối với tài khoản không phải `admin`.
*   **Frontend UI Protections (`App.jsx`):**
    *   Ẩn các tab điều hướng **👥 Users** và **📋 Logs** trên thanh điều hướng đối với tài khoản thường.
    *   Chặn render nội dung các tab quản trị ở Client-side đối với tài khoản thường.

### B. Chức năng Xóa bài hát
*   **Backend (`music_service.py`, `routes.py`):**
    *   Thêm hàm `delete_song()` trong `music_service.py` để xóa bản ghi nhạc khỏi database.
    *   Thêm endpoint `DELETE /api/v1/music/{song_id}` chỉ cho phép `admin` thực hiện.
*   **Frontend (`api.js`, `Music/index.jsx`):**
    *   Tích hợp hàm API `deleteSong(songId)`.
    *   Hiển thị nút **🗑️ Xóa** màu đỏ cạnh mỗi dòng bài hát đối với tài khoản Admin. Có cảnh báo xác nhận khi click, tự động reload danh sách và dừng phát nhạc nếu bài bị xóa đang chạy.

### C. Kết quả kiểm thử (Verification)
*   Đã chạy script kiểm thử tự động [verify_rbac.py](file:///C:/Users/T&T%20Center/.gemini/antigravity-ide/brain/c5f2723b-74be-4dc9-b5bf-924927695c93/scratch/verify_rbac.py) kiểm tra trực tiếp các hàm router.
*   Kết quả xác minh:
    *   User thường gọi API `/users` & `/logs` -> `403 Forbidden` (Đạt).
    *   Admin gọi API `/users` & `/logs` -> `200 OK` (Đạt).
    *   User xóa bài hát -> `403 Forbidden` (Đạt).
    *   Admin xóa bài hát -> `200 OK` và dữ liệu bị xóa thực tế trong DB (Đạt).

---

## Giao diện Tải nhạc dành riêng cho Admin

### A. Mô tả tính năng
*   **Mục tiêu:** Cho phép Admin dễ dàng thêm nhạc vào thư viện bằng giao diện kéo thả trực quan mà không cần gọi API thủ công.
*   **Chức năng chính:**
    *   Tự động đo thời lượng nhạc (`Duration`) bằng Audio API của trình duyệt khi chọn tệp tin.
    *   Thanh tiến trình tải lên (% Upload Progress) được hiển thị theo thời gian thực nhờ Axios `onUploadProgress`.
    *   Tự động xử lý tuần tự 2 bước: tải file nhạc lên S3/Local (`POST /posts/upload`), sau đó lưu siêu dữ liệu bài hát (`POST /music`) vào cơ sở dữ liệu.

### B. Các thành phần sửa đổi
*   **Backend (`api/routes.py`):**
    *   Bảo mật API `POST /api/v1/music` để chỉ cho phép tài khoản có vai trò `'admin'` (Xác thực qua Header `X-User-Id`) thêm nhạc vào thư viện. Trả về `403 Forbidden` đối với tài khoản thường.
*   **Frontend (`Music/index.jsx` & `Music.css`):**
    *   Tích hợp nút **"➕ Thêm Nhạc"** ở góc phải Header của thư viện nhạc (chỉ hiển thị đối với Admin).
    *   Xây dựng hộp thoại Modal nhập liệu (`UploadMusicModal`) với các trường: Tiêu đề, Ca sĩ, Thể loại, Thời lượng (tự động điền), và Tệp âm thanh.
    *   Thêm style CSS đồng bộ thiết kế glassmorphism hiện đại cho Modal và thanh tiến trình.

### C. Kết quả kiểm thử (Verification)
*   Đã chạy script kiểm thử bảo mật API [verify_music_post_security.py](file:///C:/Users/T&T%20Center/.gemini/antigravity-ide/brain/c5f2723b-74be-4dc9-b5bf-924927695c93/scratch/verify_music_post_security.py).
*   Kết quả xác minh:
    *   Tài khoản thường gửi request tạo nhạc -> Trả về lỗi `403 Forbidden` (Đạt).
    *   Tài khoản Admin gửi request tạo nhạc -> Tạo thành công bài hát và trả về trạng thái `201 Created` (Đạt).

---

## Đăng ký tài khoản không bắt buộc khuôn mặt

### A. Mô tả thay đổi
*   **Mục tiêu:** Cho phép người dùng đăng ký tài khoản mới mà không bắt buộc phải tải lên tệp ảnh chụp khuôn mặt. Họ vẫn có thể đăng nhập bằng mật khẩu như bình thường.
*   **Chi tiết thực hiện:**
    *   **Backend (`db_service.py`):** Cập nhật hàm `create_user`. Nếu danh sách `images_base64` rỗng, backend sẽ bỏ qua bước trích xuất embedding và tạo tài khoản với số lượng ảnh đăng ký `registered_images = 0`.
    *   **Frontend (`Login.jsx`):** Bỏ thuộc tính `required` ở input chọn ảnh và loại bỏ đoạn kiểm tra `regFiles.length === 0`. Cập nhật nhãn thành `"Ảnh chụp khuôn mặt (Không bắt buộc)"`.

---

## Quản lý và Phát nhạc theo Danh sách phát (Playlists)

### A. Mô tả tính năng
*   **Mục tiêu:** Cho phép người dùng tạo/xóa danh sách phát (Playlist), gán bài hát vào danh sách phát và thưởng thức nhạc trực tiếp từ danh sách phát với giao diện trực quan và trải nghiệm âm thanh mượt mà.
*   **Chức năng chính:**
    *   **Tạo Playlist tích hợp Emoji:** Bất kỳ người dùng đăng nhập nào cũng có thể tạo danh sách phát mới, chọn Emoji làm biểu tượng đại diện đại diện (thay vì tải ảnh lên).
    *   **Xóa danh sách phát bảo vệ bởi Admin:** Chỉ tài khoản quản trị viên (`admin`) mới được quyền xóa hoàn toàn một playlist. Khi xóa playlist, các bài hát thuộc playlist đó sẽ tự động được gán `playlist_id = null` để giữ lại trong thư viện chung thay vì bị xóa theo (cascade-delete).
    *   **Thêm nhạc nhanh bằng Popover Dropdown:** Cạnh mỗi bài hát có nút `➕`. Khi click, hiển thị một Popover gồm danh sách các playlist có sẵn để người dùng thêm nhạc nhanh chóng. Cạnh mỗi bài hát trong Playlist chi tiết cũng có nút `➖` để xóa nhanh bài hát khỏi playlist đó.
    *   **Tự động chuyển bài (Auto-play Next):** Khi kết thúc bài hát, trình phát nhạc sẽ tự động tìm và phát bài hát tiếp theo trong danh sách đang hoạt động.
    *   **Nút chuyển bài (Previous/Next):** Bổ sung chức năng cho nút `⏮️` và `⏭️` trên thanh phát nhạc nổi giúp người dùng dễ dàng chuyển bài thủ công.

### B. Các thành phần sửa đổi
*   **Backend Database & Services (`db_models.py`, `music_service.py`):**
    *   Cấu hình SQLAlchemy để hỗ trợ quan hệ 1-N giữa Playlist và Music.
    *   Hàm `add_song_to_playlist` sử dụng `db.flush()` để giải quyết xung đột cache của SQLAlchemy giúp cập nhật chính xác thuộc tính `song_count` của playlist trong DB.
    *   Hàm `delete_playlist` tự động cập nhật `playlist_id = None` cho toàn bộ bài hát liên kết trước khi xóa playlist.
*   **Backend API Endpoints (`api/routes.py` & `schemas.py`):**
    *   `POST /playlists` (Tạo playlist mới)
    *   `DELETE /playlists/{playlist_id}` (Xóa playlist - chỉ Admin)
    *   `GET /playlists/{playlist_id}/songs` (Lấy danh sách bài hát trong playlist)
    *   `POST /playlists/{playlist_id}/songs/{song_id}` (Thêm bài hát vào playlist)
    *   `DELETE /playlists/songs/{song_id}` (Xóa bài hát khỏi playlist)
*   **Frontend API Client (`api.js`):**
    *   Đăng ký đầy đủ 5 hàm gọi API cho Playlist (`createPlaylist`, `deletePlaylist`, `fetchSongsByPlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`).
*   **Frontend UI & CSS (`Music/index.jsx` & `Music.css`):**
    *   Tích hợp Modal chọn tên, mô tả và Emoji đại diện cho Playlist mới.
    *   Thiết kế giao diện Chi tiết Playlist với badge, ảnh Emoji lớn, hiển thị danh sách bài hát và các nút tương tác tương ứng.
    *   Sử dụng hiệu ứng glassmorphism hiện đại cho Popover chọn playlist, tự động đóng popover khi người dùng click bên ngoài.

### C. Kết quả kiểm thử (Verification)
*   Đã chạy thành công script kiểm thử tích hợp tự động `scratch/verify_playlists.py` trực tiếp với cơ sở dữ liệu:
    *   Tạo thành công playlist mới với Emoji đại diện -> Trả về `201 Created` (Đạt).
    *   Thêm bài hát vào playlist thành công, kiểm tra số lượng bài hát cập nhật lên `1` -> Trả về `200 OK` (Đạt).
    *   Xóa bài hát khỏi playlist thành công, kiểm tra thuộc tính `playlist_id` của bài hát chuyển về `None` -> Trả về `200 OK` (Đạt).
    *   Tài khoản thường gọi API xóa playlist -> Trả về lỗi `403 Forbidden` (Đạt).
    *   Tài khoản Admin gọi API xóa playlist -> Xóa thành công playlist, bài hát quay về trạng thái tự do (không bị xóa khỏi thư viện chung) -> Trả về `200 OK` (Đạt).

---

## Kế hoạch Tiếp theo

1. **AWS RDS Migration:** Thay SQLite bằng PostgreSQL/MySQL trên RDS, cập nhật `DATABASE_URL` trong `db_models.py`.
2. **Cập nhật lên AWS EC2:** Đẩy code backend mới lên git, SSH vào EC2 để pull và rebuild Docker container.
3. **Build & Re-deploy Frontend:** Rebuild frontend `npm run build` và upload đè các file lên bucket S3 `fav-web-frontend-bucket`.
