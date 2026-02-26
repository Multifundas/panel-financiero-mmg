/* ============================================================
   INIT APP
   ============================================================ */
function initApp() {
  // Check if data already exists
  const existingConfig = loadData(STORAGE_KEYS.config);

  if (!existingConfig || !existingConfig.initialized) {
    // First run: initialize with default config and empty data (no sample data)
    saveData(STORAGE_KEYS.config,           getDefaultConfig());
    saveData(STORAGE_KEYS.categorias_gasto, getDefaultCategorias());
    saveData(STORAGE_KEYS.instituciones,    getDefaultInstituciones());
    saveData(STORAGE_KEYS.tipos_cambio,     getDefaultTiposCambio());
    console.log('Panel Financiero: configuracion inicial creada.');
  }

  // Migrate categories: rename old names + add missing ones
  var cats = loadData(STORAGE_KEYS.categorias_gasto) || [];
  if (cats.length > 0) {
    var changed = false;
    cats.forEach(function(c) {
      if (c.nombre === 'Entretenimiento y viajes') { c.nombre = 'Viajes'; changed = true; }
      if (c.nombre === 'Impuestos y obligaciones') { c.nombre = 'Impuestos'; changed = true; }
    });
    var existNames = cats.map(function(c) { return c.nombre; });
    var nuevas = [
      { nombre: 'Seguros',      icono: 'fa-shield-alt',     color: '#06b6d4' },
      { nombre: 'Educacion',    icono: 'fa-graduation-cap', color: '#a855f7' },
      { nombre: 'Inversiones',  icono: 'fa-chart-line',     color: '#f97316' }
    ];
    nuevas.forEach(function(n) {
      if (existNames.indexOf(n.nombre) === -1) {
        cats.push({ id: uuid(), nombre: n.nombre, icono: n.icono, color: n.color });
        changed = true;
      }
    });
    if (changed) saveData(STORAGE_KEYS.categorias_gasto, cats);
  }

  // Apply theme
  var config2 = loadData(STORAGE_KEYS.config) || {};
  if (typeof applyTheme === 'function') {
    applyTheme(config2.theme || 'dark');
  }

  // Update header
  updateHeaderDate();
  updateHeaderPatrimonio();

  // Apply default privacy mode (saldos hidden on startup)
  if (typeof _saldosHidden !== 'undefined' && _saldosHidden) {
    document.body.classList.add('saldos-hidden');
    var hideIcon = document.getElementById('hideSaldosIcon');
    if (hideIcon) hideIcon.className = 'fas fa-eye-slash';
  }

  // Render initial module
  navigateTo('dashboard');

  // Auto-update exchange rates on startup (silent, non-blocking)
  autoActualizarTipoCambio();
}

/* ============================================================
   AUTO-UPDATE EXCHANGE RATES ON STARTUP
   Fetches latest rates silently. Updates header if successful.
   ============================================================ */
function autoActualizarTipoCambio() {
  fetch('https://open.er-api.com/v6/latest/MXN')
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function(data) {
      if (data.result !== 'success' || !data.rates) return;
      var usdRate = data.rates.USD;
      var eurRate = data.rates.EUR;
      if (!usdRate || !eurRate || usdRate <= 0 || eurRate <= 0) return;

      var USD_MXN = parseFloat((1 / usdRate).toFixed(4));
      var EUR_MXN = parseFloat((1 / eurRate).toFixed(4));

      saveData(STORAGE_KEYS.tipos_cambio, { USD_MXN: USD_MXN, EUR_MXN: EUR_MXN });

      var config = loadData(STORAGE_KEYS.config) || {};
      config.ultima_actualizacion_tc = new Date().toISOString();
      saveData(STORAGE_KEYS.config, config);

      updateHeaderPatrimonio();
      console.log('Tipo de cambio actualizado: USD/MXN=' + USD_MXN + ', EUR/MXN=' + EUR_MXN);
    })
    .catch(function(err) {
      console.warn('No se pudo actualizar tipo de cambio automaticamente:', err.message);
    });
}

// -- Launch --
document.addEventListener('DOMContentLoaded', function() {
  // Setup auto-formatting of numeric inputs with commas
  if (typeof _setupNumericFormatting === 'function') {
    _setupNumericFormatting();
  }

  if (typeof initAuth === 'function') {
    initAuth();
  } else {
    initApp();
  }
});
