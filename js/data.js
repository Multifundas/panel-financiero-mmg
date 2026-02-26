/* ============================================================
   DATA MODEL  -  In-memory cache backed by Supabase
   ============================================================ */
const STORAGE_KEYS = {
  cuentas:          'pf_cuentas',
  movimientos:      'pf_movimientos',
  rendimientos:     'pf_rendimientos',
  transferencias:   'pf_transferencias',
  categorias_gasto: 'pf_categorias_gasto',
  instituciones:    'pf_instituciones',
  tipos_cambio:     'pf_tipos_cambio',
  config:           'pf_config',
  prestamos:          'pf_prestamos',
  propiedades:        'pf_propiedades',
  historial_patrimonio: 'pf_historial_patrimonio',
  presupuestos:          'pf_presupuestos',
  plantillas_recurrentes: 'pf_plantillas_recurrentes',
  metas:                 'pf_metas',
  ingresos_futuros:      'pf_ingresos_futuros',
};

/* ---------- In-memory cache ---------- */
var _dataCache = {};
var _cacheReady = false;
var _pendingSaves = {};
var _saveTimers = {};
var _SAVE_DEBOUNCE_MS = 300;

function loadData(key) {
  try {
    var val = _dataCache[key];
    if (val === undefined || val === null) return null;
    return JSON.parse(JSON.stringify(val)); // deep clone
  } catch (e) {
    console.error('Error loading', key, e);
    return null;
  }
}

function saveData(key, data) {
  try {
    _dataCache[key] = JSON.parse(JSON.stringify(data)); // deep clone into cache
    _scheduleSyncToSupabase(key);
  } catch (e) {
    console.error('Error saving', key, e);
  }
}

function loadAll() {
  var store = {};
  for (var name in STORAGE_KEYS) {
    var key = STORAGE_KEYS[name];
    store[name] = loadData(key) || [];
  }
  if (!store.config || Array.isArray(store.config)) store.config = {};
  if (!store.tipos_cambio || Array.isArray(store.tipos_cambio)) store.tipos_cambio = {};
  return store;
}

function saveAll(store) {
  for (var name in STORAGE_KEYS) {
    var key = STORAGE_KEYS[name];
    saveData(key, store[name]);
  }
}

/* ---------- Supabase sync helpers ---------- */

function _scheduleSyncToSupabase(key) {
  if (_saveTimers[key]) clearTimeout(_saveTimers[key]);
  _pendingSaves[key] = true;
  _saveTimers[key] = setTimeout(function() {
    _syncKeyToSupabase(key);
  }, _SAVE_DEBOUNCE_MS);
}

function _syncKeyToSupabase(key) {
  var client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
  if (!client) return Promise.resolve();
  return client.auth.getSession().then(function(res) {
    var session = res.data.session;
    if (!session) return;
    var userId = session.user.id;
    return client.from('user_data').upsert({
      user_id: userId,
      data_key: key,
      data_value: _dataCache[key] !== undefined ? _dataCache[key] : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,data_key' }).then(function(res2) {
      if (res2.error) {
        console.error('Supabase sync error for', key, res2.error.message);
      } else {
        delete _pendingSaves[key];
      }
    });
  }).catch(function(err) {
    console.error('Supabase sync failed for', key, err);
  });
}

/**
 * Download all user_data rows from Supabase into _dataCache.
 * If Supabase has no data but localStorage does, migrate automatically.
 * Returns a Promise.
 */
