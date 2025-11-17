from flask import Flask, render_template, jsonify
import sqlite3

app = Flask(__name__)
DATABASE_NAME = 'oqaf.db'

# (امتیاز ۱۱) یک ارزش تخمینی برای هر رقبه فاقد اجاره
ESTIMATED_RENT_PER_PROPERTY = 5000000 # ۵ میلیون ریال

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('dashboard.html')

def execute_query(query, params=()):
    """یک تابع کمکی برای اجرای کوئری و تبدیل به لیست دیکشنری"""
    conn = get_db_connection()
    results = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in results]

@app.route('/api/provinces')
def get_provinces():
    """
    (نسخه ۲)
    لیست استان‌ها به همراه آمار تجمیعی اسناد، داده‌های نمودار و درآمد از دست رفته.
    """
    
    # (امتیاز ۹) کوئری برای آمار اسناد (تعداد و مساحت) در سطح کشور
    query_stats = """
        SELECT
            p.id, p.name, p.lat, p.lng,
            IFNULL(SUM(c.s_takbarg_c), 0) AS takbarg_count,
            IFNULL(SUM(c.s_takbarg_a), 0) AS takbarg_area,
            IFNULL(SUM(c.s_daftarchei_c), 0) AS daftarchei_count,
            IFNULL(SUM(c.s_daftarchei_a), 0) AS daftarchei_area,
            IFNULL(SUM(c.s_nosand_c), 0) AS nosand_count
        FROM provinces p
        LEFT JOIN counties c ON p.id = c.province_id
        GROUP BY p.id, p.name, p.lat, p.lng
        ORDER BY p.name;
    """
    
    # (امتیاز ۱۱) کوئری برای درآمد از دست رفته (بر اساس موقوفات استان)
    query_lost_revenue = """
        SELECT 
            c.province_id,
            COUNT(p.id) AS missing_properties
        FROM properties p
        JOIN endowments e ON p.endowment_id = e.id
        JOIN counties c ON e.county_id = c.id
        WHERE p.property_status IN ('عدم شناسایی متصرف', 'اجاره نامه منقضی شده')
        GROUP BY c.province_id;
    """
    
    provinces_list = execute_query(query_stats)
    revenue_data = {row['province_id']: row['missing_properties'] for row in execute_query(query_lost_revenue)}

    # تجمیع داده‌ها
    for p in provinces_list:
        p_id = p['id']
        missing_count = revenue_data.get(p_id, 0)
        p['lost_revenue'] = missing_count * ESTIMATED_RENT_PER_PROPERTY
        
        # (امتیاز ۹) داده‌های نمودارها را اضافه می‌کنیم
        p['charts'] = {
            "by_count": [p['takbarg_count'], p['daftarchei_count'], p['nosand_count']],
            "by_area": [p['takbarg_area'], p['daftarchei_area'], 0] # فاقد سند مساحت ۰ دارد
        }
        
    return jsonify(provinces_list)


@app.route('/api/province/<int:province_id>/cities')
def get_cities(province_id):
    """
    (نسخه ۲)
    لیست شهرستان‌های یک استان خاص به همراه آمار اسناد، نمودار و درآمد.
    """
    
    # کوئری اصلی آمار شهرستان‌ها
    query_stats = "SELECT *, s_takbarg_c AS takbarg_count, s_takbarg_a AS takbarg_area, s_daftarchei_c AS daftarchei_count, s_daftarchei_a AS daftarchei_area, s_nosand_c AS nosand_count FROM counties WHERE province_id = ? ORDER BY name;"
    
    # (امتیاز ۱۱) کوئری درآمد از دست رفته (بر اساس موقوفات شهرستان)
    query_lost_revenue = """
        SELECT 
            e.county_id,
            COUNT(p.id) AS missing_properties
        FROM properties p
        JOIN endowments e ON p.endowment_id = e.id
        WHERE e.county_id IN (SELECT id FROM counties WHERE province_id = ?)
          AND p.property_status IN ('عدم شناسایی متصرف', 'اجاره نامه منقضی شده')
        GROUP BY e.county_id;
    """
    
    cities_list = execute_query(query_stats, (province_id,))
    revenue_data = {row['county_id']: row['missing_properties'] for row in execute_query(query_lost_revenue, (province_id,))}

    for c in cities_list:
        c_id = c['id']
        missing_count = revenue_data.get(c_id, 0)
        c['lost_revenue'] = missing_count * ESTIMATED_RENT_PER_PROPERTY
        
        # (امتیاز ۹) داده‌های نمودار
        c['charts'] = {
            "by_count": [c['takbarg_count'], c['daftarchei_count'], c['nosand_count']],
            "by_area": [c['takbarg_area'], c['daftarchei_area'], 0]
        }
        
    return jsonify(cities_list)

