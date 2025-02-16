


document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('datePicker');
    const chartDiv = document.getElementById('chart');
    const errorMessage = document.getElementById('errorMessage');
    const mapDiv = document.getElementById('map');
    const dist = document.getElementById('dist');
    const line = document.getElementById('line');
    const barh = document.getElementById('barh');
    const defaultDate = "2025-01-07";

    datePicker.value = defaultDate;

 fetchDist(defaultDate); // Districts
    fetchData(defaultDate); //  map
    fetchChartData(defaultDate); // hart
    fetchLine(defaultDate); // line chart
    fetchBarh(); // barh chart
    fetchCount(defaultDate);

    datePicker.addEventListener('change', function () {
        const selectedDate = this.value;
        fetchDist(selectedDate); // Districts
        fetchData(selectedDate); // Memuat map
        fetchChartData(selectedDate); // Memuat chart
        fetchLine(selectedDate); // Memuat line chart
        fetchBarh(); // Memuat barh chart
        fetchCount(selectedDate);
    });

    function fetchCount(date){
        fetch(`/data/tcoeff/${date}`)
            .then((response) => {
                console.log("Response status:", response.status);
                return response.json();
            })
            .then((data) => {
                console.log("Fetched data:", data);
                if (data.error) {
                    document.getElementById("errorMessage").textContent = data.error;
                } else {
                    document.getElementById("totalConfidence").textContent = data.total_fire_points; 
                }
            })
            .catch((error) => {
                console.error('Error fetching T-coeff data:', error);
                document.getElementById("errorMessage").textContent = 'An error occurred while fetching T-coeff data.';
            });
    }
    


    function fetchData(date) {
        fetch(`/data/${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    errorMessage.textContent = data.error;
                    mapDiv.innerHTML = '';
                    if (!alertShown) { // Jika belum muncul, baru tampilkan alert
                        alert(data.error);
                        alertShown = true; // Set flag supaya tidak muncul lagi
                    }
                } else {
                    errorMessage.textContent = '';
                    loadMap(data.map_path);
                    alertShown = false; // Reset flag jika data valid
                }
            })
            .catch(error => {
                errorMessage.textContent = 'An error occurred while fetching data';
                console.error('Error:', error);
            });
    }

    function loadMap(mapPath) {
        console.log('Map path:', mapPath); // Debug
        mapDiv.innerHTML = '<iframe src="' + mapPath + '" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>';
    }
    




    

  // function for chart
function fetchChartData(date) {
    console.log("Fetching chart data for date:", date); // Debug tanggal yang dimasukkan
    fetch(`/data/chart/${date}`)
        .then(response => response.json())
        .then(data => {
            console.log("Chart data received:", data); // Debug data yang diterima
            if (data.error) {
                console.error("Error from server:", data.error); // Debug error dari server
                if (fireConfidenceChartInstance) {
                    fireConfidenceChartInstance.destroy(); // Hapus chart jika error
                }
                if (!alertShown) { // Cegah alert berulang
                    alert(data.error);
                    alertShown = true;
                }
                return;
            }
            updateBarChart(data);
        })
        .catch(error => {
            console.error("Error fetching chart data:", error); // Debug error lain
            if (fireConfidenceChartInstance) {
                fireConfidenceChartInstance.destroy(); // Hapus chart jika ada error jaringan
            }
        });
}

    

    let fireConfidenceChartInstance;

    function updateBarChart(data) {
        const ctx = document.getElementById('fireConfidenceChart').getContext('2d');
    
        // Jika chart sudah ada, hapus dulu
        if (fireConfidenceChartInstance) {
            fireConfidenceChartInstance.destroy();
        }
    
        // Ambil label (confidence levels) dan data
        const labels = Object.keys(data);
        const values = Object.values(data);
    // Definisikan urutan label yang tetap
        const fixedLabels = ["High", "Normal", "Low"];
        const fixedColors = {
            "High": "#801100",
            "Normal": "#D73502",
            "Low": "#FC6400"
        };

        // Buat array default dengan nilai nol untuk setiap kategori
        const defaultValues = { "High": 0, "Normal": 0, "Low": 0 };

        // Gabungkan data yang ada dengan defaultValues agar urutan tetap
        const dataset = fixedLabels.map(label => values[labels.indexOf(label)] || 0);

        // Ambil warna sesuai urutan yang tetap
        const backgroundColors = fixedLabels.map(label => fixedColors[label]);
        const borderColors = backgroundColors; // Jika ingin warna border sama

        // Buat chart baru
        fireConfidenceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fixedLabels, // Gunakan label tetap
                datasets: [{
                    label: '',
                    data: dataset, // Pastikan data selalu dalam urutan yang benar
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Mengizinkan chart untuk menyesuaikan ukuran sesuai kontainer
                plugins: {
                    title: {
                        display: true, // Aktifkan judul
                        text: 'Distribusi Level Tingkat Confidence', 
                        font: {
                            size: 18, 
                            family: 'Arial'
                        },
                        color: 'white', 
                        padding: {
                            top: 0,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: false 
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgb(255, 255, 255)', 
                            autoSkip: true, 
                            maxRotation: 0, 
                            minRotation: 0
                        },
                        grid: {
                            //  color: 'rgb(255, 255, 255)', // Mengubah warna garis grid horizontal (garis pada sumbu Y) menjadi putih
                            //  lineWidth: 1 // Menyesuaikan ketebalan garis jika perlu
                        }
                    },
                    y: {
                        ticks: {
                            color: 'rgb(255, 255, 255)' 
                        },
                        grid: {
                            color: 'rgb(124, 124, 124)',
                            lineWidth: 0.5 // Menyesuaikan ketebalan garis 
                        }
                    }
                }
            }
        });
    }
    

    // For Districts
   function fetchDist(date) {
    console.log("Fetching district data for date:", date); // Debug tanggal yang dimasukkan
    fetch(`/data/dist/${date}`)
        .then(response => response.json())
        .then(data => {
            console.log("District data received:", data); // Debug data yang diterima
            if (data.error) {
                console.error("Error from server:", data.error); // Debug error dari server
                console.log("Error content:", data.error);
                
                // Hapus isi tabel jika terjadi error
                document.querySelector("#confidenceTable tbody").innerHTML = '';

                if (!alertShown) { 
                    alert(data.error);
                    alertShown = true;
                }
                return;
            }
            updateDistTable(data);
        })
        .catch(error => {
            console.error("Error fetching district data:", error); 
            
            // Hapus isi tabel jika terjadi error saat fetch
            document.querySelector("#confidenceTable tbody").innerHTML = '';
        });
}

  
    function updateDistTable(data) {
        console.log("Data received:", data);  // Debug log untuk memeriksa data
        
        const tableBody = document.querySelector("#confidenceTable tbody");
        
        // Hapus data tabel lama
        tableBody.innerHTML = '';
        
        const distLabel = Object.keys(data);  // Distrik
        const distValues = Object.values(data);  // Nilai (h, l, n)
        
        distLabel.forEach((district, index) => {
            const row = document.createElement("tr");
        
            // Kolom District
            const districtCell = document.createElement("td");
            districtCell.textContent = district;
            row.appendChild(districtCell);
        
            // Kolom High, Normal, Low (gunakan h, n, l sesuai data yang diterima)
            const highCell = document.createElement("td");
            highCell.textContent = distValues[index].h || 0;  
            row.appendChild(highCell);
        
            const normalCell = document.createElement("td");
            normalCell.textContent = distValues[index].n || 0;  
            row.appendChild(normalCell);
        
            const lowCell = document.createElement("td");
            lowCell.textContent = distValues[index].l || 0; 
            row.appendChild(lowCell);
        
          
            tableBody.appendChild(row);
        });
    }
    
    
    // For Line Chart
    function fetchLine(date) {
        console.log("Fetching line data for date:", date); // Debug tanggal yang dimasukkan
        
        fetch(`/data/line/${date}`)
            .then(response => response.json())
            .then(data => {
                console.log("Chart data received:", data); // Debug data yang diterima
                
                if (data.error) {
                    console.error("Error from server:", data.error); // Debug error dari server
                    
                  
                    if (fireConfidencelineInstance) {
                        fireConfidencelineInstance.destroy();
                        fireConfidencelineInstance = null; // Reset variabel
                    }
    
                    // Kosongkan canvas jika error
                    const ctx = document.getElementById('fireConfidencelineChart');
                    if (ctx) {
                        ctx.innerHTML = ''; // Pastikan chart benar-benar kosong
                    }
    
                    // Tampilkan alert jika belum pernah ditampilkan
                    if (!alertShown) {
                        alert(data.error);
                        alertShown = true;
                    }
                    return;
                }
    
                alertShown = false; // Reset alert flag jika data valid
                updateLineChart(data);
            })
            .catch(error => {
                console.error("Error fetching line data:", error); // Debug error lain
    
                // Hapus chart jika terjadi error saat fetch
                if (fireConfidencelineInstance) {
                    fireConfidencelineInstance.destroy();
                    fireConfidencelineInstance = null;
                }
    
                // Kosongkan canvas jika error saat fetch
                const ctx = document.getElementById('fireConfidencelineChart');
                if (ctx) {
                    ctx.innerHTML = '';
                }
            });
    }
    


    let fireConfidencelineInstance; // Variabel global untuk menyimpan chart instance

    function updateLineChart(data){
        const ctx  =document.getElementById('fireConfidenceLine').getContext('2d');

        if(fireConfidencelineInstance){
            fireConfidencelineInstance.destroy();
        }
        

        const LineLabels = data.map(item => item.acq_time); // Mengambil semua nilai 'acq_time'
        const LineHighValues = data.map(item => item.High); // Data untuk 'High'
        const LineNormalValues = data.map(item => item.Normal); // Data untuk 'Normal'
        const LineLowValues = data.map(item => item.Low); // Data untuk 'Low'


        
        // Buat Line Chart
        fireConfidencelineInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: LineLabels,
                datasets: [
                    {
                        label: 'High Confidence',
                        data: LineHighValues,
                        borderColor: '#B62203',
                        fill: true,
                        borderWidth: 3
                    },
                    {
                        label: 'Normal Confidence',
                        data: LineNormalValues,
                        borderColor: '#D73502',
                        fill: false,
                        borderWidth: 3
                    },
                    {
                        label: 'Low Confidence',
                        data: LineLowValues,
                        borderColor: '#FC6400',
                        fill: false,
                        borderWidth: 3
                     
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                aspectRatio: 1, // Memampatkan chart secara horizontal
                scales: {
                    x: {
                        type: 'category', // Pastikan tipe sumbu X adalah 'category'
                        ticks: {
                            color: 'rgb(255,255,255)',
                            padding: 0 // Mengurangi padding antara label sumbu X
                        },
                        grid: {
                            color: 'rgb(124, 124, 124)',
                            lineWidth: 0.5
                        },
                        categoryPercentage: 0.5,
                        barPercentage: 0.8 
                    },
                    y: {
                        beginAtZero: true,
                        max: Math.max(...LineHighValues, ...LineNormalValues, ...LineLowValues),
                        ticks: {
                            stepSize: calculateStepSize(LineHighValues, LineNormalValues, LineLowValues),
                            color: 'rgb(255,255,255)',
                        },
                        grid: {
                            color: 'rgb(124, 124, 124)',
                            lineWidth: 0.5
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgb(255,255,255)',
                            usePointStyle: true,
                         
                        
                        }
                    }
                }
            }
        });
        // Fungsi untuk menghitung stepSize agar ada 5 stage pada Y
        function calculateStepSize(...datasets) {
            const maxDataValue = Math.max(...datasets.flat());
            const minDataValue = Math.min(...datasets.flat());
            const range = maxDataValue - minDataValue;
        
            // Menghitung step size agar ada 5 step di sumbu Y
            const stepSize = Math.ceil(range / 5); // Membagi rentang menjadi 5 tahap
            
            return stepSize;
        }
        

    }

    // For Barh
function fetchBarh() {
    fetch(`/data/barh`)
        .then(response => response.json())
        .then(data => {
            console.log("Chart data received:", data); // Debug data yang diterima
            if (data.error) {
                console.error("Error from server:", data.error); // Debug error dari server
                // alert(data.error);
                return;
            }
            updateBarhChart(data);
        })
        .catch(error => console.error("Error fetching chart data:", error)); // Debug error lain
}

let fireConfidenceBarhInstance;


function updateBarhChart(data) {
    const ctx = document.getElementById('fireConfidenceBarh').getContext('2d');

    if (fireConfidenceBarhInstance) {
        fireConfidenceBarhInstance.destroy();
    }

    // Ambil label (nama wilayah) dan data (confidence values)
    const labelsBarh = data.map(item => item.name);
    const valuesBarh = data.map(item => item.confidence);

    fireConfidenceBarhInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsBarh, // Nama wilayah
            datasets: [{
                label: 'Confidence per wilayah',
                data: valuesBarh, // Nilai confidence
                backgroundColor: '#FF7500',
                borderColor: '#FF7500',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Atur chart menjadi horizontal
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                x: {
                    ticks: {
                        color: 'rgb(255, 255, 255)' 
                    },
                },
                y: {
                    ticks: {
                        color: 'rgb(255, 255, 255)',
                        autoSkip: false,  // Menonaktifkan autoSkip agar semua label ditampilkan
                        maxRotation: 0, 
                        minRotation: 0,
                        padding: 10,  // Memberikan ruang antar label di sumbu Y
                    },
                    grid: {
                        color: 'rgb(46, 43, 43)', // Mengubah warna garis grid horizontal (garis pada sumbu Y) menjadi putih
                        lineWidth: 1 // Menyesuaikan ketebalan garis jika perlu
                    }
                }
            },
            plugins: {
                title: {
                   
                    display: true, // Aktifkan judul
                    text: 'Jumlah Confidence Berdasarkan Wilayah', // Teks judul
                    font: {
                        size: 18, // Ukuran font judul
                        family: 'Arial'
                    },
                    color: 'white', // Warna teks judul
                    padding: {
                        top: 0,
                        bottom: 0
                    }
                },
                subtitle: {
                    display: true,
                    text: '(1 Jan - 30 Jan)', // Tambahkan note di bawah judul
                    font: {
                        size: 12,
                        family: 'Arial'
                    },
                    color: 'white',
                    padding: {
                        top: 5,
                        bottom: 10
                    }
                },
                legend: {
                    labels: {
                        color: 'rgb(255, 255, 255)' // Warna putih untuk label legend
                    }
                },
                tooltip: {
                    enabled: true, // Aktifkan tooltip
                    callbacks: {
                        title: function(tooltipItem) {
                            // Mengambil nama wilayah saat hover pada bar
                            const label = tooltipItem[0].label;
                            return `Wilayah: ${label}`;
                        },
                        label: function(tooltipItem) {
                            // Menampilkan nilai Confidence saat hover pada bar
                            const value = tooltipItem.raw;
                            return `Confidence: ${value}`;
                        }
                    }
                }
            },

            elements: {
                bar: {
                    barThickness: 40,  // Menentukan ketebalan bar
                }
            },

            // Menyesuaikan proporsi kategori (untuk memberi jarak antar bar)
            layout: {
                padding: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                }
            }
        }
    });
}



});


