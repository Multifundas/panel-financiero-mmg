/* ============================================================
   MODULE: INGRESOS FUTUROS  -  Pension, Herencia, etc.
   ============================================================ */

function renderIngresosFuturos() {
  var el = document.getElementById('module-ingresos_futuros');
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // KPI calculations
  var totalMensualConf = 0, totalUnicoConf = 0, totalAnualConf = 0;
  ingresos.forEach(function(i) {
    if (!i.activa) return;
    var mxn = toMXN(i.monto, i.moneda || 'MXN', tiposCambio);
    if (i.certeza === 'confirmado') {
      if (i.frecuencia === 'mensual') totalMensualConf += mxn;
      else if (i.frecuencia === 'anual') totalAnualConf += mxn;
      else totalUnicoConf += mxn;
    }
  });

  el.innerHTML = `
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="border-left:3px solid var(--accent-green);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-calendar-check" style="color:var(--accent-green);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Ingreso Mensual Confirmado</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-green);">${formatCurrency(totalMensualConf, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Flujo mensual garantizado</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-blue);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-money-check-alt" style="color:var(--accent-blue);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Ingreso Anual Confirmado</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-blue);">${formatCurrency(totalAnualConf, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Flujo anual garantizado</div>
      </div>
      <div class="card" style="border-left:3px solid var(--accent-amber);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-gift" style="color:var(--accent-amber);font-size:16px;"></i>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Ingresos Unicos Pendientes</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--accent-amber);">${formatCurrency(totalUnicoConf, 'MXN')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Herencias, ventas, seguros</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:140px;">
            <select id="filterIFTipo" class="form-select" onchange="filterIngresosFuturos()">
              <option value="">Todos los tipos</option>
              <option value="pension">Pension</option>
              <option value="herencia">Herencia</option>
              <option value="venta">Venta</option>
              <option value="seguro">Seguro</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:140px;">
            <select id="filterIFCerteza" class="form-select" onchange="filterIngresosFuturos()">
              <option value="">Todas</option>
              <option value="confirmado">Confirmado</option>
              <option value="probable">Probable</option>
              <option value="posible">Posible</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="editIngresoFuturo(null)">
          <i class="fas fa-plus"></i> Nuevo Ingreso Futuro
        </button>
      </div>
    </div>

    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table sortable-table" id="tablaIngresosFuturos">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Tipo</th>
              <th style="text-align:right;">Monto</th>
              <th>Frecuencia</th>
              <th>Fecha Inicio</th>
              <th>Certeza</th>
              <th style="text-align:center;" data-no-sort="true">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyIngresosFuturos"></tbody>
        </table>
      </div>
    </div>

    <!-- Cronograma de proximos ingresos -->
    <div class="card" style="margin-top:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);"><i class="fas fa-calendar-alt" style="margin-right:8px;color:var(--accent-blue);"></i>Cronograma de Proximos Ingresos</div>
        <button class="btn btn-secondary" onclick="openPatrimonioFuturo()" style="padding:6px 12px;font-size:11px;">
          <i class="fas fa-chart-area" style="margin-right:4px;"></i>Patrimonio Futuro
        </button>
      </div>
      <div id="cronogramaIngresosFuturos"></div>
    </div>

    <div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--bg-base);font-size:12px;color:var(--text-muted);">
      <i class="fas fa-info-circle" style="margin-right:6px;color:var(--accent-blue);"></i>
      Los ingresos futuros <strong>confirmados</strong> se contemplan en las proyecciones del simulador. Se muestran separados del patrimonio actual.
    </div>`;

  filterIngresosFuturos();
  renderCronogramaIngresos();
  setTimeout(function() { _initSortableTables(document.getElementById('module-ingresos_futuros')); }, 100);
}

