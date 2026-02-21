import sqlite3
import random
import os

# --- مخزن واژگان برای تولید نام‌های واقعی موقوفات ایرانی ---
MALE_TITLES = ["حاج", "کربلایی", "مشهدی", "میرزا", "سید", "آقا", "شیخ", "استاد"]
FEMALE_TITLES = ["حاجیه", "حاجیه خانم", "کربلایی", "بی بی", "سیده", "بانو", "ملا"]

MALE_NAMES = ["علی", "محمد", "حسین", "حسن", "رضا", "مهدی", "عباس", "قاسم", "اکبر", "اصغر", "محمود", "احمد", "ابراهیم", "اسماعیل", "خلیل", "باقر", "صادق", "تقی", "نقی", "عنایت", "هدایت", "هاشم"]
FEMALE_NAMES = ["فاطمه", "زهرا", "زینب", "خدیجه", "رقیه", "سکینه", "مریم", "سلطان", "ماه خانم", "بیگم", "شهربانو", "گلنار", "نوابه", "تاج الملوک"]

LAST_NAMES = ["شیرازی", "تهرانی", "اصفهانی", "خراسانی", "نجفی", "کاشانی", "تبریزی", "حسینی", "موسوی", "رضوی", "هاشمی", "فراهانی", "قزوینی", "بزاز", "عطار", "تاجر", "زرگر"]

PROPERTY_TYPES = [
    "شش دانگ یک قطعه زمین زراعی", 
    "عرصه مسکونی خانه", 
    "عرصه کشاورزی باغ", 
    "شش دانگ یک باب دکان تجاری", 
    "یک قطعه زمین بایر", 
    "سه دانگ از یک باب حمام قدیمی", 
    "عرصه یک باب کارگاه", 
    "یک باب دامداری",
    "آپارتمان مسکونی",
    "مغازه در بازار سرپوشیده"
]

PROPERTY_STATUSES = ["دارای اجاره نامه معتبر", "اجاره نامه منقضی شده", "مذاکره", "دعوای حقوقی", "عدم شناسایی متصرف", "در حال تجدید بنا"]
DOC_STATUSES = ["تک برگ", "دفترچه ای", "فاقد سند", "در دست اقدام"]
INTENTS = ["اطعام و عزاداری سیدالشهدا", "کمک به فقرا و ایتام", "هزینه های مسجد", "خیرات و مبرات مطلقه", "دارالایتام", "کمک به زوار امام رضا (ع)", "ترویج قرآن", "تامین آب شرب"]

def generate_endowment_name():
    """تولید یک نام موقوفه کاملا واقع‌گرایانه ایرانی"""
    gender = random.choice(['male', 'female', 'place'])
    
    if gender == 'male':
        title = random.choice(MALE_TITLES)
        name = random.choice(MALE_NAMES)
        last = random.choice(LAST_NAMES)
        if random.random() > 0.5:
            return f"موقوفه {title} {name} {last}"
        else:
            return f"موقوفه {title} {name}"
            
    elif gender == 'female':
        title = random.choice(FEMALE_TITLES)
        name = random.choice(FEMALE_NAMES)
        if random.random() > 0.7:
            return f"موقوفه {title} {name} بیگم"
        elif random.random() > 0.4:
            return f"موقوفه {title} {name} جان"
        else:
            return f"موقوفه {title} {name}"
            
    else: # مکان‌ها
        return f"موقوفه مسجد {random.choice(['جامع', 'اعظم', 'صفا', 'بازار', 'محله پایین'])}"

