import sqlite3
import random
from faker import Faker

# راه‌اندازی Faker برای داده‌های فارسی
fake = Faker('fa_IR')

# لیست واقعی استان‌ها
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

# شهرستان‌های مازندران (ID استان = 27)
MAZANDARAN_COUNTIES = [
    (100, 'ساری', 36.5630, 53.0601), (101, 'بابل', 36.5393, 52.6787), (102, 'آمل', 36.4673, 52.3507),
    (103, 'قائم‌شهر', 36.4623, 52.8624), (104, 'نوشهر', 36.6508, 51.5054), (105, 'چالوس', 36.6558, 51.4217),
    (106, 'رامسر', 36.9171, 50.6725), (107, 'بهشهر', 36.6917, 53.5532), (108, 'تنکابن', 36.8166, 50.8795)
]

# شهرستان‌های فارس (ID استان = 17)
FARS_COUNTIES = [
    (200, 'شیراز', 29.6100, 52.5311), (201, 'کازرون', 29.6179, 51.6521), (202, 'مرودشت', 29.8735, 52.8028),
    (203, 'جهرم', 28.5000, 53.5500), (204, 'لارستان', 27.6830, 54.3419), (205, 'فسا', 28.9381, 53.6481),
    (206, 'داراب', 28.7519, 54.5444), (207, 'آباده', 31.1610, 52.6510), (208, 'اقلید', 30.8906, 52.6845)
]

# داده‌های تستی دیگر
LEASE_STATUSES = ["دارای اجاره نامه", "فاقد اجاره نامه", "در دست اقدام"]
RAQABEH_TYPES = ["کشاورزی", "تجاری", "مسکونی", "آموزشی", "درمانی", "اداری"]
ENDOWMENT_TYPES = ["متصرفی", "غیرمتصرفی"]
ENDOWMENT_INTENTS = ["اطعام", "آموزش", "درمان", "عزاداری", "عمومی", "حمایت از ایتام"]


def create_connection():
    """ایجاد اتصال به دیتابیس SQLite"""
    try:
        conn = sqlite3.connect('oqaf.db')
        print(f"دیتابیس oqaf.db با موفقیت ایجاد یا باز شد.")
        return conn
    except sqlite3.Error as e:
        print(f"خطا در اتصال به دیتابیس: {e}")
        return None

def create_tables(conn):
    """ایجاد جداول دیتابیس"""
    try:
        cursor = conn.cursor()
        
        # جدول استان‌ها
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS provinces (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL
        );
        ''')
        
        # جدول شهرستان‌ها (شامل آمار اسناد)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS counties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            province_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            s_takbarg_c INTEGER NOT NULL,  -- سند تک برگ (تعداد)
            s_takbarg_a REAL NOT NULL,     -- سند تک برگ (مساحت)
            s_daftarchei_c INTEGER NOT NULL, -- سند دفترچه‌ای (تعداد)
            s_daftarchei_a REAL NOT NULL,    -- سند دفترچه‌ای (مساحت)
            s_nosand_c INTEGER NOT NULL,    -- فاقد سند (تعداد)
            FOREIGN KEY (province_id) REFERENCES provinces (id)
        );
        ''')
        
        # جدول موقوفات
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS endowments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            county_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            raqabat_count INTEGER NOT NULL,
            type TEXT NOT NULL,
            intent TEXT NOT NULL, -- نیت واقف
            total_income REAL NOT NULL,
            lat REAL,  -- <--- ستون جدید
            lng REAL,  -- <--- ستون جدید
            FOREIGN KEY (county_id) REFERENCES counties (id)
        );
        ''')
        
        # جدول رقبات (Properties)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endowment_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            land_use TEXT NOT NULL, -- کاربری
            status TEXT NOT NULL, -- فعال، غیرفعال
            user TEXT, -- متصرف
            lease_status TEXT NOT NULL, -- وضعیت اجاره
            expiry_date TEXT, -- تاریخ انقضا
            lease_amount REAL, -- مبلغ اجاره
            FOREIGN KEY (endowment_id) REFERENCES endowments (id)
        );
        ''')
        
        conn.commit()
        print("جداول با موفقیت ایجاد شدند.")
    except sqlite3.Error as e:
        print(f"خطا در ایجاد جداول: {e}")

