let provinceGeoLayer = null;

$(document).ready(function() {
    // تزریق استایل برای انیمیشن چشمک‌زن لامپ
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            @keyframes blinker { 50% { opacity: 0; } }
            .lamp-blink { animation: blinker 1s linear infinite; }
        `)
        .appendTo('head');

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

    function showLoading() {
        $('#loadingModal').modal('show');
    }

    function hideLoading() {
        setTimeout(() => {
            $('#loadingModal').modal('hide');
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
        return val ? val.toLocaleString('fa-IR') : '۰';
    }

    const formatNum = (num) => new Number(num || 0).toLocaleString('fa-IR');

    function renderBadge(text) {
        let color = 'secondary';
        if (text && (text.includes('تک برگ') || text.includes('معتبر'))) color = 'success';
        if (text && (text.includes('دفترچه') || text.includes('منقضی'))) color = 'warning text-dark';
        if (text && (text.includes('فاقد') || text.includes('نامشخص'))) color = 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }

    // تابع اصلی محاسبه درصد و ساخت لامپ
    function renderLampPercent(noDoc, total) {
        if (!total || total === 0) return `<span class="text-muted"><i class="fas fa-lightbulb"></i> ۰٪</span>`;
        let p = (noDoc / total) * 100;
        let colorClass = 'text-success'; // پیش‌فرض: زیر 40 درصد (سبز)
        let blinkClass = '';

        if (p >= 60) {
            colorClass = 'text-danger'; // بحرانی: 60 درصد به بالا (قرمز)
            blinkClass = 'lamp-blink';
        } else if (p >= 40) {
            colorClass = 'text-warning'; // هشدار: بین 40 تا 60 (زرد)
        }

        return `<span class="fw-bold"><i class="fas fa-lightbulb ${colorClass} ${blinkClass} me-1"></i> %${formatNum(p.toFixed(1))}</span>`;
    }

    // برای وضعیت تکی موقوفه در سطح شهرستان
    function renderSingleLamp(status) {
        if (status && status.includes('فاقد')) {
            return `<span class="fw-bold"><i class="fas fa-lightbulb text-danger lamp-blink me-1"></i> ۱۰۰٪ (فاقد)</span>`;
        }
        return `<span class="fw-bold"><i class="fas fa-lightbulb text-success me-1"></i> ۰٪ (دارد)</span>`;
    }

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
        let totalProps = (p.takbarg_count || 0) + (p.daftarchei_count || 0) + (p.nosand_count || 0);
        return `
            <div class="custom-popup">
                <h6><i class="fas fa-map-marked-alt text-primary"></i> استان ${p.name}</h6>
                <ul class="mt-2">
                    <li><span>موقوفات فاقد سند:</span> ${renderLampPercent(p.waqfs_no_doc, p.total_waqfs)}</li>
                    <li><span>رقبات فاقد سند:</span> ${renderLampPercent(p.nosand_count, totalProps)}</li>
                </ul>
                <div class="loss-box mt-2">
                    <span><i class="fas fa-coins"></i> زیان عدم النفع:</span><br>
                    <strong>${formatNum(p.lost_revenue)} <small>م.تومان</small></strong>
                </div>
                <button class="btn btn-sm btn-primary w-100 mt-2 popup-btn-cities" data-id="${p.id}" data-name="${p.name}">مشاهده شهرستان‌ها</button>
            </div>`;
    }

    function createCityPopup(c) {
        let totalProps = (c.takbarg_count || 0) + (c.daftarchei_count || 0) + (c.nosand_count || 0);
        return `
            <div class="custom-popup">
                <h6><i class="fas fa-city text-info"></i> ${c.name}</h6>
                <ul class="mt-2">
                    <li><span>موقوفات فاقد سند:</span> ${renderLampPercent(c.waqfs_no_doc, c.total_waqfs)}</li>
                    <li><span>رقبات فاقد سند:</span> ${renderLampPercent(c.nosand_count, totalProps)}</li>
                </ul>
                <div class="loss-box mt-2">
                    <span><i class="fas fa-coins"></i> زیان احتمالی:</span>
                    <strong>${formatNum(c.lost_revenue)} <small>م.تومان</small></strong>
                </div>
                <button class="btn btn-sm btn-primary w-100 mt-2 popup-btn-endowments" data-pid="${c.province_id}" data-id="${c.id}" data-name="${c.name}">مشاهده موقوفات</button>
            </div>`;
    }

    function initMap() {
        if (map) return;
        map = L.map('map').setView([32.4279, 53.6880], 5);
        L.imageOverlay('/static/images/IranMap.jpg', [
            [25.0, 44.0],
            [40.0, 64.0]
        ]).addTo(map);
        map.setMaxBounds([
            [25.0, 44.0],
            [40.0, 64.0]
        ]);
        map.options.minZoom = 5;

        $.getJSON('/static/iran_provinces.json', function(data) {
            provinceGeoLayer = L.geoJSON(data, {
                style: {
                    color: "#2c3e50",
                    weight: 1.5,
                    fillColor: "#ffffff",
                    fillOpacity: 0.1
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
        if ($('#chart1').length) chart1_instance = new Chart($('#chart1')[0], {
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
        if ($('#chart2').length) chart2_instance = new Chart($('#chart2')[0], {
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
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 150px;">').on('keyup', function() {
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

    // --- مدیریت آمار اصلی و کارت‌های بالا ---
    function updateStats(data, title, isEndowLevel = false) {
        let totalWaqfs = 0,
            noDocWaqfs = 0,
            hasDocWaqfs = 0,
            totalLostMillionToman = 0;
        let sumCount = [0, 0, 0],
            sumArea = [0, 0, 0];

        if (!isEndowLevel) {
            data.forEach(x => {
                totalWaqfs += (x.total_waqfs || 0);
                noDocWaqfs += (x.waqfs_no_doc || 0);
                hasDocWaqfs += (x.waqfs_has_doc || 0);
                totalLostMillionToman += (x.lost_revenue || 0);

                if (x.charts) {
                    x.charts.by_count.forEach((v, i) => sumCount[i] += v);
                    x.charts.by_area.forEach((v, i) => sumArea[i] += v);
                }
            });

            if (chart1_instance) {
                chart1_instance.data.datasets[0].data = sumCount;
                chart1_instance.update();
            }
            if (chart2_instance) {
                chart2_instance.data.datasets[0].data = sumArea;
                chart2_instance.update();
            }

            if (totalWaqfs > 0) {
                let noDocPercent = ((noDocWaqfs / totalWaqfs) * 100);
                $('#totalWaqfsCard').text(formatNum(totalWaqfs));
                $('#hasDocWaqfsCard').text(formatNum(hasDocWaqfs));
                $('#noDocWaqfsCard').text(formatNum(noDocWaqfs));
                $('#noDocPercentCard').text(`%${formatNum(noDocPercent.toFixed(1))}`);

                let lamp = $('#lampIcon');
                if (lamp.length) {
                    // منطق جدید برای رنگ کارت‌های بالا
                    lamp.removeClass('text-success text-warning text-danger lamp-blink');
                    if (noDocPercent >= 60) {
                        lamp.addClass('text-danger lamp-blink');
                        lamp.css({
                            'font-size': '2.2em'
                        });
                    } else if (noDocPercent >= 40) {
                        lamp.addClass('text-warning');
                        lamp.css({
                            'font-size': '1.8em'
                        });
                    } else {
                        lamp.addClass('text-success');
                        lamp.css({
                            'font-size': '1.8em'
                        });
                    }
                }
            }
        } else {
            totalLostMillionToman = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        }

        let lostHemmat = (totalLostMillionToman / 1000000).toFixed(2);
        $('#lostRevenueValue').html(`${formatNum(totalLostMillionToman)} <small class="text-muted">میلیون تومان</small><br><span class="text-danger fs-6 fw-bold">≈ ${formatNum(lostHemmat)} همت در سال</span>`);
        $('#tableTitle').html(`<i class="fas fa-list me-2 text-primary"></i>${title}`);
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

    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = [];
        $('#backBtn').hide();
        $.get('/api/provinces', function(data) {
            allProvincesData = data;
            const cols = [{
                    data: null,
                    title: 'ردیف',
                    width: '5%',
                    render: (d, t, r, m) => formatNum(m.row + 1)
                },
                {
                    data: 'name',
                    title: 'نام استان'
                },
                {
                    data: null,
                    title: 'موقوفه بدون سند',
                    render: r => renderLampPercent(r.waqfs_no_doc, r.total_waqfs)
                },
                {
                    data: null,
                    title: 'رقبه بدون سند',
                    render: r => {
                        let totalProps = (r.takbarg_count || 0) + (r.daftarchei_count || 0) + (r.nosand_count || 0);
                        return renderLampPercent(r.nosand_count, totalProps);
                    }
                },
                {
                    data: 'lost_revenue',
                    title: 'عدم النفع (م.ت)',
                    render: formatCurrency
                },
                {
                    data: null,
                    title: 'عملیات',
                    orderable: false,
                    render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>`
                }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'وضعیت استان‌های کشور');
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
                    data: null,
                    title: 'ردیف',
                    width: '5%',
                    render: (d, t, r, m) => formatNum(m.row + 1)
                },
                {
                    data: 'name',
                    title: 'نام شهرستان'
                },
                {
                    data: null,
                    title: 'موقوفه بدون سند',
                    render: r => renderLampPercent(r.waqfs_no_doc, r.total_waqfs)
                },
                {
                    data: null,
                    title: 'رقبه بدون سند',
                    render: r => {
                        let totalProps = (r.takbarg_count || 0) + (r.daftarchei_count || 0) + (r.nosand_count || 0);
                        return renderLampPercent(r.nosand_count, totalProps);
                    }
                },
                {
                    data: 'lost_revenue',
                    title: 'عدم النفع (م.ت)',
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
            updateStats(data, `وضعیت شهرستان‌های ${pname}`);
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
                    data: null,
                    title: 'ردیف',
                    width: '5%',
                    render: (d, t, r, m) => formatNum(m.row + 1)
                },
                {
                    data: 'name',
                    title: 'نام موقوفه'
                },
                {
                    data: 'document_status',
                    title: 'موقوفه بدون سند',
                    render: renderSingleLamp
                },
                {
                    data: null,
                    title: 'رقبه بدون سند',
                    render: r => {
                        let totalProps = (r.takbarg || 0) + (r.daftarchei || 0) + (r.nosand || 0);
                        return renderLampPercent(r.nosand, totalProps);
                    }
                },
                {
                    data: 'lost_revenue',
                    title: 'عدم النفع (م.ت)',
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
            updateStats(data, `موقوفات ${cname}`, true);
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
            // ساختار دقیق درخواستی برای رقبات
            const cols = [{
                    data: null,
                    title: 'ردیف',
                    width: '5%',
                    render: (d, t, r, m) => formatNum(m.row + 1)
                },
                {
                    data: 'title',
                    title: 'نام رقبه'
                },
                {
                    data: 'land_use',
                    title: 'نوع رقبه'
                },
                {
                    data: 'area',
                    title: 'متراژ',
                    render: formatArea
                },
                {
                    data: 'document_status',
                    title: 'وضعیت سند',
                    render: renderBadge
                },
                {
                    data: 'lost_revenue',
                    title: 'زیان عدم النفع',
                    render: formatCurrency
                }
            ];
            initOrReloadDataTable(data.properties, cols);

            if (data.charts && chart1_instance && chart2_instance) {
                chart1_instance.data.datasets[0].data = data.charts.doc_status;
                chart1_instance.update();
                chart2_instance.data.datasets[0].data = data.charts.prop_status;
                chart2_instance.update();
            }

            let lostHemmat = (data.lost_revenue / 1000000).toFixed(2);
            $('#lostRevenueValue').html(`${formatNum(data.lost_revenue)} <small class="text-muted">میلیون تومان</small><br><span class="text-danger fs-6 fw-bold">≈ ${formatNum(lostHemmat)} همت</span>`);

            updateBreadcrumb([{
                name: "شهرستان",
                fn: () => loadEndowmentData(pid, cid, "")
            }, {
                name: ename
            }]);
            if (markers.length > 0) markers.forEach(m => map.removeLayer(m));
        }).always(hideLoading);
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

    initCharts();
    initMap();
    setupEventHandlers();
    loadCountryData();
});