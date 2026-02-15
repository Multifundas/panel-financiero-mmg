/* ============================================================
   PDF BANK STATEMENT IMPORT MODULE
   ============================================================ */

// Configure pdf.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ---------- Classification Rules ---------- */
var CLASSIFICATION_RULES = [
  { keywords: ['oxxo','7 eleven','7eleven','soriana','walmart','walmex','heb','h-e-b','costco','superama','chedraui','la comer','mega comercial','city market','alsuper','smart','bodega aurrera','restaur','comida','aliment','torta','taco','pizza','sushi','burger','starbucks','mcdon','subway','dominos','little caesars','uber eat','rappi','didi food','cornershop'], categoria: 'Alimentacion' },
  { keywords: ['uber trip','uber viaje','didi viaj','gasolina','gasolinera','pemex','bp station','shell','caseta','tag iave','peaje','estacionamiento','parking','cabify','autobus','metro','taxi','vehicul','refaccion','mecanico','llanta','verificacion vehic'], categoria: 'Transporte' },
  { keywords: ['cfe','comision federal','telmex','izzi','megacable','totalplay','axtel','agua ','comision agua','predial','gas natural','naturgy','luz ','renta ','arrend','hipoteca','inmobili','mantenimiento','limpieza','plomero','electricista','pinturas','ferreteria','home depot'], categoria: 'Vivienda' },
  { keywords: ['farmacia','benavides','guadalajara','san pablo','hospital','medic','doctor','dental','dentista','optica','lentes','laboratorio','analisis clinico','salud','seguro medico','consulta','ginecolog','pediatr','psicolog'], categoria: 'Salud' },
  { keywords: ['cinepolis','cinemex','netflix','spotify','amazon prime','disney','hbo','youtube','apple music','steam','xbox','playstation','nintendo','cine ','teatro','concierto','boleto','viaje','hotel','airbnb','booking','avion','aeromexico','volaris','vivaaerobus','interjet','despegar'], categoria: 'Entretenimiento y viajes' },
  { keywords: ['sat ','isr','impuesto','tenencia','isan','derechos','multa','infraccion','recargo','actualizacion fiscal'], categoria: 'Impuestos y obligaciones' },
  { keywords: ['colegio','escuela','universidad','udemy','coursera','libro','papeleria','educacion','inscripcion','colegiatura','guarderia','kinder','mensualidad escol'], categoria: 'Familia' },
];

/* ---------- State ---------- */
var _pdfParsedRows = [];
var _pdfSelectedAccount = null;

/* ---------- Open Modal ---------- */
function openPdfImport() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var activeCuentas = cuentas.filter(function(c) { return c.activa !== false; });

  var cuentaOptions = activeCuentas.map(function(c) {
    return '<option value="' + c.id + '">' + c.nombre + ' (' + c.moneda + ')</option>';
  }).join('');

  var html = ''
    + '<div style="margin-bottom:16px;">'
    +   '<p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;">'
    +     'Sube el estado de cuenta en PDF de tu banco. El sistema extraera los movimientos, '
    +     'los clasificara automaticamente por concepto y podras revisar, editar y confirmar antes de guardar.'
    +   '</p>'
    +   '<div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">'
    +     '<div style="flex:1;min-width:200px;">'
    +       '<label class="form-label">Cuenta destino</label>'
    +       '<select id="pdfCuentaSelect" class="form-input">'
    +         '<option value="">-- Selecciona cuenta --</option>'
    +         cuentaOptions
    +       '</select>'
    +     '</div>'
    +     '<div style="flex:1;min-width:200px;">'
    +       '<label class="form-label">Archivo PDF</label>'
    +       '<input type="file" id="pdfFileInput" accept=".pdf" class="form-input" '
    +         'onchange="handlePdfUpload(event)" style="padding:8px;">'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div id="pdfLoadingIndicator" style="display:none;text-align:center;padding:32px;">'
    +   '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent-blue);"></i>'
    +   '<p style="margin:12px 0 0;color:var(--text-muted);font-size:13px;">Leyendo y clasificando movimientos del PDF...</p>'
    + '</div>'
    + '<div id="pdfPreviewContainer" style="display:none;"></div>';

  openModal('Cargar Estado de Cuenta (PDF)', html, { maxWidth: '900px' });
}

