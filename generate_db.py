import sqlite3
import random
from faker import Faker
import jdatetime
import os

# لیست استان‌ها (ثابت)
PROVINCES = [
    (1, 'آذربایجان شرقی', 38.0772, 46.2917), (2, 'آذربایجان غربی', 37.5452, 45.0728),
    (3, 'اردبیل', 38.2468, 48.2950), (4, 'اصفهان', 32.6546, 51.6680),
    (5, 'البرز', 35.8407, 50.9390), (6, 'ایلام', 33.6377, 46.4226),
    (7, 'بوشهر', 28.9221, 50.8307), (8, 'تهران', 35.6892, 51.3890),
    (9, 'چهارمحال و بختیاری', 32.3292, 50.8542), (10, 'خراسان جنوبی', 32.8657, 59.2168),
    (11, 'خراسان رضوی', 36.2970, 59.6062), (12, 'خراسان شمالی', 37.4722, 57.3323),
    (13, 'خوزستان', 31.3183, 48.6706), (14, 'زنجان', 36.6766, 48.4841),
    (15, 'سمنان', 35.5786, 53.3970), (16, 'سیستان و بلوچستان', 29.4915, 60.8637),
    (17, 'فارس', 29.6100, 52.5311), (18, 'قزوین', 36.2709, 50.0039),
    (19, 'قم', 34.6406, 50.8768), (20, 'کردستان', 35.3119, 46.9996),
    (21, 'کرمان', 30.2832, 57.0788), (22, 'کرمانشاه', 34.3142, 47.0650),
    (23, 'کهگیلویه و بویراحمد', 30.6653, 51.5959), (24, 'گلستان', 36.8390, 54.4386),
    (25, 'گیلان', 37.2808, 49.5832), (26, 'لرستان', 33.4862, 48.3558),
    (27, 'مازندران', 36.5659, 53.0586), (28, 'مرکزی', 34.0917, 49.6896),
    (29, 'هرمزگان', 27.1865, 56.2808), (30, 'همدان', 34.7982, 48.5146),
    (31, 'یزد', 31.8974, 54.3675)
]

fake = Faker('fa_IR')

def create_connection():
    return sqlite3.connect('oqaf.db')

def create_tables(conn):
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS provinces (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL)')
    
    # جدول شهرستان با تفکیک دقیق مساحت و تعداد
    cursor.execute('''CREATE TABLE IF NOT EXISTS counties (
        id INTEGER PRIMARY KEY AUTOINCREMENT, province_id INTEGER, name TEXT, lat REAL, lng REAL,
        s_takbarg_c INTEGER, s_takbarg_a REAL, 
        s_daftarchei_c INTEGER, s_daftarchei_a REAL, 
        s_nosand_c INTEGER, s_nosand_a REAL, 
        FOREIGN KEY (province_id) REFERENCES provinces (id))''')
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_county_province ON counties(province_id)")

    cursor.execute('''CREATE TABLE IF NOT EXISTS endowments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, county_id INTEGER, name TEXT, raqabat_count INTEGER,
        type TEXT, intent TEXT, total_income REAL, lat REAL, lng REAL, document_status TEXT,
        FOREIGN KEY (county_id) REFERENCES counties (id))''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_endow_county ON endowments(county_id)")

    cursor.execute('''CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT, endowment_id INTEGER, title TEXT, land_use TEXT,
        status TEXT, user TEXT, lease_status TEXT, expiry_date TEXT, lease_amount REAL,
        property_status TEXT, document_status TEXT, area REAL,
        FOREIGN KEY (endowment_id) REFERENCES endowments (id))''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prop_endow ON properties(endowment_id)")
    
    conn.commit()