function hydrateCache() {
  var client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
  if (!client) {
    // Fallback: load from localStorage
    for (var k in STORAGE_KEYS) {
      var key = STORAGE_KEYS[k];
      try {
        var raw = localStorage.getItem(key);
        if (raw) _dataCache[key] = JSON.parse(raw);
      } catch(e) { /* ignore */ }
    }
    _cacheReady = true;
    return Promise.resolve();
  }
  return client.auth.getSession().then(function(res) {
    var session = res.data.session;
    if (!session) {
      _cacheReady = true;
      return;
    }
    var userId = session.user.id;
    return client.from('user_data')
      .select('data_key, data_value')
      .eq('user_id', userId)
      .then(function(res2) {
        if (res2.error) {
          console.error('hydrateCache error:', res2.error.message);
          _cacheReady = true;
          return;
        }
        var rows = res2.data || [];
        if (rows.length > 0) {
          // Load from Supabase
          rows.forEach(function(row) {
            _dataCache[row.data_key] = row.data_value;
          });
          console.log('Cache hydrated from Supabase:', rows.length, 'keys');
        } else {
          // No data in Supabase — check localStorage for migration
          var hasLocal = false;
          for (var k2 in STORAGE_KEYS) {
            var key2 = STORAGE_KEYS[k2];
            try {
              var raw2 = localStorage.getItem(key2);
              if (raw2) {
                _dataCache[key2] = JSON.parse(raw2);
                hasLocal = true;
              }
            } catch(e2) { /* ignore */ }
          }
          if (hasLocal) {
            console.log('Migrating localStorage data to Supabase...');
            return _migrateToSupabase(userId, client);
          }
        }
        _cacheReady = true;
      });
  }).catch(function(err) {
    console.error('hydrateCache failed:', err);
    _cacheReady = true;
  });
}

function _migrateToSupabase(userId, client) {
  var rows = [];
  for (var k in STORAGE_KEYS) {
    var key = STORAGE_KEYS[k];
    if (_dataCache[key] !== undefined) {
      rows.push({
        user_id: userId,
        data_key: key,
        data_value: _dataCache[key],
        updated_at: new Date().toISOString()
      });
    }
  }
  if (rows.length === 0) {
    _cacheReady = true;
    return Promise.resolve();
  }
  return client.from('user_data').upsert(rows, { onConflict: 'user_id,data_key' })
    .then(function(res) {
      if (res.error) {
        console.error('Migration error:', res.error.message);
      } else {
        console.log('Migration complete:', rows.length, 'keys uploaded');
        // Clear localStorage after successful migration
        for (var k2 in STORAGE_KEYS) {
          localStorage.removeItem(STORAGE_KEYS[k2]);
        }
      }
      _cacheReady = true;
    }).catch(function(err) {
      console.error('Migration failed:', err);
      _cacheReady = true;
    });
}

/**
 * Flush all pending saves to Supabase immediately.
 * Returns a Promise that resolves when all syncs complete.
 */
function flushPendingSaves() {
  var promises = [];
  for (var key in _pendingSaves) {
    if (_saveTimers[key]) {
      clearTimeout(_saveTimers[key]);
      delete _saveTimers[key];
    }
    promises.push(_syncKeyToSupabase(key));
  }
  if (promises.length === 0) return Promise.resolve();
  return Promise.all(promises);
}

/**
 * Clear the in-memory cache (used on logout).
 */
function clearCache() {
  _dataCache = {};
  _cacheReady = false;
  _pendingSaves = {};
  for (var t in _saveTimers) {
    clearTimeout(_saveTimers[t]);
  }
  _saveTimers = {};
}

/**
 * Delete ALL user_data rows for the current user in Supabase.
 * Returns a Promise.
 */
function clearAllSupabaseData() {
  var client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
  if (!client) return Promise.resolve();
  return client.auth.getSession().then(function(res) {
    var session = res.data.session;
    if (!session) return;
    return client.from('user_data').delete().eq('user_id', session.user.id)
      .then(function(res2) {
        if (res2.error) console.error('clearAllSupabaseData error:', res2.error.message);
        else console.log('All Supabase data cleared for user');
      });
  });
}

/**
 * Calculate approximate data size in bytes for all cached keys.
 */
function calcularTamanoCache() {
  var totalBytes = 0;
  for (var key in STORAGE_KEYS) {
    var k = STORAGE_KEYS[key];
    var val = _dataCache[k];
    if (val !== undefined && val !== null) {
      var str = JSON.stringify(val);
      totalBytes += (k.length + str.length) * 2;
    }
  }
  return totalBytes;
}