def populate_detailed_data():
    if not os.path.exists('oqaf.db'):
        print("Error: oqaf.db not found. Run generate_db.py first.")
        return

    conn = sqlite3.connect('oqaf.db')
    cursor = conn.cursor()

    # پاک کردن داده‌های قبلی موقوفات و رقبات برای جایگزینی با داده‌های واقعی‌تر
    print("Clearing old endowments and properties...")
    cursor.execute('DELETE FROM properties')
    cursor.execute('DELETE FROM endowments')
    
    # گرفتن لیست تمام شهرستان‌ها
    cursor.execute('SELECT id, lat, lng, s_takbarg_c, s_daftarchei_c, s_nosand_c FROM counties')
    counties = cursor.fetchall()
    
    endowments_data = []
    properties_data = []
    
    print(f"Generating realistic records for {len(counties)} counties...")
    
    endowment_id_counter = 1
    
    for county in counties:
        c_id, c_lat, c_lng, takbarg_c, daftarchei_c, nosand_c = county
        
        # برای اینکه دیتابیس صدها مگابایت نشود، یک نمونه متناسب (بین 10 تا 40 موقوفه) برای هر شهرستان می‌سازیم
        # این تعداد برای نمایش در داشبورد و Drill-down کاملاً کافی و جذاب است
        total_real = takbarg_c + daftarchei_c + nosand_c
        sample_size = min(40, max(10, total_real // 20))
        
        for _ in range(sample_size):
            e_name = generate_endowment_name()
            # تولید مختصات حول مرکز شهرستان
            e_lat = c_lat + random.uniform(-0.03, 0.03)
            e_lng = c_lng + random.uniform(-0.03, 0.03)
            e_intent = random.choice(INTENTS)
            e_type = random.choices(["متصرفی", "غیرمتصرفی", "اشتراک التولیه"], weights=[0.7, 0.25, 0.05])[0]
            e_doc = random.choices(["تک برگ", "دفترچه ای", "فاقد سند"], weights=[0.5, 0.3, 0.2])[0]
            
            # تعداد رقبات این موقوفه
            prop_count = random.randint(1, 15)
            
            # ثبت موقوفه در لیست
            endowments_data.append((
                endowment_id_counter, c_id, e_name, prop_count, e_type, e_intent, 0, e_lat, e_lng, e_doc
            ))
            
            total_income = 0
            
            # تولید رقبات برای این موقوفه
            for p_index in range(prop_count):
                p_type = random.choice(PROPERTY_TYPES)
                
                # کد رقبه فرضی (مثل 20015206100132)
                p_code = f"200{random.randint(10000, 99999)}{random.randint(1000, 9999)}"
                
                p_status = random.choice(PROPERTY_STATUSES)
                d_status = random.choice(DOC_STATUSES)
                area = random.randint(50, 20000)
                
                lease_amnt = 0
                exp_date = '-'
                
                if p_status == "دارای اجاره نامه معتبر":
                    lease_amnt = random.randint(10, 500) * 1000000 # بین 10 تا 500 میلیون تومان
                    exp_date = f"140{random.randint(3,5)}/{random.randint(1,12):02d}/{random.randint(1,28):02d}"
                
                total_income += lease_amnt
                
                land_use = "کشاورزی" if "زراعی" in p_type or "باغ" in p_type else "مسکونی" if "مسکونی" in p_type else "تجاری"
                
                properties_data.append((
                    endowment_id_counter, f"{p_type} - کد: {p_code}", land_use, 
                    "فعال", f"متصرف {random.randint(100,999)}", p_status, 
                    exp_date, lease_amnt, p_status, d_status, area
                ))
            
            # آپدیت درآمد موقوفه (اندیس 6 در تاپل ماست، برای سادگی در دیتابیس آپدیت می‌کنیم)
            endowments_data[-1] = (
                endowment_id_counter, c_id, e_name, prop_count, e_type, e_intent, total_income, e_lat, e_lng, e_doc
            )
            
            endowment_id_counter += 1

    # درج گروهی اطلاعات برای سرعت فوق‌العاده بالا
    print(f"Inserting {len(endowments_data)} endowments...")
    cursor.executemany('''INSERT INTO endowments (id, county_id, name, raqabat_count, type, intent, total_income, lat, lng, document_status)
                          VALUES (?,?,?,?,?,?,?,?,?,?)''', endowments_data)
                          
    print(f"Inserting {len(properties_data)} properties...")
    cursor.executemany('''INSERT INTO properties (endowment_id, title, land_use, status, user, lease_status, expiry_date, lease_amount, property_status, document_status, area) 
                          VALUES (?,?,?,?,?,?,?,?,?,?,?)''', properties_data)

    conn.commit()
    conn.close()
    print("Successfully populated realistic endowments and properties!")

if __name__ == '__main__':
    populate_detailed_data()