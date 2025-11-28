import sqlite3

conn = sqlite3.connect('oqaf.db')
cursor = conn.cursor()

# بررسی تعداد استان‌ها
cursor.execute('SELECT COUNT(*) FROM provinces')
province_count = cursor.fetchone()[0]
print(f'Provinces count: {province_count}')

# بررسی تعداد شهرستان‌ها
cursor.execute('SELECT COUNT(*) FROM counties')
county_count = cursor.fetchone()[0]
print(f'Counties count: {county_count}')

# بررسی یک نمونه استان
cursor.execute('SELECT id, name, lat, lng FROM provinces LIMIT 3')
provinces = cursor.fetchall()
print(f'\nSample provinces:')
for p in provinces:
    print(f'  ID: {p[0]}, Name: {p[1]}, Lat: {p[2]}, Lng: {p[3]}')

# بررسی کوئری اصلی
query = """
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
    ORDER BY p.name
    LIMIT 5;
"""
cursor.execute(query)
results = cursor.fetchall()
print(f'\nQuery results (first 5):')
for r in results:
    print(f'  {r}')

conn.close()

