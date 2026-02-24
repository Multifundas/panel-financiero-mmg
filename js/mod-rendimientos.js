function renderRendimientos() {
  const el = document.getElementById('module-rendimientos');

  // -- Load data --
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  const inflacionAnual = config.inflacion_anual != null ? config.inflacion_anual : 4.5;

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();
  const periodoActual = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;

  // -- KPI calculations --
  const rendMes = rendimientos
    .filter(r => r.periodo === periodoActual)
    .reduce((s, r) => {
      const cta = cuentaMap[r.cuenta_id];
      return s + toMXN(r.rendimiento_monto, cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

  const rendAnio = rendimientos
    .filter(r => r.periodo && r.periodo.startsWith(String(anioActual)))
    .reduce((s, r) => {
      const cta = cuentaMap[r.cuenta_id];
      return s + toMXN(r.rendimiento_monto, cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

  // Tasa promedio ponderada (usa tasa anualizada)
  let sumCapitalTasa = 0;
  let sumCapital = 0;
  rendimientos.filter(r => r.periodo === periodoActual).forEach(r => {
    const cta = cuentaMap[r.cuenta_id];
    const capital = cta ? toMXN(cta.saldo, cta.moneda, tiposCambio) : 0;
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

  // -- Build month/year selector options --
  const mesesOpts = Array.from({length: 12}, (_, i) =>
    `<option value="${i}" ${i === mesActual ? 'selected' : ''}>${mesNombre(i)}</option>`
  ).join('');
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
          <div class="form-group" style="margin-bottom:0;min-width:120px;">
            <select id="filterRendMes" class="form-select" onchange="filterRendimientos()">
              <option value="">Todos los meses</option>
              ${mesesOpts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:100px;">
            <select id="filterRendAnio" class="form-select" onchange="filterRendimientos()">
              ${aniosOpts}
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="editRendimiento(null)">
          <i class="fas fa-plus"></i> Nuevo Rendimiento
        </button>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Rendimientos Mensuales por Cuenta</h3>
        <div style="height:280px;"><canvas id="rendBarChart"></canvas></div>
      </div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Rendimiento Acumulado</h3>
        <div style="height:280px;"><canvas id="rendLineChart"></canvas></div>
      </div>
    </div>

    <!-- Tabla Resumen por Cuenta -->
    <div class="card">
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

    <!-- Rendimiento Real vs Inflacion -->
    <div class="card" style="margin-top:24px;">
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title"><i class="fas fa-balance-scale" style="margin-right:8px;color:var(--accent-amber);"></i>Rendimiento Real vs Inflacion</span>
        <span class="badge" style="background:${tasaPromedio > inflacionAnual ? 'var(--accent-green-soft)' : 'var(--accent-red-soft)'};color:${tasaPromedio > inflacionAnual ? 'var(--accent-green)' : 'var(--accent-red)'};">
          Rend. Real Prom. Ponderado: ${formatPct(tasaPromedio - inflacionAnual)}
        </span>
      </div>
      <div style="height:320px;"><canvas id="rendRealChart"></canvas></div>
      <p style="margin-top:12px;font-size:12px;color:var(--text-muted);">
        <i class="fas fa-info-circle" style="margin-right:4px;"></i>
        Tasa de inflacion configurada: ${inflacionAnual}%. Puedes cambiarla en Configuracion.
      </p>
    </div>
  `;

  // -- Render charts --
  window._charts = window._charts || {};
  const _cc = typeof getChartColors === 'function' ? getChartColors() : { fontColor: '#94a3b8', gridColor: 'rgba(51,65,85,0.5)', borderColor: '#1e293b' };
  const chartFontColor = _cc.fontColor;
  const gridColor = _cc.gridColor;
  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // Build last 12 months labels and data per account
  const last12 = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(anioActual, mesActual - i, 1);
    last12.push({
      label: mesNombre(dt.getMonth()).substring(0, 3) + ' ' + dt.getFullYear().toString().slice(-2),
      periodo: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    });
  }

  // Stacked bar: rendimientos by account
  const barDatasets = cuentasInversion.map((cta, idx) => {
    const data = last12.map(m => {
      return rendimientos
        .filter(r => r.cuenta_id === cta.id && r.periodo === m.periodo)
        .reduce((s, r) => s + toMXN(r.rendimiento_monto, cta.moneda, tiposCambio), 0);
    });
    return {
      label: cta.nombre,
      data: data,
      backgroundColor: palette[idx % palette.length] + 'AA',
      borderColor: palette[idx % palette.length],
      borderWidth: 1,
      borderRadius: 3,
    };
  });

  if (window._charts.rendBar) window._charts.rendBar.destroy();
  const barCtx = document.getElementById('rendBarChart').getContext('2d');
  window._charts.rendBar = new Chart(barCtx, {
    type: 'bar',
    data: { labels: last12.map(m => m.label), datasets: barDatasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: { color: chartFontColor, font: { size: 10, family: "'Plus Jakarta Sans'" } },
          grid: { display: false },
        },
        y: {
          stacked: true,
          ticks: {
            color: chartFontColor,
            font: { size: 10, family: "'Plus Jakarta Sans'" },
            callback: function(val) { return '$' + (val / 1000).toFixed(0) + 'k'; },
          },
          grid: { color: gridColor },
        },
      },
      plugins: {
        legend: { labels: { color: chartFontColor, padding: 12, font: { size: 11, family: "'Plus Jakarta Sans'" }, usePointStyle: true } },
        tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y, 'MXN'); } } },
      },
    },
  });

  // Line chart: cumulative rendimiento
  let cumulative = 0;
  const cumulativeData = last12.map(m => {
    const monthTotal = rendimientos
      .filter(r => r.periodo === m.periodo)
      .reduce((s, r) => {
        const cta = cuentaMap[r.cuenta_id];
        return s + toMXN(r.rendimiento_monto, cta ? cta.moneda : 'MXN', tiposCambio);
      }, 0);
    cumulative += monthTotal;
    return cumulative;
  });

  if (window._charts.rendLine) window._charts.rendLine.destroy();
  const lineCtx = document.getElementById('rendLineChart').getContext('2d');
  window._charts.rendLine = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: last12.map(m => m.label),
      datasets: [{
        label: 'Acumulado (MXN)',
        data: cumulativeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true, tension: 0.35,
        pointBackgroundColor: '#10b981', pointRadius: 4, pointHoverRadius: 6, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: 10, family: "'Plus Jakarta Sans'" } },
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

  // -- Rendimiento Real vs Inflacion chart --
  const rendRealLabels = [];
  const dataNominal = [];
  const dataInflacion = [];
  const dataReal = [];
  const bgNominal = [];
  const bgReal = [];

  cuentasInversion.forEach(cta => {
    // Usar tasa anualizada del ultimo cierre, o fallback al campo estatico
    let tasaNominal = cta.rendimiento_anual || 0;
    const hist = cta.historial_saldos || [];
    if (hist.length > 0) {
      const ultimoCierre = [...hist].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultimoCierre.rendimiento_pct_anual != null) tasaNominal = ultimoCierre.rendimiento_pct_anual;
    }
    const tasaReal = tasaNominal - inflacionAnual;
    rendRealLabels.push(cta.nombre);
    dataNominal.push(tasaNominal);
    dataInflacion.push(inflacionAnual);
    dataReal.push(tasaReal);
    bgNominal.push(tasaNominal >= inflacionAnual ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)');
    bgReal.push(tasaReal >= 0 ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)');
  });

  if (window._charts.rendReal) window._charts.rendReal.destroy();
  const rendRealCtx = document.getElementById('rendRealChart');
  if (rendRealCtx) {
    window._charts.rendReal = new Chart(rendRealCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: rendRealLabels,
        datasets: [
          {
            label: 'Rendimiento Nominal (%)',
            data: dataNominal,
            backgroundColor: bgNominal,
            borderColor: bgNominal.map(c => c.replace(/[\d.]+\)$/, '1)')),
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
          },
          {
            label: 'Inflacion (%)',
            data: dataInflacion,
            backgroundColor: 'rgba(251,191,36,0.25)',
            borderColor: 'rgba(251,191,36,0.9)',
            borderWidth: 2,
            borderRadius: 4,
            borderDash: [5, 3],
            order: 1,
            type: 'line',
            fill: false,
            pointBackgroundColor: 'rgba(251,191,36,1)',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0,
          },
          {
            label: 'Rendimiento Real (%)',
            data: dataReal,
            backgroundColor: bgReal,
            borderColor: bgReal.map(c => c.replace(/[\d.]+\)$/, '1)')),
            borderWidth: 1,
            borderRadius: 4,
            order: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: chartFontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 30 },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: chartFontColor,
              font: { size: 11, family: "'Plus Jakarta Sans'" },
              callback: function(val) { return val.toFixed(1) + '%'; },
            },
            grid: { color: gridColor },
          },
        },
        plugins: {
          legend: {
            labels: { color: chartFontColor, padding: 14, font: { size: 11, family: "'Plus Jakarta Sans'" }, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + '%';
              },
            },
          },
        },
      },
    });
  }

  // Populate table
  filterRendimientos();
  setTimeout(function() { _initSortableTables(document.getElementById('module-rendimientos')); }, 100);
}

/* -- Filter and render rendimientos table rows -- */
function filterRendimientos() {
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const fCuenta = document.getElementById('filterRendCuenta') ? document.getElementById('filterRendCuenta').value : '';
  const fMesEl = document.getElementById('filterRendMes');
  const fMes = fMesEl ? fMesEl.value : '';
  const fAnio = document.getElementById('filterRendAnio') ? document.getElementById('filterRendAnio').value : '';

  const filtered = rendimientos.filter(r => {
    if (fCuenta && r.cuenta_id !== fCuenta) return false;
    if (fAnio && r.periodo) {
      const rAnio = r.periodo.split('-')[0];
      if (rAnio !== fAnio) return false;
    }
    if (fMes !== '' && r.periodo) {
      const rMes = parseInt(r.periodo.split('-')[1]) - 1;
      if (rMes !== parseInt(fMes)) return false;
    }
    return true;
  }).sort((a, b) => (b.fecha || b.periodo || '').localeCompare(a.fecha || a.periodo || ''));

  // Calculate acumulado per cuenta
  const acumuladoByCuenta = {};
  rendimientos.forEach(r => {
    const cta = cuentaMap[r.cuenta_id];
    const moneda = cta ? cta.moneda : 'MXN';
    if (!acumuladoByCuenta[r.cuenta_id]) acumuladoByCuenta[r.cuenta_id] = 0;
    acumuladoByCuenta[r.cuenta_id] += toMXN(r.rendimiento_monto, moneda, tiposCambio);
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
    const capital = r.saldo_inicial || (cta ? cta.saldo : 0);
    const tasa = r.rendimiento_pct || 0;
    const tasaAnual = r.rendimiento_pct_anual != null ? r.rendimiento_pct_anual : tasa;
    const dias = r.dias || 0;
    const rendPeriodo = r.rendimiento_monto || 0;
    const acum = acumuladoByCuenta[r.cuenta_id] || 0;
    const tipo = r.tipo || 'Interes';
    const reinvTag = r.reinvertido ? '<span style="color:var(--accent-green);font-size:10px;margin-left:4px;"><i class="fas fa-recycle"></i></span>' : '';

    return `<tr>
      <td>${ctaNombre}</td>
      <td style="text-align:right;">${formatCurrency(capital, moneda)}</td>
      <td style="text-align:center;">${dias > 0 ? dias + 'd' : '\u2014'}</td>
      <td style="text-align:right;">${formatPct(tasa)}</td>
      <td style="text-align:right;font-weight:600;">${formatPct(tasaAnual)}</td>
      <td style="text-align:right;color:var(--accent-green);">${formatCurrency(rendPeriodo, moneda)}${reinvTag}</td>
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
  const confirmar = confirm('\u00BFEstas seguro de eliminar este rendimiento?\n' + ctaNombre + ' - ' + formatCurrency(rend.rendimiento_monto, cta ? cta.moneda : 'MXN') + '\n\nEsta accion no se puede deshacer.');
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
    var montoMXN = toMXN(r.rendimiento_monto || 0, moneda, tiposCambio);
    if (!byCuenta[nombre]) byCuenta[nombre] = { monto: 0, montoOrig: 0, moneda: moneda, count: 0 };
    byCuenta[nombre].monto += montoMXN;
    byCuenta[nombre].montoOrig += (r.rendimiento_monto || 0);
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
