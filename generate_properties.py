import sqlite3
import random
import os

# لیست انواع رقبه متداول در اوقاف
PROPERTY_TYPES = [
    "شش دانگ یک قطعه زمین زراعی", 
    "عرصه مسکونی خانه", 
    "عرصه کشاورزی باغ", 
    "شش دانگ یک باب دکان تجاری", 
    "یک قطعه زمین بایر", 
    "سه دانگ از یک باب حمام قدیمی", 
    "عرصه یک باب کارگاه", 
    "یک باب غرفه در بازار سرپوشیده",
    "آپارتمان مسکونی",
    "یک واحد دامداری صنعتی"
]

# وضعیت اسناد
DOC_STATUSES = ["تک برگ", "دفترچه ای", "فاقد سند", "در دست اقدام ثبتی"]

def generate_properties():
    if not os.path.exists('oqaf.db'):
        print("Error: oqaf.db not found. Please generate the database first.")
        return

    conn = sqlite3.connect('oqaf.db')
    cursor = conn.cursor()

    # 1. اضافه کردن ستون‌های جدید به جدول در صورت عدم وجود
    try:
        cursor.execute("ALTER TABLE properties ADD COLUMN property_code TEXT")
        cursor.execute("ALTER TABLE properties ADD COLUMN estimated_value REAL")
    except sqlite3.OperationalError:
        # اگر ستون‌ها از قبل وجود داشته باشند، خطای OperationalError می‌دهد که از آن می‌گذریم
        pass

    # 2. پاک کردن رقبات قبلی برای تولید داده‌های تمیز و جدید
    print("Clearing old properties...")
    cursor.execute("DELETE FROM properties")

    # 3. دریافت لیست تمام موقوفات
    cursor.execute("SELECT id FROM endowments")
    endowments = cursor.fetchall()
    
    properties_data = []
    
    print(f"Generating new properties for {len(endowments)} endowments...")

    # 4. تولید رقبه برای هر موقوفه
    for (e_id,) in endowments:
        # برای هر موقوفه بین 1 تا 12 رقبه تولید می‌شود
        num_props = random.randint(1, 12) 
        
        for _ in range(num_props):
            p_type = random.choice(PROPERTY_TYPES)
            
            # تولید کد رقبه 14 رقمی استاندارد (شروع با 200)
            p_code = f"200{random.randint(10000000000, 99999999999)}" 
            
            # تولید مساحت تصادفی (بین 50 متر تا 50 هکتار)
            area = random.randint(50, 500000)
            
            # وضعیت سند با وزن‌دهی (احتمال تک برگ بودن بیشتر است)
            doc_status = random.choices(DOC_STATUSES, weights=[0.5, 0.25, 0.15, 0.1])[0]
            
            # ارزش تقریبی تصادفی (بین 500 میلیون تا 100 میلیارد تومان - ذخیره به ریال)
            est_value = random.randint(500, 100000) * 10000000 
            
            # تشخیص کاربری بر اساس نوع رقبه (برای حفظ سازگاری با داشبورد فعلی)
            land_use = "کشاورزی" if "زراعی" in p_type or "باغ" in p_type else "مسکونی" if "مسکونی" in p_type else "تجاری"
            title = f"{p_type} - کد: {p_code}"
            
            # مقادیر پیش‌فرض برای سایر ستون‌های ضروری دیتابیس
            status = "فعال"
            user = f"متصرف {random.randint(100, 999)}"
            lease_status = random.choice(["دارای اجاره نامه معتبر", "اجاره نامه منقضی شده", "عدم شناسایی متصرف"])
            expiry_date = f"140{random.randint(3,6)}/{random.randint(1,12):02d}/{random.randint(1,28):02d}"
            lease_amount = est_value * 0.005 # مبلغ اجاره سالانه تخمینی (نیم درصد ارزش ملک)
            
            properties_data.append((
                e_id, title, land_use, status, user, lease_status, expiry_date, 
                lease_amount, lease_status, doc_status, area, p_code, est_value
            ))
            
        # بروزرسانی تعداد رقبات ثبت شده در جدول موقوفات
        cursor.execute("UPDATE endowments SET raqabat_count = ? WHERE id = ?", (num_props, e_id))

    # 5. درج گروهی (Bulk Insert) در دیتابیس برای بالاترین سرعت ممکن
    print("Inserting properties into database...")
    cursor.executemany('''
        INSERT INTO properties 
        (endowment_id, title, land_use, status, user, lease_status, expiry_date, 
         lease_amount, property_status, document_status, area, property_code, estimated_value) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', properties_data)
    
    conn.commit()
    conn.close()
    print("Successfully generated and saved all properties!")

if __name__ == '__main__':
    generate_properties()