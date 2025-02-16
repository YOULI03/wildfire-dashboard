
# Gunakan image Python yang sudah termasuk pip
FROM python:3.11-slim

# Set working directory di dalam container
WORKDIR /app

# Copy semua file proyek ke dalam container
COPY . .

# Pastikan pip tersedia dan install dependencies
RUN apt-get update && apt-get install -y python3-pip
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Jalankan aplikasi
CMD ["python", "dashboard/app.py"]
