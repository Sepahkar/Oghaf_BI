// تنظیمات مربوط به دسته‌بندی درآمد از دست رفته (اعداد به ریال هستند)
const REVENUE_SETTINGS = {
    LOW: {
        max: 30000000000,
        color: '#28a745',
        label: 'کم'
    },
    MEDIUM: {
        max: 70000000000,
        color: '#ffc107',
        label: 'متوسط'
    },
    HIGH: {
        color: '#dc3545',
        label: 'زیاد'
    }
};

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
            const modalEl = $('#loadingModal');
            modalEl.modal('hide');
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

    const formatNum = (num) => new Number(num || 0).toLocaleString('fa-IR');

    function renderBadge(text) {
        let color = 'secondary';
        if (text && (text.includes('تک برگ') || text.includes('معتبر'))) color = 'success';
        if (text && (text.includes('دفترچه') || text.includes('منقضی'))) color = 'warning text-dark';
        if (text && (text.includes('فاقد') || text.includes('نامشخص'))) color = 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }

    // --- ۳. توابع ساخت پاپ‌آپ (ظاهر جدید و زیبا) ---
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

    function createProvincePopup(p) {
        return `
            <div class="custom-popup">
                <h6><i class="fas fa-map-marked-alt text-primary"></i> استان ${p.name}</h6>
                <ul>
                    <li>
                        <span><i class="fas fa-file-contract text-success"></i> سند تک‌برگ:</span>
                        <strong>${formatNum(p.takbarg_count)} <small>مورد</small></strong>
                    </li>
                    <li>
                        <span><i class="fas fa-book text-warning"></i> سند دفترچه‌ای:</span>
                        <strong>${formatNum(p.daftarchei_count)} <small>مورد</small></strong>
                    </li>
                    <li>
                        <span><i class="fas fa-exclamation-triangle text-danger"></i> فاقد سند:</span>
                        <strong>${formatNum(p.nosand_count)} <small>مورد</small></strong>
                    </li>
                </ul>
                <div class="loss-box">
                    <span><i class="fas fa-coins"></i> زیان احتمالی:</span>
                    <strong>${formatNum(p.lost_revenue)} ریال</strong>
                </div>
                <button class="btn btn-sm btn-primary w-100 mt-3 popup-btn-cities" data-id="${p.id}" data-name="${p.name}">
                    مشاهده شهرستان‌ها
                </button>
            </div>`;
    }

    function createCityPopup(c) {
        return `
            <div class="custom-popup">
                <h6><i class="fas fa-city text-info"></i> ${c.name}</h6>
                <div class="loss-box mt-2">
                    <span><i class="fas fa-coins"></i> زیان احتمالی:</span>
                    <strong>${formatNum(c.lost_revenue)} ریال</strong>
                </div>
                <button class="btn btn-sm btn-primary w-100 mt-3 popup-btn-endowments" data-pid="${c.province_id}" data-id="${c.id}" data-name="${c.name}">
                    مشاهده موقوفات
                </button>
            </div>`;
    }

    function updateMapColors() {
        if (!provinceGeoLayer || !allProvincesData.length) return;
        provinceGeoLayer.eachLayer(function(layer) {
            const pName = (layer.feature.properties.name || layer.feature.properties.NAME_1 || "").trim();
            const pData = allProvincesData.find(p => p.name.trim() === pName);
            // در حالت عکس آفلاین، شاید نخواهیم رنگ‌ها خیلی پررنگ باشند. این بخش در صورت نیاز قابل تغییر است
        });
    }

    // --- ۴. تنظیمات نقشه آفلاین و نمودار ---
    function initMap() {
        if (map) return;
        map = L.map('map').setView([32.4279, 53.6880], 5);

        // -- جایگزینی اینترنت با عکس آفلاین ایران --
        const imageUrl = '/static/images/IranMap.jpg';
        const imageBounds = [
            [25.0, 44.0],
            [40.0, 64.0]
        ]; // مختصات تقریبی مرزهای ایران

        L.imageOverlay(imageUrl, imageBounds).addTo(map);

        // قفل کردن نقشه
        map.setMaxBounds(imageBounds);
        map.options.minZoom = 5;

        // بارگذاری خطوط مرزی استان‌ها روی عکس
        $.getJSON('/static/iran_provinces.json', function(data) {
            provinceGeoLayer = L.geoJSON(data, {
                style: {
                    color: "#2c3e50", // رنگ خطوط مرزی
                    weight: 1.5,
                    fillColor: "#ffffff",
                    fillOpacity: 0.1 // شفافیت کم تا تصویر زیر مشخص باشد
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

    // --- ۵. مدیریت جداول ---
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
        if (markers.length > 0) markers.forEach(m => map.removeLayer(m));
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
                    title: 'تک‌برگ',
                    render: formatNum
                },
                {
                    data: 'nosand_count',
                    title: 'فاقد سند',
                    render: formatNum
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
            addMarkers(data, createProvincePopup);
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
            if (markers.length > 0) markers.forEach(m => map.removeLayer(m));
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