/* ---------- Handle File Upload ---------- */
function handlePdfUpload(event) {
  var file = event.target.files[0];
  if (!file) return;

  var cuentaId = document.getElementById('pdfCuentaSelect').value;
  if (!cuentaId) {
    showToast('Selecciona una cuenta destino primero', 'warning');
    event.target.value = '';
    return;
  }
  _pdfSelectedAccount = cuentaId;

  document.getElementById('pdfLoadingIndicator').style.display = 'block';
  document.getElementById('pdfPreviewContainer').style.display = 'none';

  var reader = new FileReader();
  reader.onload = function(e) {
    var typedArray = new Uint8Array(e.target.result);
    extractPdfText(typedArray).then(function(text) {
      document.getElementById('pdfLoadingIndicator').style.display = 'none';
      var rows = parseBankStatement(text);
      if (rows.length === 0) {
        showToast('No se pudieron detectar movimientos en este PDF. Intenta con otro formato.', 'warning');
        return;
      }
      classifyMovements(rows);
      _pdfParsedRows = rows;
      displayPdfPreview();
    }).catch(function(err) {
      document.getElementById('pdfLoadingIndicator').style.display = 'none';
      console.error('PDF parse error:', err);
      showToast('Error al leer el PDF: ' + err.message, 'error');
    });
  };
  reader.readAsArrayBuffer(file);
}

/* ---------- Extract Text from PDF ---------- */
function extractPdfText(typedArray) {
  return pdfjsLib.getDocument({ data: typedArray }).promise.then(function(pdf) {
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      pages.push(i);
    }
    var allText = '';
    return pages.reduce(function(promise, pageNum) {
      return promise.then(function() {
        return pdf.getPage(pageNum).then(function(page) {
          return page.getTextContent().then(function(content) {
            // Group text items by Y position to reconstruct lines
            var items = content.items;
            if (items.length === 0) return;
            var lines = {};
            items.forEach(function(item) {
              var y = Math.round(item.transform[5]);
              if (!lines[y]) lines[y] = [];
              lines[y].push({ x: item.transform[4], text: item.str });
            });
            // Sort by Y descending (top to bottom), then X ascending within each line
            var sortedYs = Object.keys(lines).map(Number).sort(function(a, b) { return b - a; });
            sortedYs.forEach(function(y) {
              var lineItems = lines[y].sort(function(a, b) { return a.x - b.x; });
              var lineText = lineItems.map(function(i) { return i.text; }).join('\t');
              allText += lineText + '\n';
            });
          });
        });
      });
    }, Promise.resolve()).then(function() {
      return allText;
    });
  });
}

/* ---------- Parse Bank Statement Text ---------- */
function parseBankStatement(text) {
  console.log('=== PDF RAW TEXT START ===');
  console.log(text);
  console.log('=== PDF RAW TEXT END ===');

  var lines = text.split('\n');
  var rows = [];

  // Try BBVA parser first
  rows = parseBBVA(lines, text);
  if (rows.length > 0) {
    console.log('Parser BBVA detected ' + rows.length + ' rows');
    return rows;
  }

  // Try generic parser as fallback
  rows = parseGeneric(lines);
  console.log('Parser Generic detected ' + rows.length + ' rows');
  return rows;
}

