from flask import Flask, render_template, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    # Sample data for the map
    sample_data = [
        {
            'id': 1,
            'name': 'Location 1',
            'lat': 35.6892,
            'lng': 51.3890,
            'description': 'Sample location in Tehran'
        },
        {
            'id': 2,
            'name': 'Location 2',
            'lat': 35.7219,
            'lng': 51.3347,
            'description': 'Another sample location'
        }
    ]
    return jsonify(sample_data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)