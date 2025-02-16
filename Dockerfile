# Gunakan Python sebagai base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy file yang dibutuhkan
COPY requirements.txt /app/requirements.txt
COPY DL_FIRE_J2V-C2_579277 /app/DL_FIRE_J2V-C2_579277
# Copy shapefile daratan dan neighborhood
COPY County_Boundary /app/County_Boundary
COPY LA_Times_Neighborhood_Boundaries-shp /app/LA_Times_Neighborhood_Boundaries-shp

COPY dashboard /app/dashboard

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Jalankan Flask dengan Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "dashboard.app:app"]
