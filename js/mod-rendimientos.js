function renderRendimientos() {
  const el = document.getElementById('module-rendimientos');

  // -- Load data --
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();
  const periodoActual = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;

  // -- KPI calculations (usando rendimiento real) --
  const rendMes = rendimientos
    .filter(r => r.periodo === periodoActual)
    .reduce((s, r) => {
      const cta = cuentaMap[r.cuenta_id];
      return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

  const rendAnio = rendimientos
    .filter(r => r.periodo && r.periodo.startsWith(String(anioActual)))
    .reduce((s, r) => {
      const cta = cuentaMap[r.cuenta_id];
      return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

  // Tasa promedio ponderada (usa tasa anualizada)
  let sumCapitalTasa = 0;
  let sumCapital = 0;
  rendimientos.filter(r => r.periodo === periodoActual).forEach(r => {
    const cta = cuentaMap[r.cuenta_id];
    const capital = cta ? toMXN(_calcSaldoReal(cta), cta.moneda, tiposCambio) : 0;
    const tasa = r.rendimiento_pct_anual != null ? r.rendimiento_pct_anual : (r.rendimiento_pct || 0);
    sumCapitalTasa += capital * tasa;
    sumCapital += capital;
  });
  const tasaPromedio = sumCapital > 0 ? sumCapitalTasa / sumCapital : 0;

  // -- Cuenta options for filters --
  const cuentasInversion = cuentas.filter(c => c.activa !== false && c.tipo === 'inversion');
  const cuentaFilterOpts = cuentasInversion
    .map(c => `<option value="${c.id}">${c.nombre}</option>`)
    .join('');

  // -- Build year selector options --
  const aniosSet = new Set();
  rendimientos.forEach(r => { if (r.periodo) aniosSet.add(parseInt(r.periodo.split('-')[0])); });
  aniosSet.add(anioActual);
  const aniosOpts = [...aniosSet].sort((a, b) => b - a)
    .map(a => `<option value="${a}" ${a === anioActual ? 'selected' : ''}>${a}</option>`)
    .join('');

  el.innerHTML = `
    <!-- KPI Cards -->
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-green);cursor:pointer;" onclick="mostrarDesgloseRendMes()">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-chart-line" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rendimiento del Mes</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-green);">${formatCurrency(rendMes, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesgloseRendAnio()">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-calendar-check" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rendimiento del Ano</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-blue);">${formatCurrency(rendAnio, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-purple);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-percentage" style="color:var(--accent-purple);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Tasa Promedio Ponderada</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-purple);">${formatPct(tasaPromedio)}</div>
      </div>
    </div>

    <!-- Filtros y Boton -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:120px;">
            <select id="filterRendCuenta" class="form-select" onchange="filterRendimientos()">
              <option value="">Todas las cuentas</option>
              ${cuentaFilterOpts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:100px;">
            <select id="filterRendAnio" class="form-select" onchange="filterRendimientos();renderRendMensualReport()">
              ${aniosOpts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px;">
            <select id="filterRendPeriodo" class="form-select" onchange="filterRendimientos()">
              <option value="">Todos los periodos</option>
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="editRendimiento(null)">
          <i class="fas fa-plus"></i> Nuevo Rendimiento
        </button>
      </div>
    </div>

    <!-- Grafica Rendimiento Acumulado (24 meses, ancho completo) -->
    <div class="card" style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">
        <i class="fas fa-chart-area" style="margin-right:8px;color:var(--accent-green);"></i>Rendimiento Acumulado (24 meses)
      </h3>
      <div style="height:320px;"><canvas id="rendLineChart"></canvas></div>
    </div>

    <!-- Tabla Detalle de Rendimientos -->
    <div class="card" style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Detalle de Rendimientos</h3>
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaRendimientos">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th style="text-align:right;">Capital</th>
              <th style="text-align:center;">Dias</th>
              <th style="text-align:right;">Tasa (%)</th>
              <th style="text-align:right;">Tasa Anual (%)</th>
              <th style="text-align:right;">Rendimiento Periodo</th>
              <th style="text-align:right;">Rendimiento Acumulado</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th style="text-align:center;" data-no-sort="true">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyRendimientos"></tbody>
        </table>
      </div>
    </div>

    <!-- Reporte Mensual de Rendimiento por Cuenta -->
    <div class="card" style="margin-top:24px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">
        <i class="fas fa-table" style="margin-right:8px;color:var(--accent-blue);"></i>Rendimiento Mensual por Cuenta
      </h3>
      <div id="rendMensualReportContainer" style="overflow-x:auto;"></div>
    </div>
  `;

  // -- Render chart: cumulative rendimiento (24 months) --
  window._charts = window._charts || {};
  const _cc = typeof getChartColors === 'function' ? getChartColors() : { fontColor: '#94a3b8', gridColor: 'rgba(51,65,85,0.5)', borderColor: '#1e293b' };
  const chartFontColor = _cc.fontColor;
  const gridColor = _cc.gridColor;

  // Build last 24 months labels
  const last24 = [];
  for (let i = 23; i >= 0; i--) {
    const dt = new Date(anioActual, mesActual - i, 1);
    last24.push({
      label: mesNombre(dt.getMonth()).substring(0, 3) + ' ' + dt.getFullYear().toString().slice(-2),
      periodo: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    });
  }

  // Line chart: cumulative rendimiento real (24 months)
  let cumulative = 0;
  const cumulativeData = last24.map(m => {
    const monthTotal = rendimientos
      .filter(r => r.periodo === m.periodo)
      .reduce((s, r) => {
        const cta = cuentaMap[r.cuenta_id];
        return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio);
      }, 0);
    cumulative += monthTotal;
    return cumulative;
  });

  if (window._charts.rendLine) window._charts.rendLine.destroy();
  const lineCtx = document.getElementById('rendLineChart').getContext('2d');
  window._charts.rendLine = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: last24.map(m => m.label),
      datasets: [{
        label: 'Acumulado (MXN)',
        data: cumulativeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true, tension: 0.35,
        pointBackgroundColor: '#10b981', pointRadius: 3, pointHoverRadius: 6, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: 9, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: chartFontColor,
            font: { size: 10, family: "'Plus Jakarta Sans'" },
            callback: function(val) { return '$' + (val / 1000).toFixed(0) + 'k'; },
          },
          grid: { color: gridColor },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx) { return 'Acumulado: ' + formatCurrency(ctx.parsed.y, 'MXN'); } } },
      },
    },
  });

  // Populate table and monthly report
  filterRendimientos();
  renderRendMensualReport();
  setTimeout(function() { _initSortableTables(document.getElementById('module-rendimientos')); }, 100);
}

