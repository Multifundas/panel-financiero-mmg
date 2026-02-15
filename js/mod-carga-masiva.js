/* ============================================================
   MODULO CARGA MASIVA  -  Bulk import from Excel (.xlsx)
   ============================================================ */

/* -------------------------------------------------------
   1. openCargaMasiva()
   Opens a large modal with instructions, template download,
   file upload area, preview table, error summary, and
   import action button.
   ------------------------------------------------------- */
function openCargaMasiva() {
  var html =
    '<div style="margin-bottom:20px;">' +
      '<p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:16px;">' +
        'Importa multiples movimientos desde un archivo Excel (.xlsx). ' +
        'Descarga la plantilla, completala con tus datos y subela para validar e importar los movimientos de forma masiva.' +
      '</p>' +
      '<button class="btn btn-secondary" onclick="descargarPlantilla()">' +
        '<i class="fas fa-download" style="margin-right:6px;"></i>Descargar Plantilla Excel' +
      '</button>' +
    '</div>' +

    '<label for="bulkFileInput" style="display:block;border:2px dashed var(--border-color);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:border-color 0.2s;margin-bottom:20px;"' +
         ' ondragover="event.preventDefault();this.style.borderColor=\'var(--accent-blue)\'"' +
         ' ondragleave="this.style.borderColor=\'var(--border-color)\'"' +
         ' ondrop="event.preventDefault();this.style.borderColor=\'var(--border-color)\';handleFileUpload({target:{files:event.dataTransfer.files}})">' +
      '<i class="fas fa-file-excel" style="font-size:36px;color:var(--accent-green);display:block;margin-bottom:12px;"></i>' +
      '<p style="color:var(--text-primary);font-size:15px;font-weight:600;margin-bottom:6px;">Arrastra tu archivo Excel aqui</p>' +
      '<p style="color:var(--text-muted);font-size:13px;">o haz clic para seleccionar un archivo .xlsx</p>' +
      '<input type="file" id="bulkFileInput" accept=".xlsx,.xls,.csv" style="display:none;" onchange="handleFileUpload(event)">' +
    '</label>' +

    '<div id="bulkErrors" style="display:none;margin-bottom:16px;padding:12px 16px;border-radius:8px;background:var(--accent-red-soft);border:1px solid var(--accent-red);"></div>' +

    '<div id="bulkPreview" style="display:none;margin-bottom:16px;max-height:400px;overflow:auto;"></div>' +

    '<div id="bulkActions" style="display:none;text-align:right;">' +
      '<button class="btn btn-primary" onclick="ejecutarImportacion()">' +
        '<i class="fas fa-file-import" style="margin-right:6px;"></i>Importar Movimientos' +
      '</button>' +
    '</div>';

  openModal('Carga Masiva de Movimientos', html);

  // Expand modal width for better table readability
  document.getElementById('modalContent').style.maxWidth = '800px';
}

/* -------------------------------------------------------
   2. descargarPlantilla()
   Creates and downloads an Excel template with two sheets:
   - "Movimientos": column headers + 2 example rows
   - "Referencia": valid cuentas, categorias, tipos, monedas
   ------------------------------------------------------- */
function descargarPlantilla() {
  if (typeof XLSX === 'undefined') {
    showToast('La libreria SheetJS (XLSX) no esta cargada.', 'error');
    return;
  }

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });

  // ---- Sheet 1: Movimientos (headers + 2 example rows) ----
  var movHeaders = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Cuenta', 'Categoria', 'Descripcion', 'Notas'];
  var ejemploCuenta = cuentasActivas.length > 0 ? cuentasActivas[0].nombre : 'Mi Cuenta';
  var ejemploCategoria = categorias.length > 0 ? categorias[0].nombre : 'Otros';

  var movData = [
    movHeaders,
    ['2025-01-15', 'gasto', 1500, 'MXN', ejemploCuenta, ejemploCategoria, 'Ejemplo de gasto', 'Nota opcional'],
    ['2025-01-20', 'ingreso', 25000, 'MXN', ejemploCuenta, '', 'Ejemplo de ingreso', ''],
  ];
  var wsMovimientos = XLSX.utils.aoa_to_sheet(movData);

  // ---- Sheet 2: Referencia ----
  var maxRows = Math.max(cuentasActivas.length, categorias.length, 3, 3);
  var refData = [['Cuentas Validas', 'Categorias Validas', 'Tipos Validos', 'Monedas Validas']];
  for (var i = 0; i < maxRows; i++) {
    refData.push([
      i < cuentasActivas.length ? cuentasActivas[i].nombre : '',
      i < categorias.length ? categorias[i].nombre : '',
      i === 0 ? 'ingreso' : (i === 1 ? 'gasto' : ''),
      i === 0 ? 'MXN' : (i === 1 ? 'USD' : (i === 2 ? 'EUR' : '')),
    ]);
  }
  var wsReferencia = XLSX.utils.aoa_to_sheet(refData);

  // ---- Build workbook and download ----
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');
  XLSX.utils.book_append_sheet(wb, wsReferencia, 'Referencia');

  XLSX.writeFile(wb, 'plantilla_movimientos.xlsx');
  showToast('Plantilla descargada exitosamente.');
}

