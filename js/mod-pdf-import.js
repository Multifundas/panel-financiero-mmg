/* ============================================================
   PDF BANK STATEMENT IMPORT MODULE  v20260826a
   ============================================================
   Flujo:
   1. openPdfImport()   → modal con solo el selector de archivo
   2. handlePdfUpload() → extrae texto, detecta banco, parsea, clasifica
   3. displayPdfPreview() → tabla editable + selector de cuenta al fondo
   4. confirmPdfImport() → guarda movimientos en la cuenta elegida
   ============================================================ */

// ── Worker de pdf.js ──────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Reglas de clasificación por palabras clave ────────────────
var PDF_CLASSIFICATION_RULES = [
  { keywords: ['oxxo','soriana','walmart','costco','superama','chedraui','la comer','bodega aurrera','heb','alsuper','city market','restaur','torta','taco','pizza','sushi','burger','starbucks','mcdon','subway','dominos','little caesars','uber eat','rappi','didi food','cornershop','comida','aliment'], categoria: 'Alimentacion' },
  { keywords: ['uber trip','uber viaje','didi viaj','gasolina','gasolinera','pemex','bp ','shell','caseta','tag iave','peaje','estacionamiento','parking','cabify','taxi','mecanico','llanta','verificacion vehic','refaccion'], categoria: 'Transporte' },
  { keywords: ['cfe ','comision federal de electricidad','telmex','izzi','megacable','totalplay','axtel','agua ','predial','gas natural','naturgy','luz ','renta ','arrendamiento','hipoteca','mantenimiento','plomero','electricista','ferreteria','home depot'], categoria: 'Vivienda' },
  { keywords: ['farmacia','hospital','medic','doctor','dental','dentista','optica','laboratorio','salud','seguro medico','consulta','ginecolog','pediatr','psicolog'], categoria: 'Salud' },
  { keywords: ['netflix','spotify','amazon prime','disney','hbo','youtube','apple music','steam','xbox','playstation','nintendo','cinepolis','cinemex','cine ','teatro','concierto','airbnb','booking','aeromexico','volaris','vivaaerobus','hotel'], categoria: 'Entretenimiento y viajes' },
  { keywords: ['sat ','isr','impuesto','tenencia','derechos','multa','infraccion'], categoria: 'Impuestos y obligaciones' },
  { keywords: ['colegio','escuela','universidad','udemy','coursera','educacion','inscripcion','colegiatura','guarderia','mensualidad escol'], categoria: 'Familia' },
];

// ── Estado del módulo ─────────────────────────────────────────
var _pdfParsedRows      = [];
var _pdfBanco           = '';
var _pdfTipoEC          = '';
var _pdfExcluirIngresos = false;
var _pdfFechaPago       = '';
var _pdfLastFile        = null;  // { buffer: ArrayBuffer, nombre: string } para archivar
var _pdfDescList        = [];
var _pdfDescCatMap      = {};
var PDF_DRAFT_KEY       = 'pdf_import_draft';

// ── Archivo de PDFs (IndexedDB) ───────────────────────────────
function _openPdfArchiveDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open('pdfEstadosCuenta', 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('pdfs'))
        db.createObjectStore('pdfs', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

function _archivarPdf(banco, numMovs, nombre) {
  if (!_pdfLastFile) return;
  var entry = { banco: banco || 'Banco', nombre: nombre || 'estado_cuenta.pdf',
                numMovs: numMovs || 0,
                fechaArchivo: new Date().toISOString().substring(0, 10),
                data: _pdfLastFile.buffer };
  _openPdfArchiveDB().then(function(db) {
    var tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').add(entry);
    tx.oncomplete = function() { console.log('PDF archivado:', nombre); };
  }).catch(function(e) { console.warn('No se pudo archivar el PDF:', e); });
}

function togglePdfArchivo() {
  var panel = document.getElementById('pdfArchivoPanel');
  var btn   = document.getElementById('pdfArchBtn');
  if (!panel) return;
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-folder-open"></i> PDFs archivados';
    return;
  }
  panel.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:10px 0;">Cargando…</p>';
  panel.style.display = 'block';
  if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar archivo';

  _openPdfArchiveDB().then(function(db) {
    var tx  = db.transaction('pdfs', 'readonly');
    var req = tx.objectStore('pdfs').getAll();
    req.onsuccess = function(e) {
      var items = (e.target.result || []).sort(function(a, b) { return b.id - a.id; });
      var btnReporte = '<button class="btn btn-secondary" onclick="generarReportePdfImport()" style="padding:6px 14px;font-size:13px;margin-left:auto;">'
        + '<i class="fas fa-file-alt"></i> Generar reporte desde BD</button>';
      if (!items.length) {
        panel.innerHTML = '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:14px;">'
          + '<p style="color:var(--text-muted);font-size:14px;margin:0 0 10px;">No hay PDFs archivados aún — se guardan automáticamente al cargar un archivo.</p>'
          + btnReporte
          + '</div>';
        return;
      }
      var thS = 'padding:7px 10px;font-size:13px;text-align:left;border-bottom:2px solid var(--border-color);position:sticky;top:0;background:var(--bg-secondary);';
      var tdS = 'padding:6px 10px;font-size:13px;border-bottom:1px solid var(--border-subtle);';
      var rows = items.map(function(item) {
        var kb = item.data ? Math.round(item.data.byteLength / 1024) + ' KB' : '—';
        return '<tr>'
          + '<td style="' + tdS + '">' + item.fechaArchivo + '</td>'
          + '<td style="' + tdS + '">' + (item.banco || '—') + '</td>'
          + '<td style="' + tdS + 'text-align:center;">' + (item.numMovs || '—') + '</td>'
          + '<td style="' + tdS + 'max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + (item.nombre || '') + '">' + (item.nombre || '—') + '</td>'
          + '<td style="' + tdS + 'color:var(--text-muted);text-align:right;">' + kb + '</td>'
          + '<td style="' + tdS + 'text-align:center;white-space:nowrap;">'
          +   '<button class="btn btn-secondary" onclick="abrirPdfArchivado(' + item.id + ')" style="padding:3px 10px;font-size:12px;margin-right:4px;" title="Ver/Imprimir">'
          +     '<i class="fas fa-eye"></i>'
          +   '</button>'
          +   '<button class="btn btn-secondary" onclick="eliminarPdfArchivado(' + item.id + ',this)" style="padding:3px 10px;font-size:12px;border-color:var(--accent-red);color:var(--accent-red);" title="Eliminar">'
          +     '<i class="fas fa-trash"></i>'
          +   '</button>'
          + '</td>'
          + '</tr>';
      }).join('');
      panel.innerHTML = ''
        + '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:14px;">'
        +   '<div style="display:flex;align-items:center;margin-bottom:10px;">'
        +     '<p style="font-size:13px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin:0;">PDFs archivados (' + items.length + ')</p>'
        +     '<button class="btn btn-secondary" onclick="generarReportePdfImport()" style="padding:4px 12px;font-size:12px;margin-left:auto;" title="Genera reporte imprimible desde la base de datos">'
        +       '<i class="fas fa-file-alt"></i> Reporte desde BD'
        +     '</button>'
        +   '</div>'
        +   '<div style="max-height:250px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:4px;">'
        +     '<table style="width:100%;border-collapse:collapse;">'
        +       '<thead><tr>'
        +         '<th style="' + thS + '">Fecha</th>'
        +         '<th style="' + thS + '">Banco</th>'
        +         '<th style="' + thS + 'text-align:center;">Movs.</th>'
        +         '<th style="' + thS + '">Archivo</th>'
        +         '<th style="' + thS + 'text-align:right;">Tamaño</th>'
        +         '<th style="' + thS + 'width:90px;"></th>'
        +       '</tr></thead>'
        +       '<tbody>' + rows + '</tbody>'
        +     '</table>'
        +   '</div>'
        + '</div>';
    };
  }).catch(function(err) {
    panel.innerHTML = '<p style="color:var(--accent-red);font-size:13px;">Error: ' + err.message + '</p>';
  });
}

