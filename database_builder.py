import sqlite3
import random
import os
import time
import numpy as np

# قفل کردن کامل رندوم‌ها برای اینکه داده‌ها ثابت بمانند
np.random.seed(42)
random.seed(42)

# ==============================================================================
# 1. Base Data & Constants 
# ==============================================================================
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

PROVINCE_TOTALS = {'آذربایجان شرقی': 9733, 'آذربایجان غربی': 7040, 'اردبیل': 3280, 'اصفهان': 17007, 'البرز': 1966, 'ایلام': 835, 'بوشهر': 3257, 'تهران': 10301, 'چهارمحال و بختیاری': 1988, 'خراسان جنوبی': 10635, 'خراسان رضوی': 27571, 'خراسان شمالی': 5975, 'خوزستان': 6364, 'زنجان': 2918, 'سمنان': 5890, 'سیستان و بلوچستان': 5353, 'فارس': 13634, 'قزوین': 2824, 'قم': 2495, 'کردستان': 2602, 'کرمان': 8816, 'کرمانشاه': 2280, 'کهگیلویه و بویراحمد': 1376, 'گلستان': 5973, 'گیلان': 5098, 'لرستان': 3098, 'مازندران': 14975, 'مرکزی': 5935, 'هرمزگان': 7940, 'همدان': 3569, 'یزد': 15052}

BASE_PRICES = {
    'آذربایجان شرقی': {'مسکونی': 18.0, 'تجاری': 45.0, 'اداری': 30.0, 'زراعی': 8.0},
    'آذربایجان غربی': {'مسکونی': 15.0, 'تجاری': 35.0, 'اداری': 25.0, 'زراعی': 8.0},
    'اردبیل': {'مسکونی': 13.0, 'تجاری': 28.0, 'اداری': 20.0, 'زراعی': 7.0},
    'اصفهان': {'مسکونی': 22.0, 'تجاری': 60.0, 'اداری': 45.0, 'زراعی': 7.0},
    'البرز': {'مسکونی': 25.0, 'تجاری': 60.0, 'اداری': 50.0, 'زراعی': 6.0},
    'ایلام': {'مسکونی': 11.0, 'تجاری': 22.0, 'اداری': 16.0, 'زراعی': 5.0},
    'بوشهر': {'مسکونی': 16.0, 'تجاری': 35.0, 'اداری': 25.0, 'زراعی': 6.0},
    'تهران': {'مسکونی': 45.0, 'تجاری': 120.0, 'اداری': 110.0, 'زراعی': 8.0},
    'چهارمحال و بختیاری': {'مسکونی': 12.0, 'تجاری': 25.0, 'اداری': 18.0, 'زراعی': 6.0},
    'خراسان جنوبی': {'مسکونی': 11.0, 'تجاری': 22.0, 'اداری': 16.0, 'زراعی': 5.0},
    'خراسان رضوی': {'مسکونی': 20.0, 'تجاری': 65.0, 'اداری': 40.0, 'زراعی': 6.0},
    'خراسان شمالی': {'مسکونی': 12.0, 'تجاری': 25.0, 'اداری': 18.0, 'زراعی': 5.0},
    'خوزستان': {'مسکونی': 18.0, 'تجاری': 45.0, 'اداری': 30.0, 'زراعی': 10.0},
    'زنجان': {'مسکونی': 13.0, 'تجاری': 28.0, 'اداری': 20.0, 'زراعی': 7.0},
    'سمنان': {'مسکونی': 12.0, 'تجاری': 25.0, 'اداری': 18.0, 'زراعی': 5.0},
    'سیستان و بلوچستان': {'مسکونی': 12.0, 'تجاری': 25.0, 'اداری': 18.0, 'زراعی': 4.0},
    'فارس': {'مسکونی': 20.0, 'تجاری': 60.0, 'اداری': 40.0, 'زراعی': 7.0},
    'قزوین': {'مسکونی': 16.0, 'تجاری': 35.0, 'اداری': 25.0, 'زراعی': 8.0},
    'قم': {'مسکونی': 16.0, 'تجاری': 40.0, 'اداری': 25.0, 'زراعی': 5.0},
    'کردستان': {'مسکونی': 13.0, 'تجاری': 28.0, 'اداری': 20.0, 'زراعی': 6.0},
    'کرمان': {'مسکونی': 15.0, 'تجاری': 35.0, 'اداری': 25.0, 'زراعی': 12.0},
    'کرمانشاه': {'مسکونی': 14.0, 'تجاری': 30.0, 'اداری': 22.0, 'زراعی': 7.0},
    'کهگیلویه و بویراحمد': {'مسکونی': 12.0, 'تجاری': 25.0, 'اداری': 18.0, 'زراعی': 5.0},
    'گلستان': {'مسکونی': 15.0, 'تجاری': 30.0, 'اداری': 22.0, 'زراعی': 12.0},
    'گیلان': {'مسکونی': 17.0, 'تجاری': 40.0, 'اداری': 28.0, 'زراعی': 14.0},
    'لرستان': {'مسکونی': 13.0, 'تجاری': 28.0, 'اداری': 20.0, 'زراعی': 6.0},
    'مازندران': {'مسکونی': 18.0, 'تجاری': 45.0, 'اداری': 30.0, 'زراعی': 15.0},
    'مرکزی': {'مسکونی': 14.0, 'تجاری': 30.0, 'اداری': 22.0, 'زراعی': 6.0},
    'هرمزگان': {'مسکونی': 20.0, 'تجاری': 50.0, 'اداری': 35.0, 'زراعی': 6.0},
    'همدان': {'مسکونی': 14.0, 'تجاری': 30.0, 'اداری': 22.0, 'زراعی': 7.0},
    'یزد': {'مسکونی': 14.0, 'تجاری': 30.0, 'اداری': 22.0, 'زراعی': 8.0}
}

