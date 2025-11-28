$(document).ready(function() {
    // --- تعریف متغیرهای سراسری ---
    let map, mainDataTable = null, chart1_instance = null, chart2_instance = null;
    let currentLevel = 'country', navigationStack = [], markers = [];

    // --- توابع کمکی (این‌ها را بالا آوردیم تا خطا ندهد) ---
    
    function clearMap() {
        if (markers.length > 0) {
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

    function showLoading() { 
        $('#loadingModal').modal('show'); 
    }

    function formatArea(val) {
        if (!val) return '0';
        if (val > 10000) return (val / 10000).toLocaleString('fa-IR') + ' هکتار';
        return val.toLocaleString('fa-IR') + ' مترمربع';
    }
    
    function formatCurrency(val) {
        return val ? val.toLocaleString('fa-IR') + ' ریال' : '0';
    }

    function renderBadge(text) {
        let color = 'secondary';
        if (text && (text.includes('تک برگ') || text.includes('معتبر'))) color = 'success';
        if (text && (text.includes('دفترچه') || text.includes('منقضی'))) color = 'warning text-dark';
        if (text && (text.includes('فاقد') || text.includes('نامشخص'))) color = 'danger';
        return `<span class="badge bg-${color}">${text || '-'}</span>`;
    }

    function createGenericPopup(title, info, btnText, btnClass, id) {
        return `<div class="text-end"><h6>${title}</h6><p>${info}</p><button class="btn btn-sm btn-primary w-100 ${btnClass}" data-id="${id}" data-name="${title}">${btnText}</button></div>`;
    }

    function createProvincePopup(p) { return createGenericPopup(p.name, `تک برگ: ${p.takbarg_count}`, "مشاهده شهرها", "popup-btn-cities", p.id); }
    function createCityPopup(c) { return createGenericPopup(c.name, `درآمد از دست رفته: ${formatCurrency(c.lost_revenue)}`, "مشاهده موقوفات", "popup-btn-endowments", c.id); }

    // --- تنظیمات اولیه ---

    // فعال‌سازی Tooltip بوت‌استرپ
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    const faLang = {
        "sEmptyTable": "داده‌ای موجود نیست",
        "sInfo": "_START_ تا _END_ از _TOTAL_",
        "sInfoEmpty": "0 از 0",
        "sInfoFiltered": "(فیلتر شده از _MAX_)",
        "sZeroRecords": "یافت نشد",
    };

    const customMarkerIcon = L.icon({
        iconUrl: '/static/images/marker-icon.png',
        shadowUrl: '/static/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    function initDashboard() {
        try {
            initMap();
            initCharts();
            setupEventHandlers();
            loadCountryData();
        } catch (e) {
            console.error("Init Error:", e);
            hideLoading();
        }
    }

    function initMap() {
        map = L.map('map').setView([32.4279, 53.6880], 5);
        // L.tileLayer(...); // در حالت آفلاین کامنت بماند
    }

    function initCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { family: 'Vazirmatn' } } } }
        };
        const c1 = document.getElementById('chart1');
        const c2 = document.getElementById('chart2');
        if(c1 && typeof Chart !== 'undefined') chart1_instance = new Chart(c1, { type: 'pie', data: {labels:[], datasets:[{data:[]}]}, options: commonOptions });
        if(c2 && typeof Chart !== 'undefined') chart2_instance = new Chart(c2, { type: 'pie', data: {labels:[], datasets:[{data:[]}]}, options: commonOptions });
    }

    // --- مدیریت جدول DataTables ---
    function initOrReloadDataTable(data, columns) {
        if (mainDataTable) { mainDataTable.destroy(); $('#mainDataTable').empty(); }
        
        mainDataTable = $('#mainDataTable').DataTable({
            data: data,
            columns: columns,
            language: faLang,
            dom: 't', 
            scrollY: '160px',
            scrollCollapse: true,
            paging: true,
            pageLength: 5,
            info: false, 
            searching: true, 
            initComplete: function() {
                const tools = $('#tableTools');
                tools.empty();
                
                // دکمه اکسل
                if ($.fn.dataTable.Buttons) {
                    new $.fn.dataTable.Buttons(mainDataTable, {
                        buttons: [{ extend: 'excel', text: '<i class="fas fa-file-excel"></i>', className: 'btn btn-outline-success btn-sm me-2' }]
                    }).container().appendTo(tools);
                }

                // فیلد جستجو
                $('<input type="text" class="form-control form-control-sm" placeholder="جستجو..." style="width: 150px;">')
                    .on('keyup', function() { mainDataTable.search(this.value).draw(); })
                    .appendTo(tools);
            }
        });
    }

    function addMarkers(items, popupFn) {
        // اول پاک کن بعد اضافه کن
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
        
        if (bounds.length > 0) {
            map.fitBounds(bounds);
        }
    }

    // --- توابع بارگذاری داده ---

    function loadCountryData() {
        showLoading();
        currentLevel = 'country';
        navigationStack = [];
        
        $.ajax({
            url: '/api/provinces', method: 'GET',
            success: function(data) {
                displayProvinces(data);
                updateStats(data, 'آمار کلی کشور');
                updateBreadcrumb();
            },
            error: function(err) { console.error(err); hideLoading(); },
            complete: hideLoading
        });
    }

    function displayProvinces(data) {
        // نقشه را در سطح کشور ریست می‌کنیم
        clearMap();
        map.setView([32.4279, 53.6880], 5);

        const cols = [
            { data: 'name', title: 'استان' },
            { data: 'takbarg_count', title: 'تک‌برگ(ت)' },
            { data: 'takbarg_area', title: 'تک‌برگ(م)', render: formatArea },
            { data: 'nosand_count', title: 'فاقد(ت)' },
            { data: 'nosand_area', title: 'فاقد(م)', render: formatArea },
            { data: null, title: 'عملیات', orderable:false, render: () => `<button class="btn btn-sm btn-primary btn-view-cities">انتخاب</button>` }
        ];
        initOrReloadDataTable(data, cols);
        addMarkers(data, createProvincePopup);
        $('#tableTitle').html('جدول استان‌ها');
    }

    function loadCityData(pid, pname) {
        showLoading();
        navigationStack.push({ level: 'country', loadFunction: loadCountryData, name: "ایران" });
        currentLevel = 'province';

        $.ajax({
            url: `/api/province/${pid}/cities`, method: 'GET',
            success: function(data) {
                displayCities(data);
                updateStats(data, `آمار استان ${pname}`);
                updateBreadcrumb(navigationStack[0], { name: pname });
            },
            complete: hideLoading
        });
    }

    function displayCities(data) {
        const cols = [
            { data: 'name', title: 'شهرستان' },
            { data: 'takbarg_count', title: 'تک‌برگ' },
            { data: 'daftarchei_count', title: 'دفترچه‌ای' },
            { data: 'nosand_count', title: 'فاقد سند' },
            { data: 'lost_revenue', title: 'درآمد از دست رفته', render: formatCurrency },
            { data: null, title: 'عملیات', orderable:false, render: () => `<button class="btn btn-info text-white btn-sm btn-view-endowments">موقوفات</button>` }
        ];
        initOrReloadDataTable(data, cols);
        addMarkers(data, createCityPopup);
        $('#tableTitle').html('جدول شهرستان‌ها');
    }

    function loadEndowmentData(pid, cid, cname) {
        showLoading();
        navigationStack.push({ level: 'province', loadFunction: () => loadCityData(pid, navigationStack[navigationStack.length-1].name), name: navigationStack[navigationStack.length-1].name });
        currentLevel = 'city';

        $.ajax({
            url: `/api/province/${pid}/city/${cid}/endowments`, method: 'GET',
            success: function(data) {
                displayEndowments(data);
                updateStats(data, `آمار شهرستان ${cname}`, true);
                updateBreadcrumb(navigationStack[0], navigationStack[1], { name: cname });
            },
            complete: hideLoading
        });
    }

    function displayEndowments(data) {
        const cols = [
            { data: 'name', title: 'موقوفه' },
            { data: 'document_status', title: 'سند', render: renderBadge },
            { data: 'type', title: 'نوع' },
            { data: 'raqabat_count', title: 'تعداد رقبات' },
            { data: 'total_income', title: 'درآمد', render: formatCurrency },
            { data: null, title: 'عملیات', orderable:false, render: (d,t,r) => `<button class="btn btn-warning btn-sm btn-view-properties" data-id="${r.id}">رقبات</button>` }
        ];
        initOrReloadDataTable(data, cols);
        
        // مارکر برای موقوفات
        addMarkers(data, (d)=> createGenericPopup(d.name, `تعداد رقبات: ${d.raqabat_count}`, "رقبات", "popup-btn-properties", d.id));
        $('#tableTitle').html('جدول موقوفات');
    }

    function loadPropertyData(pid, cid, eid, ename) {
        showLoading();
        navigationStack.push({ level: 'city', loadFunction: () => loadEndowmentData(pid, cid, navigationStack[navigationStack.length-1].name), name: navigationStack[navigationStack.length-1].name });
        currentLevel = 'endowment';

        $.ajax({
            url: `/api/province/${pid}/city/${cid}/endowment/${eid}/properties`, method: 'GET',
            success: function(data) {
                displayProperties(data.properties);
                $('#lostRevenueValue').text(formatCurrency(data.lost_revenue));
                if(data.charts) {
                    updateChart(chart1_instance, ['تک برگ','دفترچه','فاقد'], data.charts.doc_status);
                    updateChart(chart2_instance, ['معتبر','منقضی','نامشخص'], data.charts.prop_status);
                }
                updateBreadcrumb(navigationStack[0], navigationStack[1], navigationStack[2], { name: ename });
            },
            complete: hideLoading
        });
    }

    function displayProperties(props) {
        const cols = [
            { data: 'title', title: 'عنوان' },
            { data: 'land_use', title: 'کاربری' },
            { data: 'lease_status', title: 'اجاره', render: renderBadge },
            { data: 'user', title: 'متصرف' },
            { data: 'area', title: 'مساحت', render: formatArea },
            { data: 'lease_amount', title: 'مبلغ', render: formatCurrency }
        ];
        initOrReloadDataTable(props, cols);
        clearMap(); // رقبات مختصات ندارند، نقشه خالی شود
        $('#tableTitle').html('جدول رقبات');
    }

    // --- آمار و نمودار ---

    function updateStats(data, title, isEndowLevel=false) {
        let totalLost = data.reduce((s, x) => s + (x.lost_revenue || 0), 0);
        $('#lostRevenueValue').text(formatCurrency(totalLost));
        
        if(!isEndowLevel) {
            let sumCount = [0,0,0], sumArea = [0,0,0];
            data.forEach(x => {
                if(x.charts) {
                    x.charts.by_count.forEach((v,i) => sumCount[i]+=v);
                    x.charts.by_area.forEach((v,i) => sumArea[i]+=v);
                }
            });
            updateChart(chart1_instance, ['تک برگ','دفترچه','فاقد'], sumCount);
            updateChart(chart2_instance, ['تک برگ','دفترچه','فاقد'], sumArea);
        }
    }

    function updateChart(chart, labels, data) {
        if(!chart) return;
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = ['#28a745', '#ffc107', '#dc3545'];
        chart.update();
    }

    function updateBreadcrumb(...items) {
        const bc = $('#breadcrumb');
        bc.empty();
        const root = { name: 'ایران', fn: loadCountryData };
        
        const addLi = (name, fn, active) => {
            const li = $(`<li class="breadcrumb-item ${active ? 'active' : ''}"></li>`);
            if(!active) $(`<a href="#">${name}</a>`).click(fn).appendTo(li);
            else li.text(name);
            bc.append(li);
        };

        addLi(root.name, root.fn, items.length === 0);
        items.forEach((item, i) => addLi(item.name, window[`navFunc${i+1}`], i === items.length - 1));
    }
    
    function handleBackNavigation() {
        if(navigationStack.length) navigationStack.pop().loadFunction();
    }

    function setupEventHandlers() {
        $('#backBtn').click(handleBackNavigation);
        
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

        $('#map').on('click', '.popup-btn-cities', function() { loadCityData($(this).data('id'), $(this).data('name')); });
        $('#map').on('click', '.popup-btn-endowments', function() { loadEndowmentData($(this).data('province-id'), $(this).data('id'), $(this).data('name')); });
    }

    initDashboard();
});