function filterIngresosFuturos() {
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var fTipo = document.getElementById('filterIFTipo') ? document.getElementById('filterIFTipo').value : '';
  var fCerteza = document.getElementById('filterIFCerteza') ? document.getElementById('filterIFCerteza').value : '';

  var filtered = ingresos.filter(function(i) {
    if (fTipo && i.tipo !== fTipo) return false;
    if (fCerteza && i.certeza !== fCerteza) return false;
    return true;
  }).sort(function(a, b) { return (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''); });

  var tbody = document.getElementById('tbodyIngresosFuturos');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="fas fa-calendar-plus" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>No hay ingresos futuros registrados.<br><span style="font-size:12px;">Agrega pensiones, herencias u otros ingresos esperados.</span></td></tr>';
    return;
  }

  var tipoLabels = { pension: 'Pension', herencia: 'Herencia', venta: 'Venta', seguro: 'Seguro', otro: 'Otro' };
  var tipoBadges = { pension: 'badge-green', herencia: 'badge-amber', venta: 'badge-blue', seguro: 'badge-purple', otro: 'badge-blue' };
  var freqLabels = { unico: 'Unico', mensual: 'Mensual', anual: 'Anual' };
  var certezaBadges = { confirmado: 'badge-green', probable: 'badge-amber', posible: 'badge-blue' };
  var certezaLabels = { confirmado: 'Confirmado', probable: 'Probable', posible: 'Posible' };

  tbody.innerHTML = filtered.map(function(i, idx) {
    var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
    var acc = '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="editIngresoFuturo(\'' + i.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>' +
      '<button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteIngresoFuturo(\'' + i.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';

    return '<tr style="' + zebra + '">' +
      '<td style="font-weight:600;color:var(--text-primary);">' + i.concepto + (i.notas ? '<br><span style="font-size:11px;color:var(--text-muted);">' + i.notas.substring(0, 50) + '</span>' : '') + '</td>' +
      '<td><span class="badge ' + (tipoBadges[i.tipo] || 'badge-blue') + '">' + (tipoLabels[i.tipo] || i.tipo) + '</span></td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrency(i.monto, i.moneda || 'MXN') + '</td>' +
      '<td>' + (freqLabels[i.frecuencia] || i.frecuencia) + '</td>' +
      '<td>' + (i.fecha_inicio ? formatDate(i.fecha_inicio) : '\u2014') + '</td>' +
      '<td><span class="badge ' + (certezaBadges[i.certeza] || 'badge-blue') + '">' + (certezaLabels[i.certeza] || i.certeza) + '</span></td>' +
      '<td style="text-align:center;">' + acc + '</td>' +
      '</tr>';
  }).join('');
}

function editIngresoFuturo(id) {
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var ingreso = null;
  if (id) ingreso = ingresos.find(function(i) { return i.id === id; });
  var isEdit = !!ingreso;
  var titulo = isEdit ? 'Editar Ingreso Futuro' : 'Nuevo Ingreso Futuro';
  var hoy = new Date().toISOString().split('T')[0];

  var formHTML = '<form id="formIngresoFuturo" onsubmit="saveIngresoFuturo(event)">' +
    '<input type="hidden" id="ifId" value="' + (isEdit ? ingreso.id : '') + '">' +
    '<div class="form-group"><label class="form-label">Concepto *</label>' +
    '<input type="text" id="ifConcepto" class="form-input" required value="' + (isEdit ? ingreso.concepto : '') + '" placeholder="Ej: Pension IMSS, Herencia tio Juan..."></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Tipo *</label>' +
    '<select id="ifTipo" class="form-select" required>' +
    '<option value="pension"' + (isEdit && ingreso.tipo === 'pension' ? ' selected' : '') + '>Pension</option>' +
    '<option value="herencia"' + (isEdit && ingreso.tipo === 'herencia' ? ' selected' : '') + '>Herencia</option>' +
    '<option value="venta"' + (isEdit && ingreso.tipo === 'venta' ? ' selected' : '') + '>Venta de activo</option>' +
    '<option value="seguro"' + (isEdit && ingreso.tipo === 'seguro' ? ' selected' : '') + '>Seguro</option>' +
    '<option value="otro"' + (isEdit && ingreso.tipo === 'otro' ? ' selected' : '') + '>Otro</option>' +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Monto *</label>' +
    '<input type="number" id="ifMonto" class="form-input" required step="0.01" min="0.01" value="' + (isEdit ? ingreso.monto : '') + '" placeholder="0.00"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Moneda</label>' +
    '<select id="ifMoneda" class="form-select">' +
    '<option value="MXN"' + (isEdit && ingreso.moneda === 'MXN' ? ' selected' : '') + '>MXN</option>' +
    '<option value="USD"' + (isEdit && ingreso.moneda === 'USD' ? ' selected' : '') + '>USD</option>' +
    '<option value="EUR"' + (isEdit && ingreso.moneda === 'EUR' ? ' selected' : '') + '>EUR</option>' +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Frecuencia *</label>' +
    '<select id="ifFrecuencia" class="form-select" required>' +
    '<option value="mensual"' + (isEdit && ingreso.frecuencia === 'mensual' ? ' selected' : '') + '>Mensual</option>' +
    '<option value="anual"' + (isEdit && ingreso.frecuencia === 'anual' ? ' selected' : '') + '>Anual</option>' +
    '<option value="unico"' + (isEdit && ingreso.frecuencia === 'unico' ? ' selected' : '') + '>Unico (una sola vez)</option>' +
    '</select></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="form-group"><label class="form-label">Fecha de Inicio *</label>' +
    '<input type="date" id="ifFechaInicio" class="form-input" required value="' + (isEdit && ingreso.fecha_inicio ? ingreso.fecha_inicio : hoy) + '"></div>' +
    '<div class="form-group"><label class="form-label">Fecha de Fin (opcional)</label>' +
    '<input type="date" id="ifFechaFin" class="form-input" value="' + (isEdit && ingreso.fecha_fin ? ingreso.fecha_fin : '') + '"></div></div>' +
    '<div class="form-group"><label class="form-label">Nivel de Certeza *</label>' +
    '<select id="ifCerteza" class="form-select" required>' +
    '<option value="confirmado"' + (isEdit && ingreso.certeza === 'confirmado' ? ' selected' : '') + '>Confirmado (100% seguro)</option>' +
    '<option value="probable"' + (isEdit && ingreso.certeza === 'probable' ? ' selected' : '') + '>Probable (muy posible)</option>' +
    '<option value="posible"' + (isEdit && ingreso.certeza === 'posible' ? ' selected' : '') + '>Posible (aun no seguro)</option>' +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Notas</label>' +
    '<textarea id="ifNotas" class="form-input" rows="2" style="resize:vertical;" placeholder="Notas adicionales...">' + (isEdit && ingreso.notas ? ingreso.notas : '') + '</textarea></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ' + (isEdit ? 'Guardar Cambios' : 'Crear Ingreso') + '</button></div></form>';

  openModal(titulo, formHTML);
}

