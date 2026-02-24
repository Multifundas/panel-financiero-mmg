/* ============================================================
   PRESUPUESTOS  -  Budget helpers & modal
   ============================================================ */
function _buildPresupuestoSection(categorias, catMap, movimientos, cuentaMap, tiposCambio) {
  const presupuestos = loadData(STORAGE_KEYS.presupuestos) || [];
  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  // Current month gastos per category (in MXN)
  const gastosDelMes = movimientos.filter(function(m) {
    if (m.tipo !== 'gasto') return false;
    var f = new Date(m.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  var gastosPorCat = {};
  gastosDelMes.forEach(function(m) {
    var catId = m.categoria_id || 'sin_cat';
    var cta = cuentaMap[m.cuenta_id];
    var montoMXN = toMXN(m.monto, cta ? cta.moneda : 'MXN', tiposCambio);
    gastosPorCat[catId] = (gastosPorCat[catId] || 0) + montoMXN;
  });

  // Only categories with a budget
  var budgetItems = presupuestos.filter(function(p) { return p.monto_mensual > 0; });

  if (budgetItems.length === 0) {
    return `
      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
          <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:0;">
            <i class="fas fa-bullseye" style="margin-right:8px;color:var(--accent-blue);"></i>Presupuesto Mensual
          </h3>
          <button class="btn" onclick="configurarPresupuestos()" style="font-size:12px;padding:6px 14px;">
            <i class="fas fa-cog" style="margin-right:4px;"></i>Configurar Presupuestos
          </button>
        </div>
        <p style="color:var(--text-muted);font-size:13px;margin:0;">No hay presupuestos configurados. Haz clic en "Configurar Presupuestos" para establecer limites mensuales por categoria.</p>
      </div>
    `;
  }

  // Build per-category rows
  var totalPresupuesto = 0;
  var totalGastado = 0;
  var rowsHTML = '';

  budgetItems.forEach(function(p) {
    var cat = catMap[p.categoria_id];
    if (!cat) return;
    var budgetMXN = toMXN(p.monto_mensual, p.moneda || 'MXN', tiposCambio);
    var spent = gastosPorCat[p.categoria_id] || 0;
    totalPresupuesto += budgetMXN;
    totalGastado += spent;

    var pct = budgetMXN > 0 ? (spent / budgetMXN) * 100 : 0;
    var remaining = budgetMXN - spent;

    // Color logic
    var barColor, badgeColor, badgeText;
    if (pct > 100) {
      barColor = '#ef4444'; badgeColor = 'rgba(239,68,68,0.15)'; badgeText = 'Excedido';
    } else if (pct >= 80) {
      barColor = '#f59e0b'; badgeColor = 'rgba(245,158,11,0.15)'; badgeText = 'Alerta';
    } else {
      barColor = '#10b981'; badgeColor = 'rgba(16,185,129,0.15)'; badgeText = 'OK';
    }

    var barWidth = Math.min(pct, 100);

    rowsHTML += `
      <div style="padding:12px 0;border-bottom:1px solid var(--border-color);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fas ${cat.icono}" style="color:${cat.color};font-size:14px;width:20px;text-align:center;"></i>
            <span style="font-weight:600;font-size:13px;color:var(--text-primary);">${cat.nombre}</span>
            <span class="badge" style="background:${badgeColor};color:${barColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;">${badgeText}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);">
            <span style="font-weight:700;color:${barColor};">${formatCurrency(spent, 'MXN')}</span>
            <span style="color:var(--text-muted);"> / ${formatCurrency(budgetMXN, 'MXN')}</span>
          </div>
        </div>
        <div class="progress-bar" style="height:8px;background:var(--bg-base);border-radius:4px;overflow:hidden;">
          <div class="progress-bar-fill" style="width:${barWidth}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.4s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
          <span style="font-size:11px;color:var(--text-muted);">${pct.toFixed(1)}% utilizado</span>
          <span style="font-size:11px;color:${remaining >= 0 ? 'var(--text-secondary)' : '#ef4444'};font-weight:600;">
            ${remaining >= 0 ? 'Disponible: ' + formatCurrency(remaining, 'MXN') : 'Excedido: ' + formatCurrency(Math.abs(remaining), 'MXN')}
          </span>
        </div>
      </div>
    `;
  });

  // Overall totals
  var totalPct = totalPresupuesto > 0 ? (totalGastado / totalPresupuesto) * 100 : 0;
  var totalRemaining = totalPresupuesto - totalGastado;
  var totalBarColor, totalBadgeColor, totalBadgeText;
  if (totalPct > 100) {
    totalBarColor = '#ef4444'; totalBadgeColor = 'rgba(239,68,68,0.15)'; totalBadgeText = 'Excedido';
  } else if (totalPct >= 80) {
    totalBarColor = '#f59e0b'; totalBadgeColor = 'rgba(245,158,11,0.15)'; totalBadgeText = 'Alerta';
  } else {
    totalBarColor = '#10b981'; totalBadgeColor = 'rgba(16,185,129,0.15)'; totalBadgeText = 'En rango';
  }
  var totalBarWidth = Math.min(totalPct, 100);

  return `
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:0;">
          <i class="fas fa-bullseye" style="margin-right:8px;color:var(--accent-blue);"></i>Presupuesto Mensual
          <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:8px;">${mesNombre(mesActual)} ${anioActual}</span>
        </h3>
        <button class="btn" onclick="configurarPresupuestos()" style="font-size:12px;padding:6px 14px;">
          <i class="fas fa-cog" style="margin-right:4px;"></i>Configurar Presupuestos
        </button>
      </div>

      ${rowsHTML}

      <!-- Overall total -->
      <div style="margin-top:16px;padding:14px;background:var(--bg-base);border-radius:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fas fa-chart-pie" style="color:var(--accent-blue);font-size:14px;"></i>
            <span style="font-weight:700;font-size:13px;color:var(--text-primary);">Total Presupuesto</span>
            <span class="badge" style="background:${totalBadgeColor};color:${totalBarColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;">${totalBadgeText}</span>
          </div>
          <div style="font-size:13px;">
            <span style="font-weight:700;color:${totalBarColor};">${formatCurrency(totalGastado, 'MXN')}</span>
            <span style="color:var(--text-muted);"> / ${formatCurrency(totalPresupuesto, 'MXN')}</span>
          </div>
        </div>
        <div class="progress-bar" style="height:10px;background:var(--bg-card);border-radius:5px;overflow:hidden;">
          <div class="progress-bar-fill" style="width:${totalBarWidth}%;height:100%;background:${totalBarColor};border-radius:5px;transition:width 0.4s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
          <span style="font-size:11px;color:var(--text-muted);">${totalPct.toFixed(1)}% utilizado</span>
          <span style="font-size:11px;color:${totalRemaining >= 0 ? 'var(--text-secondary)' : '#ef4444'};font-weight:600;">
            ${totalRemaining >= 0 ? 'Disponible: ' + formatCurrency(totalRemaining, 'MXN') : 'Excedido: ' + formatCurrency(Math.abs(totalRemaining), 'MXN')}
          </span>
        </div>
      </div>
    </div>
  `;
}

function configurarPresupuestos() {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var presupuestos = loadData(STORAGE_KEYS.presupuestos) || [];

  // Map existing budgets by categoria_id
  var budgetMap = {};
  presupuestos.forEach(function(p) { budgetMap[p.categoria_id] = p; });

  var rowsHTML = '';
  categorias.forEach(function(cat) {
    var existing = budgetMap[cat.id];
    var monto = existing ? existing.monto_mensual : '';
    var moneda = existing ? (existing.moneda || 'MXN') : 'MXN';
    rowsHTML += `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-color);">
        <div style="display:flex;align-items:center;gap:8px;min-width:180px;">
          <i class="fas ${cat.icono}" style="color:${cat.color};font-size:14px;width:20px;text-align:center;"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${cat.nombre}</span>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:8px;">
          <input type="number" class="form-input" name="pres_monto_${cat.id}" value="${monto}"
            placeholder="0" min="0" step="100"
            style="width:140px;font-size:13px;padding:6px 10px;" />
          <select class="form-select" name="pres_moneda_${cat.id}" style="width:90px;font-size:12px;padding:6px 8px;">
            <option value="MXN" ${moneda === 'MXN' ? 'selected' : ''}>MXN</option>
            <option value="USD" ${moneda === 'USD' ? 'selected' : ''}>USD</option>
          </select>
        </div>
      </div>
    `;
  });

  var html = `
    <form onsubmit="savePresupuestos(event)">
      <p style="color:var(--text-secondary);font-size:12px;margin-bottom:16px;">
        Establece el limite mensual de gasto para cada categoria. Deja en blanco o en 0 las categorias que no deseas rastrear.
      </p>
      <div style="max-height:400px;overflow-y:auto;">
        ${rowsHTML}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn" onclick="closeModal()" style="background:var(--bg-card-hover);color:var(--text-secondary);">Cancelar</button>
        <button type="submit" class="btn" style="background:var(--accent-blue);color:white;">
          <i class="fas fa-save" style="margin-right:4px;"></i>Guardar Presupuestos
        </button>
      </div>
    </form>
  `;

  openModal('Configurar Presupuestos Mensuales', html);
}

function savePresupuestos(event) {
  event.preventDefault();
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var presupuestos = [];

  categorias.forEach(function(cat) {
    var montoEl = document.querySelector('[name="pres_monto_' + cat.id + '"]');
    var monedaEl = document.querySelector('[name="pres_moneda_' + cat.id + '"]');
    var monto = montoEl ? parseFloat(montoEl.value) : 0;
    var moneda = monedaEl ? monedaEl.value : 'MXN';

    if (monto && monto > 0) {
      presupuestos.push({
        categoria_id: cat.id,
        monto_mensual: monto,
        moneda: moneda,
      });
    }
  });

  saveData(STORAGE_KEYS.presupuestos, presupuestos);
  closeModal();
  showToast('Presupuestos guardados correctamente', 'success');
  renderGastos();
}

/* ============================================================
   GASTOS MODULE  -  Main render
   ============================================================ */
function renderGastos() {
  const el = document.getElementById('module-gastos');

  // -- Load data --
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });
  const catMap = {};
  categorias.forEach(cat => { catMap[cat.id] = cat; });

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  // Build month/year selector options
  const mesesOpts = Array.from({length: 12}, (_, i) =>
    `<option value="${i}" ${i === mesActual ? 'selected' : ''}>${mesNombre(i)}</option>`
  ).join('');
  const aniosSet = new Set();
  movimientos.forEach(m => {
    if (m.tipo === 'gasto' && m.fecha) aniosSet.add(new Date(m.fecha).getFullYear());
  });
  aniosSet.add(anioActual);
  const aniosOpts = [...aniosSet].sort((a, b) => b - a)
    .map(a => `<option value="${a}" ${a === anioActual ? 'selected' : ''}>${a}</option>`)
    .join('');

  // All gastos
  const gastos = movimientos.filter(m => m.tipo === 'gasto');

  // Selected month gastos
  const gastosDelMes = gastos.filter(m => {
    const f = new Date(m.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const totalMes = gastosDelMes.reduce((s, m) => {
    const cta = cuentaMap[m.cuenta_id];
    return s + toMXN(m.monto, cta ? cta.moneda : 'MXN', tiposCambio);
  }, 0);

  // Build presupuesto section HTML
  const presupuestoHTML = _buildPresupuestoSection(categorias, catMap, movimientos, cuentaMap, tiposCambio);

  el.innerHTML = `
    <!-- Presupuesto Mensual -->
    ${presupuestoHTML}

    <!-- Nota informativa -->
    <div class="card" style="margin-bottom:24px;border-left:3px solid var(--accent-amber);">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="fas fa-info-circle" style="color:var(--accent-amber);font-size:16px;"></i>
        <span style="color:var(--text-secondary);font-size:13px;">Los gastos se registran desde <strong style="color:var(--text-primary);cursor:pointer;text-decoration:underline;" onclick="navigateTo('movimientos')">Movimientos</strong>. Aqui se muestra el analisis y visualizacion.</span>
      </div>
    </div>

    <!-- Filtro Mes/Ano y KPI -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:140px;">
            <select id="filterGastosMes" class="form-select" onchange="renderGastos()">
              ${mesesOpts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:100px;">
            <select id="filterGastosAnio" class="form-select" onchange="renderGastos()">
              ${aniosOpts}
            </select>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Total del Mes:</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-red);">${formatCurrency(totalMes, 'MXN')}</div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Distribucion por Categoria</h3>
        <div style="height:300px;display:flex;align-items:center;justify-content:center;"><canvas id="gastosDonutChart"></canvas></div>
      </div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Gastos Mensuales por Categoria (12 meses)</h3>
        <div style="height:300px;"><canvas id="gastosBarChart"></canvas></div>
      </div>
    </div>

    <!-- Tabla Gastos agrupados por categoria -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Detalle de Gastos del Mes</h3>
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaGastos">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th>Cuenta</th>
              <th style="text-align:right;">Monto</th>
              <th style="text-align:right;">Monto (MXN)</th>
            </tr>
          </thead>
          <tbody id="tbodyGastos"></tbody>
        </table>
      </div>
    </div>
  `;

  // -- Read selected filters (may differ from initial values if user changed them) --
  const selMesEl = document.getElementById('filterGastosMes');
  const selAnioEl = document.getElementById('filterGastosAnio');
  const selMes = selMesEl ? parseInt(selMesEl.value) : mesActual;
  const selAnio = selAnioEl ? parseInt(selAnioEl.value) : anioActual;

  // Recalculate gastos for selected period
  const gastosSelected = gastos.filter(m => {
    const f = new Date(m.fecha);
    return f.getMonth() === selMes && f.getFullYear() === selAnio;
  });

  // -- Donut: distribution by category --
  const catTotals = {};
  gastosSelected.forEach(m => {
    const catId = m.categoria_id || 'sin_cat';
    const cta = cuentaMap[m.cuenta_id];
    const montoMXN = toMXN(m.monto, cta ? cta.moneda : 'MXN', tiposCambio);
    catTotals[catId] = (catTotals[catId] || 0) + montoMXN;
  });

  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
  const donutLabels = [];
  const donutData = [];
  const donutColors = [];
  let cIdx = 0;
  for (const [catId, total] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
    const cat = catMap[catId];
    donutLabels.push(cat ? cat.nombre : 'Sin Categoria');
    donutData.push(total);
    donutColors.push(palette[cIdx % palette.length]);
    cIdx++;
  }

  window._charts = window._charts || {};
  const _cc = typeof getChartColors === 'function' ? getChartColors() : { fontColor: '#94a3b8', gridColor: 'rgba(51,65,85,0.5)', borderColor: '#1e293b' };
  const chartFontColor = _cc.fontColor;
  const gridColor = _cc.gridColor;

  if (window._charts.gastosDonut) window._charts.gastosDonut.destroy();
  const donutCtx = document.getElementById('gastosDonutChart').getContext('2d');
  window._charts.gastosDonut = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: donutLabels,
      datasets: [{
        data: donutData,
        backgroundColor: donutColors,
        borderColor: _cc.borderColor,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: chartFontColor, padding: 12, font: { size: 11, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ctx.label + ': ' + formatCurrency(val, 'MXN') + ' (' + pct + '%)';
            },
          },
        },
      },
    },
  });

  // -- Stacked bar: monthly gastos by category last 12 months --
  const last12 = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(selAnio, selMes - i, 1);
    last12.push({
      label: mesNombre(dt.getMonth()).substring(0, 3) + ' ' + dt.getFullYear().toString().slice(-2),
      month: dt.getMonth(),
      year: dt.getFullYear(),
    });
  }

  // Get unique categories from gastos
  const uniqueCats = {};
  gastos.forEach(m => {
    const catId = m.categoria_id || 'sin_cat';
    const cat = catMap[catId];
    uniqueCats[catId] = cat ? cat.nombre : 'Sin Categoria';
  });

  const barDatasets = Object.entries(uniqueCats).map(([catId, catName], idx) => {
    const data = last12.map(m => {
      return gastos
        .filter(g => {
          const f = new Date(g.fecha);
          const gCatId = g.categoria_id || 'sin_cat';
          return gCatId === catId && f.getMonth() === m.month && f.getFullYear() === m.year;
        })
        .reduce((s, g) => {
          const cta = cuentaMap[g.cuenta_id];
          return s + toMXN(g.monto, cta ? cta.moneda : 'MXN', tiposCambio);
        }, 0);
    });
    return {
      label: catName,
      data: data,
      backgroundColor: palette[idx % palette.length] + 'AA',
      borderColor: palette[idx % palette.length],
      borderWidth: 1,
      borderRadius: 3,
    };
  });

  if (window._charts.gastosBar) window._charts.gastosBar.destroy();
  const barCtx = document.getElementById('gastosBarChart').getContext('2d');
  window._charts.gastosBar = new Chart(barCtx, {
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

  // -- Table: gastos grouped by category with subtotals --
  const tbody = document.getElementById('tbodyGastos');
  if (!tbody) return;

  if (gastosSelected.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No hay gastos registrados en este periodo</td></tr>';
    return;
  }

  // Group by category
  const grouped = {};
  gastosSelected.forEach(m => {
    const catId = m.categoria_id || 'sin_cat';
    if (!grouped[catId]) grouped[catId] = [];
    grouped[catId].push(m);
  });

  let totalGeneral = 0;
  let rowsHTML = '';

  // Sort categories by total descending
  const sortedCats = Object.entries(grouped).sort((a, b) => {
    const totA = a[1].reduce((s, m) => { const c = cuentaMap[m.cuenta_id]; return s + toMXN(m.monto, c ? c.moneda : 'MXN', tiposCambio); }, 0);
    const totB = b[1].reduce((s, m) => { const c = cuentaMap[m.cuenta_id]; return s + toMXN(m.monto, c ? c.moneda : 'MXN', tiposCambio); }, 0);
    return totB - totA;
  });

  sortedCats.forEach(([catId, items]) => {
    const cat = catMap[catId];
    const catNombre = cat ? cat.nombre : 'Sin Categoria';
    let subtotal = 0;

    items.sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((m, i) => {
      const cta = cuentaMap[m.cuenta_id];
      const ctaNombre = cta ? cta.nombre : 'Desconocida';
      const moneda = cta ? cta.moneda : 'MXN';
      const montoMXN = toMXN(m.monto, moneda, tiposCambio);
      subtotal += montoMXN;
      totalGeneral += montoMXN;

      rowsHTML += `<tr>
        <td>${i === 0 ? '<strong>' + catNombre + '</strong>' : ''}</td>
        <td>${formatDate(m.fecha)}</td>
        <td>${m.descripcion || '-'}</td>
        <td>${ctaNombre}</td>
        <td style="text-align:right;">${formatCurrency(m.monto, moneda)}</td>
        <td style="text-align:right;">${formatCurrency(montoMXN, 'MXN')}</td>
      </tr>`;
    });

    // Subtotal row
    rowsHTML += `<tr style="background:var(--bg-card-hover);font-weight:700;">
      <td colspan="5" style="text-align:right;color:var(--text-secondary);">Subtotal ${catNombre}:</td>
      <td style="text-align:right;color:var(--accent-red);">${formatCurrency(subtotal, 'MXN')}</td>
    </tr>`;
  });

  // Grand total row
  rowsHTML += `<tr style="background:var(--bg-base);font-weight:800;border-top:2px solid var(--border-color);">
    <td colspan="5" style="text-align:right;color:var(--text-primary);font-size:14px;">TOTAL GASTOS:</td>
    <td style="text-align:right;color:var(--accent-red);font-size:14px;">${formatCurrency(totalGeneral, 'MXN')}</td>
  </tr>`;

  tbody.innerHTML = rowsHTML;
  setTimeout(function() { _initSortableTables(document.getElementById('module-gastos')); }, 100);
}
