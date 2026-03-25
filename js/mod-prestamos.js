/* ============================================================
   MODULE: PRESTAMOS  -  Otorgados y Recibidos
   ============================================================ */

function renderPrestamos() {
  const el = document.getElementById('module-prestamos');
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  checkVencimientos();
  const prestamosActualizados = loadData(STORAGE_KEYS.prestamos) || [];

  let totalOtorgado = 0;
  let totalRecibido = 0;
  prestamosActualizados.forEach(p => {
    if (p.estado === 'pagado') return;
    if (p.tipo === 'otorgado') totalOtorgado += toMXN(p.monto_original, p.moneda || 'MXN', tiposCambio);
    else if (p.tipo === 'recibido') totalRecibido += toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
  });
  const balanceNeto = totalOtorgado - totalRecibido;
  const balanceColor = balanceNeto >= 0 ? 'green' : 'red';

  el.innerHTML = `
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-amber);cursor:pointer;" onclick="mostrarDesglosePrestamosKpi('otorgado')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-hand-holding-usd" style="color:var(--accent-amber);font-size:19px;"></i>
          </div>
          <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Otorgado</span>
        </div>
        <div id="kpiTotalOtorgado" style="font-size:24px;font-weight:800;color:var(--accent-amber);">${formatCurrencyInt(totalOtorgado, 'MXN')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesglosePrestamosKpi('recibido')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-file-invoice-dollar" style="color:var(--accent-blue);font-size:19px;"></i>
          </div>
          <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Recibido</span>
        </div>
        <div id="kpiTotalRecibido" style="font-size:24px;font-weight:800;color:var(--accent-blue);">${formatCurrencyInt(totalRecibido, 'MXN')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-${balanceColor});cursor:pointer;" onclick="mostrarDesglosePrestamosKpi('balance')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-${balanceColor}-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-balance-scale" style="color:var(--accent-${balanceColor});font-size:19px;"></i>
          </div>
          <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Balance Neto</span>
        </div>
        <div id="kpiBalanceNeto" style="font-size:24px;font-weight:800;color:var(--accent-${balanceColor});">${formatCurrencyInt(balanceNeto, 'MXN')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:8px 12px;">
      <div style="display:flex;gap:8px;">
        <button id="tabPrestamosVista" class="btn btn-primary" style="padding:6px 16px;font-size:13px;" onclick="_switchPrestamosTab('vista')">
          <i class="fas fa-list" style="margin-right:4px;"></i>Vista General
        </button>
        <button id="tabPrestamosEdicion" class="btn btn-secondary" style="padding:6px 16px;font-size:13px;" onclick="_switchPrestamosTab('edicion')">
          <i class="fas fa-edit" style="margin-right:4px;"></i>Edicion
        </button>
      </div>
    </div>
    <div id="prestamosVistaTab">
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:140px;">
            <select id="filterPrestamoTipo" class="form-select" onchange="filterPrestamos()">
              <option value="">Todos</option>
              <option value="otorgado">Otorgado</option>
              <option value="recibido">Recibido</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px;">
            <select id="filterPrestamoEstado" class="form-select" onchange="filterPrestamos()">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:180px;">
            <input type="text" id="filterPrestamoSearch" class="form-input" placeholder="Buscar persona..." oninput="filterPrestamos()">
          </div>
        </div>
        <button class="btn btn-primary" onclick="editPrestamo(null)"><i class="fas fa-plus"></i> Nuevo Prestamo</button>
      </div>
    </div>
    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaPrestamos">
          <thead><tr><th>Persona</th><th>Tipo</th><th style="text-align:right;">Monto Original</th><th style="text-align:right;">Saldo Pendiente</th><th style="text-align:right;">Tasa</th><th>Vencimiento</th><th>Estado</th><th style="text-align:center;" data-no-sort="true">Acciones</th></tr></thead>
          <tbody id="tbodyPrestamos"></tbody>
        </table>
      </div>
    </div>
    </div>
    <div id="prestamosEdicionTab" style="display:none;"></div>`;
  filterPrestamos();
  setTimeout(function() { _initSortableTables(el); }, 100);
}

