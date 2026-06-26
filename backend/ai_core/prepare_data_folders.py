# Script này tạo thư mục mẫu và demo cách đặt ảnh vào đúng chỗ.
# Chạy: python backend/ai_core/prepare_data_folders.py

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT_DIR / 'backend' / 'ai_core' / 'data' / 'raw'
EMBED_DIR = ROOT_DIR / 'backend' / 'ai_core' / 'data' / 'embeddings'

def create_sample_structure():
    """Tạo cấu trúc thư mục mẫu."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    EMBED_DIR.mkdir(parents=True, exist_ok=True)

    sample_users = ['nguyen_van_a', 'tran_thi_b']
    for user in sample_users:
        user_dir = RAW_DIR / user
        user_dir.mkdir(exist_ok=True)
        readme = user_dir / 'README.txt'
        readme.write_text(
            f"Place face images of '{user}' in this directory.\n"
            "File names are arbitrary. Supported: .jpg, .jpeg, .png, .bmp, .webp\n"
            "Recommended: 5-15 images per person for best accuracy.\n",
            encoding='utf-8'
        )

    print("[OK] Created sample folder structure:")
    for user in sample_users:
        print(f"   {RAW_DIR / user}")
    print("\nNext steps:")
    print("  1. Remove README.txt files inside sample folders")
    print("  2. Rename folders to real user_ids (e.g. 'admin', 'john_doe')")
    print("  3. Place face images (.jpg/.png) inside each folder")
    print("  4. Run: python -m backend.ai_core.train_from_images")


if __name__ == '__main__':
    create_sample_structure()
