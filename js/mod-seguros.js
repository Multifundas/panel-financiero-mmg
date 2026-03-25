/* ============================================================
   MODULE: SEGUROS  -  Polizas de Seguro
   ============================================================ */

function renderSeguros() {
  var el = document.getElementById('module-seguros');
  var seguros = loadData(STORAGE_KEYS.seguros) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // --- KPI calculations ---
  var totalPrimasAnuales = 0;
  var polizasActivas = 0;
  var proximosVencimientos = 0;
  var hoy = new Date();
  var en90Dias = new Date();
  en90Dias.setDate(en90Dias.getDate() + 90);
  var hoyStr = hoy.toISOString().split('T')[0];
  var en90Str = en90Dias.toISOString().split('T')[0];

  seguros.forEach(function(s) {
    if (!s.activo) return;
    polizasActivas++;
    var primaAnualizada = calcularPrimaAnual(s.monto_prima, s.frecuencia_pago);
    totalPrimasAnuales += toMXN(primaAnualizada, s.moneda || 'MXN', tiposCambio);
    if (s.fecha_vencimiento && s.fecha_vencimiento >= hoyStr && s.fecha_vencimiento <= en90Str) {
      proximosVencimientos++;
    }
  });

  el.innerHTML = '' +
    '<div class="grid-3" style="margin-bottom:24px;">' +
      '<div class="card" style="border-left:3px solid var(--accent-blue);">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
          '<div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-shield-alt" style="color:var(--accent-blue);font-size:19px;"></i>' +
          '</div>' +
          '<span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Primas Anuales</span>' +
        '</div>' +
        '<div id="kpiTotalPrimas" style="font-size:24px;font-weight:800;color:var(--accent-blue);">' + formatCurrencyInt(totalPrimasAnuales, 'MXN') + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Costo anual de seguros activos</div>' +
      '</div>' +
      '<div class="card" style="border-left:3px solid var(--accent-green);">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
          '<div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-file-contract" style="color:var(--accent-green);font-size:19px;"></i>' +
          '</div>' +
          '<span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Polizas Activas</span>' +
        '</div>' +
        '<div id="kpiPolizasActivas" style="font-size:24px;font-weight:800;color:var(--accent-green);">' + polizasActivas + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Polizas vigentes</div>' +
      '</div>' +
      '<div class="card" style="border-left:3px solid var(--accent-amber);">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
          '<div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-exclamation-triangle" style="color:var(--accent-amber);font-size:19px;"></i>' +
          '</div>' +
          '<span style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Proximos Vencimientos</span>' +
        '</div>' +
        '<div id="kpiProximosVenc" style="font-size:24px;font-weight:800;color:var(--accent-amber);">' + proximosVencimientos + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Vencen en los proximos 90 dias</div>' +
      '</div>' +
    '</div>' +

    '<div class="card" style="margin-bottom:24px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<div class="form-group" style="margin-bottom:0;min-width:150px;">' +
            '<select id="filterSeguroTipo" class="form-select" onchange="filterSeguros()">' +
              '<option value="">Todos los tipos</option>' +
              '<option value="vida">Vida</option>' +
              '<option value="gastos_medicos">Gastos Medicos</option>' +
              '<option value="autos">Autos</option>' +
              '<option value="casa">Casa</option>' +
              '<option value="otro">Otro</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:0;min-width:130px;">' +
            '<select id="filterSeguroEstado" class="form-select" onchange="filterSeguros()">' +
              '<option value="">Todos</option>' +
              '<option value="activo">Activo</option>' +
              '<option value="inactivo">Inactivo</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:0;min-width:180px;">' +
            '<input type="text" id="filterSeguroSearch" class="form-input" placeholder="Buscar poliza..." oninput="filterSeguros()">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="editSeguro(null)"><i class="fas fa-plus"></i> Nueva Poliza</button>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div style="overflow-x:auto;">' +
        '<table class="data-table sortable-table" id="tablaSeguros">' +
          '<thead><tr>' +
            '<th>Tipo</th>' +
            '<th>Aseguradora</th>' +
            '<th>No. Poliza</th>' +
            '<th>Bien Asegurado</th>' +
            '<th>Vigencia</th>' +
            '<th style="text-align:right;">Prima</th>' +
            '<th>Frecuencia</th>' +
            '<th>Estado</th>' +
            '<th style="text-align:center;" data-no-sort="true">Acciones</th>' +
          '</tr></thead>' +
          '<tbody id="tbodySeguros"></tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  filterSeguros();
  setTimeout(function() { if (typeof _initSortableTables === 'function') _initSortableTables(el); }, 100);
}

