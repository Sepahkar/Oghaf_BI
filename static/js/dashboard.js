// Oghaf Management Dashboard - Main JavaScript File (v3 - ساختار اصلاح شده)

$(document).ready(function() {
    // --- متغیرهای سراسری ---
    let map; // نمونه نقشه Leaflet
    let currentLevel = 'country'; // سطح فعلی نمایش: country, province, city, endowment
    let navigationStack = []; // پشته‌ای برای مدیریت ناوبری (دکمه بازگشت)
    let markers = []; // آرایه‌ای برای نگهداری مارکرهای فعلی روی نقشه

    // --- توابع اصلی ---

    /**
     * تابع اصلی برای راه‌اندازی داشبورد
     * نقشه را مقداردهی اولیه کرده و داده‌های سطح کشور را بارگذاری می‌کند.
     */
    function initDashboard() {
        initMap();
        loadCountryData();
        setupEventHandlers();
    }

    /**
     * نقشه Leaflet را با مرکزیت ایران راه‌اندازی می‌کند.
     */
    function initMap() {
        try {
            map = L.map('map').setView([32.4279, 53.6880], 5); // مرکز ایران، زوم ۵
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // --- این خط جدید، مشکل 404 مارکر را حل می‌کند ---
            L.Icon.Default.imagePath = '/static/images/';

        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    /**
     * رویدادهای کلیک اصلی برنامه را تنظیم می‌کند.
     * از event delegation برای مدیریت کلیک‌ها روی دکمه‌هایی که بعداً ساخته می‌شوند، استفاده می‌کند.
     */
    function setupEventHandlers() {
        // دکمه بازگشت
        $('#backBtn').click(handleBackNavigation);

        // --- Event Delegation برای دکمه‌های جدول ---
        $('#dataTable').on('click', '.btn-view-cities', function() {
            const provinceId = $(this).data('id');
            const provinceName = $(this).data('name');
            loadCityData(provinceId, provinceName);
        });

        $('#dataTable').on('click', '.btn-view-endowments', function() {
            const provinceId = $(this).data('province-id');
            const cityId = $(this).data('id');
            const cityName = $(this).data('name');
            loadEndowmentData(provinceId, cityId, cityName);
        });

        $('#dataTable').on('click', '.btn-view-properties', function() {
            const provinceId = $(this).data('province-id');
            const cityId = $(this).data('city-id');
            const endowmentId = $(this).data('id');
            const endowmentName = $(this).data('name');
            loadPropertyData(provinceId, cityId, endowmentId, endowmentName);
        });

        // --- Event Delegation برای دکمه‌های پاپ‌آپ نقشه ---
        $('#map').on('click', '.popup-btn-cities', function() {
            const provinceId = $(this).data('id');
            const provinceName = $(this).data('name');
            loadCityData(provinceId, provinceName);
        });

        $('#map').on('click', '.popup-btn-endowments', function() {
            const provinceId = $(this).data('province-id');
            const cityId = $(this).data('id');
            const cityName = $(this).data('name');
            loadEndowmentData(provinceId, cityId, cityName);
        });

        $('#map').on('click', '.popup-btn-properties', function() {
            const provinceId = $(this).data('province-id');
            const cityId = $(this).data('city-id');
            const endowmentId = $(this).data('id');
            const endowmentName = $(this).data('name');
            loadPropertyData(provinceId, cityId, endowmentId, endowmentName);
        });
    } // --- پایان تابع setupEventHandlers ---
    // (توابع بعدی باید بیرون از اینجا باشند)


    // --- توابع بارگذاری داده (سطح کشور) ---

    /**
     * داده‌های سطح کشور (لیست استان‌ها و آمار) را از API بارگذاری می‌کند.
     */
    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = []; // پشته ناوبری ریست می‌شود

        $.ajax({
            url: '/api/provinces',
            method: 'GET',
            success: function(data) {
                // API یک آرایه برمی‌گرداند
                displayProvinces(data);
                updateStatsPanel(calculateCountryStats(data));
                updateBreadcrumb(); // بدون آرگومان یعنی سطح ریشه
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    /**
     * استان‌ها را در جدول و روی نقشه نمایش می‌دهد.
     * @param {Array} provinces - آرایه‌ای از آبجکت‌های استان.
     */
    function displayProvinces(provinces) {
        clearMap();
        map.flyTo([32.4279, 53.6880], 5); // ریست کردن زوم نقشه

        const tableHeaders = `
            <th>نام استان</th>
            <th>سند تک برگ (تعداد)</th>
            <th>سند تک برگ (مساحت)</th>
            <th>سند دفترچه‌ای (تعداد)</th>
            <th>سند دفترچه‌ای (مساحت)</th>
            <th>فاقد سند (تعداد)</th>
            <th>عملیات</th>
        `;

        let tableRows = '';
        provinces.forEach(province => {
            const stats = {
                single_sheet_count: province.single_sheet_count,
                single_sheet_area: province.single_sheet_area,
                booklet_count: province.booklet_count,
                booklet_area: province.booklet_area,
                no_document_count: province.no_document_count
            };

            const popupContent = createProvincePopup(province, stats);
            addMarker([province.lat, province.lng], popupContent);

            tableRows += `
                <tr>
                    <td><strong>${province.name}</strong></td>
                    <td class="number-format">${formatNumber(stats.single_sheet_count)}</td>
                    <td class="number-format">${formatNumber(stats.single_sheet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.booklet_count)}</td>
                    <td class="number-format">${formatNumber(stats.booklet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.no_document_count)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm btn-view-cities" 
                                data-id="${province.id}" 
                                data-name="${province.name}">
                            <i class="fas fa-eye me-1"></i>مشاهده شهرستان‌ها
                        </button>
                    </td>
                </tr>
            `;
        });

        $('#tableHeaders').html(tableHeaders);
        $('#tableBody').hide();
        $('#tableBody').html(tableRows).fadeIn(600);
        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول استان‌ها');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه ایران - استان‌ها');
    }

    /**
     * محتوای HTML پاپ‌آپ یک استان را می‌سازد.
     * @param {Object} province - آبجکت استان.
     * @param {Object} stats - آبجکت آمار استان.
     * @returns {string} - رشته HTML.
     */
    function createProvincePopup(province, stats) {
        return `
            <div style="min-width: 250px; text-align: right; direction: rtl;">
                <h6>${province.name}</h6>
                <table class="stats-table">
                    <tr><td>سند تک برگ:</td><td>${formatNumber(stats.single_sheet_count)} (${formatNumber(stats.single_sheet_area)} متر مربع)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(stats.booklet_count)} (${formatNumber(stats.booklet_area)} متر مربع)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(stats.no_document_count)}</td></tr>
                </table>
                <button class="btn btn-primary btn-sm mt-2 w-100 popup-btn-cities" 
                        data-id="${province.id}" 
                        data-name="${province.name}">
                    <i class="fas fa-arrow-left me-1"></i>مشاهده شهرستان‌ها
                </button>
            </div>
        `;
    }

    // --- توابع بارگذاری داده (سطح شهرستان) ---

    /**
     * داده‌های شهرستان‌های یک استان خاص را بارگذاری می‌کند.
     * @param {number} provinceId - ID استان.
     * @param {string} provinceName - نام استان (برای ناوبری).
     */
    function loadCityData(provinceId, provinceName) {
        showLoading();
        navigationStack.push({
            level: currentLevel,
            name: 'ایران', // نام سطح قبلی برای بازگشت
            loadFunction: loadCountryData
        });
        currentLevel = 'province';

        $.ajax({
            url: `/api/province/${provinceId}/cities`,
            method: 'GET',
            success: function(data) {
                displayCities(data, provinceId);
                updateStatsPanel(calculateCityStats(data, provinceName));
                updateBreadcrumb({
                    name: 'ایران',
                    loadFunction: loadCountryData
                }, {
                    name: provinceName
                });

                if (data.length > 0) {
                    const latitudes = data.map(c => c.lat);
                    const longitudes = data.map(c => c.lng);
                    const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
                    const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
                    map.flyTo([centerLat, centerLng], 8);
                }
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    /**
     * شهرستان‌ها را در جدول و روی نقشه نمایش می‌دهد.
     * @param {Array} cities - آرایه‌ای از آبجکت‌های شهرستان.
     * @param {number} provinceId - ID استان والد.
     */
    function displayCities(cities, provinceId) {
        clearMap();

        const tableHeaders = `
            <th>نام شهرستان</th>
            <th>سند تک برگ (تعداد)</th>
            <th>سند تک برگ (مساحت)</th>
            <th>سند دفترچه‌ای (تعداد)</th>
            <th>سند دفترچه‌ای (مساحت)</th>
            <th>فاقد سند (تعداد)</th>
            <th>عملیات</th>
        `;

        let tableRows = '';
        cities.forEach(city => {
            const stats = {
                single_sheet_count: city.s_takbarg_c,
                single_sheet_area: city.s_takbarg_a,
                booklet_count: city.s_daftarchei_c,
                booklet_area: city.s_daftarchei_a,
                no_document_count: city.s_nosand_c
            };

            const popupContent = createCityPopup(city, stats, provinceId);
            addMarker([city.lat, city.lng], popupContent);

            tableRows += `
                <tr>
                    <td><strong>${city.name}</strong></td>
                    <td class="number-format">${formatNumber(stats.single_sheet_count)}</td>
                    <td class="number-format">${formatNumber(stats.single_sheet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.booklet_count)}</td>
                    <td class="number-format">${formatNumber(stats.booklet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.no_document_count)}</td>
                    <td>
                        <button class="btn btn-success btn-sm btn-view-endowments" 
                                data-id="${city.id}" 
                                data-province-id="${provinceId}" 
                                data-name="${city.name}">
                            <i class="fas fa-eye me-1"></i>مشاهده موقوفات
                        </button>
                    </td>
                </tr>
            `;
        });

        $('#tableHeaders').html(tableHeaders);
        $('#tableBody').hide();
        $('#tableBody').html(tableRows).fadeIn(600);
        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول شهرستان‌ها');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه شهرستان‌ها');
    }

    /**
     * محتوای HTML پاپ‌آپ یک شهرستان را می‌سازد.
     */
    function createCityPopup(city, stats, provinceId) {
        return `
            <div style="min-width: 250px; text-align: right; direction: rtl;">
                <h6>${city.name}</h6>
                <table class="stats-table">
                    <tr><td>سند تک برگ:</td><td>${formatNumber(stats.single_sheet_count)} (${formatNumber(stats.single_sheet_area)} متر مربع)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(stats.booklet_count)} (${formatNumber(stats.booklet_area)} متر مربع)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(stats.no_document_count)}</td></tr>
                </table>
                <button class="btn btn-success btn-sm mt-2 w-100 popup-btn-endowments" 
                        data-id="${city.id}" 
                        data-province-id="${provinceId}" 
                        data-name="${city.name}">
                    <i class="fas fa-arrow-left me-1"></i>مشاهده موقوفات
                </button>
            </div>
        `;
    }

    // --- توابع بارگذاری داده (سطح موقوفه) ---

    /**
     * داده‌های موقوفات یک شهرستان خاص را بارگذاری می‌کند.
     */
    function loadEndowmentData(provinceId, cityId, cityName) {
        showLoading();
        navigationStack.push({
            level: currentLevel,
            name: navigationStack[navigationStack.length - 1].name, // نام استان از پشته
            loadFunction: () => loadCityData(provinceId, navigationStack[navigationStack.length - 1].name)
        });
        currentLevel = 'city';

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowments`,
            method: 'GET',
            success: function(data) {
                displayEndowments(data, provinceId, cityId); // تابع اصلاح شده فراخوانی می‌شود
                updateStatsPanel(calculateEndowmentStats(data, cityName));
                updateBreadcrumb({
                    name: 'ایران',
                    loadFunction: loadCountryData
                }, {
                    name: navigationStack[navigationStack.length - 1].name, // نام استان
                    loadFunction: () => loadCityData(provinceId, navigationStack[navigationStack.length - 1].name)
                }, {
                    name: cityName
                });
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    /**
     * موقوفات را در جدول و روی نقشه نمایش می‌دهد. (نسخه اصلاح شده)
     */
    function displayEndowments(endowments, provinceId, cityId) {
        clearMap(); // نقشه را از مارکرهای شهرستان پاک کن

        const tableHeaders = `
            <th>نام موقوفه</th>
            <th>نیت واقف</th>
            <th>تعداد رقبات</th>
            <th>نوع موقوفه</th>
            <th>درآمد کل (ریال)</th>
            <th>عملیات</th>
        `;

        let tableRows = '';
        let validEndowments = []; // برای محاسبه زوم نقشه

        endowments.forEach(endowment => {
            // افزودن مارکر به نقشه (فقط اگر مختصات داشت)
            if (endowment.lat && endowment.lng) {
                const popupContent = createEndowmentPopup(endowment, provinceId, cityId);
                // آیکون سفارشی برای موقوفه
                const endowmentIcon = L.divIcon({
                    html: '<i class="fas fa-landmark" style="font-size: 20px; color: #0d6efd;"></i>',
                    className: 'map-icon'
                });
                const marker = L.marker([endowment.lat, endowment.lng], {
                    icon: endowmentIcon
                }).addTo(map);
                marker.bindPopup(popupContent);
                markers.push(marker);
                validEndowments.push(endowment);
            }

            // افزودن ردیف به جدول
            tableRows += `
                <tr>
                    <td><strong>${endowment.name}</strong></td>
                    <td>${endowment.intent}</td>
                    <td class="number-format">${formatNumber(endowment.raqabat_count)}</td>
                    <td>
                        <span class="badge ${endowment.type === 'متصرفی' ? 'bg-success' : 'bg-warning'}">${endowment.type}</span>
                    </td>
                    <td class="number-format">${formatNumber(endowment.total_income)}</td>
                    <td>
                        <button class="btn btn-warning btn-sm btn-view-properties" 
                                data-id="${endowment.id}" 
                                data-city-id="${cityId}" 
                                data-province-id="${provinceId}" 
                                data-name="${endowment.name}">
                            <i class="fas fa-eye me-1"></i>مشاهده رقبات
                        </button>
                    </td>
                </tr>
            `;
        });

        $('#tableBody').hide(); // برای انیمیشن
        $('#tableHeaders').html(tableHeaders);
        $('#tableBody').html(tableRows).fadeIn(600);
        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول موقوفات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه پراکندگی موقوفات');

        // زوم خودکار نقشه روی موقوفات
        if (validEndowments.length > 0) {
            const latitudes = validEndowments.map(c => c.lat);
            const longitudes = validEndowments.map(c => c.lng);
            const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
            const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
            map.flyTo([centerLat, centerLng], 11); // زوم نزدیک‌تر (سطح ۱۱)
        }
    }


    /**
     * محتوای HTML پاپ‌آپ یک موقوفه را می‌سازد.
     */
    function createEndowmentPopup(endowment, provinceId, cityId) {
        return `
            <div style="min-width: 250px; text-align: right; direction: rtl;">
                <h6>${endowment.name}</h6>
                <table class="stats-table">
                    <tr><td>نوع:</td><td>${endowment.type}</td></tr>
                    <tr><td>نیت:</td><td>${endowment.intent}</td></tr>
                    <tr><td>تعداد رقبات:</td><td>${formatNumber(endowment.raqabat_count)}</td></tr>
                    <tr><td>درآمد:</td><td>${formatNumber(endowment.total_income)} ریال</td></tr>
                </table>
                <button class="btn btn-warning btn-sm mt-2 w-100 popup-btn-properties" 
                        data-id="${endowment.id}" 
                        data-city-id="${cityId}"
                        data-province-id="${provinceId}" 
                        data-name="${endowment.name}">
                    <i class="fas fa-arrow-left me-1"></i>مشاهده رقبات
                </button>
            </div>
        `;
    }

    // --- توابع بارگذاری داده (سطح رقبه) ---

    /**
     * داده‌های رقبات (Properties) یک موقوفه خاص را بارگذاری می‌کند.
     */
    function loadPropertyData(provinceId, cityId, endowmentId, endowmentName) {
        showLoading();
        navigationStack.push({
            level: currentLevel,
            name: navigationStack[navigationStack.length - 1].name, // نام شهرستان از پشته
            loadFunction: () => loadEndowmentData(provinceId, cityId, navigationStack[navigationStack.length - 1].name)
        });
        currentLevel = 'endowment';

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowment/${endowmentId}/properties`,
            method: 'GET',
            success: function(data) {
                displayProperties(data);
                updateStatsPanel(calculatePropertyStats(data, endowmentName));

                const provinceName = navigationStack[navigationStack.length - 2].name;
                const cityName = navigationStack[navigationStack.length - 1].name;

                updateBreadcrumb({
                    name: 'ایران',
                    loadFunction: loadCountryData
                }, {
                    name: provinceName,
                    loadFunction: () => loadCityData(provinceId, provinceName)
                }, {
                    name: cityName,
                    loadFunction: () => loadEndowmentData(provinceId, cityId, cityName)
                }, {
                    name: endowmentName
                });
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    /**
     * رقبات را در جدول نمایش می‌دهد.
     */
    function displayProperties(properties) {
        clearMap();

        const tableHeaders = `
            <th>عنوان رقبه</th>
            <th>کاربری</th>
            <th>وضعیت</th>
            <th>متصرف</th>
            <th>وضعیت اجاره</th>
            <th>تاریخ انقضا</th>
            <th>مبلغ اجاره (ریال)</th>
        `;

        let tableRows = '';
        properties.forEach(prop => {
            tableRows += `
                <tr>
                    <td><strong>${prop.title}</strong></td>
                    <td>${prop.land_use}</td>
                    <td>
                        <span class="badge ${prop.status === 'فعال' ? 'bg-success' : 'bg-secondary'}">${prop.status}</span>
                    </td>
                    <td>${prop.user}</td>
                    <td>
                        <span class="badge ${prop.lease_status === 'دارای اجاره نامه' ? 'bg-info' : 'bg-danger'}">${prop.lease_status}</span>
                    </td>
                    <td class="number-format">${prop.expiry_date}</td>
                    <td class="number-format">${formatNumber(prop.lease_amount)}</td>
                </tr>
            `;
        });

        $('#tableHeaders').html(tableHeaders);
        $('#tableBody').hide(); // اول پنهان کنیم   
        $('#tableBody').html(tableRows).fadeIn(600);
        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول رقبات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>رقبات موقوفه');
    }

    // --- توابع کمکی و محاسباتی ---

    /**
     * آمار کلی سطح کشور را محاسبه می‌کند.
     * @param {Array} provinces - آرایه استان‌ها.
     */
    function calculateCountryStats(provinces) {
        let totalSingleSheet = 0,
            totalSingleSheetArea = 0;
        let totalBooklet = 0,
            totalBookletArea = 0;
        let totalNoDocument = 0;

        provinces.forEach(p => {
            totalSingleSheet += p.single_sheet_count;
            totalSingleSheetArea += p.single_sheet_area;
            totalBooklet += p.booklet_count;
            totalBookletArea += p.booklet_area;
            totalNoDocument += p.no_document_count;
        });

        return {
            title: 'آمار کلی کشور',
            items: [{
                label: 'سند تک برگ',
                value: `${formatNumber(totalSingleSheet)} (${formatNumber(totalSingleSheetArea)} متر مربع)`
            }, {
                label: 'سند دفترچه‌ای',
                value: `${formatNumber(totalBooklet)} (${formatNumber(totalBookletArea)} متر مربع)`
            }, {
                label: 'فاقد سند',
                value: formatNumber(totalNoDocument)
            }, {
                label: 'تعداد استان‌ها',
                value: provinces.length
            }]
        };
    }

    /**
     * آمار کلی سطح استان (مجموع شهرستان‌ها) را محاسبه می‌کند.
     * @param {Array} cities - آرایه شهرستان‌ها.
     * @param {string} provinceName - نام استان.
     */
    function calculateCityStats(cities, provinceName) {
        let totalSingleSheet = 0,
            totalSingleSheetArea = 0;
        let totalBooklet = 0,
            totalBookletArea = 0;
        let totalNoDocument = 0;

        cities.forEach(c => {
            totalSingleSheet += c.s_takbarg_c;
            totalSingleSheetArea += c.s_takbarg_a;
            totalBooklet += c.s_daftarchei_c;
            totalBookletArea += c.s_daftarchei_a;
            totalNoDocument += c.s_nosand_c;
        });

        return {
            title: `آمار استان ${provinceName}`,
            items: [{
                label: 'سند تک برگ',
                value: `${formatNumber(totalSingleSheet)} (${formatNumber(totalSingleSheetArea)} متر مربع)`
            }, {
                label: 'سند دفترچه‌ای',
                value: `${formatNumber(totalBooklet)} (${formatNumber(totalBookletArea)} متر مربع)`
            }, {
                label: 'فاقد سند',
                value: formatNumber(totalNoDocument)
            }, {
                label: 'تعداد شهرستان‌ها',
                value: cities.length
            }]
        };
    }

    /**
     * آمار کلی سطح شهرستان (مجموع موقوفات) را محاسبه می‌کند.
     */
    function calculateEndowmentStats(endowments, cityName) {
        let totalProperties = 0;
        let totalIncome = 0;
        let motasarrefi = 0;

        endowments.forEach(e => {
            totalProperties += e.raqabat_count;
            totalIncome += e.total_income;
            if (e.type === 'متصرفی') motasarrefi++;
        });

        return {
            title: `آمار شهرستان ${cityName}`,
            items: [{
                label: 'تعداد موقوفات',
                value: formatNumber(endowments.length)
            }, {
                label: 'تعداد کل رقبات',
                value: formatNumber(totalProperties)
            }, {
                label: 'درآمد کل',
                value: `${formatNumber(totalIncome)} ریال`
            }, {
                label: 'موقوفات متصرفی',
                value: `${motasarrefi} از ${endowments.length}`
            }]
        };
    }

    /**
     * آمار کلی سطح موقوفه (مجموع رقبات) را محاسبه می‌کند.
     */
    function calculatePropertyStats(properties, endowmentName) {
        let activeProperties = 0;
        let hasLease = 0;

        properties.forEach(p => {
            if (p.status === 'فعال') activeProperties++;
            if (p.lease_status === 'دارای اجاره نامه') hasLease++;
        });

        return {
            title: `آمار موقوفه ${endowmentName}`,
            items: [{
                label: 'تعداد رقبات',
                value: formatNumber(properties.length)
            }, {
                label: 'رقبات فعال',
                value: `${activeProperties} از ${properties.length}`
            }, {
                label: 'دارای اجاره نامه',
                value: `${hasLease} از ${properties.length}`
            }]
        };
    }

    /**
     * پنل آمار در سایدبار را به‌روزرسانی می‌کند.
     * @param {Object} stats - آبجکت آمار.
     */
    function updateStatsPanel(stats) {
        let html = `<h6 class="text-muted">${stats.title}</h6>`;
        stats.items.forEach(item => {
            html += `
                <div class="stats-item">
                    <span class="stats-label">${item.label}:</span>
                    <span class="stats-value">${item.value}</span>
                </div>
            `;
        });
        $('#statsPanel').html(html).removeClass('stats-loading');
    }

    /**
     * نوار ناوبری (Breadcrumb) را به‌روزرسانی می‌کند.
     * @param {...Object} items - آبجکت‌هایی که هر کدام شامل name و loadFunction هستند.
     */
    function updateBreadcrumb(...items) {
        let html = '';
        if (items.length === 0) {
            // سطح ریشه (کشور)
            html = '<li class="breadcrumb-item active"><i class="fas fa-map me-1"></i>نقشه ایران</li>';
        } else {
            items.forEach((item, index) => {
                if (index === items.length - 1) {
                    // آیتم آخر (فعلی)
                    html += `<li class="breadcrumb-item active">${item.name}</li>`;
                } else {
                    // آیتم‌های قابل کلیک قبلی
                    const funcName = `navFunc${index}`;
                    window[funcName] = item.loadFunction;
                    html += `<li class="breadcrumb-item"><a href="#" onclick="${funcName}(); return false;">${item.name}</a></li>`;
                }
            });
        }
        $('#breadcrumb').html(html);
        $('#backBtn').toggle(navigationStack.length > 0); // نمایش/عدم نمایش دکمه بازگشت
    }

    /**
     * منطق دکمه بازگشت را مدیریت می‌کند.
     */
    function handleBackNavigation() {
        if (navigationStack.length > 0) {
            const previousState = navigationStack.pop();
            showLoading();
            // تابع بازگشت ذخیره شده در پشته را فراخوانی می‌کند
            previousState.loadFunction();
            // نکته: hideLoading() در خود تابع loadFunction (در بخش complete) فراخوانی می‌شود
        }
    }


    // --- توابع ابزاری (Utility) ---

    /**
     * تمام مارکرهای فعلی را از نقشه پاک می‌کند.
     */
    function clearMap() {
        markers.forEach(marker => {
            map.removeLayer(marker);
        });
        markers = [];
    }

    /**
     * یک مارکر جدید به نقشه اضافه می‌کند.
     * @param {Array} latLng - مختصات [lat, lng].
     * @param {string} popupContent - محتوای HTML پاپ‌آپ.
     */
    function addMarker(latLng, popupContent) {
        const marker = L.marker(latLng).addTo(map);
        marker.bindPopup(popupContent);
        markers.push(marker);
    }

    /**
     * اعداد را با کاما (,) جدا می‌کند.
     */
    function formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * مودال لودینگ را نمایش می‌دهد.
     */
    function showLoading() {
        $('.stats-loading').show(); // نمایش لودر سایدبار
        $('#loadingModal').modal('show');
    }

    /**
     * مودال لودینگ را پنهان می‌کند.
     */
    function hideLoading() {
        $('.stats-loading').hide();
        setTimeout(() => {
            // ۱. دستور استاندارد بستن مودال
            $('#loadingModal').modal('hide');

            // --- ۲. کد اطمینان برای رفع قفل صفحه ---
            // این کدها پس‌زمینه خاکستری را به زور حذف می‌کنند
            // حتی اگر بوت‌استرپ در بستن مودال شکست بخورد
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
            // ---
        }, 500); // ۵۰۰ میلی‌ثانیه تاخیر
    }

    /**
     * مدیریت خطاهای AJAX و نمایش آلرت.
     */
    function handleAjaxError(xhr, status, error) {
        console.error('AJAX Error:', status, error);
        hideLoading(); // در صورت خطا، لودینگ را ببند
        let message = 'خطا در بارگذاری اطلاعات';
        if (xhr.status === 404) {
            message = 'داده‌ای برای نمایش یافت نشد.';
            $('#tableBody').html('<tr><td colspan="100%" class="text-center">داده‌ای یافت نشد.</td></tr>');
            updateStatsPanel({
                title: 'خطا',
                items: [{
                    label: 'وضعیت',
                    value: 'داده‌ای یافت نشد'
                }]
            });
        } else {
            showAlert(message, 'danger');
        }
    }

    /**
     * نمایش یک آلرت (Alert) موقت.
     */
    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 80px; left: 20px; z-index: 9999; min-width: 300px; direction: rtl;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(alertHtml);

        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }

    // --- اجرای برنامه ---
    initDashboard();

}); // --- پایان $(document).ready ---