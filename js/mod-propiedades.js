/* ============================================================
   MODULE: PROPIEDADES  -  Preventas y Terminadas
   ============================================================ */

function renderPropiedades() {
  var el = document.getElementById('module-propiedades');
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  /* ---- KPI calculations ---- */
  var valorPortafolio = 0;
  var ingresoMensualRentas = 0;
  var countPreventas = 0;
  var countTerminadas = 0;
  var deudaTotalPropiedades = 0;

  propiedades.forEach(function (p) {
    valorPortafolio += toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio);
    if (p.tipo === 'preventa') {
      countPreventas++;
      var enganche = p.enganche || 0;
      var pagado = enganche + ((p.mensualidades_pagadas || 0) * (p.monto_mensualidad || 0));
      var pendiente = Math.max(0, (p.valor_compra || 0) - pagado);
      deudaTotalPropiedades += toMXN(pendiente, p.moneda || 'MXN', tiposCambio);
    }
    if (p.tipo === 'terminada') {
      countTerminadas++;
      if (p.ocupada && p.renta_mensual) {
        ingresoMensualRentas += toMXN(p.renta_mensual, p.moneda || 'MXN', tiposCambio);
      }
    }
  });

  var palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  el.innerHTML =
    /* ---------- KPI Cards ---------- */
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:24px;">' +

      '<div class="card" style="border-left:3px solid var(--accent-green);cursor:pointer;" onclick="mostrarDesglosePropKPI(\'valor\')">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-city" style="color:var(--accent-green);font-size:14px;"></i>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Valor Portafolio</span>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent-green);">' + formatCurrency(valorPortafolio, 'MXN') + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>' +
      '</div>' +

      '<div class="card" style="border-left:3px solid var(--accent-red);cursor:pointer;" onclick="mostrarDesglosePropKPI(\'deuda\')">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-file-invoice-dollar" style="color:var(--accent-red);font-size:14px;"></i>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Deuda Total</span>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent-red);">' + formatCurrency(deudaTotalPropiedades, 'MXN') + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>' +
      '</div>' +

      '<div class="card" style="border-left:3px solid var(--accent-blue);cursor:pointer;" onclick="mostrarDesglosePropKPI(\'rentas\')">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-money-check-alt" style="color:var(--accent-blue);font-size:14px;"></i>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rentas Mensuales</span>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent-blue);">' + formatCurrency(ingresoMensualRentas, 'MXN') + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Click para desglose <i class="fas fa-chevron-right" style="font-size:8px;"></i></div>' +
      '</div>' +

      '<div class="card" style="border-left:3px solid var(--accent-amber);">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-hard-hat" style="color:var(--accent-amber);font-size:14px;"></i>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Preventas</span>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent-amber);">' + countPreventas + '</div>' +
      '</div>' +

      '<div class="card" style="border-left:3px solid var(--accent-purple);">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-purple-soft);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-building" style="color:var(--accent-purple);font-size:14px;"></i>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Terminadas</span>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent-purple);">' + countTerminadas + '</div>' +
      '</div>' +

    '</div>' +

    /* ---------- Charts ---------- */
    '<div class="grid-2" style="margin-bottom:24px;">' +
      '<div class="card">' +
        '<h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Distribucion del Valor por Propiedad</h3>' +
        '<div style="height:280px;"><canvas id="propDonutChart"></canvas></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Ingreso por Renta Mensual</h3>' +
        '<div style="height:280px;"><canvas id="propBarChart"></canvas></div>' +
      '</div>' +
    '</div>' +

    /* ---------- Filters ---------- */
    '<div class="card" style="margin-bottom:24px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<div class="form-group" style="margin-bottom:0;min-width:140px;">' +
            '<select id="filterPropiedadTipo" class="form-select" onchange="filterPropiedades()">' +
              '<option value="">Todas</option>' +
              '<option value="preventa">Preventas</option>' +
              '<option value="terminada">Terminadas</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:0;min-width:180px;">' +
            '<input type="text" id="filterPropiedadSearch" class="form-input" placeholder="Buscar propiedad..." oninput="filterPropiedades()">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="editPropiedad(null)"><i class="fas fa-plus"></i> Nueva Propiedad</button>' +
      '</div>' +
    '</div>' +

    /* ---------- Property cards container ---------- */
    '<div id="propiedadesContainer"></div>' +

    /* ---------- Calendario de Pagos ---------- */
    '<div id="calendarioPagosContainer" style="margin-top:24px;"></div>';

  /* ---- Charts ---- */
  var cc = getChartColors();
  window._charts = window._charts || {};

  /* -- Donut: value distribution -- */
  var donutLabels = [];
  var donutData = [];
  var donutColors = [];
  propiedades.forEach(function (p, i) {
    donutLabels.push(p.nombre);
    donutData.push(toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio));
    donutColors.push(palette[i % palette.length]);
  });

  if (window._charts.propDonut) window._charts.propDonut.destroy();
  var donutCtx = document.getElementById('propDonutChart').getContext('2d');
  window._charts.propDonut = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: donutLabels,
      datasets: [{
        data: donutData,
        backgroundColor: donutColors,
        borderWidth: 2,
        borderColor: cc.borderColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: cc.fontColor,
            padding: 12,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.label + ': ' + formatCurrency(ctx.parsed, 'MXN');
            }
          }
        }
      }
    }
  });

  /* -- Bar: rental income (terminadas only) -- */
  var rentProps = propiedades.filter(function (p) { return p.tipo === 'terminada' && p.renta_mensual > 0; });
  var barLabels = rentProps.map(function (p) { return p.nombre; });
  var barData = rentProps.map(function (p) { return toMXN(p.renta_mensual, p.moneda || 'MXN', tiposCambio); });
  var barColors = rentProps.map(function (_p, i) { return palette[i % palette.length]; });

  if (window._charts.propBar) window._charts.propBar.destroy();
  var barCtx = document.getElementById('propBarChart').getContext('2d');
  window._charts.propBar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Renta Mensual (MXN)',
        data: barData,
        backgroundColor: barColors.map(function (c) { return c + 'AA'; }),
        borderColor: barColors,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: cc.fontColor, font: { size: 10, family: "'Plus Jakarta Sans'" } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: cc.fontColor,
            font: { size: 10, family: "'Plus Jakarta Sans'" },
            callback: function (val) { return '$' + (val / 1000).toFixed(0) + 'k'; }
          },
          grid: { color: cc.gridColor }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) { return formatCurrency(ctx.parsed.y, 'MXN'); }
          }
        }
      }
    }
  });

  filterPropiedades();
  verCalendarioPagos();
}

/* ============================================================
   FILTER
   ============================================================ */