/* ---------- Helpers ---------- */

function _seguroTipoLabel(tipo) {
  var labels = {
    vida: 'Vida',
    gastos_medicos: 'Gastos Medicos',
    autos: 'Autos',
    casa: 'Casa',
    otro: 'Otro'
  };
  return labels[tipo] || tipo || 'Otro';
}

function _seguroTipoBadge(tipo) {
  var badges = {
    vida: 'badge-purple',
    gastos_medicos: 'badge-blue',
    autos: 'badge-amber',
    casa: 'badge-green',
    otro: 'badge-secondary'
  };
  return badges[tipo] || 'badge-secondary';
}

function _seguroFrecuenciaLabel(freq) {
  var labels = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual'
  };
  return labels[freq] || freq || 'Anual';
}

function calcularPrimaAnual(monto, frecuencia) {
  if (!monto || monto <= 0) return 0;
  switch (frecuencia) {
    case 'mensual': return monto * 12;
    case 'trimestral': return monto * 4;
    case 'semestral': return monto * 2;
    case 'anual': return monto;
    default: return monto;
  }
}

/* ---------- Filter ---------- */

function filterSeguros() {
  var seguros = loadData(STORAGE_KEYS.seguros) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var fTipo = document.getElementById('filterSeguroTipo') ? document.getElementById('filterSeguroTipo').value : '';
  var fEstado = document.getElementById('filterSeguroEstado') ? document.getElementById('filterSeguroEstado').value : '';
  var fSearch = document.getElementById('filterSeguroSearch') ? document.getElementById('filterSeguroSearch').value.toLowerCase().trim() : '';

  var filtered = seguros.filter(function(s) {
    if (fTipo && s.tipo !== fTipo) return false;
    if (fEstado === 'activo' && !s.activo) return false;
    if (fEstado === 'inactivo' && s.activo) return false;
    if (fSearch) {
      var aseguradora = (s.aseguradora || '').toLowerCase();
      var poliza = (s.numero_poliza || '').toLowerCase();
      var bien = (s.bien_asegurado || '').toLowerCase();
      var notas = (s.notas || '').toLowerCase();
      var beneficiarios = (s.beneficiarios || '').toLowerCase();
      if (!aseguradora.includes(fSearch) && !poliza.includes(fSearch) && !bien.includes(fSearch) && !notas.includes(fSearch) && !beneficiarios.includes(fSearch)) return false;
    }
    return true;
  }).sort(function(a, b) { return (b.created || '').localeCompare(a.created || ''); });

  // Update KPIs based on filtered data
  var hoy = new Date();
  var en90Dias = new Date();
  en90Dias.setDate(en90Dias.getDate() + 90);
  var hoyStr = hoy.toISOString().split('T')[0];
  var en90Str = en90Dias.toISOString().split('T')[0];
  var totalPrimas = 0, activas = 0, proxVenc = 0;

  filtered.forEach(function(s) {
    if (!s.activo) return;
    activas++;
    totalPrimas += toMXN(calcularPrimaAnual(s.monto_prima, s.frecuencia_pago), s.moneda || 'MXN', tiposCambio);
    if (s.fecha_vencimiento && s.fecha_vencimiento >= hoyStr && s.fecha_vencimiento <= en90Str) proxVenc++;
  });

  var kpiP = document.getElementById('kpiTotalPrimas');
  var kpiA = document.getElementById('kpiPolizasActivas');
  var kpiV = document.getElementById('kpiProximosVenc');
  if (kpiP) kpiP.textContent = formatCurrencyInt(totalPrimas, 'MXN');
  if (kpiA) kpiA.textContent = activas;
  if (kpiV) kpiV.textContent = proxVenc;

  // Build table
  var tbody = document.getElementById('tbodySeguros');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="fas fa-search" style="font-size:29px;display:block;margin-bottom:8px;opacity:0.4;"></i>No se encontraron polizas con los filtros aplicados.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(s, idx) {
    var tipoBadge = _seguroTipoBadge(s.tipo);
    var tipoLabel = _seguroTipoLabel(s.tipo);
    var estadoBadge = s.activo ? 'badge-green' : 'badge-red';
    var estadoLabel = s.activo ? 'Activo' : 'Inactivo';
    var frecLabel = _seguroFrecuenciaLabel(s.frecuencia_pago);
    var vigenciaInicio = s.fecha_inicio ? formatDate(s.fecha_inicio) : '\u2014';
    var vigenciaFin = s.fecha_vencimiento ? formatDate(s.fecha_vencimiento) : '\u2014';
    var vigencia = vigenciaInicio + ' - ' + vigenciaFin;
    var zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';

    // Check if expiring soon (within 90 days)
    var hoyStr2 = new Date().toISOString().split('T')[0];
    var vencSoon = s.activo && s.fecha_vencimiento && s.fecha_vencimiento >= hoyStr2 && s.fecha_vencimiento <= en90Str;
    var vencExpired = s.activo && s.fecha_vencimiento && s.fecha_vencimiento < hoyStr2;
    var vigenciaStyle = '';
    if (vencExpired) vigenciaStyle = 'color:var(--accent-red);font-weight:600;';
    else if (vencSoon) vigenciaStyle = 'color:var(--accent-amber);font-weight:600;';

    var acc = '<button class="btn btn-secondary" style="padding:4px 8px;font-size:13px;margin-right:4px;" onclick="editSeguro(\'' + s.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
    acc += '<button class="btn btn-danger" style="padding:4px 8px;font-size:13px;" onclick="deleteSeguro(\'' + s.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';

    // badge-secondary inline style for "Otro"
    var badgeExtra = tipoBadge === 'badge-secondary' ? ' style="background:rgba(148,163,184,0.15);color:#94a3b8;"' : '';

    return '<tr style="' + zebra + '">' +
      '<td><span class="badge ' + tipoBadge + '"' + badgeExtra + '>' + tipoLabel + '</span></td>' +
      '<td style="font-weight:600;color:var(--text-primary);">' + (s.aseguradora || '\u2014') + '</td>' +
      '<td style="color:var(--text-primary);">' + (s.numero_poliza || '\u2014') + '</td>' +
      '<td style="color:var(--text-primary);">' + (s.bien_asegurado || '\u2014') + '</td>' +
      '<td style="white-space:nowrap;' + vigenciaStyle + '">' + vigencia + '</td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text-primary);">' + formatCurrencyInt(s.monto_prima, s.moneda || 'MXN') + '</td>' +
      '<td>' + frecLabel + '</td>' +
      '<td><span class="badge ' + estadoBadge + '">' + estadoLabel + '</span></td>' +
      '<td style="text-align:center;">' + acc + '</td>' +
    '</tr>';
  }).join('');
}

