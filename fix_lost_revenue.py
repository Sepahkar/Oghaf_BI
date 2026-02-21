import sqlite3
import random
import os

def fix_database():
    if not os.path.exists('oqaf.db'):
        print("Database not found!")
        return

    conn = sqlite3.connect('oqaf.db')
    cursor = conn.cursor()

    # 1. اضافه کردن ستون درآمد از دست‌رفته به جداول
    try:
        cursor.execute("ALTER TABLE counties ADD COLUMN lost_revenue REAL")
    except sqlite3.OperationalError:
        pass # اگر ستون از قبل بود خطایی ندهد
        
    try:
        cursor.execute("ALTER TABLE provinces ADD COLUMN lost_revenue REAL")
    except sqlite3.OperationalError:
        pass

    print("Calculating and saving static lost revenues for counties...")
    
    # 2. محاسبه و ذخیره برای شهرستان‌ها
    cursor.execute("SELECT id, s_nosand_c FROM counties")
    counties = cursor.fetchall()
    
    for c_id, nosand_c in counties:
        # محاسبه با همان ضریب 13 تا 17 میلیون تومان برای هر رقبه فاقد سند
        static_lost_rev = nosand_c * random.randint(130000000, 170000000)
        cursor.execute("UPDATE counties SET lost_revenue = ? WHERE id = ?", (static_lost_rev, c_id))

    print("Aggregating static lost revenues for provinces...")
    
    # 3. محاسبه درآمد استان‌ها دقیقاً برابر با جمع شهرستان‌هایشان
    cursor.execute("SELECT id FROM provinces")
    provinces = cursor.fetchall()
    
    for (p_id,) in provinces:
        cursor.execute("SELECT SUM(lost_revenue) FROM counties WHERE province_id = ?", (p_id,))
        total_p_lost_rev = cursor.fetchone()[0] or 0
        
        cursor.execute("UPDATE provinces SET lost_revenue = ? WHERE id = ?", (total_p_lost_rev, p_id))

    conn.commit()
    conn.close()
    print("Database updated successfully! All numbers are now static and mathematically consistent.")

if __name__ == '__main__':
    fix_database()