def generate_mock_data(conn):
    cursor = conn.cursor()
    cursor.executemany('INSERT INTO provinces VALUES (?,?,?,?)', PROVINCES)
    
    county_id = 1000
    
    # نوع رقبات
    DOC_TYPES = ['takbarg', 'daftarchei', 'nosand']
    
    for p in PROVINCES:
        p_id = p[0]
        # ایجاد شهرستان‌های فرضی برای هر استان
        num_counties = random.randint(3, 8)
        for i in range(num_counties):
            c_id = county_id + i
            c_name = f"شهرستان {fake.city()}"
            c_lat = float(p[2]) + random.uniform(-0.5, 0.5)
            c_lng = float(p[3]) + random.uniform(-0.5, 0.5)
            
            # تولید داده‌های ناهمگن (مساحت و تعداد متفاوت)
            # مثلا فاقد سند: تعداد کم ولی مساحت خیلی زیاد (زمین‌های بزرگ تصرف شده)
            stats = {
                'takbarg': {'c': random.randint(100, 500), 'a': random.randint(5000, 20000)},
                'daftarchei': {'c': random.randint(50, 200), 'a': random.randint(10000, 50000)},
                'nosand': {'c': random.randint(10, 50), 'a': random.randint(100000, 500000)} # مساحت زیاد!
            }
            
            cursor.execute('''INSERT INTO counties VALUES (?,?,?,?,?,?,?,?,?,?,?)''', 
                           (c_id, p_id, c_name, c_lat, c_lng,
                            stats['takbarg']['c'], stats['takbarg']['a'],
                            stats['daftarchei']['c'], stats['daftarchei']['a'],
                            stats['nosand']['c'], stats['nosand']['a']))
            
            # ایجاد موقوفات فقط برای تعدادی از شهرستان‌ها (جهت سرعت)
            if i < 2: 
                for _ in range(random.randint(5, 10)):
                    doc_status = random.choice(["تک برگ", "دفترچه ای", "فاقد سند"])
                    e_lat = c_lat + random.uniform(-0.02, 0.02)
                    e_lng = c_lng + random.uniform(-0.02, 0.02)
                    
                    cursor.execute('''INSERT INTO endowments (county_id, name, raqabat_count, type, intent, total_income, lat, lng, document_status)
                                      VALUES (?,?,?,?,?,?,?,?,?)''',
                                   (c_id, f"موقوفه {fake.last_name()}", 0, random.choice(["متصرفی", "غیرمتصرفی"]), 
                                    "اطعام و عزاداری", 0, e_lat, e_lng, doc_status))
                    
                    eid = cursor.lastrowid
                    
                    # ایجاد رقبات برای موقوفه
                    props = []
                    prop_count = random.randint(5, 20)
                    total_inc = 0
                    
                    for _ in range(prop_count):
                        # وضعیت‌هایی که درآمد از دست رفته ایجاد می‌کنند
                        p_status = random.choice(["عدم شناسایی متصرف", "مذاکره", "دعوای حقوقی", "دارای اجاره نامه معتبر", "اجاره نامه منقضی شده"])
                        d_status = random.choice(["تک برگ", "دفترچه ای", "فاقد سند"])
                        
                        lease_amnt = 0
                        exp_date = '-'
                        if p_status == "دارای اجاره نامه معتبر":
                            lease_amnt = random.randint(10000000, 100000000) # درآمد واقعی
                            exp_date = "1404/12/29"
                        
                        total_inc += lease_amnt
                        
                        props.append((eid, f"رقبه {fake.word()}", "تجاری/مسکونی", "فعال", fake.name(), 
                                      p_status, exp_date, lease_amnt, p_status, d_status, random.randint(100, 5000)))
                    
                    cursor.executemany('''INSERT INTO properties (endowment_id, title, land_use, status, user, lease_status, expiry_date, lease_amount, property_status, document_status, area) 
                                          VALUES (?,?,?,?,?,?,?,?,?,?,?)''', props)
                    
                    cursor.execute('UPDATE endowments SET raqabat_count=?, total_income=? WHERE id=?', (prop_count, total_inc, eid))

        county_id += 10

    conn.commit()

if __name__ == '__main__':
    if os.path.exists('oqaf.db'): os.remove('oqaf.db')
    conn = create_connection()
    create_tables(conn)
    generate_mock_data(conn)
    conn.close()
    print("Database Generated Successfully with High Variance Data.")