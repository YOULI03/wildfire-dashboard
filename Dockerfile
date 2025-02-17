# Gunakan image Python
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy semua file ke dalam container
COPY . /app

# Install dependensi dari requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Expose port yang digunakan oleh aplikasi
EXPOSE 5000

# Jalankan aplikasi menggunakan gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "dashboard.app:app"]