def generate_mock_data(conn):
    """تولید و درج داده‌های تستی در جداول"""
    try:
        cursor = conn.cursor()
        
        # --- ۱. درج استان‌ها ---
        cursor.executemany('INSERT INTO provinces (id, name, lat, lng) VALUES (?, ?, ?, ?)', PROVINCES)
        print(f"تعداد {len(PROVINCES)} استان درج شد.")
        
        # --- ۲. درج شهرستان‌ها ---
        county_id_counter = 1000
        endowment_id_counter = 1
        
        for p_id, p_name, _, _ in PROVINCES:
            counties_to_insert = []
            
            # تمرکز ویژه روی مازندران و فارس
            if p_name == 'مازندران':
                for c_id, c_name, c_lat, c_lng in MAZANDARAN_COUNTIES:
                    counties_to_insert.append((c_id, p_id, c_name, c_lat, c_lng))
            elif p_name == 'فارس':
                for c_id, c_name, c_lat, c_lng in FARS_COUNTIES:
                    counties_to_insert.append((c_id, p_id, c_name, c_lat, c_lng))
            else:
                # برای سایر استان‌ها، ۲ شهرستان تستی بساز
                for _ in range(2):
                    county_id_counter += 1
                    counties_to_insert.append((
                        county_id_counter, p_id, fake.city(),
                        float(fake.latitude()), float(fake.longitude()) # <--- مشکل حل شد
                    ))

            # درج شهرستان‌ها در دیتابیس
            for c_id, c_pid, c_name, c_lat, c_lng in counties_to_insert:
                stats = (
                    random.randint(10, 200), random.randint(5000, 50000), # تک برگ
                    random.randint(10, 100), random.randint(2000, 20000), # دفترچه‌ای
                    random.randint(0, 30) # فاقد سند
                )
                cursor.execute(
                    'INSERT INTO counties (id, province_id, name, lat, lng, s_takbarg_c, s_takbarg_a, s_daftarchei_c, s_daftarchei_a, s_nosand_c) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (c_id, c_pid, c_name, c_lat, c_lng) + stats
                )
                
                # --- ۳. درج موقوفات (فقط برای مازندران و فارس) ---
                if p_name in ['مازندران', 'فارس']:
                    num_endowments = random.randint(5, 15)
                    for _ in range(num_endowments):
                        num_raqabat = random.randint(10, 50)
                        total_income = 0
                        
                        current_endowment_id = endowment_id_counter
                        endowment_id_counter += 1
                        
                        # --- ۴. درج رقبات (فقط برای موقوفات مازندران و فارس) ---
                        properties_to_insert = []
                        for _ in range(num_raqabat):
                            lease_status = random.choice(LEASE_STATUSES)
                            lease_amount = 0
                            expiry_date = '-'
                            user = '-'
                            
                            if lease_status == "دارای اجاره نامه":
                                lease_amount = random.randint(100000, 10000000)
                                expiry_date = fake.future_date(end_date="+3y").strftime("%Y/%m/%d")
                                user = fake.name()
                            
                            total_income += lease_amount # درآمد کل موقوفه از جمع اجاره رقبات محاسبه می‌شود
                            
                            properties_to_insert.append((
                                current_endowment_id,
                                f"رقبه {random.randint(100, 999)}",
                                random.choice(RAQABEH_TYPES),
                                random.choice(["فعال", "غیرفعال"]),
                                user,
                                lease_status,
                                expiry_date,
                                lease_amount
                            ))
                        
                        # درج رقبات در دیتابیس
                        cursor.executemany(
                            'INSERT INTO properties (endowment_id, title, land_use, status, user, lease_status, expiry_date, lease_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            properties_to_insert
                        )
                        # ایجاد مختصات تستی برای موقوفه (نزدیک مرکز شهرستان)
                        e_lat = c_lat + random.uniform(-0.05, 0.05)
                        e_lng = c_lng + random.uniform(-0.02, 0.02)
                        
                        # درج موقوفه در دیتابیس
                        cursor.execute(
                            'INSERT INTO endowments (id, county_id, name, raqabat_count, type, intent, total_income, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            (
                                current_endowment_id,
                                c_id,
                                f"موقوفه {fake.last_name()}",
                                num_raqabat,
                                random.choice(ENDOWMENT_TYPES),
                                random.choice(ENDOWMENT_INTENTS),
                                total_income,
                                e_lat, # <--- درج مختصات
                                e_lng  # <--- درج مختصات
                            )
                        )
        
        conn.commit()
        print("داده‌های تستی با موفقیت درج شدند.")

    except sqlite3.Error as e:
        print(f"خطا در درج داده‌های تستی: {e}")

def main():
    # اطمینان از حذف دیتابیس قبلی برای تست تمیز
    import os
    if os.path.exists('oqaf.db'):
        os.remove('oqaf.db')
        print("دیتابیس قبلی (oqaf.db) حذف شد.")
        
    conn = create_connection()
    if conn is not None:
        create_tables(conn)
        generate_mock_data(conn)
        conn.close()
        print("عملیات ساخت دیتابیس و درج داده‌ها با موفقیت پایان یافت.")

if __name__ == '__main__':
    main()