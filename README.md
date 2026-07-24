# Fav Web - Hệ Thống Nhận Diện Khuôn Mặt & Cổng Giải Trí Đa Phương Tiện (Web on Cloud)

Hệ thống ứng dụng công nghệ cao kết hợp nhận diện khuôn mặt thời gian thực (Face ID) và các dịch vụ giải trí (Bảng tin chia sẻ, Trình phát nhạc theo Playlist, Cổng trò chơi, Trang chia sẻ kiến thức) được xây dựng trên nền tảng **FastAPI (Python)** và **React (Vite)**. Hệ thống tích hợp đồng bộ dữ liệu đám mây **AWS S3** và triển khai dễ dàng thông qua **Docker** trên **AWS EC2** cùng cơ sở dữ liệu **AWS RDS**.

---

## Các Tính Năng Nổi Bật Hiện Có

### 1. Nhận Diện Khuôn Mặt & Xác Thực (Face ID Security)
*   **Giao diện quét camera tương tác:** Bổ sung lưới laser quét chuyển động (scanning laser grid) và khung chữ nhật (bounding box) theo thời gian thực mô phỏng Face ID.
*   **Đăng nhập bằng khuôn mặt:** Cho phép đăng nhập tức thì thông qua camera, tự động trích xuất vector đặc trưng khuôn mặt (embedding 512 chiều) để đối sánh với cơ sở dữ liệu.
*   **Đăng ký tài khoản linh hoạt:** Người dùng có thể đăng ký tài khoản bằng mật khẩu trước, sau đó kích hoạt Face ID trên giao diện. Hệ thống cho phép tải lên ảnh đại diện bất kỳ (phong cảnh, logo...) và tự động bỏ qua nếu không phát hiện khuôn mặt mà vẫn lưu làm avatar.

### 2. Giao Diện Dashboard Tổng Quan Tương Tác (3-Column Layout)
Trang chủ ứng dụng (`Feed`) được nâng cấp thành **Dashboard 3 cột** tích hợp đầy đủ tính năng trong một màn hình:
*   **Cột Trái (Quét khuôn mặt):** Tích hợp camera check-in tự động quét/chụp hoặc kích hoạt thủ công, hiển thị nhật ký logs check-in thời gian thực ngay bên dưới.
*   **Cột Giữa (Bảng tin & Kiến thức):** Bảng tin đa phương tiện với giao diện card glassmorphism. Hỗ trợ hiển thị và tương tác trực tiếp với các định dạng bài đăng: Văn bản, Hình ảnh, Video, Nhạc (audio player inline) và Trò chơi (chạy trực tiếp qua iframe). Đi kèm mục xem nhanh các bài viết kiến thức công nghệ nổi bật.
*   **Cột Phải (Trò chơi & Thống kê):** Danh sách game trực tuyến được tải/lọc nhanh theo danh mục và vẽ **biểu đồ cột SVG động** hiển thị số lượng ảnh đăng ký của các thành viên.

### 3. Trình Nghe Nhạc & Quản Lý Danh Sách Phát (Playlists)
*   **Sidebar thư viện:** Menu quản lý danh sách phát và các chế độ lọc nhạc (Trending, Yêu thích, Thể loại).
*   **Tạo Playlist với Emoji:** Cho phép người dùng tạo danh sách phát mới, cá nhân hóa biểu tượng đại diện bằng Emoji.
*   **Thêm nhạc nhanh:** Nút thêm (dạng dấu cộng) bên cạnh mỗi bài hát mở popover chọn nhanh Playlist có sẵn để đưa bài hát vào danh sách phát.
*   **Hộp điều khiển nhạc chuyên nghiệp:** Hỗ trợ đầy đủ chức năng phát/tạm dừng, thanh trượt thời gian, tự động chuyển bài tiếp theo (Auto-play Next) và các nút lùi/tiến chuyển bài thủ công.

### 4. Phân Quyền Vai Trò Người Dùng (Role-Based Access Control - RBAC)
Hệ thống phân chia 2 nhóm quyền rõ rệt:
*   **Quyền Admin:** 
    *   Truy cập các tab quản trị chuyên dụng: **Users** (Quản lý danh sách thành viên) và **Logs** (Xem lịch sử check-in kèm ảnh).
    *   Xóa bài hát khỏi thư viện chung hoặc xóa danh sách phát (Playlist).
    *   Tải nhạc mới lên hệ thống thông qua giao diện **UploadMusicModal** chuyên nghiệp (tự động tính thời lượng bài hát bằng Audio API của trình duyệt và upload file tuần tự).
