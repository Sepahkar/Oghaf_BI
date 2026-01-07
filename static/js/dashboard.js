$(document).ready(function() {
    // --- ۱. تعریف متغیرهای سراسری و تنظیمات اولیه ---
    let map, mainDataTable = null,
        chart1_instance = null,
        chart2_instance = null;
    let currentLevel = 'country',
        navigationStack = [],
        markers = [],
        allProvincesData = [];

    // تنظیم مسیر آیکون‌های Leaflet برای حالت آفلاین (جلوگیری از ناپدید شدن پین‌ها)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/static/images/marker-icon.png',
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
    });

    const customMarkerIcon = L.icon({
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    // --- ۲. توابع مدیریت رابط کاربری و لودینگ ---
    function showLoading() {
        $('#loadingModal').modal('show');
    }

    function hideLoading() {
        setTimeout(() => {
            $('#loadingModal').modal('hide');
            // حل مشکل اسکرول کل صفحه با حذف کلاس قفل‌کننده بدنه
            $('body').removeClass('modal-open').css('overflow', 'auto');
            $('.modal-backdrop').remove();
        }, 300);
    }

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

    // --- ۳. مدیریت نقشه و نمودارها ---
    function initMap() {
        map = L.map('map').setView([32.4279, 53.6880], 5);
        // بارگذاری مرز استان‌ها از فایل محلی برای حالت آفلاین
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
                    // قابلیت کلیک روی نقشه برای ورود به سطح استان
                    layer.on('click', function(e) {
                        L.DomEvent.stopPropagation(e);
                        const pData = allProvincesData.find(p => p.name.trim() === pName);
                        if (pData) loadCityData(pData.id, pData.name);
                    });
                }
            }).addTo(map);
        }).fail(() => console.error("فایل iran_provinces.json پیدا نشد!"));
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
        const c1 = $('#chart1')[0];
        const c2 = $('#chart2')[0];
        if (c1) chart1_instance = new Chart(c1, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: []
                }]
            },
            options: commonOptions
        });
        if (c2) chart2_instance = new Chart(c2, {
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

    // --- ۴. مدیریت جداول DataTables (حل مشکل اسکرول) ---
    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) {
            mainDataTable.destroy();
            $('#mainDataTable').empty();
        }

        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            language: {
                "sEmptyTable": "داده‌ای موجود نیست"
            },
            dom: 't',
            scrollY: '300px', // ارتفاع ثابت برای فعال شدن اسکرول داخلی جدول
            scrollCollapse: true,
            paging: false,
            searching: true,
            initComplete: function() {
                const tools = $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 150px;">')
                    .on('keyup', function() {
                        mainDataTable.search(this.value).draw();
                    })
                    .appendTo(tools);
            }
        });
    }

    function addMarkers(items, popupFn) {
        if (markers.length > 0) {
            markers.forEach(m => map.removeLayer(m));
        }
        markers = [];
        let bounds = [];
        items.forEach(i => {
            if (i.lat && i.lng) {
                let m = L.marker([i.lat, i.lng], {
                    icon: customMarkerIcon
                }).addTo(map);
                m.bindPopup(popupFn(i));
                markers.push(m);
                bounds.push([i.lat, i.lng]);
            }
        });
        if (bounds.length > 0) map.fitBounds(bounds);
    }

    // --- ۵. توابع بارگذاری داده‌ها (API) ---
    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = [];
        $('#backBtn').hide();

        $.get('/api/provinces', function(data) {
            allProvincesData = data;
            const cols = [{
                    data: 'name',
                    title: 'استان'
                },
                {
                    data: 'takbarg_count',
                    title: 'تک‌برگ(ت)'
                },
                {
                    data: 'nosand_count',
                    title: 'فاقد(ت)'
                },
                {
                    data: 'nosand_area',
                    title: 'فاقد(م)',
                    render: formatArea
                },
                {
                    data: null,
                    title: 'عملیات',
                    orderable: false,
                    render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'آمار کلی کشور');
            updateBreadcrumb([]);
            addMarkers(data, (p) => `<div class="text-end"><h6>${p.name}</h6><button class="btn btn-sm btn-primary w-100 popup-btn-cities" data-id="${p.id}" data-name="${p.name}">مشاهده شهرها</button></div>`);
        }).always(hideLoading);
    }

    function loadCityData(pid, pname) {
        showLoading();
        if (currentLevel === 'country') navigationStack = [{
            fn: loadCountryData,
            name: "ایران"
        }];
        currentLevel = 'province';
        $('#backBtn').show();

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
                    orderable: false,
                    render: () => `<button class="btn btn-sm btn-info text-white btn-view-endowments">موقوفات</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, pname);
            updateBreadcrumb([{
                name: pname,
                fn: () => loadCityData(pid, pname)
            }]);
            addMarkers(data, (c) => `<div class="text-end"><h6>${c.name}</h6><button class="btn btn-sm btn-info text-white w-100 popup-btn-endowments" data-pid="${pid}" data-id="${c.id}" data-name="${c.name}">مشاهده موقوفات</button></div>`);
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
                    data: 'raqabat_count',
                    title: 'تعداد رقبات'
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
            updateBreadcrumb([{
                name: "استان",
                fn: () => loadCountryData()
            }, {
                name: cname
            }]);
            addMarkers(data, (d) => `<div class="text-end"><h6>${d.name}</h6><button class="btn btn-sm btn-warning w-100 popup-btn-properties" data-pid="${pid}" data-cid="${cid}" data-id="${d.id}" data-name="${d.name}">مشاهده رقبات</button></div>`);
        }).always(hideLoading);
    }

    function loadPropertyData(pid, cid, eid, ename) {
        showLoading();
        currentLevel = 'endowment';
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
                updateChart(chart1_instance, ['تک برگ', 'دفترچه', 'فاقد'], data.charts.doc_status);
                updateChart(chart2_instance, ['معتبر', 'منقضی', 'نامشخص'], data.charts.prop_status);
            }
            updateBreadcrumb([{
                name: "شهرستان",
                fn: () => loadCityData(pid, "")
            }, {
                name: ename
            }]);
            if (markers.length > 0) {
                markers.forEach(m => map.removeLayer(m));
            }
        }).always(hideLoading);
    }

    // --- ۶. مدیریت آمار و تعاملات ---
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
            updateChart(chart1_instance, ['تک برگ', 'دفترچه', 'فاقد'], sumCount);
            updateChart(chart2_instance, ['تک برگ', 'دفترچه', 'فاقد'], sumArea);
        }
    }

    function updateChart(chart, labels, data) {
        if (!chart) return;
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = ['#28a745', '#ffc107', '#dc3545'];
        chart.update();
    }

    function updateBreadcrumb(items = []) {
        const bc = $('#breadcrumb').empty();
        const addLi = (name, fn, active) => {
            const li = $(`<li class="breadcrumb-item ${active ? 'active' : ''}"></li>`);
            if (!active && fn) {
                $('<a href="#"></a>').text(name).on('click', function(e) {
                    e.preventDefault();
                    fn();
                }).appendTo(li);
            } else {
                li.text(name);
            }
            bc.append(li);
        };
        addLi('ایران', loadCountryData, items.length === 0);
        items.forEach((it, i) => addLi(it.name, it.fn, i === items.length - 1));
    }

    function setupEventHandlers() {
        $('#backBtn').on('click', function() {
            if (navigationStack.length) navigationStack.pop().fn();
        });

        // حل مشکل کلیک دکمه‌های جدول با Delegation
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

        // کلیک روی دکمه‌های پاپ‌آپ نقشه
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

    // --- ۷. اجرای نهایی ---
    initMap();
    initCharts();
    setupEventHandlers();
    loadCountryData();
});