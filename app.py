from flask import Flask, render_template, jsonify, request, send_from_directory
import json

app = Flask(__name__)

# Sample data for Oghaf management system
SAMPLE_DATA = {
    "provinces": {
        "tehran": {
            "name": "تهران",
            "center": [35.6892, 51.3890],
            "stats": {
                "single_sheet_count": 1250,
                "single_sheet_area": 45000,
                "booklet_count": 890,
                "booklet_area": 32000,
                "no_document_count": 340,
                "no_document_area": "نامشخص"
            },
            "cities": {
                "tehran_city": {
                    "name": "تهران",
                    "center": [35.6892, 51.3890],
                    "stats": {
                        "single_sheet_count": 850,
                        "single_sheet_area": 30000,
                        "booklet_count": 620,
                        "booklet_area": 22000,
                        "no_document_count": 240,
                        "no_document_area": "نامشخص"
                    },
                    "endowments": {
                        "masjed_jameh": {
                            "name": "مسجد جامع تهران",
                            "properties_count": 15,
                            "type": "متصرفی",
                            "total_income": 2500000000,
                            "properties": {
                                "shop_1": {
                                    "title": "مغازه شماره 1",
                                    "type": "تجاری",
                                    "status": "فعال",
                                    "tenant": "احمد رضایی",
                                    "lease_status": "دارای اجاره نامه",
                                    "lease_expiry": "1403/12/29"
                                },
                                "shop_2": {
                                    "title": "مغازه شماره 2",
                                    "type": "تجاری",
                                    "status": "غیرفعال",
                                    "tenant": "خالی",
                                    "lease_status": "فاقد اجاره نامه",
                                    "lease_expiry": "-"
                                },
                                "apartment_1": {
                                    "title": "آپارتمان مسکونی 1",
                                    "type": "مسکونی",
                                    "status": "فعال",
                                    "tenant": "فاطمه احمدی",
                                    "lease_status": "دارای اجاره نامه",
                                    "lease_expiry": "1404/06/15"
                                }
                            }
                        },
                        "madrese_khan": {
                            "name": "مدرسه خان",
                            "properties_count": 8,
                            "type": "غیرمتصرفی",
                            "total_income": 800000000,
                            "properties": {
                                "classroom_1": {
                                    "title": "کلاس درس 1",
                                    "type": "آموزشی",
                                    "status": "فعال",
                                    "tenant": "موسسه آموزشی نور",
                                    "lease_status": "دارای اجاره نامه",
                                    "lease_expiry": "1404/03/20"
                                },
                                "library": {
                                    "title": "کتابخانه",
                                    "type": "فرهنگی",
                                    "status": "فعال",
                                    "tenant": "اداره فرهنگ",
                                    "lease_status": "فاقد اجاره نامه",
                                    "lease_expiry": "-"
                                }
                            }
                        }
                    }
                },
                "karaj": {
                    "name": "کرج",
                    "center": [35.8327, 50.9916],
                    "stats": {
                        "single_sheet_count": 400,
                        "single_sheet_area": 15000,
                        "booklet_count": 270,
                        "booklet_area": 10000,
                        "no_document_count": 100,
                        "no_document_area": "نامشخص"
                    },
                    "endowments": {
                        "masjed_karaj": {
                            "name": "مسجد مرکزی کرج",
                            "properties_count": 12,
                            "type": "متصرفی",
                            "total_income": 1800000000,
                            "properties": {}
                        }
                    }
                }
            }
        },
        "isfahan": {
            "name": "اصفهان",
            "center": [32.6546, 51.6680],
            "stats": {
                "single_sheet_count": 980,
                "single_sheet_area": 35000,
                "booklet_count": 720,
                "booklet_area": 28000,
                "no_document_count": 290,
                "no_document_area": "نامشخص"
            },
            "cities": {
                "isfahan_city": {
                    "name": "اصفهان",
                    "center": [32.6546, 51.6680],
                    "stats": {
                        "single_sheet_count": 650,
                        "single_sheet_area": 23000,
                        "booklet_count": 480,
                        "booklet_area": 18000,
                        "no_document_count": 190,
                        "no_document_area": "نامشخص"
                    },
                    "endowments": {
                        "masjed_shah": {
                            "name": "مسجد شاه",
                            "properties_count": 25,
                            "type": "متصرفی",
                            "total_income": 4200000000,
                            "properties": {}
                        }
                    }
                }
            }
        },
        "fars": {
            "name": "فارس",
            "center": [29.5918, 52.5837],
            "stats": {
                "single_sheet_count": 750,
                "single_sheet_area": 28000,
                "booklet_count": 540,
                "booklet_area": 21000,
                "no_document_count": 220,
                "no_document_area": "نامشخص"
            },
            "cities": {
                "shiraz": {
                    "name": "شیراز",
                    "center": [29.5918, 52.5837],
                    "stats": {
                        "single_sheet_count": 500,
                        "single_sheet_area": 18000,
                        "booklet_count": 360,
                        "booklet_area": 14000,
                        "no_document_count": 150,
                        "no_document_area": "نامشخص"
                    },
                    "endowments": {
                        "aramgah_hafez": {
                            "name": "آرامگاه حافظ",
                            "properties_count": 18,
                            "type": "غیرمتصرفی",
                            "total_income": 3100000000,
                            "properties": {}
                        }
                    }
                }
            }
        }
    }
}

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/provinces')
def get_provinces():
    """Get all provinces data"""
    return jsonify(SAMPLE_DATA["provinces"])

