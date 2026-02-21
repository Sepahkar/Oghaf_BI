import sqlite3
import random
from faker import Faker
import os

# لیست استان‌ها
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

# دیتای استخراج شده واقعی - تعداد کل موقوفات استان‌ها
PROVINCE_TOTALS = {'آذربایجان شرقی': 9733, 'آذربایجان غربی': 7040, 'اردبیل': 3280, 'اصفهان': 17007, 'البرز': 1966, 'ایلام': 835, 'بوشهر': 3257, 'تهران': 10301, 'چهارمحال و بختیاری': 1988, 'خراسان جنوبی': 10635, 'خراسان رضوی': 27571, 'خراسان شمالی': 5975, 'خوزستان': 6364, 'زنجان': 2918, 'سمنان': 5890, 'سیستان و بلوچستان': 5353, 'فارس': 15314, 'قزوین': 2824, 'قم': 2495, 'کردستان': 2602, 'کرمان': 8816, 'کرمانشاه': 2280, 'کهگیلویه و بویراحمد': 1376, 'گلستان': 5973, 'گیلان': 5098, 'لرستان': 3098, 'مازندران': 14975, 'مرکزی': 5935, 'هرمزگان': 7940, 'همدان': 3569, 'یزد': 15052}

# دیتای استخراج شده واقعی - شهرستان‌های استان فارس و مازندران
FARS_MAZ_DATA = [{"province_name": "فارس", "name": "ارسنجان", "total_endowments": 209, "has_doc": 138, "no_doc": 71, "takbarg_c": 534, "daftarchei_c": 70}, {"province_name": "فارس", "name": "استهبان", "total_endowments": 802, "has_doc": 447, "no_doc": 355, "takbarg_c": 404, "daftarchei_c": 375}, {"province_name": "فارس", "name": "اقلید", "total_endowments": 279, "has_doc": 142, "no_doc": 137, "takbarg_c": 297, "daftarchei_c": 2}, {"province_name": "فارس", "name": "اوز", "total_endowments": 456, "has_doc": 184, "no_doc": 272, "takbarg_c": 654, "daftarchei_c": 10}, {"province_name": "فارس", "name": "آباده", "total_endowments": 382, "has_doc": 128, "no_doc": 254, "takbarg_c": 318, "daftarchei_c": 38}, {"province_name": "فارس", "name": "بوانات", "total_endowments": 215, "has_doc": 133, "no_doc": 82, "takbarg_c": 227, "daftarchei_c": 18}, {"province_name": "فارس", "name": "بیضا", "total_endowments": 133, "has_doc": 49, "no_doc": 84, "takbarg_c": 396, "daftarchei_c": 0}, {"province_name": "فارس", "name": "پاسارگاد", "total_endowments": 93, "has_doc": 29, "no_doc": 64, "takbarg_c": 28, "daftarchei_c": 2}, {"province_name": "فارس", "name": "جهرم", "total_endowments": 1014, "has_doc": 292, "no_doc": 722, "takbarg_c": 2768, "daftarchei_c": 178}, {"province_name": "فارس", "name": "خنج", "total_endowments": 554, "has_doc": 146, "no_doc": 408, "takbarg_c": 160, "daftarchei_c": 1}, {"province_name": "فارس", "name": "داراب", "total_endowments": 948, "has_doc": 341, "no_doc": 607, "takbarg_c": 502, "daftarchei_c": 63}, {"province_name": "فارس", "name": "رستم", "total_endowments": 73, "has_doc": 66, "no_doc": 7, "takbarg_c": 620, "daftarchei_c": 37}, {"province_name": "فارس", "name": "سپیدان", "total_endowments": 296, "has_doc": 155, "no_doc": 141, "takbarg_c": 306, "daftarchei_c": 3}, {"province_name": "فارس", "name": "سروستان", "total_endowments": 98, "has_doc": 51, "no_doc": 47, "takbarg_c": 968, "daftarchei_c": 21}, {"province_name": "فارس", "name": "شیراز ناحیه 1", "total_endowments": 100, "has_doc": 36, "no_doc": 64, "takbarg_c": 3978, "daftarchei_c": 140}, {"province_name": "فارس", "name": "شیراز ناحیه 2", "total_endowments": 418, "has_doc": 74, "no_doc": 344, "takbarg_c": 4878, "daftarchei_c": 34}, {"province_name": "فارس", "name": "شیراز ناحیه 3", "total_endowments": 1135, "has_doc": 355, "no_doc": 780, "takbarg_c": 530, "daftarchei_c": 155}, {"province_name": "فارس", "name": "شیراز ناحیه 4", "total_endowments": 285, "has_doc": 106, "no_doc": 179, "takbarg_c": 1940, "daftarchei_c": 57}, {"province_name": "فارس", "name": "شیراز ناحیه 5", "total_endowments": 48, "has_doc": 6, "no_doc": 42, "takbarg_c": 1662, "daftarchei_c": 40}, {"province_name": "فارس", "name": "شیراز ناحیه 6", "total_endowments": 3, "has_doc": 2, "no_doc": 1, "takbarg_c": 6, "daftarchei_c": 9}, {"province_name": "فارس", "name": "فراشبند", "total_endowments": 158, "has_doc": 63, "no_doc": 95, "takbarg_c": 71, "daftarchei_c": 0}, {"province_name": "فارس", "name": "فسا", "total_endowments": 626, "has_doc": 321, "no_doc": 305, "takbarg_c": 1433, "daftarchei_c": 101}, {"province_name": "فارس", "name": "فیروزآباد", "total_endowments": 375, "has_doc": 141, "no_doc": 234, "takbarg_c": 181, "daftarchei_c": 7}, {"province_name": "فارس", "name": "قیر و کارزین", "total_endowments": 215, "has_doc": 98, "no_doc": 117, "takbarg_c": 210, "daftarchei_c": 1}, {"province_name": "فارس", "name": "کازرون", "total_endowments": 883, "has_doc": 463, "no_doc": 420, "takbarg_c": 4427, "daftarchei_c": 750}, {"province_name": "فارس", "name": "گراش", "total_endowments": 796, "has_doc": 465, "no_doc": 331, "takbarg_c": 599, "daftarchei_c": 0}, {"province_name": "فارس", "name": "لارستان", "total_endowments": 1796, "has_doc": 802, "no_doc": 994, "takbarg_c": 1389, "daftarchei_c": 532}, {"province_name": "فارس", "name": "لامرد", "total_endowments": 1023, "has_doc": 229, "no_doc": 794, "takbarg_c": 304, "daftarchei_c": 38}, {"province_name": "فارس", "name": "مرودشت", "total_endowments": 521, "has_doc": 195, "no_doc": 326, "takbarg_c": 416, "daftarchei_c": 4}, {"province_name": "فارس", "name": "ممسنی", "total_endowments": 230, "has_doc": 157, "no_doc": 73, "takbarg_c": 976, "daftarchei_c": 31}, {"province_name": "فارس", "name": "مهر", "total_endowments": 639, "has_doc": 224, "no_doc": 415, "takbarg_c": 450, "daftarchei_c": 45}, {"province_name": "فارس", "name": "نی ریز", "total_endowments": 503, "has_doc": 296, "no_doc": 207, "takbarg_c": 452, "daftarchei_c": 223}, {"province_name": "مازندران", "name": "آمل", "total_endowments": 1317, "has_doc": 311, "no_doc": 1006, "takbarg_c": 823, "daftarchei_c": 22}, {"province_name": "مازندران", "name": "بابل", "total_endowments": 2403, "has_doc": 543, "no_doc": 1860, "takbarg_c": 1457, "daftarchei_c": 507}, {"province_name": "مازندران", "name": "بابلسر", "total_endowments": 544, "has_doc": 90, "no_doc": 454, "takbarg_c": 157, "daftarchei_c": 62}, {"province_name": "مازندران", "name": "بلده نور", "total_endowments": 798, "has_doc": 188, "no_doc": 610, "takbarg_c": 2234, "daftarchei_c": 3}, {"province_name": "مازندران", "name": "بندپی", "total_endowments": 633, "has_doc": 185, "no_doc": 448, "takbarg_c": 378, "daftarchei_c": 39}, {"province_name": "مازندران", "name": "بهشهر", "total_endowments": 848, "has_doc": 219, "no_doc": 629, "takbarg_c": 441, "daftarchei_c": 44}, {"province_name": "مازندران", "name": "تنکابن", "total_endowments": 425, "has_doc": 92, "no_doc": 333, "takbarg_c": 276, "daftarchei_c": 22}, {"province_name": "مازندران", "name": "جویبار", "total_endowments": 416, "has_doc": 151, "no_doc": 265, "takbarg_c": 199, "daftarchei_c": 34}, {"province_name": "مازندران", "name": "رامسر", "total_endowments": 210, "has_doc": 74, "no_doc": 136, "takbarg_c": 152, "daftarchei_c": 0}, {"province_name": "مازندران", "name": "ساری", "total_endowments": 2021, "has_doc": 462, "no_doc": 1559, "takbarg_c": 859, "daftarchei_c": 361}, {"province_name": "مازندران", "name": "سوادکوه", "total_endowments": 435, "has_doc": 45, "no_doc": 390, "takbarg_c": 103, "daftarchei_c": 20}, {"province_name": "مازندران", "name": "عباس آباد", "total_endowments": 115, "has_doc": 67, "no_doc": 48, "takbarg_c": 90, "daftarchei_c": 3}, {"province_name": "مازندران", "name": "قائمشهر", "total_endowments": 888, "has_doc": 297, "no_doc": 591, "takbarg_c": 433, "daftarchei_c": 67}, {"province_name": "مازندران", "name": "گلوگاه", "total_endowments": 336, "has_doc": 118, "no_doc": 218, "takbarg_c": 233, "daftarchei_c": 18}, {"province_name": "مازندران", "name": "لاریجان", "total_endowments": 978, "has_doc": 240, "no_doc": 738, "takbarg_c": 618, "daftarchei_c": 3}, {"province_name": "مازندران", "name": "محمودآباد", "total_endowments": 364, "has_doc": 111, "no_doc": 253, "takbarg_c": 147, "daftarchei_c": 28}, {"province_name": "مازندران", "name": "میاندرود", "total_endowments": 220, "has_doc": 82, "no_doc": 138, "takbarg_c": 97, "daftarchei_c": 9}, {"province_name": "مازندران", "name": "نکا", "total_endowments": 470, "has_doc": 160, "no_doc": 310, "takbarg_c": 253, "daftarchei_c": 12}, {"province_name": "مازندران", "name": "نور", "total_endowments": 520, "has_doc": 208, "no_doc": 312, "takbarg_c": 315, "daftarchei_c": 14}, {"province_name": "مازندران", "name": "نوشهر", "total_endowments": 1025, "has_doc": 184, "no_doc": 841, "takbarg_c": 286, "daftarchei_c": 1}]

