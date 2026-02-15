/* ============================================================
   MODULE: METAS FINANCIERAS  -  Financial Goals Tracker
   ============================================================ */

function renderMetas() {
  var el = document.getElementById('module-metas');
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // --- KPI calculations ---
  var totalMetas = metas.length;
  var completadas = 0;
  var enProgreso = 0;
  var montoTotalObjetivo = 0;

  metas.forEach(function(meta) {
    var pct = meta.monto_objetivo > 0 ? (meta.monto_actual / meta.monto_objetivo) * 100 : 0;
    if (pct >= 100) completadas++;
    else enProgreso++;
    montoTotalObjetivo += toMXN(meta.monto_objetivo, meta.moneda || 'MXN', tiposCambio);
  });

  // --- Category helpers ---
  var catLabels = {
    ahorro: 'Ahorro', inversion: 'Inversion', deuda: 'Deuda',
    compra: 'Compra', emergencia: 'Emergencia'
  };
  var catIcons = {
    ahorro: 'fa-piggy-bank', inversion: 'fa-chart-line', deuda: 'fa-credit-card',
    compra: 'fa-shopping-cart', emergencia: 'fa-shield-alt'
  };
  var catColors = {
    ahorro: 'green', inversion: 'blue', deuda: 'red',
    compra: 'amber', emergencia: 'purple'
  };

  // --- Build HTML ---
  var html = '';

  // KPI Cards
  html += '<div class="grid-4" style="margin-bottom:24px;">';

  html += '<div class="card" style="border-left:3px solid var(--accent-blue);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-bullseye" style="color:var(--accent-blue);font-size:16px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Metas</span>';
  html += '  </div>';
  html += '  <div style="font-size:20px;font-weight:800;color:var(--accent-blue);">' + totalMetas + '</div>';
  html += '</div>';

  html += '<div class="card" style="border-left:3px solid var(--accent-green);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-check-circle" style="color:var(--accent-green);font-size:16px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Completadas</span>';
  html += '  </div>';
  html += '  <div style="font-size:20px;font-weight:800;color:var(--accent-green);">' + completadas + '</div>';
  html += '</div>';

  html += '<div class="card" style="border-left:3px solid var(--accent-amber);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-spinner" style="color:var(--accent-amber);font-size:16px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">En Progreso</span>';
  html += '  </div>';
  html += '  <div style="font-size:20px;font-weight:800;color:var(--accent-amber);">' + enProgreso + '</div>';
  html += '</div>';

  html += '<div class="card" style="border-left:3px solid var(--accent-purple);">';
  html += '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
  html += '    <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">';
  html += '      <i class="fas fa-flag-checkered" style="color:var(--accent-purple);font-size:16px;"></i>';
  html += '    </div>';
  html += '    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Monto Total Objetivo</span>';
  html += '  </div>';
  html += '  <div style="font-size:20px;font-weight:800;color:var(--accent-purple);">' + formatCurrency(montoTotalObjetivo, 'MXN') + '</div>';
  html += '</div>';

  html += '</div>';

  // Action bar
  html += '<div class="card" style="margin-bottom:24px;">';
  html += '  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">';
  html += '    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
  html += '      <div class="form-group" style="margin-bottom:0;min-width:140px;">';
  html += '        <select id="filterMetaCategoria" class="form-select" onchange="filterMetas()">';
  html += '          <option value="">Todas las categorias</option>';
  html += '          <option value="ahorro">Ahorro</option>';
  html += '          <option value="inversion">Inversion</option>';
  html += '          <option value="deuda">Deuda</option>';
  html += '          <option value="compra">Compra</option>';
  html += '          <option value="emergencia">Emergencia</option>';
  html += '        </select>';
  html += '      </div>';
  html += '      <div class="form-group" style="margin-bottom:0;min-width:180px;">';
  html += '        <input type="text" id="filterMetaSearch" class="form-input" placeholder="Buscar meta..." oninput="filterMetas()">';
  html += '      </div>';
  html += '    </div>';
  html += '    <button class="btn btn-primary" onclick="editMeta(null)"><i class="fas fa-plus"></i> Nueva Meta</button>';
  html += '  </div>';
  html += '</div>';

  // Goals list container
  html += '<div id="metasListContainer"></div>';

  el.innerHTML = html;
  filterMetas();
}

