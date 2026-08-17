/* ============================================================
   PDF BANK STATEMENT IMPORT MODULE  v20260817d
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
var _pdfParsedRows = [];
var _pdfBanco = '';

// ═══════════════════════════════════════════════════════════════
//  1. INTERFAZ
// ═══════════════════════════════════════════════════════════════

function openPdfImport() {
  var html = ''
    + '<p style="font-size:15px;color:var(--text-secondary);margin:0 0 20px;">'
    +   'Sube el estado de cuenta en PDF. El banco se detecta automáticamente y los '
    +   'movimientos se clasifican por concepto. Podrás revisar antes de confirmar.'
    + '</p>'
    + '<div>'
    +   '<label class="form-label">Archivo PDF</label>'
    +   '<input type="file" id="pdfFileInput" accept=".pdf" class="form-input"'
    +     ' onchange="handlePdfUpload(event)" style="padding:8px;">'
    + '</div>'
    + '<div id="pdfLoadingIndicator" style="display:none;text-align:center;padding:40px;">'
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

  var loading = document.getElementById('pdfLoadingIndicator');
  var preview = document.getElementById('pdfPreviewContainer');
  loading.style.display = 'block';
  preview.style.display = 'none';
  _pdfParsedRows = [];

  var reader = new FileReader();
  reader.onload = function(e) {
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

  if (tcDateRe.test(fullText))  return parseBanorteTC(lines, fullText);
  if (chqDateRe.test(fullText)) return parseBanorteChequera(lines, fullText);

  // Si ningún patrón específico, intentar ambos y retornar el que encuentre más
  var tcRows  = parseBanorteTC(lines, fullText);
  var chqRows = parseBanorteChequera(lines, fullText);
  return tcRows.length >= chqRows.length ? tcRows : chqRows;
}

/* ── Banorte Tarjeta de Crédito ─────────────────────────────────────────────
   Formato por fila (separada por tabs):
     "28-JUN-2026  29-JUN-2026  IPARK MTY INTERRED APODACA NL MX  +$1,050.00"
   Líneas de tipo de cambio (ignorar fila previa):
     "06/26/26 2,889.0892 USD RT 17.5572"
   Pagos:  "-$105,000.00"  → tipo ingreso (reducen deuda)
   ─────────────────────────────────────────────────────────────────────────── */