function filterPropiedades() {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var elTipo = document.getElementById('filterPropiedadTipo');
  var elSearch = document.getElementById('filterPropiedadSearch');
  var fTipo = elTipo ? elTipo.value : '';
  var fSearch = elSearch ? elSearch.value.toLowerCase().trim() : '';

  var filtered = propiedades.filter(function (p) {
    if (fTipo && p.tipo !== fTipo) return false;
    if (fSearch) {
      var nombre = (p.nombre || '').toLowerCase();
      var ubicacion = (p.ubicacion || '').toLowerCase();
      var notas = (p.notas || '').toLowerCase();
      if (!nombre.includes(fSearch) && !ubicacion.includes(fSearch) && !notas.includes(fSearch)) return false;
    }
    return true;
  });

  var container = document.getElementById('propiedadesContainer');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="card" style="text-align:center;padding:40px 20px;color:var(--text-muted);">' +
        '<i class="fas fa-building" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.4;"></i>' +
        'No se encontraron propiedades con los filtros aplicados.' +
      '</div>';
    return;
  }

  container.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
    filtered.map(function (p) {
    var moneda = p.moneda || 'MXN';
    var cardContent = '';

    if (p.tipo === 'preventa') {
      cardContent = buildPreventaCard(p, moneda);
    } else {
      cardContent = buildTerminadaCard(p, moneda);
    }

    var tipoBadge = p.tipo === 'preventa'
      ? '<span class="badge badge-amber">Preventa</span>'
      : '<span class="badge badge-purple">Terminada</span>';

    var actions =
      '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="editPropiedad(\'' + p.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>';
    if (p.tipo === 'preventa') {
      actions += '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="registrarPagoMensualidad(\'' + p.id + '\')" title="Registrar Pago"><i class="fas fa-money-bill-wave"></i></button>';
    } else {
      actions += '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin-right:4px;" onclick="actualizarValor(\'' + p.id + '\')" title="Actualizar Valor"><i class="fas fa-chart-line"></i></button>';
    }
    actions += '<button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deletePropiedad(\'' + p.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>';

    return '<div class="card" style="margin-bottom:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">' +
        '<div>' +
          '<h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0 0 4px 0;">' + (p.nombre || '') + '</h3>' +
          '<div style="font-size:11px;color:var(--text-muted);">' +
            '<i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>' + (p.ubicacion || 'Sin ubicacion') +
            ' ' + tipoBadge + ' <span class="badge ' + monedaBadgeClass(moneda) + '">' + moneda + '</span>' +
          '</div>' +
        '</div>' +
        '<div>' + actions + '</div>' +
      '</div>' + cardContent +
    '</div>';
  }).join('') + '</div>';
}

/* ============================================================
   PREVENTA card builder
   ============================================================ */
function buildPreventaCard(p, moneda) {
  var res = calcularResumenPreventa(p);
  var progPct = Math.min(res.porcentaje_pagado, 100);
  var pagadas = p.mensualidades_pagadas || 0;
  var totales = p.mensualidades_total || 0;

  /* Fecha entrega countdown */
  var countdownHTML = '';
  if (p.fecha_entrega) {
    var hoy = new Date();
    hoy.setHours(0,0,0,0);
    var entrega = new Date(p.fecha_entrega + 'T00:00:00');
    var diffMs = entrega.getTime() - hoy.getTime();
    var diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias > 0) {
      var anios = Math.floor(diffDias / 365);
      var meses = Math.floor((diffDias % 365) / 30);
      var dias = diffDias % 30;
      var parts = [];
      if (anios > 0) parts.push(anios + (anios === 1 ? ' anio' : ' anios'));
      if (meses > 0) parts.push(meses + (meses === 1 ? ' mes' : ' meses'));
      if (dias > 0) parts.push(dias + (dias === 1 ? ' dia' : ' dias'));
      countdownHTML =
        '<div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--accent-amber-soft);display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-clock" style="color:var(--accent-amber);font-size:14px;"></i>' +
          '<span style="font-size:12px;color:var(--accent-amber);font-weight:600;">Entrega en ' + parts.join(', ') + ' (' + formatDate(p.fecha_entrega) + ')</span>' +
        '</div>';
    } else if (diffDias === 0) {
      countdownHTML =
        '<div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--accent-green-soft);display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-check-circle" style="color:var(--accent-green);font-size:14px;"></i>' +
          '<span style="font-size:12px;color:var(--accent-green);font-weight:600;">Entrega programada para hoy</span>' +
        '</div>';
    } else {
      countdownHTML =
        '<div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--accent-red-soft);display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-exclamation-triangle" style="color:var(--accent-red);font-size:14px;"></i>' +
          '<span style="font-size:12px;color:var(--accent-red);font-weight:600;">Entrega vencida hace ' + Math.abs(diffDias) + ' dias (' + formatDate(p.fecha_entrega) + ')</span>' +
        '</div>';
    }
  }

  var gananciaColor = res.ganancia_potencial >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    /* KPI row */
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Enganche</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-blue);">' + formatCurrency(p.enganche || 0, moneda) + '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Pagado</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-green);">' + formatCurrency(res.total_pagado, moneda) + '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Saldo Pendiente</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-amber);">' + formatCurrency(res.saldo_pendiente, moneda) + '</div>' +
      '</div>' +
    '</div>' +

    /* Progress bar */
    '<div style="margin-bottom:12px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
        '<span style="font-size:11px;color:var(--text-muted);">Progreso de Pagos</span>' +
        '<span style="font-size:11px;font-weight:600;color:var(--text-primary);">' + pagadas + ' / ' + totales + ' mensualidades</span>' +
      '</div>' +
      '<div class="progress-bar">' +
        '<div class="progress-bar-fill" style="width:' + progPct + '%;"></div>' +
      '</div>' +
    '</div>' +

    /* Details row */
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;color:var(--text-muted);">' +
      '<div>Valor Compra: <strong style="color:var(--text-primary);">' + formatCurrency(p.valor_compra, moneda) + '</strong></div>' +
      '<div>Valor Venta Est.: <strong style="color:var(--text-primary);">' + formatCurrency(p.valor_venta_estimado || 0, moneda) + '</strong></div>' +
      '<div>Ganancia Potencial: <strong style="color:' + gananciaColor + ';">' + formatCurrency(res.ganancia_potencial, moneda) + '</strong></div>' +
    '</div>' +

    countdownHTML
  );
}

/* ============================================================
   TERMINADA card builder
   ============================================================ */