/* -- Helper: calcula rendimiento real descontando flujos de capital -- */
function _rendReal(r) {
  var sI = r.saldo_inicial || 0;
  var sF = r.saldo_final || 0;
  // Si tiene entradas/salidas/transferencias (captura historica), usar esos campos
  // Si no, usar movimientos_neto como fallback (cierre mensual regular)
  var ent = r.entradas || 0;
  var sal = r.salidas || 0;
  var tra = r.transferencias || 0;
  var movNeto = (ent || sal || tra) ? (ent - sal + tra) : (r.movimientos_neto || 0);
  return sF - sI - movNeto;
}

/* -- Filter and render rendimientos table rows -- */
function filterRendimientos() {
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const fCuenta = document.getElementById('filterRendCuenta') ? document.getElementById('filterRendCuenta').value : '';
  const fAnio = document.getElementById('filterRendAnio') ? document.getElementById('filterRendAnio').value : '';
  const fPeriodo = document.getElementById('filterRendPeriodo') ? document.getElementById('filterRendPeriodo').value : '';

  // Build allowed months based on period filter
  var mesesPermitidos = null;
  if (fPeriodo === 'mensual') mesesPermitidos = null; // all months
  else if (fPeriodo === 'bimestral') mesesPermitidos = [1, 3, 5, 7, 9, 11]; // ene, mar, may, jul, sep, nov
  else if (fPeriodo === 'trimestral') mesesPermitidos = [3, 6, 9, 12];
  else if (fPeriodo === 'semestral') mesesPermitidos = [6, 12];
  else if (fPeriodo === 'anual') mesesPermitidos = [12];

  const filtered = rendimientos.filter(r => {
    if (fCuenta && r.cuenta_id !== fCuenta) return false;
    if (fAnio && r.periodo) {
      const rAnio = r.periodo.split('-')[0];
      if (rAnio !== fAnio) return false;
    }
    if (mesesPermitidos && r.periodo) {
      var rMes = parseInt(r.periodo.split('-')[1]);
      if (mesesPermitidos.indexOf(rMes) === -1) return false;
    }
    return true;
  }).sort((a, b) => (b.fecha || b.periodo || '').localeCompare(a.fecha || a.periodo || ''));

  // Calculate acumulado per cuenta using rendimiento real
  const acumuladoByCuenta = {};
  rendimientos.forEach(r => {
    const cta = cuentaMap[r.cuenta_id];
    const moneda = cta ? cta.moneda : 'MXN';
    if (!acumuladoByCuenta[r.cuenta_id]) acumuladoByCuenta[r.cuenta_id] = 0;
    acumuladoByCuenta[r.cuenta_id] += toMXN(_rendReal(r), moneda, tiposCambio);
  });

  const tbody = document.getElementById('tbodyRendimientos');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:24px;">No hay rendimientos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const cta = cuentaMap[r.cuenta_id];
    const ctaNombre = cta ? cta.nombre : 'Desconocida';
    const moneda = cta ? cta.moneda : 'MXN';
    const capital = r.saldo_inicial || 0;
    const dias = r.dias || 0;
    // Rendimiento real (descuenta flujos de capital)
    const rendPeriodo = _rendReal(r);
    const rendPct = capital > 0 ? ((rendPeriodo / capital) * 100) : 0;
    const rendPctAnual = (capital > 0 && dias > 0) ? ((rendPeriodo / capital) * (365 / dias) * 100) : (r.rendimiento_pct_anual || 0);
    const acum = acumuladoByCuenta[r.cuenta_id] || 0;
    const tipo = r.tipo || 'Interes';
    const reinvTag = r.reinvertido ? '<span style="color:var(--accent-green);font-size:10px;margin-left:4px;"><i class="fas fa-recycle"></i></span>' : '';
    const rendColor = rendPeriodo >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    return `<tr>
      <td>${ctaNombre}</td>
      <td style="text-align:right;">${formatCurrency(capital, moneda)}</td>
      <td style="text-align:center;">${dias > 0 ? dias + 'd' : '\u2014'}</td>
      <td style="text-align:right;">${formatPct(rendPct)}</td>
      <td style="text-align:right;font-weight:600;">${formatPct(rendPctAnual)}</td>
      <td style="text-align:right;color:${rendColor};font-weight:600;">${formatCurrency(rendPeriodo, moneda)}${reinvTag}</td>
      <td style="text-align:right;color:var(--accent-blue);">${formatCurrency(acum, 'MXN')}</td>
      <td>${r.fecha ? formatDate(r.fecha) : r.periodo || '-'}</td>
      <td><span style="background:var(--accent-blue-soft);color:var(--accent-blue);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">${tipo}</span></td>
      <td style="text-align:center;">
        <button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="editRendimiento('${r.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteRendimiento('${r.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

/* -- Reporte Mensual de Rendimiento por Cuenta (12 meses del año seleccionado) -- */
function renderRendMensualReport() {
  var container = document.getElementById('rendMensualReportContainer');
  if (!container) return;

  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var fAnioEl = document.getElementById('filterRendAnio');
  var anio = fAnioEl ? parseInt(fAnioEl.value) : new Date().getFullYear();

  var cuentasInversion = cuentas.filter(function(c) { return c.activa !== false && c.tipo === 'inversion'; });
  var mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Build header
  var thead = '<tr><th style="min-width:130px;position:sticky;left:0;background:var(--bg-card);z-index:1;">Cuenta</th>';
  for (var m = 0; m < 12; m++) {
    thead += '<th style="text-align:center;min-width:90px;">' + mesesCortos[m] + '</th>';
  }
  thead += '<th style="text-align:right;min-width:100px;font-weight:800;">Total Anual</th></tr>';

  // Build rows
  var totalPorMes = new Array(12).fill(0);
  var totalGeneral = 0;

  var rows = cuentasInversion.map(function(cta) {
    var moneda = cta.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--text-primary);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;">' + cta.nombre + '</td>';
    var totalCuenta = 0;

    for (var m = 0; m < 12; m++) {
      var periodo = anio + '-' + String(m + 1).padStart(2, '0');
      var regs = rendimientos.filter(function(r) { return r.cuenta_id === cta.id && r.periodo === periodo; });

      if (regs.length === 0) {
        row += '<td style="text-align:center;color:var(--text-muted);font-size:11px;">\u2014</td>';
        continue;
      }

      var rendMonto = regs.reduce(function(s, r) { return s + _rendReal(r); }, 0);
      var rendPct = 0;
      // Use first record's saldo_inicial for percentage
      var saldoInicial = regs[0].saldo_inicial || 0;
      if (saldoInicial > 0) rendPct = (rendMonto / saldoInicial) * 100;

      var rendMXN = toMXN(rendMonto, moneda, tiposCambio);
      totalCuenta += rendMXN;
      totalPorMes[m] += rendMXN;

      var color = rendMonto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var sign = rendMonto >= 0 ? '+' : '';
      row += '<td style="text-align:right;font-size:11px;">' +
        '<div style="color:' + color + ';font-weight:600;">' + sign + formatCurrency(rendMonto, moneda) + '</div>' +
        '<div style="color:' + color + ';font-size:10px;opacity:0.8;">' + sign + rendPct.toFixed(2) + '%</div>' +
      '</td>';
    }

    totalGeneral += totalCuenta;
    var totalColor = totalCuenta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var totalSign = totalCuenta >= 0 ? '+' : '';
    row += '<td style="text-align:right;font-weight:700;color:' + totalColor + ';">' + totalSign + formatCurrency(totalCuenta, 'MXN') + '</td>';
    row += '</tr>';
    return row;
  }).join('');

  // Total row
  var totalRow = '<tr style="font-weight:700;border-top:2px solid var(--border-color);"><td style="position:sticky;left:0;background:var(--bg-card);z-index:1;">Total</td>';
  for (var m = 0; m < 12; m++) {
    if (totalPorMes[m] === 0) {
      totalRow += '<td style="text-align:center;color:var(--text-muted);font-size:11px;">\u2014</td>';
    } else {
      var mColor = totalPorMes[m] >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var mSign = totalPorMes[m] >= 0 ? '+' : '';
      totalRow += '<td style="text-align:right;font-size:11px;color:' + mColor + ';">' + mSign + formatCurrency(totalPorMes[m], 'MXN') + '</td>';
    }
  }
  var gColor = totalGeneral >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  var gSign = totalGeneral >= 0 ? '+' : '';
  totalRow += '<td style="text-align:right;font-weight:800;color:' + gColor + ';">' + gSign + formatCurrency(totalGeneral, 'MXN') + '</td></tr>';

  if (cuentasInversion.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-info-circle" style="margin-right:6px;"></i>No hay cuentas de inversion activas.</div>';
    return;
  }

  container.innerHTML =
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;"><i class="fas fa-calendar" style="margin-right:4px;"></i>Ano: ' + anio + '</div>' +
    '<table class="data-table" style="font-size:12px;"><thead>' + thead + '</thead><tbody>' + rows + totalRow + '</tbody></table>';
}

/* -- Edit / Create rendimiento modal -- */
function editRendimiento(id) {
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  let rend = null;
  if (id) rend = rendimientos.find(r => r.id === id);
  const isEdit = !!rend;
  const titulo = isEdit ? 'Editar Rendimiento' : 'Nuevo Rendimiento';

  const cuentaOpciones = cuentas
    .filter(c => c.activa !== false && c.tipo === 'inversion')
    .map(c => {
      const selected = rend && rend.cuenta_id === c.id ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.nombre} (${c.moneda})</option>`;
    }).join('');

  const hoy = new Date().toISOString().split('T')[0];
  const now = new Date();
  const periodoDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const formHTML = `
    <form id="formRendimiento" onsubmit="saveRendimiento(event)">
      <input type="hidden" id="rendId" value="${isEdit ? rend.id : ''}">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Cuenta de Inversion *</label>
          <select id="rendCuentaId" class="form-select" required>
            <option value="">Seleccionar cuenta...</option>
            ${cuentaOpciones}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input type="date" id="rendFecha" class="form-input" required value="${isEdit ? (rend.fecha || hoy) : hoy}">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Monto del Rendimiento *</label>
          <input type="number" id="rendMonto" class="form-input" required step="0.01" min="0"
                 value="${isEdit ? rend.rendimiento_monto : ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Tasa del Periodo (%)</label>
          <input type="number" id="rendTasa" class="form-input" step="0.01"
                 value="${isEdit ? (rend.rendimiento_pct || '') : ''}" placeholder="0.00">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Tipo de Rendimiento</label>
          <select id="rendTipo" class="form-select">
            <option value="Interes" ${isEdit && rend.tipo === 'Interes' ? 'selected' : ''}>Interes</option>
            <option value="Dividendo" ${isEdit && rend.tipo === 'Dividendo' ? 'selected' : ''}>Dividendo</option>
            <option value="Plusvalia" ${isEdit && rend.tipo === 'Plusvalia' ? 'selected' : ''}>Plusvalia</option>
            <option value="Renta" ${isEdit && rend.tipo === 'Renta' ? 'selected' : ''}>Renta</option>
            <option value="Otro" ${isEdit && rend.tipo === 'Otro' ? 'selected' : ''}>Otro</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:24px;">
          <input type="checkbox" id="rendReinvertido" ${isEdit && rend.reinvertido ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-green);">
          <label for="rendReinvertido" class="form-label" style="margin-bottom:0;cursor:pointer;">Reinvertido (sumar al saldo de la cuenta)</label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea id="rendNotas" class="form-input" rows="3" style="resize:vertical;"
                  placeholder="Notas adicionales...">${isEdit && rend.notas ? rend.notas : ''}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Rendimiento'}
        </button>
      </div>
    </form>
  `;

  openModal(titulo, formHTML);
}