function filterPrestamos() {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  const fTipo = document.getElementById('filterPrestamoTipo') ? document.getElementById('filterPrestamoTipo').value : '';
  const fEstado = document.getElementById('filterPrestamoEstado') ? document.getElementById('filterPrestamoEstado').value : '';
  const fSearch = document.getElementById('filterPrestamoSearch') ? document.getElementById('filterPrestamoSearch').value.toLowerCase().trim() : '';

  const filtered = prestamos.filter(p => {
    if (fTipo && p.tipo !== fTipo) return false;
    if (fEstado && p.estado !== fEstado) return false;
    if (fSearch) {
      var persona = (p.persona || '').toLowerCase();
      var notas = (p.notas || '').toLowerCase();
      if (!persona.includes(fSearch) && !notas.includes(fSearch)) return false;
    }
    return true;
  }).sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  let totalOtorgado = 0, totalRecibido = 0;
  filtered.forEach(p => {
    if (p.estado === 'pagado') return;
    if (p.tipo === 'otorgado') totalOtorgado += toMXN(p.monto_original, p.moneda || 'MXN', tiposCambio);
    else if (p.tipo === 'recibido') totalRecibido += toMXN(p.saldo_pendiente, p.moneda || 'MXN', tiposCambio);
  });
  var balanceNeto = totalOtorgado - totalRecibido;
  var kpiO = document.getElementById('kpiTotalOtorgado');
  var kpiR = document.getElementById('kpiTotalRecibido');
  var kpiB = document.getElementById('kpiBalanceNeto');
  if (kpiO) kpiO.textContent = formatCurrencyInt(totalOtorgado, 'MXN');
  if (kpiR) kpiR.textContent = formatCurrencyInt(totalRecibido, 'MXN');
  if (kpiB) { kpiB.textContent = formatCurrencyInt(balanceNeto, 'MXN'); kpiB.style.color = balanceNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'; }

  const tbody = document.getElementById('tbodyPrestamos');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="fas fa-search" style="font-size:29px;display:block;margin-bottom:8px;opacity:0.4;"></i>No se encontraron prestamos con los filtros aplicados.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function(p, idx) {
    var tipoBadge = p.tipo === 'otorgado' ? 'badge-amber' : 'badge-blue';
    var tipoLabel = p.tipo === 'otorgado' ? 'Otorgado' : 'Recibido';
    var estadoBadge = 'badge-green', estadoLabel = 'Activo';
    if (p.estado === 'pagado') { estadoBadge = 'badge-blue'; estadoLabel = 'Pagado'; }
    else if (p.estado === 'vencido') { estadoBadge = 'badge-red'; estadoLabel = 'Vencido'; }
    var tasa = p.tasa_interes ? formatPct(p.tasa_interes) : '0.00%';
    var venc = p.fecha_vencimiento ? formatDate(p.fecha_vencimiento) : '\u2014';
    var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
    var acc = '<button class="btn btn-secondary" style="padding:4px 8px;font-size:13px;margin-right:4px;" onclick="editPrestamo(\'' + p.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
    if (p.estado === 'activo') acc += '<button class="btn btn-primary" style="padding:4px 8px;font-size:13px;margin-right:4px;" onclick="registrarPago(\'' + p.id + '\')" title="Registrar Pago"><i class="fas fa-money-bill-wave"></i></button>';
    if (p.estado === 'activo') acc += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:13px;margin-right:4px;border-color:var(--accent-amber);color:var(--accent-amber);" onclick="prestarMas(\'' + p.id + '\')" title="Prestar Mas"><i class="fas fa-plus-circle"></i></button>';
    acc += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:13px;margin-right:4px;" onclick="verHistorialPagos(\'' + p.id + '\')" title="Ver Pagos"><i class="fas fa-history"></i></button>';
    acc += '<button class="btn btn-danger" style="padding:4px 8px;font-size:13px;" onclick="deletePrestamo(\'' + p.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';
    var sc = p.saldo_pendiente > 0 ? 'var(--accent-amber)' : 'var(--accent-green)';
    return '<tr style="' + zebra + '"><td style="font-weight:600;color:var(--text-primary);">' + p.persona + '</td><td><span class="badge ' + tipoBadge + '">' + tipoLabel + '</span></td><td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrencyInt(p.monto_original, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;color:' + sc + ';">' + formatCurrencyInt(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;">' + tasa + '</td><td>' + venc + '</td><td><span class="badge ' + estadoBadge + '">' + estadoLabel + '</span></td><td style="text-align:center;">' + acc + '</td></tr>';
  }).join('');
}

function editPrestamo(id) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  let prestamo = null;
  if (id) prestamo = prestamos.find(p => p.id === id);
  const isEdit = !!prestamo;
  const titulo = isEdit ? 'Editar Prestamo' : 'Nuevo Prestamo';
  const cuentasActivas = cuentas.filter(c => c.activa !== false);
  const cuentaOpciones = cuentasActivas.map(c => {
    var sel = prestamo && prestamo.cuenta_id === c.id ? 'selected' : '';
    return '<option value="' + c.id + '" ' + sel + '>' + c.nombre + ' (' + c.moneda + ')</option>';
  }).join('');
  const hoy = new Date().toISOString().split('T')[0];

  const formHTML = `
    <form id="formPrestamo" onsubmit="savePrestamo(event)">
      <input type="hidden" id="prestamoId" value="${isEdit ? prestamo.id : ''}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Tipo *</label>
          <select id="prestamoTipo" class="form-select" required>
            <option value="otorgado" ${isEdit && prestamo.tipo === 'otorgado' ? 'selected' : ''}>Otorgado (Yo presto)</option>
            <option value="recibido" ${isEdit && prestamo.tipo === 'recibido' ? 'selected' : ''}>Recibido (Me prestan)</option>
          </select></div>
        <div class="form-group"><label class="form-label">Persona *</label>
          <input type="text" id="prestamoPersona" class="form-input" required value="${isEdit ? prestamo.persona : ''}" placeholder="Nombre de la persona"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Monto Original *</label>
          <input type="number" id="prestamoMonto" class="form-input" required step="0.01" min="0.01" value="${isEdit ? prestamo.monto_original : ''}" placeholder="0.00"></div>
        <div class="form-group"><label class="form-label">Moneda *</label>
          <select id="prestamoMoneda" class="form-select" required>
            <option value="MXN" ${isEdit && prestamo.moneda === 'MXN' ? 'selected' : ''}>MXN</option>
            <option value="USD" ${isEdit && prestamo.moneda === 'USD' ? 'selected' : ''}>USD</option>
            <option value="EUR" ${isEdit && prestamo.moneda === 'EUR' ? 'selected' : ''}>EUR</option>
          </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Tasa de Interes Anual (%)</label>
          <input type="number" id="prestamoTasa" class="form-input" step="0.01" min="0" value="${isEdit ? (prestamo.tasa_interes || 0) : 0}" placeholder="0.00"></div>
        <div class="form-group"><label class="form-label">Fecha de Inicio *</label>
          <input type="date" id="prestamoFechaInicio" class="form-input" required value="${isEdit ? prestamo.fecha_inicio : hoy}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Fecha de Vencimiento</label>
          <input type="date" id="prestamoFechaVencimiento" class="form-input" value="${isEdit && prestamo.fecha_vencimiento ? prestamo.fecha_vencimiento : ''}"></div>
        <div class="form-group"><label class="form-label">Cuenta Vinculada</label>
          <select id="prestamoCuentaId" class="form-select"><option value="">Sin vincular</option>${cuentaOpciones}</select></div>
      </div>
      <div class="form-group"><label class="form-label">Notas</label>
        <textarea id="prestamoNotas" class="form-input" rows="3" style="resize:vertical;" placeholder="Notas adicionales...">${isEdit && prestamo.notas ? prestamo.notas : ''}</textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Prestamo'}</button>
      </div>
    </form>`;
  openModal(titulo, formHTML);
}

function savePrestamo(event) {
  event.preventDefault();
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const id = document.getElementById('prestamoId').value;
  const tipo = document.getElementById('prestamoTipo').value;
  const persona = document.getElementById('prestamoPersona').value.trim();
  const monto_original = parseFloat(document.getElementById('prestamoMonto').value) || 0;
  const moneda = document.getElementById('prestamoMoneda').value;
  const tasa_interes = parseFloat(document.getElementById('prestamoTasa').value) || 0;
  const fecha_inicio = document.getElementById('prestamoFechaInicio').value;
  const fecha_vencimiento = document.getElementById('prestamoFechaVencimiento').value;
  const cuenta_id = document.getElementById('prestamoCuentaId').value;
  const notas = document.getElementById('prestamoNotas').value.trim();

  if (!persona || monto_original <= 0 || !fecha_inicio) { showToast('Por favor completa todos los campos obligatorios.', 'warning'); return; }

  if (id) {
    const idx = prestamos.findIndex(p => p.id === id);
    if (idx === -1) { showToast('No se encontro el prestamo.', 'error'); return; }
    prestamos[idx].tipo = tipo; prestamos[idx].persona = persona; prestamos[idx].monto_original = monto_original;
    prestamos[idx].moneda = moneda; prestamos[idx].tasa_interes = tasa_interes; prestamos[idx].fecha_inicio = fecha_inicio;
    prestamos[idx].fecha_vencimiento = fecha_vencimiento; prestamos[idx].cuenta_id = cuenta_id;
    prestamos[idx].notas = notas; prestamos[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.prestamos, prestamos);
    showToast('Prestamo actualizado exitosamente.', 'success');
  } else {
    prestamos.push({ id: uuid(), tipo: tipo, persona: persona, monto_original: monto_original, moneda: moneda, tasa_interes: tasa_interes, fecha_inicio: fecha_inicio, fecha_vencimiento: fecha_vencimiento, saldo_pendiente: monto_original, pagos: [], estado: 'activo', cuenta_id: cuenta_id, notas: notas, created: new Date().toISOString() });
    saveData(STORAGE_KEYS.prestamos, prestamos);
    showToast('Prestamo creado exitosamente.', 'success');
  }
  closeModal();
  renderPrestamos();
}

function deletePrestamo(id) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const prestamo = prestamos.find(p => p.id === id);
  if (!prestamo) return;
  if (!confirm('\u00BFEstas seguro de eliminar el prestamo de "' + prestamo.persona + '" por ' + formatCurrencyInt(prestamo.monto_original, prestamo.moneda || 'MXN') + '?\n\nEsta accion no se puede deshacer.')) return;
  saveData(STORAGE_KEYS.prestamos, prestamos.filter(p => p.id !== id));
  showToast('Prestamo eliminado exitosamente.', 'info');
  renderPrestamos();
}

function registrarPago(prestamoId) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const prestamo = prestamos.find(p => p.id === prestamoId);
  if (!prestamo) return;
  const hoy = new Date().toISOString().split('T')[0];
  const cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });
  const cuentaOpciones = cuentasActivas.map(function(c) {
    var selected = prestamo.cuenta_id === c.id ? 'selected' : '';
    return '<option value="' + c.id + '" ' + selected + '>' + c.nombre + ' (' + c.moneda + ')</option>';
  }).join('');
  const formHTML = `
    <form id="formPago" onsubmit="savePago(event, '${prestamoId}')">
      <div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:4px;">Prestamo a: <strong style="color:var(--text-primary);">${prestamo.persona}</strong></div>
        <div style="font-size:14px;color:var(--text-muted);">Saldo pendiente: <strong style="color:var(--accent-amber);">${formatCurrencyInt(prestamo.saldo_pendiente, prestamo.moneda || 'MXN')}</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Monto del Pago *</label>
          <input type="number" id="pagoMonto" class="form-input" required step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="form-group"><label class="form-label">Fecha *</label>
          <input type="date" id="pagoFecha" class="form-input" required value="${hoy}"></div>
      </div>
      <div class="form-group"><label class="form-label">Cuenta Destino</label>
        <select id="pagoCuentaDestino" class="form-select">
          <option value="">Sin cuenta asociada</option>
          ${cuentaOpciones}
        </select>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Cuenta donde se recibe o paga el dinero</div>
      </div>
      <div class="form-group"><label class="form-label">Descripcion</label>
        <input type="text" id="pagoDescripcion" class="form-input" placeholder="Descripcion del pago..." value=""></div>
      <div class="form-group"><label class="form-label">Notas</label>
        <textarea id="pagoNotas" class="form-input" rows="2" style="resize:vertical;" placeholder="Notas del pago..."></textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Registrar Pago</button>
      </div>
    </form>`;
  openModal('Registrar Pago', formHTML);
}

