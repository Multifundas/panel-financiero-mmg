function renderMovimientos() {
  const el = document.getElementById('module-movimientos');

  // -- Load data --
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // -- Lookup maps --
  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });
  const catMap = {};
  categorias.forEach(cat => { catMap[cat.id] = cat.nombre; });

  // -- Summary totals (all movimientos, converted to MXN, excluding transfers) --
  let totalIngresos = 0;
  let totalGastos = 0;
  let totalRendimientos = 0;
  movimientos.forEach(m => {
    if (m.transferencia_id) return; // Exclude transfers from totals
    const cuenta = cuentaMap[m.cuenta_id];
    const moneda = cuenta ? cuenta.moneda : 'MXN';
    const montoMXN = toMXN(m.monto, moneda, tiposCambio);
    if (m.tipo === 'ingreso') totalIngresos += montoMXN;
    else if (m.tipo === 'gasto') totalGastos += montoMXN;
  });
  // Calculate rendimientos from cierres mensuales
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  rendimientos.forEach(r => {
    const rc = cuentaMap[r.cuenta_id];
    totalRendimientos += toMXN(r.rendimiento_monto || 0, rc ? rc.moneda : 'MXN', tiposCambio);
  });
  const balance = totalIngresos + totalRendimientos - totalGastos;

  // -- Cuenta options for filter --
  const cuentasActivas = cuentas.filter(c => c.activa !== false);
  const cuentaFilterOpts = cuentasActivas
    .map(c => `<option value="${c.id}">${c.nombre}</option>`)
    .join('');

  // -- Determine available years from movimientos --
  var movYears = {};
  movimientos.forEach(function(m) { if (m.fecha) movYears[m.fecha.substring(0, 4)] = true; });
  var yearOpts = Object.keys(movYears).sort().reverse().map(function(y) {
    return '<option value="' + y + '">' + y + '</option>';
  }).join('');

  // -- Render HTML --
  el.innerHTML = `
    <!-- Filtros rapidos + KPI Cards en misma fila -->
    <div style="display:flex;align-items:stretch;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <!-- Filtros rapidos a la izquierda -->
      <div class="card" style="padding:8px 12px;display:flex;align-items:center;gap:6px;min-width:auto;margin-bottom:0;">
        <span style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;white-space:nowrap;"><i class="fas fa-filter" style="margin-right:3px;"></i></span>
        <select id="movFiltroPeriodo" class="form-select" style="padding:3px 6px;font-size:11px;min-height:auto;width:95px;" onchange="onMovFiltroRapido()">
          <option value="">Todo</option>
          <option value="mensual" selected>Mensual</option>
          <option value="trimestral">Trimestral</option>
          <option value="semestral">Semestral</option>
          <option value="anual">Anual</option>
        </select>
        <select id="movFiltroAnio" class="form-select" style="padding:3px 6px;font-size:11px;min-height:auto;width:70px;" onchange="onMovFiltroRapido()">
          <option value="">Todos</option>
          ${yearOpts}
        </select>
        <select id="movFiltroMoneda" class="form-select" style="padding:3px 6px;font-size:11px;min-height:auto;width:70px;" onchange="onMovFiltroRapido()">
          <option value="">Todas</option>
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <!-- 4 KPI cards -->
      <div class="card" style="flex:1;border-left:3px solid var(--accent-green);padding:12px 16px;cursor:pointer;" onclick="mostrarDesgloseMovimientos('ingreso')">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-arrow-down" style="color:var(--accent-green);font-size:14px;"></i>
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Ingresos</span>
        </div>
        <div id="movSumIngresos" style="font-size:18px;font-weight:800;color:var(--accent-green);margin-top:4px;">${formatCurrency(totalIngresos, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="flex:1;border-left:3px solid var(--accent-amber);padding:12px 16px;cursor:pointer;" onclick="mostrarDesgloseMovimientos('rendimiento')">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-percentage" style="color:var(--accent-amber);font-size:14px;"></i>
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Rendimientos</span>
        </div>
        <div id="movSumRendimientos" style="font-size:18px;font-weight:800;color:var(--accent-amber);margin-top:4px;">${formatCurrency(totalRendimientos, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="flex:1;border-left:3px solid var(--accent-red);padding:12px 16px;cursor:pointer;" onclick="mostrarDesgloseMovimientos('gasto')">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-arrow-up" style="color:var(--accent-red);font-size:14px;"></i>
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Gastos</span>
        </div>
        <div id="movSumGastos" style="font-size:18px;font-weight:800;color:var(--accent-red);margin-top:4px;">${formatCurrency(totalGastos, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="flex:1;border-left:3px solid ${balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-amber)'};padding:12px 16px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-balance-scale" style="color:${balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-amber)'};font-size:14px;"></i>
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Balance</span>
        </div>
        <div id="movSumBalance" style="font-size:18px;font-weight:800;color:${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};margin-top:4px;">${(balance >= 0 ? '+' : '') + formatCurrency(balance, 'MXN')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Ing + Rend - Gastos</div>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="card" style="margin-bottom:12px;padding:10px 16px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <input type="date" id="filterMovDesde" class="form-input" style="padding:5px 8px;font-size:12px;min-height:auto;width:130px;" onchange="filterMovimientos()">
        <input type="date" id="filterMovHasta" class="form-input" style="padding:5px 8px;font-size:12px;min-height:auto;width:130px;" onchange="filterMovimientos()">
        <select id="filterMovTipo" class="form-select" style="padding:5px 8px;font-size:12px;min-height:auto;width:120px;" onchange="filterMovimientos()">
          <option value="">Todos</option>
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <select id="filterMovCuenta" class="form-select" style="padding:5px 8px;font-size:12px;min-height:auto;width:150px;" onchange="filterMovimientos()">
          <option value="">Todas las cuentas</option>
          ${cuentaFilterOpts}
        </select>
        <input type="text" id="filterMovSearch" class="form-input" placeholder="Buscar..." style="padding:5px 8px;font-size:12px;min-height:auto;flex:1;min-width:120px;" oninput="filterMovimientos()">
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="exportarExcel('movimientos')" style="padding:5px 10px;font-size:11px;flex:1;min-width:70px;">
          <i class="fas fa-file-excel" style="margin-right:3px;"></i>Excel
        </button>
        <button class="btn btn-secondary" onclick="exportarMovsPDF()" style="padding:5px 10px;font-size:11px;flex:1;min-width:60px;">
          <i class="fas fa-file-pdf" style="margin-right:3px;color:#ef4444;"></i>PDF
        </button>
        <button class="btn btn-secondary" onclick="openPlantillasRecurrentes()" style="padding:5px 10px;font-size:11px;flex:1;min-width:90px;">
          <i class="fas fa-sync-alt" style="margin-right:3px;"></i>Plantillas
        </button>
        <button class="btn btn-secondary" onclick="openCargaMasiva()" style="padding:5px 10px;font-size:11px;flex:1;min-width:100px;">
          <i class="fas fa-file-excel" style="margin-right:3px;"></i>Carga Masiva
        </button>
        <button class="btn btn-secondary" onclick="openPdfImport()" style="padding:5px 10px;font-size:11px;flex:1;min-width:60px;background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444;">
          <i class="fas fa-file-pdf" style="margin-right:3px;"></i>PDF
        </button>
        <button class="btn btn-secondary" onclick="openTransferenciaModal()" style="padding:5px 10px;font-size:11px;flex:1;min-width:110px;border-color:var(--accent-purple);color:var(--accent-purple);">
          <i class="fas fa-exchange-alt" style="margin-right:3px;"></i>Transferencia
        </button>
        <button class="btn btn-secondary" onclick="cierreMensual()" style="padding:5px 10px;font-size:11px;flex:1;min-width:80px;border-color:var(--accent-green);color:var(--accent-green);">
          <i class="fas fa-calendar-check" style="margin-right:3px;"></i>Cierre
        </button>
        <button class="btn btn-primary" onclick="editMovimiento(null)" style="padding:5px 10px;font-size:11px;flex:1;min-width:80px;">
          <i class="fas fa-plus" style="margin-right:3px;"></i>Nuevo
        </button>
      </div>
    </div>

    <!-- Tabla de Movimientos -->
    <div class="card" style="padding:8px 12px;">
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaMovimientos" style="font-size:12px;">
          <thead>
            <tr>
              <th style="width:30px;" data-no-sort="true"><input type="checkbox" id="selectAllMovs" onchange="toggleAllMovCheckboxes(this)" title="Seleccionar todos"></th>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th>Tipo</th>
              <th>Cuenta</th>
              <th>Categoria</th>
              <th style="text-align:right;">Monto</th>
              <th style="text-align:center;" data-no-sort="true">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyMovimientos">
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Set default quick filter to current month/year
  var nowMov = new Date();
  var elAnio = document.getElementById('movFiltroAnio');
  if (elAnio) elAnio.value = String(nowMov.getFullYear());

  // Apply quick filters then populate table
  onMovFiltroRapido();

  // Enable sortable headers
  setTimeout(function() { _initSortableTables(el); }, 100);
}

/* -- Quick period/year/currency filter for Movimientos KPIs -- */
function onMovFiltroRapido() {
  var periodo = document.getElementById('movFiltroPeriodo') ? document.getElementById('movFiltroPeriodo').value : '';
  var anio = document.getElementById('movFiltroAnio') ? document.getElementById('movFiltroAnio').value : '';
  var moneda = document.getElementById('movFiltroMoneda') ? document.getElementById('movFiltroMoneda').value : '';

  var desdeEl = document.getElementById('filterMovDesde');
  var hastaEl = document.getElementById('filterMovHasta');
  if (!desdeEl || !hastaEl) return;

  // Calculate date range from periodo + anio
  var now = new Date();
  var y = anio ? parseInt(anio) : now.getFullYear();
  var m = now.getMonth(); // 0-indexed
  var desde = '', hasta = '';

  if (periodo === 'mensual') {
    // If selected year is current year, use current month; otherwise use December
    var mes = (y === now.getFullYear()) ? m : 11;
    desde = y + '-' + String(mes + 1).padStart(2, '0') + '-01';
    var lastDay = new Date(y, mes + 1, 0).getDate();
    hasta = y + '-' + String(mes + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
  } else if (periodo === 'trimestral') {
    var qMonth = (y === now.getFullYear()) ? Math.floor(m / 3) * 3 : 9;
    desde = y + '-' + String(qMonth + 1).padStart(2, '0') + '-01';
    var lastDayQ = new Date(y, qMonth + 3, 0).getDate();
    hasta = y + '-' + String(qMonth + 3).padStart(2, '0') + '-' + String(lastDayQ).padStart(2, '0');
  } else if (periodo === 'semestral') {
    var sMonth = (y === now.getFullYear()) ? (m < 6 ? 0 : 6) : 6;
    desde = y + '-' + String(sMonth + 1).padStart(2, '0') + '-01';
    var lastDayS = new Date(y, sMonth + 6, 0).getDate();
    hasta = y + '-' + String(sMonth + 6).padStart(2, '0') + '-' + String(lastDayS).padStart(2, '0');
  } else if (periodo === 'anual') {
    desde = y + '-01-01';
    hasta = y + '-12-31';
  } else {
    // "Todo" — clear date range, optionally still filter by year
    if (anio) {
      desde = y + '-01-01';
      hasta = y + '-12-31';
    } else {
      desde = '';
      hasta = '';
    }
  }

  desdeEl.value = desde;
  hastaEl.value = hasta;

  // Store moneda filter for use in filterMovimientos
  window._movFiltroMoneda = moneda;

  filterMovimientos();
}

/* -- Filter and render the movimientos table rows -- */
function filterMovimientos() {
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });
  const catMap = {};
  categorias.forEach(cat => { catMap[cat.id] = cat.nombre; });

  // Read filter values
  const fDesde = document.getElementById('filterMovDesde') ? document.getElementById('filterMovDesde').value : '';
  const fHasta = document.getElementById('filterMovHasta') ? document.getElementById('filterMovHasta').value : '';
  const fTipo = document.getElementById('filterMovTipo') ? document.getElementById('filterMovTipo').value : '';
  const fCuenta = document.getElementById('filterMovCuenta') ? document.getElementById('filterMovCuenta').value : '';
  const fSearch = document.getElementById('filterMovSearch') ? document.getElementById('filterMovSearch').value.toLowerCase().trim() : '';

  // Read quick filter moneda
  const fMoneda = window._movFiltroMoneda || '';

  // Apply filters
  const filtered = movimientos.filter(m => {
    if (fDesde && m.fecha < fDesde) return false;
    if (fHasta && m.fecha > fHasta) return false;
    if (fTipo) {
      if (fTipo === 'transferencia') { if (!m.transferencia_id) return false; }
      else { if (m.tipo !== fTipo || m.transferencia_id) return false; }
    }
    if (fCuenta && m.cuenta_id !== fCuenta) return false;
    if (fMoneda) {
      const ctaMon = cuentaMap[m.cuenta_id];
      if (ctaMon && ctaMon.moneda !== fMoneda) return false;
    }
    if (fSearch) {
      const desc = (m.descripcion || '').toLowerCase();
      const notas = (m.notas || '').toLowerCase();
      const cuentaNombre = (cuentaMap[m.cuenta_id] ? cuentaMap[m.cuenta_id].nombre : '').toLowerCase();
      const catNombre = (catMap[m.categoria_id] || '').toLowerCase();
      if (!desc.includes(fSearch) && !notas.includes(fSearch) && !cuentaNombre.includes(fSearch) && !catNombre.includes(fSearch)) return false;
    }
    return true;
  });

  // Sort by date descending
  filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Update summary cards with filtered totals (excluding transfers)
  let sumIngresos = 0;
  let sumGastos = 0;
  filtered.forEach(m => {
    if (m.transferencia_id) return; // Exclude transfers from totals
    const cuenta = cuentaMap[m.cuenta_id];
    const moneda = cuenta ? cuenta.moneda : 'MXN';
    const montoMXN = toMXN(m.monto, moneda, tiposCambio);
    if (m.tipo === 'ingreso') sumIngresos += montoMXN;
    else if (m.tipo === 'gasto') sumGastos += montoMXN;
  });
  // Rendimientos from cierres
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  let sumRendimientos = 0;
  rendimientos.forEach(r => {
    const frc = cuentaMap[r.cuenta_id];
    sumRendimientos += toMXN(r.rendimiento_monto || 0, frc ? frc.moneda : 'MXN', tiposCambio);
  });
  const sumBalance = sumIngresos + sumRendimientos - sumGastos;

  const elIngresos = document.getElementById('movSumIngresos');
  const elGastos = document.getElementById('movSumGastos');
  const elRendimientos = document.getElementById('movSumRendimientos');
  const elBalance = document.getElementById('movSumBalance');
  if (elIngresos) elIngresos.textContent = formatCurrency(sumIngresos, 'MXN');
  if (elRendimientos) elRendimientos.textContent = formatCurrency(sumRendimientos, 'MXN');
  if (elGastos) elGastos.textContent = formatCurrency(sumGastos, 'MXN');
  if (elBalance) {
    elBalance.textContent = (sumBalance >= 0 ? '+' : '') + formatCurrency(sumBalance, 'MXN');
    elBalance.style.color = sumBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }

  // Build table rows
  const tbody = document.getElementById('tbodyMovimientos');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          <i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
          No se encontraron movimientos con los filtros aplicados.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const cuenta = cuentaMap[m.cuenta_id];
    const cuentaNombre = cuenta ? cuenta.nombre : 'Desconocida';
    const moneda = cuenta ? cuenta.moneda : 'MXN';
    const catNombre = m.tipo === 'gasto' && m.categoria_id ? (catMap[m.categoria_id] || '\u2014') : '\u2014';

    // Badge for tipo
    const esTransferencia = !!m.transferencia_id;
    const tipoBadgeClass = esTransferencia ? 'badge-purple' : (m.tipo === 'ingreso' ? 'badge-green' : 'badge-red');
    const tipoLabel = esTransferencia ? 'Transferencia' : (m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto');

    // Monto formatting with sign and color
    const signo = m.tipo === 'ingreso' ? '+' : '-';
    const montoColor = esTransferencia ? 'var(--accent-purple)' : (m.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)');

    // Property link badge
    const propBadge = m.propiedad_id ? '<span class="badge badge-amber" style="font-size:9px;margin-left:6px;"><i class="fas fa-building" style="margin-right:2px;"></i>Inmueble</span>' : '';

    return `
      <tr>
        <td><input type="checkbox" class="mov-checkbox" value="${m.id}" onchange="onMovCheckboxChange()"></td>
        <td>${formatDate(m.fecha)}</td>
        <td style="color:var(--text-primary);font-weight:500;">${m.descripcion || '\u2014'}${propBadge}</td>
        <td><span class="badge ${tipoBadgeClass}">${tipoLabel}</span></td>
        <td>${cuentaNombre}</td>
        <td>${catNombre}</td>
        <td style="text-align:right;font-weight:600;color:${montoColor};">${signo}${formatCurrency(m.monto, moneda)}</td>
        <td style="text-align:center;">
          <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;margin-right:4px;" onclick="editMovimiento('${m.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger" style="padding:5px 10px;font-size:11px;" onclick="deleteMovimiento('${m.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

/* -- Open modal to create or edit a movimiento -- */
function editMovimiento(id) {
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];

  // If editing, find existing movimiento
  let mov = null;
  if (id) {
    mov = movimientos.find(m => m.id === id);
  }

  const isEdit = !!mov;
  const titulo = isEdit ? 'Editar Movimiento' : 'Nuevo Movimiento';

  // Build cuenta options (only active)
  const cuentaOpciones = cuentas
    .filter(c => c.activa !== false)
    .map(c => {
      const selected = mov && mov.cuenta_id === c.id ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.nombre} (${c.moneda})</option>`;
    }).join('');

  // Build categoria options
  const catOpciones = categorias.map(cat => {
    const selected = mov && mov.categoria_id === cat.id ? 'selected' : '';
    return `<option value="${cat.id}" ${selected}>${cat.nombre}</option>`;
  }).join('');

  // Default date to today
  const hoy = new Date().toISOString().split('T')[0];
  const tipoActual = isEdit ? mov.tipo : 'gasto';

  // Build propiedad options for linking gastos to properties
  const propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  const propOpciones = propiedades.map(p => {
    const selected = mov && mov.propiedad_id === p.id ? 'selected' : '';
    return `<option value="${p.id}" ${selected}>${p.nombre}</option>`;
  }).join('');

  const formHTML = `
    <form id="formMovimiento" onsubmit="saveMovimiento(event)">
      <input type="hidden" id="movId" value="${isEdit ? mov.id : ''}">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select id="movTipo" class="form-select" required onchange="toggleCategoriaField()">
            <option value="ingreso" ${tipoActual === 'ingreso' ? 'selected' : ''}>Ingreso</option>
            <option value="gasto" ${tipoActual === 'gasto' ? 'selected' : ''}>Gasto</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cuenta *</label>
          <select id="movCuentaId" class="form-select" required>
            <option value="">Seleccionar cuenta...</option>
            ${cuentaOpciones}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Monto *</label>
          <input type="number" id="movMonto" class="form-input" required step="0.01" min="0.01"
                 value="${isEdit ? mov.monto : ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input type="date" id="movFecha" class="form-input" required
                 value="${isEdit ? mov.fecha : hoy}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Descripcion *</label>
        <input type="text" id="movDescripcion" class="form-input" required
               value="${isEdit ? (mov.descripcion || '') : ''}" placeholder="Ej: Pago de nomina">
      </div>

      <div class="form-group" id="movCategoriaGroup" style="display:${tipoActual === 'gasto' ? 'block' : 'none'};">
        <label class="form-label">Categoria</label>
        <select id="movCategoriaId" class="form-select">
          <option value="">Sin categoria</option>
          ${catOpciones}
        </select>
      </div>

      <div class="form-group" id="movPropiedadGroup" style="display:${tipoActual === 'gasto' && propiedades.length > 0 ? 'block' : 'none'};">
        <label class="form-label"><i class="fas fa-building" style="margin-right:4px;color:var(--accent-amber);"></i>Asociar a Propiedad/Activo</label>
        <select id="movPropiedadId" class="form-select">
          <option value="">No asociar</option>
          ${propOpciones}
        </select>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Se registra como pago vinculado al inmueble</div>
      </div>

      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea id="movNotas" class="form-input" rows="3" style="resize:vertical;"
                  placeholder="Notas adicionales...">${isEdit && mov.notas ? mov.notas : ''}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Movimiento'}
        </button>
      </div>
    </form>
  `;

  openModal(titulo, formHTML);

  // Ensure categoria field visibility matches tipo
  toggleCategoriaField();
}

/* -- Toggle categoria field based on tipo -- */
function toggleCategoriaField() {
  const tipoSelect = document.getElementById('movTipo');
  const catGroup = document.getElementById('movCategoriaGroup');
  const propGroup = document.getElementById('movPropiedadGroup');
  if (tipoSelect && catGroup) {
    catGroup.style.display = tipoSelect.value === 'gasto' ? 'block' : 'none';
  }
  if (tipoSelect && propGroup) {
    propGroup.style.display = tipoSelect.value === 'gasto' ? 'block' : 'none';
  }
}

/* -- Save (create or update) a movimiento -- */
function saveMovimiento(event) {
  event.preventDefault();

  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const id = document.getElementById('movId').value;
  const tipo = document.getElementById('movTipo').value;
  const cuenta_id = document.getElementById('movCuentaId').value;
  const monto = parseFloat(document.getElementById('movMonto').value) || 0;
  const fecha = document.getElementById('movFecha').value;
  const descripcion = document.getElementById('movDescripcion').value.trim();
  const categoria_id = tipo === 'gasto' ? (document.getElementById('movCategoriaId').value || null) : null;
  const propiedad_id = tipo === 'gasto' && document.getElementById('movPropiedadId') ? (document.getElementById('movPropiedadId').value || null) : null;
  const notas = document.getElementById('movNotas').value.trim();

  if (!cuenta_id || !descripcion || !fecha || monto <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  // Find the target cuenta
  const cuentaIdx = cuentas.findIndex(c => c.id === cuenta_id);
  if (cuentaIdx === -1) {
    showToast('La cuenta seleccionada no existe.', 'error');
    return;
  }

  // Determine moneda from cuenta
  const moneda = cuentas[cuentaIdx].moneda || 'MXN';

  if (id) {
    // -- UPDATE existing movimiento --
    const movIdx = movimientos.findIndex(m => m.id === id);
    if (movIdx === -1) {
      showToast('No se encontro el movimiento a editar.', 'error');
      return;
    }

    const oldMov = movimientos[movIdx];

    // Reverse old effect on old cuenta (ensure numeric)
    const oldCuentaIdx = cuentas.findIndex(c => c.id === oldMov.cuenta_id);
    if (oldCuentaIdx !== -1) {
      var oldSaldo = parseFloat(cuentas[oldCuentaIdx].saldo) || 0;
      if (oldMov.tipo === 'ingreso') {
        cuentas[oldCuentaIdx].saldo = oldSaldo - oldMov.monto;
      } else {
        cuentas[oldCuentaIdx].saldo = oldSaldo + oldMov.monto;
      }
    }

    // Apply new effect on new cuenta (ensure numeric)
    var newSaldo = parseFloat(cuentas[cuentaIdx].saldo) || 0;
    if (tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo = newSaldo + monto;
    } else {
      cuentas[cuentaIdx].saldo = newSaldo - monto;
    }

    // Update movimiento data
    movimientos[movIdx] = {
      ...oldMov,
      tipo: tipo,
      cuenta_id: cuenta_id,
      monto: monto,
      moneda: moneda,
      fecha: fecha,
      descripcion: descripcion,
      categoria_id: categoria_id,
      propiedad_id: propiedad_id,
      notas: notas,
      updated: new Date().toISOString(),
    };

    saveData(STORAGE_KEYS.movimientos, movimientos);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Movimiento actualizado exitosamente.', 'success');
  } else {
    // -- CREATE new movimiento --
    const nuevoMov = {
      id: uuid(),
      cuenta_id: cuenta_id,
      tipo: tipo,
      monto: monto,
      moneda: moneda,
      categoria_id: categoria_id,
      propiedad_id: propiedad_id,
      descripcion: descripcion,
      fecha: fecha,
      notas: notas,
      created: new Date().toISOString(),
    };

    // Apply saldo effect (ensure saldo is numeric)
    var saldoAnterior = parseFloat(cuentas[cuentaIdx].saldo) || 0;
    if (tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo = saldoAnterior + monto;
    } else {
      cuentas[cuentaIdx].saldo = saldoAnterior - monto;
    }

    movimientos.push(nuevoMov);

    // If linked to a property, record the payment and update mensualidades
    if (propiedad_id) {
      var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
      var propIdx = propiedades.findIndex(function(p) { return p.id === propiedad_id; });
      if (propIdx !== -1) {
        if (!propiedades[propIdx].pagos) propiedades[propIdx].pagos = [];
        propiedades[propIdx].pagos.push({
          movimiento_id: nuevoMov.id,
          fecha: fecha,
          monto: monto,
          descripcion: descripcion,
          moneda: moneda
        });

        // If preventa, increment mensualidades_pagadas
        if (propiedades[propIdx].tipo === 'preventa') {
          var pagadas = propiedades[propIdx].mensualidades_pagadas || 0;
          var totales = propiedades[propIdx].mensualidades_total || 0;
          if (pagadas < totales) {
            propiedades[propIdx].mensualidades_pagadas = pagadas + 1;
          }
        }

        saveData(STORAGE_KEYS.propiedades, propiedades);
      }
    }

    saveData(STORAGE_KEYS.movimientos, movimientos);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Movimiento creado exitosamente.' + (propiedad_id ? ' Pago registrado en propiedad.' : ''), 'success');
  }

  closeModal();
  renderMovimientos();
  updateHeaderPatrimonio();
}

/* -- Delete a movimiento (reversing saldo effect) -- */
function deleteMovimiento(id) {
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const mov = movimientos.find(m => m.id === id);
  if (!mov) return;

  // Check if this movement is part of a transfer
  var contraparte = null;
  if (mov.transferencia_id) {
    contraparte = movimientos.find(function(m) {
      return m.transferencia_id === mov.transferencia_id && m.id !== id;
    });
  }

  var msgConfirm = '\u00BFEstas seguro de eliminar este movimiento?\n"' + (mov.descripcion || 'Sin descripcion') + '" por ' + formatCurrency(mov.monto, mov.moneda || 'MXN');
  if (contraparte) {
    msgConfirm += '\n\nEste movimiento es parte de una transferencia. Tambien se eliminara la contraparte:\n"' + (contraparte.descripcion || 'Sin descripcion') + '" por ' + formatCurrency(contraparte.monto, contraparte.moneda || 'MXN');
  }
  msgConfirm += '\n\nEsta accion revertira el efecto en el saldo de la(s) cuenta(s).';

  const confirmar = confirm(msgConfirm);
  if (!confirmar) return;

  // Reverse saldo effect on cuenta for the main movement (ensure numeric)
  const cuentaIdx = cuentas.findIndex(c => c.id === mov.cuenta_id);
  if (cuentaIdx !== -1) {
    var saldoActual = parseFloat(cuentas[cuentaIdx].saldo) || 0;
    if (mov.tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo = saldoActual - mov.monto;
    } else {
      cuentas[cuentaIdx].saldo = saldoActual + mov.monto;
    }
  }

  // Reverse saldo effect for contraparte (ensure numeric)
  if (contraparte) {
    var cpCuentaIdx = cuentas.findIndex(function(c) { return c.id === contraparte.cuenta_id; });
    if (cpCuentaIdx !== -1) {
      var cpSaldo = parseFloat(cuentas[cpCuentaIdx].saldo) || 0;
      if (contraparte.tipo === 'ingreso') {
        cuentas[cpCuentaIdx].saldo = cpSaldo - contraparte.monto;
      } else {
        cuentas[cpCuentaIdx].saldo = cpSaldo + contraparte.monto;
      }
    }
  }

  saveData(STORAGE_KEYS.cuentas, cuentas);

  // Remove movimiento(s) from array
  var idsToRemove = [id];
  if (contraparte) idsToRemove.push(contraparte.id);
  var newMovimientos = movimientos.filter(function(m) { return idsToRemove.indexOf(m.id) === -1; });
  saveData(STORAGE_KEYS.movimientos, newMovimientos);

  // Also remove the transfer record if it exists
  if (mov.transferencia_id) {
    var transferencias = loadData(STORAGE_KEYS.transferencias) || [];
    var newTransferencias = transferencias.filter(function(t) { return t.id !== mov.transferencia_id; });
    saveData(STORAGE_KEYS.transferencias, newTransferencias);
  }

  showToast('Movimiento eliminado exitosamente.' + (contraparte ? ' Contraparte de transferencia tambien eliminada.' : ''), 'info');
  renderMovimientos();
  updateHeaderPatrimonio();
}

/* ============================================================
   PLANTILLAS RECURRENTES (Recurring Transaction Templates)
   ============================================================ */

/* -- Helper: check if a plantilla is due based on frequency and last applied -- */
function _plantillaEstaPendiente(p) {
  if (!p.activa) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (!p.ultima_aplicacion) return true;

  const ultima = new Date(p.ultima_aplicacion);
  ultima.setHours(0, 0, 0, 0);

  var diasFrec = 30;
  switch (p.frecuencia) {
    case 'semanal':    diasFrec = 7;   break;
    case 'quincenal':  diasFrec = 15;  break;
    case 'mensual':    diasFrec = 30;  break;
    case 'bimestral':  diasFrec = 60;  break;
    case 'trimestral': diasFrec = 90;  break;
  }

  var diff = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));
  return diff >= diasFrec;
}

/* -- Helper: frequency label -- */
function _frecuenciaLabel(freq) {
  var labels = {
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
  };
  return labels[freq] || freq;
}

/* -- Open modal with list of plantillas recurrentes -- */
function openPlantillasRecurrentes() {
  const plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });
  const catMap = {};
  categorias.forEach(cat => { catMap[cat.id] = cat.nombre; });

  // Count pending
  const pendientes = plantillas.filter(p => _plantillaEstaPendiente(p));

  var rowsHTML = '';
  if (plantillas.length === 0) {
    rowsHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          <i class="fas fa-sync-alt" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
          No hay plantillas recurrentes. Crea una para automatizar movimientos periodicos.
        </td>
      </tr>`;
  } else {
    rowsHTML = plantillas.map(function(p) {
      var cuenta = cuentaMap[p.cuenta_id];
      var cuentaNombre = cuenta ? cuenta.nombre : 'Desconocida';
      var catNombre = p.tipo === 'gasto' && p.categoria_id ? (catMap[p.categoria_id] || '\u2014') : '\u2014';
      var tipoBadge = p.tipo === 'ingreso' ? 'badge-green' : 'badge-red';
      var tipoLabel = p.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
      var estadoBadge = p.activa ? 'badge-green' : 'badge-red';
      var estadoLabel = p.activa ? 'Activa' : 'Inactiva';
      var pendiente = _plantillaEstaPendiente(p);
      var ultimaApl = p.ultima_aplicacion ? formatDate(p.ultima_aplicacion) : 'Nunca';

      return '<tr>' +
        '<td style="font-weight:500;color:var(--text-primary);">' + (p.nombre || '\u2014') + '</td>' +
        '<td><span class="badge ' + tipoBadge + '">' + tipoLabel + '</span></td>' +
        '<td style="text-align:right;font-weight:600;">' + formatCurrency(p.monto, p.moneda || 'MXN') + '</td>' +
        '<td>' + cuentaNombre + '</td>' +
        '<td>' + _frecuenciaLabel(p.frecuencia) + ' (dia ' + p.dia_periodo + ')</td>' +
        '<td>' + ultimaApl + (pendiente ? ' <span class="badge badge-amber" style="font-size:9px;margin-left:4px;">Pendiente</span>' : '') + '</td>' +
        '<td><span class="badge ' + estadoBadge + '">' + estadoLabel + '</span></td>' +
        '<td style="text-align:center;white-space:nowrap;">' +
          '<button class="btn btn-primary" style="padding:5px 10px;font-size:11px;margin-right:4px;" onclick="aplicarPlantilla(\'' + p.id + '\')" title="Aplicar">' +
            '<i class="fas fa-play"></i>' +
          '</button>' +
          '<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;margin-right:4px;" onclick="editPlantillaRecurrente(\'' + p.id + '\')" title="Editar">' +
            '<i class="fas fa-edit"></i>' +
          '</button>' +
          '<button class="btn btn-danger" style="padding:5px 10px;font-size:11px;" onclick="deletePlantillaRecurrente(\'' + p.id + '\')" title="Eliminar">' +
            '<i class="fas fa-trash"></i>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  var contentHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div>
        <span style="font-size:13px;color:var(--text-muted);">${plantillas.length} plantilla(s) &middot; ${pendientes.length} pendiente(s)</span>
      </div>
      <div style="display:flex;gap:8px;">
        ${pendientes.length > 0 ? '<button class="btn btn-primary" onclick="aplicarTodasPendientes()" style="font-size:12px;"><i class="fas fa-play-circle" style="margin-right:4px;"></i>Aplicar Todas Pendientes (' + pendientes.length + ')</button>' : ''}
        <button class="btn btn-primary" onclick="editPlantillaRecurrente(null)" style="font-size:12px;">
          <i class="fas fa-plus" style="margin-right:4px;"></i>Nueva Plantilla
        </button>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th style="text-align:right;">Monto</th>
            <th>Cuenta</th>
            <th>Frecuencia</th>
            <th>Ultima Aplicacion</th>
            <th>Estado</th>
            <th style="text-align:center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </div>
  `;

  openModal('Plantillas Recurrentes', contentHTML, 'modal-lg');
}

/* -- Open modal to create or edit a plantilla recurrente -- */
function editPlantillaRecurrente(id) {
  const plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];

  var p = null;
  if (id) {
    p = plantillas.find(function(t) { return t.id === id; });
  }

  var isEdit = !!p;
  var titulo = isEdit ? 'Editar Plantilla Recurrente' : 'Nueva Plantilla Recurrente';

  // Build cuenta options (only active)
  var cuentaOpciones = cuentas
    .filter(function(c) { return c.activa !== false; })
    .map(function(c) {
      var selected = p && p.cuenta_id === c.id ? 'selected' : '';
      return '<option value="' + c.id + '" ' + selected + '>' + c.nombre + ' (' + c.moneda + ')</option>';
    }).join('');

  // Build categoria options
  var catOpciones = categorias.map(function(cat) {
    var selected = p && p.categoria_id === cat.id ? 'selected' : '';
    return '<option value="' + cat.id + '" ' + selected + '>' + cat.nombre + '</option>';
  }).join('');

  var tipoActual = isEdit ? p.tipo : 'gasto';
  var frecActual = isEdit ? p.frecuencia : 'mensual';

  var formHTML = `
    <form id="formPlantillaRecurrente" onsubmit="savePlantillaRecurrente(event)">
      <input type="hidden" id="plantillaId" value="${isEdit ? p.id : ''}">

      <div class="form-group">
        <label class="form-label">Nombre descriptivo *</label>
        <input type="text" id="plantillaNombre" class="form-input" required
               value="${isEdit ? (p.nombre || '') : ''}" placeholder="Ej: Renta mensual Polanco">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select id="plantillaTipo" class="form-select" required onchange="togglePlantillaCategoriaField()">
            <option value="ingreso" ${tipoActual === 'ingreso' ? 'selected' : ''}>Ingreso</option>
            <option value="gasto" ${tipoActual === 'gasto' ? 'selected' : ''}>Gasto</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Monto *</label>
          <input type="number" id="plantillaMonto" class="form-input" required step="0.01" min="0.01"
                 value="${isEdit ? p.monto : ''}" placeholder="0.00">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Moneda *</label>
          <select id="plantillaMoneda" class="form-select" required>
            <option value="MXN" ${isEdit && p.moneda === 'MXN' ? 'selected' : (!isEdit ? 'selected' : '')}>MXN</option>
            <option value="USD" ${isEdit && p.moneda === 'USD' ? 'selected' : ''}>USD</option>
            <option value="EUR" ${isEdit && p.moneda === 'EUR' ? 'selected' : ''}>EUR</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cuenta *</label>
          <select id="plantillaCuentaId" class="form-select" required>
            <option value="">Seleccionar cuenta...</option>
            ${cuentaOpciones}
          </select>
        </div>
      </div>

      <div class="form-group" id="plantillaCategoriaGroup" style="display:${tipoActual === 'gasto' ? 'block' : 'none'};">
        <label class="form-label">Categoria</label>
        <select id="plantillaCategoriaId" class="form-select">
          <option value="">Sin categoria</option>
          ${catOpciones}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Descripcion</label>
        <input type="text" id="plantillaDescripcion" class="form-input"
               value="${isEdit ? (p.descripcion || '') : ''}" placeholder="Descripcion del movimiento generado">
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Frecuencia *</label>
          <select id="plantillaFrecuencia" class="form-select" required>
            <option value="semanal" ${frecActual === 'semanal' ? 'selected' : ''}>Semanal</option>
            <option value="quincenal" ${frecActual === 'quincenal' ? 'selected' : ''}>Quincenal</option>
            <option value="mensual" ${frecActual === 'mensual' ? 'selected' : ''}>Mensual</option>
            <option value="bimestral" ${frecActual === 'bimestral' ? 'selected' : ''}>Bimestral</option>
            <option value="trimestral" ${frecActual === 'trimestral' ? 'selected' : ''}>Trimestral</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Dia del periodo *</label>
          <input type="number" id="plantillaDiaPeriodo" class="form-input" required min="1" max="31"
                 value="${isEdit ? p.dia_periodo : 1}" placeholder="1-31">
        </div>
        <div class="form-group">
          <label class="form-label">Activa</label>
          <select id="plantillaActiva" class="form-select">
            <option value="true" ${!isEdit || p.activa ? 'selected' : ''}>Si</option>
            <option value="false" ${isEdit && !p.activa ? 'selected' : ''}>No</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="openPlantillasRecurrentes()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
        </button>
      </div>
    </form>
  `;

  openModal(titulo, formHTML);
  togglePlantillaCategoriaField();
}

/* -- Toggle categoria field for plantilla form -- */
function togglePlantillaCategoriaField() {
  var tipoSelect = document.getElementById('plantillaTipo');
  var catGroup = document.getElementById('plantillaCategoriaGroup');
  if (tipoSelect && catGroup) {
    catGroup.style.display = tipoSelect.value === 'gasto' ? 'block' : 'none';
  }
}

/* -- Save (create or update) a plantilla recurrente -- */
function savePlantillaRecurrente(event) {
  event.preventDefault();

  var plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];

  var id = document.getElementById('plantillaId').value;
  var nombre = document.getElementById('plantillaNombre').value.trim();
  var tipo = document.getElementById('plantillaTipo').value;
  var monto = parseFloat(document.getElementById('plantillaMonto').value) || 0;
  var moneda = document.getElementById('plantillaMoneda').value;
  var cuenta_id = document.getElementById('plantillaCuentaId').value;
  var categoria_id = tipo === 'gasto' ? (document.getElementById('plantillaCategoriaId').value || null) : null;
  var descripcion = document.getElementById('plantillaDescripcion').value.trim();
  var frecuencia = document.getElementById('plantillaFrecuencia').value;
  var dia_periodo = parseInt(document.getElementById('plantillaDiaPeriodo').value) || 1;
  var activa = document.getElementById('plantillaActiva').value === 'true';

  if (!nombre || !cuenta_id || monto <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    // Update existing
    var idx = plantillas.findIndex(function(p) { return p.id === id; });
    if (idx === -1) {
      showToast('No se encontro la plantilla a editar.', 'error');
      return;
    }
    plantillas[idx] = {
      ...plantillas[idx],
      nombre: nombre,
      tipo: tipo,
      monto: monto,
      moneda: moneda,
      cuenta_id: cuenta_id,
      categoria_id: categoria_id,
      descripcion: descripcion,
      frecuencia: frecuencia,
      dia_periodo: dia_periodo,
      activa: activa,
      updated: new Date().toISOString(),
    };
    showToast('Plantilla actualizada exitosamente.', 'success');
  } else {
    // Create new
    var nueva = {
      id: uuid(),
      nombre: nombre,
      tipo: tipo,
      monto: monto,
      moneda: moneda,
      cuenta_id: cuenta_id,
      categoria_id: categoria_id,
      descripcion: descripcion,
      frecuencia: frecuencia,
      dia_periodo: dia_periodo,
      activa: activa,
      ultima_aplicacion: null,
      created: new Date().toISOString(),
    };
    plantillas.push(nueva);
    showToast('Plantilla creada exitosamente.', 'success');
  }

  saveData(STORAGE_KEYS.plantillas_recurrentes, plantillas);
  openPlantillasRecurrentes();
}

/* -- Delete a plantilla recurrente -- */
function deletePlantillaRecurrente(id) {
  var plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  var p = plantillas.find(function(t) { return t.id === id; });
  if (!p) return;

  var confirmar = confirm('\u00BFEstas seguro de eliminar la plantilla "' + (p.nombre || 'Sin nombre') + '"?\n\nEsta accion no afecta los movimientos ya creados.');
  if (!confirmar) return;

  var nuevas = plantillas.filter(function(t) { return t.id !== id; });
  saveData(STORAGE_KEYS.plantillas_recurrentes, nuevas);

  showToast('Plantilla eliminada exitosamente.', 'info');
  openPlantillasRecurrentes();
}

/* -- Apply a single plantilla: create a movimiento from template -- */
function aplicarPlantilla(id) {
  var plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  var pIdx = plantillas.findIndex(function(t) { return t.id === id; });
  if (pIdx === -1) {
    showToast('Plantilla no encontrada.', 'error');
    return;
  }

  var p = plantillas[pIdx];
  var hoy = new Date().toISOString().split('T')[0];

  // Find the target cuenta
  var cuentaIdx = cuentas.findIndex(function(c) { return c.id === p.cuenta_id; });
  if (cuentaIdx === -1) {
    showToast('La cuenta asociada a la plantilla no existe.', 'error');
    return;
  }

  var moneda = cuentas[cuentaIdx].moneda || p.moneda || 'MXN';

  // Create movimiento
  var nuevoMov = {
    id: uuid(),
    cuenta_id: p.cuenta_id,
    tipo: p.tipo,
    monto: p.monto,
    moneda: moneda,
    categoria_id: p.categoria_id || null,
    descripcion: p.descripcion || p.nombre,
    fecha: hoy,
    notas: 'Generado desde plantilla: ' + p.nombre,
    created: new Date().toISOString(),
  };

  // Apply saldo effect
  if (p.tipo === 'ingreso') {
    cuentas[cuentaIdx].saldo += p.monto;
  } else {
    cuentas[cuentaIdx].saldo -= p.monto;
  }

  movimientos.push(nuevoMov);

  // Update ultima_aplicacion
  plantillas[pIdx].ultima_aplicacion = new Date().toISOString();

  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);
  saveData(STORAGE_KEYS.plantillas_recurrentes, plantillas);

  showToast('Plantilla "' + p.nombre + '" aplicada. Movimiento creado.', 'success');
  openPlantillasRecurrentes();
  // Also refresh the movimientos table behind the modal
  if (typeof renderMovimientos === 'function') {
    setTimeout(function() { renderMovimientos(); }, 100);
  }
  if (typeof updateHeaderPatrimonio === 'function') {
    updateHeaderPatrimonio();
  }
}

/* -- Apply all pending plantillas -- */
function aplicarTodasPendientes() {
  var plantillas = loadData(STORAGE_KEYS.plantillas_recurrentes) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  var pendientes = plantillas.filter(function(p) { return _plantillaEstaPendiente(p); });

  if (pendientes.length === 0) {
    showToast('No hay plantillas pendientes por aplicar.', 'info');
    return;
  }

  var confirmar = confirm('\u00BFAplicar ' + pendientes.length + ' plantilla(s) pendiente(s)?\n\nSe crearan ' + pendientes.length + ' movimiento(s) con fecha de hoy.');
  if (!confirmar) return;

  var hoy = new Date().toISOString().split('T')[0];
  var aplicadas = 0;

  pendientes.forEach(function(p) {
    var cuentaIdx = cuentas.findIndex(function(c) { return c.id === p.cuenta_id; });
    if (cuentaIdx === -1) return;

    var moneda = cuentas[cuentaIdx].moneda || p.moneda || 'MXN';

    var nuevoMov = {
      id: uuid(),
      cuenta_id: p.cuenta_id,
      tipo: p.tipo,
      monto: p.monto,
      moneda: moneda,
      categoria_id: p.categoria_id || null,
      descripcion: p.descripcion || p.nombre,
      fecha: hoy,
      notas: 'Generado desde plantilla: ' + p.nombre,
      created: new Date().toISOString(),
    };

    if (p.tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo += p.monto;
    } else {
      cuentas[cuentaIdx].saldo -= p.monto;
    }

    movimientos.push(nuevoMov);

    // Update ultima_aplicacion in the main array
    var mainIdx = plantillas.findIndex(function(t) { return t.id === p.id; });
    if (mainIdx !== -1) {
      plantillas[mainIdx].ultima_aplicacion = new Date().toISOString();
    }

    aplicadas++;
  });

  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);
  saveData(STORAGE_KEYS.plantillas_recurrentes, plantillas);

  showToast(aplicadas + ' plantilla(s) aplicada(s) exitosamente.', 'success');
  openPlantillasRecurrentes();
  if (typeof renderMovimientos === 'function') {
    setTimeout(function() { renderMovimientos(); }, 100);
  }
  if (typeof updateHeaderPatrimonio === 'function') {
    updateHeaderPatrimonio();
  }
}

/* ============================================================
   TRANSFERENCIAS (modal integrado en Movimientos)
   ============================================================ */
function openTransferenciaModal() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });
  var cuentaOpciones = cuentasActivas.map(function(c) {
    return '<option value="' + c.id + '">' + c.nombre + ' (' + c.moneda + ')</option>';
  }).join('');

  var hoy = new Date().toISOString().split('T')[0];

  var formHTML = '<form id="formTransferenciaModal" onsubmit="executeTransferenciaModal(event)">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Cuenta Origen *</label>' +
    '<select id="tmCuentaOrigen" class="form-select" required onchange="onTransferModalChange()">' +
    '<option value="">Seleccionar cuenta...</option>' + cuentaOpciones + '</select></div>' +
    '<div class="form-group"><label class="form-label">Cuenta Destino *</label>' +
    '<select id="tmCuentaDestino" class="form-select" required onchange="onTransferModalChange()">' +
    '<option value="">Seleccionar cuenta...</option>' + cuentaOpciones + '</select></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Monto Origen *</label>' +
    '<input type="number" id="tmMontoOrigen" class="form-input" required step="0.01" min="0.01" placeholder="0.00" oninput="onTransferModalChange()"></div>' +
    '<div class="form-group"><label class="form-label">Fecha *</label>' +
    '<input type="date" id="tmFecha" class="form-input" required value="' + hoy + '"></div>' +
    '</div>' +
    '<div id="tmTipoCambioSection" style="display:none;">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Tipo de Cambio *</label>' +
    '<input type="number" id="tmTipoCambio" class="form-input" step="0.0001" min="0.0001" placeholder="Ej: 17.50" oninput="onTransferModalChange()"></div>' +
    '<div class="form-group"><label class="form-label">Monto Destino (calculado)</label>' +
    '<input type="text" id="tmMontoDestino" class="form-input" readonly style="background:var(--bg-base);color:var(--accent-green);font-weight:700;" placeholder="---"></div>' +
    '</div></div>' +
    '<div class="form-group"><label class="form-label">Motivo / Descripcion</label>' +
    '<input type="text" id="tmMotivo" class="form-input" placeholder="Ej: Inversion en CETES"></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-exchange-alt"></i> Transferir</button>' +
    '</div></form>';

  openModal('Nueva Transferencia', formHTML);
}

function onTransferModalChange() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var origenId = document.getElementById('tmCuentaOrigen').value;
  var destinoId = document.getElementById('tmCuentaDestino').value;
  var tcSection = document.getElementById('tmTipoCambioSection');
  var tcInput = document.getElementById('tmTipoCambio');
  var montoDestinoInput = document.getElementById('tmMontoDestino');
  var montoOrigen = parseFloat(document.getElementById('tmMontoOrigen').value) || 0;

  if (!origenId || !destinoId) { tcSection.style.display = 'none'; return; }
  var ctaOrigen = cuentaMap[origenId];
  var ctaDestino = cuentaMap[destinoId];
  if (!ctaOrigen || !ctaDestino) { tcSection.style.display = 'none'; return; }

  if (ctaOrigen.moneda !== ctaDestino.moneda) {
    tcSection.style.display = 'block';
    if (!tcInput.value || parseFloat(tcInput.value) === 0) {
      var suggestedRate = 1;
      if (ctaOrigen.moneda === 'MXN' && ctaDestino.moneda === 'USD') suggestedRate = 1 / (tiposCambio['USD_MXN'] || 17.50);
      else if (ctaOrigen.moneda === 'USD' && ctaDestino.moneda === 'MXN') suggestedRate = tiposCambio['USD_MXN'] || 17.50;
      else if (ctaOrigen.moneda === 'MXN' && ctaDestino.moneda === 'EUR') suggestedRate = 1 / (tiposCambio['EUR_MXN'] || 19.20);
      else if (ctaOrigen.moneda === 'EUR' && ctaDestino.moneda === 'MXN') suggestedRate = tiposCambio['EUR_MXN'] || 19.20;
      tcInput.value = suggestedRate.toFixed(4);
    }
    var tc = parseFloat(tcInput.value) || 0;
    var montoDestCalc = montoOrigen * tc;
    montoDestinoInput.value = montoDestCalc > 0 ? formatCurrency(montoDestCalc, ctaDestino.moneda) : '---';
  } else {
    tcSection.style.display = 'none';
  }
}

function executeTransferenciaModal(event) {
  event.preventDefault();

  var transferencias = loadData(STORAGE_KEYS.transferencias) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  var cuenta_origen_id = document.getElementById('tmCuentaOrigen').value;
  var cuenta_destino_id = document.getElementById('tmCuentaDestino').value;
  var monto_origen = parseFloat(document.getElementById('tmMontoOrigen').value) || 0;
  var fecha = document.getElementById('tmFecha').value;
  var descripcion = document.getElementById('tmMotivo').value.trim();

  if (!cuenta_origen_id || !cuenta_destino_id || monto_origen <= 0 || !fecha) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }
  if (cuenta_origen_id === cuenta_destino_id) {
    showToast('La cuenta origen y destino no pueden ser la misma.', 'warning');
    return;
  }

  var origenIdx = cuentas.findIndex(function(c) { return c.id === cuenta_origen_id; });
  var destinoIdx = cuentas.findIndex(function(c) { return c.id === cuenta_destino_id; });
  if (origenIdx === -1 || destinoIdx === -1) {
    showToast('Una de las cuentas seleccionadas no existe.', 'error');
    return;
  }

  var ctaOrigen = cuentas[origenIdx];
  var ctaDestino = cuentas[destinoIdx];
  var monto_destino = monto_origen;
  var moneda_origen = ctaOrigen.moneda;
  var moneda_destino = ctaDestino.moneda;

  if (moneda_origen !== moneda_destino) {
    var tc = parseFloat(document.getElementById('tmTipoCambio').value) || 0;
    if (tc <= 0) { showToast('Por favor ingresa un tipo de cambio valido.', 'warning'); return; }
    monto_destino = monto_origen * tc;
  }

  if (ctaOrigen.saldo < monto_origen) {
    var confirmar = confirm('La cuenta origen tiene un saldo de ' + formatCurrency(ctaOrigen.saldo, moneda_origen) + ' que es menor al monto. \u00BFContinuar?');
    if (!confirmar) return;
  }

  var transId = uuid();
  transferencias.push({
    id: transId,
    cuenta_origen_id: cuenta_origen_id,
    cuenta_destino_id: cuenta_destino_id,
    monto_origen: monto_origen,
    monto_destino: monto_destino,
    moneda_origen: moneda_origen,
    moneda_destino: moneda_destino,
    fecha: fecha,
    descripcion: descripcion,
    notas: '',
    created: new Date().toISOString(),
  });

  movimientos.push({
    id: uuid(),
    cuenta_id: cuenta_origen_id,
    tipo: 'gasto',
    monto: monto_origen,
    moneda: moneda_origen,
    categoria_id: null,
    descripcion: 'Transferencia a ' + ctaDestino.nombre + (descripcion ? ' - ' + descripcion : ''),
    fecha: fecha,
    notas: 'Transferencia ID: ' + transId,
    transferencia_id: transId,
    created: new Date().toISOString(),
  });

  movimientos.push({
    id: uuid(),
    cuenta_id: cuenta_destino_id,
    tipo: 'ingreso',
    monto: monto_destino,
    moneda: moneda_destino,
    categoria_id: null,
    descripcion: 'Transferencia desde ' + ctaOrigen.nombre + (descripcion ? ' - ' + descripcion : ''),
    fecha: fecha,
    notas: 'Transferencia ID: ' + transId,
    transferencia_id: transId,
    created: new Date().toISOString(),
  });

  cuentas[origenIdx].saldo -= monto_origen;
  cuentas[destinoIdx].saldo += monto_destino;

  saveData(STORAGE_KEYS.transferencias, transferencias);
  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);

  closeModal();
  showToast('Transferencia realizada exitosamente.', 'success');
  renderMovimientos();
  updateHeaderPatrimonio();
}

/* ============================================================
   CHECKBOX SELECTION & EXPORT (PDF / Excel)
   ============================================================ */

function toggleAllMovCheckboxes(masterCb) {
  var checkboxes = document.querySelectorAll('.mov-checkbox');
  checkboxes.forEach(function(cb) { cb.checked = masterCb.checked; });
  onMovCheckboxChange();
}

function onMovCheckboxChange() {
  var checked = document.querySelectorAll('.mov-checkbox:checked');
  var bar = document.getElementById('movSelectionBar');
  if (!bar) {
    // Create selection bar
    var container = document.getElementById('module-movimientos');
    if (!container) return;
    var div = document.createElement('div');
    div.id = 'movSelectionBar';
    div.style.cssText = 'position:sticky;bottom:0;left:0;right:0;background:var(--accent-blue);color:white;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:8px;margin-top:8px;z-index:10;';
    div.innerHTML = '<span id="movSelCount" style="font-weight:700;font-size:13px;">0 seleccionados</span>' +
      '<div style="display:flex;gap:8px;">' +
      '<button class="btn" onclick="exportarSeleccionExcel()" style="background:white;color:var(--accent-blue);padding:6px 14px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-file-excel" style="margin-right:4px;"></i>Excel</button>' +
      '<button class="btn" onclick="exportarSeleccionPDF()" style="background:white;color:var(--accent-blue);padding:6px 14px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-file-pdf" style="margin-right:4px;"></i>PDF</button>' +
      '</div>';
    container.appendChild(div);
    bar = div;
  }
  var count = checked.length;
  if (count > 0) {
    bar.style.display = 'flex';
    document.getElementById('movSelCount').textContent = count + ' seleccionado' + (count > 1 ? 's' : '');
  } else {
    bar.style.display = 'none';
  }
}

function _getSelectedOrAllMovs() {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });
  var catMap = {};
  categorias.forEach(function(cat) { catMap[cat.id] = cat.nombre; });

  var checked = document.querySelectorAll('.mov-checkbox:checked');
  var selectedIds = [];
  checked.forEach(function(cb) { selectedIds.push(cb.value); });

  var list;
  if (selectedIds.length > 0) {
    list = movimientos.filter(function(m) { return selectedIds.indexOf(m.id) !== -1; });
  } else {
    // Use current filtered list from the visible table
    list = movimientos;
  }
  list = list.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });

  return { movimientos: list, cuentaMap: cuentaMap, catMap: catMap };
}

function exportarSeleccionExcel() {
  if (typeof XLSX === 'undefined') { showToast('XLSX no esta cargada.', 'error'); return; }
  var data = _getSelectedOrAllMovs();
  var rows = data.movimientos.map(function(m) {
    var cta = data.cuentaMap[m.cuenta_id];
    return {
      'Fecha': m.fecha || '',
      'Descripcion': m.descripcion || '',
      'Tipo': m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      'Cuenta': cta ? cta.nombre : '',
      'Categoria': m.categoria_id ? (data.catMap[m.categoria_id] || '') : '',
      'Monto': m.monto || 0,
      'Moneda': cta ? cta.moneda : 'MXN'
    };
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  XLSX.writeFile(wb, 'Movimientos_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  showToast('Excel exportado con ' + rows.length + ' movimientos.', 'success');
}

function exportarSeleccionPDF() {
  _exportMovsToPDF(_getSelectedOrAllMovs(), 'Movimientos Seleccionados');
}

function exportarMovsPDF() {
  _exportMovsToPDF(_getSelectedOrAllMovs(), 'Movimientos');
}

function _exportMovsToPDF(data, titulo) {
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    showToast('jsPDF no esta cargada. Verifica tu conexion.', 'error');
    return;
  }
  var jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : jspdf.jsPDF;
  var doc = new jsPDF('l', 'mm', 'letter');

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Panel Financiero MMG', 14, 15);
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(titulo + ' — ' + new Date().toLocaleDateString('es-MX'), 14, 22);

  // Table
  var tableData = data.movimientos.map(function(m) {
    var cta = data.cuentaMap[m.cuenta_id];
    return [
      m.fecha || '',
      m.descripcion || '',
      m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      cta ? cta.nombre : '',
      m.categoria_id ? (data.catMap[m.categoria_id] || '') : '',
      (m.tipo === 'ingreso' ? '+' : '-') + formatCurrency(m.monto, cta ? cta.moneda : 'MXN')
    ];
  });

  doc.autoTable({
    startY: 28,
    head: [['Fecha', 'Descripcion', 'Tipo', 'Cuenta', 'Categoria', 'Monto']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      5: { halign: 'right', cellWidth: 30 }
    }
  });

  doc.save(titulo.replace(/ /g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
  showToast('PDF exportado con ' + data.movimientos.length + ' movimientos.', 'success');
}

/* ============================================================
   DESGLOSE DE RECUADROS (Ingresos / Rendimientos / Gastos)
   ============================================================ */
function mostrarDesgloseMovimientos(tipo) {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });
  var catMap = {};
  categorias.forEach(function(cat) { catMap[cat.id] = cat.nombre; });

  var titulo, color, icon, rows;

  if (tipo === 'rendimiento') {
    // Show rendimientos from cierres
    var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
    titulo = 'Desglose de Rendimientos';
    color = 'var(--accent-amber)';
    icon = 'fa-percentage';

    // Group by cuenta
    var rendByCuenta = {};
    rendimientos.forEach(function(r) {
      var cta = cuentaMap[r.cuenta_id];
      var nombre = cta ? cta.nombre : 'Desconocida';
      if (!rendByCuenta[nombre]) rendByCuenta[nombre] = { monto: 0, count: 0 };
      var monRend = cta ? cta.moneda : 'MXN';
      rendByCuenta[nombre].monto += toMXN(r.rendimiento_monto || 0, monRend, tiposCambio);
      rendByCuenta[nombre].count++;
    });

    var totalRend = 0;
    rows = Object.entries(rendByCuenta).sort(function(a, b) { return b[1].monto - a[1].monto; }).map(function(entry) {
      totalRend += entry[1].monto;
      var rendSign = entry[1].monto >= 0 ? '+' : '';
      var rendColor = entry[1].monto >= 0 ? 'var(--accent-amber)' : 'var(--accent-red)';
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + entry[0] + '</td>' +
        '<td style="text-align:center;">' + entry[1].count + ' cierre' + (entry[1].count > 1 ? 's' : '') + '</td>' +
        '<td style="text-align:right;font-weight:600;color:' + rendColor + ';">' + rendSign + formatCurrency(entry[1].monto, 'MXN') + '</td>' +
      '</tr>';
    }).join('');

    var totalRendSign = totalRend >= 0 ? '+' : '';
    var totalRendColor = totalRend >= 0 ? 'var(--accent-amber)' : 'var(--accent-red)';
    rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
      '<td colspan="2">Total</td>' +
      '<td style="text-align:right;color:' + totalRendColor + ';">' + totalRendSign + formatCurrency(totalRend, 'MXN') + '</td>' +
    '</tr>';

    var html = '<table class="data-table sortable-table"><thead><tr>' +
      '<th>Cuenta</th><th style="text-align:center;">Cierres</th><th style="text-align:right;">Rendimiento</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    openModal(titulo, html);
    setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
    return;
  }

  // Ingresos or Gastos
  var filterTipo = tipo; // 'ingreso' or 'gasto'
  titulo = tipo === 'ingreso' ? 'Desglose de Ingresos' : 'Desglose de Gastos';
  color = tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)';
  icon = tipo === 'ingreso' ? 'fa-arrow-down' : 'fa-arrow-up';

  var filtered = movimientos.filter(function(m) {
    return m.tipo === filterTipo && !m.transferencia_id;
  }).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });

  // Group by cuenta
  var byCuenta = {};
  var total = 0;
  filtered.forEach(function(m) {
    var cta = cuentaMap[m.cuenta_id];
    var nombre = cta ? cta.nombre : 'Desconocida';
    var moneda = cta ? cta.moneda : 'MXN';
    var montoMXN = toMXN(m.monto, moneda, tiposCambio);
    if (!byCuenta[nombre]) byCuenta[nombre] = { monto: 0, count: 0, saldo: 0, monedaSaldo: 'MXN' };
    byCuenta[nombre].monto += montoMXN;
    byCuenta[nombre].count++;
    if (cta) {
      byCuenta[nombre].saldo = cta.saldo;
      byCuenta[nombre].monedaSaldo = cta.moneda;
    }
    total += montoMXN;
  });

  rows = Object.entries(byCuenta).sort(function(a, b) { return b[1].monto - a[1].monto; }).map(function(entry) {
    var pct = total > 0 ? (entry[1].monto / total * 100).toFixed(1) : '0.0';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + entry[0] + '</td>' +
      '<td style="text-align:center;">' + entry[1].count + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + color + ';">' + formatCurrency(entry[1].monto, 'MXN') + '</td>' +
      '<td style="text-align:right;color:var(--text-muted);">' + pct + '%</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(entry[1].saldo, entry[1].monedaSaldo) + '</td>' +
    '</tr>';
  }).join('');

  rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
    '<td>Total</td><td style="text-align:center;">' + filtered.length + '</td>' +
    '<td style="text-align:right;color:' + color + ';">' + formatCurrency(total, 'MXN') + '</td>' +
    '<td></td><td></td>' +
  '</tr>';

  // Also show top categories for gastos
  var catSection = '';
  if (tipo === 'gasto') {
    var byCat = {};
    filtered.forEach(function(m) {
      var catNombre = m.categoria_id ? (catMap[m.categoria_id] || 'Sin categoria') : 'Sin categoria';
      var cta = cuentaMap[m.cuenta_id];
      var moneda = cta ? cta.moneda : 'MXN';
      var montoMXN = toMXN(m.monto, moneda, tiposCambio);
      if (!byCat[catNombre]) byCat[catNombre] = 0;
      byCat[catNombre] += montoMXN;
    });
    var catRows = Object.entries(byCat).sort(function(a, b) { return b[1] - a[1]; }).map(function(entry) {
      var pct = total > 0 ? (entry[1] / total * 100).toFixed(1) : '0.0';
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + entry[0] + '</td>' +
        '<td style="text-align:right;font-weight:600;color:var(--accent-red);">' + formatCurrency(entry[1], 'MXN') + '</td>' +
        '<td style="text-align:right;color:var(--text-muted);">' + pct + '%</td>' +
      '</tr>';
    }).join('');
    catSection = '<div style="margin-top:20px;">' +
      '<h4 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:10px;"><i class="fas fa-tags" style="margin-right:6px;color:var(--accent-red);"></i>Por Categoria</h4>' +
      '<table class="data-table sortable-table"><thead><tr><th>Categoria</th><th style="text-align:right;">Monto</th><th style="text-align:right;">%</th></tr></thead>' +
      '<tbody>' + catRows + '</tbody></table></div>';
  }

  var html = '<table class="data-table sortable-table"><thead><tr>' +
    '<th>Cuenta</th><th style="text-align:center;">Movimientos</th><th style="text-align:right;">Monto</th><th style="text-align:right;">%</th><th style="text-align:right;">Saldo Actual</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' + catSection;

  openModal(titulo, html);
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
}