function abrirPdfArchivado(id) {
  _openPdfArchiveDB().then(function(db) {
    var req = db.transaction('pdfs', 'readonly').objectStore('pdfs').get(id);
    req.onsuccess = function(e) {
      var item = e.target.result;
      if (!item) { showToast('PDF no encontrado', 'error'); return; }
      var url = URL.createObjectURL(new Blob([item.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    };
  });
}

function generarReportePdfImport() {
  var movs   = loadData(STORAGE_KEYS.movimientos) || [];
  var cats   = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catById = {};
  cats.forEach(function(c){ catById[c.id] = c.nombre; });

  var pdfMovs = movs.filter(function(m){
    return m.notas && m.notas.indexOf('Importado desde PDF') >= 0 && m.tipo === 'gasto';
  }).sort(function(a, b){ return (a.categoria_id||'').localeCompare(b.categoria_id||'') || a.descripcion.localeCompare(b.descripcion); });

  if (!pdfMovs.length) { showToast('No hay movimientos PDF en la base de datos', 'warning'); return; }

  var catMap = {};
  pdfMovs.forEach(function(m) {
    var cn = (m.categoria_id && catById[m.categoria_id]) ? catById[m.categoria_id] : 'Sin categoría';
    if (!catMap[cn]) catMap[cn] = { movs: [], total: 0 };
    catMap[cn].movs.push(m);
    catMap[cn].total += m.monto;
  });

  var total   = pdfMovs.reduce(function(s, m){ return s + m.monto; }, 0);
  var fechas  = pdfMovs.map(function(m){ return m.fecha; });
  var fechaMin = fechas.reduce(function(a, b){ return a < b ? a : b; });
  var fechaMax = fechas.reduce(function(a, b){ return a > b ? a : b; });
  var fmt = function(n){ return n.toLocaleString('es-MX', { minimumFractionDigits: 2 }); };

  var body = '<button onclick="window.print()" style="margin-bottom:14px;padding:6px 18px;font-size:13px;cursor:pointer;">🖨 Imprimir</button>'
    + '<h2 style="margin:0 0 4px;">Estado de Cuenta — Movimientos importados PDF</h2>'
    + '<p style="color:#666;margin:0 0 16px;font-size:13px;">Periodo: ' + fechaMin + ' al ' + fechaMax + ' &nbsp;|&nbsp; ' + pdfMovs.length + ' movimientos</p>';

  Object.keys(catMap).sort().forEach(function(cat) {
    var g = catMap[cat];
    body += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">'
      + '<thead><tr style="background:#e8e8e8;"><th style="padding:6px 10px;text-align:left;border:1px solid #ccc;" colspan="2">' + cat + '</th>'
      + '<th style="padding:6px 10px;text-align:right;border:1px solid #ccc;width:130px;">Monto</th></tr></thead><tbody>';
    g.movs.forEach(function(m){
      body += '<tr><td style="padding:4px 10px;border:1px solid #eee;color:#888;width:110px;">' + m.fecha + '</td>'
        + '<td style="padding:4px 10px;border:1px solid #eee;">' + (m.descripcion || '—') + '</td>'
        + '<td style="padding:4px 10px;border:1px solid #eee;text-align:right;">$' + fmt(m.monto) + '</td></tr>';
    });
    body += '<tr style="font-weight:600;background:#f5f5f5;">'
      + '<td colspan="2" style="padding:5px 10px;border:1px solid #ddd;text-align:right;">Subtotal ' + cat + ':</td>'
      + '<td style="padding:5px 10px;border:1px solid #ddd;text-align:right;">$' + fmt(g.total) + '</td></tr>'
      + '</tbody></table>';
  });

  body += '<table style="width:100%;border-collapse:collapse;"><tbody>'
    + '<tr style="font-weight:700;font-size:15px;background:#f0f0f0;">'
    + '<td colspan="2" style="padding:8px 10px;border:2px solid #ccc;text-align:right;">TOTAL GENERAL:</td>'
    + '<td style="padding:8px 10px;border:2px solid #ccc;text-align:right;width:130px;">$' + fmt(total) + '</td>'
    + '</tr></tbody></table>';

  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">'
    + '<title>Estado de Cuenta PDF</title>'
    + '<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#222;}'
    + '@media print{button{display:none;}body{margin:10px;}}</style>'
    + '</head><body>' + body + '</body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else showToast('Permite ventanas emergentes para ver el reporte', 'warning');
}

function eliminarPdfArchivado(id, btn) {
  if (!confirm('¿Eliminar este PDF del archivo?')) return;
  _openPdfArchiveDB().then(function(db) {
    var tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').delete(id);
    tx.oncomplete = function() {
      var row = btn && btn.closest ? btn.closest('tr') : null;
      if (row) row.remove();
      showToast('PDF eliminado del archivo', 'info');
    };
  });
}

// ── Borrador (guardar/restaurar/descartar) ────────────────────
function savePdfDraft() {
  var sel      = document.getElementById('pdfCuentaSelect');
  var fechaInp = document.getElementById('pdfFechaPagoInput');
  if (fechaInp) _pdfFechaPago = fechaInp.value;
  localStorage.setItem(PDF_DRAFT_KEY, JSON.stringify({
    banco:           _pdfBanco,
    tipoEC:          _pdfTipoEC,
    excluirIngresos: _pdfExcluirIngresos,
    rows:            _pdfParsedRows,
    cuentaId:        sel ? sel.value : '',
    fechaPago:       _pdfFechaPago,
    savedAt:         new Date().toISOString()
  }));
  // Borrador guardado → ya no hay riesgo de perder datos al cerrar
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.dataset.guardClose = '';
  showToast('Borrador guardado. Puedes continuar más tarde.', 'success');
}

function loadPdfDraft() {
  var raw = localStorage.getItem(PDF_DRAFT_KEY);
  if (!raw) return;
  try {
    var draft = JSON.parse(raw);
    _pdfParsedRows      = draft.rows || [];
    _pdfBanco           = draft.banco || '';
    _pdfTipoEC          = draft.tipoEC || '';
    _pdfExcluirIngresos = !!draft.excluirIngresos;
    _pdfFechaPago       = draft.fechaPago || '';
    displayPdfPreview(_pdfBanco);
    setTimeout(function() {
      var sel = document.getElementById('pdfCuentaSelect');
      if (sel && draft.cuentaId) sel.value = draft.cuentaId;
      var fechaInp = document.getElementById('pdfFechaPagoInput');
      if (fechaInp && _pdfFechaPago) fechaInp.value = _pdfFechaPago;
    }, 50);
  } catch(e) { showToast('Error al cargar el borrador', 'error'); }
}

function toggleCatalogoPdf() {
  var panel = document.getElementById('pdfCatalogoPanel');
  var btn   = document.getElementById('pdfCatBtn');
  if (!panel) return;
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-book"></i> Catálogo existente';
    return;
  }

  _buildDescList();
  var entries = Object.keys(_pdfDescCatMap).sort(function(a, b) { return a.localeCompare(b); });

  if (!entries.length) {
    panel.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:12px 0;">No hay descripciones registradas aún.</p>';
    panel.style.display = 'block';
    if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar catálogo';
    return;
  }

  var thS = 'padding:7px 10px;font-size:13px;text-align:left;border-bottom:2px solid var(--border-color);';
  var tdS = 'padding:5px 10px;font-size:13px;border-bottom:1px solid var(--border-subtle);';

  var rows = entries.map(function(desc) {
    var cat = _pdfDescCatMap[desc].categoria_nombre || '<span style="color:var(--text-muted);">—</span>';
    return '<tr>'
      + '<td style="' + tdS + '">' + desc.replace(/</g, '&lt;') + '</td>'
      + '<td style="' + tdS + '">' + cat + '</td>'
      + '</tr>';
  }).join('');

  panel.innerHTML = ''
    + '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:14px;">'
    +   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +     '<span style="font-size:13px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;">'
    +       'Catálogo de descripciones (' + entries.length + ')'
    +     '</span>'
    +     '<input type="text" id="pdfCatSearch" placeholder="Buscar descripción o categoría…"'
    +       ' oninput="filtrarCatalogoPdf(this.value)"'
    +       ' style="flex:1;padding:5px 10px;font-size:13px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-base);color:var(--text-primary);">'
    +   '</div>'
    +   '<div style="max-height:300px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:4px;">'
    +     '<table id="pdfCatTable" class="sortable-table" style="width:100%;border-collapse:collapse;">'
    +       '<thead><tr>'
    +         '<th style="' + thS + 'position:sticky;top:0;background:var(--bg-secondary);">Descripción</th>'
    +         '<th style="' + thS + 'position:sticky;top:0;background:var(--bg-secondary);width:180px;">Categoría</th>'
    +       '</tr></thead>'
    +       '<tbody id="pdfCatTbody">' + rows + '</tbody>'
    +     '</table>'
    +   '</div>'
    + '</div>';

  panel.style.display = 'block';
  if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar catálogo';
  setTimeout(function() {
    _initSortableTables(panel);
    var s = document.getElementById('pdfCatSearch'); if(s) s.focus();
  }, 50);
}

function filtrarCatalogoPdf(q) {
  var tbody = document.getElementById('pdfCatTbody');
  if (!tbody) return;
  var term = q.trim().toLowerCase();
  Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function(tr) {
    var text = tr.textContent.toLowerCase();
    tr.style.display = (!term || text.indexOf(term) >= 0) ? '' : 'none';
  });
}

function discardPdfDraft() {
  localStorage.removeItem(PDF_DRAFT_KEY);
  _pdfParsedRows = [];
  _pdfBanco = '';
  document.getElementById('modalOverlay').dataset.guardClose = '';
  closeModal();
  showToast('Borrador descartado.', 'info');
}

function togglePdfVerification() {
  var panel = document.getElementById('pdfVerificationPanel');
  var btn   = document.getElementById('pdfVerBtn');
  if (!panel) return;
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-list-ul"></i> Ver resumen';
    return;
  }

  // Agrupar gastos por categoría
  var gastos   = _pdfParsedRows.filter(function(r) { return r.tipo === 'gasto'; });
  var ingresos = _pdfParsedRows.filter(function(r) { return r.tipo === 'ingreso'; });

  var sinDesc  = gastos.filter(function(r) { return !(r.descripcion_final || '').trim(); });
  var sinCat   = gastos.filter(function(r) { return (r.descripcion_final || '').trim() && !r.categoria_id; });

  var catMap = {};
  gastos.forEach(function(r) {
    if (!(r.descripcion_final || '').trim() || !r.categoria_id) return;
    var key = r.categoria_nombre || 'Sin categoría';
    if (!catMap[key]) catMap[key] = { count: 0, total: 0 };
    catMap[key].count++;
    catMap[key].total += r.monto;
  });
  var catRows = Object.keys(catMap).sort(function(a, b) { return catMap[b].total - catMap[a].total; });

  var totalGastos   = gastos.reduce(function(s, r) { return s + r.monto; }, 0);
  var totalIngresos = ingresos.reduce(function(s, r) { return s + r.monto; }, 0);

  var thStyle = 'padding:7px 10px;text-align:left;font-size:13px;border-bottom:2px solid var(--border-color);';
  var tdStyle = 'padding:6px 10px;font-size:14px;border-bottom:1px solid var(--border-subtle);';
  var tdR     = tdStyle + 'text-align:right;font-variant-numeric:tabular-nums;';

  var html = '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:16px;">'
    + '<div style="display:flex;gap:16px;flex-wrap:wrap;">';

  // ── Columna izquierda: Atención ──────────────────────────────
  var nAtention = sinDesc.length + sinCat.length;
  html += '<div style="flex:0 0 auto;min-width:260px;">'
    + '<p style="font-size:13px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">Requieren atención (' + nAtention + ')</p>'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr>'
    +   '<th style="' + thStyle + '">Situación</th>'
    +   '<th style="' + thStyle + 'text-align:right;">Movs.</th>'
    +   '<th style="' + thStyle + 'text-align:right;">Total</th>'
    + '</tr></thead><tbody>';

  if (sinDesc.length > 0) {
    var totSD = sinDesc.reduce(function(s, r) { return s + r.monto; }, 0);
    html += '<tr style="background:rgba(var(--accent-red-rgb,220,53,69),.08);cursor:pointer;" onclick="saltarSinDescripcion()" title="Click para ir a la primera sin descripción">'
      + '<td style="' + tdStyle + '"><i class="fas fa-exclamation-circle" style="color:var(--accent-red);margin-right:6px;"></i><strong style="color:var(--accent-red);">Sin descripción</strong> <span style="font-size:12px;color:var(--text-muted);">(click para ir)</span></td>'
      + '<td style="' + tdR + 'color:var(--accent-red);">' + sinDesc.length + '</td>'
      + '<td style="' + tdR + 'color:var(--accent-red);">$' + _formatNum(totSD) + '</td>'
      + '</tr>';
  }
  if (sinCat.length > 0) {
    var totSC = sinCat.reduce(function(s, r) { return s + r.monto; }, 0);
    html += '<tr style="background:rgba(var(--accent-amber-rgb,255,193,7),.08);">'
      + '<td style="' + tdStyle + '"><i class="fas fa-tag" style="color:var(--accent-amber);margin-right:6px;"></i><strong style="color:var(--accent-amber);">Sin categoría</strong></td>'
      + '<td style="' + tdR + 'color:var(--accent-amber);">' + sinCat.length + '</td>'
      + '<td style="' + tdR + 'color:var(--accent-amber);">$' + _formatNum(totSC) + '</td>'
      + '</tr>';
  }
  if (nAtention === 0) {
    html += '<tr><td colspan="3" style="' + tdStyle + 'color:var(--accent-green);"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Todo completo</td></tr>';
  }
  html += '</tbody></table></div>';

  // ── Columna derecha: Resumen por categoría ───────────────────
  html += '<div style="flex:1;min-width:280px;">'
    + '<p style="font-size:13px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">Gastos por categoría</p>'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr>'
    +   '<th style="' + thStyle + '">Categoría</th>'
    +   '<th style="' + thStyle + 'text-align:right;">Movs.</th>'
    +   '<th style="' + thStyle + 'text-align:right;">Total</th>'
    + '</tr></thead><tbody>';

  catRows.forEach(function(cat) {
    var g = catMap[cat];
    html += '<tr>'
      + '<td style="' + tdStyle + '">' + cat + '</td>'
      + '<td style="' + tdR + '">' + g.count + '</td>'
      + '<td style="' + tdR + '">$' + _formatNum(g.total) + '</td>'
      + '</tr>';
  });

  html += '<tr style="font-weight:700;border-top:2px solid var(--border-color);">'
    + '<td style="' + tdStyle + '">TOTAL GASTOS</td>'
    + '<td style="' + tdR + '">' + gastos.length + '</td>'
    + '<td style="' + tdR + 'color:var(--accent-red);">$' + _formatNum(totalGastos) + '</td>'
    + '</tr>';

  if (ingresos.length > 0) {
    html += '<tr style="font-weight:700;">'
      + '<td style="' + tdStyle + 'color:var(--accent-green);">TOTAL INGRESOS</td>'
      + '<td style="' + tdR + 'color:var(--accent-green);">' + ingresos.length + '</td>'
      + '<td style="' + tdR + 'color:var(--accent-green);">$' + _formatNum(totalIngresos) + '</td>'
      + '</tr>';
  }

  html += '</tbody></table></div>';
  html += '</div></div>';

  panel.innerHTML = html;
  panel.style.display = 'block';
  if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar resumen';

  // Resaltar inputs vacíos en la tabla
  document.querySelectorAll('.pdf-desc-input').forEach(function(inp) {
    inp.style.borderColor = inp.value.trim() === '' ? 'var(--accent-red)' : '';
    inp.style.background  = inp.value.trim() === '' ? 'rgba(220,53,69,.08)' : '';
  });
}