COUNTY_MULTIPLIERS = {
    'آذربایجان شرقی': [('تبریز', 1.0, 0.4), ('مراغه', 0.8, 0.15), ('مرند', 0.75, 0.15), ('میانه', 0.7, 0.1), ('اهر', 0.7, 0.1), ('سایر', 0.6, 0.1)],
    'آذربایجان غربی': [('ارومیه', 1.0, 0.35), ('خوی', 0.8, 0.15), ('مهاباد', 0.75, 0.15), ('بوکان', 0.7, 0.1), ('میاندوآب', 0.7, 0.1), ('سایر', 0.6, 0.15)],
    'اردبیل': [('اردبیل', 1.0, 0.45), ('پارس آباد', 0.8, 0.2), ('مشگین شهر', 0.7, 0.15), ('خلخال', 0.65, 0.1), ('سایر', 0.6, 0.1)],
    'اصفهان': [('اصفهان', 1.0, 0.4), ('کاشان', 0.85, 0.15), ('خمینی شهر', 0.8, 0.1), ('نجف آباد', 0.8, 0.1), ('شاهین شهر', 0.75, 0.05), ('شهرضا', 0.7, 0.05), ('گلپایگان', 0.65, 0.05), ('سایر', 0.6, 0.1)],
    'البرز': [('کرج', 1.0, 0.55), ('فردیس', 0.85, 0.2), ('ساوجبلاغ', 0.7, 0.1), ('نظرآباد', 0.65, 0.05), ('سایر', 0.6, 0.1)],
    'ایلام': [('ایلام', 1.0, 0.5), ('مهران', 0.8, 0.15), ('دهلران', 0.7, 0.15), ('ایوان', 0.65, 0.1), ('سایر', 0.6, 0.1)],
    'بوشهر': [('بوشهر', 1.0, 0.3), ('عسلویه', 1.2, 0.2), ('برازجان', 0.7, 0.15), ('گناوه', 0.8, 0.15), ('کنگان', 0.8, 0.1), ('سایر', 0.6, 0.1)],
    'تهران': [('تهران', 1.0, 0.5), ('شمیرانات', 1.3, 0.1), ('ری', 0.75, 0.1), ('اسلامشهر', 0.7, 0.1), ('شهریار', 0.7, 0.1), ('پاکدشت', 0.65, 0.05), ('سایر', 0.6, 0.05)],
    'چهارمحال و بختیاری': [('شهرکرد', 1.0, 0.4), ('بروجن', 0.8, 0.2), ('لردگان', 0.7, 0.15), ('فارسان', 0.65, 0.1), ('سایر', 0.6, 0.15)],
    'خراسان جنوبی': [('بیرجند', 1.0, 0.45), ('طبس', 0.7, 0.2), ('قائن', 0.65, 0.15), ('فردوس', 0.6, 0.1), ('سایر', 0.55, 0.1)],
    'خراسان رضوی': [('مشهد', 1.0, 0.5), ('نیشابور', 0.8, 0.15), ('سبزوار', 0.75, 0.1), ('تربت حیدریه', 0.7, 0.05), ('قوچان', 0.65, 0.05), ('سایر', 0.55, 0.15)],
    'خراسان شمالی': [('بجنورد', 1.0, 0.45), ('شیروان', 0.75, 0.2), ('اسفراین', 0.7, 0.15), ('آشخانه', 0.65, 0.1), ('سایر', 0.6, 0.1)],
    'خوزستان': [('اهواز', 1.0, 0.35), ('آبادان', 0.85, 0.15), ('دزفول', 0.8, 0.15), ('ماهشهر', 0.85, 0.1), ('خرمشهر', 0.75, 0.1), ('شوشتر', 0.7, 0.05), ('سایر', 0.6, 0.1)],
    'زنجان': [('زنجان', 1.0, 0.5), ('ابهر', 0.75, 0.2), ('خرمدره', 0.7, 0.15), ('قیدار', 0.65, 0.05), ('سایر', 0.6, 0.1)],
    'سمنان': [('سمنان', 1.0, 0.3), ('شاهرود', 0.85, 0.3), ('گرمسار', 0.8, 0.15), ('دامغان', 0.75, 0.15), ('سایر', 0.6, 0.1)],
    'سیستان و بلوچستان': [('زاهدان', 1.0, 0.35), ('چابهار', 1.1, 0.2), ('زابل', 0.7, 0.15), ('ایرانشهر', 0.65, 0.15), ('خاش', 0.6, 0.05), ('سایر', 0.55, 0.1)],
    'فارس': [('شیراز', 1.0, 0.4), ('مرودشت', 0.8, 0.15), ('جهرم', 0.75, 0.1), ('کازرون', 0.75, 0.1), ('لارستان', 0.7, 0.1), ('فسا', 0.7, 0.05), ('سایر', 0.6, 0.1)],
    'قزوین': [('قزوین', 1.0, 0.45), ('تاکستان', 0.75, 0.2), ('الوند', 0.8, 0.15), ('آبیک', 0.7, 0.1), ('سایر', 0.6, 0.1)],
    'قم': [('قم', 1.0, 1.0)],
    'کردستان': [('سنندج', 1.0, 0.35), ('سقز', 0.8, 0.2), ('مریوان', 0.75, 0.15), ('بانه', 0.85, 0.1), ('قروه', 0.7, 0.1), ('سایر', 0.6, 0.1)],
    'کرمان': [('کرمان', 1.0, 0.35), ('سیرجان', 0.85, 0.2), ('رفسنجان', 0.8, 0.15), ('جیرفت', 0.7, 0.1), ('بم', 0.65, 0.1), ('سایر', 0.6, 0.1)],
    'کرمانشاه': [('کرمانشاه', 1.0, 0.45), ('اسلام آباد غرب', 0.7, 0.15), ('جوانرود', 0.65, 0.15), ('کنگاور', 0.65, 0.1), ('سایر', 0.6, 0.15)],
    'کهگیلویه و بویراحمد': [('یاسوج', 1.0, 0.45), ('گچساران', 0.85, 0.25), ('دهدشت', 0.7, 0.15), ('سایر', 0.6, 0.15)],
    'گلستان': [('گرگان', 1.0, 0.4), ('گنبد کاووس', 0.8, 0.2), ('علی آباد کتول', 0.7, 0.15), ('بندر ترکمن', 0.7, 0.1), ('سایر', 0.6, 0.15)],
    'گیلان': [('رشت', 1.0, 0.35), ('بندرانزلی', 1.1, 0.15), ('لاهیجان', 1.0, 0.15), ('لنگرود', 0.8, 0.1), ('تالش', 0.75, 0.1), ('سایر', 0.7, 0.15)],
    'لرستان': [('خرم آباد', 1.0, 0.4), ('بروجرد', 0.85, 0.2), ('دورود', 0.75, 0.15), ('الیگودرز', 0.7, 0.1), ('کوهدشت', 0.65, 0.05), ('سایر', 0.6, 0.1)],
    'مازندران': [('ساری', 1.0, 0.25), ('بابل', 0.95, 0.15), ('آمل', 0.9, 0.15), ('قائم‌شهر', 0.85, 0.1), ('چالوس', 1.0, 0.1), ('تنکابن', 0.9, 0.1), ('سایر', 0.75, 0.15)],
    'مرکزی': [('اراک', 1.0, 0.4), ('ساوه', 0.85, 0.25), ('خمین', 0.7, 0.15), ('محلات', 0.75, 0.1), ('سایر', 0.6, 0.1)],
    'هرمزگان': [('بندرعباس', 1.0, 0.4), ('کیش', 1.3, 0.15), ('قشم', 1.1, 0.15), ('میناب', 0.7, 0.1), ('لنگه', 0.75, 0.1), ('سایر', 0.6, 0.1)],
    'همدان': [('همدان', 1.0, 0.45), ('ملایر', 0.8, 0.2), ('نهاوند', 0.75, 0.15), ('تویسرکان', 0.7, 0.1), ('سایر', 0.6, 0.1)],
    'یزد': [('یزد', 1.0, 0.45), ('میبد', 0.8, 0.15), ('اردکان', 0.8, 0.15), ('بافق', 0.75, 0.1), ('مهریز', 0.7, 0.05), ('سایر', 0.6, 0.1)]
}

