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
    query = """
        SELECT 
            pr.id, pr.name, pr.lat, pr.lng,
            COUNT(DISTINCT e.id) AS total_waqfs,
            COUNT(DISTINCT CASE WHEN e.document_status = 'دارای سند' THEN e.id END) AS waqfs_has_doc,
            COUNT(DISTINCT CASE WHEN e.document_status = 'فاقد سند' THEN e.id END) AS waqfs_no_doc,

            SUM(CASE WHEN p.document_status = 'تک برگ' THEN 1 ELSE 0 END) AS takbarg_count,
            SUM(CASE WHEN p.document_status = 'دفترچه ای' THEN 1 ELSE 0 END) AS daftarchei_count,
            SUM(CASE WHEN p.document_status = 'فاقد سند' THEN 1 ELSE 0 END) AS nosand_count,

            SUM(CASE WHEN p.document_status = 'تک برگ' THEN p.area ELSE 0 END) AS takbarg_area,
            SUM(CASE WHEN p.document_status = 'دفترچه ای' THEN p.area ELSE 0 END) AS daftarchei_area,
            SUM(CASE WHEN p.document_status = 'فاقد سند' THEN p.area ELSE 0 END) AS nosand_area,

            IFNULL(SUM(p.lost_revenue), 0) AS lost_revenue
        FROM provinces pr
        LEFT JOIN counties c ON pr.id = c.province_id
        LEFT JOIN endowments e ON c.id = e.county_id
        LEFT JOIN properties p ON e.id = p.endowment_id
        GROUP BY pr.id, pr.name, pr.lat, pr.lng
        ORDER BY pr.name;
    """
    provinces = execute_query(query)
    for p in provinces:
        p['charts'] = {
            "by_count": [p['takbarg_count'], p['daftarchei_count'], p['nosand_count']],
            "by_area": [p['takbarg_area'], p['daftarchei_area'], p['nosand_area']]
        }
    return jsonify(provinces)

@app.route('/api/province/<int:pid>/cities')
def get_cities(pid):
    query = """
        SELECT 
            c.id, c.province_id, c.name, c.lat, c.lng,
            COUNT(DISTINCT e.id) AS total_waqfs,
            COUNT(DISTINCT CASE WHEN e.document_status = 'دارای سند' THEN e.id END) AS waqfs_has_doc,
            COUNT(DISTINCT CASE WHEN e.document_status = 'فاقد سند' THEN e.id END) AS waqfs_no_doc,

            SUM(CASE WHEN p.document_status = 'تک برگ' THEN 1 ELSE 0 END) AS takbarg_count,
            SUM(CASE WHEN p.document_status = 'دفترچه ای' THEN 1 ELSE 0 END) AS daftarchei_count,
            SUM(CASE WHEN p.document_status = 'فاقد سند' THEN 1 ELSE 0 END) AS nosand_count,

            SUM(CASE WHEN p.document_status = 'تک برگ' THEN p.area ELSE 0 END) AS takbarg_area,
            SUM(CASE WHEN p.document_status = 'دفترچه ای' THEN p.area ELSE 0 END) AS daftarchei_area,
            SUM(CASE WHEN p.document_status = 'فاقد سند' THEN p.area ELSE 0 END) AS nosand_area,

            IFNULL(SUM(p.lost_revenue), 0) AS lost_revenue
        FROM counties c
        LEFT JOIN endowments e ON c.id = e.county_id
        LEFT JOIN properties p ON e.id = p.endowment_id
        WHERE c.province_id = ?
        GROUP BY c.id, c.province_id, c.name, c.lat, c.lng
        ORDER BY lost_revenue DESC
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
    query = """
        SELECT e.*, 
               IFNULL(SUM(p.lost_revenue), 0) AS lost_revenue,
               SUM(CASE WHEN p.document_status = 'تک برگ' THEN 1 ELSE 0 END) AS takbarg,
               SUM(CASE WHEN p.document_status = 'دفترچه ای' THEN 1 ELSE 0 END) AS daftarchei,
               SUM(CASE WHEN p.document_status = 'فاقد سند' THEN 1 ELSE 0 END) AS nosand
        FROM endowments e
        LEFT JOIN properties p ON e.id = p.endowment_id
        WHERE e.county_id = ?
        GROUP BY e.id
    """
    endows = execute_query(query, (cid,))
    for e in endows:
        e['charts'] = {"doc_status": [e['takbarg'], e['daftarchei'], e['nosand']]}
    return jsonify(endows)

@app.route('/api/province/<int:pid>/city/<int:cid>/endowment/<int:eid>/properties')
def get_properties(pid, cid, eid):
    query = "SELECT * FROM properties WHERE endowment_id = ?"
    props = execute_query(query, (eid,))
    
    lost_rev = 0
    doc_stats = [0, 0, 0]
    lease_stats = [0, 0, 0]
    
    for p in props:
        lost_rev += (p.get('lost_revenue') or 0)
        
        d_status = p.get('document_status') or ''
        if "تک برگ" in d_status: doc_stats[0] += 1
        elif "دفترچه" in d_status: doc_stats[1] += 1
        else: doc_stats[2] += 1
        
        p_status = p.get('property_status') or ''
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