/* ---------- BBVA Mexico Parser ---------- */
function parseBBVA(lines, fullText) {
  var rows = [];

  // BBVA uses format: DD/Mmm (e.g., 02/Ene, 15/Feb) or DD/MMM
  // Typical line with tabs: FechaOp\tFechaApl\tConcepto\tCargo\tAbono\tSaldo
  // Or sometimes: DD/Mmm\tDD/Mmm\tDESCRIPCION\t1,234.56\t\t12,345.67
  // Also possible: DD/Mmm\tDESCRIPCION\t1,234.56\t12,345.67

  var meses = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
  };

  // Detect year from text (BBVA statements usually show "Estado de Cuenta" with a period)
  var yearMatch = fullText.match(/20[2-3]\d/);
  var statementYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

  // BBVA short date: DD/Mmm (e.g., 02/Ene, 15/Feb, 3/Mar)
  var bbvaDateRegex = /^(\d{1,2})\/(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)/i;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 5) continue;

    // Check if line starts with a BBVA-style date
    var dateMatch = line.match(bbvaDateRegex);
    if (!dateMatch) continue;

    var day = dateMatch[1].padStart(2, '0');
    var monthName = dateMatch[2].toLowerCase().substring(0, 3);
    var monthNum = meses[monthName];
    if (!monthNum) continue;

    var fecha = statementYear + '-' + monthNum + '-' + day;

    // Split by tab to get columns
    var parts = line.split('\t');

    // Extract amounts from the line
    var amounts = [];
    var amountPositions = []; // track which column index has amounts
    var moneyRegex = /^[\$]?\s*([\d,]+\.\d{2})$/;

    // Check each part for amounts (skip first 1-2 parts which are dates)
    for (var p = 0; p < parts.length; p++) {
      var cleaned = parts[p].trim().replace(/[\$,]/g, '');
      var numVal = parseFloat(cleaned);
      var amtMatch = parts[p].trim().match(/^[\$]?\s*([\d,]+\.\d{2})$/);
      if (amtMatch) {
        var val = parseFloat(amtMatch[1].replace(/,/g, ''));
        if (val > 0) {
          amounts.push({ value: val, colIdx: p });
        }
      }
    }

    if (amounts.length === 0) continue;

    // Extract description: parts that are not dates and not amounts
    var descParts = [];
    for (var p2 = 0; p2 < parts.length; p2++) {
      var part = parts[p2].trim();
      if (!part) continue;
      // Skip if it's a date
      if (part.match(bbvaDateRegex)) continue;
      // Skip if it's a pure number/amount
      if (part.match(/^[\$]?\s*[\d,]+\.\d{2}$/)) continue;
      // Skip if it matches partial date (just DD/Mmm)
      if (part.match(/^\d{1,2}\/(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)/i)) continue;
      descParts.push(part);
    }

    var descripcion = descParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!descripcion || descripcion.length < 2) {
      descripcion = 'Movimiento bancario';
    }

    // Determine type and amount
    // BBVA columns: typically ... | Cargo | Abono | Saldo
    // If 3+ amounts: last is saldo, second-to-last could be abono, first is cargo
    // If 2 amounts: one is cargo/abono, last is saldo
    var monto, tipo;

    if (amounts.length >= 3) {
      // Last = saldo, middle = abono, first = cargo
      var cargo = amounts[0].value;
      var abono = amounts[1].value;
      // Determine based on which column is populated (the other is usually 0 or missing)
      // In BBVA: if cargo column has value, it's a gasto; if abono, it's ingreso
      // Both could have values in rare cases
      monto = cargo;
      tipo = 'gasto';
      // Check if abono is significantly different from saldo
      if (abono !== amounts[amounts.length - 1].value) {
        // Both cargo and abono columns present
        monto = cargo;
        tipo = 'gasto';
      }
    } else if (amounts.length === 2) {
      // One is the movement, the other is the running balance (saldo)
      // The balance is usually the larger number and the last column
      monto = amounts[0].value;
      // Determine type by keywords
      var lineUpper = line.toUpperCase();
      if (lineUpper.indexOf('ABONO') >= 0 || lineUpper.indexOf('DEPOSITO') >= 0 ||
          lineUpper.indexOf('PAGO RECIBIDO') >= 0 || lineUpper.indexOf('NOMINA') >= 0 ||
          lineUpper.indexOf('DEVOLUCION') >= 0 || lineUpper.indexOf('BONIFICACION') >= 0 ||
          lineUpper.indexOf('RENDIMIENTO') >= 0 || lineUpper.indexOf('INTERES') >= 0 ||
          lineUpper.indexOf('SPEI RECIBIDO') >= 0 || lineUpper.indexOf('TRANSFERENCIA RECIBIDA') >= 0 ||
          lineUpper.indexOf('DEP ') >= 0 || lineUpper.indexOf('REEMBOLSO') >= 0) {
        tipo = 'ingreso';
      } else {
        tipo = 'gasto';
      }
    } else {
      monto = amounts[0].value;
      tipo = 'gasto';
    }

    if (monto < 1) continue;

    rows.push({
      fecha: fecha,
      descripcion: descripcion,
      monto: monto,
      tipo: tipo,
      categoria_id: null,
      categoria_nombre: '',
      selected: false
    });
  }

  return rows;
}

