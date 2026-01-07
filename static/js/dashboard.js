$(document).ready(function() {
    // --- متغیرهای سراسری ---
    let map, mainDataTable = null,
        chart1_instance = null,
        chart2_instance = null;
    let currentLevel = 'country',
        navigationStack = [],
        markers = [],
        allProvincesData = [];

    // --- تنظیمات آیکون نقشه برای حالت آفلاین ---
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/static/images/marker-icon.png',
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
    });

    // --- توابع کمکی ---
    function clearMap() {
        if (markers.length > 0) {
            markers.forEach(m => map.removeLayer(m));
        }
        markers = [];
    }

    // --- توابع مدیریت لودینگ و اسکرول ---
    function hideLoading() {
        setTimeout(() => {
            $('#loadingModal').modal('hide');
            $('body').removeClass('modal-open').css('overflow', 'auto'); // باز کردن قفل اسکرول
            $('.modal-backdrop').remove();
        }, 300);
    }

    function showLoading() {
        $('#loadingModal').modal('show');
    }
    // --- توابع کمکی فرمت‌دهی ---
    function formatArea(val) {
        return val ? (val > 10000 ? (val / 10000).toLocaleString('fa-IR') + ' هکتار' : val.toLocaleString('fa-IR') + ' م.م') : '۰';
    }

    function formatCurrency(val) {
        return val ? val.toLocaleString('fa-IR') + ' ریال' : '۰';
    }

    function renderBadge(text) {
        let color = (text && (text.includes('تک برگ') || text.includes('معتبر'))) ? 'success' : (text && (text.includes('دفترچه') || text.includes('منقضی'))) ? 'warning text-dark' : 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }
    // --- تنظیمات اولیه داشبورد ---
    function initDashboard() {
        initMap();
        initCharts();
        setupEventHandlers();
        loadCountryData();

        // فعال‌سازی Tooltips
        $('[data-bs-toggle="tooltip"]').each(function() {
            new bootstrap.Tooltip(this);
        });
    }
    // --- مدیریت نقشه و کلیک روی استان‌ها ---
    function initMap() {
        map = L.map('map').setView([32.4279, 53.6880], 5);
        $.getJSON('/static/iran_provinces.json', function(data) {
            L.geoJSON(data, {
                style: {
                    color: "#2c3e50",
                    weight: 1.5,
                    fillColor: "#ffffff",
                    fillOpacity: 0.2
                },
                onEachFeature: function(feature, layer) {
                    const pName = (feature.properties.name || feature.properties.NAME_1 || "").trim();
                    layer.bindTooltip(pName);
                    layer.on('click', function(e) {
                        L.DomEvent.stopPropagation(e);
                        const pData = allProvincesData.find(p => p.name.trim() === pName);
                        if (pData) loadCityData(pData.id, pData.name);
                    });
                }
            }).addTo(map);
        }).fail(() => console.warn("فایل iran_provinces.json لود نشد."));
    }

    function initCharts() {
        const commonOptions = {
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
        const ctx1 = $('#chart1')[0];
        const ctx2 = $('#chart2')[0];
        if (ctx1) chart1_instance = new Chart(ctx1, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: []
                }]
            },
            options: commonOptions
        });
        if (ctx2) chart2_instance = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: []
                }]
            },
            options: commonOptions
        });
    }

    // --- مدیریت جداول (حل مشکل اسکرول داخلی) ---
    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) {
            mainDataTable.destroy();
            $('#mainDataTable').empty();
        }
        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            dom: 't',
            scrollY: '250px',
            scrollCollapse: true, // فعال سازی اسکرول جدول
            paging: false,
            searching: true,
            language: {
                "sEmptyTable": "داده‌ای یافت نشد"
            },
            initComplete: function() {
                $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 150px;">')
                    .on('keyup', function() {
                        mainDataTable.search(this.value).draw();
                    }).appendTo('#tableTools');
            }
        });
    }

    function addMarkers(items, popupFn) {
        clearMap();
        let bounds = [];
        items.forEach(i => {
            if (i.lat && i.lng) {
                let m = L.marker([i.lat, i.lng]).addTo(map);
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
        currentLevel = 'country';
        $.get('/api/provinces', function(data) {
            allProvincesData = data;
            const cols = [{
                    data: 'name',
                    title: 'استان'
                },
                {
                    data: 'takbarg_count',
                    title: 'تک‌برگ'
                },
                {
                    data: 'nosand_count',
                    title: 'فاقد سند'
                },
                {
                    data: null,
                    title: 'عملیات',
                    render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'ایران');
            updateBreadcrumb();
            $('#backBtn').hide();
        }).always(hideLoading);
    }

    function loadCityData(pid, pname) {
        showLoading();
        $.get(`/api/province/${pid}/cities`, function(data) {
            const cols = [{
                    data: 'name',
                    title: 'شهرستان'
                },
                {
                    data: 'lost_revenue',
                    title: 'درآمد از دست رفته',
                    render: formatCurrency
                },
                {
                    data: null,
                    title: 'عملیات',
                    render: () => `<button class="btn btn-sm btn-info text-white btn-view-endowments">موقوفات</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, pname);
            updateBreadcrumb({
                name: pname,
                fn: () => loadCityData(pid, pname)
            });
            $('#backBtn').show().off('click').on('click', loadCountryData);
        }).always(hideLoading);
    }

    function loadEndowmentData(pid, cid, cname) {
        showLoading();
        currentLevel = 'city';
        $.get(`/api/province/${pid}/city/${cid}/endowments`, function(data) {
            const cols = [{
                    data: 'name',
                    title: 'موقوفه'
                },
                {
                    data: 'document_status',
                    title: 'سند',
                    render: renderBadge
                },
                {
                    data: 'total_income',
                    title: 'درآمد',
                    render: formatCurrency
                },
                {
                    data: null,
                    title: 'عملیات',
                    orderable: false,
                    render: (d, t, r) => `<button class="btn btn-warning btn-sm btn-view-properties" data-pid="${pid}" data-cid="${cid}" data-id="${r.id}" data-name="${r.name}">رقبات</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, cname, true);
            updateBreadcrumb({
                name: "استان",
                fn: () => loadCityData(pid, "")
            }, {
                name: cname
            });
            addMarkers(data, (d) => `<div class="text-end"><h6>${d.name}</h6><button class="btn btn-sm btn-warning w-100 popup-btn-properties" data-pid="${pid}" data-cid="${cid}" data-id="${d.id}" data-name="${d.name}">مشاهده رقبات</button></div>`);
        }).always(hideLoading);
    }

    function loadPropertyData(pid, cid, eid, ename) {
        showLoading();
        $.get(`/api/province/${pid}/city/${cid}/endowment/${eid}/properties`, function(data) {
            const cols = [{
                    data: 'title',
                    title: 'عنوان'
                },
                {
                    data: 'land_use',
                    title: 'کاربری'
                },
                {
                    data: 'area',
                    title: 'مساحت',
                    render: formatArea
                },
                {
                    data: 'lease_amount',
                    title: 'مبلغ اجاره',
                    render: formatCurrency
                }
            ];
            initOrReloadDataTable(data.properties, cols);
            $('#lostRevenueValue').text(formatCurrency(data.lost_revenue));
            if (data.charts) {
                chart1_instance.data.labels = ['تک برگ', 'دفترچه', 'فاقد'];
                chart1_instance.data.datasets[0].data = data.charts.doc_status;
                chart1_instance.update();
                chart2_instance.data.labels = ['معتبر', 'منقضی', 'نامشخص'];
                chart2_instance.data.datasets[0].data = data.charts.prop_status;
                chart2_instance.update();
            }
            updateBreadcrumb({
                name: "موقوفه",
                fn: () => loadEndowmentData(pid, cid, "")
            }, {
                name: ename
            });
            clearMap();
        }).always(hideLoading);
    }



    // --- آمار و نمودارها ---
    function updateStats(data, title, isEndowLevel = false) {
        let totalLost = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        $('#lostRevenueValue').text(formatCurrency(totalLost));
        $('#tableTitle').html(`<i class="fas fa-list me-2 text-primary"></i>${title}`);

        if (!isEndowLevel) {
            let sumCount = [0, 0, 0],
                sumArea = [0, 0, 0];
            data.forEach(x => {
                if (x.charts) {
                    x.charts.by_count.forEach((v, i) => sumCount[i] += v);
                    x.charts.by_area.forEach((v, i) => sumArea[i] += v);
                }
            });
            chart1_instance.data.labels = ['تک برگ', 'دفترچه', 'فاقد'];
            chart1_instance.data.datasets[0].data = sumCount;
            chart1_instance.data.datasets[0].backgroundColor = ['#28a745', '#ffc107', '#dc3545'];
            chart1_instance.update();

            chart2_instance.data.labels = ['تک برگ', 'دفترچه', 'فاقد'];
            chart2_instance.data.datasets[0].data = sumArea;
            chart2_instance.data.datasets[0].backgroundColor = ['#28a745', '#ffc107', '#dc3545'];
            chart2_instance.update();
        }
    }
    // --- اصلاح Breadcrumb (حل مشکل کرش کردن) ---
    function updateBreadcrumb(items = []) {
        const bc = $('#breadcrumb').empty();
        const addLi = (name, fn, active) => {
            const li = $(`<li class="breadcrumb-item ${active ? 'active' : ''}"></li>`);
            if (!active && fn) $('<a href="#"></a>').text(name).on('click', (e) => {
                e.preventDefault();
                fn();
            }).appendTo(li);
            else li.text(name);
            bc.append(li);
        };
        addLi('ایران', loadCountryData, !items.name);
        if (items.name) addLi(items.name, items.fn, true);
    }
    // --- مدیریت رویدادها (حل مشکل کلیک دکمه‌های جدول و نقشه) ---
    function setupEventHandlers() {
        $('#backBtn').on('click', function() {
            if (navigationStack.length) navigationStack.pop().fn();
        });

        // کلیک روی دکمه‌های جدول (Event Delegation)
        $(document).on('click', '.btn-view-cities', function() {
            // پیدا کردن نزدیک‌ترین ردیف به دکمه کلیک شده
            var tr = $(this).closest('tr');
            // دریافت داده‌های آن ردیف از اینستنس DataTable
            const data = mainDataTable.row(tr).data();

            if (data) {
                loadCityData(data.id, data.name);
            }
        });

        $(document).on('click', '.btn-view-endowments', function() {
            const data = mainDataTable.row($(this).closest('tr')).data();
            loadEndowmentData(data.province_id, data.id, data.name);
        });

        $(document).on('click', '.btn-view-properties', function() {
            const btn = $(this);
            loadPropertyData(btn.data('pid'), btn.data('cid'), btn.data('id'), btn.data('name'));
        });

        // کلیک روی دکمه‌های داخل پاپ‌آپ نقشه
        $(document).on('click', '.popup-btn-cities', function() {
            loadCityData($(this).data('id'), $(this).data('name'));
        });
        $(document).on('click', '.popup-btn-endowments', function() {
            loadEndowmentData($(this).data('pid'), $(this).data('id'), $(this).data('name'));
        });
        $(document).on('click', '.popup-btn-properties', function() {
            loadPropertyData($(this).data('pid'), $(this).data('cid'), $(this).data('id'), $(this).data('name'));
        });
    }

    initDashboard();
});