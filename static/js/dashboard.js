// تنظیمات مربوط به دسته‌بندی درآمد از دست رفته (اعداد به ریال هستند)
const REVENUE_SETTINGS = {
    LOW: {
        max: 30000000000,
        color: '#28a745',
        label: 'کم'
    }, // تا ۳۰ میلیارد - سبز
    MEDIUM: {
        max: 70000000000,
        color: '#ffc107',
        label: 'متوسط'
    }, // ۳۰ تا ۷۰ میلیارد - زرد
    HIGH: {
        color: '#dc3545',
        label: 'زیاد'
    } // بالای ۷۰ میلیارد - قرمز
};

// متغیری برای ذخیره لایه GeoJSON جهت دسترسی بعدی
let provinceGeoLayer = null;
$(document).ready(function() {
    // --- ۱. متغیرهای سراسری و تنظیمات اولیه ---
    let map, mainDataTable = null,
        chart1_instance = null,
        chart2_instance = null;
    let currentLevel = 'country',
        navigationStack = [],
        markers = [],
        allProvincesData = [];

    // تنظیم مسیر آیکون‌های Leaflet برای حالت آفلاین
    const customMarkerIcon = L.icon({
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    // --- ۲. توابع مدیریت رابط کاربری و لودینگ (نسخه ضد قفل) ---
    function showLoading() {
        $('#loadingModal').modal('show');
    }

    function hideLoading() {
        setTimeout(() => {
            const modalEl = $('#loadingModal');
            modalEl.modal('hide');
            // باز کردن اجباری اسکرول صفحه و حذف لایه‌های تیره
            $('body').removeClass('modal-open').css('overflow', 'auto');
            $('.modal-backdrop').remove();
        }, 400);
    }

    function formatArea(val) {
        if (!val) return '۰';
        if (val > 10000) return (val / 10000).toLocaleString('fa-IR') + ' هکتار';
        return val.toLocaleString('fa-IR') + ' م.م';
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

    // --- ۳. توابع ساخت پاپ‌آپ ---

    function createGenericPopup(title, content, btnText, btnClass, id, extraAttr = "") {
        return `
            <div class="text-end" style="min-width: 200px;">
                <h6 class="border-bottom pb-2 fw-bold text-primary">${title}</h6>
                <div class="my-2 small">${content}</div>
                <button class="btn btn-sm btn-primary w-100 ${btnClass}" data-id="${id}" data-name="${title}" ${extraAttr}>
                    ${btnText}
                </button>
            </div>`;
    }

    // پاپ‌آپ کامل استان با آمار دقیق
    function createProvincePopup(p) {
        const info = `
            <div class="mb-1"><b>سند تک‌برگ:</b> ${p.takbarg_count.toLocaleString('fa-IR')} مورد</div>
            <div class="mb-1"><b>سند دفترچه‌ای:</b> ${p.daftarchei_count.toLocaleString('fa-IR')} مورد</div>
            <div class="mb-1"><b>فاقد سند:</b> ${p.nosand_count.toLocaleString('fa-IR')} مورد</div>
            <hr class="my-1">
            <div class="text-danger fw-bold"><b>زیان احتمالی:</b><br>${formatCurrency(p.lost_revenue)}</div>
        `;
        return createGenericPopup(p.name, info, "مشاهده شهرستان‌ها", "popup-btn-cities", p.id);
    }

    function createCityPopup(c) {
        const info = `<div class="text-danger"><b>درآمد از دست رفته:</b><br>${formatCurrency(c.lost_revenue)}</div>`;
        return createGenericPopup(c.name, info, "مشاهده موقوفات", "popup-btn-endowments", c.id);
    }

    function updateMapColors() {
        if (!provinceGeoLayer || !allProvincesData.length) return;

        provinceGeoLayer.eachLayer(function(layer) {
            const pName = (layer.feature.properties.name || layer.feature.properties.NAME_1 || "").trim();
            const pData = allProvincesData.find(p => p.name.trim() === pName);

            if (pData) {
                const color = getColorByRevenue(pData.lost_revenue);
                layer.setStyle({
                    fillColor: color,
                    fillOpacity: 0.6
                });
            }
        });
    }

    // --- ۴. تنظیمات نقشه و نمودار ---
    function initMap() {
        if (map) return;
        map = L.map('map').setView([32.4279, 53.6880], 5);

        // بارگذاری فایل GeoJSON استان‌ها
        $.getJSON('/static/iran_provinces.json', function(data) {
            provinceGeoLayer = L.geoJSON(data, {
                style: {
                    color: "#2c3e50",
                    weight: 1.5,
                    fillColor: "#ffffff",
                    fillOpacity: 0.4
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
        });
    }

    function initCharts() {
        const opt = {
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
        const c1 = $('#chart1')[0],
            c2 = $('#chart2')[0];
        if (c1) chart1_instance = new Chart(c1, {
            type: 'pie',
            data: {
                labels: ['تک برگ', 'دفترچه', 'فاقد'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: opt
        });
        if (c2) chart2_instance = new Chart(c2, {
            type: 'pie',
            data: {
                labels: ['تک برگ', 'دفترچه', 'فاقد'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: opt
        });
    }

    // --- ۵. مدیریت جداول (حل مشکل اسکرول داخلی) ---
    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) {
            mainDataTable.destroy();
            $('#mainDataTable').empty();
        }
        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            dom: 't',
            scrollY: '280px',
            scrollCollapse: true,
            paging: false,
            searching: true,
            language: {
                "sEmptyTable": "داده‌ای موجود نیست"
            },
            initComplete: function() {
                const tools = $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 150px;">')
                    .on('keyup', function() {
                        mainDataTable.search(this.value).draw();
                    }).appendTo(tools);
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
        if (bounds.length > 0) map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 12
        });
    }

    // --- ۶. توابع بارگذاری داده‌ها (API) ---

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
                    title: 'تک‌برگ'
                },
                {
                    data: 'nosand_count',
                    title: 'فاقد سند'
                },
                {
                    data: null,
                    title: 'عملیات',
                    orderable: false,
                    render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'ایران');
            updateBreadcrumb();
            addMarkers(data, createProvincePopup); // فراخوانی صحیح تابع
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
            addMarkers(data, createCityPopup);
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
                    title: 'درآمد فعلی',
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
            addMarkers(data, (d) => createGenericPopup(d.name, `تعداد رقبات: ${d.raqabat_count}`, "رقبات", "popup-btn-properties", d.id, `data-pid="${pid}" data-cid="${cid}"`));
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
                chart1_instance.data.datasets[0].data = data.charts.doc_status;
                chart1_instance.update();
                chart2_instance.data.datasets[0].data = data.charts.prop_status;
                chart2_instance.update();
            }
            updateBreadcrumb([{
                name: "شهرستان",
                fn: () => loadEndowmentData(pid, cid, "")
            }, {
                name: ename
            }]);
            if (markers.length > 0) {
                markers.forEach(m => map.removeLayer(m));
            }
        }).always(hideLoading);
    }

    // --- ۷. مدیریت آمار و تعاملات ---
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
            chart1_instance.data.datasets[0].data = sumCount;
            chart1_instance.update();
            chart2_instance.data.datasets[0].data = sumArea;
            chart2_instance.update();
        }
    }

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
        addLi('ایران', loadCountryData, items.length === 0);
        items.forEach((it, i) => addLi(it.name, it.fn, i === items.length - 1));
    }

    function setupEventHandlers() {
        $('#backBtn').on('click', function() {
            if (navigationStack.length) navigationStack.pop().fn();
        });
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

    // --- ۸. اجرای نهایی ---
    initCharts();
    initMap();
    setupEventHandlers();
    loadCountryData();
});