function saltarSinDescripcion() {
  var inputs = Array.prototype.slice.call(document.querySelectorAll('.pdf-desc-input'));
  var vacios = inputs.filter(function(inp) { return inp.value.trim() === ''; });
  if (!vacios.length) { showToast('No hay filas sin descripción', 'success'); return; }
  vacios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  vacios[0].focus();
}

// ═══════════════════════════════════════════════════════════════
//  1. INTERFAZ
// ═══════════════════════════════════════════════════════════════

function openPdfImport() {
  var hasDraft = !!localStorage.getItem(PDF_DRAFT_KEY);
  var draftBanner = '';
  if (hasDraft) {
    var d = JSON.parse(localStorage.getItem(PDF_DRAFT_KEY));
    var savedDate = d.savedAt ? new Date(d.savedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : '';
    draftBanner = '<div style="background:var(--bg-secondary);border:1px solid var(--accent-amber);border-radius:8px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'
      + '<i class="fas fa-bookmark" style="color:var(--accent-amber);font-size:18px;"></i>'
      + '<div style="flex:1;">'
      +   '<strong style="color:var(--accent-amber);">Borrador guardado</strong>'
      +   '<span style="font-size:13px;color:var(--text-muted);margin-left:8px;">' + (d.rows ? d.rows.length : 0) + ' movimientos · ' + savedDate + '</span>'
      + '</div>'
      + '<button class="btn btn-primary" onclick="loadPdfDraft()" style="padding:6px 16px;font-size:13px;">'
      +   '<i class="fas fa-play"></i> Continuar borrador'
      + '</button>'
      + '<button class="btn btn-secondary" onclick="discardPdfDraft()" style="padding:6px 14px;font-size:13px;border-color:var(--accent-red);color:var(--accent-red);">'
      +   '<i class="fas fa-trash"></i> Descartar'
      + '</button>'
      + '</div>';
  }

  var html = draftBanner
    + '<p class="pdf-print-hide" style="font-size:15px;color:var(--text-secondary);margin:0 0 12px;">'
    +   'Sube el estado de cuenta en PDF. El banco se detecta automáticamente y los '
    +   'movimientos se clasifican por concepto. Podrás revisar antes de confirmar.'
    + '</p>'
    + '<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<div style="flex:1;">'
    +     '<label class="form-label">Archivo PDF</label>'
    +     '<input type="file" id="pdfFileInput" accept=".pdf" class="form-input"'
    +       ' onchange="handlePdfUpload(event)" style="padding:8px;">'
    +   '</div>'
    +   '<button class="btn btn-secondary" id="pdfCatBtn" onclick="toggleCatalogoPdf()"'
    +     ' style="padding:9px 16px;font-size:14px;white-space:nowrap;">'
    +     '<i class="fas fa-book"></i> Catálogo existente'
    +   '</button>'
    +   '<button class="btn btn-secondary" id="pdfArchBtn" onclick="togglePdfArchivo()"'
    +     ' style="padding:9px 16px;font-size:14px;white-space:nowrap;">'
    +     '<i class="fas fa-folder-open"></i> PDFs archivados'
    +   '</button>'
    + '</div>'
    + '<div id="pdfCatalogoPanel" style="display:none;margin-bottom:16px;"></div>'
    + '<div id="pdfArchivoPanel" style="display:none;margin-bottom:16px;"></div>'
    + '<div id="pdfLoadingIndicator" class="pdf-print-hide" style="display:none;text-align:center;padding:40px;">'
    +   '<i class="fas fa-spinner fa-spin" style="font-size:28px;color:var(--accent-blue);"></i>'
    +   '<p style="margin:12px 0 0;color:var(--text-muted);font-size:15px;">'
    +     'Leyendo y clasificando movimientos del PDF…'
    +   '</p>'
    + '</div>'
    + '<div id="pdfPreviewContainer" style="display:none;margin-top:20px;"></div>';

  openModal('Cargar Estado de Cuenta (PDF)', html, { wide: true });
}

// ═══════════════════════════════════════════════════════════════
//  2. EXTRACCIÓN DE TEXTO
// ═══════════════════════════════════════════════════════════════

function handlePdfUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  _pdfLastFile = null;

  var loading = document.getElementById('pdfLoadingIndicator');
  var preview = document.getElementById('pdfPreviewContainer');
  loading.style.display = 'block';
  preview.style.display = 'none';
  _pdfParsedRows = [];

  var reader = new FileReader();
  reader.onload = function(e) {
    // Copiar el buffer antes de que pdf.js lo consuma
    _pdfLastFile = { buffer: e.target.result.slice(0), nombre: file.name };
    var typedArray = new Uint8Array(e.target.result);
    extractPdfText(typedArray)
      .then(function(text) {
        loading.style.display = 'none';
        var result = parseBankStatement(text);
        if (result.rows.length === 0) {
          _mostrarTextoDebug(preview, result.rawText, result.banco);
          return;
        }
        classifyMovements(result.rows);
        _pdfParsedRows = result.rows;
        // Archivar el PDF en IndexedDB al cargar (independiente del import)
        _archivarPdf(result.banco, result.rows.length, file.name);
        displayPdfPreview(result.banco);
      })
      .catch(function(err) {
        loading.style.display = 'none';
        console.error('PDF error:', err);
        showToast('Error al leer el PDF: ' + err.message, 'error');
      });
  };
  reader.readAsArrayBuffer(file);
}