/* ---------- Generic Parser (fallback) ---------- */
function parseGeneric(lines) {
  var rows = [];
  var dateRegex = /(\d{1,2})[\/\-](\d{1,2}|\w{3})[\/\-](\d{2,4})/;
  var moneyRegex = /[\$]?\s*([\d,]+\.\d{2})/g;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 10) continue;

    var dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    // Try to extract amounts
    var amounts = [];
    var m;
    moneyRegex.lastIndex = 0;
    while ((m = moneyRegex.exec(line)) !== null) {
      var val = parseFloat(m[1].replace(/,/g, ''));
      if (val > 0 && val < 999999999) {
        amounts.push(val);
      }
    }

    if (amounts.length === 0) continue;

    // Parse date
    var fecha = parseStatementDate(dateMatch[0]);
    if (!fecha) continue;

    // Extract description: text between date and first amount
    var dateEnd = line.indexOf(dateMatch[0]) + dateMatch[0].length;
    var firstAmountMatch = line.match(/[\$]?\s*[\d,]+\.\d{2}/);
    var amountStart = firstAmountMatch ? line.indexOf(firstAmountMatch[0]) : line.length;
    var descripcion = line.substring(dateEnd, amountStart).trim();
    descripcion = descripcion.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!descripcion || descripcion.length < 2) {
      descripcion = 'Movimiento bancario';
    }

    // Determine type and amount
    var monto, tipo;
    if (amounts.length >= 2) {
      monto = amounts[amounts.length - 1];
      var lineUpper = line.toUpperCase();
      if (lineUpper.indexOf('ABONO') >= 0 || lineUpper.indexOf('DEPOSITO') >= 0 ||
          lineUpper.indexOf('TRANSFERENCIA RECIBIDA') >= 0 || lineUpper.indexOf('NOMINA') >= 0 ||
          lineUpper.indexOf('PAGO RECIBIDO') >= 0 || lineUpper.indexOf('DEVOLUCION') >= 0 ||
          lineUpper.indexOf('BONIFICACION') >= 0 || lineUpper.indexOf('RENDIMIENTO') >= 0 ||
          lineUpper.indexOf('INTERES') >= 0 || lineUpper.indexOf('DIVIDENDO') >= 0) {
        tipo = 'ingreso';
        monto = amounts.length >= 2 ? amounts[1] : amounts[0];
      } else {
        tipo = 'gasto';
        monto = amounts[0];
      }
    } else {
      monto = amounts[0];
      var lineCheck = line.toUpperCase();
      if (line.indexOf('+') >= 0 || lineCheck.indexOf('ABONO') >= 0 ||
          lineCheck.indexOf('DEPOSITO') >= 0 || lineCheck.indexOf('NOMINA') >= 0 ||
          lineCheck.indexOf('DEVOLUCION') >= 0) {
        tipo = 'ingreso';
      } else {
        tipo = 'gasto';
      }
    }

    if (monto < 1) continue;

    rows.push({
      fecha: fecha,
      descripcion: descripcion,
      monto: monto,
      tipo: tipo,
      categoria_id: null,
      categoria_nombre: '',
      selected: false
    });
  }

  return rows;
}

/* ---------- Parse Date from Statement ---------- */
function parseStatementDate(dateStr) {
  var months = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    'jan': '01', 'apr': '04', 'aug': '08', 'dec': '12'
  };

  // DD/MM/YYYY or DD/MM/YY
  var numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numericMatch) {
    var day = numericMatch[1].padStart(2, '0');
    var monthOrName = numericMatch[2];
    var year = numericMatch[3];

    if (monthOrName.length <= 2) {
      // Numeric month
      var month = monthOrName.padStart(2, '0');
      if (parseInt(month) > 12) {
        // Probably MM/DD/YYYY format
        var tmp = day; day = month; month = tmp;
      }
      if (year.length === 2) year = '20' + year;
      return year + '-' + month + '-' + day;
    } else {
      // Named month (e.g., 15-Ene-24)
      var monthNum = months[monthOrName.toLowerCase().substring(0, 3)];
      if (!monthNum) return null;
      if (year.length === 2) year = '20' + year;
      return year + '-' + monthNum + '-' + day;
    }
  }
  return null;
}