# ضرایب به دست آمده از میانگین داده‌های واقعی
MEAN_HAS_DOC_RATIO = 0.38
STD_HAS_DOC_RATIO = 0.16
MEAN_TAKBARG_RATIO = 0.90

fake = Faker('fa_IR')

def create_connection():
    return sqlite3.connect('oqaf.db')

def create_tables(conn):
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS provinces (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL)')
    
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
    
    for p in PROVINCES:
        p_id = p[0]
        p_name = p[1]
        p_lat = p[2]
        p_lng = p[3]
        
        # تعداد کل موقوفات استان (پیش‌فرض 1000 اگر پیدا نشد)
        total_p_endowments = PROVINCE_TOTALS.get(p_name, 1000)
        
        counties_data = []
        
        if p_name in ['فارس', 'مازندران']:
            real_counties = [c for c in FARS_MAZ_DATA if c['province_name'] == p_name]
            for c in real_counties:
                takbarg_c = c['takbarg_c']
                daftarchei_c = c['daftarchei_c']
                # محاسبه تخمینی رقبات فاقد سند بر اساس تعداد موقوفات فاقد سند در دیتای واقعی
                nosand_c = int(c['no_doc'] * random.uniform(1.5, 3.5)) 
                
                counties_data.append({
                    'name': f"شهرستان {c['name']}",
                    'takbarg_c': takbarg_c,
                    'daftarchei_c': daftarchei_c,
                    'nosand_c': nosand_c
                })
        else:
            # شبیه‌سازی برای سایر استان‌ها
            num_counties = random.randint(5, 12)
            splits = [random.random() for _ in range(num_counties)]
            split_sum = sum(splits)
            
            for i in range(num_counties):
                # تخصیص تعداد موقوفات بر اساس وزن تصادفی (به نسبت مساحت/اهمیت فرضی)
                c_endowments = int(total_p_endowments * (splits[i] / split_sum))
                if c_endowments < 1: c_endowments = 1
                
                # توزیع نرمال برای پیدا کردن درصد اسناد
                has_doc_ratio = random.gauss(MEAN_HAS_DOC_RATIO, STD_HAS_DOC_RATIO)
                has_doc_ratio = max(0.1, min(0.9, has_doc_ratio)) # محدود کردن بین 10 تا 90 درصد
                
                takbarg_ratio = random.gauss(MEAN_TAKBARG_RATIO, 0.1)
                takbarg_ratio = max(0.4, min(1.0, takbarg_ratio))
                
                docs_multiplier = random.uniform(2.0, 8.0) # میانگین سند به ازای هر موقوفه
                
                has_doc_c = int(c_endowments * has_doc_ratio)
                no_doc_c = c_endowments - has_doc_c
                
                total_docs = int(has_doc_c * docs_multiplier)
                takbarg_c = int(total_docs * takbarg_ratio)
                daftarchei_c = total_docs - takbarg_c
                nosand_c = int(no_doc_c * docs_multiplier)
                
                counties_data.append({
                    'name': f"شهرستان {fake.city()}",
                    'takbarg_c': takbarg_c,
                    'daftarchei_c': daftarchei_c,
                    'nosand_c': nosand_c
                })
                
        # ثبت در دیتابیس
        for c_idx, c_data in enumerate(counties_data):
            c_id = county_id + c_idx
            c_lat = p_lat + random.uniform(-0.5, 0.5)
            c_lng = p_lng + random.uniform(-0.5, 0.5)
            
            # تولید اعداد مساحت به صورت نسبی
            takbarg_a = c_data['takbarg_c'] * random.uniform(50, 200)
            daftarchei_a = c_data['daftarchei_c'] * random.uniform(100, 300)
            nosand_a = c_data['nosand_c'] * random.uniform(200, 500)
            
            cursor.execute('''INSERT INTO counties VALUES (?,?,?,?,?,?,?,?,?,?,?)''', 
                           (c_id, p_id, c_data['name'], c_lat, c_lng,
                            c_data['takbarg_c'], takbarg_a,
                            c_data['daftarchei_c'], daftarchei_a,
                            c_data['nosand_c'], nosand_a))
            
            # تولید دیتاهای دمو برای کلیک روی شهرستان (Drill-down)
            # فقط بین 5 تا 15 موقوفه فیک ساخته می‌شود که دیتابیس سنگین نشود
            sample_size = random.randint(5, 15)
            
            for _ in range(sample_size):
                doc_status = random.choices(["تک برگ", "دفترچه ای", "فاقد سند"], weights=[0.5, 0.3, 0.2])[0]
                e_lat = c_lat + random.uniform(-0.02, 0.02)
                e_lng = c_lng + random.uniform(-0.02, 0.02)
                
                cursor.execute('''INSERT INTO endowments (county_id, name, raqabat_count, type, intent, total_income, lat, lng, document_status)
                                  VALUES (?,?,?,?,?,?,?,?,?)''',
                               (c_id, f"موقوفه {fake.last_name()}", 0, random.choice(["متصرفی", "غیرمتصرفی"]), 
                                "اطعام و عزاداری", 0, e_lat, e_lng, doc_status))
                
                eid = cursor.lastrowid
                
                props = []
                prop_count = random.randint(2, 10)
                total_inc = 0
                
                for _ in range(prop_count):
                    p_status = random.choice(["عدم شناسایی متصرف", "مذاکره", "دعوای حقوقی", "دارای اجاره نامه معتبر", "اجاره نامه منقضی شده"])
                    d_status = random.choice(["تک برگ", "دفترچه ای", "فاقد سند"])
                    
                    lease_amnt = 0
                    exp_date = '-'
                    if p_status == "دارای اجاره نامه معتبر":
                        lease_amnt = random.randint(10000000, 100000000)
                        exp_date = "1404/12/29"
                    
                    total_inc += lease_amnt
                    
                    props.append((eid, f"رقبه {fake.word()}", "تجاری/مسکونی", "فعال", fake.name(), 
                                  p_status, exp_date, lease_amnt, p_status, d_status, random.randint(100, 5000)))
                
                cursor.executemany('''INSERT INTO properties (endowment_id, title, land_use, status, user, lease_status, expiry_date, lease_amount, property_status, document_status, area) 
                                      VALUES (?,?,?,?,?,?,?,?,?,?,?)''', props)
                
                cursor.execute('UPDATE endowments SET raqabat_count=?, total_income=? WHERE id=?', (prop_count, total_inc, eid))

        county_id += 50
    conn.commit()

if __name__ == '__main__':
    if os.path.exists('oqaf.db'): os.remove('oqaf.db')
    conn = create_connection()
    create_tables(conn)
    generate_mock_data(conn)
    conn.close()
    print("Database Generated Successfully with Real and Scaled Data.")