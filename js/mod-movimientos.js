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

  // -- Summary totals (all movimientos, converted to MXN) --
  let totalIngresos = 0;
  let totalGastos = 0;
  movimientos.forEach(m => {
    const cuenta = cuentaMap[m.cuenta_id];
    const moneda = cuenta ? cuenta.moneda : 'MXN';
    const montoMXN = toMXN(m.monto, moneda, tiposCambio);
    if (m.tipo === 'ingreso') totalIngresos += montoMXN;
    else if (m.tipo === 'gasto') totalGastos += montoMXN;
  });
  const balance = totalIngresos - totalGastos;

  // -- Cuenta options for filter --
  const cuentasActivas = cuentas.filter(c => c.activa !== false);
  const cuentaFilterOpts = cuentasActivas
    .map(c => `<option value="${c.id}">${c.nombre}</option>`)
    .join('');

  // -- Render HTML --
  el.innerHTML = `
    <!-- Resumen de Movimientos -->
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-green);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-arrow-down" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Ingresos</span>
        </div>
        <div id="movSumIngresos" style="font-size:20px;font-weight:800;color:var(--accent-green);">${formatCurrency(totalIngresos, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-red);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-arrow-up" style="color:var(--accent-red);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Gastos</span>
        </div>
        <div id="movSumGastos" style="font-size:20px;font-weight:800;color:var(--accent-red);">${formatCurrency(totalGastos, 'MXN')}</div>
      </div>
      <div class="card" style="border-left:3px solid ${balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-amber)'};">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:${balance >= 0 ? 'var(--accent-blue-soft)' : 'var(--accent-amber-soft)'};display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-balance-scale" style="color:${balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-amber)'};font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Balance del Periodo</span>
        </div>
        <div id="movSumBalance" style="font-size:20px;font-weight:800;color:${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${(balance >= 0 ? '+' : '') + formatCurrency(balance, 'MXN')}</div>
      </div>
    </div>

    <!-- Barra de Filtros y Boton Nuevo Movimiento -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:130px;">
            <input type="date" id="filterMovDesde" class="form-input" onchange="filterMovimientos()">
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px;">
            <input type="date" id="filterMovHasta" class="form-input" onchange="filterMovimientos()">
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:120px;">
            <select id="filterMovTipo" class="form-select" onchange="filterMovimientos()">
              <option value="">Todos los tipos</option>
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:160px;">
            <select id="filterMovCuenta" class="form-select" onchange="filterMovimientos()">
              <option value="">Todas las cuentas</option>
              ${cuentaFilterOpts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:180px;">
            <input type="text" id="filterMovSearch" class="form-input" placeholder="Buscar movimiento..." oninput="filterMovimientos()">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-secondary" onclick="exportarExcel('movimientos')" title="Exportar a Excel">
            <i class="fas fa-download" style="margin-right:4px;"></i>Exportar
          </button>
          <button class="btn btn-secondary" onclick="openPlantillasRecurrentes()">
            <i class="fas fa-sync-alt" style="margin-right:4px;"></i>Plantillas Recurrentes
          </button>
          <button class="btn btn-secondary" onclick="openCargaMasiva()">
            <i class="fas fa-file-excel" style="margin-right:4px;"></i>Carga Masiva
          </button>
          <button class="btn btn-secondary" onclick="openPdfImport()" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444;">
            <i class="fas fa-file-pdf" style="margin-right:4px;"></i>Cargar PDF
          </button>
          <button class="btn btn-primary" onclick="editMovimiento(null)">
            <i class="fas fa-plus"></i> Nuevo Movimiento
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de Movimientos -->
    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table" id="tablaMovimientos">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th>Tipo</th>
              <th>Cuenta</th>
              <th>Categoria</th>
              <th style="text-align:right;">Monto</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyMovimientos">
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Populate table with initial (unfiltered) data
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

  // Apply filters
  const filtered = movimientos.filter(m => {
    if (fDesde && m.fecha < fDesde) return false;
    if (fHasta && m.fecha > fHasta) return false;
    if (fTipo && m.tipo !== fTipo) return false;
    if (fCuenta && m.cuenta_id !== fCuenta) return false;
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

  // Update summary cards with filtered totals
  let sumIngresos = 0;
  let sumGastos = 0;
  filtered.forEach(m => {
    const cuenta = cuentaMap[m.cuenta_id];
    const moneda = cuenta ? cuenta.moneda : 'MXN';
    const montoMXN = toMXN(m.monto, moneda, tiposCambio);
    if (m.tipo === 'ingreso') sumIngresos += montoMXN;
    else if (m.tipo === 'gasto') sumGastos += montoMXN;
  });
  const sumBalance = sumIngresos - sumGastos;

  const elIngresos = document.getElementById('movSumIngresos');
  const elGastos = document.getElementById('movSumGastos');
  const elBalance = document.getElementById('movSumBalance');
  if (elIngresos) elIngresos.textContent = formatCurrency(sumIngresos, 'MXN');
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
        <td colspan="7" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
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
    const tipoBadgeClass = m.tipo === 'ingreso' ? 'badge-green' : 'badge-red';
    const tipoLabel = m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';

    // Monto formatting with sign and color
    const signo = m.tipo === 'ingreso' ? '+' : '-';
    const montoColor = m.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)';

    return `
      <tr>
        <td>${formatDate(m.fecha)}</td>
        <td style="color:var(--text-primary);font-weight:500;">${m.descripcion || '\u2014'}</td>
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
  if (tipoSelect && catGroup) {
    catGroup.style.display = tipoSelect.value === 'gasto' ? 'block' : 'none';
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

    // Reverse old effect on old cuenta
    const oldCuentaIdx = cuentas.findIndex(c => c.id === oldMov.cuenta_id);
    if (oldCuentaIdx !== -1) {
      if (oldMov.tipo === 'ingreso') {
        cuentas[oldCuentaIdx].saldo -= oldMov.monto;
      } else {
        cuentas[oldCuentaIdx].saldo += oldMov.monto;
      }
    }

    // Apply new effect on new cuenta
    if (tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo += monto;
    } else {
      cuentas[cuentaIdx].saldo -= monto;
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
      descripcion: descripcion,
      fecha: fecha,
      notas: notas,
      created: new Date().toISOString(),
    };

    // Apply saldo effect
    if (tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo += monto;
    } else {
      cuentas[cuentaIdx].saldo -= monto;
    }

    movimientos.push(nuevoMov);
    saveData(STORAGE_KEYS.movimientos, movimientos);
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Movimiento creado exitosamente.', 'success');
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

  const confirmar = confirm('\u00BFEstas seguro de eliminar este movimiento?\n"' + (mov.descripcion || 'Sin descripcion') + '" por ' + formatCurrency(mov.monto, mov.moneda || 'MXN') + '\n\nEsta accion revertira el efecto en el saldo de la cuenta.');
  if (!confirmar) return;

  // Reverse saldo effect on cuenta
  const cuentaIdx = cuentas.findIndex(c => c.id === mov.cuenta_id);
  if (cuentaIdx !== -1) {
    if (mov.tipo === 'ingreso') {
      cuentas[cuentaIdx].saldo -= mov.monto;
    } else {
      cuentas[cuentaIdx].saldo += mov.monto;
    }
    saveData(STORAGE_KEYS.cuentas, cuentas);
  }

  // Remove movimiento from array
  const newMovimientos = movimientos.filter(m => m.id !== id);
  saveData(STORAGE_KEYS.movimientos, newMovimientos);

  showToast('Movimiento eliminado exitosamente.', 'info');
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
