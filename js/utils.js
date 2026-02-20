/* ============================================================
   UUID GENERATION
   ============================================================ */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ============================================================
   HIDE SALDOS (PRIVACY MODE)
   ============================================================ */
var _saldosHidden = false;

function toggleHideSaldos() {
  _saldosHidden = !_saldosHidden;
  document.body.classList.toggle('saldos-hidden', _saldosHidden);
  var icon = document.getElementById('hideSaldosIcon');
  if (icon) icon.className = _saldosHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
  // Re-render current module to apply masking
  if (typeof currentModule !== 'undefined' && typeof navigateTo === 'function') {
    navigateTo(currentModule);
  }
  // Update header patrimonio
  if (typeof updateHeaderPatrimonio === 'function') updateHeaderPatrimonio();
}

/* ============================================================
   CURRENCY FORMATTING
   ============================================================ */
const currencyFormatters = {
  MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
};

function formatCurrency(amount, currency) {
  if (_saldosHidden) {
    var prefix = (currency || 'MXN').toUpperCase() === 'USD' ? 'US$' : (currency || 'MXN').toUpperCase() === 'EUR' ? '\u20AC' : '$';
    return prefix + '••••••';
  }
  currency = (currency || 'MXN').toUpperCase();
  const formatter = currencyFormatters[currency];
  if (!formatter) return `${currency} ${Number(amount).toFixed(2)}`;

  let formatted = formatter.format(amount);

  // Normalise output to desired format
  if (currency === 'USD') {
    // Intl gives "$1,234.56" -> we want "US$1,234.56"
    formatted = formatted.replace('$', 'US$');
  }
  // MXN: Intl es-MX gives "$1,234.89" which is correct
  // EUR: Intl de-DE gives "1.234,56 \u20AC" -> keep as-is or rearrange
  if (currency === 'EUR') {
    // Convert "1.234,56 \u20AC" -> "\u20AC1,234.56"
    const num = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    formatted = '\u20AC' + num;  // \u20AC symbol
  }

  return formatted;
}

/** Convert any amount to MXN using stored exchange rates */
function toMXN(amount, currency, tiposCambio) {
  currency = (currency || 'MXN').toUpperCase();
  if (currency === 'MXN') return amount;
  const rates = tiposCambio || loadData(STORAGE_KEYS.tipos_cambio) || {};
  if (currency === 'USD') return amount * (rates['USD_MXN'] || 17.50);
  if (currency === 'EUR') return amount * (rates['EUR_MXN'] || 19.20);
  return amount;
}

/** Return CSS badge class for a currency code: MXN=blue, USD=green-strong, EUR=amber */
function monedaBadgeClass(moneda) {
  var m = (moneda || 'MXN').toUpperCase();
  if (m === 'USD') return 'badge-usd';
  if (m === 'EUR') return 'badge-amber';
  return 'badge-mxn';
}

/** Format a number as percentage */
function formatPct(value, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return (value >= 0 ? '+' : '') + Number(value).toFixed(decimals) + '%';
}

/** Format a date (ISO string or Date) as dd/mm/yyyy */
function formatDate(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Get month name in Spanish */
function mesNombre(monthIndex) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return meses[monthIndex];
}

/* ============================================================
   AUTO-FORMAT NUMERIC INPUTS WITH COMMAS
   On blur: show number with commas (type=text)
   On focus: restore raw number (type=number)
   On form submit: restore all inputs to raw values first
   ============================================================ */
var _numericFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4
});

function _formatWithCommas(val) {
  if (val === '' || val == null || isNaN(val)) return '';
  return _numericFormatter.format(Number(val));
}

function _restoreFormattedInput(input) {
  if (input.getAttribute('data-was-number') !== 'true') return;
  var raw = input.getAttribute('data-raw-value') || '';
  input.type = 'number';
  input.value = raw;
  input.removeAttribute('data-was-number');
}

function _restoreAllFormatted(container) {
  if (!container) container = document;
  var inputs = container.querySelectorAll('input[data-was-number="true"]');
  inputs.forEach(_restoreFormattedInput);
}

function _setupNumericFormatting() {
  /**
   * Real-time comma formatting: number inputs show a live formatted
   * preview below the input while typing. On blur, switch to text
   * with full comma format. On focus, restore raw number.
   */

  // Input: show live preview below the input
  document.addEventListener('input', function(e) {
    var input = e.target;
    if (input.tagName !== 'INPUT') return;
    if (input.getAttribute('data-no-commas') === 'true') return;
    if (input.type !== 'number') return;
    var val = input.value;
    if (val !== '' && val != null) {
      input.setAttribute('data-raw-value', val);
    }
    // Update or create live preview
    var preview = input.nextElementSibling;
    if (!preview || !preview.classList.contains('live-comma-preview')) {
      preview = document.createElement('div');
      preview.className = 'live-comma-preview';
      preview.style.cssText = 'font-size:10px;color:var(--text-muted);margin-top:2px;font-weight:600;letter-spacing:0.3px;';
      input.parentNode.insertBefore(preview, input.nextSibling);
    }
    if (val === '' || val == null || isNaN(val)) {
      preview.textContent = '';
    } else {
      preview.textContent = _formatWithCommas(val);
    }
  }, true);

  // Blur: switch to text with commas, remove preview
  document.addEventListener('blur', function(e) {
    var input = e.target;
    if (input.tagName !== 'INPUT') return;
    if (input.getAttribute('data-no-commas') === 'true') return;
    if (input.type !== 'number') return;
    // Remove live preview
    var preview = input.nextElementSibling;
    if (preview && preview.classList.contains('live-comma-preview')) {
      preview.remove();
    }
    var val = input.value;
    if (val === '' || val == null) return;
    input.setAttribute('data-raw-value', val);
    input.setAttribute('data-was-number', 'true');
    input.type = 'text';
    input.value = _formatWithCommas(val);
  }, true);

  // Focus: restore this input AND all other formatted inputs in the same
  // modal/form so that any oninput handler reading sibling values works
  document.addEventListener('focus', function(e) {
    var input = e.target;
    if (input.tagName !== 'INPUT') return;
    // Restore this input if it was formatted
    _restoreFormattedInput(input);
    // Also restore all formatted inputs in the nearest form or modal
    var container = input.closest('form') || input.closest('.modal-content') || input.closest('.card');
    if (container) _restoreAllFormatted(container);
  }, true);

  // Before form submit: restore all formatted inputs to raw values
  document.addEventListener('submit', function(e) {
    _restoreAllFormatted(e.target);
  }, true);

  // On click of submit/primary button: restore formatted inputs
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button[type="submit"], button.btn-primary, button.btn-danger');
    if (!btn) return;
    _restoreAllFormatted(document);
  }, true);
}

