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
      <div class="card" style="border-left:3px solid var(--accent-amber);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-hand-holding-usd" style="color:var(--accent-amber);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Otorgado</span>
        </div>
        <div id="kpiTotalOtorgado" style="font-size:20px;font-weight:800;color:var(--accent-amber);">${formatCurrency(totalOtorgado, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-blue);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-file-invoice-dollar" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Recibido</span>
        </div>
        <div id="kpiTotalRecibido" style="font-size:20px;font-weight:800;color:var(--accent-blue);">${formatCurrency(totalRecibido, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-${balanceColor});">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-${balanceColor}-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-balance-scale" style="color:var(--accent-${balanceColor});font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Balance Neto</span>
        </div>
        <div id="kpiBalanceNeto" style="font-size:20px;font-weight:800;color:var(--accent-${balanceColor});">${formatCurrency(balanceNeto, 'MXN')}</div>
      </div>
    </div>
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
    </div>`;
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
  if (kpiO) kpiO.textContent = formatCurrency(totalOtorgado, 'MXN');
  if (kpiR) kpiR.textContent = formatCurrency(totalRecibido, 'MXN');
  if (kpiB) { kpiB.textContent = formatCurrency(balanceNeto, 'MXN'); kpiB.style.color = balanceNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'; }

  const tbody = document.getElementById('tbodyPrestamos');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>No se encontraron prestamos con los filtros aplicados.</td></tr>';
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
    var acc = '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="editPrestamo(\'' + p.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
    if (p.estado === 'activo') acc += '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="registrarPago(\'' + p.id + '\')" title="Registrar Pago"><i class="fas fa-money-bill-wave"></i></button>';
    if (p.estado === 'activo') acc += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;border-color:var(--accent-amber);color:var(--accent-amber);" onclick="prestarMas(\'' + p.id + '\')" title="Prestar Mas"><i class="fas fa-plus-circle"></i></button>';
    acc += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="verHistorialPagos(\'' + p.id + '\')" title="Ver Pagos"><i class="fas fa-history"></i></button>';
    acc += '<button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deletePrestamo(\'' + p.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';
    var sc = p.saldo_pendiente > 0 ? 'var(--accent-amber)' : 'var(--accent-green)';
    return '<tr style="' + zebra + '"><td style="font-weight:600;color:var(--text-primary);">' + p.persona + '</td><td><span class="badge ' + tipoBadge + '">' + tipoLabel + '</span></td><td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(p.monto_original, p.moneda || 'MXN') + '</td><td style="text-align:right;font-weight:600;color:' + sc + ';">' + formatCurrency(p.saldo_pendiente, p.moneda || 'MXN') + '</td><td style="text-align:right;">' + tasa + '</td><td>' + venc + '</td><td><span class="badge ' + estadoBadge + '">' + estadoLabel + '</span></td><td style="text-align:center;">' + acc + '</td></tr>';
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
  if (!confirm('\u00BFEstas seguro de eliminar el prestamo de "' + prestamo.persona + '" por ' + formatCurrency(prestamo.monto_original, prestamo.moneda || 'MXN') + '?\n\nEsta accion no se puede deshacer.')) return;
  saveData(STORAGE_KEYS.prestamos, prestamos.filter(p => p.id !== id));
  showToast('Prestamo eliminado exitosamente.', 'info');
  renderPrestamos();
}

function registrarPago(prestamoId) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const prestamo = prestamos.find(p => p.id === prestamoId);
  if (!prestamo) return;
  const hoy = new Date().toISOString().split('T')[0];
  const formHTML = `
    <form id="formPago" onsubmit="savePago(event, '${prestamoId}')">
      <div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Prestamo a: <strong style="color:var(--text-primary);">${prestamo.persona}</strong></div>
        <div style="font-size:12px;color:var(--text-muted);">Saldo pendiente: <strong style="color:var(--accent-amber);">${formatCurrency(prestamo.saldo_pendiente, prestamo.moneda || 'MXN')}</strong></div>
      </div>
      <div class="form-group"><label class="form-label">Monto del Pago *</label>
        <input type="number" id="pagoMonto" class="form-input" required step="0.01" min="0.01" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label">Fecha *</label>
        <input type="date" id="pagoFecha" class="form-input" required value="${hoy}"></div>
      <div class="form-group"><label class="form-label">Notas</label>
        <textarea id="pagoNotas" class="form-input" rows="2" style="resize:vertical;" placeholder="Notas del pago..."></textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
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
  if (monto <= 0 || !fecha) { showToast('Por favor completa todos los campos obligatorios.', 'warning'); return; }

  if (!prestamo.pagos) prestamo.pagos = [];
  prestamo.pagos.push({ id: uuid(), fecha: fecha, monto: monto, notas: notas });
  prestamo.saldo_pendiente -= monto;
  if (prestamo.saldo_pendiente <= 0) { prestamo.saldo_pendiente = 0; prestamo.estado = 'pagado'; }
  prestamos[pIdx] = prestamo;

  if (prestamo.cuenta_id) {
    const ctaIdx = cuentas.findIndex(c => c.id === prestamo.cuenta_id);
    if (ctaIdx !== -1) {
      if (prestamo.tipo === 'otorgado') {
        movimientos.push({ id: uuid(), cuenta_id: prestamo.cuenta_id, tipo: 'ingreso', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: 'Pago de prestamo - ' + prestamo.persona, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId, created: new Date().toISOString() });
        cuentas[ctaIdx].saldo += monto;
      } else if (prestamo.tipo === 'recibido') {
        movimientos.push({ id: uuid(), cuenta_id: prestamo.cuenta_id, tipo: 'gasto', monto: monto, moneda: prestamo.moneda || cuentas[ctaIdx].moneda, categoria_id: null, descripcion: 'Pago de prestamo a - ' + prestamo.persona, fecha: fecha, notas: 'Prestamo ID: ' + prestamoId, created: new Date().toISOString() });
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
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Prestamo a: <strong style="color:var(--text-primary);">${prestamo.persona}</strong></div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Monto original: <strong style="color:var(--text-primary);">${formatCurrency(prestamo.monto_original, prestamo.moneda || 'MXN')}</strong></div>
        <div style="font-size:12px;color:var(--text-muted);">Saldo pendiente: <strong style="color:var(--accent-amber);">${formatCurrency(prestamo.saldo_pendiente, prestamo.moneda || 'MXN')}</strong></div>
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
  showToast('Prestamo adicional de ' + formatCurrency(monto, prestamo.moneda || 'MXN') + ' registrado.', 'success');
  renderPrestamos();
}

function verHistorialPagos(prestamoId) {
  const prestamos = loadData(STORAGE_KEYS.prestamos) || [];
  const prestamo = prestamos.find(p => p.id === prestamoId);
  if (!prestamo) return;
  const pagos = prestamo.pagos || [];
  const moneda = prestamo.moneda || 'MXN';

  // Calculate totals
  let totalPrestado = 0, totalAbonado = 0;
  pagos.forEach(function(p) {
    if (p.tipo === 'prestamo_adicional') totalPrestado += p.monto;
    else totalAbonado += p.monto;
  });

  let tablaPagos = '';
  if (pagos.length === 0) {
    tablaPagos = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-receipt" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>No hay movimientos registrados para este prestamo.</div>';
  } else {
    // Sort chronologically (oldest first) to calculate running balance
    var sorted = [...pagos].sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

    // Calculate running balance starting from the initial loan amount (monto_original minus all additions)
    var montoInicialOriginal = prestamo.monto_original - totalPrestado;
    var saldoRunning = montoInicialOriginal;

    var rows = sorted.map(function(p) {
      var esAdicional = p.tipo === 'prestamo_adicional';
      if (esAdicional) {
        saldoRunning += p.monto;
      } else {
        saldoRunning -= p.monto;
      }
      if (saldoRunning < 0) saldoRunning = 0;

      var tipoBadge = esAdicional
        ? '<span class="badge badge-amber" style="font-size:10px;">Prestamo</span>'
        : '<span class="badge badge-green" style="font-size:10px;">Abono</span>';
      var montoColor = esAdicional ? 'var(--accent-amber)' : 'var(--accent-green)';
      var montoPrefix = esAdicional ? '+' : '-';

      return '<tr>' +
        '<td>' + (p.fecha ? formatDate(p.fecha) : '\u2014') + '</td>' +
        '<td>' + tipoBadge + '</td>' +
        '<td style="text-align:right;color:' + montoColor + ';font-weight:600;">' + montoPrefix + formatCurrency(p.monto, moneda) + '</td>' +
        '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(saldoRunning, moneda) + '</td>' +
        '<td style="color:var(--text-muted);font-size:12px;">' + (p.notas || '\u2014') + '</td>' +
        '</tr>';
    });

    // Reverse to show newest first
    rows.reverse();

    tablaPagos = '<div style="overflow-x:auto;"><table class="data-table sortable-table"><thead><tr>' +
      '<th>Fecha</th><th>Tipo</th><th style="text-align:right;">Monto</th><th style="text-align:right;">Saldo</th><th>Notas</th>' +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';

    // Summary row
    tablaPagos += '<div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--bg-base);display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
      '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Prestado</div><div style="font-size:15px;font-weight:800;color:var(--accent-amber);">' + formatCurrency(montoInicialOriginal + totalPrestado, moneda) + '</div></div>' +
      '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Abonado</div><div style="font-size:15px;font-weight:800;color:var(--accent-green);">' + formatCurrency(totalAbonado, moneda) + '</div></div>' +
      '<div style="text-align:center;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Saldo Actual</div><div style="font-size:15px;font-weight:800;color:var(--text-primary);">' + formatCurrency(prestamo.saldo_pendiente, moneda) + '</div></div>' +
      '</div>';
  }

  const bodyHTML = `
    <div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Persona</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">${prestamo.persona}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Monto Original</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">${formatCurrency(prestamo.monto_original, moneda)}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Saldo Pendiente</div><div style="font-size:14px;font-weight:700;color:var(--accent-amber);">${formatCurrency(prestamo.saldo_pendiente, moneda)}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Estado</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">${prestamo.estado.charAt(0).toUpperCase() + prestamo.estado.slice(1)}</div></div>
      </div>
    </div>
    ${tablaPagos}
    <div style="display:flex;justify-content:flex-end;margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>`;
  openModal('Historial de Movimientos', bodyHTML);
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
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