function buildTerminadaCard(p, moneda) {
  var res = calcularResumenTerminada(p);
  var plusvaliaColor = res.plusvalia >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  var ocupadaBadge = p.ocupada
    ? '<span class="badge badge-green">Ocupada</span>'
    : '<span class="badge badge-red">Desocupada</span>';

  return (
    /* KPI row */
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Valor de Mercado Estimado</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-blue);">' + formatCurrency(p.valor_actual, moneda) + '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Renta Mensual</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-green);">' + formatCurrency(p.renta_mensual || 0, moneda) + '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Rendimiento Anual</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--accent-purple);">' + formatPct(res.rendimiento_anual) + '</div>' +
      '</div>' +
    '</div>' +

    /* Details row */
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;color:var(--text-muted);">' +
      '<div>Plusvalia: <strong style="color:' + plusvaliaColor + ';">' + formatCurrency(res.plusvalia, moneda) + ' (' + formatPct(res.plusvalia_pct) + ')</strong></div>' +
      '<div>Gastos Mant.: <strong style="color:var(--text-primary);">' + formatCurrency(p.gastos_mantenimiento || 0, moneda) + '</strong></div>' +
      '<div>' + ocupadaBadge + '</div>' +
    '</div>'
  );
}

/* ============================================================
   EDIT modal
   ============================================================ */