function savePago(event, prestamoId) {
  event.preventDefault();
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const pIdx = prestamos.findIndex(p => p.id === prestamoId);
  if (pIdx === -1) { showToast('No se encontro el prestamo.', 'error'); return; }
  const prestamo = prestamos[pIdx];
  const monto = parseFloat(document.getElementById('pagoMonto').value) || 0;
  const fecha = document.getElementById('pagoFecha').value;
  const notas = document.getElementById('pagoNotas').value.trim();
  const cuentaDestinoId = document.getElementById('pagoCuentaDestino') ? document.getElementById('pagoCuentaDestino').value : '';
  const descripcion = document.getElementById('pagoDescripcion') ? document.getElementById('pagoDescripcion').value.trim() : '';
  if (monto <= 0 || !fecha) { showToast('Por favor completa todos los campos obligatorios.', 'warning'); return; }

  if (!prestamo.pagos) prestamo.pagos = [];
  prestamo.pagos.push({ id: uuid(), fecha: fecha, monto: monto, notas: notas, descripcion: descripcion, cuenta_destino_id: cuentaDestinoId || null });
  prestamo.saldo_pendiente -= monto;
  if (prestamo.saldo_pendiente <= 0) { prestamo.saldo_pendiente = 0; prestamo.estado = 'pagado'; }
  prestamos[pIdx] = prestamo;

  // Use cuenta_destino from form if provided, otherwise fall back to prestamo.cuenta_id
  var cuentaMovId = cuentaDestinoId || prestamo.cuenta_id;
  if (cuentaMovId) {
    const ctaIdx = cuentas.findIndex(c => c.id === cuentaMovId);
    if (ctaIdx !== -1) {
      var movDescripcion = descripcion || ('Pago de prestamo ' + (prestamo.tipo === 'otorgado' ? '- ' : 'a - ') + prestamo.persona);
      if (prestamo.tipo === 'otorgado') {
        movimientos.push({ id: uuid(), cuenta_id: cuentaMovId, tipo: 'ingreso', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: movDescripcion, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId + (notas ? '\n' + notas : ''), created: new Date().toISOString() });
        cuentas[ctaIdx].saldo += monto;
      } else if (prestamo.tipo === 'recibido') {
        movimientos.push({ id: uuid(), cuenta_id: cuentaMovId, tipo: 'gasto', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: movDescripcion, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId + (notas ? '\n' + notas : ''), created: new Date().toISOString() });
        cuentas[ctaIdx].saldo -= monto;
      }
      saveData(STORAGE_KEYS.cuentas, cuentas);
      saveData(STORAGE_KEYS.movimientos, movimientos);
    }
  }
  saveData(STORAGE_KEYS.prestamos, prestamos);
  closeModal();
  showToast(prestamo.estado === 'pagado' ? 'Pago registrado. El prestamo ha sido liquidado.' : 'Pago registrado exitosamente.', 'success');
  renderPrestamos();
}

