/* ============================================================
   INIT APP
   ============================================================ */
function initApp() {
  // Check if data already exists
  const existingConfig = loadData(STORAGE_KEYS.config);

  if (!existingConfig || !existingConfig.initialized) {
    // First run: generate and save sample data
    const sampleData = generateSampleData();
    saveData(STORAGE_KEYS.config,           sampleData.config);
    saveData(STORAGE_KEYS.categorias_gasto, sampleData.categorias_gasto);
    saveData(STORAGE_KEYS.instituciones,    sampleData.instituciones);
    saveData(STORAGE_KEYS.tipos_cambio,     sampleData.tipos_cambio);
    saveData(STORAGE_KEYS.cuentas,          sampleData.cuentas);
    saveData(STORAGE_KEYS.movimientos,      sampleData.movimientos);
    saveData(STORAGE_KEYS.rendimientos,     sampleData.rendimientos);
    saveData(STORAGE_KEYS.transferencias,   sampleData.transferencias);
    saveData(STORAGE_KEYS.prestamos,       sampleData.prestamos);
    saveData(STORAGE_KEYS.propiedades,     sampleData.propiedades);
    saveData(STORAGE_KEYS.historial_patrimonio, sampleData.historial_patrimonio);
    saveData(STORAGE_KEYS.presupuestos,        sampleData.presupuestos);
    saveData(STORAGE_KEYS.plantillas_recurrentes, sampleData.plantillas_recurrentes);
    saveData(STORAGE_KEYS.metas,                 sampleData.metas);
    console.log('Panel Financiero: datos de ejemplo generados.');
  }

  // Apply theme
  var config2 = loadData(STORAGE_KEYS.config) || {};
  if (typeof applyTheme === 'function') {
    applyTheme(config2.theme || 'dark');
  }

  // Update header
  updateHeaderDate();
  updateHeaderPatrimonio();

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
  if (typeof initAuth === 'function') {
    initAuth();
  } else {
    initApp();
  }
});