*   **Quyền User thường:** 
    *   Truy cập Dashboard, chơi game, nghe nhạc, tạo playlist cá nhân và đăng bài lên Feed.
    *   Bị chặn truy cập các tab Admin tại Client và trả về lỗi `403 Forbidden` ở các API đầu cuối của Server để bảo mật.

### 5. Hạ Tầng & Bảo Mật Mạng (AWS & Security Hardening)
*   **Docker Container:** Backend đóng gói độc lập, tối ưu hóa chạy CPU-only giúp tránh tràn bộ nhớ (OOM) trên EC2 t2.micro (1GB RAM). Ánh xạ volume bảo toàn SQLite DB và file tĩnh khi container khởi động lại.
*   **AWS S3 Storage:** Đồng bộ hóa tự động ảnh gốc người dùng, tệp npy embeddings và ảnh log check-in từ local lên đám mây AWS S3. Tự động tải embeddings từ S3 về máy chủ khi khởi chạy.
*   **Bảo mật JWT & Request:** Sử dụng Axios interceptor tự động đính kèm Token qua Header `Authorization: Bearer <token>` hoặc `X-Auth-Token`. Tích hợp xử lý tự động đăng xuất (401 Interceptor) khi token hết hạn.
*   **Bảo mật nội dung:** Cấu hình CSP (Content Security Policy) và sandbox hóa các iframe nhúng trò chơi để tránh các đợt tấn công script độc hại.

---

## Cấu Trúc Thư Mục Dự Án

```text
Fav_Web/
├── backend/                # FastAPI Backend & AI Engine
│   ├── ai_core/            # Model FaceNet, trích xuất & so khớp embeddings
│   ├── api/                # Định nghĩa routes & JWT dependencies (routes.py)
│   ├── services/           # DB models, S3 service, auth service, music/games services
│   ├── main.py             # Điểm khởi chạy FastAPI
│   └── requirements.txt    # Các thư viện Python phụ thuộc
├── frontend/               # React (Vite) Frontend
│   ├── public/             # Logo, Favicon và tài nguyên tĩnh
│   ├── src/
│   │   ├── components/     # CameraBox, FaceSetupModal, ResultCard
│   │   ├── lib/            # Modules tiện ích: safeStorage.js, likedSongs.js (Quản lý favorites local)
│   │   ├── pages/          # Feed, Dashboard, Users, Music, Games, Logs, Login
│   │   └── services/       # api.js (Định cấu hình Axios interceptor, API calls)
│   └── package.json        # Cấu hình dự án Node.js & Vite
├── database/               # File lưu trữ SQLite cục bộ (database/app.db)
├── docs/                   # Tài liệu hướng dẫn chi tiết của dự án
│   ├── aws_architecture.md # Sơ đồ & mô tả kiến trúc AWS Cloud
│   ├── team_guidelines.md  # Quy định code local, git branch và deploy của nhóm
│   ├── guide               # Hướng dẫn chi tiết lệnh chạy local & lệnh deploy Docker/S3
│   └── task_assignment.md  # Bảng phân công nhiệm vụ cho các thành viên
├── deploy_ec2.sh           # Script thiết lập nhanh Docker trên EC2
└── README.md               # Tài liệu hướng dẫn tổng quan này
```

---

## Hướng Dẫn Cài Đặt và Chạy Local

### 1. Cấu hình Môi trường (.env)
Tạo file `.env` tại thư mục gốc bằng cách sao chép từ file mẫu:
```bash
cp .env.example .env
```
*Lưu ý: Khi phát triển ở local, hãy **để trống biến `DATABASE_URL`** để hệ thống tự động sử dụng SQLite cục bộ (lưu tại `database/app.db`), tránh làm ảnh hưởng đến dữ liệu chạy thật trên AWS RDS.*

### 2. Khởi chạy Backend (FastAPI)
Mở terminal tại thư mục gốc `Fav_Web` và chạy các lệnh sau:

*   **Cách 1 (Dùng môi trường ảo Python):**
    ```powershell
    # Tạo và kích hoạt môi trường ảo
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1

    # Cập nhật pip và cài đặt thư viện
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt

    # Khởi chạy Backend
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
    ```

