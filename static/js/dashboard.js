const COLOR_THRESHOLDS = {
    greenMax: 40,   
    yellowMax: 60   
};

let provinceGeoLayer = null;

$(document).ready(function() {
    // تزریق استایل‌های مورد نیاز (از جمله رفع باگ اسلش در Breadcrumb)
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            @keyframes blinker { 50% { opacity: 0; } }
            .lamp-blink { animation: blinker 1s linear infinite; }
            .custom-map-marker { font-size: 36px; text-shadow: 2px 2px 5px rgba(0,0,0,0.6); margin-top: -36px; margin-left: -12px; }
            
            /* حل مشکل نمایش جداکننده در مسیرها */
            .breadcrumb-item + .breadcrumb-item::before { content: "/" !important; float: right; padding-left: 0.5rem; }
            .breadcrumb { direction: rtl; }
        `)
        .appendTo('head');

    // انتقال Breadcrumb به بالای جدول برای دسترسی بهتر
    setTimeout(() => {
        const $nav = $('#breadcrumb').closest('nav');
        const $tableCardHeader = $('#tableTitle').closest('.card-header, .card-body').parent();
        if ($nav.length && $tableCardHeader.length) {
            $nav.insertBefore($tableCardHeader);
        }
    }, 500);

    let map, mainDataTable = null,
        chart1_instance = null,
        chart2_instance = null;
    let currentLevel = 'country',
        navigationStack = [],
        markers = [],
        allProvincesData = [];

    let currentState = {
        prov: { id: null, name: "" },
        city: { id: null, name: "" },
        endow: { id: null, name: "" }
    };

    function showLoading() { $('#loadingModal').modal('show'); }
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

    const formatNum = (num) => new Number(num || 0).toLocaleString('fa-IR');

    // تبدیل میلیون تومان به میلیارد تومان در صورت بزرگ بودن عدد
    function formatSmartCurrency(val) {
        if (!val) return '۰ <small>م.تومان</small>';
        if (val >= 1000) {
            return formatNum((val / 1000).toFixed(1)) + ' <small class="text-primary">میلیارد تومان</small>';
        }
        return formatNum(val.toFixed(1)) + ' <small>م.تومان</small>';
    }

    // تغییر سایز ستون‌های جدول و نقشه به صورت داینامیک و کاملا ایمن
    function toggleMapDisplay(show) {
        const $mapCard = $('#map').closest('.card');
        const $tableCard = $('#mainDataTable').closest('.card');
        
        const $mapCol = $mapCard.parent();
        const $tableCol = $tableCard.parent();
        
        // بررسی میکنیم که ستون ها یکی نباشند (که کل صفحه مخفی نشود)
        if ($mapCol[0] !== $tableCol[0]) {
            if (show) {
                $mapCol.show();
                $tableCol.removeClass('col-12 col-lg-12 col-md-12').addClass('col-lg-6 col-md-6');
                setTimeout(() => { if (map) map.invalidateSize(); }, 300);
            } else {
                $mapCol.hide();
                $tableCol.removeClass('col-lg-6 col-md-6').addClass('col-12 col-lg-12 col-md-12');
            }
        } else {
            // در صورتی که ساختار گرید متفاوت باشد، فقط خود کارت نقشه را مخفی میکنیم
            if (show) {
                $mapCard.show();
                setTimeout(() => { if (map) map.invalidateSize(); }, 300);
            } else {
                $mapCard.hide();
            }
        }
    }

    function renderBadge(text) {
        let color = 'secondary';
        if (text && (text.includes('تک برگ') || text.includes('معتبر'))) color = 'success';
        if (text && (text.includes('دفترچه') || text.includes('منقضی'))) color = 'warning text-dark';
        if (text && (text.includes('فاقد') || text.includes('نامشخص'))) color = 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }

    function getColorClass(percent) {
        if (percent >= COLOR_THRESHOLDS.yellowMax) return 'text-danger';
        if (percent >= COLOR_THRESHOLDS.greenMax) return 'text-warning';
        return 'text-success';
    }

    function getHexColor(percent) {
        if (percent >= COLOR_THRESHOLDS.yellowMax) return '#dc3545';
        if (percent >= COLOR_THRESHOLDS.greenMax) return '#ffc107';
        return '#28a745';
    }

    function getDynamicMarkerIcon(percent) {
        const color = getHexColor(percent);
        return L.divIcon({
            className: 'bg-transparent border-0',
            html: `<div class="custom-map-marker" style="color: ${color};"><i class="fas fa-map-marker-alt"></i></div>`,
            iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36]
        });
    }

    function renderLampPercent(noDoc, total) {
        if (!total || total === 0) return `<span class="text-muted"><i class="fas fa-lightbulb"></i> ۰٪</span>`;
        let p = (noDoc / total) * 100;
        let colorClass = getColorClass(p);
        let blinkClass = p >= COLOR_THRESHOLDS.yellowMax ? 'lamp-blink' : '';
        return `<span class="fw-bold"><i class="fas fa-lightbulb ${colorClass} ${blinkClass} me-1"></i> %${formatNum(p.toFixed(1))}</span>`;
    }

    function renderSingleLamp(status) {
        if (status && status.includes('فاقد')) {
            return `<span class="fw-bold"><i class="fas fa-lightbulb text-danger lamp-blink me-1"></i> ۱۰۰٪ (فاقد)</span>`;
        }
        return `<span class="fw-bold"><i class="fas fa-lightbulb text-success me-1"></i> ۰٪ (دارد)</span>`;
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
                    <strong>${formatSmartCurrency(p.lost_revenue)}</strong>
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
                    <span><i class="fas fa-coins"></i> زیان احتمالی:</span><br>
                    <strong>${formatSmartCurrency(c.lost_revenue)}</strong>
                </div>
                <button class="btn btn-sm btn-primary w-100 mt-2 popup-btn-endowments" data-pid="${c.province_id}" data-id="${c.id}" data-name="${c.name}">مشاهده موقوفات</button>
            </div>`;
    }

    function initMap() {
        if (map) return;
        map = L.map('map').setView([32.4279, 53.6880], 5);
        L.imageOverlay('/static/images/IranMap.jpg', [[25.0, 44.0], [40.0, 64.0]]).addTo(map);
        map.setMaxBounds([[25.0, 44.0], [40.0, 64.0]]);
        map.options.minZoom = 5;

        $.getJSON('/static/iran_provinces.json', function(data) {
            provinceGeoLayer = L.geoJSON(data, {
                style: { color: "#2c3e50", weight: 1.5, fillColor: "#ffffff", fillOpacity: 0.1 },
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
        const opt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Vazirmatn' } } } } };
        if ($('#chart1').length) chart1_instance = new Chart($('#chart1')[0], { type: 'pie', data: { labels: ['تک برگ', 'دفترچه', 'فاقد'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }] }, options: opt });
        if ($('#chart2').length) chart2_instance = new Chart($('#chart2')[0], { type: 'pie', data: { labels: ['تک برگ', 'دفترچه', 'فاقد'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }] }, options: opt });
    }

    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) {
            mainDataTable.destroy();
            $('#mainDataTable').empty();
        }
        mainDataTable = $('#mainDataTable').DataTable({
            data: data, columns: columns, dom: 't', scrollY: '300px', scrollCollapse: true, paging: false, searching: true,
            language: { "sEmptyTable": "داده‌ای موجود نیست" },
            initComplete: function() {
                const tools = $('#tableTools').empty();
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 200px;">').on('keyup', function() {
                    mainDataTable.search(this.value).draw();
                }).appendTo(tools);
            }
        });

        // ایجاد ردیف واقعی (Index) بدون توجه به سورت شدن ستون‌ها
        mainDataTable.on('order.dt search.dt', function () {
            let i = 1;
            mainDataTable.cells(null, 0, { search: 'applied', order: 'applied' }).every(function (cell) {
                this.data(formatNum(i++));
            });
        }).draw();
    }

    function addMarkers(items, popupFn) {
        if (markers.length > 0) markers.forEach(m => map.removeLayer(m));
        markers = [];
        let bounds = [];
        items.forEach(i => {
            if (i.lat && i.lng) {
                let p_no_doc = i.waqfs_no_doc || 0;
                let p_total = i.total_waqfs || 1; 
                let percent = (p_no_doc / p_total) * 100;

                let m = L.marker([i.lat, i.lng], { icon: getDynamicMarkerIcon(percent) }).addTo(map);
                m.bindPopup(popupFn(i));
                markers.push(m);
                bounds.push([i.lat, i.lng]);
            }
        });
        if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    function updateStats(data, title, isEndowLevel = false) {
        let totalWaqfs = 0, noDocWaqfs = 0, hasDocWaqfs = 0, totalLostMillionToman = 0;
        let sumCount = [0, 0, 0], sumArea = [0, 0, 0];

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

            if (chart1_instance) { chart1_instance.data.datasets[0].data = sumCount; chart1_instance.update(); }
            if (chart2_instance) { chart2_instance.data.datasets[0].data = sumArea; chart2_instance.update(); }

            if (totalWaqfs > 0) {
                let noDocPercent = ((noDocWaqfs / totalWaqfs) * 100);
                $('#totalWaqfsCard').text(formatNum(totalWaqfs));
                $('#hasDocWaqfsCard').text(formatNum(hasDocWaqfs));
                $('#noDocWaqfsCard').text(formatNum(noDocWaqfs));
                $('#noDocPercentCard').text(`%${formatNum(noDocPercent.toFixed(1))}`);

                let lamp = $('#lampIcon');
                if (lamp.length) {
                    lamp.removeClass('text-success text-warning text-danger lamp-blink');
                    lamp.addClass(getColorClass(noDocPercent));
                    if (noDocPercent >= COLOR_THRESHOLDS.yellowMax) {
                        lamp.addClass('lamp-blink');
                        lamp.css({ 'font-size': '2.2em' });
                    } else {
                        lamp.css({ 'font-size': '1.8em' });
                    }
                }
            }
        } else {
            totalLostMillionToman = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        }

        // فقط در صورتی که مبلغ بیش از ۱,۰۰۰,۰۰۰ میلیون تومان (یک همت) بود این مقدار نوشته شود
        let lostHemmatStr = "";
        if (totalLostMillionToman >= 1000000) {
            let lostHemmat = (totalLostMillionToman / 1000000).toFixed(2);
            lostHemmatStr = `<br><span class="text-danger fs-6 fw-bold">≈ ${formatNum(lostHemmat)} همت در سال</span>`;
        }
        
        $('#lostRevenueValue').html(`${formatSmartCurrency(totalLostMillionToman)}${lostHemmatStr}`);
        $('#tableTitle').html(`<i class="fas fa-list me-2 text-primary"></i>${title}`);
    }

    function updateBreadcrumb(levels = []) {
        const bc = $('#breadcrumb').empty();
        levels.forEach((lvl, i) => {
            const isActive = (i === levels.length - 1);
            const li = $(`<li class="breadcrumb-item ${isActive ? 'active' : ''}"></li>`);
            if (!isActive && lvl.fn) {
                $('<a href="#" class="text-decoration-none"></a>').text(lvl.name).on('click', (e) => {
                    e.preventDefault();
                    lvl.fn();
                }).appendTo(li);
            } else {
                li.text(lvl.name);
            }
            bc.append(li);
        });
    }

    function scrollToTable() {
        if ($('#mainDataTable').length) {
            $('html, body').animate({
                scrollTop: $("#mainDataTable").offset().top - 150
            }, 600);
        }
    }

    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = [];
        $('#backBtn').hide();
        
        toggleMapDisplay(true); // نمایش نقشه

        $.get('/api/provinces', function(data) {
            allProvincesData = data;
            const cols = [
                { data: null, title: 'ردیف', width: '5%', orderable: false, searchable: false, defaultContent: '' },
                { data: 'name', title: 'نام استان' },
                { data: null, title: 'موقوفه بدون سند', render: r => renderLampPercent(r.waqfs_no_doc, r.total_waqfs) },
                { data: null, title: 'رقبه بدون سند', render: r => { let totalProps = (r.takbarg_count || 0) + (r.daftarchei_count || 0) + (r.nosand_count || 0); return renderLampPercent(r.nosand_count, totalProps); } },
                { data: 'lost_revenue', title: 'عدم النفع', render: formatSmartCurrency },
                { data: null, title: 'عملیات', orderable: false, render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>` }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, 'وضعیت استان‌های کشور');
            updateBreadcrumb([{ name: "ایران" }]);
            addMarkers(data, createProvincePopup);
        }).always(hideLoading);
    }

    function loadCityData(pid, pname) {
        showLoading();
        currentLevel = 'province';
        currentState.prov = { id: pid, name: pname };
        $('#backBtn').show();
        
        toggleMapDisplay(true); // نمایش نقشه
        
        $.get(`/api/province/${pid}/cities`, function(data) {
            const cols = [
                { data: null, title: 'ردیف', width: '5%', orderable: false, searchable: false, defaultContent: '' },
                { data: 'name', title: 'نام شهرستان' },
                { data: null, title: 'موقوفه بدون سند', render: r => renderLampPercent(r.waqfs_no_doc, r.total_waqfs) },
                { data: null, title: 'رقبه بدون سند', render: r => { let totalProps = (r.takbarg_count || 0) + (r.daftarchei_count || 0) + (r.nosand_count || 0); return renderLampPercent(r.nosand_count, totalProps); } },
                { data: 'lost_revenue', title: 'عدم النفع', render: formatSmartCurrency },
                { data: null, title: 'عملیات', orderable: false, render: () => `<button class="btn btn-sm btn-info text-white btn-view-endowments">موقوفات</button>` }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, `وضعیت شهرستان‌های ${pname}`);
            
            updateBreadcrumb([
                { name: "ایران", fn: loadCountryData },
                { name: pname }
            ]);
            navigationStack = [{ fn: loadCountryData }];
            addMarkers(data, createCityPopup);
        }).always(hideLoading);
    }

    function loadEndowmentData(pid, cid, cname) {
        showLoading();
        currentLevel = 'city';
        currentState.city = { id: cid, name: cname };
        
        $.get(`/api/province/${pid}/city/${cid}/endowments`, function(data) {
            const cols = [
                { data: null, title: 'ردیف', width: '5%', orderable: false, searchable: false, defaultContent: '' },
                { data: 'name', title: 'نام موقوفه' },
                { data: null, title: 'رقبه بدون سند', render: r => { let totalProps = (r.takbarg || 0) + (r.daftarchei || 0) + (r.nosand || 0); return renderLampPercent(r.nosand, totalProps); } },
                { data: 'lost_revenue', title: 'عدم النفع', render: formatSmartCurrency },
                { data: null, title: 'عملیات', orderable: false, render: (d, t, r) => `<button class="btn btn-warning btn-sm btn-view-properties" data-pid="${pid}" data-cid="${cid}" data-id="${r.id}" data-name="${r.name}">رقبات</button>` }
            ];
            initOrReloadDataTable(data, cols);
            updateStats(data, `موقوفات ${cname}`, true);
            
            updateBreadcrumb([
                { name: "ایران", fn: loadCountryData },
                { name: currentState.prov.name, fn: () => loadCityData(currentState.prov.id, currentState.prov.name) },
                { name: cname }
            ]);
            navigationStack = [{ fn: () => loadCityData(currentState.prov.id, currentState.prov.name) }];
            
            // مخفی کردن کامل نقشه و عریض شدن جدول
            toggleMapDisplay(false);
            scrollToTable();
            
        }).always(hideLoading);
    }

    function loadPropertyData(pid, cid, eid, ename) {
        showLoading();
        currentLevel = 'endowment';
        currentState.endow = { id: eid, name: ename };
        
        $.get(`/api/province/${pid}/city/${cid}/endowment/${eid}/properties`, function(data) {
            const cols = [
                { data: null, title: 'ردیف', width: '5%', orderable: false, searchable: false, defaultContent: '' },
                { data: 'title', title: 'نام رقبه' },
                { data: 'land_use', title: 'نوع رقبه' },
                { data: 'area', title: 'متراژ', render: formatArea },
                { data: 'document_status', title: 'وضعیت سند', render: renderBadge },
                { data: 'lost_revenue', title: 'زیان عدم النفع', render: formatSmartCurrency }
            ];
            initOrReloadDataTable(data.properties, cols);

            if (data.charts && chart1_instance && chart2_instance) {
                chart1_instance.data.datasets[0].data = data.charts.doc_status;
                chart1_instance.update();
                chart2_instance.data.datasets[0].data = data.charts.prop_status;
                chart2_instance.update();
            }

            // فقط در صورتی که مبلغ بیش از ۱ همت بود نوشته شود
            let lostHemmatStr = "";
            if (data.lost_revenue >= 1000000) {
                let lostHemmat = (data.lost_revenue / 1000000).toFixed(2);
                lostHemmatStr = `<br><span class="text-danger fs-6 fw-bold">≈ ${formatNum(lostHemmat)} همت</span>`;
            }
            
            $('#lostRevenueValue').html(`${formatSmartCurrency(data.lost_revenue)}${lostHemmatStr}`);

            updateBreadcrumb([
                { name: "ایران", fn: loadCountryData },
                { name: currentState.prov.name, fn: () => loadCityData(currentState.prov.id, currentState.prov.name) },
                { name: currentState.city.name, fn: () => loadEndowmentData(currentState.prov.id, currentState.city.id, currentState.city.name) },
                { name: ename }
            ]);
            navigationStack = [{ fn: () => loadEndowmentData(currentState.prov.id, currentState.city.id, currentState.city.name) }];
            
            // مخفی ماندن نقشه و اسکرول به جدول
            toggleMapDisplay(false);
            scrollToTable();

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