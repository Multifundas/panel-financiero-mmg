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
    <div class="grid-5" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-blue);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-university" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Cuentas Bancarias</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalBancarias, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countBancarias} cuenta${countBancarias !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-green);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-chart-line" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Inversiones</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalInversiones, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countInversiones} cuenta${countInversiones !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-amber);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-building" style="color:var(--accent-amber);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Inmuebles</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalInmuebles, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countInmuebles} cuenta${countInmuebles !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-purple);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-gem" style="color:var(--accent-purple);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Activos Fijos</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalActivosFijos, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countActivosFijos} cuenta${countActivosFijos !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="border-left:3px solid var(--text-secondary);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(148,163,184,0.1);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-wallet" style="color:var(--text-secondary);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total General</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${formatCurrency(totalGeneral, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${countGeneral} cuenta${countGeneral !== 1 ? 's' : ''} activa${countGeneral !== 1 ? 's' : ''}</div>
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
              <option value="inmueble">Inmueble</option>
              <option value="activo_fijo">Activo Fijo</option>
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
        <table class="data-table" id="tablaCuentas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Institucion</th>
              <th>Moneda</th>
              <th style="text-align:right;">Saldo</th>
              <th style="text-align:right;">Rendimiento %</th>
              <th>Subtipo</th>
              <th>Estado</th>
              <th style="text-align:center;">Acciones</th>
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
    const tipoLabel = c.tipo === 'inversion' ? 'Inversion'
      : c.tipo === 'inmueble' ? 'Inmueble'
      : c.tipo === 'activo_fijo' ? 'Activo Fijo' : 'Debito';

    // Estado badge
    const activa = c.activa !== false;
    const estadoBadge = activa ? 'badge-green' : 'badge-red';
    const estadoLabel = activa ? 'Activa' : 'Inactiva';

    // Rendimiento display
    const rendimiento = c.rendimiento_anual
      ? Number(c.rendimiento_anual).toFixed(2) + '%'
      : '\u2014';

    // Subtipo display
    let subtipoHTML = '\u2014';
    if (c.subtipo === 'pagare') {
      subtipoHTML = '<span class="badge badge-blue">Pagare</span>';
    } else if (c.subtipo === 'renta_variable') {
      subtipoHTML = '<span class="badge badge-purple">Renta Variable</span>';
    }

    // Zebra striping
    const zebraStyle = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';

    return `<tr style="${zebraStyle}">
      <td style="font-weight:600;color:var(--text-primary);">${c.nombre}</td>
      <td><span class="badge ${tipoBadgeClass}">${tipoLabel}</span></td>
      <td>${instMap[c.institucion_id] || '\u2014'}</td>
      <td><span class="badge badge-blue">${c.moneda}</span></td>
      <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(c.saldo, c.moneda)}</td>
      <td style="text-align:right;color:${c.rendimiento_anual ? 'var(--accent-green)' : 'var(--text-muted)'};">${rendimiento}</td>
      <td>${subtipoHTML}</td>
      <td><span class="badge ${estadoBadge}">${estadoLabel}</span></td>
      <td style="text-align:center;">
        <button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;margin-right:4px;" onclick="editCuenta('${c.id}')" title="Editar">
          <i class="fas fa-pen"></i>
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
            <option value="inmueble" ${isEdit && cuenta.tipo === 'inmueble' ? 'selected' : ''}>Inmueble</option>
            <option value="activo_fijo" ${isEdit && cuenta.tipo === 'activo_fijo' ? 'selected' : ''}>Activo Fijo</option>
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

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Saldo *</label>
          <input type="number" id="cuentaSaldo" class="form-input" required step="0.01" min="0"
                 value="${isEdit ? cuenta.saldo : ''}" placeholder="0.00">
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
        <div class="form-group">
          <label class="form-label">Saldo Inicial (al momento de invertir)</label>
          <input type="number" id="cuentaRentaVarSaldoInicial" class="form-input" step="0.01" min="0"
                 value="${isEdit && cuenta.renta_var_saldo_inicial != null ? cuenta.renta_var_saldo_inicial : ''}" placeholder="0.00">
        </div>
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
  const renta_var_saldo_inicial = subtipo === 'renta_variable' && document.getElementById('cuentaRentaVarSaldoInicial')
    ? (parseFloat(document.getElementById('cuentaRentaVarSaldoInicial').value) || 0) : 0;
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
      cuentas[idx].saldo = saldo;
      cuentas[idx].rendimiento_anual = rendimiento_anual;
      cuentas[idx].subtipo = subtipo;
      cuentas[idx].pagare_fecha_inicio = pagare_fecha_inicio;
      cuentas[idx].pagare_fecha_termino = pagare_fecha_termino;
      cuentas[idx].pagare_tasa = pagare_tasa;
      cuentas[idx].renta_var_saldo_inicial = renta_var_saldo_inicial;
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
      rendimiento_anual: rendimiento_anual,
      subtipo: subtipo,
      pagare_fecha_inicio: pagare_fecha_inicio,
      pagare_fecha_termino: pagare_fecha_termino,
      pagare_tasa: pagare_tasa,
      renta_var_saldo_inicial: renta_var_saldo_inicial,
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

/* -- Soft-delete a cuenta (set activa=false) -- */
function deleteCuenta(id) {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const cuenta = cuentas.find(c => c.id === id);
  if (!cuenta) return;

  const confirmar = confirm('\u00BFEstas seguro de desactivar la cuenta "' + cuenta.nombre + '"?\nLa cuenta quedara marcada como inactiva.');
  if (!confirmar) return;

  const idx = cuentas.findIndex(c => c.id === id);
  if (idx !== -1) {
    cuentas[idx].activa = false;
    cuentas[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.cuentas, cuentas);
    showToast('Cuenta "' + cuenta.nombre + '" desactivada.', 'info');
    renderCuentas();
    updateHeaderPatrimonio();
  }
}

/* ============================================================
   CIERRE MENSUAL DE CUENTAS
   ============================================================ */
function cierreMensual() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const activas = cuentas.filter(c => c.activa !== false);
  if (activas.length === 0) { showToast('No hay cuentas activas.', 'warning'); return; }

  var hoy = new Date();
  var fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  var filas = activas.map(function(c) {
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + c.nombre + '<br><span class="badge badge-blue" style="font-size:10px;">' + c.moneda + '</span></td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(c.saldo, c.moneda) + '</td>' +
      '<td><input type="date" class="form-input cierre-fecha" data-cuenta-id="' + c.id + '" value="' + fechaHoy + '" style="padding:6px 10px;font-size:13px;min-width:140px;"></td>' +
      '<td><input type="number" class="form-input cierre-saldo-final" data-cuenta-id="' + c.id + '" data-saldo-inicio="' + c.saldo + '" step="0.01" min="0" placeholder="Saldo final" style="padding:6px 10px;font-size:13px;min-width:130px;" oninput="recalcCierreRendimiento(this)"></td>' +
      '<td style="text-align:right;" class="cierre-rend-cell" data-cuenta-id="' + c.id + '"><span style="color:var(--text-muted);">—</span></td>' +
      '</tr>';
  }).join('');

  var formHTML = '<form id="formCierreMensual" onsubmit="saveCierreMensual(event)">' +
    '<div style="margin-bottom:16px;">' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">' +
    '<i class="fas fa-info-circle" style="margin-right:4px;color:var(--accent-blue);"></i>Ingresa la fecha y saldo final de cada cuenta. Solo se guardaran las cuentas donde captures un saldo.</div>' +
    '</div>' +
    '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
    '<th>Cuenta</th><th style="text-align:right;">Saldo Inicio</th><th>Fecha</th><th>Saldo Final</th><th style="text-align:right;">Rendimiento</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Cierre</button>' +
    '</div></form>';

  openModal('Cierre de Cuentas', formHTML);
}

function recalcCierreRendimiento(inputEl) {
  var cuentaId = inputEl.getAttribute('data-cuenta-id');
  var saldoInicio = parseFloat(inputEl.getAttribute('data-saldo-inicio')) || 0;
  var saldoFinal = parseFloat(inputEl.value) || 0;
  var rend = saldoFinal - saldoInicio;
  var rendPct = saldoInicio > 0 ? ((rend / saldoInicio) * 100) : 0;

  var cell = document.querySelector('.cierre-rend-cell[data-cuenta-id="' + cuentaId + '"]');
  if (cell) {
    if (inputEl.value === '') {
      cell.innerHTML = '<span style="color:var(--text-muted);">\u2014</span>';
    } else {
      var color = rend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var sign = rend >= 0 ? '+' : '';
      cell.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + sign + formatCurrency(rend, 'MXN') + '</span>' +
        '<br><span style="font-size:11px;color:' + color + ';">(' + sign + rendPct.toFixed(2) + '%)</span>';
    }
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
    var saldoInicio = parseFloat(input.getAttribute('data-saldo-inicio')) || 0;
    var saldoFinal = parseFloat(input.value) || 0;
    var rend = saldoFinal - saldoInicio;
    var rendPct = saldoInicio > 0 ? ((rend / saldoInicio) * 100) : 0;

    // Get individual date for this account
    var fechaInput = document.querySelector('.cierre-fecha[data-cuenta-id="' + cuentaId + '"]');
    var fecha = fechaInput ? fechaInput.value : new Date().toISOString().slice(0, 10);
    if (!fecha) { return; }
    var periodo = fecha.slice(0, 7); // YYYY-MM

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
      rendimiento: rend
    });

    // Create rendimiento record
    rendimientos.push({
      id: uuid(),
      cuenta_id: cuentaId,
      periodo: periodo,
      saldo_inicial: saldoInicio,
      saldo_final: saldoFinal,
      rendimiento_monto: rend,
      rendimiento_pct: rendPct,
      fecha: fecha,
      created: new Date().toISOString()
    });

    cambios++;
  });

  if (cambios === 0) { showToast('No se capturo ningun saldo final.', 'warning'); return; }

  saveData(STORAGE_KEYS.cuentas, cuentas);
  saveData(STORAGE_KEYS.rendimientos, rendimientos);
  closeModal();
  showToast('Cierre guardado para ' + cambios + ' cuenta' + (cambios > 1 ? 's' : '') + '.', 'success');
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
    var sorted = [...historial].sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    var rows = sorted.map(function(h) {
      var sInicio = h.saldo_inicio != null ? h.saldo_inicio : h.saldo;
      var sFinal = h.saldo_final != null ? h.saldo_final : h.saldo;
      var rend = h.rendimiento != null ? h.rendimiento : (sFinal - sInicio);
      var rendPct = sInicio > 0 ? ((rend / sInicio) * 100) : 0;
      var rendColor = rend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      var rendSign = rend >= 0 ? '+' : '';
      var fechaLabel = h.fecha ? h.fecha.substring(0, 7) : '\u2014';
      return '<tr>' +
        '<td style="font-weight:600;">' + fechaLabel + '</td>' +
        '<td style="text-align:right;">' + formatCurrency(sInicio, moneda) + '</td>' +
        '<td style="text-align:right;font-weight:600;">' + formatCurrency(sFinal, moneda) + '</td>' +
        '<td style="text-align:right;color:' + rendColor + ';font-weight:600;">' + rendSign + formatCurrency(rend, moneda) + '</td>' +
        '<td style="text-align:right;color:' + rendColor + ';">' + rendSign + rendPct.toFixed(2) + '%</td>' +
        '</tr>';
    });
    tablaHTML = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
      '<th>Periodo</th><th style="text-align:right;">Saldo Inicio</th><th style="text-align:right;">Saldo Final</th><th style="text-align:right;">Rendimiento</th><th style="text-align:right;">Rend. %</th>' +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';

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
}