function extractPdfText(typedArray) {
  return pdfjsLib.getDocument({ data: typedArray }).promise.then(function(pdf) {
    var pageNums = [];
    for (var i = 1; i <= pdf.numPages; i++) pageNums.push(i);

    var allLines = [];

    return pageNums.reduce(function(p, pageNum) {
      return p.then(function() {
        return pdf.getPage(pageNum).then(function(page) {
          return page.getTextContent().then(function(content) {
            if (!content.items.length) return;

            // Agrupar fragmentos por coordenada Y con tolerancia de 2px
            var byY = {};
            content.items.forEach(function(item) {
              if (!item.str) return;
              var bucket = Math.round(item.transform[5] / 2) * 2;
              if (!byY[bucket]) byY[bucket] = [];
              byY[bucket].push({ x: item.transform[4], text: item.str });
            });

            // Ordenar por Y descendente (arriba → abajo en el PDF)
            var ys = Object.keys(byY).map(Number).sort(function(a, b) { return b - a; });
            ys.forEach(function(y) {
              var frags = byY[y].sort(function(a, b) { return a.x - b.x; });
              var line = frags.map(function(f) { return f.text; }).join('\t');
              line = line.replace(/\s+/g, ' ').trim();
              if (line) allLines.push(line);
            });
          });
        });
      });
    }, Promise.resolve()).then(function() {
      return allLines.join('\n');
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  3. PARSERS (funciones puras — no tocan la base de datos)
// ═══════════════════════════════════════════════════════════════

/* ── Helpers compartidos ────────────────────────────────────── */

var _MESES = {
  ene:1,enero:1,jan:1,january:1,
  feb:2,febrero:2,february:2,
  mar:3,marzo:3,march:3,
  abr:4,abril:4,apr:4,april:4,
  may:5,mayo:5,
  jun:6,junio:6,june:6,
  jul:7,julio:7,july:7,
  ago:8,agosto:8,aug:8,august:8,
  sep:9,septiembre:9,sept:9,september:9,
  oct:10,octubre:10,october:10,
  nov:11,noviembre:11,november:11,
  dic:12,diciembre:12,dec:12,december:12
};

function _sinAcentos(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function _pad(n) { return String(n).padStart(2, '0'); }

function _parseMonto(raw) {
  var s = raw.replace(/[^\d.,]/g, '');
  if (!s) return 0;
  var lastDot   = s.lastIndexOf('.');
  var lastComma = s.lastIndexOf(',');
  var norm = (lastComma > lastDot)
    ? s.replace(/\./g, '').replace(',', '.')  // 1.234,56 → 1234.56
    : s.replace(/,/g, '');                     // 1,234.56 → 1234.56
  return Math.abs(parseFloat(norm) || 0);
}

// Convierte fechas en múltiples formatos a ISO YYYY-MM-DD
function _parseFecha(raw, anioFallback, mesCierre) {
  anioFallback = anioFallback || new Date().getFullYear();
  var r;

  // DD/MM/YYYY  o  DD-MM-YYYY
  r = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (r) {
    var y = parseInt(r[3]); if (y < 100) y += 2000;
    return y + '-' + _pad(parseInt(r[2])) + '-' + _pad(parseInt(r[1]));
  }

  // DD/MM  (sin año — estado de TC Banorte/BBVA)
  r = raw.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (r) {
    var mes = parseInt(r[2]);
    var anio = anioFallback;
    // Cruce de año: si mes de la tx > mes de cierre, pertenece al año anterior
    if (mesCierre && mes > mesCierre) anio = anioFallback - 1;
    return anio + '-' + _pad(mes) + '-' + _pad(parseInt(r[1]));
  }

  // DD-MMM-YYYY  o  DD MMM YYYY  (05 ENE 2026)
  r = raw.match(/(\d{1,2})[\s\-\/]([A-Za-záéíóúÁÉÍÓÚ]{3,})[\s\-\/](\d{2,4})/);
  if (r) {
    var mKey = _sinAcentos(r[2].toLowerCase()).substring(0, 3);
    var mNum = _MESES[mKey];
    if (mNum) {
      var yr = parseInt(r[3]); if (yr < 100) yr += 2000;
      return yr + '-' + _pad(mNum) + '-' + _pad(parseInt(r[1]));
    }
  }

  // DD MMM  (sin año)
  r = raw.match(/^(\d{1,2})\s+([A-Za-záéíóúÁÉÍÓÚ]{3,})$/);
  if (r) {
    var mKey2 = _sinAcentos(r[2].toLowerCase()).substring(0, 3);
    var mNum2 = _MESES[mKey2];
    if (mNum2) {
      var anio2 = anioFallback;
      if (mesCierre && mNum2 > mesCierre) anio2 = anioFallback - 1;
      return anio2 + '-' + _pad(mNum2) + '-' + _pad(parseInt(r[1]));
    }
  }

  return null;
}

function _esPago(desc) {
  var n = _sinAcentos(desc.toLowerCase());
  return /\b(pago|gracias por su pago|payment|credito aplicado|abono|bonificacion|devolucion|reembolso)\b/.test(n);
}

/* ── Selector de parser ─────────────────────────────────────── */

function parseBankStatement(text) {
  console.group('PDF Import — texto crudo');
  console.log(text);
  console.groupEnd();

  var lines = text.split('\n');
  var rows = [];

  if (/BANORTE|BANCO MERCANTIL DEL NORTE/i.test(text)) {
    rows = parseBanorte(lines, text);
    if (rows.length > 0) console.log('Banorte:', rows.length, 'movimientos');
  }

  if (!rows.length && /BBVA|BANCOMER/i.test(text)) {
    rows = parseBBVA(lines, text);
    if (rows.length > 0) console.log('BBVA:', rows.length, 'movimientos');
  }

  if (!rows.length) {
    rows = parseGeneric(lines);
    if (rows.length > 0) console.log('Genérico:', rows.length, 'movimientos');
  }

  return { rows: rows, rawText: text, banco: _detectBanco(text) };
}

function _detectBanco(text) {
  if (/BANORTE|BANCO MERCANTIL DEL NORTE/i.test(text)) return 'Banorte';
  if (/BBVA|BANCOMER/i.test(text)) return 'BBVA';
  return 'Banco desconocido';
}

/* ── Parser Banorte ─────────────────────────────────────────────────────────
   Detecta automáticamente el sub-formato:
   • TC  (Tarjeta de Crédito): fechas "DD-MMM-YYYY", monto "+$X" o "-$X"
   • CHQ (Chequera / web):     fechas "DD/Mmm/YYYY", cargos "$-X", abonos "$X"
   ─────────────────────────────────────────────────────────────────────────── */
function parseBanorte(lines, fullText) {
  // Detectar sub-formato por el patrón de fecha dominante
  var tcDateRe  = /\b\d{2}-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)-\d{4}\b/i;
  var chqDateRe = /\b\d{2}\/(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\/\d{4}\b/i;

  if (tcDateRe.test(fullText))  { _pdfTipoEC = 'tc';       return parseBanorteTC(lines, fullText); }
  if (chqDateRe.test(fullText)) { _pdfTipoEC = 'chequera'; return parseBanorteChequera(lines, fullText); }

  var tcRows  = parseBanorteTC(lines, fullText);
  var chqRows = parseBanorteChequera(lines, fullText);
  if (tcRows.length >= chqRows.length) { _pdfTipoEC = 'tc';       return tcRows; }
  else                                  { _pdfTipoEC = 'chequera'; return chqRows; }
}

/* ── Banorte Tarjeta de Crédito ─────────────────────────────────────────────
   El PDF tiene DOS tipos de secciones:
   1. "COMPRAS Y CARGOS DIFERIDOS A MESES SIN INTERESES"
      → IGNORAR: son datos del plan a meses (monto original, saldo pendiente…)
        El cargo mensual real ya aparece en la sección 2.
   2. "CARGOS, ABONOS Y COMPRAS REGULARES (NO A MESES)"
      → PARSEAR: cargos del periodo + mensualidades de compras a meses.

   Formatos de monto en sección 2:
   A)  "+$1,050.00"       — un solo monto con signo
   B)  "$ 5,005.29  +$47,243.00" — cargo sin signo + saldo firmado al final
   Regla: tomar siempre el PRIMER monto; el último con '+' es saldo (ignorar).
   Pagos: "-$X" o descripción con palabras clave de pago → tipo ingreso.
   ─────────────────────────────────────────────────────────────────────────── */
function parseBanorteTC(lines, fullText) {
  var rows = [];

  // Fecha TC al inicio de línea: DD-MMM-YYYY
  var dateRe    = /^(\d{2})-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/i;
  // Cualquier fecha DD-MMM-YYYY en cualquier posición (para limpiar descripción)
  var anyDateRe = /\d{2}-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}/ig;
  // Cualquier monto monetario con o sin signo: +$X  -$X  $X  $ X
  var anyAmtRe  = /([+\-]?)\s*\$\s*([\d,]+\.\d{2})/g;
  // Línea de tipo de cambio USD → ignorar fila anterior
  var usdRe     = /\d{2}\/\d{2}\/\d{2}\s+[\d,.]+\s+USD\s+RT\s+[\d.]+/i;
  // Detectores de sección
  var aMesesRe    = /COMPRAS Y CARGOS DIFERIDOS A MESES/i;
  var regularesRe = /CARGOS.*ABONOS.*COMPRAS REGULARES.*NO A MESES/i;

  var inAMeses = false;   // arranca ignorando hasta encontrar REGULARES

  for (var i = 0; i < lines.length; i++) {
    var raw  = lines[i];
    var line = raw.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // ── Control de sección ───────────────────────────────────────────────
    if (aMesesRe.test(line))    { inAMeses = true;  continue; }
    if (regularesRe.test(line)) { inAMeses = false; continue; }
    if (inAMeses) continue;     // saltar todo lo que esté dentro de A MESES
    // ────────────────────────────────────────────────────────────────────

    var nextLine = i + 1 < lines.length ? lines[i + 1].replace(/\t/g, ' ') : '';
    if (usdRe.test(nextLine)) { i++; }  // saltar solo la línea informativa de tipo de cambio; el cargo es válido en MXN

    var dm = line.match(dateRe);
    if (!dm) continue;

    if (/Fecha de (la )?operaci|Fecha de cargo|Descripci/i.test(line)) continue;
    if (/CARGOS,\s*ABONOS|Tarjeta (titular|adicional)|Total (cargos|abonos)/i.test(line)) continue;

    // Extraer TODOS los montos de la línea
    anyAmtRe.lastIndex = 0;
    var amounts = [];
    var m;
    while ((m = anyAmtRe.exec(line)) !== null) {
      amounts.push({ sign: m[1].trim(), value: _parseMonto(m[2]) });
    }
    if (!amounts.length) continue;

    // Determinar monto y tipo:
    // - 1 monto: usar su signo ('-'=ingreso, cualquier otro=gasto)
    // - 2+ montos: el ÚLTIMO es el saldo → tomar el PRIMERO como movimiento
    var monto, tipo;
    var movAmt = (amounts.length === 1) ? amounts[0] : amounts[0];
    monto = movAmt.value;
    tipo  = (movAmt.sign === '-') ? 'ingreso' : 'gasto';

    if (monto < 0.01) continue;

    // Descripción: quitar TODAS las fechas TC y TODOS los montos
    var desc = line
      .replace(anyDateRe, '')
      .replace(/([+\-]?)\s*\$\s*[\d,]+\.\d{2}/g, '')
      .replace(/\s+/g, ' ').trim();
    if (!desc) desc = 'Movimiento';

    // En TC Banorte el signo es definitivo: '-' = abono/pago (ingreso), '+' o sin signo = cargo (gasto).
    // No usar _esPago() aquí — genera falsos positivos con comercios como "MERCADO PAGO".

    var mesNum = _MESES[dm[2].toLowerCase().substring(0, 3)];
    if (!mesNum) continue;
    var fecha = dm[3] + '-' + _pad(mesNum) + '-' + dm[1];

    rows.push({ fecha: fecha, descripcion: desc, monto: monto, tipo: tipo,
                categoria_id: null, categoria_nombre: '', selected: false });
  }
  return rows;
}

/* ── Banorte Chequera (estado web impreso a PDF) ─────────────────────────────
   Formato por fila:
     "12/Ago/2026  [descripción]  $-900.00  [vacío]  $50,347.94"
     "12/Ago/2026  [descripción]  [vacío]   $255,000.00  $311,051.77"
   La descripción puede continuar en líneas siguientes (sin fecha).
   Columnas: Fecha | Concepto | Cargos ($-) | Abonos ($+) | Saldo
   ─────────────────────────────────────────────────────────────────────────── */
function parseBanorteChequera(lines, fullText) {
  var rows = [];
  // DD/Mmm/YYYY  (ej. 12/Ago/2026)
  var dateRe = /^(\d{2})\/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\/(\d{4})/i;

  var current = null;

  function _pushCurrent() {
    if (current && current.monto >= 0.01) rows.push(current);
    current = null;
  }

  for (var i = 0; i < lines.length; i++) {
    var raw  = lines[i];
    var line = raw.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Ignorar totales y encabezados
    if (/^(Total:|Saldo |SALDO |Fecha\s+Concepto|CARGO POR MANEJO)/i.test(line)) {
      _pushCurrent(); continue;
    }

    var dm = line.match(dateRe);
    if (dm) {
      _pushCurrent();

      var mesNum = _MESES[dm[2].toLowerCase().substring(0, 3)];
      if (!mesNum) continue;
      var fecha = dm[3] + '-' + _pad(mesNum) + '-' + dm[1];

      // Extraer todos los montos con signo de la línea
      // Formato posible: "$-900.00"  o  "-$900.00"  o  "$900.00"
      var signed = [];
      var amRe = /([-+]?)\$\s*(-?)\s*([\d,]+\.\d{2})/g;
      var m;
      while ((m = amRe.exec(line)) !== null) {
        var neg = (m[1] === '-' || m[2] === '-');
        var v   = _parseMonto(m[3]);
        signed.push(neg ? -v : v);
      }

      // Descripción: texto entre la fecha y el primer monto
      var firstAmt = line.search(/([-+]?)\$\s*-?\s*[\d,]+\.\d{2}/);
      var afterDate = line.substring(dm[0].length);
      var desc = (firstAmt > dm[0].length
        ? line.substring(dm[0].length, firstAmt)
        : afterDate
      ).replace(/\s+/g, ' ').trim();
      if (!desc) desc = 'Movimiento';

      // Con 2+ montos: el ÚLTIMO es el saldo (ignorar);
      // el PRIMERO es cargo (negativo) o abono (positivo).
      // Con 1 monto: podría ser sólo saldo → necesitamos detectarlo.
      var monto = 0, tipo = 'gasto';

      if (signed.length >= 2) {
        var primero = signed[0];
        if (primero < 0) { monto = Math.abs(primero); tipo = 'gasto';   }
        else             { monto = primero;            tipo = 'ingreso'; }
      } else if (signed.length === 1) {
        // Solo un monto: si la descripción contiene palabras de abono → ingreso
        var v1 = signed[0];
        if (v1 < 0) { monto = Math.abs(v1); tipo = 'gasto'; }
        else {
          // Podría ser saldo o abono; si hay texto de descripción real, es abono
          if (desc.length > 5) { monto = v1; tipo = 'ingreso'; }
          // Si no, probablemente es solo el saldo → skip
        }
      }

      current = { fecha: fecha, descripcion: desc, monto: monto, tipo: tipo,
                  categoria_id: null, categoria_nombre: '', selected: false };

    } else if (current) {
      // Línea de continuación de descripción (referencias, RAS, FAC, etc.)
      // Solo agregarla si no es pura basura numérica/técnica larga
      if (!/^\d{15,}/.test(line)) {   // ignorar líneas de puro número de referencia largo
        var extra = line.replace(/\s+/g, ' ').trim();
        if (extra && current.descripcion.length < 120) {
          current.descripcion = (current.descripcion + ' ' + extra).trim().substring(0, 150);
        }
      }
    }
  }

  _pushCurrent();
  return rows;
}

/* ── Parser BBVA México ─────────────────────────────────────── */
function parseBBVA(lines, fullText) {
  var rows = [];
  var meses = { ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',
                jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12' };

  var yearMatch = fullText.match(/20[2-3]\d/);
  var statementYear = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  var bbvaDateRe = /^(\d{1,2})\/(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)/i;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 5) continue;

    var dateMatch = line.match(bbvaDateRe);
    if (!dateMatch) continue;

    var day  = dateMatch[1].padStart(2, '0');
    var mes  = meses[dateMatch[2].toLowerCase().substring(0, 3)];
    if (!mes) continue;
    var fecha = statementYear + '-' + mes + '-' + day;

    var parts = line.split('\t');
    var amounts = [];
    parts.forEach(function(p) {
      var am = p.trim().match(/^\$?\s*([\d,]+\.\d{2})$/);
      if (am) amounts.push(parseFloat(am[1].replace(/,/g, '')));
    });
    if (!amounts.length) continue;

    var descParts = [];
    parts.forEach(function(p) {
      p = p.trim();
      if (!p) return;
      if (p.match(bbvaDateRe)) return;
      if (p.match(/^\$?\s*[\d,]+\.\d{2}$/)) return;
      descParts.push(p);
    });
    var desc = descParts.join(' ').replace(/\s+/g, ' ').trim() || 'Movimiento bancario';

    var monto = amounts[0];
    var lineUp = line.toUpperCase();
    var tipo = /ABONO|DEPOSITO|PAGO RECIBIDO|NOMINA|DEVOLUCION|SPEI RECIBIDO|DEP /.test(lineUp)
      ? 'ingreso' : 'gasto';

    if (monto < 1) continue;
    rows.push({ fecha: fecha, descripcion: desc, monto: monto, tipo: tipo,
                categoria_id: null, categoria_nombre: '', selected: false });
  }
  return rows;
}

/* ── Parser genérico (fallback) ─────────────────────────────── */
function parseGeneric(lines) {
  var rows = [];
  var dateRe  = /(\d{1,2})[\/\-](\d{1,2}|\w{3})[\/\-](\d{2,4})/;
  var moneyRe = /\$?\s*([\d,]+\.\d{2})/g;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 10) continue;

    var dm = line.match(dateRe);
    if (!dm) continue;

    var amounts = [];
    moneyRe.lastIndex = 0;
    var mm;
    while ((mm = moneyRe.exec(line)) !== null) {
      var v = parseFloat(mm[1].replace(/,/g, ''));
      if (v > 0 && v < 1e8) amounts.push(v);
    }
    if (!amounts.length) continue;

    var fecha = _parseFecha(dm[0]);
    if (!fecha) continue;

    var dateEnd = line.indexOf(dm[0]) + dm[0].length;
    var firstAmt = line.match(/\$?\s*[\d,]+\.\d{2}/);
    var amtStart = firstAmt ? line.indexOf(firstAmt[0]) : line.length;
    var desc = line.substring(dateEnd, amtStart).replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 2) desc = 'Movimiento bancario';

    var monto = amounts[0];
    var lineUp = line.toUpperCase();
    var tipo = /ABONO|DEPOSITO|NOMINA|PAGO RECIBIDO|DEVOLUCION|SPEI RECIBIDO/.test(lineUp)
      ? 'ingreso' : 'gasto';

    if (monto < 1) continue;
    rows.push({ fecha: fecha, descripcion: desc, monto: monto, tipo: tipo,
                categoria_id: null, categoria_nombre: '', selected: false });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════
//  4. CLASIFICACIÓN
// ═══════════════════════════════════════════════════════════════

/* Extrae una clave de comercio: primeras 2-3 palabras significativas */
function _merchantKey(desc) {
  var STOP = { de:1,la:1,el:1,en:1,mx:1,sa:1,cv:1,sn:1,sp:1,los:1,las:1,
               del:1,por:1,con:1,sin:1,una:1,para:1,vta:1,com:1 };
  var s = _sinAcentos(desc).toLowerCase().replace(/[^a-z\s]/g, ' ');
  var words = s.split(/\s+/).filter(function(w) { return w.length >= 3 && !STOP[w]; });
  return words.slice(0, 3).join(' ');
}

/* Construye mapa merchantKey → {categoria_id, categoria_nombre} desde movimientos existentes */
function _buildHistoricalMap() {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var categorias  = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catById = {};
  categorias.forEach(function(c) { catById[c.id] = c; });

  var map = {};
  movimientos.forEach(function(m) {
    if (!m.categoria_id || m.tipo !== 'gasto' || !m.descripcion) return;
    var key = _merchantKey(m.descripcion);
    if (!key || key.split(' ').length < 2) return;
    if (!map[key]) {
      var cat = catById[m.categoria_id];
      map[key] = { categoria_id: m.categoria_id, categoria_nombre: cat ? cat.nombre : '',
                   descripcion: m.descripcion, count: 0 };
    }
    map[key].count++;
  });
  return map;
}

function classifyMovements(rows) {
  var categorias  = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catByNombre = {};
  categorias.forEach(function(c) { catByNombre[c.nombre.toLowerCase()] = c; });

  var histMap = _buildHistoricalMap();

  rows.forEach(function(row) {
    if (row.tipo === 'ingreso') { row.categoria_nombre = '—'; row.categoria_source = null; return; }

    // 1. Historial (máxima prioridad)
    var hKey = _merchantKey(row.descripcion);
    if (hKey && histMap[hKey]) {
      var h = histMap[hKey];
      row.categoria_id       = h.categoria_id;
      row.categoria_nombre   = h.categoria_nombre;
      row.categoria_source   = 'historial';
      row.descripcion_final  = h.descripcion;  // descripción limpia del historial
      return;
    }

    // 2. Reglas por palabras clave
    var desc    = _sinAcentos(row.descripcion.toLowerCase());
    var matched = false;
    for (var r = 0; r < PDF_CLASSIFICATION_RULES.length; r++) {
      var rule = PDF_CLASSIFICATION_RULES[r];
      for (var k = 0; k < rule.keywords.length; k++) {
        if (desc.indexOf(rule.keywords[k]) >= 0) {
          var cat = catByNombre[rule.categoria.toLowerCase()];
          if (cat) { row.categoria_id = cat.id; row.categoria_nombre = cat.nombre; }
          else      { row.categoria_nombre = rule.categoria; }
          row.categoria_source = 'regla';
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      var otros = catByNombre['otros'];
      if (otros) { row.categoria_id = otros.id; row.categoria_nombre = otros.nombre; }
      else        { row.categoria_nombre = 'Sin clasificar'; }
      row.categoria_source = 'default';
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  5. PREVIEW Y CONFIRMACIÓN

/* Construye el datalist de descripciones y el mapa desc→categoría */
function _buildDescList() {
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var categorias  = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catById = {};
  categorias.forEach(function(c) { catById[c.id] = c; });

  var seen = {};
  _pdfDescCatMap = {};

  // Ordenar del más reciente al más antiguo para que la categoría más reciente gane
  var sorted = movimientos.slice().sort(function(a, b) {
    return (b.fecha || '').localeCompare(a.fecha || '');
  });

  sorted.forEach(function(m) {
    if (!m.descripcion || m.tipo !== 'gasto' || m.transferencia_id) return;
    if (m.notas && m.notas.indexOf('Prestamo ID:') >= 0) return;
    var key = m.descripcion.trim();
    if (!key || seen[key]) return;
    seen[key] = true;
    _pdfDescCatMap[key] = {
      categoria_id:     m.categoria_id || null,
      categoria_nombre: (m.categoria_id && catById[m.categoria_id]) ? catById[m.categoria_id].nombre : ''
    };
  });

  _pdfDescList = Object.keys(seen).sort(function(a, b) { return a.localeCompare(b); });
}
// ═══════════════════════════════════════════════════════════════

function togglePdfExclIngr() {
  _pdfExcluirIngresos = !_pdfExcluirIngresos;
  displayPdfPreview();
}

function displayPdfPreview(banco) {
  if (banco) {
    _pdfBanco = banco;
    _pdfExcluirIngresos = (_pdfTipoEC === 'tc'); // TC: excluir ingresos por defecto
  }
  banco = _pdfBanco;
  document.getElementById('modalOverlay').dataset.guardClose = '1';
  var container = document.getElementById('pdfPreviewContainer');
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var rows = _pdfParsedRows;
  _buildDescList();

  var gastos   = rows.filter(function(r) { return r.tipo === 'gasto'; });
  var ingresos = rows.filter(function(r) { return r.tipo === 'ingreso'; });
  var totalGastos   = gastos.reduce(function(s, r) { return s + r.monto; }, 0);
  var totalIngresos = ingresos.reduce(function(s, r) { return s + r.monto; }, 0);
  var neto = totalIngresos - totalGastos;
  var netoColor = neto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  var nHist    = gastos.filter(function(r) { return r.categoria_source === 'historial'; }).length;
  var nRegla   = gastos.filter(function(r) { return r.categoria_source === 'regla'; }).length;
  var nRevisar = gastos.filter(function(r) { return r.categoria_source === 'default'; }).length;

  // Datalist con todas las descripciones del historial
  var datalistHtml = '<datalist id="pdfDescOptions">';
  _pdfDescList.forEach(function(d) {
    datalistHtml += '<option value="' + d.replace(/"/g, '&quot;') + '">';
  });
  datalistHtml += '</datalist>';

  var html = datalistHtml
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">'
    +   '<span class="badge badge-blue" style="font-size:15px;">'
    +     '<i class="fas fa-university"></i> ' + (banco || '') + (_pdfTipoEC === 'tc' ? ' TC' : _pdfTipoEC === 'chequera' ? ' CHQ' : '') + ' — ' + rows.length + ' movimientos'
    +   '</span>'
    +   '<span class="badge badge-red" style="font-size:15px;">' + gastos.length + ' gastos</span>'
    +   (ingresos.length > 0
    +     ? '<span class="badge pdf-print-hide" onclick="togglePdfExclIngr()" title="' + (_pdfExcluirIngresos ? 'Click para incluir ingresos' : 'Click para excluir ingresos del EC') + '"'
    +       + ' style="font-size:15px;cursor:pointer;user-select:none;'
    +       + (_pdfExcluirIngresos
    +           ? 'background:var(--bg-secondary);color:var(--text-muted);border:1px dashed var(--border-color);'
    +           : 'background:var(--accent-green-soft,rgba(25,135,84,.15));color:var(--accent-green);')
    +       + '">'
    +       + '<i class="fas fa-' + (_pdfExcluirIngresos ? 'eye-slash' : 'eye') + '" style="margin-right:4px;"></i>'
    +       + ingresos.length + (_pdfExcluirIngresos ? ' ingresos excluidos' : ' ingresos — click para excluir')
    +       + '</span>'
    +     : '')
    +   '<span class="pdf-print-hide" style="font-size:13px;color:var(--text-muted);display:flex;gap:10px;align-items:center;">'
    +     '<i class="fas fa-history" style="color:var(--accent-green);"></i> ' + nHist + ' historial&ensp;'
    +     '<i class="fas fa-tag" style="color:var(--accent-blue);"></i> ' + nRegla + ' regla&ensp;'
    +     (nRevisar > 0
        ? '<i class="fas fa-exclamation-circle" style="color:var(--accent-amber);"></i> <strong style="color:var(--accent-amber);">' + nRevisar + ' revisar</strong>'
        : '<i class="fas fa-check-circle" style="color:var(--accent-green);"></i> <span style="color:var(--accent-green);">todos clasificados</span>')
    +   '</span>'
    +   '<button class="btn btn-secondary pdf-print-hide" onclick="togglePdfVerification()"'
    +     ' id="pdfVerBtn" style="font-size:14px;padding:4px 12px;">'
    +     '<i class="fas fa-list-ul"></i> Ver resumen'
    +   '</button>'
    +   '<button class="btn btn-secondary pdf-print-hide" onclick="removePdfSelectedRows()"'
    +     ' style="font-size:14px;padding:4px 12px;margin-left:auto;">'
    +     '<i class="fas fa-trash"></i> Eliminar seleccionados'
    +   '</button>'
    + '</div>'
    + '<div id="pdfVerificationPanel" style="display:none;margin-bottom:12px;"></div>'
    + (function() {
        if (_pdfExcluirIngresos && ingresos.length > 0) {
          return '<div class="pdf-print-hide" style="background:rgba(var(--accent-amber-rgb,255,193,7),.08);border:1px solid var(--accent-amber);border-radius:4px;padding:8px 14px;margin-bottom:8px;font-size:13px;">'
            + '<i class="fas fa-info-circle" style="color:var(--accent-amber);margin-right:6px;"></i>'
            + '<strong>' + ingresos.length + ' crédito(s) del estado de TC excluidos</strong>'
            + ' — pagos anteriores y bonificaciones no se importan a la chequera.'
            + (function() {
                var montos = {}; gastos.forEach(function(r){ montos[r.monto] = true; });
                var pares = ingresos.filter(function(r){ return montos[r.monto]; });
                return pares.length > 0
                  ? ' <span style="color:var(--text-muted);">(' + pares.length + ' par(es) cargo+abono mismo monto detectados)</span>'
                  : '';
              }())
            + '</div>';
        }
        var montos = {}; gastos.forEach(function(r){ montos[r.monto] = true; });
        var pares = ingresos.filter(function(r){ return montos[r.monto]; });
        if (pares.length > 0) {
          return '<div class="pdf-print-hide" style="background:rgba(var(--accent-amber-rgb,255,193,7),.08);border:1px solid var(--accent-amber);border-radius:4px;padding:8px 14px;margin-bottom:8px;font-size:13px;">'
            + '<i class="fas fa-exclamation-triangle" style="color:var(--accent-amber);margin-right:6px;"></i>'
            + '<strong>' + pares.length + ' par(es) cargo+abono del mismo monto</strong> — posibles bonificaciones o plazos.'
            + ' <button onclick="togglePdfExclIngr()" class="btn btn-secondary" style="padding:2px 10px;font-size:12px;margin-left:8px;border-color:var(--accent-amber);color:var(--accent-amber);">Excluir ingresos</button>'
            + '</div>';
        }
        return '';
      }())
    // Fila de subtotales
    + '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;'
    +   'background:var(--bg-secondary);border:1px solid var(--border-color);'
    +   'border-radius:var(--radius-sm);padding:10px 16px;margin-bottom:12px;font-size:15px;">'
    +   '<span style="color:var(--text-muted);">Subtotales:</span>'
    +   '<span style="color:var(--accent-red);font-variant-numeric:tabular-nums;">'
    +     '<strong>Gastos</strong> −$' + _formatNum(totalGastos)
    +   '</span>'
    +   '<span style="color:var(--accent-green);font-variant-numeric:tabular-nums;">'
    +     '<strong>Ingresos</strong> +$' + _formatNum(totalIngresos)
    +   '</span>'
    +   '<span style="margin-left:auto;font-weight:700;color:' + netoColor + ';font-variant-numeric:tabular-nums;">'
    +     'Neto ' + (neto >= 0 ? '+' : '−') + '$' + _formatNum(Math.abs(neto))
    +   '</span>'
    + '</div>'
    + '<div class="pdf-scroll-container" style="max-height:calc(92vh - 300px);overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);">'
    + '<table class="data-table" style="font-size:16px;table-layout:fixed;width:100%;">'
    + '<thead><tr>'
    +   '<th class="pdf-cb-col" style="width:36px;"><input type="checkbox" onchange="toggleAllPdfRows(this.checked)"></th>'
    +   '<th style="width:120px;" title="Fecha del estado de cuenta (solo referencia)">Fecha EC</th>'
    +   '<th><div style="font-size:11px;font-weight:400;line-height:1.2;">Banco (referencia)</div>'
    +       '<div>Descripción a importar</div></th>'
    +   '<th style="width:160px;text-align:right;">Monto</th>'
    +   '<th style="width:90px;">Tipo</th>'
    +   '<th style="width:240px;">Categoría</th>'
    + '</tr></thead><tbody>';

  rows.forEach(function(row, idx) {
    if (_pdfExcluirIngresos && row.tipo === 'ingreso') return;
    var esGasto   = row.tipo === 'gasto';
    var colorMonto = esGasto ? 'var(--accent-red)' : 'var(--accent-green)';
    var badgeClass = esGasto ? 'badge-red' : 'badge-green';
    var signo      = esGasto ? '−' : '+';

    var catNombre = row.categoria_nombre || (esGasto ? 'Sin categoría' : 'N/A');
    var srcIcon = '';
    if (esGasto) {
      if (row.categoria_source === 'historial') {
        srcIcon = '<i id="pdf-src-' + idx + '" class="fas fa-history pdf-print-hide" title="Del historial de movimientos"'
                + ' style="color:var(--accent-green);font-size:11px;margin-right:4px;flex-shrink:0;"></i>';
      } else if (row.categoria_source === 'regla') {
        srcIcon = '<i id="pdf-src-' + idx + '" class="fas fa-tag pdf-print-hide" title="Por regla automática"'
                + ' style="color:var(--accent-blue);font-size:11px;margin-right:4px;flex-shrink:0;"></i>';
      } else {
        srcIcon = '<i id="pdf-src-' + idx + '" class="fas fa-exclamation-circle pdf-print-hide" title="Sin clasificar — revisa"'
                + ' style="color:var(--accent-amber);font-size:11px;margin-right:4px;flex-shrink:0;"></i>';
      }
    }
    var catSel = '';
    if (esGasto) {
      catSel = '<div style="display:flex;align-items:center;gap:2px;">'
             + srcIcon
             + '<span class="pdf-cat-print" data-idx="' + idx + '" style="display:none;font-size:11px;">' + catNombre + '</span>'
             + '<select class="pdf-cat-select" data-idx="' + idx + '" onchange="updatePdfCategory(' + idx + ',this.value)"'
             + ' style="font-size:15px;flex:1;min-width:0;">';
      catSel += '<option value="">Sin categoría</option>';
      categorias.forEach(function(c) {
        catSel += '<option value="' + c.id + '"' + (c.id === row.categoria_id ? ' selected' : '') + '>'
               + c.nombre + '</option>';
      });
      catSel += '</select></div>';
    } else {
      catSel = '<span class="pdf-cat-print" data-idx="' + idx + '" style="display:none;font-size:11px;">N/A</span>'
             + '<span style="color:var(--text-muted);font-size:14px;">N/A</span>';
    }

    html += '<tr class="pdf-row' + (row.selected ? ' pdf-row-selected' : '') + '">'
      + '<td class="pdf-cb-col"><input type="checkbox" ' + (row.selected ? 'checked' : '') + ' onchange="togglePdfRow(' + idx + ')"></td>'
      + '<td style="font-size:15px;white-space:nowrap;">' + (typeof formatDate === 'function' ? formatDate(row.fecha) : row.fecha) + '</td>'
      + '<td style="padding:4px 8px;">'
      // Descripción del banco — solo referencia, nunca se importa
      +   '<div class="pdf-print-hide" style="font-size:12px;color:var(--text-primary);'
      +     'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;"'
      +     ' title="' + row.descripcion.replace(/"/g,'&quot;') + '">'
      +     row.descripcion
      +   '</div>'
      // Descripción a importar — editable, se pre-llena del historial si hay match
      +   '<span class="pdf-desc-print" style="display:none;font-size:11px;">'
      +     (row.descripcion_final || '').replace(/</g,'&lt;')
      +   '</span>'
      +   '<input type="text" list="pdfDescOptions" class="pdf-desc-input pdf-print-hide" data-idx="' + idx + '"'
      +     ' placeholder="Escribe o elige del historial…"'
      +     ' value="' + (row.descripcion_final || '').replace(/"/g, '&quot;') + '"'
      +     ' oninput="updatePdfDesc(' + idx + ',this.value)" onfocus="this.select()"'
      +     ' style="width:100%;font-size:14px;font-family:inherit;border:1px solid var(--border-subtle);'
      +       'border-radius:4px;padding:3px 7px;background:var(--bg-base);color:var(--text-primary);">'
      + '</td>'
      + '<td style="text-align:right;font-size:16px;font-weight:700;color:' + colorMonto + ';font-variant-numeric:tabular-nums;white-space:nowrap;">'
      +   signo + '$' + _formatNum(row.monto)
      + '</td>'
      + '<td><span class="badge ' + badgeClass + '" style="font-size:13px;">'
      +   (esGasto ? 'Gasto' : 'Ingreso')
      + '</span></td>'
      + '<td>' + catSel + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';

  // Selector de cuenta + botón confirmar
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var cuentaOpts = cuentas
    .filter(function(c) { return c.activa !== false; })
    .map(function(c) {
      return '<option value="' + c.id + '">' + c.nombre + ' (' + c.moneda + ')</option>';
    }).join('');

  html += ''
    + '<div class="pdf-print-hide" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;">'
    +   '<span style="font-size:14px;color:var(--text-muted);flex:1;">'
    +     'Ajusta categorías y elimina duplicados si los hay.'
    +   '</span>'
    +   '<button class="btn btn-secondary" onclick="savePdfDraft()" style="padding:9px 18px;font-size:14px;border-color:var(--accent-amber);color:var(--accent-amber);">'
    +     '<i class="fas fa-bookmark"></i> Guardar borrador'
    +   '</button>'
    +   '<label class="form-label" style="margin:0;white-space:nowrap;font-size:14px;">Fecha pago chequera:</label>'
    +   '<input type="date" id="pdfFechaPagoInput" class="form-input" style="width:160px;font-size:14px;"'
    +     ' value="' + _pdfFechaPago + '"'
    +     ' onchange="_pdfFechaPago=this.value"'
    +     ' title="Fecha en que realizaste el pago de la tarjeta desde la chequera">'
    +   '<label class="form-label" style="margin:0;white-space:nowrap;font-size:14px;">Cuenta de origen:</label>'
    +   '<select id="pdfCuentaSelect" class="form-input" style="min-width:190px;font-size:14px;">'
    +     '<option value="">— Selecciona cuenta origen —</option>'
    +     cuentaOpts
    +   '</select>'
    +   '<button class="btn btn-primary" onclick="confirmPdfImport()" style="padding:9px 22px;">'
    +     '<i class="fas fa-check"></i> Importar ' + (_pdfExcluirIngresos ? gastos.length : rows.length) + ' mov.'
    +   '</button>'
    + '</div>';

  container.innerHTML = html;
  container.style.display = 'block';
}

/* Muestra texto crudo cuando no se detectaron movimientos */
function _mostrarTextoDebug(container, rawText, banco) {
  var primeras = rawText.split('\n').slice(0, 60).join('\n');

  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--accent-amber);border-radius:8px;padding:16px;';

  var titulo = document.createElement('p');
  titulo.style.cssText = 'margin:0 0 10px;font-weight:600;color:var(--accent-amber);';
  titulo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No se detectaron movimientos en este PDF (' + banco + ').';

  var instruc = document.createElement('p');
  instruc.style.cssText = 'margin:0 0 10px;font-size:14px;color:var(--text-secondary);';
  instruc.textContent = 'Copia el texto de abajo y compártelo para ajustar el parser a tu formato exacto:';

  var ta = document.createElement('textarea');
  ta.readOnly = true;
  ta.style.cssText = 'width:100%;height:260px;font-family:monospace;font-size:12px;'
    + 'background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);'
    + 'border-radius:4px;padding:8px;resize:vertical;box-sizing:border-box;';
  ta.value = primeras;  // .value es seguro — no interpreta HTML

  wrap.appendChild(titulo);
  wrap.appendChild(instruc);
  wrap.appendChild(ta);
  container.innerHTML = '';
  container.appendChild(wrap);
  container.style.display = 'block';
}

function _formatNum(n) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ── Interacciones de la tabla ──────────────────────────────── */

function togglePdfRow(idx) {
  _pdfParsedRows[idx].selected = !_pdfParsedRows[idx].selected;
  displayPdfPreview();
}

function toggleAllPdfRows(checked) {
  _pdfParsedRows.forEach(function(r) { r.selected = checked; });
  displayPdfPreview();
}

function updatePdfDesc(idx, value) {
  var v = value.trim();
  _pdfParsedRows[idx].descripcion_final = v;

  // Si la descripción coincide exactamente con el historial → auto-rellenar categoría
  if (v && _pdfDescCatMap[v] && _pdfDescCatMap[v].categoria_id && _pdfParsedRows[idx].tipo === 'gasto') {
    var catInfo = _pdfDescCatMap[v];
    _pdfParsedRows[idx].categoria_id     = catInfo.categoria_id;
    _pdfParsedRows[idx].categoria_nombre = catInfo.categoria_nombre;
    _pdfParsedRows[idx].categoria_source = 'historial';

    // Actualizar el select en el DOM
    var sel = document.querySelector('select.pdf-cat-select[data-idx="' + idx + '"]');
    if (sel) sel.value = catInfo.categoria_id;

    // Actualizar texto de impresión
    var catSpan = document.querySelector('.pdf-cat-print[data-idx="' + idx + '"]');
    if (catSpan) catSpan.textContent = catInfo.categoria_nombre || 'Sin categoría';

    // Actualizar ícono de fuente a "historial"
    var icon = document.getElementById('pdf-src-' + idx);
    if (icon) {
      icon.className = 'fas fa-history pdf-print-hide';
      icon.title = 'Del historial de movimientos';
      icon.style.color = 'var(--accent-green)';
    }
  }
}

function updatePdfCategory(idx, catId) {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var cat = categorias.find(function(c) { return c.id === catId; });
  _pdfParsedRows[idx].categoria_id     = catId;
  _pdfParsedRows[idx].categoria_nombre = cat ? cat.nombre : '';
  var span = document.querySelector('.pdf-cat-print[data-idx="' + idx + '"]');
  if (span) span.textContent = cat ? cat.nombre : 'Sin categoría';
}

function removePdfSelectedRows() {
  var n = _pdfParsedRows.filter(function(r) { return r.selected; }).length;
  if (!n) { showToast('Selecciona las filas que deseas eliminar', 'warning'); return; }
  if (!confirm('Eliminar ' + n + ' fila(s)?')) return;
  _pdfParsedRows = _pdfParsedRows.filter(function(r) { return !r.selected; });
  displayPdfPreview();
  showToast(n + ' fila(s) eliminada(s)');
}

/* ── Confirmar importación ──────────────────────────────────── */

function confirmPdfImport() {
  if (!_pdfParsedRows.length) { showToast('No hay movimientos para importar', 'warning'); return; }

  var fechaInp = document.getElementById('pdfFechaPagoInput');
  if (fechaInp) _pdfFechaPago = fechaInp.value;
  if (!_pdfFechaPago) {
    showToast('Ingresa la fecha de pago en chequera antes de importar', 'warning');
    if (fechaInp) fechaInp.focus();
    return;
  }

  var sel = document.getElementById('pdfCuentaSelect');
  var cuentaId = sel ? sel.value : '';
  if (!cuentaId) {
    showToast('Selecciona la cuenta de origen antes de importar', 'warning');
    if (sel) sel.focus();
    return;
  }

  var cuentas    = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) { showToast('Cuenta no encontrada', 'error'); return; }

  var toImport = _pdfExcluirIngresos
    ? _pdfParsedRows.filter(function(r){ return r.tipo !== 'ingreso'; })
    : _pdfParsedRows;

  if (!confirm('Se importarán ' + toImport.length + ' movimientos a "' + cuenta.nombre + '". ¿Continuar?')) return;

  toImport.forEach(function(row) {
    movimientos.push({
      id: uuid(),
      cuenta_id: cuentaId,
      tipo: row.tipo,
      monto: row.monto,
      moneda: cuenta.moneda || 'MXN',
      categoria_id: row.tipo === 'gasto' ? (row.categoria_id || null) : null,
      descripcion: row.descripcion_final || row.descripcion,
      fecha: _pdfFechaPago,
      notas: 'Importado desde PDF',
      created: new Date().toISOString()
    });
  });

  // No se modifica cuenta.saldo: _calcSaldoReal lo recalcula automáticamente.
  saveData(STORAGE_KEYS.movimientos, movimientos);

  var total = toImport.length;
  _pdfParsedRows = [];
  _pdfLastFile   = null;
  localStorage.removeItem(PDF_DRAFT_KEY);
  document.getElementById('modalOverlay').dataset.guardClose = '';
  closeModal();
  showToast(total + ' movimientos importados exitosamente desde PDF', 'success');

  if (typeof renderMovimientos === 'function') renderMovimientos();
  if (typeof updateHeaderPatrimonio === 'function') updateHeaderPatrimonio();
}
