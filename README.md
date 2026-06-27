# Fav Web - Hệ Thống Nhận Diện Khuôn Mặt & Cổng Giải Trí

Hệ thống ứng dụng công nghệ cao kết hợp nhận diện khuôn mặt thời gian thực (Face ID) và các dịch vụ giải trí (Trò chơi, Trình nghe nhạc, Trang chia sẻ kiến thức) được xây dựng trên nền tảng **FastAPI (Python)** và **React (Vite)**. Hệ thống tích hợp đồng bộ dữ liệu đám mây **AWS S3** và triển khai dễ dàng thông qua **Docker** trên **AWS EC2**.

---

## Các Tính Năng Nổi Bật

1. **Nhận Diện Khuôn Mặt Công Nghệ Cao (Face ID):**
   - **Giao diện quét camera tương tác:** Bổ sung lưới laser quét chuyển động (scanning laser grid) và khung chữ nhật (bounding box) theo thời gian thực giống Apple Face ID.
   - **Kích hoạt Face ID linh hoạt:** Người dùng có thể đăng ký tài khoản bằng mật khẩu trước, sau đó nhấn nút kích hoạt trên Navbar để camera tự động quét chụp 5 góc mặt tạo dữ liệu mở khóa.
   - **Tải ảnh tùy chọn:** Admin khi tạo tài khoản có thể tải lên ảnh đại diện bất kỳ (phong cảnh, logo...) mà không bị bắt buộc phải chứa khuôn mặt. Hệ thống tự động bỏ qua nếu không phát hiện khuôn mặt nhưng vẫn lưu làm avatar.

2. **Dịch Vụ Giải Trí & Dashboard:**
   - **Trình nghe nhạc (Music Player):** Sidebar quản lý playlist, trình phát nhạc chuyên nghiệp, tìm kiếm bài hát theo thể loại, lượt thích và lượt phát.
   - **Cổng trò chơi (Games Portal):** Chơi game trực tuyến, theo dõi lượt xem, lượt thích và danh sách game phổ biến.
   - **Bảng tin (Feed) & Kiến thức:** Đăng bài viết chia sẻ hình ảnh/tệp tin, xem bài đọc công nghệ cao.

3. **Bảo Mật & Hạ Tầng:**
   - **JSON Web Token (JWT):** Đăng nhập mã hóa thông tin phân quyền bảo mật, tự động đính kèm Token qua Axios interceptor.
   - **Đồng bộ tự động đám mây:** Cơ chế tự động đồng bộ tệp embeddings (`.npy`) và ảnh gốc của người dùng từ EC2 lên AWS S3 khi chạy offline hoặc online.
   - **Độc lập Container:** Deploy backend trơn tru bằng Docker, ánh xạ ổ đĩa volume bảo toàn dữ liệu SQLite và tệp tin tĩnh.

---

## Cấu Trúc Thư Mục Dự Án

```text
Fav_Web/
├── backend/                # FastAPI Backend & AI Engine
│   ├── ai_core/            # Model FaceNet, trích xuất & so khớp embeddings
│   ├── api/                # Định nghĩa routes & JWT dependencies
│   ├── services/           # DB models, S3 service, auth service
│   ├── main.py             # Điểm khởi chạy FastAPI
│   └── requirements.txt    # Các thư viện Python phụ thuộc
├── frontend/               # React (Vite) Frontend
│   ├── public/             # Logo, Favicon và tài nguyên tĩnh
│   ├── src/
│   │   ├── components/     # CameraBox, FaceSetupModal, ResultCard...
│   │   ├── pages/          # Feed, Dashboard, Users, Music, Games, Logs...
│   │   └── services/       # api.js kết nối Axios
│   └── package.json        # Cấu hình dự án Node.js
├── database/               # File lưu trữ SQLite cục bộ (chỉ ghi nhận khi chạy local)
├── static/                 # Tài nguyên tĩnh sinh ra khi vận hành (logs, uploads)
├── deploy_ec2.sh           # Script thiết lập nhanh Docker trên EC2
└── README.md               # Tài liệu hướng dẫn này
```

---

## Hướng Dẫn Cài Đặt và Chạy Local

### 1. Cài đặt Backend (FastAPI)
Mở terminal tại thư mục gốc `Fav_Web` và chạy các lệnh sau:

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
*Backend chạy tại: `http://localhost:8000` (Tài liệu API tương tác tại `http://localhost:8000/docs`)*

### 2. Cài đặt Frontend (React + Vite)
Mở một terminal mới tại thư mục `frontend` và chạy:

```bash
# Cài đặt thư viện Node.js
npm install

# Khởi chạy Frontend ở chế độ Dev
npm run dev
```
*Frontend chạy tại: `http://localhost:5173`*

---

## Hướng Dẫn Triển Khai Lên AWS

### 1. Triển khai Frontend lên AWS S3
1. Truy cập thư mục `frontend/`.
2. Tạo file cấu hình `.env.production` và điền IP của EC2:
   ```text
   VITE_API_URL=http://<IP_EC2_CỦA_BẠN>/api/v1
   ```
3. Chạy lệnh đóng gói: `npm run build`.
4. Upload toàn bộ nội dung trong thư mục `frontend/dist/` lên bucket AWS S3 đã bật tính năng **Static Website Hosting**.

### 2. Triển khai Backend lên AWS EC2 (Docker)
1. SSH vào instance EC2 của bạn:
   ```bash
   ssh -i ec2_key.pem ubuntu@<IP_EC2_CỦA_BẠN>
   ```
2. Đẩy mã nguồn backend lên Github và kéo về trên EC2:
   ```bash
   cd ~/Favourite-Web
   git pull
   ```
3. Khởi dựng và chạy container Docker bằng các lệnh sau:
   ```bash
   # Di chuyển vào thư mục backend để build Docker image mới
   cd backend
   docker build -t fav-web-backend .

   # Quay lại thư mục gốc và chạy container (giữ phân vùng data local)
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

---

## Tài Khoản Mặc Định (Chạy Thử)
- **Tài khoản Admin:** `admin` / Mật khẩu: `123456`
