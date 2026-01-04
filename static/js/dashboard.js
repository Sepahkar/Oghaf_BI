$(document).ready(function() {
    let map, mainDataTable = null, chart1_instance = null, chart2_instance = null;
    let currentLevel = 'country';
    let markers = [];

    // --- توابع کمکی ---
    function clearMap() {
        if (markers && markers.length > 0) {
            markers.forEach(m => map.removeLayer(m));
        }
        markers = [];
    }

    function hideLoading() { 
        setTimeout(() => { 
            $('#loadingModal').modal('hide'); 
            $('body').removeClass('modal-open'); 
            $('.modal-backdrop').remove(); 
        }, 300); 
    }

    function showLoading() { $('#loadingModal').modal('show'); }

    function formatArea(val) {
        if (!val) return '۰';
        if (val > 10000) return (val / 10000).toLocaleString('fa-IR') + ' هکتار';
        return val.toLocaleString('fa-IR') + ' مترمربع';
    }
    
    function formatCurrency(val) {
        return val ? val.toLocaleString('fa-IR') + ' ریال' : '۰';
    }

    function renderBadge(text) {
        let color = 'secondary';
        if (text && (text.includes('تک برگ') || text.includes('معتبر'))) color = 'success';
        if (text && (text.includes('دفترچه') || text.includes('منقضی'))) color = 'warning text-dark';
        if (text && (text.includes('فاقد') || text.includes('نامشخص'))) color = 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }

    const customMarkerIcon = L.icon({
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    // --- تنظیمات اولیه ---
    function initDashboard() {
        initMap();
        initCharts();
        setupEventHandlers();
        loadCountryData();
    }

    function initMap() {
        map = L.map('map').setView([32.4279, 53.6880], 5);
        // برای حالت آفلاین، اگر تایل محلی ندارید، لایه‌ای اضافه نکنید یا از GeoJSON استفاده کنید.
    }

    function initCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { family: 'Vazir' } } } }
        };
        const c1 = document.getElementById('chart1');
        const c2 = document.getElementById('chart2');
        if(c1) chart1_instance = new Chart(c1, { type: 'pie', data: {labels:[], datasets:[{data:[]}]}, options: commonOptions });
        if(c2) chart2_instance = new Chart(c2, { type: 'pie', data: {labels:[], datasets:[{data:[]}]}, options: commonOptions });
    }

    function initOrReloadDataTable(data, columns) {
        if ($.fn.DataTable.isDataTable('#mainDataTable')) {
            $('#mainDataTable').DataTable().destroy();
            $('#mainDataTable').empty();
        }
        
        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            language: { "url": "" /* به جای فایل خارجی، از آبجکت داخلی استفاده کنید */, "sEmptyTable": "داده‌ای یافت نشد" },
            dom: 't', 
            scrollY: '200px',
            scrollCollapse: true,
            paging: false,
            info: false,
            searching: true,
            initComplete: function() {
                const tools = $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو...">')
                    .on('keyup', function() { mainDataTable.search(this.value).draw(); })
                    .appendTo(tools);
            }
        });
    }

    function addMarkers(items, popupFn) {
        clearMap();
        let bounds = [];
        items.forEach(i => {
            if(i.lat && i.lng){
                let m = L.marker([i.lat, i.lng], {icon: customMarkerIcon}).addTo(map);
                m.bindPopup(popupFn(i));
                markers.push(m);
                bounds.push([i.lat, i.lng]);
            }
        });
        if (bounds.length > 0) map.fitBounds(bounds);
    }

    // --- توابع بارگذاری داده ---
    function loadCountryData() {
        showLoading();
        $.ajax({
            url: '/api/provinces',
            success: function(data) {
                currentLevel = 'country';
                displayProvinces(data);
                updateStats(data, 'ایران');
                updateBreadcrumb([{name: 'ایران'}]);
                $('#backBtn').hide();
            },
            error: () => alert('خطا در بارگذاری داده‌های کشور'),
            complete: hideLoading
        });
    }

    function loadCityData(pid, pname) {
        showLoading();
        $.ajax({
            url: `/api/province/${pid}/cities`,
            success: function(data) {
                currentLevel = 'province';
                displayCities(data);
                updateStats(data, pname);
                updateBreadcrumb([{name: 'ایران', action: loadCountryData}, {name: pname}]);
                $('#backBtn').show().off('click').on('click', loadCountryData);
            },
            error: () => alert('خطا در بارگذاری شهرستان‌ها'),
            complete: hideLoading
        });
    }

    function loadEndowmentData(pid, cid, cname, pname) {
        showLoading();
        $.ajax({
            url: `/api/province/${pid}/city/${cid}/endowments`,
            success: function(data) {
                currentLevel = 'city';
                displayEndowments(data);
                updateStats(data, cname, true);
                updateBreadcrumb([
                    {name: 'ایران', action: loadCountryData}, 
                    {name: pname, action: () => loadCityData(pid, pname)}, 
                    {name: cname}
                ]);
                $('#backBtn').off('click').on('click', () => loadCityData(pid, pname));
            },
            complete: hideLoading
        });
    }

    function displayProvinces(data) {
        const cols = [
            { data: 'name', title: 'استان' },
            { data: 'takbarg_count', title: 'تک‌برگ' },
            { data: 'takbarg_area', title: 'مساحت تک‌برگ', render: formatArea },
            { data: 'nosand_count', title: 'فاقد سند' },
            { data: null, title: 'عملیات', render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>` }
        ];
        initOrReloadDataTable(data, cols);
        addMarkers(data, (p) => `<div class='text-end'><b>${p.name}</b><br><button class='btn btn-xs btn-primary mt-2' onclick='window.loadCityFromMap(${p.id}, "${p.name}")'>انتخاب</button></div>`);
        $('#tableTitle').html('لیست استان‌ها');
    }

    // این تابع برای هندل کردن کلیک از داخل پاپ‌آپ نقشه است
    window.loadCityFromMap = (id, name) => loadCityData(id, name);

    function displayCities(data) {
        const cols = [
            { data: 'name', title: 'شهرستان' },
            { data: 'lost_revenue', title: 'درآمد از دست رفته', render: formatCurrency },
            { data: null, title: 'عملیات', render: () => `<button class="btn btn-sm btn-info text-white btn-view-endowments">موقوفات</button>` }
        ];
        initOrReloadDataTable(data, cols);
        addMarkers(data, (c) => `<b>${c.name}</b>`);
        $('#tableTitle').html('لیست شهرستان‌ها');
    }

    function displayEndowments(data) {
        const cols = [
            { data: 'name', title: 'موقوفه' },
            { data: 'document_status', title: 'وضعیت سند', render: renderBadge },
            { data: 'total_income', title: 'درآمد فعلی', render: formatCurrency }
        ];
        initOrReloadDataTable(data, cols);
        addMarkers(data, (e) => `<b>${e.name}</b>`);
        $('#tableTitle').html('لیست موقوفات');
    }

    function updateStats(data, title, isEndowLevel=false) {
        let totalLost = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        $('#lostRevenueValue').text(formatCurrency(totalLost));
        
        let sumCount = [0,0,0], sumArea = [0,0,0];
        data.forEach(x => {
            if(x.charts && x.charts.by_count) x.charts.by_count.forEach((v,i) => sumCount[i]+=v);
            if(x.charts && x.charts.by_area) x.charts.by_area.forEach((v,i) => sumArea[i]+=v);
        });
        
        updateChart(chart1_instance, ['تک برگ','دفترچه','فاقد'], sumCount);
        updateChart(chart2_instance, ['تک برگ','دفترچه','فاقد'], sumArea);
    }

    function updateChart(chart, labels, data) {
        if(!chart) return;
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = ['#28a745', '#ffc107', '#dc3545'];
        chart.update();
    }

    function updateBreadcrumb(steps) {
        const bc = $('#breadcrumb').empty();
        steps.forEach((step, i) => {
            const isLast = i === steps.length - 1;
            const li = $(`<li class="breadcrumb-item ${isLast ? 'active' : ''}"></li>`);
            if (step.action && !isLast) {
                $('<a href="#"></a>').text(step.name).on('click', (e) => { e.preventDefault(); step.action(); }).appendTo(li);
            } else {
                li.text(step.name);
            }
            bc.append(li);
        });
    }

    function setupEventHandlers() {
        $('#mainDataTable').on('click', '.btn-view-cities', function() {
            const data = mainDataTable.row($(this).parents('tr')).data();
            loadCityData(data.id, data.name);
        });
        
        $('#mainDataTable').on('click', '.btn-view-endowments', function() {
            const data = mainDataTable.row($(this).parents('tr')).data();
            // پیدا کردن نام استان از روی Breadcrumb یا ذخیره آن در مرحله قبل
            const pname = $('#breadcrumb li:nth-child(2)').text(); 
            loadEndowmentData(data.province_id, data.id, data.name, pname);
        });
    }

    function initMap() {
        // ایجاد نقشه و تنظیم نمای اولیه روی مرکز ایران
        map = L.map('map').setView([32.4279, 53.6880], 5);
    
        // بارگذاری فایل GeoJSON استان‌ها
        $.getJSON('/static/iran_provinces.json', function(data) {
            L.geoJSON(data, {
                style: {
                    color: "#2c3e50", 
                    weight: 1.5,
                    fillColor: "#f8f9fa",
                    fillOpacity: 0.4
                },
                onEachFeature: function (feature, layer) {
                    // نمایش نام استان در تولتیپ
                    const provinceName = feature.properties.name || feature.properties.NAME_1;
                    layer.bindTooltip(provinceName, { direction: 'center', permanent: false });
    
                    // --- قابلیت کلیک تعاملی ---
                    layer.on('click', function (e) {
                        // پیدا کردن ID استان از روی دیتابیس با استفاده از نام آن
                        // ما در اینجا فرض می‌کنیم دیتای استان‌ها قبلاً لود شده است
                        const provinceData = allProvincesData.find(p => p.name === provinceName);
                        
                        if (provinceData) {
                            loadCityData(provinceData.id, provinceData.name);
                        } else {
                            console.warn("استان یافت نشد: " + provinceName);
                        }
                    });
    
                    // تغییر رنگ هنگام حرکت موس (Hover)
                    layer.on('mouseover', function () { this.setStyle({ fillOpacity: 0.7, fillColor: "#d1ecf1" }); });
                    layer.on('mouseout', function () { this.setStyle({ fillOpacity: 0.4, fillColor: "#f8f9fa" }); });
                }
            }).addTo(map);
        });
    }
    
    // برای اینکه بتوانیم در نقشه به IDها دسترسی داشته باشیم، 
    // یک متغیر سراسری برای ذخیره دیتای دریافتی از API تعریف می‌کنیم
    let allProvincesData = [];
    
    function loadCountryData() {
        showLoading();
        $.ajax({
            url: '/api/provinces',
            success: function(data) {
                allProvincesData = data; // ذخیره دیتا برای استفاده در نقشه
                currentLevel = 'country';
                displayProvinces(data);
                updateStats(data, 'ایران');
                updateBreadcrumb([{name: 'ایران'}]);
                $('#backBtn').hide();
            },
            complete: hideLoading
        });
    }


    initDashboard();
});