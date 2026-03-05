/* ============================================================
   MODULE: DASHBOARD
   ============================================================ */

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

  // -- Always show current month data (no filters) --
  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();
  const anioFiltro = anioActual;
  const periodo = 'mensual';
  const periodoLabel = 'del Mes';

  // Current month date range
  let fechaInicio = new Date(anioActual, mesActual, 1);
  let fechaFin = now;

  // -- KPI 1: Patrimonio Total (cuentas + propiedades + prestamos otorgados - prestamos recibidos) --
  const _patCalc = typeof calcPatrimonioTotal === 'function' ? calcPatrimonioTotal() : { total: 0, cuentas: 0, propiedades: 0, prestamosOtorgados: 0, prestamosRecibidos: 0 };
  let patrimonioTotal = _patCalc.total;

  // -- Filter movimientos for selected period (string comparison to avoid timezone issues) --
  const fechaInicioStr = fechaInicio.getFullYear() + '-' + String(fechaInicio.getMonth() + 1).padStart(2, '0') + '-' + String(fechaInicio.getDate()).padStart(2, '0');
  const fechaFinStr = fechaFin.getFullYear() + '-' + String(fechaFin.getMonth() + 1).padStart(2, '0') + '-' + String(fechaFin.getDate()).padStart(2, '0');
  const movsFiltrados = movimientos.filter(mv => {
    return mv.fecha >= fechaInicioStr && mv.fecha <= fechaFinStr;
  });

  // -- Generate list of relevant periodos for rendimientos --
  const periodosList = [];
  let tmpDate = new Date(fechaInicio);
  while (tmpDate <= fechaFin) {
    periodosList.push(`${tmpDate.getFullYear()}-${String(tmpDate.getMonth() + 1).padStart(2, '0')}`);
    tmpDate.setMonth(tmpDate.getMonth() + 1);
  }

  // -- Helper: account map for lookups --
  const _cuentaMapKpi = {};
  cuentas.forEach(c => { _cuentaMapKpi[c.id] = c; });

  // -- KPI 2: Rendimientos del periodo (using _rendReal for accurate calculation) --
  const rendPeriodo = rendimientos
    .filter(r => periodosList.includes(r.periodo))
    .reduce((sum, r) => {
      const cta = _cuentaMapKpi[r.cuenta_id];
      return sum + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);
  function _getMovMoneda(mv) {
    if (mv.moneda) return mv.moneda;
    var cta = _cuentaMapKpi[mv.cuenta_id];
    return cta ? cta.moneda : 'MXN';
  }

  // -- KPI 3: Gastos del periodo (excluding transfers) --
  const gastosPeriodo = movsFiltrados
    .filter(mv => mv.tipo === 'gasto' && !mv.transferencia_id)
    .reduce((sum, mv) => sum + toMXN(mv.monto, _getMovMoneda(mv), tiposCambio), 0);

  // -- KPI 4: Balance Neto (excluding transfers) --
  const ingresosPeriodo = movsFiltrados
    .filter(mv => mv.tipo === 'ingreso' && !mv.transferencia_id)
    .reduce((sum, mv) => sum + toMXN(mv.monto, _getMovMoneda(mv), tiposCambio), 0);
  const balanceNeto = rendPeriodo + ingresosPeriodo - gastosPeriodo;

  // -- KPI 5: Rendimiento Promedio Ponderado (usa tasa anualizada del ultimo cierre) --
  const invCuentas = cuentas.filter(c => c.activa !== false && c.tipo === 'inversion');
  let sumPonderado = 0;
  let sumPesos = 0;
  invCuentas.forEach(c => {
    const valMXN = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    // Obtener tasa anualizada del ultimo cierre, o fallback al campo estatico
    let tasaAnual = c.rendimiento_anual || 0;
    const hist = c.historial_saldos || [];
    if (hist.length > 0) {
      const ultimoCierre = [...hist].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultimoCierre.rendimiento_pct_anual != null) {
        tasaAnual = ultimoCierre.rendimiento_pct_anual;
      }
    }
    sumPesos += valMXN;
    sumPonderado += valMXN * tasaAnual;
  });
  const rendPromedio = sumPesos > 0 ? (sumPonderado / sumPesos) : 0;

  // -- Top 5 activos by value --
  const activosOrdenados = cuentas
    .filter(c => c.activa !== false)
    .map(c => ({ ...c, valorMXN: toMXN(_calcSaldoReal(c), c.moneda, tiposCambio) }))
    .sort((a, b) => b.valorMXN - a.valorMXN)
    .slice(0, 5);

  // -- Last 5 movimientos by date --
  const ultimosMovs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  // -- Find account name by id --
  const cuentaMap = {};
  cuentas.forEach(c => cuentaMap[c.id] = c.nombre);

  // -- Distribution by account type (including deuda as negative component) --
  const distTipo = { debito: 0, inversion: 0, inmueble: 0, activo_fijo: 0, propiedades: 0, prestamos_otorgados: 0, deuda: 0 };
  cuentas.forEach(c => {
    if (c.activa !== false && c.tipo && (c.tipo === 'debito' || c.tipo === 'inversion' || c.tipo === 'inmueble' || c.tipo === 'activo_fijo')) {
      distTipo[c.tipo] += toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    }
  });
  propiedades.forEach(pr => {
    distTipo.propiedades += toMXN(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN', tiposCambio);
  });
  prestamos.forEach(p => {
    if (p.estado === 'pagado') return;
    if (p.tipo === 'otorgado') distTipo.prestamos_otorgados += toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
    else distTipo.deuda += toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
  });
  // Add preventa debt
  propiedades.filter(pr => pr.tipo === 'preventa').forEach(pr => {
    const enganche = pr.enganche || 0;
    const pagado = enganche + ((pr.mensualidades_pagadas || 0) * (pr.monto_mensualidad || 0));
    const pendiente = Math.max(0, (pr.valor_compra || 0) - pagado);
    distTipo.deuda += toMXN(pendiente, pr.moneda || 'MXN', tiposCambio);
  });

  // -- KPI summary cards: Bancarias, Inversiones, Propiedades, Prestamos --
  let kpiBancarias = 0, kpiBancariasCount = 0;
  let kpiInversiones = 0, kpiInversionesCount = 0;
  cuentas.forEach(c => {
    if (c.activa === false) return;
    const valMXN = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    if (c.tipo === 'debito') { kpiBancarias += valMXN; kpiBancariasCount++; }
    else if (c.tipo === 'inversion') { kpiInversiones += valMXN; kpiInversionesCount++; }
  });
  let kpiPropiedades = 0, kpiPropiedadesCount = 0;
  propiedades.forEach(pr => {
    kpiPropiedades += toMXN(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN', tiposCambio);
    kpiPropiedadesCount++;
  });
  let kpiPrestamosNeto = 0, kpiPrestamosCount = 0;
  prestamos.forEach(p => {
    if (p.estado === 'pagado') return;
    const val = toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
    if (p.tipo === 'otorgado') { kpiPrestamosNeto += val; }
    else { kpiPrestamosNeto -= val; }
    kpiPrestamosCount++;
  });

  // -- Helper: color for KPI --
  function kpiColor(val) { return val >= 0 ? 'text-green' : 'text-red'; }

  // -- Build historial patrimonio chart data (start from first data, max 24 months) --
  // Find the earliest period with data (historial_patrimonio or cierres)
  const allPatPeriodos = new Set();
  historial.forEach(h => {
    if (h.fecha) {
      const hd = new Date(h.fecha);
      allPatPeriodos.add(`${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}`);
    }
  });
  cuentas.forEach(c => {
    (c.historial_saldos || []).forEach(h => {
      if (h.periodo) allPatPeriodos.add(h.periodo);
      else if (h.fecha) {
        const hd = new Date(h.fecha);
        allPatPeriodos.add(`${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}`);
      }
    });
  });
  const sortedPatPeriodos = Array.from(allPatPeriodos).sort();
  const firstPatPeriodo = sortedPatPeriodos.length > 0 ? sortedPatPeriodos[0] : `${anioActual}-01`;
  const firstPatDate = new Date(parseInt(firstPatPeriodo.split('-')[0]), parseInt(firstPatPeriodo.split('-')[1]) - 1, 1);
  const currentDate = new Date(anioActual, mesActual, 1);

  // Calculate months between first data and now
  let monthsDiff = (currentDate.getFullYear() - firstPatDate.getFullYear()) * 12 + (currentDate.getMonth() - firstPatDate.getMonth());
  // Cap at 24 months
  const numBarMonths = Math.min(Math.max(monthsDiff + 1, 1), 24);
  const barStartDate = new Date(anioActual, mesActual - (numBarMonths - 1), 1);

  const barLabels = [];
  const barData = [];
  // Store periodo strings for click-desglose
  const barPeriodos = [];
  // Pre-sort each account's historial and add periodo field for efficient lookup
  const cuentaHistSorted = {};
  cuentas.forEach(c => {
    if (c.activa === false) return;
    const hist = (c.historial_saldos || []).map(h => {
      const p = h.periodo || (h.fecha ? h.fecha.substring(0, 7) : '');
      return { ...h, _periodo: p };
    }).sort((a, b) => (a._periodo || '').localeCompare(b._periodo || ''));
    cuentaHistSorted[c.id] = hist;
  });

  for (let i = 0; i < numBarMonths; i++) {
    const dt = new Date(barStartDate.getFullYear(), barStartDate.getMonth() + i, 1);
    const mLabel = mesNombre(dt.getMonth()).substring(0, 3) + ' ' + dt.getFullYear().toString().slice(-2);
    const per = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    barLabels.push(mLabel);
    barPeriodos.push(per);

    // 1. Check historial_patrimonio for this month
    const hMatch = historial.find(h => {
      const hd = new Date(h.fecha);
      return hd.getFullYear() === dt.getFullYear() && hd.getMonth() === dt.getMonth();
    });
    if (hMatch) {
      barData.push(hMatch.valor);
      continue;
    }

    // 2. Reconstruct from account cierres: carry forward last known saldo
    let totalMes = 0;
    let hasAnyData = false;
    cuentas.forEach(c => {
      if (c.activa === false) return;
      const hist = cuentaHistSorted[c.id] || [];
      // Find the most recent cierre at or before this period (carry forward)
      let lastCierre = null;
      for (let j = hist.length - 1; j >= 0; j--) {
        if (hist[j]._periodo <= per) { lastCierre = hist[j]; break; }
      }
      if (lastCierre) {
        hasAnyData = true;
        const sFinal = lastCierre.saldo_final != null ? lastCierre.saldo_final : lastCierre.saldo;
        totalMes += toMXN(sFinal, c.moneda || 'MXN', tiposCambio, per);
      }
    });

    if (hasAnyData) {
      propiedades.forEach(pr => {
        totalMes += toMXN(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN', tiposCambio, per);
      });
      // Add prestamos otorgados
      prestamos.forEach(p => {
        if (p.estado === 'pagado' || p.tipo !== 'otorgado') return;
        totalMes += toMXN(p.saldo_pendiente, p.moneda, tiposCambio, per);
      });
      // Subtract deuda (prestamos recibidos + preventa)
      prestamos.forEach(p => {
        if (p.estado === 'pagado' || p.tipo === 'otorgado') return;
        totalMes -= toMXN(p.saldo_pendiente, p.moneda, tiposCambio, per);
      });
      propiedades.filter(pr => pr.tipo === 'preventa').forEach(pr => {
        const enganche = pr.enganche || 0;
        const pagado = enganche + ((pr.mensualidades_pagadas || 0) * (pr.monto_mensualidad || 0));
        const pendiente = Math.max(0, (pr.valor_compra || 0) - pagado);
        totalMes -= toMXN(pendiente, pr.moneda || 'MXN', tiposCambio, per);
      });
      barData.push(totalMes);
    } else {
      barData.push(null);
    }
  }

  // For the current month, always use the live patrimonio calculation
  // (matches the desglose de patrimonio total and account balances)
  barData[barData.length - 1] = patrimonioTotal;

  // (Filters removed — dashboard always shows current data)

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

  // Check prestamos activos
  prestamos.forEach(p => {
    if (p.estado === 'activo' && p.fecha_vencimiento) {
      const alerta = calcularAlerta(p.fecha_vencimiento);
      if (alerta) {
        alertasVencimiento.push({
          nombre: p.persona + (p.tipo === 'otorgado' ? ' (otorgado)' : ' (recibido)'),
          tipoLabel: 'Prestamo',
          tipoIcon: 'fa-handshake',
          monto: formatCurrencyInt(p.saldo_pendiente, p.moneda),
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
        // Desglosar: mensualidades pendientes + remanente al final del acuerdo
        var prEnganche = pr.enganche || 0;
        var prRestantes = (pr.mensualidades_total || 0) - (pr.mensualidades_pagadas || 0);
        var prMontoMens = pr.monto_mensualidad || 0;
        var prTotalMensualidades = prRestantes * prMontoMens;
        // Remanente = valor_compra - enganche - (total_mensualidades * monto_mensualidad)
        var prRemanente = Math.max(0, (pr.valor_compra || 0) - prEnganche - ((pr.mensualidades_total || 0) * prMontoMens));
        var prSaldoTotal = prTotalMensualidades + prRemanente;
        var prMontoInfo = prRestantes + ' mensualidad' + (prRestantes !== 1 ? 'es' : '') + ' x ' + formatCurrencyInt(prMontoMens, pr.moneda);
        if (prRemanente > 0) {
          prMontoInfo += '<br>Remanente al termino: ' + formatCurrencyInt(prRemanente, pr.moneda);
        }
        prMontoInfo += '<br><span style="font-weight:700;">Saldo total: ' + formatCurrencyInt(prSaldoTotal, pr.moneda) + '</span>';
        alertasVencimiento.push({
          nombre: pr.nombre,
          tipoLabel: 'Preventa',
          tipoIcon: 'fa-building',
          monto: prMontoInfo,
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
      <div class="card" style="margin-bottom:0;">
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
      <div style="background:var(--bg-base);border:1px solid var(--border-color);border-left:4px solid ${a.color};border-radius:10px;padding:12px 14px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:32px;height:32px;border-radius:8px;background:${a.colorSoft};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="fas ${a.icon}" style="color:${a.color};font-size:13px;"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${a.nombre}">${a.nombre}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span class="badge ${a.badgeClass}" style="font-size:9px;padding:2px 6px;">${a.tipoLabel}</span>
              <span style="font-size:10px;color:var(--text-muted);"><i class="fas fa-calendar-alt" style="margin-right:2px;"></i>${formatDate(a.fecha.toISOString())}</span>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:16px;font-weight:800;color:${a.color};">${a.dias} <span style="font-size:10px;font-weight:600;">dias</span></div>
          </div>
        </div>
        <div style="font-size:11px;font-weight:600;color:var(--text-primary);margin-top:6px;padding-left:44px;">${a.monto}</div>
      </div>
    `).join('');

    alertasHTML = `
      <div class="card" style="margin-bottom:0;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-bell" style="margin-right:8px;color:var(--accent-amber);"></i>Alertas de Vencimiento</span>
          <span class="badge badge-amber" style="font-size:11px;">${alertasVencimiento.length} alerta${alertasVencimiento.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:500px;padding:4px 2px 8px 0;">
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
    const enganche = pr.enganche || 0;
    const pagado = enganche + (pr.mensualidades_pagadas * pr.monto_mensualidad);
    const pendiente = Math.max(0, pr.valor_compra - pagado);
    deudaPreventa += toMXN(pendiente, pr.moneda || 'MXN', tiposCambio);
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
    const enganche = pr.enganche || 0;
    const pagado = enganche + (pr.mensualidades_pagadas * pr.monto_mensualidad);
    const pendiente = Math.max(0, pr.valor_compra - pagado);
    const montoPendiente = toMXN(pendiente, pr.moneda || 'MXN', tiposCambio);
    deudaBreakdownRows.push({
      nombre: pr.nombre,
      tipoLabel: 'Preventa',
      tipoBadge: 'badge-amber',
      monto: montoPendiente,
      detalle: restantes + ' mensualidades restantes | Pagado: ' + formatCurrencyInt(pagado, pr.moneda || 'MXN') + ' de ' + formatCurrencyInt(pr.valor_compra, pr.moneda || 'MXN'),
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
        <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrencyInt(r.monto, 'MXN')}</td>
        <td style="color:var(--text-muted);font-size:12px;">${r.detalle}</td>
      </tr>
    `).join('');

    deudaHTML = `
      <div class="card" style="margin-bottom:0;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-file-invoice-dollar" style="margin-right:8px;color:var(--accent-red);"></i>Resumen de Deuda</span>
          <span class="badge ${deudaBadge}">${deudaLabel}</span>
        </div>
        <div class="grid-2" style="gap:24px;">
          <div>
            <div class="grid-2" style="margin-bottom:16px;">
              <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:12px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Total Deuda</div>
                <div style="font-size:24px;font-weight:800;color:var(--accent-red);">${formatCurrencyInt(totalDeuda, 'MXN')}</div>
              </div>
              <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:12px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Deuda / Patrimonio</div>
                <div style="font-size:24px;font-weight:800;color:${deudaColor};">${ratioDeudaPatrimonio.toFixed(1)}%</div>
                <div style="margin-top:6px;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${Math.min(ratioDeudaPatrimonio, 100)}%;background:${deudaColor};border-radius:3px;"></div>
                </div>
              </div>
            </div>
            <table class="data-table sortable-table">
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
            </table>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
            <div style="position:relative;width:100%;max-width:260px;height:260px;">
              <canvas id="dashDeudaDonutChart"></canvas>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="exportChartAsImage('dashDeudaDonutChart','deuda_composicion')" title="Descargar imagen"><i class="fas fa-download"></i></button>
              <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="printChart('dashDeudaDonutChart','Composicion de Deuda')" title="Imprimir"><i class="fas fa-print"></i></button>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    deudaHTML = `
      <div class="card" style="margin-bottom:0;">
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
  const patrimonioDiversificacion = cuentasActivas.reduce((sum, c) => sum + toMXN(_calcSaldoReal(c), c.moneda, tiposCambio), 0);

  let hhi = 0;
  if (patrimonioDiversificacion > 0) {
    cuentasActivas.forEach(c => {
      const share = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio) / patrimonioDiversificacion;
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
      divByTipo[c.tipo] += toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    }
  });
  const tipoLabelsMap = { debito: 'DEBITO', inversion: 'INVERSION', inmueble: 'INMUEBLE', activo_fijo: 'ACTIVO FIJO' };
  const tipoColorsMap = { debito: '#3b82f6', inversion: '#10b981', inmueble: '#f59e0b', activo_fijo: '#8b5cf6' };

  const divByMoneda = {};
  cuentasActivas.forEach(c => {
    const mon = (c.moneda || 'MXN').toUpperCase();
    if (!divByMoneda[mon]) divByMoneda[mon] = 0;
    divByMoneda[mon] += toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
  });
  const monedaColors = { MXN: '#3b82f6', USD: '#10b981', EUR: '#f59e0b', GBP: '#8b5cf6' };

  const dashInstituciones = loadData(STORAGE_KEYS.instituciones) || [];
  const instMapId = {};
  dashInstituciones.forEach(i => instMapId[i.id] = i.nombre);

  const divByInst = {};
  cuentasActivas.forEach(c => {
    const instName = instMapId[c.institucion_id] || 'Sin institucion';
    if (!divByInst[instName]) divByInst[instName] = 0;
    divByInst[instName] += toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
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
          '<span style="font-size:11px;color:var(--text-muted);">' + formatCurrencyInt(val, 'MXN') + ' (' + pct.toFixed(1) + '%)</span>' +
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

  // -- Explanation text based on score --
  let divExplain = '';
  if (diversificationScore > 70) {
    divExplain = 'Tu dinero esta bien repartido entre varias cuentas, tipos de activos y monedas. Si alguna inversion baja de valor, las demas amortiguan el golpe.';
  } else if (diversificationScore >= 40) {
    divExplain = 'Tu dinero esta razonablemente repartido, pero podrias mejorar distribuyendo en mas tipos de activos, instituciones o monedas para reducir el riesgo.';
  } else {
    divExplain = 'La mayor parte de tu dinero esta concentrada en pocos activos. Si uno de ellos tiene problemas, tu patrimonio se veria muy afectado. Considera diversificar.';
  }

  const _divExplainTooltip = 'Indice Herfindahl-Hirschman (HHI): metodo usado por la SEC y reguladores financieros para medir concentracion. Puntaje: ' + diversificationScore.toFixed(0) + '/100. 0-40: Muy concentrado | 40-70: Moderado | 70-100: Buena diversificacion';
  const diversificacionHTML = `
    <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <span class="card-title"><i class="fas fa-th" style="margin-right:8px;color:${divColor};"></i>Indicador de Diversificacion</span>
        <i class="fas fa-question-circle" style="color:var(--text-muted);font-size:14px;cursor:pointer;" onclick="document.getElementById('divExplainBox').style.display=document.getElementById('divExplainBox').style.display==='none'?'block':'none'" title="Ver explicacion"></i>
      </div>
      <div id="divExplainBox" style="display:none;padding:10px 14px;margin-bottom:8px;background:var(--bg-secondary);border-radius:8px;font-size:11px;color:var(--text-secondary);line-height:1.5;">
        <strong>Indice Herfindahl-Hirschman (HHI):</strong> metodo usado por la SEC y reguladores financieros para medir concentracion.<br>
        Puntaje: <strong>${diversificationScore.toFixed(0)}/100</strong>. 0-40: Muy concentrado | 40-70: Moderado | 70-100: Buena diversificacion.<br>
        ${divExplain}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;padding-bottom:8px;">
        <!-- Gauge chart at top -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;" id="divGaugeContainer">
          <div style="display:flex;gap:4px;justify-content:center;">
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="exportChartAsImage('dashDiversificacionGauge','diversificacion')" title="Descargar imagen"><i class="fas fa-download"></i></button>
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="printChart('dashDiversificacionGauge','Indicador de Diversificacion')" title="Imprimir"><i class="fas fa-print"></i></button>
          </div>
          <div style="position:relative;width:150px;height:150px;">
            <canvas id="dashDiversificacionGauge"></canvas>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
              <div style="font-size:32px;font-weight:800;color:${divColor};">${diversificationScore.toFixed(0)}</div>
              <div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Puntos</div>
            </div>
          </div>
          <span class="badge ${divBadge}" style="font-size:11px;padding:3px 12px;">
            <i class="fas ${divIcon}" style="margin-right:4px;"></i>${divRecommendation}
          </span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center;">${cuentasActivas.length} activos en portafolio</div>
        <!-- Breakdown bars -->
        <div style="padding:0 8px;">
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
              <i class="fas fa-layer-group" style="margin-right:4px;"></i> Por Tipo
            </div>
            ${divTipoBars}
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
              <i class="fas fa-coins" style="margin-right:4px;"></i> Por Moneda
            </div>
            ${divMonedaBars}
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
              <i class="fas fa-university" style="margin-right:4px;"></i> Por Institucion
            </div>
            ${divInstBars}
          </div>
        </div>
      </div>
    </div>`;

  // -- Top 5 Rendimientos Acumulados (across all time) --
  const rendAcumByCuenta = {};
  rendimientos.forEach(r => {
    const cta = _cuentaMapKpi[r.cuenta_id];
    if (!cta || cta.activa === false || cta.tipo !== 'inversion') return;
    if (!rendAcumByCuenta[r.cuenta_id]) rendAcumByCuenta[r.cuenta_id] = { nombre: cta.nombre, monto: 0, moneda: cta.moneda || 'MXN' };
    rendAcumByCuenta[r.cuenta_id].monto += toMXN(_rendReal(r), cta.moneda || 'MXN', tiposCambio);
  });
  const topRendAcum = Object.values(rendAcumByCuenta).sort((a, b) => b.monto - a.monto).slice(0, 5);

  // -- Build Resumen Panel --
  var resumenPanelHTML = buildResumenPanel(movimientos, cuentas, prestamos, propiedades);

  // -- Build "ultimos 15 dias" summary card --
  var ultimos15DiasHTML = _buildUltimos15Dias(movimientos, tiposCambio);

  // -- Render HTML --
  el.innerHTML = `
    <!-- ROW 1: 3 cards aligned to 4-col KPI grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px;align-items:stretch;" id="dashboardTopRow">
      <!-- Patrimonio Neto (spans 2 columns) -->
      <div class="card" style="grid-column:span 2;border-left:3px solid var(--accent-blue);cursor:pointer;padding:10px 14px;display:flex;align-items:center;gap:12px;margin-bottom:0;" onclick="mostrarDesglosePatrimonio()">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-landmark" style="color:var(--accent-blue);font-size:17px;"></i>
        </div>
        <div style="min-width:0;flex:1;">
          <span style="font-size:11px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Patrimonio Neto</span>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${formatCurrencyInt(patrimonioTotal, 'MXN')}</div>
        </div>
        <div style="color:var(--text-primary);font-size:12px;flex-shrink:0;"></div>
      </div>
      <!-- Ultimos 15 dias -->
      ${ultimos15DiasHTML}
      <!-- Saludo y Alertas -->
      ${resumenPanelHTML || '<div class="card" style="margin-bottom:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;"><i class="fas fa-check-circle" style="color:var(--accent-green);margin-right:6px;"></i>Sin alertas pendientes</div>'}
    </div>

    <!-- ROW 2: 8 KPI Cards (4+4) -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px;" id="dashboardKPIGrid">
      <div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesgloseCuentas('debito')">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-university" style="color:var(--accent-blue);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Cuentas Bancarias</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrencyInt(kpiBancarias, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">${kpiBancariasCount} cuenta${kpiBancariasCount !== 1 ? 's' : ''} <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-green);cursor:pointer;" onclick="mostrarDesgloseCuentas('inversion')">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-chart-line" style="color:var(--accent-green);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Inversiones</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrencyInt(kpiInversiones, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">${kpiInversionesCount} producto${kpiInversionesCount !== 1 ? 's' : ''} <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-amber);cursor:pointer;" onclick="mostrarDesglosePropiedades()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-building" style="color:var(--accent-amber);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Propiedades</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrencyInt(kpiPropiedades, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">${kpiPropiedadesCount} propiedad${kpiPropiedadesCount !== 1 ? 'es' : ''} <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-purple);cursor:pointer;" onclick="mostrarDesglosePrestamos()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-handshake" style="color:var(--accent-purple);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Prestamos</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrencyInt(kpiPrestamosNeto, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">${kpiPrestamosCount} prestamo${kpiPrestamosCount !== 1 ? 's' : ''} activo${kpiPrestamosCount !== 1 ? 's' : ''} <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px;" id="dashboardKPIGrid2">
      <div class="card" style="border-left:3px solid var(--accent-red);cursor:pointer;" onclick="document.getElementById('seccionDeuda') && document.getElementById('seccionDeuda').scrollIntoView({behavior:'smooth'})">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-file-invoice-dollar" style="color:var(--accent-red);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Deuda Total</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-red);">${formatCurrencyInt(totalDeuda, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">${ratioDeudaPatrimonio.toFixed(1)}% del patrimonio</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-amber);cursor:pointer;" onclick="mostrarDesgloseRendimiento()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-percentage" style="color:var(--accent-amber);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Rendimiento ${periodoLabel}</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-amber);">${formatCurrencyInt(rendPeriodo, 'MXN')}</div>
        <div style="font-size:11px;color:var(--accent-amber);margin-top:2px;font-weight:600;">${rendPromedio.toFixed(2)}% anual prom. <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-red);cursor:pointer;" onclick="mostrarDesgloseGastos()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-receipt" style="color:var(--accent-red);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Gastos ${periodoLabel}</span>
        </div>
        <div class="text-red" style="font-size:20px;font-weight:800;">${formatCurrencyInt(gastosPeriodo, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">Rend: <span class="text-green">${formatCurrencyInt(rendPeriodo, 'MXN')}</span></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-purple);cursor:pointer;" onclick="mostrarDesgloseBalance()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-balance-scale" style="color:var(--accent-purple);font-size:14px;"></i>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Balance Neto</span>
        </div>
        <div class="${kpiColor(balanceNeto)}" style="font-size:20px;font-weight:800;">${formatCurrencyInt(balanceNeto, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-primary);margin-top:2px;">Rend + Ing - Gastos <i class="fas fa-chevron-right" style="font-size:9px;margin-left:3px;"></i></div>
      </div>
    </div>

    <!-- Diversificacion + Distribucion por Tipo (same row, matched height) -->
    <div class="grid-2" style="margin-bottom:24px;align-items:stretch;">
      ${diversificacionHTML}
      <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;">
        <div class="card-header" style="flex-shrink:0;">
          <span class="card-title"><i class="fas fa-chart-pie" style="margin-right:8px;color:var(--accent-amber);"></i>Distribucion por Tipo</span>
          <div style="display:flex;gap:4px;margin-left:auto;">
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="exportChartAsImage('dashDonutChart','distribucion_tipo')" title="Descargar imagen"><i class="fas fa-download"></i></button>
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="printChart('dashDonutChart','Distribucion por Tipo')" title="Imprimir"><i class="fas fa-print"></i></button>
          </div>
        </div>
        <div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;min-height:260px;">
          <canvas id="dashDonutChart"></canvas>
        </div>
        <div id="dashDonutLegend" style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;padding:12px 8px 8px;margin-top:8px;border-top:1px solid var(--border-color);flex-shrink:0;"></div>
      </div>
    </div>

    <!-- Rendimientos vs Gastos (full width) — ABOVE patrimonio -->
    <div style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-area" style="margin-right:8px;color:var(--accent-green);"></i>Rendimientos vs Gastos</span>
          <div style="display:flex;gap:4px;margin-left:auto;">
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="exportChartAsImage('dashLineChart','rendimientos_vs_gastos')" title="Descargar imagen"><i class="fas fa-download"></i></button>
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="printChart('dashLineChart','Rendimientos vs Gastos')" title="Imprimir"><i class="fas fa-print"></i></button>
          </div>
        </div>
        <div style="position:relative;height:300px;">
          <canvas id="dashLineChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Evolucion del Patrimonio (full width, 24 months) -->
    <div style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="card-title"><i class="fas fa-chart-bar" style="margin-right:8px;color:var(--accent-blue);"></i>Evolucion del Patrimonio</span>
          <div style="display:flex;gap:4px;margin-left:auto;">
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="exportChartAsImage('dashBarChart','evolucion_patrimonio')" title="Descargar imagen"><i class="fas fa-download"></i></button>
            <button class="btn btn-secondary" style="padding:3px 6px;font-size:10px;" onclick="printChart('dashBarChart','Evolucion del Patrimonio')" title="Imprimir"><i class="fas fa-print"></i></button>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="editarHistorialPatrimonio()">
              <i class="fas fa-edit"></i> Editar Historial
            </button>
          </div>
        </div>
        <div style="position:relative;height:320px;">
          <canvas id="dashBarChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Reporte Mensual de Patrimonio -->
    <div style="margin-bottom:24px;" id="dashPatrimonioMensualReport"></div>

    <!-- ROW: Alertas (wider) + Resumen de Deuda -->
    <div style="display:grid;grid-template-columns:2fr 3fr;gap:16px;margin-bottom:24px;" id="dashboardAlertaDeudaRow">
      <div>${alertasHTML}</div>
      <div id="seccionDeuda">${deudaHTML}</div>
    </div>

    <!-- Summary Tables (3 columns) -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-trophy" style="margin-right:8px;color:var(--accent-amber);"></i>Top 5 Activos</span>
        </div>
        <table class="data-table sortable-table">
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
              const tipoLabel = c.tipo === 'inversion' ? 'INVERSION'
                : c.tipo === 'inmueble' ? 'INMUEBLE'
                : c.tipo === 'activo_fijo' ? 'ACTIVO FIJO' : 'DEBITO';
              return `<tr>
                <td style="font-weight:600;color:var(--text-primary);">${c.nombre}</td>
                <td><span class="badge ${tipoBadge}">${tipoLabel}</span></td>
                <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrencyInt(c.valorMXN, 'MXN')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-clock" style="margin-right:8px;color:var(--accent-blue);"></i>Ultimos 5 Movimientos</span>
        </div>
        <table class="data-table sortable-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${ultimosMovs.map(mv => {
              const esTransf = !!mv.transferencia_id;
              const esGasto = mv.tipo === 'gasto';
              const signo = esGasto ? '-' : '+';
              const montoClass = esTransf ? '' : (esGasto ? 'text-red' : 'text-green');
              return `<tr>
                <td style="white-space:nowrap;">${formatDate(mv.fecha)}</td>
                <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${mv.descripcion}">${mv.descripcion}</td>
                <td style="text-align:right;font-weight:600;${esTransf ? 'color:var(--accent-purple);' : ''}" class="${montoClass}">${signo}${formatCurrencyInt(mv.monto, mv.moneda)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-medal" style="margin-right:8px;color:var(--accent-green);"></i>Top 5 Rendimientos Acumulados</span>
        </div>
        <table class="data-table sortable-table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th style="text-align:right;">Rendimiento (MXN)</th>
            </tr>
          </thead>
          <tbody>
            ${topRendAcum.map(r => {
              const color = r.monto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
              const signo = r.monto >= 0 ? '+' : '';
              return `<tr>
                <td style="font-weight:600;color:var(--text-primary);">${r.nombre}</td>
                <td style="text-align:right;font-weight:600;color:${color};">${signo}${formatCurrencyInt(r.monto, 'MXN')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resumen Comparativo -->
    <div style="margin-top:24px;">
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;gap:12px;justify-content:flex-start;">
          <span class="card-title" style="margin-right:0;"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-green);"></i>Resumen Comparativo</span>
          <select id="resumenCompMesFilter" class="form-select" style="padding:3px 8px;font-size:11px;min-height:auto;width:100px;" onchange="renderResumenComparativo()">
            <option value="0">Enero</option><option value="1">Febrero</option><option value="2">Marzo</option>
            <option value="3">Abril</option><option value="4">Mayo</option><option value="5">Junio</option>
            <option value="6">Julio</option><option value="7">Agosto</option><option value="8">Septiembre</option>
            <option value="9">Octubre</option><option value="10">Noviembre</option><option value="11">Diciembre</option>
          </select>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table" id="yoyComparisonTable" style="font-size:11px;">
            <thead>
              <tr id="yoyComparisonThead"></tr>
            </thead>
            <tbody id="yoyComparisonTbody">
              <tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">Cargando...</td></tr>
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

  // -- 1. Pie: Distribucion por Tipo (including deuda) --
  if (window._charts.dashDonut) window._charts.dashDonut.destroy();
  const donutCtx = document.getElementById('dashDonutChart').getContext('2d');
  const pieLabels = [];
  const pieData = [];
  const pieColors = [];
  const pieColorMap = {
    debito: { label: 'Bancarias', color: '#3b82f6' },
    inversion: { label: 'Inversiones', color: '#10b981' },
    inmueble: { label: 'Inmuebles', color: '#f59e0b' },
    activo_fijo: { label: 'Activos', color: '#8b5cf6' },
    propiedades: { label: 'Propiedades', color: '#06b6d4' },
    prestamos_otorgados: { label: 'Prestamos', color: '#84cc16' },
    deuda: { label: 'Deuda', color: '#ef4444' }
  };
  // Build pie data entries and sort by value (largest first) so chart slices match legend order
  const pieEntries = [];
  Object.keys(pieColorMap).forEach(key => {
    if (distTipo[key] > 0) {
      pieEntries.push({ label: pieColorMap[key].label, value: distTipo[key], color: pieColorMap[key].color });
    }
  });
  pieEntries.sort((a, b) => b.value - a.value);
  pieEntries.forEach(e => {
    pieLabels.push(e.label);
    pieData.push(e.value);
    pieColors.push(e.color);
  });
  window._charts.dashDonut = new Chart(donutCtx, {
    type: 'pie',
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: pieColors,
        borderColor: _cc.borderColor,
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 14, weight: 'bold', family: "'Plus Jakarta Sans'" },
          bodyFont: { size: 13, family: "'Plus Jakarta Sans'" },
          padding: 12,
          boxPadding: 6,
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ' ' + ctx.label + ': ' + formatCurrencyInt(val, 'MXN') + ' (' + pct + '%)';
            },
          },
        },
      },
    },
  });

  // Custom legend sorted by proportion (largest first)
  var pieLegendContainer = document.getElementById('dashDonutLegend');
  if (pieLegendContainer && pieData.length > 0) {
    var pieTotal = pieData.reduce(function(a, b) { return a + b; }, 0);
    var pieItems = pieLabels.map(function(label, i) {
      return { label: label, value: pieData[i], color: pieColors[i], pct: pieTotal > 0 ? (pieData[i] / pieTotal * 100) : 0 };
    });
    pieItems.sort(function(a, b) { return b.value - a.value; });
    pieLegendContainer.innerHTML = pieItems.map(function(item) {
      return '<div style="display:flex;flex-direction:column;align-items:center;min-width:80px;">' +
        '<span style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;">' + item.label + '</span>' +
        '<span style="font-size:11px;color:var(--text-muted);margin-top:1px;">' + item.pct.toFixed(1) + '%</span>' +
        '<div style="width:100%;height:4px;border-radius:2px;background:' + item.color + ';margin-top:4px;"></div>' +
      '</div>';
    }).join('');
  }

  // -- 2. Bar: Evolucion del Patrimonio (from first data, max 24 months) --
  // Store barPeriodos for click handler
  window._dashBarPeriodos = barPeriodos;
  if (window._charts.dashBar) window._charts.dashBar.destroy();
  const barCtx = document.getElementById('dashBarChart').getContext('2d');
  // Dynamic bar sizing: thinner bars when more months are shown
  var _barPct = numBarMonths > 18 ? 0.5 : (numBarMonths > 12 ? 0.6 : 0.7);
  var _barCatPct = numBarMonths > 18 ? 0.85 : (numBarMonths > 12 ? 0.9 : 0.95);
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
        barPercentage: _barPct,
        categoryPercentage: _barCatPct,
        skipNull: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(evt, elements) {
        if (elements.length > 0) {
          var idx = elements[0].index;
          var per = window._dashBarPeriodos[idx];
          if (per) _mostrarDesglosePatrimonioPeriodo(per, barLabels[idx]);
        }
      },
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: numBarMonths > 18 ? 8 : 9, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
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
          titleFont: { size: 15, weight: 'bold', family: "'Plus Jakarta Sans'" },
          bodyFont: { size: 15, family: "'Plus Jakarta Sans'" },
          padding: 15,
          boxPadding: 7,
          position: 'nearest',
          callbacks: {
            label: function(ctx) { return 'Patrimonio: ' + formatCurrencyInt(ctx.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });

  // -- 3. Line: Rendimientos vs Gastos (start from first data, max 24 months) --
  // Find earliest period with rendimiento or gasto data
  const allRendGastoPeriodos = new Set();
  rendimientos.forEach(r => { if (r.periodo) allRendGastoPeriodos.add(r.periodo); });
  movimientos.forEach(mv => {
    if (mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha) {
      allRendGastoPeriodos.add(mv.fecha.substring(0, 7));
    }
  });
  const sortedRGPeriodos = Array.from(allRendGastoPeriodos).sort();
  const firstRGPeriodo = sortedRGPeriodos.length > 0 ? sortedRGPeriodos[0] : `${anioActual}-01`;
  const firstRGDate = new Date(parseInt(firstRGPeriodo.split('-')[0]), parseInt(firstRGPeriodo.split('-')[1]) - 1, 1);
  let rgMonthsDiff = (currentDate.getFullYear() - firstRGDate.getFullYear()) * 12 + (currentDate.getMonth() - firstRGDate.getMonth());
  const numLineMonths = Math.min(Math.max(rgMonthsDiff + 1, 1), 24);
  const lineStartDate = new Date(anioActual, mesActual - (numLineMonths - 1), 1);

  const lineLabels = [];
  const rendData = [];
  const gastosData = [];
  const linePeriodos = [];

  for (let i = 0; i < numLineMonths; i++) {
    const dt = new Date(lineStartDate.getFullYear(), lineStartDate.getMonth() + i, 1);
    const mIdx = dt.getMonth();
    const aIdx = dt.getFullYear();
    const per = `${aIdx}-${String(mIdx + 1).padStart(2, '0')}`;
    lineLabels.push(mesNombre(mIdx).substring(0, 3) + ' ' + aIdx.toString().slice(-2));
    linePeriodos.push(per);

    // Rendimientos for this period (using _rendReal for real rendimiento)
    const rMes = rendimientos
      .filter(r => r.periodo === per)
      .reduce((s, r) => {
        const cta = _cuentaMapKpi[r.cuenta_id];
        return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio);
      }, 0);
    rendData.push(rMes);

    // Gastos for this period (excluding transfers)
    const gMes = movimientos
      .filter(mv => {
        if (mv.tipo !== 'gasto' || mv.transferencia_id) return false;
        return mv.fecha && mv.fecha.startsWith(per);
      })
      .reduce((s, mv) => s + toMXN(mv.monto, _getMovMoneda(mv), tiposCambio), 0);
    gastosData.push(gMes);
  }

  // Store linePeriodos for click handler
  window._dashLinePeriodos = linePeriodos;
  if (window._charts.dashLine) window._charts.dashLine.destroy();
  const lineCtx = document.getElementById('dashLineChart').getContext('2d');
  // Dynamic point sizing for line chart when many months
  var _linePointR = numLineMonths > 18 ? 2 : (numLineMonths > 12 ? 3 : 4);
  var _linePointHoverR = numLineMonths > 18 ? 4 : (numLineMonths > 12 ? 5 : 6);
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
          pointRadius: _linePointR,
          pointHoverRadius: _linePointHoverR,
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
          pointRadius: _linePointR,
          pointHoverRadius: _linePointHoverR,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: function(evt, elements) {
        if (elements.length > 0) {
          var idx = elements[0].index;
          var per = window._dashLinePeriodos[idx];
          if (per) _mostrarDesgloseRendGastoPeriodo(per, lineLabels[idx]);
        }
      },
      scales: {
        x: {
          ticks: { color: chartFontColor, font: { size: numLineMonths > 18 ? 8 : 10, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: chartFontColor,
            font: { size: 10, family: "'Plus Jakarta Sans'" },
            stepSize: 150000,
            callback: function(val) { return '$' + (val / 1000).toFixed(0) + 'k'; },
          },
          grid: { color: gridColor },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          labels: { color: chartFontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" }, usePointStyle: true },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          titleFont: { size: 15, weight: 'bold', family: "'Plus Jakarta Sans'" },
          bodyFont: { size: 15, family: "'Plus Jakarta Sans'" },
          padding: 15,
          boxPadding: 7,
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + formatCurrencyInt(ctx.parsed.y, 'MXN'); },
            afterBody: function(tooltipItems) {
              if (tooltipItems.length >= 2) {
                var rend = tooltipItems[0].parsed.y || 0;
                var gasto = tooltipItems[1].parsed.y || 0;
                var balance = rend - gasto;
                var sign = balance >= 0 ? '+' : '';
                return ['', 'Balance: ' + sign + formatCurrencyInt(balance, 'MXN')];
              }
              return [];
            },
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
                  return ctx.label + ': ' + formatCurrencyInt(val, 'MXN') + ' (' + pct + '%)';
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

  // -- Set default month filter to current month --
  var _mesFilterEl = document.getElementById('resumenCompMesFilter');
  if (_mesFilterEl) _mesFilterEl.value = String(new Date().getMonth());

  // -- Render Resumen Comparativo section --
  renderResumenComparativo();

  // -- Render Patrimonio Mensual Report --
  renderPatrimonioMensualReport();

  // -- Init sortable tables for dashboard --
  setTimeout(function() { _initSortableTables(document.getElementById('module-dashboard')); }, 100);
}

/* ============================================================
   DASHBOARD: Resumen Comparativo (Mensual + Anual)
   ============================================================ */
function renderResumenComparativo() {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentasComp = loadData(STORAGE_KEYS.cuentas) || [];
  var cuentaMapComp = {};
  cuentasComp.forEach(function(c) { cuentaMapComp[c.id] = c; });

  var nowDate = new Date();
  var mesFilterEl = document.getElementById('resumenCompMesFilter');
  var mesActualComp = mesFilterEl ? parseInt(mesFilterEl.value) : nowDate.getMonth();
  var anioActual = nowDate.getFullYear();
  var anioPrevio = anioActual - 1;
  var mesesNombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var mesNombreComp = mesesNombres[mesActualComp];

  // -- Month periods --
  var perMesActual = anioActual + '-' + String(mesActualComp + 1).padStart(2, '0');
  var perMesPrevio = anioPrevio + '-' + String(mesActualComp + 1).padStart(2, '0');

  // -- Annual string prefixes --
  var anioActualStr = String(anioActual);
  var anioPrevioStr = String(anioPrevio);

  // -- Monthly data --
  var ingresosMesActual = movimientos.filter(function(mv) { return mv.tipo === 'ingreso' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(perMesActual); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);
  var ingresosMesPrevio = movimientos.filter(function(mv) { return mv.tipo === 'ingreso' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(perMesPrevio); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);

  var gastosMesActual = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(perMesActual); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);
  var gastosMesPrevio = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(perMesPrevio); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);

  var rendMesActual = rendimientos.filter(function(r) { return r.periodo === perMesActual; }).reduce(function(s, r) { var cta = cuentaMapComp[r.cuenta_id]; return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio); }, 0);
  var rendMesPrevio = rendimientos.filter(function(r) { return r.periodo === perMesPrevio; }).reduce(function(s, r) { var cta = cuentaMapComp[r.cuenta_id]; return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio); }, 0);

  // -- Annual data --
  var ingresosAnioActual = movimientos.filter(function(mv) { return mv.tipo === 'ingreso' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(anioActualStr); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);
  var ingresosAnioPrevio = movimientos.filter(function(mv) { return mv.tipo === 'ingreso' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(anioPrevioStr); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);

  var gastosAnioActual = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(anioActualStr); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);
  var gastosAnioPrevio = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(anioPrevioStr); }).reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda || 'MXN', tiposCambio); }, 0);

  var rendAnioActual = rendimientos.filter(function(r) { return r.periodo && r.periodo.startsWith(anioActualStr); }).reduce(function(s, r) { var cta = cuentaMapComp[r.cuenta_id]; return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio); }, 0);
  var rendAnioPrevio = rendimientos.filter(function(r) { return r.periodo && r.periodo.startsWith(anioPrevioStr); }).reduce(function(s, r) { var cta = cuentaMapComp[r.cuenta_id]; return s + toMXN(_rendReal(r), cta ? cta.moneda : 'MXN', tiposCambio); }, 0);

  // -- Build rows --
  var conceptos = [
    { nombre: 'Ingresos',      mesPrevio: ingresosMesPrevio, mesActual: ingresosMesActual, anioPrevio: ingresosAnioPrevio, anioActual: ingresosAnioActual, positiveIsGood: true },
    { nombre: 'Gastos',         mesPrevio: gastosMesPrevio,   mesActual: gastosMesActual,   anioPrevio: gastosAnioPrevio,   anioActual: gastosAnioActual,   positiveIsGood: false },
    { nombre: 'Rendimientos',   mesPrevio: rendMesPrevio,     mesActual: rendMesActual,     anioPrevio: rendAnioPrevio,     anioActual: rendAnioActual,     positiveIsGood: true },
  ];

  function _diffCell(val1, val2, positiveIsGood) {
    var diff = val1 - val2;
    var pct = val2 !== 0 ? ((diff / Math.abs(val2)) * 100) : (val1 !== 0 ? 100 : 0);
    var isGood = positiveIsGood ? diff >= 0 : diff <= 0;
    var color = diff === 0 ? 'var(--text-muted)' : (isGood ? 'var(--accent-green)' : 'var(--accent-red)');
    var icon = '';
    if (diff !== 0) {
      if (positiveIsGood) {
        icon = diff > 0 ? '<i class="fas fa-arrow-up" style="font-size:9px;margin-right:3px;"></i>' : '<i class="fas fa-arrow-down" style="font-size:9px;margin-right:3px;"></i>';
      } else {
        icon = diff < 0 ? '<i class="fas fa-arrow-down" style="font-size:9px;margin-right:3px;"></i>' : '<i class="fas fa-arrow-up" style="font-size:9px;margin-right:3px;"></i>';
      }
    }
    var prefix = diff > 0 ? '+' : (diff < 0 ? '-' : '');
    return { diffHTML: icon + prefix + formatCurrencyInt(Math.abs(diff), 'MXN'), pctHTML: icon + formatPct(pct), color: color };
  }

  var tbodyHTML = conceptos.map(function(c) {
    var mDiff = _diffCell(c.mesActual, c.mesPrevio, c.positiveIsGood);
    var aDiff = _diffCell(c.anioActual, c.anioPrevio, c.positiveIsGood);

    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);white-space:nowrap;">' + c.nombre + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);white-space:nowrap;">' + formatCurrencyInt(c.mesPrevio, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);white-space:nowrap;">' + formatCurrencyInt(c.mesActual, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + mDiff.color + ';white-space:nowrap;">' + mDiff.diffHTML + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + mDiff.color + ';white-space:nowrap;">' + mDiff.pctHTML + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);white-space:nowrap;border-left:2px solid var(--border-color);">' + formatCurrencyInt(c.anioPrevio, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);white-space:nowrap;">' + formatCurrencyInt(c.anioActual, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + aDiff.color + ';white-space:nowrap;">' + aDiff.diffHTML + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + aDiff.color + ';white-space:nowrap;">' + aDiff.pctHTML + '</td>' +
    '</tr>';
  }).join('');

  // Update table
  var thead = document.getElementById('yoyComparisonThead');
  var tbody = document.getElementById('yoyComparisonTbody');
  if (thead) {
    thead.innerHTML =
      '<th>Concepto</th>' +
      '<th style="text-align:right;white-space:nowrap;"><span class="badge badge-purple" style="font-size:10px;">' + mesNombreComp + ' ' + anioPrevio + '</span></th>' +
      '<th style="text-align:right;white-space:nowrap;"><span class="badge badge-blue" style="font-size:10px;">' + mesNombreComp + ' ' + anioActual + '</span></th>' +
      '<th style="text-align:right;">Dif</th>' +
      '<th style="text-align:right;">%</th>' +
      '<th style="text-align:right;white-space:nowrap;border-left:2px solid var(--border-color);"><span class="badge badge-purple" style="font-size:10px;">' + anioPrevio + '</span></th>' +
      '<th style="text-align:right;white-space:nowrap;"><span class="badge badge-blue" style="font-size:10px;">' + anioActual + '</span></th>' +
      '<th style="text-align:right;">Dif</th>' +
      '<th style="text-align:right;">%</th>';
  }
  if (tbody) {
    tbody.innerHTML = tbodyHTML;
  }
}

/* ============================================================
   DASHBOARD: Reporte Mensual de Patrimonio (table below patrimonio chart)
   ============================================================ */
function renderPatrimonioMensualReport(anioParam) {
  var container = document.getElementById('dashPatrimonioMensualReport');
  if (!container) return;

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  var nowRP = new Date();
  var anioActualRP = nowRP.getFullYear();
  // Use param from filter, fallback to current year
  var anio = anioParam != null ? parseInt(anioParam) : anioActualRP;
  var mesActualIdx = nowRP.getMonth(); // 0-indexed
  var esAnioActual = (anio === anioActualRP);

  var mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Only show months up to current month for current year, all 12 for past years
  var maxMes = esAnioActual ? mesActualIdx : 11;

  // Helper: format currency without decimals for this report
  function fmtInt(val) {
    var n = Math.round(Math.abs(val));
    return '$' + n.toLocaleString('es-MX');
  }

  // Font size for this report
  var FS = '14px';
  var FS_HEAD = '15px';

  // Pre-sort historial per cuenta
  var cuentaHistSorted = {};
  cuentas.forEach(function(c) {
    if (c.activa === false) return;
    var hist = (c.historial_saldos || c.historial_cierres || []).map(function(h) {
      var p = h.periodo || (h.fecha ? h.fecha.substring(0, 7) : '');
      return { saldo_final: h.saldo_final, saldo: h.saldo, _periodo: p, periodo: p };
    });
    cuentaHistSorted[c.id] = hist.slice().sort(function(a, b) { return (a._periodo || a.periodo || '').localeCompare(b._periodo || b.periodo || ''); });
  });

  function findCarryForward(sortedHist, targetPeriodo) {
    var result = null;
    for (var i = 0; i < sortedHist.length; i++) {
      var per = sortedHist[i]._periodo || sortedHist[i].periodo || '';
      if (per <= targetPeriodo) result = sortedHist[i];
      else break;
    }
    return result;
  }

  // Build header — always show all 12 months
  var thead = '<tr><th style="min-width:130px;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">Cuenta</th>';
  thead += '<th style="text-align:left;min-width:50px;font-size:' + FS + ';">Mon.</th>';
  for (var m = 0; m <= maxMes; m++) {
    thead += '<th style="text-align:right;min-width:85px;font-size:' + FS + ';">' + mesesCortos[m] + '</th>';
  }
  thead += '<th style="text-align:right;min-width:100px;font-weight:800;font-size:' + FS + ';">Ultimo</th></tr>';

  var rows = '';
  var numMeses = maxMes + 1;
  var totalPorMes = new Array(numMeses).fill(0);

  // -- Cuentas activas --
  var cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });
  var subtotalCuentasPorMes = new Array(numMeses).fill(0);

  cuentasActivas.forEach(function(cta) {
    var moneda = cta.moneda || 'MXN';
    var sortedHist = cuentaHistSorted[cta.id] || [];
    var saldoRealMXN = toMXN(_calcSaldoReal(cta), moneda, tiposCambio);
    var row = '<tr><td style="font-weight:600;color:var(--text-primary);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">' + cta.nombre + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(moneda) + '" style="font-size:9px;padding:1px 5px;">' + moneda + '</span></td>';
    var lastVal = 0;

    for (var m = 0; m <= maxMes; m++) {
      var per = anio + '-' + String(m + 1).padStart(2, '0');
      if (esAnioActual && m === mesActualIdx) {
        subtotalCuentasPorMes[m] += saldoRealMXN;
        totalPorMes[m] += saldoRealMXN;
        lastVal = saldoRealMXN;
        row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;">' + fmtInt(saldoRealMXN) + '</td>';
      } else {
        var cierre = findCarryForward(sortedHist, per);
        if (cierre) {
          var saldo = cierre.saldo_final != null ? cierre.saldo_final : (cierre.saldo || 0);
          var saldoMXN = toMXN(saldo, moneda, tiposCambio, per);
          subtotalCuentasPorMes[m] += saldoMXN;
          totalPorMes[m] += saldoMXN;
          lastVal = saldoMXN;
          row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;">' + fmtInt(saldoMXN) + '</td>';
        } else {
          row += '<td style="text-align:center;color:var(--text-muted);font-size:' + FS + ';">\u2014</td>';
        }
      }
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';">' + fmtInt(lastVal) + '</td></tr>';
    rows += row;
  });

  // Subtotal cuentas
  rows += '<tr style="font-weight:700;border-top:1px solid var(--border-color);background:rgba(59,130,246,0.05);"><td style="position:sticky;left:0;background:rgba(59,130,246,0.05);z-index:1;font-size:' + FS + ';color:var(--accent-blue);">Subtotal Cuentas</td><td></td>';
  var lastSubCuentas = 0;
  for (var m = 0; m <= maxMes; m++) {
    if (subtotalCuentasPorMes[m] === 0) { rows += '<td style="text-align:center;color:var(--text-muted);font-size:' + FS + ';">\u2014</td>'; }
    else { lastSubCuentas = subtotalCuentasPorMes[m]; rows += '<td style="text-align:right;font-size:' + FS + ';color:var(--accent-blue);">' + fmtInt(subtotalCuentasPorMes[m]) + '</td>'; }
  }
  rows += '<td style="text-align:right;font-size:' + FS + ';font-weight:800;color:var(--accent-blue);">' + fmtInt(lastSubCuentas) + '</td></tr>';

  // -- Propiedades --
  var propActivas = propiedades.filter(function(p) { return p.activa !== false; });
  var subtotalPropPorMes = new Array(numMeses).fill(0);
  propActivas.forEach(function(prop) {
    var valMXN = toMXN(prop.valor_actual || prop.valor_compra || 0, prop.moneda || 'MXN', tiposCambio);
    var propMoneda = prop.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--text-primary);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">' + prop.nombre + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(propMoneda) + '" style="font-size:9px;padding:1px 5px;">' + propMoneda + '</span></td>';
    for (var m = 0; m <= maxMes; m++) {
      subtotalPropPorMes[m] += valMXN;
      totalPorMes[m] += valMXN;
      row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;">' + fmtInt(valMXN) + '</td>';
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';">' + fmtInt(valMXN) + '</td></tr>';
    rows += row;
  });

  if (propActivas.length > 0) {
    rows += '<tr style="font-weight:700;border-top:1px solid var(--border-color);background:rgba(6,182,212,0.05);"><td style="position:sticky;left:0;background:rgba(6,182,212,0.05);z-index:1;font-size:' + FS + ';color:var(--accent-blue);">Subtotal Propiedades</td><td></td>';
    var lastSubProp = 0;
    for (var m = 0; m <= maxMes; m++) {
      if (subtotalPropPorMes[m] === 0) { rows += '<td style="text-align:center;color:var(--text-muted);font-size:' + FS + ';">\u2014</td>'; }
      else { lastSubProp = subtotalPropPorMes[m]; rows += '<td style="text-align:right;font-size:' + FS + ';color:var(--accent-blue);">' + fmtInt(subtotalPropPorMes[m]) + '</td>'; }
    }
    rows += '<td style="text-align:right;font-size:' + FS + ';font-weight:800;color:var(--accent-blue);">' + fmtInt(lastSubProp) + '</td></tr>';
  }

  // -- Préstamos otorgados --
  var prestOtorgados = prestamos.filter(function(p) { return p.tipo === 'otorgado' && p.estado !== 'pagado'; });
  var subtotalOtorgPorMes = new Array(numMeses).fill(0);
  prestOtorgados.forEach(function(p) {
    var saldo = p.saldo_pendiente != null ? p.saldo_pendiente : p.monto_original;
    var valMXN = toMXN(saldo, p.moneda || 'MXN', tiposCambio);
    var pMoneda = p.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--text-primary);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">Prest. ' + (p.persona || 'N/A') + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(pMoneda) + '" style="font-size:9px;padding:1px 5px;">' + pMoneda + '</span></td>';
    for (var m = 0; m <= maxMes; m++) {
      subtotalOtorgPorMes[m] += valMXN;
      totalPorMes[m] += valMXN;
      row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;">' + fmtInt(valMXN) + '</td>';
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';">' + fmtInt(valMXN) + '</td></tr>';
    rows += row;
  });

  if (prestOtorgados.length > 0) {
    rows += '<tr style="font-weight:700;border-top:1px solid var(--border-color);background:rgba(132,204,22,0.05);"><td style="position:sticky;left:0;background:rgba(132,204,22,0.05);z-index:1;font-size:' + FS + ';color:var(--accent-green);">Subtotal Otorgados</td><td></td>';
    var lastSubOtorg = 0;
    for (var m = 0; m <= maxMes; m++) {
      if (subtotalOtorgPorMes[m] === 0) { rows += '<td style="text-align:center;color:var(--text-muted);font-size:' + FS + ';">\u2014</td>'; }
      else { lastSubOtorg = subtotalOtorgPorMes[m]; rows += '<td style="text-align:right;font-size:' + FS + ';color:var(--accent-green);">' + fmtInt(subtotalOtorgPorMes[m]) + '</td>'; }
    }
    rows += '<td style="text-align:right;font-size:' + FS + ';font-weight:800;color:var(--accent-green);">' + fmtInt(lastSubOtorg) + '</td></tr>';
  }

  // -- Deuda (préstamos recibidos + preventa de propiedades) --
  var prestRecibidos = prestamos.filter(function(p) { return p.tipo === 'recibido' && p.estado !== 'pagado'; });
  var preventasPrest = prestamos.filter(function(p) { return p.tipo === 'preventa' && p.estado !== 'pagado'; });
  var preventasProp = propiedades.filter(function(pr) {
    return pr.tipo === 'preventa' && (pr.mensualidades_total - (pr.mensualidades_pagadas || 0)) > 0;
  });

  var subtotalDeudaPorMes = new Array(numMeses).fill(0);
  var hayDeuda = (prestRecibidos.length > 0 || preventasPrest.length > 0 || preventasProp.length > 0);

  prestRecibidos.forEach(function(p) {
    var saldo = p.saldo_pendiente != null ? p.saldo_pendiente : p.monto_original;
    var valMXN = toMXN(saldo, p.moneda || 'MXN', tiposCambio);
    var dMoneda = p.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--accent-red);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">Deuda: ' + (p.persona || 'N/A') + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(dMoneda) + '" style="font-size:9px;padding:1px 5px;">' + dMoneda + '</span></td>';
    for (var m = 0; m <= maxMes; m++) {
      subtotalDeudaPorMes[m] += valMXN;
      totalPorMes[m] -= valMXN;
      row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;color:var(--accent-red);">-' + fmtInt(valMXN) + '</td>';
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';color:var(--accent-red);">-' + fmtInt(valMXN) + '</td></tr>';
    rows += row;
  });

  preventasPrest.forEach(function(p) {
    var saldo = p.saldo_pendiente != null ? p.saldo_pendiente : p.monto_original;
    var valMXN = toMXN(saldo, p.moneda || 'MXN', tiposCambio);
    var dpMoneda = p.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--accent-red);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">Deuda: ' + (p.persona || 'N/A') + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(dpMoneda) + '" style="font-size:9px;padding:1px 5px;">' + dpMoneda + '</span></td>';
    for (var m = 0; m <= maxMes; m++) {
      subtotalDeudaPorMes[m] += valMXN;
      totalPorMes[m] -= valMXN;
      row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;color:var(--accent-red);">-' + fmtInt(valMXN) + '</td>';
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';color:var(--accent-red);">-' + fmtInt(valMXN) + '</td></tr>';
    rows += row;
  });

  preventasProp.forEach(function(pr) {
    var enganche = pr.enganche || 0;
    var pagado = enganche + ((pr.mensualidades_pagadas || 0) * (pr.monto_mensualidad || 0));
    var pendiente = Math.max(0, (pr.valor_compra || 0) - pagado);
    if (pendiente <= 0) return;
    var valMXN = toMXN(pendiente, pr.moneda || 'MXN', tiposCambio);
    var prMoneda = pr.moneda || 'MXN';
    var row = '<tr><td style="font-weight:600;color:var(--accent-red);white-space:nowrap;position:sticky;left:0;background:var(--bg-card);z-index:1;font-size:' + FS + ';">Deuda: ' + (pr.nombre || 'Preventa') + '</td><td style="text-align:left;"><span class="badge ' + monedaBadgeClass(prMoneda) + '" style="font-size:9px;padding:1px 5px;">' + prMoneda + '</span></td>';
    for (var m = 0; m <= maxMes; m++) {
      subtotalDeudaPorMes[m] += valMXN;
      totalPorMes[m] -= valMXN;
      row += '<td style="text-align:right;font-size:' + FS + ';white-space:nowrap;color:var(--accent-red);">-' + fmtInt(valMXN) + '</td>';
    }
    row += '<td style="text-align:right;font-weight:700;font-size:' + FS + ';color:var(--accent-red);">-' + fmtInt(valMXN) + '</td></tr>';
    rows += row;
  });

  if (hayDeuda) {
    rows += '<tr style="font-weight:700;border-top:1px solid var(--border-color);background:rgba(239,68,68,0.05);"><td style="position:sticky;left:0;background:rgba(239,68,68,0.05);z-index:1;font-size:' + FS + ';color:var(--accent-red);">Subtotal Deuda</td><td></td>';
    var lastSubDeuda = 0;
    for (var m = 0; m <= maxMes; m++) {
      if (subtotalDeudaPorMes[m] === 0) { rows += '<td style="text-align:center;color:var(--text-muted);font-size:' + FS + ';">\u2014</td>'; }
      else { lastSubDeuda = subtotalDeudaPorMes[m]; rows += '<td style="text-align:right;font-size:' + FS + ';color:var(--accent-red);">-' + fmtInt(subtotalDeudaPorMes[m]) + '</td>'; }
    }
    rows += '<td style="text-align:right;font-size:' + FS + ';font-weight:800;color:var(--accent-red);">-' + fmtInt(lastSubDeuda) + '</td></tr>';
  }

  // -- TOTAL PATRIMONIO NETO --
  rows += '<tr style="font-weight:800;border-top:2px solid var(--border-color);background:rgba(59,130,246,0.08);"><td style="position:sticky;left:0;background:rgba(59,130,246,0.08);z-index:1;font-size:' + FS_HEAD + ';color:var(--text-primary);">PATRIMONIO NETO</td><td></td>';
  var lastTotal = 0;
  for (var m = 0; m <= maxMes; m++) {
    if (totalPorMes[m] === 0) { rows += '<td style="text-align:center;color:var(--text-muted);">\u2014</td>'; }
    else {
      lastTotal = totalPorMes[m];
      var tColor = totalPorMes[m] >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      rows += '<td style="text-align:right;font-size:' + FS_HEAD + ';color:' + tColor + ';">' + fmtInt(totalPorMes[m]) + '</td>';
    }
  }
  var lastColor = lastTotal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  rows += '<td style="text-align:right;font-size:' + FS_HEAD + ';font-weight:800;color:' + lastColor + ';">' + fmtInt(lastTotal) + '</td></tr>';

  // Year filter options
  var anioOpts = '';
  for (var y = anioActualRP; y >= anioActualRP - 5; y--) {
    anioOpts += '<option value="' + y + '"' + (y === anio ? ' selected' : '') + '>' + y + '</option>';
  }

  container.innerHTML =
    '<div class="card">' +
      '<div class="card-header" style="display:flex;align-items:center;gap:12px;justify-content:flex-start;">' +
        '<span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-blue);"></i>Reporte Mensual de Patrimonio</span>' +
        '<select id="patrimonioReportAnioFilter" class="form-select" style="padding:3px 8px;font-size:11px;min-height:auto;width:80px;" onchange="renderPatrimonioMensualReport(this.value)">' + anioOpts + '</select>' +
      '</div>' +
      '<div style="overflow-x:auto;">' +
        '<table class="data-table" style="font-size:' + FS + ';"><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table>' +
      '</div>' +
    '</div>';
}

/* ============================================================
   DASHBOARD: Desglose de Rendimiento (modal)
   ============================================================ */
function mostrarDesgloseRendimiento() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var rendimientosData = loadData(STORAGE_KEYS.rendimientos) || [];

  /* Always current month */
  var now = new Date();
  var mesActual = now.getMonth();
  var anioActual = now.getFullYear();
  var anioFiltro = anioActual;
  var periodoLabel = 'del Mes';
  var periodosList = [anioActual + '-' + String(mesActual + 1).padStart(2, '0')];

  /* Filter rendimientos by period */
  var filteredRend = rendimientosData.filter(function(r) { return periodosList.includes(r.periodo); });

  /* Build by cuenta */
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var byCuenta = {};
  var total = 0;
  filteredRend.forEach(function(r) {
    var cta = cuentaMap[r.cuenta_id];
    if (!cta || cta.activa === false || cta.tipo !== 'inversion') return;
    var nombre = cta.nombre;
    var moneda = cta.moneda || 'MXN';
    var montoReal = _rendReal(r);
    var montoMXN = toMXN(montoReal, moneda, tiposCambio);
    if (!byCuenta[cta.id]) byCuenta[cta.id] = { nombre: nombre, monto: 0, montoOrig: 0, moneda: moneda, count: 0, valMXN: toMXN(cta.saldo, moneda, tiposCambio), tasaAnual: 0 };
    byCuenta[cta.id].monto += montoMXN;
    byCuenta[cta.id].montoOrig += montoReal;
    byCuenta[cta.id].count++;
    total += montoMXN;
  });

  /* Also get tasa anual from ultimo cierre */
  var invCuentas = cuentas.filter(function(c) { return c.activa !== false && c.tipo === 'inversion'; });
  var sumPesos = 0;
  invCuentas.forEach(function(c) {
    var valMXN = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    sumPesos += valMXN;
    var tasaAnual = c.rendimiento_anual || 0;
    var hist = c.historial_saldos || [];
    if (hist.length > 0) {
      var ultimoCierre = hist.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); })[0];
      if (ultimoCierre.rendimiento_pct_anual != null) tasaAnual = ultimoCierre.rendimiento_pct_anual;
    }
    if (byCuenta[c.id]) byCuenta[c.id].tasaAnual = tasaAnual;
    else {
      /* Account with no rendimientos in period — still show in table */
      byCuenta[c.id] = { nombre: c.nombre, monto: 0, montoOrig: 0, moneda: c.moneda || 'MXN', count: 0, valMXN: valMXN, tasaAnual: tasaAnual };
    }
  });

  var entries = Object.values(byCuenta).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });

  var rowsHTML = entries.map(function(r) {
    var peso = sumPesos > 0 ? ((r.valMXN / sumPesos) * 100).toFixed(1) : '0.0';
    var rendColor = r.monto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var rendSign = r.montoOrig >= 0 ? '+' : '';
    var tasaColor = r.tasaAnual >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var tc = r.moneda !== 'MXN' ? getTipoCambio(r.moneda) : null;
    var tcDisplay = tc ? tc.toFixed(2) : '\u2014';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + r.nombre + (r.count > 0 ? '<br><span style="font-size:10px;color:var(--text-muted);">' + r.count + ' cierre' + (r.count > 1 ? 's' : '') + '</span>' : '') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + rendColor + ';">' + rendSign + formatCurrencyInt(r.montoOrig, r.moneda) + '</td>' +
      '<td style="text-align:center;color:var(--text-primary);font-size:10px;font-weight:600;">' + tcDisplay + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + rendColor + ';">' + rendSign + formatCurrencyInt(r.monto, 'MXN') + '</td>' +
      '<td style="text-align:right;color:' + tasaColor + ';font-weight:600;">' + (r.tasaAnual >= 0 ? '+' : '') + r.tasaAnual.toFixed(2) + '%</td>' +
      '<td style="text-align:right;color:var(--text-muted);">' + peso + '%</td>' +
    '</tr>';
  }).join('');

  var totalSign = total >= 0 ? '+' : '';
  rowsHTML += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
    '<td>Total</td>' +
    '<td></td><td></td>' +
    '<td style="text-align:right;color:var(--accent-amber);">' + totalSign + formatCurrencyInt(total, 'MXN') + '</td>' +
    '<td></td>' +
    '<td style="text-align:right;color:var(--text-muted);">100%</td>' +
  '</tr>';

  var html = '<table class="data-table sortable-table"><thead><tr>' +
    '<th>Producto</th><th style="text-align:right;">Monto Original</th><th style="text-align:center;">T/C</th><th style="text-align:right;">Monto (MXN)</th><th style="text-align:right;">Tasa Anual</th><th style="text-align:right;">Peso</th>' +
    '</tr></thead><tbody>' + rowsHTML + '</tbody></table>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-top:8px;">' +
      '<i class="fas fa-info-circle" style="margin-right:4px;"></i>' +
      'Rendimientos del periodo filtrado (' + periodoLabel + ' ' + anioFiltro + '). Tasa anual del ultimo cierre.' +
    '</div>';

  if (filteredRend.length === 0) {
    html = '<div style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-info-circle" style="font-size:20px;margin-bottom:8px;display:block;"></i>No hay rendimientos registrados para este periodo.</div>';
  }

  openModal('Desglose de Rendimiento ' + periodoLabel + ' ' + anioFiltro, html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
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
   ULTIMOS 15 DIAS (card independiente)
   ============================================================ */
function _buildUltimos15Dias(movimientos, tiposCambio) {
  var now = new Date();
  var hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var hace15 = new Date(hoy.getTime() - 15 * 86400000);
  var hace30 = new Date(hoy.getTime() - 30 * 86400000);

  var ingresosRecientes = 0, gastosRecientes = 0, countRecientes = 0;
  var ingresosPrev = 0, gastosPrev = 0;

  (movimientos || []).forEach(function(mv) {
    if (mv.transferencia_id) return;
    var f = new Date(mv.fecha);
    var montoMXN = mv.monto;
    if (mv.moneda === 'USD') montoMXN = mv.monto * (tiposCambio.USD_MXN || 17);
    else if (mv.moneda === 'EUR') montoMXN = mv.monto * (tiposCambio.EUR_MXN || 19);

    if (f >= hace15 && f <= hoy) {
      countRecientes++;
      if (mv.tipo === 'ingreso') ingresosRecientes += montoMXN;
      else gastosRecientes += montoMXN;
    } else if (f >= hace30 && f < hace15) {
      if (mv.tipo === 'ingreso') ingresosPrev += montoMXN;
      else gastosPrev += montoMXN;
    }
  });

  var gastosDiff = gastosPrev > 0 ? ((gastosRecientes - gastosPrev) / gastosPrev * 100) : 0;
  var gastosDiffSign = gastosDiff > 0 ? '+' : '';
  var gastosDiffColor = gastosDiff > 0 ? 'var(--accent-red)' : 'var(--accent-green)';

  return `
    <div class="card" style="margin-bottom:0;padding:10px 14px;">
      <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
        <i class="fas fa-chart-bar" style="margin-right:4px;color:var(--accent-purple);"></i>Ultimos 15 dias
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div>
          <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Ingresos</div>
          <div style="font-size:13px;font-weight:700;color:var(--accent-green);">+${formatCurrencyInt(ingresosRecientes, 'MXN')}</div>
        </div>
        <div>
          <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Gastos</div>
          <div style="font-size:13px;font-weight:700;color:var(--accent-red);">-${formatCurrencyInt(gastosRecientes, 'MXN')}</div>
        </div>
        <div>
          <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Movimientos</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${countRecientes}</div>
        </div>
        ${gastosPrev > 0 ? `<div>
          <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">vs 15d anterior</div>
          <div style="font-size:13px;font-weight:700;color:${gastosDiffColor};">${gastosDiffSign}${gastosDiff.toFixed(1)}%</div>
        </div>` : `<div></div>`}
      </div>
    </div>`;
}

/* ============================================================
   RESUMEN / RECORDATORIOS PANEL (Saludo y Alertas)
   ============================================================ */
function buildResumenPanel(movimientos, cuentas, prestamos, propiedades) {
  // Don't show if user dismissed for this session
  if (sessionStorage.getItem('pf_resumen_hidden') === '1') return '';

  var now = new Date();
  var hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // -- Greeting --
  var hour = now.getHours();
  var saludo = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

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
      text: vencimientoCount + ' vencimiento(s) en los proximos 30 dias',
      action: 'onclick="var el=document.getElementById(\'dashboardAlertaDeudaRow\'); if(el) el.scrollIntoView({behavior:\'smooth\'});"'
    });
  }

  // Pagos de preventa proximos
  var pagosPreventa = [];
  (propiedades || []).forEach(function(pr) {
    if (pr.tipo !== 'preventa') return;
    var prRestantes = (pr.mensualidades_total || 0) - (pr.mensualidades_pagadas || 0);
    var prMontoMens = pr.monto_mensualidad || 0;
    if (prRestantes > 0 && prMontoMens > 0 && pr.fecha_inicio) {
      var inicioD = new Date(pr.fecha_inicio + 'T00:00:00');
      var mesBase = inicioD.getMonth() + 1;
      var anioBase = inicioD.getFullYear();
      var pagadas = pr.mensualidades_pagadas || 0;
      var nextM = (mesBase + pagadas) % 12;
      var nextY = anioBase + Math.floor((mesBase + pagadas) / 12);
      var nextDay = Math.min(inicioD.getDate(), 28);
      var nextPay = new Date(nextY, nextM, nextDay);
      var diffDias = Math.ceil((nextPay - hoy) / 86400000);
      if (diffDias >= 0 && diffDias <= 30) {
        pagosPreventa.push({ nombre: pr.nombre, dias: diffDias, monto: prMontoMens, moneda: pr.moneda || 'MXN' });
      }
    }
  });
  if (pagosPreventa.length > 0) {
    var pagosDetail = pagosPreventa.map(function(pp) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-color);">' +
        '<span style="font-weight:600;color:var(--text-primary);">' + pp.nombre + '</span>' +
        '<span style="font-weight:700;color:var(--accent-red);">' + formatCurrencyInt(pp.monto, pp.moneda) + ' <span style="font-size:10px;color:var(--text-muted);">en ' + pp.dias + ' dia' + (pp.dias !== 1 ? 's' : '') + '</span></span>' +
      '</div>';
    }).join('');
    pendingItems.push({
      icon: 'fa-file-invoice-dollar',
      color: 'var(--accent-red)',
      text: pagosPreventa.length + ' pago(s) de preventa proximo(s)',
      detail: pagosDetail,
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
        text: 'Ultimo respaldo hace ' + daysSinceBackup + ' dias. Considera exportar un respaldo.',
        action: 'onclick="navigateTo(\'configuracion\');"'
      });
    }
  } else {
    reminderItems.push({
      icon: 'fa-database',
      color: 'var(--accent-amber)',
      text: 'Nunca has hecho un respaldo. Ve a Configuracion para exportar uno.',
      action: 'onclick="navigateTo(\'configuracion\');"'
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
      text: 'Sin movimientos en 30+ dias: ' + inactiveCuentas.join(', '),
      action: 'onclick="navigateTo(\'cuentas\');"'
    });
  }

  // -- Build HTML (compact card for grid-4) --
  var hasPending = pendingItems.length > 0;
  var hasReminders = reminderItems.length > 0;

  // If nothing to show, skip
  if (!hasPending && !hasReminders) return '';

  var html = '<div class="card" id="resumenPanel" style="margin-bottom:0;padding:10px 14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<i class="fas fa-sun" style="color:var(--accent-amber);font-size:14px;"></i>';
  html += '<div>';
  html += '<div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + saludo + '!</div>';
  html += '</div></div>';
  html += '<button onclick="dismissResumenPanel()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;padding:2px;" title="Ocultar">';
  html += '<i class="fas fa-times"></i></button>';
  html += '</div>';

  // Pending actions (compact)
  if (hasPending) {
    pendingItems.forEach(function(item, idx) {
      var hasDetail = item.detail ? true : false;
      var itemAction = item.action || '';
      if (hasDetail) {
        itemAction = 'onclick="var d=document.getElementById(\'greetDetail' + idx + '\');if(d)d.style.display=d.style.display===\'none\'?\'block\':\'none\';"';
      }
      html += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;font-size:11px;" ' + itemAction + '>';
      html += '<i class="fas ' + item.icon + '" style="color:' + item.color + ';width:14px;text-align:center;font-size:10px;"></i>';
      html += '<span style="color:var(--text-secondary);line-height:1.3;">' + item.text + '</span>';
      html += '</div>';
      if (hasDetail) {
        html += '<div id="greetDetail' + idx + '" style="display:none;padding:4px 0 4px 20px;font-size:10px;">' + item.detail + '</div>';
      }
    });
  }

  // Reminders (compact)
  if (hasReminders) {
    reminderItems.forEach(function(item) {
      html += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;' + (item.action ? 'cursor:pointer;' : '') + '" ' + (item.action || '') + '>';
      html += '<i class="fas ' + item.icon + '" style="color:' + item.color + ';width:14px;text-align:center;font-size:10px;"></i>';
      html += '<span style="color:var(--text-muted);line-height:1.3;">' + item.text + '</span>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}

function dismissResumenPanel() {
  sessionStorage.setItem('pf_resumen_hidden', '1');
  var panel = document.getElementById('resumenPanel');
  if (panel) panel.style.display = 'none';
}

/* ============================================================
   DASHBOARD: Desglose por tipo de cuenta (click en KPI cards)
   ============================================================ */
function mostrarDesgloseCuentas(tipo) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });

  var filtered = cuentas.filter(function(c) { return c.activa !== false && c.tipo === tipo; });
  filtered.sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
  var total = 0;
  var rows = filtered.map(function(c) {
    var saldoReal = _calcSaldoReal(c);
    var valMXN = toMXN(saldoReal, c.moneda, tiposCambio);
    total += valMXN;
    var tc = c.moneda !== 'MXN' ? getTipoCambio(c.moneda) : null;
    var tcDisplay = tc ? '$' + tc.toFixed(4) : '\u2014';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + c.nombre + '</td>' +
      '<td>' + (instMap[c.institucion_id] || '\u2014') + '</td>' +
      '<td><span class="badge ' + monedaBadgeClass(c.moneda) + '">' + c.moneda + '</span></td>' +
      '<td style="text-align:right;">' + formatCurrencyInt(saldoReal, c.moneda) + '</td>' +
      '<td style="text-align:center;color:var(--text-primary);font-size:10px;font-weight:600;">' + tcDisplay + '</td>' +
      '<td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td>' +
    '</tr>';
  }).join('');

  var tipoLabel = tipo === 'debito' ? 'Cuentas Bancarias' : tipo === 'inversion' ? 'Inversiones' : tipo;
  var html = '<table class="data-table sortable-table"><thead><tr><th>Nombre</th><th>Institucion</th><th>Moneda</th><th style="text-align:right;">Saldo</th><th style="text-align:center;">T/C</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>' +
    rows + '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="5">Total</td><td style="text-align:right;">' + formatCurrencyInt(total, 'MXN') + '</td></tr></tfoot></table>';

  openModal('Desglose: ' + tipoLabel, html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function mostrarDesglosePropiedades() {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var total = 0;
  var propsSorted = propiedades.slice().sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
  var rows = propsSorted.map(function(pr) {
    var valMXN = toMXN(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN', tiposCambio);
    total += valMXN;
    var tipoBadge = pr.tipo === 'preventa' ? 'badge-amber' : 'badge-green';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + pr.nombre + '</td>' +
      '<td><span class="badge ' + tipoBadge + '">' + (pr.tipo || 'escriturado') + '</span></td>' +
      '<td style="text-align:right;">' + formatCurrencyInt(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td>' +
    '</tr>';
  }).join('');

  var html = '<table class="data-table sortable-table"><thead><tr><th>Nombre</th><th>Tipo</th><th style="text-align:right;">Valor</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>' +
    rows + '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Total</td><td style="text-align:right;">' + formatCurrencyInt(total, 'MXN') + '</td></tr></tfoot></table>';

  openModal('Desglose: Propiedades', html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function mostrarDesglosePrestamos() {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var totalOtorgados = 0, totalRecibidos = 0;
  var rows = prestamos.filter(function(p) { return p.estado !== 'pagado'; }).sort(function(a, b) { return (a.persona || '').localeCompare(b.persona || ''); }).map(function(p) {
    var valMXN = toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
    if (p.tipo === 'otorgado') totalOtorgados += valMXN;
    else totalRecibidos += valMXN;
    var tipoBadge = p.tipo === 'otorgado' ? 'badge-green' : 'badge-red';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + p.persona + '</td>' +
      '<td><span class="badge ' + tipoBadge + '">' + p.tipo + '</span></td>' +
      '<td style="text-align:right;">' + formatCurrencyInt(p.saldo_pendiente, p.moneda) + '</td>' +
      '<td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td>' +
    '</tr>';
  }).join('');

  var html = '<table class="data-table sortable-table"><thead><tr><th>Persona</th><th>Tipo</th><th style="text-align:right;">Saldo</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Otorgados</td><td style="text-align:right;color:var(--accent-green);">' + formatCurrencyInt(totalOtorgados, 'MXN') + '</td></tr>' +
    '<tr style="font-weight:700;"><td colspan="3">Recibidos</td><td style="text-align:right;color:var(--accent-red);">' + formatCurrencyInt(totalRecibidos, 'MXN') + '</td></tr>' +
    '<tr style="font-weight:700;"><td colspan="3">Neto</td><td style="text-align:right;">' + formatCurrencyInt(totalOtorgados - totalRecibidos, 'MXN') + '</td></tr></tfoot></table>';

  openModal('Desglose: Prestamos', html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function mostrarDesgloseGastos() {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  /* Always current month */
  var now = new Date();
  var fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  var fechaFin = now;
  var fi = fechaInicio.getFullYear()+'-'+String(fechaInicio.getMonth()+1).padStart(2,'0')+'-'+String(fechaInicio.getDate()).padStart(2,'0');
  var ff = fechaFin.getFullYear()+'-'+String(fechaFin.getMonth()+1).padStart(2,'0')+'-'+String(fechaFin.getDate()).padStart(2,'0');

  var gastos = movimientos.filter(function(mv) { return mv.tipo==='gasto' && !mv.transferencia_id && mv.fecha>=fi && mv.fecha<=ff; });
  gastos.sort(function(a,b) { return (b.fecha||'').localeCompare(a.fecha||''); });
  var total = 0;
  var rows = gastos.slice(0,20).map(function(mv) {
    var cta = cuentaMap[mv.cuenta_id];
    var mon = mv.moneda || (cta ? cta.moneda : 'MXN');
    var valMXN = toMXN(mv.monto, mon, tiposCambio);
    total += valMXN;
    return '<tr><td style="white-space:nowrap;">' + formatDate(mv.fecha) + '</td><td>' + (mv.descripcion||'') + '</td><td style="text-align:right;color:var(--accent-red);font-weight:600;">' + formatCurrencyInt(mv.monto, mon) + '</td></tr>';
  }).join('');

  var html = '<table class="data-table sortable-table"><thead><tr><th>Fecha</th><th>Descripcion</th><th style="text-align:right;">Monto</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    (gastos.length > 20 ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">Mostrando 20 de ' + gastos.length + ' gastos</div>' : '');

  openModal('Desglose: Gastos del Periodo', html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function mostrarDesgloseBalance() {
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  /* Always current month */
  var now = new Date();
  var fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  var fechaFin = now;
  var fi = fechaInicio.getFullYear()+'-'+String(fechaInicio.getMonth()+1).padStart(2,'0')+'-'+String(fechaInicio.getDate()).padStart(2,'0');
  var ff = fechaFin.getFullYear()+'-'+String(fechaFin.getMonth()+1).padStart(2,'0')+'-'+String(fechaFin.getDate()).padStart(2,'0');

  var periodosList = [];
  var tmp = new Date(fechaInicio);
  while(tmp <= fechaFin) { periodosList.push(tmp.getFullYear()+'-'+String(tmp.getMonth()+1).padStart(2,'0')); tmp.setMonth(tmp.getMonth()+1); }

  var rendPeriodo = rendimientos.filter(function(r) { return periodosList.includes(r.periodo); }).reduce(function(s,r) { var ct = cuentaMap[r.cuenta_id]; return s + toMXN(_rendReal(r), ct ? ct.moneda : 'MXN', tiposCambio); }, 0);
  var movsFilt = movimientos.filter(function(mv) { return mv.fecha>=fi && mv.fecha<=ff; });
  var ingresos = movsFilt.filter(function(mv) { return mv.tipo==='ingreso' && !mv.transferencia_id; }).reduce(function(s,mv) { var m=mv.moneda||(cuentaMap[mv.cuenta_id]?cuentaMap[mv.cuenta_id].moneda:'MXN'); return s+toMXN(mv.monto,m,tiposCambio); }, 0);
  var gastos = movsFilt.filter(function(mv) { return mv.tipo==='gasto' && !mv.transferencia_id; }).reduce(function(s,mv) { var m=mv.moneda||(cuentaMap[mv.cuenta_id]?cuentaMap[mv.cuenta_id].moneda:'MXN'); return s+toMXN(mv.monto,m,tiposCambio); }, 0);
  var balance = rendPeriodo + ingresos - gastos;

  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
    '<div style="background:var(--bg-base);border-radius:8px;padding:14px;text-align:center;"><div style="font-size:13px;color:var(--text-primary);text-transform:uppercase;margin-bottom:4px;">Rendimientos</div><div style="font-size:20px;font-weight:800;color:var(--accent-green);">+' + formatCurrencyInt(rendPeriodo, 'MXN') + '</div></div>' +
    '<div style="background:var(--bg-base);border-radius:8px;padding:14px;text-align:center;"><div style="font-size:13px;color:var(--text-primary);text-transform:uppercase;margin-bottom:4px;">Ingresos</div><div style="font-size:20px;font-weight:800;color:var(--accent-green);">+' + formatCurrencyInt(ingresos, 'MXN') + '</div></div>' +
    '<div style="background:var(--bg-base);border-radius:8px;padding:14px;text-align:center;"><div style="font-size:13px;color:var(--text-primary);text-transform:uppercase;margin-bottom:4px;">Gastos</div><div style="font-size:20px;font-weight:800;color:var(--accent-red);">-' + formatCurrencyInt(gastos, 'MXN') + '</div></div>' +
    '<div style="background:var(--bg-base);border-radius:8px;padding:14px;text-align:center;"><div style="font-size:13px;color:var(--text-primary);text-transform:uppercase;margin-bottom:4px;">Balance Neto</div><div style="font-size:20px;font-weight:800;color:' + (balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrencyInt(balance, 'MXN') + '</div></div>' +
  '</div>' +
  '<div style="font-size:14px;color:var(--text-primary);"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Balance = Rendimientos + Ingresos - Gastos</div>';

  openModal('Desglose: Balance Neto', html);
}

/* ============================================================
   CHART CLICK DESGLOSE HELPERS
   ============================================================ */
function _mostrarDesglosePatrimonioPeriodo(periodo, label) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];

  // Detect if this is the current month
  var now = new Date();
  var periodoActual = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var esMesActual = (periodo === periodoActual);

  var html = '';
  var totalCuentas = 0, totalPropiedades = 0, totalOtorgados = 0, totalDeuda = 0;

  // -- Cuentas --
  html += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:var(--accent-blue);margin-bottom:8px;"><i class="fas fa-wallet" style="margin-right:6px;"></i>Cuentas</div>';
  html += '<table class="data-table sortable-table"><thead><tr><th>Cuenta</th><th>Tipo</th><th>Moneda</th><th style="text-align:right;">Saldo</th><th style="text-align:right;">T/C</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
  cuentas.filter(function(c) { return c.activa !== false; }).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); }).forEach(function(c) {
    var moneda = c.moneda || 'MXN';
    var sFinal, valMXN, tc;

    if (esMesActual) {
      // For current month: use live saldo (same as calcPatrimonioTotal / header desglose)
      sFinal = _calcSaldoReal(c);
      tc = getTipoCambio(moneda);
      valMXN = toMXN(sFinal, moneda, tiposCambio);
    } else {
      // For historical months: use carry-forward from cierres
      var hist = (c.historial_saldos || []).map(function(h) {
        var p = h.periodo || (h.fecha ? h.fecha.substring(0, 7) : '');
        return { saldo_final: h.saldo_final, saldo: h.saldo, _periodo: p };
      }).sort(function(a, b) { return (a._periodo || '').localeCompare(b._periodo || ''); });
      var lastCierre = null;
      for (var j = hist.length - 1; j >= 0; j--) { if (hist[j]._periodo <= periodo) { lastCierre = hist[j]; break; } }
      if (!lastCierre) return; // skip account if no historical data
      sFinal = lastCierre.saldo_final != null ? lastCierre.saldo_final : lastCierre.saldo;
      tc = getTipoCambio(moneda, periodo);
      valMXN = toMXN(sFinal, moneda, tiposCambio, periodo);
    }

    totalCuentas += valMXN;
    var tcCell = moneda !== 'MXN' ? '$' + tc.toFixed(4) : '—';
    html += '<tr><td style="font-weight:600;">' + c.nombre + '</td><td><span class="badge badge-blue" style="font-size:12px;">' + c.tipo + '</span></td><td><span class="badge ' + monedaBadgeClass(moneda) + '" style="font-size:12px;">' + moneda + '</span></td><td style="text-align:right;">' + formatCurrencyInt(sFinal, moneda) + '</td><td style="text-align:right;color:var(--text-primary);font-size:12px;font-weight:600;">' + tcCell + '</td><td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
  });
  html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="5">Subtotal Cuentas</td><td style="text-align:right;color:var(--accent-blue);">' + formatCurrencyInt(totalCuentas, 'MXN') + '</td></tr></tfoot></table></div>';

  // -- Propiedades --
  if (propiedades.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:var(--accent-green);margin-bottom:8px;"><i class="fas fa-building" style="margin-right:6px;"></i>Propiedades</div>';
    html += '<table class="data-table sortable-table"><thead><tr><th>Propiedad</th><th>Tipo</th><th style="text-align:right;">Valor</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    propiedades.slice().sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); }).forEach(function(pr) {
      var valMXN = toMXN(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN', tiposCambio, periodo);
      totalPropiedades += valMXN;
      html += '<tr><td style="font-weight:600;">' + pr.nombre + '</td><td><span class="badge badge-amber" style="font-size:12px;">' + (pr.tipo === 'preventa' ? 'Preventa' : 'Terminada') + '</span></td><td style="text-align:right;">' + formatCurrencyInt(pr.valor_actual || pr.valor_compra, pr.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Subtotal Propiedades</td><td style="text-align:right;color:var(--accent-green);">' + formatCurrencyInt(totalPropiedades, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // -- Prestamos otorgados --
  var otorgados = prestamos.filter(function(p) { return p.tipo === 'otorgado' && p.estado !== 'pagado'; }).sort(function(a, b) { return (a.persona || '').localeCompare(b.persona || ''); });
  if (otorgados.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:var(--accent-amber);margin-bottom:8px;"><i class="fas fa-hand-holding-usd" style="margin-right:6px;"></i>Prestamos Otorgados</div>';
    html += '<table class="data-table sortable-table"><thead><tr><th>Persona</th><th style="text-align:right;">Saldo Pendiente</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    otorgados.forEach(function(p) {
      var valMXN = toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio, periodo);
      totalOtorgados += valMXN;
      html += '<tr><td style="font-weight:600;">' + p.persona + '</td><td style="text-align:right;">' + formatCurrencyInt(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;">' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="2">Subtotal Otorgados</td><td style="text-align:right;color:var(--accent-amber);">' + formatCurrencyInt(totalOtorgados, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // -- Deuda (prestamos recibidos + preventa) --
  var recibidos = prestamos.filter(function(p) { return p.tipo === 'recibido' && p.estado !== 'pagado'; }).sort(function(a, b) { return (a.persona || '').localeCompare(b.persona || ''); });
  var preventas = propiedades.filter(function(pr) { return pr.tipo === 'preventa'; });
  if (recibidos.length > 0 || preventas.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:var(--accent-red);margin-bottom:8px;"><i class="fas fa-file-invoice-dollar" style="margin-right:6px;"></i>Deuda</div>';
    html += '<table class="data-table sortable-table"><thead><tr><th>Concepto</th><th style="text-align:right;">Monto</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    recibidos.forEach(function(p) {
      var valMXN = toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio, periodo);
      totalDeuda += valMXN;
      html += '<tr><td style="font-weight:600;">' + p.persona + '</td><td style="text-align:right;">' + formatCurrencyInt(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
    });
    preventas.forEach(function(pr) {
      var enganche = pr.enganche || 0;
      var pagado = enganche + ((pr.mensualidades_pagadas || 0) * (pr.monto_mensualidad || 0));
      var pendiente = Math.max(0, (pr.valor_compra || 0) - pagado);
      var valMXN = toMXN(pendiente, pr.moneda || 'MXN', tiposCambio, periodo);
      totalDeuda += valMXN;
      html += '<tr><td style="font-weight:600;">' + pr.nombre + ' (preventa)</td><td style="text-align:right;">' + formatCurrencyInt(pendiente, pr.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="2">Subtotal Deuda</td><td style="text-align:right;color:var(--accent-red);">-' + formatCurrencyInt(totalDeuda, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // -- Total Patrimonio Neto --
  var patrimonioNeto = totalCuentas + totalPropiedades + totalOtorgados - totalDeuda;
  html += '<div style="padding:16px;border-radius:10px;background:var(--bg-base);margin-top:16px;">' +
    '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;font-size:14px;">' +
    '<div style="color:var(--text-primary);">Cuentas</div><div style="text-align:right;font-weight:600;">' + formatCurrencyInt(totalCuentas, 'MXN') + '</div>' +
    (totalPropiedades > 0 ? '<div style="color:var(--text-primary);">+ Propiedades</div><div style="text-align:right;font-weight:600;">' + formatCurrencyInt(totalPropiedades, 'MXN') + '</div>' : '') +
    (totalOtorgados > 0 ? '<div style="color:var(--text-primary);">+ Prestamos otorgados</div><div style="text-align:right;font-weight:600;">' + formatCurrencyInt(totalOtorgados, 'MXN') + '</div>' : '') +
    (totalDeuda > 0 ? '<div style="color:var(--text-primary);">- Deuda</div><div style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrencyInt(totalDeuda, 'MXN') + '</div>' : '') +
    '</div>' +
    '<div style="border-top:2px solid var(--border-color);margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;font-size:20px;font-weight:800;">' +
    '<span>Patrimonio Neto</span><span style="color:var(--accent-blue);">' + formatCurrencyInt(patrimonioNeto, 'MXN') + '</span>' +
    '</div></div>';

  openModal('Desglose Patrimonio: ' + label, html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function _mostrarDesgloseRendGastoPeriodo(periodo, label) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  // Rendimientos for this period
  var rendFiltered = rendimientos.filter(function(r) { return r.periodo === periodo; });
  var rendRows = [];
  var rendTotal = 0;
  rendFiltered.sort(function(a, b) { var na = cuentaMap[a.cuenta_id] ? cuentaMap[a.cuenta_id].nombre : ''; var nb = cuentaMap[b.cuenta_id] ? cuentaMap[b.cuenta_id].nombre : ''; return na.localeCompare(nb); }).forEach(function(r) {
    var cta = cuentaMap[r.cuenta_id];
    var nombre = cta ? cta.nombre : 'Desconocida';
    var moneda = cta ? cta.moneda : 'MXN';
    var montoReal = _rendReal(r);
    var valMXN = toMXN(montoReal, moneda, tiposCambio, periodo);
    rendTotal += valMXN;
    var color = valMXN >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var tc = moneda !== 'MXN' ? getTipoCambio(moneda, periodo) : null;
    var tcDisplay = tc ? tc.toFixed(2) : '\u2014';
    rendRows.push('<tr><td style="font-weight:600;">' + nombre + '</td><td style="text-align:right;font-weight:600;color:' + color + ';">' + formatCurrencyInt(montoReal, moneda) + '</td><td style="text-align:center;color:var(--text-primary);font-size:10px;font-weight:600;">' + tcDisplay + '</td><td style="text-align:right;font-weight:600;color:' + color + ';">' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>');
  });

  // Gastos for this period
  var gastosFiltered = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && !mv.transferencia_id && mv.fecha && mv.fecha.startsWith(periodo); });
  gastosFiltered.sort(function(a, b) { return (a.descripcion || '').localeCompare(b.descripcion || ''); });
  var gastosRows = [];
  var gastosTotal = 0;
  gastosFiltered.forEach(function(mv) {
    var cta = cuentaMap[mv.cuenta_id];
    var mon = mv.moneda || (cta ? cta.moneda : 'MXN');
    var valMXN = toMXN(mv.monto, mon, tiposCambio);
    gastosTotal += valMXN;
    gastosRows.push('<tr><td style="white-space:nowrap;">' + formatDate(mv.fecha) + '</td><td>' + (mv.descripcion || '') + '</td><td style="text-align:right;color:var(--accent-red);font-weight:600;">' + formatCurrencyInt(mv.monto, mon) + '</td></tr>');
  });

  var html = '';
  html += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:var(--accent-green);margin-bottom:8px;"><i class="fas fa-chart-line" style="margin-right:6px;"></i>Rendimientos: <span style="font-size:17px;">' + formatCurrencyInt(rendTotal, 'MXN') + '</span></div>';
  if (rendRows.length > 0) {
    html += '<table class="data-table sortable-table"><thead><tr><th>Cuenta</th><th style="text-align:right;">Monto Original</th><th style="text-align:center;">T/C</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>' + rendRows.join('') + '</tbody></table>';
  } else {
    html += '<div style="font-size:12px;color:var(--text-muted);padding:8px;">Sin rendimientos en este periodo</div>';
  }
  html += '</div>';

  html += '<div><div style="font-size:14px;font-weight:700;color:var(--accent-red);margin-bottom:8px;"><i class="fas fa-receipt" style="margin-right:6px;"></i>Gastos: <span style="font-size:17px;">' + formatCurrencyInt(gastosTotal, 'MXN') + '</span></div>';
  if (gastosRows.length > 0) {
    html += '<table class="data-table sortable-table"><thead><tr><th>Fecha</th><th>Descripcion</th><th style="text-align:right;">Monto</th></tr></thead><tbody>' + gastosRows.join('') + '</tbody></table>';
  } else {
    html += '<div style="font-size:12px;color:var(--text-muted);padding:8px;">Sin gastos en este periodo</div>';
  }
  html += '</div>';

  openModal('Desglose: ' + label, html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

function _mostrarDesgloseRendPeriodo(periodo, label) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var rendFiltered = rendimientos.filter(function(r) { return r.periodo === periodo; });
  rendFiltered.sort(function(a, b) { var na = cuentaMap[a.cuenta_id] ? cuentaMap[a.cuenta_id].nombre : ''; var nb = cuentaMap[b.cuenta_id] ? cuentaMap[b.cuenta_id].nombre : ''; return na.localeCompare(nb); });
  var total = 0;
  var rows = rendFiltered.map(function(r) {
    var cta = cuentaMap[r.cuenta_id];
    var nombre = cta ? cta.nombre : 'Desconocida';
    var moneda = cta ? cta.moneda : 'MXN';
    var montoReal = _rendReal(r);
    var valMXN = toMXN(montoReal, moneda, tiposCambio, periodo);
    total += valMXN;
    var color = valMXN >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    var tc = moneda !== 'MXN' ? getTipoCambio(moneda, periodo) : null;
    var tcDisplay = tc ? tc.toFixed(2) : '\u2014';
    return '<tr><td style="font-weight:600;">' + nombre + '</td><td style="text-align:right;font-weight:600;color:' + color + ';">' + formatCurrencyInt(montoReal, moneda) + '</td><td style="text-align:center;color:var(--text-primary);font-size:10px;font-weight:600;">' + tcDisplay + '</td><td style="text-align:right;font-weight:600;color:' + color + ';">' + formatCurrencyInt(valMXN, 'MXN') + '</td></tr>';
  }).join('');

  var totalColor = total >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  var html = '<table class="data-table sortable-table"><thead><tr><th>Cuenta</th><th style="text-align:right;">Monto Original</th><th style="text-align:center;">T/C</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td>Total</td><td></td><td></td><td style="text-align:right;color:' + totalColor + ';">' + formatCurrencyInt(total, 'MXN') + '</td></tr></tfoot></table>';

  if (rendFiltered.length === 0) {
    html = '<div style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-info-circle" style="font-size:20px;margin-bottom:8px;display:block;"></i>No hay rendimientos registrados para este periodo.</div>';
  }

  openModal('Rendimientos: ' + label, html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}