REAL_COUNTY_COORDS = {
    'تبریز': (38.066, 46.299), 'مراغه': (37.392, 46.235), 'مرند': (38.432, 45.774), 'میانه': (37.416, 47.713), 'اهر': (38.476, 47.069),
    'ارومیه': (37.552, 45.076), 'خوی': (38.550, 44.958), 'مهاباد': (36.764, 45.722), 'بوکان': (36.520, 46.208), 'میاندوآب': (36.969, 46.103),
    'اردبیل': (38.251, 48.297), 'پارس آباد': (39.648, 47.918), 'مشگین شهر': (38.398, 47.681), 'خلخال': (37.618, 48.525),
    'اصفهان': (32.653, 51.667), 'کاشان': (33.985, 51.436), 'خمینی شهر': (32.686, 51.536), 'نجف آباد': (32.636, 51.366), 'شاهین شهر': (32.862, 51.558), 'شهرضا': (32.007, 51.868), 'گلپایگان': (33.454, 50.287),
    'کرج': (35.832, 50.938), 'فردیس': (35.731, 50.988), 'ساوجبلاغ': (35.955, 50.814), 'نظرآباد': (35.952, 50.606),
    'ایلام': (33.635, 46.417), 'مهران': (33.117, 46.166), 'دهلران': (32.693, 47.267), 'ایوان': (33.826, 46.311),
    'بوشهر': (28.923, 50.833), 'عسلویه': (27.476, 52.608), 'برازجان': (29.266, 51.215), 'گناوه': (29.579, 50.517), 'کنگان': (27.833, 52.062),
    'تهران': (35.689, 51.389), 'شمیرانات': (35.807, 51.428), 'ری': (35.590, 51.442), 'اسلامشهر': (35.551, 51.234), 'شهریار': (35.659, 51.059), 'پاکدشت': (35.476, 51.683),
    'شهرکرد': (32.325, 50.864), 'بروجن': (31.966, 51.255), 'لردگان': (31.509, 50.828), 'فارسان': (32.257, 50.563),
    'بیرجند': (32.866, 59.215), 'طبس': (33.595, 56.924), 'قائن': (33.726, 59.184), 'فردوس': (34.018, 58.173),
    'مشهد': (36.297, 59.606), 'نیشابور': (36.213, 58.795), 'سبزوار': (36.212, 57.681), 'تربت حیدریه': (35.273, 59.219), 'قوچان': (37.106, 58.495),
    'بجنورد': (37.474, 57.329), 'شیروان': (37.396, 57.929), 'اسفراین': (37.076, 57.510), 'آشخانه': (37.561, 56.920),
    'اهواز': (31.318, 48.670), 'آبادان': (30.339, 48.304), 'دزفول': (32.383, 48.404), 'ماهشهر': (30.558, 49.198), 'خرمشهر': (30.430, 48.183), 'شوشتر': (32.045, 48.856),
    'زنجان': (36.673, 48.478), 'ابهر': (36.146, 49.218), 'خرمدره': (36.196, 49.186), 'قیدار': (36.116, 48.587),
    'سمنان': (35.576, 53.395), 'شاهرود': (35.416, 54.976), 'گرمسار': (35.218, 52.336), 'دامغان': (36.168, 54.348),
    'زاهدان': (29.496, 60.862), 'چابهار': (25.296, 60.641), 'زابل': (31.029, 61.498), 'ایرانشهر': (27.202, 60.684), 'خاش': (28.221, 61.215),
    'شیراز': (29.592, 52.583), 'مرودشت': (29.873, 52.798), 'جهرم': (28.502, 53.560), 'کازرون': (29.619, 51.654), 'لارستان': (27.683, 54.316), 'فسا': (28.938, 53.648), 
    'قزوین': (36.268, 50.003), 'تاکستان': (36.070, 49.696), 'الوند': (36.189, 50.063), 'آبیک': (36.040, 50.534),
    'قم': (34.639, 50.875),
    'سنندج': (35.311, 46.996), 'سقز': (36.249, 46.273), 'مریوان': (35.528, 46.176), 'بانه': (35.997, 45.885), 'قروه': (35.166, 47.804),
    'کرمان': (30.283, 57.078), 'سیرجان': (29.453, 55.681), 'رفسنجان': (30.406, 55.999), 'جیرفت': (28.675, 57.741), 'بم': (29.106, 58.357),
    'کرمانشاه': (34.314, 47.065), 'اسلام آباد غرب': (34.109, 46.527), 'جوانرود': (34.796, 46.491), 'کنگاور': (34.502, 47.965),
    'یاسوج': (30.668, 51.587), 'گچساران': (30.358, 50.798), 'دهدشت': (30.795, 50.562),
    'گرگان': (36.845, 54.439), 'گنبد کاووس': (37.250, 55.167), 'علی آباد کتول': (36.907, 54.887), 'بندر ترکمن': (36.898, 54.072),
    'رشت': (37.280, 49.583), 'بندرانزلی': (37.474, 49.461), 'لاهیجان': (37.202, 50.004), 'لنگرود': (37.197, 50.153), 'تالش': (37.799, 48.904),
    'خرم آباد': (33.487, 48.355), 'بروجرد': (33.897, 48.751), 'دورود': (33.493, 49.075), 'الیگودرز': (33.400, 49.694), 'کوهدشت': (33.533, 47.606),
    'ساری': (36.563, 53.060), 'بابل': (36.551, 52.678), 'آمل': (36.469, 52.350), 'قائم‌شهر': (36.463, 52.861), 'چالوس': (36.655, 51.420), 'تنکابن': (36.815, 50.876), 
    'اراک': (34.095, 49.690), 'ساوه': (35.021, 50.356), 'خمین': (33.640, 50.078), 'محلات': (33.905, 50.457),
    'بندرعباس': (27.183, 56.266), 'کیش': (26.533, 53.978), 'قشم': (26.960, 56.271), 'میناب': (27.146, 57.080), 'لنگه': (26.557, 54.880),
    'همدان': (34.798, 48.514), 'ملایر': (34.295, 48.823), 'نهاوند': (34.188, 48.376), 'تویسرکان': (34.548, 48.446),
    'یزد': (31.897, 54.367), 'میبد': (32.234, 54.018), 'اردکان': (32.311, 53.998), 'بافق': (31.604, 55.402), 'مهریز': (31.583, 54.439)
}

