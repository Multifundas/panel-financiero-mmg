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
   CURRENCY FORMATTING
   ============================================================ */
const currencyFormatters = {
  MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
};

function formatCurrency(amount, currency) {
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
  // Blur: switch to text with commas
  document.addEventListener('blur', function(e) {
    var input = e.target;
    if (input.tagName !== 'INPUT') return;
    if (input.getAttribute('data-no-commas') === 'true') return;
    if (input.type !== 'number') return;
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
    // Restore all formatted inputs in the whole document
    // (buttons may use onclick handlers outside of forms)
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
