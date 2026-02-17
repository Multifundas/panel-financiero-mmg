/* ============================================================
   MODULE: DASHBOARD
   ============================================================ */
// Dashboard filter state
var _dashboardFilters = {
  periodo: 'mensual',
  anio: new Date().getFullYear(),
};

function applyDashboardFilters() {
  var periodoSel = document.getElementById('dashFilterPeriodo');
  var anioSel = document.getElementById('dashFilterAnio');
  if (periodoSel) _dashboardFilters.periodo = periodoSel.value;
  if (anioSel) _dashboardFilters.anio = parseInt(anioSel.value);
  renderDashboard();
}

function renderDashboard() {
  const el = document.getElementById('module-dashboard');

  // -- Load data --
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  const historial = loadData(STORAGE_KEYS.historial_patrimonio) || [];
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const propiedades = loadData(STORAGE_KEYS.propiedades) || [];

  // -- Filter settings --
  const periodo = _dashboardFilters.periodo;
  const anioFiltro = _dashboardFilters.anio;
  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  // -- Calculate date range based on selected period --
  let fechaInicio, fechaFin;
  fechaFin = new Date(anioFiltro, 11, 31, 23, 59, 59);
  if (anioFiltro === anioActual) {
    fechaFin = now;
  }

  switch (periodo) {
    case 'semanal':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaInicio.getDate() - 7);
      break;
    case 'mensual':
      fechaInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);
      break;
    case 'bimestral':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setMonth(fechaInicio.getMonth() - 2);
      fechaInicio.setDate(1);
      break;
    case 'trimestral':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setMonth(fechaInicio.getMonth() - 3);
      fechaInicio.setDate(1);
      break;
    case 'semestral':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setMonth(fechaInicio.getMonth() - 6);
      fechaInicio.setDate(1);
      break;
    case 'anual':
      fechaInicio = new Date(anioFiltro, 0, 1);
      break;
    default:
      fechaInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);
  }

  // Period label for display
  const periodoLabels = {
    semanal: 'Semanal', mensual: 'del Mes', bimestral: 'Bimestral',
    trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual'
  };
  const periodoLabel = periodoLabels[periodo] || 'del Mes';

  // -- KPI 1: Patrimonio Total (cuentas + propiedades + prestamos otorgados - prestamos recibidos) --
  const _patCalc = typeof calcPatrimonioTotal === 'function' ? calcPatrimonioTotal() : { total: 0, cuentas: 0, propiedades: 0, prestamosOtorgados: 0, prestamosRecibidos: 0 };
  let patrimonioTotal = _patCalc.total;

  // -- Filter movimientos for selected period --
  const movsFiltrados = movimientos.filter(mv => {
    const f = new Date(mv.fecha);
    return f >= fechaInicio && f <= fechaFin;
  });

  // -- Generate list of relevant periodos for rendimientos --
  const periodosList = [];
  let tmpDate = new Date(fechaInicio);
  while (tmpDate <= fechaFin) {
    periodosList.push(`${tmpDate.getFullYear()}-${String(tmpDate.getMonth() + 1).padStart(2, '0')}`);
    tmpDate.setMonth(tmpDate.getMonth() + 1);
  }

  // -- KPI 2: Rendimientos del periodo --
  const rendPeriodo = rendimientos
    .filter(r => periodosList.includes(r.periodo))
    .reduce((sum, r) => sum + toMXN(r.rendimiento_monto, 'MXN', tiposCambio), 0);

  // -- KPI 3: Gastos del periodo --
  const gastosPeriodo = movsFiltrados
    .filter(mv => mv.tipo === 'gasto')
    .reduce((sum, mv) => sum + toMXN(mv.monto, mv.moneda, tiposCambio), 0);

  // -- KPI 4: Balance Neto --
  const ingresosPeriodo = movsFiltrados
    .filter(mv => mv.tipo === 'ingreso')
    .reduce((sum, mv) => sum + toMXN(mv.monto, mv.moneda, tiposCambio), 0);
  const balanceNeto = rendPeriodo + ingresosPeriodo - gastosPeriodo;

  // -- KPI 5: Rendimiento Promedio Ponderado (usa tasa anualizada del ultimo cierre) --
  const invCuentas = cuentas.filter(c => c.activa !== false && c.tipo === 'inversion');
  let sumPonderado = 0;
  let sumPesos = 0;
  invCuentas.forEach(c => {
    const valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
    // Obtener tasa anualizada del ultimo cierre, o fallback al campo estatico
    let tasaAnual = c.rendimiento_anual || 0;
    const hist = c.historial_saldos || [];
    if (hist.length > 0) {
      const ultimoCierre = [...hist].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultimoCierre.rendimiento_pct_anual != null) {
        tasaAnual = ultimoCierre.rendimiento_pct_anual;
      }
    }
    if (tasaAnual === 0) return;
    sumPonderado += valMXN * tasaAnual;
    sumPesos += valMXN;
  });
  const rendPromedio = sumPesos > 0 ? (sumPonderado / sumPesos) : 0;

  // -- Top 5 activos by value --
  const activosOrdenados = cuentas
    .filter(c => c.activa !== false)
    .map(c => ({ ...c, valorMXN: toMXN(c.saldo, c.moneda, tiposCambio) }))
    .sort((a, b) => b.valorMXN - a.valorMXN)
    .slice(0, 5);

  // -- Last 5 movimientos by date --
  const ultimosMovs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  // -- Find account name by id --
  const cuentaMap = {};
  cuentas.forEach(c => cuentaMap[c.id] = c.nombre);

  // -- Distribution by account type --
  const distTipo = { debito: 0, inversion: 0, inmueble: 0, activo_fijo: 0 };
  cuentas.forEach(c => {
    if (c.activa !== false && distTipo.hasOwnProperty(c.tipo)) {
      distTipo[c.tipo] += toMXN(c.saldo, c.moneda, tiposCambio);
    }
  });

  // -- Helper: color for KPI --
  function kpiColor(val) { return val >= 0 ? 'text-green' : 'text-red'; }

  // -- Build historial patrimonio chart data --
  const historialSorted = [...historial].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const barLabels = historialSorted.map(h => {
    const d = new Date(h.fecha);
    return mesNombre(d.getMonth()).substring(0, 3) + ' ' + d.getFullYear();
  });
  const barData = historialSorted.map(h => h.valor);

  // If no history, use current patrimonio as single point
  if (barLabels.length === 0) {
    barLabels.push(mesNombre(mesActual).substring(0, 3) + ' ' + anioActual);
    barData.push(patrimonioTotal);
  }

  // -- Build year options --
  const availableYears = [];
  for (let yr = anioActual; yr >= anioActual - 5; yr--) { availableYears.push(yr); }
  const yearOptions = availableYears.map(yr =>
    `<option value="${yr}" ${yr === anioFiltro ? 'selected' : ''}>${yr}</option>`
  ).join('');

  // -- Alertas de Vencimiento --
  const alertasVencimiento = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en90dias = new Date(hoy);
  en90dias.setDate(en90dias.getDate() + 90);

  // Helper: calculate days remaining and urgency
  function calcularAlerta(fechaStr) {
    if (!fechaStr) return null;
    const fecha = new Date(fechaStr);
    fecha.setHours(0, 0, 0, 0);
    if (fecha < hoy || fecha > en90dias) return null;
    const diffMs = fecha - hoy;
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let urgencia, badgeClass, color, colorSoft, icon;
    if (dias <= 30) {
      urgencia = 'alta';
      badgeClass = 'badge-red';
      color = 'var(--accent-red)';
      colorSoft = 'var(--accent-red-soft)';
      icon = 'fa-exclamation-triangle';
    } else if (dias <= 60) {
      urgencia = 'media';
      badgeClass = 'badge-amber';
      color = 'var(--accent-amber)';
      colorSoft = 'var(--accent-amber-soft)';
      icon = 'fa-exclamation-circle';
    } else {
      urgencia = 'baja';
      badgeClass = 'badge-blue';
      color = 'var(--accent-blue)';
      colorSoft = 'var(--accent-blue-soft)';
      icon = 'fa-info-circle';
    }
    return { dias, urgencia, badgeClass, color, colorSoft, icon, fecha };
  }

  // Check inversiones with fecha_vencimiento
  cuentas.forEach(c => {
    if (c.activa !== false && c.tipo === 'inversion' && c.fecha_vencimiento) {
      const alerta = calcularAlerta(c.fecha_vencimiento);
      if (alerta) {
        alertasVencimiento.push({
          nombre: c.nombre,
          tipoLabel: 'Inversion',
          tipoIcon: 'fa-chart-line',
          monto: formatCurrency(c.saldo, c.moneda),
          ...alerta,
        });
      }
    }
  });

  // Check prestamos activos
  prestamos.forEach(p => {
    if (p.estado === 'activo' && p.fecha_vencimiento) {
      const alerta = calcularAlerta(p.fecha_vencimiento);
      if (alerta) {
        alertasVencimiento.push({
          nombre: p.persona + (p.tipo === 'otorgado' ? ' (otorgado)' : ' (recibido)'),
          tipoLabel: 'Prestamo',
          tipoIcon: 'fa-handshake',
          monto: formatCurrency(p.saldo_pendiente, p.moneda),
          ...alerta,
        });
      }
    }
  });

  // Check propiedades preventa with fecha_entrega
  propiedades.forEach(pr => {
    if (pr.tipo === 'preventa' && pr.fecha_entrega) {
      const alerta = calcularAlerta(pr.fecha_entrega);
      if (alerta) {
        alertasVencimiento.push({
          nombre: pr.nombre,
          tipoLabel: 'Preventa',
          tipoIcon: 'fa-building',
          monto: formatCurrency(pr.valor_actual || pr.valor_compra, pr.moneda),
          ...alerta,
        });
      }
    }
  });

  // Sort by days remaining (most urgent first)
  alertasVencimiento.sort((a, b) => a.dias - b.dias);

  // Build alertas HTML
  let alertasHTML = '';
  if (alertasVencimiento.length === 0) {
    alertasHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-bell" style="margin-right:8px;color:var(--accent-amber);"></i>Alertas de Vencimiento</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:16px 0;color:var(--text-muted);font-size:13px;">
          <i class="fas fa-check-circle" style="color:var(--accent-green);font-size:18px;"></i>
          Sin alertas de vencimiento proximas (90 dias)
        </div>
      </div>`;
  } else {
    const alertCards = alertasVencimiento.map(a => `
      <div style="min-width:260px;max-width:300px;flex:0 0 auto;background:var(--card-bg);border:1px solid var(--border-color);border-left:4px solid ${a.color};border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:${a.colorSoft};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="fas ${a.icon}" style="color:${a.color};font-size:14px;"></i>
          </div>
          <div style="min-width:0;">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${a.nombre}">${a.nombre}</div>
            <span class="badge ${a.badgeClass}" style="font-size:10px;padding:2px 6px;">${a.tipoLabel}</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Vence en</div>
            <div style="font-size:20px;font-weight:800;color:${a.color};">${a.dias} <span style="font-size:12px;font-weight:600;">dias</span></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Monto</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${a.monto}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;">
          <i class="fas fa-calendar-alt" style="margin-right:4px;"></i>${formatDate(a.fecha.toISOString())}
        </div>
      </div>
    `).join('');

    alertasHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-bell" style="margin-right:8px;color:var(--accent-amber);"></i>Alertas de Vencimiento</span>
          <span class="badge badge-amber" style="font-size:11px;">${alertasVencimiento.length} alerta${alertasVencimiento.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;gap:14px;overflow-x:auto;padding:4px 0 8px 0;">
          ${alertCards}
        </div>
      </div>`;
  }

  // -- Deuda Total Calculations --
  const prestamosRecibidos = prestamos.filter(p => p.tipo === 'recibido' && p.estado === 'activo');
  const preventaPendientes = propiedades.filter(pr => pr.tipo === 'preventa' && (pr.mensualidades_total - pr.mensualidades_pagadas) > 0);

  let deudaPrestamos = 0;
  prestamosRecibidos.forEach(p => {
    deudaPrestamos += toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
  });

  let deudaPreventa = 0;
  preventaPendientes.forEach(pr => {
    const restantes = pr.mensualidades_total - pr.mensualidades_pagadas;
    deudaPreventa += toMXN(restantes * pr.monto_mensualidad, pr.moneda || 'MXN', tiposCambio);
  });

  const totalDeuda = deudaPrestamos + deudaPreventa;
  const ratioDeudaPatrimonio = patrimonioTotal > 0 ? (totalDeuda / patrimonioTotal) * 100 : 0;

  let deudaColor, deudaBadge, deudaLabel;
  if (ratioDeudaPatrimonio < 30) {
    deudaColor = 'var(--accent-green)';
    deudaBadge = 'badge-green';
    deudaLabel = 'Saludable';
  } else if (ratioDeudaPatrimonio <= 60) {
    deudaColor = 'var(--accent-amber)';
    deudaBadge = 'badge-amber';
    deudaLabel = 'Moderado';
  } else {
    deudaColor = 'var(--accent-red)';
    deudaBadge = 'badge-red';
    deudaLabel = 'Elevado';
  }

  const deudaBreakdownRows = [];
  prestamosRecibidos.forEach(p => {
    deudaBreakdownRows.push({
      nombre: p.persona,
      tipoLabel: 'Prestamo',
      tipoBadge: 'badge-red',
      monto: toMXN(p.saldo_pendiente, p.moneda, tiposCambio),
      detalle: p.tasa_interes > 0 ? 'Tasa: ' + p.tasa_interes.toFixed(1) + '%' : 'Sin intereses',
    });
  });
  preventaPendientes.forEach(pr => {
    const restantes = pr.mensualidades_total - pr.mensualidades_pagadas;
    const montoPendiente = toMXN(restantes * pr.monto_mensualidad, pr.moneda || 'MXN', tiposCambio);
    deudaBreakdownRows.push({
      nombre: pr.nombre,
      tipoLabel: 'Preventa',
      tipoBadge: 'badge-amber',
      monto: montoPendiente,
      detalle: restantes + ' mensualidades restantes',
    });
  });

  const deudaDonutLabels = deudaBreakdownRows.map(r => r.nombre);
  const deudaDonutData = deudaBreakdownRows.map(r => r.monto);
  const deudaDonutColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981'];

  let deudaHTML = '';
  if (totalDeuda > 0 || prestamosRecibidos.length > 0 || preventaPendientes.length > 0) {
    const breakdownTableRows = deudaBreakdownRows.map(r => `
      <tr>
        <td style="font-weight:600;color:var(--text-primary);">${r.nombre}</td>
        <td><span class="badge ${r.tipoBadge}">${r.tipoLabel}</span></td>
        <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(r.monto, 'MXN')}</td>
        <td style="color:var(--text-muted);font-size:12px;">${r.detalle}</td>
      </tr>
    `).join('');

    deudaHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-file-invoice-dollar" style="margin-right:8px;color:var(--accent-red);"></i>Resumen de Deuda</span>
          <span class="badge ${deudaBadge}">${deudaLabel}</span>
        </div>
        <div class="grid-2" style="gap:24px;">
          <div>
            <div class="grid-2" style="margin-bottom:16px;">
              <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Total Deuda</div>
                <div style="font-size:22px;font-weight:800;color:var(--accent-red);">${formatCurrency(totalDeuda, 'MXN')}</div>
              </div>
              <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Deuda / Patrimonio</div>
                <div style="font-size:22px;font-weight:800;color:${deudaColor};">${ratioDeudaPatrimonio.toFixed(1)}%</div>
                <div style="margin-top:6px;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${Math.min(ratioDeudaPatrimonio, 100)}%;background:${deudaColor};border-radius:3px;"></div>
                </div>
              </div>
            </div>
            <table class="data-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th style="text-align:right;">Saldo Pendiente</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                ${breakdownTableRows}
              </tbody>
              <tfoot>
                <tr style="font-weight:700;border-top:2px solid var(--border-color);">
                  <td colspan="2">Total</td>
                  <td style="text-align:right;color:var(--accent-red);">${formatCurrency(totalDeuda, 'MXN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;">
            <div style="position:relative;width:100%;max-width:260px;height:260px;">
              <canvas id="dashDeudaDonutChart"></canvas>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    deudaHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-file-invoice-dollar" style="margin-right:8px;color:var(--accent-red);"></i>Resumen de Deuda</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:16px 0;color:var(--text-muted);font-size:13px;">
          <i class="fas fa-check-circle" style="color:var(--accent-green);font-size:18px;"></i>
          No tienes deudas pendientes. Excelente situacion financiera.
        </div>
      </div>`;
  }

  // -- Diversificacion Calculations (Herfindahl-Hirschman Index) --
  const cuentasActivas = cuentas.filter(c => c.activa !== false);
  const patrimonioDiversificacion = cuentasActivas.reduce((sum, c) => sum + toMXN(c.saldo, c.moneda, tiposCambio), 0);

  let hhi = 0;
  if (patrimonioDiversificacion > 0) {
    cuentasActivas.forEach(c => {
      const share = toMXN(c.saldo, c.moneda, tiposCambio) / patrimonioDiversificacion;
      hhi += share * share;
    });
  }
  const diversificationScore = (1 - hhi) * 100;

  let divColor, divBadge, divRecommendation, divIcon;
  if (diversificationScore > 70) {
    divColor = 'var(--accent-green)';
    divBadge = 'badge-green';
    divRecommendation = 'Buena diversificacion';
    divIcon = 'fa-shield-alt';
  } else if (diversificationScore >= 40) {
    divColor = 'var(--accent-amber)';
    divBadge = 'badge-amber';
    divRecommendation = 'Diversificacion moderada';
    divIcon = 'fa-exclamation-circle';
  } else {
    divColor = 'var(--accent-red)';
    divBadge = 'badge-red';
    divRecommendation = 'Portafolio muy concentrado';
    divIcon = 'fa-exclamation-triangle';
  }

  const divByTipo = { debito: 0, inversion: 0, inmueble: 0, activo_fijo: 0 };
  cuentasActivas.forEach(c => {
    if (divByTipo.hasOwnProperty(c.tipo)) {
      divByTipo[c.tipo] += toMXN(c.saldo, c.moneda, tiposCambio);
    }
  });
  const tipoLabelsMap = { debito: 'Debito', inversion: 'Inversion', inmueble: 'Inmueble', activo_fijo: 'Activo Fijo' };
  const tipoColorsMap = { debito: '#3b82f6', inversion: '#10b981', inmueble: '#f59e0b', activo_fijo: '#8b5cf6' };

  const divByMoneda = {};
  cuentasActivas.forEach(c => {
    const mon = (c.moneda || 'MXN').toUpperCase();
    if (!divByMoneda[mon]) divByMoneda[mon] = 0;
    divByMoneda[mon] += toMXN(c.saldo, c.moneda, tiposCambio);
  });
  const monedaColors = { MXN: '#3b82f6', USD: '#10b981', EUR: '#f59e0b' };

  const dashInstituciones = loadData(STORAGE_KEYS.instituciones) || [];
  const instMapId = {};
  dashInstituciones.forEach(i => instMapId[i.id] = i.nombre);

  const divByInst = {};
  cuentasActivas.forEach(c => {
    const instName = instMapId[c.institucion_id] || 'Sin institucion';
    if (!divByInst[instName]) divByInst[instName] = 0;
    divByInst[instName] += toMXN(c.saldo, c.moneda, tiposCambio);
  });
  const instColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#84cc16'];

  function buildDivBreakdownBars(dataObj, labelsMap, colorsMap, colorsArr, total) {
    const entries = Object.entries(dataObj).filter(function(e) { return e[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; });
    return entries.map(function(entry, idx) {
      var key = entry[0], val = entry[1];
      var pct = total > 0 ? (val / total * 100) : 0;
      var label = labelsMap ? (labelsMap[key] || key) : key;
      var color = colorsMap ? (colorsMap[key] || colorsArr[idx % colorsArr.length]) : colorsArr[idx % colorsArr.length];
      return '<div style="margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
          '<span style="font-size:12px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + color + ';display:inline-block;"></span>' +
            label +
          '</span>' +
          '<span style="font-size:11px;color:var(--text-muted);">' + formatCurrency(val, 'MXN') + ' (' + pct.toFixed(1) + '%)</span>' +
        '</div>' +
        '<div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px;transition:width 0.3s;"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  const divTipoBars = buildDivBreakdownBars(divByTipo, tipoLabelsMap, tipoColorsMap, instColors, patrimonioDiversificacion);
  const divMonedaBars = buildDivBreakdownBars(divByMoneda, null, monedaColors, instColors, patrimonioDiversificacion);
  const divInstBars = buildDivBreakdownBars(divByInst, null, null, instColors, patrimonioDiversificacion);

  const diversificacionHTML = `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
        <span class="card-title"><i class="fas fa-th" style="margin-right:8px;color:${divColor};"></i>Indicador de Diversificacion</span>
        <span class="badge ${divBadge}">${divRecommendation}</span>
      </div>
      <div class="grid-2" style="gap:24px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
          <div style="position:relative;width:180px;height:180px;">
            <canvas id="dashDiversificacionGauge"></canvas>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
              <div style="font-size:36px;font-weight:800;color:${divColor};">${diversificationScore.toFixed(0)}</div>
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Puntos</div>
            </div>
          </div>
          <div style="text-align:center;">
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:6px;">
              <i class="fas ${divIcon}" style="color:${divColor};"></i>
              <span style="font-size:14px;font-weight:700;color:${divColor};">${divRecommendation}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);">HHI: ${hhi.toFixed(4)} | Score: ${diversificationScore.toFixed(1)}%</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${cuentasActivas.length} activos en portafolio</div>
          </div>
        </div>
        <div>
          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
              <i class="fas fa-layer-group" style="margin-right:4px;"></i> Por Tipo de Activo
            </div>
            ${divTipoBars}
          </div>
          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
              <i class="fas fa-coins" style="margin-right:4px;"></i> Por Moneda
            </div>
            ${divMonedaBars}
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
              <i class="fas fa-university" style="margin-right:4px;"></i> Por Institucion
            </div>
            ${divInstBars}
          </div>
        </div>
      </div>
    </div>`;

  // -- Build Resumen Panel --
  var resumenPanelHTML = buildResumenPanel(movimientos, cuentas, prestamos, propiedades);

  // -- Render HTML --
  el.innerHTML = resumenPanelHTML + `
    <!-- Filtros -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px;">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;"><i class="fas fa-filter" style="margin-right:4px;"></i>Filtros:</span>
        <select id="dashFilterPeriodo" class="form-select" style="min-width:140px;padding:6px 10px;font-size:13px;" onchange="applyDashboardFilters()">
          <option value="semanal" ${periodo === 'semanal' ? 'selected' : ''}>Semanal</option>
          <option value="mensual" ${periodo === 'mensual' ? 'selected' : ''}>Mensual</option>
          <option value="bimestral" ${periodo === 'bimestral' ? 'selected' : ''}>Bimestral</option>
          <option value="trimestral" ${periodo === 'trimestral' ? 'selected' : ''}>Trimestral</option>
          <option value="semestral" ${periodo === 'semestral' ? 'selected' : ''}>Semestral</option>
          <option value="anual" ${periodo === 'anual' ? 'selected' : ''}>Anual</option>
        </select>
        <select id="dashFilterAnio" class="form-select" style="min-width:100px;padding:6px 10px;font-size:13px;" onchange="applyDashboardFilters()">
          ${yearOptions}
        </select>
      </div>
    </div>

    <!-- KPI Cards Row 1 -->
    <div class="grid-4" style="margin-bottom:16px;">
      <div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesglosePatrimonio()">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-landmark" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Patrimonio Total</span>
        </div>
        <div style="font-size:22px;font-weight:800;color:var(--text-primary);">${formatCurrency(patrimonioTotal, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px;"><i class="fas fa-chevron-right" style="margin-right:4px;"></i>Click para ver desglose</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-green);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-chart-line" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rendimientos ${periodoLabel}</span>
        </div>
        <div class="${kpiColor(rendPeriodo)}" style="font-size:22px;font-weight:800;">${formatCurrency(rendPeriodo, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-red);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-receipt" style="color:var(--accent-red);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Gastos ${periodoLabel}</span>
        </div>
        <div class="text-red" style="font-size:22px;font-weight:800;">${formatCurrency(gastosPeriodo, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-purple);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-balance-scale" style="color:var(--accent-purple);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Balance Neto</span>
        </div>
        <div class="${kpiColor(balanceNeto)}" style="font-size:22px;font-weight:800;">${formatCurrency(balanceNeto, 'MXN')}</div>
      </div>
    </div>

    <!-- KPI Row 2: Rendimiento promedio (clickable) -->
    <div style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-amber);cursor:pointer;" onclick="mostrarDesgloseRendimiento()">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-percentage" style="color:var(--accent-amber);font-size:16px;"></i>
            </div>
            <div>
              <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rendimiento Promedio Ponderado</span>
              <div style="font-size:22px;font-weight:800;color:var(--accent-amber);">${rendPromedio.toFixed(2)}%</div>
              <div style="font-size:11px;color:var(--text-muted);">Basado en ${invCuentas.length} producto${invCuentas.length !== 1 ? 's' : ''} de inversion | ${formatCurrency(sumPesos, 'MXN')} invertidos</div>
            </div>
          </div>
          <div style="color:var(--text-muted);font-size:13px;">
            <i class="fas fa-chevron-right" style="margin-left:8px;"></i> Click para ver desglose
          </div>
        </div>
      </div>
    </div>

    <!-- Alertas de Vencimiento -->
    ${alertasHTML}

    <!-- Dashboard de Deuda Total -->
    ${deudaHTML}

    <!-- Indicador de Diversificacion -->
    ${diversificacionHTML}

    <!-- Charts Row 1: Donut + Bar -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-pie" style="margin-right:8px;color:var(--accent-amber);"></i>Distribucion por Tipo</span>
        </div>
        <div style="position:relative;height:280px;display:flex;align-items:center;justify-content:center;">
          <canvas id="dashDonutChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-chart-bar" style="margin-right:8px;color:var(--accent-blue);"></i>Evolucion del Patrimonio</span>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="editarHistorialPatrimonio()">
            <i class="fas fa-edit"></i> Editar Historial
          </button>
        </div>
        <div style="position:relative;height:280px;">
          <canvas id="dashBarChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Charts Row 2: Line -->
    <div style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-area" style="margin-right:8px;color:var(--accent-green);"></i>Rendimientos vs Gastos (12 meses - ${anioFiltro})</span>
        </div>
        <div style="position:relative;height:300px;">
          <canvas id="dashLineChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Summary Tables -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-trophy" style="margin-right:8px;color:var(--accent-amber);"></i>Top 5 Activos</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Tipo</th>
              <th style="text-align:right;">Valor (MXN)</th>
            </tr>
          </thead>
          <tbody>
            ${activosOrdenados.map(c => {
              const tipoBadge = c.tipo === 'inversion' ? 'badge-green'
                : c.tipo === 'inmueble' ? 'badge-amber'
                : c.tipo === 'activo_fijo' ? 'badge-purple' : 'badge-blue';
              const tipoLabel = c.tipo === 'inversion' ? 'Inversion'
                : c.tipo === 'inmueble' ? 'Inmueble'
                : c.tipo === 'activo_fijo' ? 'Activo Fijo' : 'Debito';
              return `<tr>
                <td style="font-weight:600;color:var(--text-primary);">${c.nombre}</td>
                <td><span class="badge ${tipoBadge}">${tipoLabel}</span></td>
                <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(c.valorMXN, 'MXN')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-clock" style="margin-right:8px;color:var(--accent-blue);"></i>Ultimos 5 Movimientos</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th>Tipo</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${ultimosMovs.map(mv => {
              const esGasto = mv.tipo === 'gasto';
              const tipoBadge = esGasto ? 'badge-red' : 'badge-green';
              const tipoLabel = esGasto ? 'Gasto' : 'Ingreso';
              const signo = esGasto ? '-' : '+';
              return `<tr>
                <td>${formatDate(mv.fecha)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${mv.descripcion}">${mv.descripcion}</td>
                <td><span class="badge ${tipoBadge}">${tipoLabel}</span></td>
                <td style="text-align:right;font-weight:600;" class="${esGasto ? 'text-red' : 'text-green'}">${signo}${formatCurrency(mv.monto, mv.moneda)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Analisis Ano vs Ano -->
    <div style="margin-top:24px;" id="seccionAnalisisAnual">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <span class="card-title"><i class="fas fa-exchange-alt" style="margin-right:8px;color:var(--accent-purple);"></i>Analisis Ano vs Ano</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-size:12px;font-weight:600;color:var(--text-muted);">Ano 1:</label>
              <select id="yoyAnio1" class="form-select" style="min-width:90px;padding:6px 10px;font-size:13px;"></select>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-size:12px;font-weight:600;color:var(--text-muted);">Ano 2:</label>
              <select id="yoyAnio2" class="form-select" style="min-width:90px;padding:6px 10px;font-size:13px;"></select>
            </div>
            <button class="btn btn-primary" style="padding:6px 16px;font-size:13px;" onclick="compararAnios()">
              <i class="fas fa-chart-bar" style="margin-right:4px;"></i>Comparar
            </button>
          </div>
        </div>
      </div>
      <div style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-bar" style="margin-right:8px;color:var(--accent-blue);"></i>Rendimientos Mensuales Comparados</span>
          </div>
          <div style="position:relative;height:320px;">
            <canvas id="yoyBarChart"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-green);"></i>Resumen Comparativo</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table" id="yoyComparisonTable">
            <thead>
              <tr>
                <th>Concepto</th>
                <th style="text-align:right;">--</th>
                <th style="text-align:right;">--</th>
                <th style="text-align:right;">Diferencia</th>
                <th style="text-align:right;">% Cambio</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Selecciona dos anos y presiona Comparar</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // ======================================================
  //  CHARTS -- destroy previous instances then create
  // ======================================================
  window._charts = window._charts || {};

  // Shared chart defaults
  const _cc = typeof getChartColors === 'function' ? getChartColors() : { fontColor: '#94a3b8', gridColor: 'rgba(51,65,85,0.5)', borderColor: '#1e293b' };
  const chartFontColor = _cc.fontColor;
  const gridColor = _cc.gridColor;

  // -- 1. Donut: Distribucion por Tipo --
  if (window._charts.dashDonut) window._charts.dashDonut.destroy();
  const donutCtx = document.getElementById('dashDonutChart').getContext('2d');
  window._charts.dashDonut = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Debito', 'Inversion', 'Inmueble', 'Activo Fijo'],
      datasets: [{
        data: [distTipo.debito, distTipo.inversion, distTipo.inmueble, distTipo.activo_fijo],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        borderColor: _cc.borderColor,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: chartFontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
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

  // -- 2. Bar: Evolucion del Patrimonio (historial manual) --
  if (window._charts.dashBar) window._charts.dashBar.destroy();
  const barCtx = document.getElementById('dashBarChart').getContext('2d');
  window._charts.dashBar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Patrimonio (MXN)',
        data: barData,
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: 10, family: "'Plus Jakarta Sans'" } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: chartFontColor,
            font: { size: 10, family: "'Plus Jakarta Sans'" },
            callback: function(val) { return '$' + (val / 1000000).toFixed(1) + 'M'; },
          },
          grid: { color: gridColor },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return 'Patrimonio: ' + formatCurrency(ctx.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });

  // -- 3. Line: Rendimientos vs Gastos 12 meses --
  const lineLabels = [];
  const rendData = [];
  const gastosData = [];

  const chartRefMonth = anioFiltro === anioActual ? mesActual : 11;
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(anioFiltro, chartRefMonth - i, 1);
    const mIdx = dt.getMonth();
    const aIdx = dt.getFullYear();
    const per = `${aIdx}-${String(mIdx + 1).padStart(2, '0')}`;
    lineLabels.push(mesNombre(mIdx).substring(0, 3) + ' ' + aIdx.toString().slice(-2));

    // Rendimientos for this period
    const rMes = rendimientos
      .filter(r => r.periodo === per)
      .reduce((s, r) => s + toMXN(r.rendimiento_monto, 'MXN', tiposCambio), 0);
    rendData.push(rMes);

    // Gastos for this period
    const gMes = movimientos
      .filter(mv => {
        if (mv.tipo !== 'gasto') return false;
        const f = new Date(mv.fecha);
        return f.getMonth() === mIdx && f.getFullYear() === aIdx;
      })
      .reduce((s, mv) => s + toMXN(mv.monto, mv.moneda, tiposCambio), 0);
    gastosData.push(gMes);
  }

  if (window._charts.dashLine) window._charts.dashLine.destroy();
  const lineCtx = document.getElementById('dashLineChart').getContext('2d');
  window._charts.dashLine = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: lineLabels,
      datasets: [
        {
          label: 'Rendimientos',
          data: rendData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Gastos',
          data: gastosData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
        legend: {
          labels: { color: chartFontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" }, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });

  // -- 4. Deuda Donut: Breakdown by source --
  if (totalDeuda > 0 && deudaDonutData.length > 0) {
    if (window._charts.dashDeudaDonut) window._charts.dashDeudaDonut.destroy();
    const deudaDonutEl = document.getElementById('dashDeudaDonutChart');
    if (deudaDonutEl) {
      const deudaDonutCtx = deudaDonutEl.getContext('2d');
      window._charts.dashDeudaDonut = new Chart(deudaDonutCtx, {
        type: 'doughnut',
        data: {
          labels: deudaDonutLabels,
          datasets: [{
            data: deudaDonutData,
            backgroundColor: deudaDonutColors.slice(0, deudaDonutData.length),
            borderColor: _cc.borderColor,
            borderWidth: 3,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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
    }
  }

  // -- 5. Diversificacion Gauge (half-donut) --
  if (window._charts.dashDivGauge) window._charts.dashDivGauge.destroy();
  const divGaugeEl = document.getElementById('dashDiversificacionGauge');
  if (divGaugeEl) {
    const divGaugeCtx = divGaugeEl.getContext('2d');
    const scoreVal = diversificationScore;
    const remainVal = 100 - scoreVal;
    // Determine gauge fill color based on score
    let gaugeFillColor;
    if (scoreVal > 70) {
      gaugeFillColor = '#10b981';
    } else if (scoreVal >= 40) {
      gaugeFillColor = '#f59e0b';
    } else {
      gaugeFillColor = '#ef4444';
    }
    window._charts.dashDivGauge = new Chart(divGaugeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Diversificacion', 'Restante'],
        datasets: [{
          data: [scoreVal, remainVal],
          backgroundColor: [gaugeFillColor, 'rgba(100,116,139,0.15)'],
          borderColor: _cc.borderColor,
          borderWidth: 2,
          hoverOffset: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: function(tooltipItem) { return tooltipItem.dataIndex === 0; },
            callbacks: {
              label: function(ctx) {
                return 'Diversificacion: ' + ctx.parsed.toFixed(1) + '%';
              },
            },
          },
        },
      },
    });
  }

  // -- Render Analisis Ano vs Ano section --
  renderAnalisisAnual();
}

/* ============================================================
   DASHBOARD: Analisis Ano vs Ano
   ============================================================ */
function renderAnalisisAnual() {
  const anioActual = new Date().getFullYear();

  // Build year options from available data
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const historial = loadData(STORAGE_KEYS.historial_patrimonio) || [];

  // Collect all years present in data
  const yearsSet = new Set();
  movimientos.forEach(function(mv) {
    var yr = new Date(mv.fecha).getFullYear();
    if (!isNaN(yr)) yearsSet.add(yr);
  });
  rendimientos.forEach(function(r) {
    if (r.periodo) {
      var yr = parseInt(r.periodo.split('-')[0]);
      if (!isNaN(yr)) yearsSet.add(yr);
    }
  });
  historial.forEach(function(h) {
    var yr = new Date(h.fecha).getFullYear();
    if (!isNaN(yr)) yearsSet.add(yr);
  });

  // Ensure at least current and previous year
  yearsSet.add(anioActual);
  yearsSet.add(anioActual - 1);

  // Sort descending, take last 5
  var yearsArr = Array.from(yearsSet).sort(function(a, b) { return b - a; }).slice(0, 5);

  var sel1 = document.getElementById('yoyAnio1');
  var sel2 = document.getElementById('yoyAnio2');
  if (!sel1 || !sel2) return;

  sel1.innerHTML = yearsArr.map(function(yr) {
    return '<option value="' + yr + '"' + (yr === anioActual ? ' selected' : '') + '>' + yr + '</option>';
  }).join('');

  sel2.innerHTML = yearsArr.map(function(yr) {
    return '<option value="' + yr + '"' + (yr === anioActual - 1 ? ' selected' : '') + '>' + yr + '</option>';
  }).join('');

  // Auto-run comparison with defaults
  compararAnios();
}

function compararAnios() {
  var sel1 = document.getElementById('yoyAnio1');
  var sel2 = document.getElementById('yoyAnio2');
  if (!sel1 || !sel2) return;

  var anio1 = parseInt(sel1.value);
  var anio2 = parseInt(sel2.value);

  // Load data
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var historial = loadData(STORAGE_KEYS.historial_patrimonio) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // -- Calculate monthly rendimientos for each year --
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var rendMensual1 = [];
  var rendMensual2 = [];

  for (var m = 0; m < 12; m++) {
    var periodo1 = anio1 + '-' + String(m + 1).padStart(2, '0');
    var periodo2 = anio2 + '-' + String(m + 1).padStart(2, '0');

    var r1 = rendimientos
      .filter(function(r) { return r.periodo === periodo1; })
      .reduce(function(sum, r) { return sum + toMXN(r.rendimiento_monto, 'MXN', tiposCambio); }, 0);
    var r2 = rendimientos
      .filter(function(r) { return r.periodo === periodo2; })
      .reduce(function(sum, r) { return sum + toMXN(r.rendimiento_monto, 'MXN', tiposCambio); }, 0);

    rendMensual1.push(r1);
    rendMensual2.push(r2);
  }

  // -- Build grouped bar chart --
  var _cc = typeof getChartColors === 'function' ? getChartColors() : { fontColor: '#94a3b8', gridColor: 'rgba(51,65,85,0.5)', borderColor: '#1e293b' };
  var chartFontColor = _cc.fontColor;
  var gridColor = _cc.gridColor;

  window._charts = window._charts || {};
  if (window._charts.yoyBar) window._charts.yoyBar.destroy();

  var yoyCtx = document.getElementById('yoyBarChart');
  if (!yoyCtx) return;
  yoyCtx = yoyCtx.getContext('2d');

  window._charts.yoyBar = new Chart(yoyCtx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: String(anio1),
          data: rendMensual1,
          backgroundColor: 'rgba(59,130,246,0.7)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6,
        },
        {
          label: String(anio2),
          data: rendMensual2,
          backgroundColor: 'rgba(139,92,246,0.7)',
          borderColor: '#8b5cf6',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: 11, family: "'Plus Jakarta Sans'" } },
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
        legend: {
          labels: { color: chartFontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" }, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });

  // -- Calculate annual aggregates --
  // Ingresos
  var ingresos1 = movimientos
    .filter(function(mv) { return mv.tipo === 'ingreso' && new Date(mv.fecha).getFullYear() === anio1; })
    .reduce(function(sum, mv) { return sum + toMXN(mv.monto, mv.moneda, tiposCambio); }, 0);
  var ingresos2 = movimientos
    .filter(function(mv) { return mv.tipo === 'ingreso' && new Date(mv.fecha).getFullYear() === anio2; })
    .reduce(function(sum, mv) { return sum + toMXN(mv.monto, mv.moneda, tiposCambio); }, 0);

  // Gastos
  var gastos1 = movimientos
    .filter(function(mv) { return mv.tipo === 'gasto' && new Date(mv.fecha).getFullYear() === anio1; })
    .reduce(function(sum, mv) { return sum + toMXN(mv.monto, mv.moneda, tiposCambio); }, 0);
  var gastos2 = movimientos
    .filter(function(mv) { return mv.tipo === 'gasto' && new Date(mv.fecha).getFullYear() === anio2; })
    .reduce(function(sum, mv) { return sum + toMXN(mv.monto, mv.moneda, tiposCambio); }, 0);

  // Rendimientos totales
  var rendTotal1 = rendMensual1.reduce(function(a, b) { return a + b; }, 0);
  var rendTotal2 = rendMensual2.reduce(function(a, b) { return a + b; }, 0);

  // Balance neto
  var balance1 = ingresos1 + rendTotal1 - gastos1;
  var balance2 = ingresos2 + rendTotal2 - gastos2;

  // Patrimonio from historial (closest record at end of each year)
  function getPatrimonioAnio(yr) {
    // Find the latest historial entry for the given year, or the closest one before year-end
    var entries = historial
      .filter(function(h) { return new Date(h.fecha).getFullYear() === yr; })
      .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    if (entries.length > 0) return entries[0].valor;
    // Fallback: find closest entry before or equal to Dec 31 of that year
    var allBefore = historial
      .filter(function(h) { return new Date(h.fecha) <= new Date(yr, 11, 31); })
      .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    return allBefore.length > 0 ? allBefore[0].valor : 0;
  }

  var patrimonio1 = getPatrimonioAnio(anio1);
  var patrimonio2 = getPatrimonioAnio(anio2);

  // -- Build comparison table rows --
  var conceptos = [
    { nombre: 'Ingresos Totales',      val1: ingresos1,   val2: ingresos2,   positiveIsGood: true },
    { nombre: 'Gastos Totales',         val1: gastos1,     val2: gastos2,     positiveIsGood: false },
    { nombre: 'Rendimientos Totales',   val1: rendTotal1,  val2: rendTotal2,  positiveIsGood: true },
    { nombre: 'Balance Neto',           val1: balance1,    val2: balance2,    positiveIsGood: true },
    { nombre: 'Patrimonio',             val1: patrimonio1, val2: patrimonio2, positiveIsGood: true },
  ];

  var tbodyHTML = conceptos.map(function(c) {
    var diff = c.val1 - c.val2;
    var pctCambio = c.val2 !== 0 ? ((diff / Math.abs(c.val2)) * 100) : (c.val1 !== 0 ? 100 : 0);

    // Determine color: for gastos, an increase is bad (red), decrease is good (green)
    var isImprovement;
    if (c.positiveIsGood) {
      isImprovement = diff >= 0;
    } else {
      isImprovement = diff <= 0;
    }
    var diffColor = diff === 0 ? 'var(--text-muted)' : (isImprovement ? 'var(--accent-green)' : 'var(--accent-red)');
    var diffIcon = diff === 0 ? '' : (isImprovement ? '<i class="fas fa-arrow-up" style="font-size:10px;margin-right:4px;"></i>' : '<i class="fas fa-arrow-down" style="font-size:10px;margin-right:4px;"></i>');

    // For gastos, flip the arrow logic (down arrow = improvement = green)
    if (!c.positiveIsGood && diff !== 0) {
      diffIcon = diff < 0 ? '<i class="fas fa-arrow-down" style="font-size:10px;margin-right:4px;"></i>' : '<i class="fas fa-arrow-up" style="font-size:10px;margin-right:4px;"></i>';
    }

    var diffPrefix = diff > 0 ? '+' : (diff < 0 ? '-' : '');
    var diffDisplay = diffPrefix + formatCurrency(Math.abs(diff), 'MXN');

    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + c.nombre + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(c.val1, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(c.val2, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + diffColor + ';">' + diffIcon + diffDisplay + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + diffColor + ';">' + diffIcon + formatPct(pctCambio) + '</td>' +
    '</tr>';
  }).join('');

  // Update table headers and body
  var table = document.getElementById('yoyComparisonTable');
  if (table) {
    var thead = table.querySelector('thead tr');
    if (thead) {
      thead.innerHTML =
        '<th>Concepto</th>' +
        '<th style="text-align:right;"><span class="badge badge-blue" style="font-size:11px;">' + anio1 + '</span></th>' +
        '<th style="text-align:right;"><span class="badge badge-purple" style="font-size:11px;">' + anio2 + '</span></th>' +
        '<th style="text-align:right;">Diferencia</th>' +
        '<th style="text-align:right;">% Cambio</th>';
    }
    var tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = tbodyHTML;
    }
  }
}

/* ============================================================
   DASHBOARD: Desglose de Rendimiento (modal)
   ============================================================ */
function mostrarDesgloseRendimiento() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const invCuentas = cuentas.filter(c => c.activa !== false && c.tipo === 'inversion');

  let sumPesos = 0;
  const rows = invCuentas.map(c => {
    const valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
    // Obtener tasa anualizada del ultimo cierre, o fallback al campo estatico
    let tasaAnual = c.rendimiento_anual || 0;
    let dias = 0;
    let fuente = 'Manual';
    const hist = c.historial_saldos || [];
    if (hist.length > 0) {
      const ultimoCierre = [...hist].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultimoCierre.rendimiento_pct_anual != null) {
        tasaAnual = ultimoCierre.rendimiento_pct_anual;
        dias = ultimoCierre.dias || 0;
        fuente = 'Cierre ' + (ultimoCierre.fecha || '').substring(0, 7);
      }
    }
    if (tasaAnual !== 0) sumPesos += valMXN;
    return { nombre: c.nombre, moneda: c.moneda, saldo: c.saldo, valMXN: valMXN, rendimiento: tasaAnual, dias: dias, fuente: fuente };
  }).filter(r => r.rendimiento !== 0);

  let sumPonderado = 0;
  rows.forEach(r => { sumPonderado += r.valMXN * r.rendimiento; });
  const promedio = sumPesos > 0 ? (sumPonderado / sumPesos) : 0;

  const html = `
    <table class="data-table" style="margin-bottom:16px;">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Moneda</th>
          <th style="text-align:right;">Saldo</th>
          <th style="text-align:right;">Valor (MXN)</th>
          <th style="text-align:right;">Rend. Anual %</th>
          <th style="text-align:center;">Dias</th>
          <th style="text-align:right;">Peso</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const peso = sumPesos > 0 ? ((r.valMXN / sumPesos) * 100).toFixed(1) : 0;
          const rendColor = r.rendimiento >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
          return `<tr>
            <td style="font-weight:600;color:var(--text-primary);">${r.nombre}<br><span style="font-size:10px;color:var(--text-muted);">${r.fuente}</span></td>
            <td><span class="badge badge-blue">${r.moneda}</span></td>
            <td style="text-align:right;">${formatCurrency(r.saldo, r.moneda)}</td>
            <td style="text-align:right;">${formatCurrency(r.valMXN, 'MXN')}</td>
            <td style="text-align:right;color:${rendColor};font-weight:600;">${r.rendimiento >= 0 ? '+' : ''}${r.rendimiento.toFixed(2)}%</td>
            <td style="text-align:center;">${r.dias > 0 ? r.dias + 'd' : '\u2014'}</td>
            <td style="text-align:right;color:var(--text-muted);">${peso}%</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight:700;border-top:2px solid var(--border-color);">
          <td>Promedio Ponderado</td>
          <td></td>
          <td></td>
          <td style="text-align:right;">${formatCurrency(sumPesos, 'MXN')}</td>
          <td style="text-align:right;color:var(--accent-amber);font-size:16px;">${promedio.toFixed(2)}%</td>
          <td></td>
          <td style="text-align:right;color:var(--text-muted);">100%</td>
        </tr>
      </tfoot>
    </table>
    <div style="font-size:12px;color:var(--text-muted);">
      <i class="fas fa-info-circle" style="margin-right:4px;"></i>
      Tasa anualizada calculada del ultimo cierre mensual. Formula: (rendimiento / capital) * (365 / dias) * 100.
    </div>
  `;

  openModal('Desglose de Rendimiento por Producto', html);
}

/* ============================================================
   DASHBOARD: Editar Historial de Patrimonio
   ============================================================ */
function editarHistorialPatrimonio() {
  const historial = loadData(STORAGE_KEYS.historial_patrimonio) || [];
  const sorted = [...historial].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let rowsHTML = sorted.map((h, idx) => `
    <tr data-hist-id="${h.id}">
      <td><input type="date" class="form-input hist-fecha" value="${h.fecha.substring(0, 10)}" style="padding:6px 8px;font-size:13px;"></td>
      <td><input type="number" class="form-input hist-valor" value="${h.valor}" step="1000" style="padding:6px 8px;font-size:13px;"></td>
      <td><input type="text" class="form-input hist-notas" value="${h.notas || ''}" placeholder="Notas..." style="padding:6px 8px;font-size:13px;"></td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="this.closest('tr').remove();">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">
      <i class="fas fa-info-circle" style="margin-right:4px;"></i>
      Ingresa los valores historicos de tu patrimonio. Puedes agregar puntos por ano, semestre o como prefieras.
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table" id="tablaHistorialPatrimonio">
        <thead>
          <tr>
            <th style="min-width:140px;">Fecha</th>
            <th style="min-width:140px;">Valor (MXN)</th>
            <th style="min-width:160px;">Notas</th>
            <th style="width:60px;text-align:center;"></th>
          </tr>
        </thead>
        <tbody id="tbodyHistorialPatrimonio">
          ${rowsHTML}
        </tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:12px;">
      <button type="button" class="btn btn-secondary" onclick="agregarFilaHistorial()">
        <i class="fas fa-plus"></i> Agregar Registro
      </button>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" onclick="guardarHistorialPatrimonio()">
        <i class="fas fa-save"></i> Guardar Historial
      </button>
    </div>
  `;

  openModal('Historial de Patrimonio', html);
}

function agregarFilaHistorial() {
  const tbody = document.getElementById('tbodyHistorialPatrimonio');
  const tr = document.createElement('tr');
  tr.setAttribute('data-hist-id', '');
  tr.innerHTML = `
    <td><input type="date" class="form-input hist-fecha" value="" style="padding:6px 8px;font-size:13px;"></td>
    <td><input type="number" class="form-input hist-valor" value="" step="1000" placeholder="0" style="padding:6px 8px;font-size:13px;"></td>
    <td><input type="text" class="form-input hist-notas" value="" placeholder="Notas..." style="padding:6px 8px;font-size:13px;"></td>
    <td style="text-align:center;">
      <button type="button" class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="this.closest('tr').remove();">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

function guardarHistorialPatrimonio() {
  const rows = document.querySelectorAll('#tablaHistorialPatrimonio tbody tr');
  const historial = [];

  rows.forEach(tr => {
    const fecha = tr.querySelector('.hist-fecha').value;
    const valor = parseFloat(tr.querySelector('.hist-valor').value) || 0;
    const notas = tr.querySelector('.hist-notas').value.trim();
    const existingId = tr.getAttribute('data-hist-id');

    if (fecha && valor > 0) {
      historial.push({
        id: existingId || uuid(),
        fecha: fecha,
        valor: valor,
        notas: notas,
      });
    }
  });

  saveData(STORAGE_KEYS.historial_patrimonio, historial);
  showToast('Historial de patrimonio guardado.', 'success');
  closeModal();
  renderDashboard();
}

/* ============================================================
   RESUMEN / RECORDATORIOS PANEL
   ============================================================ */
function buildResumenPanel(movimientos, cuentas, prestamos, propiedades) {
  // Don't show if user dismissed for this session
  if (sessionStorage.getItem('pf_resumen_hidden') === '1') return '';

  var now = new Date();
  var hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // -- Greeting --
  var hour = now.getHours();
  var saludo = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // -- Weekly summary --
  var hace7 = new Date(hoy.getTime() - 7 * 86400000);
  var hace14 = new Date(hoy.getTime() - 14 * 86400000);
  var ingresosWeek = 0, gastosWeek = 0, countWeek = 0;
  var ingresosPrev = 0, gastosPrev = 0;
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  (movimientos || []).forEach(function(mv) {
    var f = new Date(mv.fecha);
    var montoMXN = mv.monto;
    if (mv.moneda === 'USD') montoMXN = mv.monto * (tiposCambio.USD_MXN || 17);
    else if (mv.moneda === 'EUR') montoMXN = mv.monto * (tiposCambio.EUR_MXN || 19);

    if (f >= hace7 && f <= hoy) {
      countWeek++;
      if (mv.tipo === 'ingreso') ingresosWeek += montoMXN;
      else gastosWeek += montoMXN;
    } else if (f >= hace14 && f < hace7) {
      if (mv.tipo === 'ingreso') ingresosPrev += montoMXN;
      else gastosPrev += montoMXN;
    }
  });

  var gastosDiff = gastosPrev > 0 ? ((gastosWeek - gastosPrev) / gastosPrev * 100) : 0;
  var gastosDiffSign = gastosDiff > 0 ? '+' : '';
  var gastosDiffColor = gastosDiff > 0 ? 'var(--accent-red)' : 'var(--accent-green)';

  // -- Pending actions --
  var pendingItems = [];

  // Plantillas recurrentes pendientes
  var plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  var pendingPlantillas = plantillas.filter(function(p) {
    return typeof _plantillaEstaPendiente === 'function' && _plantillaEstaPendiente(p);
  });
  if (pendingPlantillas.length > 0) {
    pendingItems.push({
      icon: 'fa-sync-alt',
      color: 'var(--accent-amber)',
      text: pendingPlantillas.length + ' plantilla(s) recurrente(s) por aplicar',
      action: 'onclick="navigateTo(\'movimientos\'); setTimeout(function(){ openPlantillasRecurrentes(); }, 300);"'
    });
  }

  // Vencimientos proximos (30 dias)
  var en30 = new Date(hoy.getTime() + 30 * 86400000);
  var vencimientoCount = 0;
  (cuentas || []).forEach(function(c) {
    if (c.activa !== false && c.tipo === 'inversion' && c.fecha_vencimiento) {
      var fv = new Date(c.fecha_vencimiento);
      if (fv >= hoy && fv <= en30) vencimientoCount++;
    }
  });
  (prestamos || []).forEach(function(p) {
    if (p.estado === 'activo' && p.fecha_vencimiento) {
      var fv = new Date(p.fecha_vencimiento);
      if (fv >= hoy && fv <= en30) vencimientoCount++;
    }
  });
  if (vencimientoCount > 0) {
    pendingItems.push({
      icon: 'fa-exclamation-triangle',
      color: 'var(--accent-red)',
      text: vencimientoCount + ' inversion(es) o prestamo(s) vencen en los proximos 30 dias',
      action: ''
    });
  }

  // -- Reminders --
  var reminderItems = [];

  // Backup reminder
  var config = loadData(STORAGE_KEYS.config) || {};
  var lastBackup = config.ultima_respaldo;
  if (lastBackup) {
    var backupDate = new Date(lastBackup);
    var daysSinceBackup = Math.floor((hoy - backupDate) / 86400000);
    if (daysSinceBackup > 30) {
      reminderItems.push({
        icon: 'fa-database',
        color: 'var(--accent-amber)',
        text: 'Ultimo respaldo hace ' + daysSinceBackup + ' dias. Considera exportar un respaldo.'
      });
    }
  } else {
    reminderItems.push({
      icon: 'fa-database',
      color: 'var(--accent-amber)',
      text: 'Nunca has hecho un respaldo. Ve a Configuracion para exportar uno.'
    });
  }

  // Inactive accounts (no movements in 30+ days)
  var inactiveCuentas = [];
  (cuentas || []).forEach(function(c) {
    if (c.activa === false || c.tipo === 'inmueble' || c.tipo === 'activo_fijo') return;
    var lastMov = null;
    (movimientos || []).forEach(function(mv) {
      if (mv.cuenta_id === c.id) {
        var f = new Date(mv.fecha);
        if (!lastMov || f > lastMov) lastMov = f;
      }
    });
    if (!lastMov || (hoy - lastMov) > 30 * 86400000) {
      inactiveCuentas.push(c.nombre);
    }
  });
  if (inactiveCuentas.length > 0 && inactiveCuentas.length <= 5) {
    reminderItems.push({
      icon: 'fa-clock',
      color: 'var(--text-muted)',
      text: 'Sin movimientos en 30+ dias: ' + inactiveCuentas.join(', ')
    });
  }

  // -- Build HTML --
  var hasPending = pendingItems.length > 0;
  var hasReminders = reminderItems.length > 0;
  var hasWeekData = countWeek > 0 || ingresosWeek > 0 || gastosWeek > 0;

  // If nothing to show, skip
  if (!hasPending && !hasReminders && !hasWeekData) return '';

  var html = '<div class="resumen-panel" id="resumenPanel">';
  html += '<div class="resumen-header">';
  html += '<div style="display:flex;align-items:center;gap:10px;">';
  html += '<i class="fas fa-sun" style="color:var(--accent-amber);font-size:18px;"></i>';
  html += '<div>';
  html += '<div style="font-size:16px;font-weight:700;color:var(--text-primary);">' + saludo + '!</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);">Resumen y recordatorios</div>';
  html += '</div></div>';
  html += '<button onclick="dismissResumenPanel()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;" title="Ocultar hasta el proximo login">';
  html += '<i class="fas fa-times"></i></button>';
  html += '</div>';

  html += '<div class="resumen-body">';

  // Pending actions
  if (hasPending) {
    html += '<div class="resumen-section resumen-pending">';
    html += '<div class="resumen-section-title"><i class="fas fa-bell"></i> Acciones Pendientes</div>';
    pendingItems.forEach(function(item) {
      html += '<div class="resumen-item" ' + item.action + ' style="' + (item.action ? 'cursor:pointer;' : '') + '">';
      html += '<i class="fas ' + item.icon + '" style="color:' + item.color + ';width:16px;text-align:center;"></i>';
      html += '<span>' + item.text + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Weekly summary
  if (hasWeekData) {
    html += '<div class="resumen-section resumen-weekly">';
    html += '<div class="resumen-section-title"><i class="fas fa-chart-bar"></i> Ultimos 7 dias</div>';
    html += '<div style="display:flex;gap:16px;flex-wrap:wrap;">';
    html += '<div class="resumen-stat">';
    html += '<div class="resumen-stat-label">Ingresos</div>';
    html += '<div class="resumen-stat-value" style="color:var(--accent-green);">+$' + formatCurrency(ingresosWeek) + '</div>';
    html += '</div>';
    html += '<div class="resumen-stat">';
    html += '<div class="resumen-stat-label">Gastos</div>';
    html += '<div class="resumen-stat-value" style="color:var(--accent-red);">-$' + formatCurrency(gastosWeek) + '</div>';
    html += '</div>';
    html += '<div class="resumen-stat">';
    html += '<div class="resumen-stat-label">Movimientos</div>';
    html += '<div class="resumen-stat-value">' + countWeek + '</div>';
    html += '</div>';
    if (gastosPrev > 0) {
      html += '<div class="resumen-stat">';
      html += '<div class="resumen-stat-label">Gastos vs semana anterior</div>';
      html += '<div class="resumen-stat-value" style="color:' + gastosDiffColor + ';">' + gastosDiffSign + gastosDiff.toFixed(1) + '%</div>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  // Reminders
  if (hasReminders) {
    html += '<div class="resumen-section resumen-reminders">';
    html += '<div class="resumen-section-title"><i class="fas fa-info-circle"></i> Recordatorios</div>';
    reminderItems.forEach(function(item) {
      html += '<div class="resumen-item">';
      html += '<i class="fas ' + item.icon + '" style="color:' + item.color + ';width:16px;text-align:center;"></i>';
      html += '<span>' + item.text + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function dismissResumenPanel() {
  sessionStorage.setItem('pf_resumen_hidden', '1');
  var panel = document.getElementById('resumenPanel');
  if (panel) panel.style.display = 'none';
}
