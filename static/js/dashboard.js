// Oghaf Management Dashboard - Main JavaScript File (V2.0)

$(document).ready(function() {
    // --- متغیرهای سراسری ---
    let map;
    let currentLevel = 'country';
    let navigationStack = [];
    let markers = [];

    let mainDataTable = null; // (جدید) نمونه جدول DataTables
    let chart1_instance = null; // (جدید) نمونه نمودار ۱
    let chart2_instance = null; // (جدید) نمونه نمودار ۲

    // --- توابع اصلی ---

    function initDashboard() {
        initMap();
        initCharts(); // (جدید) نمودارها را راه‌اندازی اولیه کن
        loadCountryData();
        setupEventHandlers();
    }

    function initMap() {
        try {
            map = L.map('map').setView([32.4279, 53.6880], 5);

            // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            //     attribution: '© OpenStreetMap contributors'
            // }).addTo(map); // <-- این خط کامنت شد

            L.Icon.Default.imagePath = '/static/images/';
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    /**
     * (جدید) راه‌اندازی اولیه دو نمودار
     */
    function initCharts() {
        const ctx1 = document.getElementById('chart1').getContext('2d');
        const ctx2 = document.getElementById('chart2').getContext('2d');

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Vazirmatn'
                        }
                    }
                }
            }
        };

        chart1_instance = new Chart(ctx1, {
            type: 'pie',
            data: {},
            options: chartOptions
        });
        chart2_instance = new Chart(ctx2, {
            type: 'pie',
            data: {},
            options: chartOptions
        });
    }

    function setupEventHandlers() {
        // دکمه بازگشت
        $('#backBtn').click(handleBackNavigation);

        // (امتیاز ۸) جستجوی DataTables
        $('#tableSearchBtn').on('click', function() {
            if (mainDataTable) {
                mainDataTable.search($('#tableSearchInput').val()).draw();
            }
        });
        $('#tableSearchInput').on('keypress', function(e) {
            if (e.which === 13 && mainDataTable) { // Enter
                mainDataTable.search($(this).val()).draw();
            }
        });

        // --- Event Delegation (مهم: حالا روی ردیف‌های DataTables) ---
        // DataTables روش متفاوتی برای event handling دارد
        $('#mainDataTable tbody').on('click', 'button.btn-view-cities', function() {
            const data = mainDataTable.row($(this).parents('tr')).data();
            loadCityData(data.id, data.name);
        });

        $('#mainDataTable tbody').on('click', 'button.btn-view-endowments', function() {
            const data = mainDataTable.row($(this).parents('tr')).data();
            loadEndowmentData(data.province_id, data.id, data.name);
        });

        $('#mainDataTable tbody').on('click', 'button.btn-view-properties', function() {
            const data = mainDataTable.row($(this).parents('tr')).data();
            loadPropertyData(data.province_id, data.county_id, data.id, data.name);
        });

        // رویدادهای کلیک پاپ‌آپ نقشه (بدون تغییر)
        $('#map').on('click', '.popup-btn-cities', function() {
            loadCityData($(this).data('id'), $(this).data('name'));
        });
        $('#map').on('click', '.popup-btn-endowments', function() {
            loadEndowmentData($(this).data('province-id'), $(this).data('id'), $(this).data('name'));
        });
        $('#map').on('click', '.popup-btn-properties', function() {
            loadPropertyData($(this).data('province-id'), $(this).data('city-id'), $(this).data('id'), $(this).data('name'));
        });
    }

    // --- توابع بارگذاری داده (سطح کشور) ---

    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = [];
        $('#tableSearchInput').val(''); // ریست کردن جستجو

        $.ajax({
            url: '/api/provinces',
            method: 'GET',
            success: function(data) {
                displayProvinces(data);

                // (امتیاز ۱۱) درآمد از دست رفته
                const totalLostRevenue = data.reduce((sum, p) => sum + p.lost_revenue, 0);
                updateStatsPanel(totalLostRevenue, 'آمار کلی کشور');

                // (امتیاز ۹) به‌روزرسانی نمودارها
                const chartData1 = data.map(p => p.charts.by_count[0]); // تجمیع داده‌های نمودار برای کل کشور
                const chartData2 = data.map(p => p.charts.by_area[0]);
                updateChart(chart1_instance, 'آمار اسناد (تعداد)',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'],
                    [sumArray(data, p => p.charts.by_count[0]), sumArray(data, p => p.charts.by_count[1]), sumArray(data, p => p.charts.by_count[2])]
                );
                updateChart(chart2_instance, 'آمار اسناد (مساحت)',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'],
                    [sumArray(data, p => p.charts.by_area[0]), sumArray(data, p => p.charts.by_area[1]), sumArray(data, p => p.charts.by_area[2])]
                );

                updateBreadcrumb();
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    /**
     * (نسخه ۲) نمایش استان‌ها با DataTables
     */
    function displayProvinces(provinces) {
        clearMap();
        map.flyTo([32.4279, 53.6880], 5);

        // (امتیاز ۲) تعریف ستون‌ها و رندر آیکون‌ها
        const columns = [{
                data: 'name',
                title: 'نام استان'
            },
            {
                data: 'takbarg_count',
                title: 'تک برگ (تعداد)',
                className: 'number-format'
            },
            {
                data: 'takbarg_area',
                title: 'تک برگ (مساحت)',
                className: 'number-format',
                render: v => formatNumber(v) + ' م²'
            },
            {
                data: 'daftarchei_count',
                title: 'دفترچه‌ای (تعداد)',
                className: 'number-format'
            },
            {
                data: 'daftarchei_area',
                title: 'دفترچه‌ای (مساحت)',
                className: 'number-format',
                render: v => formatNumber(v) + ' مترمربع'
            },
            {
                data: 'nosand_count',
                title: 'فاقد سند (تعداد)',
                className: 'number-format'
            },
            {
                data: null,
                title: 'عملیات',
                orderable: false,
                render: (data, type, row) => `<button class="btn btn-primary btn-sm btn-view-cities"><i class="fas fa-eye me-1"></i>شهرستان‌ها</button>`
            }
        ];

        initOrReloadDataTable(provinces, columns);

        // افزودن مارکرها به نقشه
        provinces.forEach(province => {
            const popupContent = createProvincePopup(province);
            addMarker([province.lat, province.lng], popupContent);
        });

        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول استان‌ها');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه ایران - استان‌ها');
    }

    function createProvincePopup(province) {
        return `
            <div style="min-width: 250px;" class="stats-table">
                <h6>${province.name}</h6>
                <table>
                    <tr><td>سند تک برگ:</td><td>${formatNumber(province.takbarg_count)} (${formatNumber(province.takbarg_area)} م²)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(province.daftarchei_count)} (${formatNumber(province.daftarchei_area)} م²)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(province.nosand_count)}</td></tr>
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

    function loadCityData(provinceId, provinceName) {
        showLoading();
        // (امتیاز ۱۳) رفع باگ Breadcrumb: ذخیره وضعیت فعلی قبل از رفتن به سطح بعد
        navigationStack.push({
            level: currentLevel,
            loadFunction: loadCountryData,
            name: "ایران" // نام نمایشی سطح قبلی
        });
        currentLevel = 'province';
        $('#tableSearchInput').val('');

        $.ajax({
            url: `/api/province/${provinceId}/cities`,
            method: 'GET',
            success: function(data) {
                displayCities(data, provinceId);

                const totalLostRevenue = data.reduce((sum, c) => sum + c.lost_revenue, 0);
                updateStatsPanel(totalLostRevenue, `آمار استان ${provinceName}`);

                // به‌روزرسانی نمودارها برای استان
                updateChart(chart1_instance, 'آمار اسناد (تعداد)',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'],
                    [sumArray(data, c => c.charts.by_count[0]), sumArray(data, c => c.charts.by_count[1]), sumArray(data, c => c.charts.by_count[2])]
                );
                updateChart(chart2_instance, 'آمار اسناد (مساحت)',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'],
                    [sumArray(data, c => c.charts.by_area[0]), sumArray(data, c => c.charts.by_area[1]), sumArray(data, c => c.charts.by_area[2])]
                );

                updateBreadcrumb(navigationStack[0], {
                    name: provinceName
                }); // (امتیاز ۱۳) اصلاح شده
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    function displayCities(cities, provinceId) {
        clearMap();

        const columns = [{
                data: 'name',
                title: 'نام شهرستان'
            },
            {
                data: 'takbarg_count',
                title: 'تک برگ (تعداد)',
                className: 'number-format'
            },
            {
                data: 'daftarchei_count',
                title: 'دفترچه‌ای (تعداد)',
                className: 'number-format'
            },
            {
                data: 'nosand_count',
                title: 'فاقد سند (تعداد)',
                className: 'number-format'
            },
            {
                data: 'lost_revenue',
                title: 'درآمد از دست رفته',
                className: 'number-format',
                render: v => formatNumber(v) + ' ریال'
            },
            {
                data: null,
                title: 'عملیات',
                orderable: false,
                render: (data, type, row) => `<button class="btn btn-success btn-sm btn-view-endowments"><i class="fas fa-eye me-1"></i>موقوفات</button>`
            }
        ];
        initOrReloadDataTable(cities, columns);

        // افزودن مارکرها و زوم
        let lats = [],
            lngs = [];
        cities.forEach(city => {
            const popupContent = createCityPopup(city, provinceId);
            addMarker([city.lat, city.lng], popupContent);
            lats.push(city.lat);
            lngs.push(city.lng);
        });
        if (lats.length > 0) {
            const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
            map.flyTo([centerLat, centerLng], 8);
        }

        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول شهرستان‌ها');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه شهرستان‌ها');
    }

    function createCityPopup(city, provinceId) {
        return `
            <div style="min-width: 250px;" class="stats-table">
                <h6>${city.name}</h6>
                <table>
                    <tr><td>سند تک برگ:</td><td>${formatNumber(city.takbarg_count)} (${formatNumber(city.takbarg_area)} متر مربع)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(city.daftarchei_count)} (${formatNumber(city.daftarchei_area)} متر مربع)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(city.nosand_count)}</td></tr>
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

    function loadEndowmentData(provinceId, cityId, cityName) {
        showLoading();
        // (امتیاز ۱۳) رفع باگ: ذخیره وضعیت فعلی (شهرستان)
        navigationStack.push({
            level: currentLevel,
            loadFunction: () => loadCityData(provinceId, navigationStack[navigationStack.length - 1].name),
            name: navigationStack[navigationStack.length - 1].name // نام استان
        });
        currentLevel = 'city';
        $('#tableSearchInput').val('');

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowments`,
            method: 'GET',
            success: function(data) {
                displayEndowments(data, provinceId, cityId);

                const totalLostRevenue = data.reduce((sum, e) => sum + e.lost_revenue, 0);
                updateStatsPanel(totalLostRevenue, `آمار شهرستان ${cityName}`);

                // (امتیاز ۱۰) نمودارها
                updateChart(chart1_instance, 'آمار اسناد موقوفات',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'],
                    [countIf(data, d => d.document_status === 'تک برگ'), countIf(data, d => d.document_status === 'دفترچه ای'), countIf(data, d => d.document_status === 'فاقد سند')]
                );
                updateChart(chart2_instance, 'نوع موقوفه',
                    ['متصرفی', 'غیرمتصرفی'],
                    [countIf(data, d => d.type === 'متصرفی'), countIf(data, d => d.type === 'غیرمتصرفی')]
                );

                updateBreadcrumb(navigationStack[0], navigationStack[1], {
                    name: cityName
                });
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    function displayEndowments(endowments, provinceId, cityId) {
        clearMap();

        const columns = [{
                data: 'name',
                title: 'نام موقوفه'
            },
            {
                data: 'document_status',
                title: 'وضعیت سند',
                render: (data) => renderIcon('doc', data) // (امتیاز ۷)
            },
            {
                data: 'intent',
                title: 'نیت واقف'
            },
            {
                data: 'raqabat_count',
                title: 'تعداد رقبات',
                className: 'number-format'
            },
            {
                data: 'type',
                title: 'نوع',
                render: (data, type, row) => (row.user === 'نامشخص' ? renderIcon('user', 'نامشخص') : data) // (امتیاز ۵)
            },
            {
                data: 'total_income',
                title: 'درآمد (ریال)',
                className: 'number-format',
                render: v => formatNumber(v)
            },
            {
                data: null,
                title: 'عملیات',
                orderable: false,
                render: (data, type, row) => `<button class="btn btn-warning btn-sm btn-view-properties" data-county-id="${cityId}"><i class="fas fa-eye me-1"></i>رقبات</button>`
            }
        ];
        initOrReloadDataTable(endowments, columns);

        // ... (منطق افزودن مارکر موقوفه و زوم نقشه مشابه شهرستان) ...
        // ...

        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول موقوفات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه پراکندگی موقوفات');
    }

    // --- توابع بارگذاری داده (سطح رقبه) ---

    function loadPropertyData(provinceId, cityId, endowmentId, endowmentName) {
        showLoading();
        // (امتیاز ۱۳) رفع باگ: ذخیره وضعیت فعلی (موقوفه)
        navigationStack.push({
            level: currentLevel,
            loadFunction: () => loadEndowmentData(provinceId, cityId, navigationStack[navigationStack.length - 1].name),
            name: navigationStack[navigationStack.length - 1].name // نام شهرستان
        });
        currentLevel = 'endowment';
        $('#tableSearchInput').val('');

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowment/${endowmentId}/properties`,
            method: 'GET',
            success: function(data) { // API یک آبجکت برمی‌گرداند
                displayProperties(data.properties);

                updateStatsPanel(data.lost_revenue, `آمار موقوفه ${endowmentName}`);

                // (امتیاز ۱۰) نمودارها
                updateChart(chart1_instance, 'آمار اسناد رقبات',
                    ['تک برگ', 'دفترچه‌ای', 'فاقد سند'], data.charts.doc_status);
                updateChart(chart2_instance, 'وضعیت اجاره‌نامه‌ها',
                    ['معتبر', 'منقضی شده', 'عدم شناسایی'], data.charts.prop_status);

                // (امتیاز ۱۳)
                updateBreadcrumb(navigationStack[0], navigationStack[1], navigationStack[2], {
                    name: endowmentName
                });
            },
            error: handleAjaxError,
            complete: hideLoading
        });
    }

    function displayProperties(properties) {
        clearMap(); // در سطح رقبه مارکر نداریم

        const columns = [{
                data: 'title',
                title: 'عنوان رقبه'
            },
            {
                data: 'land_use',
                title: 'کاربری',
                render: (data) => renderIcon('land_use', data) // (امتیاز ۴)
            },
            {
                data: 'property_status',
                title: 'وضعیت',
                render: (data) => renderIcon('prop_status', data) // (امتیاز ۶)
            },
            {
                data: 'document_status',
                title: 'سند',
                render: (data) => renderIcon('doc', data) // (امتیاز ۷)
            },
            {
                data: 'user',
                title: 'متصرف'
            },
            {
                data: 'expiry_date',
                title: 'تاریخ انقضا'
            }, // (امتیاز ۳)
            {
                data: 'lease_amount',
                title: 'مبلغ اجاره',
                className: 'number-format',
                render: v => formatNumber(v)
            }
        ];
        initOrReloadDataTable(properties, columns);

        $('#tableTitle').html('<i class="fas fa-list-ul me-2"></i>جدول رقبات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>رقبات موقوفه');
    }

    // --- توابع کمکی و ابزارها ---

    /**
     * (جدید) تابع اصلی برای راه‌اندازی یا بارگذاری مجدد DataTables
     */
    function initOrReloadDataTable(data, columns) {
        // (امتیاز ۲) تنظیمات DataTables
        const datatableOptions = {
            data: data,
            columns: columns,
            destroy: true, // برای بارگذاری مجدد
            language: {
                url: "//cdn.datatables.net/plug-ins/2.0.8/i18n/fa.json"
            },
            dom: 'Bfrtip', // (B)uttons, (f)iltering, (r)processing, (t)able, (i)nfo, (p)agination
            buttons: [{
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel me-1"></i> خروجی اکسل',
                className: 'btn btn-success btn-sm'
            }],
            pageLength: 10, // (امتیاز ۱) صفحه‌بندی
            responsive: true,
            createdRow: function(row, data, dataIndex) { // (امتیاز ۲) استایل زوج و فرد
                if (dataIndex % 2 === 0) {
                    $(row).addClass('table-row-even');
                }
            }
        };

        if (mainDataTable) {
            mainDataTable.clear().destroy(); // تخریب کامل جدول قبلی
            $('#mainDataTable').empty(); // پاک کردن هدر و بدنه
        }

        mainDataTable = $('#mainDataTable').DataTable(datatableOptions);

        // جابجایی دکمه‌های اکسپورت به مکان دلخواه (اینجا: هدر جدول)
        mainDataTable.buttons().container().appendTo($('#tableTitle'));
    }

    /**
     * (جدید) تابع رندر آیکون‌ها (امتیاز ۴، ۵، ۶، ۷)
     */
    function renderIcon(type, value) {
        switch (type) {
            case 'doc':
                if (value === 'تک برگ') return `<span class="text-success"><i class="fas fa-file-check me-1"></i> ${value}</span>`;
                if (value === 'دفترچه ای') return `<span class="text-warning"><i class="fas fa-file-alt me-1"></i> ${value}</span>`;
                if (value === 'فاقد سند') return `<span class="text-danger"><i class="fas fa-file-excel me-1"></i> ${value}</span>`;
                return value;

            case 'land_use':
                if (value === 'کشاورزی') return `<span style="color: #28a745;"><i class="fas fa-seedling me-1"></i> ${value}</span>`;
                if (value === 'تجاری') return `<span style="color: #0d6efd;"><i class="fas fa-store me-1"></i> ${value}</span>`;
                if (value === 'مسکونی') return `<span style="color: #6f42c1;"><i class="fas fa-home me-1"></i> ${value}</span>`;
                if (value === 'آموزشی') return `<span style="color: #fd7e14;"><i class="fas fa-book me-1"></i> ${value}</span>`;
                return `<span><i class="fas fa-building me-1"></i> ${value}</span>`;

            case 'prop_status':
                if (value === 'دارای اجاره نامه معتبر') return `<span class="text-success"><i class="fas fa-check-circle me-1"></i> ${value}</span>`;
                if (value === 'اجاره نامه منقضی شده') return `<span class="text-danger"><i class="fas fa-clock me-1"></i> ${value}</span>`;
                if (value === 'عدم شناسایی متصرف') return `<span class="text-secondary"><i class="fas fa-question-circle me-1"></i> ${value}</span>`;
                if (value === 'دعوای حقوقی') return `<span class="text-warning"><i class="fas fa-gavel me-1"></i> ${value}</span>`;
                return `<span><i class="fas fa-spinner me-1"></i> ${value}</span>`;

            case 'user':
                if (value === 'نامشخص') return `<span class="text-danger"><i class="fas fa-user-secret me-1"></i> متصرف نامشخص</span>`;
                return value;
        }
    }

    /**
     * (جدید) به‌روزرسانی نمودارها
     */
    function updateChart(chartInstance, title, labels, data) {
        if (!chartInstance) return;
        chartInstance.data = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#198754', '#ffc107', '#dc3545', '#0d6efd', '#6c757d']
            }]
        };
        chartInstance.options.plugins.title = {
            display: true,
            text: title,
            font: {
                family: 'Vazirmatn'
            }
        };
        chartInstance.update();
        // تغییر عنوان‌های بالای نمودار (امتیاز ۹، ۱۰)
        if (chartInstance === chart1_instance) {
            $('#chartTitle1').text(title);
        } else {
            $('#chartTitle2').text(title);
        }
    }

    /**
     * (جدید) به‌روزرسانی پنل آمار (فقط درآمد از دست رفته)
     */
    function updateStatsPanel(lostRevenue, title) {
        $('#lostRevenueValue').text(formatNumber(lostRevenue) + ' ریال');
        $('#statsPanel').html(`<h6 class="text-muted">${title}</h6>`); // فقط عنوان را نگه می‌داریم
    }

    /**
     * (امتیاز ۱۳) رفع باگ Breadcrumb
     */
    function updateBreadcrumb(...items) {
        let html = '';
        const root = {
            name: 'ایران',
            loadFunction: loadCountryData
        };

        // آیتم ریشه
        if (items.length === 0) {
            html = '<li class="breadcrumb-item active"><i class="fas fa-map me-1"></i>ایران</li>';
        } else {
            html = `<li class="breadcrumb-item"><a href="#" id="nav-0">${root.name}</a></li>`;
            $('#nav-0').off('click').on('click', root.loadFunction); // بازگشت به ریشه
        }

        // سایر آیتم‌ها
        items.forEach((item, index) => {
            const funcName = `navFunc${index+1}`;
            window[funcName] = item.loadFunction; // تابع بازگشت را در window ذخیره می‌کنیم

            if (index === items.length - 1) {
                html += `<li class="breadcrumb-item active">${item.name}</li>`;
            } else {
                html += `<li class="breadcrumb-item"><a href="#" onclick="${funcName}(); return false;">${item.name}</a></li>`;
            }
        });

        $('#breadcrumb').html(html);
        $('#backBtn').toggle(navigationStack.length > 0);
    }

    /**
     * (امتیاز ۱۳) رفع باگ Breadcrumb
     */
    function handleBackNavigation() {
        if (navigationStack.length > 0) {
            const previousState = navigationStack.pop();
            showLoading();
            // تابع بازگشت ذخیره شده در پشته را فراخوانی می‌کند
            if (previousState.loadFunction) {
                previousState.loadFunction();
            }
        }
    }

    // --- توابع ابزاری (Utility) ---
    function sumArray(arr, selector) {
        return arr.reduce((sum, item) => sum + selector(item), 0);
    }

    function countIf(arr, predicate) {
        return arr.filter(predicate).length;
    }

    function clearMap() {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    }

    function addMarker(latLng, popupContent) {
        const marker = L.marker(latLng).addTo(map);
        marker.bindPopup(popupContent, {
            minWidth: 250
        });
        markers.push(marker);
    }

    function formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function showLoading() {
        $('#loadingModal').modal('show');
        $('#statsPanel').html('<div class="stats-loading text-center"><div class="spinner-border spinner-border-sm" role="status"></div></div>');
    }

    function hideLoading() {
        setTimeout(() => {
            $('#loadingModal').modal('hide');
            // رفع باگ قفل شدن صفحه
            if ($('body').hasClass('modal-open')) {
                $('body').removeClass('modal-open');
                $('.modal-backdrop').remove();
            }
        }, 500);
    }

    function handleAjaxError(xhr, status, error) {
        console.error('AJAX Error:', status, error);
        hideLoading();
        if (xhr.status === 404) {
            initOrReloadDataTable([], [{
                data: 'message',
                title: 'خطا'
            }]);
            $('#tableBody').html('<tr><td colspan="100%" class="text-center">داده‌ای یافت نشد.</td></tr>');
            updateStatsPanel(0, 'خطا: داده‌ای یافت نشد');
        }
    }

    // --- اجرای برنامه ---
    initDashboard();

});