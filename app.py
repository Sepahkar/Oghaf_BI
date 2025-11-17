from flask import Flask, render_template, jsonify
import sqlite3

app = Flask(__name__)

# نام فایل دیتابیس
DATABASE_NAME = 'oqaf.db'

def get_db_connection():
    """
    اتصال به دیتابیس SQLite را برقرار می‌کند.
    این تابع یک اتصال باز می‌کند که ردیف‌ها را به صورت دیکشنری برمی‌گرداند.
    """
    conn = sqlite3.connect(DATABASE_NAME)
    # این خط باعث می‌شود نتایج کوئری به جای تاپل، به صورت دیکشنری برگردند
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """
    صفحه اصلی داشبورد را رندر می‌کند.
    """
    # فایل dashboard.html شما را رندر می‌کند
    return render_template('dashboard.html')

@app.route('/api/provinces')
def get_provinces():
    """
    لیست تمام استان‌ها به همراه آمار agregated (تجمیعی) اسناد را برمی‌گرداند.
    آمار هر استان از مجموع آمار شهرستان‌های آن استان محاسبه می‌شود.
    """
    conn = get_db_connection()
    # این کوئری SQL آمار اسناد را از شهرستان‌ها جمع‌بندی کرده و به استان‌ها متصل می‌کند
    query = """
        SELECT
            p.id, p.name, p.lat, p.lng,
            IFNULL(SUM(c.s_takbarg_c), 0) AS single_sheet_count,
            IFNULL(SUM(c.s_takbarg_a), 0) AS single_sheet_area,
            IFNULL(SUM(c.s_daftarchei_c), 0) AS booklet_count,
            IFNULL(SUM(c.s_daftarchei_a), 0) AS booklet_area,
            IFNULL(SUM(c.s_nosand_c), 0) AS no_document_count
        FROM provinces p
        LEFT JOIN counties c ON p.id = c.province_id
        GROUP BY p.id, p.name, p.lat, p.lng
        ORDER BY p.name;
    """
    provinces = conn.execute(query).fetchall()
    conn.close()
    
    # تبدیل ردیف‌های SQLite به لیست دیکشنری استاندارد
    return jsonify([dict(row) for row in provinces])

@app.route('/api/province/<int:province_id>/cities')
def get_cities(province_id):
    """
    لیست شهرستان‌های یک استان خاص را به همراه آمار اسناد آن‌ها برمی‌گرداند.
    """
    conn = get_db_connection()
    # آمار در خود جدول شهرستان‌ها ذخیره شده است
    query = "SELECT * FROM counties WHERE province_id = ? ORDER BY name;"
    cities = conn.execute(query, (province_id,)).fetchall()
    conn.close()
    
    if not cities:
        return jsonify({"error": "Province not found or has no cities"}), 404
        
    return jsonify([dict(row) for row in cities])

@app.route('/api/province/<int:province_id>/city/<int:city_id>/endowments')
def get_endowments(city_id, province_id):
    """
    لیست موقوفات یک شهرستان خاص را برمی‌گرداند.
    (پارامتر province_id در کوئری استفاده نمی‌شود اما برای ساختار URL خوب است)
    """
    conn = get_db_connection()
    query = "SELECT * FROM endowments WHERE county_id = ? ORDER BY name;"
    endowments = conn.execute(query, (city_id,)).fetchall()
    conn.close()
    
    if not endowments:
        return jsonify({"error": "City not found or has no endowments"}), 404

    return jsonify([dict(row) for row in endowments])

@app.route('/api/province/<int:province_id>/city/<int:city_id>/endowment/<int:endowment_id>/properties')
def get_properties(endowment_id, province_id, city_id):
    """
    لیست تمام رقبات (properties) یک موقوفه خاص را برمی‌گرداند.
    """
    conn = get_db_connection()
    query = "SELECT * FROM properties WHERE endowment_id = ? ORDER BY title;"
    properties = conn.execute(query, (endowment_id,)).fetchall()
    conn.close()
    
    if not properties:
        return jsonify({"error": "Endowment not found or has no properties"}), 404

    return jsonify([dict(row) for row in properties])

if __name__ == '__main__':
    # قبل از اجرای برنامه، مطمئن شوید که فایل generate_db.py را اجرا کرده‌اید
    print("--- سرور در حال اجرا است ---")
    print("مطمئن شوید که فایل oqaf.db در کنار این فایل وجود دارد.")
    print("اگر وجود ندارد، ابتدا فایل generate_db.py را اجرا کنید.")
    app.run(debug=True, port=5000)