COUNTY_STATS= {
    "آذربایجان شرقی": {
        "تبریز": {"total_endowments": 3896, "endowments_has_doc": 3428, "endowments_no_doc": 468, "total_properties": 35042, "properties_has_doc": 30441, "properties_no_doc": 4601},
        "مراغه": {"total_endowments": 1459, "endowments_has_doc": 600, "endowments_no_doc": 859, "total_properties": 13139, "properties_has_doc": 4701, "properties_no_doc": 8438},
        "مرند": {"total_endowments": 1459, "endowments_has_doc": 601, "endowments_no_doc": 858, "total_properties": 13139, "properties_has_doc": 4704, "properties_no_doc": 8435},
        "میانه": {"total_endowments": 973, "endowments_has_doc": 401, "endowments_no_doc": 572, "total_properties": 8759, "properties_has_doc": 3136, "properties_no_doc": 5623},
        "اهر": {"total_endowments": 973, "endowments_has_doc": 401, "endowments_no_doc": 572, "total_properties": 8759, "properties_has_doc": 3136, "properties_no_doc": 5623},
        "سایر": {"total_endowments": 973, "endowments_has_doc": 401, "endowments_no_doc": 572, "total_properties": 8759, "properties_has_doc": 3136, "properties_no_doc": 5623}
    },
    "آذربایجان غربی": {
        "ارومیه": {"total_endowments": 2464, "endowments_has_doc": 2066, "endowments_no_doc": 398, "total_properties": 12320, "properties_has_doc": 10045, "properties_no_doc": 2275},
        "خوی": {"total_endowments": 1056, "endowments_has_doc": 265, "endowments_no_doc": 791, "total_properties": 5280, "properties_has_doc": 757, "properties_no_doc": 4523},
        "مهاباد": {"total_endowments": 1056, "endowments_has_doc": 266, "endowments_no_doc": 790, "total_properties": 5280, "properties_has_doc": 759, "properties_no_doc": 4521},
        "بوکان": {"total_endowments": 704, "endowments_has_doc": 178, "endowments_no_doc": 526, "total_properties": 3520, "properties_has_doc": 506, "properties_no_doc": 3014},
        "میاندوآب": {"total_endowments": 704, "endowments_has_doc": 178, "endowments_no_doc": 526, "total_properties": 3520, "properties_has_doc": 506, "properties_no_doc": 3014},
        "سایر": {"total_endowments": 1056, "endowments_has_doc": 297, "endowments_no_doc": 759, "total_properties": 5280, "properties_has_doc": 936, "properties_no_doc": 4344}
    },
    "اردبیل": {
        "اردبیل": {"total_endowments": 1476, "endowments_has_doc": 1268, "endowments_no_doc": 208, "total_properties": 5904, "properties_has_doc": 4880, "properties_no_doc": 1024},
        "پارس آباد": {"total_endowments": 656, "endowments_has_doc": 161, "endowments_no_doc": 495, "total_properties": 2624, "properties_has_doc": 175, "properties_no_doc": 2449},
        "مشگین شهر": {"total_endowments": 492, "endowments_has_doc": 121, "endowments_no_doc": 371, "total_properties": 1968, "properties_has_doc": 132, "properties_no_doc": 1836},
        "خلخال": {"total_endowments": 328, "endowments_has_doc": 81, "endowments_no_doc": 247, "total_properties": 1312, "properties_has_doc": 88, "properties_no_doc": 1224},
        "سایر": {"total_endowments": 328, "endowments_has_doc": 107, "endowments_no_doc": 221, "total_properties": 1312, "properties_has_doc": 261, "properties_no_doc": 1051}
    },
    "اصفهان": {
        "اصفهان": {"total_endowments": 6802, "endowments_has_doc": 6021, "endowments_no_doc": 781, "total_properties": 81633, "properties_has_doc": 69584, "properties_no_doc": 12049},
        "کاشان": {"total_endowments": 2551, "endowments_has_doc": 1118, "endowments_no_doc": 1433, "total_properties": 30612, "properties_has_doc": 8513, "properties_no_doc": 22099},
        "نجف آباد": {"total_endowments": 1700, "endowments_has_doc": 745, "endowments_no_doc": 955, "total_properties": 20408, "properties_has_doc": 5675, "properties_no_doc": 14733},
        "خمینی شهر": {"total_endowments": 1700, "endowments_has_doc": 745, "endowments_no_doc": 955, "total_properties": 20408, "properties_has_doc": 5675, "properties_no_doc": 14733},
        "شهرضا": {"total_endowments": 1700, "endowments_has_doc": 745, "endowments_no_doc": 955, "total_properties": 20408, "properties_has_doc": 5676, "properties_no_doc": 14732},
        "سایر": {"total_endowments": 2554, "endowments_has_doc": 1124, "endowments_no_doc": 1430, "total_properties": 30615, "properties_has_doc": 8516, "properties_no_doc": 22099}
    },
    "البرز": {
        "کرج": {"total_endowments": 983, "endowments_has_doc": 883, "endowments_no_doc": 100, "total_properties": 10813, "properties_has_doc": 9124, "properties_no_doc": 1689},
        "ساوجبلاغ": {"total_endowments": 393, "endowments_has_doc": 167, "endowments_no_doc": 226, "total_properties": 4325, "properties_has_doc": 494, "properties_no_doc": 3831},
        "نظرآباد": {"total_endowments": 294, "endowments_has_doc": 124, "endowments_no_doc": 170, "total_properties": 3243, "properties_has_doc": 370, "properties_no_doc": 2873},
        "سایر": {"total_endowments": 296, "endowments_has_doc": 126, "endowments_no_doc": 170, "total_properties": 3245, "properties_has_doc": 370, "properties_no_doc": 2875}
    },
    "ایلام": {
        "ایلام": {"total_endowments": 419, "endowments_has_doc": 249, "endowments_no_doc": 170, "total_properties": 5010, "properties_has_doc": 1705, "properties_no_doc": 3305},
        "مهران": {"total_endowments": 125, "endowments_has_doc": 0, "endowments_no_doc": 125, "total_properties": 1503, "properties_has_doc": 0, "properties_no_doc": 1503},
        "دهلران": {"total_endowments": 125, "endowments_has_doc": 0, "endowments_no_doc": 125, "total_properties": 1503, "properties_has_doc": 0, "properties_no_doc": 1503},
        "ایوان": {"total_endowments": 83, "endowments_has_doc": 0, "endowments_no_doc": 83, "total_properties": 1002, "properties_has_doc": 0, "properties_no_doc": 1002},
        "سایر": {"total_endowments": 83, "endowments_has_doc": 0, "endowments_no_doc": 83, "total_properties": 1002, "properties_has_doc": 0, "properties_no_doc": 1002}
    },
    "بوشهر": {
        "بوشهر": {"total_endowments": 1302, "endowments_has_doc": 990, "endowments_no_doc": 312, "total_properties": 5211, "properties_has_doc": 2113, "properties_no_doc": 3098},
        "دشتستان": {"total_endowments": 651, "endowments_has_doc": 0, "endowments_no_doc": 651, "total_properties": 2605, "properties_has_doc": 0, "properties_no_doc": 2605},
        "گناوه": {"total_endowments": 488, "endowments_has_doc": 0, "endowments_no_doc": 488, "total_properties": 1954, "properties_has_doc": 0, "properties_no_doc": 1954},
        "سایر": {"total_endowments": 816, "endowments_has_doc": 0, "endowments_no_doc": 816, "total_properties": 3258, "properties_has_doc": 0, "properties_no_doc": 3258}
    },
    "تهران": {
        "تهران": {"total_endowments": 5150, "endowments_has_doc": 4580, "endowments_no_doc": 570, "total_properties": 51505, "properties_has_doc": 44806, "properties_no_doc": 6699},
        "ری": {"total_endowments": 1545, "endowments_has_doc": 583, "endowments_no_doc": 962, "total_properties": 15451, "properties_has_doc": 4181, "properties_no_doc": 11270},
        "شمیرانات": {"total_endowments": 1030, "endowments_has_doc": 389, "endowments_no_doc": 641, "total_properties": 10301, "properties_has_doc": 2788, "properties_no_doc": 7513},
        "شهریار": {"total_endowments": 1030, "endowments_has_doc": 389, "endowments_no_doc": 641, "total_properties": 10301, "properties_has_doc": 2788, "properties_no_doc": 7513},
        "سایر": {"total_endowments": 1546, "endowments_has_doc": 561, "endowments_no_doc": 985, "total_properties": 15452, "properties_has_doc": 3998, "properties_no_doc": 11454}
    },
    "چهارمحال و بختیاری": {
        "شهرکرد": {"total_endowments": 795, "endowments_has_doc": 581, "endowments_no_doc": 214, "total_properties": 9542, "properties_has_doc": 4759, "properties_no_doc": 4783},
        "بروجن": {"total_endowments": 397, "endowments_has_doc": 0, "endowments_no_doc": 397, "total_properties": 4771, "properties_has_doc": 0, "properties_no_doc": 4771},
        "لردگان": {"total_endowments": 298, "endowments_has_doc": 0, "endowments_no_doc": 298, "total_properties": 3578, "properties_has_doc": 0, "properties_no_doc": 3578},
        "سایر": {"total_endowments": 498, "endowments_has_doc": 0, "endowments_no_doc": 498, "total_properties": 5965, "properties_has_doc": 0, "properties_no_doc": 5965}
    },
    "خراسان جنوبی": {
        "بیرجند": {"total_endowments": 4254, "endowments_has_doc": 3075, "endowments_no_doc": 1179, "total_properties": 21270, "properties_has_doc": 11652, "properties_no_doc": 9618},
        "قائن": {"total_endowments": 2127, "endowments_has_doc": 0, "endowments_no_doc": 2127, "total_properties": 10635, "properties_has_doc": 0, "properties_no_doc": 10635},
        "طبس": {"total_endowments": 1595, "endowments_has_doc": 0, "endowments_no_doc": 1595, "total_properties": 7976, "properties_has_doc": 0, "properties_no_doc": 7976},
        "سایر": {"total_endowments": 2659, "endowments_has_doc": 0, "endowments_no_doc": 2659, "total_properties": 13294, "properties_has_doc": 0, "properties_no_doc": 13294}
    },
    "خراسان رضوی": {
        "مشهد": {"total_endowments": 11028, "endowments_has_doc": 10174, "endowments_no_doc": 854, "total_properties": 99255, "properties_has_doc": 87522, "properties_no_doc": 11733},
        "نیشابور": {"total_endowments": 4135, "endowments_has_doc": 2137, "endowments_no_doc": 1998, "total_properties": 37220, "properties_has_doc": 9811, "properties_no_doc": 27409},
        "سبزوار": {"total_endowments": 2757, "endowments_has_doc": 1425, "endowments_no_doc": 1332, "total_properties": 24813, "properties_has_doc": 6540, "properties_no_doc": 18273},
        "تربت حیدریه": {"total_endowments": 2757, "endowments_has_doc": 1425, "endowments_no_doc": 1332, "total_properties": 24813, "properties_has_doc": 6540, "properties_no_doc": 18273},
        "سایر": {"total_endowments": 6894, "endowments_has_doc": 3509, "endowments_no_doc": 3385, "total_properties": 62038, "properties_has_doc": 15656, "properties_no_doc": 46382}
    },
    "خراسان شمالی": {
        "بجنورد": {"total_endowments": 2390, "endowments_has_doc": 1695, "endowments_no_doc": 695, "total_properties": 14340, "properties_has_doc": 6010, "properties_no_doc": 8330},
        "شیروان": {"total_endowments": 1195, "endowments_has_doc": 0, "endowments_no_doc": 1195, "total_properties": 7170, "properties_has_doc": 0, "properties_no_doc": 7170},
        "اسفراین": {"total_endowments": 896, "endowments_has_doc": 0, "endowments_no_doc": 896, "total_properties": 5377, "properties_has_doc": 0, "properties_no_doc": 5377},
        "سایر": {"total_endowments": 1494, "endowments_has_doc": 0, "endowments_no_doc": 1494, "total_properties": 8963, "properties_has_doc": 0, "properties_no_doc": 8963}
    },
    "خوزستان": {
        "اهواز": {"total_endowments": 2227, "endowments_has_doc": 1896, "endowments_no_doc": 331, "total_properties": 6682, "properties_has_doc": 5464, "properties_no_doc": 1218},
        "دزفول": {"total_endowments": 1272, "endowments_has_doc": 404, "endowments_no_doc": 868, "total_properties": 3818, "properties_has_doc": 620, "properties_no_doc": 3198},
        "آبادان": {"total_endowments": 954, "endowments_has_doc": 303, "endowments_no_doc": 651, "total_properties": 2863, "properties_has_doc": 465, "properties_no_doc": 2398},
        "خرمشهر": {"total_endowments": 636, "endowments_has_doc": 202, "endowments_no_doc": 434, "total_properties": 1909, "properties_has_doc": 310, "properties_no_doc": 1599},
        "سایر": {"total_endowments": 1275, "endowments_has_doc": 405, "endowments_no_doc": 870, "total_properties": 3820, "properties_has_doc": 610, "properties_no_doc": 3210}
    },
    "زنجان": {
        "زنجان": {"total_endowments": 1167, "endowments_has_doc": 986, "endowments_no_doc": 181, "total_properties": 14006, "properties_has_doc": 11283, "properties_no_doc": 2723},
        "ابهر": {"total_endowments": 583, "endowments_has_doc": 135, "endowments_no_doc": 448, "total_properties": 7003, "properties_has_doc": 285, "properties_no_doc": 6718},
        "خرمدره": {"total_endowments": 437, "endowments_has_doc": 101, "endowments_no_doc": 336, "total_properties": 5252, "properties_has_doc": 214, "properties_no_doc": 5038},
        "سایر": {"total_endowments": 731, "endowments_has_doc": 186, "endowments_no_doc": 545, "total_properties": 8755, "properties_has_doc": 580, "properties_no_doc": 8175}
    },
    "سمنان": {
        "سمنان": {"total_endowments": 2061, "endowments_has_doc": 1768, "endowments_no_doc": 293, "total_properties": 10307, "properties_has_doc": 8431, "properties_no_doc": 1876},
        "شاهرود": {"total_endowments": 1472, "endowments_has_doc": 506, "endowments_no_doc": 966, "total_properties": 7362, "properties_has_doc": 469, "properties_no_doc": 6893},
        "دامغان": {"total_endowments": 883, "endowments_has_doc": 303, "endowments_no_doc": 580, "total_properties": 4417, "properties_has_doc": 281, "properties_no_doc": 4136},
        "گرمسار": {"total_endowments": 589, "endowments_has_doc": 202, "endowments_no_doc": 387, "total_properties": 2945, "properties_has_doc": 188, "properties_no_doc": 2757},
        "سایر": {"total_endowments": 885, "endowments_has_doc": 312, "endowments_no_doc": 573, "total_properties": 4419, "properties_has_doc": 327, "properties_no_doc": 4092}
    },
    "سیستان و بلوچستان": {
        "زاهدان": {"total_endowments": 1873, "endowments_has_doc": 1838, "endowments_no_doc": 35, "total_properties": 16861, "properties_has_doc": 7359, "properties_no_doc": 9502},
        "زابل": {"total_endowments": 1070, "endowments_has_doc": 0, "endowments_no_doc": 1070, "total_properties": 9635, "properties_has_doc": 0, "properties_no_doc": 9635},
        "ایرانشهر": {"total_endowments": 802, "endowments_has_doc": 0, "endowments_no_doc": 802, "total_properties": 7226, "properties_has_doc": 0, "properties_no_doc": 7226},
        "چابهار": {"total_endowments": 535, "endowments_has_doc": 0, "endowments_no_doc": 535, "total_properties": 4817, "properties_has_doc": 0, "properties_no_doc": 4817},
        "سایر": {"total_endowments": 1073, "endowments_has_doc": 0, "endowments_no_doc": 1073, "total_properties": 9638, "properties_has_doc": 0, "properties_no_doc": 9638}
    },
    "فارس": {
        "شیراز": {"total_endowments": 5453, "endowments_has_doc": 4767, "endowments_no_doc": 686, "total_properties": 59989, "properties_has_doc": 50541, "properties_no_doc": 9448},
        "مرودشت": {"total_endowments": 2045, "endowments_has_doc": 1109, "endowments_no_doc": 936, "total_properties": 22496, "properties_has_doc": 5183, "properties_no_doc": 17313},
        "کازرون": {"total_endowments": 1363, "endowments_has_doc": 739, "endowments_no_doc": 624, "total_properties": 14997, "properties_has_doc": 3455, "properties_no_doc": 11542},
        "جهرم": {"total_endowments": 1363, "endowments_has_doc": 739, "endowments_no_doc": 624, "total_properties": 14997, "properties_has_doc": 3455, "properties_no_doc": 11542},
        "فسا": {"total_endowments": 1363, "endowments_has_doc": 739, "endowments_no_doc": 624, "total_properties": 14997, "properties_has_doc": 3455, "properties_no_doc": 11542},
        "سایر": {"total_endowments": 2047, "endowments_has_doc": 1097, "endowments_no_doc": 950, "total_properties": 22498, "properties_has_doc": 5170, "properties_no_doc": 17328}
    },
    "قزوین": {
        "قزوین": {"total_endowments": 1129, "endowments_has_doc": 952, "endowments_no_doc": 177, "total_properties": 11296, "properties_has_doc": 9037, "properties_no_doc": 2259},
        "تاکستان": {"total_endowments": 564, "endowments_has_doc": 135, "endowments_no_doc": 429, "total_properties": 5648, "properties_has_doc": 121, "properties_no_doc": 5527},
        "البرز": {"total_endowments": 423, "endowments_has_doc": 101, "endowments_no_doc": 322, "total_properties": 4236, "properties_has_doc": 91, "properties_no_doc": 4145},
        "بوئین زهرا": {"total_endowments": 282, "endowments_has_doc": 67, "endowments_no_doc": 215, "total_properties": 2824, "properties_has_doc": 61, "properties_no_doc": 2763},
        "سایر": {"total_endowments": 426, "endowments_has_doc": 95, "endowments_no_doc": 331, "total_properties": 4236, "properties_has_doc": 117, "properties_no_doc": 4119}
    },
    "قم": {
        "قم": {"total_endowments": 2245, "endowments_has_doc": 1622, "endowments_no_doc": 623, "total_properties": 26946, "properties_has_doc": 14580, "properties_no_doc": 12366},
        "سایر": {"total_endowments": 250, "endowments_has_doc": 0, "endowments_no_doc": 250, "total_properties": 2994, "properties_has_doc": 0, "properties_no_doc": 2994}
    },
    "کردستان": {
        "سنندج": {"total_endowments": 910, "endowments_has_doc": 671, "endowments_no_doc": 239, "total_properties": 6374, "properties_has_doc": 3235, "properties_no_doc": 3139},
        "سقز": {"total_endowments": 520, "endowments_has_doc": 0, "endowments_no_doc": 520, "total_properties": 3642, "properties_has_doc": 0, "properties_no_doc": 3642},
        "مریوان": {"total_endowments": 390, "endowments_has_doc": 0, "endowments_no_doc": 390, "total_properties": 2732, "properties_has_doc": 0, "properties_no_doc": 2732},
        "بانه": {"total_endowments": 260, "endowments_has_doc": 0, "endowments_no_doc": 260, "total_properties": 1821, "properties_has_doc": 0, "properties_no_doc": 1821},
        "سایر": {"total_endowments": 522, "endowments_has_doc": 0, "endowments_no_doc": 522, "total_properties": 3645, "properties_has_doc": 0, "properties_no_doc": 3645}
    },
    "کرمان": {
        "کرمان": {"total_endowments": 3085, "endowments_has_doc": 2598, "endowments_no_doc": 487, "total_properties": 33941, "properties_has_doc": 27202, "properties_no_doc": 6739},
        "سیرجان": {"total_endowments": 1322, "endowments_has_doc": 368, "endowments_no_doc": 954, "total_properties": 14546, "properties_has_doc": 1346, "properties_no_doc": 13200},
        "رفسنجان": {"total_endowments": 1322, "endowments_has_doc": 368, "endowments_no_doc": 954, "total_properties": 14546, "properties_has_doc": 1346, "properties_no_doc": 13200},
        "جیرفت": {"total_endowments": 881, "endowments_has_doc": 245, "endowments_no_doc": 636, "total_properties": 9697, "properties_has_doc": 898, "properties_no_doc": 8799},
        "سایر": {"total_endowments": 2206, "endowments_has_doc": 605, "endowments_no_doc": 1601, "total_properties": 24246, "properties_has_doc": 2213, "properties_no_doc": 22033}
    }
}
PROVINCE_TOTALS = {
    "آذربایجان شرقی": {
        "total_endowments": 9733,
        "endowments_has_doc": 5832,
        "endowments_no_doc": 3901,
        "total_properties": 87597,
        "properties_has_doc": 49254,
        "properties_no_doc": 38343
    },
    "آذربایجان غربی": {
        "total_endowments": 7040,
        "endowments_has_doc": 3250,
        "endowments_no_doc": 3790,
        "total_properties": 35200,
        "properties_has_doc": 13509,
        "properties_no_doc": 21691
    },
    "اردبیل": {
        "total_endowments": 3280,
        "endowments_has_doc": 1738,
        "endowments_no_doc": 1542,
        "total_properties": 13120,
        "properties_has_doc": 5536,
        "properties_no_doc": 7584
    },
    "اصفهان": {
        "total_endowments": 17007,
        "endowments_has_doc": 10498,
        "endowments_no_doc": 6509,
        "total_properties": 204084,
        "properties_has_doc": 103639,
        "properties_no_doc": 100445
    },
    "البرز": {
        "total_endowments": 1966,
        "endowments_has_doc": 1300,
        "endowments_no_doc": 666,
        "total_properties": 21626,
        "properties_has_doc": 10358,
        "properties_no_doc": 11268
    },
    "ایلام": {
        "total_endowments": 835,
        "endowments_has_doc": 249,
        "endowments_no_doc": 586,
        "total_properties": 10020,
        "properties_has_doc": 1705,
        "properties_no_doc": 8315
    },
    "بوشهر": {
        "total_endowments": 3257,
        "endowments_has_doc": 990,
        "endowments_no_doc": 2267,
        "total_properties": 13028,
        "properties_has_doc": 2113,
        "properties_no_doc": 10915
    },
    "تهران": {
        "total_endowments": 10301,
        "endowments_has_doc": 6502,
        "endowments_no_doc": 3799,
        "total_properties": 103010,
        "properties_has_doc": 58561,
        "properties_no_doc": 44449
    },
    "چهارمحال و بختیاری": {
        "total_endowments": 1988,
        "endowments_has_doc": 581,
        "endowments_no_doc": 1407,
        "total_properties": 23856,
        "properties_has_doc": 4759,
        "properties_no_doc": 19097
    },
    "خراسان جنوبی": {
        "total_endowments": 10635,
        "endowments_has_doc": 3075,
        "endowments_no_doc": 7560,
        "total_properties": 53175,
        "properties_has_doc": 11652,
        "properties_no_doc": 41523
    },
    "خراسان رضوی": {
        "total_endowments": 27571,
        "endowments_has_doc": 18670,
        "endowments_no_doc": 8901,
        "total_properties": 248139,
        "properties_has_doc": 126069,
        "properties_no_doc": 122070
    },
    "خراسان شمالی": {
        "total_endowments": 5975,
        "endowments_has_doc": 1695,
        "endowments_no_doc": 4280,
        "total_properties": 35850,
        "properties_has_doc": 6010,
        "properties_no_doc": 29840
    },
    "خوزستان": {
        "total_endowments": 6364,
        "endowments_has_doc": 3210,
        "endowments_no_doc": 3154,
        "total_properties": 19092,
        "properties_has_doc": 7469,
        "properties_no_doc": 11623
    },
    "زنجان": {
        "total_endowments": 2918,
        "endowments_has_doc": 1408,
        "endowments_no_doc": 1510,
        "total_properties": 35016,
        "properties_has_doc": 12362,
        "properties_no_doc": 22654
    },
    "سمنان": {
        "total_endowments": 5890,
        "endowments_has_doc": 3091,
        "endowments_no_doc": 2799,
        "total_properties": 29450,
        "properties_has_doc": 9696,
        "properties_no_doc": 19754
    },
    "سیستان و بلوچستان": {
        "total_endowments": 5353,
        "endowments_has_doc": 1838,
        "endowments_no_doc": 3515,
        "total_properties": 48177,
        "properties_has_doc": 7359,
        "properties_no_doc": 40818
    },
    "فارس": {
        "total_endowments": 13634,
        "endowments_has_doc": 9190,
        "endowments_no_doc": 4444,
        "total_properties": 149974,
        "properties_has_doc": 71259,
        "properties_no_doc": 78715
    },
    "قزوین": {
        "total_endowments": 2824,
        "endowments_has_doc": 1350,
        "endowments_no_doc": 1474,
        "total_properties": 28240,
        "properties_has_doc": 9427,
        "properties_no_doc": 18813
    },
    "قم": {
        "total_endowments": 2495,
        "endowments_has_doc": 1622,
        "endowments_no_doc": 873,
        "total_properties": 29940,
        "properties_has_doc": 14580,
        "properties_no_doc": 15360
    },
    "کردستان": {
        "total_endowments": 2602,
        "endowments_has_doc": 671,
        "endowments_no_doc": 1931,
        "total_properties": 18214,
        "properties_has_doc": 3235,
        "properties_no_doc": 14979
    },
    "کرمان": {
        "total_endowments": 8816,
        "endowments_has_doc": 4184,
        "endowments_no_doc": 4632,
        "total_properties": 96976,
        "properties_has_doc": 33005,
        "properties_no_doc": 63971
    },
    "کرمانشاه": {
        "total_endowments": 2280,
        "endowments_has_doc": 1229,
        "endowments_no_doc": 1051,
        "total_properties": 9120,
        "properties_has_doc": 3415,
        "properties_no_doc": 5705
    },
    "کهگیلویه و بویراحمد": {
        "total_endowments": 1376,
        "endowments_has_doc": 381,
        "endowments_no_doc": 995,
        "total_properties": 6880,
        "properties_has_doc": 1591,
        "properties_no_doc": 5289
    },
    "گلستان": {
        "total_endowments": 5973,
        "endowments_has_doc": 1938,
        "endowments_no_doc": 4035,
        "total_properties": 41811,
        "properties_has_doc": 8764,
        "properties_no_doc": 33047
    },
    "گیلان": {
        "total_endowments": 5098,
        "endowments_has_doc": 1510,
        "endowments_no_doc": 3588,
        "total_properties": 56078,
        "properties_has_doc": 14823,
        "properties_no_doc": 41255
    },
    "لرستان": {
        "total_endowments": 3098,
        "endowments_has_doc": 853,
        "endowments_no_doc": 2245,
        "total_properties": 34078,
        "properties_has_doc": 6568,
        "properties_no_doc": 27510
    },
    "مازندران": {
        "total_endowments": 14975,
        "endowments_has_doc": 3755,
        "endowments_no_doc": 11220,
        "total_properties": 59900,
        "properties_has_doc": 12857,
        "properties_no_doc": 47043
    },
    "مرکزی": {
        "total_endowments": 5935,
        "endowments_has_doc": 2810,
        "endowments_no_doc": 3125,
        "total_properties": 47480,
        "properties_has_doc": 17098,
        "properties_no_doc": 30382
    },
    "هرمزگان": {
        "total_endowments": 7940,
        "endowments_has_doc": 2596,
        "endowments_no_doc": 5344,
        "total_properties": 95280,
        "properties_has_doc": 20554,
        "properties_no_doc": 74726
    },
    "همدان": {
        "total_endowments": 3569,
        "endowments_has_doc": 1905,
        "endowments_no_doc": 1664,
        "total_properties": 17845,
        "properties_has_doc": 5965,
        "properties_no_doc": 11880
    },
    "یزد": {
        "total_endowments": 15052,
        "endowments_has_doc": 9969,
        "endowments_no_doc": 5083,
        "total_properties": 105364,
        "properties_has_doc": 57856,
        "properties_no_doc": 47508
    }
}