/* ============================================================
   DEFAULT DATA INITIALIZATION
   ============================================================ */
function getDefaultConfig() {
  return {
    moneda_base: 'MXN',
    theme: 'dark',
    initialized: true,
    inflacion_anual: 4.5,
    ultima_actualizacion_tc: null,
  };
}

function getDefaultCategorias() {
  return [
    { id: uuid(), nombre: 'Vivienda',                   icono: 'fa-home',          color: '#3b82f6' },
    { id: uuid(), nombre: 'Alimentacion',                icono: 'fa-utensils',      color: '#f59e0b' },
    { id: uuid(), nombre: 'Salud',                       icono: 'fa-heartbeat',     color: '#ef4444' },
    { id: uuid(), nombre: 'Transporte',                  icono: 'fa-car',           color: '#8b5cf6' },
    { id: uuid(), nombre: 'Familia',                     icono: 'fa-users',         color: '#ec4899' },
    { id: uuid(), nombre: 'Viajes',                       icono: 'fa-plane',         color: '#10b981' },
    { id: uuid(), nombre: 'Impuestos',                   icono: 'fa-file-invoice',  color: '#64748b' },
    { id: uuid(), nombre: 'Seguros',                     icono: 'fa-shield-alt',    color: '#06b6d4' },
    { id: uuid(), nombre: 'Educacion',                   icono: 'fa-graduation-cap',color: '#a855f7' },
    { id: uuid(), nombre: 'Inversiones',                 icono: 'fa-chart-line',    color: '#f97316' },
    { id: uuid(), nombre: 'Otros',                       icono: 'fa-ellipsis-h',    color: '#94a3b8' },
  ];
}

function getDefaultInstituciones() {
  return [
    { id: uuid(), nombre: 'BBVA Mexico',    tipo: 'banco' },
    { id: uuid(), nombre: 'CetesDirecto',   tipo: 'gobierno' },
    { id: uuid(), nombre: 'GBM+',           tipo: 'broker' },
    { id: uuid(), nombre: 'Chase Bank',     tipo: 'banco' },
    { id: uuid(), nombre: 'Vanguard',       tipo: 'broker' },
    { id: uuid(), nombre: 'Bienes Raices',  tipo: 'inmobiliario' },
  ];
}

function getDefaultTiposCambio() {
  return {
    USD_MXN: 17.50,
    EUR_MXN: 19.20,
  };
}

/* ============================================================
   SAMPLE DATA GENERATION
   ============================================================ */
