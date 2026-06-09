/* ============================================================
   MOD-ANALISIS  —  Análisis de Ingresos y Gastos
   ============================================================ */

var _analisisChart = null;
var _analisisCatChart = null;

function renderAnalisis() {
  var el = document.getElementById('module-analisis');
  if (!el) return;

  var anioActual = new Date().getFullYear();
  var anioSel = el.dataset.anio ? parseInt(el.dataset.anio) : anioActual;

  // Gather data
  var movimientos        = loadData(STORAGE_KEYS.movimientos)       || [];
  var cuentas            = loadData(STORAGE_KEYS.cuentas)           || [];
  var categoriasGasto    = loadData(STORAGE_KEYS.categorias_gasto)  || [];
  var categoriasIngreso  = loadData(STORAGE_KEYS.categorias_ingreso)|| [];
  var tiposCambio        = loadData(STORAGE_KEYS.tipos_cambio)      || {};

  var cuentaMap  = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });
  var catGMap = {};
  categoriasGasto.forEach(function(c) { catGMap[c.id] = c.nombre; });
  var catIMap = {};
  categoriasIngreso.forEach(function(c) { catIMap[c.id] = c.nombre; });

  // Build year options from available data
  var aniosDisp = [];
  movimientos.forEach(function(m) {
    if (!m.fecha) return;
    var y = parseInt(m.fecha.substring(0, 4));
    if (!isNaN(y) && aniosDisp.indexOf(y) < 0) aniosDisp.push(y);
  });
  aniosDisp.sort(function(a, b) { return b - a; });
  if (aniosDisp.indexOf(anioSel) < 0 && aniosDisp.length > 0) anioSel = aniosDisp[0];

  var aniosOpts = aniosDisp.map(function(y) {
    return '<option value="' + y + '"' + (y === anioSel ? ' selected' : '') + '>' + y + '</option>';
  }).join('');

  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];

  // Filter movimientos for selected year, excluding transfers
  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  var byMes = {};
  for (var i = 1; i <= 12; i++) byMes[i] = { ing: 0, gto: 0 };

  var catGastoTot = {};
  var catIngresoTot = {};
  var totalIng = 0, totalGto = 0;

  movimientos.forEach(function(m) {
    if (!m.fecha) return;
    if (m.fecha.substring(0, 4) !== String(anioSel)) return;
    if (m.transferencia_id) return;
    var mes = parseInt(m.fecha.substring(5, 7));
    if (isNaN(mes) || mes < 1 || mes > 12) return;
    var cuenta  = cuentaMap[m.cuenta_id];
    var moneda  = cuenta ? cuenta.moneda : 'MXN';
    var mxn     = toMXN(m.monto, moneda, tiposCambio);
    if (m.tipo === 'ingreso') {
      byMes[mes].ing += mxn;
      totalIng += mxn;
      var cNom = catIMap[m.categoria_id] || 'Sin categoría';
      catIngresoTot[cNom] = (catIngresoTot[cNom] || 0) + mxn;
    } else if (m.tipo === 'gasto') {
      byMes[mes].gto += mxn;
      totalGto += mxn;
      var cNom = catGMap[m.categoria_id] || 'Sin categoría';
      catGastoTot[cNom] = (catGastoTot[cNom] || 0) + mxn;
    }
  });

  // Add rendimientos as income
  var totalRend = 0;
  rendimientos.forEach(function(r) {
    if (!r.periodo) return;
    if (r.periodo.substring(0, 4) !== String(anioSel)) return;
    var mes = parseInt(r.periodo.substring(5, 7));
    if (isNaN(mes) || mes < 1 || mes > 12) return;
    var cuenta = cuentaMap[r.cuenta_id];
    var moneda = cuenta ? cuenta.moneda : 'MXN';
    var rend   = typeof _rendReal === 'function' ? _rendReal(r) : ((r.saldo_final || 0) - (r.saldo_inicial || 0) - (r.movimientos_neto || 0));
    var rendMXN = toMXN(rend, moneda, tiposCambio);
    if (rendMXN > 0) {
      byMes[mes].ing += rendMXN;
      totalIng += rendMXN;
      totalRend += rendMXN;
    } else if (rendMXN < 0) {
      byMes[mes].gto += Math.abs(rendMXN);
      totalGto += Math.abs(rendMXN);
    }
  });
  if (totalRend > 0) catIngresoTot['Rendimientos'] = (catIngresoTot['Rendimientos'] || 0) + totalRend;

  var totalBal = totalIng - totalGto;
  var tasaAhorro = totalIng > 0 ? (totalBal / totalIng * 100) : 0;

  // Sort categories
  var topGastos   = Object.keys(catGastoTot).map(function(k){ return { nom: k, val: catGastoTot[k] }; })
                    .sort(function(a,b){ return b.val - a.val; }).slice(0, 10);
  var topIngresos = Object.keys(catIngresoTot).map(function(k){ return { nom: k, val: catIngresoTot[k] }; })
                    .sort(function(a,b){ return b.val - a.val; }).slice(0, 10);

  // Monthly table rows
  var mesesConDatos = 0;
  var rowsMes = '';
  for (var m2 = 1; m2 <= 12; m2++) {
    var ing  = byMes[m2].ing;
    var gto  = byMes[m2].gto;
    var bal  = ing - gto;
    var pct  = ing > 0 ? (bal / ing * 100) : 0;
    if (ing > 0 || gto > 0) mesesConDatos++;
    var balStyle = bal >= 0 ? 'color:var(--text-primary);' : 'color:var(--accent-red);';
    var pctStyle = pct >= 0 ? 'color:var(--text-primary);' : 'color:var(--accent-red);';
    rowsMes +=
      '<tr>' +
        '<td style="text-align:left;font-weight:600;">' + meses[m2-1] + '</td>' +
        '<td>' + formatCurrencyInt(ing, 'MXN') + '</td>' +
        '<td>' + formatCurrencyInt(gto, 'MXN') + '</td>' +
        '<td style="' + balStyle + 'font-weight:700;">' + (bal >= 0 ? '+' : '') + formatCurrencyInt(bal, 'MXN') + '</td>' +
        '<td style="' + pctStyle + '">' + pct.toFixed(1) + '%</td>' +
      '</tr>';
  }

  // Totals row
  var balTotStyle = totalBal >= 0 ? 'color:var(--text-primary);' : 'color:var(--accent-red);';
  var pctTotStyle = tasaAhorro >= 0 ? 'color:var(--text-primary);' : 'color:var(--accent-red);';
  rowsMes +=
    '<tr data-sort-fixed="true" style="font-weight:800;border-top:2px solid var(--border-color);background:var(--bg-base);">' +
      '<td style="text-align:left;">TOTAL ' + anioSel + '</td>' +
      '<td>' + formatCurrencyInt(totalIng, 'MXN') + '</td>' +
      '<td>' + formatCurrencyInt(totalGto, 'MXN') + '</td>' +
      '<td style="' + balTotStyle + 'font-weight:800;">' + (totalBal >= 0 ? '+' : '') + formatCurrencyInt(totalBal, 'MXN') + '</td>' +
      '<td style="' + pctTotStyle + 'font-weight:800;">' + tasaAhorro.toFixed(1) + '%</td>' +
    '</tr>';

  // Category rows helper
  function catRows(arr, total) {
    if (!arr.length) return '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px;">Sin datos</td></tr>';
    return arr.map(function(item, idx) {
      var pct = total > 0 ? (item.val / total * 100) : 0;
      var bar = Math.round(pct);
      return '<tr>' +
        '<td style="text-align:left;">' +
          '<span style="display:inline-block;width:20px;color:var(--text-muted);font-size:11px;">' + (idx+1) + '</span>' +
          item.nom +
        '</td>' +
        '<td>' + formatCurrencyInt(item.val, 'MXN') + '</td>' +
        '<td style="min-width:120px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<div style="flex:1;height:6px;background:var(--border-subtle);border-radius:3px;">' +
              '<div style="width:' + bar + '%;height:100%;background:var(--accent-blue);border-radius:3px;"></div>' +
            '</div>' +
            '<span style="font-size:11px;color:var(--text-muted);min-width:36px;text-align:right;">' + pct.toFixed(1) + '%</span>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // Summary card helper
  function card(label, value, valueStyle, sub) {
    return '<div style="flex:1;min-width:160px;background:var(--bg-card);border-radius:var(--radius-md);' +
           'border:1px solid var(--border-subtle);padding:16px 20px;">' +
      '<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:20px;font-weight:800;' + valueStyle + '">' + value + '</div>' +
      (sub ? '<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">' + sub + '</div>' : '') +
    '</div>';
  }

  var subBal = mesesConDatos > 0
    ? ('Promedio mensual: ' + formatCurrencyInt(totalBal / mesesConDatos, 'MXN'))
    : '';

  el.innerHTML =
    '<div style="padding:24px;">' +

    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">' +
      '<h2 style="font-size:20px;font-weight:800;color:var(--text-primary);margin:0;">' +
        '<i class="fas fa-balance-scale" style="margin-right:8px;color:var(--accent-blue);"></i>' +
        'Análisis de Ingresos y Gastos' +
      '</h2>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<label style="font-size:13px;color:var(--text-secondary);">Año:</label>' +
        '<select class="form-select" style="width:100px;" onchange="' +
          'document.getElementById(\'module-analisis\').dataset.anio=this.value;renderAnalisis();">' +
          aniosOpts +
        '</select>' +
      '</div>' +
    '</div>' +

    // Summary cards
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px;">' +
      card('Total Ingresos',  formatCurrencyInt(totalIng, 'MXN'),  'color:var(--text-primary);',
           mesesConDatos + ' meses con datos') +
      card('Total Gastos',    formatCurrencyInt(totalGto, 'MXN'),  'color:var(--accent-red);', '') +
      card('Balance (Ahorro)', (totalBal >= 0 ? '+' : '') + formatCurrencyInt(totalBal, 'MXN'),
           totalBal >= 0 ? 'color:var(--text-primary);' : 'color:var(--accent-red);', subBal) +
      card('Tasa de Ahorro',  tasaAhorro.toFixed(1) + '%',
           tasaAhorro >= 20 ? 'color:var(--text-primary);' : tasaAhorro >= 0 ? 'color:var(--accent-amber);' : 'color:var(--accent-red);',
           'Balance / Ingresos') +
    '</div>' +

    // Chart + monthly table side by side
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">' +

      // Chart card
      '<div class="card" style="padding:16px;">' +
        '<h3 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--text-primary);">' +
          '<i class="fas fa-chart-bar" style="margin-right:6px;color:var(--accent-blue);"></i>' +
          'Ingresos vs Gastos — ' + anioSel +
        '</h3>' +
        '<canvas id="analisisBarChart" height="200"></canvas>' +
      '</div>' +

      // Monthly table card
      '<div class="card" style="padding:16px;overflow-x:auto;">' +
        '<h3 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--text-primary);">' +
          '<i class="fas fa-table" style="margin-right:6px;color:var(--accent-blue);"></i>' +
          'Resumen Mensual' +
        '</h3>' +
        '<table class="data-table" style="width:100%;font-size:13px;">' +
          '<thead><tr>' +
            '<th style="text-align:left;">Mes</th>' +
            '<th>Ingresos</th>' +
            '<th>Gastos</th>' +
            '<th>Balance</th>' +
            '<th>% Ahorro</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsMes + '</tbody>' +
        '</table>' +
      '</div>' +

    '</div>' +

    // Categories side by side
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +

      '<div class="card" style="padding:16px;overflow-x:auto;">' +
        '<h3 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--text-primary);">' +
          '<i class="fas fa-receipt" style="margin-right:6px;color:var(--accent-red);"></i>' +
          'Top Categorías de Gasto' +
        '</h3>' +
        '<table class="data-table" style="width:100%;font-size:13px;">' +
          '<thead><tr>' +
            '<th style="text-align:left;">Categoría</th>' +
            '<th>Total MXN</th>' +
            '<th>% del total</th>' +
          '</tr></thead>' +
          '<tbody>' + catRows(topGastos, totalGto) + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="card" style="padding:16px;overflow-x:auto;">' +
        '<h3 style="font-size:15px;font-weight:700;margin:0 0 14px;color:var(--text-primary);">' +
          '<i class="fas fa-arrow-down" style="margin-right:6px;color:var(--accent-blue);"></i>' +
          'Top Categorías de Ingreso' +
        '</h3>' +
        '<table class="data-table" style="width:100%;font-size:13px;">' +
          '<thead><tr>' +
            '<th style="text-align:left;">Categoría</th>' +
            '<th>Total MXN</th>' +
            '<th>% del total</th>' +
          '</tr></thead>' +
          '<tbody>' + catRows(topIngresos, totalIng) + '</tbody>' +
        '</table>' +
      '</div>' +

    '</div>' +
    '</div>';

  // Render Chart.js bar chart
  setTimeout(function() {
    var ctx = document.getElementById('analisisBarChart');
    if (!ctx) return;
    if (_analisisChart) { _analisisChart.destroy(); _analisisChart = null; }
    var labMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var dataIng = [], dataGto = [];
    for (var m3 = 1; m3 <= 12; m3++) {
      dataIng.push(Math.round(byMes[m3].ing));
      dataGto.push(Math.round(byMes[m3].gto));
    }
    _analisisChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labMeses,
        datasets: [
          { label: 'Ingresos',  data: dataIng, backgroundColor: 'rgba(37,99,235,0.7)',  borderColor: '#2563eb', borderWidth: 1 },
          { label: 'Gastos',    data: dataGto, backgroundColor: 'rgba(220,38,38,0.65)', borderColor: '#dc2626', borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function(ctx2) {
                return ctx2.dataset.label + ': $' + ctx2.parsed.y.toLocaleString('es-MX', { maximumFractionDigits: 0 });
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            ticks: {
              font: { size: 11 },
              callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; }
            }
          }
        }
      }
    });
  }, 50);

  // Init sortable tables
  setTimeout(function() { _initSortableTables(el); }, 80);
}
