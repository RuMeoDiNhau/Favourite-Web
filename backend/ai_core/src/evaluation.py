import numpy as np

def calculate_metrics(y_true, y_pred, scores=None):
    """
    Tính toán các chỉ số đánh giá mô hình phân loại nhị phân (Ví dụ: So sánh cặp khuôn mặt):
    - Accuracy (Độ chính xác tổng thể)
    - Precision (Độ chính xác trên các mẫu dự đoán là Positive)
    - Recall (Độ phủ / Tỷ lệ tìm thấy các mẫu thực sự là Positive)
    - F1-Score (Trung bình điều hòa giữa Precision và Recall)
    - MCC (Matthews Correlation Coefficient - Hệ số tương quan Matthews, đánh giá hiệu quả ngay cả khi dữ liệu lệch)
    - Pearson Correlation (Hệ số tương quan Pearson giữa nhãn thực tế và điểm tương đồng liên tục)
    
    y_true: list hoặc numpy array chứa nhãn thực tế (1: cùng một người, 0: người khác nhau)
    y_pred: list hoặc numpy array chứa nhãn dự đoán (1: cùng một người, 0: người khác nhau)
    scores: list hoặc numpy array chứa điểm tương đồng cosine (tùy chọn)
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Tính toán các thành phần của Confusion Matrix
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    
    # 1. Accuracy
    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    
    # 2. Precision
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    
    # 3. Recall
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    
    # 4. F1-Score
    f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    # 5. Matthews Correlation Coefficient (MCC)
    # MCC là thước đo tương quan giữa nhãn thực và dự đoán nhị phân (từ -1 đến 1)
    denom = np.sqrt(float(tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    mcc = ((tp * tn) - (fp * fn)) / denom if denom > 0 else 0.0
    
    metrics = {
        "TP": int(tp),
        "TN": int(tn),
        "FP": int(fp),
        "FN": int(fn),
        "Accuracy": float(accuracy),
        "Precision": float(precision),
        "Recall": float(recall),
        "F1-Score": float(f1_score),
        "Matthews-Correlation": float(mcc)
    }
    
    # 6. Pearson Correlation (Tương quan tuyến tính giữa nhãn nhị phân và cosine similarity scores)
    if scores is not None:
        scores = np.array(scores)
        if len(y_true) > 1 and np.std(y_true) > 0 and np.std(scores) > 0:
            pearson_corr = np.corrcoef(y_true, scores)[0, 1]
            metrics["Pearson-Correlation"] = float(pearson_corr)
        else:
            metrics["Pearson-Correlation"] = 0.0
            
    return metrics
