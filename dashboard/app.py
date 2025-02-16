from flask import Flask, jsonify, send_from_directory
import pandas as pd
from datetime import datetime
import folium
import os
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import geopandas as gpd
from flask import Flask
from flask_cors import CORS



app = Flask(__name__, static_folder='static')
CORS(app)  # Aktifkan CORS
# titik api
df = pd.read_csv(r"\DL_FIRE_J2V-C2_579277\fire_nrt_J2V-C2_579277.csv")
df['acq_date'] = pd.to_datetime(df['acq_date'])  # Konversi ke datetime

# daratan
shapefile_daratan = r"\County_Boundary\County_Boundary.shp"
daratan_gdf = gpd.read_file(shapefile_daratan).to_crs("EPSG:4326")

# neighborhood
shapefile_neighborhoods = r"\LA_Times_Neighborhood_Boundaries-shp\8494cd42-db48-4af1-a215-a2c8f61e96a22020328-1-621do0.x5yiu.shp"
neighborhoods_gdf = gpd.read_file(shapefile_neighborhoods).to_crs("EPSG:4326")

# Filter hanya di Los Angeles 
lat_min, lat_max = 33.7, 34.3
lon_min, lon_max = -118.7, -118.2
df = df[(df['latitude'] >= lat_min) & (df['latitude'] <= lat_max) & 
        (df['longitude'] >= lon_min) & (df['longitude'] <= lon_max)]

# Konversi dataframe ke GeoDataFrame
fire_gdf = gpd.GeoDataFrame(df, 
                            geometry=gpd.points_from_xy(df.longitude, df.latitude),
                            crs="EPSG:4326")

# spatial join untuk hanya mengambil titik api di daratan
fire_daratan = gpd.sjoin(fire_gdf, daratan_gdf, how="inner", predicate="within")

# spatial join dengan neighborhood untuk menambahkan informasi lokasi
fire_daratan = gpd.sjoin(fire_daratan, neighborhoods_gdf, how="left", predicate="within", rsuffix="_neigh")


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory('static', 'index.html')



    
def process_fire_data(date):
    """Filter data berdasarkan tanggal dan wilayah Los Angeles."""
    try:
        # Parsing tanggal
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()

        # Filter data berdasarkan tanggal
        filtered_df = fire_daratan [fire_daratan ['acq_date'].dt.date == date_obj]


        # Filter berdasarkan wilayah Los Angeles
        # lat_min, lat_max = 33.7, 34.3
        # lon_min, lon_max = -118.7, -118.2
        # filtered_df = filtered_df[
        #     (filtered_df['latitude'] >= lat_min) &
        #     (filtered_df['latitude'] <= lat_max) &
        #     (filtered_df['longitude'] >= lon_min) &
        #     (filtered_df['longitude'] <= lon_max)
        # ]

        if filtered_df.empty:
            return None, {"error": "No data for the given date in the selected area"}

        return filtered_df, None
    except ValueError:
        return None, {"error": "Invalid date format"}
    
    
def totalConfidence(date):
    """Menghitung total jumlah titik api pada tanggal tertentu."""
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        filtered_df = fire_daratan [fire_daratan ['acq_date'].dt.date == date_obj]

        if filtered_df.empty:
            return None, "No fire data found for this date"

        # Menghitung total jumlah titik api
        total_fire_points = len(filtered_df)

        return {"total_fire_points": total_fire_points}, None
    except Exception as e:
        print("Error dalam menghitung total titik api:", e)
        return None, str(e)


#TotalConfidence
@app.route('/data/tcoeff/<date>')
def get_total_confidence(date):
    confidence_data, error = totalConfidence(date)
    if error:
        return jsonify({"error": error}), 404
    
    return jsonify(confidence_data)



@app.route('/data/dist/<date>')
def get_dist_data(date):
    global neighborhoods_gdf  

    if neighborhoods_gdf is None or neighborhoods_gdf.empty:
        return jsonify({"error": "Neighborhoods data is missing or empty"}), 500

    filtered_cf, error = process_fire_data(date)
    if error:
        return jsonify(error), 404

    fire_gdf = gpd.GeoDataFrame(filtered_cf, 
                                geometry=gpd.points_from_xy(filtered_cf.longitude, filtered_cf.latitude),
                                crs="EPSG:4326")

    fire_gdf = fire_gdf.to_crs(neighborhoods_gdf.crs)

    # Hapus kolom index_right jika ada
    for col in ['index_right', 'index_neigh']:
        if col in fire_gdf.columns:
            fire_gdf.drop(columns=[col], inplace=True)
        if col in neighborhoods_gdf.columns:
            neighborhoods_gdf.drop(columns=[col], inplace=True)

    fire_with_names = gpd.sjoin(fire_gdf, neighborhoods_gdf, how="left", predicate="intersects")

    if 'name_right' in fire_with_names.columns:
        fire_with_names.rename(columns={'name_right': 'name'}, inplace=True)
    elif 'name_nb' in fire_with_names.columns:
        fire_with_names.rename(columns={'name_nb': 'name'}, inplace=True)

    if 'name' not in fire_with_names.columns:
        return jsonify({"error": "Kolom 'name' tidak ditemukan setelah spatial join"}), 500

    fire_with_names['name'].fillna('Else', inplace=True)

    counts = fire_with_names.groupby(['name', 'confidence']).size().reset_index(name='count')
    pivot_df = counts.pivot(index='name', columns='confidence', values='count').fillna(0)

    return jsonify(pivot_df.to_dict(orient='index'))



