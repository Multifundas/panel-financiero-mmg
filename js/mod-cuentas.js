function renderCuentas() {
  const el = document.getElementById('module-cuentas');

  // -- Load data --
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // -- Institution lookup --
  const instMap = {};
  instituciones.forEach(i => instMap[i.id] = i.nombre);

  // -- Summary totals by type (active accounts only, in MXN) --
  let totalBancarias = 0, countBancarias = 0;
  let totalInversiones = 0, countInversiones = 0;
  let totalInmuebles = 0, countInmuebles = 0;
  let totalActivosFijos = 0, countActivosFijos = 0;

  cuentas.forEach(c => {
    if (c.activa === false) return;
    const valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
    if (c.tipo === 'debito') { totalBancarias += valMXN; countBancarias++; }
    else if (c.tipo === 'inversion') { totalInversiones += valMXN; countInversiones++; }
    else if (c.tipo === 'inmueble') { totalInmuebles += valMXN; countInmuebles++; }
    else if (c.tipo === 'activo_fijo') { totalActivosFijos += valMXN; countActivosFijos++; }
  });

  const totalGeneral = totalBancarias + totalInversiones + totalInmuebles + totalActivosFijos;
  const countGeneral = countBancarias + countInversiones + countInmuebles + countActivosFijos;

  // -- Unique institutions for filter --
  const instIdsEnUso = [...new Set(cuentas.map(c => c.institucion_id))];
  const instOpcionesFilter = instIdsEnUso
    .filter(id => instMap[id])
    .map(id => `<option value="${id}">${instMap[id]}</option>`)
    .join('');

  // -- Institution options for form --
  const instOpcionesForm = instituciones
    .map(i => `<option value="${i.id}">${i.nombre}</option>`)
    .join('');

  // -- Render HTML --
  el.innerHTML = `
    <!-- Resumen de Cuentas -->
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesgloseCuentas('debito')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-university" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Cuentas Bancarias</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalBancarias, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countBancarias} cuenta${countBancarias !== 1 ? 's' : ''}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-green);cursor:pointer;" onclick="mostrarDesgloseCuentas('inversion')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-chart-line" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Inversiones</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalInversiones, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countInversiones} cuenta${countInversiones !== 1 ? 's' : ''}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--text-secondary);cursor:pointer;" onclick="mostrarDesgloseCuentas('')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(148,163,184,0.1);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-wallet" style="color:var(--text-secondary);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total General</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalGeneral, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countGeneral} cuenta${countGeneral !== 1 ? 's' : ''} activa${countGeneral !== 1 ? 's' : ''}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
    </div>

    <!-- Barra de Filtros y Boton Nueva Cuenta -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:140px;">
            <select id="filterCuentaTipo" class="form-select" onchange="filterCuentas()">
              <option value="">Todos los tipos</option>
              <option value="debito">Debito</option>
              <option value="inversion">Inversion</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:120px;">
            <select id="filterCuentaMoneda" class="form-select" onchange="filterCuentas()">
              <option value="">Todas las monedas</option>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:160px;">
            <select id="filterCuentaInstitucion" class="form-select" onchange="filterCuentas()">
              <option value="">Todas las instituciones</option>
              ${instOpcionesFilter}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:180px;">
            <input type="text" id="filterCuentaSearch" class="form-input" placeholder="Buscar cuenta..." oninput="filterCuentas()">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-secondary" onclick="exportarExcel('cuentas')" title="Exportar a Excel">
            <i class="fas fa-download" style="margin-right:4px;"></i>Exportar
          </button>
          <button class="btn btn-secondary" onclick="capturaHistorica()" style="border-color:var(--accent-amber);color:var(--accent-amber);">
            <i class="fas fa-calendar-plus"></i> Captura Historica
          </button>
          <button class="btn btn-secondary" onclick="cierreMensual()" style="border-color:var(--accent-green);color:var(--accent-green);">
            <i class="fas fa-calendar-check"></i> Cierre Mensual
          </button>
          <button class="btn btn-primary" onclick="editCuenta(null)">
            <i class="fas fa-plus"></i> Nueva Cuenta
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de Cuentas -->
    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaCuentas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Institucion</th>
              <th>Moneda</th>
              <th style="text-align:right;">Saldo</th>
              <th style="text-align:right;">Rendimiento %</th>
              <th>Subtipo</th>
              <th>Cierre</th>
              <th style="text-align:center;" data-no-sort="true">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyCuentas">
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Populate table with initial (unfiltered) data
  filterCuentas();

  // Enable sortable headers
  setTimeout(function() { _initSortableTables(el); }, 100);
}

/* -- Filter and render the cuentas table rows -- */
function filterCuentas() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  const instMap = {};
  instituciones.forEach(i => instMap[i.id] = i.nombre);

  // Read filter values
  const fTipo = document.getElementById('filterCuentaTipo') ? document.getElementById('filterCuentaTipo').value : '';
  const fMoneda = document.getElementById('filterCuentaMoneda') ? document.getElementById('filterCuentaMoneda').value : '';
  const fInst = document.getElementById('filterCuentaInstitucion') ? document.getElementById('filterCuentaInstitucion').value : '';
  const fSearch = document.getElementById('filterCuentaSearch') ? document.getElementById('filterCuentaSearch').value.toLowerCase().trim() : '';

  // Apply filters
  const filtered = cuentas.filter(c => {
    if (fTipo && c.tipo !== fTipo) return false;
    if (fMoneda && c.moneda !== fMoneda) return false;
    if (fInst && c.institucion_id !== fInst) return false;
    if (fSearch) {
      const nombre = (c.nombre || '').toLowerCase();
      const notas = (c.notas || '').toLowerCase();
      const inst = (instMap[c.institucion_id] || '').toLowerCase();
      if (!nombre.includes(fSearch) && !notas.includes(fSearch) && !inst.includes(fSearch)) return false;
    }
    return true;
  });

  // Build table rows
  const tbody = document.getElementById('tbodyCuentas');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          <i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
          No se encontraron cuentas con los filtros aplicados.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((c, idx) => {
    // Badge for type
    const tipoBadgeClass = c.tipo === 'inversion' ? 'badge-green'
      : c.tipo === 'inmueble' ? 'badge-amber'
      : c.tipo === 'activo_fijo' ? 'badge-purple' : 'badge-blue';
    const tipoLabel = c.tipo === 'inversion' ? 'INVERSION'
      : c.tipo === 'inmueble' ? 'INMUEBLE'
      : c.tipo === 'activo_fijo' ? 'ACTIVO FIJO' : 'DEBITO';

    // Rendimiento display (usar tasa anualizada del ultimo cierre, o fallback al campo estatico)
    let rendAnualCalc = c.rendimiento_anual || 0;
    const histCta = c.historial_saldos || [];
    if (histCta.length > 0) {
      const ultCierre = [...histCta].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultCierre.rendimiento_pct_anual != null) rendAnualCalc = ultCierre.rendimiento_pct_anual;
    }
    const rendimiento = rendAnualCalc !== 0
      ? (rendAnualCalc >= 0 ? '+' : '') + Number(rendAnualCalc).toFixed(2) + '%'
      : '\u2014';
    const rendColor = rendAnualCalc > 0 ? 'var(--accent-green)' : rendAnualCalc < 0 ? 'var(--accent-red)' : 'var(--text-muted)';

    // Subtipo display
    let subtipoHTML = '\u2014';
    if (c.subtipo === 'pagare') {
      subtipoHTML = '<span class="badge badge-blue">PAGARE</span>';
    } else if (c.subtipo === 'renta_variable') {
      subtipoHTML = '<span class="badge badge-purple">RENTA VARIABLE</span>';
    } else if (c.subtipo === 'accion_club') {
      subtipoHTML = '<span class="badge badge-amber">ACCION/MEMBRESIA</span>';
    }

    // Ultimo cierre
    let ultCierreHTML = '<span style="color:var(--text-muted);">\u2014</span>';
    if (histCta.length > 0) {
      const ultCierreEntry = [...histCta].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      if (ultCierreEntry.fecha) {
        ultCierreHTML = formatDate(ultCierreEntry.fecha);
      }
    }

    // Zebra striping
    const zebraStyle = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';

    return `<tr style="${zebraStyle}">
      <td style="font-weight:600;color:var(--text-primary);">${c.nombre}</td>
      <td><span class="badge ${tipoBadgeClass}">${tipoLabel}</span></td>
      <td>${instMap[c.institucion_id] || '\u2014'}</td>
      <td><span class="badge ${monedaBadgeClass(c.moneda)}">${c.moneda}</span></td>
      <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(c.saldo, c.moneda)}</td>
      <td style="text-align:right;color:${rendColor};font-weight:${rendAnualCalc !== 0 ? '600' : 'normal'};">${rendimiento}</td>
      <td>${subtipoHTML}</td>
      <td style="font-size:12px;white-space:nowrap;">${ultCierreHTML}</td>
      <td style="text-align:center;">
        <button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;margin-right:4px;" onclick="editCuenta('${c.id}')" title="Editar">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;margin-right:4px;border-color:var(--accent-blue);color:var(--accent-blue);" onclick="verEstadoCuenta('${c.id}')" title="Estado de Cuenta">
          <i class="fas fa-file-invoice-dollar"></i>
        </button>
        <button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;margin-right:4px;" onclick="verHistorialCuenta('${c.id}')" title="Ver Historial">
          <i class="fas fa-history"></i>
        </button>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;" onclick="deleteCuenta('${c.id}')" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* -- Desglose modal for KPI cards (Bancarias / Inversiones / Total) -- */
function mostrarDesgloseCuentas(tipoCuenta) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });

  var titulo, color;
  if (tipoCuenta === 'debito') {
    titulo = 'Desglose Cuentas Bancarias';
    color = 'var(--accent-blue)';
  } else if (tipoCuenta === 'inversion') {
    titulo = 'Desglose Inversiones';
    color = 'var(--accent-green)';
  } else {
    titulo = 'Desglose Total General';
    color = 'var(--text-secondary)';
  }

  var filtered = cuentas.filter(function(c) {
    if (c.activa === false) return false;
    if (tipoCuenta && c.tipo !== tipoCuenta) return false;
    return true;
  });

  var totalMXN = 0;
  var rows = filtered.sort(function(a, b) {
    return toMXN(b.saldo, b.moneda, tiposCambio) - toMXN(a.saldo, a.moneda, tiposCambio);
  }).map(function(c) {
    var valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
    totalMXN += valMXN;
    var instNombre = instMap[c.institucion_id] || '\u2014';

    // Rendimiento
    var rendAnual = c.rendimiento_anual || 0;
    var histCta = c.historial_saldos || [];
    if (histCta.length > 0) {
      var ultCierre = histCta.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); })[0];
      if (ultCierre.rendimiento_pct_anual != null) rendAnual = ultCierre.rendimiento_pct_anual;
    }
    var rendHTML = rendAnual !== 0
      ? '<span style="color:' + (rendAnual > 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';font-weight:600;">' + (rendAnual >= 0 ? '+' : '') + Number(rendAnual).toFixed(2) + '%</span>'
      : '<span style="color:var(--text-muted);">\u2014</span>';

    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + c.nombre + '</td>' +
      '<td>' + instNombre + '</td>' +
      '<td><span class="badge ' + monedaBadgeClass(c.moneda) + '">' + c.moneda + '</span></td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(c.saldo, c.moneda) + '</td>' +
      (c.moneda !== 'MXN' ? '<td style="text-align:right;color:var(--text-muted);">' + formatCurrency(valMXN, 'MXN') + '</td>' : '<td style="text-align:right;color:var(--text-muted);">\u2014</td>') +
      '<td style="text-align:right;">' + rendHTML + '</td>' +
    '</tr>';
  }).join('');

  rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
    '<td colspan="3">Total (' + filtered.length + ' cuenta' + (filtered.length !== 1 ? 's' : '') + ')</td>' +
    '<td style="text-align:right;color:' + color + ';">' + formatCurrency(totalMXN, 'MXN') + '</td>' +
    '<td></td><td></td>' +
  '</tr>';

  var html = '<table class="data-table sortable-table"><thead><tr>' +
    '<th>Nombre</th><th>Institucion</th><th>Moneda</th><th style="text-align:right;">Saldo</th><th style="text-align:right;">Valor MXN</th><th style="text-align:right;">Rend. %</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';

  openModal(titulo, html);
  var mc = document.getElementById('modalContent');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
}

