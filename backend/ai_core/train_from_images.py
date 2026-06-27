#!/usr/bin/env python3
"""
Script đăng ký khuôn mặt từ file ảnh có sẵn (offline enrollment).

Cách dùng:
  1. Tạo cấu trúc thư mục như sau:
     backend/ai_core/data/raw/
       ├── nguyen_van_a/          ← user_id = "nguyen_van_a"
       │   ├── 001.jpg
       │   ├── 002.jpg
       │   └── 003.png
       ├── tran_thi_b/
       │   ├── face1.jpg
       │   └── face2.jpg
       └── ...

  2. Chạy script từ thư mục gốc dự án (d:\\file_hoc_tap\\Fav_Web):
     python -m backend.ai_core.train_from_images

  Hoặc chỉ train một người dùng:
     python -m backend.ai_core.train_from_images --user nguyen_van_a

  Lưu ý:
  - Tên thư mục sẽ được dùng làm user_id.
  - Mỗi người nên có ít nhất 3-10 ảnh để embedding chính xác hơn.
  - Ảnh hợp lệ: .jpg, .jpeg, .png, .bmp, .webp
  - Embedding được lưu tại: backend/ai_core/data/embeddings/{user_id}.npy
"""

import sys
import argparse
from pathlib import Path

# Đảm bảo import đúng từ gốc project
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

import numpy as np
from PIL import Image
from backend.ai_core.src.recognizer import embed_face, save_user_embedding, EMBED_DIR

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
RAW_DIR = ROOT_DIR / 'backend' / 'ai_core' / 'data' / 'raw'


def load_image_as_bytes(image_path: Path) -> bytes:
    """Đọc file ảnh và trả về bytes (chuyển sang PNG để chuẩn hóa)."""
    import io
    img = Image.open(image_path).convert('RGB')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