/* ---------- Edit / New ---------- */

function editSeguro(id) {
  var seguros = loadData(STORAGE_KEYS.seguros) || [];
  var seguro = null;
  if (id) seguro = seguros.find(function(s) { return s.id === id; });
  var isEdit = !!seguro;
  var titulo = isEdit ? 'Editar Poliza' : 'Nueva Poliza de Seguro';
  var hoy = new Date().toISOString().split('T')[0];

  var formHTML = '' +
    '<form id="formSeguro" onsubmit="saveSeguro(event)">' +
      '<input type="hidden" id="seguroId" value="' + (isEdit ? seguro.id : '') + '">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Tipo de Seguro *</label>' +
          '<select id="seguroTipo" class="form-select" required>' +
            '<option value="">Seleccionar...</option>' +
            '<option value="vida"' + (isEdit && seguro.tipo === 'vida' ? ' selected' : '') + '>Vida</option>' +
            '<option value="gastos_medicos"' + (isEdit && seguro.tipo === 'gastos_medicos' ? ' selected' : '') + '>Gastos Medicos</option>' +
            '<option value="autos"' + (isEdit && seguro.tipo === 'autos' ? ' selected' : '') + '>Autos</option>' +
            '<option value="casa"' + (isEdit && seguro.tipo === 'casa' ? ' selected' : '') + '>Casa</option>' +
            '<option value="otro"' + (isEdit && seguro.tipo === 'otro' ? ' selected' : '') + '>Otro</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Aseguradora *</label>' +
          '<input type="text" id="seguroAseguradora" class="form-input" required value="' + (isEdit ? (seguro.aseguradora || '') : '') + '" placeholder="Ej: GNP Seguros"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Numero de Poliza</label>' +
          '<input type="text" id="seguroNumeroPoliza" class="form-input" value="' + (isEdit ? (seguro.numero_poliza || '') : '') + '" placeholder="Ej: POL-123456"></div>' +
        '<div class="form-group"><label class="form-label">Bien Asegurado</label>' +
          '<input type="text" id="seguroBienAsegurado" class="form-input" value="' + (isEdit ? (seguro.bien_asegurado || '') : '') + '" placeholder="Ej: Auto Toyota 2023"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Fecha de Inicio *</label>' +
          '<input type="date" id="seguroFechaInicio" class="form-input" required value="' + (isEdit ? (seguro.fecha_inicio || '') : hoy) + '"></div>' +
        '<div class="form-group"><label class="form-label">Fecha de Vencimiento *</label>' +
          '<input type="date" id="seguroFechaVencimiento" class="form-input" required value="' + (isEdit ? (seguro.fecha_vencimiento || '') : '') + '"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Monto Prima *</label>' +
          '<input type="number" id="seguroMontoPrima" class="form-input" required step="0.01" min="0.01" value="' + (isEdit ? seguro.monto_prima : '') + '" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">Frecuencia de Pago *</label>' +
          '<select id="seguroFrecuenciaPago" class="form-select" required>' +
            '<option value="mensual"' + (isEdit && seguro.frecuencia_pago === 'mensual' ? ' selected' : '') + '>Mensual</option>' +
            '<option value="trimestral"' + (isEdit && seguro.frecuencia_pago === 'trimestral' ? ' selected' : '') + '>Trimestral</option>' +
            '<option value="semestral"' + (isEdit && seguro.frecuencia_pago === 'semestral' ? ' selected' : '') + '>Semestral</option>' +
            '<option value="anual"' + (isEdit && seguro.frecuencia_pago === 'anual' ? ' selected' : (isEdit ? '' : ' selected')) + '>Anual</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Moneda *</label>' +
          '<select id="seguroMoneda" class="form-select" required>' +
            '<option value="MXN"' + (isEdit && seguro.moneda === 'MXN' ? ' selected' : '') + '>MXN</option>' +
            '<option value="USD"' + (isEdit && seguro.moneda === 'USD' ? ' selected' : '') + '>USD</option>' +
            '<option value="EUR"' + (isEdit && seguro.moneda === 'EUR' ? ' selected' : '') + '>EUR</option>' +
          '</select></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Cobertura</label>' +
          '<input type="text" id="seguroCobertura" class="form-input" value="' + (isEdit ? (seguro.cobertura || '') : '') + '" placeholder="Ej: Cobertura amplia..."></div>' +
        '<div class="form-group"><label class="form-label">Beneficiarios</label>' +
          '<input type="text" id="seguroBeneficiarios" class="form-input" value="' + (isEdit ? (seguro.beneficiarios || '') : '') + '" placeholder="Ej: Esposa, hijos"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Notas</label>' +
        '<textarea id="seguroNotas" class="form-input" rows="3" style="resize:vertical;" placeholder="Notas adicionales...">' + (isEdit && seguro.notas ? seguro.notas : '') + '</textarea></div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--text-primary);">' +
          '<input type="checkbox" id="seguroActivo" ' + (isEdit ? (seguro.activo ? 'checked' : '') : 'checked') + ' style="width:18px;height:18px;accent-color:var(--accent-green);">' +
          ' Poliza Activa' +
        '</label>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ' + (isEdit ? 'Guardar Cambios' : 'Crear Poliza') + '</button>' +
      '</div>' +
    '</form>';

  openModal(titulo, formHTML);
}