/* -------------------------------------------------------
   3. handleFileUpload(event)
   Reads an uploaded .xlsx file, parses it with SheetJS,
   maps columns, validates rows, and displays a preview.
   ------------------------------------------------------- */
function handleFileUpload(event) {
  var files = event.target.files;
  if (!files || files.length === 0) return;
  var file = files[0];

  if (typeof XLSX === 'undefined') {
    showToast('La libreria SheetJS (XLSX) no esta cargada.', 'error');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var firstSheetName = workbook.SheetNames[0];
      var sheet = workbook.Sheets[firstSheetName];
      var jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonRows.length === 0) {
        showToast('El archivo no contiene datos.', 'warning');
        return;
      }

      // Map column names (case-flexible) to internal keys
      var mapped = jsonRows.map(function(row) {
        return {
          fecha:       row['Fecha']       || row['fecha']       || '',
          tipo:        row['Tipo']        || row['tipo']        || '',
          monto:       row['Monto']       || row['monto']       || '',
          moneda:      row['Moneda']      || row['moneda']      || '',
          cuenta:      row['Cuenta']      || row['cuenta']      || '',
          categoria:   row['Categoria']   || row['categoria']   || '',
          descripcion: row['Descripcion'] || row['descripcion'] || '',
          notas:       row['Notas']       || row['notas']       || '',
        };
      });

      var result = validateBulkData(mapped);
      displayPreview(result);
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* -------------------------------------------------------
   4. validateBulkData(rows)
   Validates each parsed row against stored cuentas and
   categorias. Returns { valid, invalid, errors }.
   ------------------------------------------------------- */
function validateBulkData(rows) {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];

  // Build case-insensitive lookup maps (nombre -> id)
  var cuentaLookup = {};
  cuentas.forEach(function(c) {
    if (c.activa !== false) {
      cuentaLookup[c.nombre.toLowerCase().trim()] = c.id;
    }
  });

  var catLookup = {};
  categorias.forEach(function(c) {
    catLookup[c.nombre.toLowerCase().trim()] = c.id;
  });

  var valid = [];
  var invalid = [];
  var errors = [];

  rows.forEach(function(row, idx) {
    var rowNum = idx + 2; // +2 because row 1 is the header in the spreadsheet
    var rowErrors = [];

    // -- Validate Fecha --
    var fechaStr = String(row.fecha).trim();
    var fechaValid = false;
    if (fechaStr) {
      var parsedDate = new Date(fechaStr);
      if (!isNaN(parsedDate.getTime())) {
        fechaValid = true;
        // Normalise to ISO date string YYYY-MM-DD
        fechaStr = parsedDate.toISOString().split('T')[0];
      }
    }
    if (!fechaValid) {
      rowErrors.push('Fila ' + rowNum + ': Fecha invalida o vacia');
    }

    // -- Validate Tipo --
    var tipo = String(row.tipo).toLowerCase().trim();
    if (tipo !== 'ingreso' && tipo !== 'gasto') {
      rowErrors.push('Fila ' + rowNum + ': Tipo debe ser "ingreso" o "gasto"');
    }

    // -- Validate Monto --
    var monto = parseFloat(row.monto);
    if (isNaN(monto) || monto <= 0) {
      rowErrors.push('Fila ' + rowNum + ': Monto debe ser un numero mayor a 0');
    }

    // -- Validate Moneda --
    var moneda = String(row.moneda || 'MXN').toUpperCase().trim();
    if (moneda !== 'MXN' && moneda !== 'USD' && moneda !== 'EUR') {
      rowErrors.push('Fila ' + rowNum + ': Moneda debe ser MXN, USD o EUR');
    }
    if (!row.moneda || String(row.moneda).trim() === '') {
      moneda = 'MXN';
    }

    // -- Validate Cuenta --
    var cuentaNombre = String(row.cuenta).toLowerCase().trim();
    var cuenta_id = cuentaLookup[cuentaNombre] || null;
    if (!cuenta_id) {
      rowErrors.push('Fila ' + rowNum + ': Cuenta "' + row.cuenta + '" no encontrada');
    }

    // -- Validate Categoria (required for gastos, optional for ingresos) --
    var categoria_id = null;
    var catNombre = String(row.categoria || '').toLowerCase().trim();
    if (tipo === 'gasto' && catNombre) {
      categoria_id = catLookup[catNombre] || null;
      if (!categoria_id) {
        rowErrors.push('Fila ' + rowNum + ': Categoria "' + row.categoria + '" no encontrada');
      }
    }

    // -- Validate Descripcion --
    var descripcion = String(row.descripcion || '').trim();
    if (!descripcion) {
      rowErrors.push('Fila ' + rowNum + ': Descripcion es requerida');
    }

    // -- Classify row --
    if (rowErrors.length > 0) {
      invalid.push({
        rowNum: rowNum,
        original: row,
        errors: rowErrors,
      });
      errors = errors.concat(rowErrors);
    } else {
      valid.push({
        rowNum: rowNum,
        fecha: fechaStr,
        tipo: tipo,
        monto: monto,
        moneda: moneda,
        cuenta_id: cuenta_id,
        cuenta_nombre: row.cuenta,
        categoria_id: categoria_id,
        categoria_nombre: row.categoria || '',
        descripcion: descripcion,
        notas: String(row.notas || '').trim(),
      });
    }
  });

  return { valid: valid, invalid: invalid, errors: errors };
}