@app.route('/api/province/<province_id>')
def get_province(province_id):
    """Get specific province data"""
    if province_id in SAMPLE_DATA["provinces"]:
        return jsonify(SAMPLE_DATA["provinces"][province_id])
    return jsonify({"error": "Province not found"}), 404

@app.route('/api/province/<province_id>/cities')
def get_cities(province_id):
    """Get cities in a province"""
    if province_id in SAMPLE_DATA["provinces"]:
        return jsonify(SAMPLE_DATA["provinces"][province_id]["cities"])
    return jsonify({"error": "Province not found"}), 404

@app.route('/api/province/<province_id>/city/<city_id>')
def get_city(province_id, city_id):
    """Get specific city data"""
    if (province_id in SAMPLE_DATA["provinces"] and 
        city_id in SAMPLE_DATA["provinces"][province_id]["cities"]):
        return jsonify(SAMPLE_DATA["provinces"][province_id]["cities"][city_id])
    return jsonify({"error": "City not found"}), 404

@app.route('/api/province/<province_id>/city/<city_id>/endowments')
def get_endowments(province_id, city_id):
    """Get endowments in a city"""
    if (province_id in SAMPLE_DATA["provinces"] and 
        city_id in SAMPLE_DATA["provinces"][province_id]["cities"]):
        return jsonify(SAMPLE_DATA["provinces"][province_id]["cities"][city_id]["endowments"])
    return jsonify({"error": "City not found"}), 404

@app.route('/api/province/<province_id>/city/<city_id>/endowment/<endowment_id>')
def get_endowment(province_id, city_id, endowment_id):
    """Get specific endowment data"""
    try:
        endowment = SAMPLE_DATA["provinces"][province_id]["cities"][city_id]["endowments"][endowment_id]
        return jsonify(endowment)
    except KeyError:
        return jsonify({"error": "Endowment not found"}), 404

@app.route('/api/province/<province_id>/city/<city_id>/endowment/<endowment_id>/properties')
def get_properties(province_id, city_id, endowment_id):
    """Get properties of an endowment"""
    try:
        properties = SAMPLE_DATA["provinces"][province_id]["cities"][city_id]["endowments"][endowment_id]["properties"]
        return jsonify(properties)
    except KeyError:
        return jsonify({"error": "Endowment not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)