/* ---------- Save ---------- */

function saveSeguro(event) {
  event.preventDefault();
  var seguros = loadData(STORAGE_KEYS.seguros) || [];
  var id = document.getElementById('seguroId').value;
  var tipo = document.getElementById('seguroTipo').value;
  var aseguradora = document.getElementById('seguroAseguradora').value.trim();
  var numero_poliza = document.getElementById('seguroNumeroPoliza').value.trim();
  var bien_asegurado = document.getElementById('seguroBienAsegurado').value.trim();
  var fecha_inicio = document.getElementById('seguroFechaInicio').value;
  var fecha_vencimiento = document.getElementById('seguroFechaVencimiento').value;
  var monto_prima = parseFloat(document.getElementById('seguroMontoPrima').value) || 0;
  var frecuencia_pago = document.getElementById('seguroFrecuenciaPago').value;
  var moneda = document.getElementById('seguroMoneda').value;
  var cobertura = document.getElementById('seguroCobertura').value.trim();
  var beneficiarios = document.getElementById('seguroBeneficiarios').value.trim();
  var notas = document.getElementById('seguroNotas').value.trim();
  var activo = document.getElementById('seguroActivo').checked;

  if (!tipo || !aseguradora || !fecha_inicio || !fecha_vencimiento || monto_prima <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    // Edit existing
    var idx = seguros.findIndex(function(s) { return s.id === id; });
    if (idx === -1) { showToast('No se encontro la poliza.', 'error'); return; }
    seguros[idx].tipo = tipo;
    seguros[idx].aseguradora = aseguradora;
    seguros[idx].numero_poliza = numero_poliza;
    seguros[idx].bien_asegurado = bien_asegurado;
    seguros[idx].fecha_inicio = fecha_inicio;
    seguros[idx].fecha_vencimiento = fecha_vencimiento;
    seguros[idx].monto_prima = monto_prima;
    seguros[idx].frecuencia_pago = frecuencia_pago;
    seguros[idx].moneda = moneda;
    seguros[idx].cobertura = cobertura;
    seguros[idx].beneficiarios = beneficiarios;
    seguros[idx].notas = notas;
    seguros[idx].activo = activo;
    seguros[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.seguros, seguros);
    showToast('Poliza actualizada exitosamente.', 'success');
  } else {
    // Create new
    seguros.push({
      id: uuid(),
      tipo: tipo,
      aseguradora: aseguradora,
      numero_poliza: numero_poliza,
      fecha_inicio: fecha_inicio,
      fecha_vencimiento: fecha_vencimiento,
      monto_prima: monto_prima,
      frecuencia_pago: frecuencia_pago,
      cobertura: cobertura,
      beneficiarios: beneficiarios,
      bien_asegurado: bien_asegurado,
      moneda: moneda,
      notas: notas,
      activo: activo,
      created: new Date().toISOString()
    });
    saveData(STORAGE_KEYS.seguros, seguros);
    showToast('Poliza creada exitosamente.', 'success');
  }

  closeModal();
  renderSeguros();
}

/* ---------- Delete ---------- */

function deleteSeguro(id) {
  var seguros = loadData(STORAGE_KEYS.seguros) || [];
  var seguro = seguros.find(function(s) { return s.id === id; });
  if (!seguro) return;

  if (!confirm('\u00BFEstas seguro de eliminar la poliza "' + (seguro.numero_poliza || seguro.aseguradora) + '" de ' + seguro.aseguradora + '?\n\nEsta accion no se puede deshacer.')) return;

  saveData(STORAGE_KEYS.seguros, seguros.filter(function(s) { return s.id !== id; }));
  showToast('Poliza eliminada exitosamente.', 'info');
  renderSeguros();
}
