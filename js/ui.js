/* ============================================================
   NAVIGATION
   ============================================================ */
let currentModule = 'dashboard';

const moduleTitles = {
  dashboard:      'Dashboard',
  cuentas:        'Cuentas',
  movimientos:    'Movimientos',
  rendimientos:   'Rendimientos',
  gastos:         'Gastos',
  transferencias: 'Transferencias',
  prestamos:      'Prestamos',
  propiedades:    'Propiedades',
  metas:          'Metas Financieras',
  simulador:      'Simulador de Inversiones',
  configuracion:  'Configuracion',
  ingresos_futuros: 'Ingresos Futuros',
};

function navigateTo(moduleId) {
  // Transferencias ahora vive dentro de Movimientos
  if (moduleId === 'transferencias') moduleId = 'movimientos';
  // Hide all modules
  document.querySelectorAll('.module-section').forEach(el => el.classList.remove('active'));
  // Show target
  const target = document.getElementById('module-' + moduleId);
  if (target) target.classList.add('active');

  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-module="${moduleId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update header title
  currentModule = moduleId;
  document.getElementById('headerTitle').textContent = moduleTitles[moduleId] || moduleId;

  // Call module render
  const renderFns = {
    dashboard:      renderDashboard,
    cuentas:        renderCuentas,
    movimientos:    renderMovimientos,
    rendimientos:   renderRendimientos,
    gastos:         renderGastos,
    transferencias: renderTransferencias,
    prestamos:      typeof renderPrestamos === 'function' ? renderPrestamos : function(){},
    propiedades:    typeof renderPropiedades === 'function' ? renderPropiedades : function(){},
    metas:          typeof renderMetas === 'function' ? renderMetas : function(){},
    simulador:      renderSimulador,
    configuracion:  renderConfiguracion,
    ingresos_futuros: typeof renderIngresosFuturos === 'function' ? renderIngresosFuturos : function(){},
  };
  if (renderFns[moduleId]) renderFns[moduleId]();

  // Auto-color negative numbers in rendered content
  setTimeout(function() {
    if (typeof _autoColorNegativeNumbers === 'function') {
      var target = document.getElementById('module-' + moduleId);
      _autoColorNegativeNumbers(target);
    }
  }, 50);

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const icons = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    info:    'fa-info-circle',
    warning: 'fa-exclamation-triangle',
  };

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3200);
}

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  // Reset modal width class before opening
  var mc = document.getElementById('modalContent');
  if (mc) mc.classList.remove('modal-wide');
  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal(event) {
  // If called from overlay click, only close if click was on overlay itself
  if (event && event.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('show');
}

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

/* ============================================================
   UPDATE HEADER PATRIMONIO
   ============================================================ */
function calcPatrimonioTotal() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  let totalCuentas = 0;
  let totalPropiedades = 0;
  let totalPrestamosOtorgados = 0;
  let totalPrestamosRecibidos = 0;
  let totalDeudaPreventa = 0;

  cuentas.forEach(c => {
    if (c.activa !== false) {
      totalCuentas += toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    }
  });
  propiedades.forEach(p => {
    totalPropiedades += toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio);
    // Deuda de preventa pendiente
    if (p.tipo === 'preventa' && (p.mensualidades_total - p.mensualidades_pagadas) > 0) {
      var enganche = p.enganche || 0;
      var pagado = enganche + (p.mensualidades_pagadas * p.monto_mensualidad);
      var pendiente = Math.max(0, p.valor_compra - pagado);
      totalDeudaPreventa += toMXN(pendiente, p.moneda || 'MXN', tiposCambio);
    }
  });
  prestamos.forEach(p => {
    if (p.estado === 'pagado') return;
    if (p.tipo === 'otorgado') {
      totalPrestamosOtorgados += toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
    } else if (p.tipo === 'recibido') {
      totalPrestamosRecibidos += toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
    }
  });

  var totalDeuda = totalPrestamosRecibidos + totalDeudaPreventa;
  var total = totalCuentas + totalPropiedades + totalPrestamosOtorgados - totalDeuda;
  return {
    total: total,
    cuentas: totalCuentas,
    propiedades: totalPropiedades,
    prestamosOtorgados: totalPrestamosOtorgados,
    prestamosRecibidos: totalPrestamosRecibidos,
    deudaPreventa: totalDeudaPreventa,
    totalDeuda: totalDeuda
  };
}