/* -------------------------------------------------------
   5. displayPreview(result)
   Renders a preview table inside the modal showing all
   parsed rows with a status indicator. Invalid rows are
   highlighted in red. Updates the import button label
   with the count of valid rows and stores them in
   window._bulkValidRows.
   ------------------------------------------------------- */
function displayPreview(result) {
  var previewEl = document.getElementById('bulkPreview');
  var errorEl = document.getElementById('bulkErrors');
  var actionsEl = document.getElementById('bulkActions');
  if (!previewEl || !errorEl || !actionsEl) return;

  // Store validated rows globally for import
  window._bulkValidRows = result.valid;

  // ---- Error summary ----
  if (result.invalid.length > 0) {
    errorEl.style.display = 'block';
    errorEl.innerHTML =
      '<div style="font-weight:600;color:var(--accent-red);margin-bottom:6px;">' +
        '<i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>' +
        result.invalid.length + ' fila(s) con errores' +
      '</div>' +
      '<ul style="margin:0;padding-left:20px;font-size:13px;color:var(--text-secondary);">' +
        result.errors.map(function(e) { return '<li>' + e + '</li>'; }).join('') +
      '</ul>';
  } else {
    errorEl.style.display = 'none';
  }

  // ---- Combine and sort all rows by their spreadsheet row number ----
  var allRows = [];

  result.valid.forEach(function(r) {
    allRows.push({ rowNum: r.rowNum, data: r, isValid: true });
  });
  result.invalid.forEach(function(r) {
    allRows.push({ rowNum: r.rowNum, data: r.original, isValid: false, errors: r.errors });
  });

  allRows.sort(function(a, b) { return a.rowNum - b.rowNum; });

  // ---- Build preview table ----
  var tableHTML =
    '<table class="data-table" style="font-size:13px;">' +
      '<thead>' +
        '<tr>' +
          '<th style="width:36px;">#</th>' +
          '<th>Fecha</th>' +
          '<th>Tipo</th>' +
          '<th style="text-align:right;">Monto</th>' +
          '<th>Moneda</th>' +
          '<th>Cuenta</th>' +
          '<th>Categoria</th>' +
          '<th>Descripcion</th>' +
          '<th style="text-align:center;">Estado</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  allRows.forEach(function(row) {
    var bgStyle = row.isValid ? '' : 'background:rgba(239,68,68,0.08);';
    var statusIcon = row.isValid
      ? '<i class="fas fa-check-circle" style="color:var(--accent-green);" title="Valido"></i>'
      : '<i class="fas fa-times-circle" style="color:var(--accent-red);" title="' +
          (row.errors ? row.errors.join('; ').replace(/"/g, '&quot;') : '') + '"></i>';

    var d = row.data;

    tableHTML +=
      '<tr style="' + bgStyle + '">' +
        '<td>' + row.rowNum + '</td>' +
        '<td>' + (d.fecha || '') + '</td>' +
        '<td>' + (d.tipo || '') + '</td>' +
        '<td style="text-align:right;">' + (d.monto !== undefined && d.monto !== '' ? d.monto : '') + '</td>' +
        '<td>' + (d.moneda || '') + '</td>' +
        '<td>' + (d.cuenta_nombre || d.cuenta || '') + '</td>' +
        '<td>' + (d.categoria_nombre || d.categoria || '') + '</td>' +
        '<td>' + (d.descripcion || '') + '</td>' +
        '<td style="text-align:center;">' + statusIcon + '</td>' +
      '</tr>';
  });

  tableHTML += '</tbody></table>';

  // ---- Show preview ----
  previewEl.style.display = 'block';
  previewEl.innerHTML = tableHTML;

  // ---- Show/hide import button with count ----
  if (result.valid.length > 0) {
    actionsEl.style.display = 'block';
    var btnEl = actionsEl.querySelector('button');
    if (btnEl) {
      btnEl.innerHTML =
        '<i class="fas fa-file-import" style="margin-right:6px;"></i>Importar ' +
        result.valid.length + ' Movimiento' + (result.valid.length > 1 ? 's' : '');
    }
  } else {
    actionsEl.style.display = 'none';
  }
}