/* -- Save rendimiento -- */
function saveRendimiento(event) {
  event.preventDefault();

  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const id = document.getElementById('rendId').value;
  const cuenta_id = document.getElementById('rendCuentaId').value;
  const fecha = document.getElementById('rendFecha').value;
  const rendimiento_monto = parseFloat(document.getElementById('rendMonto').value) || 0;
  const rendimiento_pct = parseFloat(document.getElementById('rendTasa').value) || 0;
  const tipo = document.getElementById('rendTipo').value;
  const reinvertido = document.getElementById('rendReinvertido').checked;
  const notas = document.getElementById('rendNotas').value.trim();

  if (!cuenta_id || !fecha || rendimiento_monto <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  const cuentaIdx = cuentas.findIndex(c => c.id === cuenta_id);
  if (cuentaIdx === -1) {
    showToast('La cuenta seleccionada no existe.', 'error');
    return;
  }

  // Build periodo from fecha
  const fechaDate = new Date(fecha);
  const periodo = `${fechaDate.getFullYear()}-${String(fechaDate.getMonth() + 1).padStart(2, '0')}`;
  const saldo_inicial = cuentas[cuentaIdx].saldo;

  if (id) {
    // -- UPDATE --
    const rIdx = rendimientos.findIndex(r => r.id === id);
    if (rIdx === -1) { showToast('No se encontro el rendimiento.', 'error'); return; }

    const oldRend = rendimientos[rIdx];

    // Reverse old reinversion if applicable
    if (oldRend.reinvertido) {
      const oldCtaIdx = cuentas.findIndex(c => c.id === oldRend.cuenta_id);
      if (oldCtaIdx !== -1) cuentas[oldCtaIdx].saldo -= oldRend.rendimiento_monto;
    }

    // Apply new reinversion
    if (reinvertido) {
      cuentas[cuentaIdx].saldo += rendimiento_monto;
    }

    rendimientos[rIdx] = {
      ...oldRend,
      cuenta_id, fecha, periodo,
      saldo_inicial: saldo_inicial,
      saldo_final: saldo_inicial + rendimiento_monto,
      rendimiento_monto, rendimiento_pct,
      tipo, reinvertido, notas,
      updated: new Date().toISOString(),
    };

    saveData(STORAGE_KEYS.rendimientos, rendimientos);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Rendimiento actualizado exitosamente.', 'success');
  } else {
    // -- CREATE --
    const nuevoRend = {
      id: uuid(),
      cuenta_id, fecha, periodo,
      saldo_inicial: saldo_inicial,
      saldo_final: saldo_inicial + rendimiento_monto,
      rendimiento_monto, rendimiento_pct,
      tipo, reinvertido, notas,
      created: new Date().toISOString(),
    };

    if (reinvertido) {
      cuentas[cuentaIdx].saldo += rendimiento_monto;
    }

    rendimientos.push(nuevoRend);
    saveData(STORAGE_KEYS.rendimientos, rendimientos);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Rendimiento creado exitosamente.', 'success');
  }

  closeModal();
  renderRendimientos();
  updateHeaderPatrimonio();
}

/* -- Delete rendimiento -- */
function deleteRendimiento(id) {
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const rend = rendimientos.find(r => r.id === id);
  if (!rend) return;

  const cta = cuentas.find(c => c.id === rend.cuenta_id);
  const ctaNombre = cta ? cta.nombre : 'Desconocida';
  const confirmar = confirm('\u00BFEstas seguro de eliminar este rendimiento?\n' + ctaNombre + ' - ' + formatCurrency(_rendReal(rend), cta ? cta.moneda : 'MXN') + '\n\nEsta accion no se puede deshacer.');
  if (!confirmar) return;

  // Reverse reinversion if applicable
  if (rend.reinvertido && cta) {
    const ctaIdx = cuentas.findIndex(c => c.id === rend.cuenta_id);
    if (ctaIdx !== -1) {
      cuentas[ctaIdx].saldo -= rend.rendimiento_monto;
      saveData(STORAGE_KEYS.cuentas, cuentas);
    }
  }

  const newRendimientos = rendimientos.filter(r => r.id !== id);
  saveData(STORAGE_KEYS.rendimientos, newRendimientos);

  showToast('Rendimiento eliminado exitosamente.', 'info');
  renderRendimientos();
  updateHeaderPatrimonio();
}

/* ============================================================
   DESGLOSE: Rendimiento del Mes / Rendimiento del Ano
   ============================================================ */
function _mostrarDesgloseRendPeriodo(filtroFn, titulo, color) {
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var filtered = rendimientos.filter(filtroFn);
  var byCuenta = {};
  var total = 0;

  filtered.forEach(function(r) {
    var cta = cuentaMap[r.cuenta_id];
    var nombre = cta ? cta.nombre : 'Desconocida';
    var moneda = cta ? cta.moneda : 'MXN';
    var rendReal = _rendReal(r);
    var montoMXN = toMXN(rendReal, moneda, tiposCambio);
    if (!byCuenta[nombre]) byCuenta[nombre] = { monto: 0, montoOrig: 0, moneda: moneda, count: 0 };
    byCuenta[nombre].monto += montoMXN;
    byCuenta[nombre].montoOrig += rendReal;
    byCuenta[nombre].count++;
    total += montoMXN;
  });

  var rows = Object.entries(byCuenta).sort(function(a, b) { return b[1].monto - a[1].monto; }).map(function(entry) {
    var pct = total > 0 ? (entry[1].monto / total * 100).toFixed(1) : '0.0';
    var rendColor = entry[1].monto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var sign = entry[1].monto >= 0 ? '+' : '';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + entry[0] + '</td>' +
      '<td style="text-align:center;">' + entry[1].count + ' cierre' + (entry[1].count > 1 ? 's' : '') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + rendColor + ';">' + sign + formatCurrency(entry[1].montoOrig, entry[1].moneda) + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + rendColor + ';">' + sign + formatCurrency(entry[1].monto, 'MXN') + '</td>' +
      '<td style="text-align:right;color:var(--text-muted);">' + pct + '%</td>' +
    '</tr>';
  }).join('');

  var totalSign = total >= 0 ? '+' : '';
  rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
    '<td>Total</td>' +
    '<td style="text-align:center;">' + filtered.length + '</td>' +
    '<td></td>' +
    '<td style="text-align:right;color:' + color + ';">' + totalSign + formatCurrency(total, 'MXN') + '</td>' +
    '<td></td>' +
  '</tr>';

  var html = '<table class="data-table sortable-table"><thead><tr>' +
    '<th>Cuenta</th><th style="text-align:center;">Cierres</th><th style="text-align:right;">Monto Original</th><th style="text-align:right;">Monto (MXN)</th><th style="text-align:right;">%</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';

  if (filtered.length === 0) {
    html = '<div style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-info-circle" style="font-size:20px;margin-bottom:8px;display:block;"></i>No hay rendimientos registrados para este periodo.</div>';
  }

  openModal(titulo, html);
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
}

function mostrarDesgloseRendMes() {
  var now = new Date();
  var periodoActual = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var mesLabel = typeof mesNombre === 'function' ? mesNombre(now.getMonth()) : (now.getMonth() + 1);
  _mostrarDesgloseRendPeriodo(
    function(r) { return r.periodo === periodoActual; },
    'Desglose Rendimiento: ' + mesLabel + ' ' + now.getFullYear(),
    'var(--accent-green)'
  );
}

function mostrarDesgloseRendAnio() {
  var now = new Date();
  var anioActual = String(now.getFullYear());
  _mostrarDesgloseRendPeriodo(
    function(r) { return r.periodo && r.periodo.startsWith(anioActual); },
    'Desglose Rendimiento: Ano ' + anioActual,
    'var(--accent-blue)'
  );
}