function generateSampleData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Helper to make ISO date strings
  function d(monthOffset, day) {
    const dt = new Date(y, m + monthOffset, day);
    return dt.toISOString();
  }

  // -- Instituciones --
  const instituciones = getDefaultInstituciones();
  const instMap = {};
  instituciones.forEach(i => instMap[i.nombre] = i.id);

  // -- Categorias --
  const categorias = getDefaultCategorias();
  const catMap = {};
  categorias.forEach(c => catMap[c.nombre] = c.id);

  // -- Cuentas --
  const cuentas = [
    {
      id: uuid(), nombre: 'BBVA Nomina', institucion_id: instMap['BBVA Mexico'],
      tipo: 'debito', moneda: 'MXN', saldo: 250000, rendimiento_anual: 0,
      notas: 'Cuenta principal de nomina', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'CetesDirecto', institucion_id: instMap['CetesDirecto'],
      tipo: 'inversion', moneda: 'MXN', saldo: 1500000, rendimiento_anual: 10.5,
      fecha_vencimiento: d(2, 15),
      notas: 'CETES a 28 y 91 dias', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'GBM+', institucion_id: instMap['GBM+'],
      tipo: 'inversion', moneda: 'MXN', saldo: 800000, rendimiento_anual: 8.2,
      notas: 'Portafolio diversificado MX', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'Chase Checking', institucion_id: instMap['Chase Bank'],
      tipo: 'debito', moneda: 'USD', saldo: 15000, rendimiento_anual: 0,
      notas: 'Cuenta en Estados Unidos', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'ETF VOO', institucion_id: instMap['Vanguard'],
      tipo: 'inversion', moneda: 'USD', saldo: 25000, rendimiento_anual: 12.0,
      notas: 'Vanguard S&P 500 ETF', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'Depto Polanco', institucion_id: instMap['Bienes Raices'],
      tipo: 'inmueble', moneda: 'MXN', saldo: 4500000, rendimiento_anual: 0,
      notas: 'Departamento en renta - Polanco', activa: true, created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'Depto Condesa', institucion_id: instMap['Bienes Raices'],
      tipo: 'inmueble', moneda: 'MXN', saldo: 3200000, rendimiento_anual: 0,
      notas: 'Departamento en renta - Condesa', activa: true, created: d(-3, 1),
    },
  ];

  cuentas.push({
    id: uuid(), nombre: 'Accion Club Deportivo', institucion_id: instMap['Bienes Raices'],
    tipo: 'activo_fijo', moneda: 'MXN', saldo: 350000, rendimiento_anual: 0,
    notas: 'Membresia club deportivo - valor de reventa', activa: true, created: d(-3, 1),
  });

  // Map for convenience
  const cuentaMap = {};
  cuentas.forEach(c => cuentaMap[c.nombre] = c.id);

  // -- Movimientos --
  const movimientos = [];

  // Rent income - Polanco $22,000/mo
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
      tipo: 'ingreso', monto: 22000, moneda: 'MXN',
      categoria_id: catMap['Vivienda'],
      descripcion: 'Renta recibida - Depto Polanco',
      fecha: d(mo, 1), notas: '',
    });
  }

  // Rent income - Condesa $18,000/mo
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
      tipo: 'ingreso', monto: 18000, moneda: 'MXN',
      categoria_id: catMap['Vivienda'],
      descripcion: 'Renta recibida - Depto Condesa',
      fecha: d(mo, 1), notas: '',
    });
  }

  // Expenses: Alimentacion each month
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
      tipo: 'gasto', monto: 8500, moneda: 'MXN',
      categoria_id: catMap['Alimentacion'],
      descripcion: 'Supermercado y restaurantes',
      fecha: d(mo, 5), notas: '',
    });
  }

  // Expenses: Transporte each month
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
      tipo: 'gasto', monto: 3200, moneda: 'MXN',
      categoria_id: catMap['Transporte'],
      descripcion: 'Gasolina y Uber',
      fecha: d(mo, 8), notas: '',
    });
  }

  // Expenses: Salud one-time
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
    tipo: 'gasto', monto: 4500, moneda: 'MXN',
    categoria_id: catMap['Salud'],
    descripcion: 'Consulta medica y medicamentos',
    fecha: d(-1, 15), notas: '',
  });

  // Expenses: Entretenimiento
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
    tipo: 'gasto', monto: 12000, moneda: 'MXN',
    categoria_id: catMap['Entretenimiento y viajes'],
    descripcion: 'Viaje fin de semana Valle de Bravo',
    fecha: d(-1, 20), notas: '',
  });

  // Expenses: Familia
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
    tipo: 'gasto', monto: 6000, moneda: 'MXN',
    categoria_id: catMap['Familia'],
    descripcion: 'Colegiatura y utiles',
    fecha: d(0, 3), notas: '',
  });

  // Expenses: Impuestos
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
    tipo: 'gasto', monto: 15000, moneda: 'MXN',
    categoria_id: catMap['Impuestos y obligaciones'],
    descripcion: 'Pago provisional ISR',
    fecha: d(-1, 17), notas: '',
  });

  // CETES yield each month
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['CetesDirecto'],
      tipo: 'ingreso', monto: 13125, moneda: 'MXN',
      categoria_id: null,
      descripcion: 'Rendimiento CETES 28d',
      fecha: d(mo, 28), notas: 'Tasa 10.5% anual',
    });
  }

  // GBM+ yield each month
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['GBM+'],
      tipo: 'ingreso', monto: 5467, moneda: 'MXN',
      categoria_id: null,
      descripcion: 'Rendimiento portafolio GBM+',
      fecha: d(mo, 25), notas: 'Tasa 8.2% anual',
    });
  }

  // Large withdrawal from BBVA
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['BBVA Nomina'],
    tipo: 'gasto', monto: 200000, moneda: 'MXN',
    categoria_id: catMap['Otros'],
    descripcion: 'Retiro para inversion inmobiliaria',
    fecha: d(-2, 10), notas: 'Enganche adicional',
  });

  // USD deposit to Chase
  movimientos.push({
    id: uuid(), cuenta_id: cuentaMap['Chase Checking'],
    tipo: 'ingreso', monto: 5000, moneda: 'USD',
    categoria_id: null,
    descripcion: 'Deposito transferencia internacional',
    fecha: d(-1, 12), notas: '',
  });

  // ETF VOO yield
  for (let mo = -2; mo <= 0; mo++) {
    movimientos.push({
      id: uuid(), cuenta_id: cuentaMap['ETF VOO'],
      tipo: 'ingreso', monto: 250, moneda: 'USD',
      categoria_id: null,
      descripcion: 'Dividendo VOO',
      fecha: d(mo, 15), notas: 'Quarterly distribution',
    });
  }

  // -- Transferencias --
  const transferencias = [
    {
      id: uuid(),
      cuenta_origen_id: cuentaMap['BBVA Nomina'],
      cuenta_destino_id: cuentaMap['CetesDirecto'],
      monto_origen: 100000, moneda_origen: 'MXN',
      monto_destino: 100000, moneda_destino: 'MXN',
      fecha: d(-2, 5),
      descripcion: 'Inversion en CETES',
      notas: '',
    },
  ];

  // -- Rendimientos --
  const rendimientos = [];

  // CetesDirecto rendimientos
  for (let mo = -2; mo <= 0; mo++) {
    const saldoInicial = 1450000 + (mo + 2) * 50000;
    const saldoFinal = saldoInicial + 13125;
    rendimientos.push({
      id: uuid(), cuenta_id: cuentaMap['CetesDirecto'],
      periodo: `${y}-${String(m + mo + 1).padStart(2,'0')}`,
      saldo_inicial: saldoInicial,
      saldo_final: saldoFinal,
      rendimiento_monto: 13125,
      rendimiento_pct: (13125 / saldoInicial) * 100,
      fecha: d(mo, 28),
    });
  }

  // GBM+ rendimientos
  for (let mo = -2; mo <= 0; mo++) {
    const saldoInicial = 770000 + (mo + 2) * 10000;
    const saldoFinal = saldoInicial + 5467;
    rendimientos.push({
      id: uuid(), cuenta_id: cuentaMap['GBM+'],
      periodo: `${y}-${String(m + mo + 1).padStart(2,'0')}`,
      saldo_inicial: saldoInicial,
      saldo_final: saldoFinal,
      rendimiento_monto: 5467,
      rendimiento_pct: (5467 / saldoInicial) * 100,
      fecha: d(mo, 25),
    });
  }

  // ETF VOO rendimientos
  for (let mo = -2; mo <= 0; mo++) {
    const saldoInicial = 24000 + (mo + 2) * 500;
    const saldoFinal = saldoInicial + 250;
    rendimientos.push({
      id: uuid(), cuenta_id: cuentaMap['ETF VOO'],
      periodo: `${y}-${String(m + mo + 1).padStart(2,'0')}`,
      saldo_inicial: saldoInicial,
      saldo_final: saldoFinal,
      rendimiento_monto: 250,
      rendimiento_pct: (250 / saldoInicial) * 100,
      fecha: d(mo, 15),
    });
  }

  var prestamos = [
    {
      id: uuid(), tipo: 'otorgado', persona: 'Carlos Martinez',
      monto_original: 50000, moneda: 'MXN', tasa_interes: 0,
      fecha_inicio: d(-2, 1), fecha_vencimiento: d(4, 1),
      saldo_pendiente: 35000,
      pagos: [{ id: uuid(), fecha: d(-1, 15), monto: 15000, notas: 'Primer abono' }],
      estado: 'activo', cuenta_id: cuentaMap['BBVA Nomina'],
      notas: 'Prestamo personal sin intereses', created: d(-2, 1),
    },
    {
      id: uuid(), tipo: 'recibido', persona: 'Banco BBVA',
      monto_original: 200000, moneda: 'MXN', tasa_interes: 12.5,
      fecha_inicio: d(-6, 1), fecha_vencimiento: d(6, 1),
      saldo_pendiente: 160000,
      pagos: [
        { id: uuid(), fecha: d(-5, 1), monto: 10000, notas: 'Pago mensual' },
        { id: uuid(), fecha: d(-4, 1), monto: 10000, notas: 'Pago mensual' },
        { id: uuid(), fecha: d(-3, 1), monto: 10000, notas: 'Pago mensual' },
        { id: uuid(), fecha: d(-2, 1), monto: 10000, notas: 'Pago mensual' },
      ],
      estado: 'activo', cuenta_id: null,
      notas: 'Credito personal BBVA 12.5% anual', created: d(-6, 1),
    },
  ];

  var propiedades = [
    {
      id: uuid(), nombre: 'Depto Santa Fe', tipo: 'preventa',
      ubicacion: 'Santa Fe, CDMX', valor_compra: 5500000, valor_actual: 5800000,
      moneda: 'MXN', enganche: 1100000, monto_mensualidad: 45000,
      mensualidades_total: 36, mensualidades_pagadas: 12,
      fecha_inicio: d(-12, 1), fecha_entrega: d(24, 1),
      renta_mensual: 0, ocupada: false, gastos_mantenimiento: 0,
      valor_venta_estimado: 6500000,
      historial_valor: [
        { fecha: d(-6, 1), valor: 5600000 },
        { fecha: d(0, 1), valor: 5800000 },
      ],
      notas: 'Preventa torre 2, piso 8', created: d(-12, 1),
    },
    {
      id: uuid(), nombre: 'Casa Cuernavaca', tipo: 'terminada',
      ubicacion: 'Cuernavaca, Morelos', valor_compra: 3800000, valor_actual: 4200000,
      moneda: 'MXN', enganche: 0, monto_mensualidad: 0,
      mensualidades_total: 0, mensualidades_pagadas: 0,
      fecha_inicio: d(-24, 1), fecha_entrega: '',
      renta_mensual: 25000, ocupada: true, gastos_mantenimiento: 60000,
      valor_venta_estimado: 4500000,
      historial_valor: [
        { fecha: d(-12, 1), valor: 3900000 },
        { fecha: d(-6, 1), valor: 4050000 },
        { fecha: d(0, 1), valor: 4200000 },
      ],
      notas: 'Casa en renta - Cuernavaca', created: d(-24, 1),
    },
    {
      id: uuid(), nombre: 'Local Comercial Reforma', tipo: 'terminada',
      ubicacion: 'Paseo de la Reforma, CDMX', valor_compra: 8500000, valor_actual: 9200000,
      moneda: 'MXN', enganche: 0, monto_mensualidad: 0,
      mensualidades_total: 0, mensualidades_pagadas: 0,
      fecha_inicio: d(-36, 1), fecha_entrega: '',
      renta_mensual: 55000, ocupada: true, gastos_mantenimiento: 120000,
      valor_venta_estimado: 10000000,
      historial_valor: [
        { fecha: d(-24, 1), valor: 8700000 },
        { fecha: d(-12, 1), valor: 9000000 },
        { fecha: d(0, 1), valor: 9200000 },
      ],
      notas: 'Local comercial en renta', created: d(-36, 1),
    },
  ];

  // -- Presupuestos mensuales por categoria --
  var presupuestos = [
    { categoria_id: catMap['Alimentacion'],             monto_mensual: 10000,  moneda: 'MXN' },
    { categoria_id: catMap['Transporte'],               monto_mensual: 5000,   moneda: 'MXN' },
    { categoria_id: catMap['Entretenimiento y viajes'], monto_mensual: 15000,  moneda: 'MXN' },
    { categoria_id: catMap['Salud'],                    monto_mensual: 8000,   moneda: 'MXN' },
  ];

  // -- Plantillas Recurrentes --
  var plantillas_recurrentes = [
    {
      id: uuid(), nombre: 'Renta Polanco', tipo: 'ingreso', monto: 22000, moneda: 'MXN',
      cuenta_id: cuentaMap['BBVA Nomina'], categoria_id: catMap['Vivienda'],
      descripcion: 'Renta recibida - Depto Polanco',
      frecuencia: 'mensual', dia_periodo: 1, activa: true,
      ultima_aplicacion: d(-1, 1), created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'Renta Condesa', tipo: 'ingreso', monto: 18000, moneda: 'MXN',
      cuenta_id: cuentaMap['BBVA Nomina'], categoria_id: catMap['Vivienda'],
      descripcion: 'Renta recibida - Depto Condesa',
      frecuencia: 'mensual', dia_periodo: 1, activa: true,
      ultima_aplicacion: d(-1, 1), created: d(-3, 1),
    },
    {
      id: uuid(), nombre: 'Supermercado', tipo: 'gasto', monto: 8500, moneda: 'MXN',
      cuenta_id: cuentaMap['BBVA Nomina'], categoria_id: catMap['Alimentacion'],
      descripcion: 'Supermercado y restaurantes',
      frecuencia: 'mensual', dia_periodo: 5, activa: true,
      ultima_aplicacion: d(-1, 5), created: d(-3, 1),
    },
  ];

  // -- Metas Financieras --
  var metas = [
    {
      id: uuid(), nombre: 'Fondo de emergencia', categoria: 'ahorro',
      monto_objetivo: 500000, monto_actual: 320000, moneda: 'MXN',
      fecha_objetivo: d(12, 1), notas: '6 meses de gastos basicos', created: d(-6, 1),
    },
    {
      id: uuid(), nombre: 'Pago depto Santa Fe', categoria: 'compra',
      monto_objetivo: 5500000, monto_actual: 1640000, moneda: 'MXN',
      fecha_objetivo: d(24, 1), notas: 'Enganche y mensualidades restantes', created: d(-12, 1),
    },
    {
      id: uuid(), nombre: 'Retiro anticipado', categoria: 'inversion',
      monto_objetivo: 15000000, monto_actual: 10600000, moneda: 'MXN',
      fecha_objetivo: d(60, 1), notas: 'Meta de independencia financiera', created: d(-24, 1),
    },
  ];

  var historial_patrimonio = [
    { id: uuid(), fecha: (y - 5) + '-01-01', valor: 3200000, notas: 'Inicio registro' },
    { id: uuid(), fecha: (y - 4) + '-01-01', valor: 4100000, notas: '' },
    { id: uuid(), fecha: (y - 3) + '-01-01', valor: 5500000, notas: '' },
    { id: uuid(), fecha: (y - 2) + '-01-01', valor: 7200000, notas: '' },
    { id: uuid(), fecha: (y - 1) + '-01-01', valor: 8900000, notas: '' },
    { id: uuid(), fecha: y + '-01-01', valor: 10600000, notas: 'Valor actual estimado' },
  ];

  return {
    config: getDefaultConfig(),
    categorias_gasto: categorias,
    instituciones: instituciones,
    tipos_cambio: getDefaultTiposCambio(),
    cuentas: cuentas,
    movimientos: movimientos,
    rendimientos: rendimientos,
    transferencias: transferencias,
    prestamos: prestamos,
    propiedades: propiedades,
    historial_patrimonio: historial_patrimonio,
    presupuestos: presupuestos,
    plantillas_recurrentes: plantillas_recurrentes,
    metas: metas,
  };
}