function filterMetas() {
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var fCat = document.getElementById('filterMetaCategoria') ? document.getElementById('filterMetaCategoria').value : '';
  var fSearch = document.getElementById('filterMetaSearch') ? document.getElementById('filterMetaSearch').value.toLowerCase().trim() : '';

  var filtered = metas.filter(function(meta) {
    if (fCat && meta.categoria !== fCat) return false;
    if (fSearch) {
      var nombre = (meta.nombre || '').toLowerCase();
      var notas = (meta.notas || '').toLowerCase();
      if (!nombre.includes(fSearch) && !notas.includes(fSearch)) return false;
    }
    return true;
  }).sort(function(a, b) { return (b.created || '').localeCompare(a.created || ''); });

  var container = document.getElementById('metasListContainer');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="card"><div class="empty-state" style="padding:48px 20px;text-align:center;"><i class="fas fa-bullseye" style="font-size:48px;color:var(--text-muted);opacity:0.3;display:block;margin-bottom:16px;"></i><div style="font-size:16px;font-weight:600;color:var(--text-muted);margin-bottom:8px;">No se encontraron metas</div><div style="font-size:13px;color:var(--text-muted);opacity:0.7;">Crea una nueva meta financiera para empezar a trackear tu progreso.</div></div></div>';
    return;
  }

  var catLabels = {
    ahorro: 'Ahorro', inversion: 'Inversion', deuda: 'Deuda',
    compra: 'Compra', emergencia: 'Emergencia'
  };
  var catIcons = {
    ahorro: 'fa-piggy-bank', inversion: 'fa-chart-line', deuda: 'fa-credit-card',
    compra: 'fa-shopping-cart', emergencia: 'fa-shield-alt'
  };
  var catColors = {
    ahorro: 'green', inversion: 'blue', deuda: 'red',
    compra: 'amber', emergencia: 'purple'
  };

  var cardsHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(380px, 1fr));gap:16px;">';

  filtered.forEach(function(meta) {
    var pct = meta.monto_objetivo > 0 ? Math.min((meta.monto_actual / meta.monto_objetivo) * 100, 100) : 0;
    var pctDisplay = pct.toFixed(1);
    var catColor = catColors[meta.categoria] || 'blue';
    var catLabel = catLabels[meta.categoria] || meta.categoria;
    var catIcon = catIcons[meta.categoria] || 'fa-bullseye';
    var moneda = meta.moneda || 'MXN';
    var restante = Math.max(meta.monto_objetivo - meta.monto_actual, 0);

    // Status determination
    var statusBadge = '';
    var progressColor = '';
    if (pct >= 100) {
      statusBadge = '<span class="badge badge-green">Completada</span>';
      progressColor = 'var(--accent-green)';
    } else if (pct >= 75) {
      statusBadge = '<span class="badge badge-blue">Casi lista</span>';
      progressColor = 'var(--accent-blue)';
    } else if (pct >= 25) {
      statusBadge = '<span class="badge badge-amber">En progreso</span>';
      progressColor = 'var(--accent-amber)';
    } else {
      statusBadge = '<span class="badge badge-red">Iniciando</span>';
      progressColor = 'var(--accent-red)';
    }

    // Days remaining
    var diasRestantes = '';
    if (meta.fecha_objetivo) {
      var hoy = new Date();
      var target = new Date(meta.fecha_objetivo);
      var diffMs = target - hoy;
      var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diasRestantes = diffDays + ' dias restantes';
      } else if (diffDays === 0) {
        diasRestantes = 'Vence hoy';
      } else {
        diasRestantes = 'Vencida hace ' + Math.abs(diffDays) + ' dias';
      }
    }

    cardsHTML += '<div class="card" style="position:relative;border-left:3px solid var(--accent-' + catColor + ');">';

    // Header row: icon + name + badges
    cardsHTML += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">';
    cardsHTML += '  <div style="display:flex;align-items:center;gap:12px;">';
    cardsHTML += '    <div style="width:44px;height:44px;border-radius:12px;background:var(--accent-' + catColor + '-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
    cardsHTML += '      <i class="fas ' + catIcon + '" style="color:var(--accent-' + catColor + ');font-size:18px;"></i>';
    cardsHTML += '    </div>';
    cardsHTML += '    <div>';
    cardsHTML += '      <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">' + meta.nombre + '</div>';
    cardsHTML += '      <div style="display:flex;align-items:center;gap:8px;">';
    cardsHTML += '        <span class="badge badge-' + catColor + '">' + catLabel + '</span>';
    cardsHTML += '        ' + statusBadge;
    cardsHTML += '      </div>';
    cardsHTML += '    </div>';
    cardsHTML += '  </div>';
    cardsHTML += '</div>';

    // Amounts row
    cardsHTML += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">';
    cardsHTML += '  <div>';
    cardsHTML += '    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Actual</div>';
    cardsHTML += '    <div style="font-size:18px;font-weight:800;color:' + progressColor + ';">' + formatCurrency(meta.monto_actual, moneda) + '</div>';
    cardsHTML += '  </div>';
    cardsHTML += '  <div style="text-align:right;">';
    cardsHTML += '    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Objetivo</div>';
    cardsHTML += '    <div style="font-size:18px;font-weight:800;color:var(--text-primary);">' + formatCurrency(meta.monto_objetivo, moneda) + '</div>';
    cardsHTML += '  </div>';
    cardsHTML += '</div>';

    // Progress bar
    cardsHTML += '<div style="margin-bottom:8px;">';
    cardsHTML += '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
    cardsHTML += '    <span style="font-size:12px;font-weight:600;color:var(--text-muted);">Progreso</span>';
    cardsHTML += '    <span style="font-size:13px;font-weight:700;color:' + progressColor + ';">' + pctDisplay + '%</span>';
    cardsHTML += '  </div>';
    cardsHTML += '  <div class="progress-bar" style="height:10px;border-radius:5px;">';
    cardsHTML += '    <div class="progress-bar-fill" style="width:' + pct + '%;background:' + progressColor + ';border-radius:5px;"></div>';
    cardsHTML += '  </div>';
    cardsHTML += '</div>';

    // Details row
    cardsHTML += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-top:8px;">';
    cardsHTML += '  <div style="font-size:12px;color:var(--text-muted);">';
    if (restante > 0) {
      cardsHTML += 'Faltan: <strong style="color:var(--text-primary);">' + formatCurrency(restante, moneda) + '</strong>';
    } else {
      cardsHTML += '<strong style="color:var(--accent-green);">Meta alcanzada</strong>';
    }
    cardsHTML += '  </div>';
    cardsHTML += '  <div style="font-size:12px;color:var(--text-muted);">';
    if (meta.fecha_objetivo) {
      cardsHTML += '<i class="fas fa-calendar-alt" style="margin-right:4px;"></i>' + formatDate(meta.fecha_objetivo);
    }
    cardsHTML += '  </div>';
    cardsHTML += '</div>';

    // Days remaining indicator
    if (diasRestantes) {
      cardsHTML += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;"><i class="fas fa-clock" style="margin-right:4px;"></i>' + diasRestantes + '</div>';
    }

    // Notes
    if (meta.notas) {
      cardsHTML += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;border-radius:6px;background:var(--bg-base);"><i class="fas fa-sticky-note" style="margin-right:6px;opacity:0.5;"></i>' + meta.notas + '</div>';
    }

    // Action buttons
    cardsHTML += '<div style="display:flex;gap:8px;border-top:1px solid var(--border-subtle);padding-top:12px;">';
    if (pct < 100) {
      cardsHTML += '<button class="btn btn-primary" style="flex:1;justify-content:center;padding:8px 12px;font-size:12px;" onclick="aportarMeta(\'' + meta.id + '\')" title="Aportar"><i class="fas fa-plus-circle"></i> Aportar</button>';
    }
    cardsHTML += '<button class="btn btn-secondary" style="padding:8px 12px;font-size:12px;" onclick="editMeta(\'' + meta.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
    cardsHTML += '<button class="btn btn-danger" style="padding:8px 12px;font-size:12px;" onclick="deleteMeta(\'' + meta.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';
    cardsHTML += '</div>';

    cardsHTML += '</div>';
  });

  cardsHTML += '</div>';
  container.innerHTML = cardsHTML;
}