function editPropiedad(id) {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prop = null;
  if (id) prop = propiedades.find(function (p) { return p.id === id; });
  var isEdit = !!prop;
  var titulo = isEdit ? 'Editar Propiedad' : 'Nueva Propiedad';
  var tipoVal = isEdit ? prop.tipo : 'preventa';

  var formHTML =
    '<form id="formPropiedad" onsubmit="savePropiedad(event)">' +
      '<input type="hidden" id="propiedadId" value="' + (isEdit ? prop.id : '') + '">' +

      '<div class="form-group"><label class="form-label">Nombre *</label>' +
        '<input type="text" id="propiedadNombre" class="form-input" required value="' + (isEdit ? prop.nombre : '') + '" placeholder="Ej: Depto Polanco Torre 3"></div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Tipo *</label>' +
          '<select id="propiedadTipo" class="form-select" required onchange="togglePropiedadTipoFields()">' +
            '<option value="preventa"' + (isEdit && prop.tipo === 'preventa' ? ' selected' : '') + '>Preventa</option>' +
            '<option value="terminada"' + (isEdit && prop.tipo === 'terminada' ? ' selected' : '') + '>Terminada</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Ubicacion</label>' +
          '<input type="text" id="propiedadUbicacion" class="form-input" value="' + (isEdit ? (prop.ubicacion || '') : '') + '" placeholder="Ciudad o zona"></div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
        '<div class="form-group"><label class="form-label">Valor de Compra *</label>' +
          '<input type="number" id="propiedadValorCompra" class="form-input" required step="0.01" min="0" value="' + (isEdit ? prop.valor_compra : '') + '" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">Valor de Mercado Estimado *</label><div style="font-size:10px;color:var(--text-muted);margin-top:-4px;margin-bottom:4px;">Precio estimado de venta hoy en el mercado</div>' +
          '<input type="number" id="propiedadValorActual" class="form-input" required step="0.01" min="0" value="' + (isEdit ? prop.valor_actual : '') + '" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">Moneda *</label>' +
          '<select id="propiedadMoneda" class="form-select" required>' +
            '<option value="MXN"' + (isEdit && prop.moneda === 'MXN' ? ' selected' : '') + '>MXN</option>' +
            '<option value="USD"' + (isEdit && prop.moneda === 'USD' ? ' selected' : '') + '>USD</option>' +
            '<option value="EUR"' + (isEdit && prop.moneda === 'EUR' ? ' selected' : '') + '>EUR</option>' +
          '</select></div>' +
      '</div>' +

      /* ---- Preventa fields ---- */
      '<div id="preventaFields" style="display:' + (tipoVal === 'preventa' ? 'block' : 'none') + ';">' +
        '<div style="padding:12px;border-radius:8px;background:var(--bg-base);margin-bottom:12px;">' +
          '<div style="font-size:12px;font-weight:600;color:var(--accent-amber);margin-bottom:8px;">Datos de Preventa</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div class="form-group"><label class="form-label">Enganche</label>' +
              '<input type="number" id="propiedadEnganche" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.enganche || '') : '') + '" placeholder="0.00"></div>' +
            '<div class="form-group"><label class="form-label">Monto Mensualidad</label>' +
              '<input type="number" id="propiedadMontoMensualidad" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.monto_mensualidad || '') : '') + '" placeholder="0.00"></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div class="form-group"><label class="form-label">Mensualidades Total</label>' +
              '<input type="number" id="propiedadMensualidadesTotal" class="form-input" step="1" min="0" value="' + (isEdit ? (prop.mensualidades_total || '') : '') + '" placeholder="0"></div>' +
            '<div class="form-group"><label class="form-label">Mensualidades Pagadas</label>' +
              '<input type="number" id="propiedadMensualidadesPagadas" class="form-input" step="1" min="0" value="' + (isEdit ? (prop.mensualidades_pagadas || '') : '') + '" placeholder="0"></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div class="form-group"><label class="form-label">Fecha Inicio</label>' +
              '<input type="date" id="propiedadFechaInicio" class="form-input" value="' + (isEdit && prop.fecha_inicio ? prop.fecha_inicio : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Fecha Entrega</label>' +
              '<input type="date" id="propiedadFechaEntrega" class="form-input" value="' + (isEdit && prop.fecha_entrega ? prop.fecha_entrega : '') + '"></div>' +
          '</div>' +
          '<div class="form-group"><label class="form-label">Valor Venta Estimado</label>' +
            '<input type="number" id="propiedadValorVentaEstimadoP" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.valor_venta_estimado || '') : '') + '" placeholder="0.00"></div>' +
        '</div>' +
      '</div>' +

      /* ---- Terminada fields ---- */
      '<div id="terminadaFields" style="display:' + (tipoVal === 'terminada' ? 'block' : 'none') + ';">' +
        '<div style="padding:12px;border-radius:8px;background:var(--bg-base);margin-bottom:12px;">' +
          '<div style="font-size:12px;font-weight:600;color:var(--accent-purple);margin-bottom:8px;">Datos de Propiedad Terminada</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div class="form-group"><label class="form-label">Renta Mensual</label>' +
              '<input type="number" id="propiedadRentaMensual" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.renta_mensual || '') : '') + '" placeholder="0.00"></div>' +
            '<div class="form-group"><label class="form-label">Gastos Mantenimiento (anual)</label>' +
              '<input type="number" id="propiedadGastosMantenimiento" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.gastos_mantenimiento || '') : '') + '" placeholder="0.00"></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:24px;">' +
              '<input type="checkbox" id="propiedadOcupada"' + (isEdit && prop.ocupada ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent-green);">' +
              '<label for="propiedadOcupada" class="form-label" style="margin-bottom:0;cursor:pointer;">Ocupada</label>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Valor Venta Estimado</label>' +
              '<input type="number" id="propiedadValorVentaEstimadoT" class="form-input" step="0.01" min="0" value="' + (isEdit ? (prop.valor_venta_estimado || '') : '') + '" placeholder="0.00"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="form-group"><label class="form-label">Notas</label>' +
        '<textarea id="propiedadNotas" class="form-input" rows="3" style="resize:vertical;" placeholder="Notas adicionales...">' + (isEdit && prop.notas ? prop.notas : '') + '</textarea></div>' +

      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ' + (isEdit ? 'Guardar Cambios' : 'Crear Propiedad') + '</button>' +
      '</div>' +
    '</form>';

  openModal(titulo, formHTML);
}

/* ============================================================
   TOGGLE tipo fields
   ============================================================ */
function togglePropiedadTipoFields() {
  var tipo = document.getElementById('propiedadTipo');
  var prevFields = document.getElementById('preventaFields');
  var termFields = document.getElementById('terminadaFields');
  if (tipo && prevFields && termFields) {
    prevFields.style.display = tipo.value === 'preventa' ? 'block' : 'none';
    termFields.style.display = tipo.value === 'terminada' ? 'block' : 'none';
  }
}

/* ============================================================
   SAVE (create / update)
   ============================================================ */
function savePropiedad(event) {
  event.preventDefault();
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var id = document.getElementById('propiedadId').value;
  var nombre = document.getElementById('propiedadNombre').value.trim();
  var tipo = document.getElementById('propiedadTipo').value;
  var ubicacion = document.getElementById('propiedadUbicacion').value.trim();
  var valor_compra = parseFloat(document.getElementById('propiedadValorCompra').value) || 0;
  var valor_actual = parseFloat(document.getElementById('propiedadValorActual').value) || 0;
  var moneda = document.getElementById('propiedadMoneda').value;
  var notas = document.getElementById('propiedadNotas').value.trim();

  if (!nombre || valor_compra <= 0 || valor_actual <= 0) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  var data = {
    nombre: nombre,
    tipo: tipo,
    ubicacion: ubicacion,
    valor_compra: valor_compra,
    valor_actual: valor_actual,
    moneda: moneda,
    notas: notas
  };

  if (tipo === 'preventa') {
    data.enganche = parseFloat(document.getElementById('propiedadEnganche').value) || 0;
    data.monto_mensualidad = parseFloat(document.getElementById('propiedadMontoMensualidad').value) || 0;
    data.mensualidades_total = parseInt(document.getElementById('propiedadMensualidadesTotal').value, 10) || 0;
    data.mensualidades_pagadas = parseInt(document.getElementById('propiedadMensualidadesPagadas').value, 10) || 0;
    data.fecha_inicio = document.getElementById('propiedadFechaInicio').value;
    data.fecha_entrega = document.getElementById('propiedadFechaEntrega').value;
    data.valor_venta_estimado = parseFloat(document.getElementById('propiedadValorVentaEstimadoP').value) || 0;
    data.renta_mensual = 0;
    data.ocupada = false;
    data.gastos_mantenimiento = 0;
  } else {
    data.renta_mensual = parseFloat(document.getElementById('propiedadRentaMensual').value) || 0;
    data.gastos_mantenimiento = parseFloat(document.getElementById('propiedadGastosMantenimiento').value) || 0;
    data.ocupada = document.getElementById('propiedadOcupada').checked;
    data.valor_venta_estimado = parseFloat(document.getElementById('propiedadValorVentaEstimadoT').value) || 0;
    data.enganche = 0;
    data.monto_mensualidad = 0;
    data.mensualidades_total = 0;
    data.mensualidades_pagadas = 0;
    data.fecha_inicio = '';
    data.fecha_entrega = '';
  }

  if (id) {
    /* ---- Update ---- */
    var idx = propiedades.findIndex(function (p) { return p.id === id; });
    if (idx === -1) { showToast('No se encontro la propiedad.', 'error'); return; }
    Object.assign(propiedades[idx], data);
    propiedades[idx].updated = new Date().toISOString();
    saveData(STORAGE_KEYS.propiedades, propiedades);
    showToast('Propiedad actualizada exitosamente.', 'success');
  } else {
    /* ---- Create ---- */
    data.id = uuid();
    data.historial_valor = [{ fecha: new Date().toISOString(), valor: valor_actual }];
    data.created = new Date().toISOString();
    propiedades.push(data);
    saveData(STORAGE_KEYS.propiedades, propiedades);
    showToast('Propiedad creada exitosamente.', 'success');
  }

  closeModal();
  renderPropiedades();
  updateHeaderPatrimonio();
}

/* ============================================================
   DELETE
   ============================================================ */
function deletePropiedad(id) {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prop = propiedades.find(function (p) { return p.id === id; });
  if (!prop) return;
  if (!confirm('\u00BFEstas seguro de eliminar la propiedad "' + prop.nombre + '"?\n\nEsta accion no se puede deshacer.')) return;
  saveData(STORAGE_KEYS.propiedades, propiedades.filter(function (p) { return p.id !== id; }));
  showToast('Propiedad eliminada exitosamente.', 'info');
  renderPropiedades();
  updateHeaderPatrimonio();
}

/* ============================================================
   REGISTRAR PAGO MENSUALIDAD  (preventas)
   ============================================================ */
function registrarPagoMensualidad(propiedadId) {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var idx = propiedades.findIndex(function (p) { return p.id === propiedadId; });
  if (idx === -1) return;
  var prop = propiedades[idx];

  prop.mensualidades_pagadas = (prop.mensualidades_pagadas || 0) + 1;
  propiedades[idx] = prop;
  saveData(STORAGE_KEYS.propiedades, propiedades);

  if (prop.mensualidades_pagadas >= (prop.mensualidades_total || 0) && prop.mensualidades_total > 0) {
    showToast('Felicidades! Se han completado todas las mensualidades de "' + prop.nombre + '".', 'success');
  } else {
    showToast('Mensualidad ' + prop.mensualidades_pagadas + ' de ' + (prop.mensualidades_total || 0) + ' registrada para "' + prop.nombre + '".', 'success');
  }
  renderPropiedades();
}

/* ============================================================
   ACTUALIZAR VALOR  (terminadas)
   ============================================================ */
function actualizarValor(propiedadId) {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prop = propiedades.find(function (p) { return p.id === propiedadId; });
  if (!prop) return;

  var formHTML =
    '<form id="formActualizarValor" onsubmit="saveActualizarValor(event, \'' + propiedadId + '\')">' +
      '<div style="margin-bottom:16px;padding:12px;border-radius:8px;background:var(--bg-base);">' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Propiedad: <strong style="color:var(--text-primary);">' + prop.nombre + '</strong></div>' +
        '<div style="font-size:12px;color:var(--text-muted);">Valor de mercado actual: <strong style="color:var(--accent-blue);">' + formatCurrency(prop.valor_actual, prop.moneda || 'MXN') + '</strong></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Nuevo Valor *</label>' +
        '<input type="number" id="nuevoValor" class="form-input" required step="0.01" min="0.01" placeholder="0.00"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Actualizar Valor</button>' +
      '</div>' +
    '</form>';

  openModal('Actualizar Valor', formHTML);
}

function saveActualizarValor(event, propiedadId) {
  event.preventDefault();
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var idx = propiedades.findIndex(function (p) { return p.id === propiedadId; });
  if (idx === -1) { showToast('No se encontro la propiedad.', 'error'); return; }
  var nuevoValor = parseFloat(document.getElementById('nuevoValor').value) || 0;
  if (nuevoValor <= 0) { showToast('Por favor ingresa un valor valido.', 'warning'); return; }

  propiedades[idx].valor_actual = nuevoValor;
  if (!propiedades[idx].historial_valor) propiedades[idx].historial_valor = [];
  propiedades[idx].historial_valor.push({ fecha: new Date().toISOString(), valor: nuevoValor });
  propiedades[idx].updated = new Date().toISOString();

  saveData(STORAGE_KEYS.propiedades, propiedades);
  closeModal();
  showToast('Valor actualizado exitosamente.', 'success');
  renderPropiedades();
  updateHeaderPatrimonio();
}

/* ============================================================
   CALCULATION HELPERS
   ============================================================ */
function calcularResumenPreventa(prop) {
  var enganche = prop.enganche || 0;
  var mensualidades_pagadas = prop.mensualidades_pagadas || 0;
  var monto_mensualidad = prop.monto_mensualidad || 0;
  var mensualidades_total = prop.mensualidades_total || 0;
  var valor_compra = prop.valor_compra || 0;
  var valor_venta_estimado = prop.valor_venta_estimado || 0;

  var total_pagado = enganche + (mensualidades_pagadas * monto_mensualidad);
  var porcentaje_pagado = mensualidades_total > 0
    ? (mensualidades_pagadas / mensualidades_total) * 100
    : 0;
  var saldo_pendiente = valor_compra - total_pagado;
  if (saldo_pendiente < 0) saldo_pendiente = 0;
  var ganancia_potencial = valor_venta_estimado - valor_compra;

  return {
    total_pagado: total_pagado,
    porcentaje_pagado: porcentaje_pagado,
    saldo_pendiente: saldo_pendiente,
    ganancia_potencial: ganancia_potencial
  };
}

function calcularResumenTerminada(prop) {
  var renta_mensual = prop.renta_mensual || 0;
  var gastos_mantenimiento = prop.gastos_mantenimiento || 0;
  var valor_actual = prop.valor_actual || 0;
  var valor_compra = prop.valor_compra || 0;

  var rendimiento_anual = valor_actual > 0
    ? ((renta_mensual * 12 - gastos_mantenimiento) / valor_actual) * 100
    : 0;
  var plusvalia = valor_actual - valor_compra;
  var plusvalia_pct = valor_compra > 0 ? (plusvalia / valor_compra) * 100 : 0;

  return {
    rendimiento_anual: rendimiento_anual,
    plusvalia: plusvalia,
    plusvalia_pct: plusvalia_pct
  };
}

/* ============================================================
   CALENDARIO DE PAGOS
   ============================================================ */
function verCalendarioPagos() {
  var container = document.getElementById('calendarioPagosContainer');
  if (!container) return;

  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  if (propiedades.length === 0) {
    container.innerHTML = '';
    return;
  }

  var hoy = new Date();
  var mesActual = hoy.getMonth();
  var anioActual = hoy.getFullYear();

  /* Build array of 3 months: current + next 2 */
  var meses3 = [];
  for (var m = 0; m < 3; m++) {
    var mes = (mesActual + m) % 12;
    var anio = anioActual + Math.floor((mesActual + m) / 12);
    meses3.push({ mes: mes, anio: anio, label: mesNombre(mes) + ' ' + anio });
  }

  /* Collect all payment events across the 3 months */
  /* Each event: { mes, anio, tipo: 'mensualidad'|'renta'|'mantenimiento'|'ultima_mensualidad'|'saldo_remanente', nombre, monto, moneda, fecha } */
  var eventos = [];

  /* Summary accumulators (in MXN for aggregation) */
  var totalMensualidadesMes = 0;
  var totalRentasMes = 0;
  var totalMantenimientoMes = 0;
  var proximoPago = null; /* { fecha, monto, moneda, nombre } */

  /* Track info per preventa for summary section */
  var preventaResumen = [];

  propiedades.forEach(function (p) {
    var moneda = p.moneda || 'MXN';

    /* ---- Preventa: upcoming mensualidad payments ---- */
    if (p.tipo === 'preventa' && p.monto_mensualidad > 0 && p.fecha_inicio) {
      var pagadas = p.mensualidades_pagadas || 0;
      var totales = p.mensualidades_total || 0;
      var restantes = totales - pagadas;

      /* Calculate saldo remanente = valor_compra - enganche - (totales * monto_mensualidad) */
      var enganche = p.enganche || 0;
      var totalMensualidadesFull = totales * p.monto_mensualidad;
      var saldoRemanente = Math.max(0, (p.valor_compra || 0) - enganche - totalMensualidadesFull);

      /* Track for summary */
      var inicioDate = new Date(p.fecha_inicio + 'T00:00:00');
      var nextPayDay = inicioDate.getDate();

      /* Ultima mensualidad date */
      var lastPayIdx = totales - 1;
      var lastPayMonth = (inicioDate.getMonth() + lastPayIdx) % 12;
      var lastPayYear = inicioDate.getFullYear() + Math.floor((inicioDate.getMonth() + lastPayIdx) / 12);
      var lastPayDay = Math.min(nextPayDay, 28);
      var lastPayDate = new Date(lastPayYear, lastPayMonth, lastPayDay);

      preventaResumen.push({
        nombre: p.nombre,
        moneda: moneda,
        pagadas: pagadas,
        totales: totales,
        restantes: restantes,
        monto_mensualidad: p.monto_mensualidad,
        ultimaMensualidad: lastPayDate,
        saldoRemanente: saldoRemanente
      });

      if (restantes <= 0) return;

      /* Generate events for each of the 3 months if payment falls in that month */
      for (var i = 0; i < restantes && i < 36; i++) {
        var payMonth = (inicioDate.getMonth() + pagadas + i) % 12;
        var payYear = inicioDate.getFullYear() + Math.floor((inicioDate.getMonth() + pagadas + i) / 12);
        var payDay = Math.min(nextPayDay, 28);
        var payDate = new Date(payYear, payMonth, payDay);

        var isLastMensualidad = (pagadas + i + 1 === totales);

        /* Check if this falls in any of our 3 months */
        for (var k = 0; k < 3; k++) {
          if (payMonth === meses3[k].mes && payYear === meses3[k].anio) {
            eventos.push({
              mesIdx: k,
              tipo: isLastMensualidad ? 'ultima_mensualidad' : 'mensualidad',
              nombre: p.nombre,
              monto: p.monto_mensualidad,
              montoMXN: toMXN(p.monto_mensualidad, moneda, tiposCambio),
              moneda: moneda,
              fecha: payDate,
              dia: payDay,
              restantes: restantes - i
            });

            /* If last mensualidad and there's saldo remanente, add it too */
            if (isLastMensualidad && saldoRemanente > 0) {
              eventos.push({
                mesIdx: k,
                tipo: 'saldo_remanente',
                nombre: p.nombre + ' (Saldo Remanente)',
                monto: saldoRemanente,
                montoMXN: toMXN(saldoRemanente, moneda, tiposCambio),
                moneda: moneda,
                fecha: payDate,
                dia: payDay
              });
            }

            /* Track for summary: current month outflow */
            if (k === 0) {
              totalMensualidadesMes += toMXN(p.monto_mensualidad, moneda, tiposCambio);
            }

            /* Track next upcoming payment */
            if (!proximoPago || payDate < proximoPago.fecha) {
              if (payDate >= hoy) {
                proximoPago = {
                  fecha: payDate,
                  monto: p.monto_mensualidad,
                  moneda: moneda,
                  nombre: p.nombre
                };
              }
            }
            break;
          }
        }
      }
    }

    /* ---- Terminada: rent income (1st of each month) ---- */
    if (p.tipo === 'terminada' && p.renta_mensual > 0 && p.ocupada) {
      for (var j = 0; j < 3; j++) {
        var rentDate = new Date(meses3[j].anio, meses3[j].mes, 1);
        eventos.push({
          mesIdx: j,
          tipo: 'renta',
          nombre: p.nombre,
          monto: p.renta_mensual,
          montoMXN: toMXN(p.renta_mensual, moneda, tiposCambio),
          moneda: moneda,
          fecha: rentDate,
          dia: 1
        });
        if (j === 0) {
          totalRentasMes += toMXN(p.renta_mensual, moneda, tiposCambio);
        }
      }
    }

    /* ---- Maintenance costs (distributed monthly) ---- */
    if (p.gastos_mantenimiento > 0) {
      var gastoMensual = p.gastos_mantenimiento / 12;
      for (var n = 0; n < 3; n++) {
        /* Show maintenance on the 15th of each month */
        var maintDate = new Date(meses3[n].anio, meses3[n].mes, 15);
        eventos.push({
          mesIdx: n,
          tipo: 'mantenimiento',
          nombre: p.nombre,
          monto: gastoMensual,
          montoMXN: toMXN(gastoMensual, moneda, tiposCambio),
          moneda: moneda,
          fecha: maintDate,
          dia: 15
        });
        if (n === 0) {
          totalMantenimientoMes += toMXN(gastoMensual, moneda, tiposCambio);
        }
      }
    }
  });

  /* Sort events by date within each month */
  eventos.sort(function (a, b) {
    if (a.mesIdx !== b.mesIdx) return a.mesIdx - b.mesIdx;
    return a.dia - b.dia;
  });

  /* Net cash flow */
  var flujoNeto = totalRentasMes - totalMensualidadesMes - totalMantenimientoMes;
  var flujoNetoColor = flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  var flujoNetoIcon = flujoNeto >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

  /* Proximo pago info */
  var proximoPagoHTML = '';
  if (proximoPago) {
    proximoPagoHTML =
      '<div style="font-size:13px;font-weight:700;color:var(--accent-red);">' + formatCurrency(proximoPago.monto, proximoPago.moneda) + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + proximoPago.nombre + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);">' + formatDate(proximoPago.fecha) + '</div>';
  } else {
    proximoPagoHTML = '<div style="font-size:12px;color:var(--text-muted);">Sin pagos pendientes</div>';
  }

  /* ===== BUILD HTML ===== */
  var html = '';

  /* Section title */
  html +=
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
      '<div style="width:36px;height:36px;border-radius:10px;background:var(--accent-blue-soft);display:flex;align-items:center;justify-content:center;">' +
        '<i class="fas fa-calendar-alt" style="color:var(--accent-blue);font-size:15px;"></i>' +
      '</div>' +
      '<h2 style="font-size:18px;font-weight:800;color:var(--text-primary);margin:0;">Calendario de Pagos Proximos</h2>' +
    '</div>';

  /* ---- Summary Card ---- */
  html +=
    '<div class="card" style="margin-bottom:20px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;">' +

        /* Total outflow */
        '<div style="text-align:center;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:var(--accent-red-soft);display:flex;align-items:center;justify-content:center;">' +
              '<i class="fas fa-arrow-circle-up" style="color:var(--accent-red);font-size:12px;transform:rotate(180deg);"></i>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Egresos Mensuales</span>' +
          '</div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--accent-red);">' + formatCurrency(totalMensualidadesMes + totalMantenimientoMes, 'MXN') + '</div>' +
        '</div>' +

        /* Total income */
        '<div style="text-align:center;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:var(--accent-green-soft);display:flex;align-items:center;justify-content:center;">' +
              '<i class="fas fa-arrow-circle-down" style="color:var(--accent-green);font-size:12px;transform:rotate(180deg);"></i>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Ingresos Rentas</span>' +
          '</div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--accent-green);">' + formatCurrency(totalRentasMes, 'MXN') + '</div>' +
        '</div>' +

        /* Net flow */
        '<div style="text-align:center;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:' + (flujoNeto >= 0 ? 'var(--accent-green-soft)' : 'var(--accent-red-soft)') + ';display:flex;align-items:center;justify-content:center;">' +
              '<i class="fas ' + flujoNetoIcon + '" style="color:' + flujoNetoColor + ';font-size:12px;"></i>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Flujo Neto</span>' +
          '</div>' +
          '<div style="font-size:15px;font-weight:700;color:' + flujoNetoColor + ';">' + formatCurrency(flujoNeto, 'MXN') + '</div>' +
        '</div>' +

        /* Next payment */
        '<div style="text-align:center;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:var(--accent-amber-soft);display:flex;align-items:center;justify-content:center;">' +
              '<i class="fas fa-clock" style="color:var(--accent-amber);font-size:12px;"></i>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Proximo Pago</span>' +
          '</div>' +
          proximoPagoHTML +
        '</div>' +

      '</div>' +
    '</div>';

  /* ---- Visual Timeline: 3 month columns ---- */
  html +=
    '<div class="card">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">';

  for (var mi = 0; mi < 3; mi++) {
    var mesEventos = eventos.filter(function (e) { return e.mesIdx === mi; });
    var isCurrent = mi === 0;

    html +=
      '<div>' +
        /* Month header */
        '<div style="padding:10px 12px;border-radius:8px;background:' + (isCurrent ? 'var(--accent-blue)' : 'var(--bg-base)') + ';margin-bottom:12px;text-align:center;">' +
          '<div style="font-size:13px;font-weight:700;color:' + (isCurrent ? '#fff' : 'var(--text-primary)') + ';">' + meses3[mi].label + '</div>' +
          (isCurrent ? '<div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;">Mes actual</div>' : '') +
        '</div>';

    if (mesEventos.length === 0) {
      html +=
        '<div style="text-align:center;padding:20px 8px;color:var(--text-muted);font-size:12px;">' +
          '<i class="fas fa-check-circle" style="display:block;margin-bottom:6px;opacity:0.4;font-size:18px;"></i>' +
          'Sin movimientos' +
        '</div>';
    } else {
      mesEventos.forEach(function (ev) {
        var bgColor, borderColor, iconClass, iconColor, labelTipo;
        if (ev.tipo === 'mensualidad') {
          bgColor = 'rgba(239,68,68,0.08)';
          borderColor = 'var(--accent-red)';
          iconClass = 'fa-file-invoice-dollar';
          iconColor = 'var(--accent-red)';
          labelTipo = 'Mensualidad';
        } else if (ev.tipo === 'ultima_mensualidad') {
          bgColor = 'rgba(139,92,246,0.10)';
          borderColor = 'var(--accent-purple)';
          iconClass = 'fa-flag-checkered';
          iconColor = 'var(--accent-purple)';
          labelTipo = 'Ultima Mensualidad';
        } else if (ev.tipo === 'saldo_remanente') {
          bgColor = 'rgba(245,158,11,0.12)';
          borderColor = 'var(--accent-amber)';
          iconClass = 'fa-coins';
          iconColor = 'var(--accent-amber)';
          labelTipo = 'Saldo Remanente';
        } else if (ev.tipo === 'renta') {
          bgColor = 'rgba(16,185,129,0.08)';
          borderColor = 'var(--accent-green)';
          iconClass = 'fa-hand-holding-usd';
          iconColor = 'var(--accent-green)';
          labelTipo = 'Renta';
        } else {
          bgColor = 'rgba(245,158,11,0.08)';
          borderColor = 'var(--accent-amber)';
          iconClass = 'fa-tools';
          iconColor = 'var(--accent-amber)';
          labelTipo = 'Mantenimiento';
        }

        var montoColor = ev.tipo === 'renta' ? 'var(--accent-green)' : (ev.tipo === 'ultima_mensualidad' ? 'var(--accent-purple)' : (ev.tipo === 'saldo_remanente' ? 'var(--accent-amber)' : (ev.tipo === 'mensualidad' ? 'var(--accent-red)' : 'var(--accent-amber)')));
        var signo = ev.tipo === 'renta' ? '+' : '-';

        var extraInfo = '';
        if (ev.tipo === 'mensualidad' && ev.restantes !== undefined) {
          extraInfo = '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">' + ev.restantes + ' restante' + (ev.restantes !== 1 ? 's' : '') + '</div>';
        }

        html +=
          '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px;margin-bottom:8px;border-radius:8px;background:' + bgColor + ';border-left:3px solid ' + borderColor + ';">' +
            '<div style="min-width:28px;height:28px;border-radius:6px;background:' + borderColor + '15;display:flex;align-items:center;justify-content:center;margin-top:2px;">' +
              '<i class="fas ' + iconClass + '" style="color:' + iconColor + ';font-size:11px;"></i>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:4px;">' +
                '<div style="font-size:11px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + ev.nombre + '">' + ev.nombre + '</div>' +
                '<div style="font-size:10px;color:var(--text-muted);white-space:nowrap;">Dia ' + ev.dia + '</div>' +
              '</div>' +
              '<div style="font-size:12px;font-weight:700;color:' + montoColor + ';margin-top:2px;">' + signo + ' ' + formatCurrency(ev.monto, ev.moneda) + '</div>' +
              '<div style="font-size:10px;color:var(--text-muted);margin-top:1px;">' + labelTipo + '</div>' +
              extraInfo +
            '</div>' +
          '</div>';
      });
    }

    /* Month subtotals */
    var mesInflow = 0;
    var mesOutflow = 0;
    mesEventos.forEach(function (ev) {
      if (ev.tipo === 'renta') {
        mesInflow += ev.montoMXN;
      } else {
        mesOutflow += ev.montoMXN;
      }
    });
    var mesNet = mesInflow - mesOutflow;
    var mesNetColor = mesNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    if (mesEventos.length > 0) {
      html +=
        '<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--bg-base);">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px;">' +
            '<span>Ingresos</span>' +
            '<span style="color:var(--accent-green);font-weight:600;">+' + formatCurrency(mesInflow, 'MXN') + '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px;">' +
            '<span>Egresos</span>' +
            '<span style="color:var(--accent-red);font-weight:600;">-' + formatCurrency(mesOutflow, 'MXN') + '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:' + mesNetColor + ';border-top:1px solid var(--border-color);padding-top:4px;">' +
            '<span>Neto</span>' +
            '<span>' + (mesNet >= 0 ? '+' : '') + formatCurrency(mesNet, 'MXN') + '</span>' +
          '</div>' +
        '</div>';
    }

    html += '</div>';
  }

  html +=
      '</div>' +
    '</div>';

  /* Legend */
  html +=
    '<div style="display:flex;align-items:center;gap:16px;margin-top:12px;padding:8px 12px;">' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:var(--accent-red);"></div>' +
        '<span style="font-size:11px;color:var(--text-muted);">Mensualidad</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:var(--accent-purple);"></div>' +
        '<span style="font-size:11px;color:var(--text-muted);">Ultima Mensualidad</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:var(--accent-green);"></div>' +
        '<span style="font-size:11px;color:var(--text-muted);">Renta</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:var(--accent-amber);"></div>' +
        '<span style="font-size:11px;color:var(--text-muted);">Mantenimiento / Saldo Remanente</span>' +
      '</div>' +
    '</div>';

  /* Resumen de Preventas: ultima mensualidad + saldo remanente */
  if (preventaResumen.length > 0) {
    html +=
      '<div class="card" style="margin-top:16px;">' +
        '<div class="card-header"><span class="card-title"><i class="fas fa-info-circle" style="margin-right:8px;color:var(--accent-blue);"></i>Resumen de Preventas</span></div>' +
        '<div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;"><thead><tr>' +
          '<th>Propiedad</th><th style="text-align:center;">Pagadas / Total</th><th style="text-align:center;">Restantes</th>' +
          '<th>Monto Mensualidad</th><th>Ultima Mensualidad</th><th>Saldo Remanente</th>' +
        '</tr></thead><tbody>';
    preventaResumen.forEach(function(pr) {
      var saldoRemColor = pr.saldoRemanente > 0 ? 'var(--accent-amber)' : 'var(--accent-green)';
      html += '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + pr.nombre + '</td>' +
        '<td style="text-align:center;">' + pr.pagadas + ' / ' + pr.totales + '</td>' +
        '<td style="text-align:center;font-weight:600;color:var(--accent-red);">' + pr.restantes + '</td>' +
        '<td>' + formatCurrency(pr.monto_mensualidad, pr.moneda) + '</td>' +
        '<td>' + formatDate(pr.ultimaMensualidad) + '</td>' +
        '<td style="font-weight:600;color:' + saldoRemColor + ';">' + formatCurrency(pr.saldoRemanente, pr.moneda) + (pr.saldoRemanente > 0 ? '' : ' <span class="badge badge-green" style="font-size:9px;">Cubierto</span>') + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div></div>';
  }

  container.innerHTML = html;
}

/* ============================================================
   DESGLOSE KPI PROPIEDADES
   ============================================================ */
function mostrarDesglosePropKPI(tipo) {
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var titulo, rows = '', total = 0;

  if (tipo === 'valor') {
    titulo = 'Desglose: Valor del Portafolio';
    rows = propiedades.map(function(p) {
      var moneda = p.moneda || 'MXN';
      var valMXN = toMXN(p.valor_actual || 0, moneda, tiposCambio);
      total += valMXN;
      var tipoBadge = p.tipo === 'preventa' ? 'badge-amber' : 'badge-purple';
      var tipoLabel = p.tipo === 'preventa' ? 'Preventa' : 'Terminada';
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + p.nombre + '</td>' +
        '<td><span class="badge ' + tipoBadge + '">' + tipoLabel + '</span></td>' +
        '<td>' + (p.ubicacion || '-') + '</td>' +
        '<td style="text-align:right;font-weight:600;color:var(--accent-green);">' + formatCurrency(valMXN, 'MXN') + '</td>' +
      '</tr>';
    }).join('');
    rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Total</td>' +
      '<td style="text-align:right;color:var(--accent-green);">' + formatCurrency(total, 'MXN') + '</td></tr>';
    var html = '<table class="data-table"><thead><tr><th>Propiedad</th><th>Tipo</th><th>Ubicacion</th><th style="text-align:right;">Valor (MXN)</th></tr></thead><tbody>' + rows + '</tbody></table>';
    openModal(titulo, html);

  } else if (tipo === 'deuda') {
    titulo = 'Desglose: Deuda de Propiedades';
    var preventas = propiedades.filter(function(p) { return p.tipo === 'preventa'; });
    rows = preventas.map(function(p) {
      var moneda = p.moneda || 'MXN';
      var enganche = p.enganche || 0;
      var pagado = enganche + ((p.mensualidades_pagadas || 0) * (p.monto_mensualidad || 0));
      var pendiente = Math.max(0, (p.valor_compra || 0) - pagado);
      var pendMXN = toMXN(pendiente, moneda, tiposCambio);
      total += pendMXN;
      var restantes = (p.mensualidades_total || 0) - (p.mensualidades_pagadas || 0);
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + p.nombre + '</td>' +
        '<td>' + formatCurrency(toMXN(p.valor_compra, moneda, tiposCambio), 'MXN') + '</td>' +
        '<td>' + formatCurrency(toMXN(pagado, moneda, tiposCambio), 'MXN') + '</td>' +
        '<td style="text-align:right;font-weight:600;color:var(--accent-red);">' + formatCurrency(pendMXN, 'MXN') + '</td>' +
        '<td style="text-align:center;">' + restantes + '</td>' +
      '</tr>';
    }).join('');
    rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="3">Total Deuda</td>' +
      '<td style="text-align:right;color:var(--accent-red);">' + formatCurrency(total, 'MXN') + '</td><td></td></tr>';
    var html2 = '<table class="data-table"><thead><tr><th>Propiedad</th><th>Valor Compra</th><th>Pagado</th><th style="text-align:right;">Pendiente</th><th style="text-align:center;">Mensualidades Rest.</th></tr></thead><tbody>' + rows + '</tbody></table>';
    openModal(titulo, html2);

  } else if (tipo === 'rentas') {
    titulo = 'Desglose: Ingresos por Rentas';
    var terminadas = propiedades.filter(function(p) { return p.tipo === 'terminada'; });
    rows = terminadas.map(function(p) {
      var moneda = p.moneda || 'MXN';
      var rentaMXN = toMXN(p.renta_mensual || 0, moneda, tiposCambio);
      total += (p.ocupada ? rentaMXN : 0);
      var ocupadaBadge = p.ocupada ? '<span class="badge badge-green">Ocupada</span>' : '<span class="badge badge-red">Desocupada</span>';
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-primary);">' + p.nombre + '</td>' +
        '<td>' + ocupadaBadge + '</td>' +
        '<td style="text-align:right;font-weight:600;color:' + (p.ocupada ? 'var(--accent-blue)' : 'var(--text-muted)') + ';">' + formatCurrency(rentaMXN, 'MXN') + '</td>' +
      '</tr>';
    }).join('');
    rows += '<tr style="font-weight:700;border-top:2px solid var(--border-color);"><td colspan="2">Total Activo</td>' +
      '<td style="text-align:right;color:var(--accent-blue);">' + formatCurrency(total, 'MXN') + '</td></tr>';
    var html3 = '<table class="data-table"><thead><tr><th>Propiedad</th><th>Estado</th><th style="text-align:right;">Renta Mensual</th></tr></thead><tbody>' + rows + '</tbody></table>';
    openModal(titulo, html3);
  }
}