def process_user(user_id: str, user_dir: Path, verbose: bool = True) -> dict:
    """
    Xử lý tất cả ảnh trong thư mục của một người dùng,
    tạo embedding trung bình và lưu file .npy.

    Returns:
        dict với thông tin kết quả (success/failed, số ảnh xử lý)
    """
    image_files = [
        f for f in sorted(user_dir.iterdir())
        if f.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not image_files:
        return {
            'status': 'skip',
            'user_id': user_id,
            'message': 'Không tìm thấy file ảnh hợp lệ',
            'processed': 0,
            'failed': 0,
        }

    if verbose:
        print(f"\n👤 Đang xử lý: {user_id} ({len(image_files)} ảnh)")

    embeddings = []
    failed_files = []

    for img_path in image_files:
        try:
            image_bytes = load_image_as_bytes(img_path)
            embedding = embed_face(image_bytes)
            if embedding is not None:
                embeddings.append(embedding)
                if verbose:
                    print(f"   ✅ {img_path.name}")
            else:
                failed_files.append(img_path.name)
                if verbose:
                    print(f"   ❌ {img_path.name} → Không phát hiện khuôn mặt")
        except Exception as e:
            failed_files.append(img_path.name)
            if verbose:
                print(f"   ❌ {img_path.name} → Lỗi: {e}")

    if not embeddings:
        return {
            'status': 'error',
            'user_id': user_id,
            'message': 'Không có ảnh nào trích xuất được embedding khuôn mặt',
            'processed': 0,
            'failed': len(failed_files),
        }

    # Lưu embedding trung bình
    save_path = save_user_embedding(user_id, embeddings)

    if verbose:
        print(f"   💾 Đã lưu embedding → {save_path}")
        print(f"   📊 Kết quả: {len(embeddings)} thành công / {len(failed_files)} thất bại")

    return {
        'status': 'success',
        'user_id': user_id,
        'message': f'Đã tạo embedding từ {len(embeddings)} ảnh',
        'processed': len(embeddings),
        'failed': len(failed_files),
        'embedding_path': str(save_path),
    }


def train_all(target_user: str = None, verbose: bool = True):
    """
    Duyệt toàn bộ thư mục raw/ và tạo embedding cho từng người dùng.
    Nếu target_user được chỉ định, chỉ xử lý người dùng đó.
    """
    if not RAW_DIR.exists():
        print(f"❌ Thư mục dữ liệu không tồn tại: {RAW_DIR}")
        print("   Hãy tạo thư mục và đặt ảnh vào đó theo hướng dẫn ở đầu file.")
        return

    user_dirs = [d for d in sorted(RAW_DIR.iterdir()) if d.is_dir()]

    if not user_dirs:
        print(f"⚠️  Thư mục raw/ trống: {RAW_DIR}")
        print("   Hãy tạo thư mục con cho từng người dùng và đặt ảnh vào.")
        print_usage_guide()
        return

    if target_user:
        user_dirs = [d for d in user_dirs if d.name == target_user]
        if not user_dirs:
            print(f"❌ Không tìm thấy thư mục cho user: {target_user}")
            return

    print("=" * 60)
    print(f"🚀 BẮT ĐẦU ĐĂNG KÝ KHUÔN MẶT TỪ FILE ẢNH")
    print(f"   Thư mục nguồn : {RAW_DIR}")
    print(f"   Thư mục output: {EMBED_DIR}")
    print(f"   Số người dùng : {len(user_dirs)}")
    print("=" * 60)

    results = []
    for user_dir in user_dirs:
        result = process_user(user_dir.name, user_dir, verbose=verbose)
        results.append(result)

    # Tổng kết
    print("\n" + "=" * 60)
    print("📋 TỔNG KẾT")
    print("=" * 60)
    success_count = sum(1 for r in results if r['status'] == 'success')
    error_count = sum(1 for r in results if r['status'] == 'error')
    skip_count = sum(1 for r in results if r['status'] == 'skip')

    for r in results:
        icon = "✅" if r['status'] == 'success' else ("❌" if r['status'] == 'error' else "⏭️")
        print(f"  {icon}  {r['user_id']:<25} → {r['message']}")

    print("-" * 60)
    print(f"  Thành công: {success_count} | Thất bại: {error_count} | Bỏ qua: {skip_count}")
    print(f"\n✨ Embedding đã lưu tại: {EMBED_DIR}")
    print("   Hệ thống nhận diện sẽ tự động đọc file này khi quét camera.")

    # Liệt kê các file embedding đã có
    existing_embeddings = list(EMBED_DIR.glob('*.npy'))
    if existing_embeddings:
        print(f"\n📦 Tất cả embedding hiện có ({len(existing_embeddings)} người):")
        for emb in sorted(existing_embeddings):
            data = np.load(emb)
            print(f"   - {emb.stem:<25} (shape: {data.shape})")


def print_usage_guide():
    """In hướng dẫn sử dụng chi tiết."""
    print("""
┌─────────────────────────────────────────────────────────────┐
│             HƯỚNG DẪN ĐẶT ẢNH VÀO HỆ THỐNG                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tạo cấu trúc thư mục như sau:                             │
│                                                             │
│  backend/ai_core/data/raw/                                  │
│    ├── nguyen_van_a/      ← Mỗi thư mục = 1 người          │
│    │   ├── 001.jpg                                          │
│    │   ├── 002.jpg                                          │
│    │   └── 003.png                                          │
│    ├── tran_thi_b/                                          │
│    │   ├── chup_selfie.jpg                                  │
│    │   └── anh_ro_mat.png                                   │
│    └── ...                                                  │
│                                                             │
│  Lưu ý:                                                     │
│  • Tên thư mục = user_id trong hệ thống                    │
│  • Định dạng ảnh: .jpg, .jpeg, .png, .bmp, .webp           │
│  • Nên có 5-15 ảnh/người để độ chính xác cao               │
│  • Ảnh phải rõ mặt, đủ sáng, không che khuất               │
│                                                             │
│  Sau khi đặt ảnh xong, chạy lệnh:                          │
│  python -m backend.ai_core.train_from_images               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
""")


def main():
    parser = argparse.ArgumentParser(
        description='Đăng ký khuôn mặt từ file ảnh vào hệ thống nhận diện.'
    )
    parser.add_argument(
        '--user', '-u',
        type=str,
        default=None,
        help='Chỉ xử lý user_id cụ thể (mặc định: xử lý tất cả)'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Ít thông báo hơn (chỉ in tổng kết)'
    )
    parser.add_argument(
        '--guide',
        action='store_true',
        help='Xem hướng dẫn đặt ảnh vào thư mục'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='Liệt kê danh sách embedding đã có'
    )

    args = parser.parse_args()

    if args.guide:
        print_usage_guide()
        return

    if args.list:
        existing = list(EMBED_DIR.glob('*.npy'))
        if not existing:
            print("📭 Chưa có embedding nào. Hãy chạy script để đăng ký khuôn mặt.")
        else:
            print(f"📦 Danh sách embedding ({len(existing)} người):")
            for emb in sorted(existing):
                data = np.load(emb)
                print(f"   • {emb.stem:<30} (dim: {data.shape[0]})")
        return

    train_all(target_user=args.user, verbose=not args.quiet)
    
    # Auto sync embeddings to AWS S3 after offline training
    try:
        from backend.services.s3_service import sync_local_embeddings_to_s3
        print("\nSyncing local embeddings to S3...")
        sync_local_embeddings_to_s3()
    except Exception as e:
        print(f"\nSkipping S3 sync: {e}")



if __name__ == '__main__':
    main()
