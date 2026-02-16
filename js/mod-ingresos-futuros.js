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
        <table class="data-table" id="tablaIngresosFuturos">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Tipo</th>
              <th style="text-align:right;">Monto</th>
              <th>Frecuencia</th>
              <th>Fecha Inicio</th>
              <th>Certeza</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyIngresosFuturos"></tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--bg-base);font-size:12px;color:var(--text-muted);">
      <i class="fas fa-info-circle" style="margin-right:6px;color:var(--accent-blue);"></i>
      Los ingresos futuros <strong>confirmados</strong> se contemplan en las proyecciones del simulador. Se muestran separados del patrimonio actual.
    </div>`;

  filterIngresosFuturos();
}

function filterIngresosFuturos() {
  var ingresos = loadData(STORAGE_KEYS.ingresos_futuros) || [];
  var fTipo = document.getElementById('filterIFTipo') ? document.getElementById('filterIFTipo').value : '';
  var fCerteza = document.getElementById('filterIFCerteza') ? document.getElementById('filterIFCerteza').value : '';

  var filtered = ingresos.filter(function(i) {
    if (fTipo && i.tipo !== fTipo) return false;
    if (fCerteza && i.certeza !== fCerteza) return false;
    return true;
  }).sort(function(a, b) { return (b.created || '').localeCompare(a.created || ''); });

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