/** Get the numeric value of an input (handles comma-formatted state) */
function getInputNumericValue(inputOrId) {
  var input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
  if (!input) return 0;
  if (input.getAttribute('data-was-number') === 'true') {
    return parseFloat(input.getAttribute('data-raw-value')) || 0;
  }
  return parseFloat(input.value) || 0;
}

/** Return inline style color for a number (red if negative, green if positive, muted if zero) */
function colorNum(val) {
  if (val < 0) return 'color:var(--accent-red);';
  if (val > 0) return 'color:var(--accent-green);';
  return 'color:var(--text-muted);';
}

/** Wrap formatCurrency with automatic red color for negative amounts (returns HTML) */
function formatCurrencyColor(amount, currency) {
  var formatted = formatCurrency(amount, currency);
  if (Number(amount) < 0) {
    return '<span style="color:var(--accent-red);">' + formatted + '</span>';
  }
  return formatted;
}

/**
 * Global auto-color for negative numbers in data tables.
 * Scans cells after module renders and applies red color to any cell
 * whose text content starts with -$ or contains a negative currency value.
 */
/* ============================================================
   SORTABLE TABLE HEADERS
   Add class "sortable-table" to any <table> to enable click-to-sort
   on all <th> in <thead>. Works with text, numbers, currency, dates.
   ============================================================ */
function _initSortableTables(root) {
  if (!root) root = document;
  var tables = root.querySelectorAll('table.sortable-table');
  tables.forEach(function(table) {
    var headers = table.querySelectorAll('thead th');
    headers.forEach(function(th, colIdx) {
      if (th.getAttribute('data-no-sort') === 'true') return;
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.style.whiteSpace = 'nowrap';
      // Add sort icon
      var arrow = document.createElement('i');
      arrow.className = 'fas fa-sort';
      arrow.style.cssText = 'margin-left:6px;font-size:10px;color:var(--text-muted);opacity:0.6;';
      th.appendChild(arrow);

      th.addEventListener('click', function() {
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var rows = Array.from(tbody.querySelectorAll('tr'));
        var currentDir = th.getAttribute('data-sort-dir') || 'none';
        var newDir = currentDir === 'asc' ? 'desc' : 'asc';

        // Reset all headers in this table
        headers.forEach(function(h) {
          h.setAttribute('data-sort-dir', 'none');
          var ic = h.querySelector('i.fas');
          if (ic) { ic.className = 'fas fa-sort'; ic.style.opacity = '0.6'; }
        });

        th.setAttribute('data-sort-dir', newDir);
        var icon = th.querySelector('i.fas');
        if (icon) {
          icon.className = newDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
          icon.style.opacity = '1';
        }

        rows.sort(function(a, b) {
          var cellA = a.cells[colIdx];
          var cellB = b.cells[colIdx];
          if (!cellA || !cellB) return 0;
          var txtA = cellA.textContent.trim();
          var txtB = cellB.textContent.trim();

          // Try numeric comparison (strip currency symbols, commas)
          var numA = parseFloat(txtA.replace(/[^0-9.\-]/g, ''));
          var numB = parseFloat(txtB.replace(/[^0-9.\-]/g, ''));
          if (!isNaN(numA) && !isNaN(numB)) {
            return newDir === 'asc' ? numA - numB : numB - numA;
          }
          // Fallback: string comparison
          return newDir === 'asc' ? txtA.localeCompare(txtB) : txtB.localeCompare(txtA);
        });

        rows.forEach(function(row) { tbody.appendChild(row); });
      });
    });
  });
}

function _autoColorNegativeNumbers(root) {
  if (!root) root = document;
  var cells = root.querySelectorAll('.data-table td, .kpi-value, [data-auto-color]');
  cells.forEach(function(cell) {
    var text = cell.textContent.trim();
    // Match patterns like -$1,234.56 or -€1,234.56 or -US$1,234.56
    if (/^-[\$€]/.test(text) || /^-US\$/.test(text)) {
      if (!cell.style.color && !cell.classList.contains('text-green') && !cell.classList.contains('text-red')) {
        cell.style.color = 'var(--accent-red)';
      }
    }
  });
}
