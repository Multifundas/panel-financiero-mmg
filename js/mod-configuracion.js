function renderConfiguracion() {
  const el = document.getElementById('module-configuracion');
  const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || getDefaultTiposCambio();
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];

  const categoriasRows = categorias.map(c => `
    <tr id="cat-row-${c.id}">
      <td>
        <span id="cat-display-${c.id}">
          <i class="fas ${c.icono}" style="margin-right:8px;color:${c.color || 'var(--text-muted)'}"></i>
          ${c.nombre}
        </span>
        <input type="text" id="cat-edit-${c.id}" class="form-input" value="${c.nombre}" style="display:none;width:auto;max-width:200px;">
      </td>
      <td style="text-align:center;">
        <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;margin-right:4px;" onclick="toggleEditCategoria('${c.id}')" title="Editar" id="cat-btn-edit-${c.id}">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:4px;display:none;" onclick="saveCategoria('${c.id}')" id="cat-btn-save-${c.id}">
          <i class="fas fa-check"></i>
        </button>
        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="deleteCategoria('${c.id}')" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  const institucionesRows = instituciones.map(inst => `
    <tr id="inst-row-${inst.id}">
      <td>
        <span id="inst-display-${inst.id}">${inst.nombre}</span>
        <input type="text" id="inst-edit-${inst.id}" class="form-input" value="${inst.nombre}" style="display:none;width:auto;max-width:200px;">
      </td>
      <td style="text-align:center;">
        <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;margin-right:4px;" onclick="toggleEditInstitucion('${inst.id}')" title="Editar" id="inst-btn-edit-${inst.id}">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:4px;display:none;" onclick="saveInstitucion('${inst.id}')" id="inst-btn-save-${inst.id}">
          <i class="fas fa-check"></i>
        </button>
        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="deleteInstitucion('${inst.id}')" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <!-- Moneda Base -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-coins" style="margin-right:8px;color:var(--accent-amber);"></i>Moneda Base</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div class="form-group" style="margin-bottom:0;min-width:160px;">
          <label style="margin-bottom:6px;display:block;color:var(--text-muted);font-size:13px;">Moneda principal para mostrar totales</label>
          <select id="cfgMonedaBase" class="form-select" onchange="saveMonedaBase()">
            <option value="MXN" ${config.moneda_base === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
            <option value="USD" ${config.moneda_base === 'USD' ? 'selected' : ''}>USD - Dolar Estadounidense</option>
            <option value="EUR" ${config.moneda_base === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tasa de Inflacion de Referencia -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-chart-bar" style="margin-right:8px;color:var(--accent-red);"></i>Tasa de Inflacion de Referencia</span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;">
        <div class="form-group" style="margin-bottom:0;min-width:180px;">
          <label style="margin-bottom:6px;display:block;color:var(--text-muted);font-size:13px;">Inflacion anual (%)</label>
          <input type="number" id="cfgInflacionAnual" class="form-input" style="width:160px;" value="${config.inflacion_anual != null ? config.inflacion_anual : 4.5}" step="0.1" min="0" placeholder="4.5">
        </div>
        <button class="btn btn-primary" onclick="saveInflacionAnual()">
          <i class="fas fa-save" style="margin-right:6px;"></i>Guardar
        </button>
      </div>
      <p style="margin-top:10px;font-size:12px;color:var(--text-muted);">Se usa para calcular rendimiento real en el modulo de Rendimientos.</p>
    </div>

    <!-- Tema -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-palette" style="margin-right:8px;color:var(--accent-purple);"></i>Tema</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="color:var(--text-secondary);font-size:13px;">Modo actual: <strong id="cfgThemeLabel">${config.theme === 'light' ? 'Claro' : 'Oscuro'}</strong></span>
        <button class="btn btn-secondary" onclick="toggleTheme()">
          <i class="fas ${config.theme === 'light' ? 'fa-moon' : 'fa-sun'}"></i> Cambiar a ${config.theme === 'light' ? 'Oscuro' : 'Claro'}
        </button>
      </div>
    </div>

    <!-- Tipos de Cambio -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-exchange-alt" style="margin-right:8px;color:var(--accent-blue);"></i>Tipos de Cambio</span>
        ${config.ultima_actualizacion_tc ? '<span class="badge" style="background:rgba(16,185,129,0.12);color:var(--accent-green);font-size:11px;padding:4px 10px;border-radius:12px;font-weight:600;margin-left:auto;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Actualizado: ' + formatTCTimestamp(config.ultima_actualizacion_tc) + '</span>' : ''}
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Par</th>
              <th style="text-align:right;">Tasa</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600;color:var(--text-primary);">USD / MXN</td>
              <td style="text-align:right;">
                <input type="number" id="cfgUsdMxn" class="form-input" style="width:120px;text-align:right;display:inline-block;" value="${tiposCambio.USD_MXN || 17.50}" step="0.01" min="0">
              </td>
            </tr>
            <tr>
              <td style="font-weight:600;color:var(--text-primary);">EUR / MXN</td>
              <td style="text-align:right;">
                <input type="number" id="cfgEurMxn" class="form-input" style="width:120px;text-align:right;display:inline-block;" value="${tiposCambio.EUR_MXN || 19.20}" step="0.01" min="0">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="saveTiposCambio()">
          <i class="fas fa-save" style="margin-right:6px;"></i>Guardar Tipos de Cambio
        </button>
        <button class="btn btn-secondary" id="btnActualizarTC" onclick="actualizarTiposCambio()">
          <i class="fas fa-globe" style="margin-right:6px;"></i>Actualizar desde Internet
        </button>
      </div>
      <div id="tcFetchStatus" style="margin-top:8px;min-height:18px;"></div>
      <p style="margin-top:6px;font-size:12px;color:var(--text-muted);">Puedes ingresar los valores manualmente o consultar las tasas actuales desde Internet (open.er-api.com).</p>
    </div>

    <!-- Categorias de Gasto -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-tags" style="margin-right:8px;color:var(--accent-green);"></i>Categorias de Gasto</span>
        <button class="btn btn-primary" style="padding:6px 12px;font-size:13px;" onclick="addCategoria()">
          <i class="fas fa-plus" style="margin-right:4px;"></i>Agregar
        </button>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" id="tablaCategorias">
          <thead>
            <tr>
              <th>Nombre</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${categoriasRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Instituciones -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-university" style="margin-right:8px;color:var(--accent-purple);"></i>Instituciones</span>
        <button class="btn btn-primary" style="padding:6px 12px;font-size:13px;" onclick="addInstitucion()">
          <i class="fas fa-plus" style="margin-right:4px;"></i>Agregar
        </button>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" id="tablaInstituciones">
          <thead>
            <tr>
              <th>Nombre</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${institucionesRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Supabase Auth Status -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-shield-alt" style="margin-right:8px;color:var(--accent-blue);"></i>Autenticacion</span>
      </div>
      ${typeof isSupabaseConfigured === 'function' && isSupabaseConfigured() ?
        '<p style="font-size:13px;color:var(--accent-green);"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Supabase conectado</p>' :
        '<p style="font-size:13px;color:var(--text-muted);"><i class="fas fa-info-circle" style="margin-right:6px;"></i>Autenticacion no configurada. Edita <code>js/supabase-config.js</code> con tu URL y clave de Supabase.</p>'
      }
    </div>

    <!-- Exportar / Importar Datos -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-file-export" style="margin-right:8px;color:var(--accent-amber);"></i>Exportar / Importar Datos</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="exportData()">
          <i class="fas fa-download" style="margin-right:6px;"></i>Exportar JSON
        </button>
        <label class="btn btn-secondary" style="cursor:pointer;">
          <i class="fas fa-upload" style="margin-right:6px;"></i>Importar JSON
          <input type="file" accept=".json" onchange="importData(event)" style="display:none;">
        </label>
      </div>
      <p style="margin-top:10px;font-size:12px;color:var(--text-muted);">Exporta todos tus datos en formato JSON para respaldo, o importa un archivo previamente exportado.</p>
    </div>

    <!-- Exportar Reportes -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-file-excel" style="margin-right:8px;color:var(--accent-green);"></i>Exportar Reportes</span>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Genera reportes en Excel (.xlsx) o PDF para analizar y compartir tu informacion financiera.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-secondary" onclick="exportarExcel('cuentas')">
          <i class="fas fa-university" style="margin-right:6px;"></i>Exportar Cuentas (Excel)
        </button>
        <button class="btn btn-secondary" onclick="exportarExcel('movimientos')">
          <i class="fas fa-exchange-alt" style="margin-right:6px;"></i>Exportar Movimientos (Excel)
        </button>
        <button class="btn btn-secondary" onclick="exportarExcel('rendimientos')">
          <i class="fas fa-chart-line" style="margin-right:6px;"></i>Exportar Rendimientos (Excel)
        </button>
        <button class="btn btn-primary" onclick="exportarExcel('completo')">
          <i class="fas fa-file-excel" style="margin-right:6px;"></i>Exportar Reporte Completo (Excel)
        </button>
        <button class="btn btn-primary" onclick="exportarPDF()" style="background:var(--accent-red);border-color:var(--accent-red);">
          <i class="fas fa-file-pdf" style="margin-right:6px;"></i>Exportar Reporte PDF
        </button>
      </div>
    </div>

    <!-- Respaldo de Datos -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-shield-alt" style="margin-right:8px;color:var(--accent-green);"></i>Respaldo de Datos</span>
      </div>
      ${getRespaldoIndicadorHTML()}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px;">
        <!-- Exportar -->
        <div style="padding:16px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-color);">
          <h4 style="margin:0 0 8px 0;font-size:14px;color:var(--text-primary);"><i class="fas fa-download" style="margin-right:6px;color:var(--accent-blue);"></i>Exportar Respaldo</h4>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Descarga una copia completa de todos tus datos en formato JSON.</p>
          <button class="btn btn-primary" onclick="exportarRespaldo()">
            <i class="fas fa-download" style="margin-right:6px;"></i>Exportar Respaldo JSON
          </button>
        </div>
        <!-- Importar -->
        <div style="padding:16px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-color);">
          <h4 style="margin:0 0 8px 0;font-size:14px;color:var(--text-primary);"><i class="fas fa-upload" style="margin-right:6px;color:var(--accent-amber);"></i>Importar Respaldo</h4>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Restaura tus datos desde un archivo de respaldo previamente exportado.</p>
          <label class="btn btn-secondary" style="cursor:pointer;">
            <i class="fas fa-file-import" style="margin-right:6px;"></i>Seleccionar Archivo JSON
            <input type="file" accept=".json" onchange="importarRespaldo(event)" style="display:none;">
          </label>
        </div>
      </div>
      <div style="margin-top:14px;padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;">
        <p style="margin:0;font-size:12px;color:var(--accent-red);"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i><strong>Advertencia:</strong> Al importar un respaldo se reemplazaran todos los datos actuales. Asegurate de exportar un respaldo antes de importar.</p>
      </div>
    </div>

    <!-- Datos de Ejemplo -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-database" style="margin-right:8px;color:var(--accent-blue);"></i>Datos de Ejemplo</span>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Reinicia todos los datos a los valores de ejemplo predeterminados. Util para pruebas o para empezar de nuevo con datos de muestra.</p>
      <button class="btn btn-secondary" onclick="resetSampleData()">
        <i class="fas fa-undo" style="margin-right:6px;"></i>Restaurar Datos de Ejemplo
      </button>
    </div>

    <!-- Borrar Todo -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-exclamation-triangle" style="margin-right:8px;color:var(--accent-red);"></i>Borrar Todo</span>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Elimina permanentemente todos los datos almacenados. Esta accion no se puede deshacer.</p>
      <button class="btn btn-danger" onclick="clearAllData()">
        <i class="fas fa-trash" style="margin-right:6px;"></i>Borrar Todos los Datos
      </button>
    </div>

    <!-- Acerca de -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-info-circle" style="margin-right:8px;color:var(--accent-blue);"></i>Acerca de</span>
      </div>
      <div style="text-align:center;padding:20px 0;">
        <h2 style="color:var(--text-primary);margin-bottom:8px;font-size:22px;">Panel Financiero</h2>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:4px;">Version 1.0</p>
        <p style="color:var(--text-secondary);font-size:13px;max-width:400px;margin:12px auto 0;">Herramienta de gestion financiera personal para administrar cuentas, inversiones, gastos y rendimientos en multiples monedas.</p>
      </div>
    </div>
  `;
}

/* -- Configuracion: Moneda Base -- */
function saveMonedaBase() {
  const select = document.getElementById('cfgMonedaBase');
  const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  config.moneda_base = select.value;
  saveData(STORAGE_KEYS.config, config);
  updateHeaderPatrimonio();
  showToast('Moneda base actualizada a ' + select.value);
}

/* -- Configuracion: Inflacion Anual -- */
function saveInflacionAnual() {
  const input = document.getElementById('cfgInflacionAnual');
  const valor = parseFloat(input.value);
  if (isNaN(valor) || valor < 0) {
    showToast('Ingresa un valor valido mayor o igual a 0', 'error');
    return;
  }
  const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  config.inflacion_anual = valor;
  saveData(STORAGE_KEYS.config, config);
  showToast('Tasa de inflacion actualizada a ' + valor + '%');
}

/* -- Configuracion: Tipos de Cambio -- */
function saveTiposCambio() {
  const usd = parseFloat(document.getElementById('cfgUsdMxn').value);
  const eur = parseFloat(document.getElementById('cfgEurMxn').value);
  if (isNaN(usd) || usd <= 0 || isNaN(eur) || eur <= 0) {
    showToast('Ingresa valores validos mayores a 0', 'error');
    return;
  }
  const tiposCambio = { USD_MXN: usd, EUR_MXN: eur };
  saveData(STORAGE_KEYS.tipos_cambio, tiposCambio);
  // Save manual update timestamp
  const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  config.ultima_actualizacion_tc = new Date().toISOString();
  saveData(STORAGE_KEYS.config, config);
  updateHeaderPatrimonio();
  showToast('Tipos de cambio actualizados');
  renderConfiguracion();
}

/* -- Configuracion: Actualizar Tipos de Cambio desde Internet -- */
async function actualizarTiposCambio() {
  const btn = document.getElementById('btnActualizarTC');
  const statusEl = document.getElementById('tcFetchStatus');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Consultando...';
  }
  if (statusEl) {
    statusEl.innerHTML = '<span style="color:var(--text-muted);font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:4px;"></i>Obteniendo tipos de cambio...</span>';
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/MXN');
    if (!response.ok) throw new Error('Error en la respuesta: ' + response.status);
    const data = await response.json();

    if (data.result !== 'success' || !data.rates) {
      throw new Error('Respuesta inesperada de la API');
    }

    // The API returns rates FROM MXN, so 1 MXN = X USD
    // We need USD_MXN = how many MXN per 1 USD, so we invert
    const usdRate = data.rates.USD;
    const eurRate = data.rates.EUR;

    if (!usdRate || !eurRate || usdRate <= 0 || eurRate <= 0) {
      throw new Error('Tasas no disponibles en la respuesta');
    }

    const USD_MXN = parseFloat((1 / usdRate).toFixed(4));
    const EUR_MXN = parseFloat((1 / eurRate).toFixed(4));

    // Save exchange rates
    const tiposCambio = { USD_MXN: USD_MXN, EUR_MXN: EUR_MXN };
    saveData(STORAGE_KEYS.tipos_cambio, tiposCambio);

    // Save update timestamp in config
    const config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
    config.ultima_actualizacion_tc = new Date().toISOString();
    saveData(STORAGE_KEYS.config, config);

    updateHeaderPatrimonio();
    showToast('Tipos de cambio actualizados desde Internet: USD/MXN = ' + USD_MXN + ', EUR/MXN = ' + EUR_MXN);
    renderConfiguracion();
  } catch (err) {
    console.error('Error al actualizar tipos de cambio:', err);
    showToast('No se pudieron obtener los tipos de cambio: ' + err.message + '. Usa los campos manuales.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-globe" style="margin-right:6px;"></i>Actualizar desde Internet';
    }
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:var(--accent-red);font-size:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>Error al consultar. Ingresa los valores manualmente.</span>';
    }
  }
}

/** Format the ultima_actualizacion_tc timestamp for display */
function formatTCTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) {
    return '';
  }
}

/* -- Configuracion: Categorias CRUD -- */
function addCategoria() {
  const nombre = prompt('Nombre de la nueva categoria:');
  if (!nombre || !nombre.trim()) return;
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  categorias.push({
    id: uuid(),
    nombre: nombre.trim(),
    icono: 'fa-tag',
    color: '#94a3b8',
  });
  saveData(STORAGE_KEYS.categorias_gasto, categorias);
  showToast('Categoria agregada');
  renderConfiguracion();
}

function toggleEditCategoria(id) {
  const display = document.getElementById('cat-display-' + id);
  const input = document.getElementById('cat-edit-' + id);
  const btnEdit = document.getElementById('cat-btn-edit-' + id);
  const btnSave = document.getElementById('cat-btn-save-' + id);
  display.style.display = 'none';
  input.style.display = 'inline-block';
  btnEdit.style.display = 'none';
  btnSave.style.display = 'inline-block';
  input.focus();
}

function saveCategoria(id) {
  const input = document.getElementById('cat-edit-' + id);
  const nombre = input.value.trim();
  if (!nombre) {
    showToast('El nombre no puede estar vacio', 'error');
    return;
  }
  const categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  const cat = categorias.find(c => c.id === id);
  if (cat) {
    cat.nombre = nombre;
    saveData(STORAGE_KEYS.categorias_gasto, categorias);
    showToast('Categoria actualizada');
    renderConfiguracion();
  }
}

function deleteCategoria(id) {
  if (!confirm('\u00BFEstas seguro de eliminar esta categoria?')) return;
  let categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  categorias = categorias.filter(c => c.id !== id);
  saveData(STORAGE_KEYS.categorias_gasto, categorias);
  showToast('Categoria eliminada');
  renderConfiguracion();
}

/* -- Configuracion: Instituciones CRUD -- */
function addInstitucion() {
  const nombre = prompt('Nombre de la nueva institucion:');
  if (!nombre || !nombre.trim()) return;
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  instituciones.push({
    id: uuid(),
    nombre: nombre.trim(),
    tipo: 'otro',
  });
  saveData(STORAGE_KEYS.instituciones, instituciones);
  showToast('Institucion agregada');
  renderConfiguracion();
}

function toggleEditInstitucion(id) {
  const display = document.getElementById('inst-display-' + id);
  const input = document.getElementById('inst-edit-' + id);
  const btnEdit = document.getElementById('inst-btn-edit-' + id);
  const btnSave = document.getElementById('inst-btn-save-' + id);
  display.style.display = 'none';
  input.style.display = 'inline-block';
  btnEdit.style.display = 'none';
  btnSave.style.display = 'inline-block';
  input.focus();
}

function saveInstitucion(id) {
  const input = document.getElementById('inst-edit-' + id);
  const nombre = input.value.trim();
  if (!nombre) {
    showToast('El nombre no puede estar vacio', 'error');
    return;
  }
  const instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  const inst = instituciones.find(i => i.id === id);
  if (inst) {
    inst.nombre = nombre;
    saveData(STORAGE_KEYS.instituciones, instituciones);
    showToast('Institucion actualizada');
    renderConfiguracion();
  }
}

function deleteInstitucion(id) {
  if (!confirm('\u00BFEstas seguro de eliminar esta institucion?')) return;
  let instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  instituciones = instituciones.filter(i => i.id !== id);
  saveData(STORAGE_KEYS.instituciones, instituciones);
  showToast('Institucion eliminada');
  renderConfiguracion();
}

/* -- Configuracion: Exportar / Importar -- */
function exportData() {
  const store = {};
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    store[name] = loadData(key);
  }
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'panel_financiero_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Datos exportados correctamente');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('\u00BFDeseas importar este archivo? Se reemplazaran todos los datos actuales.')) {
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const store = JSON.parse(e.target.result);
      for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (store[name] !== undefined) {
          saveData(key, store[name]);
        }
      }
      showToast('Datos importados correctamente. Recargando...');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

/* -- Configuracion: Datos de Ejemplo -- */
function resetSampleData() {
  if (!confirm('\u00BFDeseas restaurar los datos de ejemplo?')) return;
  if (!confirm('ESTA ACCION BORRARA TODOS TUS DATOS ACTUALES. \u00BFEstas completamente seguro?')) return;
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
  saveData(STORAGE_KEYS.metas,               sampleData.metas);
  showToast('Datos de ejemplo restaurados. Recargando...');
  setTimeout(() => location.reload(), 1000);
}

/* -- Configuracion: Borrar Todo -- */
function clearAllData() {
  if (!confirm('\u00BFDeseas borrar TODOS los datos?')) return;
  if (!confirm('ESTA ACCION ES IRREVERSIBLE. Se eliminaran todas las cuentas, movimientos, rendimientos y configuraciones. \u00BFContinuar?')) return;
  for (const key of Object.values(STORAGE_KEYS)) {
    _dataCache[key] = undefined;
  }
  clearAllSupabaseData().then(function() {
    showToast('Todos los datos han sido eliminados. Recargando...');
    setTimeout(() => location.reload(), 1000);
  });
}

/* ============================================================
   RESPALDO DE DATOS  -  Export / Import JSON with metadata
   ============================================================ */

/**
 * Calculate approximate localStorage usage in bytes for all STORAGE_KEYS.
 */
function calcularTamanoLocalStorage() {
  return typeof calcularTamanoCache === 'function' ? calcularTamanoCache() : 0;
}

/**
 * Format bytes into a human-readable string.
 */
function formatearTamano(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Build the HTML for the backup status indicator (last backup date, data size, warning badge).
 */
function getRespaldoIndicadorHTML() {
  var config = loadData(STORAGE_KEYS.config) || {};
  var ultimoRespaldo = config.ultima_respaldo || null;
  var tamano = calcularTamanoLocalStorage();

  var fechaTexto = 'Nunca';
  var badgeHTML = '';
  var diasDesdeRespaldo = Infinity;

  if (ultimoRespaldo) {
    var fechaRespaldo = new Date(ultimoRespaldo);
    var ahora = new Date();
    diasDesdeRespaldo = Math.floor((ahora - fechaRespaldo) / (1000 * 60 * 60 * 24));
    fechaTexto = fechaRespaldo.toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  if (diasDesdeRespaldo > 30) {
    badgeHTML = '<span class="badge" style="background:var(--accent-red);color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;margin-left:8px;"><i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>Sin respaldo en 30+ dias</span>';
  } else if (diasDesdeRespaldo > 14) {
    badgeHTML = '<span class="badge" style="background:var(--accent-amber);color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;margin-left:8px;"><i class="fas fa-clock" style="margin-right:4px;"></i>Respaldo hace ' + diasDesdeRespaldo + ' dias</span>';
  } else {
    badgeHTML = '<span class="badge" style="background:var(--accent-green);color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;margin-left:8px;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Respaldo reciente</span>';
  }

  return '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 16px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-color);">'
    + '<div style="flex:1;min-width:200px;">'
    + '<span style="font-size:12px;color:var(--text-muted);">Ultimo respaldo manual:</span>'
    + '<span style="font-size:13px;color:var(--text-primary);font-weight:600;margin-left:6px;">' + fechaTexto + '</span>'
    + badgeHTML
    + '</div>'
    + '<div>'
    + '<span style="font-size:12px;color:var(--text-muted);"><i class="fas fa-database" style="margin-right:4px;"></i>Tamano de datos:</span>'
    + '<span style="font-size:13px;color:var(--text-primary);font-weight:600;margin-left:6px;">' + formatearTamano(tamano) + '</span>'
    + '</div>'
    + '</div>';
}

/**
 * Export all app data as a JSON file with metadata.
 */
function exportarRespaldo() {
  try {
    var allData = loadAll();
    var respaldo = {
      version: '1.0',
      fecha: new Date().toISOString(),
      datos: allData,
    };

    var jsonStr = JSON.stringify(respaldo, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var hoy = new Date().toISOString().slice(0, 10);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Panel_Financiero_Respaldo_' + hoy + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update last backup timestamp in config
    var config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
    config.ultima_respaldo = new Date().toISOString();
    saveData(STORAGE_KEYS.config, config);

    showToast('Respaldo exportado correctamente');
    // Re-render to update the backup indicator
    renderConfiguracion();
  } catch (err) {
    showToast('Error al exportar respaldo: ' + err.message, 'error');
  }
}

/**
 * Import a JSON backup file. Validates structure and shows a preview modal.
 */
function importarRespaldo(event) {
  var file = event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.json')) {
    showToast('El archivo debe ser de tipo .json', 'error');
    event.target.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onerror = function() {
    showToast('Error al leer el archivo', 'error');
    event.target.value = '';
  };

  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);

      // Validate required structure
      if (!data.version || !data.datos) {
        showToast('Archivo invalido: debe contener campos "version" y "datos"', 'error');
        event.target.value = '';
        return;
      }

      // Build preview summary
      var d = data.datos;
      var conteos = [];
      if (d.cuentas && d.cuentas.length) conteos.push(d.cuentas.length + ' cuentas');
      if (d.movimientos && d.movimientos.length) conteos.push(d.movimientos.length + ' movimientos');
      if (d.rendimientos && d.rendimientos.length) conteos.push(d.rendimientos.length + ' rendimientos');
      if (d.transferencias && d.transferencias.length) conteos.push(d.transferencias.length + ' transferencias');
      if (d.prestamos && d.prestamos.length) conteos.push(d.prestamos.length + ' prestamos');
      if (d.propiedades && d.propiedades.length) conteos.push(d.propiedades.length + ' propiedades');
      if (d.categorias_gasto && d.categorias_gasto.length) conteos.push(d.categorias_gasto.length + ' categorias');
      if (d.instituciones && d.instituciones.length) conteos.push(d.instituciones.length + ' instituciones');
      if (d.presupuestos && d.presupuestos.length) conteos.push(d.presupuestos.length + ' presupuestos');
      if (d.plantillas_recurrentes && d.plantillas_recurrentes.length) conteos.push(d.plantillas_recurrentes.length + ' plantillas recurrentes');
      if (d.metas && d.metas.length) conteos.push(d.metas.length + ' metas');
      if (d.historial_patrimonio && d.historial_patrimonio.length) conteos.push(d.historial_patrimonio.length + ' registros de patrimonio');

      var fechaRespaldo = data.fecha
        ? new Date(data.fecha).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })
        : 'Desconocida';

      var conteosHTML = conteos.length > 0
        ? conteos.map(function(c) { return '<li style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">' + c + '</li>'; }).join('')
        : '<li style="font-size:13px;color:var(--text-muted);">No se encontraron datos en el archivo</li>';

      var modalBody = ''
        + '<div style="padding:8px 0;">'
        + '  <div style="margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;">'
        + '    <p style="margin:0 0 6px 0;font-size:13px;color:var(--text-muted);">'
        + '      <i class="fas fa-info-circle" style="margin-right:6px;"></i>Version del respaldo: <strong style="color:var(--text-primary);">' + data.version + '</strong>'
        + '    </p>'
        + '    <p style="margin:0;font-size:13px;color:var(--text-muted);">'
        + '      <i class="fas fa-calendar" style="margin-right:6px;"></i>Fecha de exportacion: <strong style="color:var(--text-primary);">' + fechaRespaldo + '</strong>'
        + '    </p>'
        + '  </div>'
        + '  <h4 style="margin:0 0 10px 0;font-size:14px;color:var(--text-primary);">Se importaran:</h4>'
        + '  <ul style="margin:0 0 16px 0;padding-left:20px;">'
        + conteosHTML
        + '  </ul>'
        + '  <div style="padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;margin-bottom:16px;">'
        + '    <p style="margin:0;font-size:12px;color:var(--accent-red);"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i><strong>Atencion:</strong> Esta accion reemplazara TODOS los datos actuales con los datos del respaldo. Esta accion no se puede deshacer.</p>'
        + '  </div>'
        + '  <div style="display:flex;gap:10px;justify-content:flex-end;">'
        + '    <button class="btn btn-secondary" onclick="closeModal()">'
        + '      <i class="fas fa-times" style="margin-right:6px;"></i>Cancelar'
        + '    </button>'
        + '    <button class="btn btn-danger" onclick="confirmarImportacion()">'
        + '      <i class="fas fa-exchange-alt" style="margin-right:6px;"></i>Reemplazar todo'
        + '    </button>'
        + '  </div>'
        + '</div>';

      // Store the parsed data temporarily for confirmation
      window._respaldoPendiente = data;

      openModal('Importar Respaldo', modalBody);

    } catch (err) {
      showToast('Error al procesar el archivo: ' + err.message, 'error');
    }
    event.target.value = '';
  };

  reader.readAsText(file);
}

/**
 * Confirm and execute the import of backup data.
 * Called from the preview modal after user clicks "Reemplazar todo".
 */
function confirmarImportacion() {
  var data = window._respaldoPendiente;
  if (!data || !data.datos) {
    showToast('No hay datos pendientes de importar', 'error');
    closeModal();
    return;
  }

  try {
    saveAll(data.datos);

    // Update last backup timestamp to reflect the imported backup date
    var config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
    config.ultima_respaldo = data.fecha || new Date().toISOString();
    saveData(STORAGE_KEYS.config, config);

    window._respaldoPendiente = null;
    closeModal();
    showToast('Datos importados correctamente. Recargando...');
    setTimeout(function() { location.reload(); }, 1000);
  } catch (err) {
    showToast('Error al importar datos: ' + err.message, 'error');
  }
}

/* ============================================================
   EXPORTAR REPORTES - Excel (.xlsx) y PDF
   ============================================================ */

/**
 * Exportar datos a Excel (.xlsx) usando SheetJS (XLSX)
 * @param {string} tipo - 'cuentas' | 'movimientos' | 'rendimientos' | 'completo'
 */
function exportarExcel(tipo) {
  if (typeof XLSX === 'undefined') {
    showToast('La libreria XLSX no esta cargada. Verifica tu conexion a internet.', 'error');
    return;
  }

  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // Lookup maps
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });
  var catMap = {};
  categorias.forEach(function(c) { catMap[c.id] = c.nombre; });
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var wb = XLSX.utils.book_new();
  var fechaHoy = new Date().toISOString().slice(0, 10);

  // -- Helper: build Cuentas sheet data --
  function buildCuentasData() {
    return cuentas.map(function(c) {
      return {
        'Nombre': c.nombre,
        'Institucion': instMap[c.institucion_id] || '',
        'Tipo': c.tipo === 'debito' ? 'Debito' : c.tipo === 'inversion' ? 'Inversion' : c.tipo === 'inmueble' ? 'Inmueble' : c.tipo === 'activo_fijo' ? 'Activo Fijo' : c.tipo,
        'Moneda': c.moneda,
        'Saldo': c.saldo || 0,
        'Rendimiento Anual (%)': c.rendimiento_anual || 0,
        'Activa': c.activa !== false ? 'Si' : 'No',
      };
    });
  }

  // -- Helper: build Movimientos sheet data --
  function buildMovimientosData() {
    var sorted = movimientos.slice().sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    return sorted.map(function(m) {
      var cta = cuentaMap[m.cuenta_id];
      return {
        'Fecha': m.fecha ? m.fecha.substring(0, 10) : '',
        'Cuenta': cta ? cta.nombre : 'Desconocida',
        'Tipo': m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        'Monto': m.monto || 0,
        'Moneda': cta ? cta.moneda : (m.moneda || 'MXN'),
        'Categoria': m.categoria_id ? (catMap[m.categoria_id] || '') : '',
        'Descripcion': m.descripcion || '',
      };
    });
  }

  // -- Helper: build Rendimientos sheet data --
  function buildRendimientosData() {
    var sorted = rendimientos.slice().sort(function(a, b) { return (b.periodo || '').localeCompare(a.periodo || ''); });
    return sorted.map(function(r) {
      var cta = cuentaMap[r.cuenta_id];
      return {
        'Periodo': r.periodo || '',
        'Cuenta': cta ? cta.nombre : 'Desconocida',
        'Saldo Inicial': r.saldo_inicial || 0,
        'Saldo Final': r.saldo_final || 0,
        'Rendimiento': r.rendimiento_monto || 0,
        'Porcentaje (%)': r.rendimiento_pct ? Number(r.rendimiento_pct).toFixed(2) : '0.00',
      };
    });
  }

  // -- Helper: build Resumen sheet data --
  function buildResumenData() {
    var totalPatrimonio = 0;
    var totalInversiones = 0;
    var totalBancarias = 0;
    var totalInmuebles = 0;
    var totalActivosFijos = 0;

    cuentas.forEach(function(c) {
      if (c.activa === false) return;
      var valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
      totalPatrimonio += valMXN;
      if (c.tipo === 'inversion') totalInversiones += valMXN;
      else if (c.tipo === 'debito') totalBancarias += valMXN;
      else if (c.tipo === 'inmueble') totalInmuebles += valMXN;
      else if (c.tipo === 'activo_fijo') totalActivosFijos += valMXN;
    });

    var totalRendimientos = rendimientos.reduce(function(s, r) {
      var cta = cuentaMap[r.cuenta_id];
      return s + toMXN(r.rendimiento_monto, cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

    var totalIngresos = movimientos.filter(function(m) { return m.tipo === 'ingreso'; }).reduce(function(s, m) {
      var cta = cuentaMap[m.cuenta_id];
      return s + toMXN(m.monto, cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

    var totalGastos = movimientos.filter(function(m) { return m.tipo === 'gasto'; }).reduce(function(s, m) {
      var cta = cuentaMap[m.cuenta_id];
      return s + toMXN(m.monto, cta ? cta.moneda : 'MXN', tiposCambio);
    }, 0);

    return [
      { 'Concepto': 'Fecha del Reporte', 'Valor': fechaHoy },
      { 'Concepto': '', 'Valor': '' },
      { 'Concepto': 'Patrimonio Total (MXN)', 'Valor': totalPatrimonio },
      { 'Concepto': 'Cuentas Bancarias (MXN)', 'Valor': totalBancarias },
      { 'Concepto': 'Inversiones (MXN)', 'Valor': totalInversiones },
      { 'Concepto': 'Inmuebles (MXN)', 'Valor': totalInmuebles },
      { 'Concepto': 'Activos Fijos (MXN)', 'Valor': totalActivosFijos },
      { 'Concepto': '', 'Valor': '' },
      { 'Concepto': 'Total Ingresos (MXN)', 'Valor': totalIngresos },
      { 'Concepto': 'Total Gastos (MXN)', 'Valor': totalGastos },
      { 'Concepto': 'Balance Neto (MXN)', 'Valor': totalIngresos - totalGastos },
      { 'Concepto': '', 'Valor': '' },
      { 'Concepto': 'Rendimientos Totales (MXN)', 'Valor': totalRendimientos },
      { 'Concepto': '', 'Valor': '' },
      { 'Concepto': 'Numero de Cuentas', 'Valor': cuentas.filter(function(c) { return c.activa !== false; }).length },
      { 'Concepto': 'Numero de Movimientos', 'Valor': movimientos.length },
      { 'Concepto': 'Numero de Rendimientos', 'Valor': rendimientos.length },
    ];
  }

  // -- Helper: set column widths --
  function autoWidth(ws, data) {
    if (!data || data.length === 0) return;
    var keys = Object.keys(data[0]);
    ws['!cols'] = keys.map(function(k) {
      var maxLen = k.length;
      data.forEach(function(row) {
        var val = String(row[k] || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(maxLen + 2, 40) };
    });
  }

  if (tipo === 'cuentas') {
    var dataCuentas = buildCuentasData();
    var wsCuentas = XLSX.utils.json_to_sheet(dataCuentas);
    autoWidth(wsCuentas, dataCuentas);
    XLSX.utils.book_append_sheet(wb, wsCuentas, 'Cuentas');
  } else if (tipo === 'movimientos') {
    var dataMov = buildMovimientosData();
    var wsMov = XLSX.utils.json_to_sheet(dataMov);
    autoWidth(wsMov, dataMov);
    XLSX.utils.book_append_sheet(wb, wsMov, 'Movimientos');
  } else if (tipo === 'rendimientos') {
    var dataRend = buildRendimientosData();
    var wsRend = XLSX.utils.json_to_sheet(dataRend);
    autoWidth(wsRend, dataRend);
    XLSX.utils.book_append_sheet(wb, wsRend, 'Rendimientos');
  } else if (tipo === 'completo') {
    // Resumen
    var resumenData = buildResumenData();
    var wsResumen = XLSX.utils.json_to_sheet(resumenData);
    autoWidth(wsResumen, resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    // Cuentas
    var cuentasData = buildCuentasData();
    var wsCuentasC = XLSX.utils.json_to_sheet(cuentasData);
    autoWidth(wsCuentasC, cuentasData);
    XLSX.utils.book_append_sheet(wb, wsCuentasC, 'Cuentas');
    // Movimientos
    var movData = buildMovimientosData();
    var wsMovC = XLSX.utils.json_to_sheet(movData);
    autoWidth(wsMovC, movData);
    XLSX.utils.book_append_sheet(wb, wsMovC, 'Movimientos');
    // Rendimientos
    var rendData = buildRendimientosData();
    var wsRendC = XLSX.utils.json_to_sheet(rendData);
    autoWidth(wsRendC, rendData);
    XLSX.utils.book_append_sheet(wb, wsRendC, 'Rendimientos');
  }

  var filename = 'Panel_Financiero_' + tipo + '_' + fechaHoy + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('Archivo ' + filename + ' descargado exitosamente.');
}

/**
 * Exportar reporte en formato PDF (genera ventana HTML imprimible)
 */
function exportarPDF() {
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var instituciones = loadData(STORAGE_KEYS.instituciones) || [];
  var categorias = loadData(STORAGE_KEYS.categorias_gasto) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // Lookup maps
  var instMap = {};
  instituciones.forEach(function(i) { instMap[i.id] = i.nombre; });
  var catMap = {};
  categorias.forEach(function(c) { catMap[c.id] = c.nombre; });
  var cuentaMap = {};
  cuentas.forEach(function(c) { cuentaMap[c.id] = c; });

  var fechaHoy = new Date().toISOString().slice(0, 10);

  // Calculate totals
  var totalPatrimonio = 0;
  var totalInversiones = 0;
  var totalBancarias = 0;
  var totalInmuebles = 0;
  var totalActivosFijos = 0;

  cuentas.forEach(function(c) {
    if (c.activa === false) return;
    var valMXN = toMXN(c.saldo, c.moneda, tiposCambio);
    totalPatrimonio += valMXN;
    if (c.tipo === 'inversion') totalInversiones += valMXN;
    else if (c.tipo === 'debito') totalBancarias += valMXN;
    else if (c.tipo === 'inmueble') totalInmuebles += valMXN;
    else if (c.tipo === 'activo_fijo') totalActivosFijos += valMXN;
  });

  // Recent movements (last 20)
  var recentMov = movimientos.slice()
    .sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); })
    .slice(0, 20);

  var movTableRows = recentMov.map(function(m) {
    var cta = cuentaMap[m.cuenta_id];
    var ctaNombre = cta ? cta.nombre : 'Desconocida';
    var moneda = cta ? cta.moneda : 'MXN';
    var tipoLabel = m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
    var signo = m.tipo === 'ingreso' ? '+' : '-';
    var color = m.tipo === 'ingreso' ? '#16a34a' : '#dc2626';
    return '<tr>' +
      '<td>' + (m.fecha ? m.fecha.substring(0, 10) : '') + '</td>' +
      '<td>' + (m.descripcion || '') + '</td>' +
      '<td>' + ctaNombre + '</td>' +
      '<td>' + tipoLabel + '</td>' +
      '<td style="text-align:right;color:' + color + ';font-weight:600;">' + signo + formatCurrency(m.monto, moneda) + '</td>' +
      '</tr>';
  }).join('');

  // Cuentas table
  var cuentasActivas = cuentas.filter(function(c) { return c.activa !== false; });
  var cuentasTableRows = cuentasActivas.map(function(c) {
    var tipoLabel = c.tipo === 'debito' ? 'Debito' : c.tipo === 'inversion' ? 'Inversion' : c.tipo === 'inmueble' ? 'Inmueble' : c.tipo === 'activo_fijo' ? 'Activo Fijo' : c.tipo;
    return '<tr>' +
      '<td>' + c.nombre + '</td>' +
      '<td>' + (instMap[c.institucion_id] || '') + '</td>' +
      '<td>' + tipoLabel + '</td>' +
      '<td>' + c.moneda + '</td>' +
      '<td style="text-align:right;font-weight:600;">' + formatCurrency(c.saldo, c.moneda) + '</td>' +
      '<td style="text-align:right;">' + (c.rendimiento_anual ? c.rendimiento_anual.toFixed(2) + '%' : '-') + '</td>' +
      '</tr>';
  }).join('');

  // Rendimientos summary by account
  var rendByAccount = {};
  rendimientos.forEach(function(r) {
    var cta = cuentaMap[r.cuenta_id];
    var ctaNombre = cta ? cta.nombre : 'Desconocida';
    if (!rendByAccount[ctaNombre]) rendByAccount[ctaNombre] = { total: 0, count: 0 };
    rendByAccount[ctaNombre].total += toMXN(r.rendimiento_monto, cta ? cta.moneda : 'MXN', tiposCambio);
    rendByAccount[ctaNombre].count++;
  });

  var rendSummaryRows = Object.entries(rendByAccount).map(function(entry) {
    var nombre = entry[0];
    var data = entry[1];
    return '<tr>' +
      '<td>' + nombre + '</td>' +
      '<td style="text-align:right;">' + data.count + '</td>' +
      '<td style="text-align:right;font-weight:600;color:#16a34a;">' + formatCurrency(data.total, 'MXN') + '</td>' +
      '</tr>';
  }).join('');

  var totalRendimientos = Object.values(rendByAccount).reduce(function(s, d) { return s + d.total; }, 0);

  // Build the HTML document
  var htmlContent = '<!DOCTYPE html>' +
    '<html lang="es">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<title>Reporte Financiero - ' + fechaHoy + '</title>' +
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b;margin:0;padding:40px;background:#fff;font-size:13px;}' +
    'h1{font-size:24px;margin-bottom:4px;color:#0f172a;}' +
    'h2{font-size:16px;margin-top:32px;margin-bottom:12px;color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:6px;}' +
    '.subtitle{color:#64748b;font-size:13px;margin-bottom:24px;}' +
    '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}' +
    '.kpi-card{border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;}' +
    '.kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:6px;}' +
    '.kpi-value{font-size:20px;font-weight:800;color:#0f172a;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:20px;}' +
    'th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:2px solid #e2e8f0;}' +
    'td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;}' +
    'tr:nth-child(even){background:#f8fafc;}' +
    '.footer{margin-top:40px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:16px;}' +
    '@media print{body{padding:20px;}.no-print{display:none;}@page{margin:15mm;}}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="no-print" style="text-align:right;margin-bottom:16px;">' +
    '<button onclick="window.print()" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Imprimir / Guardar como PDF</button>' +
    '</div>' +
    '<h1>Reporte Financiero</h1>' +
    '<p class="subtitle">Generado el ' + fechaHoy + ' | Panel Financiero v1.0</p>' +
    '<div class="kpi-grid">' +
    '<div class="kpi-card"><div class="kpi-label">Patrimonio Total</div><div class="kpi-value">' + formatCurrency(totalPatrimonio, 'MXN') + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Cuentas Bancarias</div><div class="kpi-value">' + formatCurrency(totalBancarias, 'MXN') + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Inversiones</div><div class="kpi-value">' + formatCurrency(totalInversiones, 'MXN') + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Inmuebles</div><div class="kpi-value">' + formatCurrency(totalInmuebles, 'MXN') + '</div></div>' +
    '</div>' +
    '<h2>Resumen de Cuentas</h2>' +
    '<table>' +
    '<thead><tr><th>Nombre</th><th>Institucion</th><th>Tipo</th><th>Moneda</th><th style="text-align:right;">Saldo</th><th style="text-align:right;">Rendimiento %</th></tr></thead>' +
    '<tbody>' + cuentasTableRows + '</tbody>' +
    '</table>' +
    '<h2>Rendimientos por Cuenta</h2>' +
    '<table>' +
    '<thead><tr><th>Cuenta</th><th style="text-align:right;">Registros</th><th style="text-align:right;">Rendimiento Total (MXN)</th></tr></thead>' +
    '<tbody>' + rendSummaryRows +
    '<tr style="font-weight:700;border-top:2px solid #cbd5e1;"><td>Total</td><td></td><td style="text-align:right;color:#16a34a;">' + formatCurrency(totalRendimientos, 'MXN') + '</td></tr>' +
    '</tbody>' +
    '</table>' +
    '<h2>Movimientos Recientes (ultimos 20)</h2>' +
    '<table>' +
    '<thead><tr><th>Fecha</th><th>Descripcion</th><th>Cuenta</th><th>Tipo</th><th style="text-align:right;">Monto</th></tr></thead>' +
    '<tbody>' + movTableRows + '</tbody>' +
    '</table>' +
    '<div class="footer">Panel Financiero - Reporte generado automaticamente</div>' +
    '</body>' +
    '</html>';

  var printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
    };
    showToast('Reporte PDF generado. Usa "Guardar como PDF" en el dialogo de impresion.');
  } else {
    showToast('No se pudo abrir la ventana. Verifica que tu navegador permita ventanas emergentes.', 'error');
  }
}