function editMeta(id) {
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var meta = null;
  if (id) meta = metas.find(function(m) { return m.id === id; });
  var isEdit = !!meta;
  var titulo = isEdit ? 'Editar Meta' : 'Nueva Meta Financiera';
  var hoy = new Date().toISOString().split('T')[0];

  var fechaObj = '';
  if (isEdit && meta.fecha_objetivo) {
    var dt = new Date(meta.fecha_objetivo);
    fechaObj = dt.toISOString().split('T')[0];
  }

  var formHTML = '';
  formHTML += '<form id="formMeta" onsubmit="saveMeta(event)">';
  formHTML += '  <input type="hidden" id="metaId" value="' + (isEdit ? meta.id : '') + '">';

  formHTML += '  <div class="form-group">';
  formHTML += '    <label class="form-label">Nombre de la Meta *</label>';
  formHTML += '    <input type="text" id="metaNombre" class="form-input" required value="' + (isEdit ? meta.nombre : '') + '" placeholder="Ej: Fondo de emergencia">';
  formHTML += '  </div>';

  formHTML += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  formHTML += '    <div class="form-group">';
  formHTML += '      <label class="form-label">Categoria *</label>';
  formHTML += '      <select id="metaCategoria" class="form-select" required>';
  formHTML += '        <option value="">Seleccionar...</option>';
  formHTML += '        <option value="ahorro"' + (isEdit && meta.categoria === 'ahorro' ? ' selected' : '') + '>Ahorro</option>';
  formHTML += '        <option value="inversion"' + (isEdit && meta.categoria === 'inversion' ? ' selected' : '') + '>Inversion</option>';
  formHTML += '        <option value="deuda"' + (isEdit && meta.categoria === 'deuda' ? ' selected' : '') + '>Deuda</option>';
  formHTML += '        <option value="compra"' + (isEdit && meta.categoria === 'compra' ? ' selected' : '') + '>Compra</option>';
  formHTML += '        <option value="emergencia"' + (isEdit && meta.categoria === 'emergencia' ? ' selected' : '') + '>Emergencia</option>';
  formHTML += '      </select>';
  formHTML += '    </div>';
  formHTML += '    <div class="form-group">';
  formHTML += '      <label class="form-label">Moneda *</label>';
  formHTML += '      <select id="metaMoneda" class="form-select" required>';
  formHTML += '        <option value="MXN"' + (isEdit && meta.moneda === 'MXN' ? ' selected' : '') + '>MXN</option>';
  formHTML += '        <option value="USD"' + (isEdit && meta.moneda === 'USD' ? ' selected' : '') + '>USD</option>';
  formHTML += '        <option value="EUR"' + (isEdit && meta.moneda === 'EUR' ? ' selected' : '') + '>EUR</option>';
  formHTML += '      </select>';
  formHTML += '    </div>';
  formHTML += '  </div>';

  formHTML += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  formHTML += '    <div class="form-group">';
  formHTML += '      <label class="form-label">Monto Objetivo *</label>';
  formHTML += '      <input type="number" id="metaMontoObjetivo" class="form-input" required step="0.01" min="0.01" value="' + (isEdit ? meta.monto_objetivo : '') + '" placeholder="0.00">';
  formHTML += '    </div>';
  formHTML += '    <div class="form-group">';
  formHTML += '      <label class="form-label">Monto Actual</label>';
  formHTML += '      <input type="number" id="metaMontoActual" class="form-input" step="0.01" min="0" value="' + (isEdit ? meta.monto_actual : '0') + '" placeholder="0.00">';
  formHTML += '    </div>';
  formHTML += '  </div>';

  formHTML += '  <div class="form-group">';
  formHTML += '    <label class="form-label">Fecha Objetivo</label>';
  formHTML += '    <input type="date" id="metaFechaObjetivo" class="form-input" value="' + fechaObj + '">';
  formHTML += '  </div>';

  formHTML += '  <div class="form-group">';
  formHTML += '    <label class="form-label">Notas</label>';
  formHTML += '    <textarea id="metaNotas" class="form-input" rows="3" style="resize:vertical;" placeholder="Notas adicionales...">' + (isEdit && meta.notas ? meta.notas : '') + '</textarea>';
  formHTML += '  </div>';

  formHTML += '  <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
  formHTML += '    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>';
  formHTML += '    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ' + (isEdit ? 'Guardar Cambios' : 'Crear Meta') + '</button>';
  formHTML += '  </div>';
  formHTML += '</form>';

  openModal(titulo, formHTML);
}