/* ---------- Classify Movements by Rules ---------- */
function classifyMovements(rows) {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catMap = {};
  categorias.forEach(function(c) {
    catMap[c.nombre.toLowerCase()] = c;
  });

  rows.forEach(function(row) {
    if (row.tipo === 'ingreso') {
      row.categoria_id = null;
      row.categoria_nombre = '—';
      return;
    }

    var desc = row.descripcion.toLowerCase();
    var matched = false;

    for (var r = 0; r < CLASSIFICATION_RULES.length; r++) {
      var rule = CLASSIFICATION_RULES[r];
      for (var k = 0; k < rule.keywords.length; k++) {
        if (desc.indexOf(rule.keywords[k]) >= 0) {
          var cat = catMap[rule.categoria.toLowerCase()];
          if (cat) {
            row.categoria_id = cat.id;
            row.categoria_nombre = cat.nombre;
          } else {
            row.categoria_nombre = rule.categoria;
          }
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      // Default to "Otros"
      var otros = catMap['otros'];
      if (otros) {
        row.categoria_id = otros.id;
        row.categoria_nombre = otros.nombre;
      } else {
        row.categoria_nombre = 'Sin clasificar';
      }
    }
  });
}

/* ---------- Display Preview Table ---------- */
function displayPdfPreview() {
  var container = document.getElementById('pdfPreviewContainer');
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var rows = _pdfParsedRows;

  var gastosCount = rows.filter(function(r) { return r.tipo === 'gasto'; }).length;
  var ingresosCount = rows.filter(function(r) { return r.tipo === 'ingreso'; }).length;
  var totalMonto = rows.reduce(function(sum, r) {
    return sum + (r.tipo === 'ingreso' ? r.monto : -r.monto);
  }, 0);

  // Category dropdown options
  var catOptions = categorias.map(function(c) {
    return '<option value="' + c.id + '">' + c.nombre + '</option>';
  }).join('');

  var html = ''
    + '<div class="pdf-preview-toolbar">'
    +   '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">'
    +     '<span class="badge badge-blue" style="font-size:12px;padding:4px 10px;">'
    +       '<i class="fas fa-file-pdf"></i> ' + rows.length + ' movimientos detectados'
    +     '</span>'
    +     '<span class="badge badge-green" style="font-size:12px;padding:4px 10px;">'
    +       ingresosCount + ' ingresos'
    +     '</span>'
    +     '<span class="badge badge-red" style="font-size:12px;padding:4px 10px;">'
    +       gastosCount + ' gastos'
    +     '</span>'
    +   '</div>'
    +   '<div style="display:flex;gap:8px;align-items:center;">'
    +     '<button class="btn btn-secondary" onclick="removePdfSelectedRows()" style="font-size:12px;padding:6px 12px;">'
    +       '<i class="fas fa-trash"></i> Eliminar seleccionados'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);">'
    + '<table class="data-table" style="font-size:12px;">'
    + '<thead><tr>'
    +   '<th style="width:30px;"><input type="checkbox" onchange="toggleAllPdfRows(this.checked)" title="Seleccionar todos"></th>'
    +   '<th>Fecha</th>'
    +   '<th>Concepto</th>'
    +   '<th style="text-align:right;">Monto</th>'
    +   '<th>Tipo</th>'
    +   '<th>Categoria</th>'
    + '</tr></thead><tbody>';

  rows.forEach(function(row, idx) {
    var tipoColor = row.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)';
    var tipoBadge = row.tipo === 'ingreso' ? 'badge-green' : 'badge-red';
    var tipoLabel = row.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
    var montoSign = row.tipo === 'ingreso' ? '+' : '-';

    var catSelect = '';
    if (row.tipo === 'gasto') {
      catSelect = '<select class="pdf-cat-select" onchange="updatePdfCategory(' + idx + ', this.value)">';
      categorias.forEach(function(c) {
        var sel = (c.id === row.categoria_id) ? ' selected' : '';
        catSelect += '<option value="' + c.id + '"' + sel + '>' + c.nombre + '</option>';
      });
      catSelect += '</select>';
    } else {
      catSelect = '<span style="color:var(--text-muted);font-size:11px;">N/A</span>';
    }

    html += '<tr class="pdf-row' + (row.selected ? ' pdf-row-selected' : '') + '">'
      + '<td><input type="checkbox" ' + (row.selected ? 'checked' : '') + ' onchange="togglePdfRow(' + idx + ')"></td>'
      + '<td>' + formatDate(row.fecha) + '</td>'
      + '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + row.descripcion.replace(/"/g, '&quot;') + '">' + row.descripcion + '</td>'
      + '<td style="text-align:right;font-weight:700;color:' + tipoColor + ';">' + montoSign + '$' + formatNumber(row.monto) + '</td>'
      + '<td><span class="badge ' + tipoBadge + '" style="font-size:11px;">' + tipoLabel + '</span></td>'
      + '<td>' + catSelect + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';

  // Action buttons
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">'
    + '<span style="font-size:13px;color:var(--text-muted);">Revisa y edita las categorias. Selecciona filas para eliminar duplicados.</span>'
    + '<button class="btn btn-primary" onclick="confirmPdfImport()" style="padding:10px 24px;">'
    +   '<i class="fas fa-check"></i> Confirmar e Importar ' + rows.length + ' movimientos'
    + '</button>'
    + '</div>';

  container.innerHTML = html;
  container.style.display = 'block';
}

/* ---------- Format Number Helper ---------- */
function formatNumber(n) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ---------- Toggle Row Selection ---------- */
function togglePdfRow(idx) {
  _pdfParsedRows[idx].selected = !_pdfParsedRows[idx].selected;
  displayPdfPreview();
}

function toggleAllPdfRows(checked) {
  _pdfParsedRows.forEach(function(row) { row.selected = checked; });
  displayPdfPreview();
}

/* ---------- Update Category ---------- */
function updatePdfCategory(idx, catId) {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var cat = categorias.find(function(c) { return c.id === catId; });
  _pdfParsedRows[idx].categoria_id = catId;
  _pdfParsedRows[idx].categoria_nombre = cat ? cat.nombre : '';
}

/* ---------- Remove Selected Rows ---------- */
function removePdfSelectedRows() {
  var count = _pdfParsedRows.filter(function(r) { return r.selected; }).length;
  if (count === 0) {
    showToast('Selecciona las filas que deseas eliminar', 'warning');
    return;
  }
  if (!confirm('Eliminar ' + count + ' fila(s) seleccionada(s)?')) return;
  _pdfParsedRows = _pdfParsedRows.filter(function(r) { return !r.selected; });
  displayPdfPreview();
  showToast(count + ' fila(s) eliminada(s)');
}

/* ---------- Confirm and Import ---------- */
function confirmPdfImport() {
  if (_pdfParsedRows.length === 0) {
    showToast('No hay movimientos para importar', 'warning');
    return;
  }

  var cuentaId = _pdfSelectedAccount;
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });

  if (!cuenta) {
    showToast('Cuenta no encontrada', 'error');
    return;
  }

  if (!confirm('Se importaran ' + _pdfParsedRows.length + ' movimientos a la cuenta "' + cuenta.nombre + '". Continuar?')) return;

  var saldoChange = 0;

  _pdfParsedRows.forEach(function(row) {
    var mov = {
      id: uuid(),
      cuenta_id: cuentaId,
      tipo: row.tipo,
      monto: row.monto,
      moneda: cuenta.moneda,
      categoria_id: row.tipo === 'gasto' ? row.categoria_id : null,
      descripcion: row.descripcion,
      fecha: row.fecha,
      notas: 'Importado desde PDF',
      created: new Date().toISOString()
    };
    movimientos.push(mov);

    if (row.tipo === 'ingreso') {
      saldoChange += row.monto;
    } else {
      saldoChange -= row.monto;
    }
  });

  // Update account balance
  var cIdx = cuentas.findIndex(function(c) { return c.id === cuentaId; });
  if (cIdx >= 0) {
    cuentas[cIdx].saldo = (cuentas[cIdx].saldo || 0) + saldoChange;
  }

  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);

  var count = _pdfParsedRows.length;
  _pdfParsedRows = [];
  _pdfSelectedAccount = null;

  closeModal();
  showToast(count + ' movimientos importados exitosamente desde PDF');

  if (typeof renderMovimientos === 'function') {
    renderMovimientos();
  }
  if (typeof updateHeaderPatrimonio === 'function') {
    updateHeaderPatrimonio();
  }
}