function saveIngresoFuturo(event) {
  event.preventDefault();
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var id = document.getElementById('ifId').value;
  var concepto = document.getElementById('ifConcepto').value.trim();
  var tipo = document.getElementById('ifTipo').value;
  var monto = parseFloat(document.getElementById('ifMonto').value) || 0;
  var moneda = document.getElementById('ifMoneda').value;
  var frecuencia = document.getElementById('ifFrecuencia').value;
  var fecha_inicio = document.getElementById('ifFechaInicio').value;
  var fecha_fin = document.getElementById('ifFechaFin').value;
  var certeza = document.getElementById('ifCerteza').value;
  var notas = document.getElementById('ifNotas').value.trim();

  if (!concepto || monto <= 0 || !fecha_inicio) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    var idx = ingresos.findIndex(function(i) { return i.id === id; });
    if (idx === -1) { showToast('No se encontro el ingreso.', 'error'); return; }
    ingresos[idx].concepto = concepto;
    ingresos[idx].tipo = tipo;
    ingresos[idx].monto = monto;
    ingresos[idx].moneda = moneda;
    ingresos[idx].frecuencia = frecuencia;
    ingresos[idx].fecha_inicio = fecha_inicio;
    ingresos[idx].fecha_fin = fecha_fin;
    ingresos[idx].certeza = certeza;
    ingresos[idx].notas = notas;
    ingresos[idx].updated = new Date().toISOString();
    showToast('Ingreso futuro actualizado.', 'success');
  } else {
    ingresos.push({
      id: uuid(),
      concepto: concepto,
      tipo: tipo,
      monto: monto,
      moneda: moneda,
      frecuencia: frecuencia,
      fecha_inicio: fecha_inicio,
      fecha_fin: fecha_fin,
      certeza: certeza,
      notas: notas,
      activa: true,
      created: new Date().toISOString()
    });
    showToast('Ingreso futuro creado.', 'success');
  }

  saveData(STORAGE_KEYS.ingresos_futuros, ingresos);
  closeModal();
  renderIngresosFuturos();
}

function deleteIngresoFuturo(id) {
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var ingreso = ingresos.find(function(i) { return i.id === id; });
  if (!ingreso) return;
  if (!confirm('Eliminar "' + ingreso.concepto + '"?\n\nEsta accion no se puede deshacer.')) return;
  saveData(STORAGE_KEYS.ingresos_futuros, ingresos.filter(function(i) { return i.id !== id; }));
  showToast('Ingreso futuro eliminado.', 'info');
  renderIngresosFuturos();
}