MALE_TITLES = ["حاج", "کربلایی", "مشهدی", "سید", "آقا"]
MALE_NAMES = ["علی", "محمد", "حسین", "حسن", "رضا", "مهدی", "عباس"]
LAST_NAMES = ["شیرازی", "تهرانی", "اصفهانی", "خراسانی", "حسینی", "موسوی"]
INTENTS = ["اطعام و عزاداری سیدالشهدا", "کمک به فقرا و ایتام", "هزینه های مسجد", "خیرات مطلقه", "دارالایتام", "ترویج قرآن"]

# تارگت‌های دقیق استان‌های خاص (بر اساس اکسل و صحبت‌ها)
EXACT_TARGETS = {
    'فارس': {'waqfs': 13634, 'waqfs_no_doc': 8155, 'props': 195955, 'props_no_doc': 162924},
    'مازندران': {'waqfs': 14975, 'waqfs_no_doc': 11081, 'props': 224625, 'props_no_doc': 213393} # 74% waqf no doc, 15 props/waqf, 95% props no doc
}
class OghafDatabaseBuilder:
    def __init__(self, db_name='oqaf.db'):
        self.db_name = db_name
        self.conn = None
        self.cursor = None

    def initialize(self):
        if os.path.exists(self.db_name):
            os.remove(self.db_name)
        self.conn = sqlite3.connect(self.db_name)
        self.cursor = self.conn.cursor()

    def build_schema(self):
        self.cursor.executescript('''
            CREATE TABLE IF NOT EXISTS provinces (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL);
            CREATE TABLE IF NOT EXISTS counties (id INTEGER PRIMARY KEY AUTOINCREMENT, province_id INTEGER, name TEXT, lat REAL, lng REAL, multiplier REAL, FOREIGN KEY (province_id) REFERENCES provinces (id));
            CREATE TABLE IF NOT EXISTS endowments (id INTEGER PRIMARY KEY, county_id INTEGER, name TEXT, raqabat_count INTEGER, type TEXT, intent TEXT, total_income REAL, lat REAL, lng REAL, document_status TEXT, FOREIGN KEY (county_id) REFERENCES counties (id));
            CREATE TABLE IF NOT EXISTS properties (id INTEGER PRIMARY KEY, endowment_id INTEGER, title TEXT, property_code TEXT, land_use TEXT, status TEXT, user TEXT, lease_status TEXT, expiry_date TEXT, lease_amount REAL, lost_revenue REAL, property_status TEXT, document_status TEXT, area REAL, FOREIGN KEY (endowment_id) REFERENCES endowments (id));
            CREATE INDEX idx_county_province ON counties(province_id);
            CREATE INDEX idx_endow_county ON endowments(county_id);
            CREATE INDEX idx_prop_endow ON properties(endowment_id);
        ''')
        self.conn.commit()

    def generate_counties(self):
        self.cursor.executemany('INSERT INTO provinces VALUES (?,?,?,?)', PROVINCES)
        county_id = 1
        self.counties_map = {} 
        
        for p in PROVINCES:
            p_id, p_name, p_lat, p_lng = p
            self.counties_map[p_name] = []
            
            if p_name not in COUNTY_STATS:
                continue
                
            county_stats = COUNTY_STATS[p_name]
            
            # استخراج Multiplier های قبلی برای محاسبه درآمد
            old_multipliers = {}
            if p_name in COUNTY_MULTIPLIERS:
                for c_name, mult, _ in COUNTY_MULTIPLIERS[p_name]:
                    old_multipliers[c_name] = mult
            
            for c_name, stats in county_stats.items():
                final_c_name = f"سایر شهرستان‌های {p_name}" if c_name == 'سایر' else c_name
                lat, lng = REAL_COUNTY_COORDS.get(final_c_name, (p_lat + random.uniform(-0.3, 0.3), p_lng + random.uniform(-0.3, 0.3)))
                
                multiplier = old_multipliers.get(c_name, 0.6)
                
                self.cursor.execute('INSERT INTO counties (id, province_id, name, lat, lng, multiplier) VALUES (?,?,?,?,?,?)',
                                    (county_id, p_id, final_c_name, lat, lng, multiplier))
                self.counties_map[p_name].append({
                    'id': county_id, 'name': final_c_name, 'lat': lat, 'lng': lng, 
                    'multiplier': multiplier, 'stats': stats
                })
                county_id += 1
        self.conn.commit()

    def generate_data(self):
        endowments_data = []
        properties_data = []
        endowment_id = 1
        prop_id = 1
        BATCH_SIZE = 50000 
        
        print(f"[*] Starting exact generation based on COUNTY_STATS. Please wait...")
        
        for p in PROVINCES:
            p_name = p[1]
            if p_name not in self.counties_map:
                continue
                
            counties = self.counties_map[p_name]
            
            for c in counties:
                stats = c['stats']
                total_waqfs = stats['total_endowments']
                waqfs_has_doc = stats['endowments_has_doc']
                waqfs_no_doc = stats['endowments_no_doc']
                
                total_props = stats['total_properties']
                props_has_doc = stats['properties_has_doc']
                props_no_doc = stats['properties_no_doc']
                
                if total_waqfs == 0:
                    continue
                
                # ۱. ساخت لیست دقیق وضعیت سند و ترکیب تصادفی آن‌ها
                waqf_docs = ['فاقد سند'] * waqfs_no_doc + ['دارای سند'] * waqfs_has_doc
                prop_docs = ['فاقد سند'] * props_no_doc + ['تک برگ'] * props_has_doc
                random.shuffle(waqf_docs)
                random.shuffle(prop_docs)
                
                # ۲. توزیع تعداد رقبات بین موقوفات (هر موقوفه بین ۱ تا ۱۰۰ رقبه)
                counts = np.ones(total_waqfs, dtype=int)
                remaining_props = total_props - total_waqfs
                
                while remaining_props > 0:
                    # پیدا کردن اندیس موقوفاتی که هنوز به مرز 100 رقبه نرسیده‌اند
                    available = np.where(counts < 100)[0]
                    if len(available) == 0:
                        # اگر همه 100 تا شدند و باز هم رقبه ماند (که در داده های ما پیش نمی آید)، سرریز می کنیم
                        idx = random.randint(0, total_waqfs - 1)
                        counts[idx] += remaining_props
                        break
                    
                    idx = random.choice(available)
                    space = 100 - counts[idx]
                    add = min(remaining_props, random.randint(1, min(10, space)))
                    counts[idx] += add
                    remaining_props -= add
                
                np.random.shuffle(counts)
                props_per_waqf = counts.tolist()
                
                # ۳. تولید رکوردها و تخصیص اسناد
                p_idx_global = 0
                for w_idx in range(total_waqfs):
                    r_count = props_per_waqf[w_idx]
                    w_doc = waqf_docs[w_idx]
                    
                    e_name = f"موقوفه {random.choice(MALE_TITLES)} {random.choice(MALE_NAMES)} {random.choice(LAST_NAMES)}" if random.random() > 0.2 else f"موقوفه مسجد {random.choice(['جامع', 'اعظم', 'بازار'])}"
                    
                    endowments_data.append([
                        endowment_id, c['id'], e_name, r_count, 
                        "متصرفی", random.choice(INTENTS), 0.0, 
                        c['lat'] + random.uniform(-0.02, 0.02), c['lng'] + random.uniform(-0.02, 0.02), w_doc
                    ])
                    
                    total_income = 0
                    
                    for _ in range(r_count):
                        # ایمنی برای جلوگیری از خطای Index (نباید رخ دهد)
                        r_doc = prop_docs[p_idx_global] if p_idx_global < total_props else 'تک برگ'
                        p_idx_global += 1
                        
                        p_type = np.random.choice(['مسکونی', 'تجاری', 'اداری', 'زراعی'], p=[0.4, 0.15, 0.05, 0.4])
                        base_rent_monthly_million = BASE_PRICES[p_name][p_type]
                        
                        if p_type == 'مسکونی': area, std = random.randint(50, 250), 100.0
                        elif p_type == 'تجاری': area, std = random.randint(15, 100), 30.0
                        elif p_type == 'اداری': area, std = random.randint(50, 300), 80.0
                        else: area, std = random.randint(2000, 50000), 10000.0
                            
                        annual_million = ((area / std) * base_rent_monthly_million * c['multiplier']) * 12
                        
                        if r_doc == 'فاقد سند':
                            lost_annual_million = round(annual_million * random.uniform(0.10, 0.15), 2)
                        else:
                            lost_annual_million = 0.0
                        
                        p_status = random.choice(["عدم شناسایی", "مذاکره", "دعوای حقوقی", "اجاره نامه معتبر", "منقضی شده"])
                        lease_million = round(annual_million * random.uniform(0.1, 0.5), 2) if p_status == "اجاره نامه معتبر" else 0.0
                        total_income += lease_million
                        
                        properties_data.append((
                            prop_id, endowment_id, f"رقبه {p_type}", f"200{random.randint(10000, 99999)}", p_type,
                            "فعال", f"متصرف {random.randint(100,999)}", p_status, "-", 
                            lease_million, lost_annual_million, p_status, r_doc, area
                        ))
                        prop_id += 1
                    
                    endowments_data[-1][6] = round(total_income, 2)
                    endowments_data[-1] = tuple(endowments_data[-1])
                    endowment_id += 1
                    
                    # ذخیره سازی مرحله‌ای در دیتابیس برای جلوگیری از پر شدن حافظه
                    if len(properties_data) >= BATCH_SIZE:
                        self.cursor.executemany('INSERT INTO endowments VALUES (?,?,?,?,?,?,?,?,?,?)', endowments_data)
                        self.cursor.executemany('INSERT INTO properties VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', properties_data)
                        self.conn.commit()
                        endowments_data.clear()
                        properties_data.clear()
                        
            print(f"  - Province generated: {p_name}")

        # ثبت داده‌های باقیمانده در دیتابیس
        if properties_data:
            self.cursor.executemany('INSERT INTO endowments VALUES (?,?,?,?,?,?,?,?,?,?)', endowments_data)
            self.cursor.executemany('INSERT INTO properties VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', properties_data)
            self.conn.commit()

    def run_pipeline(self):
        self.initialize()
        self.build_schema()
        self.generate_counties()
        self.generate_data()
        self.conn.close()
        print("[*] DONE! Database is successfully generated.")

if __name__ == '__main__':
    OghafDatabaseBuilder('oqaf.db').run_pipeline()