function prestarMas(prestamoId) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const prestamo = prestamos.find(p => p.id === prestamoId);
  if (!prestamo) return;
  const hoy = new Date().toISOString().split('T')[0];
  const formHTML = `
    <form id="formPrestarMas" onsubmit="savePrestamoAdicional(event, '${prestamoId}')">
      <div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:4px;">Prestamo a: <strong style="color:var(--text-primary);">${prestamo.persona}</strong></div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:4px;">Monto original: <strong style="color:var(--text-primary);">${formatCurrencyInt(prestamo.monto_original, prestamo.moneda || 'MXN')}</strong></div>
        <div style="font-size:14px;color:var(--text-muted);">Saldo pendiente: <strong style="color:var(--accent-amber);">${formatCurrencyInt(prestamo.saldo_pendiente, prestamo.moneda || 'MXN')}</strong></div>
      </div>
      <div class="form-group"><label class="form-label">Monto Adicional a Prestar *</label>
        <input type="number" id="prestarMasMonto" class="form-input" required step="0.01" min="0.01" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label">Fecha *</label>
        <input type="date" id="prestarMasFecha" class="form-input" required value="${hoy}"></div>
      <div class="form-group"><label class="form-label">Notas</label>
        <textarea id="prestarMasNotas" class="form-input" rows="2" style="resize:vertical;" placeholder="Notas del prestamo adicional..."></textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-plus-circle"></i> Prestar Mas</button>
      </div>
    </form>`;
  openModal('Prestar Mas a ' + prestamo.persona, formHTML);
}

function savePrestamoAdicional(event, prestamoId) {
  event.preventDefault();
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const pIdx = prestamos.findIndex(p => p.id === prestamoId);
  if (pIdx === -1) { showToast('No se encontro el prestamo.', 'error'); return; }
  const prestamo = prestamos[pIdx];
  const monto = parseFloat(document.getElementById('prestarMasMonto').value) || 0;
  const fecha = document.getElementById('prestarMasFecha').value;
  const notas = document.getElementById('prestarMasNotas').value.trim();
  if (monto <= 0 || !fecha) { showToast('Por favor completa todos los campos obligatorios.', 'warning'); return; }

  if (!prestamo.pagos) prestamo.pagos = [];
  prestamo.pagos.push({ id: uuid(), fecha: fecha, monto: monto, notas: notas, tipo: 'prestamo_adicional' });
  prestamo.monto_original += monto;
  prestamo.saldo_pendiente += monto;
  if (prestamo.estado === 'pagado') prestamo.estado = 'activo';
  prestamos[pIdx] = prestamo;

  if (prestamo.cuenta_id) {
    const ctaIdx = cuentas.findIndex(c => c.id === prestamo.cuenta_id);
    if (ctaIdx !== -1) {
      if (prestamo.tipo === 'otorgado') {
        movimientos.push({ id: uuid(), cuenta_id: prestamo.cuenta_id, tipo: 'gasto', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: 'Prestamo adicional a ' + prestamo.persona, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId, created: new Date().toISOString() });
        cuentas[ctaIdx].saldo -= monto;
      } else if (prestamo.tipo === 'recibido') {
        movimientos.push({ id: uuid(), cuenta_id: prestamo.cuenta_id, tipo: 'ingreso', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: 'Prestamo adicional de ' + prestamo.persona, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId, created: new Date().toISOString() });
        cuentas[ctaIdx].saldo += monto;
      }
      saveData(STORAGE_KEYS.cuentas, cuentas);
      saveData(STORAGE_KEYS.movimientos, movimientos);
    }
  }
  saveData(STORAGE_KEYS.prestamos, prestamos);
  closeModal();
  showToast('Prestamo adicional de ' + formatCurrencyInt(monto, prestamo.moneda || 'MXN') + ' registrado.', 'success');
  renderPrestamos();
}