/* -- Cronograma: show upcoming income events sorted by date -- */
function renderCronogramaIngresos() {
  var el = document.getElementById('cronogramaIngresosFuturos');
  if (!el) return;
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var hoy = new Date();
  var hoyStr = hoy.toISOString().slice(0, 10);

  // Generate upcoming events for the next 12 months
  var eventos = [];
  var limite = new Date(hoy);
  limite.setFullYear(limite.getFullYear() + 1);
  var limiteStr = limite.toISOString().slice(0, 10);

  ingresos.forEach(function(i) {
    if (!i.activa) return;
    if (!i.fecha_inicio) return;

    if (i.frecuencia === 'unico') {
      if (i.fecha_inicio >= hoyStr && i.fecha_inicio <= limiteStr) {
        eventos.push({ fecha: i.fecha_inicio, concepto: i.concepto, monto: i.monto, moneda: i.moneda || 'MXN', certeza: i.certeza, tipo: i.tipo });
      }
    } else if (i.frecuencia === 'mensual') {
      var d = new Date(i.fecha_inicio + 'T00:00:00');
      if (d < hoy) { d.setMonth(hoy.getMonth()); d.setFullYear(hoy.getFullYear()); if (d < hoy) d.setMonth(d.getMonth() + 1); }
      for (var j = 0; j < 12 && d <= limite; j++) {
        var fEnd = i.fecha_fin ? new Date(i.fecha_fin + 'T00:00:00') : null;
        if (fEnd && d > fEnd) break;
        var ds = d.toISOString().slice(0, 10);
        eventos.push({ fecha: ds, concepto: i.concepto, monto: i.monto, moneda: i.moneda || 'MXN', certeza: i.certeza, tipo: i.tipo });
        d.setMonth(d.getMonth() + 1);
      }
    } else if (i.frecuencia === 'anual') {
      var da = new Date(i.fecha_inicio + 'T00:00:00');
      if (da < hoy) { da.setFullYear(hoy.getFullYear()); if (da < hoy) da.setFullYear(da.getFullYear() + 1); }
      if (da <= limite) {
        var fEnd2 = i.fecha_fin ? new Date(i.fecha_fin + 'T00:00:00') : null;
        if (!fEnd2 || da <= fEnd2) {
          eventos.push({ fecha: da.toISOString().slice(0, 10), concepto: i.concepto, monto: i.monto, moneda: i.moneda || 'MXN', certeza: i.certeza, tipo: i.tipo });
        }
      }
    }
  });

  eventos.sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });

  if (eventos.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;"><i class="fas fa-calendar-times" style="font-size:20px;display:block;margin-bottom:8px;opacity:0.4;"></i>No hay ingresos programados para los proximos 12 meses.</div>';
    return;
  }

  var certezaBadges = { confirmado: 'badge-green', probable: 'badge-amber', posible: 'badge-blue' };
  var certezaLabels = { confirmado: 'Conf.', probable: 'Prob.', posible: 'Pos.' };

  var html = '<div style="max-height:300px;overflow-y:auto;">';
  eventos.forEach(function(e) {
    var valMXN = toMXN(e.monto, e.moneda, tiposCambio);
    var diasHasta = Math.round((new Date(e.fecha + 'T00:00:00') - hoy) / (1000 * 60 * 60 * 24));
    var diasLabel = diasHasta === 0 ? 'Hoy' : (diasHasta === 1 ? 'Manana' : 'en ' + diasHasta + ' dias');
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-subtle);gap:12px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div style="min-width:80px;font-size:12px;color:var(--text-muted);font-weight:600;">' + formatDate(e.fecha) + '</div>' +
      '<div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + e.concepto + '</div>' +
      '<div style="font-size:10px;color:var(--text-muted);">' + diasLabel + '</div></div></div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span class="badge ' + (certezaBadges[e.certeza] || 'badge-blue') + '" style="font-size:9px;">' + (certezaLabels[e.certeza] || '') + '</span>' +
      '<div style="font-size:14px;font-weight:700;color:var(--accent-green);white-space:nowrap;">+' + formatCurrency(e.monto, e.moneda) + '</div>' +
      '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

/* -- Patrimonio Futuro Projection Tool -- */
function openPatrimonioFuturo() {
  var pat = typeof calcPatrimonioTotal === 'function' ? calcPatrimonioTotal() : { total: 0 };
  var patrimonioActual = pat.total;
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var hoy = new Date();

  // Project patrimonio for the next 12 months
  var meses = [];
  for (var m = 0; m < 12; m++) {
    var d = new Date(hoy);
    d.setMonth(d.getMonth() + m + 1);
    var mesStr = d.toISOString().slice(0, 7);
    var mesNom = typeof mesNombre === 'function' ? mesNombre(d.getMonth()) : mesStr;
    meses.push({ mes: mesStr, label: mesNom + ' ' + d.getFullYear(), ingresosConf: 0, ingresosProb: 0, ingresosPosible: 0, patrimonioAcum: 0 });
  }

  // Calculate income per month
  ingresos.forEach(function(i) {
    if (!i.activa || !i.fecha_inicio) return;
    var montoMXN = toMXN(i.monto, i.moneda || 'MXN', tiposCambio);

    meses.forEach(function(mes) {
      var mesDate = new Date(mes.mes + '-15T00:00:00');
      var inicio = new Date(i.fecha_inicio + 'T00:00:00');
      var fin = i.fecha_fin ? new Date(i.fecha_fin + 'T00:00:00') : null;

      if (mesDate < inicio) return;
      if (fin && mesDate > fin) return;

      var aplica = false;
      if (i.frecuencia === 'mensual') aplica = true;
      else if (i.frecuencia === 'anual') aplica = (mesDate.getMonth() === inicio.getMonth());
      else if (i.frecuencia === 'unico') aplica = (mes.mes === i.fecha_inicio.slice(0, 7));

      if (aplica) {
        if (i.certeza === 'confirmado') mes.ingresosConf += montoMXN;
        else if (i.certeza === 'probable') mes.ingresosProb += montoMXN;
        else mes.ingresosPosible += montoMXN;
      }
    });
  });

  // Calculate cumulative patrimonio (only confirmed + current patrimonio)
  var acum = patrimonioActual;
  meses.forEach(function(mes) {
    acum += mes.ingresosConf;
    mes.patrimonioAcum = acum;
  });

  // Build modal HTML
  var html = '<div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Patrimonio Actual</div>' +
    '<div style="font-size:18px;font-weight:800;color:var(--accent-blue);">' + formatCurrency(patrimonioActual, 'MXN') + '</div></div>' +
    '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Patrimonio en 12 Meses</div>' +
    '<div style="font-size:18px;font-weight:800;color:var(--accent-green);">' + formatCurrency(meses[meses.length - 1].patrimonioAcum, 'MXN') + '</div></div>' +
    '</div></div>';

  html += '<div style="overflow-x:auto;"><table class="data-table sortable-table" style="font-size:12px;"><thead><tr>' +
    '<th>Mes</th><th style="text-align:right;">Confirmado</th><th style="text-align:right;">Probable</th><th style="text-align:right;">Posible</th><th style="text-align:right;font-weight:800;">Patrimonio Proyectado</th>' +
    '</tr></thead><tbody>';

  meses.forEach(function(mes) {
    html += '<tr>' +
      '<td style="font-weight:600;white-space:nowrap;">' + mes.label + '</td>' +
      '<td style="text-align:right;color:var(--accent-green);font-weight:600;">' + (mes.ingresosConf > 0 ? '+' + formatCurrency(mes.ingresosConf, 'MXN') : '\u2014') + '</td>' +
      '<td style="text-align:right;color:var(--accent-amber);">' + (mes.ingresosProb > 0 ? '+' + formatCurrency(mes.ingresosProb, 'MXN') : '\u2014') + '</td>' +
      '<td style="text-align:right;color:var(--text-muted);">' + (mes.ingresosPosible > 0 ? '+' + formatCurrency(mes.ingresosPosible, 'MXN') : '\u2014') + '</td>' +
      '<td style="text-align:right;font-weight:800;color:var(--accent-blue);">' + formatCurrency(mes.patrimonioAcum, 'MXN') + '</td>' +
      '</tr>';
  });

  html += '</tbody></table></div>';

  html += '<div style="margin-top:12px;padding:10px;border-radius:8px;background:var(--bg-base);font-size:11px;color:var(--text-muted);">' +
    '<i class="fas fa-info-circle" style="margin-right:4px;color:var(--accent-blue);"></i>' +
    'Patrimonio proyectado solo incluye ingresos <strong>confirmados</strong>. Los ingresos probables y posibles se muestran como referencia. ' +
    'No incluye rendimientos de inversiones ni gastos futuros.</div>';

  openModal('Patrimonio Futuro — Proyeccion a 12 Meses', html);
  document.querySelector('.modal-content').classList.add('modal-wide');
  setTimeout(function() { _initSortableTables(document.querySelector('.modal-content')); }, 100);
}
