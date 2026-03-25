/* ============================================================
   MODULE: DEUDA HISTORICA  -  Historical Debt Tracking
   ============================================================ */

var _deudaAnioSeleccionado = new Date().getFullYear();

var _mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function renderDeuda() {
  var el = document.getElementById('module-deuda');
  var deuda = loadData(STORAGE_KEYS.deuda_historica) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];

  // Collect available years from data + current year
  var aniosSet = {};
  var currentYear = new Date().getFullYear();
  aniosSet[currentYear] = true;
  deuda.forEach(function(d) { if (d.anio) aniosSet[d.anio] = true; });
  var anios = Object.keys(aniosSet).map(Number).sort(function(a, b) { return b - a; });

  // Ensure selected year is valid
  if (anios.indexOf(_deudaAnioSeleccionado) === -1) {
    _deudaAnioSeleccionado = anios[0] || currentYear;
  }

  var anioOpciones = anios.map(function(a) {
    var sel = a === _deudaAnioSeleccionado ? 'selected' : '';
    return '<option value="' + a + '" ' + sel + '>' + a + '</option>';
  }).join('');

  // Filter data for selected year
  var deudaAnio = deuda.filter(function(d) { return d.anio === _deudaAnioSeleccionado; });

  // KPI calculations (convert to MXN)
  var totalAnual = 0;
  var montosMensuales = [];
  deudaAnio.forEach(function(d) {
    var mxn = toMXN(d.monto, d.moneda || 'MXN', tiposCambio);
    totalAnual += mxn;
    montosMensuales.push(mxn);
  });
  var promedioMensual = montosMensuales.length > 0 ? totalAnual / montosMensuales.length : 0;
  var maximoMensual = montosMensuales.length > 0 ? Math.max.apply(null, montosMensuales) : 0;

  // Build property lookup
  var propMap = {};
  propiedades.forEach(function(p) { propMap[p.id] = p; });

  // Build month-indexed lookup for grid
  var mesPorMes = {};
  deudaAnio.forEach(function(d) {
    if (!mesPorMes[d.mes]) mesPorMes[d.mes] = [];
    mesPorMes[d.mes].push(d);
  });

  // --- BUILD HTML ---
  var html = '';

  // Year filter + Nuevo button
  html += '<div class="card" style="margin-bottom:24px;">';
  html += '  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">';
  html += '    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
  html += '      <div class="form-group" style="margin-bottom:0;min-width:140px;">';
  html += '        <select id="filterDeudaAnio" class="form-select" onchange="_filterDeuda()">';
  html += '          ' + anioOpciones;
  html += '        </select>';
  html += '      </div>';
  html += '    </div>';
  html += '    <button class="btn btn-primary" onclick="editDeudaMes(null, null, null)"><i class="fas fa-plus"></i> Nuevo</button>';
  html += '  </div>';
  html += '</div>';

  // KPI Cards
  html += '<div class="grid-3" style="margin-bottom:24px;">';

  // Total Deuda Anual
  html += '<div class="card" style="border-left:3px solid var(--accent-red);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-file-invoice-dollar" style="color:var(--accent-red);font-size:19px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Deuda Anual</span>';
  html += '  </div>';
  html += '  <div id="kpiDeudaTotal" style="font-size:24px;font-weight:800;color:var(--accent-red);">' + formatCurrencyInt(totalAnual, 'MXN') + '</div>';
  html += '  <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + _deudaAnioSeleccionado + ' &mdash; ' + deudaAnio.length + ' registro(s)</div>';
  html += '</div>';

  // Promedio Mensual
  html += '<div class="card" style="border-left:3px solid var(--accent-amber);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-calculator" style="color:var(--accent-amber);font-size:19px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Promedio Mensual</span>';
  html += '  </div>';
  html += '  <div id="kpiDeudaPromedio" style="font-size:24px;font-weight:800;color:var(--accent-amber);">' + formatCurrencyInt(promedioMensual, 'MXN') + '</div>';
  html += '  <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Basado en meses con datos</div>';
  html += '</div>';

  // Maximo Mensual
  html += '<div class="card" style="border-left:3px solid var(--accent-purple);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-arrow-up" style="color:var(--accent-purple);font-size:19px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Maximo Mensual</span>';
  html += '  </div>';
  html += '  <div id="kpiDeudaMaximo" style="font-size:24px;font-weight:800;color:var(--accent-purple);">' + formatCurrencyInt(maximoMensual, 'MXN') + '</div>';
  html += '  <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Mes con mayor deuda</div>';
  html += '</div>';

  html += '</div>'; // close grid-3

  // 12-month grid (4 cols x 3 rows)
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">';
  for (var m = 1; m <= 12; m++) {
    var registrosMes = mesPorMes[m] || [];
    var tieneData = registrosMes.length > 0;
    var totalMes = 0;
    var propBadges = '';
    registrosMes.forEach(function(r) {
      totalMes += toMXN(r.monto, r.moneda || 'MXN', tiposCambio);
      if (r.propiedad_id && propMap[r.propiedad_id]) {
        propBadges += '<span class="badge badge-blue" style="font-size:10px;margin-top:4px;display:inline-block;">' + propMap[r.propiedad_id].nombre + '</span> ';
      }
    });

    var borderColor = tieneData ? 'var(--accent-red)' : 'var(--border-color)';
    var existingId = registrosMes.length === 1 ? registrosMes[0].id : null;

    html += '<div class="card" style="cursor:pointer;border:1px solid ' + borderColor + ';transition:all 0.2s;min-height:100px;display:flex;flex-direction:column;justify-content:space-between;" ';
    html += '  onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.15)\';" ';
    html += '  onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\';" ';
    html += '  onclick="editDeudaMes(' + _deudaAnioSeleccionado + ',' + m + ',' + (existingId ? '\'' + existingId + '\'' : 'null') + ')">';
    html += '  <div>';
    html += '    <div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">' + _mesesNombres[m - 1] + '</div>';
    if (tieneData) {
      html += '    <div style="font-size:18px;font-weight:800;color:var(--accent-red);">' + formatCurrencyInt(totalMes, 'MXN') + '</div>';
      if (registrosMes.length > 1) {
        html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + registrosMes.length + ' registros</div>';
      }
    } else {
      html += '    <div style="font-size:14px;color:var(--text-muted);opacity:0.5;">Sin datos</div>';
    }
    html += '  </div>';
    if (propBadges) {
      html += '  <div style="margin-top:8px;">' + propBadges + '</div>';
    }
    html += '</div>';
  }
  html += '</div>'; // close 12-month grid

  // Detail table
  html += '<div class="card">';
  html += '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  html += '    <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-primary);">Detalle ' + _deudaAnioSeleccionado + '</h3>';
  html += '  </div>';
  html += '  <div style="overflow-x:auto;">';
  html += '    <table class="data-table sortable-table" id="tablaDeuda">';
  html += '      <thead><tr>';
  html += '        <th>Mes</th>';
  html += '        <th style="text-align:right;">Monto</th>';
  html += '        <th style="text-align:center;">Moneda</th>';
  html += '        <th>Descripcion</th>';
  html += '        <th>Propiedad</th>';
  html += '        <th style="text-align:center;" data-no-sort="true">Acciones</th>';
  html += '      </tr></thead>';
  html += '      <tbody id="tbodyDeuda">';

  if (deudaAnio.length === 0) {
    html += '<tr><td colspan="6" style="text-align:center;padding:40px 20px;color:var(--text-muted);">';
    html += '<i class="fas fa-inbox" style="font-size:29px;display:block;margin-bottom:8px;opacity:0.4;"></i>';
    html += 'No hay registros de deuda para ' + _deudaAnioSeleccionado + '. Haz click en un mes o en "Nuevo" para agregar.</td></tr>';
  } else {
    var sorted = deudaAnio.slice().sort(function(a, b) { return a.mes - b.mes; });
    sorted.forEach(function(d, idx) {
      var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
      var moneda = d.moneda || 'MXN';
      var propNombre = d.propiedad_id && propMap[d.propiedad_id] ? propMap[d.propiedad_id].nombre : '\u2014';
      var propBadgeClass = d.propiedad_id && propMap[d.propiedad_id] ? 'badge badge-blue' : '';
      html += '<tr style="' + zebra + '">';
      html += '  <td style="font-weight:600;color:var(--text-primary);">' + _mesesNombres[d.mes - 1] + '</td>';
      html += '  <td style="text-align:right;font-weight:700;color:var(--accent-red);">' + formatCurrencyInt(d.monto, moneda) + '</td>';
      html += '  <td style="text-align:center;"><span class="badge ' + monedaBadgeClass(moneda) + '" style="font-size:12px;">' + moneda + '</span></td>';
      html += '  <td style="color:var(--text-primary);">' + (d.descripcion || '\u2014') + '</td>';
      if (propBadgeClass) {
        html += '  <td><span class="' + propBadgeClass + '" style="font-size:12px;">' + propNombre + '</span></td>';
      } else {
        html += '  <td style="color:var(--text-muted);">' + propNombre + '</td>';
      }
      html += '  <td style="text-align:center;">';
      html += '    <button class="btn btn-secondary" style="padding:4px 8px;font-size:13px;margin-right:4px;" onclick="event.stopPropagation();editDeudaMes(' + d.anio + ',' + d.mes + ',\'' + d.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
      html += '    <button class="btn btn-danger" style="padding:4px 8px;font-size:13px;" onclick="event.stopPropagation();_deleteDeudaMes(\'' + d.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';
      html += '  </td>';
      html += '</tr>';
    });
  }

  html += '      </tbody>';
  html += '    </table>';
  html += '  </div>';
  html += '</div>';

  el.innerHTML = html;
  setTimeout(function() { _initSortableTables(el); }, 100);
}