*   **Cách 2 (Dùng script NPM tại thư mục gốc):**
    ```bash
    npm run dev
    ```
    *(Backend chạy tại: `http://localhost:8000`, API Docs tại `http://localhost:8000/docs`)*

### 3. Khởi chạy Frontend (React + Vite)
Mở một terminal mới tại thư mục `frontend` và chạy:
```bash
# Di chuyển vào frontend và cài đặt thư viện Node.js
cd frontend
npm install

# Khởi chạy Frontend ở chế độ Dev
npm run dev
```
*(Frontend chạy tại: `http://localhost:5173`)*

### 4. Tài Khoản Test Mặc Định
Hệ thống tự động khởi tạo (seed) tài khoản Admin khi backend khởi chạy lần đầu tiên:
*   **Tài khoản:** `admin`
*   **Mật khẩu:** `123456`

---

## Hướng Dẫn Triển Khai AWS (Tổng Hợp)

### 1. Triển khai Frontend lên AWS S3
1. Truy cập thư mục `frontend/`.
2. Điền địa chỉ IP của máy chủ EC2 của bạn vào file `.env.production` (ví dụ: `VITE_API_URL=http://52.63.251.110/api/v1`).
3. Đóng gói ứng dụng: `npm run build`.
4. Upload toàn bộ nội dung trong thư mục `frontend/dist/` lên bucket **`fav-web-frontend-bucket`** đã cấu hình Static Website Hosting.

### 2. Triển khai Backend lên AWS EC2 (Docker)
1. SSH vào instance EC2 (chú ý quyền truy cập được phân công cho Leader):
   ```bash
   ssh -i ec2_key.pem ubuntu@52.63.251.110
   ```
2. Kéo code mới nhất từ GitHub về máy chủ EC2:
   ```bash
   cd ~/Favourite-Web
   git pull
   ```
3. Khởi dựng và chạy container Docker bằng các lệnh sau:
   ```bash
   # Build Docker image mới từ mã nguồn backend
   cd backend
   docker build -t fav-web-backend .

   # Khởi động lại container (đồng thời ánh xạ volume để bảo toàn tệp database/logs)
   cd ..
   docker stop backend-service || true
   docker rm backend-service || true

   docker run -d \
     --name backend-service \
     -p 80:8000 \
     --env-file ~/Favourite-Web/.env \
     -v ~/Favourite-Web/database:/app/database \
     -v ~/Favourite-Web/static:/app/static \
     -v ~/Favourite-Web/backend/ai_core/data:/app/backend/ai_core/data \
     fav-web-backend
   ```

### 3. Kết nối Cơ sở dữ liệu AWS RDS (PostgreSQL)
*   **RDS Endpoint:** `fav-web-database.cdgmgg0gcxar.ap-southeast-2.rds.amazonaws.com` (Cổng: `5432`).
*   **Truy cập dữ liệu:** RDS được cấu hình bảo mật chặn toàn bộ Internet và chỉ cho phép EC2 kết nối. Để truy cập bằng các công cụ quản lý cơ sở dữ liệu như **DBeaver**, các thành viên phải thiết lập kết nối bắc cầu qua **SSH Tunnel** (sử dụng IP của EC2 `52.63.251.110` và tệp khóa `ec2_key.pem`).

---

## Tài Liệu Hướng Dẫn Chi Tiết
Để xem chi tiết sâu hơn về từng mảng của dự án, vui lòng tham khảo các tệp tin trong thư mục `docs/`:
*   **Kiến trúc hệ thống:** [aws_architecture.md](file:///docs/aws_architecture.md) - Chi tiết sơ đồ giao tiếp mạng và các thành phần dịch vụ AWS.
*   **Quy tắc làm việc nhóm:** [team_guidelines.md](file:///docs/team_guidelines.md) - Hướng dẫn quản lý Git, bảo mật thông tin và phân quyền deploy trên EC2.
*   **Báo cáo và phân công:** [task_assignment.md](file:///docs/task_assignment.md) - Bảng phân chia công việc cho 5 thành viên trong nhóm.
*   **Cẩm nang vận hành:** [guide](file:///docs/guide) - Tổng hợp các câu lệnh chạy local và deploy dự án chi tiết.