function updateHeaderPatrimonio() {
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var pat = calcPatrimonioTotal();
  document.getElementById('headerPatrimonio').textContent = formatCurrency(pat.total, 'MXN');

  // Show current exchange rate in header
  const tcEl = document.getElementById('headerTipoCambio');
  if (tcEl) {
    const usdMxn = tiposCambio.USD_MXN || 17.50;
    tcEl.textContent = 'US$1 = $' + Number(usdMxn).toFixed(2);
  }
}

function mostrarDesglosePatrimonio() {
  var pat = calcPatrimonioTotal();
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  var html = '';

  // Cuentas breakdown
  html += '<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:700;color:var(--accent-blue);margin-bottom:8px;"><i class="fas fa-wallet" style="margin-right:6px;"></i>Cuentas</div>';
  html += '<table class="data-table sortable-table" style=""><thead><tr><th>Cuenta</th><th>Tipo</th><th style="text-align:right;">Saldo</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
  cuentas.filter(function(c) { return c.activa !== false; }).forEach(function(c) {
    var saldoReal = _calcSaldoReal(c);
    var valMXN = toMXN(saldoReal, c.moneda, tiposCambio);
    html += '<tr><td style="font-weight:600;">' + c.nombre + '</td><td><span class="badge badge-blue" style="font-size:10px;">' + c.tipo + '</span></td><td style="text-align:right;">' + formatCurrency(saldoReal, c.moneda) + '</td><td style="text-align:right;font-weight:600;">' + formatCurrency(valMXN, 'MXN') + '</td></tr>';
  });
  html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Subtotal Cuentas</td><td style="text-align:right;color:var(--accent-blue);">' + formatCurrency(pat.cuentas, 'MXN') + '</td></tr></tfoot></table></div>';

  // Propiedades breakdown
  if (propiedades.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:700;color:var(--accent-green);margin-bottom:8px;"><i class="fas fa-building" style="margin-right:6px;"></i>Propiedades</div>';
    html += '<table class="data-table sortable-table" style=""><thead><tr><th>Propiedad</th><th>Tipo</th><th style="text-align:right;">Valor Actual</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    propiedades.forEach(function(p) {
      var valMXN = toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio);
      var tipoBadge = p.tipo === 'preventa' ? 'badge-amber' : 'badge-purple';
      html += '<tr><td style="font-weight:600;">' + p.nombre + '</td><td><span class="badge ' + tipoBadge + '" style="font-size:10px;">' + (p.tipo === 'preventa' ? 'Preventa' : 'Terminada') + '</span></td><td style="text-align:right;">' + formatCurrency(p.valor_actual || 0, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;">' + formatCurrency(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Subtotal Propiedades</td><td style="text-align:right;color:var(--accent-green);">' + formatCurrency(pat.propiedades, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // Prestamos otorgados (activos)
  var otorgados = prestamos.filter(function(p) { return p.tipo === 'otorgado' && p.estado !== 'pagado'; });
  if (otorgados.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:700;color:var(--accent-amber);margin-bottom:8px;"><i class="fas fa-hand-holding-usd" style="margin-right:6px;"></i>Prestamos Otorgados (a favor)</div>';
    html += '<table class="data-table sortable-table" style=""><thead><tr><th>Persona</th><th style="text-align:right;">Saldo Pendiente</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    otorgados.forEach(function(p) {
      var valMXN = toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
      html += '<tr><td style="font-weight:600;">' + p.persona + '</td><td style="text-align:right;">' + formatCurrency(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;">' + formatCurrency(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="2">Subtotal Otorgados</td><td style="text-align:right;color:var(--accent-amber);">' + formatCurrency(pat.prestamosOtorgados, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // Prestamos recibidos (deuda)
  var recibidos = prestamos.filter(function(p) { return p.tipo === 'recibido' && p.estado !== 'pagado'; });
  if (recibidos.length > 0) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:700;color:var(--accent-red);margin-bottom:8px;"><i class="fas fa-file-invoice-dollar" style="margin-right:6px;"></i>Prestamos Recibidos (deuda)</div>';
    html += '<table class="data-table sortable-table" style=""><thead><tr><th>Persona</th><th style="text-align:right;">Saldo Pendiente</th><th style="text-align:right;">Valor MXN</th></tr></thead><tbody>';
    recibidos.forEach(function(p) {
      var valMXN = toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
      html += '<tr><td style="font-weight:600;">' + p.persona + '</td><td style="text-align:right;">' + formatCurrency(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrency(valMXN, 'MXN') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="2">Subtotal Deuda</td><td style="text-align:right;color:var(--accent-red);">-' + formatCurrency(pat.prestamosRecibidos, 'MXN') + '</td></tr></tfoot></table></div>';
  }

  // Total
  html += '<div style="padding:16px;border-radius:10px;background:var(--bg-base);margin-top:16px;">';
  html += '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;font-size:13px;">';
  html += '<div style="color:var(--text-muted);">Cuentas</div><div style="text-align:right;font-weight:600;">' + formatCurrency(pat.cuentas, 'MXN') + '</div>';
  if (pat.propiedades > 0) html += '<div style="color:var(--text-muted);">+ Propiedades</div><div style="text-align:right;font-weight:600;">' + formatCurrency(pat.propiedades, 'MXN') + '</div>';
  if (pat.prestamosOtorgados > 0) html += '<div style="color:var(--text-muted);">+ Prestamos otorgados</div><div style="text-align:right;font-weight:600;">' + formatCurrency(pat.prestamosOtorgados, 'MXN') + '</div>';
  if (pat.prestamosRecibidos > 0) html += '<div style="color:var(--text-muted);">- Prestamos recibidos</div><div style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrency(pat.prestamosRecibidos, 'MXN') + '</div>';
  if (pat.deudaPreventa > 0) html += '<div style="color:var(--text-muted);">- Deuda preventa</div><div style="text-align:right;font-weight:600;color:var(--accent-red);">-' + formatCurrency(pat.deudaPreventa, 'MXN') + '</div>';
  html += '</div>';
  html += '<div style="border-top:2px solid var(--border-color);margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;font-size:18px;font-weight:800;">';
  html += '<span>Patrimonio Neto</span><span style="color:var(--accent-blue);">' + formatCurrency(pat.total, 'MXN') + '</span>';
  html += '</div></div>';

  openModal('Desglose del Patrimonio Total', html);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 50);
}

/* ============================================================
   HISTORIAL DE TIPO DE CAMBIO
   ============================================================ */
function mostrarHistorialTipoCambio() {
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var config = loadData(STORAGE_KEYS.config) || {};
  var usdMxn = tiposCambio.USD_MXN || 17.50;
  var eurMxn = tiposCambio.EUR_MXN || 19.20;
  var ultimaAct = config.ultima_actualizacion_tc ? formatTCTimestamp(config.ultima_actualizacion_tc) : 'Nunca';

  var html = '';
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
  html += '<div style="background:var(--bg-base);border-radius:10px;padding:16px;text-align:center;border:1px solid var(--border-color);">';
  html += '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">USD / MXN</div>';
  html += '<div style="font-size:24px;font-weight:800;color:var(--accent-blue);">$' + Number(usdMxn).toFixed(4) + '</div>';
  html += '</div>';
  html += '<div style="background:var(--bg-base);border-radius:10px;padding:16px;text-align:center;border:1px solid var(--border-color);">';
  html += '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">EUR / MXN</div>';
  html += '<div style="font-size:24px;font-weight:800;color:var(--accent-green);">$' + Number(eurMxn).toFixed(4) + '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);text-align:center;"><i class="fas fa-clock" style="margin-right:4px;"></i>Ultima actualizacion: ' + ultimaAct + '</div>';
  html += '</div>';

  // Fetch historical rates
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px;"><i class="fas fa-chart-line" style="margin-right:6px;color:var(--accent-amber);"></i>Consultar Historico</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
  html += '<select id="tcHistAnio" class="form-select" style="padding:5px 8px;font-size:12px;width:100px;">';
  var curYear = new Date().getFullYear();
  for (var y = curYear; y >= curYear - 5; y--) {
    html += '<option value="' + y + '">' + y + '</option>';
  }
  html += '</select>';
  html += '<select id="tcHistMes" class="form-select" style="padding:5px 8px;font-size:12px;width:120px;">';
  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  for (var m = 0; m < 12; m++) {
    html += '<option value="' + m + '" ' + (m === new Date().getMonth() ? 'selected' : '') + '>' + meses[m] + '</option>';
  }
  html += '</select>';
  html += '<button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="consultarTCHistorico()">';
  html += '<i class="fas fa-search" style="margin-right:4px;"></i>Consultar</button>';
  html += '</div>';
  html += '<div id="tcHistResult" style="margin-top:12px;"></div>';
  html += '</div>';

  // Manual update
  html += '<div style="border-top:1px solid var(--border-color);padding-top:16px;">';
  html += '<button class="btn btn-secondary" style="font-size:12px;" onclick="actualizarTiposCambio();closeModal();">';
  html += '<i class="fas fa-globe" style="margin-right:6px;"></i>Actualizar desde Internet</button>';
  html += '</div>';

  openModal('Tipo de Cambio', html);
}

function consultarTCHistorico() {
  var anio = parseInt(document.getElementById('tcHistAnio').value);
  var mes = parseInt(document.getElementById('tcHistMes').value);
  var resultEl = document.getElementById('tcHistResult');
  if (!resultEl) return;

  // Use the last day of selected month
  var fecha = new Date(anio, mes + 1, 0); // last day of month
  var hoy = new Date();
  if (fecha > hoy) fecha = hoy;
  var dateStr = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');

  resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Consultando tipo de cambio para ' + dateStr + '...</div>';

  fetch('https://open.er-api.com/v6/latest/MXN')
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data.result !== 'success' || !data.rates) throw new Error('No data');
      var usd = data.rates.USD ? (1 / data.rates.USD).toFixed(4) : 'N/A';
      var eur = data.rates.EUR ? (1 / data.rates.EUR).toFixed(4) : 'N/A';
      var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      resultEl.innerHTML = '<div class="card" style="padding:12px 16px;margin-top:8px;">' +
        '<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">' + meses[mes] + ' ' + anio + '</div>' +
        '<table class="data-table" style="font-size:12px;"><thead><tr><th>Par</th><th style="text-align:right;">Tasa</th></tr></thead><tbody>' +
        '<tr><td style="font-weight:600;">USD / MXN</td><td style="text-align:right;font-weight:700;color:var(--accent-blue);">$' + usd + '</td></tr>' +
        '<tr><td style="font-weight:600;">EUR / MXN</td><td style="text-align:right;font-weight:700;color:var(--accent-green);">$' + eur + '</td></tr>' +
        '</tbody></table>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:6px;"><i class="fas fa-info-circle" style="margin-right:3px;"></i>La API gratuita solo provee tasas actuales. Para historicos exactos considera una fuente como Banxico.</div>' +
        '</div>';
    })
    .catch(function() {
      resultEl.innerHTML = '<div style="color:var(--accent-red);font-size:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>No se pudo obtener la informacion. Verifica tu conexion a internet.</div>';
    });
}

/* ============================================================
   UPDATE HEADER DATE
   ============================================================ */
function updateHeaderDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('es-MX', options);
  // Capitalize first letter
  document.getElementById('headerDate').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}