/* ---------- Filter by year ---------- */
function _filterDeuda() {
  var sel = document.getElementById('filterDeudaAnio');
  if (sel) _deudaAnioSeleccionado = parseInt(sel.value, 10) || new Date().getFullYear();
  renderDeuda();
}

/* ---------- Edit / Add modal ---------- */
function editDeudaMes(anio, mes, existingId) {
  var deuda = loadData(STORAGE_KEYS.deuda_historica) || [];
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var registro = null;

  // If clicking on a month card with multiple records, show the first one for editing
  // or if existingId, find that specific record
  if (existingId) {
    registro = deuda.find(function(d) { return d.id === existingId; });
  }

  var isEdit = !!registro;
  var titulo = isEdit ? 'Editar Deuda — ' + _mesesNombres[(registro.mes || mes) - 1] + ' ' + (registro.anio || anio) : 'Nueva Deuda';

  // Default values
  var defAnio = isEdit ? registro.anio : (anio || _deudaAnioSeleccionado);
  var defMes = isEdit ? registro.mes : (mes || (new Date().getMonth() + 1));
  var defMonto = isEdit ? registro.monto : '';
  var defMoneda = isEdit ? (registro.moneda || 'MXN') : 'MXN';
  var defDescripcion = isEdit ? (registro.descripcion || '') : '';
  var defPropiedadId = isEdit ? (registro.propiedad_id || '') : '';

  // Build month options
  var mesOpciones = '';
  for (var i = 1; i <= 12; i++) {
    var selAttr = i === defMes ? 'selected' : '';
    mesOpciones += '<option value="' + i + '" ' + selAttr + '>' + _mesesNombres[i - 1] + '</option>';
  }

  // Build year options (allow a wider range)
  var currentYear = new Date().getFullYear();
  var anioOpciones = '';
  for (var y = currentYear - 10; y <= currentYear + 2; y++) {
    var selY = y === defAnio ? 'selected' : '';
    anioOpciones += '<option value="' + y + '" ' + selY + '>' + y + '</option>';
  }

  // Build property options
  var propOpciones = '<option value="">Sin propiedad</option>';
  propiedades.forEach(function(p) {
    var sel = p.id === defPropiedadId ? 'selected' : '';
    propOpciones += '<option value="' + p.id + '" ' + sel + '>' + p.nombre + '</option>';
  });

  var formHTML = '';
  formHTML += '<form id="formDeudaMes" onsubmit="_saveDeudaMes(event)">';
  formHTML += '  <input type="hidden" id="deudaMesId" value="' + (isEdit ? registro.id : '') + '">';
  formHTML += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  formHTML += '    <div class="form-group"><label class="form-label">Anio *</label>';
  formHTML += '      <select id="deudaMesAnio" class="form-select" required>' + anioOpciones + '</select></div>';
  formHTML += '    <div class="form-group"><label class="form-label">Mes *</label>';
  formHTML += '      <select id="deudaMesMes" class="form-select" required>' + mesOpciones + '</select></div>';
  formHTML += '  </div>';
  formHTML += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  formHTML += '    <div class="form-group"><label class="form-label">Monto *</label>';
  formHTML += '      <input type="number" id="deudaMesMonto" class="form-input" required step="0.01" min="0.01" value="' + defMonto + '" placeholder="0.00"></div>';
  formHTML += '    <div class="form-group"><label class="form-label">Moneda *</label>';
  formHTML += '      <select id="deudaMesMoneda" class="form-select" required>';
  formHTML += '        <option value="MXN"' + (defMoneda === 'MXN' ? ' selected' : '') + '>MXN</option>';
  formHTML += '        <option value="USD"' + (defMoneda === 'USD' ? ' selected' : '') + '>USD</option>';
  formHTML += '        <option value="EUR"' + (defMoneda === 'EUR' ? ' selected' : '') + '>EUR</option>';
  formHTML += '      </select></div>';
  formHTML += '  </div>';
  formHTML += '  <div class="form-group"><label class="form-label">Descripcion</label>';
  formHTML += '    <input type="text" id="deudaMesDescripcion" class="form-input" value="' + defDescripcion.replace(/"/g, '&quot;') + '" placeholder="Ej: Credito hipotecario BBVA"></div>';
  formHTML += '  <div class="form-group"><label class="form-label">Propiedad Asociada</label>';
  formHTML += '    <select id="deudaMesPropiedadId" class="form-select">' + propOpciones + '</select>';
  formHTML += '    <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Opcional: vincular deuda a una propiedad</div></div>';
  formHTML += '  <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
  formHTML += '    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>';
  formHTML += '    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ' + (isEdit ? 'Guardar Cambios' : 'Crear Registro') + '</button>';
  formHTML += '  </div>';
  formHTML += '</form>';

  openModal(titulo, formHTML);
}

/* ---------- Save handler ---------- */
function _saveDeudaMes(event) {
  event.preventDefault();

  var deuda = loadData(STORAGE_KEYS.deuda_historica) || [];
  var id = document.getElementById('deudaMesId').value;
  var anio = parseInt(document.getElementById('deudaMesAnio').value, 10);
  var mes = parseInt(document.getElementById('deudaMesMes').value, 10);
  var monto = parseFloat(document.getElementById('deudaMesMonto').value) || 0;
  var moneda = document.getElementById('deudaMesMoneda').value;
  var descripcion = document.getElementById('deudaMesDescripcion').value.trim();
  var propiedad_id = document.getElementById('deudaMesPropiedadId').value || null;

  if (!anio || !mes || monto <= 0) {
    showToast('Por favor completa los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    // Update existing record
    var idx = deuda.findIndex(function(d) { return d.id === id; });
    if (idx === -1) {
      showToast('No se encontro el registro de deuda.', 'error');
      return;
    }
    deuda[idx].anio = anio;
    deuda[idx].mes = mes;
    deuda[idx].monto = monto;
    deuda[idx].moneda = moneda;
    deuda[idx].descripcion = descripcion;
    deuda[idx].propiedad_id = propiedad_id;
    deuda[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.deuda_historica, deuda);
    showToast('Registro de deuda actualizado exitosamente.', 'success');
  } else {
    // Check if a record already exists for same anio+mes+descripcion (upsert logic)
    var existente = deuda.find(function(d) {
      return d.anio === anio && d.mes === mes && d.descripcion === descripcion && descripcion !== '';
    });
    if (existente) {
      // Update the existing one
      existente.monto = monto;
      existente.moneda = moneda;
      existente.propiedad_id = propiedad_id;
      existente.updated = new Date().toISOString();
      saveData(STORAGE_KEYS.deuda_historica, deuda);
      showToast('Registro existente actualizado para ' + _mesesNombres[mes - 1] + ' ' + anio + '.', 'success');
    } else {
      // Create new
      deuda.push({
        id: uuid(),
        anio: anio,
        mes: mes,
        monto: monto,
        moneda: moneda,
        descripcion: descripcion,
        propiedad_id: propiedad_id,
        created: new Date().toISOString()
      });
      saveData(STORAGE_KEYS.deuda_historica, deuda);
      showToast('Registro de deuda creado exitosamente.', 'success');
    }
  }

  // Update selected year to match saved record
  _deudaAnioSeleccionado = anio;

  closeModal();
  renderDeuda();
}

/* ---------- Delete handler ---------- */
function _deleteDeudaMes(id) {
  var deuda = loadData(STORAGE_KEYS.deuda_historica) || [];
  var registro = deuda.find(function(d) { return d.id === id; });
  if (!registro) return;

  var mesLabel = _mesesNombres[registro.mes - 1] || '';
  var montoLabel = formatCurrencyInt(registro.monto, registro.moneda || 'MXN');
  if (!confirm('\u00BFEstas seguro de eliminar el registro de deuda de ' + mesLabel + ' ' + registro.anio + ' por ' + montoLabel + '?\n\nEsta accion no se puede deshacer.')) return;

  saveData(STORAGE_KEYS.deuda_historica, deuda.filter(function(d) { return d.id !== id; }));
  showToast('Registro de deuda eliminado exitosamente.', 'info');
  renderDeuda();
}
