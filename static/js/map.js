// Flask Leaflet Map Application - Main JavaScript File

$(document).ready(function() {
    // Initialize map
    let map;
    let markers = [];
    let currentLocationMarker = null;
    
    // Map layers
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    });
    
    // Initialize map with Tehran coordinates
    function initMap() {
        map = L.map('map').setView([35.6892, 51.3890], 10);
        streetLayer.addTo(map);
        
        // Add click event to map
        map.on('click', function(e) {
            updateCoordinates(e.latlng.lat, e.latlng.lng);
            $('#markerLat').val(e.latlng.lat.toFixed(6));
            $('#markerLng').val(e.latlng.lng.toFixed(6));
        });
        
        // Add zoom event
        map.on('zoomend', function() {
            console.log('Current zoom level: ' + map.getZoom());
        });
    }
    
    // Update coordinates display
    function updateCoordinates(lat, lng) {
        $('#coordinates').html(`
            <strong>Latitude:</strong> ${lat.toFixed(6)}<br>
            <strong>Longitude:</strong> ${lng.toFixed(6)}<br>
            <strong>Zoom:</strong> ${map.getZoom()}
        `);
    }
    
    // Add marker to map
    function addMarker(lat, lng, name, description, isCustom = false) {
        const marker = L.marker([lat, lng]).addTo(map);
        
        const popupContent = `
            <div>
                <h6>${name}</h6>
                <p>${description}</p>
                ${isCustom ? '<button class="btn btn-sm btn-danger mt-1" onclick="removeMarker(this)">Remove</button>' : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
        
        return marker;
    }
    
    // Remove marker
    window.removeMarker = function(button) {
        const popup = button.closest('.leaflet-popup-content');
        const marker = markers.find(m => m.getPopup().getContent().includes(popup.innerHTML));
        if (marker) {
            map.removeLayer(marker);
            markers = markers.filter(m => m !== marker);
        }
    };
    
    // Load data from Flask API
    function loadMapData() {
        $.ajax({
            url: '/api/data',
            method: 'GET',
            beforeSend: function() {
                $('#loadDataBtn').html('<span class="spinner-border spinner-border-sm me-1"></span>Loading...');
            },
            success: function(data) {
                // Clear existing markers
                clearMarkers();
                
                // Add new markers
                data.forEach(function(location) {
                    addMarker(location.lat, location.lng, location.name, location.description);
                });
                
                // Fit map to show all markers
                if (data.length > 0) {
                    const group = new L.featureGroup(markers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }
                
                // Show success message
                showAlert('Data loaded successfully!', 'success');
            },
            error: function() {
                showAlert('Error loading data!', 'danger');
            },
            complete: function() {
                $('#loadDataBtn').html('Load Data');
            }
        });
    }
    
    // Clear all markers
    function clearMarkers() {
        markers.forEach(function(marker) {
            map.removeLayer(marker);
        });
        markers = [];
    }
    
    // Get current location
    function getCurrentLocation() {
        if (navigator.geolocation) {
            $('#getCurrentLocationBtn').html('<span class="spinner-border spinner-border-sm me-1"></span>Getting Location...');
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Remove previous current location marker
                    if (currentLocationMarker) {
                        map.removeLayer(currentLocationMarker);
                    }
                    
                    // Add current location marker
                    currentLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: '<i class="fas fa-user"></i>',
                            iconSize: [20, 20]
                        })
                    }).addTo(map);
                    
                    currentLocationMarker.bindPopup('<strong>Your Current Location</strong>');
                    
                    // Center map on current location
                    map.setView([lat, lng], 15);
                    updateCoordinates(lat, lng);
                    
                    showAlert('Current location found!', 'success');
                },
                function(error) {
                    let errorMessage = 'Unable to get location: ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Position unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Request timeout';
                            break;
                        default:
                            errorMessage += 'Unknown error';
                            break;
                    }
                    showAlert(errorMessage, 'warning');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
            
            $('#getCurrentLocationBtn').html('My Location');
        } else {
            showAlert('Geolocation is not supported by this browser.', 'warning');
        }
    }
    
    // Search location (simple implementation)
    function searchLocation() {
        const query = $('#locationSearch').val().trim();
        if (!query) {
            showAlert('Please enter a location to search', 'warning');
            return;
        }
        
        // Simple search for Tehran locations
        const locations = {
            'tehran': [35.6892, 51.3890],
            'isfahan': [32.6546, 51.6680],
            'shiraz': [29.5918, 52.5837],
            'mashhad': [36.2605, 59.6168],
            'tabriz': [38.0962, 46.2738]
        };
        
        const searchKey = query.toLowerCase();
        if (locations[searchKey]) {
            const [lat, lng] = locations[searchKey];
            map.setView([lat, lng], 12);
            updateCoordinates(lat, lng);
            showAlert(`Found: ${query}`, 'success');
        } else {
            showAlert('Location not found. Try: Tehran, Isfahan, Shiraz, Mashhad, Tabriz', 'info');
        }
    }
    
    // Show alert message
    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 80px; right: 20px; z-index: 9999; min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(alertHtml);
        
        // Auto dismiss after 3 seconds
        setTimeout(function() {
            $('.alert').alert('close');
        }, 3000);
    }
    
    // Event Handlers
    $('#loadDataBtn').click(function(e) {
        e.preventDefault();
        loadMapData();
    });
    
    $('#clearMapBtn').click(function(e) {
        e.preventDefault();
        clearMarkers();
        if (currentLocationMarker) {
            map.removeLayer(currentLocationMarker);
            currentLocationMarker = null;
        }
        showAlert('Map cleared!', 'info');
    });
    
    $('#getCurrentLocationBtn').click(function(e) {
        e.preventDefault();
        getCurrentLocation();
    });
    
    $('#searchBtn').click(function(e) {
        e.preventDefault();
        searchLocation();
    });
    
    $('#locationSearch').keypress(function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            searchLocation();
        }
    });
    
    $('#addMarkerBtn').click(function(e) {
        e.preventDefault();
        $('#markerModal').modal('show');
    });
    
    $('#saveMarkerBtn').click(function() {
        const name = $('#markerName').val().trim();
        const description = $('#markerDescription').val().trim();
        const lat = parseFloat($('#markerLat').val());
        const lng = parseFloat($('#markerLng').val());
        
        if (!name || isNaN(lat) || isNaN(lng)) {
            showAlert('Please fill in all required fields with valid data', 'warning');
            return;
        }
        
        addMarker(lat, lng, name, description, true);
        $('#markerModal').modal('hide');
        $('#markerForm')[0].reset();
        showAlert('Marker added successfully!', 'success');
    });
    
    // Map layer switching
    $('input[name="mapLayer"]').change(function() {
        const selectedLayer = $(this).val();
        
        // Remove current layer
        map.eachLayer(function(layer) {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        // Add selected layer
        if (selectedLayer === 'satellite') {
            satelliteLayer.addTo(map);
        } else {
            streetLayer.addTo(map);
        }
    });
    
    // Initialize the map when document is ready
    initMap();
    
    // Load initial data
    setTimeout(function() {
        loadMapData();
    }, 1000);
    
    // Update coordinates display initially
    updateCoordinates(35.6892, 51.3890);
});