/* -------------------------------------------------------
   6. ejecutarImportacion()
   Creates movimiento objects from validated rows, batches
   saldo changes per account, saves everything to
   localStorage, and refreshes the UI.
   ------------------------------------------------------- */
function ejecutarImportacion() {
  if (!window._bulkValidRows || window._bulkValidRows.length === 0) {
    showToast('No hay movimientos validos para importar.', 'warning');
    return;
  }

  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  // Build index map: cuenta id -> array index for fast lookup
  var cuentaIdxMap = {};
  cuentas.forEach(function(c, i) {
    cuentaIdxMap[c.id] = i;
  });

  // Accumulate saldo changes per account to apply in batch
  var saldoChanges = {};

  window._bulkValidRows.forEach(function(row) {
    // Create movimiento object
    var newMov = {
      id: uuid(),
      cuenta_id: row.cuenta_id,
      tipo: row.tipo,
      monto: row.monto,
      moneda: row.moneda,
      categoria_id: row.categoria_id,
      descripcion: row.descripcion,
      fecha: row.fecha,
      notas: row.notas,
      created: new Date().toISOString(),
    };
    movimientos.push(newMov);

    // Accumulate saldo change
    if (!saldoChanges[row.cuenta_id]) {
      saldoChanges[row.cuenta_id] = 0;
    }
    if (row.tipo === 'ingreso') {
      saldoChanges[row.cuenta_id] += row.monto;
    } else {
      saldoChanges[row.cuenta_id] -= row.monto;
    }
  });

  // Apply batched saldo changes to cuentas
  for (var cid in saldoChanges) {
    if (saldoChanges.hasOwnProperty(cid) && cuentaIdxMap.hasOwnProperty(cid)) {
      cuentas[cuentaIdxMap[cid]].saldo += saldoChanges[cid];
    }
  }

  // Persist to localStorage
  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);

  var count = window._bulkValidRows.length;
  window._bulkValidRows = [];

  // Reset modal width and close
  document.getElementById('modalContent').style.maxWidth = '';
  closeModal();

  showToast(count + ' movimiento' + (count > 1 ? 's' : '') + ' importado' + (count > 1 ? 's' : '') + ' exitosamente.');
  updateHeaderPatrimonio();

  // Re-render movimientos table if the user is currently viewing that module
  if (typeof currentModule !== 'undefined' && currentModule === 'movimientos' && typeof renderMovimientos === 'function') {
    renderMovimientos();
  }
}