function verHistorialPagos(prestamoId) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const prestamo = prestamos.find(p => p.id === prestamoId);
  if (!prestamo) return;
  const pagos = prestamo.pagos || [];
  const moneda = prestamo.moneda || 'MXN';
  var esOtorgado = prestamo.tipo === 'otorgado';
  var labelAbono = esOtorgado ? 'Cobro' : 'Abono';

  // Calculate totals
  let totalPrestado = 0, totalAbonado = 0;
  pagos.forEach(function(p) {
    if (p.tipo === 'prestamo_adicional') totalPrestado += p.monto;
    else totalAbonado += p.monto;
  });

  // Initial loan amount (before any additional loans)
  var montoInicialOriginal = prestamo.monto_original - totalPrestado;

  // Build estado de cuenta: all entries chronologically
  // Include the original loan as the first entry
  var allEntries = [];
  allEntries.push({
    fecha: prestamo.fecha_inicio || prestamo.created.substring(0, 10),
    tipo: 'apertura',
    descripcion: 'Prestamo inicial' + (esOtorgado ? ' a ' : ' de ') + prestamo.persona,
    cargo: montoInicialOriginal,
    abono: 0,
    notas: ''
  });
  pagos.forEach(function(p) {
    var esAdicional = p.tipo === 'prestamo_adicional';
    allEntries.push({
      fecha: p.fecha || '',
      tipo: esAdicional ? 'prestamo_adicional' : 'abono',
      descripcion: esAdicional ? 'Prestamo adicional' : (p.descripcion || labelAbono),
      cargo: esAdicional ? p.monto : 0,
      abono: esAdicional ? 0 : p.monto,
      notas: p.notas || ''
    });
  });

  // Sort chronologically (oldest first)
  allEntries.sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

  // Build rows with running balance
  var saldoRunning = 0;
  var rows = allEntries.map(function(e) {
    saldoRunning += e.cargo - e.abono;
    if (saldoRunning < 0) saldoRunning = 0;

    var tipoLabel, tipoBadgeClass;
    if (e.tipo === 'apertura') { tipoLabel = 'Apertura'; tipoBadgeClass = 'badge-blue'; }
    else if (e.tipo === 'prestamo_adicional') { tipoLabel = 'Prestamo'; tipoBadgeClass = 'badge-amber'; }
    else { tipoLabel = labelAbono; tipoBadgeClass = 'badge-green'; }

    var cargoDisplay = e.cargo > 0 ? '<span style="color:var(--accent-amber);font-weight:600;">+' + formatCurrencyInt(e.cargo, moneda) + '</span>' : '';
    var abonoDisplay = e.abono > 0 ? '<span style="color:var(--accent-green);font-weight:600;">-' + formatCurrencyInt(e.abono, moneda) + '</span>' : '';

    return '<tr>' +
      '<td>' + (e.fecha ? formatDate(e.fecha) : '\u2014') + '</td>' +
      '<td><span class="badge ' + tipoBadgeClass + '" style="font-size:12px;">' + tipoLabel + '</span></td>' +
      '<td style="color:var(--text-primary);">' + e.descripcion + '</td>' +
      '<td style="text-align:right;">' + cargoDisplay + '</td>' +
      '<td style="text-align:right;">' + abonoDisplay + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-primary);">' + formatCurrencyInt(saldoRunning, moneda) + '</td>' +
      '</tr>';
  });

  var tablaPagos = '';
  if (allEntries.length <= 1 && pagos.length === 0) {
    tablaPagos = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-receipt" style="font-size:29px;display:block;margin-bottom:8px;opacity:0.4;"></i>No hay movimientos adicionales registrados para este prestamo.</div>';
  } else {
    tablaPagos = '<div style="overflow-x:auto;"><table class="data-table" style="table-layout:fixed;width:100%;"><colgroup><col style="width:14%;"><col style="width:12%;"><col style="width:28%;"><col style="width:16%;"><col style="width:14%;"><col style="width:16%;"></colgroup><thead><tr>' +
      '<th>Fecha</th><th>Concepto</th><th>Descripcion</th><th style="text-align:right;">Cargo</th><th style="text-align:right;">' + labelAbono + '</th><th style="text-align:right;">Saldo</th>' +
      '</tr></thead><tbody>' + rows.join('') + '</tbody>' +
      '<tfoot><tr style="font-weight:700;border-top:2px solid var(--border-color);background:var(--bg-base);">' +
      '<td colspan="3" style="font-weight:700;">Saldo Final</td>' +
      '<td style="text-align:right;color:var(--accent-amber);font-weight:700;">' + formatCurrencyInt(montoInicialOriginal + totalPrestado, moneda) + '</td>' +
      '<td style="text-align:right;color:var(--accent-green);font-weight:700;">' + formatCurrencyInt(totalAbonado, moneda) + '</td>' +
      '<td style="text-align:right;font-weight:800;color:var(--text-primary);">' + formatCurrencyInt(prestamo.saldo_pendiente, moneda) + '</td>' +
      '</tr></tfoot></table></div>';
  }

  // Summary cards at top
  var summaryCards = '<div style="margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">' +
    '<div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-base);"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Persona</div><div style="font-size:15px;font-weight:700;color:var(--text-primary);">' + prestamo.persona + '</div></div>' +
    '<div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-base);"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Total Prestado</div><div style="font-size:15px;font-weight:700;color:var(--accent-amber);">' + formatCurrencyInt(montoInicialOriginal + totalPrestado, moneda) + '</div></div>' +
    '<div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-base);"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Total ' + labelAbono + 's</div><div style="font-size:15px;font-weight:700;color:var(--accent-green);">' + formatCurrencyInt(totalAbonado, moneda) + '</div></div>' +
    '<div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-base);"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Saldo Pendiente</div><div style="font-size:15px;font-weight:700;color:' + (prestamo.saldo_pendiente > 0 ? 'var(--accent-red)' : 'var(--accent-green)') + ';">' + formatCurrencyInt(prestamo.saldo_pendiente, moneda) + '</div></div>' +
    '</div>';

  var estadoLabel = prestamo.estado.charAt(0).toUpperCase() + prestamo.estado.slice(1);
  var estadoBadge = prestamo.estado === 'pagado' ? 'badge-green' : prestamo.estado === 'activo' ? 'badge-blue' : 'badge-amber';

  const bodyHTML = summaryCards +
    '<div style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">Fecha de inicio: <strong style="color:var(--text-primary);">' + formatDate(prestamo.fecha_inicio || '') + '</strong>' +
    (prestamo.fecha_vencimiento ? ' &nbsp;|&nbsp; Vencimiento: <strong style="color:var(--text-primary);">' + formatDate(prestamo.fecha_vencimiento) + '</strong>' : '') +
    ' &nbsp;|&nbsp; Estado: <span class="badge ' + estadoBadge + '" style="font-size:12px;">' + estadoLabel + '</span></div>' +
    tablaPagos +
    '<div style="display:flex;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>';
  openModal('Estado de Cuenta — ' + prestamo.persona, bodyHTML);
  var mc = document.querySelector('.modal-content');
  if (mc) mc.classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 100);
}

function checkVencimientos() {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const hoy = new Date().toISOString().split('T')[0];
  let changed = false;
  prestamos.forEach(function(p) {
    if (p.estado === 'activo' && p.fecha_vencimiento && p.fecha_vencimiento < hoy) { p.estado = 'vencido'; changed = true; }
  });
  if (changed) saveData(STORAGE_KEYS.prestamos, prestamos);
}

/* ============================================================
   DESGLOSE PRESTAMOS KPI (click on KPI cards)
   ============================================================ */
