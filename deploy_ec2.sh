#!/bin/bash
# ================================================================================
# Script cài đặt Docker tự động trên Ubuntu EC2 cho dự án Fav Web Backend
# Hướng dẫn chạy: 
#   chmod +x deploy_ec2.sh
#   ./deploy_ec2.sh
# ================================================================================

# Thoát ngay lập tức nếu bất kỳ lệnh nào thất bại
set -e

echo "========================================================="
echo "1. Cập nhật hệ thống Ubuntu..."
echo "========================================================="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "========================================================="
echo "2. Cài đặt các gói phụ trợ..."
echo "========================================================="
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

echo "========================================================="
echo "3. Thêm khóa GPG và Kho lưu trữ của Docker..."
echo "========================================================="
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "========================================================="
echo "4. Cài đặt Docker Engine..."
echo "========================================================="
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "========================================================="
echo "5. Kích hoạt và cấu hình Docker chạy cùng hệ thống..."
echo "========================================================="
sudo systemctl start docker
sudo systemctl enable docker

# Cho phép user 'ubuntu' chạy lệnh docker không cần sudo
echo "========================================================="
echo "6. Phân quyền Docker cho user hiện tại ($USER)..."
echo "========================================================="
sudo usermod -aG docker $USER

echo "========================================================="
echo ">>> CÀI ĐẶT DOCKER THÀNH CÔNG! <<<"
echo "Hãy chạy lệnh: newgrp docker"
echo "để kích hoạt quyền chạy docker ngay lập tức mà không cần SSH lại."
echo "========================================================="