#Line Chart
@app.route('/data/line/<date>')
def get_line_data(date):
    filtered_cf, error = process_fire_data(date)
    if error:
        return jsonify(error), 404
    
    filtered_cf['acq_time'] = filtered_cf['acq_time'].astype(str)
    filtered_cf['acq_time'] = filtered_cf['acq_time'].str.zfill(4).str[:2] + ':' + filtered_cf['acq_time'].str.zfill(4).str[2:]

    # Menambahkan kolom High, Normal, Low berdasarkan confidence
    filtered_cf['High'] = filtered_cf['confidence'].apply(lambda x: 1 if x == 'h' else 0)
    filtered_cf['Normal'] = filtered_cf['confidence'].apply(lambda x: 1 if x == 'n' else 0)
    filtered_cf['Low'] = filtered_cf['confidence'].apply(lambda x: 1 if x == 'l' else 0)

    # Group by acq_time dan hitung jumlah untuk High, Normal, Low
    filtered_cf = filtered_cf.groupby('acq_time').agg({'High': 'sum', 'Normal': 'sum', 'Low': 'sum'}).reset_index()

    # Isi NaN dengan 0
    filtered_cf[['High', 'Normal', 'Low']] = filtered_cf[['High', 'Normal', 'Low']].fillna(0)

    filtered_cf_json = filtered_cf.to_dict(orient='records')

   
    return jsonify(filtered_cf_json)


# Barh Chart for Districts
@app.route('/data/barh', methods=['GET'])
def barh_chart_data():
    lat_min, lat_max = 33.7, 34.3
    lon_min, lon_max = -118.7, -118.2
    fire_data = df[
        (df['latitude'] >= lat_min) & 
        (df['latitude'] <= lat_max) & 
        (df['longitude'] >= lon_min) & 
        (df['longitude'] <= lon_max)
    ]

    # Ubah data titik kebakaran menjadi GeoDataFrame
    fire_gdf = gpd.GeoDataFrame(fire_data, 
                                geometry=gpd.points_from_xy(fire_data.longitude, fire_data.latitude))

    # Tentukan CRS
    fire_gdf.set_crs("EPSG:4326", allow_override=True, inplace=True)

    fire_gdf = fire_gdf.to_crs(neighborhoods_gdf.crs)

    # Lakukan spatial join antara titik kebakaran dan batas wilayah dengan predicate="within"
    fire_with_names = gpd.sjoin(fire_gdf, neighborhoods_gdf, how="left", predicate="within")

    # Ganti nilai NaN di kolom 'name' dengan 'Else' (untuk titik yang di luar wilayah)
    fire_with_names['name'].fillna('Else', inplace=True)


   
    dist_group = fire_with_names.groupby('name').agg({'confidence':'count'})
    dist_group = dist_group.reset_index()
    data = dist_group.to_dict(orient='records') 

    # Tampilkan hasil jumlah titik api berdasarkan confidence
    plt.barh(dist_group['name'], dist_group['confidence'])
   
    return jsonify(data)
   
   
    
# Bar Chart
@app.route('/data/chart/<date>')
def get_chart_data(date):
    filtered_cf, error = process_fire_data(date)
    if error:
        return jsonify(error), 404

    # Hitung jumlah berdasarkan confidence
    confidence_counts = filtered_cf['confidence'].value_counts().to_dict()

    # Mapping kategori confidence
    confidence_order = {'h': 'High', 'n': 'Normal', 'l': 'Low'}
    result = {
        confidence_order.get(k, k): v
        for k, v in confidence_counts.items()
    }

    return jsonify(result)


#  ================



# CREATE MAP ==============================
#==========================================
@app.route('/data/<date>')
def get_fire_data(date):
    filtered_df, error = process_fire_data(date)
    if error:
        return jsonify(error), 404

    # Create map
    map = folium.Map(location=[34.0522, -118.2437], zoom_start=10)

    for _, row in filtered_df.iterrows():
        color = '#801100' if row['confidence'] == 'h' else '#D73502' if row['confidence'] == 'n' else '#FC6400'
        folium.CircleMarker(
             location=[row['latitude'], row['longitude']],
        radius=5,  # Radius dalam meter
        color=color,
        fill=True,
        fill_color=color,
        fill_opacity=0.5
        ).add_to(map)

    # Save map to a temporary file in the static folder
    map_path = f'temp_map_{date}.html'
    full_map_path = os.path.join(app.static_folder, map_path)

    if not os.path.exists(app.static_folder):
        os.makedirs(app.static_folder)

    map.save(full_map_path)
    return jsonify({"map_path": f"/{map_path}"})


if __name__ == '__main__':
    app.run(debug=True)