function mostrarDesglosePrestamosKpi(tipo) {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  var titulo, filtered;
  if (tipo === 'otorgado') {
    titulo = 'Desglose: Prestamos Otorgados';
    filtered = prestamos.filter(function(p) { return p.tipo === 'otorgado' && p.estado !== 'pagado'; });
  } else if (tipo === 'recibido') {
    titulo = 'Desglose: Prestamos Recibidos';
    filtered = prestamos.filter(function(p) { return p.tipo === 'recibido' && p.estado !== 'pagado'; });
  } else {
    titulo = 'Desglose: Balance Neto de Prestamos';
    filtered = prestamos.filter(function(p) { return p.estado !== 'pagado'; });
  }

  if (filtered.length === 0) {
    openModal(titulo, '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-info-circle" style="margin-right:6px;"></i>No hay prestamos activos en esta categoria.</div>');
    return;
  }

  var totalMXN = 0;
  var rows = filtered.sort(function(a, b) {
    return toMXN(b.saldo_pendiente || b.monto_original, b.moneda || 'MXN', tiposCambio) - toMXN(a.saldo_pendiente || a.monto_original, a.moneda || 'MXN', tiposCambio);
  }).map(function(p) {
    var moneda = p.moneda || 'MXN';
    var saldo = p.saldo_pendiente != null ? p.saldo_pendiente : p.monto_original;
    var valorMXN = toMXN(saldo, moneda, tiposCambio);
    totalMXN += (p.tipo === 'otorgado' ? valorMXN : -valorMXN);
    var tipoLabel = p.tipo === 'otorgado' ? '<span class="badge badge-amber" style="font-size:12px;">Otorgado</span>' : '<span class="badge badge-blue" style="font-size:12px;">Recibido</span>';
    var estadoBadge = p.estado === 'vencido' ? '<span class="badge badge-red" style="font-size:12px;">Vencido</span>' : '<span class="badge badge-green" style="font-size:12px;">Activo</span>';
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + (p.persona || 'N/A') + '</td>' +
      (tipo === 'balance' ? '<td style="text-align:center;">' + tipoLabel + '</td>' : '') +
      '<td style="text-align:right;white-space:nowrap;">' + formatCurrencyInt(p.monto_original, moneda) + '</td>' +
      '<td style="text-align:right;white-space:nowrap;font-weight:600;">' + formatCurrencyInt(saldo, moneda) + '</td>' +
      '<td style="text-align:center;"><span class="badge ' + monedaBadgeClass(moneda) + '" style="font-size:12px;">' + moneda + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap;font-weight:600;color:var(--accent-blue);">' + formatCurrencyInt(valorMXN, 'MXN') + '</td>' +
      '<td style="text-align:center;">' + estadoBadge + '</td>' +
    '</tr>';
  }).join('');

  var totalColor = totalMXN >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">' +
    '<td>Total</td>' +
    (tipo === 'balance' ? '<td></td>' : '') +
    '<td></td><td></td><td></td>' +
    '<td style="text-align:right;color:' + totalColor + ';">' + formatCurrencyInt(Math.abs(totalMXN), 'MXN') + '</td>' +
    '<td></td></tr>';

  var html = '<table class="data-table sortable-table"><thead><tr>' +
    '<th>Persona</th>' +
    (tipo === 'balance' ? '<th style="text-align:center;">Tipo</th>' : '') +
    '<th style="text-align:right;">Monto Original</th>' +
    '<th style="text-align:right;">Saldo Pendiente</th>' +
    '<th style="text-align:center;">Moneda</th>' +
    '<th style="text-align:right;">Valor MXN</th>' +
    '<th style="text-align:center;">Estado</th>' +
  '</tr></thead><tbody>' + rows + '</tbody></table>';

  openModal(titulo, html, { wide: true });
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
}

/* ============================================================
   PRESTAMOS — TAB SWITCHING & EDITING
   ============================================================ */
var _prestamosCurrentTab = 'vista';

function _switchPrestamosTab(tab) {
  _prestamosCurrentTab = tab;
  var vistaTab = document.getElementById('prestamosVistaTab');
  var edicionTab = document.getElementById('prestamosEdicionTab');
  var btnVista = document.getElementById('tabPrestamosVista');
  var btnEdicion = document.getElementById('tabPrestamosEdicion');
  if (!vistaTab || !edicionTab) return;
  if (tab === 'vista') {
    vistaTab.style.display = '';
    edicionTab.style.display = 'none';
    if (btnVista) { btnVista.className = 'btn btn-primary'; btnVista.style.cssText = 'padding:6px 16px;font-size:13px;'; }
    if (btnEdicion) { btnEdicion.className = 'btn btn-secondary'; btnEdicion.style.cssText = 'padding:6px 16px;font-size:13px;'; }
  } else {
    vistaTab.style.display = 'none';
    edicionTab.style.display = '';
    if (btnVista) { btnVista.className = 'btn btn-secondary'; btnVista.style.cssText = 'padding:6px 16px;font-size:13px;'; }
    if (btnEdicion) { btnEdicion.className = 'btn btn-primary'; btnEdicion.style.cssText = 'padding:6px 16px;font-size:13px;'; }
    _renderEdicionContent();
  }
}