/* -- Open modal to create or edit a cuenta -- */
function editCuenta(id) {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];

  // If editing, find existing cuenta
  let cuenta = null;
  if (id) {
    cuenta = cuentas.find(c => c.id === id);
  }

  const isEdit = !!cuenta;
  const titulo = isEdit ? 'Editar Cuenta' : 'Nueva Cuenta';

  // Build institution options
  const instOpciones = instituciones.map(i => {
    const selected = cuenta && cuenta.institucion_id === i.id ? 'selected' : '';
    return `<option value="${i.id}" ${selected}>${i.nombre}</option>`;
  }).join('');

  const formHTML = `
    <form id="formCuenta" onsubmit="saveCuenta(event)">
      <input type="hidden" id="cuentaId" value="${isEdit ? cuenta.id : ''}">

      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input type="text" id="cuentaNombre" class="form-input" required
               value="${isEdit ? cuenta.nombre : ''}" placeholder="Ej: BBVA Nomina">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select id="cuentaTipo" class="form-select" required onchange="toggleRendimientoField()">
            <option value="debito" ${isEdit && cuenta.tipo === 'debito' ? 'selected' : ''}>Debito</option>
            <option value="inversion" ${isEdit && cuenta.tipo === 'inversion' ? 'selected' : ''}>Inversion</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Moneda *</label>
          <select id="cuentaMoneda" class="form-select" required>
            <option value="MXN" ${isEdit && cuenta.moneda === 'MXN' ? 'selected' : ''}>MXN</option>
            <option value="USD" ${isEdit && cuenta.moneda === 'USD' ? 'selected' : ''}>USD</option>
            <option value="EUR" ${isEdit && cuenta.moneda === 'EUR' ? 'selected' : ''}>EUR</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Institucion *</label>
        <select id="cuentaInstitucion" class="form-select" required>
          <option value="">Seleccionar institucion...</option>
          ${instOpciones}
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Saldo de Apertura *</label>
          <input type="number" id="cuentaSaldo" class="form-input" required step="0.01" min="0"
                 value="${isEdit ? (cuenta.saldo_inicial != null ? cuenta.saldo_inicial : cuenta.saldo) : ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Apertura</label>
          <input type="date" id="cuentaFechaSaldoInicial" class="form-input"
                 value="${isEdit && cuenta.fecha_saldo_inicial ? cuenta.fecha_saldo_inicial : ''}">
        </div>
        <div class="form-group" id="rendimientoGroup" style="display:${(isEdit && cuenta.tipo === 'inversion') || (!isEdit) ? 'block' : 'none'};">
          <label class="form-label" id="rendimientoLabel">Rendimiento Anual (%)</label>
          <input type="number" id="cuentaRendimiento" class="form-input" step="0.01" min="0" max="100"
                 value="${isEdit && cuenta.rendimiento_anual ? cuenta.rendimiento_anual : ''}" placeholder="Ej: 10.5">
        </div>
      </div>

      <!-- Subtipo para inversiones -->
      <div class="form-group" id="subtipoGroup" style="display:${(isEdit && cuenta.tipo === 'inversion') || (!isEdit) ? 'block' : 'none'};">
        <label class="form-label">Subtipo de inversion</label>
        <select id="cuentaSubtipo" class="form-select" onchange="toggleSubtipoFields()">
          <option value="" ${isEdit && !cuenta.subtipo ? 'selected' : ''}>General</option>
          <option value="pagare" ${isEdit && cuenta.subtipo === 'pagare' ? 'selected' : ''}>Pagare a plazo fijo</option>
          <option value="renta_variable" ${isEdit && cuenta.subtipo === 'renta_variable' ? 'selected' : ''}>Renta variable</option>
          <option value="accion_club" ${isEdit && cuenta.subtipo === 'accion_club' ? 'selected' : ''}>Accion / Membresia</option>
        </select>
      </div>

      <!-- Campos Pagare -->
      <div id="pagareFields" style="display:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Fecha Inicio</label>
            <input type="date" id="cuentaPagareFechaInicio" class="form-input"
                   value="${isEdit && cuenta.pagare_fecha_inicio ? cuenta.pagare_fecha_inicio.substring(0, 10) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Termino</label>
            <input type="date" id="cuentaPagareFechaTermino" class="form-input"
                   value="${isEdit && cuenta.pagare_fecha_termino ? cuenta.pagare_fecha_termino.substring(0, 10) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Tasa de Interes (%)</label>
            <input type="number" id="cuentaPagareTasa" class="form-input" step="0.01" min="0" max="100"
                   value="${isEdit && cuenta.pagare_tasa ? cuenta.pagare_tasa : ''}" placeholder="Ej: 11.5">
          </div>
        </div>
        <div id="pagareResumen" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;"></div>
      </div>

      <!-- Campos Renta Variable -->
      <div id="rentaVarFields" style="display:none;">
        <div style="margin-bottom:12px;">
          <label class="form-label">Historial de Saldos</label>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
            <i class="fas fa-info-circle" style="margin-right:4px;"></i>Registra los saldos actualizados con su fecha de captura.
          </div>
          <table class="data-table" id="tablaRentaVarHistorial" style="font-size:13px;">
            <thead>
              <tr>
                <th style="min-width:130px;">Fecha</th>
                <th style="min-width:120px;">Saldo</th>
                <th style="width:50px;"></th>
              </tr>
            </thead>
            <tbody id="tbodyRentaVarHistorial">
            </tbody>
          </table>
          <button type="button" class="btn btn-secondary" style="margin-top:8px;padding:4px 10px;font-size:11px;" onclick="agregarFilaRentaVar()">
            <i class="fas fa-plus"></i> Agregar Registro
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea id="cuentaNotas" class="form-input" rows="3" style="resize:vertical;"
                  placeholder="Notas adicionales...">${isEdit && cuenta.notas ? cuenta.notas : ''}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Cuenta'}
        </button>
      </div>
    </form>
  `;

  openModal(titulo, formHTML);

  // Ensure rendimiento field visibility matches the current tipo
  toggleRendimientoField();
}

/* -- Toggle rendimiento field visibility based on tipo -- */
function toggleRendimientoField() {
  const tipoSelect = document.getElementById('cuentaTipo');
  const rendGroup = document.getElementById('rendimientoGroup');
  const subtipoGroup = document.getElementById('subtipoGroup');
  if (tipoSelect && rendGroup) {
    const isInversion = tipoSelect.value === 'inversion';
    rendGroup.style.display = isInversion ? 'block' : 'none';
    if (subtipoGroup) subtipoGroup.style.display = isInversion ? 'block' : 'none';
    if (!isInversion) {
      // Hide subtipo-specific fields
      const pagareFields = document.getElementById('pagareFields');
      const rentaVarFields = document.getElementById('rentaVarFields');
      if (pagareFields) pagareFields.style.display = 'none';
      if (rentaVarFields) rentaVarFields.style.display = 'none';
    } else {
      toggleSubtipoFields();
    }
  }
}

function toggleSubtipoFields() {
  const subtipo = document.getElementById('cuentaSubtipo') ? document.getElementById('cuentaSubtipo').value : '';
  const pagareFields = document.getElementById('pagareFields');
  const rentaVarFields = document.getElementById('rentaVarFields');

  if (pagareFields) pagareFields.style.display = subtipo === 'pagare' ? 'block' : 'none';
  if (rentaVarFields) rentaVarFields.style.display = subtipo === 'renta_variable' ? 'block' : 'none';

  // Calculate pagare summary if applicable
  if (subtipo === 'pagare') {
    calcularResumenPagare();
  }

  // Populate renta variable historial if applicable
  if (subtipo === 'renta_variable') {
    poblarHistorialRentaVar();
  }
}

function calcularResumenPagare() {
  const fechaInicio = document.getElementById('cuentaPagareFechaInicio') ? document.getElementById('cuentaPagareFechaInicio').value : '';
  const fechaTermino = document.getElementById('cuentaPagareFechaTermino') ? document.getElementById('cuentaPagareFechaTermino').value : '';
  const tasa = parseFloat(document.getElementById('cuentaPagareTasa') ? document.getElementById('cuentaPagareTasa').value : 0) || 0;
  const saldo = parseFloat(document.getElementById('cuentaSaldo') ? document.getElementById('cuentaSaldo').value : 0) || 0;
  const resumenEl = document.getElementById('pagareResumen');

  if (resumenEl && fechaInicio && fechaTermino) {
    const d1 = new Date(fechaInicio);
    const d2 = new Date(fechaTermino);
    const dias = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    const interesEstimado = saldo * (tasa / 100) * (dias / 365);
    resumenEl.innerHTML = `<i class="fas fa-calculator" style="margin-right:4px;color:var(--accent-green);"></i>` +
      `Plazo: <strong>${dias} dias</strong> | ` +
      `Interes estimado: <strong class="text-green">${formatCurrency(interesEstimado, 'MXN')}</strong>`;
  }
}

