# Flask Leaflet Map Application

A modern web application built with Python Flask backend and interactive frontend using Leaflet maps, jQuery, and Bootstrap 5.

## Features

- **Interactive Map**: Powered by Leaflet with OpenStreetMap and satellite view options
- **Responsive Design**: Built with Bootstrap 5 for mobile-friendly interface
- **Location Services**: Get current location using browser geolocation
- **Custom Markers**: Add, view, and remove custom markers on the map
- **Search Functionality**: Search for major Iranian cities
- **Real-time Coordinates**: Display current map coordinates and zoom level
- **RESTful API**: Flask backend with JSON API endpoints

## Technologies Used

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Libraries**: 
  - Leaflet.js (Interactive maps)
  - jQuery (DOM manipulation and AJAX)
  - Bootstrap 5 (UI framework)
- **Map Data**: OpenStreetMap, ArcGIS World Imagery

## Project Structure

```
flask-leaflet-app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Custom CSS styles
    └── js/
        └── map.js        # JavaScript functionality
```

## Installation

1. **Clone or download the project files**

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

### Map Controls

- **Load Data**: Loads sample location data from the Flask API
- **Clear Map**: Removes all markers from the map
- **My Location**: Centers the map on your current location (requires permission)
- **Search**: Search for major Iranian cities (Tehran, Isfahan, Shiraz, Mashhad, Tabriz)

### Adding Markers

1. Click anywhere on the map to set coordinates
2. Click "Add Marker" button
3. Fill in the marker details in the modal
4. Click "Save Marker" to add it to the map

### Map Layers

- **Street Map**: Standard OpenStreetMap view
- **Satellite**: Satellite imagery from ArcGIS

### API Endpoints

- `GET /`: Main application page
- `GET /api/data`: Returns sample location data in JSON format

## Customization

### Adding New Cities to Search

Edit the `locations` object in `static/js/map.js`:

```javascript
const locations = {
    'tehran': [35.6892, 51.3890],
    'your_city': [latitude, longitude]
};
```

### Modifying Sample Data

Edit the `sample_data` array in `app.py`:

```python
sample_data = [
    {
        'id': 1,
        'name': 'Your Location',
        'lat': 35.6892,
        'lng': 51.3890,
        'description': 'Your description'
    }
]
```

### Styling

Modify `static/css/style.css` to customize the appearance of the application.

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Support

For support or questions, please create an issue in the project repository.