function _renderEdicionContent() {
  var container = document.getElementById('prestamosEdicionTab');
  if (!container) return;
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  if (prestamos.length === 0) {
    container.innerHTML = '<div class="card"><div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-edit" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.4;"></i>No hay prestamos para editar.</div></div>';
    return;
  }

  // Sort: activos first, then by persona
  var sorted = prestamos.slice().sort(function(a, b) {
    if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
    if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;
    return (a.persona || '').localeCompare(b.persona || '');
  });

  var rows = sorted.map(function(p, idx) {
    var moneda = p.moneda || 'MXN';
    var tipoBadge = p.tipo === 'otorgado' ? 'badge-green' : 'badge-red';
    var estadoBadge = p.estado === 'pagado' ? 'badge-blue' : p.estado === 'vencido' ? 'badge-red' : 'badge-green';
    var numPagos = (p.pagos || []).length;
    var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
    return '<tr style="' + zebra + '">' +
      '<td style="font-weight:600;color:var(--text-primary);">' + (p.persona || '\u2014') + '</td>' +
      '<td><span class="badge ' + tipoBadge + '" style="font-size:11px;">' + (p.tipo === 'otorgado' ? 'Otorgado' : 'Recibido') + '</span></td>' +
      '<td style="text-align:right;">' + formatCurrencyInt(p.monto_original, moneda) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-primary);">' + formatCurrencyInt(p.saldo_pendiente, moneda) + '</td>' +
      '<td><span class="badge ' + estadoBadge + '" style="font-size:11px;">' + (p.estado || 'activo') + '</span></td>' +
      '<td style="text-align:center;">' +
        (numPagos > 0 ? '<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px;margin-right:4px;" onclick="_verPagosEdicion(\'' + p.id + '\')" title="Ver pagos (' + numPagos + ')"><i class="fas fa-list-ol"></i> ' + numPagos + '</button>' : '<span style="color:var(--text-muted);font-size:11px;">0</span>') +
      '</td>' +
      '<td style="text-align:center;">' +
        '<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;margin-right:4px;" onclick="_editPrestamoModal(\'' + p.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="_deletePrestamoEdicion(\'' + p.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  var html = '<div class="card">' +
    '<div style="overflow-x:auto;">' +
    '<table class="data-table sortable-table" id="tablaEdicionPrestamos">' +
    '<thead><tr>' +
      '<th>Persona</th>' +
      '<th>Tipo</th>' +
      '<th style="text-align:right;">Monto Original</th>' +
      '<th style="text-align:right;">Saldo Pendiente</th>' +
      '<th>Estado</th>' +
      '<th style="text-align:center;">Pagos</th>' +
      '<th style="text-align:center;" data-no-sort="true">Acciones</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div></div>';

  container.innerHTML = html;
  setTimeout(function() { _initSortableTables(container); }, 100);
}

/* --- Edit prestamo via modal (like movimientos) --- */
function _editPrestamoModal(prestamoId) {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var p = prestamos.find(function(x) { return x.id === prestamoId; });
  if (!p) return;

  var moneda = p.moneda || 'MXN';
  var cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });
  var cuentaOpciones = '<option value="">Sin cuenta vinculada</option>' + cuentasActivas.map(function(c) {
    return '<option value="' + c.id + '" ' + (p.cuenta_id === c.id ? 'selected' : '') + '>' + c.nombre + ' (' + c.moneda + ')</option>';
  }).join('');

  var formHTML = '<form id="formEdicionPrestamo" onsubmit="_saveEdicionPrestamo(event, \'' + prestamoId + '\')">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Persona *</label><input type="text" id="edPersNombre" class="form-input" required value="' + (p.persona || '').replace(/"/g, '&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Tipo</label><select id="edPersTipo" class="form-select"><option value="otorgado" ' + (p.tipo === 'otorgado' ? 'selected' : '') + '>Otorgado</option><option value="recibido" ' + (p.tipo === 'recibido' ? 'selected' : '') + '>Recibido</option></select></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Monto Original *</label><input type="number" id="edPersMonto" class="form-input" required step="0.01" min="0.01" value="' + (p.monto_original || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Moneda</label><select id="edPersMoneda" class="form-select"><option value="MXN" ' + (moneda === 'MXN' ? 'selected' : '') + '>MXN</option><option value="USD" ' + (moneda === 'USD' ? 'selected' : '') + '>USD</option><option value="EUR" ' + (moneda === 'EUR' ? 'selected' : '') + '>EUR</option></select></div>' +
    '<div class="form-group"><label class="form-label">Tasa Interes %</label><input type="number" id="edPersTasa" class="form-input" step="0.01" value="' + (p.tasa_interes || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Fecha Inicio *</label><input type="date" id="edPersFechaInicio" class="form-input" required value="' + (p.fecha_inicio || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Fecha Vencimiento</label><input type="date" id="edPersFechaVenc" class="form-input" value="' + (p.fecha_vencimiento || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Cuenta Vinculada</label><select id="edPersCuenta" class="form-select">' + cuentaOpciones + '</select></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Notas</label><textarea id="edPersNotas" class="form-input" rows="2" style="resize:vertical;">' + (p.notas || '') + '</textarea></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save" style="margin-right:4px;"></i>Guardar Cambios</button>' +
    '</div></form>';

  openModal('Editar Prestamo \u2014 ' + p.persona, formHTML);
}

function _saveEdicionPrestamo(event, prestamoId) {
  event.preventDefault();
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var idx = prestamos.findIndex(function(p) { return p.id === prestamoId; });
  if (idx === -1) { showToast('Prestamo no encontrado.', 'error'); return; }

  var p = prestamos[idx];
  p.persona = document.getElementById('edPersNombre').value.trim();
  p.tipo = document.getElementById('edPersTipo').value;
  p.monto_original = parseFloat(document.getElementById('edPersMonto').value) || 0;
  p.moneda = document.getElementById('edPersMoneda').value;
  p.tasa_interes = parseFloat(document.getElementById('edPersTasa').value) || 0;
  p.fecha_inicio = document.getElementById('edPersFechaInicio').value;
  p.fecha_vencimiento = document.getElementById('edPersFechaVenc').value;
  p.cuenta_id = document.getElementById('edPersCuenta').value || null;
  p.notas = document.getElementById('edPersNotas').value.trim();

  // Recalculate saldo_pendiente
  var pagos = p.pagos || [];
  var totalAbonos = 0, totalAdicionales = 0;
  pagos.forEach(function(pg) {
    if (pg.tipo === 'prestamo_adicional') totalAdicionales += pg.monto;
    else totalAbonos += pg.monto;
  });
  p.saldo_pendiente = p.monto_original + totalAdicionales - totalAbonos;
  if (p.saldo_pendiente <= 0) { p.saldo_pendiente = 0; p.estado = 'pagado'; }
  else if (p.estado === 'pagado') { p.estado = 'activo'; }

  prestamos[idx] = p;
  saveData(STORAGE_KEYS.prestamos, prestamos);
  closeModal();
  showToast('Prestamo actualizado exitosamente.', 'success');
  _renderEdicionContent();
}

/* --- Delete prestamo from edicion tab --- */
function _deletePrestamoEdicion(prestamoId) {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var p = prestamos.find(function(x) { return x.id === prestamoId; });
  if (!p) return;
  if (!confirm('\u00BFEliminar el prestamo de "' + p.persona + '" por ' + formatCurrencyInt(p.monto_original, p.moneda || 'MXN') + '?\n\nEsta accion no se puede deshacer.')) return;
  saveData(STORAGE_KEYS.prestamos, prestamos.filter(function(x) { return x.id !== prestamoId; }));
  showToast('Prestamo eliminado.', 'success');
  _renderEdicionContent();
}

/* --- View payments for a prestamo in modal --- */
function _verPagosEdicion(prestamoId) {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var p = prestamos.find(function(x) { return x.id === prestamoId; });
  if (!p) return;
  var moneda = p.moneda || 'MXN';
  var pagos = (p.pagos || []).slice().sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

  var pagosRows = pagos.map(function(pg, idx) {
    var esAdicional = pg.tipo === 'prestamo_adicional';
    var tipoBadge = esAdicional ? '<span class="badge badge-amber" style="font-size:11px;">Prestamo</span>' : '<span class="badge badge-green" style="font-size:11px;">Abono</span>';
    var montoColor = esAdicional ? 'var(--accent-amber)' : 'var(--accent-green)';
    var prefix = esAdicional ? '+' : '-';
    var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
    return '<tr style="' + zebra + '">' +
      '<td>' + (pg.fecha ? formatDate(pg.fecha) : '\u2014') + '</td>' +
      '<td>' + tipoBadge + '</td>' +
      '<td style="color:' + montoColor + ';font-weight:600;text-align:right;">' + prefix + formatCurrencyInt(pg.monto, moneda) + '</td>' +
      '<td>' + (pg.descripcion || '\u2014') + '</td>' +
      '<td style="text-align:center;">' +
      '<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px;margin-right:4px;" onclick="_editPagoInline(\'' + prestamoId + '\',\'' + pg.id + '\')" title="Editar"><i class="fas fa-pencil-alt"></i></button>' +
      '<button class="btn btn-danger" style="padding:3px 8px;font-size:11px;" onclick="_deletePagoEdicion(\'' + prestamoId + '\',\'' + pg.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
      '</td></tr>';
  }).join('');

  var html = '<div style="overflow-x:auto;">' +
    '<table class="data-table sortable-table">' +
    '<thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right;">Monto</th><th>Descripcion</th><th style="text-align:center;" data-no-sort="true">Acciones</th></tr></thead>' +
    '<tbody>' + (pagosRows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No hay pagos registrados.</td></tr>') + '</tbody>' +
    '</table></div>';

  openModal('Pagos \u2014 ' + p.persona + ' (' + pagos.length + ' registro' + (pagos.length !== 1 ? 's' : '') + ')', html, { wide: true });
  setTimeout(function() { _initSortableTables(document.getElementById('modalBody')); }, 100);
}

function _editPagoInline(prestamoId, pagoId) {
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var p = prestamos.find(function(x) { return x.id === prestamoId; });
  if (!p) return;
  var pago = (p.pagos || []).find(function(pg) { return pg.id === pagoId; });
  if (!pago) return;
  var moneda = p.moneda || 'MXN';
  var esAdicional = pago.tipo === 'prestamo_adicional';

  var formHTML = '<form id="formEditPago" onsubmit="_savePagoEdit(event, \'' + prestamoId + '\', \'' + pagoId + '\')">' +
    '<div style="margin-bottom:12px;padding:10px;border-radius:8px;background:var(--bg-base);">' +
    '<div style="font-size:13px;color:var(--text-muted);">Tipo: <strong style="color:var(--text-primary);">' + (esAdicional ? 'Prestamo Adicional' : 'Abono/Pago') + '</strong></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Monto *</label><input type="number" id="editPagoMonto" class="form-input" required step="0.01" min="0.01" value="' + pago.monto + '"></div>' +
    '<div class="form-group"><label class="form-label">Fecha *</label><input type="date" id="editPagoFecha" class="form-input" required value="' + (pago.fecha || '') + '"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Descripcion</label><input type="text" id="editPagoDesc" class="form-input" value="' + (pago.descripcion || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Notas</label><textarea id="editPagoNotas" class="form-input" rows="2" style="resize:vertical;">' + (pago.notas || '') + '</textarea></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save" style="margin-right:4px;"></i>Guardar</button>' +
    '</div></form>';

  openModal('Editar Pago — ' + formatCurrencyInt(pago.monto, moneda), formHTML);
}

function _savePagoEdit(event, prestamoId, pagoId) {
  event.preventDefault();
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var pIdx = prestamos.findIndex(function(x) { return x.id === prestamoId; });
  if (pIdx === -1) return;

  var p = prestamos[pIdx];
  var pgIdx = (p.pagos || []).findIndex(function(pg) { return pg.id === pagoId; });
  if (pgIdx === -1) return;

  p.pagos[pgIdx].monto = parseFloat(document.getElementById('editPagoMonto').value) || 0;
  p.pagos[pgIdx].fecha = document.getElementById('editPagoFecha').value;
  p.pagos[pgIdx].descripcion = document.getElementById('editPagoDesc').value.trim();
  p.pagos[pgIdx].notas = document.getElementById('editPagoNotas').value.trim();

  // Recalculate saldo
  var totalAbonos = 0, totalAdicionales = 0;
  p.pagos.forEach(function(pg) {
    if (pg.tipo === 'prestamo_adicional') totalAdicionales += pg.monto;
    else totalAbonos += pg.monto;
  });
  p.saldo_pendiente = p.monto_original + totalAdicionales - totalAbonos;
  if (p.saldo_pendiente <= 0) { p.saldo_pendiente = 0; p.estado = 'pagado'; }
  else if (p.estado === 'pagado') { p.estado = 'activo'; }

  prestamos[pIdx] = p;
  saveData(STORAGE_KEYS.prestamos, prestamos);
  closeModal();
  showToast('Pago actualizado.', 'success');
  _renderEdicionContent();
  _verPagosEdicion(prestamoId);
}

function _deletePagoEdicion(prestamoId, pagoId) {
  if (!confirm('¿Eliminar este pago? Esta accion no se puede deshacer.')) return;
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  var pIdx = prestamos.findIndex(function(x) { return x.id === prestamoId; });
  if (pIdx === -1) return;

  var p = prestamos[pIdx];
  p.pagos = (p.pagos || []).filter(function(pg) { return pg.id !== pagoId; });

  // Recalculate saldo
  var totalAbonos = 0, totalAdicionales = 0;
  p.pagos.forEach(function(pg) {
    if (pg.tipo === 'prestamo_adicional') totalAdicionales += pg.monto;
    else totalAbonos += pg.monto;
  });
  p.saldo_pendiente = p.monto_original + totalAdicionales - totalAbonos;
  if (p.saldo_pendiente <= 0) { p.saldo_pendiente = 0; p.estado = 'pagado'; }
  else if (p.estado === 'pagado') { p.estado = 'activo'; }

  prestamos[pIdx] = p;
  saveData(STORAGE_KEYS.prestamos, prestamos);
  showToast('Pago eliminado.', 'success');
  _renderEdicionContent();
  _verPagosEdicion(prestamoId);
}
