[1mdiff --git a/docs/aws_architecture.md b/docs/aws_architecture.md[m
[1mindex 0e4d1e2..5ead1b7 100644[m
[1m--- a/docs/aws_architecture.md[m
[1m+++ b/docs/aws_architecture.md[m
[36m@@ -1,119 +1,72 @@[m
[31m-# AWS System Architecture Diagram - Fav Web Portal[m
[32m+[m[32m# AWS System Architecture Diagram[m
 [m
[31m-Tài liệu này mô tả chi tiết Kiến trúc Hệ thống Điện toán Đám mây **Amazon Web Services (AWS)** cho ứng dụng **Fav Web Portal** (Hệ thống Cổng thông tin đa phương tiện tích hợp AI Nhận diện khuôn mặt Face ID).[m
[32m+[m[32mThis document presents the system architecture for deploying the **Fav_Web** application (comprising Frontend React/Vite, FastAPI Backend, SQLite-to-RDS PostgreSQL Database, and Face Recognition AI) on AWS.[m
 [m
[31m----[m
[31m-[m
[31m-## 1. Kiến trúc Thực tế Triển khai (Actual Workshop Architecture)[m
[31m-[m
[31m-Dưới đây là sơ đồ kiến trúc thực tế được triển khai thành công trong bài thực hành (Workshop) của chương trình FCAJ:[m
[32m+[m[32m## Architecture Diagram[m
 [m
 ```mermaid[m
 graph TB[m
     %% Nodes[m
     User["User Browser (Client)"][m
[31m-    [m
[31m-    subgraph S3Layer ["AWS S3 Static Web Layer"][m
[31m-        S3Frontend["S3 Bucket: fav-web-frontend-bucket<br>(Static Website Hosting)"][m
[31m-    end[m
[32m+[m[32m    Route53["Route 53 (DNS)"][m
[32m+[m[32m    CloudFront["CloudFront (CDN)"][m
[32m+[m[32m    S3Frontend["S3 Bucket (Static Frontend Host)"][m
[32m+[m[32m    ALB["Application Load Balancer (ALB)"][m
     [m
     subgraph VPC ["AWS VPC (Virtual Private Cloud)"][m
         subgraph PublicSubnet ["Public Subnet (Internet Facing)"][m
[31m-            EC2["EC2 Instance (Ubuntu 22.04 LTS)<br>Docker Container: backend-service (Port 80:8000)<br>FastAPI + AI Face Model"][m
[32m+[m[32m            ALB[m
         end[m
         [m
[31m-        subgraph PrivateSubnet ["Database Layer"][m
[31m-            RDS["AWS RDS PostgreSQL / SQLite Volume"][m
[32m+[m[32m        subgraph PrivateSubnet ["Private Subnet (App & DB Layer)"][m
[32m+[m[32m            ECS["ECS Fargate (FastAPI Backend App)"][m
[32m+[m[32m            RDS["RDS PostgreSQL (Primary Database)"][m
         end[m
     end[m
     [m
[31m-    S3Storage["S3 Bucket: fav-web-storage-bucket<br>(User Photos, Log Captures & .npy Embeddings)"][m
[31m-    IAM["AWS IAM (Access Roles & Keys)"][m
[31m-    CloudWatch["AWS CloudWatch<br>(Log Group /fav-web/backend & CPU Alarm)"][m
[32m+[m[32m    S3Storage["S3 Bucket (User Images & Log Photos)"][m
[32m+[m[32m    IAM["AWS IAM (Access Management)"][m
[32m+[m[32m    CloudWatch["CloudWatch (Monitoring & Logs)"][m
 [m
     %% Connections[m
[31m-    User -->|1. HTTP Get Static Web| S3Frontend[m
[31m-    User -->|2. REST API /api/v1 (JSON/Auth)| EC2[m
[32m+[m[32m    User -->|1. Request DNS| Route53[m
[32m+[m[32m    User -->|2. Get Frontend Assets| CloudFront[m
[32m+[m[32m    CloudFront -->|Sync| S3Frontend[m
     [m
[31m-    EC2 -->|3. Query & Persist Data| RDS[m
[31m-    EC2 -->|4. Upload/Download Media & Vectors| S3Storage[m
[32m+[m[32m    User -->|3. Send API Requests /api/v1| ALB[m
[32m+[m[32m    ALB -->|Forward Traffic| ECS[m
[32m+[m[41m    [m
[32m+[m[32m    ECS -->|4. Query Data| RDS[m
[32m+[m[32m    ECS -->|5. Store/Retrieve Face Images| S3Storage[m
[32m+[m[41m    [m
[32m+[m[32m    ECS -.->|Role Permissions| IAM[m
[32m+[m[32m    ECS -.->|Send Application Logs| CloudWatch[m
     [m
[31m-    EC2 -.->|SDK boto3 Permissions| IAM[m
[31m-    EC2 -.->|Stream Logs via Watchtower| CloudWatch[m
[31m-[m
     %% Styling[m
     style User fill:#f9f,stroke:#333,stroke-width:2px[m
[31m-    style S3Frontend fill:#ffc,stroke:#333,stroke-width:2px[m
[31m-    style EC2 fill:#bbf,stroke:#333,stroke-width:2px[m
     style RDS fill:#9cf,stroke:#333,stroke-width:2px[m
[31m-    style S3Storage fill:#ffc,stroke:#333,stroke-width:2px[m
[31m-    style CloudWatch fill:#fcf,stroke:#333,stroke-width:1px[m
[32m+[m[32m    style S3Frontend fill:#ffc,stroke:#333,stroke-width:1px[m
[32m+[m[32m    style S3Storage fill:#ffc,stroke:#333,stroke-width:1px[m
 ```[m
 [m
[31m-### Chi tiết Luồng xử lý Kỹ thuật (Communication Flow):[m
[31m-[m
[31m-1. **Static Frontend Hosting (Amazon S3):**[m
[31m-   - Ứng dụng React/Vite được đóng gói tối ưu (`dist/`) và đẩy lên **Amazon S3 Bucket** với tính năng *Static Website Hosting*.[m
[31m-   - Trình duyệt Client tải trực tiếp HTML, CSS, JS bundle từ URL S3 Bucket.[m
[31m-[m
[31m-2. **API Backend & AI Processing (Amazon EC2 + Docker):**[m
[31m-   - Các yêu cầu HTTP REST API (`/api/v1/*`) từ trình duyệt được gửi trực tiếp tới địa chỉ IP Public của **Amazon EC2 Instance** (Ubuntu).[m
[31m-   - Máy chủ EC2 chạy một **Docker Container** (`backend-service`) vận hành Python FastAPI + Uvicorn server.[m
[31m-   - Thuật toán AI trích xuất vector khuôn mặt (`facenet-pytorch`/`insightface`) và RAM Caching được thực thi trực tiếp bên trong Container.[m
[31m-[m
[31m-3. **Data & Storage Layer (AWS RDS & Amazon S3 Storage):**[m
[31m-   - Dữ liệu quan hệ (Người dùng, Bài viết, Nhạc, Game, Log) được lưu trữ tại **AWS RDS PostgreSQL** (hoặc SQLite Persist Volume Mount).[m
[31m-   - Ảnh đại diện, ảnh webcam chụp từ Face ID và các tệp numpy vector `.npy` được tự động tải lên **Amazon S3 Storage Bucket** thông qua thư viện `boto3`.[m
[31m-[m
[31m-4. **Security & Monitoring (CORS, CSP, IAM & CloudWatch):**[m
[31m-   - **Bảo mật:** Sử dụng cơ chế JWT Dual Authentication (HttpOnly Cookie + Bearer Token Fallback) kết hợp CORS Whitelist và CSP Meta tag.[m
[31m-   - **Giám sát:** Module `watchtower` gửi log thời gian thực về **AWS CloudWatch Logs** (`/fav-web/backend`) và cấu hình **CloudWatch Alarm** cảnh báo khi CPU EC2 vượt ngưỡng 80%.[m
[31m-[m
[31m----[m
[32m+[m[32m## Communication Flow Explanation[m
 [m
[31m-## 2. Mô hình Mở rộng Sản xuất (Target Production Architecture)[m
[32m+[m[32m### 1. Static Frontend Delivery[m
[32m+[m[32m* **Amazon CloudFront** acts as the Content Delivery Network (CDN) caching the compiled frontend files (HTML, CSS, JS, images) closest to the user.[m
[32m+[m[32m* The source of these files is an **Amazon S3 Bucket** configured for static website hosting.[m
 [m
[31m-Khi ứng dụng mở rộng cho lượng người dùng lớn trong môi trường Production, hệ thống có thể nâng cấp lên mô hình Serverless / Container Orchestration hoàn chỉnh:[m
[31m-[m
[31m-```mermaid[m
[31m-graph TB[m
[31m-    User["User Browser (Client)"][m
[31m-    Route53["Route 53 (DNS Domain)"][m
[31m-    CloudFront["CloudFront (CDN + HTTPS)"][m
[31m-    S3Frontend["S3 Bucket (Static Web Source)"][m
[31m-    ALB["Application Load Balancer (ALB)"][m
[31m-    [m
[31m-    subgraph VPC ["AWS VPC"][m
[31m-        subgraph PublicSubnet ["Public Subnet"][m
[31m-            ALB[m
[31m-        end[m
[31m-        subgraph PrivateSubnet ["Private Subnet"][m
[31m-            ECS["ECS Fargate Auto-Scaling Clusters"][m
[31m-            RDS["RDS PostgreSQL Multi-AZ Primary/Standby"][m
[31m-        end[m
[31m-    end[m
[31m-    [m
[31m-    S3Storage["S3 Bucket (Media Storage)"][m
[31m-    CloudWatch["AWS CloudWatch"][m
[31m-[m
[31m-    User -->|DNS Lookup| Route53[m
[31m-    User -->|HTTPS Requests| CloudFront[m
[31m-    CloudFront -->|Origin Static| S3Frontend[m
[31m-    CloudFront -->|Origin API /api/v1| ALB[m
[31m-    ALB -->|Auto-Scale Traffic| ECS[m
[31m-    ECS -->|Query DB| RDS[m
[31m-    ECS -->|Store Media| S3Storage[m
[31m-    ECS -.->|Logs & Metrics| CloudWatch[m
[31m-```[m
[32m+[m[32m### 2. API Traffic routing[m
[32m+[m[32m* All API requests targeting `/api/v1/*` are sent to the **Application Load Balancer (ALB)**.[m
[32m+[m[32m* The ALB terminates SSL/TLS certificates and distributes traffic to active containers.[m
 [m
[31m----[m
[32m+[m[32m### 3. Application Execution (FastAPI Backend & AI Model)[m
[32m+[m[32m* The FastAPI backend is packaged as a Docker image and runs on **AWS ECS Fargate**.[m
[32m+[m[32m* Fargate is serverless, meaning AWS manages the underlying server infrastructure, scaling the containers based on CPU and Memory usage.[m
[32m+[m[32m* The face recognition inference (using the AI model in `backend/ai_core`) executes directly within the container instance.[m
 [m
[31m-## 3. Bảng Tổng hợp Dịch vụ AWS Sử dụng[m
[32m+[m[32m### 4. Relational Database Layer[m
[32m+[m[32m* While development uses local SQLite (`app.db`), production uses **Amazon RDS (PostgreSQL/MySQL)** inside a private subnet.[m
[32m+[m[32m* This ensures data safety, automated backups, and database replication/scaling.[m
 [m
[31m-| Dịch vụ AWS | Vai trò trong Hệ thống | Ghi chú Triển khai |[m
[31m-| --- | --- | --- |[m
[31m-| **Amazon S3** | Static Website Hosting & Object Storage | `fav-web-frontend-bucket` & `fav-web-storage-bucket` |[m
[31m-| **Amazon EC2** | Máy chủ Virtual Server chạy Backend Docker | Ubuntu 22.04 LTS, Docker Engine, Port 80/8000 |[m
[31m-| **Amazon RDS** | Relational Database Managed Service | PostgreSQL DB Instance (Free Tier) |[m
[31m-| **Amazon CloudWatch** | Giám sát Log & Cảnh báo tài nguyên | Log Group `/fav-web/backend` & CPU Metric Alarm |[m
[31m-| **AWS IAM** | Quản lý Quyền truy cập & Security Keys | Access Keys & Policy S3/CloudWatch Access |[m
[32m+[m[32m### 5. Media & Logs Storage[m
[32m+[m[32m* User images uploaded during enrollment and photos captured from webcam logs are stored securely in an **Amazon S3 Bucket (Storage)** instead of the container's local file system. This allows backend containers to remain stateless and scale horizontally.[m
[1mdiff --git a/frontend/index.html b/frontend/index.html[m
[1mindex 8e28a3f..e937c53 100644[m
[1m--- a/frontend/index.html[m
[1m+++ b/frontend/index.html[m
[36m@@ -26,7 +26,7 @@[m
         - `connect-src 'self' http://localhost:8000` matches the axios baseURL.[m
     -->[m
     <meta http-equiv="Content-Security-Policy"[m
[31m-          content="default-src 'self'; img-src 'self' data: https: http:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' http: https:; connect-src 'self' http: https: ws: wss:;" />[m
[32m+[m[32m          content="default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src http://localhost:8000 https:; connect-src 'self' http://localhost:8000;" />[m
     <title>Fav Web Face Recognition</title>[m
   </head>[m
   <body>[m
[1mdiff --git a/frontend/package-lock.json b/frontend/package-lock.json[m
[1mindex b875788..7070cb8 100644[m
[1m--- a/frontend/package-lock.json[m
[1m+++ b/frontend/package-lock.json[m
[36m@@ -9,8 +9,11 @@[m
       "version": "0.1.0",[m
       "dependencies": {[m
         "axios": "^1.8.1",[m
[32m+[m[32m        "i18next": "^26.3.6",[m
[32m+[m[32m        "i18next-browser-languagedetector": "^8.2.1",[m
         "react": "^18.3.1",[m
         "react-dom": "^18.3.1",[m
[32m+[m[32m        "react-i18next": "^17.0.11",[m
         "recharts": "^3.9.0"[m
       },[m
       "devDependencies": {[m
[36m@@ -272,6 +275,14 @@[m
         "@babel/core": "^7.0.0-0"[m
       }[m
     },[m
[32m+[m[32m    "node_modules/@babel/runtime": {[m
[32m+[m[32m      "version": "7.29.7",[m
[32m+[m[32m      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.7.tgz",[m
[32m+[m[32m      "integrity": "sha512-Nq8OhGWiZIZGV6hLHoyAKLLcJihP/xFeBMGJoUrxTX2psI8dCifzLhZISFb+VWS3wFMRDmCGw5R+dOySCqPLhw==",[m
[32m+[m[32m      "engines": {[m
[32m+[m[32m        "node": ">=6.9.0"[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
     "node_modules/@babel/template": {[m
       "version": "7.29.7",[m
       "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.29.7.tgz",[m
[36m@@ -1948,6 +1959,14 @@[m
         "node": ">= 0.4"[m
       }[m
     },[m
[32m+[m[32m    "node_modules/html-parse-stringify": {[m
[32m+[m[32m      "version": "4.0.1",[m
[32m+[m[32m      "resolved": "https://registry.npmjs.org/html-parse-stringify/-/html-parse-stringify-4.0.1.tgz",[m
[32m+[m[32m      "integrity": "sha512-0zHsZJrK7S3K2aucXWL6ycoYJ/iNtIcFHC/nYQgFklPtrv5LpJctIiSCroWZWeuoXvuyFdzp6KzjJQ+OT5MfFw==",[m
[32m+[m[32m      "funding": {[m
[32m+[m[32m        "url": "https://locize.com"[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
     "node_modules/https-proxy-agent": {[m
       "version": "5.0.1",[m
       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-5.0.1.tgz",[m
[36m@@ -1961,6 +1980,41 @@[m
         "node": ">= 6"[m
       }[m
     },[m
[32m+[m[32m    "node_modules/i18next": {[m
[32m+[m[32m      "version": "26.3.6",[m
[32m+[m[32m      "resolved": "https://registry.npmjs.org/i18next/-/i18next-26.3.6.tgz",[m
[32m+[m[32m      "integrity": "sha512-Bu5Z2nAXgfVyM8xvW3jk9EKRIuX37PudsrBViThNFx7CR7aaYTpP01cxNB/E4c4UUzTDiAZRstEhsRfPOL/8xA==",[m
[32m+[m[32m      "funding": [[m
[32m+[m[32m        {[m
[32m+[m[32m          "type": "individual",[m
[32m+[m[32m          "url": "https://www.locize.com/i18next"[m
[32m+[m[32m        },[m
[32m+[m[32m        {[m
[32m+[m[32m          "type": "individual",[m
[32m+[m[32m          "url": "https://www.i18next.com/how-to/faq#i18next-is-awesome.-how-can-i-support-the-project"[m
[32m+[m[32m        },[m
[32m+[m[32m        {[m
[32m+[m[32m          "type": "individual",[m
[32m+[m[32m          "url": "https://www.locize.com"[m
[32m+[m[32m        }[m
[32m+[m[32m      ],[m
[32m+[m[32m      "peerDependencies": {[m
[32m+[m[32m        "typescript": "^5 || ^6 || ^7"[m
[32m+[m[32m      },[m
[32m+[m[32m      "peerDependenciesMeta": {[m
[32m+[m[32m        "typescript": {[m
[32m+[m[32m          "optional": true[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
[32m+[m[32m    "node_modules/i18next-browser-languagedetector": {[m
[32m+[m[32m      "version": "8.2.1",[m
[32m+[m[32m      "resolved": "https://registry.npmjs.org/i18next-browser-languagedetector/-/i18next-browser-languagedetector-8.2.1.tgz",[m
[32m+[m[32m      "integrity": "sha512-bZg8+4bdmaOiApD7N7BPT9W8MLZG+nPTOFlLiJiT8uzKXFjhxw4v2ierCXOwB5sFDMtuA5G4kgYZ0AznZxQ/cw==",[m
[32m+[m[32m      "dependencies": {[m
[32m+[m[32m        "@babel/runtime": "^7.23.2"[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
     "node_modules/immer": {[m
       "version": "10.2.0",[m
       "resolved": "https://registry.npmjs.org/immer/-/immer-10.2.0.tgz",[m
[36m@@ -2169,6 +2223,32 @@[m
         "react": "^18.3.1"[m
       }[m
     },[m
[32m+[m[32m    "node_modules/react-i18next": {[m
[32m+[m[32m      "version": "17.0.11",[m
[32m+[m[32m      "resolved": "https://registry.npmjs.org/react-i18next/-/react-i18next-17.0.11.tgz",[m
[32m+[m[32m      "integrity": "sha512-cDtkXgxjuFTWUH6V+aQn1Ve5vDiUztCNPWW5GtSHDccsgRXO1nE6QFWCEmc1KAutrb3OUv87wFShJL5RhUwPXg==",[m
[32m+[m[32m      "dependencies": {[m
[32m+[m[32m        "@babel/runtime": "^7.29.2",[m
[32m+[m[32m        "html-parse-stringify": "^4.0.1",[m
[32m+[m[32m        "use-sync-external-store": "^1.6.0"[m
[32m+[m[32m      },[m
[32m+[m[32m      "peerDependencies": {[m
[32m+[m[32m        "i18next": ">= 26.2.0",[m
[32m+[m[32m        "react": ">= 16.8.0",[m
[32m+[m[32m        "typescript": "^5 || ^6 || ^7"[m
[32m+[m[32m      },[m
[32m+[m[32m      "peerDependenciesMeta": {[m
[32m+[m[32m        "react-dom": {[m
[32m+[m[32m          "optional": true[m
[32m+[m[32m        },[m
[32m+[m[32m        "react-native": {[m
[32m+[m[32m          "optional": true[m
[32m+[m[32m        },[m
[32m+[m[32m        "typescript": {[m
[32m+[m[32m          "optional": true[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
     "node_modules/react-is": {[m
       "version": "19.2.7",[m
       "resolved": "https://registry.npmjs.org/react-is/-/react-is-19.2.7.tgz",[m
[1mdiff --git a/frontend/package.json b/frontend/package.json[m
[1mindex 8bd36b6..24e083d 100644[m
[1m--- a/frontend/package.json[m
[1m+++ b/frontend/package.json[m
[36m@@ -10,8 +10,11 @@[m
   },[m
   "dependencies": {[m
     "axios": "^1.8.1",[m
[32m+[m[32m    "i18next": "^26.3.6",[m
[32m+[m[32m    "i18next-browser-languagedetector": "^8.2.1",[m
     "react": "^18.3.1",[m
     "react-dom": "^18.3.1",[m
[32m+[m[32m    "react-i18next": "^17.0.11",[m
     "recharts": "^3.9.0"[m
   },[m
   "devDependencies": {[m
[1mdiff --git a/frontend/src/App.css b/frontend/src/App.css[m
[1mindex b1f505c..4fb42a2 100644[m
[1m--- a/frontend/src/App.css[m
[1m+++ b/frontend/src/App.css[m
[36m@@ -15,6 +15,7 @@[m [mhtml, body {[m
   --text-main:        #1b263b;[m
   --text-title:       #0f172a;[m
   --text-muted:       #64748b;[m
[32m+[m[32m  --text-on-accent:   #ffffff;[m
   --border-color:     #cbd5e1;[m
   --border-card:      #e2e8f0;[m
   --bg-item:          #f1f5f9;[m
[36m@@ -24,10 +25,81 @@[m [mhtml, body {[m
   --shadow-card:      0 4px 20px rgba(15, 23, 42, 0.03);[m
   --shadow-card-hover:0 10px 30px rgba(15, 23, 42, 0.06);[m
 [m
[31m-  /* ── Sidebar tokens (always dark, independent of theme) ── */[m
[31m-  --sidebar-bg:       #0f172a;[m
[31m-  --sidebar-width:    260px;[m
[31m-  --topbar-height:    52px;[m
[32m+[m[32m  /* ── Glassmorphism (originally tuned for dark — light override below) ── */[m
[32m+[m[32m  --glass-bg:         rgba(15, 23, 42, 0.04);[m
[32m+[m[32m  --glass-bg-hover:   rgba(15, 23, 42, 0.08);[m
[32m+[m[32m  --glass-border:     rgba(15, 23, 42, 0.10);[m
[32m+[m[32m  --glass-text:       var(--text-main);[m
[32m+[m[32m  --glass-text-muted: var(--text-muted);[m
[32m+[m
[32m+[m[32m  /* ── Status / badge backgrounds (light) ── */[m
[32m+[m[32m  --status-info-bg:    #e0f2fe;[m
[32m+[m[32m  --status-info-fg:    #0369a1;[m
[32m+[m[32m  --status-success-bg: #dcfce7;[m
[32m+[m[32m  --status-success-fg: #166534;[m
[32m+[m[32m  --status-error-bg:   #fee2e2;[m
[32m+[m[32m  --status-error-fg:   #991b1b;[m
[32m+[m[32m  --status-warn-bg:    #fef3c7;[m
[32m+[m[32m  --status-warn-fg:    #92400e;[m
[32m+[m[32m  --status-scanning-bg:#f0f9ff;[m
[32m+[m[32m  --status-scanning-fg:#0369a1;[m
[32m+[m
[32m+[m[32m  /* ── Post badge (light) ── */[m
[32m+[m[32m  --badge-image-bg:   #fdf2f8;[m
[32m+[m[32m  --badge-image-fg:   #db2777;[m
[32m+[m[32m  --badge-video-bg:   #f5f3ff;[m
[32m+[m[32m  --badge-video-fg:   #7c3aed;[m
[32m+[m[32m  --badge-audio-bg:   #ecfdf5;[m
[32m+[m[32m  --badge-audio-fg:   #059669;[m
[32m+[m[32m  --badge-game-bg:    #fff7ed;[m
[32m+[m[32m  --badge-game-fg:    #ea580c;[m
[32m+[m[32m  --badge-text-bg:    #fef3c7;[m
[32m+[m[32m  --badge-text-fg:    #d97706;[m
[32m+[m[32m  --badge-category-bg:#e0f2fe;[m
[32m+[m[32m  --badge-category-fg:#0369a1;[m
[32m+[m
[32m+[m[32m  /* ── Brand accent (unchanged across themes) ── */[m
[32m+[m[32m  --accent-primary:    #6366f1;[m
[32m+[m[32m  --accent-primary-2:  #4f46e5;[m
[32m+[m[32m  --accent-success:    #10b981;[m
[32m+[m[32m  --accent-success-2:  #059669;[m
[32m+[m[32m  --accent-danger:     #ef4444;[m
[32m+[m[32m  --accent-danger-2:   #dc2626;[m
[32m+[m[32m  --accent-warn:       #f59e0b;[m
[32m+[m[32m  --accent-pink:       #d946ef;[m
[32m+[m[32m  --accent-pink-2:     #a855f7;[m
[32m+[m[32m  --accent-orange:     #f97316;[m
[32m+[m[32m  --accent-orange-2:   #ea580c;[m
[32m+[m[32m  --accent-purple:     #8b5cf6;[m
[32m+[m[32m  --accent-purple-2:   #7c3aed;[m
[32m+[m
[32m+[m[32m  /* ── Camera / scanner dark surface (always dark) ── */[m
[32m+[m[32m  --scanner-bg:         #0f172a;[m
[32m+[m[32m  --scanner-border:     rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  --scanner-frame:      #334155;[m
[32m+[m[32m  --scanner-text:       #94a3b8;[m
[32m+[m[32m  --scanner-text-muted: #94a3b8;[m
[32m+[m
[32m+[m[32m  /* ── Sidebar tokens (theme-aware: matches current theme) ── */[m
[32m+[m[32m  --sidebar-bg:           #ffffff;[m
[32m+[m[32m  --sidebar-border:       rgba(15, 23, 42, 0.08);[m
[32m+[m[32m  --sidebar-shadow:       4px 0 24px rgba(15, 23, 42, 0.04);[m
[32m+[m[32m  --sidebar-text:         #1b263b;[m
[32m+[m[32m  --sidebar-text-muted:   #64748b;[m
[32m+[m[32m  --sidebar-hover-bg:     rgba(99, 102, 241, 0.08);[m
[32m+[m[32m  --sidebar-hover-text:   #4f46e5;[m
[32m+[m[32m  --sidebar-active-bg:    rgba(99, 102, 241, 0.14);[m
[32m+[m[32m  --sidebar-active-text:  #4338ca;[m
[32m+[m[32m  --sidebar-active-border:rgba(99, 102, 241, 0.25);[m
[32m+[m[32m  --sidebar-username:     #0f172a;[m
[32m+[m[32m  --sidebar-role:         #94a3b8;[m
[32m+[m[32m  --sidebar-input-bg:     rgba(15, 23, 42, 0.04);[m
[32m+[m[32m  --sidebar-input-border: rgba(15, 23, 42, 0.10);[m
[32m+[m[32m  --sidebar-input-bg-focus: rgba(15, 23, 42, 0.08);[m
[32m+[m[32m  --sidebar-logo-from:    #38bdf8;[m
[32m+[m[32m  --sidebar-logo-to:      #818cf8;[m
[32m+[m[32m  --sidebar-width:        260px;[m
[32m+[m[32m  --topbar-height:        52px;[m
 [m
   font-family: 'Inter', Arial, sans-serif;[m
   background: var(--bg-app);[m
[36m@@ -43,14 +115,67 @@[m [mhtml, body {[m
   --text-main:        #cbd5e1;[m
   --text-title:       #f8fafc;[m
   --text-muted:       #94a3b8;[m
[32m+[m[32m  --text-on-accent:   #ffffff;[m
   --border-color:     #30363d;[m
   --border-card:      #30363d;[m
[31m-  --bg-item:          #0d1117;[m
[32m+[m[32m  --bg-item:          #161b22;[m
   --bg-input:         #0d1117;[m
   --text-input:       #cbd5e1;[m
   --border-input:     #30363d;[m
   --shadow-card:      0 4px 20px rgba(0, 0, 0, 0.4);[m
   --shadow-card-hover:0 10px 30px rgba(0, 0, 0, 0.5);[m
[32m+[m
[32m+[m[32m  /* ── Sidebar (dark theme: keep dark) ── */[m
[32m+[m[32m  --sidebar-bg:           #0f172a;[m
[32m+[m[32m  --sidebar-border:       rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  --sidebar-shadow:       4px 0 24px rgba(0, 0, 0, 0.3);[m
[32m+[m[32m  --sidebar-text:         #94a3b8;[m
[32m+[m[32m  --sidebar-text-muted:   #64748b;[m
[32m+[m[32m  --sidebar-hover-bg:     rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  --sidebar-hover-text:   #e2e8f0;[m
[32m+[m[32m  --sidebar-active-bg:    rgba(99, 102, 241, 0.18);[m
[32m+[m[32m  --sidebar-active-text:  #a5b4fc;[m
[32m+[m[32m  --sidebar-active-border:rgba(99, 102, 241, 0.25);[m
[32m+[m[32m  --sidebar-username:     #e2e8f0;[m
[32m+[m[32m  --sidebar-role:         #64748b;[m
[32m+[m[32m  --sidebar-input-bg:     rgba(255, 255, 255, 0.08);[m
[32m+[m[32m  --sidebar-input-border: rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  --sidebar-input-bg-focus: rgba(255, 255, 255, 0.12);[m
[32m+[m[32m  --sidebar-logo-from:    #38bdf8;[m
[32m+[m[32m  --sidebar-logo-to:      #818cf8;[m
[32m+[m
[32m+[m[32m  /* ── Glassmorphism on dark ── */[m
[32m+[m[32m  --glass-bg:         rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  --glass-bg-hover:   rgba(255, 255, 255, 0.12);[m
[32m+[m[32m  --glass-border:     rgba(255, 255, 255, 0.14);[m
[32m+[m[32m  --glass-text:       var(--text-main);[m
[32m+[m[32m  --glass-text-muted: rgba(255, 255, 255, 0.65);[m
[32m+[m
[32m+[m[32m  /* ── Status / badge backgrounds (dark) ── */[m
[32m+[m[32m  --status-info-bg:    rgba(56, 189, 248, 0.14);[m
[32m+[m[32m  --status-info-fg:    #7dd3fc;[m
[32m+[m[32m  --status-success-bg: rgba(34, 197, 94, 0.14);[m
[32m+[m[32m  --status-success-fg: #86efac;[m
[32m+[m[32m  --status-error-bg:   rgba(239, 68, 68, 0.16);[m
[32m+[m[32m  --status-error-fg:   #fca5a5;[m
[32m+[m[32m  --status-warn-bg:    rgba(245, 158, 11, 0.16);[m
[32m+[m[32m  --status-warn-fg:    #fcd34d;[m
[32m+[m[32m  --status-scanning-bg:rgba(56, 189, 248, 0.10);[m
[32m+[m[32m  --status-scanning-fg:#7dd3fc;[m
[32m+[m
[32m+[m[32m  /* ── Post badge (dark) ── */[m
[32m+[m[32m  --badge-image-bg:   rgba(219, 39, 119, 0.18);[m
[32m+[m[32m  --badge-image-fg:   #f9a8d4;[m
[32m+[m[32m  --badge-video-bg:   rgba(124, 58, 237, 0.18);[m
[32m+[m[32m  --badge-video-fg:   #c4b5fd;[m
[32m+[m[32m  --badge-audio-bg:   rgba(5, 150, 105, 0.20);[m
[32m+[m[32m  --badge-audio-fg:   #6ee7b7;[m
[32m+[m[32m  --badge-game-bg:    rgba(234, 88, 12, 0.18);[m
[32m+[m[32m  --badge-game-fg:    #fdba74;[m
[32m+[m[32m  --badge-text-bg:    rgba(217, 119, 6, 0.18);[m
[32m+[m[32m  --badge-text-fg:    #fcd34d;[m
[32m+[m[32m  --badge-category-bg:rgba(56, 189, 248, 0.18);[m
[32m+[m[32m  --badge-category-fg:#7dd3fc;[m
 }[m
 [m
 /* ══════════════════════════════════════════════════════[m
[36m@@ -75,15 +200,15 @@[m [mhtml, body {[m
   left: 0;[m
   bottom: 0;[m
   z-index: 200;[m
[31m-  border-right: 1px solid rgba(255, 255, 255, 0.06);[m
[31m-  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);[m
[31m-  transition: transform 0.25s ease;[m
[32m+[m[32m  border-right: 1px solid var(--sidebar-border);[m
[32m+[m[32m  box-shadow: var(--sidebar-shadow);[m
[32m+[m[32m  transition: transform 0.25s ease, background 0.3s ease, border-color 0.3s ease;[m
 }[m
 [m
 /* ── Sidebar: Logo header ── */[m
 .sidebar-header {[m
   padding: 20px 20px 14px;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-bottom: 1px solid var(--sidebar-border);[m
   flex-shrink: 0;[m
 }[m
 [m
[36m@@ -103,7 +228,7 @@[m [mhtml, body {[m
   font-size: 1.3rem;[m
   font-weight: 800;[m
   letter-spacing: 0.5px;[m
[31m-  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);[m
[32m+[m[32m  background: linear-gradient(135deg, var(--sidebar-logo-from) 0%, var(--sidebar-logo-to) 100%);[m
   -webkit-background-clip: text;[m
   -webkit-text-fill-color: transparent;[m
   white-space: nowrap;[m
[36m@@ -121,11 +246,11 @@[m [mhtml, body {[m
   overflow-x: hidden;[m
   padding: 10px 10px;[m
   scrollbar-width: thin;[m
[31m-  scrollbar-color: rgba(255,255,255,0.1) transparent;[m
[32m+[m[32m  scrollbar-color: var(--sidebar-hover-bg) transparent;[m
 }[m
 [m
 .sidebar-nav::-webkit-scrollbar { width: 4px; }[m
[31m-.sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }[m
[32m+[m[32m.sidebar-nav::-webkit-scrollbar-thumb { background: var(--sidebar-hover-bg); border-radius: 2px; }[m
 [m
 .sidebar-nav-item {[m
   display: flex;[m
[36m@@ -136,7 +261,7 @@[m [mhtml, body {[m
   border-radius: 10px;[m
   background: transparent;[m
   border: none;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--sidebar-text);[m
   font-size: 0.88rem;[m
   font-weight: 500;[m
   cursor: pointer;[m
[36m@@ -148,16 +273,16 @@[m [mhtml, body {[m
 }[m
 [m
 .sidebar-nav-item:hover {[m
[31m-  background: rgba(255, 255, 255, 0.06);[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  background: var(--sidebar-hover-bg);[m
[32m+[m[32m  color: var(--sidebar-hover-text);[m
   transform: translateX(2px);[m
 }[m
 [m
 .sidebar-nav-item.active {[m
[31m-  background: rgba(99, 102, 241, 0.18);[m
[31m-  color: #a5b4fc;[m
[32m+[m[32m  background: var(--sidebar-active-bg);[m
[32m+[m[32m  color: var(--sidebar-active-text);[m
   font-weight: 700;[m
[31m-  border: 1px solid rgba(99, 102, 241, 0.25);[m
[32m+[m[32m  border: 1px solid var(--sidebar-active-border);[m
 }[m
 [m
 .sidebar-nav-item.active::before {[m
[36m@@ -181,7 +306,7 @@[m [mhtml, body {[m
 /* ── Sidebar: Bottom (User Profile) ── */[m
 .sidebar-bottom {[m
   padding: 12px 10px;[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-top: 1px solid var(--sidebar-border);[m
   flex-shrink: 0;[m
 }[m
 [m
[36m@@ -192,8 +317,8 @@[m [mhtml, body {[m
   gap: 8px;[m
   width: 100%;[m
   padding: 10px 16px;[m
[31m-  background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%);[m
[31m-  color: white;[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-pink-2) 0%, var(--accent-pink) 100%);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   border-radius: 10px;[m
   font-weight: 700;[m
[36m@@ -221,7 +346,7 @@[m [mhtml, body {[m
 }[m
 [m
 .sidebar-user:hover {[m
[31m-  background: rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  background: var(--sidebar-hover-bg);[m
 }[m
 [m
 .sidebar-avatar {[m
[36m@@ -248,7 +373,7 @@[m [mhtml, body {[m
 .sidebar-username {[m
   font-size: 0.82rem;[m
   font-weight: 600;[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--sidebar-username);[m
   white-space: nowrap;[m
   overflow: hidden;[m
   text-overflow: ellipsis;[m
[36m@@ -256,13 +381,13 @@[m [mhtml, body {[m
 [m
 .sidebar-role {[m
   font-size: 0.72rem;[m
[31m-  color: #64748b;[m
[32m+[m[32m  color: var(--sidebar-role);[m
 }[m
 [m
 .sidebar-logout-btn {[m
   background: none;[m
   border: none;[m
[31m-  color: #64748b;[m
[32m+[m[32m  color: var(--sidebar-text-muted);[m
   cursor: pointer;[m
   padding: 4px;[m
   border-radius: 6px;[m
[36m@@ -272,8 +397,8 @@[m [mhtml, body {[m
 }[m
 [m
 .sidebar-logout-btn:hover {[m
[31m-  color: #f87171;[m
[31m-  background: rgba(239, 68, 68, 0.1);[m
[32m+[m[32m  color: var(--accent-danger);[m
[32m+[m[32m  background: var(--status-error-bg);[m
 }[m
 [m
 /* ══════════════════════════════════════════════════════[m
[36m@@ -360,8 +485,8 @@[m [mhtml, body {[m
 }[m
 [m
 .theme-toggle-btn:hover {[m
[31m-  border-color: #6366f1;[m
[31m-  color: #6366f1;[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--accent-primary);[m
   background: rgba(99, 102, 241, 0.08);[m
   transform: translateY(-1px);[m
 }[m
[36m@@ -518,7 +643,7 @@[m [minput[type="number"]:focus,[m
 select:focus,[m
 textarea:focus {[m
   outline: none;[m
[31m-  border-color: #6366f1;[m
[32m+[m[32m  border-color: var(--accent-primary);[m
   box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);[m
 }[m
 [m
[1mdiff --git a/frontend/src/App.jsx b/frontend/src/App.jsx[m
[1mindex a8d7035..eb68dca 100644[m
[1m--- a/frontend/src/App.jsx[m
[1m+++ b/frontend/src/App.jsx[m
[36m@@ -13,6 +13,8 @@[m [mimport PostModal from './pages/Feed/PostModal';[m
 import FaceSetupModal from './components/FaceSetupModal';[m
 import SearchBar from './components/SearchBar';[m
 import NotificationBell from './components/NotificationBell';[m
[32m+[m[32mimport LanguageSwitcher from './components/LanguageSwitcher';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import Bookmarks from './pages/Bookmarks';[m
 import UserProfile from './pages/UserProfile';[m
 import Collections from './pages/Collections/Collections';[m
[36m@@ -59,6 +61,7 @@[m [mconst viewToPath = (viewName, detail) => {[m
 };[m
 [m
 function App() {[m
[32m+[m[32m  const { t } = useTranslation();[m
   // `user` lives in React state only (not localStorage). The BE[m
   // sets the auth cookie; on page reload we rebuild this object[m
   // via /auth/me. The old localStorage pattern was a second[m
[36m@@ -270,16 +273,16 @@[m [mfunction App() {[m
   // Single source of truth for nav items so desktop <nav> and mobile drawer[m
   // can't drift. `adminOnly` is gated against the current user's role.[m
   const NAV_ITEMS = [[m
[31m-    { name: 'home',        icon: '🏠', label: 'Trang chủ' },[m
[31m-    { name: 'feed',        icon: '📰', label: 'Bảng tin' },[m
[31m-    { name: 'bookmarks',   icon: '🔖', label: 'Đã lưu' },[m
[31m-    { name: 'collections', icon: '📂', label: 'Bộ sưu tập' },[m
[31m-    { name: 'dashboard',   icon: '📷', label: 'Quét khuôn mặt' },[m
[31m-    { name: 'users',       icon: '👥', label: 'Users', adminOnly: true },[m
[31m-    { name: 'logs',        icon: '📋', label: 'Logs',  adminOnly: true },[m
[31m-    { name: 'games',       icon: '🎮', label: 'Games' },[m
[31m-    { name: 'music',       icon: '🎵', label: 'Music' },[m
[31m-    { name: 'knowledge',   icon: '📚', label: 'Knowledge' },[m
[32m+[m[32m    { name: 'home',        icon: '🏠', labelKey: 'nav.home' },[m
[32m+[m[32m    { name: 'feed',        icon: '📰', labelKey: 'nav.feed' },[m
[32m+[m[32m    { name: 'bookmarks',   icon: '🔖', labelKey: 'nav.bookmarks' },[m
[32m+[m[32m    { name: 'collections', icon: '📂', labelKey: 'nav.collections' },[m
[32m+[m[32m    { name: 'dashboard',   icon: '📷', labelKey: 'nav.dashboard' },[m
[32m+[m[32m    { name: 'users',       icon: '👥', labelKey: 'nav.users', adminOnly: true },[m
[32m+[m[32m    { name: 'logs',        icon: '📋', labelKey: 'nav.logs',  adminOnly: true },[m
[32m+[m[32m    { name: 'games',       icon: '🎮', labelKey: 'nav.games' },[m
[32m+[m[32m    { name: 'music',       icon: '🎵', labelKey: 'nav.music' },[m
[32m+[m[32m    { name: 'knowledge',   icon: '📚', labelKey: 'nav.knowledge' },[m
   ];[m
   const visibleNav = NAV_ITEMS.filter((it) => !it.adminOnly || user.role === 'admin');[m
 [m
[36m@@ -289,7 +292,7 @@[m [mfunction App() {[m
       className={view === item.name ? 'active' : ''}[m
       onClick={() => setView(item.name)}[m
     >[m
[31m-      {item.label}[m
[32m+[m[32m      {t(item.labelKey)}[m
     </button>[m
   );[m
 [m
[36m@@ -298,7 +301,7 @@[m [mfunction App() {[m
       <div className={`App ${isDarkMode ? 'dark-theme' : ''}`}>[m
         <div className="app-shell">[m
 [m
[31m-          {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• [m
[32m+[m[32m          {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•[m
               SIDEBAR (fixed left column)[m
               ════════════════════════════════════════════════════════════════ */}[m
           <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>[m
[36m@@ -307,7 +310,7 @@[m [mfunction App() {[m
             <div className="sidebar-header">[m
               <div className="sidebar-logo" onClick={() => window.location.href = '/'}>[m
                 <span className="sidebar-logo-icon">🌐</span>[m
[31m-                <span className="sidebar-logo-text">Fav Web</span>[m
[32m+[m[32m                <span className="sidebar-logo-text">{t('auth.portalShort')}</span>[m
               </div>[m
               <div className="sidebar-search">[m
                 <SearchBar[m
[36m@@ -327,7 +330,7 @@[m [mfunction App() {[m
                   onClick={() => { setView(item.name); setSidebarOpen(false); }}[m
                 >[m
                   <span className="sidebar-nav-icon">{item.icon}</span>[m
[31m-                  {item.label}[m
[32m+[m[32m                  {t(item.labelKey)}[m
                 </button>[m
               ))}[m
             </nav>[m
[36m@@ -338,9 +341,15 @@[m [mfunction App() {[m
                 className="sidebar-post-btn"[m
                 onClick={() => setShowPostModal(true)}[m
               >[m
[31m-                ✏️ Đăng bài mới[m
[32m+[m[32m                ✏️ {t('nav.postNew')}[m
               </button>[m
 [m
[32m+[m[32m              {/* Language pill — sits between the post button and the[m
[32m+[m[32m                  user chip so it's reachable without crowding either.[m
[32m+[m[32m                  Active state reads off i18next.language directly so the[m
[32m+[m[32m                  pill flips as soon as the user picks the other side. */}[m
[32m+[m[32m              <LanguageSwitcher />[m
[32m+[m
               <div className="sidebar-user">[m
                 {user.avatar_url ? ([m
                   <img[m
[36m@@ -360,7 +369,7 @@[m [mfunction App() {[m
                 <button[m
                   className="sidebar-logout-btn"[m
                   onClick={handleLogout}[m
[31m-                  title="Đăng xuất"[m
[32m+[m[32m                  title={t('nav.signOut')}[m
                 >[m
                   ⏻[m
                 </button>[m
[36m@@ -397,9 +406,9 @@[m [mfunction App() {[m
                 <button[m
                   className="theme-toggle-btn"[m
                   onClick={toggleTheme}[m
[31m-                  title={isDarkMode ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'}[m
[32m+[m[32m                  title={isDarkMode ? t('nav.themeLight') : t('nav.themeDark')}[m
                 >[m
[31m-                  {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}[m
[32m+[m[32m                  {isDarkMode ? t('nav.lightShort') : t('nav.darkShort')}[m
                 </button>[m
               </div>[m
             </header>[m
[36m@@ -411,10 +420,10 @@[m [mfunction App() {[m
                   <span style={{ fontSize: '18px' }}>🔐</span>[m
                   <div>[m
                     <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#a5b4fc' }}>[m
[31m-                      Bạn chưa kích hoạt Face ID.[m
[32m+[m[32m                      {t('dashboard.banner.inactive')}[m
                     </span>[m
                     <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '8px' }}>[m
[31m-                      Đăng ký khuôn mặt để đăng nhập nhanh hơn bằng camera.[m
[32m+[m[32m                      {t('dashboard.banner.cta')}[m
                     </span>[m
                   </div>[m
                 </div>[m
[36m@@ -422,7 +431,7 @@[m [mfunction App() {[m
                   className="face-id-activate-btn"[m
                   onClick={() => setShowFaceSetup(true)}[m
                 >[m
[31m-                  📷 Kích hoạt Face ID ngay[m
[32m+[m[32m                  📷 {t('dashboard.banner.activate')}[m
                 </button>[m
               </div>[m
             )}[m
[36m@@ -445,7 +454,7 @@[m [mfunction App() {[m
                   onConsumeSearchOpen={consumeSearchOpenGame}[m
                 />[m
               )}[m
[31m-              {view === 'music' && <Music currentUser={user} />}[m
[32m+[m[32m              {view === 'music' && <Music />}[m
               {view === 'knowledge' && ([m
                 <Knowledge[m
                   searchOpenKnowledgeId={searchOpenKnowledgeId}[m
[36m@@ -489,4 +498,4 @@[m [mfunction App() {[m
   );[m
 }[m
 [m
[31m-export default App;[m
[32m+[m[32mexport default App;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/CameraBox/CameraBox.css b/frontend/src/components/CameraBox/CameraBox.css[m
[1mindex d5b1b67..c5a2c60 100644[m
[1m--- a/frontend/src/components/CameraBox/CameraBox.css[m
[1m+++ b/frontend/src/components/CameraBox/CameraBox.css[m
[36m@@ -1,8 +1,11 @@[m
[31m-/* CameraBox container styles */[m
[32m+[m[32m/* CameraBox scanner — always-dark UI (face recognition HUD).[m
[32m+[m[32m   Uses --scanner-bg/border/text tokens so it stays dark when page[m
[32m+[m[32m   flips to light theme (intentional contrast for video overlay). */[m
[32m+[m
 .video-box {[m
   position: relative;[m
[31m-  background: #0f172a;[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--scanner-bg);[m
[32m+[m[32m  border: 1px solid var(--scanner-border);[m
   border-radius: 12px;[m
   padding: 16px;[m
   display: flex;[m
[36m@@ -16,7 +19,7 @@[m
 .video-box h3 {[m
   margin: 0;[m
   font-size: 1.1rem;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--scanner-text-muted);[m
   align-self: flex-start;[m
   font-weight: 600;[m
   letter-spacing: 0.05em;[m
[36m@@ -24,6 +27,7 @@[m
 }[m
 [m
 /* Wrapper for video and overlay layer */[m
[32m+[m
 .camera-wrapper {[m
   position: relative;[m
   width: 100%;[m
[36m@@ -31,7 +35,7 @@[m
   max-width: 480px;[m
   border-radius: 8px;[m
   overflow: hidden;[m
[31m-  border: 2px solid #334155;[m
[32m+[m[32m  border: 2px solid var(--scanner-frame);[m
   background: #020617;[m
 }[m
 [m
[36m@@ -43,6 +47,7 @@[m
 }[m
 [m
 /* Cyber HUD Scanning Overlay */[m
[32m+[m
 .hud-overlay {[m
   position: absolute;[m
   top: 0;[m
[36m@@ -61,6 +66,7 @@[m
 }[m
 [m
 /* Color schemes for status */[m
[32m+[m
 .hud-overlay.hud-idle {[m
   border-color: rgba(148, 163, 184, 0.2);[m
 }[m
[36m@@ -81,6 +87,7 @@[m
 }[m
 [m
 /* Corner HUD Target brackets */[m
[32m+[m
 .hud-corners::before,[m
 .hud-corners::after,[m
 .hud-corners-bottom::before,[m
[36m@@ -94,6 +101,7 @@[m
 }[m
 [m
 /* Top Left */[m
[32m+[m
 .hud-corners::before {[m
   top: 12px;[m
   left: 12px;[m
[36m@@ -102,6 +110,7 @@[m
 }[m
 [m
 /* Top Right */[m
[32m+[m
 .hud-corners::after {[m
   top: 12px;[m
   right: 12px;[m
[36m@@ -110,6 +119,7 @@[m
 }[m
 [m
 /* Bottom Left */[m
[32m+[m
 .hud-corners-bottom::before {[m
   bottom: 12px;[m
   left: 12px;[m
[36m@@ -118,6 +128,7 @@[m
 }[m
 [m
 /* Bottom Right */[m
[32m+[m
 .hud-corners-bottom::after {[m
   bottom: 12px;[m
   right: 12px;[m
[36m@@ -126,6 +137,7 @@[m
 }[m
 [m
 /* Link border color to parent's status */[m
[32m+[m
 .hud-overlay.hud-idle .hud-corners::before,[m
 .hud-overlay.hud-idle .hud-corners::after,[m
 .hud-overlay.hud-idle .hud-corners-bottom::before,[m
[36m@@ -158,6 +170,7 @@[m
 }[m
 [m
 /* Target Face Reticle (futuristic central grid) */[m
[32m+[m
 .hud-face-reticle {[m
   position: absolute;[m
   top: 50%;[m
[36m@@ -218,6 +231,7 @@[m
 }[m
 [m
 /* Horizontal Scanning Line (Laser Grid) */[m
[32m+[m
 .hud-scan-line {[m
   position: absolute;[m
   top: 0;[m
[36m@@ -254,6 +268,7 @@[m
 }[m
 [m
 /* Tech Header metadata */[m
[32m+[m
 .hud-header {[m
   display: flex;[m
   justify-content: space-between;[m
[36m@@ -277,6 +292,7 @@[m
 }[m
 [m
 /* Tech Footer / Status text */[m
[32m+[m
 .hud-footer {[m
   width: 100%;[m
   display: flex;[m
[36m@@ -296,7 +312,7 @@[m
   font-weight: 700;[m
   letter-spacing: 0.15em;[m
   text-transform: uppercase;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--scanner-text-muted);[m
   transition: all 0.3s ease;[m
 }[m
 [m
[36m@@ -320,6 +336,7 @@[m
 }[m
 [m
 /* Animations */[m
[32m+[m
 @keyframes scanMove {[m
   0% {[m
     top: 5%;[m
[36m@@ -351,14 +368,15 @@[m
 }[m
 [m
 /* Adjust general video box styles to align nicely */[m
[32m+[m
 .video-box .button {[m
   width: 100%;[m
   max-width: 480px;[m
   padding: 10px 16px;[m
   font-weight: 600;[m
   border-radius: 8px;[m
[31m-  background: #4f46e5;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary-2);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   cursor: pointer;[m
   transition: background 0.2s;[m
[36m@@ -373,8 +391,8 @@[m
 }[m
 [m
 .video-box .button:disabled {[m
[31m-  background: #334155;[m
[31m-  color: #64748b;[m
[32m+[m[32m  background: var(--scanner-frame);[m
[32m+[m[32m  color: var(--scanner-text-muted);[m
   cursor: not-allowed;[m
 }[m
 [m
[1mdiff --git a/frontend/src/components/CameraBox/index.jsx b/frontend/src/components/CameraBox/index.jsx[m
[1mindex dee18b7..7cf8a77 100644[m
[1m--- a/frontend/src/components/CameraBox/index.jsx[m
[1m+++ b/frontend/src/components/CameraBox/index.jsx[m
[36m@@ -1,7 +1,9 @@[m
 import React, { useEffect, useRef, useState } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './CameraBox.css';[m
 [m
 function CameraBox({ onCapture, captureTrigger, status = 'idle' }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const videoRef = useRef(null);[m
   const streamRef = useRef(null);[m
   const [streaming, setStreaming] = useState(false);[m
[36m@@ -33,7 +35,7 @@[m [mfunction CameraBox({ onCapture, captureTrigger, status = 'idle' }) {[m
         }[m
       } catch (err) {[m
         if (!cancelled) {[m
[31m-          setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');[m
[32m+[m[32m          setError(t('dashboard.cameraError'));[m
         }[m
       }[m
     };[m
[36m@@ -84,49 +86,49 @@[m [mfunction CameraBox({ onCapture, captureTrigger, status = 'idle' }) {[m
   };[m
 [m
   const getStatusText = () => {[m
[31m-    if (status === 'loading' || status === 'scanning') return 'Scanning...';[m
[31m-    if (status === 'success') return 'Verified';[m
[31m-    if (status === 'error') return 'Access Denied';[m
[31m-    return 'Sys Active';[m
[32m+[m[32m    if (status === 'loading' || status === 'scanning') return t('dashboard.hudScanning');[m
[32m+[m[32m    if (status === 'success') return t('dashboard.hudVerified');[m
[32m+[m[32m    if (status === 'error') return t('dashboard.hudDenied');[m
[32m+[m[32m    return t('dashboard.hudActive');[m
   };[m
 [m
   return ([m
     <div className="video-box">[m
[31m-      <h3>Quét Khuôn Mặt</h3>[m
[32m+[m[32m      <h3>{t('dashboard.altFaceTitle')}</h3>[m
       {error ? ([m
         <p>{error}</p>[m
       ) : ([m
         <div className="camera-wrapper">[m
           <video ref={videoRef} autoPlay muted playsInline />[m
[31m-          [m
[32m+[m
           {/* Tech HUD overlay layout */}[m
           <div className={`hud-overlay ${getHudClass()}`}>[m
             <div className="hud-corners" />[m
[31m-            [m
[32m+[m
             <div className="hud-header">[m
[31m-              <span>FACE_ID v2.0</span>[m
[31m-              <span>LOCK: {status === 'success' ? 'OK' : 'SEARCHING'}</span>[m
[32m+[m[32m              <span>{t('dashboard.hudVersion')}</span>[m
[32m+[m[32m              <span>{t('dashboard.hudLock')} {status === 'success' ? t('dashboard.hudOK') : t('dashboard.hudSearching')}</span>[m
             </div>[m
[31m-            [m
[32m+[m
             {/* Pulsing reticle and scanning laser */}[m
             <div className="hud-face-reticle">[m
               <div className="hud-face-box" />[m
             </div>[m
             <div className="hud-scan-line" />[m
[31m-            [m
[32m+[m
             <div className="hud-footer">[m
               <span className="hud-status-badge">{getStatusText()}</span>[m
             </div>[m
[31m-            [m
[32m+[m
             <div className="hud-corners-bottom" />[m
           </div>[m
         </div>[m
       )}[m
       <button className="button" onClick={handleCapture} disabled={!streaming}>[m
[31m-        Chụp & Nhận Diện[m
[32m+[m[32m        {t('dashboard.captureBtn')}[m
       </button>[m
     </div>[m
   );[m
 }[m
 [m
[31m-export default CameraBox;[m
[32m+[m[32mexport default CameraBox;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/Comments/CommentSection.jsx b/frontend/src/components/Comments/CommentSection.jsx[m
[1mindex b02be58..842e749 100644[m
[1m--- a/frontend/src/components/Comments/CommentSection.jsx[m
[1m+++ b/frontend/src/components/Comments/CommentSection.jsx[m
[36m@@ -1,5 +1,6 @@[m
 import React, { useEffect, useState, useCallback, useRef } from 'react';[m
 import * as api from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './Comments.css';[m
 [m
 // The 5 reaction emojis the user can pick from. The set here must[m
[36m@@ -7,16 +8,17 @@[m [mimport './Comments.css';[m
 // 400 on anything else, but matching client-side lets us render[m
 // the bar without waiting for a roundtrip.[m
 const REACTION_EMOJIS = [[m
[31m-  { key: 'like',  icon: '👍', label: 'Thích' },[m
[31m-  { key: 'love',  icon: '❤️', label: 'Yêu thích' },[m
[31m-  { key: 'fire',  icon: '🔥', label: 'Tuyệt vời' },[m
[31m-  { key: 'laugh', icon: '😂', label: 'Haha' },[m
[31m-  { key: 'wow',   icon: '😮', label: 'Wow' },[m
[32m+[m[32m  { key: 'like',  icon: '👍' },[m
[32m+[m[32m  { key: 'love',  icon: '❤️' },[m
[32m+[m[32m  { key: 'fire',  icon: '🔥' },[m
[32m+[m[32m  { key: 'laugh', icon: '😂' },[m
[32m+[m[32m  { key: 'wow',   icon: '😮' },[m
 ];[m
 [m
 const MAX_BODY = 2000;[m
 [m
 export default function CommentSection({ contentType, contentId, currentUser, onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [comments, setComments] = useState([]);[m
   const [reactions, setReactions] = useState({ counts: {}, my_emoji: null });[m
   const [newBody, setNewBody] = useState('');[m
[36m@@ -41,11 +43,11 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
       setError(null);[m
     } catch (err) {[m
       console.warn('[CommentSection] load failed', err);[m
[31m-      setError('Không tải được bình luận');[m
[32m+[m[32m      setError(t('comments.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[31m-  }, [contentType, contentId]);[m
[32m+[m[32m  }, [contentType, contentId, t]);[m
 [m
   useEffect(() => {[m
     loadAll();[m
[36m@@ -118,7 +120,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
         setComments((prev) => prev.filter((c) => c.id !== tempId));[m
       }[m
       console.warn('[CommentSection] post failed', err);[m
[31m-      setError('Không gửi được bình luận. Vui lòng thử lại.');[m
[32m+[m[32m      setError(t('comments.err.send'));[m
     } finally {[m
       pendingRef.current.delete(tempId);[m
       setSubmitting(false);[m
[36m@@ -137,7 +139,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
       removeCommentFromTree(comment.id);[m
     } catch (err) {[m
       console.warn('[CommentSection] delete failed', err);[m
[31m-      setError('Không xóa được bình luận.');[m
[32m+[m[32m      setError(t('comments.err.delete'));[m
     }[m
   };[m
 [m
[36m@@ -216,7 +218,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
     } catch (err) {[m
       console.warn('[CommentSection] reaction failed', err);[m
       setReactions(prev);[m
[31m-      setError('Không lưu được reaction.');[m
[32m+[m[32m      setError(t('comments.err.reaction'));[m
     }[m
   };[m
 [m
[36m@@ -228,7 +230,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
   return ([m
     <div className="comment-section">[m
       <h3 className="comment-section-title">[m
[31m-        💬 Bình luận ({totalComments})[m
[32m+[m[32m        {t('comments.title')} ({totalComments})[m
       </h3>[m
 [m
       <div className="reaction-bar">[m
[36m@@ -241,7 +243,8 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
               type="button"[m
               className={`reaction-btn ${isMine ? 'reaction-btn-active' : ''}`}[m
               onClick={() => handleReaction(r.key)}[m
[31m-              title={r.label}[m
[32m+[m[32m              title={t(`comments.reaction.${r.key}`)}[m
[32m+[m[32m              aria-label={t(`comments.reaction.${r.key}`)}[m
               aria-pressed={isMine}[m
             >[m
               <span className="reaction-icon">{r.icon}</span>[m
[36m@@ -254,12 +257,12 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
       <form className="comment-form" onSubmit={handleSubmit}>[m
         {replyTo && ([m
           <div className="comment-reply-indicator">[m
[31m-            <span>Đang trả lời <strong>@{replyTo.name}</strong></span>[m
[32m+[m[32m            <span>{t('comments.replyTo')} <strong>@{replyTo.name}</strong></span>[m
             <button[m
               type="button"[m
               onClick={() => setReplyTo(null)}[m
               className="comment-reply-cancel"[m
[31m-              aria-label="Hủy trả lời"[m
[32m+[m[32m              aria-label={t('comments.cancelReply')}[m
             >[m
               ✕[m
             </button>[m
[36m@@ -267,7 +270,9 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
         )}[m
         <textarea[m
           className="comment-input"[m
[31m-          placeholder={replyTo ? `Trả lời @${replyTo.name}...` : 'Viết bình luận...'}[m
[32m+[m[32m          placeholder={replyTo[m
[32m+[m[32m            ? t('comments.ph.reply', { name: replyTo.name })[m
[32m+[m[32m            : t('comments.ph.write')}[m
           value={newBody}[m
           onChange={(e) => setNewBody(e.target.value.slice(0, MAX_BODY))}[m
           rows={3}[m
[36m@@ -280,7 +285,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
             className="comment-submit"[m
             disabled={!newBody.trim() || submitting}[m
           >[m
[31m-            {submitting ? 'Đang gửi...' : replyTo ? 'Trả lời' : 'Gửi'}[m
[32m+[m[32m            {submitting ? t('comments.sending') : replyTo ? t('comments.replying') : t('comments.send')}[m
           </button>[m
         </div>[m
       </form>[m
[36m@@ -288,9 +293,9 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
       {error && <div className="comment-error">{error}</div>}[m
 [m
       {loading ? ([m
[31m-        <div className="comment-status">Đang tải bình luận...</div>[m
[32m+[m[32m        <div className="comment-status">{t('comments.loading')}</div>[m
       ) : comments.length === 0 ? ([m
[31m-        <div className="comment-status">Chưa có bình luận nào. Hãy là người đầu tiên!</div>[m
[32m+[m[32m        <div className="comment-status">{t('comments.empty')}</div>[m
       ) : ([m
         <ul className="comment-list">[m
           {comments.map((c) => ([m
[36m@@ -311,6 +316,7 @@[m [mexport default function CommentSection({ contentType, contentId, currentUser, on[m
 }[m
 [m
 function CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProfile }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const canModify = currentUser && currentUser.user_id === comment.user_id;[m
   const canDelete = canModify || (currentUser && currentUser.role === 'admin');[m
   const isPending = typeof comment.id === 'string';[m
[36m@@ -371,8 +377,8 @@[m [mfunction CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProf[m
             {comment.user_name || comment.user_id}[m
           </span>[m
           <span className="comment-time">{formatRelative(comment.created_at)}</span>[m
[31m-          {comment.updated_at && <span className="comment-edited" title={`Đã chỉnh sửa ${formatRelative(comment.updated_at)}`}>(đã chỉnh sửa)</span>}[m
[31m-          {isPending && <span className="comment-pending">đang gửi…</span>}[m
[32m+[m[32m          {comment.updated_at && <span className="comment-edited" title={`Edited ${formatRelative(comment.updated_at)}`}>(edited)</span>}[m
[32m+[m[32m          {isPending && <span className="comment-pending">{t('comments.sending')}</span>}[m
         </div>[m
         {editing ? ([m
           <div className="comment-edit">[m
[36m@@ -393,7 +399,7 @@[m [mfunction CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProf[m
                   onClick={cancelEdit}[m
                   disabled={saving}[m
                 >[m
[31m-                  Hủy[m
[32m+[m[32m                  {t('comments.cancelEdit')}[m
                 </button>[m
                 <button[m
                   type="button"[m
[36m@@ -401,7 +407,7 @@[m [mfunction CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProf[m
                   onClick={saveEdit}[m
                   disabled={!editBody.trim() || saving}[m
                 >[m
[31m-                  {saving ? 'Đang lưu...' : 'Lưu'}[m
[32m+[m[32m                  {saving ? t('comments.saving') : t('comments.save')}[m
                 </button>[m
               </div>[m
             </div>[m
[36m@@ -411,16 +417,16 @@[m [mfunction CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProf[m
         )}[m
         <div className="comment-actions">[m
           <button type="button" className="comment-action-btn" onClick={() => onReply(comment)}>[m
[31m-            ↩ Trả lời[m
[32m+[m[32m            ↩ {t('comments.replying')}[m
           </button>[m
           {canModify && !editing && !isPending && ([m
             <button type="button" className="comment-action-btn" onClick={startEdit}>[m
[31m-              ✏️ Sửa[m
[32m+[m[32m              ✏️ {t('comments.edit')}[m
             </button>[m
           )}[m
           {canDelete && !editing && ([m
             <button type="button" className="comment-action-btn comment-action-delete" onClick={() => onDelete(comment)}>[m
[31m-              🗑 Xóa[m
[32m+[m[32m              🗑 {t('comments.delete')}[m
             </button>[m
           )}[m
         </div>[m
[36m@@ -444,8 +450,8 @@[m [mfunction CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProf[m
   );[m
 }[m
 [m
[31m-// Format a timestamp as "vừa xong / 5 phút trước / 2 giờ trước / 3 ngày trước".[m
[31m-// We bound the output at "X ngày trước" to avoid noise — exact dates[m
[32m+[m[32m// Format a timestamp as "just now / 5m ago / 2h ago / 3d ago".[m
[32m+[m[32m// We bound the output at "Xd ago" to avoid noise — exact dates[m
 // are available in the API response if a user wants them.[m
 function formatRelative(iso) {[m
   if (!iso) return '';[m
[36m@@ -453,12 +459,12 @@[m [mfunction formatRelative(iso) {[m
   const now = Date.now();[m
   const diff = Math.max(0, now - t);[m
   const sec = Math.floor(diff / 1000);[m
[31m-  if (sec < 60) return 'vừa xong';[m
[32m+[m[32m  if (sec < 60) return 'just now';[m
   const min = Math.floor(sec / 60);[m
[31m-  if (min < 60) return `${min} phút trước`;[m
[32m+[m[32m  if (min < 60) return `${min}m ago`;[m
   const hr = Math.floor(min / 60);[m
[31m-  if (hr < 24) return `${hr} giờ trước`;[m
[32m+[m[32m  if (hr < 24) return `${hr}h ago`;[m
   const day = Math.floor(hr / 24);[m
[31m-  if (day < 30) return `${day} ngày trước`;[m
[31m-  return new Date(iso).toLocaleDateString('vi-VN');[m
[32m+[m[32m  if (day < 30) return `${day}d ago`;[m
[32m+[m[32m  return new Date(iso).toLocaleDateString();[m
 }[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/Comments/Comments.css b/frontend/src/components/Comments/Comments.css[m
[1mindex f12d146..2e5797c 100644[m
[1m--- a/frontend/src/components/Comments/Comments.css[m
[1m+++ b/frontend/src/components/Comments/Comments.css[m
[36m@@ -1,14 +1,16 @@[m
[32m+[m[32m/* Comments — theme-aware via App.css tokens. */[m
[32m+[m
 .comment-section {[m
   margin-top: 24px;[m
   padding-top: 20px;[m
[31m-  border-top: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
 }[m
 [m
 .comment-section-title {[m
   margin: 0 0 14px;[m
   font-size: 16px;[m
   font-weight: 700;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .reaction-bar {[m
[36m@@ -24,9 +26,9 @@[m
   gap: 6px;[m
   padding: 6px 12px;[m
   border-radius: 20px;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  color: var(--text-body, #334155);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  color: var(--text-main);[m
   font-size: 13px;[m
   font-weight: 600;[m
   cursor: pointer;[m
[36m@@ -35,13 +37,13 @@[m
 [m
 .reaction-btn:hover {[m
   transform: translateY(-1px);[m
[31m-  border-color: var(--primary, #6366f1);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
 }[m
 [m
 .reaction-btn-active {[m
[31m-  border-color: var(--primary, #6366f1);[m
[31m-  background: rgba(99, 102, 241, 0.08);[m
[31m-  color: var(--primary, #6366f1);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  background: rgba(99, 102, 241, 0.12);[m
[32m+[m[32m  color: var(--accent-primary);[m
   box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);[m
 }[m
 [m
[36m@@ -64,10 +66,10 @@[m
   align-items: center;[m
   justify-content: space-between;[m
   padding: 8px 12px;[m
[31m-  background: rgba(99, 102, 241, 0.08);[m
[32m+[m[32m  background: rgba(99, 102, 241, 0.1);[m
   border-radius: 8px;[m
   font-size: 13px;[m
[31m-  color: var(--text-body, #334155);[m
[32m+[m[32m  color: var(--text-main);[m
   margin-bottom: 8px;[m
 }[m
 [m
[36m@@ -76,24 +78,24 @@[m
   border: none;[m
   cursor: pointer;[m
   font-size: 14px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   padding: 0 4px;[m
   border-radius: 50%;[m
   transition: background 0.1s ease, color 0.1s ease;[m
 }[m
 [m
 .comment-reply-cancel:hover {[m
[31m-  background: rgba(0, 0, 0, 0.06);[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  background: var(--bg-item);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .comment-input {[m
   width: 100%;[m
   padding: 10px 12px;[m
   border-radius: 8px;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  color: var(--text-title);[m
   font-size: 14px;[m
   font-family: inherit;[m
   resize: vertical;[m
[36m@@ -104,7 +106,7 @@[m
 }[m
 [m
 .comment-input:focus {[m
[31m-  border-color: var(--primary, #6366f1);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
   box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);[m
 }[m
 [m
[36m@@ -117,15 +119,15 @@[m
 [m
 .comment-charcount {[m
   font-size: 11px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .comment-submit {[m
   padding: 6px 16px;[m
   border: none;[m
   border-radius: 6px;[m
[31m-  background: var(--primary, #6366f1);[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-weight: 600;[m
   font-size: 13px;[m
   cursor: pointer;[m
[36m@@ -133,7 +135,7 @@[m
 }[m
 [m
 .comment-submit:hover:not(:disabled) {[m
[31m-  background: var(--primary-dark, #4f46e5);[m
[32m+[m[32m  background: var(--accent-primary-2);[m
   transform: translateY(-1px);[m
 }[m
 [m
[36m@@ -143,8 +145,8 @@[m
 }[m
 [m
 .comment-error {[m
[31m-  background: rgba(239, 68, 68, 0.1);[m
[31m-  color: #b91c1c;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
   padding: 8px 12px;[m
   border-radius: 6px;[m
   font-size: 13px;[m
[36m@@ -153,7 +155,7 @@[m
 [m
 .comment-status {[m
   text-align: center;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 13px;[m
   padding: 14px;[m
 }[m
[36m@@ -169,7 +171,7 @@[m
   grid-template-columns: 36px 1fr;[m
   gap: 10px;[m
   padding: 10px 0;[m
[31m-  border-bottom: 1px solid var(--border-color-soft, rgba(0, 0, 0, 0.05));[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
 }[m
 [m
 .comment-item:last-child {[m
[36m@@ -193,8 +195,8 @@[m
 .comment-avatar-fallback {[m
   width: 100%;[m
   height: 100%;[m
[31m-  background: linear-gradient(135deg, #6366f1, #4f46e5);[m
[31m-  color: white;[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-2));[m
[32m+[m[32m  color: var(--text-on-accent);[m
   display: flex;[m
   align-items: center;[m
   justify-content: center;[m
[36m@@ -216,7 +218,7 @@[m
 [m
 .comment-author {[m
   font-weight: 700;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .comment-author-link {[m
[36m@@ -225,21 +227,21 @@[m
 }[m
 [m
 .comment-author-link:hover {[m
[31m-  color: var(--primary, #6366f1);[m
[32m+[m[32m  color: var(--accent-primary);[m
   text-decoration: underline;[m
 }[m
 [m
 .comment-time {[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .comment-pending {[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-style: italic;[m
 }[m
 [m
 .comment-edited {[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 11px;[m
   font-style: italic;[m
 }[m
[36m@@ -262,7 +264,7 @@[m
 .comment-text {[m
   font-size: 14px;[m
   line-height: 1.5;[m
[31m-  color: var(--text-body, #334155);[m
[32m+[m[32m  color: var(--text-main);[m
   white-space: pre-wrap;[m
   word-wrap: break-word;[m
 }[m
[36m@@ -278,18 +280,18 @@[m
   border: none;[m
   padding: 0;[m
   font-size: 12px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   cursor: pointer;[m
   font-weight: 500;[m
   transition: color 0.1s ease;[m
 }[m
 [m
 .comment-action-btn:hover {[m
[31m-  color: var(--primary, #6366f1);[m
[32m+[m[32m  color: var(--accent-primary);[m
 }[m
 [m
 .comment-action-delete:hover {[m
[31m-  color: #ef4444;[m
[32m+[m[32m  color: var(--accent-danger);[m
 }[m
 [m
 .comment-replies {[m
[36m@@ -297,7 +299,7 @@[m
   list-style: none;[m
   margin: 8px 0 0;[m
   padding: 8px 0 0 16px;[m
[31m-  border-left: 2px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border-left: 2px solid var(--border-color);[m
   margin-left: 18px;[m
 }[m
 [m
[36m@@ -305,40 +307,3 @@[m
   border-bottom: none;[m
   padding: 8px 0;[m
 }[m
[31m-[m
[31m-/* Dark-theme overrides — the CommentSection sits inside a modal[m
[31m-   whose host page may set its own background, so we use[m
[31m-   currentColor for borders instead of hardcoded greys. */[m
[31m-.dark-theme .comment-section-title {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-.dark-theme .reaction-btn {[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[31m-  border-color: rgba(255, 255, 255, 0.1);[m
[31m-  color: #e2e8f0;[m
[31m-}[m
[31m-.dark-theme .reaction-btn-active {[m
[31m-  background: rgba(99, 102, 241, 0.2);[m
[31m-  color: #c7d2fe;[m
[31m-}[m
[31m-.dark-theme .comment-input {[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[31m-  border-color: rgba(255, 255, 255, 0.1);[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-.dark-theme .comment-author {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-.dark-theme .comment-text {[m
[31m-  color: #cbd5e1;[m
[31m-}[m
[31m-.dark-theme .comment-item {[m
[31m-  border-bottom-color: rgba(255, 255, 255, 0.06);[m
[31m-}[m
[31m-.dark-theme .comment-replies {[m
[31m-  border-left-color: rgba(255, 255, 255, 0.08);[m
[31m-}[m
[31m-.dark-theme .comment-reply-indicator {[m
[31m-  background: rgba(99, 102, 241, 0.15);[m
[31m-  color: #c7d2fe;[m
[31m-}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/FaceSetupModal/FaceSetupModal.css b/frontend/src/components/FaceSetupModal/FaceSetupModal.css[m
[1mindex 48e0b02..ef35c92 100644[m
[1m--- a/frontend/src/components/FaceSetupModal/FaceSetupModal.css[m
[1m+++ b/frontend/src/components/FaceSetupModal/FaceSetupModal.css[m
[36m@@ -26,6 +26,7 @@[m
   max-width: 480px;[m
   padding: 28px;[m
   box-shadow: 0 0 60px rgba(99, 102, 241, 0.2), 0 24px 60px rgba(0,0,0,0.6);[m
[32m+[m[32m  color: #e2e8f0;[m
   display: flex;[m
   flex-direction: column;[m
   gap: 18px;[m
[1mdiff --git a/frontend/src/components/FaceSetupModal/index.jsx b/frontend/src/components/FaceSetupModal/index.jsx[m
[1mindex c9b2572..83c138e 100644[m
[1m--- a/frontend/src/components/FaceSetupModal/index.jsx[m
[1m+++ b/frontend/src/components/FaceSetupModal/index.jsx[m
[36m@@ -1,4 +1,5 @@[m
 import React, { useEffect, useRef, useState, useCallback } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import { registerFace } from '../../services/api';[m
 import './FaceSetupModal.css';[m
 [m
[36m@@ -6,6 +7,7 @@[m [mconst TOTAL_SHOTS = 5;[m
 const SHOT_INTERVAL_MS = 1200;[m
 [m
 export default function FaceSetupModal({ onClose, onSuccess }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const videoRef = useRef(null);[m
   const streamRef = useRef(null);[m
   const intervalRef = useRef(null);[m
[36m@@ -27,7 +29,7 @@[m [mexport default function FaceSetupModal({ onClose, onSuccess }) {[m
           setStreaming(true);[m
         }[m
       } catch {[m
[31m-        setCameraError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');[m
[32m+[m[32m        setCameraError(t('faceSetup.camError'));[m
       }[m
     };[m
     startCamera();[m
[36m@@ -49,28 +51,28 @@[m [mexport default function FaceSetupModal({ onClose, onSuccess }) {[m
 [m
   const submitFrames = useCallback(async (frames) => {[m
     setPhase('processing');[m
[31m-    setStatusMsg('Đang lưu dữ liệu khuôn mặt...');[m
[32m+[m[32m    setStatusMsg(t('faceSetup.saving'));[m
     try {[m
       const res = await registerFace(frames);[m
       const data = res.data;[m
       setPhase('success');[m
       setStatusMsg([m
         data.data?.new_faces > 0[m
[31m-          ? `✅ Đã đăng ký ${data.data.new_faces} khuôn mặt thành công!`[m
[31m-          : '✅ Ảnh đã lưu! (Không phát hiện khuôn mặt để tạo Face ID)'[m
[32m+[m[32m          ? t('faceSetup.savedSome', { n: data.data.new_faces })[m
[32m+[m[32m          : t('faceSetup.savedNone')[m
       );[m
       setTimeout(() => onSuccess && onSuccess(data), 1800);[m
     } catch (err) {[m
       setPhase('error');[m
[31m-      setStatusMsg(err.response?.data?.detail || 'Lưu thất bại. Vui lòng thử lại.');[m
[32m+[m[32m      setStatusMsg(err.response?.data?.detail || t('faceSetup.fail'));[m
     }[m
[31m-  }, [onSuccess]);[m
[32m+[m[32m  }, [onSuccess, t]);[m
 [m
   const startCapture = useCallback(() => {[m
     if (!streaming) return;[m
     setPhase('capturing');[m
     setCapturedCount(0);[m
[31m-    setStatusMsg('Đang quét khuôn mặt...');[m
[32m+[m[32m    setStatusMsg(t('faceSetup.scanning'));[m
 [m
     const frames = [];[m
     let count = 0;[m
[36m@@ -80,14 +82,14 @@[m [mexport default function FaceSetupModal({ onClose, onSuccess }) {[m
         frames.push(frame);[m
         count++;[m
         setCapturedCount(count);[m
[31m-        setStatusMsg(`Đã chụp ${count}/${TOTAL_SHOTS} ảnh...`);[m
[32m+[m[32m        setStatusMsg(t('faceSetup.progress', { n: count, total: TOTAL_SHOTS }));[m
       }[m
       if (count >= TOTAL_SHOTS) {[m
         clearInterval(intervalRef.current);[m
         submitFrames(frames);[m
       }[m
     }, SHOT_INTERVAL_MS);[m
[31m-  }, [streaming, captureFrame, submitFrames]);[m
[32m+[m[32m  }, [streaming, captureFrame, submitFrames, t]);[m
 [m
   const handleRetry = () => {[m
     setCapturedCount(0);[m
[36m@@ -109,10 +111,10 @@[m [mexport default function FaceSetupModal({ onClose, onSuccess }) {[m
         <div className="fsm-header">[m
           <div className="fsm-header-icon">🔐</div>[m
           <div style={{ flex: 1 }}>[m
[31m-            <h2 className="fsm-title">Kích hoạt Face ID</h2>[m
[31m-            <p className="fsm-subtitle">Quét khuôn mặt để đăng nhập nhanh trong tương lai</p>[m
[32m+[m[32m            <h2 className="fsm-title">{t('faceSetup.title')}</h2>[m
[32m+[m[32m            <p className="fsm-subtitle">{t('faceSetup.subtitle')}</p>[m
           </div>[m
[31m-          <button className="fsm-close-btn" onClick={onClose} disabled={!canClose} title="Đóng">✕</button>[m
[32m+[m[32m          <button className="fsm-close-btn" onClick={onClose} disabled={!canClose} title={t('faceSetup.close')}>✕</button>[m
         </div>[m
 [m
         <div className="fsm-camera-wrap">[m
[36m@@ -166,30 +168,29 @@[m [mexport default function FaceSetupModal({ onClose, onSuccess }) {[m
 [m
         {phase === 'idle' && ([m
           <ul className="fsm-tips">[m
[31m-            <li>📸 Hệ thống sẽ tự động chụp <strong>{TOTAL_SHOTS} ảnh</strong> liên tiếp</li>[m
[31m-            <li>💡 Đảm bảo đủ ánh sáng, nhìn thẳng vào camera</li>[m
[31m-            <li>🚫 Không che mặt hoặc đội mũ / kính quá dày</li>[m
[32m+[m[32m            <li>{t('faceSetup.tip1', { n: TOTAL_SHOTS })}</li>[m
[32m+[m[32m            <li>{t('faceSetup.tip2')}</li>[m
[32m+[m[32m            <li>{t('faceSetup.tip3')}</li>[m
           </ul>[m
         )}[m
 [m
         <div className="fsm-actions">[m
           {phase === 'idle' && ([m
             <button className="fsm-btn-primary" onClick={startCapture} disabled={!streaming || !!cameraError}>[m
[31m-              📷 Bắt đầu quét khuôn mặt[m
[32m+[m[32m              {t('faceSetup.start')}[m
             </button>[m
           )}[m
           {phase === 'error' && ([m
[31m-            <button className="fsm-btn-primary" onClick={handleRetry}>🔄 Thử lại</button>[m
[32m+[m[32m            <button className="fsm-btn-primary" onClick={handleRetry}>{t('faceSetup.retry')}</button>[m
           )}[m
           {(phase === 'idle' || phase === 'error') && ([m
[31m-            <button className="fsm-btn-secondary" onClick={onClose}>Bỏ qua, làm sau</button>[m
[32m+[m[32m            <button className="fsm-btn-secondary" onClick={onClose}>{t('faceSetup.skip')}</button>[m
           )}[m
           {phase === 'success' && ([m
[31m-            <button className="fsm-btn-primary" onClick={onClose}>Hoàn tất 🎉</button>[m
[32m+[m[32m            <button className="fsm-btn-primary" onClick={onClose}>{t('faceSetup.done')}</button>[m
           )}[m
         </div>[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[31m-[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/LanguageSwitcher/LanguageSwitcher.css b/frontend/src/components/LanguageSwitcher/LanguageSwitcher.css[m
[1mnew file mode 100644[m
[1mindex 0000000..c904d91[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/components/LanguageSwitcher/LanguageSwitcher.css[m
[36m@@ -0,0 +1,43 @@[m
[32m+[m[32m/* Language switcher — segmented EN/VI toggle that inherits sidebar[m
[32m+[m[32m   surface so it reads correctly in both page themes. */[m
[32m+[m
[32m+[m[32m.lang-switcher {[m
[32m+[m[32m  display: inline-flex;[m
[32m+[m[32m  background: var(--sidebar-hover-bg);[m
[32m+[m[32m  border: 1px solid var(--sidebar-border);[m
[32m+[m[32m  border-radius: 999px;[m
[32m+[m[32m  padding: 2px;[m
[32m+[m[32m  font-size: 12px;[m
[32m+[m[32m  font-weight: 600;[m
[32m+[m[32m  letter-spacing: 0.04em;[m
[32m+[m[32m  align-self: stretch;[m
[32m+[m[32m  justify-content: center;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.lang-switcher-btn {[m
[32m+[m[32m  flex: 1;[m
[32m+[m[32m  border: none;[m
[32m+[m[32m  background: transparent;[m
[32m+[m[32m  color: var(--sidebar-text-muted);[m
[32m+[m[32m  padding: 6px 10px;[m
[32m+[m[32m  border-radius: 999px;[m
[32m+[m[32m  cursor: pointer;[m
[32m+[m[32m  transition: background 0.15s, color 0.15s;[m
[32m+[m[32m  font: inherit;[m
[32m+[m[32m  letter-spacing: inherit;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.lang-switcher-btn:hover:not(.is-active) {[m
[32m+[m[32m  color: var(--sidebar-text);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.lang-switcher-btn.is-active {[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  color: var(--accent-primary);[m
[32m+[m[32m  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.lang-switcher-btn:disabled {[m
[32m+[m[32m  cursor: not-allowed;[m
[32m+[m[32m  opacity: 0.6;[m
[32m+[m[32m}[m
[1mdiff --git a/frontend/src/components/LanguageSwitcher/index.jsx b/frontend/src/components/LanguageSwitcher/index.jsx[m
[1mnew file mode 100644[m
[1mindex 0000000..acce324[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/components/LanguageSwitcher/index.jsx[m
[36m@@ -0,0 +1,51 @@[m
[32m+[m[32mimport React from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
[32m+[m[32mimport './LanguageSwitcher.css';[m
[32m+[m
[32m+[m[32m// Two-state pill: EN / VI. Reads the current language so the active[m
[32m+[m[32m// option is highlighted without us having to track it ourselves —[m
[32m+[m[32m// i18next.language changes via the `languageChanged` event but[m
[32m+[m[32m// useTranslation is wired to subscribe to it, so a re-render is[m
[32m+[m[32m// automatic when we call i18n.changeLanguage().[m
[32m+[m[32m//[m
[32m+[m[32m// Disabled while a language switch is in flight so the user can't[m
[32m+[m[32m// queue several changeLanguage calls in a row (only one matters).[m
[32m+[m
[32m+[m[32mconst LANGS = [[m
[32m+[m[32m  { code: 'vi', label: 'VI' },[m
[32m+[m[32m  { code: 'en', label: 'EN' },[m
[32m+[m[32m];[m
[32m+[m
[32m+[m[32mexport default function LanguageSwitcher() {[m
[32m+[m[32m  const { i18n } = useTranslation();[m
[32m+[m[32m  const [pending, setPending] = React.useState(null);[m
[32m+[m
[32m+[m[32m  const onPick = async (code) => {[m
[32m+[m[32m    if (code === i18n.language || pending) return;[m
[32m+[m[32m    setPending(code);[m
[32m+[m[32m    try {[m
[32m+[m[32m      await i18n.changeLanguage(code);[m
[32m+[m[32m    } catch (err) {[m
[32m+[m[32m      console.warn('[lang] changeLanguage failed', err);[m
[32m+[m[32m    } finally {[m
[32m+[m[32m      setPending(null);[m
[32m+[m[32m    }[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  return ([m
[32m+[m[32m    <div className="lang-switcher" role="group" aria-label="Language">[m
[32m+[m[32m      {LANGS.map(({ code, label }) => ([m
[32m+[m[32m        <button[m
[32m+[m[32m          key={code}[m
[32m+[m[32m          type="button"[m
[32m+[m[32m          className={`lang-switcher-btn${i18n.language === code ? ' is-active' : ''}`}[m
[32m+[m[32m          aria-pressed={i18n.language === code}[m
[32m+[m[32m          disabled={pending !== null}[m
[32m+[m[32m          onClick={() => onPick(code)}[m
[32m+[m[32m        >[m
[32m+[m[32m          {label}[m
[32m+[m[32m        </button>[m
[32m+[m[32m      ))}[m
[32m+[m[32m    </div>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/NotificationBell/NotificationBell.css b/frontend/src/components/NotificationBell/NotificationBell.css[m
[1mindex da7d723..128413a 100644[m
[1m--- a/frontend/src/components/NotificationBell/NotificationBell.css[m
[1m+++ b/frontend/src/components/NotificationBell/NotificationBell.css[m
[36m@@ -1,12 +1,16 @@[m
[32m+[m[32m/* NotificationBell — theme-aware via App.css tokens[m
[32m+[m[32m   Bell button follows navbar surface (--scanner-bg works for both themes).[m
[32m+[m[32m   Dropdown inverts to page background so it reads against the page body. */[m
[32m+[m
 .notif-bell {[m
   position: relative;[m
 }[m
 [m
 .notif-bell-btn {[m
   position: relative;[m
[31m-  background: rgba(255, 255, 255, 0.08);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  background: var(--scanner-bg);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  color: var(--text-main);[m
   width: 36px;[m
   height: 36px;[m
   border-radius: 50%;[m
[36m@@ -19,7 +23,7 @@[m
 }[m
 [m
 .notif-bell-btn:hover {[m
[31m-  background: rgba(255, 255, 255, 0.16);[m
[32m+[m[32m  background: var(--bg-card-hover);[m
   transform: translateY(-1px);[m
 }[m
 [m
[36m@@ -32,8 +36,8 @@[m
   position: absolute;[m
   top: -4px;[m
   right: -4px;[m
[31m-  background: #ef4444;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-danger);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border-radius: 10px;[m
   padding: 1px 5px;[m
   font-size: 10px;[m
[36m@@ -41,7 +45,7 @@[m
   line-height: 1.2;[m
   min-width: 16px;[m
   text-align: center;[m
[31m-  box-shadow: 0 0 0 2px #1e293b;[m
[32m+[m[32m  box-shadow: 0 0 0 2px var(--scanner-bg);[m
   pointer-events: none;[m
 }[m
 [m
[36m@@ -51,15 +55,15 @@[m
   right: 0;[m
   width: 360px;[m
   max-width: calc(100vw - 32px);[m
[31m-  background: #1e293b;[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.12);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
[31m-  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
   z-index: 1002;[m
   display: flex;[m
   flex-direction: column;[m
   max-height: 480px;[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--text-main);[m
   overflow: hidden;[m
 }[m
 [m
[36m@@ -68,13 +72,13 @@[m
   justify-content: space-between;[m
   align-items: center;[m
   padding: 12px 14px;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
 }[m
 [m
 .notif-dropdown-title {[m
   font-size: 14px;[m
   font-weight: 700;[m
[31m-  color: #f1f5f9;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .notif-mark-all-btn {[m
[36m@@ -82,7 +86,7 @@[m
   border: none;[m
   cursor: pointer;[m
   font-size: 12px;[m
[31m-  color: #818cf8;[m
[32m+[m[32m  color: var(--accent-primary);[m
   font-weight: 500;[m
   padding: 0;[m
 }[m
[36m@@ -95,7 +99,7 @@[m
   display: flex;[m
   gap: 4px;[m
   padding: 6px 14px 0;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
 }[m
 [m
 .notif-tab {[m
[36m@@ -104,7 +108,7 @@[m
   cursor: pointer;[m
   padding: 6px 8px;[m
   font-size: 13px;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--text-muted);[m
   border-bottom: 2px solid transparent;[m
   display: inline-flex;[m
   align-items: center;[m
[36m@@ -114,17 +118,17 @@[m
 }[m
 [m
 .notif-tab:hover {[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--text-main);[m
 }[m
 [m
 .notif-tab.active {[m
[31m-  color: #c7d2fe;[m
[31m-  border-bottom-color: #818cf8;[m
[32m+[m[32m  color: var(--accent-primary);[m
[32m+[m[32m  border-bottom-color: var(--accent-primary);[m
 }[m
 [m
 .notif-tab-badge {[m
[31m-  background: rgba(99, 102, 241, 0.25);[m
[31m-  color: #c7d2fe;[m
[32m+[m[32m  background: rgba(99, 102, 241, 0.15);[m
[32m+[m[32m  color: var(--accent-primary);[m
   border-radius: 8px;[m
   padding: 0 6px;[m
   font-size: 11px;[m
[36m@@ -134,8 +138,8 @@[m
 }[m
 [m
 .notif-error {[m
[31m-  background: rgba(239, 68, 68, 0.1);[m
[31m-  color: #fca5a5;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
   padding: 8px 14px;[m
   font-size: 12px;[m
 }[m
[36m@@ -149,7 +153,7 @@[m
 .notif-status {[m
   text-align: center;[m
   padding: 28px 14px;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 13px;[m
 }[m
 [m
[36m@@ -161,10 +165,10 @@[m
   text-align: left;[m
   background: none;[m
   border: none;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.04);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   padding: 10px 14px;[m
   cursor: pointer;[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--text-main);[m
   transition: background 0.1s ease;[m
 }[m
 [m
[36m@@ -173,7 +177,7 @@[m
 }[m
 [m
 .notif-item:hover {[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .notif-item.unread {[m
[36m@@ -197,7 +201,7 @@[m
 .notif-item-message {[m
   font-size: 13px;[m
   line-height: 1.4;[m
[31m-  color: #f1f5f9;[m
[32m+[m[32m  color: var(--text-title);[m
   word-wrap: break-word;[m
 }[m
 [m
[36m@@ -206,56 +210,13 @@[m
   justify-content: space-between;[m
   align-items: center;[m
   font-size: 11px;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .notif-item-dot {[m
   width: 8px;[m
   height: 8px;[m
   border-radius: 50%;[m
[31m-  background: #818cf8;[m
[32m+[m[32m  background: var(--accent-primary);[m
   flex-shrink: 0;[m
 }[m
[31m-[m
[31m-/* Light theme override — the bell button lives in the dark navbar[m
[31m-   but the dropdown sits over the page body which may be light. */[m
[31m-[m
[31m-.App:not(.dark-theme) .notif-dropdown {[m
[31m-  background: #ffffff;[m
[31m-  border-color: #e2e8f0;[m
[31m-  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);[m
[31m-  color: #0f172a;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-dropdown-header,[m
[31m-.App:not(.dark-theme) .notif-tabs,[m
[31m-.App:not(.dark-theme) .notif-item {[m
[31m-  border-color: #e2e8f0;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-dropdown-title,[m
[31m-.App:not(.dark-theme) .notif-item-message {[m
[31m-  color: #0f172a;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-tab {[m
[31m-  color: #64748b;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-tab.active {[m
[31m-  color: #4f46e5;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-tab:hover {[m
[31m-  color: #0f172a;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-item {[m
[31m-  color: #0f172a;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-item:hover {[m
[31m-  background: #f8fafc;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-item.unread {[m
[31m-  background: rgba(99, 102, 241, 0.06);[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-status {[m
[31m-  color: #64748b;[m
[31m-}[m
[31m-.App:not(.dark-theme) .notif-error {[m
[31m-  color: #b91c1c;[m
[31m-}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/NotificationBell/index.jsx b/frontend/src/components/NotificationBell/index.jsx[m
[1mindex 1f62144..cdeace3 100644[m
[1m--- a/frontend/src/components/NotificationBell/index.jsx[m
[1m+++ b/frontend/src/components/NotificationBell/index.jsx[m
[36m@@ -1,5 +1,6 @@[m
 import React, { useEffect, useState, useCallback, useRef } from 'react';[m
 import * as api from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './NotificationBell.css';[m
 [m
 // Polling cadence for the unread-count badge. 30 s is short enough[m
[36m@@ -21,6 +22,7 @@[m [mconst TYPE_ICONS = {[m
 };[m
 [m
 export default function NotificationBell({ onSelectItem }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [open, setOpen] = useState(false);[m
   const [notifications, setNotifications] = useState([]);[m
   const [unreadCount, setUnreadCount] = useState(0);[m
[36m@@ -82,11 +84,11 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
       setUnreadCount(data.unread_count ?? 0);[m
     } catch (err) {[m
       console.warn('[NotificationBell] fetch list failed', err);[m
[31m-      setError('Không tải được thông báo.');[m
[32m+[m[32m      setError(t('notif.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[31m-  }, [unreadOnly]);[m
[32m+[m[32m  }, [unreadOnly, t]);[m
 [m
   // Refresh the list when the dropdown opens or the filter flips.[m
   // Using the unread-count from the same response keeps the badge[m
[36m@@ -139,7 +141,7 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
       <button[m
         className="notif-bell-btn"[m
         onClick={() => setOpen((v) => !v)}[m
[31m-        aria-label="Thông báo"[m
[32m+[m[32m        aria-label={t('notif.ariaBell')}[m
         aria-expanded={open}[m
       >[m
         <span className="notif-bell-icon">🔔</span>[m
[36m@@ -149,14 +151,14 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
       {open && ([m
         <div className="notif-dropdown" role="menu">[m
           <div className="notif-dropdown-header">[m
[31m-            <span className="notif-dropdown-title">Thông báo</span>[m
[32m+[m[32m            <span className="notif-dropdown-title">{t('notif.title')}</span>[m
             {unreadCount > 0 && ([m
               <button[m
                 className="notif-mark-all-btn"[m
                 onClick={handleMarkAllRead}[m
                 type="button"[m
               >[m
[31m-                Đánh dấu tất cả đã đọc[m
[32m+[m[32m                {t('notif.markAllRead')}[m
               </button>[m
             )}[m
           </div>[m
[36m@@ -167,14 +169,14 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
               onClick={() => setUnreadOnly(false)}[m
               type="button"[m
             >[m
[31m-              Tất cả[m
[32m+[m[32m              {t('notif.allTab')}[m
             </button>[m
             <button[m
               className={`notif-tab ${unreadOnly ? 'active' : ''}`}[m
               onClick={() => setUnreadOnly(true)}[m
               type="button"[m
             >[m
[31m-              Chưa đọc {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}[m
[32m+[m[32m              {t('notif.unreadTab')} {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}[m
             </button>[m
           </div>[m
 [m
[36m@@ -182,10 +184,10 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
 [m
           <div className="notif-list">[m
             {loading ? ([m
[31m-              <div className="notif-status">Đang tải...</div>[m
[32m+[m[32m              <div className="notif-status">{t('notif.loading')}</div>[m
             ) : notifications.length === 0 ? ([m
               <div className="notif-status">[m
[31m-                {unreadOnly ? '🔔 Không có thông báo chưa đọc.' : '🔔 Bạn chưa có thông báo nào.'}[m
[32m+[m[32m                {unreadOnly ? t('notif.emptyUnread') : t('notif.empty')}[m
               </div>[m
             ) : ([m
               notifications.map((n) => ([m
[36m@@ -200,7 +202,7 @@[m [mexport default function NotificationBell({ onSelectItem }) {[m
                     <span className="notif-item-message">{n.message}</span>[m
                     <span className="notif-item-meta">[m
                       <span className="notif-item-time">{formatRelative(n.created_at)}</span>[m
[31m-                      {!n.read && <span className="notif-item-dot" aria-label="Chưa đọc" />}[m
[32m+[m[32m                      {!n.read && <span className="notif-item-dot" aria-label={t('notif.unreadDot')} />}[m
                     </span>[m
                   </span>[m
                 </button>[m
[36m@@ -221,12 +223,12 @@[m [mfunction formatRelative(iso) {[m
   if (Number.isNaN(t)) return '';[m
   const diff = Math.max(0, Date.now() - t);[m
   const sec = Math.floor(diff / 1000);[m
[31m-  if (sec < 60) return 'vừa xong';[m
[32m+[m[32m  if (sec < 60) return 'just now';[m
   const min = Math.floor(sec / 60);[m
[31m-  if (min < 60) return `${min} phút trước`;[m
[32m+[m[32m  if (min < 60) return `${min}m ago`;[m
   const hr = Math.floor(min / 60);[m
[31m-  if (hr < 24) return `${hr} giờ trước`;[m
[32m+[m[32m  if (hr < 24) return `${hr}h ago`;[m
   const day = Math.floor(hr / 24);[m
[31m-  if (day < 30) return `${day} ngày trước`;[m
[31m-  return new Date(iso).toLocaleDateString('vi-VN');[m
[32m+[m[32m  if (day < 30) return `${day}d ago`;[m
[32m+[m[32m  return new Date(iso).toLocaleDateString();[m
 }[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/ResultCard/ResultCard.css b/frontend/src/components/ResultCard/ResultCard.css[m
[1mnew file mode 100644[m
[1mindex 0000000..a34365e[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/components/ResultCard/ResultCard.css[m
[36m@@ -0,0 +1,44 @@[m
[32m+[m[32m/* ResultCard — renders status + message from face recognition result. */[m
[32m+[m
[32m+[m[32m.result-card {[m
[32m+[m[32m  margin-top: 16px;[m
[32m+[m[32m  padding: 14px 18px;[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  border-radius: 12px;[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
[32m+[m[32m  color: var(--text-main);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card strong {[m
[32m+[m[32m  display: block;[m
[32m+[m[32m  font-size: 13px;[m
[32m+[m[32m  font-weight: 700;[m
[32m+[m[32m  text-transform: uppercase;[m
[32m+[m[32m  letter-spacing: 0.05em;[m
[32m+[m[32m  color: var(--text-title);[m
[32m+[m[32m  margin-bottom: 4px;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card p {[m
[32m+[m[32m  margin: 0;[m
[32m+[m[32m  font-size: 14px;[m
[32m+[m[32m  color: var(--text-main);[m
[32m+[m[32m  line-height: 1.5;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card--idle strong {[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card--loading strong {[m
[32m+[m[32m  color: var(--accent-primary);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card--success strong {[m
[32m+[m[32m  color: var(--accent-success);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.result-card--error strong {[m
[32m+[m[32m  color: var(--accent-danger);[m
[32m+[m[32m}[m
[1mdiff --git a/frontend/src/components/ResultCard/index.jsx b/frontend/src/components/ResultCard/index.jsx[m
[1mindex 319d1a4..e8540c1 100644[m
[1m--- a/frontend/src/components/ResultCard/index.jsx[m
[1m+++ b/frontend/src/components/ResultCard/index.jsx[m
[36m@@ -1,12 +1,16 @@[m
 import React from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
[32m+[m[32mimport './ResultCard.css';[m
 [m
 function ResultCard({ status, message }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
[32m+[m[32m  const label = t(`dashboard.result.${status}`, { defaultValue: status });[m
   return ([m
[31m-    <div>[m
[31m-      <strong>{status}</strong>[m
[32m+[m[32m    <div className={`result-card result-card--${status}`}>[m
[32m+[m[32m      <strong>{label}</strong>[m
       <p>{message}</p>[m
     </div>[m
   );[m
 }[m
 [m
[31m-export default ResultCard;[m
[32m+[m[32mexport default ResultCard;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/SearchBar/SearchBar.css b/frontend/src/components/SearchBar/SearchBar.css[m
[1mindex e016f0a..2f8f242 100644[m
[1m--- a/frontend/src/components/SearchBar/SearchBar.css[m
[1m+++ b/frontend/src/components/SearchBar/SearchBar.css[m
[36m@@ -7,16 +7,16 @@[m
   position: relative;[m
   display: flex;[m
   align-items: center;[m
[31m-  background: rgba(255, 255, 255, 0.08);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  background: var(--sidebar-input-bg, var(--glass-bg));[m
[32m+[m[32m  border: 1px solid var(--sidebar-input-border, var(--glass-border));[m
   border-radius: 24px;[m
   padding: 4px 12px;[m
   transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;[m
 }[m
 [m
 .searchbar-input-wrap:focus-within {[m
[31m-  border-color: rgba(129, 140, 248, 0.7);[m
[31m-  background: rgba(255, 255, 255, 0.12);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  background: var(--sidebar-input-bg-focus, var(--glass-bg-hover));[m
   box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);[m
 }[m
 [m
[36m@@ -24,6 +24,7 @@[m
   font-size: 13px;[m
   margin-right: 6px;[m
   opacity: 0.8;[m
[32m+[m[32m  color: var(--sidebar-text-muted, var(--text-muted));[m
 }[m
 [m
 .searchbar-input-wrap input.searchbar-input {[m
[36m@@ -32,21 +33,21 @@[m
   background: transparent !important;[m
   outline: none;[m
   font-size: 13px;[m
[31m-  color: #f1f5f9 !important;[m
[32m+[m[32m  color: var(--sidebar-text, var(--text-main)) !important;[m
   padding: 5px 0;[m
   min-width: 0;[m
   box-shadow: none !important;[m
 }[m
 [m
 .searchbar-input-wrap input.searchbar-input::placeholder {[m
[31m-  color: #94a3b8 !important;[m
[32m+[m[32m  color: var(--sidebar-text-muted, var(--text-muted)) !important;[m
 }[m
 [m
 .searchbar-clear {[m
   background: none;[m
   border: none;[m
   cursor: pointer;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--sidebar-text-muted, var(--text-muted));[m
   font-size: 18px;[m
   line-height: 1;[m
   padding: 0 4px;[m
[36m@@ -55,8 +56,8 @@[m
 }[m
 [m
 .searchbar-clear:hover {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[31m-  color: #f1f5f9;[m
[32m+[m[32m  background: var(--sidebar-hover-bg, rgba(255, 255, 255, 0.1));[m
[32m+[m[32m  color: var(--sidebar-text, var(--text-title));[m
 }[m
 [m
 .searchbar-dropdown {[m
[36m@@ -64,14 +65,14 @@[m
   top: calc(100% + 6px);[m
   left: 0;[m
   right: 0;[m
[31m-  background: #1e293b;[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.12);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
[31m-  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
   max-height: 480px;[m
   overflow-y: auto;[m
   z-index: 1001;[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--text-main);[m
 }[m
 [m
 .searchbar-section {[m
[36m@@ -79,7 +80,7 @@[m
 }[m
 [m
 .searchbar-section + .searchbar-section {[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
 }[m
 [m
 .searchbar-section-header {[m
[36m@@ -89,7 +90,7 @@[m
   padding: 6px 14px;[m
   font-size: 11px;[m
   font-weight: 600;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--text-muted);[m
   text-transform: uppercase;[m
   letter-spacing: 0.05em;[m
 }[m
[36m@@ -99,7 +100,7 @@[m
   border: none;[m
   cursor: pointer;[m
   font-size: 11px;[m
[31m-  color: #818cf8;[m
[32m+[m[32m  color: var(--accent-primary);[m
   padding: 0;[m
   font-weight: 500;[m
 }[m
[36m@@ -109,15 +110,15 @@[m
 }[m
 [m
 .searchbar-group + .searchbar-group {[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
 }[m
 [m
 .searchbar-group-header {[m
   padding: 6px 14px;[m
   font-size: 12px;[m
   font-weight: 600;[m
[31m-  color: #94a3b8;[m
[31m-  background: rgba(255, 255, 255, 0.03);[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .searchbar-row {[m
[36m@@ -130,13 +131,23 @@[m
   border: none;[m
   padding: 8px 14px;[m
   cursor: pointer;[m
[31m-  color: #e2e8f0;[m
[32m+[m[32m  color: var(--text-main);[m
   font-size: 14px;[m
   transition: background 0.1s ease;[m
 }[m
 [m
 .searchbar-row:hover {[m
[31m-  background: rgba(255, 255, 255, 0.06);[m
[32m+[m[32m  background: var(--bg-item);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m/* Keyboard-nav highlight. Distinct from :hover so the user can tell[m
[32m+[m[32m   which row their ↑↓ landed on vs. which one their cursor is over.[m
[32m+[m[32m   A left bar + slightly stronger background reads as "selected row"[m
[32m+[m[32m   without changing the typography (so the layout doesn't shift). */[m
[32m+[m[32m.searchbar-row.is-focused,[m
[32m+[m[32m.searchbar-row.is-focused:hover {[m
[32m+[m[32m  background: var(--sidebar-hover-bg);[m
[32m+[m[32m  box-shadow: inset 3px 0 0 var(--accent-primary);[m
 }[m
 [m
 .searchbar-row-icon {[m
[36m@@ -158,12 +169,12 @@[m
   white-space: nowrap;[m
   overflow: hidden;[m
   text-overflow: ellipsis;[m
[31m-  color: #f1f5f9;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .searchbar-row-sub {[m
   font-size: 12px;[m
[31m-  color: #94a3b8;[m
[32m+[m[32m  color: var(--text-muted);[m
   white-space: nowrap;[m
   overflow: hidden;[m
   text-overflow: ellipsis;[m
[36m@@ -173,42 +184,5 @@[m
   padding: 14px;[m
   text-align: center;[m
   font-size: 13px;[m
[31m-  color: #94a3b8;[m
[31m-}[m
[31m-[m
[31m-[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-dropdown {[m
[31m-  background: #ffffff;[m
[31m-  border-color: #e2e8f0;[m
[31m-  color: #0f172a;[m
[31m-  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-section + .searchbar-section,[m
[31m-.App:not(.dark-theme) .searchbar-group + .searchbar-group {[m
[31m-  border-top-color: #e2e8f0;[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-section-header,[m
[31m-.App:not(.dark-theme) .searchbar-group-header,[m
[31m-.App:not(.dark-theme) .searchbar-status,[m
[31m-.App:not(.dark-theme) .searchbar-row-sub {[m
[31m-  color: #64748b;[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-group-header {[m
[31m-  background: #f8fafc;[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-row {[m
[31m-  color: #0f172a;[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-row:hover {[m
[31m-  background: #f1f5f9;[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .searchbar-row-title {[m
[31m-  color: #0f172a;[m
[31m-}[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/components/SearchBar/index.jsx b/frontend/src/components/SearchBar/index.jsx[m
[1mindex e1ad317..41449c1 100644[m
[1m--- a/frontend/src/components/SearchBar/index.jsx[m
[1m+++ b/frontend/src/components/SearchBar/index.jsx[m
[36m@@ -1,4 +1,5 @@[m
 import React, { useEffect, useRef, useState, useCallback } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import * as api from '../../services/api';[m
 import {[m
   getSearchHistory,[m
[36m@@ -12,11 +13,14 @@[m [mimport './SearchBar.css';[m
 // dropdown rows look like articles), then game, then user (admin).[m
 const TYPE_ORDER = ['knowledge', 'music', 'game', 'user'];[m
 [m
[31m-const TYPE_LABELS = {[m
[31m-  knowledge: 'Bài viết',[m
[31m-  music: 'Bài hát',[m
[31m-  game: 'Trò chơi',[m
[31m-  user: 'Người dùng',[m
[32m+[m[32m// t() keys for the per-type group header. Using dedicated keys (not[m
[32m+[m[32m// the hash approach) so the label is shared with the rest of the[m
[32m+[m[32m// app and translates consistently.[m
[32m+[m[32mconst TYPE_LABEL_KEY = {[m
[32m+[m[32m  knowledge: 'search.typeArticle',[m
[32m+[m[32m  music: 'search.typeSong',[m
[32m+[m[32m  game: 'search.typeGame',[m
[32m+[m[32m  user: 'search.typeUser',[m
 };[m
 [m
 const TYPE_ICONS = {[m
[36m@@ -37,11 +41,17 @@[m [mconst DEBOUNCE_MS = 250;[m
 const MIN_QUERY_LEN = 2;[m
 [m
 export default function SearchBar({ onSelectItem, isAdmin = false, userId = null }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [query, setQuery] = useState('');[m
   const [results, setResults] = useState(null);[m
   const [loading, setLoading] = useState(false);[m
   const [open, setOpen] = useState(false);[m
   const [history, setHistory] = useState(() => getSearchHistory(userId));[m
[32m+[m[32m  // Index of the dropdown row currently highlighted by ↑↓ keyboard nav.[m
[32m+[m[32m  // -1 means "no row highlighted yet" (initial state after typing). We[m
[32m+[m[32m  // reset it whenever the visible row set changes (new query, history[m
[32m+[m[32m  // edit, dropdown opens) so an old index can't point at a stale row.[m
[32m+[m[32m  const [activeIndex, setActiveIndex] = useState(-1);[m
   // Track the in-flight request so an older response can't overwrite[m
   // a newer one (race when typing fast on a slow connection).[m
   const reqIdRef = useRef(0);[m
[36m@@ -78,6 +88,15 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
     }[m
   }, [open]);[m
 [m
[32m+[m[32m  // Reset the keyboard-nav highlight whenever the visible row set[m
[32m+[m[32m  // could change — opening the dropdown, typing a new query (the row[m
[32m+[m[32m  // list rebuilds with different items), or the user clearing their[m
[32m+[m[32m  // history. Without this, activeIndex would point at a row that no[m
[32m+[m[32m  // longer exists after a search query is edited.[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    setActiveIndex(-1);[m
[32m+[m[32m  }, [query, open, history]);[m
[32m+[m
   // Debounced search. Each effect run captures its own reqId; the[m
   // .then() callback only commits results if its id is still the[m
   // current one. Cheaper than AbortController and works the same for[m
[36m@@ -123,11 +142,22 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
     return out;[m
   })();[m
 [m
[31m-  const totalCount = mergedItems.length;[m
[32m+[m[32m  // Number of rows currently rendered as navigable items. In[m
[32m+[m[32m  // "empty query + history" mode the visible rows are the recent[m
[32m+[m[32m  // queries; otherwise they're the merged result groups. We can't[m
[32m+[m[32m  // just use mergedItems.length here because that'd return 0 in[m
[32m+[m[32m  // history mode and disable ↑↓ entirely.[m
[32m+[m[32m  const historyVisible =[m
[32m+[m[32m    open &&[m
[32m+[m[32m    query.trim().length < MIN_QUERY_LEN &&[m
[32m+[m[32m    history.length > 0;[m
[32m+[m[32m  const totalCount = historyVisible[m
[32m+[m[32m    ? history.slice(0, 5).length[m
[32m+[m[32m    : mergedItems.length;[m
 [m
   // Pick a result and notify the parent. Saves the query to history[m
[31m-  // (only on a real selection, not on a hover/keystroke). Closes[m
[31m-  // the dropdown so the parent can navigate immediately.[m
[32m+[m[32m  // (only on a real selection, not on a hover/keystroke). Closes the[m
[32m+[m[32m  // dropdown so the parent can navigate immediately.[m
   const handleSelect = useCallback((type, item) => {[m
     pushSearchQuery(userId, query);[m
     setHistory(getSearchHistory(userId));[m
[36m@@ -142,13 +172,55 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
     onSelectItem?.(item, type);[m
   }, [query, userId, onSelectItem]);[m
 [m
[31m-  // Pressing Enter on a non-empty query: if there's an exact[m
[31m-  // top result, treat Enter as "go to that one". Otherwise just[m
[31m-  // remember the query and let the user keep scrolling.[m
[32m+[m[32m  // Keyboard navigation inside the dropdown:[m
[32m+[m[32m  // - ↑/↓    move highlight between rows[m
[32m+[m[32m  // - Home/End jump to first/last row[m
[32m+[m[32m  // - Enter  if a row is highlighted, pick it; otherwise remember the[m
[32m+[m[32m  //          query so the user can re-find it in history later[m
[32m+[m[32m  // - Escape closes (handled in the global effect above — we don't[m
[32m+[m[32m  //   interfere so the user can Esc even if focus has moved onto a row)[m
   const handleKeyDown = (e) => {[m
[31m-    if (e.key === 'Enter' && query.trim().length >= MIN_QUERY_LEN) {[m
[31m-      pushSearchQuery(userId, query);[m
[31m-      setHistory(getSearchHistory(userId));[m
[32m+[m[32m    const q = query.trim();[m
[32m+[m
[32m+[m[32m    if (e.key === 'ArrowDown') {[m
[32m+[m[32m      if (totalCount === 0) return;[m
[32m+[m[32m      e.preventDefault();[m
[32m+[m[32m      setActiveIndex((prev) => (prev + 1) % totalCount);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (e.key === 'ArrowUp') {[m
[32m+[m[32m      if (totalCount === 0) return;[m
[32m+[m[32m      e.preventDefault();[m
[32m+[m[32m      setActiveIndex((prev) => (prev <= 0 ? totalCount - 1 : prev - 1));[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (e.key === 'Home') {[m
[32m+[m[32m      if (totalCount === 0) return;[m
[32m+[m[32m      e.preventDefault();[m
[32m+[m[32m      setActiveIndex(0);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (e.key === 'End') {[m
[32m+[m[32m      if (totalCount === 0) return;[m
[32m+[m[32m      e.preventDefault();[m
[32m+[m[32m      setActiveIndex(totalCount - 1);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    if (e.key === 'Enter') {[m
[32m+[m[32m      // If a row is highlighted, activate it (treats Enter as a click[m
[32m+[m[32m      // on that row, same as the mouse path).[m
[32m+[m[32m      if (activeIndex >= 0 && activeIndex < mergedItems.length) {[m
[32m+[m[32m        e.preventDefault();[m
[32m+[m[32m        const sel = mergedItems[activeIndex];[m
[32m+[m[32m        handleSelect(sel.type, sel.item);[m
[32m+[m[32m        return;[m
[32m+[m[32m      }[m
[32m+[m[32m      // No row highlighted — fall back to "remember the query".[m
[32m+[m[32m      if (q.length >= MIN_QUERY_LEN) {[m
[32m+[m[32m        pushSearchQuery(userId, q);[m
[32m+[m[32m        setHistory(getSearchHistory(userId));[m
[32m+[m[32m      }[m
     }[m
   };[m
 [m
[36m@@ -159,19 +231,23 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
         <input[m
           className="searchbar-input"[m
           type="text"[m
[31m-          placeholder="Tìm kiếm bài viết, nhạc, game..."[m
[32m+[m[32m          placeholder={t('search.ph.placeholder')}[m
           value={query}[m
           onChange={(e) => setQuery(e.target.value)}[m
           onFocus={() => setOpen(true)}[m
           onKeyDown={handleKeyDown}[m
           ref={inputRef}[m
[31m-          aria-label="Tìm kiếm"[m
[32m+[m[32m          aria-label={t('search.label')}[m
[32m+[m[32m          role="combobox"[m
[32m+[m[32m          aria-expanded={open}[m
[32m+[m[32m          aria-controls="searchbar-dropdown"[m
[32m+[m[32m          aria-activedescendant={activeIndex >= 0 ? `searchbar-row-${activeIndex}` : undefined}[m
         />[m
         {query && ([m
           <button[m
             className="searchbar-clear"[m
             onClick={() => { setQuery(''); setResults(null); }}[m
[31m-            aria-label="Xóa"[m
[32m+[m[32m            aria-label={t('search.clear')}[m
             type="button"[m
           >[m
             ×[m
[36m@@ -180,33 +256,40 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
       </div>[m
 [m
       {open && ([m
[31m-        <div className="searchbar-dropdown" role="listbox">[m
[32m+[m[32m        <div className="searchbar-dropdown" role="listbox" id="searchbar-dropdown">[m
           {/* When the input is empty and we have history, show the[m
               recent queries. We don't show them when the user is[m
               mid-search — that would be visual noise. */}[m
           {query.trim().length < MIN_QUERY_LEN && history.length > 0 && ([m
             <div className="searchbar-section">[m
               <div className="searchbar-section-header">[m
[31m-                <span>Tìm gần đây</span>[m
[32m+[m[32m                <span>{t('search.recent')}</span>[m
                 <button[m
                   className="searchbar-history-clear"[m
                   onClick={() => { clearSearchHistory(userId); setHistory([]); }}[m
                   type="button"[m
                 >[m
[31m-                  Xóa lịch sử[m
[32m+[m[32m                  {t('search.clearHistory')}[m
                 </button>[m
               </div>[m
[31m-              {history.slice(0, 5).map((h, i) => ([m
[31m-                <button[m
[31m-                  key={`${h}-${i}`}[m
[31m-                  className="searchbar-row searchbar-row-history"[m
[31m-                  onClick={() => { setQuery(h); }}[m
[31m-                  type="button"[m
[31m-                >[m
[31m-                  <span className="searchbar-row-icon">🕘</span>[m
[31m-                  <span className="searchbar-row-text">{h}</span>[m
[31m-                </button>[m
[31m-              ))}[m
[32m+[m[32m              {history.slice(0, 5).map((h, i) => {[m
[32m+[m[32m                const isFocused = i === activeIndex;[m
[32m+[m[32m                return ([m
[32m+[m[32m                  <button[m
[32m+[m[32m                    key={`${h}-${i}`}[m
[32m+[m[32m                    id={`searchbar-row-${i}`}[m
[32m+[m[32m                    className={`searchbar-row searchbar-row-history${isFocused ? ' is-focused' : ''}`}[m
[32m+[m[32m                    onClick={() => { setQuery(h); }}[m
[32m+[m[32m                    onMouseEnter={() => setActiveIndex(i)}[m
[32m+[m[32m                    type="button"[m
[32m+[m[32m                    role="option"[m
[32m+[m[32m                    aria-selected={isFocused}[m
[32m+[m[32m                  >[m
[32m+[m[32m                    <span className="searchbar-row-icon">🕘</span>[m
[32m+[m[32m                    <span className="searchbar-row-text">{h}</span>[m
[32m+[m[32m                  </button>[m
[32m+[m[32m                );[m
[32m+[m[32m              })}[m
             </div>[m
           )}[m
 [m
[36m@@ -218,11 +301,11 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
           {query.trim().length >= MIN_QUERY_LEN && ([m
             <div className="searchbar-section">[m
               {loading && ([m
[31m-                <div className="searchbar-status">Đang tìm...</div>[m
[32m+[m[32m                <div className="searchbar-status">{t('search.searching')}</div>[m
               )}[m
               {!loading && totalCount === 0 && ([m
                 <div className="searchbar-status">[m
[31m-                  Không tìm thấy kết quả cho "{query.trim()}"[m
[32m+[m[32m                  {t('search.noResults', { q: query.trim() })}[m
                 </div>[m
               )}[m
               {!loading && totalCount > 0 && ([m
[36m@@ -233,19 +316,39 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
                     return ([m
                       <div key={t} className="searchbar-group">[m
                         <div className="searchbar-group-header">[m
[31m-                          {TYPE_ICONS[t]} {TYPE_LABELS[t]}[m
[32m+[m[32m                          {TYPE_ICONS[t]} {t(TYPE_LABEL_KEY[t])}[m
                         </div>[m
                         {arr.map((item, idx) => {[m
                           const key = `${t}-${item.id ?? item.user_id ?? idx}`;[m
                           const title =[m
                             item.title || item.name || item.user_id || `#${item.id ?? idx}`;[m
                           const sub = item.snippet || item.artist || item.department || item.category || '';[m
[32m+[m[32m                          // Look up the row's position in the merged[m
[32m+[m[32m                          // list (which is what ↑↓ walks). mergedItems[m
[32m+[m[32m                          // is built in TYPE_ORDER so the running[m
[32m+[m[32m                          // globalIdx counter here mirrors it.[m
[32m+[m[32m                          let globalIdx = -1;[m
[32m+[m[32m                          let running = 0;[m
[32m+[m[32m                          for (const tt of TYPE_ORDER) {[m
[32m+[m[32m                            const a = results.results?.[tt];[m
[32m+[m[32m                            if (!a) continue;[m
[32m+[m[32m                            if (tt === t) {[m
[32m+[m[32m                              globalIdx = running + idx;[m
[32m+[m[32m                              break;[m
[32m+[m[32m                            }[m
[32m+[m[32m                            running += a.length;[m
[32m+[m[32m                          }[m
[32m+[m[32m                          const isFocused = globalIdx === activeIndex;[m
                           return ([m
                             <button[m
                               key={key}[m
[31m-                              className="searchbar-row"[m
[32m+[m[32m                              id={`searchbar-row-${globalIdx}`}[m
[32m+[m[32m                              className={`searchbar-row${isFocused ? ' is-focused' : ''}`}[m
                               onClick={() => handleSelect(t, item)}[m
[32m+[m[32m                              onMouseEnter={() => setActiveIndex(globalIdx)}[m
                               type="button"[m
[32m+[m[32m                              role="option"[m
[32m+[m[32m                              aria-selected={isFocused}[m
                             >[m
                               <span className="searchbar-row-text">[m
                                 <span className="searchbar-row-title">{title}</span>[m
[36m@@ -264,11 +367,11 @@[m [mexport default function SearchBar({ onSelectItem, isAdmin = false, userId = null[m
 [m
           {query.trim().length < MIN_QUERY_LEN && history.length === 0 && ([m
             <div className="searchbar-status">[m
[31m-              Gõ ít nhất {MIN_QUERY_LEN} ký tự để tìm kiếm.[m
[32m+[m[32m              {t('search.minHint', { n: MIN_QUERY_LEN })}[m
             </div>[m
           )}[m
         </div>[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/i18n/dictionaries/en.js b/frontend/src/i18n/dictionaries/en.js[m
[1mnew file mode 100644[m
[1mindex 0000000..6efa3af[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/i18n/dictionaries/en.js[m
[36m@@ -0,0 +1,692 @@[m
[32m+[m[32m// English dictionary. Mirrors the shape of vi.js — each leaf here[m
[32m+[m[32m// corresponds to the same dotted key path on the vi side. Adding a[m
[32m+[m[32m// new key without a VI counterpart is allowed (it falls back to VI),[m
[32m+[m[32m// but adding a new VI key without updating this file will fail the[m
[32m+[m[32m// type-check when vi becomes a `.ts` dictionary later.[m
[32m+[m
[32m+[m[32mconst en = {[m
[32m+[m[32m  common: {[m
[32m+[m[32m    appName: 'Favourite Web',[m
[32m+[m[32m    save: 'Save',[m
[32m+[m[32m    saved: 'Saved',[m
[32m+[m[32m    cancel: 'Cancel',[m
[32m+[m[32m    back: 'Back',[m
[32m+[m[32m    backToList: '← Back to list',[m
[32m+[m[32m    close: 'Close',[m
[32m+[m[32m    loading: 'Loading...',[m
[32m+[m[32m    noData: 'No data yet',[m
[32m+[m[32m    search: 'Search',[m
[32m+[m[32m    all: 'All',[m
[32m+[m[32m    delete: 'Delete',[m
[32m+[m[32m    edit: 'Edit',[m
[32m+[m[32m    add: 'Add',[m
[32m+[m[32m    confirm: 'Confirm',[m
[32m+[m[32m    yes: 'Yes',[m
[32m+[m[32m    no: 'No',[m
[32m+[m[32m    apply: 'Apply',[m
[32m+[m[32m    reset: 'Reset',[m
[32m+[m[32m    backToFeed: '← Back to Feed',[m
[32m+[m[32m    backToListArrow: '← Back to list',[m
[32m+[m[32m    ok: 'OK',[m
[32m+[m[32m    saveNew: '+ Add',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  nav: {[m
[32m+[m[32m    home: 'Home',[m
[32m+[m[32m    feed: 'Feed',[m
[32m+[m[32m    bookmarks: 'Saved',[m
[32m+[m[32m    collections: 'Collections',[m
[32m+[m[32m    dashboard: 'Face Scan',[m
[32m+[m[32m    users: 'Users',[m
[32m+[m[32m    logs: 'Logs',[m
[32m+[m[32m    games: 'Games',[m
[32m+[m[32m    music: 'Music',[m
[32m+[m[32m    knowledge: 'Knowledge',[m
[32m+[m[32m    postNew: 'New post',[m
[32m+[m[32m    profile: 'Profile',[m
[32m+[m[32m    signOut: 'Sign out',[m
[32m+[m[32m    themeLight: 'Switch to light mode',[m
[32m+[m[32m    themeDark: 'Switch to dark mode',[m
[32m+[m[32m    lightShort: '☀️ Light',[m
[32m+[m[32m    darkShort: '🌙 Dark',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  auth: {[m
[32m+[m[32m    portal: 'Fav Web Portal',[m
[32m+[m[32m    portalShort: 'Fav Web',[m
[32m+[m[32m    tagline: 'Face-recognition sign-in & entertainment portal',[m
[32m+[m[32m    createSubtitle: 'Create a new member account',[m
[32m+[m[32m    tabPassword: 'Password',[m
[32m+[m[32m    tabFace: 'Face',[m
[32m+[m[32m    usernameOrEmail: 'Username or Email',[m
[32m+[m[32m    password: 'Password',[m
[32m+[m[32m    faceCaptureHint: 'Capture your registered face to sign in',[m
[32m+[m[32m    faceScanning: '🔄 Recognizing... Please hold still',[m
[32m+[m[32m    faceSuccess: '✔️ Recognition successful! Redirecting...',[m
[32m+[m[32m    faceFail: '❌ Recognition failed. Try again in better lighting.',[m
[32m+[m[32m    submitLogin: 'Sign in',[m
[32m+[m[32m    submittingLogin: 'Signing in...',[m
[32m+[m[32m    noAccount: "Don't have an account?",[m
[32m+[m[32m    haveAccount: 'Already have an account?',[m
[32m+[m[32m    goRegister: 'Sign up now',[m
[32m+[m[32m    goLogin: 'Sign in',[m
[32m+[m[32m    regUsernameLabel: 'Username *',[m
[32m+[m[32m    regFullNameLabel: 'Full name *',[m
[32m+[m[32m    regEmailLabel: 'Email address',[m
[32m+[m[32m    regPasswordLabel: 'Password *',[m
[32m+[m[32m    regDepartmentLabel: 'Department / Faculty',[m
[32m+[m[32m    regFaceLabel: 'Face photos (optional)',[m
[32m+[m[32m    regFaceHint: 'Optional. Pick at least 1 clear photo if you want to sign in with your face.',[m
[32m+[m[32m    submitRegister: 'Create account',[m
[32m+[m[32m    submittingRegister: 'Creating account...',[m
[32m+[m[32m    signInRequired: 'Please sign in for this action.',[m
[32m+[m[32m    signInNow: 'Sign in now',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      username: 'Enter username or email...',[m
[32m+[m[32m      password: 'Enter password...',[m
[32m+[m[32m      username_login: 'Enter a login username...',[m
[32m+[m[32m      full_name: 'Enter your full name...',[m
[32m+[m[32m      email: 'Enter email (e.g. name@gmail.com)...',[m
[32m+[m[32m      set_password: 'Set a password...',[m
[32m+[m[32m      department: 'Enter department...',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      fillAll: 'Please fill in both username and password.',[m
[32m+[m[32m      passwordFail: 'Sign-in failed. Please check your username and password.',[m
[32m+[m[32m      faceFail: 'Could not recognize your face. Please try again.',[m
[32m+[m[32m      fillRequired: 'Please fill in all required fields (Username, Full name, Password).',[m
[32m+[m[32m      registerFail: 'Registration failed. Username or email may already be in use.',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      register: 'Account created! You can now sign in with it.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  home: {[m
[32m+[m[32m    title: 'Home',[m
[32m+[m[32m    streak: "You're on a {n}-day streak! Keep going.",[m
[32m+[m[32m    daysLabel: 'days',[m
[32m+[m[32m    daysActivity: 'Activity over last {days} days',[m
[32m+[m[32m    statArticles: 'Articles read',[m
[32m+[m[32m    statSongs: 'Songs listened',[m
[32m+[m[32m    statGames: 'Games viewed',[m
[32m+[m[32m    statPosts: 'Posts liked',[m
[32m+[m[32m    chartEmpty: 'No data yet',[m
[32m+[m[32m    recentlyRead: 'Recently read',[m
[32m+[m[32m    recentActivity: 'Recent activity',[m
[32m+[m[32m    topCategories: 'Topics you care about',[m
[32m+[m[32m    noRecentArticles: 'No articles yet. Open ',[m
[32m+[m[32m    noRecentArticlesAfter: ' to get started.',[m
[32m+[m[32m    noActivity: 'No activity yet.',[m
[32m+[m[32m    whereToStart: 'Where to start?',[m
[32m+[m[32m    quickRead: 'Read articles',[m
[32m+[m[32m    quickListen: 'Listen to music',[m
[32m+[m[32m    quickPlay: 'Play games',[m
[32m+[m[32m    quickFeed: 'View feed',[m
[32m+[m[32m    exportCsv: 'Download CSV file',[m
[32m+[m[32m    exportJson: 'Download JSON file',[m
[32m+[m[32m    loadFail: 'Failed to load data. Please try again.',[m
[32m+[m[32m    event: {[m
[32m+[m[32m      view: 'You read this · {time}',[m
[32m+[m[32m      play: 'You listened · {time}',[m
[32m+[m[32m      like: 'You liked this · {time}',[m
[32m+[m[32m      unknown: 'You did something · {time}',[m
[32m+[m[32m    },[m
[32m+[m[32m    legend: {[m
[32m+[m[32m      knowledge: 'Articles',[m
[32m+[m[32m      music: 'Music',[m
[32m+[m[32m      game: 'Games',[m
[32m+[m[32m    },[m
[32m+[m[32m    typeLabel: {[m
[32m+[m[32m      knowledge: 'article',[m
[32m+[m[32m      music: 'song',[m
[32m+[m[32m      game: 'game',[m
[32m+[m[32m      post: 'post',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  feed: {[m
[32m+[m[32m    title: 'Latest feed',[m
[32m+[m[32m    knowledgeSection: 'Featured knowledge',[m
[32m+[m[32m    gameBlogSection: 'Game blog & news',[m
[32m+[m[32m    userStatsSection: 'User statistics',[m
[32m+[m[32m    friendsActivity: '👥 Friends activity',[m
[32m+[m[32m    allCategory: 'All',[m
[32m+[m[32m    noPosts: 'No activity posted yet.',[m
[32m+[m[32m    noKnowledge: 'No knowledge articles yet.',[m
[32m+[m[32m    noGames: 'No game posts.',[m
[32m+[m[32m    noFriends: "You don't follow anyone, or your friends haven't been active recently.",[m
[32m+[m[32m    playOnline: 'Play online',[m
[32m+[m[32m    comment: 'Comment',[m
[32m+[m[32m    unsave: 'Unsave',[m
[32m+[m[32m    savePost: 'Save post',[m
[32m+[m[32m    save: '⚪ Save',[m
[32m+[m[32m    readMore: 'Read more →',[m
[32m+[m[32m    like: '❤️ Like',[m
[32m+[m[32m    read: '📖 Read',[m
[32m+[m[32m    modalCategory: 'Category',[m
[32m+[m[32m    modalAuthor: 'Author',[m
[32m+[m[32m    modalType: 'Type',[m
[32m+[m[32m    modalGenre: 'Genre',[m
[32m+[m[32m    viewsLabel: 'views',[m
[32m+[m[32m    likesLabel: 'likes',[m
[32m+[m[32m    modalLikeArticle: 'Like article',[m
[32m+[m[32m    modalClose: 'Close',[m
[32m+[m[32m    untrustedGame: 'Cannot open game from an untrusted source',[m
[32m+[m[32m    statName: 'Name',[m
[32m+[m[32m    statPhotos: 'Photo count',[m
[32m+[m[32m    statTopSongs: 'Top 5 songs',[m
[32m+[m[32m    checkinTab: 'Check-in',[m
[32m+[m[32m    legend: {[m
[32m+[m[32m      success: 'Success',[m
[32m+[m[32m      failed: 'Failed',[m
[32m+[m[32m      plays: 'Plays',[m
[32m+[m[32m      likes: 'Likes',[m
[32m+[m[32m    },[m
[32m+[m[32m    friendAction: {[m
[32m+[m[32m      viewKnowledge: 'read',[m
[32m+[m[32m      likeKnowledge: 'liked',[m
[32m+[m[32m      playMusic: 'listened to',[m
[32m+[m[32m      likeMusic: 'liked',[m
[32m+[m[32m      viewGame: 'viewed',[m
[32m+[m[32m      likeGame: 'liked',[m
[32m+[m[32m      likePost: 'liked',[m
[32m+[m[32m      viewPost: 'viewed',[m
[32m+[m[32m    },[m
[32m+[m[32m    scanLog: {[m
[32m+[m[32m      ready: 'Device ready',[m
[32m+[m[32m      scanning: '⏳ Scanning...',[m
[32m+[m[32m      success: '✅ Success: {name}',[m
[32m+[m[32m      error: '❌ Not recognized',[m
[32m+[m[32m    },[m
[32m+[m[32m    notRecognized: 'Face not recognized.',[m
[32m+[m[32m    loadFail: 'Failed to load dashboard data. Please sign in again.',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  knowledge: {[m
[32m+[m[32m    heading: 'Share Knowledge for Learning & Working',[m
[32m+[m[32m    subtitle: 'Community sharing knowledge, skills and experience',[m
[32m+[m[32m    writeNew: '✍️ New post',[m
[32m+[m[32m    saveDraft: '📝 Save draft',[m
[32m+[m[32m    schedule: '⏰ Schedule',[m
[32m+[m[32m    allArticles: '📚 All articles',[m
[32m+[m[32m    myArticles: '👤 My articles',[m
[32m+[m[32m    clearFilter: 'Clear filter',[m
[32m+[m[32m    tagLabel: '🏷️ Tag:',[m
[32m+[m[32m    clearTag: 'Clear tag',[m
[32m+[m[32m    loading: 'Loading articles...',[m
[32m+[m[32m    noArticles: 'No articles in this category',[m
[32m+[m[32m    draft: '📝 Draft',[m
[32m+[m[32m    scheduled: '⏰ Scheduled',[m
[32m+[m[32m    readMore: 'Read more',[m
[32m+[m[32m    like: '❤️ Like',[m
[32m+[m[32m    relatedVideos: '📺 Related videos',[m
[32m+[m[32m    loadingVideos: 'Searching YouTube for videos…',[m
[32m+[m[32m    noVideos: 'No related videos found. (YOUTUBE_API_KEY may not be configured.)',[m
[32m+[m[32m    draftModal: '📝 Save draft',[m
[32m+[m[32m    scheduledModal: '⏰ Schedule post',[m
[32m+[m[32m    newPostModal: '✍️ New post',[m
[32m+[m[32m    titleLabel: 'Title',[m
[32m+[m[32m    categoryLabel: 'Category',[m
[32m+[m[32m    shortDescLabel: 'Short description',[m
[32m+[m[32m    contentLabel: 'Content',[m
[32m+[m[32m    tagsLabel: 'Tags (comma-separated)',[m
[32m+[m[32m    scheduledAtLabel: 'Publish time',[m
[32m+[m[32m    saving: 'Saving...',[m
[32m+[m[32m    draftBtn: '📝 Save draft',[m
[32m+[m[32m    scheduleBtn: '⏰ Schedule',[m
[32m+[m[32m    publishNow: '🚀 Publish now',[m
[32m+[m[32m    filterByTag: 'Filter by #{tag}',[m
[32m+[m[32m    altIcon: 'Knowledge Icon',[m
[32m+[m[32m    draftCreated: 'Draft saved',[m
[32m+[m[32m    scheduledCreated: 'Scheduled successfully',[m
[32m+[m[32m    cancelCreate: 'Cancel',[m
[32m+[m[32m    categories: {[m
[32m+[m[32m      'Lập Trình': 'Programming',[m
[32m+[m[32m      'Kỹ Năng': 'Skills',[m
[32m+[m[32m      'Thiết Kế': 'Design',[m
[32m+[m[32m      'Kinh Doanh': 'Business',[m
[32m+[m[32m      'Phát Triển': 'Development',[m
[32m+[m[32m      'Tài Chính': 'Finance',[m
[32m+[m[32m    },[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      title: 'e.g. Mastering React Hooks',[m
[32m+[m[32m      category: 'e.g. Programming',[m
[32m+[m[32m      tags: 'react, frontend, hooks',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Failed to load articles',[m
[32m+[m[32m      titleRequired: 'Title and category are required.',[m
[32m+[m[32m      scheduledRequired: 'Please pick a publish time.',[m
[32m+[m[32m      create: 'Could not create article.',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      created: '✔️ Post created successfully!',[m
[32m+[m[32m    },[m
[32m+[m[32m    fail: {[m
[32m+[m[32m      created: '❌ Post failed',[m
[32m+[m[32m    },[m
[32m+[m[32m    bookmark: 'Save article',[m
[32m+[m[32m    unbookmark: 'Unsave',[m
[32m+[m[32m    close: 'Close',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  games: {[m
[32m+[m[32m    heading: 'Game News & Blog',[m
[32m+[m[32m    subtitle: 'Latest articles, guides and gaming tips',[m
[32m+[m[32m    blogTopics: '📰 BLOG TOPICS',[m
[32m+[m[32m    allArticles: '📰 All articles',[m
[32m+[m[32m    loading: 'Loading article list...',[m
[32m+[m[32m    noPosts: 'No game posts.',[m
[32m+[m[32m    viewsLabel: 'views',[m
[32m+[m[32m    likesShort: 'likes',[m
[32m+[m[32m    read: '📖 Read',[m
[32m+[m[32m    like: '❤️ Like',[m
[32m+[m[32m    likeArticle: 'Like article',[m
[32m+[m[32m    close: 'Close',[m
[32m+[m[32m    categoryLabel: 'Category:',[m
[32m+[m[32m    categoryPrefix: 'Category: ',[m
[32m+[m[32m    sidebarCategoryLabel: 'Article categories:',[m
[32m+[m[32m    sidebarTotalLabel: 'Total articles:',[m
[32m+[m[32m    altIcon: 'Games Icon',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Failed to load games',[m
[32m+[m[32m    },[m
[32m+[m[32m    bookmark: 'Save article',[m
[32m+[m[32m    unbookmark: 'Unsave',[m
[32m+[m[32m    likesLabel: 'likes',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  music: {[m
[32m+[m[32m    heading: 'Online Music',[m
[32m+[m[32m    subtitle: 'Enjoy and relax with top-quality licensed songs',[m
[32m+[m[32m    libraryHeading: '🎵 MUSIC LIBRARY',[m
[32m+[m[32m    sidebar: {[m
[32m+[m[32m      all: 'All',[m
[32m+[m[32m      library: 'Library',[m
[32m+[m[32m      playlist: 'Playlists',[m
[32m+[m[32m      favorite: 'Favorites',[m
[32m+[m[32m      recent: 'Recent',[m
[32m+[m[32m      songs: 'Songs:',[m
[32m+[m[32m      playlists: 'Playlists:',[m
[32m+[m[32m      duration: 'Duration:',[m
[32m+[m[32m    },[m
[32m+[m[32m    loading: 'Loading music...',[m
[32m+[m[32m    noSongData: 'No song data',[m
[32m+[m[32m    createPlaylist: '➕ Create playlist',[m
[32m+[m[32m    addMusic: '➕ Add music',[m
[32m+[m[32m    backToPlaylists: '⬅️ Back to playlists',[m
[32m+[m[32m    playlistBadge: 'PLAYLIST',[m
[32m+[m[32m    songLabel: 'songs',[m
[32m+[m[32m    deletePlaylist: '🗑️ Delete playlist',[m
[32m+[m[32m    songList: 'Song list',[m
[32m+[m[32m    playsLabel: 'plays',[m
[32m+[m[32m    playlistEmpty: 'This playlist is empty. Switch to the "All" tab to add songs.',[m
[32m+[m[32m    emptyPlaylistsJoin: '{empty} {cta}',[m
[32m+[m[32m    myPlaylists: '📻 My playlists',[m
[32m+[m[32m    noPlaylists: 'No playlists yet. ',[m
[32m+[m[32m    noPlaylistsCTA: 'Click "Create playlist" to start!',[m
[32m+[m[32m    noPlaylistsAnonymous: 'Please sign in to create.',[m
[32m+[m[32m    viewAll: 'View all',[m
[32m+[m[32m    newReleases: '🎵 New releases',[m
[32m+[m[32m    songs: 'Songs',[m
[32m+[m[32m    popoverTitle: 'Add to playlist',[m
[32m+[m[32m    popoverEmpty: 'No playlists yet',[m
[32m+[m[32m    play: 'Play',[m
[32m+[m[32m    like: 'Like',[m
[32m+[m[32m    prev: 'Previous',[m
[32m+[m[32m    next: 'Next',[m
[32m+[m[32m    removeFromPlaylist: 'Remove from playlist',[m
[32m+[m[32m    deleteSong: 'Delete song',[m
[32m+[m[32m    addToPlaylist: 'Add to playlist',[m
[32m+[m[32m    bookmark: 'Save song',[m
[32m+[m[32m    unbookmark: 'Unsave',[m
[32m+[m[32m    uploadHeading: 'Add music to library',[m
[32m+[m[32m    songTitleLabel: 'Song title',[m
[32m+[m[32m    artistLabel: 'Artist (Author)',[m
[32m+[m[32m    genreLabel: 'Genre',[m
[32m+[m[32m    genreUnknown: 'Unspecified (Update later)',[m
[32m+[m[32m    durationLabel: 'Duration (auto-detected)',[m
[32m+[m[32m    fileLabel: 'Audio file (.mp3, .wav)',[m
[32m+[m[32m    uploading: 'Uploading...',[m
[32m+[m[32m    processing: 'Processing...',[m
[32m+[m[32m    uploadAndSave: 'Upload & Save',[m
[32m+[m[32m    createPlaylistHeading: 'Create new playlist',[m
[32m+[m[32m    playlistNameLabel: 'Playlist name',[m
[32m+[m[32m    playlistDescLabel: 'Description',[m
[32m+[m[32m    playlistIconLabel: 'Icon (emoji)',[m
[32m+[m[32m    createNew: 'Create',[m
[32m+[m[32m    altIcon: 'Music Icon',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      songTitle: 'Enter song title...',[m
[32m+[m[32m      artist: 'Enter artist (default: Update later)...',[m
[32m+[m[32m      playlistName: 'e.g. Study Music, Chill Vibes...',[m
[32m+[m[32m      playlistDesc: 'Short description of the playlist...',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Failed to load music data',[m
[32m+[m[32m      deleteSong: 'Could not delete song',[m
[32m+[m[32m      deletePlaylist: 'Could not delete playlist',[m
[32m+[m[32m      playlistNameRequired: 'Please enter a playlist name!',[m
[32m+[m[32m      createPlaylist: 'Could not create playlist',[m
[32m+[m[32m      addSongToPlaylist: 'Could not add song to playlist',[m
[32m+[m[32m      removeSongFromPlaylist: 'Could not remove song from playlist',[m
[32m+[m[32m      fileRequired: 'Please choose an audio file!',[m
[32m+[m[32m      titleRequired: 'Please enter a song title!',[m
[32m+[m[32m      noUrl: 'No file URL received after upload',[m
[32m+[m[32m      upload: 'Upload or library-add failed',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      deletePlaylist: 'Playlist deleted successfully!',[m
[32m+[m[32m      createPlaylist: 'Playlist created successfully!',[m
[32m+[m[32m      addSongToPlaylist: 'Song added to playlist!',[m
[32m+[m[32m      removeSongFromPlaylist: 'Song removed from playlist!',[m
[32m+[m[32m      upload: 'Song added to library!',[m
[32m+[m[32m    },[m
[32m+[m[32m    confirm: {[m
[32m+[m[32m      deleteSong: 'Are you sure you want to delete this song from the library?',[m
[32m+[m[32m      deletePlaylist: 'Are you sure you want to delete this playlist?',[m
[32m+[m[32m      removeSongFromPlaylist: 'Are you sure you want to remove this song from the playlist?',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  dashboard: {[m
[32m+[m[32m    title: 'Face Scan',[m
[32m+[m[32m    subtitle: 'Auto-scan every 5 minutes, or capture manually when needed.',[m
[32m+[m[32m    autoScanOn: 'Disable auto scan',[m
[32m+[m[32m    autoScanOff: 'Enable auto scan',[m
[32m+[m[32m    capturedImage: 'Captured image',[m
[32m+[m[32m    idle: 'No result yet',[m
[32m+[m[32m    processing: 'Processing image...',[m
[32m+[m[32m    unrecognized: 'Could not recognize. Please try again.',[m
[32m+[m[32m    captureBtn: 'Capture & Recognize',[m
[32m+[m[32m    resultIdle: 'No result yet.',[m
[32m+[m[32m    resultLoading: 'Processing image...',[m
[32m+[m[32m    resultScanning: 'Processing image...',[m
[32m+[m[32m    resultSuccess: '✔️ Recognition successful',[m
[32m+[m[32m    resultError: 'Could not recognize. Please try again.',[m
[32m+[m[32m    altPreview: 'capture preview',[m
[32m+[m[32m    altFaceTitle: 'Face Scan',[m
[32m+[m[32m    hudVersion: 'FACE_ID v2.0',[m
[32m+[m[32m    hudLock: 'LOCK:',[m
[32m+[m[32m    hudOK: 'OK',[m
[32m+[m[32m    hudSearching: 'SEARCHING',[m
[32m+[m[32m    hudScanning: 'Scanning',[m
[32m+[m[32m    hudVerified: 'Verified',[m
[32m+[m[32m    hudDenied: 'Access Denied',[m
[32m+[m[32m    hudActive: 'Sys Active',[m
[32m+[m[32m    hudIdle: 'Idle',[m
[32m+[m[32m    cameraError: 'Could not open camera. Please check permissions.',[m
[32m+[m[32m    banner: {[m
[32m+[m[32m      inactive: "You haven't activated Face ID yet.",[m
[32m+[m[32m      cta: 'Register your face to sign in faster using your camera.',[m
[32m+[m[32m      activate: 'Activate Face ID now',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  comments: {[m
[32m+[m[32m    title: '💬 Comments',[m
[32m+[m[32m    replyTo: 'Replying to',[m
[32m+[m[32m    send: 'Send',[m
[32m+[m[32m    replying: 'Reply',[m
[32m+[m[32m    saving: 'Saving...',[m
[32m+[m[32m    save: 'Save',[m
[32m+[m[32m    cancelEdit: 'Cancel',[m
[32m+[m[32m    edit: 'Edit',[m
[32m+[m[32m    delete: 'Delete',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      write: 'Write a comment...',[m
[32m+[m[32m      reply: 'Reply to @{name}...',[m
[32m+[m[32m    },[m
[32m+[m[32m    cancelReply: 'Cancel reply',[m
[32m+[m[32m    sending: 'Sending...',[m
[32m+[m[32m    loading: 'Loading comments...',[m
[32m+[m[32m    empty: 'No comments yet. Be the first!',[m
[32m+[m[32m    reaction: {[m
[32m+[m[32m      like: 'Like',[m
[32m+[m[32m      love: 'Love',[m
[32m+[m[32m      fire: 'Fire',[m
[32m+[m[32m      laugh: 'Haha',[m
[32m+[m[32m      wow: 'Wow',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Could not load comments',[m
[32m+[m[32m      send: 'Could not send comment. Please try again.',[m
[32m+[m[32m      delete: 'Could not delete comment.',[m
[32m+[m[32m      reaction: 'Could not save reaction.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  notif: {[m
[32m+[m[32m    title: 'Notifications',[m
[32m+[m[32m    ariaBell: 'Notifications',[m
[32m+[m[32m    unread: 'Unread',[m
[32m+[m[32m    markAllRead: 'Mark all as read',[m
[32m+[m[32m    allTab: 'All',[m
[32m+[m[32m    unreadTab: 'Unread',[m
[32m+[m[32m    loading: 'Loading...',[m
[32m+[m[32m    empty: '🔔 You have no notifications yet.',[m
[32m+[m[32m    emptyUnread: '🔔 No unread notifications.',[m
[32m+[m[32m    unreadDot: 'Unread',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Could not load notifications.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  profile: {[m
[32m+[m[32m    loading: 'Loading profile...',[m
[32m+[m[32m    back: '← Back',[m
[32m+[m[32m    joinDate: 'Joined',[m
[32m+[m[32m    followersCount: 'followers',[m
[32m+[m[32m    followingCount: 'following',[m
[32m+[m[32m    follow: '+ Follow',[m
[32m+[m[32m    following: '✓ Following',[m
[32m+[m[32m    tabFollowers: 'Followers',[m
[32m+[m[32m    tabFollowing: 'Following',[m
[32m+[m[32m    loadingNetwork: 'Loading...',[m
[32m+[m[32m    emptyFollowers: 'No followers yet.',[m
[32m+[m[32m    emptyFollowing: 'Not following anyone yet.',[m
[32m+[m[32m    selfHint: 'This is your profile.',[m
[32m+[m[32m    statsArticles: 'Articles posted',[m
[32m+[m[32m    statsLikes: 'Likes received',[m
[32m+[m[32m    statsPosts: 'Feed posts',[m
[32m+[m[32m    statsComments: 'Comments',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      notFound: 'User not found.',[m
[32m+[m[32m      load: 'Could not load profile.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  collections: {[m
[32m+[m[32m    myCollectionsTitle: '📂 My collections',[m
[32m+[m[32m    subtitle: 'Group Knowledge articles into collections to re-read later.',[m
[32m+[m[32m    addButton: 'Create new collection',[m
[32m+[m[32m    addToCollection: 'Add to collection',[m
[32m+[m[32m    removeFromCollection: 'Remove from collection',[m
[32m+[m[32m    delete: 'Delete collection',[m
[32m+[m[32m    articleCount: 'articles',[m
[32m+[m[32m    empty: 'No collections yet',[m
[32m+[m[32m    emptyHint: 'Open a Knowledge article → click "📂 Add to collection" → pick "{name}".',[m
[32m+[m[32m    saving: 'Saving...',[m
[32m+[m[32m    loading: 'Loading...',[m
[32m+[m[32m    saving2: 'Creating...',[m
[32m+[m[32m    edit: 'Edit',[m
[32m+[m[32m    save: 'Save',[m
[32m+[m[32m    cancel: 'Cancel',[m
[32m+[m[32m    create: 'Create',[m
[32m+[m[32m    added: '✓ Added',[m
[32m+[m[32m    pickEmpty: 'You have no collections yet. Open "My collections" to create one.',[m
[32m+[m[32m    articleShort: 'Articles',[m
[32m+[m[32m    emptyDetail: 'This collection is empty',[m
[32m+[m[32m    emptyDetailHint: 'Open a Knowledge article → click "📂 Add to collection" → pick "{name}".',[m
[32m+[m[32m    back: '← Back',[m
[32m+[m[32m    backToList: '← Back to list',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Could not load collections.',[m
[32m+[m[32m      create: 'Could not create. Name must be non-empty and ≤255 characters.',[m
[32m+[m[32m      notFound: 'Collection not found.',[m
[32m+[m[32m      loadDetail: 'Could not load collection.',[m
[32m+[m[32m    },[m
[32m+[m[32m    confirm: {[m
[32m+[m[32m      delete: 'Delete this collection?',[m
[32m+[m[32m    },[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      name: 'Collection name (required)',[m
[32m+[m[32m      desc: 'Description (optional)',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  bookmarks: {[m
[32m+[m[32m    title: '🔖 Saved',[m
[32m+[m[32m    subtitle: 'Posts and articles you saved for later.',[m
[32m+[m[32m    all: 'All',[m
[32m+[m[32m    knowledge: 'Articles',[m
[32m+[m[32m    post: 'Posts',[m
[32m+[m[32m    music: 'Songs',[m
[32m+[m[32m    game: 'Games',[m
[32m+[m[32m    loading: 'Loading...',[m
[32m+[m[32m    empty: "You haven't saved anything yet",[m
[32m+[m[32m    emptyHint: 'Tap 🔖 on any Knowledge article or feed post to save it for later.',[m
[32m+[m[32m    cta: 'Go to Feed →',[m
[32m+[m[32m    unsave: 'Unsave',[m
[32m+[m[32m    save: 'Save',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Could not load saved list.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  users: {[m
[32m+[m[32m    title: 'User Management',[m
[32m+[m[32m    enrollBtn: 'Register new account',[m
[32m+[m[32m    photoLabel: 'Face registration photos (optional — used for Face ID):',[m
[32m+[m[32m    loading: 'Loading data...',[m
[32m+[m[32m    nameCol: 'Name',[m
[32m+[m[32m    photoCount: 'Photo count',[m
[32m+[m[32m    createdAt: 'Created at',[m
[32m+[m[32m    noUsers: 'No users yet.',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      username: 'Username (Employee / Student ID)',[m
[32m+[m[32m      full_name: 'Full name',[m
[32m+[m[32m      email: 'Email address',[m
[32m+[m[32m      password: 'Login password',[m
[32m+[m[32m      department: 'Department / Faculty',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Could not load user list.',[m
[32m+[m[32m    },[m
[32m+[m[32m    enrolling: 'Enrolling user...',[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      enrolled: 'Enrolled successfully',[m
[32m+[m[32m    },[m
[32m+[m[32m    fail: {[m
[32m+[m[32m      enrolled: 'Enrollment failed.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  logs: {[m
[32m+[m[32m    title: 'Logs / History',[m
[32m+[m[32m    loading: 'Loading history...',[m
[32m+[m[32m    logId: 'Log ID',[m
[32m+[m[32m    userId: 'User ID',[m
[32m+[m[32m    name: 'Name',[m
[32m+[m[32m    status: 'Status',[m
[32m+[m[32m    time: 'Time',[m
[32m+[m[32m    photo: 'Photo',[m
[32m+[m[32m    view: 'View',[m
[32m+[m[32m    none: 'None',[m
[32m+[m[32m    empty: 'No scan history.',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  search: {[m
[32m+[m[32m    label: 'Search',[m
[32m+[m[32m    clear: 'Clear',[m
[32m+[m[32m    recent: 'Recent searches',[m
[32m+[m[32m    clearHistory: 'Clear history',[m
[32m+[m[32m    searching: 'Searching...',[m
[32m+[m[32m    typeArticle: 'Articles',[m
[32m+[m[32m    typeSong: 'Songs',[m
[32m+[m[32m    typeGame: 'Games',[m
[32m+[m[32m    typeUser: 'Users',[m
[32m+[m[32m    minHint: 'Type at least {n} characters to search.',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      placeholder: 'Search articles, music, games...',[m
[32m+[m[32m    },[m
[32m+[m[32m    noResults: 'No results for "{q}"',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  time: {[m
[32m+[m[32m    justNow: 'just now',[m
[32m+[m[32m    minutesAgo: '{n}m ago',[m
[32m+[m[32m    hoursAgo: '{n}h ago',[m
[32m+[m[32m    daysAgo: '{n}d ago',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  status: {[m
[32m+[m[32m    success: 'Success',[m
[32m+[m[32m    failed: 'Failed',[m
[32m+[m[32m    admin: 'Admin',[m
[32m+[m[32m    administrator: 'Administrator',[m
[32m+[m[32m    idle: 'Idle',[m
[32m+[m[32m    loading: 'Loading',[m
[32m+[m[32m    scanning: 'Scanning',[m
[32m+[m[32m    error: 'Error',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  post: {[m
[32m+[m[32m    modalTitle: '➕ Create new post',[m
[32m+[m[32m    typeText: '📝 Post',[m
[32m+[m[32m    typeImage: '📸 Image',[m
[32m+[m[32m    typeVideo: '🎥 Video',[m
[32m+[m[32m    typeAudio: 'Music',[m
[32m+[m[32m    typeGame: 'Game',[m
[32m+[m[32m    titleLabel: 'Post title *',[m
[32m+[m[32m    titlePh: 'Enter a catchy title...',[m
[32m+[m[32m    textContent: 'Detailed content',[m
[32m+[m[32m    descContent: 'Description / Caption',[m
[32m+[m[32m    contentPh: 'Detailed content...',[m
[32m+[m[32m    coverImage: 'Cover image (optional)',[m
[32m+[m[32m    fileImage: 'Choose image file (JPG, PNG, GIF) *',[m
[32m+[m[32m    fileVideo: 'Choose video file (MP4) *',[m
[32m+[m[32m    fileAudio: 'Choose audio file (MP3, WAV) *',[m
[32m+[m[32m    fileGame: 'Choose Game archive (.zip) *',[m
[32m+[m[32m    fileDefault: 'Attachment',[m
[32m+[m[32m    uploading: 'Uploading main file: {percent}%',[m
[32m+[m[32m    uploadingThumb: 'Uploading cover image: {percent}%',[m
[32m+[m[32m    submitting: 'Syncing data & extracting...',[m
[32m+[m[32m    cancel: 'Cancel',[m
[32m+[m[32m    submit: 'Publish',[m
[32m+[m[32m    submitting2: 'Submitting...',[m
[32m+[m[32m    success: '✔️ Post created successfully!',[m
[32m+[m[32m    fail: '❌ Could not publish',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      titleRequired: 'Please enter a post title.',[m
[32m+[m[32m      imageRequired: 'Please choose an image file.',[m
[32m+[m[32m      videoRequired: 'Please choose a video file.',[m
[32m+[m[32m      audioRequired: 'Please choose an audio file.',[m
[32m+[m[32m      gameRequired: 'Please choose a Game file (.zip).',[m
[32m+[m[32m      generic: 'Something went wrong while posting. Please try again.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  faceSetup: {[m
[32m+[m[32m    title: 'Activate Face ID',[m
[32m+[m[32m    subtitle: 'Scan your face to sign in faster in the future',[m
[32m+[m[32m    close: 'Close',[m
[32m+[m[32m    camError: 'Could not open camera. Please check camera permissions.',[m
[32m+[m[32m    saving: 'Saving face data...',[m
[32m+[m[32m    savedSome: '✅ {n} face(s) registered successfully!',[m
[32m+[m[32m    savedNone: '✅ Image saved! (No face detected to enroll Face ID)',[m
[32m+[m[32m    fail: 'Save failed. Please try again.',[m
[32m+[m[32m    scanning: 'Scanning face...',[m
[32m+[m[32m    progress: 'Captured {n}/{total} photos...',[m
[32m+[m[32m    tip1: '📸 The system will automatically capture {n} photos in a row',[m
[32m+[m[32m    tip2: '💡 Ensure good lighting and look straight at the camera',[m
[32m+[m[32m    tip3: '🚫 Do not cover your face or wear hats / thick glasses',[m
[32m+[m[32m    start: '📷 Start face scan',[m
[32m+[m[32m    retry: '🔄 Retry',[m
[32m+[m[32m    skip: 'Skip, do later',[m
[32m+[m[32m    done: 'Done 🎉',[m
[32m+[m[32m  },[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mexport default en;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/i18n/dictionaries/vi.js b/frontend/src/i18n/dictionaries/vi.js[m
[1mnew file mode 100644[m
[1mindex 0000000..4133ecd[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/i18n/dictionaries/vi.js[m
[36m@@ -0,0 +1,698 @@[m
[32m+[m[32m// Vietnamese dictionary — source language. Exported as the type-defining[m
[32m+[m[32m// canonical dict: en.js is hand-checked to match this shape.[m
[32m+[m[32m//[m
[32m+[m[32m// Notes on shape:[m
[32m+[m[32m//   - Every leaf is a plain string. i18next interpolates `{name}` in the[m
[32m+[m[32m//     resolved string at lookup time, so the leaves can carry placeholders[m
[32m+[m[32m//     freely.[m
[32m+[m[32m//   - Sections mirror the major UI areas (common, nav, auth, home, feed,[m
[32m+[m[32m//     knowledge, games, music, dashboard, comments, notif, profile,[m
[32m+[m[32m//     collections, bookmarks, users, logs, search). New keys go into the[m
[32m+[m[32m//     section that owns them — keeps grep-by-area reviews quick.[m
[32m+[m
[32m+[m[32mconst vi = {[m
[32m+[m[32m  common: {[m
[32m+[m[32m    appName: 'Favourite Web',[m
[32m+[m[32m    save: 'Lưu',[m
[32m+[m[32m    saved: 'Đã lưu',[m
[32m+[m[32m    cancel: 'Huỷ',[m
[32m+[m[32m    back: 'Quay lại',[m
[32m+[m[32m    backToList: '← Quay lại',[m
[32m+[m[32m    close: 'Đóng',[m
[32m+[m[32m    loading: 'Đang tải...',[m
[32m+[m[32m    noData: 'Không có dữ liệu',[m
[32m+[m[32m    search: 'Tìm kiếm',[m
[32m+[m[32m    all: 'Tất cả',[m
[32m+[m[32m    delete: 'Xóa',[m
[32m+[m[32m    edit: 'Sửa',[m
[32m+[m[32m    add: 'Thêm',[m
[32m+[m[32m    confirm: 'Xác nhận',[m
[32m+[m[32m    yes: 'Có',[m
[32m+[m[32m    no: 'Không',[m
[32m+[m[32m    apply: 'Áp dụng',[m
[32m+[m[32m    reset: 'Đặt lại',[m
[32m+[m[32m    backToFeed: '← Về Bảng tin',[m
[32m+[m[32m    backToListArrow: '← Về danh sách',[m
[32m+[m[32m    ok: 'OK',[m
[32m+[m[32m    saveNew: '+ Tạo',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  nav: {[m
[32m+[m[32m    home: 'Trang chủ',[m
[32m+[m[32m    feed: 'Bảng tin',[m
[32m+[m[32m    bookmarks: 'Đã lưu',[m
[32m+[m[32m    collections: 'Bộ sưu tập',[m
[32m+[m[32m    dashboard: 'Quét khuôn mặt',[m
[32m+[m[32m    users: 'Người dùng',[m
[32m+[m[32m    logs: 'Nhật ký',[m
[32m+[m[32m    games: 'Trò chơi',[m
[32m+[m[32m    music: 'Âm nhạc',[m
[32m+[m[32m    knowledge: 'Kiến thức',[m
[32m+[m[32m    postNew: 'Đăng bài mới',[m
[32m+[m[32m    profile: 'Hồ sơ',[m
[32m+[m[32m    signOut: 'Đăng xuất',[m
[32m+[m[32m    themeLight: 'Chuyển sang Chế độ sáng',[m
[32m+[m[32m    themeDark: 'Chuyển sang Chế độ tối',[m
[32m+[m[32m    lightShort: '☀️ Sáng',[m
[32m+[m[32m    darkShort: '🌙 Tối',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  auth: {[m
[32m+[m[32m    portal: 'Fav Web Portal',[m
[32m+[m[32m    portalShort: 'Fav Web',[m
[32m+[m[32m    tagline: 'Hệ thống nhận diện khuôn mặt & dịch vụ giải trí',[m
[32m+[m[32m    createSubtitle: 'Tạo tài khoản thành viên mới',[m
[32m+[m[32m    tabPassword: 'Mật khẩu',[m
[32m+[m[32m    tabFace: 'Khuôn mặt',[m
[32m+[m[32m    usernameOrEmail: 'Tài khoản hoặc Email',[m
[32m+[m[32m    password: 'Mật khẩu',[m
[32m+[m[32m    faceCaptureHint: 'Chụp ảnh khuôn mặt đã đăng ký để đăng nhập',[m
[32m+[m[32m    faceScanning: '🔄 Đang nhận diện... Vui lòng giữ nguyên khuôn mặt',[m
[32m+[m[32m    faceSuccess: '✔️ Nhận dạng thành công! Đang chuyển hướng...',[m
[32m+[m[32m    faceFail: '❌ Nhận dạng thất bại. Hãy thử lại dưới điều kiện đủ ánh sáng.',[m
[32m+[m[32m    submitLogin: 'Đăng nhập',[m
[32m+[m[32m    submittingLogin: 'Đang đăng nhập...',[m
[32m+[m[32m    noAccount: 'Chưa có tài khoản?',[m
[32m+[m[32m    haveAccount: 'Đã có tài khoản?',[m
[32m+[m[32m    goRegister: 'Đăng ký ngay',[m
[32m+[m[32m    goLogin: 'Đăng nhập',[m
[32m+[m[32m    regUsernameLabel: 'Tên tài khoản (Username) *',[m
[32m+[m[32m    regFullNameLabel: 'Họ và tên *',[m
[32m+[m[32m    regEmailLabel: 'Địa chỉ Email',[m
[32m+[m[32m    regPasswordLabel: 'Mật khẩu *',[m
[32m+[m[32m    regDepartmentLabel: 'Khoa / Bộ phận',[m
[32m+[m[32m    regFaceLabel: 'Ảnh chụp khuôn mặt (Không bắt buộc)',[m
[32m+[m[32m    regFaceHint: 'Không bắt buộc. Chọn ít nhất 1 ảnh rõ nét nếu muốn đăng nhập bằng khuôn mặt',[m
[32m+[m[32m    submitRegister: 'Đăng ký tài khoản',[m
[32m+[m[32m    submittingRegister: 'Đang tạo tài khoản...',[m
[32m+[m[32m    signInRequired: 'Vui lòng đăng nhập để thực hiện thao tác này.',[m
[32m+[m[32m    signInNow: 'Đăng nhập ngay',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      username: 'Nhập username hoặc email...',[m
[32m+[m[32m      password: 'Nhập mật khẩu...',[m
[32m+[m[32m      username_login: 'Nhập username đăng nhập...',[m
[32m+[m[32m      full_name: 'Nhập họ tên đầy đủ...',[m
[32m+[m[32m      email: 'Nhập email (ví dụ: name@gmail.com)...',[m
[32m+[m[32m      set_password: 'Thiết lập mật khẩu...',[m
[32m+[m[32m      department: 'Nhập khoa hoặc phòng ban...',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      fillAll: 'Vui lòng điền đầy đủ tài khoản và mật khẩu.',[m
[32m+[m[32m      passwordFail: 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.',[m
[32m+[m[32m      faceFail: 'Không nhận diện được khuôn mặt. Vui lòng thử lại.',[m
[32m+[m[32m      fillRequired: 'Vui lòng điền đầy đủ các trường bắt buộc (Username, Họ tên, Mật khẩu).',[m
[32m+[m[32m      registerFail: 'Đăng ký thất bại. Tên tài khoản hoặc email có thể đã tồn tại.',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      register: 'Đăng ký tài khoản thành công! Bạn đã có thể đăng nhập bằng tài khoản này.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  home: {[m
[32m+[m[32m    title: 'Trang chủ',[m
[32m+[m[32m    streak: 'Bạn đang có chuỗi {n} ngày liên tiếp! Hãy tiếp tục nhé.',[m
[32m+[m[32m    daysLabel: 'ngày',[m
[32m+[m[32m    daysActivity: 'Hoạt động {days} ngày gần nhất',[m
[32m+[m[32m    statArticles: 'Bài viết đã đọc',[m
[32m+[m[32m    statSongs: 'Bài hát đã nghe',[m
[32m+[m[32m    statGames: 'Trò chơi đã xem',[m
[32m+[m[32m    statPosts: 'Bài đăng đã thích',[m
[32m+[m[32m    chartEmpty: 'Chưa có dữ liệu',[m
[32m+[m[32m    recentlyRead: 'Bạn đã đọc gần đây',[m
[32m+[m[32m    recentActivity: 'Hoạt động gần đây',[m
[32m+[m[32m    topCategories: 'Chủ đề bạn quan tâm',[m
[32m+[m[32m    noRecentArticles: 'Chưa có bài viết nào. Hãy mở ',[m
[32m+[m[32m    noRecentArticlesAfter: ' để bắt đầu.',[m
[32m+[m[32m    noActivity: 'Chưa có hoạt động nào.',[m
[32m+[m[32m    whereToStart: 'Bắt đầu từ đâu?',[m
[32m+[m[32m    quickRead: 'Đọc bài',[m
[32m+[m[32m    quickListen: 'Nghe nhạc',[m
[32m+[m[32m    quickPlay: 'Chơi game',[m
[32m+[m[32m    quickFeed: 'Xem bảng tin',[m
[32m+[m[32m    exportCsv: 'Tải file CSV',[m
[32m+[m[32m    exportJson: 'Tải file JSON',[m
[32m+[m[32m    loadFail: 'Không tải được dữ liệu. Vui lòng thử lại.',[m
[32m+[m[32m    event: {[m
[32m+[m[32m      view: 'Bạn đã đọc · {time}',[m
[32m+[m[32m      play: 'Bạn đã nghe · {time}',[m
[32m+[m[32m      like: 'Bạn đã thích · {time}',[m
[32m+[m[32m      unknown: 'Bạn {action} · {time}',[m
[32m+[m[32m    },[m
[32m+[m[32m    legend: {[m
[32m+[m[32m      knowledge: 'Bài viết',[m
[32m+[m[32m      music: 'Nhạc',[m
[32m+[m[32m      game: 'Game',[m
[32m+[m[32m    },[m
[32m+[m[32m    typeLabel: {[m
[32m+[m[32m      knowledge: 'bài viết',[m
[32m+[m[32m      music: 'bài hát',[m
[32m+[m[32m      game: 'trò chơi',[m
[32m+[m[32m      post: 'bài đăng',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  feed: {[m
[32m+[m[32m    title: 'Feed Mới Nhất',[m
[32m+[m[32m    knowledgeSection: 'Chia Sẻ Kiến Thức Nổi Bật',[m
[32m+[m[32m    gameBlogSection: 'Blog Game & Tin Tức',[m
[32m+[m[32m    userStatsSection: 'Thống Kê Người Dùng',[m
[32m+[m[32m    friendsActivity: '👥 Hoạt động bạn bè',[m
[32m+[m[32m    allCategory: 'Tất Cả',[m
[32m+[m[32m    noPosts: 'Chưa có hoạt động nào được đăng.',[m
[32m+[m[32m    noKnowledge: 'Không có bài viết kiến thức nào.',[m
[32m+[m[32m    noGames: 'Không có bài viết game.',[m
[32m+[m[32m    noFriends: 'Bạn chưa theo dõi ai, hoặc bạn bè chưa có hoạt động nào gần đây.',[m
[32m+[m[32m    playOnline: 'Chơi trực tuyến',[m
[32m+[m[32m    comment: 'Bình luận',[m
[32m+[m[32m    unsave: 'Bỏ lưu',[m
[32m+[m[32m    savePost: 'Lưu bài đăng',[m
[32m+[m[32m    save: '⚪ Lưu',[m
[32m+[m[32m    readMore: 'Đọc Thêm →',[m
[32m+[m[32m    like: '❤️ Thích',[m
[32m+[m[32m    read: '📖 Đọc',[m
[32m+[m[32m    modalCategory: 'Chủ đề',[m
[32m+[m[32m    modalAuthor: 'Tác giả',[m
[32m+[m[32m    modalType: 'Loại',[m
[32m+[m[32m    modalGenre: 'Thể loại',[m
[32m+[m[32m    viewsLabel: 'lượt xem',[m
[32m+[m[32m    likesLabel: 'lượt thích',[m
[32m+[m[32m    modalLikeArticle: 'Thích bài viết',[m
[32m+[m[32m    modalClose: 'Đóng',[m
[32m+[m[32m    untrustedGame: 'Không thể mở game từ nguồn không đáng tin cậy',[m
[32m+[m[32m    statName: 'Tên',[m
[32m+[m[32m    statPhotos: 'Số ảnh',[m
[32m+[m[32m    statTopSongs: 'Top 5 Nhạc',[m
[32m+[m[32m    checkinTab: 'Check-in',[m
[32m+[m[32m    legend: {[m
[32m+[m[32m      success: 'Thành công',[m
[32m+[m[32m      failed: 'Thất bại',[m
[32m+[m[32m      plays: 'Lượt nghe',[m
[32m+[m[32m      likes: 'Thích',[m
[32m+[m[32m    },[m
[32m+[m[32m    friendAction: {[m
[32m+[m[32m      viewKnowledge: 'đã đọc',[m
[32m+[m[32m      likeKnowledge: 'đã thích',[m
[32m+[m[32m      playMusic: 'đã nghe',[m
[32m+[m[32m      likeMusic: 'đã thích',[m
[32m+[m[32m      viewGame: 'đã xem',[m
[32m+[m[32m      likeGame: 'đã thích',[m
[32m+[m[32m      likePost: 'đã thích',[m
[32m+[m[32m      viewPost: 'đã xem',[m
[32m+[m[32m    },[m
[32m+[m[32m    scanLog: {[m
[32m+[m[32m      ready: 'Thiết bị sẵn sàng',[m
[32m+[m[32m      scanning: '⏳ Đang quét...',[m
[32m+[m[32m      success: '✅ Thành công: {name}',[m
[32m+[m[32m      error: '❌ Không nhận diện được',[m
[32m+[m[32m    },[m
[32m+[m[32m    notRecognized: 'Không nhận diện được khuôn mặt.',[m
[32m+[m[32m    loadFail: 'Không thể tải dữ liệu Dashboard. Vui lòng đăng nhập lại.',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  knowledge: {[m
[32m+[m[32m    heading: 'Chia Sẻ Kiến Thức Học Tập & Làm Việc',[m
[32m+[m[32m    subtitle: 'Cộng đồng chia sẻ kiến thức, kỹ năng và kinh nghiệm',[m
[32m+[m[32m    writeNew: '✍️ Viết Bài Mới',[m
[32m+[m[32m    saveDraft: '📝 Lưu nháp',[m
[32m+[m[32m    schedule: '⏰ Hẹn giờ',[m
[32m+[m[32m    allArticles: '📚 Tất Cả Bài Viết',[m
[32m+[m[32m    myArticles: '👤 Bài viết của tôi',[m
[32m+[m[32m    clearFilter: 'Xóa lọc',[m
[32m+[m[32m    tagLabel: 'Tag:',[m
[32m+[m[32m    clearTag: 'Xóa tag',[m
[32m+[m[32m    loading: 'Đang tải bài viết...',[m
[32m+[m[32m    noArticles: 'Không có bài viết nào trong danh mục này',[m
[32m+[m[32m    draft: '📝 Nháp',[m
[32m+[m[32m    scheduled: '⏰ Đã hẹn giờ',[m
[32m+[m[32m    readMore: 'Đọc Thêm',[m
[32m+[m[32m    like: '❤️ Thích',[m
[32m+[m[32m    relatedVideos: '📺 Video liên quan',[m
[32m+[m[32m    loadingVideos: 'Đang tìm video trên YouTube…',[m
[32m+[m[32m    noVideos: 'Không tìm thấy video liên quan. (Có thể do chưa cấu hình YOUTUBE_API_KEY.)',[m
[32m+[m[32m    draftModal: '📝 Lưu bản nháp',[m
[32m+[m[32m    scheduledModal: '⏰ Hẹn giờ đăng bài',[m
[32m+[m[32m    newPostModal: '✍️ Đăng bài mới',[m
[32m+[m[32m    titleLabel: 'Tiêu đề',[m
[32m+[m[32m    categoryLabel: 'Thể loại',[m
[32m+[m[32m    shortDescLabel: 'Mô tả ngắn',[m
[32m+[m[32m    contentLabel: 'Nội dung',[m
[32m+[m[32m    tagsLabel: 'Tags (phân cách bằng dấu phẩy)',[m
[32m+[m[32m    scheduledAtLabel: 'Thời điểm đăng',[m
[32m+[m[32m    saving: 'Đang lưu...',[m
[32m+[m[32m    draftBtn: '📝 Lưu nháp',[m
[32m+[m[32m    scheduleBtn: '⏰ Hẹn giờ',[m
[32m+[m[32m    publishNow: '🚀 Đăng ngay',[m
[32m+[m[32m    filterByTag: 'Lọc theo #{tag}',[m
[32m+[m[32m    altIcon: 'Knowledge Icon',[m
[32m+[m[32m    draftCreated: 'Lưu nháp thành công',[m
[32m+[m[32m    scheduledCreated: 'Đã hẹn giờ thành công',[m
[32m+[m[32m    cancelCreate: 'Huỷ',[m
[32m+[m[32m    categories: {[m
[32m+[m[32m      'Lập Trình': 'Lập Trình',[m
[32m+[m[32m      'Kỹ Năng': 'Kỹ Năng',[m
[32m+[m[32m      'Thiết Kế': 'Thiết Kế',[m
[32m+[m[32m      'Kinh Doanh': 'Kinh Doanh',[m
[32m+[m[32m      'Phát Triển': 'Phát Triển',[m
[32m+[m[32m      'Tài Chính': 'Tài Chính',[m
[32m+[m[32m    },[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      title: 'Ví dụ: Học React Hooks nâng cao',[m
[32m+[m[32m      category: 'Ví dụ: Lập Trình',[m
[32m+[m[32m      tags: 'react, frontend, hooks',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được bài viết',[m
[32m+[m[32m      titleRequired: 'Tiêu đề và thể loại là bắt buộc.',[m
[32m+[m[32m      scheduledRequired: 'Vui lòng chọn thời điểm đăng.',[m
[32m+[m[32m      create: 'Không thể tạo bài viết.',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      created: '✔️ Tạo bài viết thành công!',[m
[32m+[m[32m    },[m
[32m+[m[32m    fail: {[m
[32m+[m[32m      created: '❌ Không thể tạo bài viết',[m
[32m+[m[32m    },[m
[32m+[m[32m    bookmark: 'Lưu bài viết',[m
[32m+[m[32m    unbookmark: 'Bỏ lưu',[m
[32m+[m[32m    close: 'Đóng',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  games: {[m
[32m+[m[32m    heading: 'Tin Tức & Blog Game',[m
[32m+[m[32m    subtitle: 'Cập nhật những bài viết, hướng dẫn và mẹo chơi game mới nhất',[m
[32m+[m[32m    blogTopics: '📰 CHỦ ĐỀ BLOG',[m
[32m+[m[32m    allArticles: '📚 Tất Cả Bài Viết',[m
[32m+[m[32m    loading: 'Đang tải danh sách bài viết...',[m
[32m+[m[32m    noPosts: 'Không có bài viết nào',[m
[32m+[m[32m    viewsLabel: 'lượt xem',[m
[32m+[m[32m    likesShort: 'thích',[m
[32m+[m[32m    read: '📖 Đ�ọc bài',[m
[32m+[m[32m    like: '❤️ Thích',[m
[32m+[m[32m    likeArticle: 'Thích bài viết',[m
[32m+[m[32m    close: 'Đóng',[m
[32m+[m[32m    categoryLabel: 'Thể loại:',[m
[32m+[m[32m    categoryPrefix: 'Thể loại: ',[m
[32m+[m[32m    sidebarCategoryLabel: 'Thể loại bài viết:',[m
[32m+[m[32m    sidebarTotalLabel: 'Tổng số bài viết:',[m
[32m+[m[32m    altIcon: 'Games Icon',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được danh sách game',[m
[32m+[m[32m    },[m
[32m+[m[32m    bookmark: 'Lưu bài viết',[m
[32m+[m[32m    unbookmark: 'Bỏ lưu',[m
[32m+[m[32m    likesLabel: 'lượt thích',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  music: {[m
[32m+[m[32m    heading: 'Âm Nhạc Trực Tuyến',[m
[32m+[m[32m    subtitle: 'Thưởng thức và thư giãn cùng các bài hát bản quyền đỉnh cao',[m
[32m+[m[32m    libraryHeading: '🎵 THƯ VIỆN ÂM NHẠC',[m
[32m+[m[32m    sidebar: {[m
[32m+[m[32m      all: 'Tất Cả',[m
[32m+[m[32m      library: 'Thư Viện',[m
[32m+[m[32m      playlist: 'Danh Sách Phát',[m
[32m+[m[32m      favorite: 'Yêu Thích',[m
[32m+[m[32m      recent: 'Gần Đây',[m
[32m+[m[32m      songs: 'Bài Hát:',[m
[32m+[m[32m      playlists: 'Danh Sách:',[m
[32m+[m[32m      duration: 'Thời Gian:',[m
[32m+[m[32m    },[m
[32m+[m[32m    loading: 'Đang tải âm nhạc...',[m
[32m+[m[32m    noSongData: 'Không có dữ liệu bài hát',[m
[32m+[m[32m    createPlaylist: '➕ Tạo Playlist',[m
[32m+[m[32m    addMusic: '➕ Thêm Nhạc',[m
[32m+[m[32m    backToPlaylists: '⬅️ Quay lại danh sách phát',[m
[32m+[m[32m    playlistBadge: 'DANH SÁCH PHÁT',[m
[32m+[m[32m    songLabel: 'bài hát',[m
[32m+[m[32m    deletePlaylist: '🗑️ Xóa Playlist',[m
[32m+[m[32m    songList: 'Danh sách bài hát',[m
[32m+[m[32m    playsLabel: 'lượt nghe',[m
[32m+[m[32m    playlistEmpty: 'Danh sách phát này trống. Quay lại tab "Tất Cả" để thêm bài hát.',[m
[32m+[m[32m    emptyPlaylistsJoin: '{empty} {cta}',[m
[32m+[m[32m    myPlaylists: '📻 Danh Sách Phát Của Tôi',[m
[32m+[m[32m    noPlaylists: 'Chưa có danh sách phát nào.',[m
[32m+[m[32m    noPlaylistsCTA: 'Bấm "Tạo Playlist" để bắt tay!',[m
[32m+[m[32m    noPlaylistsAnonymous: 'Vui lòng đăng nhập để tạo mới.',[m
[32m+[m[32m    viewAll: 'Xem tất cả',[m
[32m+[m[32m    newReleases: '🎵 Nhạc Mới Phát Hành',[m
[32m+[m[32m    songs: 'Bài Hát',[m
[32m+[m[32m    popoverTitle: 'Thêm vào playlist',[m
[32m+[m[32m    popoverEmpty: 'Chưa có playlist nào',[m
[32m+[m[32m    play: 'Play',[m
[32m+[m[32m    like: 'Like',[m
[32m+[m[32m    prev: 'Previous',[m
[32m+[m[32m    next: 'Next',[m
[32m+[m[32m    removeFromPlaylist: 'Xóa khỏi danh sách phát',[m
[32m+[m[32m    deleteSong: 'Xóa bài hát',[m
[32m+[m[32m    addToPlaylist: 'Thêm vào danh sách phát',[m
[32m+[m[32m    bookmark: 'Lưu bài hát',[m
[32m+[m[32m    unbookmark: 'Bỏ lưu',[m
[32m+[m[32m    uploadHeading: 'Thêm Nhạc Vào Thư Viện',[m
[32m+[m[32m    songTitleLabel: 'Tên bài hát',[m
[32m+[m[32m    artistLabel: 'Ca sĩ (Tác giả)',[m
[32m+[m[32m    genreLabel: 'Thể loại',[m
[32m+[m[32m    genreUnknown: 'Chưa xác định (Update later)',[m
[32m+[m[32m    durationLabel: 'Thời lượng (Được tính tự động)',[m
[32m+[m[32m    fileLabel: 'Tệp âm thanh (.mp3, .wav)',[m
[32m+[m[32m    uploading: 'Đang tải lên...',[m
[32m+[m[32m    processing: 'Đang xử lý...',[m
[32m+[m[32m    uploadAndSave: 'Tải lên & Lưu',[m
[32m+[m[32m    createPlaylistHeading: 'Tạo Danh Sách Phát Mới',[m
[32m+[m[32m    playlistNameLabel: 'Tên danh sách phát',[m
[32m+[m[32m    playlistDescLabel: 'Mô tả',[m
[32m+[m[32m    playlistIconLabel: 'Biểu tượng đại diện (Emoji)',[m
[32m+[m[32m    createNew: 'Tạo mới',[m
[32m+[m[32m    altIcon: 'Music Icon',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      songTitle: 'Nhập tên bài hát...',[m
[32m+[m[32m      artist: 'Nhập tên ca sĩ (Mặc định: Update later)...',[m
[32m+[m[32m      playlistName: 'Ví dụ: Nhạc Học Tập, Chill Vibes...',[m
[32m+[m[32m      playlistDesc: 'Mô tả ngắn gọn về danh sách phát...',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được dữ liệu âm nhạc',[m
[32m+[m[32m      deleteSong: 'Không thể xóa bài hát',[m
[32m+[m[32m      deletePlaylist: 'Không thể xóa danh sách phát',[m
[32m+[m[32m      playlistNameRequired: 'Vui lòng nhập tên danh sách phát!',[m
[32m+[m[32m      createPlaylist: 'Không thể tạo danh sách phát',[m
[32m+[m[32m      addSongToPlaylist: 'Không thể thêm bài hát vào danh sách phát',[m
[32m+[m[32m      removeSongFromPlaylist: 'Không thể xóa bài hát khỏi danh sách phát',[m
[32m+[m[32m      fileRequired: 'Vui lòng chọn tệp nhạc!',[m
[32m+[m[32m      titleRequired: 'Vui lòng điền tên bài hát!',[m
[32m+[m[32m      noUrl: 'Không nhận được URL tệp tin sau khi upload',[m
[32m+[m[32m      upload: 'Quá trình upload hoặc thêm nhạc thất bại',[m
[32m+[m[32m    },[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      deletePlaylist: 'Đã xóa danh sách phát thành công!',[m
[32m+[m[32m      createPlaylist: 'Đã tạo danh sách phát thành công!',[m
[32m+[m[32m      addSongToPlaylist: 'Đã thêm bài hát vào danh sách phát!',[m
[32m+[m[32m      removeSongFromPlaylist: 'Đã xóa bài hát khỏi danh sách phát thành công!',[m
[32m+[m[32m      upload: 'Đã thêm bài hát vào thư viện thành công!',[m
[32m+[m[32m    },[m
[32m+[m[32m    confirm: {[m
[32m+[m[32m      deleteSong: 'Bạn có chắc chắn muốn xóa bài hát này khỏi thư viện?',[m
[32m+[m[32m      deletePlaylist: 'Bạn có chắc chắn muốn xóa danh sách phát này?',[m
[32m+[m[32m      removeSongFromPlaylist: 'Bạn có chắc chắn muốn xóa bài hát này khỏi danh sách phát?',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  dashboard: {[m
[32m+[m[32m    title: 'Quét Khuôn Mặt',[m
[32m+[m[32m    subtitle: 'Auto scan mỗi 5 phút hoặc chụp thủ công khi cần.',[m
[32m+[m[32m    autoScanOn: 'Tắt auto scan',[m
[32m+[m[32m    autoScanOff: 'Bật auto scan',[m
[32m+[m[32m    capturedImage: 'Ảnh đã chụp',[m
[32m+[m[32m    idle: 'Chưa có kết quả',[m
[32m+[m[32m    processing: 'Đang xử lý ảnh...',[m
[32m+[m[32m    unrecognized: 'Không nhận diện được. Vui lòng thử lại.',[m
[32m+[m[32m    captureBtn: 'Chụp & Nhận Diện',[m
[32m+[m[32m    resultIdle: 'Chưa có kết quả',[m
[32m+[m[32m    resultLoading: 'Đang xử lý ảnh...',[m
[32m+[m[32m    resultScanning: 'Đang xử lý ảnh...',[m
[32m+[m[32m    resultSuccess: '✔️ Nhận diện thành công',[m
[32m+[m[32m    resultError: 'Không nhận diện được khuôn mặt',[m
[32m+[m[32m    altPreview: 'capture preview',[m
[32m+[m[32m    altFaceTitle: 'Quét Khuôn Mặt',[m
[32m+[m[32m    hudVersion: 'FACE_ID v2.0',[m
[32m+[m[32m    hudLock: 'LOCK:',[m
[32m+[m[32m    hudOK: 'OK',[m
[32m+[m[32m    hudSearching: 'SEARCHING',[m
[32m+[m[32m    hudScanning: 'Scanning...',[m
[32m+[m[32m    hudVerified: 'Verified',[m
[32m+[m[32m    hudDenied: 'Access Denied',[m
[32m+[m[32m    hudActive: 'Sys Active',[m
[32m+[m[32m    hudIdle: 'Idle',[m
[32m+[m[32m    cameraError: 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập.',[m
[32m+[m[32m    banner: {[m
[32m+[m[32m      inactive: 'Bạn chưa kích hoạt Face ID.',[m
[32m+[m[32m      cta: 'Đăng ký khuôn mặt để đăng nhập nhanh hơn bằng camera.',[m
[32m+[m[32m      activate: 'Kích hoạt Face ID ngay',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  comments: {[m
[32m+[m[32m    title: '💬 Bình luận',[m
[32m+[m[32m    replyTo: 'Đang trả lời',[m
[32m+[m[32m    send: 'Gửi',[m
[32m+[m[32m    replying: 'Trả lời',[m
[32m+[m[32m    saving: 'Đang lưu...',[m
[32m+[m[32m    save: 'Lưu',[m
[32m+[m[32m    cancelEdit: 'Hủy',[m
[32m+[m[32m    edit: 'Sửa',[m
[32m+[m[32m    delete: 'Xóa',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      write: 'Viết bình luận...',[m
[32m+[m[32m      reply: 'Trả lời @{name}...',[m
[32m+[m[32m    },[m
[32m+[m[32m    cancelReply: 'Hủy trả lời',[m
[32m+[m[32m    sending: 'Đang gửi...',[m
[32m+[m[32m    loading: 'Đang tải bình luận...',[m
[32m+[m[32m    empty: 'Chưa có bình luận nào. Hãy là người đầu tiên!',[m
[32m+[m[32m    reaction: {[m
[32m+[m[32m      like: 'Thích',[m
[32m+[m[32m      love: 'Yêu thích',[m
[32m+[m[32m      fire: 'Tuyệt vời',[m
[32m+[m[32m      laugh: 'Haha',[m
[32m+[m[32m      wow: 'Wow',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được bình luận',[m
[32m+[m[32m      send: 'Không gửi được bình luận. Vui lòng thử lại.',[m
[32m+[m[32m      delete: 'Không xóa được bình luận.',[m
[32m+[m[32m      reaction: 'Không lưu được reaction.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  notif: {[m
[32m+[m[32m    title: 'Thông báo',[m
[32m+[m[32m    ariaBell: 'Thông báo',[m
[32m+[m[32m    unread: 'Chưa đọc',[m
[32m+[m[32m    markAllRead: 'Đánh dấu tất cả đã đọc',[m
[32m+[m[32m    allTab: 'Tất cả',[m
[32m+[m[32m    unreadTab: 'Chưa đọc',[m
[32m+[m[32m    loading: 'Đang tải...',[m
[32m+[m[32m    empty: '🔔 Bạn chưa có thông báo nào.',[m
[32m+[m[32m    emptyUnread: '🔔 Không có thông báo chưa đọc.',[m
[32m+[m[32m    unreadDot: 'Chưa đọc',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được thông báo.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  profile: {[m
[32m+[m[32m    loading: 'Đang tải hồ sơ...',[m
[32m+[m[32m    back: '← Quay lại',[m
[32m+[m[32m    joinDate: 'Tham gia',[m
[32m+[m[32m    followersCount: 'người theo dõi',[m
[32m+[m[32m    followingCount: 'đang theo dõi',[m
[32m+[m[32m    follow: 'Theo dõi',[m
[32m+[m[32m    following: 'Đang theo dõi',[m
[32m+[m[32m    tabFollowers: 'Người theo dõi',[m
[32m+[m[32m    tabFollowing: 'Đang theo dõi',[m
[32m+[m[32m    loadingNetwork: 'Đang tải...',[m
[32m+[m[32m    emptyFollowers: 'Chưa có người theo dõi.',[m
[32m+[m[32m    emptyFollowing: 'Chưa theo dõi ai.',[m
[32m+[m[32m    selfHint: 'Đây là hồ sơ của bạn.',[m
[32m+[m[32m    statsArticles: 'Bài viết đã đăng',[m
[32m+[m[32m    statsLikes: 'Lượt thích nhận',[m
[32m+[m[32m    statsPosts: 'Bài đăng Feed',[m
[32m+[m[32m    statsComments: 'Bình luận',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      notFound: 'Người dùng không tồn tại.',[m
[32m+[m[32m      load: 'Không thể tải hồ sơ.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  collections: {[m
[32m+[m[32m    myCollectionsTitle: '📂 Bộ sưu tập của tôi',[m
[32m+[m[32m    subtitle: 'Gom các bài viết Knowledge vào nhóm để đọc lại sau.',[m
[32m+[m[32m    addButton: 'Tạo bộ sưu tập mới',[m
[32m+[m[32m    addToCollection: 'Thêm vào bộ sưu tập',[m
[32m+[m[32m    removeFromCollection: 'Xoá khỏi bộ sưu tập',[m
[32m+[m[32m    delete: 'Xóa bộ sưu tập',[m
[32m+[m[32m    articleCount: 'bài viết',[m
[32m+[m[32m    empty: 'Bạn chưa có bộ sưu tập nào',[m
[32m+[m[32m    emptyHint: 'Tạo bộ sưu tập đầu tiên rồi mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập".',[m
[32m+[m[32m    saving: 'Đang lưu...',[m
[32m+[m[32m    loading: 'Đang tải...',[m
[32m+[m[32m    saving2: 'Đang tạo...',[m
[32m+[m[32m    edit: 'Sửa',[m
[32m+[m[32m    save: 'Lưu',[m
[32m+[m[32m    cancel: 'Huỷ',[m
[32m+[m[32m    create: 'Tạo',[m
[32m+[m[32m    added: '✓ Đã thêm',[m
[32m+[m[32m    pickEmpty: 'Bạn chưa có bộ sưu tập nào. Hãy vào "Bộ sưu tập của tôi" để tạo.',[m
[32m+[m[32m    articleShort: 'Bài viết',[m
[32m+[m[32m    emptyDetail: 'Bộ sưu tập trống',[m
[32m+[m[32m    emptyDetailHint: 'Mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập" → chọn "{name}".',[m
[32m+[m[32m    back: '← Quay lại',[m
[32m+[m[32m    backToList: '← Về danh sách',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không thể tải danh sách bộ sưu tập.',[m
[32m+[m[32m      create: 'Không thể tạo. Tên tối đa 255 ký tự và không được rỗng.',[m
[32m+[m[32m      notFound: 'Bộ sưu tập không tồn tại.',[m
[32m+[m[32m      loadDetail: 'Không tải được bộ sưu tập.',[m
[32m+[m[32m    },[m
[32m+[m[32m    confirm: {[m
[32m+[m[32m      delete: 'Xóa bộ sưu tập này?',[m
[32m+[m[32m    },[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      name: 'Tên bộ sưu tập (bắt buộc)',[m
[32m+[m[32m      desc: 'Mô tả (tuỳ chọn)',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  bookmarks: {[m
[32m+[m[32m    title: '🔖 Đã lưu',[m
[32m+[m[32m    subtitle: 'Những bài viết và bài đăng bạn đã lưu để xem lại sau.',[m
[32m+[m[32m    all: 'Tất cả',[m
[32m+[m[32m    knowledge: 'Bài viết',[m
[32m+[m[32m    post: 'Bài đăng',[m
[32m+[m[32m    music: 'Bài hát',[m
[32m+[m[32m    game: 'Trò chơi',[m
[32m+[m[32m    loading: 'Đang tải...',[m
[32m+[m[32m    empty: 'Bạn chưa lưu nội dung nào',[m
[32m+[m[32m    emptyHint: 'Nhấn 🔖 trên bài viết Knowledge hoặc trên bài đăng trong Bảng tin để lưu lại xem sau.',[m
[32m+[m[32m    cta: 'Đi tới Bảng tin →',[m
[32m+[m[32m    unsave: 'Bỏ lưu',[m
[32m+[m[32m    save: 'Lưu',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không thể tải danh sách đã lưu.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  users: {[m
[32m+[m[32m    title: 'Quản lý Người dùng',[m
[32m+[m[32m    enrollBtn: 'Đăng ký tài khoản mới',[m
[32m+[m[32m    photoLabel: 'Ảnh đăng ký khuôn mặt (Tùy chọn - Dùng cho Face ID):',[m
[32m+[m[32m    loading: 'Đang tải dữ liệu...',[m
[32m+[m[32m    nameCol: 'Tên',[m
[32m+[m[32m    photoCount: 'Số ảnh',[m
[32m+[m[32m    createdAt: 'Ngày tạo',[m
[32m+[m[32m    noUsers: 'Không có người dùng nào.',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      username: 'Username (Mã nhân viên / sinh viên)',[m
[32m+[m[32m      full_name: 'Tên đầy đủ',[m
[32m+[m[32m      email: 'Địa chỉ Email',[m
[32m+[m[32m      password: 'Mật khẩu đăng nhập',[m
[32m+[m[32m      department: 'Khoa / Bộ phận',[m
[32m+[m[32m    },[m
[32m+[m[32m    err: {[m
[32m+[m[32m      load: 'Không tải được danh sách người dùng.',[m
[32m+[m[32m    },[m
[32m+[m[32m    enrolling: 'Đang đăng ký người dùng...',[m
[32m+[m[32m    ok: {[m
[32m+[m[32m      enrolled: 'Đăng ký thành công',[m
[32m+[m[32m    },[m
[32m+[m[32m    fail: {[m
[32m+[m[32m      enrolled: 'Đăng ký thất bại.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  logs: {[m
[32m+[m[32m    title: 'Logs / History',[m
[32m+[m[32m    loading: 'Đang tải lịch sử...',[m
[32m+[m[32m    logId: 'Log ID',[m
[32m+[m[32m    userId: 'User ID',[m
[32m+[m[32m    name: 'Tên',[m
[32m+[m[32m    status: 'Trạng thái',[m
[32m+[m[32m    time: 'Thời gian',[m
[32m+[m[32m    photo: 'Ảnh',[m
[32m+[m[32m    view: 'Xem',[m
[32m+[m[32m    none: 'Không có',[m
[32m+[m[32m    empty: 'Không có lịch sử quét nào.',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  search: {[m
[32m+[m[32m    label: 'Tìm kiếm',[m
[32m+[m[32m    clear: 'Xóa',[m
[32m+[m[32m    recent: 'Tìm gần đây',[m
[32m+[m[32m    clearHistory: 'Xóa lịch sử',[m
[32m+[m[32m    searching: 'Đang tìm...',[m
[32m+[m[32m    typeArticle: 'Bài viết',[m
[32m+[m[32m    typeSong: 'Bài hát',[m
[32m+[m[32m    typeGame: 'Trò chơi',[m
[32m+[m[32m    typeUser: 'Người dùng',[m
[32m+[m[32m    minHint: 'Gõ ít nhất {n} ký tự để tìm kiếm.',[m
[32m+[m[32m    ph: {[m
[32m+[m[32m      placeholder: 'Tìm kiếm bài viết, nhạc, game...',[m
[32m+[m[32m    },[m
[32m+[m[32m    noResults: 'Không tìm thấy kết quả cho "{q}"',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  time: {[m
[32m+[m[32m    justNow: 'vừa xong',[m
[32m+[m[32m    minutesAgo: '{n} phút trước',[m
[32m+[m[32m    hoursAgo: '{n} giờ trước',[m
[32m+[m[32m    daysAgo: '{n} ngày trước',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  status: {[m
[32m+[m[32m    success: 'Thành công',[m
[32m+[m[32m    failed: 'Thất bại',[m
[32m+[m[32m    admin: 'Admin',[m
[32m+[m[32m    administrator: 'Quản trị viên',[m
[32m+[m[32m    idle: 'Idle',[m
[32m+[m[32m    loading: 'Loading',[m
[32m+[m[32m    scanning: 'Scanning',[m
[32m+[m[32m    error: 'Error',[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  post: {[m
[32m+[m[32m    modalTitle: '➕ Tạo bài đăng mới',[m
[32m+[m[32m    typeText: '📝 Bài viết',[m
[32m+[m[32m    typeImage: '📸 Ảnh',[m
[32m+[m[32m    typeVideo: '🎥 Video',[m
[32m+[m[32m    typeAudio: 'Nhạc',[m
[32m+[m[32m    typeGame: 'Game',[m
[32m+[m[32m    titleLabel: 'Tiêu đề bài đăng *',[m
[32m+[m[32m    titlePh: 'Nhập tiêu đề hấp dẫn...',[m
[32m+[m[32m    textContent: 'Nội dung bài viết',[m
[32m+[m[32m    descContent: 'Mô tả / Caption',[m
[32m+[m[32m    contentPh: 'Nội dung chi tiết...',[m
[32m+[m[32m    coverImage: 'Ảnh bìa / Cover Image (Tùy chọn)',[m
[32m+[m[32m    fileImage: 'Chọn tệp ảnh (JPG, PNG, GIF) *',[m
[32m+[m[32m    fileVideo: 'Chọn tệp video (MP4) *',[m
[32m+[m[32m    fileAudio: 'Chọn tệp âm thanh (MP3, WAV) *',[m
[32m+[m[32m    fileGame: 'Chọn tệp lưu trữ Game (.zip) *',[m
[32m+[m[32m    fileDefault: 'Tệp đính kèm',[m
[32m+[m[32m    uploading: 'Đang tải tệp chính lên: {percent}%',[m
[32m+[m[32m    uploadingThumb: 'Đang tải ảnh bìa lên: {percent}%',[m
[32m+[m[32m    submitting: 'Đang đồng bộ hóa dữ liệu & giải nén...',[m
[32m+[m[32m    cancel: 'Hủy',[m
[32m+[m[32m    submit: 'Đăng bài',[m
[32m+[m[32m    submitting2: 'Đang xử lý...',[m
[32m+[m[32m    success: '✔️ Đăng bài viết thành công!',[m
[32m+[m[32m    fail: '❌ Không thể đăng bài',[m
[32m+[m[32m    err: {[m
[32m+[m[32m      titleRequired: 'Vui lòng nhập tiêu đề bài đăng.',[m
[32m+[m[32m      imageRequired: 'Vui lòng chọn một tệp hình ảnh.',[m
[32m+[m[32m      videoRequired: 'Vui lòng chọn một tệp video.',[m
[32m+[m[32m      audioRequired: 'Vui lòng chọn một tệp âm thanh.',[m
[32m+[m[32m      gameRequired: 'Vui lòng chọn tệp Game (.zip).',[m
[32m+[m[32m      generic: 'Đã xảy ra lỗi trong quá trình đăng bài. Vui lòng thử lại.',[m
[32m+[m[32m    },[m
[32m+[m[32m  },[m
[32m+[m
[32m+[m[32m  faceSetup: {[m
[32m+[m[32m    title: 'Kích hoạt Face ID',[m
[32m+[m[32m    subtitle: 'Quét khuôn mặt để đăng nhập nhanh trong tương lai',[m
[32m+[m[32m    close: 'Đóng',[m
[32m+[m[32m    camError: 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.',[m
[32m+[m[32m    saving: 'Đang lưu dữ liệu khuôn mặt...',[m
[32m+[m[32m    savedSome: '✅ Đã đăng ký {n} khuôn mặt thành công!',[m
[32m+[m[32m    savedNone: '✅ Ảnh đã lưu! (Không phát hiện khuôn mặt để tạo Face ID)',[m
[32m+[m[32m    fail: 'Lưu thất bại. Vui lòng thử lại.',[m
[32m+[m[32m    scanning: 'Đang quét khuôn mặt...',[m
[32m+[m[32m    progress: 'Đã chụp {n}/{total} ảnh...',[m
[32m+[m[32m    tip1: '📸 Hệ thống sẽ tự động chụp {n} ảnh liên tiếp',[m
[32m+[m[32m    tip2: '💡 Đảm bảo đủ ánh sáng, nhìn thẳng vào camera',[m
[32m+[m[32m    tip3: '🚫 Không che mặt hoặc đội mũ / kính quá dày',[m
[32m+[m[32m    start: '📷 Bắt đầu quét khuôn mặt',[m
[32m+[m[32m    retry: '🔄 Thử lại',[m
[32m+[m[32m    skip: 'Bỏ qua, làm sau',[m
[32m+[m[32m    done: 'Hoàn tất 🎉',[m
[32m+[m[32m  },[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mexport default vi;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/i18n/index.js b/frontend/src/i18n/index.js[m
[1mnew file mode 100644[m
[1mindex 0000000..e39dba6[m
[1m--- /dev/null[m
[1m+++ b/frontend/src/i18n/index.js[m
[36m@@ -0,0 +1,48 @@[m
[32m+[m[32m// i18n bootstrap. Two locales are shipped: Vietnamese (default,[m
[32m+[m[32m// project home audience) and English. New locales can be added by[m
[32m+[m[32m// dropping another dictionary file into ./dictionaries and registering[m
[32m+[m[32m// it in the `resources` block below — no consumer code needs to change.[m
[32m+[m[32m//[m
[32m+[m[32m// The content lives in ./dictionaries/{vi,en}.js as nested objects[m
[32m+[m[32m// that mirror each other. Translation keys are dotted paths like[m
[32m+[m[32m// `home.streak` — read with `t('home.streak', { n: 5 })`. The plain[m
[32m+[m[32m// `t(key)` form (without a defaultValue) is the convention; we type[m
[32m+[m[32m// the dictionary elsewhere so a missing key is a build-time error.[m
[32m+[m
[32m+[m[32mimport i18n from 'i18next';[m
[32m+[m[32mimport { initReactI18next } from 'react-i18next';[m
[32m+[m[32mimport LanguageDetector from 'i18next-browser-languagedetector';[m
[32m+[m
[32m+[m[32mimport vi from './dictionaries/vi';[m
[32m+[m[32mimport en from './dictionaries/en';[m
[32m+[m
[32m+[m[32mi18n[m
[32m+[m[32m  .use(LanguageDetector)[m
[32m+[m[32m  .use(initReactI18next)[m
[32m+[m[32m  .init({[m
[32m+[m[32m    resources: {[m
[32m+[m[32m      vi: { translation: vi },[m
[32m+[m[32m      en: { translation: en },[m
[32m+[m[32m    },[m
[32m+[m[32m    fallbackLng: 'vi',[m
[32m+[m[32m    supportedLngs: ['vi', 'en'],[m
[32m+[m[32m    debug: false,[m
[32m+[m[32m    // Default nsSeparator is ':'. We use dotted paths (`home.streak`),[m
[32m+[m[32m    // so leave it default — '.' is the keySeparator and works as-is.[m
[32m+[m[32m    interpolation: {[m
[32m+[m[32m      // React already escapes interpolated values — turning this off[m
[32m+[m[32m      // avoids double-escaping things like {title} inside a JSX[m
[32m+[m[32m      // expression.[m
[32m+[m[32m      escapeValue: false,[m
[32m+[m[32m    },[m
[32m+[m[32m    detection: {[m
[32m+[m[32m      // localStorage key so reloads remember the user's choice. The[m
[32m+[m[32m      // cookie fallback is left in (some users have localStorage[m
[32m+[m[32m      // disabled); navigator is the last fallback.[m
[32m+[m[32m      order: ['localStorage', 'navigator'],[m
[32m+[m[32m      lookupLocalStorage: 'fav_lang',[m
[32m+[m[32m      caches: ['localStorage'],[m
[32m+[m[32m    },[m
[32m+[m[32m  });[m
[32m+[m
[32m+[m[32mexport default i18n;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/main.jsx b/frontend/src/main.jsx[m
[1mindex ce8e533..5cb3b3b 100644[m
[1m--- a/frontend/src/main.jsx[m
[1m+++ b/frontend/src/main.jsx[m
[36m@@ -1,7 +1,17 @@[m
[31m-import React from 'react';[m
[32m+[m[32mimport React, { Suspense } from 'react';[m
 import ReactDOM from 'react-dom/client';[m
 import App from './App';[m
[32m+[m[32mimport './i18n';  // side-effect: initializes i18next + react-i18next[m
 import './App.css';[m
 [m
 const root = ReactDOM.createRoot(document.getElementById('root'));[m
[31m-root.render(<App />);[m
[32m+[m[32mroot.render([m
[32m+[m[32m  // <Suspense> is required when i18next.loadResources is async; without[m
[32m+[m[32m  // it the first render of <App> may happen before locale resources[m
[32m+[m[32m  // are loaded and any <T> children that read i18n would see empty[m
[32m+[m[32m  // keys. The fallback here is just the unstyled document — by the[m
[32m+[m[32m  // time React paints anything user-facing, the bundles are loaded.[m
[32m+[m[32m  <Suspense fallback={null}>[m
[32m+[m[32m    <App />[m
[32m+[m[32m  </Suspense>[m
[32m+[m[32m);[m
[1mdiff --git a/frontend/src/pages/Bookmarks/Bookmarks.css b/frontend/src/pages/Bookmarks/Bookmarks.css[m
[1mindex 7eee7fa..635120a 100644[m
[1m--- a/frontend/src/pages/Bookmarks/Bookmarks.css[m
[1m+++ b/frontend/src/pages/Bookmarks/Bookmarks.css[m
[36m@@ -1,44 +1,60 @@[m
[31m-/* Bookmarks page — same color tokens as the rest of the app.[m
[31m- * Dark theme is inherited from <div className="App dark-theme"> via[m
[31m- * CSS variables defined in App.css.[m
[31m- */[m
[32m+[m[32m/* Bookmarks page — theme-aware via App.css tokens */[m
 [m
 .bookmarks-container {[m
   min-height: 100vh;[m
[31m-  background: var(--bg-app, #0f172a);[m
[31m-  color: var(--text-main, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-app);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 0 0 80px;[m
[32m+[m[32m  /* Fill the available main-area width (sidebar is already accounted[m
[32m+[m[32m     for by App.css's `.main-area { margin-left: 260px; flex: 1 }`).[m
[32m+[m[32m     The old `max-width: 1200px` cap was the reason the page felt tiny[m
[32m+[m[32m     on a 1440–1920px viewport: the container sat centred in ~1200px[m
[32m+[m[32m     while the right ~240–720px was empty space. The new cap matches[m
[32m+[m[32m     a comfortable reading width for very wide monitors without[m
[32m+[m[32m     leaving an empty band on a laptop. */[m
[32m+[m[32m  width: 100%;[m
[32m+[m[32m  max-width: 1600px;[m
[32m+[m[32m  margin: 0;[m
[32m+[m[32m  /* Side gutters on every viewport — the main area inherits padding[m
[32m+[m[32m     from the App shell, but inner content still needs edge breathing[m
[32m+[m[32m     room so headings don't sit flush against the panel edge. */[m
[32m+[m[32m  padding-left: clamp(12px, 3vw, 32px);[m
[32m+[m[32m  padding-right: clamp(12px, 3vw, 32px);[m
[32m+[m[32m  box-sizing: border-box;[m
 }[m
 [m
 .bookmarks-header {[m
[31m-  padding: 60px 40px 24px;[m
[31m-  text-align: center;[m
[32m+[m[32m  padding: 32px 0 20px;[m
[32m+[m[32m  text-align: left;[m
 }[m
 [m
 .bookmarks-header h1 {[m
   margin: 0 0 8px;[m
[31m-  font-size: 28px;[m
[32m+[m[32m  font-size: clamp(22px, 4vw, 28px);[m
   font-weight: 700;[m
[32m+[m[32m  color: var(--text-title);[m
[32m+[m[32m  word-wrap: break-word;[m
[32m+[m[32m  overflow-wrap: anywhere;[m
 }[m
 [m
 .bookmarks-subtitle {[m
   margin: 0;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 14px;[m
 }[m
 [m
 .bookmarks-filters {[m
   display: flex;[m
   gap: 8px;[m
[31m-  justify-content: center;[m
[31m-  padding: 16px 24px 32px;[m
[32m+[m[32m  justify-content: flex-start;[m
[32m+[m[32m  padding: 8px 0 24px;[m
   flex-wrap: wrap;[m
 }[m
 [m
 .bookmarks-filter {[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.1);[m
[31m-  color: var(--text-main, #f1f5f9);[m
[32m+[m[32m  background: var(--glass-bg);[m
[32m+[m[32m  border: 1px solid var(--glass-border);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 8px 16px;[m
   border-radius: 999px;[m
   cursor: pointer;[m
[36m@@ -47,24 +63,24 @@[m
 }[m
 [m
 .bookmarks-filter:hover {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--glass-bg-hover);[m
 }[m
 [m
 .bookmarks-filter.active {[m
[31m-  background: linear-gradient(135deg, #6366f1, #4f46e5);[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-2));[m
   border-color: transparent;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-weight: 600;[m
 }[m
 [m
 .bookmarks-status {[m
   text-align: center;[m
   padding: 60px 20px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .bookmarks-error {[m
[31m-  color: #f87171;[m
[32m+[m[32m  color: var(--status-error-fg);[m
 }[m
 [m
 .bookmarks-empty {[m
[36m@@ -83,19 +99,20 @@[m
 .bookmarks-empty h3 {[m
   margin: 0 0 8px;[m
   font-size: 18px;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .bookmarks-empty p {[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   margin: 0 0 24px;[m
   font-size: 14px;[m
   line-height: 1.5;[m
 }[m
 [m
 .bookmarks-empty-cta {[m
[31m-  background: linear-gradient(135deg, #6366f1, #4f46e5);[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-2));[m
   border: none;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
   padding: 10px 20px;[m
   border-radius: 8px;[m
   cursor: pointer;[m
[36m@@ -106,30 +123,34 @@[m
 .bookmarks-grid {[m
   list-style: none;[m
   margin: 0;[m
[31m-  padding: 0 40px;[m
[32m+[m[32m  padding: 0;[m
   display: grid;[m
[31m-  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));[m
[31m-  gap: 20px;[m
[31m-  max-width: 1200px;[m
[31m-  margin: 0 auto;[m
[32m+[m[32m  /* auto-fit (NOT auto-fill): when there's only 1 saved item we want[m
[32m+[m[32m     the card to stretch across the full content width instead of[m
[32m+[m[32m     sitting in a 280px cell with a huge empty area to the right.[m
[32m+[m[32m     auto-fill reserves empty 1fr tracks for the missing items and[m
[32m+[m[32m     truncates the lone item to the same track width. */[m
[32m+[m[32m  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));[m
[32m+[m[32m  gap: 16px;[m
 }[m
 [m
 .bookmarks-card {[m
   display: flex;[m
   gap: 14px;[m
[31m-  background: rgba(255, 255, 255, 0.04);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.08);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   padding: 14px;[m
   cursor: pointer;[m
   transition: transform 0.12s, border-color 0.12s, background 0.12s;[m
   outline: none;[m
[32m+[m[32m  min-width: 0;[m
 }[m
 [m
 .bookmarks-card:hover,[m
 .bookmarks-card:focus {[m
[31m-  border-color: rgba(129, 140, 248, 0.4);[m
[31m-  background: rgba(255, 255, 255, 0.07);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  background: var(--bg-card-hover);[m
   transform: translateY(-1px);[m
 }[m
 [m
[36m@@ -139,7 +160,7 @@[m
   border-radius: 10px;[m
   overflow: hidden;[m
   flex-shrink: 0;[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[32m+[m[32m  background: var(--bg-item);[m
   display: flex;[m
   align-items: center;[m
   justify-content: center;[m
[36m@@ -170,7 +191,7 @@[m
   font-size: 11px;[m
   text-transform: uppercase;[m
   letter-spacing: 0.04em;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .bookmarks-card-type {[m
[36m@@ -179,7 +200,7 @@[m
 [m
 .bookmarks-card-cat {[m
   background: rgba(99, 102, 241, 0.18);[m
[31m-  color: #a5b4fc;[m
[32m+[m[32m  color: var(--accent-primary);[m
   padding: 2px 8px;[m
   border-radius: 999px;[m
   font-weight: 500;[m
[36m@@ -190,6 +211,7 @@[m
   font-size: 14px;[m
   font-weight: 600;[m
   line-height: 1.4;[m
[32m+[m[32m  color: var(--text-title);[m
   display: -webkit-box;[m
   -webkit-line-clamp: 2;[m
   -webkit-box-orient: vertical;[m
[36m@@ -199,7 +221,7 @@[m
 .bookmarks-card-snippet {[m
   margin: 0;[m
   font-size: 12px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   line-height: 1.4;[m
   display: -webkit-box;[m
   -webkit-line-clamp: 2;[m
[36m@@ -217,7 +239,7 @@[m
 [m
 .bookmarks-card-time {[m
   font-size: 11px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .bookmarks-unsave {[m
[36m@@ -227,42 +249,65 @@[m
   font-size: 18px;[m
   padding: 4px 6px;[m
   border-radius: 6px;[m
[31m-  transition: background 0.12s;[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  transition: background 0.12s, color 0.12s;[m
 }[m
 [m
 .bookmarks-unsave:hover {[m
[31m-  background: rgba(255, 255, 255, 0.08);[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--accent-danger);[m
 }[m
 [m
[31m-/* Light theme overrides — same pattern as the rest of the app.[m
[31m- * Inherit --bg-app, --text-main, --text-muted from App.css light defaults. */[m
[31m-.App:not(.dark-theme) .bookmarks-card {[m
[31m-  background: rgba(0, 0, 0, 0.02);[m
[31m-  border-color: rgba(0, 0, 0, 0.08);[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .bookmarks-card:hover,[m
[31m-.App:not(.dark-theme) .bookmarks-card:focus {[m
[31m-  background: rgba(0, 0, 0, 0.04);[m
[31m-  border-color: rgba(99, 102, 241, 0.4);[m
[31m-}[m
[31m-[m
[31m-.App:not(.dark-theme) .bookmarks-filter {[m
[31m-  background: rgba(0, 0, 0, 0.04);[m
[31m-  border-color: rgba(0, 0, 0, 0.1);[m
[31m-}[m
[32m+[m[32m/* Responsive — three tiers instead of one so the page degrades[m
[32m+[m[32m   smoothly on phones (no banner, no horizontal scroll) without[m
[32m+[m[32m   ruining the tablet / desktop look. */[m
 [m
[31m-.App:not(.dark-theme) .bookmarks-unsave:hover {[m
[31m-  background: rgba(0, 0, 0, 0.06);[m
[32m+[m[32m@media (max-width: 1024px) {[m
[32m+[m[32m  /* Tablet: title centered, filters wrap below it; cards go[m
[32m+[m[32m     side-by-side as long as there's room. */[m
[32m+[m[32m  .bookmarks-header {[m
[32m+[m[32m    text-align: center;[m
[32m+[m[32m    padding-top: 24px;[m
[32m+[m[32m  }[m
[32m+[m[32m  .bookmarks-filters {[m
[32m+[m[32m    justify-content: center;[m
[32m+[m[32m  }[m
 }[m
 [m
[31m-/* Mobile — stack filters and grid, reduce header padding */[m
[31m-@media (max-width: 640px) {[m
[32m+[m[32m@media (max-width: 768px) {[m
[32m+[m[32m  /* Phone: 1-column grid, tighter spacing on the header so the[m
[32m+[m[32m     filters row isn't pushed below the fold. */[m
[32m+[m[32m  .bookmarks-container {[m
[32m+[m[32m    padding-left: 16px;[m
[32m+[m[32m    padding-right: 16px;[m
[32m+[m[32m  }[m
   .bookmarks-header {[m
[31m-    padding: 80px 20px 16px;[m
[32m+[m[32m    padding: 16px 0 12px;[m
[32m+[m[32m  }[m
[32m+[m[32m  .bookmarks-filters {[m
[32m+[m[32m    padding-bottom: 16px;[m
   }[m
   .bookmarks-grid {[m
[31m-    padding: 0 16px;[m
     grid-template-columns: 1fr;[m
[32m+[m[32m    gap: 12px;[m
[32m+[m[32m  }[m
[32m+[m[32m  .bookmarks-card {[m
[32m+[m[32m    padding: 12px;[m
[32m+[m[32m  }[m
[32m+[m[32m  .bookmarks-empty {[m
[32m+[m[32m    padding: 48px 16px;[m
   }[m
 }[m
[32m+[m
[32m+[m[32m@media (max-width: 480px) {[m
[32m+[m[32m  /* Tiny phones: cut the header breathing room further, shrink the[m
[32m+[m[32m     card thumbnail so long titles get more room. */[m
[32m+[m[32m  .bookmarks-card-thumb {[m
[32m+[m[32m    width: 64px;[m
[32m+[m[32m    height: 64px;[m
[32m+[m[32m  }[m
[32m+[m[32m  .bookmarks-card-meta,[m
[32m+[m[32m  .bookmarks-card-time {[m
[32m+[m[32m    font-size: 10px;[m
[32m+[m[32m  }[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Bookmarks/index.jsx b/frontend/src/pages/Bookmarks/index.jsx[m
[1mindex 0a2fbf5..47f81df 100644[m
[1m--- a/frontend/src/pages/Bookmarks/index.jsx[m
[1m+++ b/frontend/src/pages/Bookmarks/index.jsx[m
[36m@@ -1,13 +1,9 @@[m
 import React, { useCallback, useEffect, useState } from 'react';[m
 import * as api from '../../services/api';[m
 import { useBookmarks } from '../../lib/BookmarksContext';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './Bookmarks.css';[m
 [m
[31m-// The dedupe tag in the page title — also matches the navbar label.[m
[31m-// Keeping this in sync is a separate refactor's problem (we have the[m
[31m-// same risk for "Bảng tin", "Knowledge", etc.).[m
[31m-const PAGE_TITLE = '🔖 Đã lưu';[m
[31m-[m
 // Snippet cap matches the BE's list_bookmarks (it truncates to 120[m
 // already); we render the string straight from the API.[m
 function snippet(s, max = 120) {[m
[36m@@ -15,7 +11,24 @@[m [mfunction snippet(s, max = 120) {[m
   return s.length > max ? s.slice(0, max) + '…' : s;[m
 }[m
 [m
[32m+[m[32m// Per-type label keys for the card type chip. The same lookup table[m
[32m+[m[32m// is used for the empty-state icon below.[m
[32m+[m[32mconst TYPE_LABEL_KEY = {[m
[32m+[m[32m  knowledge: 'bookmarks.knowledge',[m
[32m+[m[32m  post: 'bookmarks.post',[m
[32m+[m[32m  music: 'bookmarks.music',[m
[32m+[m[32m  game: 'bookmarks.game',[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mconst TYPE_ICON = {[m
[32m+[m[32m  knowledge: '📚',[m
[32m+[m[32m  post: '📰',[m
[32m+[m[32m  music: '🎵',[m
[32m+[m[32m  game: '🎮',[m
[32m+[m[32m};[m
[32m+[m
 export default function Bookmarks({ onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const { isBookmarked, toggle } = useBookmarks();[m
   const [items, setItems] = useState([]);[m
   const [loading, setLoading] = useState(false);[m
[36m@@ -34,11 +47,11 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
       setItems(Array.isArray(data) ? data : []);[m
     } catch (err) {[m
       console.error('[Bookmarks] load failed', err);[m
[31m-      setError(err.response?.data?.detail || 'Không thể tải danh sách đã lưu.');[m
[32m+[m[32m      setError(err.response?.data?.detail || t('bookmarks.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[31m-  }, []);[m
[32m+[m[32m  }, [t]);[m
 [m
   useEffect(() => { load(); }, [load]);[m
 [m
[36m@@ -82,30 +95,30 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
   return ([m
     <div className="bookmarks-container">[m
       <header className="bookmarks-header">[m
[31m-        <h1>{PAGE_TITLE}</h1>[m
[31m-        <p className="bookmarks-subtitle">Những bài viết và bài đăng bạn đã lưu để xem lại sau.</p>[m
[32m+[m[32m        <h1>{t('bookmarks.title')}</h1>[m
[32m+[m[32m        <p className="bookmarks-subtitle">{t('bookmarks.subtitle')}</p>[m
       </header>[m
 [m
       <div className="bookmarks-filters">[m
         <button className={`bookmarks-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>[m
[31m-          Tất cả ({counts.all})[m
[32m+[m[32m          {t('bookmarks.all')} ({counts.all})[m
         </button>[m
         <button className={`bookmarks-filter ${filter === 'knowledge' ? 'active' : ''}`} onClick={() => setFilter('knowledge')}>[m
[31m-          📚 Bài viết ({counts.knowledge})[m
[32m+[m[32m          📚 {t('bookmarks.knowledge')} ({counts.knowledge})[m
         </button>[m
         <button className={`bookmarks-filter ${filter === 'post' ? 'active' : ''}`} onClick={() => setFilter('post')}>[m
[31m-          📰 Bài đăng ({counts.post})[m
[32m+[m[32m          📰 {t('bookmarks.post')} ({counts.post})[m
         </button>[m
         <button className={`bookmarks-filter ${filter === 'music' ? 'active' : ''}`} onClick={() => setFilter('music')}>[m
[31m-          🎵 Bài hát ({counts.music})[m
[32m+[m[32m          🎵 {t('bookmarks.music')} ({counts.music})[m
         </button>[m
         <button className={`bookmarks-filter ${filter === 'game' ? 'active' : ''}`} onClick={() => setFilter('game')}>[m
[31m-          🎮 Trò chơi ({counts.game})[m
[32m+[m[32m          🎮 {t('bookmarks.game')} ({counts.game})[m
         </button>[m
       </div>[m
 [m
       {loading && ([m
[31m-        <div className="bookmarks-status">Đang tải...</div>[m
[32m+[m[32m        <div className="bookmarks-status">{t('bookmarks.loading')}</div>[m
       )}[m
 [m
       {error && !loading && ([m
[36m@@ -115,10 +128,10 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
       {!loading && !error && items.length === 0 && ([m
         <div className="bookmarks-empty">[m
           <div className="bookmarks-empty-icon">🔖</div>[m
[31m-          <h3>Bạn chưa lưu nội dung nào</h3>[m
[31m-          <p>Nhấn 🔖 trên bài viết Knowledge hoặc trên bài đăng trong Bảng tin để lưu lại xem sau.</p>[m
[32m+[m[32m          <h3>{t('bookmarks.empty')}</h3>[m
[32m+[m[32m          <p>{t('bookmarks.emptyHint')}</p>[m
           <button className="bookmarks-empty-cta" onClick={() => onNavigate?.('feed')}>[m
[31m-            Đi tới Bảng tin →[m
[32m+[m[32m            {t('bookmarks.cta')}[m
           </button>[m
         </div>[m
       )}[m
[36m@@ -128,6 +141,7 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
           {visible.map((item) => {[m
             const key = `${item.content_type}-${item.content_id}`;[m
             const filled = isBookmarked(item.content_type, item.content_id);[m
[32m+[m[32m            const typeLabel = TYPE_LABEL_KEY[item.content_type] ? t(TYPE_LABEL_KEY[item.content_type]) : item.content_type;[m
             return ([m
               <li[m
                 key={key}[m
[36m@@ -142,18 +156,14 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
                     <img src={item.thumbnail || item.image_url} alt="" />[m
                   ) : ([m
                     <div className="bookmarks-thumb-placeholder">[m
[31m-                      {item.content_type === 'knowledge' ? '📚' :[m
[31m-                       item.content_type === 'post' ? '📰' :[m
[31m-                       item.content_type === 'music' ? '🎵' : '🎮'}[m
[32m+[m[32m                      {TYPE_ICON[item.content_type] || '•'}[m
                     </div>[m
                   )}[m
                 </div>[m
                 <div className="bookmarks-card-body">[m
                   <div className="bookmarks-card-meta">[m
                     <span className="bookmarks-card-type">[m
[31m-                      {item.content_type === 'knowledge' ? '📚 Bài viết' :[m
[31m-                       item.content_type === 'post' ? '📰 Bài đăng' :[m
[31m-                       item.content_type === 'music' ? '🎵 Bài hát' : '🎮 Trò chơi'}[m
[32m+[m[32m                      {TYPE_ICON[item.content_type] || ' '} {typeLabel}[m
                     </span>[m
                     {item.category && <span className="bookmarks-card-cat">{item.category}</span>}[m
                     {item.artist && <span className="bookmarks-card-cat">{item.artist}</span>}[m
[36m@@ -162,12 +172,13 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
                   {item.snippet && <p className="bookmarks-card-snippet">{snippet(item.snippet)}</p>}[m
                   <div className="bookmarks-card-footer">[m
                     <span className="bookmarks-card-time">[m
[31m-                      {new Date(item.created_at).toLocaleDateString('vi-VN')}[m
[32m+[m[32m                      {new Date(item.created_at).toLocaleDateString()}[m
                     </span>[m
                     <button[m
                       className={`bookmarks-unsave ${filled ? 'filled' : ''}`}[m
                       onClick={(e) => handleUnsave(item, e)}[m
[31m-                      title="Bỏ lưu"[m
[32m+[m[32m                      title={filled ? t('bookmarks.unsave') : t('bookmarks.save')}[m
[32m+[m[32m                      aria-label={filled ? t('bookmarks.unsave') : t('bookmarks.save')}[m
                       type="button"[m
                     >[m
                       {filled ? '🔖' : '⚪'}[m
[36m@@ -181,4 +192,4 @@[m [mexport default function Bookmarks({ onNavigate }) {[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Collections/AddToCollectionButton.jsx b/frontend/src/pages/Collections/AddToCollectionButton.jsx[m
[1mindex 47a5c78..bbeecbc 100644[m
[1m--- a/frontend/src/pages/Collections/AddToCollectionButton.jsx[m
[1m+++ b/frontend/src/pages/Collections/AddToCollectionButton.jsx[m
[36m@@ -1,5 +1,6 @@[m
 import React, { useEffect, useState } from 'react';[m
 import * as api from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './Collections.css';[m
 [m
 // Button + modal combo. Clicking the button opens a picker dialog[m
[36m@@ -11,6 +12,7 @@[m [mimport './Collections.css';[m
 // knowledge items — keeps the wiring future-proof for when posts /[m
 // games get added to collections.[m
 export default function AddToCollectionButton({ contentType, contentId }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [open, setOpen] = useState(false);[m
   const [collections, setCollections] = useState([]);[m
   const [loading, setLoading] = useState(false);[m
[36m@@ -79,23 +81,23 @@[m [mexport default function AddToCollectionButton({ contentType, contentId }) {[m
       <button[m
         className="action-btn"[m
         onClick={() => setOpen(true)}[m
[31m-        title="Thêm vào bộ sưu tập"[m
[32m+[m[32m        title={t('collections.addToCollection')}[m
         type="button"[m
       >[m
[31m-        📂 Thêm vào bộ sưu tập[m
[32m+[m[32m        📂 {t('collections.addToCollection')}[m
       </button>[m
       {open && ([m
         <div className="collections-picker-overlay" onClick={() => setOpen(false)}>[m
           <div className="collections-picker" onClick={(e) => e.stopPropagation()}>[m
             <div className="collections-picker-header">[m
[31m-              <span>Thêm vào bộ sưu tập</span>[m
[32m+[m[32m              <span>{t('collections.addToCollection')}</span>[m
               <button className="collections-picker-close" onClick={() => setOpen(false)} type="button">×</button>[m
             </div>[m
             <div className="collections-picker-list">[m
               {loading ? ([m
[31m-                <div className="collections-picker-empty">Đang tải...</div>[m
[32m+[m[32m                <div className="collections-picker-empty">{t('collections.loading')}</div>[m
               ) : collections.length === 0 ? ([m
[31m-                <div className="collections-picker-empty">Bạn chưa có bộ sưu tập nào. Hãy vào "Bộ sưu tập của tôi" để tạo.</div>[m
[32m+[m[32m                <div className="collections-picker-empty">{t('collections.pickEmpty')}</div>[m
               ) : ([m
                 collections.map((c) => {[m
                   const isAdded = addedIds.has(c.id);[m
[36m@@ -106,7 +108,7 @@[m [mexport default function AddToCollectionButton({ contentType, contentId }) {[m
                       onClick={() => handleToggle(c)}[m
                     >[m
                       <span>{c.name}</span>[m
[31m-                      <span>{isAdded ? '✓ Đã thêm' : '+ Thêm'}</span>[m
[32m+[m[32m                      <span>{isAdded ? <>✓ {t('collections.added')}</> : <>+ {t('collections.addToCollection')}</>}</span>[m
                     </div>[m
                   );[m
                 })[m
[36m@@ -117,4 +119,4 @@[m [mexport default function AddToCollectionButton({ contentType, contentId }) {[m
       )}[m
     </>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Collections/CollectionDetail.jsx b/frontend/src/pages/Collections/CollectionDetail.jsx[m
[1mindex f7d5473..a37ccd1 100644[m
[1m--- a/frontend/src/pages/Collections/CollectionDetail.jsx[m
[1m+++ b/frontend/src/pages/Collections/CollectionDetail.jsx[m
[36m@@ -1,4 +1,5 @@[m
 import React, { useEffect, useState } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import * as api from '../../services/api';[m
 import './Collections.css';[m
 [m
[36m@@ -9,6 +10,7 @@[m [mimport './Collections.css';[m
 // Edit mode toggles an inline form for name/description — same UX as[m
 // the list page's create form, intentionally kept symmetric.[m
 export default function CollectionDetail({ collectionId, onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [collection, setCollection] = useState(null);[m
   const [loading, setLoading] = useState(true);[m
   const [error, setError] = useState(null);[m
[36m@@ -27,14 +29,16 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
       } catch (err) {[m
         if (!cancelled) {[m
           const status = err?.response?.status;[m
[31m-          setError(status === 404 ? 'Bộ sưu tập không tồn tại.' : 'Không tải được bộ sưu tập.');[m
[32m+[m[32m          setError(status === 404[m
[32m+[m[32m            ? t('collections.err.notFound')[m
[32m+[m[32m            : t('collections.err.loadDetail'));[m
         }[m
       } finally {[m
         if (!cancelled) setLoading(false);[m
       }[m
     })();[m
     return () => { cancelled = true; };[m
[31m-  }, [collectionId]);[m
[32m+[m[32m  }, [collectionId, t]);[m
 [m
   // Pre-fill the edit form when entering edit mode. We snapshot from[m
   // `collection` each time so successive edits don't carry stale state.[m
[36m@@ -78,14 +82,14 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
   };[m
 [m
   if (loading) {[m
[31m-    return <div className="collections-container"><div className="collections-status">Đang tải...</div></div>;[m
[32m+[m[32m    return <div className="collections-container"><div className="collections-status">{t('collections.loading')}</div></div>;[m
   }[m
 [m
   if (error) {[m
     return ([m
       <div className="collections-container">[m
         <div className="collections-status collections-error">{error}</div>[m
[31m-        <button className="collections-back" onClick={() => onNavigate?.('collections')}>← Về danh sách</button>[m
[32m+[m[32m        <button className="collections-back" onClick={() => onNavigate?.('collections')}>{t('collections.backToList')}</button>[m
       </div>[m
     );[m
   }[m
[36m@@ -94,7 +98,7 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
 [m
   return ([m
     <div className="collections-container">[m
[31m-      <button className="collections-back" onClick={() => onNavigate?.('collections')}>← Về danh sách</button>[m
[32m+[m[32m      <button className="collections-back" onClick={() => onNavigate?.('collections')}>{t('collections.backToList')}</button>[m
 [m
       <header className="collections-header">[m
         {!editing ? ([m
[36m@@ -102,7 +106,7 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
             <h1>📂 {collection.name}</h1>[m
             {collection.description && <p className="collections-subtitle">{collection.description}</p>}[m
             <div className="collections-detail-actions">[m
[31m-              <button className="collections-edit-btn" onClick={beginEdit}>✏️ Sửa</button>[m
[32m+[m[32m              <button className="collections-edit-btn" onClick={beginEdit}>✏️ {t('collections.edit')}</button>[m
             </div>[m
           </>[m
         ) : ([m
[36m@@ -122,9 +126,9 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
             />[m
             <div className="collections-create-actions">[m
               <button type="submit" className="collections-submit" disabled={saving || !editName.trim()}>[m
[31m-                {saving ? 'Đang lưu...' : 'Lưu'}[m
[32m+[m[32m                {saving ? t('collections.saving') : t('collections.save')}[m
               </button>[m
[31m-              <button type="button" className="collections-cancel" onClick={() => setEditing(false)}>Huỷ</button>[m
[32m+[m[32m              <button type="button" className="collections-cancel" onClick={() => setEditing(false)}>{t('collections.cancel')}</button>[m
             </div>[m
           </form>[m
         )}[m
[36m@@ -133,8 +137,8 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
       {!collection.items || collection.items.length === 0 ? ([m
         <div className="collections-empty">[m
           <div className="collections-empty-icon">📄</div>[m
[31m-          <h3>Bộ sưu tập trống</h3>[m
[31m-          <p>Mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập" → chọn "{collection.name}".</p>[m
[32m+[m[32m          <h3>{t('collections.emptyDetail')}</h3>[m
[32m+[m[32m          <p>{t('collections.emptyDetailHint', { name: collection.name })}</p>[m
         </div>[m
       ) : ([m
         <ul className="collections-grid">[m
[36m@@ -152,16 +156,16 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
               <div className="collections-card-name">{item.title}</div>[m
               <div className="collections-card-meta">[m
                 {item.category && <span>📁 {item.category}</span>}[m
[31m-                <span>📚 Bài viết</span>[m
[32m+[m[32m                <span>📚 {t('collections.articleShort')}</span>[m
               </div>[m
               <div className="collections-card-footer">[m
                 <button[m
                   className="collections-card-delete"[m
                   onClick={(e) => handleRemoveItem(item, e)}[m
[31m-                  title="Xoá khỏi bộ sưu tập"[m
[32m+[m[32m                  title={t('collections.removeFromCollection')}[m
                   type="button"[m
                 >[m
[31m-                  ✕ Bỏ khỏi bộ sưu tập[m
[32m+[m[32m                  ✕ {t('collections.removeFromCollection')}[m
                 </button>[m
               </div>[m
             </li>[m
[36m@@ -170,4 +174,4 @@[m [mexport default function CollectionDetail({ collectionId, onNavigate }) {[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Collections/Collections.css b/frontend/src/pages/Collections/Collections.css[m
[1mindex 80614ef..3792ac9 100644[m
[1m--- a/frontend/src/pages/Collections/Collections.css[m
[1m+++ b/frontend/src/pages/Collections/Collections.css[m
[36m@@ -1,8 +1,10 @@[m
[32m+[m[32m/* Collections page — theme-aware via App.css tokens */[m
[32m+[m
 .collections-container {[m
   max-width: 960px;[m
   margin: 0 auto;[m
   padding: 24px 16px 64px;[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  color: var(--text-main);[m
 }[m
 [m
 .collections-header {[m
[36m@@ -12,18 +14,18 @@[m
 .collections-header h1 {[m
   margin: 0 0 8px;[m
   font-size: 28px;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .collections-subtitle {[m
   margin: 0;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 14px;[m
 }[m
 [m
 .collections-create-btn {[m
[31m-  background: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   border-radius: 8px;[m
   padding: 10px 16px;[m
[36m@@ -35,31 +37,31 @@[m
 }[m
 [m
 .collections-create-btn:hover {[m
[31m-  background: #4f46e5;[m
[32m+[m[32m  background: var(--accent-primary-2);[m
 }[m
 [m
 .collections-create-form {[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   padding: 16px;[m
   margin-bottom: 20px;[m
   display: flex;[m
   flex-direction: column;[m
   gap: 10px;[m
[31m-  box-shadow: var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.03));[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
 }[m
 [m
 .collections-input,[m
 .collections-textarea {[m
   width: 100%;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 8px;[m
   padding: 10px 12px;[m
   font-size: 14px;[m
   font-family: inherit;[m
[31m-  background: var(--bg-app, #ffffff);[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  background: var(--bg-app);[m
[32m+[m[32m  color: var(--text-main);[m
   box-sizing: border-box;[m
 }[m
 [m
[36m@@ -71,7 +73,7 @@[m
 .collections-input:focus,[m
 .collections-textarea:focus {[m
   outline: none;[m
[31m-  border-color: #6366f1;[m
[32m+[m[32m  border-color: var(--accent-primary);[m
 }[m
 [m
 .collections-create-actions {[m
[36m@@ -80,8 +82,8 @@[m
 }[m
 [m
 .collections-submit {[m
[31m-  background: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   border-radius: 8px;[m
   padding: 8px 18px;[m
[36m@@ -89,6 +91,10 @@[m
   cursor: pointer;[m
 }[m
 [m
[32m+[m[32m.collections-submit:hover {[m
[32m+[m[32m  background: var(--accent-primary-2);[m
[32m+[m[32m}[m
[32m+[m
 .collections-submit:disabled {[m
   opacity: 0.6;[m
   cursor: not-allowed;[m
[36m@@ -96,8 +102,8 @@[m
 [m
 .collections-cancel {[m
   background: transparent;[m
[31m-  color: var(--text-muted, #64748b);[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 8px;[m
   padding: 8px 18px;[m
   font-weight: 600;[m
[36m@@ -107,20 +113,20 @@[m
 .collections-status {[m
   text-align: center;[m
   padding: 32px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .collections-error {[m
[31m-  color: #b91c1c;[m
[32m+[m[32m  color: var(--status-error-fg);[m
 }[m
 [m
 .collections-empty {[m
   text-align: center;[m
   padding: 60px 20px;[m
[31m-  color: var(--text-muted, #64748b);[m
[31m-  border: 1px dashed var(--border-color, #cbd5e1);[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  border: 1px dashed var(--border-color);[m
   border-radius: 12px;[m
[31m-  background: var(--bg-card, #ffffff);[m
[32m+[m[32m  background: var(--bg-card);[m
 }[m
 [m
 .collections-empty-icon {[m
[36m@@ -130,7 +136,7 @@[m
 [m
 .collections-empty h3 {[m
   margin: 0 0 8px;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   font-size: 18px;[m
 }[m
 [m
[36m@@ -149,8 +155,8 @@[m
 }[m
 [m
 .collections-card {[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   padding: 14px 16px;[m
   cursor: pointer;[m
[36m@@ -158,25 +164,25 @@[m
   display: flex;[m
   flex-direction: column;[m
   gap: 8px;[m
[31m-  box-shadow: var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.03));[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
 }[m
 [m
 .collections-card:hover {[m
   transform: translateY(-2px);[m
[31m-  box-shadow: var(--shadow-card-hover, 0 8px 28px rgba(15, 23, 42, 0.08));[m
[31m-  border-color: #6366f1;[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
 }[m
 [m
 .collections-card-name {[m
   font-size: 16px;[m
   font-weight: 700;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   word-wrap: break-word;[m
 }[m
 [m
 .collections-card-desc {[m
   font-size: 13px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   word-wrap: break-word;[m
 }[m
 [m
[36m@@ -184,7 +190,7 @@[m
   display: flex;[m
   gap: 10px;[m
   font-size: 12px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   flex-wrap: wrap;[m
 }[m
 [m
[36m@@ -193,10 +199,10 @@[m
   display: flex;[m
   justify-content: space-between;[m
   align-items: center;[m
[31m-  border-top: 1px solid var(--border-color, #f1f5f9);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
   padding-top: 8px;[m
   font-size: 12px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .collections-card-count {[m
[36m@@ -206,7 +212,7 @@[m
 .collections-card-delete {[m
   background: transparent;[m
   border: none;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   cursor: pointer;[m
   font-size: 13px;[m
   padding: 4px 8px;[m
[36m@@ -215,14 +221,14 @@[m
 }[m
 [m
 .collections-card-delete:hover {[m
[31m-  background: rgba(220, 38, 38, 0.08);[m
[31m-  color: #b91c1c;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--accent-danger);[m
 }[m
 [m
 .collections-back {[m
   background: transparent;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 8px 14px;[m
   border-radius: 8px;[m
   font-size: 14px;[m
[36m@@ -233,7 +239,7 @@[m
 }[m
 [m
 .collections-back:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .collections-detail-actions {[m
[36m@@ -242,35 +248,21 @@[m
 [m
 .collections-edit-btn {[m
   background: transparent;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 8px;[m
   padding: 6px 14px;[m
   font-size: 14px;[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  color: var(--text-main);[m
   cursor: pointer;[m
   transition: all 0.15s ease;[m
 }[m
 [m
 .collections-edit-btn:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[31m-}[m
[31m-[m
[31m-.dark-theme .collections-card-name {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-[m
[31m-.dark-theme .collections-input,[m
[31m-.dark-theme .collections-textarea {[m
[31m-  background: rgba(255, 255, 255, 0.05);[m
[31m-  color: #f1f5f9;[m
[31m-  border-color: rgba(255, 255, 255, 0.12);[m
[31m-}[m
[31m-[m
[31m-.dark-theme .collections-create-form {[m
[31m-  background: rgba(255, 255, 255, 0.04);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 /* ===== AddToCollection picker ===== */[m
[32m+[m
 .collections-picker-overlay {[m
   position: fixed;[m
   inset: 0;[m
[36m@@ -282,21 +274,21 @@[m
 }[m
 [m
 .collections-picker {[m
[31m-  background: var(--bg-card, #ffffff);[m
[32m+[m[32m  background: var(--bg-card);[m
   border-radius: 12px;[m
   width: min(420px, 90vw);[m
   max-height: 70vh;[m
   display: flex;[m
   flex-direction: column;[m
   overflow: hidden;[m
[31m-  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
 }[m
 [m
 .collections-picker-header {[m
   padding: 14px 18px;[m
[31m-  border-bottom: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   font-weight: 700;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   display: flex;[m
   justify-content: space-between;[m
   align-items: center;[m
[36m@@ -306,7 +298,7 @@[m
   background: transparent;[m
   border: none;[m
   font-size: 20px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   cursor: pointer;[m
 }[m
 [m
[36m@@ -321,37 +313,24 @@[m
   align-items: center;[m
   padding: 10px 18px;[m
   font-size: 14px;[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  color: var(--text-main);[m
   cursor: pointer;[m
   transition: background 0.15s ease;[m
 }[m
 [m
 .collections-picker-item:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .collections-picker-item.added {[m
[31m-  background: rgba(99, 102, 241, 0.08);[m
[31m-  color: #4f46e5;[m
[32m+[m[32m  background: rgba(99, 102, 241, 0.12);[m
[32m+[m[32m  color: var(--accent-primary);[m
   font-weight: 600;[m
 }[m
 [m
 .collections-picker-empty {[m
   padding: 24px;[m
   text-align: center;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 14px;[m
 }[m
[31m-[m
[31m-.dark-theme .collections-picker {[m
[31m-  background: #1e293b;[m
[31m-}[m
[31m-[m
[31m-.dark-theme .collections-picker-header {[m
[31m-  color: #f1f5f9;[m
[31m-  border-bottom-color: rgba(255, 255, 255, 0.08);[m
[31m-}[m
[31m-[m
[31m-.dark-theme .collections-picker-item {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[1mdiff --git a/frontend/src/pages/Collections/Collections.jsx b/frontend/src/pages/Collections/Collections.jsx[m
[1mindex cb2a30f..1649e63 100644[m
[1m--- a/frontend/src/pages/Collections/Collections.jsx[m
[1m+++ b/frontend/src/pages/Collections/Collections.jsx[m
[36m@@ -1,4 +1,5 @@[m
 import React, { useEffect, useState } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import * as api from '../../services/api';[m
 import './Collections.css';[m
 [m
[36m@@ -10,6 +11,7 @@[m [mimport './Collections.css';[m
 // Navigation: clicking a row navigates to the collection detail[m
 // view (handled by App.jsx via setView('collectionDetail', { id })).[m
 export default function Collections({ onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [items, setItems] = useState([]);[m
   const [loading, setLoading] = useState(true);[m
   const [error, setError] = useState(null);[m
[36m@@ -28,7 +30,7 @@[m [mexport default function Collections({ onNavigate }) {[m
       const data = await api.fetchMyCollections();[m
       setItems(data || []);[m
     } catch (err) {[m
[31m-      setError('Không thể tải danh sách bộ sưu tập.');[m
[32m+[m[32m      setError(t('collections.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -50,7 +52,7 @@[m [mexport default function Collections({ onNavigate }) {[m
     } catch (err) {[m
       // Silent failure with inline hint — the form stays open so the[m
       // user can fix the name without retyping.[m
[31m-      setError('Không thể tạo. Tên tối đa 255 ký tự và không được rỗng.');[m
[32m+[m[32m      setError(t('collections.err.create'));[m
     } finally {[m
       setSubmitting(false);[m
     }[m
[36m@@ -58,7 +60,7 @@[m [mexport default function Collections({ onNavigate }) {[m
 [m
   const handleDelete = async (id, e) => {[m
     e.stopPropagation();[m
[31m-    if (!window.confirm('Xóa bộ sưu tập này?')) return;[m
[32m+[m[32m    if (!window.confirm(t('collections.confirm.delete'))) return;[m
     try {[m
       await api.deleteCollectionApi(id);[m
       setItems((prev) => prev.filter((c) => c.id !== id));[m
[36m@@ -70,19 +72,19 @@[m [mexport default function Collections({ onNavigate }) {[m
   return ([m
     <div className="collections-container">[m
       <header className="collections-header">[m
[31m-        <h1>📂 Bộ sưu tập của tôi</h1>[m
[31m-        <p className="collections-subtitle">Gom các bài viết Knowledge vào nhóm để đọc lại sau.</p>[m
[32m+[m[32m        <h1>{t('collections.myCollectionsTitle')}</h1>[m
[32m+[m[32m        <p className="collections-subtitle">{t('collections.subtitle')}</p>[m
       </header>[m
 [m
       {!creating ? ([m
         <button className="collections-create-btn" onClick={() => setCreating(true)}>[m
[31m-          + Tạo bộ sưu tập mới[m
[32m+[m[32m          + {t('collections.addButton')}[m
         </button>[m
       ) : ([m
         <form className="collections-create-form" onSubmit={handleCreate}>[m
           <input[m
             className="collections-input"[m
[31m-            placeholder="Tên bộ sưu tập (bắt buộc)"[m
[32m+[m[32m            placeholder={t('collections.ph.name')}[m
             value={name}[m
             onChange={(e) => setName(e.target.value)}[m
             autoFocus[m
[36m@@ -90,30 +92,30 @@[m [mexport default function Collections({ onNavigate }) {[m
           />[m
           <textarea[m
             className="collections-textarea"[m
[31m-            placeholder="Mô tả (tuỳ chọn)"[m
[32m+[m[32m            placeholder={t('collections.ph.desc')}[m
             value={description}[m
             onChange={(e) => setDescription(e.target.value)}[m
             maxLength={1024}[m
           />[m
           <div className="collections-create-actions">[m
             <button type="submit" className="collections-submit" disabled={submitting || !name.trim()}>[m
[31m-              {submitting ? 'Đang tạo...' : 'Tạo'}[m
[32m+[m[32m              {submitting ? t('collections.saving2') : t('collections.create')}[m
             </button>[m
             <button type="button" className="collections-cancel" onClick={() => { setCreating(false); setName(''); setDescription(''); }}>[m
[31m-              Huỷ[m
[32m+[m[32m              {t('collections.cancel')}[m
             </button>[m
           </div>[m
         </form>[m
       )}[m
 [m
[31m-      {loading && <div className="collections-status">Đang tải...</div>}[m
[32m+[m[32m      {loading && <div className="collections-status">{t('collections.loading')}</div>}[m
       {error && !loading && <div className="collections-status collections-error">{error}</div>}[m
 [m
       {!loading && !error && items.length === 0 && ([m
         <div className="collections-empty">[m
           <div className="collections-empty-icon">📂</div>[m
[31m-          <h3>Bạn chưa có bộ sưu tập nào</h3>[m
[31m-          <p>Tạo bộ sưu tập đầu tiên rồi mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập".</p>[m
[32m+[m[32m          <h3>{t('collections.empty')}</h3>[m
[32m+[m[32m          <p>{t('collections.emptyHint')}</p>[m
         </div>[m
       )}[m
 [m
[36m@@ -132,12 +134,12 @@[m [mexport default function Collections({ onNavigate }) {[m
               {c.description && <div className="collections-card-desc">{c.description}</div>}[m
               <div className="collections-card-footer">[m
                 <span className="collections-card-count">[m
[31m-                  📄 {c.item_count || 0} bài viết[m
[32m+[m[32m                  📄 {c.item_count || 0} {t('collections.articleCount')}[m
                 </span>[m
                 <button[m
                   className="collections-card-delete"[m
                   onClick={(e) => handleDelete(c.id, e)}[m
[31m-                  title="Xóa bộ sưu tập"[m
[32m+[m[32m                  title={t('collections.delete')}[m
                   type="button"[m
                 >[m
                   🗑️[m
[36m@@ -149,4 +151,4 @@[m [mexport default function Collections({ onNavigate }) {[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Dashboard/index.jsx b/frontend/src/pages/Dashboard/index.jsx[m
[1mindex 18bc739..fe7dc06 100644[m
[1m--- a/frontend/src/pages/Dashboard/index.jsx[m
[1m+++ b/frontend/src/pages/Dashboard/index.jsx[m
[36m@@ -2,10 +2,12 @@[m [mimport React, { useEffect, useState } from 'react';[m
 import CameraBox from '../../components/CameraBox';[m
 import ResultCard from '../../components/ResultCard';[m
 import { recognizeFace } from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 function Dashboard() {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [status, setStatus] = useState('idle');[m
[31m-  const [message, setMessage] = useState('Chưa có kết quả');[m
[32m+[m[32m  const [message, setMessage] = useState(t('dashboard.idle'));[m
   const [preview, setPreview] = useState(null);[m
   const [autoScan, setAutoScan] = useState(false);[m
   const [captureTrigger, setCaptureTrigger] = useState(0);[m
[36m@@ -25,7 +27,7 @@[m [mfunction Dashboard() {[m
   const handleCapture = async (file) => {[m
     setPreview(URL.createObjectURL(file));[m
     setStatus('loading');[m
[31m-    setMessage('Đang xử lý ảnh...');[m
[32m+[m[32m    setMessage(t('dashboard.processing'));[m
 [m
     const reader = new FileReader();[m
     reader.onloadend = async () => {[m
[36m@@ -37,7 +39,7 @@[m [mfunction Dashboard() {[m
         setMessage(`${data.message} - ${data.data.name} (${data.data.user_id})`);[m
       } catch (error) {[m
         setStatus('error');[m
[31m-        setMessage('Không nhận diện được. Vui lòng thử lại.');[m
[32m+[m[32m        setMessage(t('dashboard.unrecognized'));[m
       }[m
     };[m
     reader.readAsDataURL(file);[m
[36m@@ -47,19 +49,19 @@[m [mfunction Dashboard() {[m
     <section className="page">[m
       <div className="page-header">[m
         <div>[m
[31m-          <h2>Quét Khuôn Mặt</h2>[m
[31m-          <p>Auto scan mỗi 5 phút hoặc chụp thủ công khi cần.</p>[m
[32m+[m[32m          <h2>{t('dashboard.title')}</h2>[m
[32m+[m[32m          <p>{t('dashboard.subtitle')}</p>[m
         </div>[m
         <button className="button" type="button" onClick={() => setAutoScan((prev) => !prev)}>[m
[31m-          {autoScan ? 'Tắt auto scan' : 'Bật auto scan'}[m
[32m+[m[32m          {autoScan ? t('dashboard.autoScanOn') : t('dashboard.autoScanOff')}[m
         </button>[m
       </div>[m
       <div className="video-grid">[m
         <CameraBox onCapture={handleCapture} captureTrigger={captureTrigger} status={status} />[m
         {preview && ([m
           <div className="capture-preview">[m
[31m-            <h3>Ảnh đã chụp</h3>[m
[31m-            <img className="preview" src={preview} alt="capture preview" />[m
[32m+[m[32m            <h3>{t('dashboard.capturedImage')}</h3>[m
[32m+[m[32m            <img className="preview" src={preview} alt={t('dashboard.altPreview')} />[m
           </div>[m
         )}[m
       </div>[m
[36m@@ -68,4 +70,4 @@[m [mfunction Dashboard() {[m
   );[m
 }[m
 [m
[31m-export default Dashboard;[m
[32m+[m[32mexport default Dashboard;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Feed/Feed.css b/frontend/src/pages/Feed/Feed.css[m
[1mindex 3371f69..022d9b2 100644[m
[1m--- a/frontend/src/pages/Feed/Feed.css[m
[1m+++ b/frontend/src/pages/Feed/Feed.css[m
[36m@@ -157,21 +157,21 @@[m
 }[m
 [m
 .log-item-line.scanning {[m
[31m-  background: #f0f9ff;[m
[31m-  color: #0369a1;[m
[31m-  border-left: 4px solid #38bdf8;[m
[32m+[m[32m  background: var(--status-scanning-bg);[m
[32m+[m[32m  color: var(--status-scanning-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-primary);[m
 }[m
 [m
 .log-item-line.success {[m
[31m-  background: #f0fdf4;[m
[31m-  color: #166534;[m
[31m-  border-left: 4px solid #22c55e;[m
[32m+[m[32m  background: var(--status-success-bg);[m
[32m+[m[32m  color: var(--status-success-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-success);[m
 }[m
 [m
 .log-item-line.error {[m
[31m-  background: #fef2f2;[m
[31m-  color: #991b1b;[m
[31m-  border-left: 4px solid #ef4444;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-danger);[m
 }[m
 [m
 .face-preview-box {[m
[36m@@ -260,11 +260,11 @@[m
   border-radius: 6px;[m
 }[m
 [m
[31m-.post-badge-type.image { background: #fdf2f8; color: #db2777; }[m
[31m-.post-badge-type.video { background: #f5f3ff; color: #7c3aed; }[m
[31m-.post-badge-type.audio { background: #ecfdf5; color: #059669; }[m
[31m-.post-badge-type.game { background: #fff7ed; color: #ea580c; }[m
[31m-.post-badge-type.text { background: #fef3c7; color: #d97706; }[m
[32m+[m[32m.post-badge-type.image { background: var(--badge-image-bg); color: var(--badge-image-fg); }[m
[32m+[m[32m.post-badge-type.video { background: var(--badge-video-bg); color: var(--badge-video-fg); }[m
[32m+[m[32m.post-badge-type.audio { background: var(--badge-audio-bg); color: var(--badge-audio-fg); }[m
[32m+[m[32m.post-badge-type.game { background: var(--badge-game-bg); color: var(--badge-game-fg); }[m
[32m+[m[32m.post-badge-type.text { background: var(--badge-text-bg); color: var(--badge-text-fg); }[m
 [m
 .post-item-content {[m
   text-align: left;[m
[36m@@ -375,8 +375,8 @@[m
 [m
 .article-badge-cat {[m
   align-self: flex-start;[m
[31m-  background: #e0f2fe;[m
[31m-  color: #0369a1;[m
[32m+[m[32m  background: var(--badge-category-bg);[m
[32m+[m[32m  color: var(--badge-category-fg);[m
   font-size: 0.7rem;[m
   font-weight: 800;[m
   text-transform: uppercase;[m
[36m@@ -927,3 +927,52 @@[m
   color: var(--text-title);[m
   font-weight: 600;[m
 }[m
[32m+[m
[32m+[m[32m.feed-error-text {[m
[32m+[m[32m  padding: 24px;[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.feed-action-btn-danger {[m
[32m+[m[32m  max-width: 120px;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  border-color: var(--accent-danger);[m
[32m+[m[32m  color: var(--accent-danger);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.feed-action-btn-danger:hover {[m
[32m+[m[32m  background: var(--accent-danger);[m
[32m+[m[32m  color: var(--text-on-accent);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m/* Post badge tokens — light theme uses pale bg + saturated fg,[m
[32m+[m[32m   dark theme uses translucent bg + light fg (defined in App.css). */[m
[32m+[m[32m.post-badge-type.image { background: var(--badge-image-bg); color: var(--badge-image-fg); }[m
[32m+[m[32m.post-badge-type.video { background: var(--badge-video-bg); color: var(--badge-video-fg); }[m
[32m+[m[32m.post-badge-type.audio { background: var(--badge-audio-bg); color: var(--badge-audio-fg); }[m
[32m+[m[32m.post-badge-type.game { background: var(--badge-game-bg); color: var(--badge-game-fg); }[m
[32m+[m[32m.post-badge-type.text { background: var(--badge-text-bg); color: var(--badge-text-fg); }[m
[32m+[m
[32m+[m[32m/* Status colors for scanner log rows */[m
[32m+[m[32m.log-item-line.scanning {[m
[32m+[m[32m  background: var(--status-scanning-bg);[m
[32m+[m[32m  color: var(--status-scanning-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-primary);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.log-item-line.success {[m
[32m+[m[32m  background: var(--status-success-bg);[m
[32m+[m[32m  color: var(--status-success-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-success);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.log-item-line.error {[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m  border-left: 4px solid var(--accent-danger);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.article-badge-cat {[m
[32m+[m[32m  background: var(--badge-category-bg);[m
[32m+[m[32m  color: var(--badge-category-fg);[m
[32m+[m[32m}[m
[1mdiff --git a/frontend/src/pages/Feed/Feed.jsx b/frontend/src/pages/Feed/Feed.jsx[m
[1mindex f30f53a..1032c97 100644[m
[1m--- a/frontend/src/pages/Feed/Feed.jsx[m
[1m+++ b/frontend/src/pages/Feed/Feed.jsx[m
[36m@@ -1,4 +1,5 @@[m
 import React, { useState, useEffect, useRef } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './Feed.css';[m
 import { resolveBackendOrigin } from '../../lib/apiBase';[m
 import * as api from '../../services/api';[m
[36m@@ -20,7 +21,29 @@[m [mconst POST_REACTION_EMOJIS = [[m
   { key: 'wow',   icon: '😮' },[m
 ];[m
 [m
[32m+[m[32m// Verb mapping for the friends-activity feed. Keys combine[m
[32m+[m[32m// content_type + event_type so a single lookup covers the[m
[32m+[m[32m// reasonable (type, action) pairs the BE emits.[m
[32m+[m[32mconst FRIEND_VERB_KEY = {[m
[32m+[m[32m  'knowledge|view': 'feed.friendAction.viewKnowledge',[m
[32m+[m[32m  'knowledge|like': 'feed.friendAction.likeKnowledge',[m
[32m+[m[32m  'music|play':     'feed.friendAction.playMusic',[m
[32m+[m[32m  'music|like':     'feed.friendAction.likeMusic',[m
[32m+[m[32m  'game|view':      'feed.friendAction.viewGame',[m
[32m+[m[32m  'game|like':      'feed.friendAction.likeGame',[m
[32m+[m[32m  'post|like':      'feed.friendAction.likePost',[m
[32m+[m[32m  'post|view':      'feed.friendAction.viewPost',[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mconst CONTENT_TYPE_ICON = {[m
[32m+[m[32m  knowledge: '📚',[m
[32m+[m[32m  music: '🎵',[m
[32m+[m[32m  game: '🎮',[m
[32m+[m[32m  post: '📰',[m
[32m+[m[32m};[m
[32m+[m
 export default function Feed({ currentUser, onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const { isBookmarked: isBmPost, toggle: toggleBmPost } = useBookmarks();[m
 [m
 [m
[36m@@ -55,12 +78,12 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
   // 4. Camera/Check-in state[m
   const [isCameraOn, setIsCameraOn] = useState(true);[m
   const [status, setStatus] = useState('idle');[m
[31m-  const [message, setMessage] = useState('Chưa có kết quả');[m
[32m+[m[32m  const [message, setMessage] = useState(t('dashboard.idle'));[m
   const [preview, setPreview] = useState(null);[m
   const [autoScan, setAutoScan] = useState(true);[m
   const [captureTrigger, setCaptureTrigger] = useState(0);[m
[31m-  const [scanLogs, setScanLogs] = useState([[m
[31m-    { id: 1, text: 'Thiết bị sẵn sàng', type: 'info' }[m
[32m+[m[32m  const [scanLogs, setScanLogs] = useState(() => [[m
[32m+[m[32m    { id: 1, text: t('feed.scanLog.ready'), type: 'info' }[m
   ]);[m
 [m
   // 5. Article & Game Popups / Overlays[m
[36m@@ -107,7 +130,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
       success: 0,[m
       failed: 0[m
     }));[m
[31m-    [m
[32m+[m
     logs.forEach(log => {[m
       if (log.timestamp) {[m
         try {[m
[36m@@ -123,7 +146,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
         }[m
       }[m
     });[m
[31m-    [m
[32m+[m
     const activeHours = hours.filter(h => h.success > 0 || h.failed > 0);[m
     if (activeHours.length === 0) {[m
       return [[m
[36m@@ -213,7 +236,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
 [m
     } catch (err) {[m
       console.error('Error loading dashboard data:', err);[m
[31m-      setError('Không thể tải dữ liệu Dashboard. Vui lòng đăng nhập lại.');[m
[32m+[m[32m      setError(t('feed.loadFail'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -225,11 +248,11 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
   const handleCapture = async (file) => {[m
     setPreview(URL.createObjectURL(file));[m
     setStatus('loading');[m
[31m-    setMessage('Đang xử lý ảnh...');[m
[31m-    [m
[32m+[m[32m    setMessage(t('dashboard.processing'));[m
[32m+[m
     // Add scanning indicator to logs[m
     setScanLogs(prev => [[m
[31m-      { id: Date.now(), text: '⏳ Đang quét...', type: 'scanning' },[m
[32m+[m[32m      { id: Date.now(), text: t('feed.scanLog.scanning'), type: 'scanning' },[m
       ...prev.slice(0, 2)[m
     ]);[m
 [m
[36m@@ -241,19 +264,19 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
         const data = response.data;[m
         setStatus('success');[m
         setMessage(`${data.message} - ${data.data.name}`);[m
[31m-        [m
[32m+[m
         // Add success to logs[m
         setScanLogs(prev => [[m
[31m-          { id: Date.now(), text: `✅ Thành công: ${data.data.name}`, type: 'success' },[m
[32m+[m[32m          { id: Date.now(), text: t('feed.scanLog.success', { name: data.data.name }), type: 'success' },[m
           ...prev.slice(0, 2)[m
         ]);[m
       } catch (error) {[m
         setStatus('error');[m
[31m-        setMessage('Không nhận diện được khuôn mặt.');[m
[31m-        [m
[32m+[m[32m        setMessage(t('feed.notRecognized'));[m
[32m+[m
         // Add error to logs[m
         setScanLogs(prev => [[m
[31m-          { id: Date.now(), text: '❌ Không nhận diện được', type: 'error' },[m
[32m+[m[32m          { id: Date.now(), text: t('feed.scanLog.error'), type: 'error' },[m
           ...prev.slice(0, 2)[m
         ]);[m
       }[m
[36m@@ -311,22 +334,30 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
   const formatDate = (dateStr) => {[m
     try {[m
       const d = new Date(dateStr);[m
[31m-      return d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });[m
[32m+[m[32m      return d.toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' });[m
     } catch {[m
       return dateStr;[m
     }[m
   };[m
 [m
[32m+[m[32m  // Helper: resolve the localized verb for a friend-activity row. If[m
[32m+[m[32m  // we don't have a mapping for the (content_type, event_type) pair,[m
[32m+[m[32m  // fall back to the raw event_type so we never render empty space.[m
[32m+[m[32m  const verbForEvent = (ev) => {[m
[32m+[m[32m    const key = FRIEND_VERB_KEY[`${ev.content_type}|${ev.event_type}`];[m
[32m+[m[32m    return key ? t(key) : ev.event_type;[m
[32m+[m[32m  };[m
[32m+[m
   return ([m
     <div className="dashboard-grid">[m
 [m
       {/* ==================== CỘT GIỮA: FEED & KIẾN THỨC ==================== */}[m
       <div className="dashboard-col center-col">[m
[31m-        [m
[32m+[m
         {/* BẢNG TIN MỚI NHẤT */}[m
         <section className="dashboard-card feed-card-section">[m
           <div className="card-title-header">[m
[31m-            <h3>Feed Mới Nhất</h3>[m
[32m+[m[32m            <h3>{t('feed.title')}</h3>[m
           </div>[m
 [m
           <div className="dashboard-posts-list">[m
[36m@@ -386,7 +417,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                             alt="Game Icon"[m
                             style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}[m
                           />[m
[31m-                          Chơi trực tuyến: {post.title}[m
[32m+[m[32m                          {t('feed.playOnline')}: {post.title}[m
                         </button>[m
                       </div>[m
                     )}[m
[36m@@ -414,23 +445,23 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                         className="post-comment-btn"[m
                         onClick={() => setCommentModalPost(post)}[m
                       >[m
[31m-                        💬 Bình luận[m
[32m+[m[32m                        💬 {t('feed.comment')}[m
                       </button>[m
                       <button[m
                         type="button"[m
                         className={`post-bookmark-btn ${isBmPost('post', post.id) ? 'filled' : ''}`}[m
                         onClick={() => toggleBmPost('post', post.id)}[m
[31m-                        title={isBmPost('post', post.id) ? 'Bỏ lưu' : 'Lưu bài đăng'}[m
[31m-                        aria-label={isBmPost('post', post.id) ? 'Bỏ lưu' : 'Lưu bài đăng'}[m
[32m+[m[32m                        title={isBmPost('post', post.id) ? t('feed.unsave') : t('feed.savePost')}[m
[32m+[m[32m                        aria-label={isBmPost('post', post.id) ? t('feed.unsave') : t('feed.savePost')}[m
                       >[m
[31m-                        {isBmPost('post', post.id) ? '🔖' : '⚪ Lưu'}[m
[32m+[m[32m                        {isBmPost('post', post.id) ? '🔖' : t('feed.save')}[m
                       </button>[m
                     </div>[m
                   )}[m
                 </div>[m
               ))[m
             ) : ([m
[31m-              <p className="no-data-text">Chưa có hoạt động nào được đăng.</p>[m
[32m+[m[32m              <p className="no-data-text">{t('feed.noPosts')}</p>[m
             )}[m
           </div>[m
         </section>[m
[36m@@ -438,7 +469,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
         {/* CHIA SẺ KIẾN THỨC NỔI BẬT */}[m
         <section className="dashboard-card knowledge-card-section">[m
           <div className="card-title-header">[m
[31m-            <h3>Chia Sẻ Kiến Thức Nổi Bật</h3>[m
[32m+[m[32m            <h3>{t('feed.knowledgeSection')}</h3>[m
           </div>[m
 [m
           <div className="dashboard-articles-grid">[m
[36m@@ -448,7 +479,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                   <div className="article-badge-cat">{article.category}</div>[m
                   <h4>{article.title}</h4>[m
                   <p className="article-excerpt">{article.description}</p>[m
[31m-                  [m
[32m+[m
                   <div className="article-author-stats">[m
                     <span className="author-name">👤 {article.author}</span>[m
                     <div className="stats-group">[m
[36m@@ -458,13 +489,13 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                   </div>[m
 [m
                   <div className="article-actions" onClick={(e) => e.stopPropagation()}>[m
[31m-                    <button className="article-read-btn" onClick={() => setSelectedArticle(article)}>Đọc Thêm →</button>[m
[31m-                    <button className="article-like-btn" onClick={() => handleLikeKnowledge(article.id)}>❤️ Thích</button>[m
[32m+[m[32m                    <button className="article-read-btn" onClick={() => setSelectedArticle(article)}>{t('feed.readMore')}</button>[m
[32m+[m[32m                    <button className="article-like-btn" onClick={() => handleLikeKnowledge(article.id)}>{t('feed.like')}</button>[m
                   </div>[m
                 </div>[m
               ))[m
             ) : ([m
[31m-              <p className="no-data-text">Không có bài viết kiến thức nào.</p>[m
[32m+[m[32m              <p className="no-data-text">{t('feed.noKnowledge')}</p>[m
             )}[m
           </div>[m
         </section>[m
[36m@@ -475,30 +506,13 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
         {currentUser && ([m
           <section className="dashboard-card feed-card-section">[m
             <div className="card-title-header">[m
[31m-              <h3>👥 Hoạt động bạn bè</h3>[m
[32m+[m[32m              <h3>{t('feed.friendsActivity')}</h3>[m
             </div>[m
             <div className="dashboard-posts-list">[m
               {friendsActivity.length > 0 ? ([m
                 friendsActivity.map((ev) => {[m
[31m-                  // Friendly action verb per (content_type, event_type).[m
[31m-                  // Keeping this mapping local avoids loading a[m
[31m-                  // shared constants module just for three strings.[m
[31m-                  const verb = ({[m
[31m-                    'knowledge|view': 'đã đọc',[m
[31m-                    'knowledge|like': 'đã thích',[m
[31m-                    'music|play': 'đã nghe',[m
[31m-                    'music|like': 'đã thích',[m
[31m-                    'game|view': 'đã xem',[m
[31m-                    'game|like': 'đã thích',[m
[31m-                    'post|like': 'đã thích',[m
[31m-                    'post|view': 'đã xem',[m
[31m-                  })[`${ev.content_type}|${ev.event_type}`] || ev.event_type;[m
[31m-                  const icon = ({[m
[31m-                    'knowledge': '📚',[m
[31m-                    'music': '🎵',[m
[31m-                    'game': '🎮',[m
[31m-                    'post': '📰',[m
[31m-                  })[ev.content_type] || '✨';[m
[32m+[m[32m                  const verb = verbForEvent(ev);[m
[32m+[m[32m                  const icon = CONTENT_TYPE_ICON[ev.content_type] || '✨';[m
                   return ([m
                     <div key={ev.id} className="dash-post-item friends-activity-item">[m
                       <div className="post-item-meta">[m
[36m@@ -533,7 +547,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                   );[m
                 })[m
               ) : ([m
[31m-                <p className="no-data-text">Bạn chưa theo dõi ai, hoặc bạn bè chưa có hoạt động nào gần đây.</p>[m
[32m+[m[32m                <p className="no-data-text">{t('feed.noFriends')}</p>[m
               )}[m
             </div>[m
           </section>[m
[36m@@ -543,26 +557,26 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
 [m
       {/* ==================== CỘT PHẢI: GAMES & THỐNG KÊ ==================== */}[m
       <div className="dashboard-col right-col">[m
[31m-        [m
[32m+[m
         {/* BLOG GAME & TIN TỨC */}[m
         <section className="dashboard-card games-card-section">[m
           <div className="card-title-header">[m
[31m-            <h3>Blog Game & Tin Tức</h3>[m
[32m+[m[32m            <h3>{t('feed.gameBlogSection')}</h3>[m
           </div>[m
 [m
           <div className="games-dashboard-container">[m
             {/* Category Filter */}[m
             <div className="games-dash-sidebar">[m
[31m-              <button [m
[31m-                className={activeGameCategory === 'all' ? 'active' : ''} [m
[32m+[m[32m              <button[m
[32m+[m[32m                className={activeGameCategory === 'all' ? 'active' : ''}[m
                 onClick={() => setActiveGameCategory('all')}[m
               >[m
[31m-                Tất Cả[m
[32m+[m[32m                {t('feed.allCategory')}[m
               </button>[m
               {gameCategories.map(cat => ([m
[31m-                <button [m
[32m+[m[32m                <button[m
                   key={cat}[m
[31m-                  className={activeGameCategory === cat ? 'active' : ''} [m
[32m+[m[32m                  className={activeGameCategory === cat ? 'active' : ''}[m
                   onClick={() => setActiveGameCategory(cat)}[m
                 >[m
                   {cat}[m
[36m@@ -579,10 +593,10 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                       {game.image_url ? ([m
                         game.image_url[m
                       ) : ([m
[31m-                        <img [m
[31m-                          src="/game-icon.png" [m
[31m-                          alt="Game Icon" [m
[31m-                          style={{ width: '28px', height: '28px', objectFit: 'contain' }} [m
[32m+[m[32m                        <img[m
[32m+[m[32m                          src="/game-icon.png"[m
[32m+[m[32m                          alt="Game Icon"[m
[32m+[m[32m                          style={{ width: '28px', height: '28px', objectFit: 'contain' }}[m
                         />[m
                       )}[m
                     </div>[m
[36m@@ -594,14 +608,14 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                         <span>❤️ {game.likes}</span>[m
                       </div>[m
                       <div className="game-item-actions" onClick={(e) => e.stopPropagation()}>[m
[31m-                        <button className="btn-read" onClick={() => setSelectedGame(game)}>📖 Đọc</button>[m
[31m-                        <button className="btn-like" onClick={() => handleLikeGame(game.id)}>❤️ Thích</button>[m
[32m+[m[32m                        <button className="btn-read" onClick={() => setSelectedGame(game)}>📖 {t('feed.read')}</button>[m
[32m+[m[32m                        <button className="btn-like" onClick={() => handleLikeGame(game.id)}>{t('feed.like')}</button>[m
                       </div>[m
                     </div>[m
                   </div>[m
                 ))[m
               ) : ([m
[31m-                <p className="no-data-text" style={{ padding: '20px' }}>Không có bài viết game.</p>[m
[32m+[m[32m                <p className="no-data-text" style={{ padding: '20px' }}>{t('feed.noGames')}</p>[m
               )}[m
             </div>[m
           </div>[m
[36m@@ -611,7 +625,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
         {currentUser && currentUser.role === 'admin' && ([m
           <section className="dashboard-card statistics-card-section">[m
             <div className="card-title-header">[m
[31m-              <h3>Thống Kê Người Dùng</h3>[m
[32m+[m[32m              <h3>{t('feed.userStatsSection')}</h3>[m
             </div>[m
 [m
             <div className="stats-dash-container">[m
[36m@@ -621,8 +635,8 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                   <thead>[m
                     <tr>[m
                       <th>ID</th>[m
[31m-                      <th>Tên</th>[m
[31m-                      <th>Số ảnh</th>[m
[32m+[m[32m                      <th>{t('feed.statName')}</th>[m
[32m+[m[32m                      <th>{t('feed.statPhotos')}</th>[m
                     </tr>[m
                   </thead>[m
                   <tbody>[m
[36m@@ -641,19 +655,19 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
               <div className="stats-chart-column" style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>[m
                 {/* Tabs */}[m
                 <div className="chart-tabs-nav">[m
[31m-                  <button [m
[32m+[m[32m                  <button[m
                     type="button"[m
                     className={`chart-tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}[m
                     onClick={() => setActiveTab('checkin')}[m
                   >[m
[31m-                    📊 Check-in[m
[32m+[m[32m                    📊 {t('feed.checkinTab')}[m
                   </button>[m
[31m-                  <button [m
[32m+[m[32m                  <button[m
                     type="button"[m
                     className={`chart-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}[m
                     onClick={() => setActiveTab('songs')}[m
                   >[m
[31m-                    🎵 Top 5 Nhạc[m
[32m+[m[32m                    🎵 {t('feed.statTopSongs')}[m
                   </button>[m
                 </div>[m
 [m
[36m@@ -676,8 +690,8 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                         <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />[m
                         <Tooltip contentStyle={{ fontSize: '11px' }} />[m
                         <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />[m
[31m-                        <Area type="monotone" dataKey="success" name="Thành công" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />[m
[31m-                        <Area type="monotone" dataKey="failed" name="Thất bại" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />[m
[32m+[m[32m                        <Area type="monotone" dataKey="success" name={t('feed.legend.success')} stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />[m
[32m+[m[32m                        <Area type="monotone" dataKey="failed" name={t('feed.legend.failed')} stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />[m
                       </AreaChart>[m
                     </ResponsiveContainer>[m
                   </div>[m
[36m@@ -690,8 +704,8 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                         <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={70} />[m
                         <Tooltip contentStyle={{ fontSize: '11px' }} />[m
                         <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />[m
[31m-                        <Bar dataKey="plays" name="Lượt nghe" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10} />[m
[31m-                        <Bar dataKey="likes" name="Thích" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={10} />[m
[32m+[m[32m                        <Bar dataKey="plays" name={t('feed.legend.plays')} fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10} />[m
[32m+[m[32m                        <Bar dataKey="likes" name={t('feed.legend.likes')} fill="#ec4899" radius={[0, 4, 4, 0]} barSize={10} />[m
                       </BarChart>[m
                     </ResponsiveContainer>[m
                   </div>[m
[36m@@ -711,14 +725,14 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
           <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>[m
             <div className="game-modal-header">[m
               <h2>[m
[31m-                <img [m
[31m-                  src="/game-icon.png" [m
[31m-                  alt="Game" [m
[31m-                  style={{ width: '22px', height: '22px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' }} [m
[32m+[m[32m                <img[m
[32m+[m[32m                  src="/game-icon.png"[m
[32m+[m[32m                  alt="Game"[m
[32m+[m[32m                  style={{ width: '22px', height: '22px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' }}[m
                 />[m
                 {activeGameUrl.title}[m
               </h2>[m
[31m-              <button className="close-game-btn" onClick={() => setActiveGameUrl(null)}>✕ Đóng</button>[m
[32m+[m[32m              <button className="close-game-btn" onClick={() => setActiveGameUrl(null)}>✕ {t('feed.modalClose')}</button>[m
             </div>[m
             <div className="game-modal-body">[m
               {(() => {[m
[36m@@ -732,8 +746,8 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                 }[m
                 if (!isTrusted) {[m
                   return ([m
[31m-                    <div style={{ padding: '24px', color: '#ff6b6b' }}>[m
[31m-                      ⚠️ Không thể mở game từ nguồn không đáng tin cậy: {fullUrl}[m
[32m+[m[32m                    <div className="feed-error-text">[m
[32m+[m[32m                      ⚠️ {t('feed.untrustedGame')}: {fullUrl}[m
                       {/* Cookie migration done: the JWT now lives in an[m
                           httpOnly cookie the iframe can't read, so this[m
                           URL guard is the only remaining defense for[m
[36m@@ -767,10 +781,10 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
             <div className="modal-header-detail">[m
               <h2>{selectedArticle.title}</h2>[m
               <div className="modal-meta">[m
[31m-                <span>📁 Chủ đề: <strong>{selectedArticle.category}</strong></span>[m
[31m-                <span>👤 Tác giả: <strong>{selectedArticle.author}</strong></span>[m
[31m-                <span>👁️ {selectedArticle.views} lượt xem</span>[m
[31m-                <span>❤️ {selectedArticle.likes} lượt thích</span>[m
[32m+[m[32m                <span>📁 {t('feed.modalCategory')}: <strong>{selectedArticle.category}</strong></span>[m
[32m+[m[32m                <span>👤 {t('feed.modalAuthor')}: <strong>{selectedArticle.author}</strong></span>[m
[32m+[m[32m                <span>👁️ {selectedArticle.views} {t('feed.viewsLabel')}</span>[m
[32m+[m[32m                <span>❤️ {selectedArticle.likes} {t('feed.likesLabel')}</span>[m
               </div>[m
             </div>[m
             <div className="modal-body">[m
[36m@@ -788,13 +802,12 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
                   handleLikeKnowledge(selectedArticle.id);[m
                   setSelectedArticle(prev => ({ ...prev, likes: prev.likes + 1 }));[m
                 }}[m
[31m-                className="action-btn"[m
[31m-                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}[m
[32m+[m[32m                className="action-btn feed-action-btn-danger"[m
               >[m
[31m-                ❤️ Thích bài viết[m
[32m+[m[32m                ❤️ {t('feed.modalLikeArticle')}[m
               </button>[m
               <button onClick={() => setSelectedArticle(null)} className="action-btn" style={{ maxWidth: '100px' }}>[m
[31m-                Đóng[m
[32m+[m[32m                {t('feed.modalClose')}[m
               </button>[m
             </div>[m
           </div>[m
[36m@@ -811,8 +824,8 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
             <div className="modal-header-detail">[m
               <h2>{commentModalPost.title}</h2>[m
               <div className="modal-meta">[m
[31m-                <span>👤 Tác giả: <strong>@{commentModalPost.user_id}</strong></span>[m
[31m-                <span>📁 Loại: <strong>{commentModalPost.post_type}</strong></span>[m
[32m+[m[32m                <span>👤 {t('feed.modalAuthor')}: <strong>@{commentModalPost.user_id}</strong></span>[m
[32m+[m[32m                <span>📁 {t('feed.modalType')}: <strong>{commentModalPost.post_type}</strong></span>[m
               </div>[m
             </div>[m
             <div className="modal-body">[m
[36m@@ -828,7 +841,7 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
             </div>[m
             <div className="modal-footer">[m
               <button onClick={() => setCommentModalPost(null)} className="action-btn" style={{ maxWidth: '100px' }}>[m
[31m-                Đóng[m
[32m+[m[32m                {t('feed.modalClose')}[m
               </button>[m
             </div>[m
           </div>[m
[36m@@ -843,27 +856,26 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
             <div className="modal-header-detail">[m
               <h2>{selectedGame.title}</h2>[m
               <div className="modal-meta">[m
[31m-                <span>📁 Thể loại: <strong>{selectedGame.category}</strong></span>[m
[31m-                <span>👁️ {selectedGame.views + 1} lượt xem</span>[m
[31m-                <span>❤️ {selectedGame.likes} lượt thích</span>[m
[32m+[m[32m                <span>📁 {t('feed.modalCategory')}: <strong>{selectedGame.category}</strong></span>[m
[32m+[m[32m                <span>👁️ {selectedGame.views + 1} {t('feed.viewsLabel')}</span>[m
[32m+[m[32m                <span>❤️ {selectedGame.likes} {t('feed.likesLabel')}</span>[m
               </div>[m
             </div>[m
             <div className="modal-body">[m
               <p style={{ whiteSpace: 'pre-line' }}>{selectedGame.content || selectedGame.description}</p>[m
             </div>[m
             <div className="modal-footer">[m
[31m-              <button [m
[32m+[m[32m              <button[m
                 onClick={() => {[m
                   handleLikeGame(selectedGame.id);[m
                   setSelectedGame(prev => ({ ...prev, likes: prev.likes + 1 }));[m
[31m-                }} [m
[31m-                className="action-btn"[m
[31m-                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}[m
[32m+[m[32m                }}[m
[32m+[m[32m                className="action-btn feed-action-btn-danger"[m
               >[m
[31m-                ❤️ Thích bài viết[m
[32m+[m[32m                ❤️ {t('feed.modalLikeArticle')}[m
               </button>[m
               <button onClick={() => setSelectedGame(null)} className="action-btn" style={{ maxWidth: '100px' }}>[m
[31m-                Đóng[m
[32m+[m[32m                {t('feed.modalClose')}[m
               </button>[m
             </div>[m
           </div>[m
[36m@@ -872,4 +884,4 @@[m [mexport default function Feed({ currentUser, onNavigate }) {[m
 [m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Feed/PostModal.jsx b/frontend/src/pages/Feed/PostModal.jsx[m
[1mindex 9375807..c871f8c 100644[m
[1m--- a/frontend/src/pages/Feed/PostModal.jsx[m
[1m+++ b/frontend/src/pages/Feed/PostModal.jsx[m
[36m@@ -1,16 +1,18 @@[m
 import React, { useState } from 'react';[m
 import './PostModal.css';[m
 import * as api from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 export default function PostModal({ onClose, onPostCreated }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [postType, setPostType] = useState('text'); // 'image', 'video', 'audio', 'game', 'text'[m
   const [title, setTitle] = useState('');[m
   const [description, setDescription] = useState('');[m
[31m-  [m
[32m+[m
   // File states[m
   const [mainFile, setMainFile] = useState(null);[m
   const [thumbnailFile, setThumbnailFile] = useState(null);[m
[31m-  [m
[32m+[m
   // Upload and loading states[m
   const [loading, setLoading] = useState(false);[m
   const [progress, setProgress] = useState(0);[m
[36m@@ -33,25 +35,25 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
   const handleSubmit = async (e) => {[m
     e.preventDefault();[m
     if (!title.trim()) {[m
[31m-      setError('Vui lòng nhập tiêu đề bài đăng.');[m
[32m+[m[32m      setError(t('post.err.titleRequired'));[m
       return;[m
     }[m
 [m
     // Validation for files based on post type[m
     if (postType === 'image' && !mainFile) {[m
[31m-      setError('Vui lòng chọn một tệp hình ảnh.');[m
[32m+[m[32m      setError(t('post.err.imageRequired'));[m
       return;[m
     }[m
     if (postType === 'video' && !mainFile) {[m
[31m-      setError('Vui lòng chọn một tệp video.');[m
[32m+[m[32m      setError(t('post.err.videoRequired'));[m
       return;[m
     }[m
     if (postType === 'audio' && !mainFile) {[m
[31m-      setError('Vui lòng chọn một tệp âm thanh.');[m
[32m+[m[32m      setError(t('post.err.audioRequired'));[m
       return;[m
     }[m
     if (postType === 'game' && !mainFile) {[m
[31m-      setError('Vui lòng chọn tệp Game (.zip).');[m
[32m+[m[32m      setError(t('post.err.gameRequired'));[m
       return;[m
     }[m
 [m
[36m@@ -111,7 +113,7 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
 [m
     } catch (err) {[m
       console.error('Error creating post:', err);[m
[31m-      setError(err.response?.data?.detail || 'Đã xảy ra lỗi trong quá trình đăng bài. Vui lòng thử lại.');[m
[32m+[m[32m      setError(err.response?.data?.detail || t('post.err.generic'));[m
       // Best-effort orphan cleanup. Safe to await sequentially because we[m
       // are already on the failure path; user is shown the error message.[m
       if (uploadedUrls.length) {[m
[36m@@ -124,11 +126,11 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
 [m
   const getMainFileInputLabel = () => {[m
     switch (postType) {[m
[31m-      case 'image': return 'Chọn tệp ảnh (JPG, PNG, GIF) *';[m
[31m-      case 'video': return 'Chọn tệp video (MP4) *';[m
[31m-      case 'audio': return 'Chọn tệp âm thanh (MP3, WAV) *';[m
[31m-      case 'game': return 'Chọn tệp lưu trữ Game (.zip) *';[m
[31m-      default: return 'Tệp đính kèm';[m
[32m+[m[32m      case 'image': return t('post.fileImage');[m
[32m+[m[32m      case 'video': return t('post.fileVideo');[m
[32m+[m[32m      case 'audio': return t('post.fileAudio');[m
[32m+[m[32m      case 'game': return t('post.fileGame');[m
[32m+[m[32m      default: return t('post.fileDefault');[m
     }[m
   };[m
 [m
[36m@@ -146,73 +148,73 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
     <div className="post-modal-overlay" onClick={onClose}>[m
       <div className="post-modal-content" onClick={e => e.stopPropagation()}>[m
         <div className="post-modal-header">[m
[31m-          <h2>➕ Tạo bài đăng mới</h2>[m
[32m+[m[32m          <h2>{t('post.modalTitle')}</h2>[m
           <button className="post-modal-close" onClick={onClose}>✕</button>[m
         </div>[m
 [m
         {error && <div className="post-error-banner">❌ {error}</div>}[m
[31m-        {success && <div className="post-success-banner">✔️ Đăng bài viết thành công!</div>}[m
[32m+[m[32m        {success && <div className="post-success-banner">{t('post.success')}</div>}[m
 [m
         <form onSubmit={handleSubmit} className="post-form">[m
           {/* Post Type Tabs */}[m
           <div className="post-type-selector">[m
[31m-            <button [m
[32m+[m[32m            <button[m
               type="button"[m
[31m-              className={postType === 'text' ? 'active' : ''} [m
[32m+[m[32m              className={postType === 'text' ? 'active' : ''}[m
               onClick={() => { setPostType('text'); setMainFile(null); setThumbnailFile(null); setError(''); }}[m
               disabled={loading}[m
             >[m
[31m-              📝 Bài viết[m
[32m+[m[32m              {t('post.typeText')}[m
             </button>[m
[31m-            <button [m
[31m-              type="button" [m
[31m-              className={postType === 'image' ? 'active' : ''} [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="button"[m
[32m+[m[32m              className={postType === 'image' ? 'active' : ''}[m
               onClick={() => { setPostType('image'); setMainFile(null); setThumbnailFile(null); setError(''); }}[m
               disabled={loading}[m
             >[m
[31m-              📸 Ảnh[m
[32m+[m[32m              {t('post.typeImage')}[m
             </button>[m
[31m-            <button [m
[31m-              type="button" [m
[31m-              className={postType === 'video' ? 'active' : ''} [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="button"[m
[32m+[m[32m              className={postType === 'video' ? 'active' : ''}[m
               onClick={() => { setPostType('video'); setMainFile(null); setThumbnailFile(null); setError(''); }}[m
               disabled={loading}[m
             >[m
[31m-              🎥 Video[m
[32m+[m[32m              {t('post.typeVideo')}[m
             </button>[m
[31m-            <button [m
[31m-              type="button" [m
[31m-              className={postType === 'audio' ? 'active' : ''} [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="button"[m
[32m+[m[32m              className={postType === 'audio' ? 'active' : ''}[m
               onClick={() => { setPostType('audio'); setMainFile(null); setThumbnailFile(null); setError(''); }}[m
               disabled={loading}[m
             >[m
[31m-              <img [m
[31m-                src="/music-icon.png" [m
[31m-                alt="Music" [m
[31m-                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }} [m
[32m+[m[32m              <img[m
[32m+[m[32m                src="/music-icon.png"[m
[32m+[m[32m                alt="Music"[m
[32m+[m[32m                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}[m
               />[m
[31m-              Nhạc[m
[32m+[m[32m              {t('post.typeAudio')}[m
             </button>[m
[31m-            <button [m
[31m-              type="button" [m
[31m-              className={postType === 'game' ? 'active' : ''} [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="button"[m
[32m+[m[32m              className={postType === 'game' ? 'active' : ''}[m
               onClick={() => { setPostType('game'); setMainFile(null); setThumbnailFile(null); setError(''); }}[m
               disabled={loading}[m
             >[m
[31m-              <img [m
[31m-                src="/game-icon.png" [m
[31m-                alt="Game" [m
[31m-                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }} [m
[32m+[m[32m              <img[m
[32m+[m[32m                src="/game-icon.png"[m
[32m+[m[32m                alt="Game"[m
[32m+[m[32m                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}[m
               />[m
[31m-              Game[m
[32m+[m[32m              {t('post.typeGame')}[m
             </button>[m
           </div>[m
 [m
           <div className="form-group">[m
[31m-            <label>Tiêu đề bài đăng *</label>[m
[31m-            <input [m
[31m-              type="text" [m
[31m-              placeholder="Nhập tiêu đề hấp dẫn..." [m
[32m+[m[32m            <label>{t('post.titleLabel')}</label>[m
[32m+[m[32m            <input[m
[32m+[m[32m              type="text"[m
[32m+[m[32m              placeholder={t('post.titlePh')}[m
               value={title}[m
               onChange={(e) => setTitle(e.target.value)}[m
               disabled={loading}[m
[36m@@ -221,9 +223,9 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
           </div>[m
 [m
           <div className="form-group">[m
[31m-            <label>{postType === 'text' ? 'Nội dung bài viết' : 'Mô tả / Caption'}</label>[m
[31m-            <textarea [m
[31m-              placeholder="Nội dung chi tiết..." [m
[32m+[m[32m            <label>{postType === 'text' ? t('post.textContent') : t('post.descContent')}</label>[m
[32m+[m[32m            <textarea[m
[32m+[m[32m              placeholder={t('post.contentPh')}[m
               rows={postType === 'text' ? 8 : 4}[m
               value={description}[m
               onChange={(e) => setDescription(e.target.value)}[m
[36m@@ -234,9 +236,9 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
           {postType !== 'text' && ([m
             <div className="form-group file-group">[m
               <label>{getMainFileInputLabel()}</label>[m
[31m-              <input [m
[31m-                type="file" [m
[31m-                accept={getMainFileAcceptType()} [m
[32m+[m[32m              <input[m
[32m+[m[32m                type="file"[m
[32m+[m[32m                accept={getMainFileAcceptType()}[m
                 onChange={handleMainFileChange}[m
                 disabled={loading}[m
               />[m
[36m@@ -247,10 +249,10 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
           {/* Conditional thumbnail for game or audio */}[m
           {(postType === 'audio' || postType === 'game') && ([m
             <div className="form-group file-group">[m
[31m-              <label>Ảnh bìa / Cover Image (Tùy chọn)</label>[m
[31m-              <input [m
[31m-                type="file" [m
[31m-                accept="image/*" [m
[32m+[m[32m              <label>{t('post.coverImage')}</label>[m
[32m+[m[32m              <input[m
[32m+[m[32m                type="file"[m
[32m+[m[32m                accept="image/*"[m
                 onChange={handleThumbnailFileChange}[m
                 disabled={loading}[m
               />[m
[36m@@ -262,13 +264,13 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
           {loading && ([m
             <div className="post-progress-container">[m
               <div className="progress-label">[m
[31m-                {uploadStage === 'main' && `Đang tải tệp chính lên: ${progress}%`}[m
[31m-                {uploadStage === 'thumbnail' && `Đang tải ảnh bìa lên: ${progress}%`}[m
[31m-                {uploadStage === 'submitting' && 'Đang đồng bộ hóa dữ liệu & giải nén...'}[m
[32m+[m[32m                {uploadStage === 'main' && t('post.uploading', { percent: progress })}[m
[32m+[m[32m                {uploadStage === 'thumbnail' && t('post.uploadingThumb', { percent: progress })}[m
[32m+[m[32m                {uploadStage === 'submitting' && t('post.submitting')}[m
               </div>[m
               <div className="progress-bar-bg">[m
[31m-                <div [m
[31m-                  className="progress-bar-fill" [m
[32m+[m[32m                <div[m
[32m+[m[32m                  className="progress-bar-fill"[m
                   style={{ width: `${uploadStage === 'submitting' ? 100 : progress}%` }}[m
                 />[m
               </div>[m
[36m@@ -276,24 +278,24 @@[m [mexport default function PostModal({ onClose, onPostCreated }) {[m
           )}[m
 [m
           <div className="post-form-actions">[m
[31m-            <button [m
[31m-              type="button" [m
[31m-              className="btn-cancel" [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="button"[m
[32m+[m[32m              className="btn-cancel"[m
               onClick={onClose}[m
               disabled={loading}[m
             >[m
[31m-              Hủy[m
[32m+[m[32m              {t('post.cancel')}[m
             </button>[m
[31m-            <button [m
[31m-              type="submit" [m
[31m-              className="btn-submit" [m
[32m+[m[32m            <button[m
[32m+[m[32m              type="submit"[m
[32m+[m[32m              className="btn-submit"[m
               disabled={loading}[m
             >[m
[31m-              {loading ? 'Đang xử lý...' : 'Đăng bài'}[m
[32m+[m[32m              {loading ? t('post.submitting2') : t('post.submit')}[m
             </button>[m
           </div>[m
         </form>[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Games/Games.css b/frontend/src/pages/Games/Games.css[m
[1mindex 5b45bf6..9dd06c8 100644[m
[1m--- a/frontend/src/pages/Games/Games.css[m
[1m+++ b/frontend/src/pages/Games/Games.css[m
[36m@@ -56,16 +56,16 @@[m
 }[m
 [m
 .menu-item.active {[m
[31m-  background: #6366f1;[m
[31m-  border-color: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-weight: 600;[m
 }[m
 [m
 .sidebar-footer {[m
   margin-top: 30px;[m
   padding-top: 20px;[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
 }[m
 [m
 .stats {[m
[36m@@ -198,8 +198,8 @@[m
 [m
 .action-btn.bookmark-active {[m
   background: rgba(168, 85, 247, 0.18);[m
[31m-  border-color: rgba(168, 85, 247, 0.55);[m
[31m-  color: #6d28d9;[m
[32m+[m[32m  border-color: var(--accent-pink);[m
[32m+[m[32m  color: var(--accent-purple);[m
 }[m
 [m
 /* Scrollbar styling */[m
[36m@@ -210,18 +210,18 @@[m
 [m
 .games-sidebar::-webkit-scrollbar-track,[m
 .games-main::-webkit-scrollbar-track {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .games-sidebar::-webkit-scrollbar-thumb,[m
 .games-main::-webkit-scrollbar-thumb {[m
[31m-  background: rgba(255, 255, 255, 0.3);[m
[32m+[m[32m  background: var(--border-color);[m
   border-radius: 3px;[m
 }[m
 [m
 .games-sidebar::-webkit-scrollbar-thumb:hover,[m
 .games-main::-webkit-scrollbar-thumb:hover {[m
[31m-  background: rgba(255, 255, 255, 0.5);[m
[32m+[m[32m  background: var(--text-muted);[m
 }[m
 [m
 /* Modal styling for reading game posts */[m
[36m@@ -241,15 +241,15 @@[m
 }[m
 [m
 .modal-container {[m
[31m-  background: rgba(30, 30, 60, 0.95);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.2);[m
[31m-  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
   border-radius: 16px;[m
   width: 90%;[m
   max-width: 650px;[m
   max-height: 80%;[m
   overflow-y: auto;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 30px;[m
   position: relative;[m
   animation: slideUp 0.3s ease;[m
[36m@@ -261,39 +261,39 @@[m
   right: 15px;[m
   background: transparent;[m
   border: none;[m
[31m-  color: rgba(255, 255, 255, 0.7);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 24px;[m
   cursor: pointer;[m
   transition: color 0.3s ease;[m
 }[m
 [m
 .modal-close-btn:hover {[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .modal-header-detail {[m
   margin-bottom: 20px;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   padding-bottom: 15px;[m
 }[m
 [m
 .modal-header-detail h2 {[m
   margin: 0 0 10px 0;[m
   font-size: 24px;[m
[31m-  color: #fff;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .modal-meta {[m
   display: flex;[m
   gap: 15px;[m
   font-size: 13px;[m
[31m-  color: rgba(255, 255, 255, 0.6);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .modal-body {[m
   font-size: 16px;[m
   line-height: 1.6;[m
[31m-  color: rgba(255, 255, 255, 0.9);[m
[32m+[m[32m  color: var(--text-main);[m
   margin-bottom: 25px;[m
 }[m
 [m
[36m@@ -303,6 +303,29 @@[m
   gap: 10px;[m
 }[m
 [m
[32m+[m[32m.games-error-text {[m
[32m+[m[32m  text-align: center;[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.games-empty-text {[m
[32m+[m[32m  grid-column: 1 / -1;[m
[32m+[m[32m  text-align: center;[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.games-action-btn-danger {[m
[32m+[m[32m  max-width: 120px;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  border-color: var(--accent-danger);[m
[32m+[m[32m  color: var(--accent-danger);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.games-action-btn-danger:hover {[m
[32m+[m[32m  background: var(--accent-danger);[m
[32m+[m[32m  color: var(--text-on-accent);[m
[32m+[m[32m}[m
[32m+[m
 @keyframes fadeIn {[m
   from { opacity: 0; }[m
   to { opacity: 1; }[m
[1mdiff --git a/frontend/src/pages/Games/Sidebar.jsx b/frontend/src/pages/Games/Sidebar.jsx[m
[1mindex bf491d9..6f87ac9 100644[m
[1m--- a/frontend/src/pages/Games/Sidebar.jsx[m
[1m+++ b/frontend/src/pages/Games/Sidebar.jsx[m
[36m@@ -1,6 +1,8 @@[m
 import React from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 export default function Sidebar({ selectedLibrary, onSelectLibrary, stats, categories = [] }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const getCategoryEmoji = (cat) => {[m
     const emojis = {[m
       'Puzzle': '🧩',[m
[36m@@ -15,14 +17,14 @@[m [mexport default function Sidebar({ selectedLibrary, onSelectLibrary, stats, categ[m
   return ([m
     <div className="games-sidebar">[m
       <div className="sidebar-header">[m
[31m-        <h3>📰 CHỦ ĐỀ BLOG</h3>[m
[32m+[m[32m        <h3>📰 {t('games.blogTopics')}</h3>[m
       </div>[m
       <nav className="sidebar-menu">[m
         <button[m
           className={`menu-item ${selectedLibrary === 'all' ? 'active' : ''}`}[m
           onClick={() => onSelectLibrary('all')}[m
         >[m
[31m-          📚 Tất Cả Bài Viết[m
[32m+[m[32m          📚 {t('games.allArticles')}[m
         </button>[m
         {categories.map(cat => ([m
           <button[m
[36m@@ -37,10 +39,10 @@[m [mexport default function Sidebar({ selectedLibrary, onSelectLibrary, stats, categ[m
 [m
       <div className="sidebar-footer">[m
         <div className="stats">[m
[31m-          <p>✍️ Thể loại bài viết: {stats?.totalCategories || 0}</p>[m
[31m-          <p>📰 Tổng số bài viết: {stats?.totalPosts || 0}</p>[m
[32m+[m[32m          <p>✍️ {t('games.sidebarCategoryLabel')} {stats?.totalCategories || 0}</p>[m
[32m+[m[32m          <p>📰 {t('games.sidebarTotalLabel')} {stats?.totalPosts || 0}</p>[m
         </div>[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Games/index.jsx b/frontend/src/pages/Games/index.jsx[m
[1mindex f6fe7a3..121fd8a 100644[m
[1m--- a/frontend/src/pages/Games/index.jsx[m
[1m+++ b/frontend/src/pages/Games/index.jsx[m
[36m@@ -3,8 +3,10 @@[m [mimport Sidebar from './Sidebar';[m
 import './Games.css';[m
 import * as api from '../../services/api';[m
 import { useBookmarks } from '../../lib/BookmarksContext';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 export default function Games({ searchOpenGameId = null, onConsumeSearchOpen }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const { isBookmarked: isBm, toggle: toggleBm } = useBookmarks();[m
   const [selectedLibrary, setSelectedLibrary] = useState('all');[m
   const [games, setGames] = useState([]);[m
[36m@@ -63,7 +65,7 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
       setGames(response.data || []);[m
     } catch (err) {[m
       console.error('Error loading games:', err);[m
[31m-      setError('Failed to load games');[m
[32m+[m[32m      setError(t('games.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -75,7 +77,7 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
       await api.viewGame(game.id);[m
       setSelectedGame(game);[m
       // Cập nhật lại số lượt xem trên UI bằng cách cộng thêm 1 hoặc load lại danh sách[m
[31m-      setGames(prevGames => [m
[32m+[m[32m      setGames(prevGames =>[m
         prevGames.map(g => g.id === game.id ? { ...g, views: g.views + 1 } : g)[m
       );[m
     } catch (err) {[m
[36m@@ -112,34 +114,38 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
 [m
   return ([m
     <div className="games-container">[m
[31m-      <Sidebar [m
[31m-        selectedLibrary={selectedLibrary} [m
[31m-        onSelectLibrary={setSelectedLibrary} [m
[31m-        stats={stats} [m
[31m-        categories={categories} [m
[32m+[m[32m      <Sidebar[m
[32m+[m[32m        selectedLibrary={selectedLibrary}[m
[32m+[m[32m        onSelectLibrary={setSelectedLibrary}[m
[32m+[m[32m        stats={stats}[m
[32m+[m[32m        categories={categories}[m
       />[m
       <div className="games-main">[m
         <div className="games-header">[m
           <h1>[m
[31m-            <img [m
[31m-              src="/game-icon.png" [m
[31m-              alt="Games Icon" [m
[31m-              style={{ width: '42px', height: '42px', display: 'inline-block', verticalAlign: 'middle', marginRight: '10px', borderRadius: '8px' }} [m
[32m+[m[32m            <img[m
[32m+[m[32m              src="/game-icon.png"[m
[32m+[m[32m              alt={t('games.altIcon')}[m
[32m+[m[32m              style={{ width: '42px', height: '42px', display: 'inline-block', verticalAlign: 'middle', marginRight: '10px', borderRadius: '8px' }}[m
             />[m
[31m-            Tin Tức & Blog Game[m
[32m+[m[32m            {t('games.heading')}[m
           </h1>[m
[31m-          <p>Cập nhật những bài viết, hướng dẫn và mẹo chơi game mới nhất</p>[m
[32m+[m[32m          <p>{t('games.subtitle')}</p>[m
         </div>[m
 [m
         <div className="games-content">[m
           {loading ? ([m
[31m-            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải danh sách bài viết...</p>[m
[32m+[m[32m            <p style={{ textAlign: 'center', color: 'white' }}>{t('games.loading')}</p>[m
           ) : error ? ([m
[31m-            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>[m
[32m+[m[32m            <p className="games-error-text">{error}</p>[m
           ) : ([m
             <>[m
               <section className="games-section">[m
[31m-                <h2>{selectedLibrary === 'all' ? '📰 Tất Cả Bài Viết' : `📁 Thể loại: ${selectedLibrary}`}</h2>[m
[32m+[m[32m                <h2>[m
[32m+[m[32m                  {selectedLibrary === 'all'[m
[32m+[m[32m                    ? <>📰 {t('games.allArticles')}</>[m
[32m+[m[32m                    : <>📁 {t('games.categoryPrefix')}{selectedLibrary}</>}[m
[32m+[m[32m                </h2>[m
                 <div className="games-grid">[m
                   {games.length > 0 ? ([m
                     games.map(game => ([m
[36m@@ -148,17 +154,17 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
                         <h3>{game.title}</h3>[m
                         <p>{game.description}</p>[m
                         <div className="game-stats">[m
[31m-                          <span>👁️ {game.views} lượt xem</span>[m
[31m-                          <span>❤️ {game.likes} thích</span>[m
[32m+[m[32m                          <span>👁️ {game.views} {t('games.viewsLabel')}</span>[m
[32m+[m[32m                          <span>❤️ {game.likes} {t('games.likesShort')}</span>[m
                         </div>[m
                         <div className="game-actions" onClick={(e) => e.stopPropagation()}>[m
[31m-                          <button onClick={() => handleViewGame(game)} className="action-btn">📖 Đọc bài</button>[m
[31m-                          <button onClick={() => handleLikeGame(game.id)} className="action-btn">❤️ Thích</button>[m
[32m+[m[32m                          <button onClick={() => handleViewGame(game)} className="action-btn">📖 {t('games.read')}</button>[m
[32m+[m[32m                          <button onClick={() => handleLikeGame(game.id)} className="action-btn">❤️ {t('games.like')}</button>[m
                           <button[m
                             onClick={() => toggleBm('game', game.id)}[m
                             className={`action-btn ${isBm('game', game.id) ? 'bookmark-active' : ''}`}[m
[31m-                            title={isBm('game', game.id) ? 'Bỏ lưu' : 'Lưu bài viết'}[m
[31m-                            aria-label={isBm('game', game.id) ? 'Bỏ lưu' : 'Lưu bài viết'}[m
[32m+[m[32m                            title={isBm('game', game.id) ? t('games.unbookmark') : t('games.bookmark')}[m
[32m+[m[32m                            aria-label={isBm('game', game.id) ? t('games.unbookmark') : t('games.bookmark')}[m
                           >[m
                             {isBm('game', game.id) ? '🔖' : '⚪'}[m
                           </button>[m
[36m@@ -166,9 +172,7 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
                       </div>[m
                     ))[m
                   ) : ([m
[31m-                    <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>[m
[31m-                      Không có bài viết nào[m
[31m-                    </p>[m
[32m+[m[32m                    <p className="games-empty-text">{t('games.noPosts')}</p>[m
                   )}[m
                 </div>[m
               </section>[m
[36m@@ -185,9 +189,9 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
             <div className="modal-header-detail">[m
               <h2>{selectedGame.title}</h2>[m
               <div className="modal-meta">[m
[31m-                <span>📁 Thể loại: <strong>{selectedGame.category}</strong></span>[m
[31m-                <span>👁️ {selectedGame.views + 1} lượt xem</span>[m
[31m-                <span>❤️ {selectedGame.likes} lượt thích</span>[m
[32m+[m[32m                <span>📁 {t('games.categoryLabel')} <strong>{selectedGame.category}</strong></span>[m
[32m+[m[32m                <span>👁️ {selectedGame.views + 1} {t('games.viewsLabel')}</span>[m
[32m+[m[32m                <span>❤️ {selectedGame.likes} {t('games.likesLabel')}</span>[m
               </div>[m
             </div>[m
             <div className="modal-body">[m
[36m@@ -196,21 +200,20 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
             <div className="modal-footer">[m
               <button[m
                 onClick={() => handleLikeGame(selectedGame.id)}[m
[31m-                className="action-btn"[m
[31m-                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}[m
[32m+[m[32m                className="action-btn games-action-btn-danger"[m
               >[m
[31m-                ❤️ Thích bài viết[m
[32m+[m[32m                ❤️ {t('games.likeArticle')}[m
               </button>[m
               <button[m
                 onClick={() => toggleBm('game', selectedGame.id)}[m
                 className={`action-btn ${isBm('game', selectedGame.id) ? 'bookmark-active' : ''}`}[m
                 style={{ maxWidth: '120px' }}[m
[31m-                title={isBm('game', selectedGame.id) ? 'Bỏ lưu' : 'Lưu bài viết'}[m
[32m+[m[32m                title={isBm('game', selectedGame.id) ? t('games.unbookmark') : t('games.bookmark')}[m
               >[m
[31m-                {isBm('game', selectedGame.id) ? '🔖 Đã lưu' : '⚪ Lưu bài viết'}[m
[32m+[m[32m                {isBm('game', selectedGame.id) ? <>🔖 {t('common.saved')}</> : <>⚪ {t('games.bookmark')}</>}[m
               </button>[m
               <button onClick={handleCloseModal} className="action-btn" style={{ maxWidth: '100px' }}>[m
[31m-                Đóng[m
[32m+[m[32m                {t('games.close')}[m
               </button>[m
             </div>[m
           </div>[m
[36m@@ -218,4 +221,4 @@[m [mexport default function Games({ searchOpenGameId = null, onConsumeSearchOpen })[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Home/Home.css b/frontend/src/pages/Home/Home.css[m
[1mindex 84076ca..00ff63d 100644[m
[1m--- a/frontend/src/pages/Home/Home.css[m
[1m+++ b/frontend/src/pages/Home/Home.css[m
[36m@@ -76,9 +76,9 @@[m
 }[m
 [m
 .home-export-btn:hover:not(:disabled) {[m
[31m-  background: var(--primary, #6366f1);[m
[31m-  border-color: var(--primary, #6366f1);[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
 }[m
 [m
 .home-export-btn:disabled {[m
[36m@@ -87,9 +87,9 @@[m
 }[m
 [m
 .home-error {[m
[31m-  background: rgba(239, 68, 68, 0.1);[m
[31m-  border: 1px solid rgba(239, 68, 68, 0.3);[m
[31m-  color: #ef4444;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  border: 1px solid var(--status-error-fg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
   padding: 12px 16px;[m
   border-radius: 10px;[m
   margin-bottom: 16px;[m
[36m@@ -212,7 +212,7 @@[m
 }[m
 [m
 .home-empty-text a {[m
[31m-  color: #6366f1;[m
[32m+[m[32m  color: var(--accent-primary);[m
   text-decoration: none;[m
   font-weight: 500;[m
 }[m
[1mdiff --git a/frontend/src/pages/Home/index.jsx b/frontend/src/pages/Home/index.jsx[m
[1mindex 88b1fdb..42fd7d8 100644[m
[1m--- a/frontend/src/pages/Home/index.jsx[m
[1m+++ b/frontend/src/pages/Home/index.jsx[m
[36m@@ -1,8 +1,9 @@[m
[31m-import React, { useEffect, useState } from 'react';[m
[32m+[m[32mimport React, { useEffect, useRef, useState } from 'react';[m
 import {[m
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,[m
   ResponsiveContainer, Legend,[m
 } from 'recharts';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import * as api from '../../services/api';[m
 import './Home.css';[m
 [m
[36m@@ -22,20 +23,28 @@[m [mconst EMOJI_FOR_TYPE = {[m
   post: '📝',[m
 };[m
 [m
[31m-const TYPE_LABEL = {[m
[31m-  knowledge: 'bài viết',[m
[31m-  music: 'bài hát',[m
[31m-  game: 'trò chơi',[m
[31m-  post: 'bài đăng',[m
[32m+[m[32m// Translation keys for the small label that appears when a recent[m
[32m+[m[32m// activity item has no `title` field (e.g. a removed article). Used[m
[32m+[m[32m// as the fallback so we never render a raw `content_type` enum.[m
[32m+[m[32mconst TYPE_LABEL_KEY = {[m
[32m+[m[32m  knowledge: 'home.typeLabel.knowledge',[m
[32m+[m[32m  music: 'home.typeLabel.music',[m
[32m+[m[32m  game: 'home.typeLabel.game',[m
[32m+[m[32m  post: 'home.typeLabel.post',[m
 };[m
 [m
[31m-const EVENT_LABEL = {[m
[31m-  view: 'đã đọc',[m
[31m-  play: 'đã nghe',[m
[31m-  like: 'đã thích',[m
[32m+[m[32m// Translation keys for the "Bạn X · time ago" small line under each[m
[32m+[m[32m// recent activity entry. Using dedicated keys (instead of the <T>[m
[32m+[m[32m// hash-of-template approach) because the {time} placeholder is[m
[32m+[m[32m// resolved per event_type at render time.[m
[32m+[m[32mconst EVENT_KEY = {[m
[32m+[m[32m  view: 'home.event.view',[m
[32m+[m[32m  play: 'home.event.play',[m
[32m+[m[32m  like: 'home.event.like',[m
 };[m
 [m
 function Home({ onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [days, setDays] = useState(7);[m
   const [insights, setInsights] = useState({[m
     totals: EMPTY_TOTALS,[m
[36m@@ -49,6 +58,11 @@[m [mfunction Home({ onNavigate }) {[m
   const [error, setError] = useState(null);[m
   const [exporting, setExporting] = useState(false);[m
 [m
[32m+[m[32m  // Stash the load function in a ref so the focus/visibility listener[m
[32m+[m[32m  // can call the latest version (with current `days`) without needing[m
[32m+[m[32m  // to be re-bound each render.[m
[32m+[m[32m  const loadRef = useRef(null);[m
[32m+[m
   useEffect(() => {[m
     let cancelled = false;[m
     const load = async () => {[m
[36m@@ -67,14 +81,39 @@[m [mfunction Home({ onNavigate }) {[m
       } catch (err) {[m
         if (cancelled) return;[m
         console.error('Error loading dashboard:', err);[m
[31m-        setError('Không tải được dữ liệu. Vui lòng thử lại.');[m
[32m+[m[32m        setError(t('home.loadFail'));[m
       } finally {[m
         if (!cancelled) setLoading(false);[m
       }[m
     };[m
[32m+[m[32m    loadRef.current = load;[m
     load();[m
     return () => { cancelled = true; };[m
[31m-  }, [days]);[m
[32m+[m[32m  }, [days, t]);[m
[32m+[m
[32m+[m[32m  // Re-fetch when the user comes back to this tab after reacting[m
[32m+[m[32m  // or commenting in another (Knowledge/Feed) tab. Without this, the[m
[32m+[m[32m  // stat cards and "Bạn đã đọc gần đây" list stay stale until the[m
[32m+[m[32m  // user manually switches the days-toggle. We listen on:[m
[32m+[m[32m  //   - window 'focus'  → tab switch back[m
[32m+[m[32m  //   - document 'visibilitychange' → unmounted tab coming back[m
[32m+[m[32m  //     (Safari fires this rather than focus)[m
[32m+[m[32m  //   - 'pageshow' with persisted=true → bfcache restore[m
[32m+[m[32m  // The fetch is best-effort; failures fall through silently and the[m
[32m+[m[32m  // existing state stays visible.[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const refetch = () => {[m
[32m+[m[32m      loadRef.current?.();[m
[32m+[m[32m    };[m
[32m+[m[32m    window.addEventListener('focus', refetch);[m
[32m+[m[32m    document.addEventListener('visibilitychange', refetch);[m
[32m+[m[32m    window.addEventListener('pageshow', refetch);[m
[32m+[m[32m    return () => {[m
[32m+[m[32m      window.removeEventListener('focus', refetch);[m
[32m+[m[32m      document.removeEventListener('visibilitychange', refetch);[m
[32m+[m[32m      window.removeEventListener('pageshow', refetch);[m
[32m+[m[32m    };[m
[32m+[m[32m  }, []);[m
 [m
   // Trigger a file download for the user's insights in `fmt`[m
   // ('csv' or 'json'). We disable both export buttons while in[m
[36m@@ -114,13 +153,17 @@[m [mfunction Home({ onNavigate }) {[m
     <div className="home-page">[m
       <header className="home-header">[m
         <div>[m
[31m-          <h1 className="home-title">🏠 Trang chủ</h1>[m
[32m+[m[32m          <h1 className="home-title">🏠 {t('home.title')}</h1>[m
           <p className="home-subtitle">[m
[31m-            {loading[m
[31m-              ? 'Đang tải...'[m
[31m-              : hasActivity[m
[31m-                ? `Bạn đang có chuỗi ${insights.streak_days} ngày liên tiếp! Hãy tiếp tục nhé.`[m
[31m-                : 'Khám phá nội dung để bắt đầu ghi dấu hoạt động của bạn.'}[m
[32m+[m[32m            {loading ? ([m
[32m+[m[32m              t('common.loading')[m
[32m+[m[32m            ) : hasActivity ? ([m
[32m+[m[32m              <span>[m
[32m+[m[32m                {t('home.streak', { n: insights.streak_days })}[m
[32m+[m[32m              </span>[m
[32m+[m[32m            ) : ([m
[32m+[m[32m              t('home.noActivity')[m
[32m+[m[32m            )}[m
           </p>[m
         </div>[m
         <div className="home-days-toggle" role="tablist">[m
[36m@@ -132,7 +175,7 @@[m [mfunction Home({ onNavigate }) {[m
               className={days === d ? 'active' : ''}[m
               onClick={() => setDays(d)}[m
             >[m
[31m-              {d} ngày[m
[32m+[m[32m              {d} {t('home.daysLabel')}[m
             </button>[m
           ))}[m
         </div>[m
[36m@@ -142,7 +185,7 @@[m [mfunction Home({ onNavigate }) {[m
             className="home-export-btn"[m
             onClick={() => onExport('csv')}[m
             disabled={exporting}[m
[31m-            title="Tải file CSV"[m
[32m+[m[32m            title={t('home.exportCsv')}[m
           >[m
             ⬇️ CSV[m
           </button>[m
[36m@@ -151,7 +194,7 @@[m [mfunction Home({ onNavigate }) {[m
             className="home-export-btn"[m
             onClick={() => onExport('json')}[m
             disabled={exporting}[m
[31m-            title="Tải file JSON"[m
[32m+[m[32m            title={t('home.exportJson')}[m
           >[m
             ⬇️ JSON[m
           </button>[m
[36m@@ -163,40 +206,20 @@[m [mfunction Home({ onNavigate }) {[m
       {/* 4 stat cards. Skeleton placeholders during initial load so[m
           the layout doesn't jump when data arrives. */}[m
       <section className="home-stats">[m
[31m-        <StatCard[m
[31m-          icon="📚"[m
[31m-          label="Bài viết đã đọc"[m
[31m-          value={insights.totals.knowledge_views}[m
[31m-          loading={loading}[m
[31m-        />[m
[31m-        <StatCard[m
[31m-          icon="🎵"[m
[31m-          label="Bài hát đã nghe"[m
[31m-          value={insights.totals.music_plays}[m
[31m-          loading={loading}[m
[31m-        />[m
[31m-        <StatCard[m
[31m-          icon="🎮"[m
[31m-          label="Trò chơi đã xem"[m
[31m-          value={insights.totals.game_views}[m
[31m-          loading={loading}[m
[31m-        />[m
[31m-        <StatCard[m
[31m-          icon="❤️"[m
[31m-          label="Bài đăng đã thích"[m
[31m-          value={insights.totals.posts_liked}[m
[31m-          loading={loading}[m
[31m-        />[m
[32m+[m[32m        <StatCard icon="📚" label={t('home.statArticles')} value={insights.totals.knowledge_views} loading={loading} />[m
[32m+[m[32m        <StatCard icon="🎵" label={t('home.statSongs')} value={insights.totals.music_plays} loading={loading} />[m
[32m+[m[32m        <StatCard icon="🎮" label={t('home.statGames')} value={insights.totals.game_views} loading={loading} />[m
[32m+[m[32m        <StatCard icon="❤️" label={t('home.statPosts')} value={insights.totals.posts_liked} loading={loading} />[m
       </section>[m
 [m
       {/* Line chart of activity over the period. Render the chart[m
           container unconditionally so Recharts has a stable parent[m
           to measure — we just feed it empty data when loading. */}[m
       <section className="home-chart-card">[m
[31m-        <h2>Hoạt động {days} ngày gần nhất</h2>[m
[32m+[m[32m        <h2>{t('home.daysActivity', { days })}</h2>[m
         <div className="home-chart-wrapper">[m
           {chartData.length === 0 ? ([m
[31m-            <div className="home-chart-empty">Chưa có dữ liệu</div>[m
[32m+[m[32m            <div className="home-chart-empty">{t('home.chartEmpty')}</div>[m
           ) : ([m
             <ResponsiveContainer width="100%" height={260}>[m
               <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>[m
[36m@@ -213,30 +236,9 @@[m [mfunction Home({ onNavigate }) {[m
                   labelStyle={{ color: '#f8fafc' }}[m
                 />[m
                 <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />[m
[31m-                <Line[m
[31m-                  type="monotone"[m
[31m-                  dataKey="knowledge"[m
[31m-                  name="Bài viết"[m
[31m-                  stroke="#6366f1"[m
[31m-                  strokeWidth={2}[m
[31m-                  dot={{ r: 3 }}[m
[31m-                />[m
[31m-                <Line[m
[31m-                  type="monotone"[m
[31m-                  dataKey="music"[m
[31m-                  name="Nhạc"[m
[31m-                  stroke="#ec4899"[m
[31m-                  strokeWidth={2}[m
[31m-                  dot={{ r: 3 }}[m
[31m-                />[m
[31m-                <Line[m
[31m-                  type="monotone"[m
[31m-                  dataKey="game"[m
[31m-                  name="Game"[m
[31m-                  stroke="#10b981"[m
[31m-                  strokeWidth={2}[m
[31m-                  dot={{ r: 3 }}[m
[31m-                />[m
[32m+[m[32m                <Line type="monotone" dataKey="knowledge" name={t('home.legend.knowledge')} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />[m
[32m+[m[32m                <Line type="monotone" dataKey="music" name={t('home.legend.music')} stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />[m
[32m+[m[32m                <Line type="monotone" dataKey="game" name={t('home.legend.game')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />[m
               </LineChart>[m
             </ResponsiveContainer>[m
           )}[m
[36m@@ -246,12 +248,14 @@[m [mfunction Home({ onNavigate }) {[m
       <section className="home-bottom-grid">[m
         {/* Left: recent articles the user has touched */}[m
         <div className="home-card">[m
[31m-          <h2>Bạn đã đọc gần đây</h2>[m
[32m+[m[32m          <h2>{t('home.recentlyRead')}</h2>[m
           {loading ? ([m
             <Skeleton lines={3} />[m
           ) : insights.recent_articles.length === 0 ? ([m
             <p className="home-empty-text">[m
[31m-              Chưa có bài viết nào. Hãy mở <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('knowledge'); }}>Knowledge</a> để bắt đầu.[m
[32m+[m[32m              {t('home.noRecentArticles')}[m
[32m+[m[32m              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('knowledge'); }}>{t('nav.knowledge')}</a>[m
[32m+[m[32m              {t('home.noRecentArticlesAfter')}[m
             </p>[m
           ) : ([m
             <ul className="home-recent-list">[m
[36m@@ -270,21 +274,22 @@[m [mfunction Home({ onNavigate }) {[m
 [m
         {/* Right: recent raw activity events (mixed types) */}[m
         <div className="home-card">[m
[31m-          <h2>Hoạt động gần đây</h2>[m
[32m+[m[32m          <h2>{t('home.recentActivity')}</h2>[m
           {loading ? ([m
             <Skeleton lines={4} />[m
           ) : recent.length === 0 ? ([m
[31m-            <p className="home-empty-text">Chưa có hoạt động nào.</p>[m
[32m+[m[32m            <p className="home-empty-text">{t('home.noActivity')}</p>[m
           ) : ([m
             <ul className="home-recent-list">[m
               {recent.map((r) => ([m
                 <li key={r.id}>[m
                   <span className="home-recent-icon">{EMOJI_FOR_TYPE[r.content_type] || '•'}</span>[m
                   <div className="home-recent-meta">[m
[31m-                    <strong>{r.title || TYPE_LABEL[r.content_type] || r.content_type}</strong>[m
[32m+[m[32m                    <strong>{r.title || (TYPE_LABEL_KEY[r.content_type] ? t(TYPE_LABEL_KEY[r.content_type]) : r.content_type)}</strong>[m
                     <small>[m
[31m-                      Bạn {EVENT_LABEL[r.event_type] || r.event_type}{' '}[m
[31m-                      · {formatRelative(r.created_at)}[m
[32m+[m[32m                      {t(EVENT_KEY[r.event_type] || 'home.event.unknown', {[m
[32m+[m[32m                        time: formatRelative(r.created_at, t),[m
[32m+[m[32m                      })}[m
                     </small>[m
                   </div>[m
                 </li>[m
[36m@@ -298,7 +303,7 @@[m [mfunction Home({ onNavigate }) {[m
           users don't need a "no categories" section cluttering the UI. */}[m
       {!loading && insights.top_categories.length > 0 && ([m
         <section className="home-card home-top-cats">[m
[31m-          <h2>Chủ đề bạn quan tâm</h2>[m
[32m+[m[32m          <h2>{t('home.topCategories')}</h2>[m
           <div className="home-cat-chips">[m
             {insights.top_categories.map(([cat, count]) => ([m
               <span key={cat} className="home-chip">[m
[36m@@ -314,12 +319,12 @@[m [mfunction Home({ onNavigate }) {[m
           guide the populated case. */}[m
       {!loading && !hasActivity && ([m
         <section className="home-quick-links">[m
[31m-          <h2>Bắt đầu từ đâu?</h2>[m
[32m+[m[32m          <h2>{t('home.whereToStart')}</h2>[m
           <div className="home-quick-grid">[m
[31m-            <button onClick={() => onNavigate?.('knowledge')}>📚 Đọc bài</button>[m
[31m-            <button onClick={() => onNavigate?.('music')}>🎵 Nghe nhạc</button>[m
[31m-            <button onClick={() => onNavigate?.('games')}>🎮 Chơi game</button>[m
[31m-            <button onClick={() => onNavigate?.('feed')}>📰 Xem bảng tin</button>[m
[32m+[m[32m            <button onClick={() => onNavigate?.('knowledge')}>📚 {t('home.quickRead')}</button>[m
[32m+[m[32m            <button onClick={() => onNavigate?.('music')}>🎵 {t('home.quickListen')}</button>[m
[32m+[m[32m            <button onClick={() => onNavigate?.('games')}>🎮 {t('home.quickPlay')}</button>[m
[32m+[m[32m            <button onClick={() => onNavigate?.('feed')}>📰 {t('home.quickFeed')}</button>[m
           </div>[m
         </section>[m
       )}[m
[36m@@ -353,22 +358,21 @@[m [mfunction Skeleton({ lines }) {[m
   );[m
 }[m
 [m
[31m-function formatRelative(iso) {[m
[31m-  // Best-effort relative time in Vietnamese. The server gives us[m
[31m-  // ISO with no Z; we treat it as local-naive (the rest of the app[m
[31m-  // also writes datetime.utcnow without TZ). For an MVP this is[m
[31m-  // good enough — production should switch to timezone-aware[m
[31m-  // datetimes server-side.[m
[32m+[m[32mfunction formatRelative(iso, t) {[m
[32m+[m[32m  // Best-effort relative time. The server gives us ISO with no Z;[m
[32m+[m[32m  // we treat it as local-naive (the rest of the app also writes[m
[32m+[m[32m  // datetime.utcnow without TZ). For an MVP this is good enough —[m
[32m+[m[32m  // production should switch to timezone-aware datetimes server-side.[m
   try {[m
[31m-    const t = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));[m
[31m-    const diff = Math.floor((Date.now() - t.getTime()) / 1000);[m
[31m-    if (diff < 60) return 'vừa xong';[m
[31m-    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;[m
[31m-    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;[m
[31m-    return `${Math.floor(diff / 86400)} ngày trước`;[m
[32m+[m[32m    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));[m
[32m+[m[32m    const diff = Math.floor((Date.now() - d.getTime()) / 1000);[m
[32m+[m[32m    if (diff < 60) return t('time.justNow');[m
[32m+[m[32m    if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });[m
[32m+[m[32m    if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });[m
[32m+[m[32m    return t('time.daysAgo', { n: Math.floor(diff / 86400) });[m
   } catch {[m
     return iso;[m
   }[m
 }[m
 [m
[31m-export default Home;[m
[32m+[m[32mexport default Home;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Knowledge/Knowledge.css b/frontend/src/pages/Knowledge/Knowledge.css[m
[1mindex 2865dfb..d8c3746 100644[m
[1m--- a/frontend/src/pages/Knowledge/Knowledge.css[m
[1m+++ b/frontend/src/pages/Knowledge/Knowledge.css[m
[36m@@ -100,9 +100,9 @@[m
 }[m
 [m
 .filter-btn.active {[m
[31m-  background: #6366f1;[m
[31m-  border-color: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-weight: 600;[m
 }[m
 [m
[36m@@ -221,13 +221,13 @@[m
 [m
 .card-tag:hover {[m
   background: rgba(99, 102, 241, 0.12);[m
[31m-  border-color: #6366f1;[m
[32m+[m[32m  border-color: var(--accent-primary);[m
 }[m
 [m
 .card-tag.active {[m
[31m-  background: #6366f1;[m
[31m-  border-color: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
 }[m
 [m
 .knowledge-tag-row {[m
[36m@@ -290,6 +290,11 @@[m
   font-size: 18px;[m
 }[m
 [m
[32m+[m[32m.knowledge-error-text {[m
[32m+[m[32m  text-align: center;[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m}[m
[32m+[m
 /* Responsive */[m
 @media (max-width: 1024px) {[m
   .knowledge-grid {[m
[36m@@ -341,8 +346,8 @@[m
 }[m
 [m
 .article-modal {[m
[31m-  background: #ffffff;[m
[31m-  color: #1e293b;[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  color: var(--text-main);[m
   border-radius: 16px;[m
   width: 100%;[m
   max-width: 880px;[m
[36m@@ -358,7 +363,7 @@[m
 [m
 .article-modal-header {[m
   padding: 24px 28px 16px;[m
[31m-  border-bottom: 1px solid #e2e8f0;[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   display: flex;[m
   justify-content: space-between;[m
   align-items: flex-start;[m
[36m@@ -368,7 +373,7 @@[m
 .article-modal-header h2 {[m
   margin: 8px 0 4px;[m
   font-size: 1.5rem;[m
[31m-  color: #0f172a;[m
[32m+[m[32m  color: var(--text-title);[m
   line-height: 1.3;[m
 }[m
 [m
[36m@@ -376,14 +381,14 @@[m
   display: flex;[m
   gap: 14px;[m
   font-size: 0.88rem;[m
[31m-  color: #64748b;[m
[32m+[m[32m  color: var(--text-muted);[m
   margin-top: 4px;[m
 }[m
 [m
 .article-modal-close {[m
[31m-  background: #f1f5f9;[m
[32m+[m[32m  background: var(--bg-item);[m
   border: none;[m
[31m-  color: #475569;[m
[32m+[m[32m  color: var(--text-main);[m
   width: 36px;[m
   height: 36px;[m
   border-radius: 8px;[m
[36m@@ -394,9 +399,9 @@[m
 }[m
 [m
 .article-modal-bookmark {[m
[31m-  background: #f1f5f9;[m
[32m+[m[32m  background: var(--bg-item);[m
   border: none;[m
[31m-  color: #475569;[m
[32m+[m[32m  color: var(--text-main);[m
   width: 36px;[m
   height: 36px;[m
   border-radius: 8px;[m
[36m@@ -408,17 +413,17 @@[m
 }[m
 [m
 .article-modal-bookmark:hover {[m
[31m-  background: #e2e8f0;[m
[32m+[m[32m  background: var(--bg-card-hover);[m
 }[m
 [m
 .article-modal-bookmark.filled {[m
[31m-  background: linear-gradient(135deg, #6366f1, #4f46e5);[m
[31m-  color: white;[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-2));[m
[32m+[m[32m  color: var(--text-on-accent);[m
 }[m
 [m
 .article-modal-close:hover {[m
[31m-  background: #e2e8f0;[m
[31m-  color: #0f172a;[m
[32m+[m[32m  background: var(--bg-card-hover);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .article-modal-body {[m
[36m@@ -427,14 +432,14 @@[m
 [m
 .article-modal-desc {[m
   font-size: 1.05rem;[m
[31m-  color: #334155;[m
[32m+[m[32m  color: var(--text-main);[m
   margin: 0 0 14px;[m
   font-weight: 500;[m
 }[m
 [m
 .article-modal-content {[m
   font-size: 0.96rem;[m
[31m-  color: #475569;[m
[32m+[m[32m  color: var(--text-main);[m
   line-height: 1.65;[m
   white-space: pre-wrap;[m
   margin: 0 0 24px;[m
[36m@@ -442,12 +447,12 @@[m
 [m
 .article-modal-videos h3 {[m
   font-size: 1.05rem;[m
[31m-  color: #0f172a;[m
[32m+[m[32m  color: var(--text-title);[m
   margin: 0 0 14px;[m
 }[m
 [m
 .videos-status {[m
[31m-  color: #64748b;[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 0.92rem;[m
   font-style: italic;[m
 }[m
[36m@@ -461,10 +466,10 @@[m
 .video-item {[m
   display: flex;[m
   flex-direction: column;[m
[31m-  background: #f8fafc;[m
[32m+[m[32m  background: var(--bg-item);[m
   border-radius: 10px;[m
   overflow: hidden;[m
[31m-  border: 1px solid #e2e8f0;[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
 }[m
 [m
 .video-item iframe {[m
[36m@@ -472,7 +477,7 @@[m
   aspect-ratio: 16 / 9;[m
   border: none;[m
   display: block;[m
[31m-  background: #0f172a;[m
[32m+[m[32m  background: var(--scanner-bg);[m
 }[m
 [m
 .video-meta {[m
[36m@@ -483,7 +488,7 @@[m
   margin: 0 0 4px;[m
   font-size: 0.88rem;[m
   font-weight: 600;[m
[31m-  color: #0f172a;[m
[32m+[m[32m  color: var(--text-title);[m
   line-height: 1.35;[m
   /* Clamp to 2 lines so the grid stays balanced even when one title is long. */[m
   display: -webkit-box;[m
[36m@@ -495,7 +500,7 @@[m
 .video-channel {[m
   margin: 0;[m
   font-size: 0.78rem;[m
[31m-  color: #64748b;[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 @media (max-width: 600px) {[m
[36m@@ -523,13 +528,13 @@[m
 }[m
 [m
 .card-status-draft {[m
[31m-  background: rgba(245, 158, 11, 0.15);[m
[31m-  color: #b45309;[m
[32m+[m[32m  background: var(--status-warn-bg);[m
[32m+[m[32m  color: var(--status-warn-fg);[m
 }[m
 [m
 .card-status-scheduled {[m
   background: rgba(99, 102, 241, 0.15);[m
[31m-  color: #4f46e5;[m
[32m+[m[32m  color: var(--accent-primary-2);[m
 }[m
 [m
 .knowledge-create-overlay {[m
[36m@@ -600,12 +605,12 @@[m
 .knowledge-create-form input:focus,[m
 .knowledge-create-form textarea:focus {[m
   outline: none;[m
[31m-  border-color: #6366f1;[m
[32m+[m[32m  border-color: var(--accent-primary);[m
 }[m
 [m
 .knowledge-create-error {[m
[31m-  background: rgba(220, 38, 38, 0.08);[m
[31m-  color: #b91c1c;[m
[32m+[m[32m  background: var(--status-error-bg);[m
[32m+[m[32m  color: var(--status-error-fg);[m
   padding: 8px 12px;[m
   border-radius: 6px;[m
   font-size: 13px;[m
[36m@@ -618,8 +623,8 @@[m
 }[m
 [m
 .knowledge-create-submit {[m
[31m-  background: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   border-radius: 8px;[m
   padding: 10px 22px;[m
[1mdiff --git a/frontend/src/pages/Knowledge/index.jsx b/frontend/src/pages/Knowledge/index.jsx[m
[1mindex f11c235..24d008b 100644[m
[1m--- a/frontend/src/pages/Knowledge/index.jsx[m
[1m+++ b/frontend/src/pages/Knowledge/index.jsx[m
[36m@@ -4,9 +4,22 @@[m [mimport * as api from '../../services/api';[m
 import CommentSection from '../../components/Comments/CommentSection';[m
 import AddToCollectionButton from '../Collections/AddToCollectionButton';[m
 import { useBookmarks } from '../../lib/BookmarksContext';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 export default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearchOpen, currentUser, onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const { isBookmarked: isBmKnowledge, toggle: toggleBm } = useBookmarks();[m
[32m+[m
[32m+[m[32m  // Category labels come from the backend as raw Vietnamese strings[m
[32m+[m[32m  // (e.g. "Lập Trình"). To localize the filter buttons, map each[m
[32m+[m[32m  // known value to a translation key. Unknown categories fall back[m
[32m+[m[32m  // to the raw value so newly-added categories still render[m
[32m+[m[32m  // instead of disappearing.[m
[32m+[m[32m  const categoryLabel = (cat) => {[m
[32m+[m[32m    const key = `knowledge.categories.${cat}`;[m
[32m+[m[32m    const translated = t(key);[m
[32m+[m[32m    return translated === key ? cat : translated;[m
[32m+[m[32m  };[m
   // Multi-select category filter. Empty array = "All categories"[m
   // (no filter). Selecting multiple is an OR match — show articles[m
   // that belong to any of the selected categories. This lets a user[m
[36m@@ -181,7 +194,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
       setAllArticles(response.data || []);[m
     } catch (err) {[m
       console.error('Error loading articles:', err);[m
[31m-      setError('Failed to load articles');[m
[32m+[m[32m      setError(t('knowledge.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -229,7 +242,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
     e.preventDefault();[m
     if (createSubmitting) return;[m
     if (!createTitle.trim() || !createCategory.trim()) {[m
[31m-      setCreateError('Tiêu đề và thể loại là bắt buộc.');[m
[32m+[m[32m      setCreateError(t('knowledge.err.titleRequired'));[m
       return;[m
     }[m
     setCreateSubmitting(true);[m
[36m@@ -249,7 +262,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
       };[m
       if (createMode === 'scheduled') {[m
         if (!createScheduledAt) {[m
[31m-          setCreateError('Vui lòng chọn thời điểm đăng.');[m
[32m+[m[32m          setCreateError(t('knowledge.err.scheduledRequired'));[m
           setCreateSubmitting(false);[m
           return;[m
         }[m
[36m@@ -269,7 +282,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
       if (showMyArticles) loadMyArticles();[m
     } catch (err) {[m
       const detail = err?.response?.data?.detail;[m
[31m-      setCreateError(detail || 'Không thể tạo bài viết.');[m
[32m+[m[32m      setCreateError(detail || t('knowledge.err.create'));[m
     } finally {[m
       setCreateSubmitting(false);[m
     }[m
[36m@@ -303,20 +316,20 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
     <div className="knowledge-container">[m
       <div className="knowledge-header">[m
         <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[m
[31m-          <img [m
[31m-            src="/knowledge-icon.png" [m
[31m-            alt="Knowledge Icon" [m
[31m-            style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }} [m
[32m+[m[32m          <img[m
[32m+[m[32m            src="/knowledge-icon.png"[m
[32m+[m[32m            alt={t('knowledge.altIcon')}[m
[32m+[m[32m            style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }}[m
           />[m
[31m-          Chia Sẻ Kiến Thức Học Tập & Làm Việc[m
[32m+[m[32m          {t('knowledge.heading')}[m
         </h1>[m
[31m-        <p>Cộng đồng chia sẻ kiến thức, kỹ năng và kinh nghiệm</p>[m
[32m+[m[32m        <p>{t('knowledge.subtitle')}</p>[m
         <div className="knowledge-create-buttons">[m
[31m-          <button className="create-btn" onClick={() => handleOpenCreate('published')}>✍️ Viết Bài Mới</button>[m
[32m+[m[32m          <button className="create-btn" onClick={() => handleOpenCreate('published')}>✍️ {t('knowledge.writeNew')}</button>[m
           {currentUser && ([m
             <>[m
[31m-              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('draft')}>📝 Lưu nháp</button>[m
[31m-              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('scheduled')}>⏰ Hẹn giờ</button>[m
[32m+[m[32m              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('draft')}>📝 {t('knowledge.saveDraft')}</button>[m
[32m+[m[32m              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('scheduled')}>⏰ {t('knowledge.schedule')}</button>[m
             </>[m
           )}[m
         </div>[m
[36m@@ -329,14 +342,14 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
               className={`filter-btn ${!showMyArticles ? 'active' : ''}`}[m
               onClick={() => setShowMyArticles(false)}[m
             >[m
[31m-              📚 Tất Cả Bài Viết[m
[32m+[m[32m              📚 {t('knowledge.allArticles')}[m
             </button>[m
             {currentUser && ([m
               <button[m
                 className={`filter-btn ${showMyArticles ? 'active' : ''}`}[m
                 onClick={() => setShowMyArticles(true)}[m
               >[m
[31m-                👤 Bài viết của tôi[m
[32m+[m[32m                👤 {t('knowledge.myArticles')}[m
               </button>[m
             )}[m
             {categories.map((cat) => {[m
[36m@@ -348,7 +361,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                   onClick={() => toggleCategory(cat)}[m
                   aria-pressed={active}[m
                 >[m
[31m-                  {cat}[m
[32m+[m[32m                  {categoryLabel(cat)}[m
                 </button>[m
               );[m
             })}[m
[36m@@ -357,13 +370,13 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                 className="filter-btn filter-btn-clear"[m
                 onClick={() => setSelectedCategories([])}[m
               >[m
[31m-                Xóa lọc[m
[32m+[m[32m                {t('knowledge.clearFilter')}[m
               </button>[m
             )}[m
           </div>[m
           {tagSuggestions.length > 0 && ([m
             <div className="filter-buttons knowledge-tag-row">[m
[31m-              <span className="knowledge-tag-label">🏷️ Tag:</span>[m
[32m+[m[32m              <span className="knowledge-tag-label">🏷️ {t('knowledge.tagLabel')}</span>[m
               {tagSuggestions.map((tag) => {[m
                 const active = selectedTags.includes(tag);[m
                 return ([m
[36m@@ -382,7 +395,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                   className="filter-btn filter-btn-clear"[m
                   onClick={() => setSelectedTags([])}[m
                 >[m
[31m-                  Xóa tag[m
[32m+[m[32m                  {t('knowledge.clearTag')}[m
                 </button>[m
               )}[m
             </div>[m
[36m@@ -390,9 +403,9 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
         </div>[m
 [m
         {loading ? ([m
[31m-          <p style={{ textAlign: 'center', color: 'white' }}>Đang tải bài viết...</p>[m
[32m+[m[32m          <p style={{ textAlign: 'center', color: 'white' }}>{t('knowledge.loading')}</p>[m
         ) : error ? ([m
[31m-          <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>[m
[32m+[m[32m          <p className="knowledge-error-text">{error}</p>[m
         ) : ([m
           <div className="knowledge-grid">[m
             {articles.length > 0 ? ([m
[36m@@ -400,10 +413,10 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                 <div key={article.id} className="knowledge-card">[m
                   <div className="card-header">[m
                     <div className="card-image">📝</div>[m
[31m-                    <div className="card-badge">{article.category}</div>[m
[32m+[m[32m                    <div className="card-badge">{categoryLabel(article.category)}</div>[m
                     {article.status && article.status !== 'published' && ([m
                       <div className={`card-status card-status-${article.status}`}>[m
[31m-                        {article.status === 'draft' ? '📝 Nháp' : '⏰ Đã hẹn giờ'}[m
[32m+[m[32m                        {article.status === 'draft' ? <>📝 {t('knowledge.draft')}</> : <>⏰ {t('knowledge.scheduled')}</>}[m
                       </div>[m
                     )}[m
                   </div>[m
[36m@@ -422,7 +435,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                               e.stopPropagation();[m
                               setSelectedTags((prev) => prev.includes(t.name) ? prev.filter((x) => x !== t.name) : [...prev, t.name]);[m
                             }}[m
[31m-                            title={`Lọc theo #${t.name}`}[m
[32m+[m[32m                            title={t('knowledge.filterByTag', { tag: t.name })}[m
                             type="button"[m
                           >[m
                             #{t.name}[m
[36m@@ -441,15 +454,15 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                     </div>[m
 [m
                     <div className="card-actions">[m
[31m-                      <button className="read-btn" onClick={() => handleOpenArticle(article)}>Đọc Thêm →</button>[m
[31m-                      <button onClick={() => handleLikeArticle(article.id)} className="read-btn" style={{ marginLeft: '8px' }}>❤️ Thích</button>[m
[32m+[m[32m                      <button className="read-btn" onClick={() => handleOpenArticle(article)}>{t('knowledge.readMore')} →</button>[m
[32m+[m[32m                      <button onClick={() => handleLikeArticle(article.id)} className="read-btn" style={{ marginLeft: '8px' }}>❤️ {t('knowledge.like')}</button>[m
                     </div>[m
                   </div>[m
                 </div>[m
               ))[m
             ) : ([m
               <div className="no-content" style={{ gridColumn: '1 / -1' }}>[m
[31m-                <p>Không có bài viết nào trong danh mục này</p>[m
[32m+[m[32m                <p>{t('knowledge.noArticles')}</p>[m
               </div>[m
             )}[m
           </div>[m
[36m@@ -467,7 +480,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
           >[m
             <div className="article-modal-header">[m
               <div>[m
[31m-                <span className="card-badge">{selectedArticle.category}</span>[m
[32m+[m[32m                <span className="card-badge">{categoryLabel(selectedArticle.category)}</span>[m
                 <h2>{selectedArticle.title}</h2>[m
                 <div className="article-modal-meta">[m
                   <span>👤 {selectedArticle.author}</span>[m
[36m@@ -478,8 +491,8 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
               <button[m
                 className={`article-modal-bookmark ${isBmKnowledge('knowledge', selectedArticle.id) ? 'filled' : ''}`}[m
                 onClick={() => toggleBm('knowledge', selectedArticle.id)}[m
[31m-                aria-label={isBmKnowledge('knowledge', selectedArticle.id) ? 'Bỏ lưu' : 'Lưu bài viết'}[m
[31m-                title={isBmKnowledge('knowledge', selectedArticle.id) ? 'Bỏ lưu' : 'Lưu bài viết'}[m
[32m+[m[32m                aria-label={isBmKnowledge('knowledge', selectedArticle.id) ? t('knowledge.unbookmark') : t('knowledge.bookmark')}[m
[32m+[m[32m                title={isBmKnowledge('knowledge', selectedArticle.id) ? t('knowledge.unbookmark') : t('knowledge.bookmark')}[m
               >[m
                 {isBmKnowledge('knowledge', selectedArticle.id) ? '🔖' : '⚪'}[m
               </button>[m
[36m@@ -487,7 +500,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
               <button[m
                 className="article-modal-close"[m
                 onClick={() => setSelectedArticle(null)}[m
[31m-                aria-label="Đóng"[m
[32m+[m[32m                aria-label={t('knowledge.close')}[m
               >[m
                 ✕[m
               </button>[m
[36m@@ -500,9 +513,9 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
               )}[m
 [m
               <div className="article-modal-videos">[m
[31m-                <h3>📺 Video liên quan</h3>[m
[32m+[m[32m                <h3>📺 {t('knowledge.relatedVideos')}</h3>[m
                 {modalLoading ? ([m
[31m-                  <p className="videos-status">Đang tìm video trên YouTube…</p>[m
[32m+[m[32m                  <p className="videos-status">{t('knowledge.loadingVideos')}</p>[m
                 ) : articleVideos.length > 0 ? ([m
                   <div className="video-grid">[m
                     {articleVideos.map((v) => ([m
[36m@@ -521,9 +534,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                     ))}[m
                   </div>[m
                 ) : ([m
[31m-                  <p className="videos-status">[m
[31m-                    Không tìm thấy video liên quan. (Có thể do chưa cấu hình YOUTUBE_API_KEY.)[m
[31m-                  </p>[m
[32m+[m[32m                  <p className="videos-status">{t('knowledge.noVideos')}</p>[m
                 )}[m
               </div>[m
 [m
[36m@@ -547,24 +558,24 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
           <div className="knowledge-create-modal" onClick={(e) => e.stopPropagation()}>[m
             <button className="knowledge-create-close" onClick={() => setShowCreateModal(false)} type="button">×</button>[m
             <h2>[m
[31m-              {createMode === 'draft' ? '📝 Lưu bản nháp'[m
[31m-                : createMode === 'scheduled' ? '⏰ Hẹn giờ đăng bài'[m
[31m-                : '✍️ Đăng bài mới'}[m
[32m+[m[32m              {createMode === 'draft' ? <>📝 {t('knowledge.draftModal')}</>[m
[32m+[m[32m                : createMode === 'scheduled' ? <>⏰ {t('knowledge.scheduledModal')}</>[m
[32m+[m[32m                : <>✍️ {t('knowledge.newPostModal')}</>}[m
             </h2>[m
             <form onSubmit={handleSubmitCreate} className="knowledge-create-form">[m
               <label>[m
[31m-                Tiêu đề *[m
[32m+[m[32m                {t('knowledge.titleLabel')} *[m
                 <input[m
                   type="text"[m
                   value={createTitle}[m
                   onChange={(e) => setCreateTitle(e.target.value)}[m
                   required[m
                   maxLength={255}[m
[31m-                  placeholder="Ví dụ: Học React Hooks nâng cao"[m
[32m+[m[32m                  placeholder={t('knowledge.ph.title')}[m
                 />[m
               </label>[m
               <label>[m
[31m-                Thể loại *[m
[32m+[m[32m                {t('knowledge.categoryLabel')} *[m
                 <input[m
                   type="text"[m
                   value={createCategory}[m
[36m@@ -572,14 +583,14 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                   required[m
                   maxLength={100}[m
                   list="knowledge-category-suggestions"[m
[31m-                  placeholder="Ví dụ: Lập Trình"[m
[32m+[m[32m                  placeholder={t('knowledge.ph.category')}[m
                 />[m
                 <datalist id="knowledge-category-suggestions">[m
                   {categories.map((c) => <option key={c} value={c} />)}[m
                 </datalist>[m
               </label>[m
               <label>[m
[31m-                Mô tả ngắn[m
[32m+[m[32m                {t('knowledge.shortDescLabel')}[m
                 <textarea[m
                   value={createDescription}[m
                   onChange={(e) => setCreateDescription(e.target.value)}[m
[36m@@ -588,7 +599,7 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                 />[m
               </label>[m
               <label>[m
[31m-                Nội dung[m
[32m+[m[32m                {t('knowledge.contentLabel')}[m
                 <textarea[m
                   value={createContent}[m
                   onChange={(e) => setCreateContent(e.target.value)}[m
[36m@@ -596,17 +607,17 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
                 />[m
               </label>[m
               <label>[m
[31m-                Tags (phân cách bằng dấu phẩy)[m
[32m+[m[32m                {t('knowledge.tagsLabel')}[m
                 <input[m
                   type="text"[m
                   value={createTags}[m
                   onChange={(e) => setCreateTags(e.target.value)}[m
[31m-                  placeholder="react, frontend, hooks"[m
[32m+[m[32m                  placeholder={t('knowledge.ph.tags')}[m
                 />[m
               </label>[m
               {createMode === 'scheduled' && ([m
                 <label>[m
[31m-                  Thời điểm đăng *[m
[32m+[m[32m                  {t('knowledge.scheduledAtLabel')} *[m
                   <input[m
                     type="datetime-local"[m
                     value={createScheduledAt}[m
[36m@@ -618,13 +629,13 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
               {createError && <div className="knowledge-create-error">{createError}</div>}[m
               <div className="knowledge-create-actions">[m
                 <button type="submit" className="knowledge-create-submit" disabled={createSubmitting}>[m
[31m-                  {createSubmitting ? 'Đang lưu...'[m
[31m-                    : createMode === 'draft' ? '📝 Lưu nháp'[m
[31m-                    : createMode === 'scheduled' ? '⏰ Hẹn giờ'[m
[31m-                    : '🚀 Đăng ngay'}[m
[32m+[m[32m                  {createSubmitting ? t('knowledge.saving')[m
[32m+[m[32m                    : createMode === 'draft' ? <>📝 {t('knowledge.draftBtn')}</>[m
[32m+[m[32m                    : createMode === 'scheduled' ? <>⏰ {t('knowledge.scheduleBtn')}</>[m
[32m+[m[32m                    : <>🚀 {t('knowledge.publishNow')}</>}[m
                 </button>[m
                 <button type="button" className="knowledge-create-cancel" onClick={() => setShowCreateModal(false)}>[m
[31m-                  Huỷ[m
[32m+[m[32m                  {t('common.cancel')}[m
                 </button>[m
               </div>[m
             </form>[m
[36m@@ -633,4 +644,4 @@[m [mexport default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearc[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Login/Login.css b/frontend/src/pages/Login/Login.css[m
[1mindex aa07caa..ae3e748 100644[m
[1m--- a/frontend/src/pages/Login/Login.css[m
[1m+++ b/frontend/src/pages/Login/Login.css[m
[36m@@ -192,16 +192,16 @@[m
 }[m
 [m
 .text-scanning {[m
[31m-  color: #38bdf8;[m
[32m+[m[32m  color: var(--status-scanning-fg);[m
   font-weight: 600;[m
 }[m
 [m
 .text-success {[m
[31m-  color: #4ade80;[m
[32m+[m[32m  color: var(--status-success-fg);[m
   font-weight: 600;[m
 }[m
 [m
 .text-error {[m
[31m-  color: #f87171;[m
[32m+[m[32m  color: var(--status-error-fg);[m
   font-weight: 600;[m
 }[m
[1mdiff --git a/frontend/src/pages/Login/Login.jsx b/frontend/src/pages/Login/Login.jsx[m
[1mindex 51e453d..67db1da 100644[m
[1m--- a/frontend/src/pages/Login/Login.jsx[m
[1m+++ b/frontend/src/pages/Login/Login.jsx[m
[36m@@ -1,11 +1,13 @@[m
 import React, { useState } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import CameraBox from '../../components/CameraBox';[m
 import * as api from '../../services/api';[m
 import './Login.css';[m
 [m
 export default function Login({ onLoginSuccess }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [isRegistering, setIsRegistering] = useState(false); // Trạng thái Đăng ký vs Đăng nhập[m
[31m-  [m
[32m+[m
   // Trạng thái Đăng nhập[m
   const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'face'[m
   const [usernameOrEmail, setUsernameOrEmail] = useState('');[m
[36m@@ -21,7 +23,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
     department: '',[m
   });[m
   const [regFiles, setRegFiles] = useState([]);[m
[31m-  [m
[32m+[m
   // Trạng thái chung[m
   const [loading, setLoading] = useState(false);[m
   const [error, setError] = useState('');[m
[36m@@ -40,7 +42,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
   const handlePasswordLogin = async (e) => {[m
     e.preventDefault();[m
     if (!usernameOrEmail || !password) {[m
[31m-      setError('Vui lòng điền đầy đủ tài khoản và mật khẩu.');[m
[32m+[m[32m      setError(t('auth.err.fillAll'));[m
       return;[m
     }[m
 [m
[36m@@ -58,7 +60,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
       }[m
     } catch (err) {[m
       console.error(err);[m
[31m-      setError(formatErrorMsg(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.'));[m
[32m+[m[32m      setError(formatErrorMsg(err, t('auth.err.passwordFail')));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -87,7 +89,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
       } catch (err) {[m
         console.error(err);[m
         setFaceStatus('error');[m
[31m-        setError(err.response?.data?.detail || 'Không nhận diện được khuôn mặt. Vui lòng thử lại.');[m
[32m+[m[32m        setError(err.response?.data?.detail || t('auth.err.faceFail'));[m
       }[m
     };[m
     reader.readAsDataURL(file);[m
[36m@@ -104,7 +106,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
   const handleRegister = async (e) => {[m
     e.preventDefault();[m
     if (!regForm.user_id || !regForm.name || !regForm.password) {[m
[31m-      setError('Vui lòng điền đầy đủ các trường bắt buộc (Username, Họ tên, Mật khẩu).');[m
[32m+[m[32m      setError(t('auth.err.fillRequired'));[m
       return;[m
     }[m
 [m
[36m@@ -137,7 +139,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
         images_base64: imagesBase64,[m
       });[m
 [m
[31m-      setSuccessMsg('Đăng ký tài khoản thành công! Bạn đã có thể đăng nhập bằng tài khoản này.');[m
[32m+[m[32m      setSuccessMsg(t('auth.ok.register'));[m
       // Reset form đăng ký[m
       setRegForm({[m
         user_id: '',[m
[36m@@ -154,7 +156,7 @@[m [mexport default function Login({ onLoginSuccess }) {[m
       }, 2000);[m
     } catch (err) {[m
       console.error(err);[m
[31m-      setError(formatErrorMsg(err, 'Đăng ký thất bại. Tên tài khoản hoặc email có thể đã tồn tại.'));[m
[32m+[m[32m      setError(formatErrorMsg(err, t('auth.err.registerFail')));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -164,54 +166,54 @@[m [mexport default function Login({ onLoginSuccess }) {[m
     <div className="login-wrapper">[m
       <div className="login-card">[m
         <div className="login-header">[m
[31m-          <h2>Fav Web Portal</h2>[m
[31m-          <p>{isRegistering ? 'Tạo tài khoản thành viên mới' : 'Hệ thống nhận diện khuôn mặt & dịch vụ giải trí'}</p>[m
[32m+[m[32m          <h2>{t('auth.portal')}</h2>[m
[32m+[m[32m          <p>{isRegistering ? t('auth.createSubtitle') : t('auth.tagline')}</p>[m
         </div>[m
 [m
         {error && <div className="login-error-msg">{error}</div>}[m
[31m-        {successMsg && <div className="login-success-msg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>{successMsg}</div>}[m
[32m+[m[32m        {successMsg && <div className="login-success-msg">{successMsg}</div>}[m
 [m
         {!isRegistering ? ([m
           <>[m
             <div className="login-tabs">[m
[31m-              <button [m
[32m+[m[32m              <button[m
                 className={`tab-btn ${loginMethod === 'password' ? 'active' : ''}`}[m
                 onClick={() => { setLoginMethod('password'); setError(''); }}[m
               >[m
[31m-                🔑 Mật khẩu[m
[32m+[m[32m                🔑 {t('auth.tabPassword')}[m
               </button>[m
[31m-              <button [m
[32m+[m[32m              <button[m
                 className={`tab-btn ${loginMethod === 'face' ? 'active' : ''}`}[m
                 onClick={() => { setLoginMethod('face'); setError(''); setFaceStatus('idle'); }}[m
               >[m
[31m-                📷 Khuôn mặt[m
[32m+[m[32m                📷 {t('auth.tabFace')}[m
               </button>[m
             </div>[m
 [m
             {loginMethod === 'password' ? ([m
               <form className="login-form" onSubmit={handlePasswordLogin}>[m
                 <div className="input-group">[m
[31m-                  <label>Tài khoản hoặc Email</label>[m
[31m-                  <input [m
[31m-                    type="text" [m
[31m-                    placeholder="Nhập username hoặc email..." [m
[32m+[m[32m                  <label>{t('auth.usernameOrEmail')}</label>[m
[32m+[m[32m                  <input[m
[32m+[m[32m                    type="text"[m
[32m+[m[32m                    placeholder={t('auth.ph.username')}[m
                     value={usernameOrEmail}[m
                     onChange={(e) => setUsernameOrEmail(e.target.value)}[m
                     disabled={loading}[m
                   />[m
                 </div>[m
                 <div className="input-group">[m
[31m-                  <label>Mật khẩu</label>[m
[31m-                  <input [m
[31m-                    type="password" [m
[31m-                    placeholder="Nhập mật khẩu..." [m
[32m+[m[32m                  <label>{t('auth.password')}</label>[m
[32m+[m[32m                  <input[m
[32m+[m[32m                    type="password"[m
[32m+[m[32m                    placeholder={t('auth.ph.password')}[m
                     value={password}[m
                     onChange={(e) => setPassword(e.target.value)}[m
                     disabled={loading}[m
                   />[m
                 </div>[m
                 <button type="submit" className="login-submit-btn" disabled={loading}>[m
[31m-                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}[m
[32m+[m[32m                  {loading ? t('auth.submittingLogin') : t('auth.submitLogin')}[m
                 </button>[m
               </form>[m
             ) : ([m
[36m@@ -219,23 +221,23 @@[m [mexport default function Login({ onLoginSuccess }) {[m
                 <div className="login-camera-container">[m
                   <CameraBox onCapture={handleFaceCapture} captureTrigger={0} status={faceStatus} />[m
                 </div>[m
[31m-                [m
[32m+[m
                 <div className="face-scan-status">[m
[31m-                  {faceStatus === 'idle' && <p className="status-text text-idle">Chụp ảnh khuôn mặt đã đăng ký để đăng nhập</p>}[m
[31m-                  {faceStatus === 'scanning' && <p className="status-text text-scanning">🔄 Đang nhận diện... Vui lòng giữ nguyên khuôn mặt</p>}[m
[31m-                  {faceStatus === 'success' && <p className="status-text text-success">✔️ Nhận dạng thành công! Đang chuyển hướng...</p>}[m
[31m-                  {faceStatus === 'error' && <p className="status-text text-error">❌ Nhận dạng thất bại. Hãy thử lại dưới điều kiện đủ ánh sáng.</p>}[m
[32m+[m[32m                  {faceStatus === 'idle' && <p className="status-text text-idle">{t('auth.faceCaptureHint')}</p>}[m
[32m+[m[32m                  {faceStatus === 'scanning' && <p className="status-text text-scanning">{t('auth.faceScanning')}</p>}[m
[32m+[m[32m                  {faceStatus === 'success' && <p className="status-text text-success">{t('auth.faceSuccess')}</p>}[m
[32m+[m[32m                  {faceStatus === 'error' && <p className="status-text text-error">{t('auth.faceFail')}</p>}[m
                 </div>[m
               </div>[m
             )}[m
 [m
             <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>[m
[31m-              <span>Chưa có tài khoản? </span>[m
[31m-              <button [m
[32m+[m[32m              <span>{t('auth.noAccount')} </span>[m
[32m+[m[32m              <button[m
[32m+[m[32m                className="login-toggle-btn"[m
                 onClick={() => { setIsRegistering(true); setError(''); }}[m
[31m-                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: '600', padding: 0 }}[m
               >[m
[31m-                Đăng ký ngay[m
[32m+[m[32m                {t('auth.goRegister')}[m
               </button>[m
             </div>[m
           </>[m
[36m@@ -244,11 +246,11 @@[m [mexport default function Login({ onLoginSuccess }) {[m
           <>[m
             <form className="login-form" onSubmit={handleRegister}>[m
               <div className="input-group">[m
[31m-                <label>Tên tài khoản (Username) *</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[32m+[m[32m                <label>{t('auth.regUsernameLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
                   name="user_id"[m
[31m-                  placeholder="Nhập username đăng nhập..." [m
[32m+[m[32m                  placeholder={t('auth.ph.username_login')}[m
                   value={regForm.user_id}[m
                   onChange={handleRegChange}[m
                   disabled={loading}[m
[36m@@ -256,11 +258,11 @@[m [mexport default function Login({ onLoginSuccess }) {[m
                 />[m
               </div>[m
               <div className="input-group">[m
[31m-                <label>Họ và tên *</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[32m+[m[32m                <label>{t('auth.regFullNameLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
                   name="name"[m
[31m-                  placeholder="Nhập họ tên đầy đủ..." [m
[32m+[m[32m                  placeholder={t('auth.ph.full_name')}[m
                   value={regForm.name}[m
                   onChange={handleRegChange}[m
                   disabled={loading}[m
[36m@@ -268,22 +270,22 @@[m [mexport default function Login({ onLoginSuccess }) {[m
                 />[m
               </div>[m
               <div className="input-group">[m
[31m-                <label>Địa chỉ Email</label>[m
[31m-                <input [m
[31m-                  type="email" [m
[32m+[m[32m                <label>{t('auth.regEmailLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="email"[m
                   name="email"[m
[31m-                  placeholder="Nhập email (ví dụ: name@gmail.com)..." [m
[32m+[m[32m                  placeholder={t('auth.ph.email')}[m
                   value={regForm.email}[m
                   onChange={handleRegChange}[m
                   disabled={loading}[m
                 />[m
               </div>[m
               <div className="input-group">[m
[31m-                <label>Mật khẩu *</label>[m
[31m-                <input [m
[31m-                  type="password" [m
[32m+[m[32m                <label>{t('auth.regPasswordLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="password"[m
                   name="password"[m
[31m-                  placeholder="Thiết lập mật khẩu..." [m
[32m+[m[32m                  placeholder={t('auth.ph.set_password')}[m
                   value={regForm.password}[m
                   onChange={handleRegChange}[m
                   disabled={loading}[m
[36m@@ -291,40 +293,40 @@[m [mexport default function Login({ onLoginSuccess }) {[m
                 />[m
               </div>[m
               <div className="input-group">[m
[31m-                <label>Khoa / Bộ phận</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[32m+[m[32m                <label>{t('auth.regDepartmentLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
                   name="department"[m
[31m-                  placeholder="Nhập khoa hoặc phòng ban..." [m
[32m+[m[32m                  placeholder={t('auth.ph.department')}[m
                   value={regForm.department}[m
                   onChange={handleRegChange}[m
                   disabled={loading}[m
                 />[m
               </div>[m
               <div className="input-group">[m
[31m-                <label>Ảnh chụp khuôn mặt (Không bắt buộc)</label>[m
[31m-                <input [m
[31m-                  type="file" [m
[31m-                  accept="image/*" [m
[31m-                  multiple [m
[32m+[m[32m                <label>{t('auth.regFaceLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="file"[m
[32m+[m[32m                  accept="image/*"[m
[32m+[m[32m                  multiple[m
                   onChange={handleRegFileChange}[m
                   disabled={loading}[m
                 />[m
[31m-                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Không bắt buộc. Chọn ít nhất 1 ảnh rõ nét nếu muốn đăng nhập bằng khuôn mặt</span>[m
[32m+[m[32m                <span className="login-helper-text">{t('auth.regFaceHint')}</span>[m
               </div>[m
[31m-              [m
[32m+[m
               <button type="submit" className="login-submit-btn" disabled={loading}>[m
[31m-                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}[m
[32m+[m[32m                {loading ? t('auth.submittingRegister') : t('auth.submitRegister')}[m
               </button>[m
             </form>[m
 [m
             <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>[m
[31m-              <span>Đã có tài khoản? </span>[m
[31m-              <button [m
[32m+[m[32m              <span>{t('auth.haveAccount')} </span>[m
[32m+[m[32m              <button[m
[32m+[m[32m                className="login-toggle-btn"[m
                 onClick={() => { setIsRegistering(false); setError(''); }}[m
[31m-                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: '600', padding: 0 }}[m
               >[m
[31m-                Đăng nhập[m
[32m+[m[32m                {t('auth.goLogin')}[m
               </button>[m
             </div>[m
           </>[m
[36m@@ -332,4 +334,4 @@[m [mexport default function Login({ onLoginSuccess }) {[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Logs/index.jsx b/frontend/src/pages/Logs/index.jsx[m
[1mindex e9b7102..0b9b1d3 100644[m
[1m--- a/frontend/src/pages/Logs/index.jsx[m
[1m+++ b/frontend/src/pages/Logs/index.jsx[m
[36m@@ -1,7 +1,9 @@[m
 import React, { useEffect, useState } from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import { fetchLogs } from '../../services/api';[m
 [m
 function Logs() {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [logs, setLogs] = useState([]);[m
   const [loading, setLoading] = useState(true);[m
 [m
[36m@@ -20,19 +22,19 @@[m [mfunction Logs() {[m
 [m
   return ([m
     <section className="page">[m
[31m-      <h2>Logs / History</h2>[m
[32m+[m[32m      <h2>{t('logs.title')}</h2>[m
       {loading ? ([m
[31m-        <p>Đang tải lịch sử...</p>[m
[32m+[m[32m        <p>{t('logs.loading')}</p>[m
       ) : ([m
         <table className="user-table">[m
           <thead>[m
             <tr>[m
[31m-              <th>Log ID</th>[m
[31m-              <th>User ID</th>[m
[31m-              <th>Tên</th>[m
[31m-              <th>Trạng thái</th>[m
[31m-              <th>Thời gian</th>[m
[31m-              <th>Ảnh</th>[m
[32m+[m[32m              <th>{t('logs.logId')}</th>[m
[32m+[m[32m              <th>{t('logs.userId')}</th>[m
[32m+[m[32m              <th>{t('logs.name')}</th>[m
[32m+[m[32m              <th>{t('logs.status')}</th>[m
[32m+[m[32m              <th>{t('logs.time')}</th>[m
[32m+[m[32m              <th>{t('logs.photo')}</th>[m
             </tr>[m
           </thead>[m
           <tbody>[m
[36m@@ -47,17 +49,17 @@[m [mfunction Logs() {[m
                   <td>[m
                     {log.captured_image_url ? ([m
                       <a href={log.captured_image_url} target="_blank" rel="noreferrer">[m
[31m-                        Xem[m
[32m+[m[32m                        {t('logs.view')}[m
                       </a>[m
                     ) : ([m
[31m-                      'Không có'[m
[32m+[m[32m                      t('logs.none')[m
                     )}[m
                   </td>[m
                 </tr>[m
               ))[m
             ) : ([m
               <tr>[m
[31m-                <td colSpan="6">Không có lịch sử quét nào.</td>[m
[32m+[m[32m                <td colSpan="6">{t('logs.empty')}</td>[m
               </tr>[m
             )}[m
           </tbody>[m
[36m@@ -67,4 +69,4 @@[m [mfunction Logs() {[m
   );[m
 }[m
 [m
[31m-export default Logs;[m
[32m+[m[32mexport default Logs;[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Music/Music.css b/frontend/src/pages/Music/Music.css[m
[1mindex 7f5b800..568b7cb 100644[m
[1m--- a/frontend/src/pages/Music/Music.css[m
[1m+++ b/frontend/src/pages/Music/Music.css[m
[36m@@ -56,16 +56,16 @@[m
 }[m
 [m
 .menu-item.active {[m
[31m-  background: #6366f1;[m
[31m-  border-color: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border-color: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-weight: 600;[m
 }[m
 [m
 .sidebar-footer {[m
   margin-top: 30px;[m
   padding-top: 20px;[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
 }[m
 [m
 .stats {[m
[36m@@ -77,7 +77,7 @@[m
 .stats p {[m
   margin: 0;[m
   font-size: 13px;[m
[31m-  color: rgba(255, 255, 255, 0.8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .music-main {[m
[36m@@ -105,6 +105,43 @@[m
   margin: 0;[m
 }[m
 [m
[32m+[m[32m.music-header-subtitle {[m
[32m+[m[32m  margin: 5px 0 0 0;[m
[32m+[m[32m  font-size: 18px;[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.music-error-text {[m
[32m+[m[32m  text-align: center;[m
[32m+[m[32m  color: var(--status-error-fg);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.music-empty-text {[m
[32m+[m[32m  text-align: center;[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  margin-top: 20px;[m
[32m+[m[32m  font-style: italic;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.view-all-playlists-btn {[m
[32m+[m[32m  background: none;[m
[32m+[m[32m  border: none;[m
[32m+[m[32m  color: var(--accent-purple);[m
[32m+[m[32m  cursor: pointer;[m
[32m+[m[32m  font-weight: 600;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.view-all-playlists-btn:hover {[m
[32m+[m[32m  text-decoration: underline;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.music-modal-title {[m
[32m+[m[32m  margin: 0;[m
[32m+[m[32m  font-size: 1.5rem;[m
[32m+[m[32m  font-weight: 600;[m
[32m+[m[32m  color: var(--accent-purple);[m
[32m+[m[32m}[m
[32m+[m
 .music-content {[m
   max-width: 1200px;[m
   margin: 0 auto;[m
[36m@@ -129,20 +166,20 @@[m
 }[m
 [m
 .playlist-card {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[31m-  backdrop-filter: blur(10px);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  background: var(--glass-bg);[m
[32m+[m[32m  border: 1px solid var(--glass-border);[m
   border-radius: 12px;[m
   padding: 20px;[m
   text-align: center;[m
   cursor: pointer;[m
   transition: all 0.3s ease;[m
[32m+[m[32m  color: var(--glass-text);[m
 }[m
 [m
 .playlist-card:hover {[m
[31m-  background: rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  background: var(--glass-bg-hover);[m
   transform: translateY(-5px);[m
[31m-  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
 }[m
 [m
 .playlist-image {[m
[36m@@ -154,11 +191,12 @@[m
   font-size: 18px;[m
   margin: 10px 0;[m
   font-weight: 600;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .playlist-card p {[m
   font-size: 14px;[m
[31m-  color: rgba(255, 255, 255, 0.7);[m
[32m+[m[32m  color: var(--glass-text-muted);[m
   margin: 0;[m
 }[m
 [m
[36m@@ -172,16 +210,16 @@[m
   display: flex;[m
   align-items: center;[m
   justify-content: space-between;[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[31m-  backdrop-filter: blur(10px);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  background: var(--glass-bg);[m
[32m+[m[32m  border: 1px solid var(--glass-border);[m
   border-radius: 8px;[m
   padding: 15px;[m
   transition: all 0.3s ease;[m
[32m+[m[32m  color: var(--glass-text);[m
 }[m
 [m
 .song-item:hover {[m
[31m-  background: rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  background: var(--glass-bg-hover);[m
 }[m
 [m
 .song-info {[m
[36m@@ -192,24 +230,25 @@[m
   margin: 0 0 5px 0;[m
   font-size: 16px;[m
   font-weight: 600;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .song-info p {[m
   margin: 0;[m
   font-size: 13px;[m
[31m-  color: rgba(255, 255, 255, 0.7);[m
[32m+[m[32m  color: var(--glass-text-muted);[m
 }[m
 [m
 .song-duration {[m
   margin: 0 20px;[m
   font-size: 14px;[m
[31m-  color: rgba(255, 255, 255, 0.6);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .play-btn {[m
[31m-  background: rgba(255, 255, 255, 0.2);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.3);[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  border: 1px solid var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   width: 40px;[m
   height: 40px;[m
   border-radius: 50%;[m
[36m@@ -222,13 +261,13 @@[m
 }[m
 [m
 .play-btn:hover {[m
[31m-  background: rgba(255, 255, 255, 0.3);[m
[32m+[m[32m  opacity: 0.85;[m
   transform: scale(1.1);[m
 }[m
 [m
 .play-btn.bookmark-active {[m
[31m-  background: rgba(168, 85, 247, 0.35);[m
[31m-  border-color: rgba(168, 85, 247, 0.7);[m
[32m+[m[32m  background: var(--accent-pink);[m
[32m+[m[32m  border-color: var(--accent-pink);[m
 }[m
 [m
 /* Scrollbar styling */[m
[36m@@ -239,18 +278,18 @@[m
 [m
 .music-sidebar::-webkit-scrollbar-track,[m
 .music-main::-webkit-scrollbar-track {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .music-sidebar::-webkit-scrollbar-thumb,[m
 .music-main::-webkit-scrollbar-thumb {[m
[31m-  background: rgba(255, 255, 255, 0.3);[m
[32m+[m[32m  background: var(--border-color);[m
   border-radius: 3px;[m
 }[m
 [m
 .music-sidebar::-webkit-scrollbar-thumb:hover,[m
 .music-main::-webkit-scrollbar-thumb:hover {[m
[31m-  background: rgba(255, 255, 255, 0.5);[m
[32m+[m[32m  background: var(--text-muted);[m
 }[m
 [m
 /* Floating Audio Player Styling */[m
[36m@@ -259,16 +298,16 @@[m
   bottom: 0;[m
   left: 0;[m
   right: 0;[m
[31m-  background: rgba(30, 30, 60, 0.85);[m
[32m+[m[32m  background: var(--scanner-bg);[m
   backdrop-filter: blur(15px);[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  border-top: 1px solid var(--glass-border);[m
   padding: 15px 40px;[m
   display: flex;[m
   align-items: center;[m
   justify-content: space-between;[m
   z-index: 100;[m
[31m-  color: white;[m
[31m-  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);[m
[32m+[m[32m  color: var(--text-on-accent);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
   animation: slideUp 0.3s ease;[m
 }[m
 [m
[36m@@ -309,7 +348,7 @@[m
 .player-btn {[m
   background: transparent;[m
   border: none;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-size: 20px;[m
   cursor: pointer;[m
   transition: all 0.2s ease;[m
[36m@@ -320,8 +359,8 @@[m
 }[m
 [m
 .player-btn.play-pause {[m
[31m-  background: white;[m
[31m-  color: #764ba2;[m
[32m+[m[32m  background: var(--text-on-accent);[m
[32m+[m[32m  color: var(--scanner-bg);[m
   width: 40px;[m
   height: 40px;[m
   border-radius: 50%;[m
[36m@@ -332,7 +371,7 @@[m
 }[m
 [m
 .player-btn.play-pause:hover {[m
[31m-  background: rgba(255, 255, 255, 0.9);[m
[32m+[m[32m  opacity: 0.9;[m
 }[m
 [m
 .progress-container {[m
[36m@@ -341,7 +380,7 @@[m
   width: 100%;[m
   gap: 10px;[m
   font-size: 12px;[m
[31m-  color: rgba(255, 255, 255, 0.6);[m
[32m+[m[32m  color: rgba(255, 255, 255, 0.7);[m
 }[m
 [m
 .progress-bar {[m
[36m@@ -355,7 +394,7 @@[m
 [m
 .progress-filled {[m
   height: 100%;[m
[31m-  background: #667eea;[m
[32m+[m[32m  background: var(--accent-primary);[m
   border-radius: 2px;[m
   position: absolute;[m
   top: 0;[m
[36m@@ -373,7 +412,7 @@[m
 .volume-slider {[m
   flex: 1;[m
   cursor: pointer;[m
[31m-  accent-color: #667eea;[m
[32m+[m[32m  accent-color: var(--accent-primary);[m
 }[m
 [m
 @keyframes slideUp {[m
[36m@@ -383,15 +422,15 @@[m
 [m
 /* Admin Music Upload Modal Styles */[m
 .upload-music-btn {[m
[31m-  background: linear-gradient(135deg, #10b981 0%, #059669 100%);[m
[31m-  color: white;[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-success) 0%, var(--accent-success-2) 100%);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   padding: 10px 22px;[m
   border-radius: 30px;[m
   font-weight: 700;[m
   font-size: 0.9rem;[m
   cursor: pointer;[m
[31m-  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
   transition: all 0.2s ease;[m
   display: flex;[m
   align-items: center;[m
[36m@@ -400,7 +439,7 @@[m
 [m
 .upload-music-btn:hover {[m
   transform: translateY(-2px);[m
[31m-  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
 }[m
 [m
 .music-modal-overlay {[m
[36m@@ -419,15 +458,14 @@[m
 }[m
 [m
 .music-modal-content {[m
[31m-  background: rgba(25, 25, 45, 0.85);[m
[31m-  backdrop-filter: blur(20px);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 16px;[m
   width: 90%;[m
   max-width: 500px;[m
   padding: 25px;[m
[31m-  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);[m
[31m-  color: white;[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
[32m+[m[32m  color: var(--text-main);[m
   animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);[m
 }[m
 [m
[36m@@ -436,7 +474,7 @@[m
   justify-content: space-between;[m
   align-items: center;[m
   margin-bottom: 20px;[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   padding-bottom: 12px;[m
 }[m
 [m
[36m@@ -444,20 +482,20 @@[m
   margin: 0;[m
   font-size: 1.5rem;[m
   font-weight: 600;[m
[31m-  color: #10b981;[m
[32m+[m[32m  color: var(--accent-success);[m
 }[m
 [m
 .music-close-btn {[m
   background: transparent;[m
   border: none;[m
[31m-  color: rgba(255, 255, 255, 0.6);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 1.5rem;[m
   cursor: pointer;[m
   transition: color 0.2s;[m
 }[m
 [m
 .music-close-btn:hover {[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .music-modal-body {[m
[36m@@ -475,16 +513,16 @@[m
 .music-form-group label {[m
   font-size: 0.85rem;[m
   font-weight: 600;[m
[31m-  color: rgba(255, 255, 255, 0.8);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .music-form-group input,[m
 .music-form-group select {[m
   padding: 10px 14px;[m
[31m-  background: rgba(255, 255, 255, 0.08);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  background: var(--bg-input);[m
[32m+[m[32m  border: 1px solid var(--border-input);[m
   border-radius: 8px;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-input);[m
   font-size: 0.95rem;[m
   outline: none;[m
   transition: all 0.2s;[m
[36m@@ -492,12 +530,12 @@[m
 [m
 .music-form-group input:focus,[m
 .music-form-group select:focus {[m
[31m-  background: rgba(255, 255, 255, 0.15);[m
[31m-  border-color: #10b981;[m
[32m+[m[32m  background: var(--bg-input);[m
[32m+[m[32m  border-color: var(--accent-success);[m
 }[m
 [m
 .music-form-group input::placeholder {[m
[31m-  color: rgba(255, 255, 255, 0.35);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .music-form-group input[type="file"] {[m
[36m@@ -505,13 +543,11 @@[m
   cursor: pointer;[m
 }[m
 [m
[31m-/* Fix browser native dropdown option colors */[m
 .music-form-group select option {[m
[31m-  background: #1e2235;[m
[31m-  color: #ffffff;[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  color: var(--text-main);[m
 }[m
 [m
[31m-[m
 .music-progress-container {[m
   margin-top: 15px;[m
   display: flex;[m
[36m@@ -523,13 +559,13 @@[m
   display: flex;[m
   justify-content: space-between;[m
   font-size: 0.85rem;[m
[31m-  color: rgba(255, 255, 255, 0.7);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .music-progress-bar {[m
   width: 100%;[m
   height: 8px;[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--bg-item);[m
   border-radius: 4px;[m
   overflow: hidden;[m
   position: relative;[m
[36m@@ -537,7 +573,7 @@[m
 [m
 .music-progress-filled {[m
   height: 100%;[m
[31m-  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);[m
[32m+[m[32m  background: linear-gradient(90deg, var(--accent-success) 0%, #34d399 100%);[m
   border-radius: 4px;[m
   transition: width 0.1s ease;[m
 }[m
[36m@@ -547,14 +583,14 @@[m
   justify-content: flex-end;[m
   gap: 12px;[m
   margin-top: 25px;[m
[31m-  border-top: 1px solid rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  border-top: 1px solid var(--border-color);[m
   padding-top: 15px;[m
 }[m
 [m
 .music-cancel-btn {[m
   background: transparent;[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.2);[m
[31m-  color: white;[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 10px 20px;[m
   border-radius: 8px;[m
   cursor: pointer;[m
[36m@@ -563,12 +599,12 @@[m
 }[m
 [m
 .music-cancel-btn:hover {[m
[31m-  background: rgba(255, 255, 255, 0.08);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .music-submit-btn {[m
[31m-  background: #10b981;[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--accent-success);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   padding: 10px 24px;[m
   border-radius: 8px;[m
[36m@@ -584,8 +620,8 @@[m
 }[m
 [m
 .music-submit-btn:disabled {[m
[31m-  background: rgba(255, 255, 255, 0.15);[m
[31m-  color: rgba(255, 255, 255, 0.4);[m
[32m+[m[32m  background: var(--bg-item);[m
[32m+[m[32m  color: var(--text-muted);[m
   cursor: not-allowed;[m
   transform: none;[m
 }[m
[36m@@ -602,15 +638,15 @@[m
 [m
 /* Playlist Specific Styles */[m
 .create-playlist-btn {[m
[31m-  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);[m
[31m-  color: white;[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-2) 100%);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   border: none;[m
   padding: 10px 22px;[m
   border-radius: 30px;[m
   font-weight: 700;[m
   font-size: 0.9rem;[m
   cursor: pointer;[m
[31m-  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
   transition: all 0.2s ease;[m
   display: flex;[m
   align-items: center;[m
[36m@@ -619,7 +655,7 @@[m
 [m
 .create-playlist-btn:hover {[m
   transform: translateY(-2px);[m
[31m-  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
 }[m
 [m
 .emoji-selector-panel {[m
[36m@@ -628,10 +664,10 @@[m
   gap: 8px;[m
   max-height: 150px;[m
   overflow-y: auto;[m
[31m-  background: rgba(0, 0, 0, 0.2);[m
[32m+[m[32m  background: var(--bg-item);[m
   padding: 10px;[m
   border-radius: 8px;[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
 }[m
 [m
 .emoji-option-btn {[m
[36m@@ -648,12 +684,12 @@[m
 }[m
 [m
 .emoji-option-btn:hover {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--bg-item);[m
   transform: scale(1.15);[m
 }[m
 [m
 .emoji-option-btn.active {[m
[31m-  border-color: #8b5cf6;[m
[32m+[m[32m  border-color: var(--accent-purple);[m
   background: rgba(139, 92, 246, 0.2);[m
 }[m
 [m
[36m@@ -668,7 +704,7 @@[m
   right: 10px;[m
   background: rgba(239, 68, 68, 0.2);[m
   border: 1px solid rgba(239, 68, 68, 0.4);[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
   width: 32px;[m
   height: 32px;[m
   border-radius: 50%;[m
[36m@@ -686,7 +722,7 @@[m
 }[m
 [m
 .playlist-card-delete-btn:hover {[m
[31m-  background: rgba(239, 68, 68, 0.8);[m
[32m+[m[32m  background: var(--accent-danger);[m
   transform: scale(1.1);[m
 }[m
 [m
[36m@@ -695,15 +731,14 @@[m
   position: absolute;[m
   bottom: 50px;[m
   right: 0;[m
[31m-  background: rgba(25, 25, 45, 0.95);[m
[31m-  backdrop-filter: blur(15px);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   width: 220px;[m
   max-height: 250px;[m
   overflow-y: auto;[m
   z-index: 500;[m
[31m-  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
   animation: fadeIn 0.2s ease;[m
 }[m
 [m
[36m@@ -711,8 +746,8 @@[m
   padding: 10px 14px;[m
   font-size: 0.85rem;[m
   font-weight: 600;[m
[31m-  color: rgba(255, 255, 255, 0.5);[m
[31m-  border-bottom: 1px solid rgba(255, 255, 255, 0.08);[m
[32m+[m[32m  color: var(--text-muted);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
 }[m
 [m
 .popover-list {[m
[36m@@ -729,7 +764,7 @@[m
   padding: 8px 12px;[m
   background: transparent;[m
   border: none;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-main);[m
   text-align: left;[m
   font-size: 0.9rem;[m
   cursor: pointer;[m
[36m@@ -738,14 +773,14 @@[m
 }[m
 [m
 .popover-item:hover {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .popover-empty {[m
   padding: 15px;[m
   text-align: center;[m
   font-size: 0.85rem;[m
[31m-  color: rgba(255, 255, 255, 0.4);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 /* Playlist Detail View */[m
[36m@@ -754,9 +789,9 @@[m
 }[m
 [m
 .playlist-back-btn {[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.2);[m
[31m-  color: white;[m
[32m+[m[32m  background: var(--glass-bg);[m
[32m+[m[32m  border: 1px solid var(--glass-border);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 8px 16px;[m
   border-radius: 20px;[m
   cursor: pointer;[m
[36m@@ -767,7 +802,7 @@[m
 }[m
 [m
 .playlist-back-btn:hover {[m
[31m-  background: rgba(255, 255, 255, 0.2);[m
[32m+[m[32m  background: var(--glass-bg-hover);[m
   transform: translateX(-3px);[m
 }[m
 [m
[36m@@ -780,16 +815,15 @@[m
 [m
 .playlist-detail-art {[m
   font-size: 100px;[m
[31m-  background: rgba(255, 255, 255, 0.1);[m
[31m-  backdrop-filter: blur(10px);[m
[31m-  border: 1px solid rgba(255, 255, 255, 0.15);[m
[32m+[m[32m  background: var(--glass-bg);[m
[32m+[m[32m  border: 1px solid var(--glass-border);[m
   width: 180px;[m
   height: 180px;[m
   border-radius: 20px;[m
   display: flex;[m
   align-items: center;[m
   justify-content: center;[m
[31m-  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);[m
[32m+[m[32m  box-shadow: var(--shadow-card-hover);[m
 }[m
 [m
 .playlist-detail-info {[m
[36m@@ -804,7 +838,7 @@[m
   font-weight: 800;[m
   letter-spacing: 1.5px;[m
   text-transform: uppercase;[m
[31m-  color: #a78bfa;[m
[32m+[m[32m  color: var(--accent-purple);[m
 }[m
 [m
 .playlist-detail-info h1 {[m
[36m@@ -812,7 +846,7 @@[m
   margin: 0;[m
   font-weight: 800;[m
   line-height: 1.1;[m
[31m-  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);[m
[32m+[m[32m  background: linear-gradient(135deg, var(--text-title) 0%, var(--accent-purple) 100%);[m
   -webkit-background-clip: text;[m
   -webkit-text-fill-color: transparent;[m
 }[m
[36m@@ -820,7 +854,7 @@[m
 .playlist-description {[m
   margin: 5px 0 0 0;[m
   font-size: 1.1rem;[m
[31m-  color: rgba(255, 255, 255, 0.7);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .playlist-meta {[m
[36m@@ -829,13 +863,13 @@[m
   gap: 15px;[m
   margin-top: 10px;[m
   font-size: 0.95rem;[m
[31m-  color: rgba(255, 255, 255, 0.5);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .playlist-detail-delete-btn {[m
   background: rgba(239, 68, 68, 0.2);[m
   border: 1px solid rgba(239, 68, 68, 0.4);[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
   padding: 6px 14px;[m
   border-radius: 6px;[m
   cursor: pointer;[m
[36m@@ -845,6 +879,5 @@[m
 }[m
 [m
 .playlist-detail-delete-btn:hover {[m
[31m-  background: rgba(239, 68, 68, 0.8);[m
[31m-}[m
[31m-[m
[32m+[m[32m  background: var(--accent-danger);[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Music/Sidebar.jsx b/frontend/src/pages/Music/Sidebar.jsx[m
[1mindex 2511fff..20a84c5 100644[m
[1m--- a/frontend/src/pages/Music/Sidebar.jsx[m
[1m+++ b/frontend/src/pages/Music/Sidebar.jsx[m
[36m@@ -1,18 +1,20 @@[m
 import React from 'react';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 export default function Sidebar({ selectedCategory, onSelectCategory, stats }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const menuItems = [[m
[31m-    { id: 'all', label: '🎵 Tất Cả', icon: '🎵' },[m
[31m-    { id: 'library', label: '📚 Thư Viện', icon: '📚' },[m
[31m-    { id: 'playlist', label: '📋 Danh Sách Phát', icon: '📋' },[m
[31m-    { id: 'favorite', label: '❤️ Yêu Thích', icon: '❤️' },[m
[31m-    { id: 'recent', label: '⏰ Gần Đây', icon: '⏰' },[m
[32m+[m[32m    { id: 'all', labelKey: 'music.sidebar.all', icon: '🎵' },[m
[32m+[m[32m    { id: 'library', labelKey: 'music.sidebar.library', icon: '📚' },[m
[32m+[m[32m    { id: 'playlist', labelKey: 'music.sidebar.playlist', icon: '📋' },[m
[32m+[m[32m    { id: 'favorite', labelKey: 'music.sidebar.favorite', icon: '❤️' },[m
[32m+[m[32m    { id: 'recent', labelKey: 'music.sidebar.recent', icon: '⏰' },[m
   ];[m
 [m
   return ([m
     <div className="music-sidebar">[m
       <div className="sidebar-header">[m
[31m-        <h3>🎵 THƯ VIỆN ÂM NHẠC</h3>[m
[32m+[m[32m        <h3>🎵 {t('music.libraryHeading')}</h3>[m
       </div>[m
       <nav className="sidebar-menu">[m
         {menuItems.map(item => ([m
[36m@@ -21,18 +23,18 @@[m [mexport default function Sidebar({ selectedCategory, onSelectCategory, stats }) {[m
             className={`menu-item ${selectedCategory === item.id ? 'active' : ''}`}[m
             onClick={() => onSelectCategory(item.id)}[m
           >[m
[31m-            {item.label}[m
[32m+[m[32m            {item.icon} {t(item.labelKey)}[m
           </button>[m
         ))}[m
       </nav>[m
 [m
       <div className="sidebar-footer">[m
         <div className="stats">[m
[31m-          <p>🎵 Bài Hát: {stats?.totalSongs || 0}</p>[m
[31m-          <p>📋 Danh Sách: {stats?.totalPlaylists || 0}</p>[m
[31m-          <p>⏱️ Thời Gian: {stats?.totalDuration || '0h 00m'}</p>[m
[32m+[m[32m          <p>🎵 {t('music.sidebar.songs')} {stats?.totalSongs || 0}</p>[m
[32m+[m[32m          <p>📋 {t('music.sidebar.playlists')} {stats?.totalPlaylists || 0}</p>[m
[32m+[m[32m          <p>⏱️ {t('music.sidebar.duration')} {stats?.totalDuration || '0h 00m'}</p>[m
         </div>[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Music/index.jsx b/frontend/src/pages/Music/index.jsx[m
[1mindex 985beda..bebd40c 100644[m
[1m--- a/frontend/src/pages/Music/index.jsx[m
[1m+++ b/frontend/src/pages/Music/index.jsx[m
[36m@@ -6,12 +6,11 @@[m [mimport * as api from '../../services/api';[m
 import { readJson } from '../../lib/safeStorage';[m
 import { getLikedSongIds, toggleLikedSong, isLikedSong } from '../../lib/likedSongs';[m
 import { useBookmarks } from '../../lib/BookmarksContext';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
[31m-export default function Music({ currentUser }) {[m
[31m-  // Use prop from App.jsx (React state from /auth/me) as source of truth.[m
[31m-  // localStorage.user was removed from the codebase, so readJson('user') returns null.[m
[31m-  const user = currentUser;[m
[31m-  const isAdmin = Boolean(user && user.role === 'admin');[m
[32m+[m[32mexport default function Music() {[m
[32m+[m[32m  const { t } = useTranslation();[m
[32m+[m[32m  const user = readJson('user');[m
   const { isBookmarked: isBm, toggle: toggleBm } = useBookmarks();[m
 [m
   const [selectedCategory, setSelectedCategory] = useState('all');[m
[36m@@ -86,7 +85,7 @@[m [mexport default function Music({ currentUser }) {[m
       ]);[m
       const allSongs = songsRes.data || [];[m
       const allPlaylists = playlistsRes.data || [];[m
[31m-      [m
[32m+[m
       let totalSeconds = 0;[m
       allSongs.forEach(song => {[m
         if (song.duration) {[m
[36m@@ -98,11 +97,11 @@[m [mexport default function Music({ currentUser }) {[m
           }[m
         }[m
       });[m
[31m-      [m
[32m+[m
       const hours = Math.floor(totalSeconds / 3600);[m
       const minutes = Math.floor((totalSeconds % 3600) / 60);[m
       const durationStr = `${hours}h ${minutes}m`;[m
[31m-      [m
[32m+[m
       setMusicStats({[m
         totalSongs: allSongs.length,[m
         totalPlaylists: allPlaylists.length,[m
[36m@@ -117,12 +116,12 @@[m [mexport default function Music({ currentUser }) {[m
     try {[m
       setLoading(true);[m
       setError(null);[m
[31m-      [m
[32m+[m
       if (selectedCategory === 'all' || selectedCategory === 'playlist') {[m
         const playlistResponse = await api.fetchPlaylists();[m
         setPlaylists(playlistResponse.data || []);[m
       }[m
[31m-      [m
[32m+[m
       let songsResponse;[m
       if (selectedPlaylist) {[m
         songsResponse = await api.fetchSongsByPlaylist(selectedPlaylist.id);[m
[36m@@ -135,7 +134,7 @@[m [mexport default function Music({ currentUser }) {[m
         // the full music list. Backend endpoint `/users/me/liked-songs` is[m
         // planned; until then this is the source of truth client-side.[m
         const allSongsRes = await api.fetchAllMusic();[m
[31m-        const likedIds = getLikedSongIds();[m
[32m+[m[32m        const likedIds = GetLikedSongIds();[m
         songsResponse = {[m
           data: (allSongsRes.data || []).filter((s) => likedIds.has(s.id)),[m
         };[m
[36m@@ -149,7 +148,7 @@[m [mexport default function Music({ currentUser }) {[m
       setSongs(songsResponse.data || []);[m
     } catch (err) {[m
       console.error('Error loading music:', err);[m
[31m-      setError('Failed to load music data');[m
[32m+[m[32m      setError(t('music.err.load'));[m
     } finally {[m
       setLoading(false);[m
     }[m
[36m@@ -232,7 +231,7 @@[m [mexport default function Music({ currentUser }) {[m
   };[m
 [m
   const handleDeleteSong = async (songId) => {[m
[31m-    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi thư viện?')) {[m
[32m+[m[32m    if (window.confirm(t('music.confirm.deleteSong'))) {[m
       try {[m
         await api.deleteSong(songId);[m
         loadMusicData();[m
[36m@@ -246,13 +245,13 @@[m [mexport default function Music({ currentUser }) {[m
         }[m
       } catch (err) {[m
         console.error('Error deleting song:', err);[m
[31m-        alert(err.response?.data?.detail || 'Không thể xóa bài hát');[m
[32m+[m[32m        alert(err.response?.data?.detail || t('music.err.deleteSong'));[m
       }[m
     }[m
   };[m
 [m
   const handleDeletePlaylist = async (playlistId) => {[m
[31m-    if (window.confirm('Bạn có chắc chắn muốn xóa danh sách phát này?')) {[m
[32m+[m[32m    if (window.confirm(t('music.confirm.deletePlaylist'))) {[m
       try {[m
         await api.deletePlaylist(playlistId);[m
         if (selectedPlaylist && selectedPlaylist.id === playlistId) {[m
[36m@@ -260,10 +259,10 @@[m [mexport default function Music({ currentUser }) {[m
         }[m
         loadMusicData();[m
         loadMusicStats();[m
[31m-        alert('Đã xóa danh sách phát thành công!');[m
[32m+[m[32m        alert(t('music.ok.deletePlaylist'));[m
       } catch (err) {[m
         console.error('Error deleting playlist:', err);[m
[31m-        alert(err.response?.data?.detail || 'Không thể xóa danh sách phát');[m
[32m+[m[32m        alert(err.response?.data?.detail || t('music.err.deletePlaylist'));[m
       }[m
     }[m
   };[m
[36m@@ -271,7 +270,7 @@[m [mexport default function Music({ currentUser }) {[m
   const handleCreatePlaylistSubmit = async (e) => {[m
     e.preventDefault();[m
     if (!newPlaylistForm.name.trim()) {[m
[31m-      alert('Vui lòng nhập tên danh sách phát!');[m
[32m+[m[32m      alert(t('music.err.playlistNameRequired'));[m
       return;[m
     }[m
     try {[m
[36m@@ -284,10 +283,10 @@[m [mexport default function Music({ currentUser }) {[m
       setNewPlaylistForm({ name: '', description: '', image_url: '🎵' });[m
       loadMusicData();[m
       loadMusicStats();[m
[31m-      alert('Đã tạo danh sách phát thành công!');[m
[32m+[m[32m      alert(t('music.ok.createPlaylist'));[m
     } catch (err) {[m
       console.error('Error creating playlist:', err);[m
[31m-      alert(err.response?.data?.detail || 'Không thể tạo danh sách phát');[m
[32m+[m[32m      alert(err.response?.data?.detail || t('music.err.createPlaylist'));[m
     }[m
   };[m
 [m
[36m@@ -297,23 +296,23 @@[m [mexport default function Music({ currentUser }) {[m
       setActivePopoverSongId(null);[m
       loadMusicData();[m
       loadMusicStats();[m
[31m-      alert('Đã thêm bài hát vào danh sách phát!');[m
[32m+[m[32m      alert(t('music.ok.addSongToPlaylist'));[m
     } catch (err) {[m
       console.error('Error adding song to playlist:', err);[m
[31m-      alert(err.response?.data?.detail || 'Không thể thêm bài hát vào danh sách phát');[m
[32m+[m[32m      alert(err.response?.data?.detail || t('music.err.addSongToPlaylist'));[m
     }[m
   };[m
 [m
   const handleRemoveSongFromPlaylist = async (songId) => {[m
[31m-    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi danh sách phát?')) {[m
[32m+[m[32m    if (window.confirm(t('music.confirm.removeSongFromPlaylist'))) {[m
       try {[m
         await api.removeSongFromPlaylist(songId);[m
         loadMusicData();[m
         loadMusicStats();[m
[31m-        alert('Đã xóa bài hát khỏi danh sách phát thành công!');[m
[32m+[m[32m        alert(t('music.ok.removeSongFromPlaylist'));[m
       } catch (err) {[m
         console.error('Error removing song from playlist:', err);[m
[31m-        alert(err.response?.data?.detail || 'Không thể xóa bài hát khỏi danh sách phát');[m
[32m+[m[32m        alert(err.response?.data?.detail || t('music.err.removeSongFromPlaylist'));[m
       }[m
     }[m
   };[m
[36m@@ -337,18 +336,18 @@[m [mexport default function Music({ currentUser }) {[m
   };[m
 [m
   // Probe audio element used to extract the duration of a user-selected file.[m
[31m-// Holds the in-flight blob URL so we can revoke it exactly once on metadata[m
[31m-// load, on error, or on modal unmount.[m
[31m-const probeAudioRef = useRef(null);[m
[31m-[m
[31m-useEffect(() => () => {[m
[31m-  if (probeAudioRef.current && probeAudioRef.current.src) {[m
[31m-    URL.revokeObjectURL(probeAudioRef.current.src);[m
[31m-    probeAudioRef.current = null;[m
[31m-  }[m
[31m-}, []);[m
[31m-[m
[31m-const handleFileChange = (e) => {[m
[32m+[m[32m  // Holds the in-flight blob URL so we can revoke it exactly once on metadata[m
[32m+[m[32m  // load, on error, or on modal unmount.[m
[32m+[m[32m  const probeAudioRef = useRef(null);[m
[32m+[m
[32m+[m[32m  useEffect(() => () => {[m
[32m+[m[32m    if (probeAudioRef.current && probeAudioRef.current.src) {[m
[32m+[m[32m      URL.revokeObjectURL(probeAudioRef.current.src);[m
[32m+[m[32m      probeAudioRef.current = null;[m
[32m+[m[32m    }[m
[32m+[m[32m  }, []);[m
[32m+[m
[32m+[m[32m  const handleFileChange = (e) => {[m
     const file = e.target.files[0];[m
     if (!file) return;[m
     setMusicFile(file);[m
[36m@@ -386,11 +385,11 @@[m [mconst handleFileChange = (e) => {[m
   const handleUploadSubmit = async (e) => {[m
     e.preventDefault();[m
     if (!musicFile) {[m
[31m-      alert('Vui lòng chọn tệp nhạc!');[m
[32m+[m[32m      alert(t('music.err.fileRequired'));[m
       return;[m
     }[m
     if (!uploadForm.title) {[m
[31m-      alert('Vui lòng điền tên bài hát!');[m
[32m+[m[32m      alert(t('music.err.titleRequired'));[m
       return;[m
     }[m
 [m
[36m@@ -405,7 +404,7 @@[m [mconst handleFileChange = (e) => {[m
 [m
       const mediaUrl = uploadRes.data.media_url;[m
       if (!mediaUrl) {[m
[31m-        throw new Error('Không nhận được URL tệp tin sau khi upload');[m
[32m+[m[32m        throw new Error(t('music.err.noUrl'));[m
       }[m
 [m
       // Step 2: Create song metadata in library[m
[36m@@ -418,7 +417,7 @@[m [mconst handleFileChange = (e) => {[m
         playlist_id: null[m
       });[m
 [m
[31m-      alert('Đã thêm bài hát vào thư viện thành công!');[m
[32m+[m[32m      alert(t('music.ok.upload'));[m
       setShowUploadModal(false);[m
       setUploadForm({[m
         title: '',[m
[36m@@ -432,7 +431,7 @@[m [mconst handleFileChange = (e) => {[m
       loadMusicStats();[m
     } catch (err) {[m
       console.error('Error uploading/creating music:', err);[m
[31m-      alert(err.response?.data?.detail || 'Quá trình upload hoặc thêm nhạc thất bại');[m
[32m+[m[32m      alert(err.response?.data?.detail || t('music.err.upload'));[m
     } finally {[m
       setIsUploading(false);[m
     }[m
[36m@@ -495,57 +494,42 @@[m [mconst handleFileChange = (e) => {[m
 [m
   return ([m
     <div className="music-container" style={{ paddingBottom: currentSong ? '80px' : '0' }}>[m
[31m-      <Sidebar [m
[31m-        selectedCategory={selectedCategory} [m
[32m+[m[32m      <Sidebar[m
[32m+[m[32m        selectedCategory={selectedCategory}[m
         onSelectCategory={(cat) => {[m
           setSelectedPlaylist(null);[m
           setSelectedCategory(cat);[m
[31m-        }} [m
[32m+[m[32m        }}[m
         stats={musicStats}[m
       />[m
       <div className="music-main">[m
         <div className="music-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', textAlign: 'left' }}>[m
           <div>[m
             <h1 style={{ margin: 0, fontSize: '48px', fontWeight: '700', display: 'flex', alignItems: 'center' }}>[m
[31m-              <img [m
[31m-                src="/music-icon.png" [m
[31m-                alt="Music Icon" [m
[31m-                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }} [m
[32m+[m[32m              <img[m
[32m+[m[32m                src="/music-icon.png"[m
[32m+[m[32m                alt={t('music.altIcon')}[m
[32m+[m[32m                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }}[m
               />[m
[31m-              Âm Nhạc Trực Tuyến[m
[32m+[m[32m              {t('music.heading')}[m
             </h1>[m
[31m-            <p style={{ margin: '5px 0 0 0', fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)' }}>Thưởng thức và thư giãn cùng các bài hát bản quyền đỉnh cao</p>[m
[32m+[m[32m            <p className="music-header-subtitle">{t('music.subtitle')}</p>[m
           </div>[m
           <div style={{ display: 'flex', gap: '15px' }}>[m
             {selectedCategory === 'playlist' && !selectedPlaylist && user && ([m
[31m-              <button [m
[32m+[m[32m              <button[m
                 className="create-playlist-btn"[m
                 onClick={() => setShowCreatePlaylistModal(true)}[m
               >[m
[31m-                ➕ Tạo Playlist[m
[32m+[m[32m                ➕ {t('music.createPlaylist')}[m
               </button>[m
             )}[m
[31m-            {isAdmin && ([m
[31m-              <button [m
[32m+[m[32m            {user && user.role === 'admin' && ([m
[32m+[m[32m              <button[m
                 className="upload-music-btn"[m
                 onClick={() => setShowUploadModal(true)}[m
[31m-                style={{[m
[31m-                  padding: '12px 24px',[m
[31m-                  backgroundColor: '#8b5cf6',[m
[31m-                  color: '#ffffff',[m
[31m-                  border: 'none',[m
[31m-                  borderRadius: '10px',[m
[31m-                  fontWeight: '700',[m
[31m-                  fontSize: '15px',[m
[31m-                  cursor: 'pointer',[m
[31m-                  display: 'inline-flex',[m
[31m-                  alignItems: 'center',[m
[31m-                  gap: '8px',[m
[31m-                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.6)',[m
[31m-                  whiteSpace: 'nowrap'[m
[31m-                }}[m
               >[m
[31m-                ➕ Thêm Nhạc (POST /music)[m
[32m+[m[32m                ➕ {t('music.addMusic')}[m
               </button>[m
             )}[m
           </div>[m
[36m@@ -553,30 +537,30 @@[m [mconst handleFileChange = (e) => {[m
 [m
         <div className="music-content">[m
           {loading ? ([m
[31m-            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải âm nhạc...</p>[m
[32m+[m[32m            <p style={{ textAlign: 'center', color: 'white' }}>{t('music.loading')}</p>[m
           ) : error ? ([m
[31m-            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>[m
[32m+[m[32m            <p className="music-error-text">{error}</p>[m
           ) : selectedPlaylist ? ([m
             /* Chi tiết Playlist */[m
             <div className="playlist-detail-view">[m
               <button className="playlist-back-btn" onClick={() => setSelectedPlaylist(null)}>[m
[31m-                ⬅️ Quay lại danh sách phát[m
[32m+[m[32m                ⬅️ {t('music.backToPlaylists')}[m
               </button>[m
[31m-              [m
[32m+[m
               <div className="playlist-detail-header">[m
                 <div className="playlist-detail-art">{selectedPlaylist.image_url || '🎵'}</div>[m
                 <div className="playlist-detail-info">[m
[31m-                  <span className="playlist-badge">DANH SÁCH PHÁT</span>[m
[32m+[m[32m                  <span className="playlist-badge">{t('music.playlistBadge')}</span>[m
                   <h1>{selectedPlaylist.name}</h1>[m
                   {selectedPlaylist.description && <p className="playlist-description">{selectedPlaylist.description}</p>}[m
                   <div className="playlist-meta">[m
[31m-                    <span>{songs.length} bài hát</span>[m
[32m+[m[32m                    <span>{songs.length} {t('music.songLabel')}</span>[m
                     {user && user.role === 'admin' && ([m
[31m-                      <button [m
[32m+[m[32m                      <button[m
                         className="playlist-detail-delete-btn"[m
                         onClick={() => handleDeletePlaylist(selectedPlaylist.id)}[m
                       >[m
[31m-                        🗑️ Xóa Playlist[m
[32m+[m[32m                        🗑️ {t('music.deletePlaylist')}[m
                       </button>[m
                     )}[m
                   </div>[m
[36m@@ -584,66 +568,67 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-section">[m
[31m-                <h2>Danh sách bài hát</h2>[m
[32m+[m[32m                <h2>{t('music.songList')}</h2>[m
                 {songs.length > 0 ? ([m
                   <div className="songs-list">[m
                     {songs.map(song => ([m
                       <div key={song.id} className={`song-item ${currentSong && currentSong.id === song.id ? 'active' : ''}`}>[m
                         <div className="song-info">[m
                           <h4>{song.title}</h4>[m
[31m-                          <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} lượt nghe</span></p>[m
[32m+[m[32m                          <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} {t('music.playsLabel')}</span></p>[m
                         </div>[m
                         <div className="song-duration">{song.duration}</div>[m
[31m-                        <button [m
[31m-                          onClick={() => handlePlaySong(song)} [m
[32m+[m[32m                        <button[m
[32m+[m[32m                          onClick={() => handlePlaySong(song)}[m
                           className="play-btn"[m
                           style={{ background: currentSong && currentSong.id === song.id && isPlaying ? 'rgba(255,255,255,0.4)' : '' }}[m
[32m+[m[32m                          aria-label={t('music.play')}[m
                         >[m
                           {currentSong && currentSong.id === song.id && isPlaying ? ([m
                             '⏸️'[m
                           ) : ([m
[31m-                            <img [m
[31m-                              src="/play-icon.png" [m
[31m-                              alt="Play" [m
[31m-                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }} [m
[32m+[m[32m                            <img[m
[32m+[m[32m                              src="/play-icon.png"[m
[32m+[m[32m                              alt={t('music.play')}[m
[32m+[m[32m                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}[m
                             />[m
                           )}[m
                         </button>[m
[31m-                        <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }}>[m
[32m+[m[32m                        <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }} aria-label={t('music.like')}>[m
                           ❤️[m
                         </button>[m
                         <button[m
                           onClick={() => toggleBm('music', song.id)}[m
                           className={`play-btn ${isBm('music', song.id) ? 'bookmark-active' : ''}`}[m
                           style={{ marginLeft: '8px' }}[m
[31m-                          title={isBm('music', song.id) ? 'Bỏ lưu' : 'Lưu bài hát'}[m
[31m-                          aria-label={isBm('music', song.id) ? 'Bỏ lưu' : 'Lưu bài hát'}[m
[32m+[m[32m                          title={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}[m
[32m+[m[32m                          aria-label={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}[m
                         >[m
                           {isBm('music', song.id) ? '🔖' : '⚪'}[m
                         </button>[m
[31m-                        [m
[32m+[m
                         {user && ([m
[31m-                          <button [m
[31m-                            onClick={() => handleRemoveSongFromPlaylist(song.id)} [m
[31m-                            className="play-btn remove-song-btn" [m
[32m+[m[32m                          <button[m
[32m+[m[32m                            onClick={() => handleRemoveSongFromPlaylist(song.id)}[m
[32m+[m[32m                            className="play-btn remove-song-btn"[m
                             style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}[m
[31m-                            title="Xóa khỏi danh sách phát"[m
[32m+[m[32m                            title={t('music.removeFromPlaylist')}[m
                           >[m
                             ➖[m
                           </button>[m
                         )}[m
 [m
[31m-                        {isAdmin && ([m
[31m-                          <button [m
[31m-                            onClick={() => handleDeleteSong(song.id)} [m
[31m-                            className="play-btn delete-song-btn" [m
[32m+[m[32m                        {user && user.role === 'admin' && ([m
[32m+[m[32m                          <button[m
[32m+[m[32m                            onClick={() => handleDeleteSong(song.id)}[m
[32m+[m[32m                            className="play-btn delete-song-btn"[m
                             style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}[m
[31m-                            title="Xóa bài hát"[m
[32m+[m[32m                            title={t('music.deleteSong')}[m
                           >[m
[31m-                            <img [m
[31m-                              src="/delete-song-icon.png" [m
[31m-                              alt="Delete" [m
[31m-                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }} [m
[32m+[m[32m                            <img[m
[32m+[m[32m                              src="/delete-song-icon.png"[m
[32m+[m[32m                              alt={t('music.deleteSong')}[m
[32m+[m[32m                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}[m
                             />[m
                           </button>[m
                         )}[m
[36m@@ -651,9 +636,7 @@[m [mconst handleFileChange = (e) => {[m
                     ))}[m
                   </div>[m
                 ) : ([m
[31m-                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', marginTop: '20px' }}>[m
[31m-                    Danh sách phát này trống. Quay lại tab "Tất Cả" để thêm bài hát.[m
[31m-                  </p>[m
[32m+[m[32m                  <p className="music-empty-text">{t('music.playlistEmpty')}</p>[m
                 )}[m
               </div>[m
             </div>[m
[36m@@ -662,26 +645,26 @@[m [mconst handleFileChange = (e) => {[m
             <>[m
               {selectedCategory === 'playlist' ? ([m
                 <section className="music-section">[m
[31m-                  <h2>📻 Danh Sách Phát Của Tôi</h2>[m
[32m+[m[32m                  <h2>📻 {t('music.myPlaylists')}</h2>[m
                   {playlists.length > 0 ? ([m
                     <div className="playlist-grid">[m
                       {playlists.map(playlist => ([m
[31m-                        <div [m
[31m-                          key={playlist.id} [m
[32m+[m[32m                        <div[m
[32m+[m[32m                          key={playlist.id}[m
                           className="playlist-card"[m
                           onClick={() => setSelectedPlaylist(playlist)}[m
                         >[m
                           <div className="playlist-image">{playlist.image_url || '🎵'}</div>[m
                           <h3>{playlist.name}</h3>[m
[31m-                          <p>{playlist.song_count} bài hát</p>[m
[31m-                          {isAdmin && ([m
[32m+[m[32m                          <p>{playlist.song_count} {t('music.songLabel')}</p>[m
[32m+[m[32m                          {user && user.role === 'admin' && ([m
                             <button[m
                               className="playlist-card-delete-btn"[m
                               onClick={(e) => {[m
                                 e.stopPropagation();[m
                                 handleDeletePlaylist(playlist.id);[m
                               }}[m
[31m-                              title="Xóa danh sách phát"[m
[32m+[m[32m                              title={t('music.deletePlaylist')}[m
                             >[m
                               🗑️[m
                             </button>[m
[36m@@ -690,8 +673,8 @@[m [mconst handleFileChange = (e) => {[m
                       ))}[m
                     </div>[m
                   ) : ([m
[31m-                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '20px' }}>[m
[31m-                      Chưa có danh sách phát nào. {user ? 'Bấm "Tạo Playlist" để bắt đầu!' : 'Vui lòng đăng nhập để tạo mới.'}[m
[32m+[m[32m                    <p className="music-empty-text">[m
[32m+[m[32m                      {user ? t('music.emptyPlaylistsJoin', { empty: t('music.noPlaylists'), cta: t('music.noPlaylistsCTA') }) : t('music.noPlaylistsAnonymous')}[m
                     </p>[m
                   )}[m
                 </section>[m
[36m@@ -702,19 +685,18 @@[m [mconst handleFileChange = (e) => {[m
                   {selectedCategory === 'all' && playlists.length > 0 && ([m
                     <section className="music-section">[m
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>[m
[31m-                        <h2 style={{ borderBottom: 'none', margin: 0 }}>📻 Danh Sách Phát Của Tôi</h2>[m
[31m-                        <button [m
[32m+[m[32m                        <h2 style={{ borderBottom: 'none', margin: 0 }}>📻 {t('music.myPlaylists')}</h2>[m
[32m+[m[32m                        <button[m
                           className="view-all-playlists-btn"[m
                           onClick={() => setSelectedCategory('playlist')}[m
[31m-                          style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}[m
                         >[m
[31m-                          Xem tất cả →[m
[32m+[m[32m                          {t('music.viewAll')} →[m
                         </button>[m
                       </div>[m
                       <div className="playlist-grid">[m
                         {playlists.slice(0, 4).map(playlist => ([m
[31m-                          <div [m
[31m-                            key={playlist.id} [m
[32m+[m[32m                          <div[m
[32m+[m[32m                            key={playlist.id}[m
                             className="playlist-card"[m
                             onClick={() => {[m
                               setSelectedCategory('playlist');[m
[36m@@ -723,15 +705,15 @@[m [mconst handleFileChange = (e) => {[m
                           >[m
                             <div className="playlist-image">{playlist.image_url || '🎵'}</div>[m
                             <h3>{playlist.name}</h3>[m
[31m-                            <p>{playlist.song_count} bài hát</p>[m
[31m-                            {isAdmin && ([m
[32m+[m[32m                            <p>{playlist.song_count} {t('music.songLabel')}</p>[m
[32m+[m[32m                            {user && user.role === 'admin' && ([m
                               <button[m
                                 className="playlist-card-delete-btn"[m
                                 onClick={(e) => {[m
                                   e.stopPropagation();[m
                                   handleDeletePlaylist(playlist.id);[m
                                 }}[m
[31m-                                title="Xóa danh sách phát"[m
[32m+[m[32m                                title={t('music.deletePlaylist')}[m
                               >[m
                                 🗑️[m
                               </button>[m
[36m@@ -744,34 +726,55 @@[m [mconst handleFileChange = (e) => {[m
 [m
                   {songs.length > 0 && ([m
                     <section className="music-section">[m
[31m-                      <h2>🎵 {selectedCategory === 'all' ? 'Nhạc Mới Phát Hành' : 'Bài Hát'}</h2>[m
[32m+[m[32m                      <h2>🎵 {selectedCategory === 'all' ? t('music.newReleases') : t('music.songs')}</h2>[m
                       <div className="songs-list">[m
                         {songs.map(song => ([m
                           <div key={song.id} className={`song-item ${currentSong && currentSong.id === song.id ? 'active' : ''}`}>[m
                             <div className="song-info">[m
                               <h4>{song.title}</h4>[m
[31m-                              <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} lượt nghe</span></p>[m
[32m+[m[32m                              <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} {t('music.playsLabel')}</span></p>[m
                             </div>[m
                             <div className="song-duration">{song.duration}</div>[m
[31m-                            <button [m
[31m-                              onClick={() => handlePlaySong(song)} [m
[32m+[m[32m                            <button[m
[32m+[m[32m                              onClick={() => handlePlaySong(song)}[m
                               className="play-btn"[m
                               style={{ background: currentSong && currentSong.id === song.id && isPlaying ? 'rgba(255,255,255,0.4)' : '' }}[m
[32m+[m[32m                              aria-label={t('music.play')}[m
                             >[m
                               {currentSong && currentSong.id === song.id && isPlaying ? ([m
                                 '⏸️'[m
                               ) : ([m
[31m-                                <img [m
[31m-                                  src="/play-icon.png" [m
[31m-                                  alt="Play" [m
[31m-                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }} [m
[32m+[m[32m                                <img[m
[32m+[m[32m                                  src="/play-icon.png"[m
[32m+[m[32m                                  alt={t('music.play')}[m
[32m+[m[32m                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}[m
                                 />[m
                               )}[m
                             </button>[m
[31m-                            <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }}>[m
[32m+[m[32m                            <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }} aria-label={t('music.like')}>[m
                               ❤️[m
                             </button>[m
 [m
[32m+[m[32m                            {/* Bookmark — same pattern as the playlist[m
[32m+[m[32m                                detail view (line ~600). Tapping toggles[m
[32m+[m[32m                                the per-user bookmark via the shared[m
[32m+[m[32m                                BookmarksContext; the icon swaps between[m
[32m+[m[32m                                filled and outlined to reflect state.[m
[32m+[m[32m                                Bookmarks are per-user so this only shows[m
[32m+[m[32m                                to authenticated users. */}[m
[32m+[m[32m                            {user && ([m
[32m+[m[32m                              <button[m
[32m+[m[32m                                onClick={() => toggleBm('music', song.id)}[m
[32m+[m[32m                                className={`play-btn ${isBm('music', song.id) ? 'bookmark-active' : ''}`}[m
[32m+[m[32m                                style={{ marginLeft: '8px' }}[m
[32m+[m[32m                                title={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}[m
[32m+[m[32m                                aria-label={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}[m
[32m+[m[32m                                aria-pressed={isBm('music', song.id)}[m
[32m+[m[32m                              >[m
[32m+[m[32m                                {isBm('music', song.id) ? '🔖' : '⚪'}[m
[32m+[m[32m                              </button>[m
[32m+[m[32m                            )}[m
[32m+[m
                             {/* Dropdown Popover để thêm vào Playlist */}[m
                             {user && ([m
                               <div className="playlist-popover-container" style={{ position: 'relative', marginLeft: '8px' }}>[m
[36m@@ -781,17 +784,17 @@[m [mconst handleFileChange = (e) => {[m
                                     e.stopPropagation();[m
                                     setActivePopoverSongId(activePopoverSongId === song.id ? null : song.id);[m
                                   }}[m
[31m-                                  title="Thêm vào danh sách phát"[m
[32m+[m[32m                                  title={t('music.addToPlaylist')}[m
                                 >[m
[31m-                                  <img [m
[31m-                                    src="/add-to-playlist-icon.png" [m
[31m-                                    alt="Add to playlist" [m
[31m-                                    style={{ width: '22px', height: '22px', verticalAlign: 'middle' }} [m
[32m+[m[32m                                  <img[m
[32m+[m[32m                                    src="/add-to-playlist-icon.png"[m
[32m+[m[32m                                    alt={t('music.addToPlaylist')}[m
[32m+[m[32m                                    style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}[m
                                   />[m
                                 </button>[m
                                 {activePopoverSongId === song.id && ([m
                                   <div className="playlist-popover">[m
[31m-                                    <div className="popover-header">Thêm vào playlist</div>[m
[32m+[m[32m                                    <div className="popover-header">{t('music.popoverTitle')}</div>[m
                                     <div className="popover-list">[m
                                       {playlists.length > 0 ? ([m
                                         playlists.map(playlist => ([m
[36m@@ -805,7 +808,7 @@[m [mconst handleFileChange = (e) => {[m
                                           </button>[m
                                         ))[m
                                       ) : ([m
[31m-                                        <div className="popover-empty">Chưa có playlist nào</div>[m
[32m+[m[32m                                        <div className="popover-empty">{t('music.popoverEmpty')}</div>[m
                                       )}[m
                                     </div>[m
                                   </div>[m
[36m@@ -813,17 +816,17 @@[m [mconst handleFileChange = (e) => {[m
                               </div>[m
                             )}[m
 [m
[31m-                            {isAdmin && ([m
[31m-                              <button [m
[31m-                                onClick={() => handleDeleteSong(song.id)} [m
[31m-                                className="play-btn delete-song-btn" [m
[32m+[m[32m                            {user && user.role === 'admin' && ([m
[32m+[m[32m                              <button[m
[32m+[m[32m                                onClick={() => handleDeleteSong(song.id)}[m
[32m+[m[32m                                className="play-btn delete-song-btn"[m
                                 style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}[m
[31m-                                title="Xóa bài hát"[m
[32m+[m[32m                                title={t('music.deleteSong')}[m
                               >[m
[31m-                                <img [m
[31m-                                  src="/delete-song-icon.png" [m
[31m-                                  alt="Delete" [m
[31m-                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }} [m
[32m+[m[32m                                <img[m
[32m+[m[32m                                  src="/delete-song-icon.png"[m
[32m+[m[32m                                  alt={t('music.deleteSong')}[m
[32m+[m[32m                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}[m
                                 />[m
                               </button>[m
                             )}[m
[36m@@ -834,7 +837,7 @@[m [mconst handleFileChange = (e) => {[m
                   )}[m
 [m
                   {!loading && songs.length === 0 && ([m
[31m-                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '40px' }}>Không có dữ liệu bài hát</p>[m
[32m+[m[32m                    <p className="music-empty-text">{t('music.noSongData')}</p>[m
                   )}[m
                 </>[m
               )}[m
[36m@@ -865,26 +868,26 @@[m [mconst handleFileChange = (e) => {[m
 [m
           <div className="player-controls">[m
             <div className="controls-buttons">[m
[31m-              <button className="player-btn" onClick={handlePrevSong}>⏮️</button>[m
[32m+[m[32m              <button className="player-btn" onClick={handlePrevSong} aria-label={t('music.prev')}>⏮️</button>[m
               <button className="player-btn play-pause" onClick={togglePlayPause}>[m
                 {isPlaying ? ([m
                   '⏸️'[m
                 ) : ([m
[31m-                  <img [m
[31m-                    src="/play-icon.png" [m
[31m-                    alt="Play" [m
[31m-                    style={{ width: '24px', height: '24px', verticalAlign: 'middle' }} [m
[32m+[m[32m                  <img[m
[32m+[m[32m                    src="/play-icon.png"[m
[32m+[m[32m                    alt={t('music.play')}[m
[32m+[m[32m                    style={{ width: '24px', height: '24px', verticalAlign: 'middle' }}[m
                   />[m
                 )}[m
               </button>[m
[31m-              <button className="player-btn" onClick={handleNextSong}>⏭️</button>[m
[32m+[m[32m              <button className="player-btn" onClick={handleNextSong} aria-label={t('music.next')}>⏭️</button>[m
             </div>[m
 [m
             <div className="progress-container">[m
               <span>{formatTime(currentTime)}</span>[m
               <div className="progress-bar" onClick={handleSeek}>[m
[31m-                <div [m
[31m-                  className="progress-filled" [m
[32m+[m[32m                <div[m
[32m+[m[32m                  className="progress-filled"[m
                   style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}[m
                 />[m
               </div>[m
[36m@@ -894,12 +897,12 @@[m [mconst handleFileChange = (e) => {[m
 [m
           <div className="player-volume">[m
             <span>🔊</span>[m
[31m-            <input [m
[31m-              type="range" [m
[31m-              className="volume-slider" [m
[31m-              min="0" [m
[31m-              max="1" [m
[31m-              step="0.05" [m
[32m+[m[32m            <input[m
[32m+[m[32m              type="range"[m
[32m+[m[32m              className="volume-slider"[m
[32m+[m[32m              min="0"[m
[32m+[m[32m              max="1"[m
[32m+[m[32m              step="0.05"[m
               value={volume}[m
               onChange={(e) => setVolume(parseFloat(e.target.value))}[m
             />[m
[36m@@ -912,15 +915,15 @@[m [mconst handleFileChange = (e) => {[m
         <div className="music-modal-overlay">[m
           <div className="music-modal-content">[m
             <div className="music-modal-header">[m
[31m-              <h2>Thêm Nhạc Vào Thư Viện</h2>[m
[32m+[m[32m              <h2>{t('music.uploadHeading')}</h2>[m
               <button className="music-close-btn" onClick={() => !isUploading && setShowUploadModal(false)}>×</button>[m
             </div>[m
             <form onSubmit={handleUploadSubmit} className="music-modal-body">[m
               <div className="music-form-group">[m
[31m-                <label>Tên bài hát *</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[31m-                  placeholder="Nhập tên bài hát..." [m
[32m+[m[32m                <label>{t('music.songTitleLabel')} *</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
[32m+[m[32m                  placeholder={t('music.ph.songTitle')}[m
                   value={uploadForm.title}[m
                   onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}[m
                   disabled={isUploading}[m
[36m@@ -929,10 +932,10 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Ca sĩ (Tác giả)</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[31m-                  placeholder="Nhập tên ca sĩ (Mặc định: Update later)..." [m
[32m+[m[32m                <label>{t('music.artistLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
[32m+[m[32m                  placeholder={t('music.ph.artist')}[m
                   value={uploadForm.artist}[m
                   onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}[m
                   disabled={isUploading}[m
[36m@@ -940,13 +943,13 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Thể loại</label>[m
[31m-                <select [m
[32m+[m[32m                <label>{t('music.genreLabel')}</label>[m
[32m+[m[32m                <select[m
                   value={uploadForm.genre}[m
                   onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}[m
                   disabled={isUploading}[m
                 >[m
[31m-                  <option value="Update later">Chưa xác định (Update later)</option>[m
[32m+[m[32m                  <option value="Update later">{t('music.genreUnknown')}</option>[m
                   <option value="Pop">Pop</option>[m
                   <option value="Ballad">Ballad</option>[m
                   <option value="Rap">Rap / Hip-hop</option>[m
[36m@@ -959,9 +962,9 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Thời lượng (Được tính tự động)</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[32m+[m[32m                <label>{t('music.durationLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
                   value={uploadForm.duration}[m
                   onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}[m
                   disabled={isUploading}[m
[36m@@ -970,10 +973,10 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Tệp âm thanh (.mp3, .wav) *</label>[m
[31m-                <input [m
[31m-                  type="file" [m
[31m-                  accept="audio/*" [m
[32m+[m[32m                <label>{t('music.fileLabel')} *</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="file"[m
[32m+[m[32m                  accept="audio/*"[m
                   onChange={handleFileChange}[m
                   disabled={isUploading}[m
                   required[m
[36m@@ -983,7 +986,7 @@[m [mconst handleFileChange = (e) => {[m
               {isUploading && ([m
                 <div className="music-progress-container">[m
                   <div className="music-progress-text">[m
[31m-                    <span>Đang tải lên...</span>[m
[32m+[m[32m                    <span>{t('music.uploading')}</span>[m
                     <span>{uploadProgress}%</span>[m
                   </div>[m
                   <div className="music-progress-bar">[m
[36m@@ -993,20 +996,20 @@[m [mconst handleFileChange = (e) => {[m
               )}[m
 [m
               <div className="music-modal-footer">[m
[31m-                <button [m
[31m-                  type="button" [m
[31m-                  className="music-cancel-btn" [m
[32m+[m[32m                <button[m
[32m+[m[32m                  type="button"[m
[32m+[m[32m                  className="music-cancel-btn"[m
                   onClick={() => setShowUploadModal(false)}[m
                   disabled={isUploading}[m
                 >[m
[31m-                  Hủy[m
[32m+[m[32m                  {t('common.cancel')}[m
                 </button>[m
[31m-                <button [m
[31m-                  type="submit" [m
[31m-                  className="music-submit-btn" [m
[32m+[m[32m                <button[m
[32m+[m[32m                  type="submit"[m
[32m+[m[32m                  className="music-submit-btn"[m
                   disabled={isUploading}[m
                 >[m
[31m-                  {isUploading ? 'Đang xử lý...' : 'Tải lên & Lưu'}[m
[32m+[m[32m                  {isUploading ? t('music.processing') : t('music.uploadAndSave')}[m
                 </button>[m
               </div>[m
             </form>[m
[36m@@ -1019,15 +1022,15 @@[m [mconst handleFileChange = (e) => {[m
         <div className="music-modal-overlay">[m
           <div className="music-modal-content">[m
             <div className="music-modal-header">[m
[31m-              <h2 style={{ color: '#8b5cf6' }}>Tạo Danh Sách Phát Mới</h2>[m
[32m+[m[32m              <h2 className="music-modal-title">{t('music.createPlaylistHeading')}</h2>[m
               <button className="music-close-btn" onClick={() => setShowCreatePlaylistModal(false)}>×</button>[m
             </div>[m
             <form onSubmit={handleCreatePlaylistSubmit} className="music-modal-body">[m
               <div className="music-form-group">[m
[31m-                <label>Tên danh sách phát *</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[31m-                  placeholder="Ví dụ: Nhạc Học Tập, Chill Vibes..." [m
[32m+[m[32m                <label>{t('music.playlistNameLabel')} *</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
[32m+[m[32m                  placeholder={t('music.ph.playlistName')}[m
                   value={newPlaylistForm.name}[m
                   onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, name: e.target.value })}[m
                   required[m
[36m@@ -1035,17 +1038,17 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Mô tả</label>[m
[31m-                <input [m
[31m-                  type="text" [m
[31m-                  placeholder="Mô tả ngắn gọn về danh sách phát..." [m
[32m+[m[32m                <label>{t('music.playlistDescLabel')}</label>[m
[32m+[m[32m                <input[m
[32m+[m[32m                  type="text"[m
[32m+[m[32m                  placeholder={t('music.ph.playlistDesc')}[m
                   value={newPlaylistForm.description}[m
                   onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, description: e.target.value })}[m
                 />[m
               </div>[m
 [m
               <div className="music-form-group">[m
[31m-                <label>Biểu tượng đại diện (Emoji) *</label>[m
[32m+[m[32m                <label>{t('music.playlistIconLabel')} *</label>[m
                 <div className="emoji-selector-panel">[m
                   {availableEmojis.map(emoji => ([m
                     <button[m
[36m@@ -1061,19 +1064,19 @@[m [mconst handleFileChange = (e) => {[m
               </div>[m
 [m
               <div className="music-modal-footer">[m
[31m-                <button [m
[31m-                  type="button" [m
[31m-                  className="music-cancel-btn" [m
[32m+[m[32m                <button[m
[32m+[m[32m                  type="button"[m
[32m+[m[32m                  className="music-cancel-btn"[m
                   onClick={() => setShowCreatePlaylistModal(false)}[m
                 >[m
[31m-                  Hủy[m
[32m+[m[32m                  {t('common.cancel')}[m
                 </button>[m
[31m-                <button [m
[31m-                  type="submit" [m
[31m-                  className="music-submit-btn" [m
[32m+[m[32m                <button[m
[32m+[m[32m                  type="submit"[m
[32m+[m[32m                  className="music-submit-btn"[m
                   style={{ backgroundColor: '#8b5cf6' }}[m
                 >[m
[31m-                  Tạo mới[m
[32m+[m[32m                  {t('music.createNew')}[m
                 </button>[m
               </div>[m
             </form>[m
[36m@@ -1082,4 +1085,4 @@[m [mconst handleFileChange = (e) => {[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/UserProfile/UserProfile.css b/frontend/src/pages/UserProfile/UserProfile.css[m
[1mindex a569365..7f68e76 100644[m
[1m--- a/frontend/src/pages/UserProfile/UserProfile.css[m
[1m+++ b/frontend/src/pages/UserProfile/UserProfile.css[m
[36m@@ -1,3 +1,5 @@[m
[32m+[m[32m/* UserProfile page — theme-aware via App.css tokens */[m
[32m+[m
 .userprofile-container {[m
   max-width: 900px;[m
   margin: 0 auto;[m
[36m@@ -6,8 +8,8 @@[m
 [m
 .userprofile-back {[m
   background: transparent;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[31m-  color: var(--text-main, #1b263b);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  color: var(--text-main);[m
   padding: 8px 14px;[m
   border-radius: 8px;[m
   font-size: 14px;[m
[36m@@ -18,7 +20,7 @@[m
 }[m
 [m
 .userprofile-back:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .userprofile-card {[m
[36m@@ -26,10 +28,10 @@[m
   align-items: center;[m
   gap: 20px;[m
   padding: 24px;[m
[31m-  background: var(--bg-card, #ffffff);[m
[32m+[m[32m  background: var(--bg-card);[m
   border-radius: 16px;[m
[31m-  box-shadow: var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.03));[m
[31m-  border: 1px solid var(--border-card, #e2e8f0);[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
 }[m
 [m
 .userprofile-avatar {[m
[36m@@ -38,7 +40,7 @@[m
   border-radius: 50%;[m
   overflow: hidden;[m
   flex-shrink: 0;[m
[31m-  background: linear-gradient(135deg, #6366f1, #4f46e5);[m
[32m+[m[32m  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-2));[m
 }[m
 [m
 .userprofile-avatar img {[m
[36m@@ -55,7 +57,7 @@[m
   justify-content: center;[m
   font-size: 32px;[m
   font-weight: 700;[m
[31m-  color: white;[m
[32m+[m[32m  color: var(--text-on-accent);[m
 }[m
 [m
 .userprofile-info {[m
[36m@@ -67,7 +69,7 @@[m
   margin: 0 0 8px;[m
   font-size: 24px;[m
   font-weight: 700;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   word-wrap: break-word;[m
 }[m
 [m
[36m@@ -76,12 +78,12 @@[m
   flex-wrap: wrap;[m
   gap: 12px;[m
   font-size: 14px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .userprofile-badge {[m
   background: rgba(99, 102, 241, 0.12);[m
[31m-  color: #4f46e5;[m
[32m+[m[32m  color: var(--accent-primary);[m
   padding: 2px 8px;[m
   border-radius: 6px;[m
   font-size: 12px;[m
[36m@@ -96,41 +98,41 @@[m
 }[m
 [m
 .userprofile-stat {[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  border: 1px solid var(--border-card, #e2e8f0);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   padding: 18px 16px;[m
   text-align: center;[m
[31m-  box-shadow: var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.03));[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
 }[m
 [m
 .userprofile-stat-value {[m
   font-size: 28px;[m
   font-weight: 800;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   line-height: 1.2;[m
 }[m
 [m
 .userprofile-stat-label {[m
   font-size: 13px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   margin-top: 4px;[m
 }[m
 [m
 .userprofile-status {[m
   text-align: center;[m
   padding: 40px;[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .userprofile-error {[m
[31m-  color: #b91c1c;[m
[32m+[m[32m  color: var(--status-error-fg);[m
 }[m
 [m
 .userprofile-self-hint {[m
   margin-top: 16px;[m
   text-align: center;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   font-size: 14px;[m
   font-style: italic;[m
 }[m
[36m@@ -138,32 +140,33 @@[m
 /* Follow row inside the profile header — counts side-by-side with[m
    a dot separator. Kept compact so the name + meta block stays[m
    the visual focus. */[m
[32m+[m
 .userprofile-follow-row {[m
   margin-top: 10px;[m
   display: flex;[m
   align-items: center;[m
   gap: 8px;[m
   font-size: 14px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   flex-wrap: wrap;[m
 }[m
 [m
 .userprofile-follow-count strong {[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   font-weight: 700;[m
 }[m
 [m
 .userprofile-follow-dot {[m
[31m-  color: var(--text-muted, #94a3b8);[m
[32m+[m[32m  color: var(--text-muted);[m
 }[m
 [m
 .userprofile-follow-btn {[m
   flex-shrink: 0;[m
   padding: 10px 18px;[m
   border-radius: 999px;[m
[31m-  border: 1px solid var(--border-color, #e2e8f0);[m
[31m-  background: #6366f1;[m
[31m-  color: white;[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
[32m+[m[32m  background: var(--accent-primary);[m
[32m+[m[32m  color: var(--text-on-accent);[m
   font-size: 14px;[m
   font-weight: 600;[m
   cursor: pointer;[m
[36m@@ -171,7 +174,7 @@[m
 }[m
 [m
 .userprofile-follow-btn:hover {[m
[31m-  background: #4f46e5;[m
[32m+[m[32m  background: var(--accent-primary-2);[m
 }[m
 [m
 .userprofile-follow-btn:disabled {[m
[36m@@ -181,29 +184,31 @@[m
 [m
 /* "Following" state — outline button so the active edge reads as a[m
    toggled-off affordance. */[m
[32m+[m
 .userprofile-follow-btn.following {[m
   background: transparent;[m
[31m-  color: var(--text-title, #0f172a);[m
[31m-  border-color: var(--border-color, #cbd5e1);[m
[32m+[m[32m  color: var(--text-main);[m
[32m+[m[32m  border-color: var(--border-color);[m
 }[m
 [m
 .userprofile-follow-btn.following:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 /* Network section: tabs + list of followers / following. */[m
[32m+[m
 .userprofile-network {[m
   margin-top: 20px;[m
[31m-  background: var(--bg-card, #ffffff);[m
[31m-  border: 1px solid var(--border-card, #e2e8f0);[m
[32m+[m[32m  background: var(--bg-card);[m
[32m+[m[32m  border: 1px solid var(--border-color);[m
   border-radius: 12px;[m
   overflow: hidden;[m
[31m-  box-shadow: var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.03));[m
[32m+[m[32m  box-shadow: var(--shadow-card);[m
 }[m
 [m
 .userprofile-network-tabs {[m
   display: flex;[m
[31m-  border-bottom: 1px solid var(--border-color, #e2e8f0);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
 }[m
 [m
 .userprofile-network-tab {[m
[36m@@ -213,20 +218,20 @@[m
   border: none;[m
   font-size: 14px;[m
   font-weight: 600;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   cursor: pointer;[m
   border-bottom: 2px solid transparent;[m
   transition: all 0.15s ease;[m
 }[m
 [m
 .userprofile-network-tab:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  background: var(--bg-item);[m
[32m+[m[32m  color: var(--text-title);[m
 }[m
 [m
 .userprofile-network-tab.active {[m
[31m-  color: #4f46e5;[m
[31m-  border-bottom-color: #6366f1;[m
[32m+[m[32m  color: var(--accent-primary);[m
[32m+[m[32m  border-bottom-color: var(--accent-primary);[m
 }[m
 [m
 .userprofile-network-list {[m
[36m@@ -242,7 +247,7 @@[m
 .userprofile-network-item {[m
   padding: 12px 18px;[m
   cursor: pointer;[m
[31m-  border-bottom: 1px solid var(--border-color, #f1f5f9);[m
[32m+[m[32m  border-bottom: 1px solid var(--border-color);[m
   transition: background 0.15s ease;[m
 }[m
 [m
[36m@@ -251,48 +256,20 @@[m
 }[m
 [m
 .userprofile-network-item:hover {[m
[31m-  background: var(--bg-item, #f1f5f9);[m
[32m+[m[32m  background: var(--bg-item);[m
 }[m
 [m
 .userprofile-network-name {[m
   font-weight: 600;[m
[31m-  color: var(--text-title, #0f172a);[m
[32m+[m[32m  color: var(--text-title);[m
   font-size: 14px;[m
 }[m
 [m
 .userprofile-network-meta {[m
   margin-top: 2px;[m
   font-size: 12px;[m
[31m-  color: var(--text-muted, #64748b);[m
[32m+[m[32m  color: var(--text-muted);[m
   display: flex;[m
   gap: 6px;[m
   flex-wrap: wrap;[m
 }[m
[31m-[m
[31m-.dark-theme .userprofile-follow-btn.following {[m
[31m-  color: #f1f5f9;[m
[31m-  border-color: rgba(255, 255, 255, 0.2);[m
[31m-}[m
[31m-[m
[31m-.dark-theme .userprofile-follow-count strong {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-[m
[31m-.dark-theme .userprofile-network-tab.active {[m
[31m-  color: #a5b4fc;[m
[31m-}[m
[31m-[m
[31m-.dark-theme .userprofile-network-name {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-[m
[31m-/* Dark-theme overlay — page background is inherited from[m
[31m-   .App.dark-theme, but the avatar fallback gradient stays the same[m
[31m-   so the profile card doesn't blend in. */[m
[31m-.dark-theme .userprofile-name {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[31m-[m
[31m-.dark-theme .userprofile-stat-value {[m
[31m-  color: #f1f5f9;[m
[31m-}[m
[1mdiff --git a/frontend/src/pages/UserProfile/index.jsx b/frontend/src/pages/UserProfile/index.jsx[m
[1mindex 5b4defb..3c8de02 100644[m
[1m--- a/frontend/src/pages/UserProfile/index.jsx[m
[1m+++ b/frontend/src/pages/UserProfile/index.jsx[m
[36m@@ -1,5 +1,6 @@[m
 import React, { useEffect, useState } from 'react';[m
 import * as api from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 import './UserProfile.css';[m
 [m
 // Public-facing profile page. Reached by clicking a username in a[m
[36m@@ -14,6 +15,7 @@[m [mimport './UserProfile.css';[m
 // in the header, and tabs at the bottom show the actual lists —[m
 // fetched lazily the first time each tab is opened.[m
 export default function UserProfile({ userId, currentUser, onNavigate }) {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [profile, setProfile] = useState(null);[m
   const [loading, setLoading] = useState(true);[m
   const [error, setError] = useState(null);[m
[36m@@ -37,14 +39,16 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
       } catch (err) {[m
         if (!cancelled) {[m
           const status = err?.response?.status;[m
[31m-          setError(status === 404 ? 'Người dùng không tồn tại.' : 'Không thể tải hồ sơ.');[m
[32m+[m[32m          setError(status === 404[m
[32m+[m[32m            ? t('profile.err.notFound')[m
[32m+[m[32m            : t('profile.err.load'));[m
         }[m
       } finally {[m
         if (!cancelled) setLoading(false);[m
       }[m
     })();[m
     return () => { cancelled = true; };[m
[31m-  }, [userId]);[m
[32m+[m[32m  }, [userId, t]);[m
 [m
   // Reset the lazy follow-list cache when the profile target changes[m
   // — otherwise we'd briefly show the previous user's followers.[m
[36m@@ -75,14 +79,14 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
   }, [profile, tab, userId]);[m
 [m
   if (loading) {[m
[31m-    return <div className="userprofile-container"><div className="userprofile-status">Đang tải hồ sơ...</div></div>;[m
[32m+[m[32m    return <div className="userprofile-container"><div className="userprofile-status">{t('profile.loading')}</div></div>;[m
   }[m
 [m
   if (error) {[m
     return ([m
       <div className="userprofile-container">[m
         <div className="userprofile-status userprofile-error">{error}</div>[m
[31m-        <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>← Về Bảng tin</button>[m
[32m+[m[32m        <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>{t('common.backToFeed')}</button>[m
       </div>[m
     );[m
   }[m
[36m@@ -98,7 +102,7 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
   const isSelf = currentUser && currentUser.user_id === profile.user_id;[m
   const canFollow = !!currentUser && !isSelf;[m
   const joinDate = profile.created_at[m
[31m-    ? new Date(profile.created_at).toLocaleDateString('vi-VN')[m
[32m+[m[32m    ? new Date(profile.created_at).toLocaleDateString()[m
     : null;[m
   // Cosmetic: render the avatar as a colored initial if the user[m
   // never registered face images (and so avatar_url is null).[m
[36m@@ -146,7 +150,7 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
 [m
   return ([m
     <div className="userprofile-container">[m
[31m-      <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>← Quay lại</button>[m
[32m+[m[32m      <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>{t('profile.back')}</button>[m
 [m
       <div className="userprofile-card">[m
         <div className="userprofile-avatar">[m
[36m@@ -160,17 +164,17 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
           <h1 className="userprofile-name">{profile.name || profile.user_id}</h1>[m
           <div className="userprofile-meta">[m
             <span>@{profile.user_id}</span>[m
[31m-            {profile.role === 'admin' && <span className="userprofile-badge">Admin</span>}[m
[32m+[m[32m            {profile.role === 'admin' && <span className="userprofile-badge">{t('status.admin')}</span>}[m
             {profile.department && <span>🏢 {profile.department}</span>}[m
[31m-            {joinDate && <span>📅 Tham gia {joinDate}</span>}[m
[32m+[m[32m            {joinDate && <span>📅 {t('profile.joinDate')} {joinDate}</span>}[m
           </div>[m
           <div className="userprofile-follow-row">[m
             <span className="userprofile-follow-count">[m
[31m-              <strong>{follow.followers}</strong> người theo dõi[m
[32m+[m[32m              <strong>{follow.followers}</strong> {t('profile.followersCount')}[m
             </span>[m
             <span className="userprofile-follow-dot">·</span>[m
             <span className="userprofile-follow-count">[m
[31m-              <strong>{follow.following}</strong> đang theo dõi[m
[32m+[m[32m              <strong>{follow.following}</strong> {t('profile.followingCount')}[m
             </span>[m
           </div>[m
         </div>[m
[36m@@ -180,7 +184,7 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
             onClick={handleToggleFollow}[m
             disabled={followBusy}[m
           >[m
[31m-            {isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi'}[m
[32m+[m[32m            {isFollowing ? <>✓ {t('profile.following')}</> : <>+ {t('profile.follow')}</>}[m
           </button>[m
         )}[m
       </div>[m
[36m@@ -188,19 +192,19 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
       <div className="userprofile-stats">[m
         <div className="userprofile-stat">[m
           <div className="userprofile-stat-value">{stats.articles_owned || 0}</div>[m
[31m-          <div className="userprofile-stat-label">Bài viết đã đăng</div>[m
[32m+[m[32m          <div className="userprofile-stat-label">{t('profile.statsArticles')}</div>[m
         </div>[m
         <div className="userprofile-stat">[m
           <div className="userprofile-stat-value">{stats.total_likes || 0}</div>[m
[31m-          <div className="userprofile-stat-label">Lượt thích nhận</div>[m
[32m+[m[32m          <div className="userprofile-stat-label">{t('profile.statsLikes')}</div>[m
         </div>[m
         <div className="userprofile-stat">[m
           <div className="userprofile-stat-value">{stats.posts_authored || 0}</div>[m
[31m-          <div className="userprofile-stat-label">Bài đăng Feed</div>[m
[32m+[m[32m          <div className="userprofile-stat-label">{t('profile.statsPosts')}</div>[m
         </div>[m
         <div className="userprofile-stat">[m
           <div className="userprofile-stat-value">{stats.comments_written || 0}</div>[m
[31m-          <div className="userprofile-stat-label">Bình luận</div>[m
[32m+[m[32m          <div className="userprofile-stat-label">{t('profile.statsComments')}</div>[m
         </div>[m
       </div>[m
 [m
[36m@@ -210,21 +214,21 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
             className={`userprofile-network-tab ${tab === 'followers' ? 'active' : ''}`}[m
             onClick={() => setTab('followers')}[m
           >[m
[31m-            Người theo dõi ({follow.followers})[m
[32m+[m[32m            {t('profile.tabFollowers')} ({follow.followers})[m
           </button>[m
           <button[m
             className={`userprofile-network-tab ${tab === 'following' ? 'active' : ''}`}[m
             onClick={() => setTab('following')}[m
           >[m
[31m-            Đang theo dõi ({follow.following})[m
[32m+[m[32m            {t('profile.tabFollowing')} ({follow.following})[m
           </button>[m
         </div>[m
         <div className="userprofile-network-list">[m
           {followListLoading ? ([m
[31m-            <div className="userprofile-status">Đang tải...</div>[m
[32m+[m[32m            <div className="userprofile-status">{t('profile.loadingNetwork')}</div>[m
           ) : followList.length === 0 ? ([m
             <div className="userprofile-status">[m
[31m-              {tab === 'followers' ? 'Chưa có người theo dõi.' : 'Chưa theo dõi ai.'}[m
[32m+[m[32m              {tab === 'followers' ? t('profile.emptyFollowers') : t('profile.emptyFollowing')}[m
             </div>[m
           ) : ([m
             <ul>[m
[36m@@ -250,8 +254,8 @@[m [mexport default function UserProfile({ userId, currentUser, onNavigate }) {[m
       </div>[m
 [m
       {isSelf && ([m
[31m-        <div className="userprofile-self-hint">Đây là hồ sơ của bạn.</div>[m
[32m+[m[32m        <div className="userprofile-self-hint">{t('profile.selfHint')}</div>[m
       )}[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/frontend/src/pages/Users/index.jsx b/frontend/src/pages/Users/index.jsx[m
[1mindex 74a60f1..f276a15 100644[m
[1m--- a/frontend/src/pages/Users/index.jsx[m
[1m+++ b/frontend/src/pages/Users/index.jsx[m
[36m@@ -1,7 +1,9 @@[m
 import React, { useEffect, useState } from 'react';[m
 import { fetchUsers, enrollUser } from '../../services/api';[m
[32m+[m[32mimport { useTranslation } from 'react-i18next';[m
 [m
 function Users() {[m
[32m+[m[32m  const { t } = useTranslation();[m
   const [users, setUsers] = useState([]);[m
   const [loading, setLoading] = useState(true);[m
   const [form, setForm] = useState({ user_id: '', name: '', email: '', password: '', department: '' });[m
[36m@@ -37,7 +39,7 @@[m [mfunction Users() {[m
 [m
   const handleSubmit = async (event) => {[m
     event.preventDefault();[m
[31m-    setMessage('Đang đăng ký người dùng...');[m
[32m+[m[32m    setMessage(t('users.enrolling'));[m
     try {[m
       const imagesBase64 = await Promise.all([m
         files.map((file) =>[m
[36m@@ -58,18 +60,18 @@[m [mfunction Users() {[m
         department: form.department,[m
         images_base64: imagesBase64,[m
       });[m
[31m-      setMessage(response.data.message || 'Đăng ký thành công');[m
[32m+[m[32m      setMessage(response.data.message || t('users.ok.enrolled'));[m
       setForm({ user_id: '', name: '', email: '', password: '', department: '' });[m
       setFiles([]);[m
       loadUsers();[m
     } catch (error) {[m
[31m-      setMessage(error.response?.data?.detail || 'Đăng ký thất bại.');[m
[32m+[m[32m      setMessage(error.response?.data?.detail || t('users.fail.enrolled'));[m
     }[m
   };[m
 [m
   return ([m
     <section className="page">[m
[31m-      <h2>Quản lý Người dùng</h2>[m
[32m+[m[32m      <h2>{t('users.title')}</h2>[m
       <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>[m
         <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>[m
           <input[m
[36m@@ -77,7 +79,7 @@[m [mfunction Users() {[m
             name="user_id"[m
             value={form.user_id}[m
             onChange={handleChange}[m
[31m-            placeholder="Username (Mã nhân viên / sinh viên)"[m
[32m+[m[32m            placeholder={t('users.ph.username')}[m
             required[m
           />[m
           <input[m
[36m@@ -85,7 +87,7 @@[m [mfunction Users() {[m
             name="name"[m
             value={form.name}[m
             onChange={handleChange}[m
[31m-            placeholder="Tên đầy đủ"[m
[32m+[m[32m            placeholder={t('users.ph.full_name')}[m
             required[m
           />[m
           <input[m
[36m@@ -93,45 +95,45 @@[m [mfunction Users() {[m
             name="email"[m
             value={form.email}[m
             onChange={handleChange}[m
[31m-            placeholder="Địa chỉ Email"[m
[32m+[m[32m            placeholder={t('users.ph.email')}[m
           />[m
           <input[m
             type="password"[m
             name="password"[m
             value={form.password}[m
             onChange={handleChange}[m
[31m-            placeholder="Mật khẩu đăng nhập"[m
[32m+[m[32m            placeholder={t('users.ph.password')}[m
           />[m
           <input[m
             type="text"[m
             name="department"[m
             value={form.department}[m
             onChange={handleChange}[m
[31m-            placeholder="Khoa / Bộ phận"[m
[32m+[m[32m            placeholder={t('users.ph.department')}[m
           />[m
           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>[m
             <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>[m
[31m-              Ảnh đăng ký khuôn mặt (Tùy chọn - Dùng cho Face ID):[m
[32m+[m[32m              {t('users.photoLabel')}[m
             </label>[m
             <input type="file" accept="image/*" multiple onChange={handleFileChange} />[m
           </div>[m
           <button className="button" type="submit">[m
[31m-            Đăng ký tài khoản mới[m
[32m+[m[32m            {t('users.enrollBtn')}[m
           </button>[m
         </div>[m
         {message && <p>{message}</p>}[m
       </form>[m
 [m
       {loading ? ([m
[31m-        <p>Đang tải dữ liệu...</p>[m
[32m+[m[32m        <p>{t('users.loading')}</p>[m
       ) : ([m
         <table className="user-table">[m
           <thead>[m
             <tr>[m
               <th>ID</th>[m
[31m-              <th>Tên</th>[m
[31m-              <th>Số ảnh</th>[m
[31m-              <th>Ngày tạo</th>[m
[32m+[m[32m              <th>{t('users.nameCol')}</th>[m
[32m+[m[32m              <th>{t('users.photoCount')}</th>[m
[32m+[m[32m              <th>{t('users.createdAt')}</th>[m
             </tr>[m
           </thead>[m
           <tbody>[m
[36m@@ -146,7 +148,7 @@[m [mfunction Users() {[m
               ))[m
             ) : ([m
               <tr>[m
[31m-                <td colSpan="4">Không có người dùng nào.</td>[m
[32m+[m[32m                <td colSpan="4">{t('users.noUsers')}</td>[m
               </tr>[m
             )}[m
           </tbody>[m
[36m@@ -156,4 +158,4 @@[m [mfunction Users() {[m
   );[m
 }[m
 [m
[31m-export default Users;[m
[32m+[m[32mexport default Users;[m
\ No newline at end of file[m