function parseBanorteTC(lines, fullText) {
  var rows = [];

  // Fecha TC: DD-MMM-YYYY con abreviaturas en mayúsculas (o mezcladas)
  var dateRe  = /^(\d{2})-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/i;
  // Monto al final de línea: +$1,050.00  o  -$105,000.00
  var amtRe   = /([+\-])\s*\$\s*([\d,]+\.\d{2})\s*$/;
  // Línea de tipo de cambio USD → ignorar fila anterior
  var usdRe   = /\d{2}\/\d{2}\/\d{2}\s+[\d,.]+\s+USD\s+RT\s+[\d.]+/i;

  for (var i = 0; i < lines.length; i++) {
    var raw  = lines[i];
    var line = raw.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Si la SIGUIENTE línea es tipo de cambio USD → saltar esta fila
    var nextLine = i + 1 < lines.length ? lines[i + 1].replace(/\t/g, ' ') : '';
    if (usdRe.test(nextLine)) { i++; continue; }

    var dm = line.match(dateRe);
    if (!dm) continue;

    // Ignorar filas de encabezado de columnas
    if (/Fecha de (la )?operaci|Fecha de cargo|Descripci/i.test(line)) continue;
    // Ignorar totales y subtítulos
    if (/CARGOS,\s*ABONOS|Tarjeta (titular|adicional)|Total (cargos|abonos)/i.test(line)) continue;

    var am = line.match(amtRe);
    if (!am) continue;

    var monto = _parseMonto(am[2]);
    if (monto < 0.01) continue;

    // signo: '+' → cargo al cliente = gasto; '-' → pago recibido = ingreso
    var tipo = (am[1] === '-') ? 'ingreso' : 'gasto';

    // Descripción: quitar fechas y monto de la línea
    var desc = line
      .replace(dateRe, '')          // primera fecha
      .replace(dateRe, '')          // segunda fecha (fecha de cargo)
      .replace(amtRe,  '')          // monto
      .replace(/\s+/g, ' ').trim();
    if (!desc) desc = 'Movimiento';

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

function classifyMovements(rows) {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var catMap = {};
  categorias.forEach(function(c) { catMap[c.nombre.toLowerCase()] = c; });

  rows.forEach(function(row) {
    if (row.tipo === 'ingreso') { row.categoria_nombre = '—'; return; }

    var desc = _sinAcentos(row.descripcion.toLowerCase());
    var matched = false;

    for (var r = 0; r < PDF_CLASSIFICATION_RULES.length; r++) {
      var rule = PDF_CLASSIFICATION_RULES[r];
      for (var k = 0; k < rule.keywords.length; k++) {
        if (desc.indexOf(rule.keywords[k]) >= 0) {
          var cat = catMap[rule.categoria.toLowerCase()];
          if (cat) { row.categoria_id = cat.id; row.categoria_nombre = cat.nombre; }
          else      { row.categoria_nombre = rule.categoria; }
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      var otros = catMap['otros'];
      if (otros) { row.categoria_id = otros.id; row.categoria_nombre = otros.nombre; }
      else        { row.categoria_nombre = 'Sin clasificar'; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  5. PREVIEW Y CONFIRMACIÓN
// ═══════════════════════════════════════════════════════════════

function displayPdfPreview(banco) {
  if (banco) _pdfBanco = banco;
  banco = _pdfBanco;
  var container = document.getElementById('pdfPreviewContainer');
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var rows = _pdfParsedRows;

  var gastos   = rows.filter(function(r) { return r.tipo === 'gasto'; });
  var ingresos = rows.filter(function(r) { return r.tipo === 'ingreso'; });
  var totalGastos   = gastos.reduce(function(s, r) { return s + r.monto; }, 0);
  var totalIngresos = ingresos.reduce(function(s, r) { return s + r.monto; }, 0);
  var neto = totalIngresos - totalGastos;
  var netoColor = neto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  var html = ''
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">'
    +   '<span class="badge badge-blue" style="font-size:15px;">'
    +     '<i class="fas fa-university"></i> ' + (banco || '') + ' — ' + rows.length + ' movimientos'
    +   '</span>'
    +   '<span class="badge badge-red" style="font-size:15px;">' + gastos.length + ' gastos</span>'
    +   '<span class="badge badge-green" style="font-size:15px;">' + ingresos.length + ' ingresos</span>'
    +   '<button class="btn btn-secondary" onclick="removePdfSelectedRows()"'
    +     ' style="font-size:14px;padding:4px 12px;margin-left:auto;">'
    +     '<i class="fas fa-trash"></i> Eliminar seleccionados'
    +   '</button>'
    + '</div>'
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
    + '<div style="max-height:calc(60vh - 80px);overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);">'
    + '<table class="data-table" style="font-size:15px;table-layout:fixed;width:100%;">'
    + '<thead><tr>'
    +   '<th style="width:32px;"><input type="checkbox" onchange="toggleAllPdfRows(this.checked)"></th>'
    +   '<th style="width:105px;">Fecha</th>'
    +   '<th>Descripción</th>'
    +   '<th style="width:140px;text-align:right;">Monto</th>'
    +   '<th style="width:80px;">Tipo</th>'
    +   '<th style="width:210px;">Categoría</th>'
    + '</tr></thead><tbody>';

  rows.forEach(function(row, idx) {
    var esGasto   = row.tipo === 'gasto';
    var colorMonto = esGasto ? 'var(--accent-red)' : 'var(--accent-green)';
    var badgeClass = esGasto ? 'badge-red' : 'badge-green';
    var signo      = esGasto ? '−' : '+';

    var catSel = '';
    if (esGasto) {
      catSel = '<select class="pdf-cat-select" onchange="updatePdfCategory(' + idx + ',this.value)"'
             + ' style="font-size:14px;width:100%;">';
      catSel += '<option value="">Sin categoría</option>';
      categorias.forEach(function(c) {
        catSel += '<option value="' + c.id + '"' + (c.id === row.categoria_id ? ' selected' : '') + '>'
               + c.nombre + '</option>';
      });
      catSel += '</select>';
    } else {
      catSel = '<span style="color:var(--text-muted);font-size:14px;">N/A</span>';
    }

    html += '<tr class="pdf-row' + (row.selected ? ' pdf-row-selected' : '') + '">'
      + '<td><input type="checkbox" ' + (row.selected ? 'checked' : '') + ' onchange="togglePdfRow(' + idx + ')"></td>'
      + '<td style="font-size:14px;">' + (typeof formatDate === 'function' ? formatDate(row.fecha) : row.fecha) + '</td>'
      + '<td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;" title="' + row.descripcion.replace(/"/g,'&quot;') + '">'
      +   row.descripcion
      + '</td>'
      + '<td style="text-align:right;font-size:15px;font-weight:700;color:' + colorMonto + ';font-variant-numeric:tabular-nums;">'
      +   signo + '$' + _formatNum(row.monto)
      + '</td>'
      + '<td><span class="badge ' + badgeClass + '" style="font-size:12px;">'
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
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;">'
    +   '<span style="font-size:14px;color:var(--text-muted);flex:1;">'
    +     'Ajusta categorías y elimina duplicados si los hay.'
    +   '</span>'
    +   '<label class="form-label" style="margin:0;white-space:nowrap;font-size:14px;">Importar a:</label>'
    +   '<select id="pdfCuentaSelect" class="form-input" style="min-width:190px;font-size:14px;">'
    +     '<option value="">— Selecciona cuenta —</option>'
    +     cuentaOpts
    +   '</select>'
    +   '<button class="btn btn-primary" onclick="confirmPdfImport()" style="padding:9px 22px;">'
    +     '<i class="fas fa-check"></i> Importar ' + rows.length + ' mov.'
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

function updatePdfCategory(idx, catId) {
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var cat = categorias.find(function(c) { return c.id === catId; });
  _pdfParsedRows[idx].categoria_id  = catId;
  _pdfParsedRows[idx].categoria_nombre = cat ? cat.nombre : '';
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

  var sel = document.getElementById('pdfCuentaSelect');
  var cuentaId = sel ? sel.value : '';
  if (!cuentaId) {
    showToast('Selecciona la cuenta destino antes de importar', 'warning');
    if (sel) sel.focus();
    return;
  }

  var cuentas    = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var cuenta = cuentas.find(function(c) { return c.id === cuentaId; });
  if (!cuenta) { showToast('Cuenta no encontrada', 'error'); return; }

  if (!confirm('Se importarán ' + _pdfParsedRows.length + ' movimientos a "' + cuenta.nombre + '". ¿Continuar?')) return;

  _pdfParsedRows.forEach(function(row) {
    movimientos.push({
      id: uuid(),
      cuenta_id: cuentaId,
      tipo: row.tipo,
      monto: row.monto,
      moneda: cuenta.moneda || 'MXN',
      categoria_id: row.tipo === 'gasto' ? (row.categoria_id || null) : null,
      descripcion: row.descripcion,
      fecha: row.fecha,
      notas: 'Importado desde PDF',
      created: new Date().toISOString()
    });
  });

  // No se modifica cuenta.saldo: _calcSaldoReal lo recalcula automáticamente.
  saveData(STORAGE_KEYS.movimientos, movimientos);

  var total = _pdfParsedRows.length;
  _pdfParsedRows = [];
  closeModal();
  showToast(total + ' movimientos importados exitosamente desde PDF', 'success');

  if (typeof renderMovimientos === 'function') renderMovimientos();
  if (typeof updateHeaderPatrimonio === 'function') updateHeaderPatrimonio();
}
