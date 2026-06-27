#!/usr/bin/env python3
"""
Script đánh giá mô hình nhận diện khuôn mặt (Face Verification) trên tập dữ liệu ảnh gốc.
Tạo các cặp ảnh (Positive và Negative) từ thư mục backend/ai_core/data/raw/,
sau đó đo lường các chỉ số Precision, Recall, F1-Score, MCC, Pearson-Correlation.

Chạy script bằng cách:
  python -m backend.ai_core.evaluate
"""

import sys
import itertools
from pathlib import Path

# Đảm bảo import đúng từ gốc project
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

import numpy as np
from PIL import Image
from backend.ai_core.src.recognizer import embed_face, cosine_similarity
from backend.ai_core.src.evaluation import calculate_metrics

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
RAW_DIR = ROOT_DIR / 'backend' / 'ai_core' / 'data' / 'raw'

def load_image_as_bytes(image_path: Path) -> bytes:
    import io
    img = Image.open(image_path).convert('RGB')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()

def run_evaluation(default_threshold=0.75):
    if not RAW_DIR.exists():
        print(f"[Error] Raw directory does not exist: {RAW_DIR}")
        return

    user_dirs = [d for d in RAW_DIR.iterdir() if d.is_dir()]
    if not user_dirs:
        print(f"[Warning] Raw directory is empty: {RAW_DIR}")
        return

    print("=============================================================")
    print("START EXTRACTING EMBEDDINGS AND EVALUATING MODEL")
    print("=============================================================")

    # 1. Trích xuất embedding cho toàn bộ ảnh trong thư mục raw
    all_images = [] # Lưu tuples: (user_id, image_name, embedding)
    
    for u_dir in user_dirs:
        user_id = u_dir.name
        img_paths = [f for f in u_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXTENSIONS]
        if not img_paths:
            continue
            
        print(f"Processing user: {user_id} ({len(img_paths)} images)")
        for img_path in img_paths:
            try:
                img_bytes = load_image_as_bytes(img_path)
                emb = embed_face(img_bytes)
                if emb is not None:
                    all_images.append((user_id, img_path.name, emb))
                else:
                    print(f"  [Failed] Could not extract face from: {img_path.name}")
            except Exception as e:
                print(f"  [Error] Failed to process {img_path.name}: {e}")

    total_images = len(all_images)
    print(f"\n[OK] Extracted {total_images} face images successfully.")
    if total_images < 2:
        print("[Error] At least 2 images are required for pair comparison.")
        return

    # 2. Tạo các cặp so sánh (Tất cả tổ hợp chập 2 của tập ảnh)
    print("\nGenerating image pairs (Positive & Negative pairs)...")
    pairs = list(itertools.combinations(all_images, 2))
    
    y_true = []      # Nhãn thực tế (1: Cùng người, 0: Khác người)
    scores = []      # Cosine similarity
    
    for (user1, name1, emb1), (user2, name2, emb2) in pairs:
        # Nhãn thực tế
        label = 1 if user1 == user2 else 0
        y_true.append(label)
        
        # Điểm similarity tương đồng cosine
        sim = cosine_similarity(emb1, emb2)
        scores.append(sim)

    y_true = np.array(y_true)
    scores = np.array(scores)
    
    total_pos = int(np.sum(y_true == 1))
    total_neg = int(np.sum(y_true == 0))
    
    print(f"  - Total comparison pairs: {len(pairs)}")
    print(f"  - Positive pairs (Same person): {total_pos}")
    print(f"  - Negative pairs (Different people): {total_neg}")
    
    if total_pos == 0:
        print("[Warning] No positive pairs. Please add at least 2 images for at least one user to get reliable results.")
    
    # 3. Đánh giá tại ngưỡng threshold mặc định
    y_pred_default = (scores >= default_threshold).astype(int)
    default_metrics = calculate_metrics(y_true, y_pred_default, scores)
    
    print("\n" + "=" * 60)
    print(f"EVALUATION METRICS AT DEFAULT THRESHOLD (Threshold = {default_threshold})")
    print("=" * 60)
    print(f"  - True Positives (TP)  : {default_metrics['TP']}")
    print(f"  - True Negatives (TN)  : {default_metrics['TN']}")
    print(f"  - False Positives (FP) : {default_metrics['FP']} (False Alarm / Wrong Acceptance)")
    print(f"  - False Negatives (FN) : {default_metrics['FN']} (False Rejection)")
    print(f"  - Accuracy             : {default_metrics['Accuracy'] * 100:.2f}%")
    print(f"  - Precision            : {default_metrics['Precision'] * 100:.2f}%")
    print(f"  - Recall               : {default_metrics['Recall'] * 100:.2f}%")
    print(f"  - F1-Score             : {default_metrics['F1-Score'] * 100:.2f}%")
    print(f"  - Matthews Correlation : {default_metrics['Matthews-Correlation']:.4f}")
    print(f"  - Pearson Correlation  : {default_metrics['Pearson-Correlation']:.4f}")

    # 4. Tìm kiếm ngưỡng Threshold tối ưu nhất dựa trên F1-Score
    print("\nSearching for optimal threshold...")
    best_threshold = default_threshold
    best_f1 = 0.0
    best_metrics = None
    
    # Thử các ngưỡng từ 0.50 đến 0.95
    threshold_candidates = np.linspace(0.50, 0.95, 46)
    for th in threshold_candidates:
        y_pred_th = (scores >= th).astype(int)
        th_metrics = calculate_metrics(y_true, y_pred_th)
        f1 = th_metrics['F1-Score']
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = th
            best_metrics = th_metrics
            
    if best_metrics:
        print("\n" + "=" * 60)
        print(f"OPTIMAL THRESHOLD FOUND (Best Threshold = {best_threshold:.2f})")
        print("=" * 60)
        print(f"  - Best F1-Score        : {best_f1 * 100:.2f}%")
        print(f"  - Corresponding Accuracy: {best_metrics['Accuracy'] * 100:.2f}%")
        print(f"  - Corresponding Precision: {best_metrics['Precision'] * 100:.2f}%")
        print(f"  - Corresponding Recall: {best_metrics['Recall'] * 100:.2f}%")
        print(f"  - Matthews Correlation : {best_metrics['Matthews-Correlation']:.4f}")
        print(f"  - Recommendation: Use this threshold configuration in recognizer.py for optimal performance.")
    print("=============================================================\n")

if __name__ == '__main__':
    run_evaluation()
    
    # Auto sync embeddings to AWS S3 after evaluation run
    try:
        from backend.services.s3_service import sync_local_embeddings_to_s3
        print("\nSyncing local embeddings to S3...")
        sync_local_embeddings_to_s3()
    except Exception as e:
        print(f"\nSkipping S3 sync: {e}")