function saveMeta(event) {
  event.preventDefault();
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var id = document.getElementById('metaId').value;
  var nombre = document.getElementById('metaNombre').value.trim();
  var categoria = document.getElementById('metaCategoria').value;
  var moneda = document.getElementById('metaMoneda').value;
  var monto_objetivo = parseFloat(document.getElementById('metaMontoObjetivo').value) || 0;
  var monto_actual = parseFloat(document.getElementById('metaMontoActual').value) || 0;
  var fecha_objetivo = document.getElementById('metaFechaObjetivo').value;
  var notas = document.getElementById('metaNotas').value.trim();

  if (!nombre || !categoria || monto_objetivo <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (id) {
    // Edit existing
    var idx = metas.findIndex(function(m) { return m.id === id; });
    if (idx === -1) { showToast('No se encontro la meta.', 'error'); return; }
    metas[idx].nombre = nombre;
    metas[idx].categoria = categoria;
    metas[idx].moneda = moneda;
    metas[idx].monto_objetivo = monto_objetivo;
    metas[idx].monto_actual = monto_actual;
    metas[idx].fecha_objetivo = fecha_objetivo;
    metas[idx].notas = notas;
    metas[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.metas, metas);
    showToast('Meta actualizada exitosamente.', 'success');
  } else {
    // Create new
    metas.push({
      id: uuid(),
      nombre: nombre,
      categoria: categoria,
      monto_objetivo: monto_objetivo,
      monto_actual: monto_actual,
      moneda: moneda,
      fecha_objetivo: fecha_objetivo,
      notas: notas,
      created: new Date().toISOString(),
    });
    saveData(STORAGE_KEYS.metas, metas);
    showToast('Meta creada exitosamente.', 'success');
  }

  closeModal();
  renderMetas();
}

function deleteMeta(id) {
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var meta = metas.find(function(m) { return m.id === id; });
  if (!meta) return;

  if (!confirm('Estas seguro de eliminar la meta "' + meta.nombre + '"?\n\nEsta accion no se puede deshacer.')) return;

  saveData(STORAGE_KEYS.metas, metas.filter(function(m) { return m.id !== id; }));
  showToast('Meta eliminada exitosamente.', 'info');
  renderMetas();
}

function aportarMeta(id) {
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var meta = metas.find(function(m) { return m.id === id; });
  if (!meta) return;

  var moneda = meta.moneda || 'MXN';
  var restante = Math.max(meta.monto_objetivo - meta.monto_actual, 0);
  var pct = meta.monto_objetivo > 0 ? Math.min((meta.monto_actual / meta.monto_objetivo) * 100, 100) : 0;

  var formHTML = '';
  formHTML += '<form id="formAporte" onsubmit="saveAporte(event, \'' + id + '\')">';

  // Current status summary
  formHTML += '<div style="margin-bottom:16px;padding:16px;border-radius:10px;background:var(--bg-base);">';
  formHTML += '  <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;">' + meta.nombre + '</div>';
  formHTML += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">';
  formHTML += '    <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Actual</div><div style="font-size:14px;font-weight:700;color:var(--accent-blue);">' + formatCurrency(meta.monto_actual, moneda) + '</div></div>';
  formHTML += '    <div style="text-align:right;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Objetivo</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + formatCurrency(meta.monto_objetivo, moneda) + '</div></div>';
  formHTML += '  </div>';
  formHTML += '  <div class="progress-bar" style="height:8px;border-radius:4px;">';
  formHTML += '    <div class="progress-bar-fill" style="width:' + pct + '%;background:var(--accent-blue);border-radius:4px;"></div>';
  formHTML += '  </div>';
  formHTML += '  <div style="display:flex;justify-content:space-between;margin-top:6px;">';
  formHTML += '    <span style="font-size:11px;color:var(--text-muted);">' + pct.toFixed(1) + '% completado</span>';
  formHTML += '    <span style="font-size:11px;color:var(--text-muted);">Faltan: ' + formatCurrency(restante, moneda) + '</span>';
  formHTML += '  </div>';
  formHTML += '</div>';

  formHTML += '<div class="form-group">';
  formHTML += '  <label class="form-label">Monto a Aportar (' + moneda + ') *</label>';
  formHTML += '  <input type="number" id="aporteMontoInput" class="form-input" required step="0.01" min="0.01" placeholder="0.00">';
  formHTML += '</div>';

  if (restante > 0) {
    formHTML += '<div style="margin-bottom:16px;"><button type="button" class="btn btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="document.getElementById(\'aporteMontoInput\').value=' + restante + '">Completar meta (' + formatCurrency(restante, moneda) + ')</button></div>';
  }

  formHTML += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
  formHTML += '  <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>';
  formHTML += '  <button type="submit" class="btn btn-primary"><i class="fas fa-plus-circle"></i> Registrar Aporte</button>';
  formHTML += '</div>';
  formHTML += '</form>';

  openModal('Aportar a Meta', formHTML);
}

function saveAporte(event, metaId) {
  event.preventDefault();
  var metas = loadData(STORAGE_KEYS.metas) || [];
  var idx = metas.findIndex(function(m) { return m.id === metaId; });
  if (idx === -1) { showToast('No se encontro la meta.', 'error'); return; }

  var monto = parseFloat(document.getElementById('aporteMontoInput').value) || 0;
  if (monto <= 0) { showToast('Ingresa un monto valido.', 'warning'); return; }

  metas[idx].monto_actual += monto;
  metas[idx].updated = new Date().toISOString();

  var alcanzada = metas[idx].monto_actual >= metas[idx].monto_objetivo;

  saveData(STORAGE_KEYS.metas, metas);
  closeModal();

  if (alcanzada) {
    showToast('Felicidades! Has alcanzado tu meta "' + metas[idx].nombre + '".', 'success');
  } else {
    var pctNew = (metas[idx].monto_actual / metas[idx].monto_objetivo * 100).toFixed(1);
    showToast('Aporte registrado. Progreso: ' + pctNew + '%', 'success');
  }

  renderMetas();
}