function poblarHistorialRentaVar() {
  const tbody = document.getElementById('tbodyRentaVarHistorial');
  if (!tbody || tbody.children.length > 0) return; // Already populated

  // Load existing historial if editing
  const id = document.getElementById('cuentaId') ? document.getElementById('cuentaId').value : '';
  if (id) {
    const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
    const cuenta = cuentas.find(c => c.id === id);
    if (cuenta && cuenta.historial_saldos && cuenta.historial_saldos.length > 0) {
      cuenta.historial_saldos.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="date" class="form-input rv-fecha" value="${h.fecha.substring(0, 10)}" style="padding:5px 8px;font-size:12px;"></td>
          <td><input type="number" class="form-input rv-saldo" value="${h.saldo}" step="0.01" style="padding:5px 8px;font-size:12px;"></td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-danger" style="padding:3px 6px;font-size:10px;" onclick="this.closest('tr').remove();">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}

function agregarFilaRentaVar() {
  const tbody = document.getElementById('tbodyRentaVarHistorial');
  if (!tbody) return;
  const tr = document.createElement('tr');
  const hoy = new Date().toISOString().substring(0, 10);
  tr.innerHTML = `
    <td><input type="date" class="form-input rv-fecha" value="${hoy}" style="padding:5px 8px;font-size:12px;"></td>
    <td><input type="number" class="form-input rv-saldo" value="" step="0.01" placeholder="0.00" style="padding:5px 8px;font-size:12px;"></td>
    <td style="text-align:center;">
      <button type="button" class="btn btn-danger" style="padding:3px 6px;font-size:10px;" onclick="this.closest('tr').remove();">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

/* -- Save (create or update) a cuenta -- */
function saveCuenta(event) {
  event.preventDefault();

  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const id = document.getElementById('cuentaId').value;
  const nombre = document.getElementById('cuentaNombre').value.trim();
  const tipo = document.getElementById('cuentaTipo').value;
  const moneda = document.getElementById('cuentaMoneda').value;
  const institucion_id = document.getElementById('cuentaInstitucion').value;
  const saldo = parseFloat(document.getElementById('cuentaSaldo').value) || 0;
  const fecha_saldo_inicial = document.getElementById('cuentaFechaSaldoInicial') ? document.getElementById('cuentaFechaSaldoInicial').value : '';
  const rendimiento_anual = tipo === 'inversion'
    ? (parseFloat(document.getElementById('cuentaRendimiento').value) || 0)
    : 0;
  const subtipo = tipo === 'inversion' && document.getElementById('cuentaSubtipo')
    ? document.getElementById('cuentaSubtipo').value : '';

  // Pagare fields
  const pagare_fecha_inicio = subtipo === 'pagare' && document.getElementById('cuentaPagareFechaInicio')
    ? document.getElementById('cuentaPagareFechaInicio').value : '';
  const pagare_fecha_termino = subtipo === 'pagare' && document.getElementById('cuentaPagareFechaTermino')
    ? document.getElementById('cuentaPagareFechaTermino').value : '';
  const pagare_tasa = subtipo === 'pagare' && document.getElementById('cuentaPagareTasa')
    ? (parseFloat(document.getElementById('cuentaPagareTasa').value) || 0) : 0;

  // Renta variable fields
  let historial_saldos = [];
  if (subtipo === 'renta_variable') {
    const rvRows = document.querySelectorAll('#tablaRentaVarHistorial tbody tr');
    rvRows.forEach(tr => {
      const fecha = tr.querySelector('.rv-fecha') ? tr.querySelector('.rv-fecha').value : '';
      const saldoVal = parseFloat(tr.querySelector('.rv-saldo') ? tr.querySelector('.rv-saldo').value : 0) || 0;
      if (fecha && saldoVal > 0) {
        historial_saldos.push({ fecha: fecha, saldo: saldoVal });
      }
    });
  }

  const notas = document.getElementById('cuentaNotas').value.trim();

  if (!nombre || !institucion_id) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    // Update existing
    const idx = cuentas.findIndex(c => c.id === id);
    if (idx !== -1) {
      cuentas[idx].nombre = nombre;
      cuentas[idx].tipo = tipo;
      cuentas[idx].moneda = moneda;
      cuentas[idx].institucion_id = institucion_id;
      // Allow editing saldo_inicial; recalculate saldo if needed
      var oldSaldoInicial = cuentas[idx].saldo_inicial != null ? cuentas[idx].saldo_inicial : cuentas[idx].saldo;
      if (saldo !== oldSaldoInicial) {
        var diff = saldo - oldSaldoInicial;
        cuentas[idx].saldo_inicial = saldo;
        cuentas[idx].saldo = (cuentas[idx].saldo || 0) + diff;
      }
      if (fecha_saldo_inicial) cuentas[idx].fecha_saldo_inicial = fecha_saldo_inicial;
      cuentas[idx].rendimiento_anual = rendimiento_anual;
      cuentas[idx].subtipo = subtipo;
      cuentas[idx].pagare_fecha_inicio = pagare_fecha_inicio;
      cuentas[idx].pagare_fecha_termino = pagare_fecha_termino;
      cuentas[idx].pagare_tasa = pagare_tasa;
      cuentas[idx].historial_saldos = historial_saldos;
      cuentas[idx].notas = notas;
      cuentas[idx].updated = new Date().toISOString();
    }
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Cuenta actualizada exitosamente.', 'success');
  } else {
    // Create new
    const nuevaCuenta = {
      id: uuid(),
      nombre: nombre,
      tipo: tipo,
      moneda: moneda,
      institucion_id: institucion_id,
      saldo: saldo,
      saldo_inicial: saldo,
      fecha_saldo_inicial: fecha_saldo_inicial,
      rendimiento_anual: rendimiento_anual,
      subtipo: subtipo,
      pagare_fecha_inicio: pagare_fecha_inicio,
      pagare_fecha_termino: pagare_fecha_termino,
      pagare_tasa: pagare_tasa,
      historial_saldos: historial_saldos,
      notas: notas,
      activa: true,
      created: new Date().toISOString(),
    };
    cuentas.push(nuevaCuenta);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Cuenta creada exitosamente.', 'success');
  }

  closeModal();
  renderCuentas();
  updateHeaderPatrimonio();
}

/* -- Delete a cuenta permanently -- */
function deleteCuenta(id) {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const cuenta = cuentas.find(c => c.id === id);
  if (!cuenta) return;

  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const movsCount = movimientos.filter(m => m.cuenta_id === id).length;
  var msg = '\u00BFEstas seguro de ELIMINAR la cuenta "' + cuenta.nombre + '"?\n\nEsta accion es permanente y no se puede deshacer.';
  if (movsCount > 0) msg += '\n\nNota: La cuenta tiene ' + movsCount + ' movimiento(s) asociado(s) que tambien se eliminaran.';

  const confirmar = confirm(msg);
  if (!confirmar) return;

  // Remove associated movimientos
  const newMovimientos = movimientos.filter(m => m.cuenta_id !== id);
  saveData(STORAGE_KEYS.movimientos, newMovimientos);

  // Remove associated rendimientos
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const newRendimientos = rendimientos.filter(r => r.cuenta_id !== id);
  saveData(STORAGE_KEYS.rendimientos, newRendimientos);

  // Remove the cuenta
  const newCuentas = cuentas.filter(c => c.id !== id);
  saveData(STORAGE_KEYS.cuentas, newCuentas);

  showToast('Cuenta "' + cuenta.nombre + '" eliminada permanentemente.', 'info');
  renderCuentas();
  updateHeaderPatrimonio();
}

/* ============================================================
   CIERRE MENSUAL DE CUENTAS
   ============================================================ */
function _getUltimoCierre(cuenta) {
  var h = cuenta.historial_saldos || [];
  if (h.length === 0) return cuenta.fecha_saldo_inicial || cuenta.created || '';
  var sorted = h.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
  return sorted[0].fecha || '';
}

function _getSaldoInicioCierre(cuenta) {
  var h = cuenta.historial_saldos || [];
  if (h.length === 0) return cuenta.saldo_inicial != null ? cuenta.saldo_inicial : cuenta.saldo;
  var sorted = h.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
  return sorted[0].saldo_final != null ? sorted[0].saldo_final : sorted[0].saldo;
}

function _calcMovimientosNetos(cuentaId, desdeExcl) {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var ingresos = 0, gastos = 0;
  movimientos.forEach(function(m) {
    if (m.cuenta_id !== cuentaId) return;
    if (desdeExcl && m.fecha <= desdeExcl) return;
    if (m.tipo === 'ingreso') ingresos += m.monto;
    else if (m.tipo === 'gasto') gastos += m.monto;
  });
  return { ingresos: ingresos, gastos: gastos, neto: ingresos - gastos };
}

function cierreMensual() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const activas = cuentas.filter(c => c.activa !== false);
  if (activas.length === 0) { showToast('No hay cuentas activas.', 'warning'); return; }

  var hoy = new Date();
  var fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  var filas = activas.map(function(c) {
    var ultimoCierre = _getUltimoCierre(c);
    var saldoInicioPeriodo = _getSaldoInicioCierre(c);
    var movNetos = _calcMovimientosNetos(c.id, ultimoCierre);
    var esDebito = c.tipo === 'debito';
    var histCta = c.historial_saldos || [];
    var ultCierreLabel = histCta.length > 0 ? '<span style="font-size:10px;color:var(--accent-blue);"><i class="fas fa-calendar-check" style="margin-right:3px;"></i>Ult. cierre: ' + formatDate(ultimoCierre) + '</span>' : '<span style="font-size:10px;color:var(--text-muted);font-style:italic;">Sin cierres previos</span>';
    var rendCell = esDebito
      ? '<td style="text-align:right;white-space:nowrap;color:var(--text-muted);font-size:11px;">N/A</td>'
      : '<td style="text-align:right;white-space:nowrap;" class="cierre-rend-cell" data-cuenta-id="' + c.id + '"><span style="color:var(--text-muted);">\u2014</span></td>';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);white-space:nowrap;">' + c.nombre + ' <span class="badge ' + monedaBadgeClass(c.moneda) + '" style="font-size:10px;">' + c.moneda + '</span>' +
      '<br>' + ultCierreLabel +
      (esDebito ? '' : '<br><span style="font-size:10px;color:var(--text-muted);">Movs: +' + formatCurrency(movNetos.ingresos, c.moneda) + ' / -' + formatCurrency(movNetos.gastos, c.moneda) + '</span>') + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);white-space:nowrap;">' + formatCurrency(saldoInicioPeriodo, c.moneda) + '</td>' +
      '<td><input type="date" class="form-input cierre-fecha" data-cuenta-id="' + c.id + '" value="' + fechaHoy + '" style="padding:5px 8px;font-size:13px;min-height:auto;" onchange="recalcCierreRendimientoByDate(this)"></td>' +
      '<td><input type="number" class="form-input cierre-saldo-final" data-cuenta-id="' + c.id + '" data-tipo="' + c.tipo + '" data-saldo-inicio="' + saldoInicioPeriodo + '" data-mov-neto="' + movNetos.neto + '" data-fecha-ultimo-cierre="' + ultimoCierre + '" step="0.01" min="0" placeholder="Saldo final" style="padding:5px 8px;font-size:13px;min-width:110px;min-height:auto;" oninput="recalcCierreRendimiento(this)"></td>' +
      rendCell +
      '</tr>';
  }).join('');

  var formHTML = '<form id="formCierreMensual" onsubmit="saveCierreMensual(event)">' +
    '<div style="margin-bottom:16px;">' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">' +
    '<i class="fas fa-info-circle" style="margin-right:4px;color:var(--accent-blue);"></i>Ingresa la fecha y saldo final de cada cuenta. El rendimiento se calcula descontando los movimientos del periodo y se anualiza segun los dias transcurridos.</div>' +
    '</div>' +
    '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table class="data-table" style="min-width:0;"><thead><tr>' +
    '<th>Cuenta</th><th style="text-align:right;">Saldo Inicial</th><th>Fecha</th><th>Saldo Final</th><th style="text-align:right;">Rendimiento</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeCierreModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Cierre</button>' +
    '</div></form>';

  openModal('Cierre de Cuentas', formHTML);
  document.querySelector('.modal-content').classList.add('modal-wide');
}

function closeCierreModal() {
  document.querySelector('.modal-content').classList.remove('modal-wide');
  closeModal();
}

function _calcDiasEntreFechas(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return 0;
  var d1 = new Date(fechaDesde + 'T00:00:00');
  var d2 = new Date(fechaHasta + 'T00:00:00');
  var diff = d2.getTime() - d1.getTime();
  return Math.max(Math.round(diff / (1000 * 60 * 60 * 24)), 1);
}

function recalcCierreRendimiento(inputEl) {
  var cuentaId = inputEl.getAttribute('data-cuenta-id');
  var tipoCuenta = inputEl.getAttribute('data-tipo') || '';
  if (tipoCuenta === 'debito') return;

  var saldoInicio = parseFloat(inputEl.getAttribute('data-saldo-inicio')) || 0;
  var saldoFinal = parseFloat(inputEl.value) || 0;
  var movNeto = parseFloat(inputEl.getAttribute('data-mov-neto')) || 0;
  var fechaUltimoCierre = inputEl.getAttribute('data-fecha-ultimo-cierre') || '';
  var fechaInput = document.querySelector('.cierre-fecha[data-cuenta-id="' + cuentaId + '"]');
  var fechaCierre = fechaInput ? fechaInput.value : '';
  var dias = _calcDiasEntreFechas(fechaUltimoCierre, fechaCierre);

  // Rendimiento = saldo nuevo - saldo anterior (diferencia simple)
  var rend = saldoFinal - saldoInicio;
  var rendPct = saldoInicio > 0 ? ((rend / saldoInicio) * 100) : 0;
  var rendPctAnual = (saldoInicio > 0 && dias > 0) ? ((rend / saldoInicio) * (365 / dias) * 100) : 0;

  var cell = document.querySelector('.cierre-rend-cell[data-cuenta-id="' + cuentaId + '"]');
  if (cell) {
    if (inputEl.value === '') {
      cell.innerHTML = '<span style="color:var(--text-muted);">\u2014</span>';
    } else {
      var color = rend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var sign = rend >= 0 ? '+' : '';
      cell.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + sign + formatCurrency(rend, 'MXN') + '</span>' +
        '<br><span style="font-size:11px;color:' + color + ';">' + sign + rendPct.toFixed(2) + '% en ' + dias + 'd</span>' +
        '<br><span style="font-size:10px;color:' + color + ';opacity:0.8;">(' + sign + rendPctAnual.toFixed(2) + '% anual)</span>';
    }
  }
}

function recalcCierreRendimientoByDate(fechaInput) {
  var cuentaId = fechaInput.getAttribute('data-cuenta-id');
  var saldoInput = document.querySelector('.cierre-saldo-final[data-cuenta-id="' + cuentaId + '"]');
  if (saldoInput && saldoInput.value !== '') {
    recalcCierreRendimiento(saldoInput);
  }
}

function saveCierreMensual(event) {
  event.preventDefault();

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var inputs = document.querySelectorAll('.cierre-saldo-final');
  var cambios = 0;

  inputs.forEach(function(input) {
    if (input.value === '' || input.value === null) return;
    var cuentaId = input.getAttribute('data-cuenta-id');
    var tipoCuenta = input.getAttribute('data-tipo') || '';
    var saldoInicio = parseFloat(input.getAttribute('data-saldo-inicio')) || 0;
    var saldoFinal = parseFloat(input.value) || 0;
    var movNeto = parseFloat(input.getAttribute('data-mov-neto')) || 0;
    var fechaUltimoCierre = input.getAttribute('data-fecha-ultimo-cierre') || '';

    // Get individual date for this account
    var fechaInput = document.querySelector('.cierre-fecha[data-cuenta-id="' + cuentaId + '"]');
    var fecha = fechaInput ? fechaInput.value : new Date().toISOString().slice(0, 10);
    if (!fecha) { return; }
    var periodo = fecha.slice(0, 7); // YYYY-MM

    // Calculate days between ultimo cierre and this cierre
    var dias = _calcDiasEntreFechas(fechaUltimoCierre, fecha);

    // Las cuentas de debito no generan rendimiento
    // Rendimiento = diferencia total (saldoFinal - saldoInicio)
    // movNeto se guarda para referencia pero NO se descuenta del rendimiento
    var esDebito = tipoCuenta === 'debito';
    var diff = saldoFinal - saldoInicio;
    var rend = esDebito ? 0 : diff;
    var rendPct = (!esDebito && saldoInicio > 0) ? ((rend / saldoInicio) * 100) : 0;
    var rendPctAnual = (!esDebito && saldoInicio > 0 && dias > 0) ? ((rend / saldoInicio) * (365 / dias) * 100) : 0;

    var ctaIdx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
    if (ctaIdx === -1) return;

    // Update account balance
    cuentas[ctaIdx].saldo = saldoFinal;
    cuentas[ctaIdx].updated = new Date().toISOString();

    // Add to historial_saldos
    if (!cuentas[ctaIdx].historial_saldos) cuentas[ctaIdx].historial_saldos = [];
    cuentas[ctaIdx].historial_saldos.push({
      fecha: fecha,
      saldo_inicio: saldoInicio,
      saldo_final: saldoFinal,
      movimientos_neto: movNeto,
      rendimiento: rend,
      dias: dias,
      rendimiento_pct: rendPct,
      rendimiento_pct_anual: rendPctAnual
    });

    // Create rendimiento record (solo para cuentas que no son debito)
    if (!esDebito) {
      rendimientos.push({
        id: uuid(),
        cuenta_id: cuentaId,
        periodo: periodo,
        saldo_inicial: saldoInicio,
        saldo_final: saldoFinal,
        movimientos_neto: movNeto,
        rendimiento_monto: rend,
        rendimiento_pct: rendPct,
        rendimiento_pct_anual: rendPctAnual,
        dias: dias,
        fecha: fecha,
        created: new Date().toISOString()
      });
    }

    cambios++;
  });

  if (cambios === 0) { showToast('No se capturo ningun saldo final.', 'warning'); return; }

  saveData(STORAGE_KEYS.cuentas, cuentas);
  saveData(STORAGE_KEYS.rendimientos, rendimientos);
  closeCierreModal();
  showToast('Cierre guardado para ' + cambios + ' cuenta' + (cambios > 1 ? 's' : '') + '.', 'success');
  renderCuentas();
  updateHeaderPatrimonio();

  // Check if any cierred accounts are pagarés — offer renewal
  var pagaresCierrados = [];
  inputs.forEach(function(input) {
    if (input.value === '' || input.value === null) return;
    var cuentaId = input.getAttribute('data-cuenta-id');
    var cta = cuentas.find(function(c) { return c.id === cuentaId; });
    if (cta && cta.subtipo === 'pagare') {
      var fechaInput = document.querySelector('.cierre-fecha[data-cuenta-id="' + cuentaId + '"]');
      var fechaCierre = fechaInput ? fechaInput.value : '';
      pagaresCierrados.push({
        id: cta.id,
        nombre: cta.nombre,
        moneda: cta.moneda,
        saldoFinal: parseFloat(input.value) || 0,
        fechaCierre: fechaCierre,
        tasaAnterior: cta.pagare_tasa || 0
      });
    }
  });

  if (pagaresCierrados.length > 0) {
    _mostrarRenovacionPagares(pagaresCierrados);
  }
}

/* ============================================================
   RENOVACION DE PAGARES POST-CIERRE
   ============================================================ */
function _mostrarRenovacionPagares(pagares) {
  var filas = pagares.map(function(p) {
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);white-space:nowrap;">' + p.nombre +
        ' <span class="badge ' + monedaBadgeClass(p.moneda) + '" style="font-size:10px;">' + p.moneda + '</span>' +
        '<br><span style="font-size:11px;color:var(--text-muted);">Saldo: ' + formatCurrency(p.saldoFinal, p.moneda) + '</span>' +
      '</td>' +
      '<td style="white-space:nowrap;"><input type="date" class="form-input renov-fecha-inicio" data-cuenta-id="' + p.id + '" value="' + p.fechaCierre + '" style="padding:5px 8px;font-size:13px;min-height:auto;"></td>' +
      '<td><input type="date" class="form-input renov-fecha-termino" data-cuenta-id="' + p.id + '" style="padding:5px 8px;font-size:13px;min-height:auto;"></td>' +
      '<td><input type="number" class="form-input renov-tasa" data-cuenta-id="' + p.id + '" step="0.01" min="0" max="100" value="' + p.tasaAnterior + '" placeholder="%" style="padding:5px 8px;font-size:13px;min-width:80px;min-height:auto;"></td>' +
      '</tr>';
  }).join('');

  var html = '<div style="margin-bottom:16px;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<div style="width:36px;height:36px;border-radius:8px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">' +
        '<i class="fas fa-redo" style="color:var(--accent-amber);font-size:14px;"></i>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:14px;font-weight:700;color:var(--text-primary);">Renovacion de Pagares</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">Los siguientes pagares finalizaron su plazo. Ingresa los datos del nuevo plazo.</div>' +
      '</div>' +
    '</div>' +
    '</div>' +
    '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table class="data-table" style="min-width:0;"><thead><tr>' +
    '<th>Pagare</th><th>Nueva Fecha Inicio</th><th>Nueva Fecha Termino</th><th>Nueva Tasa (%)</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Omitir</button>' +
    '<button type="button" class="btn btn-primary" onclick="_guardarRenovacionPagares()"><i class="fas fa-save"></i> Renovar Pagares</button>' +
    '</div>';

  openModal('Renovacion de Pagares', html);
  // Make the modal wider for pagaré renewal
  var modalContent = document.getElementById('modalContent');
  if (modalContent) modalContent.classList.add('modal-wide');
}

function _guardarRenovacionPagares() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var inputs = document.querySelectorAll('.renov-fecha-termino');
  var renovados = 0;

  inputs.forEach(function(input) {
    var cuentaId = input.getAttribute('data-cuenta-id');
    var fechaTermino = input.value;
    if (!fechaTermino) return;

    var fechaInicioInput = document.querySelector('.renov-fecha-inicio[data-cuenta-id="' + cuentaId + '"]');
    var tasaInput = document.querySelector('.renov-tasa[data-cuenta-id="' + cuentaId + '"]');
    var fechaInicio = fechaInicioInput ? fechaInicioInput.value : '';
    var tasa = tasaInput ? (parseFloat(tasaInput.value) || 0) : 0;

    var idx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
    if (idx === -1) return;

    // Update pagaré fields with the new plazo
    cuentas[idx].pagare_fecha_inicio = fechaInicio;
    cuentas[idx].pagare_fecha_termino = fechaTermino;
    cuentas[idx].pagare_tasa = tasa;
    cuentas[idx].rendimiento_anual = tasa;

    // The cierre date becomes the new apertura date
    cuentas[idx].fecha_saldo_inicial = fechaInicio;
    cuentas[idx].saldo_inicial = cuentas[idx].saldo;

    // Also update fecha_vencimiento for dashboard alerts
    cuentas[idx].fecha_vencimiento = fechaTermino;

    cuentas[idx].updated = new Date().toISOString();
    renovados++;
  });

  if (renovados === 0) {
    closeModal();
    return;
  }

  saveData(STORAGE_KEYS.cuentas, cuentas);
  closeModal();
  showToast(renovados + ' pagare' + (renovados > 1 ? 's' : '') + ' renovado' + (renovados > 1 ? 's' : '') + ' con nuevo plazo.', 'success');
  renderCuentas();
  updateHeaderPatrimonio();
}

/* ============================================================
   HISTORIAL DE SALDOS POR CUENTA
   ============================================================ */
function verHistorialCuenta(cuentaId) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) return;
  var historial = cuenta.historial_saldos || [];
  var moneda = cuenta.moneda || 'MXN';

  var tablaHTML = '';
  if (historial.length === 0) {
    tablaHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-chart-bar" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>No hay historial de saldos.<br><span style="font-size:12px;">Usa "Cierre Mensual" para registrar saldos al final de cada mes.</span></div>';
  } else {
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var sorted = [...historial].sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    var rows = sorted.map(function(h, sortedIdx) {
      // Find the original index in historial array
      var origIdx = historial.indexOf(h);
      var sInicio = h.saldo_inicio != null ? h.saldo_inicio : h.saldo;
      var sFinal = h.saldo_final != null ? h.saldo_final : h.saldo;
      var rend = h.rendimiento != null ? h.rendimiento : (sFinal - sInicio);
      var rendPct = h.rendimiento_pct != null ? h.rendimiento_pct : (sInicio > 0 ? ((rend / sInicio) * 100) : 0);
      var dias = h.dias || 0;
      var rendPctAnual = h.rendimiento_pct_anual != null ? h.rendimiento_pct_anual : (sInicio > 0 && dias > 0 ? ((rend / sInicio) * (365 / dias) * 100) : rendPct);
      var rendColor = rend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var rendSign = rend >= 0 ? '+' : '';
      // Fecha legible: "Ene 2026 (30d)"
      var fechaLabel = '\u2014';
      if (h.fecha) {
        var parts = h.fecha.split('-');
        var mesIdx = parseInt(parts[1], 10) - 1;
        fechaLabel = meses[mesIdx] + ' ' + parts[0];
      }
      var diasLabel = dias > 0 ? '<br><span style="font-size:10px;color:var(--text-muted);">' + dias + ' dias</span>' : '';
      // Rendimiento compacto: monto + % periodo + % anual en una celda
      var rendHTML = rendSign + formatCurrency(rend, moneda) +
        '<br><span style="font-size:10px;color:' + rendColor + ';">' + rendSign + rendPct.toFixed(2) + '% &middot; ' + rendSign + rendPctAnual.toFixed(2) + '% anual</span>';
      return '<tr>' +
        '<td style="font-weight:600;">' + fechaLabel + diasLabel + '</td>' +
        '<td style="text-align:right;font-size:12px;">' + formatCurrency(sInicio, moneda) + '</td>' +
        '<td style="text-align:right;font-weight:600;font-size:12px;">' + formatCurrency(sFinal, moneda) + '</td>' +
        '<td style="text-align:right;color:' + rendColor + ';font-weight:600;font-size:12px;">' + rendHTML + '</td>' +
        '<td style="text-align:center;white-space:nowrap;">' +
        '<button class="btn btn-secondary" style="padding:3px 7px;font-size:10px;margin-right:3px;" onclick="editCierreHistorial(\'' + cuentaId + '\',' + origIdx + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
        '<button class="btn btn-danger" style="padding:3px 7px;font-size:10px;" onclick="deleteCierreHistorial(\'' + cuentaId + '\',' + origIdx + ')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
        '</td></tr>';
    });
    tablaHTML = '<table class="data-table" style="font-size:13px;"><thead><tr>' +
      '<th>Periodo</th><th style="text-align:right;">Saldo Inicial</th><th style="text-align:right;">Saldo Final</th><th style="text-align:right;">Rendimiento</th><th style="text-align:center;">Acciones</th>' +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';

    // Chart data (chronological order)
    var chartSorted = [...historial].sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });
    tablaHTML += '<div style="margin-top:20px;"><canvas id="historialCuentaChart" height="200"></canvas></div>';

    // We'll render the chart after modal opens
    setTimeout(function() {
      var ctx = document.getElementById('historialCuentaChart');
      if (!ctx) return;
      var labels = chartSorted.map(function(h) { return h.fecha ? h.fecha.substring(0, 7) : ''; });
      var data = chartSorted.map(function(h) { return h.saldo_final != null ? h.saldo_final : h.saldo; });
      var chartColorsTheme = (typeof getChartColors === 'function') ? getChartColors() : { gridColor: 'rgba(51,65,85,0.5)', fontColor: '#94a3b8' };
      new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Saldo',
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2.5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: chartColorsTheme.gridColor }, ticks: { color: chartColorsTheme.fontColor, font: { size: 11 } } },
            y: { grid: { color: chartColorsTheme.gridColor }, ticks: { color: chartColorsTheme.fontColor, font: { size: 11 }, callback: function(v) { return formatCurrency(v, moneda); } } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function(ctx2) { return formatCurrency(ctx2.parsed.y, moneda); } } }
          }
        }
      });
    }, 300);
  }

  var bodyHTML = '<div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Cuenta</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + cuenta.nombre + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Saldo Actual</div><div style="font-size:14px;font-weight:700;color:var(--accent-green);">' + formatCurrency(cuenta.saldo, moneda) + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Registros</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + historial.length + ' mes' + (historial.length !== 1 ? 'es' : '') + '</div></div>' +
    '</div></div>' +
    tablaHTML +
    '<div style="display:flex;justify-content:flex-end;margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>';

  openModal('Historial de Saldos: ' + cuenta.nombre, bodyHTML);
  document.querySelector('.modal-content').classList.add('modal-wide');
}

/* -- Edit a cierre in historial_saldos -- */
function editCierreHistorial(cuentaId, idx) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta || !cuenta.historial_saldos || !cuenta.historial_saldos[idx]) return;
  var h = cuenta.historial_saldos[idx];
  var moneda = cuenta.moneda || 'MXN';
  var esDebito = cuenta.tipo === 'debito';

  var formHTML = '<form id="formEditCierre" onsubmit="saveEditCierre(event, \'' + cuentaId + '\', ' + idx + ')">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Fecha</label>' +
    '<input type="date" id="editCierreFecha" class="form-input" required value="' + (h.fecha || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Dias</label>' +
    '<input type="number" id="editCierreDias" class="form-input" step="1" min="1" value="' + (h.dias || 0) + '"></div>' +
    '<div class="form-group"><label class="form-label">Saldo Inicial</label>' +
    '<input type="number" id="editCierreSaldoInicio" class="form-input" step="0.01" required value="' + (h.saldo_inicio != null ? h.saldo_inicio : h.saldo || 0) + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Saldo Final</label>' +
    '<input type="number" id="editCierreSaldoFinal" class="form-input" step="0.01" required value="' + (h.saldo_final != null ? h.saldo_final : h.saldo || 0) + '"></div>' +
    '<div class="form-group"><label class="form-label">Rendimiento (Saldo Final - Inicio)' + (esDebito ? ' (N/A debito)' : '') + '</label>' +
    '<input type="number" id="editCierreRendimiento" class="form-input" step="0.01" value="' + (h.rendimiento || 0) + '"' + (esDebito ? ' readonly style="opacity:0.5;"' : '') + '></div>' +
    '<div class="form-group"><label class="form-label">Rend. % Anual</label>' +
    '<input type="number" id="editCierreRendPctAnual" class="form-input" step="0.01" value="' + (h.rendimiento_pct_anual || 0).toFixed(2) + '" readonly style="opacity:0.7;"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="verHistorialCuenta(\'' + cuentaId + '\')">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>' +
    '</div></form>';

  openModal('Editar Cierre — ' + (h.fecha ? h.fecha.substring(0, 7) : ''), formHTML);
}

function saveEditCierre(event, cuentaId, idx) {
  event.preventDefault();
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var ctaIdx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
  if (ctaIdx === -1) return;
  var cuenta = cuentas[ctaIdx];
  if (!cuenta.historial_saldos || !cuenta.historial_saldos[idx]) return;

  var fecha = document.getElementById('editCierreFecha').value;
  var dias = parseInt(document.getElementById('editCierreDias').value) || 0;
  var saldoInicio = parseFloat(document.getElementById('editCierreSaldoInicio').value) || 0;
  var saldoFinal = parseFloat(document.getElementById('editCierreSaldoFinal').value) || 0;
  var rendimiento = parseFloat(document.getElementById('editCierreRendimiento').value) || 0;
  var esDebito = cuenta.tipo === 'debito';
  var rendPct = (!esDebito && saldoInicio > 0) ? ((rendimiento / saldoInicio) * 100) : 0;
  var rendPctAnual = (!esDebito && saldoInicio > 0 && dias > 0) ? ((rendimiento / saldoInicio) * (365 / dias) * 100) : rendPct;

  // Update the historial entry
  cuenta.historial_saldos[idx].fecha = fecha;
  cuenta.historial_saldos[idx].dias = dias;
  cuenta.historial_saldos[idx].saldo_inicio = saldoInicio;
  cuenta.historial_saldos[idx].saldo_final = saldoFinal;
  cuenta.historial_saldos[idx].rendimiento = esDebito ? 0 : rendimiento;
  cuenta.historial_saldos[idx].rendimiento_pct = esDebito ? 0 : rendPct;
  cuenta.historial_saldos[idx].rendimiento_pct_anual = esDebito ? 0 : rendPctAnual;

  // If this is the most recent cierre, update the account saldo to the saldo_final
  var sorted = [...cuenta.historial_saldos].sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
  if (sorted[0] === cuenta.historial_saldos[idx]) {
    cuenta.saldo = saldoFinal;
  }

  cuentas[ctaIdx] = cuenta;
  saveData(STORAGE_KEYS.cuentas, cuentas);

  // Also update matching rendimiento record
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var periodo = fecha.slice(0, 7);
  var rIdx = rendimientos.findIndex(function(r) {
    return r.cuenta_id === cuentaId && r.periodo === periodo;
  });
  if (rIdx !== -1) {
    rendimientos[rIdx].saldo_inicial = saldoInicio;
    rendimientos[rIdx].saldo_final = saldoFinal;
    rendimientos[rIdx].rendimiento_monto = rendimiento;
    rendimientos[rIdx].rendimiento_pct = rendPct;
    rendimientos[rIdx].rendimiento_pct_anual = rendPctAnual;
    rendimientos[rIdx].dias = dias;
    saveData(STORAGE_KEYS.rendimientos, rendimientos);
  }

  showToast('Cierre actualizado.', 'success');
  verHistorialCuenta(cuentaId);
  if (typeof renderCuentas === 'function') renderCuentas();
  if (typeof updateHeaderPatrimonio === 'function') updateHeaderPatrimonio();
}

/* -- Delete a cierre from historial_saldos -- */
function deleteCierreHistorial(cuentaId, idx) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var ctaIdx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
  if (ctaIdx === -1) return;
  var cuenta = cuentas[ctaIdx];
  if (!cuenta.historial_saldos || !cuenta.historial_saldos[idx]) return;

  var h = cuenta.historial_saldos[idx];
  var confirmar = confirm('\u00BFEliminar el cierre de ' + (h.fecha ? h.fecha.substring(0, 7) : 'fecha desconocida') + '?\n\nSaldo Inicial: ' + formatCurrency(h.saldo_inicio || 0, cuenta.moneda || 'MXN') + '\nSaldo Final: ' + formatCurrency(h.saldo_final || 0, cuenta.moneda || 'MXN'));
  if (!confirmar) return;

  // Remove from historial
  var removedFecha = h.fecha;
  cuenta.historial_saldos.splice(idx, 1);

  // If we removed the last cierre, revert saldo to previous cierre's saldo_final or saldo_inicial
  if (cuenta.historial_saldos.length > 0) {
    var sorted = [...cuenta.historial_saldos].sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    cuenta.saldo = sorted[0].saldo_final != null ? sorted[0].saldo_final : sorted[0].saldo;
  } else {
    // No more cierres, revert to saldo_inicial
    cuenta.saldo = cuenta.saldo_inicial != null ? cuenta.saldo_inicial : cuenta.saldo;
  }

  cuentas[ctaIdx] = cuenta;
  saveData(STORAGE_KEYS.cuentas, cuentas);

  // Remove matching rendimiento record
  if (removedFecha) {
    var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
    var periodo = removedFecha.slice(0, 7);
    var newRendimientos = rendimientos.filter(function(r) {
      return !(r.cuenta_id === cuentaId && r.periodo === periodo);
    });
    saveData(STORAGE_KEYS.rendimientos, newRendimientos);
  }

  showToast('Cierre eliminado.', 'info');
  verHistorialCuenta(cuentaId);
  if (typeof renderCuentas === 'function') renderCuentas();
  if (typeof updateHeaderPatrimonio === 'function') updateHeaderPatrimonio();
}

/* ============================================================
   ESTADO DE CUENTA
   ============================================================ */
var _estadoCuentaId = null;

function verEstadoCuenta(cuentaId) {
  _estadoCuentaId = cuentaId;
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) return;
  var moneda = cuenta.moneda || 'MXN';
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });
  var instNombre = instMap[cuenta.institucion_id] || '\u2014';

  var bodyHTML = '<div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Cuenta</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + cuenta.nombre + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Institucion</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + instNombre + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Moneda</div><div style="font-size:14px;font-weight:700;color:var(--accent-blue);">' + moneda + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Saldo Actual</div><div style="font-size:14px;font-weight:700;color:var(--accent-green);">' + formatCurrency(cuenta.saldo, moneda) + '</div></div>' +
    '</div></div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;">' +
    '<input type="date" id="edoCtaDesde" class="form-input" style="padding:5px 8px;font-size:13px;min-height:auto;max-width:150px;" onchange="filterEstadoCuenta()" placeholder="Desde">' +
    '<input type="date" id="edoCtaHasta" class="form-input" style="padding:5px 8px;font-size:13px;min-height:auto;max-width:150px;" onchange="filterEstadoCuenta()" placeholder="Hasta">' +
    '<select id="edoCtaTipo" class="form-select" style="padding:5px 8px;font-size:13px;min-height:auto;max-width:140px;" onchange="filterEstadoCuenta()">' +
    '<option value="">Todos</option><option value="ingreso">Abonos</option><option value="gasto">Cargos</option></select>' +
    '<input type="text" id="edoCtaSearch" class="form-input" style="padding:5px 8px;font-size:13px;min-height:auto;max-width:180px;" placeholder="Buscar..." oninput="filterEstadoCuenta()">' +
    '<div style="margin-left:auto;display:flex;gap:6px;">' +
    '<button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;" onclick="exportarEdoCuentaExcel()" title="Exportar Excel"><i class="fas fa-file-excel" style="margin-right:4px;"></i>Excel</button>' +
    '<button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;border-color:var(--accent-red);color:var(--accent-red);" onclick="exportarEdoCuentaPDF()" title="Exportar PDF"><i class="fas fa-file-pdf" style="margin-right:4px;"></i>PDF</button>' +
    '</div>' +
    '</div>' +
    '<div id="edoCtaContenido"></div>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="closeEstadoCuenta()">Cerrar</button></div>';

  openModal('Estado de Cuenta: ' + cuenta.nombre, bodyHTML);
  document.querySelector('.modal-content').classList.add('modal-wide');
  filterEstadoCuenta();
}

function closeEstadoCuenta() {
  document.querySelector('.modal-content').classList.remove('modal-wide');
  _estadoCuentaId = null;
  closeModal();
}

function filterEstadoCuenta() {
  var cuentaId = _estadoCuentaId;
  if (!cuentaId) return;
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) return;
  var moneda = cuenta.moneda || 'MXN';
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];

  // Filter movements for this account
  var movsCuenta = movimientos.filter(function(m) { return m.cuenta_id === cuentaId; });

  // Build unified events array
  var eventos = [];
  var historial = cuenta.historial_saldos || [];

  // Add real movements
  movsCuenta.forEach(function(m) {
    var origen = 'Manual';
    if (m.transferencia_id) origen = 'Transferencia';
    else if (m.notas && m.notas.indexOf('Prestamo ID:') !== -1) origen = 'Prestamo';
    else if (m.notas && m.notas.indexOf('Importado desde PDF') !== -1) origen = 'PDF';
    else if (m.notas && m.notas.indexOf('Generado desde plantilla') !== -1) origen = 'Recurrente';

    eventos.push({
      fecha: m.fecha || '',
      descripcion: m.descripcion || '',
      tipo: m.tipo,
      monto: m.monto || 0,
      notas: m.notas || '',
      origen: origen,
      esCierre: false
    });
  });

  // Add cierres as informational markers (no cargo/abono, just saldo snapshot)
  historial.forEach(function(h) {
    var sInicio = h.saldo_inicio != null ? h.saldo_inicio : 0;
    var sFinal = h.saldo_final != null ? h.saldo_final : h.saldo;
    var rendPctAnual = h.rendimiento_pct_anual || 0;
    var dias = h.dias || 0;
    var rendLabel = rendPctAnual !== 0 ? (rendPctAnual >= 0 ? '+' : '') + rendPctAnual.toFixed(2) + '% anual' : '';
    var diasLabel = dias > 0 ? dias + 'd' : '';
    var detalle = [diasLabel, rendLabel].filter(function(x) { return x; }).join(', ');

    eventos.push({
      fecha: h.fecha || '',
      descripcion: 'Cierre Mensual' + (detalle ? ' (' + detalle + ')' : ''),
      tipo: null,
      monto: 0,
      notas: '',
      origen: 'Cierre',
      esCierre: true,
      cierreSaldoFinal: sFinal
    });
  });

  // Apply filters
  var fDesde = document.getElementById('edoCtaDesde') ? document.getElementById('edoCtaDesde').value : '';
  var fHasta = document.getElementById('edoCtaHasta') ? document.getElementById('edoCtaHasta').value : '';
  var fTipo = document.getElementById('edoCtaTipo') ? document.getElementById('edoCtaTipo').value : '';
  var fSearch = document.getElementById('edoCtaSearch') ? document.getElementById('edoCtaSearch').value.toLowerCase().trim() : '';

  var filtered = eventos.filter(function(e) {
    if (fDesde && e.fecha < fDesde) return false;
    if (fHasta && e.fecha > fHasta) return false;
    if (fTipo && !e.esCierre && e.tipo !== fTipo) return false;
    if (fSearch && !e.esCierre) {
      var text = (e.descripcion + ' ' + e.notas + ' ' + e.origen).toLowerCase();
      if (text.indexOf(fSearch) === -1) return false;
    }
    return true;
  });

  // Sort chronologically (oldest first) to calculate running balance
  filtered.sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

  // Saldo inicial permanente de la cuenta
  var saldoInicial = cuenta.saldo_inicial != null ? cuenta.saldo_inicial : cuenta.saldo;
  var fechaSaldoInicial = cuenta.fecha_saldo_inicial || '';

  // Calculate totals from filtered movements (exclude cierres)
  var sumIngresos = 0, sumGastos = 0;
  filtered.forEach(function(e) {
    if (e.esCierre) return;
    if (e.tipo === 'ingreso') sumIngresos += e.monto;
    else if (e.tipo === 'gasto') sumGastos += e.monto;
  });

  var saldoRunning = saldoInicial;

  var contenedor = document.getElementById('edoCtaContenido');
  if (!contenedor) return;

  // Build first row: Saldo de Apertura
  var filaInicial = '<tr style="background:rgba(16,185,129,0.08);font-weight:700;">' +
    '<td style="white-space:nowrap;color:var(--text-primary);">' + (fechaSaldoInicial ? formatDate(fechaSaldoInicial) : '\u2014') + '</td>' +
    '<td style="font-size:12px;color:var(--text-primary);"><i class="fas fa-flag" style="margin-right:6px;color:var(--accent-green);"></i>Saldo de Apertura</td>' +
    '<td></td>' +
    '<td></td>' +
    '<td style="text-align:right;font-weight:800;color:var(--text-primary);">' + formatCurrency(saldoInicial, moneda) + '</td>' +
    '</tr>';

  // Build table rows for movements and cierre markers
  var rows = filtered.map(function(e) {
    // Cierre rows: informational marker, resets running balance to cierre saldo
    if (e.esCierre) {
      saldoRunning = e.cierreSaldoFinal;
      return '<tr style="background:rgba(59,130,246,0.08);border-top:2px solid rgba(59,130,246,0.3);border-bottom:2px solid rgba(59,130,246,0.3);">' +
        '<td style="white-space:nowrap;font-weight:700;color:var(--accent-blue);">' + (e.fecha ? formatDate(e.fecha) : '\u2014') + '</td>' +
        '<td style="font-size:12px;font-weight:700;color:var(--accent-blue);"><i class="fas fa-calendar-check" style="margin-right:6px;"></i>' + e.descripcion + '</td>' +
        '<td></td>' +
        '<td></td>' +
        '<td style="text-align:right;font-weight:800;color:var(--accent-blue);">' + formatCurrency(saldoRunning, moneda) + '</td>' +
        '</tr>';
    }

    var cargo = '', abono = '';
    if (e.tipo === 'gasto') {
      cargo = formatCurrency(e.monto, moneda);
      saldoRunning -= e.monto;
    } else if (e.tipo === 'ingreso') {
      abono = formatCurrency(e.monto, moneda);
      saldoRunning += e.monto;
    }

    // Determine origin badge
    var origenBadge = '';
    if (e.origen === 'Transferencia') origenBadge = '<span class="badge badge-purple" style="font-size:9px;margin-left:6px;">Transf.</span>';
    else if (e.origen === 'Prestamo') origenBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:6px;">Prestamo</span>';
    else if (e.origen === 'PDF') origenBadge = '<span class="badge badge-red" style="font-size:9px;margin-left:6px;">PDF</span>';
    else if (e.origen === 'Recurrente') origenBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:6px;">Recurrente</span>';

    return '<tr>' +
      '<td style="white-space:nowrap;">' + (e.fecha ? formatDate(e.fecha) : '\u2014') + '</td>' +
      '<td style="font-size:12px;">' + e.descripcion + origenBadge + '</td>' +
      '<td style="text-align:right;color:var(--accent-red);font-weight:600;">' + cargo + '</td>' +
      '<td style="text-align:right;color:var(--accent-green);font-weight:600;">' + abono + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-primary);">' + formatCurrency(saldoRunning, moneda) + '</td>' +
      '</tr>';
  });

  var saldoFinal = saldoRunning;

  // Calculate rendimiento info from latest cierre
  var rendAnualPct = 0, rendMonto = 0, rendFuente = '';
  if (cuenta.tipo === 'inversion' && historial.length > 0) {
    var ultCierre = historial.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); })[0];
    if (ultCierre.rendimiento_pct_anual != null) rendAnualPct = ultCierre.rendimiento_pct_anual;
    if (ultCierre.rendimiento != null) rendMonto = ultCierre.rendimiento;
    rendFuente = ultCierre.fecha ? formatDate(ultCierre.fecha) : '';
  }
  var esInversion = cuenta.tipo === 'inversion';
  var rendEstimadoMensual = esInversion && rendAnualPct > 0 ? (cuenta.saldo * rendAnualPct / 100 / 12) : 0;
  var rendHTML = esInversion
    ? '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Rendimiento Anual</div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--accent-amber);">' + (rendAnualPct >= 0 ? '+' : '') + rendAnualPct.toFixed(2) + '%</div>' +
      (rendMonto ? '<div style="font-size:12px;color:var(--accent-green);font-weight:700;">Ultimo cierre: ' + formatCurrency(rendMonto, moneda) + '</div>' : '') +
      (rendEstimadoMensual > 0 ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">~' + formatCurrency(rendEstimadoMensual, moneda) + '/mes</div>' : '') +
      (rendFuente ? '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Cierre: ' + rendFuente + '</div>' : '') +
      '</div>'
    : '';

  var html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">' +
    '<table class="data-table" style="min-width:0;"><thead><tr>' +
    '<th style="white-space:nowrap;">Fecha</th><th>Descripcion</th><th style="text-align:right;">Cargo</th><th style="text-align:right;">Abono</th><th style="text-align:right;">Saldo</th>' +
    '</tr></thead><tbody>' + filaInicial + rows.join('') + '</tbody></table></div>' +
    '<div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--bg-base);display:grid;grid-template-columns:' + (esInversion ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr') + ';gap:12px;">' +
    '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Saldo de Apertura</div><div style="font-size:15px;font-weight:800;color:var(--text-primary);">' + formatCurrency(saldoInicial, moneda) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Cargos</div><div style="font-size:15px;font-weight:800;color:var(--accent-red);">' + formatCurrency(sumGastos, moneda) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Abonos</div><div style="font-size:15px;font-weight:800;color:var(--accent-green);">' + formatCurrency(sumIngresos, moneda) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Saldo Final</div><div style="font-size:15px;font-weight:800;color:var(--accent-blue);">' + formatCurrency(saldoFinal, moneda) + '</div></div>' +
    rendHTML +
    '</div>';

  contenedor.innerHTML = html;
}

/* -- Helper: build EDC data for export (reuses filterEstadoCuenta logic) -- */
function _buildEdoCuentaData() {
  var cuentaId = _estadoCuentaId;
  if (!cuentaId) return null;
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) return null;
  var moneda = cuenta.moneda || 'MXN';
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });
  var instNombre = instMap[cuenta.institucion_id] || '';
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var movsCuenta = movimientos.filter(function(m) { return m.cuenta_id === cuentaId; });

  var eventos = [];
  var historial = cuenta.historial_saldos || [];

  movsCuenta.forEach(function(m) {
    var origen = 'Manual';
    if (m.transferencia_id) origen = 'Transferencia';
    else if (m.notas && m.notas.indexOf('Prestamo ID:') !== -1) origen = 'Prestamo';
    else if (m.notas && m.notas.indexOf('Importado desde PDF') !== -1) origen = 'PDF';
    else if (m.notas && m.notas.indexOf('Generado desde plantilla') !== -1) origen = 'Recurrente';
    eventos.push({ fecha: m.fecha || '', descripcion: m.descripcion || '', tipo: m.tipo, monto: m.monto || 0, notas: m.notas || '', origen: origen, esCierre: false });
  });

  historial.forEach(function(h) {
    var sFinal = h.saldo_final != null ? h.saldo_final : h.saldo;
    var rendPctAnual = h.rendimiento_pct_anual || 0;
    var dias = h.dias || 0;
    var rendLabel = rendPctAnual !== 0 ? (rendPctAnual >= 0 ? '+' : '') + rendPctAnual.toFixed(2) + '% anual' : '';
    var diasLabel = dias > 0 ? dias + 'd' : '';
    var detalle = [diasLabel, rendLabel].filter(function(x) { return x; }).join(', ');
    eventos.push({ fecha: h.fecha || '', descripcion: 'Cierre Mensual' + (detalle ? ' (' + detalle + ')' : ''), tipo: null, monto: 0, notas: '', origen: 'Cierre', esCierre: true, cierreSaldoFinal: sFinal });
  });

  // Apply same filters as visible EDC
  var fDesde = document.getElementById('edoCtaDesde') ? document.getElementById('edoCtaDesde').value : '';
  var fHasta = document.getElementById('edoCtaHasta') ? document.getElementById('edoCtaHasta').value : '';
  var fTipo = document.getElementById('edoCtaTipo') ? document.getElementById('edoCtaTipo').value : '';
  var fSearch = document.getElementById('edoCtaSearch') ? document.getElementById('edoCtaSearch').value.toLowerCase().trim() : '';

  var filtered = eventos.filter(function(e) {
    if (fDesde && e.fecha < fDesde) return false;
    if (fHasta && e.fecha > fHasta) return false;
    if (fTipo && !e.esCierre && e.tipo !== fTipo) return false;
    if (fSearch && !e.esCierre) {
      var text = (e.descripcion + ' ' + e.notas + ' ' + e.origen).toLowerCase();
      if (text.indexOf(fSearch) === -1) return false;
    }
    return true;
  });

  filtered.sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

  var saldoInicial = cuenta.saldo_inicial != null ? cuenta.saldo_inicial : cuenta.saldo;
  var saldoRunning = saldoInicial;
  var sumIngresos = 0, sumGastos = 0;

  // Build rows array with running balance
  var rows = [];
  // First row: Saldo de Apertura
  rows.push({ fecha: cuenta.fecha_saldo_inicial || '', descripcion: 'Saldo de Apertura', cargo: '', abono: '', saldo: saldoInicial, esCierre: false, esApertura: true });

  filtered.forEach(function(e) {
    if (e.esCierre) {
      saldoRunning = e.cierreSaldoFinal;
      rows.push({ fecha: e.fecha, descripcion: e.descripcion, cargo: '', abono: '', saldo: saldoRunning, esCierre: true });
    } else {
      var cargo = '', abono = '';
      if (e.tipo === 'gasto') { cargo = e.monto; saldoRunning -= e.monto; sumGastos += e.monto; }
      else if (e.tipo === 'ingreso') { abono = e.monto; saldoRunning += e.monto; sumIngresos += e.monto; }
      rows.push({ fecha: e.fecha, descripcion: e.descripcion + (e.origen !== 'Manual' ? ' [' + e.origen + ']' : ''), cargo: cargo, abono: abono, saldo: saldoRunning, esCierre: false });
    }
  });

  return {
    cuenta: cuenta, moneda: moneda, instNombre: instNombre,
    rows: rows, saldoInicial: saldoInicial, saldoFinal: saldoRunning,
    sumIngresos: sumIngresos, sumGastos: sumGastos
  };
}

/* -- Export Estado de Cuenta to PDF -- */
function exportarEdoCuentaPDF() {
  var data = _buildEdoCuentaData();
  if (!data || data.rows.length === 0) { showToast('No hay datos para exportar.', 'warning'); return; }

  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    showToast('jsPDF no esta cargada. Verifica tu conexion.', 'error');
    return;
  }
  var jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : jspdf.jsPDF;
  var doc = new jsPDF('p', 'mm', 'letter');

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Panel Financiero MMG', 14, 15);
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Estado de Cuenta: ' + data.cuenta.nombre, 14, 22);
  doc.setFontSize(10);
  doc.text('Institucion: ' + data.instNombre + '  |  Moneda: ' + data.moneda + '  |  ' + new Date().toLocaleDateString('es-MX'), 14, 28);

  // Table data
  var tableData = data.rows.map(function(r) {
    return [
      r.fecha || '',
      r.descripcion || '',
      r.cargo !== '' ? '-' + formatCurrency(r.cargo, data.moneda) : '',
      r.abono !== '' ? '+' + formatCurrency(r.abono, data.moneda) : '',
      formatCurrency(r.saldo, data.moneda)
    ];
  });

  doc.autoTable({
    startY: 34,
    head: [['Fecha', 'Descripcion', 'Cargo', 'Abono', 'Saldo']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: 'right', cellWidth: 28, textColor: [220, 38, 38] },
      3: { halign: 'right', cellWidth: 28, textColor: [16, 185, 129] },
      4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    },
    didParseCell: function(hookData) {
      if (hookData.section === 'body') {
        var row = data.rows[hookData.row.index];
        if (row && row.esCierre) {
          hookData.cell.styles.fillColor = [219, 234, 254];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = [37, 99, 235];
        }
        if (row && row.esApertura) {
          hookData.cell.styles.fillColor = [209, 250, 229];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Summary footer
  var finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Saldo de Apertura: ' + formatCurrency(data.saldoInicial, data.moneda), 14, finalY);
  doc.text('Total Cargos: ' + formatCurrency(data.sumGastos, data.moneda), 14, finalY + 6);
  doc.text('Total Abonos: ' + formatCurrency(data.sumIngresos, data.moneda), 14, finalY + 12);
  doc.text('Saldo Final: ' + formatCurrency(data.saldoFinal, data.moneda), 14, finalY + 18);

  var filename = 'EDC_' + data.cuenta.nombre.replace(/ /g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
  doc.save(filename);
  showToast('PDF del Estado de Cuenta exportado.', 'success');
}

/* -- Export Estado de Cuenta to Excel -- */
function exportarEdoCuentaExcel() {
  var data = _buildEdoCuentaData();
  if (!data || data.rows.length === 0) { showToast('No hay datos para exportar.', 'warning'); return; }

  if (typeof XLSX === 'undefined') { showToast('SheetJS no esta cargada.', 'error'); return; }

  var wsData = [
    ['Estado de Cuenta: ' + data.cuenta.nombre],
    ['Institucion: ' + data.instNombre, 'Moneda: ' + data.moneda, 'Fecha: ' + new Date().toLocaleDateString('es-MX')],
    [],
    ['Fecha', 'Descripcion', 'Cargo', 'Abono', 'Saldo']
  ];

  data.rows.forEach(function(r) {
    wsData.push([
      r.fecha || '',
      r.descripcion || '',
      r.cargo !== '' ? r.cargo : '',
      r.abono !== '' ? r.abono : '',
      r.saldo
    ]);
  });

  // Summary
  wsData.push([]);
  wsData.push(['', 'Saldo de Apertura', '', '', data.saldoInicial]);
  wsData.push(['', 'Total Cargos', data.sumGastos, '', '']);
  wsData.push(['', 'Total Abonos', '', data.sumIngresos, '']);
  wsData.push(['', 'Saldo Final', '', '', data.saldoFinal]);

  var ws = XLSX.utils.aoa_to_sheet(wsData);
  // Set column widths
  ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');

  var filename = 'EDC_' + data.cuenta.nombre.replace(/ /g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('Excel del Estado de Cuenta exportado.', 'success');
}

/* ============================================================
   CAPTURA HISTORICA DE CIERRES
   ============================================================ */

function capturaHistorica() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var activas = cuentas.filter(function(c) { return c.activa !== false; });
  if (activas.length === 0) { showToast('No hay cuentas activas.', 'warning'); return; }

  var ahora = new Date();
  var anioActual = ahora.getFullYear();
  var anioDefault = anioActual - 1;

  var cuentaOpts = activas.map(function(c) {
    return '<option value="' + c.id + '">' + c.nombre + ' (' + c.moneda + ' - ' + (c.tipo === 'debito' ? 'Debito' : 'Inversion') + ')</option>';
  }).join('');

  var anioOpts = '';
  for (var y = anioActual; y >= anioActual - 5; y--) {
    anioOpts += '<option value="' + y + '"' + (y === anioDefault ? ' selected' : '') + '>' + y + '</option>';
  }

  var formHTML =
    '<form id="formCapturaHistorica" onsubmit="saveCapturaHistorica(event)">' +
      '<div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);border-left:3px solid var(--accent-amber);">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-info-circle" style="color:var(--accent-amber);font-size:14px;"></i>' +
          '<span style="font-size:12px;color:var(--text-secondary);">Captura los cierres mensuales historicos. Registra saldos, entradas, salidas y transferencias entre cuentas. El rendimiento se calcula automaticamente.</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
        '<div class="form-group" style="margin-bottom:0;">' +
          '<label class="form-label"><i class="fas fa-wallet" style="margin-right:4px;color:var(--accent-blue);"></i>Cuenta</label>' +
          '<select id="captHistCuenta" class="form-select" onchange="generarFilasCapturaHistorica()">' +
            '<option value="">Seleccionar cuenta...</option>' +
            cuentaOpts +
          '</select>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0;">' +
          '<label class="form-label"><i class="fas fa-calendar" style="margin-right:4px;color:var(--accent-amber);"></i>Ano</label>' +
          '<select id="captHistAnio" class="form-select" onchange="generarFilasCapturaHistorica()">' +
            anioOpts +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="capturaHistoricaTabla" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">' +
        '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">' +
          '<i class="fas fa-hand-pointer" style="display:block;margin-bottom:8px;font-size:18px;opacity:0.4;"></i>' +
          'Selecciona una cuenta para comenzar.' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Captura Historica</button>' +
      '</div>' +
    '</form>';

  openModal('Captura Historica de Cierres', formHTML);
  var mc = document.getElementById('modalContent');
  if (mc) mc.classList.add('modal-wide');
}

function generarFilasCapturaHistorica() {
  var contenedor = document.getElementById('capturaHistoricaTabla');
  if (!contenedor) return;

  var cuentaId = document.getElementById('captHistCuenta').value;
  var anio = parseInt(document.getElementById('captHistAnio').value);
  if (!cuentaId) {
    contenedor.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">' +
      '<i class="fas fa-hand-pointer" style="display:block;margin-bottom:8px;font-size:18px;opacity:0.4;"></i>' +
      'Selecciona una cuenta para comenzar.</div>';
    return;
  }

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) return;

  var esDebito = cuenta.tipo === 'debito';
  var moneda = cuenta.moneda || 'MXN';
  var historial = cuenta.historial_saldos || [];
  var ahora = new Date();
  var mesMax = (anio === ahora.getFullYear()) ? ahora.getMonth() : 11;

  // Find saldo_inicio for first month: last cierre before selected year
  var cierresAntes = historial.filter(function(h) {
    return h.fecha && h.fecha < anio + '-01-01';
  }).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });

  var saldoInicialPrimerMes = cierresAntes.length > 0
    ? (cierresAntes[0].saldo_final != null ? cierresAntes[0].saldo_final : 0)
    : (cuenta.saldo_inicial != null ? cuenta.saldo_inicial : 0);

  // Check existing cierres for each month
  var existentes = {};
  historial.forEach(function(h) {
    if (h.fecha) {
      var periodo = h.fecha.slice(0, 7);
      existentes[periodo] = h;
    }
  });

  var mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  var filas = '';
  for (var m = 0; m <= mesMax; m++) {
    var periodo = anio + '-' + String(m + 1).padStart(2, '0');
    var ultimoDia = new Date(anio, m + 1, 0).getDate();
    var fechaDefault = anio + '-' + String(m + 1).padStart(2, '0') + '-' + String(ultimoDia).padStart(2, '0');
    var existente = existentes[periodo];
    var tieneExistente = !!existente;

    var saldoInicioVal = '';
    var saldoFinalVal = '';
    var entradasVal = '';
    var salidasVal = '';
    var transferenciasVal = '';
    var fechaVal = fechaDefault;
    if (tieneExistente) {
      saldoInicioVal = existente.saldo_inicio != null ? existente.saldo_inicio : '';
      saldoFinalVal = existente.saldo_final != null ? existente.saldo_final : '';
      entradasVal = existente.entradas != null ? existente.entradas : '';
      salidasVal = existente.salidas != null ? existente.salidas : '';
      transferenciasVal = existente.transferencias != null ? existente.transferencias : '';
      fechaVal = existente.fecha || fechaDefault;
    } else if (m === 0) {
      saldoInicioVal = saldoInicialPrimerMes;
    }

    var indicadorExistente = tieneExistente
      ? ' <i class="fas fa-circle" style="color:var(--accent-amber);font-size:7px;vertical-align:middle;" title="Ya existe cierre para este periodo"></i>'
      : '';

    var inicioReadonly = (m > 0 && !tieneExistente) ? ' readonly style="padding:4px 6px;font-size:12px;min-width:90px;min-height:auto;opacity:0.6;background:var(--bg-base);"' : ' style="padding:4px 6px;font-size:12px;min-width:90px;min-height:auto;"';

    var rendCell = esDebito
      ? '<td style="text-align:center;color:var(--text-muted);font-size:11px;">N/A</td>'
      : '<td style="text-align:right;font-size:11px;" id="captHistRend_' + m + '"><span style="color:var(--text-muted);">--</span></td>';

    var inputStyle = 'padding:4px 6px;font-size:12px;min-width:80px;min-height:auto;';

    filas += '<tr>' +
      '<td style="font-weight:600;white-space:nowrap;font-size:12px;">' + mesesNombres[m] + indicadorExistente + '</td>' +
      '<td><input type="date" class="form-input capt-hist-fecha" data-mes="' + m + '" value="' + fechaVal + '" style="padding:4px 6px;font-size:12px;min-height:auto;width:130px;"></td>' +
      '<td><input type="number" class="form-input capt-hist-inicio" data-mes="' + m + '" step="0.01" min="0" value="' + saldoInicioVal + '"' + inicioReadonly + ' oninput="recalcCapturaHistorica(' + m + ')"></td>' +
      '<td><input type="number" class="form-input capt-hist-entradas" data-mes="' + m + '" step="0.01" min="0" value="' + entradasVal + '" style="' + inputStyle + '" oninput="recalcCapturaHistorica(' + m + ')" placeholder="0"></td>' +
      '<td><input type="number" class="form-input capt-hist-salidas" data-mes="' + m + '" step="0.01" min="0" value="' + salidasVal + '" style="' + inputStyle + '" oninput="recalcCapturaHistorica(' + m + ')" placeholder="0"></td>' +
      '<td><input type="number" class="form-input capt-hist-transferencias" data-mes="' + m + '" step="0.01" value="' + transferenciasVal + '" style="' + inputStyle + '" oninput="recalcCapturaHistorica(' + m + ')" placeholder="0" title="Positivo = entrada, Negativo = salida"></td>' +
      '<td><input type="number" class="form-input capt-hist-final" data-mes="' + m + '" step="0.01" min="0" value="' + saldoFinalVal + '" style="' + inputStyle + '" oninput="onCaptHistFinalChange(' + m + ',' + mesMax + ')"></td>' +
      rendCell +
    '</tr>';
  }

  // Account info header
  var infoHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
      '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">' +
        '<i class="fas fa-university" style="color:var(--accent-blue);font-size:13px;"></i>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + cuenta.nombre + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);">' + moneda + ' | ' + (esDebito ? 'Debito' : 'Inversion') + ' | Ano ' + anio + '</div>' +
      '</div>' +
    '</div>';

  contenedor.innerHTML = infoHTML +
    '<table class="data-table" style="font-size:13px;">' +
      '<thead><tr>' +
        '<th style="min-width:80px;">Mes</th>' +
        '<th>Fecha Cierre</th>' +
        '<th style="text-align:right;">Saldo Inicial</th>' +
        '<th style="text-align:right;color:var(--accent-green);">Entradas</th>' +
        '<th style="text-align:right;color:var(--accent-red);">Salidas</th>' +
        '<th style="text-align:right;color:var(--accent-blue);">Transferencias</th>' +
        '<th style="text-align:right;">Saldo Final</th>' +
        '<th style="text-align:right;">Rendimiento</th>' +
      '</tr></thead>' +
      '<tbody>' + filas + '</tbody>' +
    '</table>';

  // Recalculate any pre-filled rows
  for (var i = 0; i <= mesMax; i++) {
    var finalInput = document.querySelector('.capt-hist-final[data-mes="' + i + '"]');
    if (finalInput && finalInput.value) {
      recalcCapturaHistorica(i);
    }
  }
}

function onCaptHistFinalChange(mes, mesMax) {
  var saldoFinalInput = document.querySelector('.capt-hist-final[data-mes="' + mes + '"]');
  var saldoFinal = saldoFinalInput ? (parseFloat(saldoFinalInput.value) || 0) : 0;

  // Cascade to next month's saldo_inicio
  if (mes < mesMax) {
    var nextInicio = document.querySelector('.capt-hist-inicio[data-mes="' + (mes + 1) + '"]');
    if (nextInicio && nextInicio.hasAttribute('readonly')) {
      nextInicio.value = saldoFinal || '';
      // If next month has saldo_final, recalc it too
      var nextFinal = document.querySelector('.capt-hist-final[data-mes="' + (mes + 1) + '"]');
      if (nextFinal && nextFinal.value) {
        recalcCapturaHistorica(mes + 1);
        // Continue cascade
        onCaptHistFinalChange(mes + 1, mesMax);
      }
    }
  }

  // Recalc this month's rendimiento
  recalcCapturaHistorica(mes);
}

function recalcCapturaHistorica(mes) {
  var cuentaId = document.getElementById('captHistCuenta') ? document.getElementById('captHistCuenta').value : '';
  if (!cuentaId) return;

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta || cuenta.tipo === 'debito') return;

  var inicioInput = document.querySelector('.capt-hist-inicio[data-mes="' + mes + '"]');
  var finalInput = document.querySelector('.capt-hist-final[data-mes="' + mes + '"]');
  var cell = document.getElementById('captHistRend_' + mes);
  if (!inicioInput || !finalInput || !cell) return;

  if (!finalInput.value) {
    cell.innerHTML = '<span style="color:var(--text-muted);">--</span>';
    return;
  }

  var saldoInicio = parseFloat(inicioInput.value) || 0;
  var saldoFinal = parseFloat(finalInput.value) || 0;

  // Read entradas, salidas, transferencias
  var entradasInput = document.querySelector('.capt-hist-entradas[data-mes="' + mes + '"]');
  var salidasInput = document.querySelector('.capt-hist-salidas[data-mes="' + mes + '"]');
  var transferenciasInput = document.querySelector('.capt-hist-transferencias[data-mes="' + mes + '"]');
  var entradas = entradasInput ? (parseFloat(entradasInput.value) || 0) : 0;
  var salidas = salidasInput ? (parseFloat(salidasInput.value) || 0) : 0;
  var transferencias = transferenciasInput ? (parseFloat(transferenciasInput.value) || 0) : 0;

  // movimientos_neto se guarda para referencia pero NO se descuenta del rendimiento
  // (mismo tratamiento que cierre mensual)
  var movNeto = entradas - salidas + transferencias;

  // Calculate days
  var fechaActual = document.querySelector('.capt-hist-fecha[data-mes="' + mes + '"]');
  var fechaActualVal = fechaActual ? fechaActual.value : '';
  var fechaAnterior = '';
  if (mes > 0) {
    var prevFecha = document.querySelector('.capt-hist-fecha[data-mes="' + (mes - 1) + '"]');
    fechaAnterior = prevFecha ? prevFecha.value : '';
  } else {
    var anio = parseInt(document.getElementById('captHistAnio').value);
    var historial = cuenta.historial_saldos || [];
    var cierresAntes = historial.filter(function(h) {
      return h.fecha && h.fecha < anio + '-01-01';
    }).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    fechaAnterior = cierresAntes.length > 0 ? cierresAntes[0].fecha : (cuenta.fecha_saldo_inicial || '');
  }

  var dias = _calcDiasEntreFechas(fechaAnterior, fechaActualVal);
  if (dias <= 0) dias = 30;

  // Rendimiento = saldoFinal - saldoInicio (diferencia total)
  // entradas/salidas/transferencias se guardan para referencia
  var rend = saldoFinal - saldoInicio;
  var rendPct = saldoInicio > 0 ? ((rend / saldoInicio) * 100) : 0;
  var rendPctAnual = (saldoInicio > 0 && dias > 0) ? ((rend / saldoInicio) * (365 / dias) * 100) : 0;

  var color = rend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  var sign = rend >= 0 ? '+' : '';
  cell.innerHTML =
    '<span style="color:' + color + ';font-weight:600;">' + sign + formatCurrency(rend, cuenta.moneda) + '</span>' +
    '<br><span style="font-size:10px;color:' + color + ';">' + sign + rendPct.toFixed(2) + '% (' + dias + 'd)</span>' +
    '<br><span style="font-size:10px;color:' + color + ';opacity:0.7;">' + sign + rendPctAnual.toFixed(2) + '% anual</span>';
}

function saveCapturaHistorica(event) {
  event.preventDefault();

  var cuentaId = document.getElementById('captHistCuenta').value;
  if (!cuentaId) { showToast('Selecciona una cuenta.', 'warning'); return; }

  var anio = parseInt(document.getElementById('captHistAnio').value);
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var ctaIdx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
  if (ctaIdx === -1) { showToast('Cuenta no encontrada.', 'error'); return; }

  var cuenta = cuentas[ctaIdx];
  var esDebito = cuenta.tipo === 'debito';

  // Gather all filled rows
  var filasValidas = [];
  var fechaInputs = document.querySelectorAll('.capt-hist-fecha');
  fechaInputs.forEach(function(fechaEl) {
    var mes = parseInt(fechaEl.getAttribute('data-mes'));
    var finalInput = document.querySelector('.capt-hist-final[data-mes="' + mes + '"]');
    if (!finalInput || !finalInput.value) return;

    var inicioInput = document.querySelector('.capt-hist-inicio[data-mes="' + mes + '"]');
    var entradasInput = document.querySelector('.capt-hist-entradas[data-mes="' + mes + '"]');
    var salidasInput = document.querySelector('.capt-hist-salidas[data-mes="' + mes + '"]');
    var transferenciasInput = document.querySelector('.capt-hist-transferencias[data-mes="' + mes + '"]');
    var fecha = fechaEl.value;
    var saldoInicio = parseFloat(inicioInput.value) || 0;
    var saldoFinal = parseFloat(finalInput.value) || 0;
    var entradas = entradasInput ? (parseFloat(entradasInput.value) || 0) : 0;
    var salidas = salidasInput ? (parseFloat(salidasInput.value) || 0) : 0;
    var transferencias = transferenciasInput ? (parseFloat(transferenciasInput.value) || 0) : 0;
    var periodo = fecha.slice(0, 7);

    var movNeto = entradas - salidas + transferencias;

    // Calc days
    var fechaAnterior = '';
    if (mes > 0) {
      var prevFecha = document.querySelector('.capt-hist-fecha[data-mes="' + (mes - 1) + '"]');
      fechaAnterior = prevFecha ? prevFecha.value : '';
    } else {
      var historial = cuenta.historial_saldos || [];
      var cierresAntes = historial.filter(function(h) {
        return h.fecha && h.fecha < anio + '-01-01';
      }).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
      fechaAnterior = cierresAntes.length > 0 ? cierresAntes[0].fecha : (cuenta.fecha_saldo_inicial || '');
    }

    var dias = _calcDiasEntreFechas(fechaAnterior, fecha);
    if (dias <= 0) dias = 30;

    // Rendimiento = diferencia total (saldoFinal - saldoInicio)
    // movNeto se guarda para referencia pero NO se descuenta del rendimiento
    var rend = esDebito ? 0 : (saldoFinal - saldoInicio);
    var rendPct = (!esDebito && saldoInicio > 0) ? ((rend / saldoInicio) * 100) : 0;
    var rendPctAnual = (!esDebito && saldoInicio > 0 && dias > 0) ? ((rend / saldoInicio) * (365 / dias) * 100) : 0;

    filasValidas.push({
      mes: mes, fecha: fecha, periodo: periodo, dias: dias,
      saldoInicio: saldoInicio, saldoFinal: saldoFinal,
      entradas: entradas, salidas: salidas, transferencias: transferencias,
      movNeto: movNeto,
      rend: rend, rendPct: rendPct, rendPctAnual: rendPctAnual
    });
  });

  if (filasValidas.length === 0) {
    showToast('No se capturo ningun saldo final.', 'warning');
    return;
  }

  // Detect conflicts
  var historial = cuenta.historial_saldos || [];
  var existentes = {};
  historial.forEach(function(h, i) {
    if (h.fecha) existentes[h.fecha.slice(0, 7)] = i;
  });

  var conflictos = filasValidas.filter(function(f) {
    return existentes[f.periodo] !== undefined;
  });

  if (conflictos.length > 0) {
    var mesesConflicto = conflictos.map(function(f) { return f.periodo; }).join(', ');
    var opcion = confirm('Ya existen cierres para: ' + mesesConflicto +
      '.\n\nPresiona OK para SOBREESCRIBIR los existentes, o Cancelar para omitirlos.');

    if (!opcion) {
      filasValidas = filasValidas.filter(function(f) {
        return existentes[f.periodo] === undefined;
      });
      if (filasValidas.length === 0) {
        showToast('No hay periodos nuevos para guardar.', 'info');
        return;
      }
    } else {
      // Remove old entries that will be overwritten
      var periodosConflicto = {};
      conflictos.forEach(function(f) { periodosConflicto[f.periodo] = true; });

      historial = historial.filter(function(h) {
        return !h.fecha || !periodosConflicto[h.fecha.slice(0, 7)];
      });
      cuenta.historial_saldos = historial;

      rendimientos = rendimientos.filter(function(r) {
        return !(r.cuenta_id === cuentaId && periodosConflicto[r.periodo]);
      });
    }
  }

  // Insert new entries
  if (!cuenta.historial_saldos) cuenta.historial_saldos = [];
  filasValidas.forEach(function(f) {
    cuenta.historial_saldos.push({
      fecha: f.fecha,
      saldo_inicio: f.saldoInicio,
      saldo_final: f.saldoFinal,
      entradas: f.entradas,
      salidas: f.salidas,
      transferencias: f.transferencias,
      movimientos_neto: f.movNeto,
      rendimiento: f.rend,
      dias: f.dias,
      rendimiento_pct: f.rendPct,
      rendimiento_pct_anual: f.rendPctAnual
    });

    if (!esDebito) {
      rendimientos.push({
        id: uuid(),
        cuenta_id: cuentaId,
        periodo: f.periodo,
        saldo_inicial: f.saldoInicio,
        saldo_final: f.saldoFinal,
        entradas: f.entradas,
        salidas: f.salidas,
        transferencias: f.transferencias,
        movimientos_neto: f.movNeto,
        rendimiento_monto: f.rend,
        rendimiento_pct: f.rendPct,
        rendimiento_pct_anual: f.rendPctAnual,
        dias: f.dias,
        fecha: f.fecha,
        created: new Date().toISOString()
      });
    }
  });

  // Update account saldo if most recent captured cierre is more recent than current latest
  var allCierres = (cuenta.historial_saldos || []).slice().sort(function(a, b) {
    return (b.fecha || '').localeCompare(a.fecha || '');
  });
  if (allCierres.length > 0 && allCierres[0].saldo_final != null) {
    cuenta.saldo = allCierres[0].saldo_final;
  }

  cuentas[ctaIdx] = cuenta;
  saveData(STORAGE_KEYS.cuentas, cuentas);
  saveData(STORAGE_KEYS.rendimientos, rendimientos);

  closeModal();
  showToast('Captura historica guardada: ' + filasValidas.length + ' mes' + (filasValidas.length > 1 ? 'es' : '') + ' registrado' + (filasValidas.length > 1 ? 's' : '') + '.', 'success');
  renderCuentas();
  updateHeaderPatrimonio();
}