@app.route('/api/province/<int:province_id>/city/<int:city_id>/endowments')
def get_endowments(city_id, province_id):
    """
    (نسخه ۲)
    لیست موقوفات یک شهرستان خاص به همراه آمار اسناد، نمودار و درآمد.
    """
    
    query_stats = "SELECT * FROM endowments WHERE county_id = ? ORDER BY name;"
    
    # (امتیاز ۱۱) کوئری درآمد از دست رفته (بر اساس رقبات موقوفه)
    query_lost_revenue = """
        SELECT 
            p.endowment_id,
            COUNT(p.id) AS missing_properties
        FROM properties p
        WHERE p.endowment_id IN (SELECT id FROM endowments WHERE county_id = ?)
          AND p.property_status IN ('عدم شناسایی متصرف', 'اجاره نامه منقضی شده')
        GROUP BY p.endowment_id;
    """
    
    endowments_list = execute_query(query_stats, (city_id,))
    revenue_data = {row['endowment_id']: row['missing_properties'] for row in execute_query(query_lost_revenue, (city_id,))}
    
    for e in endowments_list:
        e_id = e['id']
        missing_count = revenue_data.get(e_id, 0)
        e['lost_revenue'] = missing_count * ESTIMATED_RENT_PER_PROPERTY
        
        # (امتیاز ۱۰) داده‌های نمودار (در این سطح فقط بر اساس سند خود موقوفه)
        e['charts'] = { # فعلا داده تستی تا منطق کوئری رقبات اضافه شود
            "by_doc_status": [1 if e['document_status'] == 'تک برگ' else 0, 1 if e['document_status'] == 'دفترچه ای' else 0, 1 if e['document_status'] == 'فاقد سند' else 0],
        }

    return jsonify(endowments_list)

@app.route('/api/province/<int:province_id>/city/<int:city_id>/endowment/<int:endowment_id>/properties')
def get_properties(endowment_id, province_id, city_id):
    """
    (نسخه ۲)
    لیست تمام رقبات یک موقوفه خاص به همراه داده‌های نمودار و درآمد.
    """
    
    query = "SELECT * FROM properties WHERE endowment_id = ? ORDER BY title;"
    properties_list = execute_query(query, (endowment_id,))
    
    # (امتیاز ۱۱) درآمد از دست رفته
    missing_count = 0
    for p in properties_list:
        if p['property_status'] in ('عدم شناسایی متصرف', 'اجاره نامه منقضی شده'):
            missing_count += 1
    
    total_lost_revenue = missing_count * ESTIMATED_RENT_PER_PROPERTY

    # (امتیاز ۱۰) محاسبه داده‌های نمودار برای سطح رقبه
    chart_doc_status = [0, 0, 0] # تک برگ، دفترچه‌ای، فاقد سند
    chart_prop_status = [0, 0, 0] # معتبر، منقضی، عدم شناسایی
    chart_lease_status = [0, 0, 0] # دارای اجاره، فاقد اجاره، مذاکره/حقوقی
    
    for p in properties_list:
        # نمودار اسناد
        if p['document_status'] == 'تک برگ': chart_doc_status[0] += 1
        elif p['document_status'] == 'دفترچه ای': chart_doc_status[1] += 1
        else: chart_doc_status[2] += 1
        
        # نمودار وضعیت رقبه
        if p['property_status'] == 'دارای اجاره نامه معتبر': chart_prop_status[0] += 1
        elif p['property_status'] == 'اجاره نامه منقضی شده': chart_prop_status[1] += 1
        elif p['property_status'] == 'عدم شناسایی متصرف': chart_prop_status[2] += 1
            
        # نمودار وضعیت اجاره
        if p['lease_status'] == 'دارای اجاره نامه': chart_lease_status[0] += 1
        elif p['lease_status'] == 'فاقد اجاره نامه': chart_lease_status[1] += 1
        else: chart_lease_status[2] += 1

    chart_data = {
        "doc_status": chart_doc_status,
        "prop_status": chart_prop_status,
        "lease_status": chart_lease_status
    }
    
    # API یک آبجکت برمی‌گرداند، نه یک لیست
    return jsonify({
        "properties": properties_list,
        "charts": chart_data,
        "lost_revenue": total_lost_revenue
    })


if __name__ == '__main__':
    print("--- سرور (نسخه ۲) در حال اجرا است ---")
    print("مطمئن شوید که oqaf.db (نسخه ۲) را با generate_db.py ساخته‌اید.")
    app.run(debug=True, port=5000)