from flask import Flask, render_template, jsonify
import sqlite3
import os

app = Flask(__name__)
DATABASE_NAME = 'oqaf.db'

def get_db_connection():
    if not os.path.exists(DATABASE_NAME):
        raise FileNotFoundError("Database not found!")
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(query, params=()):
    try:
        conn = get_db_connection()
        results = conn.execute(query, params).fetchall()
        conn.close()
        return [dict(row) for row in results]
    except Exception as e:
        print(f"Query Error: {e}")
        return []

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/provinces')
def get_provinces():
    # حالا p.lost_revenue را مستقیما از دیتابیس می‌خوانیم
    query_stats = """
        SELECT
            p.id, p.name, p.lat, p.lng, p.lost_revenue,
            IFNULL(SUM(c.s_takbarg_c), 0) AS takbarg_count,
            IFNULL(SUM(c.s_takbarg_a), 0) AS takbarg_area,
            IFNULL(SUM(c.s_daftarchei_c), 0) AS daftarchei_count,
            IFNULL(SUM(c.s_daftarchei_a), 0) AS daftarchei_area,
            IFNULL(SUM(c.s_nosand_c), 0) AS nosand_count,
            IFNULL(SUM(c.s_nosand_a), 0) AS nosand_area
        FROM provinces p
        LEFT JOIN counties c ON p.id = c.province_id
        GROUP BY p.id, p.name, p.lat, p.lng, p.lost_revenue
        ORDER BY p.name;
    """
    provinces = execute_query(query_stats)
    
    for p in provinces:
        p['charts'] = {
            "by_count": [p['takbarg_count'], p['daftarchei_count'], p['nosand_count']],
            "by_area": [p['takbarg_area'], p['daftarchei_area'], p['nosand_area']]
        }
        
    return jsonify(provinces)

@app.route('/api/province/<int:pid>/cities')
def get_cities(pid):
    # اینجا هم lost_revenue از جدول counties خوانده می‌شود
    query = """
        SELECT *, 
        s_takbarg_c AS takbarg_count, s_takbarg_a AS takbarg_area, 
        s_daftarchei_c AS daftarchei_count, s_daftarchei_a AS daftarchei_area, 
        s_nosand_c AS nosand_count, s_nosand_a AS nosand_area 
        FROM counties WHERE province_id = ?
    """
    cities = execute_query(query, (pid,))
    
    for c in cities:
        c['charts'] = {
            "by_count": [c['takbarg_count'], c['daftarchei_count'], c['nosand_count']],
            "by_area": [c['takbarg_area'], c['daftarchei_area'], c['nosand_area']]
        }
    return jsonify(cities)

@app.route('/api/province/<int:pid>/city/<int:cid>/endowments')
def get_endowments(pid, cid):
    query = "SELECT * FROM endowments WHERE county_id = ?"
    endows = execute_query(query, (cid,))
    
    for e in endows:
        prop_query = "SELECT property_status, document_status, estimated_value FROM properties WHERE endowment_id = ?"
        props = execute_query(prop_query, (e['id'],))
        
        lost_rev = 0
        doc_stats = {"takbarg": 0, "daftarchei": 0, "nosand": 0}
        prop_stats = {"valid": 0, "expired": 0, "others": 0}
        
        for p in props:
            p_status = p.get('property_status', '')
            if p_status in ["عدم شناسایی متصرف", "اجاره نامه منقضی شده", "دعوای حقوقی"]:
                est_val = p.get('estimated_value') or 10000000000
                lost_rev += (est_val * 0.05) 
            
            d_status = p.get('document_status', '')
            if "تک برگ" in d_status: doc_stats["takbarg"] += 1
            elif "دفترچه" in d_status: doc_stats["daftarchei"] += 1
            else: doc_stats["nosand"] += 1
                
            if "معتبر" in p_status: prop_stats["valid"] += 1
            elif "منقضی" in p_status: prop_stats["expired"] += 1
            else: prop_stats["others"] += 1

        e['lost_revenue'] = int(lost_rev)
        e['charts'] = {
            "doc_status": [doc_stats["takbarg"], doc_stats["daftarchei"], doc_stats["nosand"]],
            "prop_status": [prop_stats["valid"], prop_stats["expired"], prop_stats["others"]]
        }
        
    return jsonify(endows)

@app.route('/api/province/<int:pid>/city/<int:cid>/endowment/<int:eid>/properties')
def get_properties(pid, cid, eid):
    query = "SELECT * FROM properties WHERE endowment_id = ?"
    props = execute_query(query, (eid,))
    
    lost_rev = 0
    doc_stats = [0, 0, 0]
    lease_stats = [0, 0, 0]
    
    for p in props:
        p_status = p.get('property_status', '')
        if p_status in ["عدم شناسایی متصرف", "اجاره نامه منقضی شده", "دعوای حقوقی"]:
            est_val = p.get('estimated_value') or 10000000000
            lost_rev += (est_val * 0.05)
        
        d_status = p.get('document_status', '')
        if "تک برگ" in d_status: doc_stats[0] += 1
        elif "دفترچه" in d_status: doc_stats[1] += 1
        else: doc_stats[2] += 1
        
        if "معتبر" in p_status: lease_stats[0] += 1
        elif "منقضی" in p_status: lease_stats[1] += 1
        else: lease_stats[2] += 1

    return jsonify({
        "properties": props,
        "lost_revenue": int(lost_rev),
        "charts": {"doc_status": doc_stats, "prop_status": lease_stats}
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)