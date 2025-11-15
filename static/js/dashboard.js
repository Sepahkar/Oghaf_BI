// Oghaf Management Dashboard - Main JavaScript File

$(document).ready(function() {
    // Global variables
    let map;
    let currentLevel = 'country'; // country, province, city, endowment
    let currentData = {};
    let navigationStack = [];
    let markers = [];

    // Initialize the dashboard
    initDashboard();

    function initDashboard() {
        console.log('Initializing dashboard...');
        try {
            initMap();
            console.log('Map initialized');
            loadCountryData();
            console.log('Loading country data...');
            setupEventHandlers();
            console.log('Event handlers set up');
        } catch (error) {
            console.error('Error in initDashboard:', error);
        }
    }

    // Initialize map
    function initMap() {
        console.log('Initializing map...');
        try {
            map = L.map('map').setView([32.4279, 53.6880], 5); // Center of Iran

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add Iran boundary (simplified)
            addIranBoundary();
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    // Add Iran boundary to map
    function addIranBoundary() {
        // Simplified Iran boundary coordinates
        const iranBounds = [
            [44.1092, 25.0782], // Southwest
            [63.3166, 39.7816] // Northeast
        ];

        // Add a rectangle to represent Iran boundary
        L.rectangle(iranBounds, {
            color: '#0d6efd',
            weight: 2,
            fillOpacity: 0.1
        }).addTo(map);
    }

    // Load country level data
    function loadCountryData() {
        console.log('Loading country data...');
        showLoading();

        $.ajax({
            url: '/api/provinces',
            method: 'GET',
            success: function(data) {
                console.log('Data received:', data);
                currentData = data;
                currentLevel = 'country';
                displayProvinces(data);
                updateStatsPanel(calculateCountryStats(data));
                updateBreadcrumb([{
                    name: 'نقشه ایران',
                    level: 'country'
                }]);
                console.log('Country data loaded successfully');
            },
            error: function(xhr, status, error) {
                console.error('Error loading data:', error);
                showAlert('خطا در بارگذاری اطلاعات: ' + error, 'danger');
            },
            complete: function() {
                console.log('Request completed');
                hideLoading();
            }
        });
    }

    // Display provinces on map and table
    function displayProvinces(provinces) {
        console.log('Displaying provinces:', provinces);
        try {
            clearMarkers();

            const tableHeaders = `
                <th>نام استان</th>
                <th>سند تک برگ (تعداد)</th>
                <th>سند تک برگ (مساحت)</th>
                <th>سند دفترچه‌ای (تعداد)</th>
                <th>سند دفترچه‌ای (مساحت)</th>
                <th>فاقد سند (تعداد)</th>
                <th>عملیات</th>
            `;

            $('#tableHeaders').html(tableHeaders);
            $('#tableTitle').html('<i class="fas fa-table me-2"></i>جدول استان‌ها');
            $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه ایران - تقسیمات کشوری');

            let tableRows = '';

            Object.keys(provinces).forEach(provinceId => {
                const province = provinces[provinceId];
                const stats = province.stats;
                console.log('Processing province:', provinceId, province);

                // Add marker to map
                try {
                    const marker = L.marker(province.center).addTo(map);
                    const popupContent = createProvincePopup(province, provinceId);
                    marker.bindPopup(popupContent);
                    markers.push(marker);
                } catch (markerError) {
                    console.error('Error adding marker for province:', provinceId, markerError);
                }

                // Add table row
                tableRows += `
                    <tr class="province-row" data-province="${provinceId}">
                        <td><strong>${province.name}</strong></td>
                        <td class="number-format">${formatNumber(stats.single_sheet_count)}</td>
                        <td class="number-format">${formatNumber(stats.single_sheet_area)} متر مربع</td>
                        <td class="number-format">${formatNumber(stats.booklet_count)}</td>
                        <td class="number-format">${formatNumber(stats.booklet_area)} متر مربع</td>
                        <td class="number-format">${formatNumber(stats.no_document_count)}</td>
                        <td>
                            <button class="btn btn-province btn-sm" data-province="${provinceId}">
                                <i class="fas fa-eye me-1"></i>مشاهده شهرستان‌ها
                            </button>
                        </td>
                    </tr>
                `;
            });

            $('#tableBody').html(tableRows);
            console.log('Provinces displayed successfully');
        } catch (error) {
            console.error('Error displaying provinces:', error);
        }
    }

    // Create province popup content
    function createProvincePopup(province, provinceId) {
        const stats = province.stats;
        return `
            <div style="min-width: 250px;">
                <h6>${province.name}</h6>
                <table class="stats-table">
                    <tr><td>سند تک برگ:</td><td>${formatNumber(stats.single_sheet_count)} (${formatNumber(stats.single_sheet_area)} م²)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(stats.booklet_count)} (${formatNumber(stats.booklet_area)} م²)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(stats.no_document_count)}</td></tr>
                </table>
                <button class="btn btn-primary btn-sm mt-2 w-100" onclick="viewProvince('${provinceId}')">
                    <i class="fas fa-arrow-left me-1"></i>مشاهده شهرستان‌ها
                </button>
            </div>
        `;
    }

    // View province cities
    window.viewProvince = function(provinceId) {
        showLoading();

        $.ajax({
            url: `/api/province/${provinceId}/cities`,
            method: 'GET',
            success: function(data) {
                navigationStack.push({
                    level: 'country',
                    data: currentData
                });
                currentData = data;
                currentLevel = 'province';

                const provinceName = Object.values(currentData)[0] ?
                    Object.values(currentData)[0].name.split(' ')[0] : 'استان';

                displayCities(data, provinceId);
                updateBreadcrumb([{
                        name: 'نقشه ایران',
                        level: 'country'
                    },
                    {
                        name: `استان ${provinceName}`,
                        level: 'province'
                    }
                ]);

                // Update map view
                if (Object.keys(data).length > 0) {
                    const firstCity = Object.values(data)[0];
                    map.setView(firstCity.center, 8);
                }
            },
            error: function() {
                showAlert('خطا در بارگذاری اطلاعات شهرستان‌ها', 'danger');
            },
            complete: function() {
                hideLoading();
            }
        });
    };

    // Display cities
    function displayCities(cities, provinceId) {
        clearMarkers();

        const tableHeaders = `
            <th>نام شهرستان</th>
            <th>سند تک برگ (تعداد)</th>
            <th>سند تک برگ (مساحت)</th>
            <th>سند دفترچه‌ای (تعداد)</th>
            <th>سند دفترچه‌ای (مساحت)</th>
            <th>فاقد سند (تعداد)</th>
            <th>عملیات</th>
        `;

        $('#tableHeaders').html(tableHeaders);
        $('#tableTitle').html('<i class="fas fa-table me-2"></i>جدول شهرستان‌ها');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>نقشه شهرستان‌ها');

        let tableRows = '';

        Object.keys(cities).forEach(cityId => {
            const city = cities[cityId];
            const stats = city.stats;

            // Add marker to map
            const marker = L.marker(city.center).addTo(map);
            const popupContent = createCityPopup(city, cityId, provinceId);
            marker.bindPopup(popupContent);
            markers.push(marker);

            // Add table row
            tableRows += `
                <tr class="city-row" data-city="${cityId}" data-province="${provinceId}">
                    <td><strong>${city.name}</strong></td>
                    <td class="number-format">${formatNumber(stats.single_sheet_count)}</td>
                    <td class="number-format">${formatNumber(stats.single_sheet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.booklet_count)}</td>
                    <td class="number-format">${formatNumber(stats.booklet_area)} متر مربع</td>
                    <td class="number-format">${formatNumber(stats.no_document_count)}</td>
                    <td>
                        <button class="btn btn-province btn-sm" data-city="${cityId}" data-province="${provinceId}">
                            <i class="fas fa-eye me-1"></i>مشاهده موقوفات
                        </button>
                    </td>
                </tr>
            `;
        });

        $('#tableBody').html(tableRows);
        updateStatsPanel(calculateCityStats(cities));
    }

    // Create city popup content
    function createCityPopup(city, cityId, provinceId) {
        const stats = city.stats;
        return `
            <div style="min-width: 250px;">
                <h6>${city.name}</h6>
                <table class="stats-table">
                    <tr><td>سند تک برگ:</td><td>${formatNumber(stats.single_sheet_count)} (${formatNumber(stats.single_sheet_area)} م²)</td></tr>
                    <tr><td>سند دفترچه‌ای:</td><td>${formatNumber(stats.booklet_count)} (${formatNumber(stats.booklet_area)} م²)</td></tr>
                    <tr><td>فاقد سند:</td><td>${formatNumber(stats.no_document_count)}</td></tr>
                </table>
                <button class="btn btn-primary btn-sm mt-2 w-100" onclick="viewCity('${provinceId}', '${cityId}')">
                    <i class="fas fa-arrow-left me-1"></i>مشاهده موقوفات
                </button>
            </div>
        `;
    }

    // View city endowments
    window.viewCity = function(provinceId, cityId) {
        showLoading();

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowments`,
            method: 'GET',
            success: function(data) {
                navigationStack.push({
                    level: 'province',
                    data: currentData
                });
                currentData = data;
                currentLevel = 'city';

                displayEndowments(data, provinceId, cityId);

                const cityData = Object.values(navigationStack[navigationStack.length - 1].data)[cityId];
                const cityName = cityData && cityData.name ? cityData.name : 'شهر';
                updateBreadcrumb([{
                        name: 'نقشه ایران',
                        level: 'country'
                    },
                    {
                        name: 'استان',
                        level: 'province'
                    },
                    {
                        name: cityName,
                        level: 'city'
                    }
                ]);
            },
            error: function() {
                showAlert('خطا در بارگذاری اطلاعات موقوفات', 'danger');
            },
            complete: function() {
                hideLoading();
            }
        });
    };

    // Display endowments
    function displayEndowments(endowments, provinceId, cityId) {
        clearMarkers();

        const tableHeaders = `
            <th>نام موقوفه</th>
            <th>تعداد رقبات</th>
            <th>نوع موقوفه</th>
            <th>درآمد کل (ریال)</th>
            <th>عملیات</th>
        `;

        $('#tableHeaders').html(tableHeaders);
        $('#tableTitle').html('<i class="fas fa-table me-2"></i>جدول موقوفات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>موقعیت موقوفات');

        let tableRows = '';

        Object.keys(endowments).forEach(endowmentId => {
            const endowment = endowments[endowmentId];

            // Add table row
            tableRows += `
                <tr class="endowment-row" data-endowment="${endowmentId}" data-city="${cityId}" data-province="${provinceId}">
                    <td><strong>${endowment.name}</strong></td>
                    <td class="number-format">${formatNumber(endowment.properties_count)}</td>
                    <td>
                        <span class="badge ${endowment.type === 'متصرفی' ? 'bg-success' : 'bg-warning'}">${endowment.type}</span>
                    </td>
                    <td class="number-format">${formatNumber(endowment.total_income)}</td>
                    <td>
                        <button class="btn btn-province btn-sm" data-endowment="${endowmentId}" data-city="${cityId}" data-province="${provinceId}">
                            <i class="fas fa-eye me-1"></i>مشاهده رقبات
                        </button>
                    </td>
                </tr>
            `;
        });

        $('#tableBody').html(tableRows);
        updateStatsPanel(calculateEndowmentStats(endowments));
    }

    // View endowment properties
    window.viewEndowment = function(provinceId, cityId, endowmentId) {
        showLoading();

        $.ajax({
            url: `/api/province/${provinceId}/city/${cityId}/endowment/${endowmentId}/properties`,
            method: 'GET',
            success: function(data) {
                navigationStack.push({
                    level: 'city',
                    data: currentData
                });
                currentData = data;
                currentLevel = 'endowment';

                displayProperties(data, provinceId, cityId, endowmentId);

                const endowmentData = Object.values(navigationStack[navigationStack.length - 1].data)[endowmentId];
                const endowmentName = endowmentData && endowmentData.name ? endowmentData.name : 'موقوفه';
                updateBreadcrumb([{
                        name: 'نقشه ایران',
                        level: 'country'
                    },
                    {
                        name: 'استان',
                        level: 'province'
                    },
                    {
                        name: 'شهر',
                        level: 'city'
                    },
                    {
                        name: endowmentName,
                        level: 'endowment'
                    }
                ]);
            },
            error: function() {
                showAlert('خطا در بارگذاری اطلاعات رقبات', 'danger');
            },
            complete: function() {
                hideLoading();
            }
        });
    };

    // Display properties
    function displayProperties(properties) {
        clearMarkers();

        const tableHeaders = `
            <th>عنوان رقبه</th>
            <th>نوع رقبه</th>
            <th>وضعیت</th>
            <th>متصرف</th>
            <th>وضعیت اجاره نامه</th>
            <th>تاریخ انقضا</th>
        `;

        $('#tableHeaders').html(tableHeaders);
        $('#tableTitle').html('<i class="fas fa-table me-2"></i>جدول رقبات');
        $('#mapTitle').html('<i class="fas fa-map-marked-alt me-2"></i>موقعیت رقبات');

        let tableRows = '';

        Object.keys(properties).forEach(propertyId => {
            const property = properties[propertyId];

            tableRows += `
                <tr>
                    <td><strong>${property.title}</strong></td>
                    <td>${property.type}</td>
                    <td>
                        <span class="status-${property.status === 'فعال' ? 'active' : 'inactive'}">
                            ${property.status}
                        </span>
                    </td>
                    <td>${property.tenant}</td>
                    <td>
                        <span class="status-${property.lease_status === 'دارای اجاره نامه' ? 'has-lease' : 'no-lease'}">
                            ${property.lease_status}
                        </span>
                    </td>
                    <td class="number-format">${property.lease_expiry}</td>
                </tr>
            `;
        });

        $('#tableBody').html(tableRows);
        updateStatsPanel(calculatePropertyStats(properties));
    }

    // Calculate country statistics
    function calculateCountryStats(provinces) {
        let totalSingleSheet = 0,
            totalSingleSheetArea = 0;
        let totalBooklet = 0,
            totalBookletArea = 0;
        let totalNoDocument = 0;

        Object.values(provinces).forEach(province => {
            const stats = province.stats;
            totalSingleSheet += stats.single_sheet_count;
            totalSingleSheetArea += stats.single_sheet_area;
            totalBooklet += stats.booklet_count;
            totalBookletArea += stats.booklet_area;
            totalNoDocument += stats.no_document_count;
        });

        return {
            title: 'آمار کلی کشور',
            items: [{
                    label: 'موقوفات دارای سند تک برگ',
                    value: `${formatNumber(totalSingleSheet)} (${formatNumber(totalSingleSheetArea)} م²)`
                },
                {
                    label: 'موقوفات دارای سند دفترچه‌ای',
                    value: `${formatNumber(totalBooklet)} (${formatNumber(totalBookletArea)} م²)`
                },
                {
                    label: 'موقوفات فاقد سند',
                    value: formatNumber(totalNoDocument)
                },
                {
                    label: 'تعداد استان‌ها',
                    value: Object.keys(provinces).length
                }
            ]
        };
    }

    // Calculate city statistics
    function calculateCityStats(cities) {
        let totalSingleSheet = 0,
            totalSingleSheetArea = 0;
        let totalBooklet = 0,
            totalBookletArea = 0;
        let totalNoDocument = 0;

        Object.values(cities).forEach(city => {
            const stats = city.stats;
            totalSingleSheet += stats.single_sheet_count;
            totalSingleSheetArea += stats.single_sheet_area;
            totalBooklet += stats.booklet_count;
            totalBookletArea += stats.booklet_area;
            totalNoDocument += stats.no_document_count;
        });

        return {
            title: 'آمار استان',
            items: [{
                    label: 'موقوفات دارای سند تک برگ',
                    value: `${formatNumber(totalSingleSheet)} (${formatNumber(totalSingleSheetArea)} م²)`
                },
                {
                    label: 'موقوفات دارای سند دفترچه‌ای',
                    value: `${formatNumber(totalBooklet)} (${formatNumber(totalBookletArea)} م²)`
                },
                {
                    label: 'موقوفات فاقد سند',
                    value: formatNumber(totalNoDocument)
                },
                {
                    label: 'تعداد شهرستان‌ها',
                    value: Object.keys(cities).length
                }
            ]
        };
    }

    // Calculate endowment statistics
    function calculateEndowmentStats(endowments) {
        let totalEndowments = Object.keys(endowments).length;
        let totalProperties = 0;
        let totalIncome = 0;
        let motasarrefi = 0;

        Object.values(endowments).forEach(endowment => {
            totalProperties += endowment.properties_count;
            totalIncome += endowment.total_income;
            if (endowment.type === 'متصرفی') motasarrefi++;
        });

        return {
            title: 'آمار موقوفات',
            items: [{
                    label: 'تعداد موقوفات',
                    value: formatNumber(totalEndowments)
                },
                {
                    label: 'تعداد رقبات',
                    value: formatNumber(totalProperties)
                },
                {
                    label: 'درآمد کل',
                    value: `${formatNumber(totalIncome)} ریال`
                },
                {
                    label: 'موقوفات متصرفی',
                    value: `${motasarrefi} از ${totalEndowments}`
                }
            ]
        };
    }

    // Calculate property statistics
    function calculatePropertyStats(properties) {
        let totalProperties = Object.keys(properties).length;
        let activeProperties = 0;
        let hasLease = 0;

        Object.values(properties).forEach(property => {
            if (property.status === 'فعال') activeProperties++;
            if (property.lease_status === 'دارای اجاره نامه') hasLease++;
        });

        return {
            title: 'آمار رقبات',
            items: [{
                    label: 'تعداد رقبات',
                    value: formatNumber(totalProperties)
                },
                {
                    label: 'رقبات فعال',
                    value: `${activeProperties} از ${totalProperties}`
                },
                {
                    label: 'دارای اجاره نامه',
                    value: `${hasLease} از ${totalProperties}`
                },
                {
                    label: 'فاقد اجاره نامه',
                    value: `${totalProperties - hasLease} از ${totalProperties}`
                }
            ]
        };
    }

    // Update statistics panel
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

        $('#statsPanel').html(html);
    }

    // Update breadcrumb
    function updateBreadcrumb(items) {
        let html = '';
        items.forEach((item, index) => {
            if (index === items.length - 1) {
                html += `<li class="breadcrumb-item active">${item.name}</li>`;
            } else {
                html += `<li class="breadcrumb-item"><a href="#" onclick="navigateToLevel('${item.level}')">${item.name}</a></li>`;
            }
        });

        $('#breadcrumb').html(html);
        $('#backBtn').toggle(navigationStack.length > 0);
    }

    // Navigate to specific level
    window.navigateToLevel = function(level) {
        if (level === 'country') {
            navigationStack = [];
            loadCountryData();
        }
        // Add more navigation logic as needed
    };

    // Setup event handlers
    function setupEventHandlers() {
        // Back button
        $('#backBtn').click(function() {
            if (navigationStack.length > 0) {
                const previous = navigationStack.pop();
                currentData = previous.data;
                currentLevel = previous.level;

                if (currentLevel === 'country') {
                    displayProvinces(currentData);
                    updateStatsPanel(calculateCountryStats(currentData));
                    updateBreadcrumb([{
                        name: 'نقشه ایران',
                        level: 'country'
                    }]);
                } else if (currentLevel === 'province') {
                    // Handle province level back navigation
                }
            }
        });

        // Table row clicks
        $(document).on('click', '.province-row', function() {
            const provinceId = $(this).data('province');
            viewProvince(provinceId);
        });

        $(document).on('click', '.city-row', function() {
            const provinceId = $(this).data('province');
            const cityId = $(this).data('city');
            viewCity(provinceId, cityId);
        });

        $(document).on('click', '.endowment-row', function() {
            const provinceId = $(this).data('province');
            const cityId = $(this).data('city');
            const endowmentId = $(this).data('endowment');
            viewEndowment(provinceId, cityId, endowmentId);
        });

        // Button clicks
        $(document).on('click', '[data-province]:not([data-city])', function(e) {
            e.stopPropagation();
            const provinceId = $(this).data('province');
            viewProvince(provinceId);
        });

        $(document).on('click', '[data-city]', function(e) {
            e.stopPropagation();
            const provinceId = $(this).data('province');
            const cityId = $(this).data('city');
            if ($(this).data('endowment')) {
                const endowmentId = $(this).data('endowment');
                viewEndowment(provinceId, cityId, endowmentId);
            } else {
                viewCity(provinceId, cityId);
            }
        });
    }

    // Utility functions
    function clearMarkers() {
        markers.forEach(marker => {
            map.removeLayer(marker);
        });
        markers = [];
    }

    function formatNumber(num) {
        if (typeof num === 'string') return num;
        if (typeof num !== 'number') return num;

        // Simple number formatting for Persian
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function showLoading() {
        $('#loadingModal').modal('show');
    }

    function hideLoading() {
        $('#loadingModal').modal('hide');
    }

    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 80px; left: 20px; z-index: 9999; min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(alertHtml);

        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
});