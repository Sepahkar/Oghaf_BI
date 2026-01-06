$(document).ready(function() {
    let map, mainDataTable = null, chart1_instance = null, chart2_instance = null;
    let allProvincesData = [];

    // --- تنظیمات اولیه نقشه و نمودار ---
    function initDashboard() {
        initMap();
        initCharts();
        loadCountryData();
    }

    function initMap() {
        map = L.map('map').setView([32.4279, 53.6880], 5);
        // لود نقشه آفلاین
        $.getJSON('/static/iran_provinces.json', function(data) {
            L.geoJSON(data, {
                style: { color: "#2c3e50", weight: 1.5, fillColor: "#ffffff", fillOpacity: 0.2 },
                onEachFeature: function (feature, layer) {
                    const pName = feature.properties.name || feature.properties.NAME_1;
                    layer.bindTooltip(pName);
                    layer.on('click', function() {
                        const pData = allProvincesData.find(p => p.name === pName);
                        if (pData) loadCityData(pData.id, pData.name);
                    });
                }
            }).addTo(map);
        }).fail(function() { console.error("فایل iran_provinces.json یافت نشد!"); });
    }

    function initCharts() {
        const opt = { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'bottom', labels: { font: { family: 'Vazirmatn' } } } } 
        };
        // استفاده از jQuery برای انتخاب المنت
        const ctx1 = $('#chart1')[0];
        const ctx2 = $('#chart2')[0];
        if(ctx1) chart1_instance = new Chart(ctx1, { type: 'pie', data: { labels: ['تک برگ', 'دفترچه', 'فاقد'], datasets: [{ data: [0,0,0], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }] }, options: opt });
        if(ctx2) chart2_instance = new Chart(ctx2, { type: 'pie', data: { labels: ['تک برگ', 'دفترچه', 'فاقد'], datasets: [{ data: [0,0,0], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }] }, options: opt });
    }

    // --- توابع کمکی ---
    function showLoading() { $('#loadingModal').modal('show'); }
    function hideLoading() { setTimeout(() => { $('#loadingModal').modal('hide'); }, 300); }
    
    function formatCurrency(val) { return val ? val.toLocaleString('fa-IR') + ' ریال' : '۰'; }
    function formatArea(val) { return val ? (val > 10000 ? (val / 10000).toLocaleString('fa-IR') + ' هکتار' : val.toLocaleString('fa-IR') + ' م.م') : '۰'; }

    // --- مدیریت جداول (حل مشکل اسکرول) ---
    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) {
            mainDataTable.destroy();
            $('#mainDataTable').empty();
        }
        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            dom: 't',
            scrollY: '250px', // مقدار اسکرول عمودی
            scrollCollapse: true,
            paging: false,
            searching: true,
            language: { "sEmptyTable": "داده‌ای یافت نشد" },
            initComplete: function() {
                $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو...">')
                    .on('keyup', function() { mainDataTable.search(this.value).draw(); })
                    .appendTo('#tableTools');
            }
        });
    }

    // --- بارگذاری داده‌ها (API) ---
    function loadCountryData() {
        showLoading();
        $.get('/api/provinces', function(data) {
            allProvincesData = data;
            const cols = [
                { data: 'name', title: 'استان' },
                { data: 'takbarg_count', title: 'تک‌برگ(ت)' },
                { data: 'nosand_count', title: 'فاقد(ت)' },
                { data: 'nosand_area', title: 'فاقد(م)', render: formatArea },
                { data: null, title: 'عملیات', render: () => '<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>' }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'ایران');
            updateBreadcrumb([]);
            $('#backBtn').hide();
        }).always(hideLoading);
    }

    function loadCityData(pid, pname) {
        showLoading();
        $.get(`/api/province/${pid}/cities`, function(data) {
            const cols = [
                { data: 'name', title: 'شهرستان' },
                { data: 'lost_revenue', title: 'درآمد از دست رفته', render: formatCurrency },
                { data: null, title: 'عملیات', render: () => '<button class="btn btn-sm btn-info text-white btn-view-endowments">موقوفات</button>' }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, pname);
            updateBreadcrumb([{ name: pname, fn: () => loadCityData(pid, pname) }]);
            $('#backBtn').show().off('click').on('click', loadCountryData);
        }).always(hideLoading);
    }

    function loadEndowmentData(pid, cid, cname) {
        showLoading();
        $.get(`/api/province/${pid}/city/${cid}/endowments`, function(data) {
            const cols = [
                { data: 'name', title: 'موقوفه' },
                { data: 'total_income', title: 'درآمد', render: formatCurrency },
                { data: null, title: 'عملیات', render: (d,t,r) => `<button class="btn btn-warning btn-sm btn-view-properties" data-pid="${pid}" data-cid="${cid}" data-id="${r.id}" data-name="${r.name}">رقبات</button>` }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, cname, true);
            updateBreadcrumb([{ name: 'استان', fn: () => loadCountryData() }, { name: cname }]);
            $('#backBtn').off('click').on('click', () => loadCityData(pid, ''));
        }).always(hideLoading);
    }

    function loadPropertyData(pid, cid, eid, ename) {
        showLoading();
        $.get(`/api/province/${pid}/city/${cid}/endowment/${eid}/properties`, function(data) {
            const cols = [
                { data: 'title', title: 'عنوان' },
                { data: 'land_use', title: 'کاربری' },
                { data: 'area', title: 'مساحت', render: formatArea },
                { data: 'lease_amount', title: 'مبلغ اجاره', render: formatCurrency }
            ];
            initOrReloadDataTable(data.properties, cols);
            $('#lostRevenueValue').text(formatCurrency(data.lost_revenue));
            if(data.charts) {
                chart1_instance.data.datasets[0].data = data.charts.doc_status;
                chart1_instance.update();
                chart2_instance.data.datasets[0].data = data.charts.prop_status;
                chart2_instance.update();
            }
            updateBreadcrumb([{ name: 'شهرستان', fn: () => loadCityData(pid, '') }, { name: ename }]);
            $('#backBtn').off('click').on('click', () => loadEndowmentData(pid, cid, ''));
        }).always(hideLoading);
    }

    // --- مدیریت آمار و نمودارها (حل مشکل عدم نمایش آمار) ---
    function updateStats(data, title, isEndowLevel = false) {
        let totalLost = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        $('#lostRevenueValue').text(formatCurrency(totalLost));
        
        if(!isEndowLevel) {
            let sumCount = [0, 0, 0], sumArea = [0, 0, 0];
            data.forEach(x => {
                if(x.charts) {
                    sumCount[0] += x.charts.by_count[0];
                    sumCount[1] += x.charts.by_count[1];
                    sumCount[2] += x.charts.by_count[2];
                    sumArea[0] += x.charts.by_area[0];
                    sumArea[1] += x.charts.by_area[1];
                    sumArea[2] += x.charts.by_area[2];
                }
            });
            chart1_instance.data.datasets[0].data = sumCount;
            chart1_instance.update();
            chart2_instance.data.datasets[0].data = sumArea;
            chart2_instance.update();
        }
    }

    function updateBreadcrumb(items) {
        const bc = $('#breadcrumb').empty();
        const addLi = (name, fn, active) => {
            const li = $(`<li class="breadcrumb-item ${active ? 'active' : ''}"></li>`);
            if(!active && fn) {
                $('<a href="#"></a>').text(name).on('click', function(e) { e.preventDefault(); fn(); }).appendTo(li);
            } else {
                li.text(name);
            }
            bc.append(li);
        };
        addLi('ایران', loadCountryData, items.length === 0);
        items.forEach((it, i) => addLi(it.name, it.fn, i === items.length - 1));
    }

    // --- مدیریت رویدادها (Event Delegation) ---
    $(document).on('click', '.btn-view-cities', function() {
        const d = mainDataTable.row($(this).closest('tr')).data();
        loadCityData(d.id, d.name);
    });

    $(document).on('click', '.btn-view-endowments', function() {
        const d = mainDataTable.row($(this).closest('tr')).data();
        loadEndowmentData(d.province_id, d.id, d.name);
    });

    $(document).on('click', '.btn-view-properties', function() {
        const btn = $(this);
        loadPropertyData(btn.data('pid'), btn.data('cid'), btn.data('id'), btn.data('name'));
    });

    initDashboard();
});