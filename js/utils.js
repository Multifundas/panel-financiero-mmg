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
