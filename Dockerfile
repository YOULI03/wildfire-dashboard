# Gunakan base image Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install pip secara manual sebelum menginstal dependencies
RUN apt-get update && apt-get install -y python3-pip

# Copy semua file ke dalam container
COPY . .

# Pastikan pip sudah bisa digunakan
RUN python -m pip install --upgrade pip

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Jalankan aplikasi
CMD ["python", "dashboard/app.py"]
