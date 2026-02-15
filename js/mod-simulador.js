/* ---------- Live Comma Formatting Helper ---------- */
function simFormatCommaInput(el) {
  var cursorPos = el.selectionStart;
  var raw = el.value.replace(/[^0-9.]/g, '');
  // Handle multiple dots - keep only the first
  var parts = raw.split('.');
  if (parts.length > 2) {
    raw = parts[0] + '.' + parts.slice(1).join('');
  }
  var intPart = parts[0];
  var decPart = parts.length > 1 ? '.' + parts[1] : '';
  // Add commas to integer part
  var formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decPart;
  // Calculate how many commas were added before cursor
  var oldLen = el.value.length;
  el.value = formatted;
  var newLen = formatted.length;
  var diff = newLen - oldLen;
  el.setSelectionRange(cursorPos + diff, cursorPos + diff);
}

function simParseCommaValue(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(el.value.replace(/,/g, '')) || 0;
}

function renderSimulador() {
  const el = document.getElementById('module-simulador');

  // -- Load data for pre-filling --
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  // Patrimonio total (active accounts in MXN)
  let patrimonioTotal = 0;
  cuentas.forEach(c => {
    if (c.activa !== false) {
      patrimonioTotal += toMXN(c.saldo, c.moneda, tiposCambio);
    }
  });

  // Average monthly gastos (last 3 months)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const gastosRecientes = movimientos.filter(mv => {
    return mv.tipo === 'gasto' && new Date(mv.fecha) >= threeMonthsAgo;
  });
  const totalGastos3m = gastosRecientes.reduce((s, mv) => s + toMXN(mv.monto, mv.moneda, tiposCambio), 0);
  const gastoMensualProm = gastosRecientes.length > 0 ? Math.round(totalGastos3m / 3) : 0;

  // Average monthly income (last 3 months)
  const ingresosRecientes = movimientos.filter(mv => {
    return mv.tipo === 'ingreso' && new Date(mv.fecha) >= threeMonthsAgo;
  });
  const totalIngresos3m = ingresosRecientes.reduce((s, mv) => s + toMXN(mv.monto, mv.moneda, tiposCambio), 0);
  const ingresoMensualProm = ingresosRecientes.length > 0 ? Math.round(totalIngresos3m / 3) : 0;

  // -- Average annual interest from last 12 months rendimientos (weighted by capital) --
  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const rend12 = rendimientos.filter(r => {
    if (!r.periodo) return false;
    var parts = r.periodo.split('-');
    var rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return rDate >= twelveMonthsAgo;
  });
  let sumCapTasa12 = 0;
  let sumCap12 = 0;
  rend12.forEach(r => {
    var cta = cuentaMap[r.cuenta_id];
    var capital = cta ? toMXN(cta.saldo, cta.moneda, tiposCambio) : 0;
    var tasa = r.rendimiento_pct || 0;
    if (capital > 0 && tasa > 0) {
      sumCapTasa12 += capital * tasa;
      sumCap12 += capital;
    }
  });
  // Annualize: rendimiento_pct in rendimientos is typically per-period (monthly),
  // so we use it as-is since users enter annual rate in the rendimientos module.
  // If rendimientos store monthly rates, multiply by 12. We'll use as-is (annual).
  const avgRendAnual12 = sumCap12 > 0 ? (sumCapTasa12 / sumCap12) : 8;
  const avgRendRedondeado = Math.round(avgRendAnual12 * 10) / 10;

  el.innerHTML = `
    <!-- Tab Navigation -->
    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
      <button class="btn btn-primary" id="simTab-duracion" onclick="switchSimTab('duracion')">
        <i class="fas fa-hourglass-half"></i> Duracion de Ahorros
      </button>
      <button class="btn btn-secondary" id="simTab-inversion" onclick="switchSimTab('inversion')">
        <i class="fas fa-chart-line"></i> Simulador de Inversion
      </button>
      <button class="btn btn-secondary" id="simTab-comparador" onclick="switchSimTab('comparador')">
        <i class="fas fa-columns"></i> Comparador
      </button>
      <button class="btn btn-secondary" id="simTab-impacto" onclick="switchSimTab('impacto')">
        <i class="fas fa-bolt"></i> Impacto (What-If)
      </button>
      <button class="btn btn-secondary" id="simTab-compuesto" onclick="switchSimTab('compuesto')">
        <i class="fas fa-percentage"></i> Interes Compuesto
      </button>
      <button class="btn btn-secondary" id="simTab-oportunidad" onclick="switchSimTab('oportunidad')">
        <i class="fas fa-balance-scale-right"></i> Costo de Oportunidad
      </button>
    </div>

    <!-- 7a. DURACION DE AHORROS -->
    <div id="simPanel-duracion" class="sim-panel">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-hourglass-half" style="margin-right:8px;color:var(--accent-blue);"></i>Duracion de Ahorros</span>
        </div>
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Capital actual (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="dur-capital" value="${Math.round(patrimonioTotal).toLocaleString('en-US')}" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Gasto mensual estimado (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="dur-gasto" value="${gastoMensualProm.toLocaleString('en-US')}" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Rendimiento anual esperado (%)</label>
            <input type="number" class="form-input" id="dur-rendimiento" value="${avgRendRedondeado}" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Tasa de inflacion anual (%)</label>
            <input type="number" class="form-input" id="dur-inflacion" value="4.5" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Ingresos fijos mensuales (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="dur-ingresos" value="${ingresoMensualProm.toLocaleString('en-US')}" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calcularDuracion()">
          <i class="fas fa-calculator"></i> Calcular
        </button>
      </div>
      <div id="dur-resultados" style="display:none;">
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-clock" style="margin-right:8px;color:var(--accent-green);"></i>Resultado</span>
          </div>
          <div id="dur-resumen" style="font-size:18px;font-weight:700;margin-bottom:16px;"></div>
          <div style="position:relative;height:320px;">
            <canvas id="durChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-amber);"></i>Proyeccion Anual</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" id="dur-tabla">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style="text-align:right;">Capital Inicio</th>
                  <th style="text-align:right;">Rendimientos</th>
                  <th style="text-align:right;">Ingresos</th>
                  <th style="text-align:right;">Gastos</th>
                  <th style="text-align:right;">Capital Final</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 7b. SIMULADOR DE INVERSION -->
    <div id="simPanel-inversion" class="sim-panel" style="display:none;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-line" style="margin-right:8px;color:var(--accent-green);"></i>Simulador de Inversion</span>
        </div>
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Monto a invertir (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="inv-monto" value="500,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Tasa rendimiento anual (%)</label>
            <input type="number" class="form-input" id="inv-tasa" value="${avgRendRedondeado}" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Plazo (meses)</label>
            <input type="number" class="form-input" id="inv-plazo" value="60" step="1" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Aportaciones mensuales adicionales (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="inv-aportacion" value="0" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Inflacion anual (%)</label>
            <input type="number" class="form-input" id="inv-inflacion" value="4.5" step="0.1">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;gap:10px;padding-bottom:2px;">
            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="inv-reinversion" checked style="width:18px;height:18px;accent-color:var(--accent-green);cursor:pointer;">
              Reinvertir rendimientos
            </label>
          </div>
        </div>
        <button class="btn btn-primary" onclick="simularInversion()">
          <i class="fas fa-play"></i> Simular
        </button>
      </div>
      <div id="inv-resultados" style="display:none;">
        <div class="grid-2" style="margin-bottom:24px;">
          <div class="card" style="border-left:3px solid var(--accent-green);">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Monto Final (Nominal)</div>
            <div id="inv-final-nominal" style="font-size:22px;font-weight:800;color:var(--accent-green);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-blue);">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Monto Final (Real - ajustado por inflacion)</div>
            <div id="inv-final-real" style="font-size:22px;font-weight:800;color:var(--accent-blue);"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
          <div id="inv-resumen" style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;"></div>
          <div style="position:relative;height:320px;">
            <canvas id="invChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-amber);"></i>Proyeccion Anual</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" id="inv-tabla">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style="text-align:right;">Capital Inicio</th>
                  <th style="text-align:right;">Aportaciones</th>
                  <th style="text-align:right;">Rendimientos</th>
                  <th style="text-align:right;">Capital Final</th>
                  <th style="text-align:right;">Capital Real</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 7c. COMPARADOR DE ESCENARIOS -->
    <div id="simPanel-comparador" class="sim-panel" style="display:none;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-columns" style="margin-right:8px;color:var(--accent-purple);"></i>Comparador de Escenarios</span>
        </div>
        <div id="comp-escenarios">
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-base);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
            <div style="font-weight:700;color:var(--text-primary);margin-bottom:12px;">Escenario 1</div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-input" id="comp-nombre-0" value="Conservador">
              </div>
              <div class="form-group">
                <label class="form-label">Monto inicial (MXN)</label>
                <input type="text" class="form-input sim-money-input" id="comp-monto-0" value="500,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
              </div>
              <div class="form-group">
                <label class="form-label">Tasa anual (%)</label>
                <input type="number" class="form-input" id="comp-tasa-0" value="7" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">Plazo (meses)</label>
                <input type="number" class="form-input" id="comp-plazo-0" value="60" step="1" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Inflacion anual (%)</label>
                <input type="number" class="form-input" id="comp-inflacion-0" value="4.5" step="0.1">
              </div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-base);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
            <div style="font-weight:700;color:var(--text-primary);margin-bottom:12px;">Escenario 2</div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-input" id="comp-nombre-1" value="Moderado">
              </div>
              <div class="form-group">
                <label class="form-label">Monto inicial (MXN)</label>
                <input type="text" class="form-input sim-money-input" id="comp-monto-1" value="500,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
              </div>
              <div class="form-group">
                <label class="form-label">Tasa anual (%)</label>
                <input type="number" class="form-input" id="comp-tasa-1" value="10" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">Plazo (meses)</label>
                <input type="number" class="form-input" id="comp-plazo-1" value="60" step="1" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Inflacion anual (%)</label>
                <input type="number" class="form-input" id="comp-inflacion-1" value="4.5" step="0.1">
              </div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-base);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
            <div style="font-weight:700;color:var(--text-primary);margin-bottom:12px;">Escenario 3 <span style="font-size:11px;color:var(--text-muted);">(opcional)</span></div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-input" id="comp-nombre-2" value="Agresivo">
              </div>
              <div class="form-group">
                <label class="form-label">Monto inicial (MXN)</label>
                <input type="text" class="form-input sim-money-input" id="comp-monto-2" value="500,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
              </div>
              <div class="form-group">
                <label class="form-label">Tasa anual (%)</label>
                <input type="number" class="form-input" id="comp-tasa-2" value="14" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">Plazo (meses)</label>
                <input type="number" class="form-input" id="comp-plazo-2" value="60" step="1" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Inflacion anual (%)</label>
                <input type="number" class="form-input" id="comp-inflacion-2" value="4.5" step="0.1">
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="compararEscenarios()">
          <i class="fas fa-balance-scale"></i> Comparar
        </button>
      </div>
      <div id="comp-resultados" style="display:none;">
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-trophy" style="margin-right:8px;color:var(--accent-amber);"></i>Resultado de Comparacion</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" id="comp-tabla">
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th style="text-align:right;">Monto Inicial</th>
                  <th style="text-align:right;">Monto Final</th>
                  <th style="text-align:right;">Rendimiento</th>
                  <th style="text-align:right;">Rendimiento Real</th>
                  <th></th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-line" style="margin-right:8px;color:var(--accent-purple);"></i>Crecimiento Comparado</span>
          </div>
          <div style="position:relative;height:340px;">
            <canvas id="compChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 7d. SIMULADOR DE IMPACTO (What-If) -->
    <div id="simPanel-impacto" class="sim-panel" style="display:none;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-bolt" style="margin-right:8px;color:var(--accent-amber);"></i>Simulador de Impacto (What-If)</span>
        </div>
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">
          <i class="fas fa-info-circle" style="margin-right:4px;"></i>
          Puedes agregar <strong>multiples eventos</strong> para simular escenarios combinados (ej: comprar una casa + dejar de pagar renta).
        </div>
        <div id="imp-eventos-container">
          <div class="imp-evento-row" style="padding:12px;background:var(--bg-base);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-weight:600;font-size:13px;color:var(--text-primary);">Evento 1</span>
            </div>
            <div class="grid-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Tipo de evento</label>
                <select class="form-select imp-evento-tipo">
                  <option value="retiro">Retiro de capital</option>
                  <option value="compra">Compra grande</option>
                  <option value="aumento_gasto">Aumento de gasto mensual</option>
                  <option value="reduccion_ingreso">Reduccion de ingreso</option>
                  <option value="reduccion_gasto">Reduccion de gasto mensual</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Monto (MXN)</label>
                <input type="text" class="form-input sim-money-input imp-evento-monto" value="200,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="btn btn-secondary" onclick="agregarEventoImpacto()">
            <i class="fas fa-plus"></i> Agregar Evento
          </button>
        </div>
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Rendimiento anual supuesto (%)
              ${rend12.length > 0 ? '<span style="font-size:11px;font-weight:400;color:var(--accent-green);margin-left:6px;"><i class="fas fa-chart-line"></i> Promedio 12 meses</span>' : ''}
            </label>
            <input type="number" class="form-input" id="imp-rendimiento" value="${avgRendRedondeado}" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Inflacion anual supuesta (%)</label>
            <input type="number" class="form-input" id="imp-inflacion" value="4.5" step="0.1">
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
          <i class="fas fa-info-circle" style="margin-right:4px;"></i>
          <strong>Retiro/Compra:</strong> se resta del patrimonio. <strong>Aumento gasto:</strong> incremento mensual. <strong>Reduccion ingreso:</strong> disminucion mensual. <strong>Reduccion gasto:</strong> ahorro mensual.
        </div>
        <button class="btn btn-primary" onclick="simularImpacto()">
          <i class="fas fa-bolt"></i> Simular Impacto
        </button>
      </div>
      <div id="imp-resultados" style="display:none;">
        <div class="grid-2" style="margin-bottom:24px;">
          <div class="card" style="border-left:3px solid var(--accent-blue);">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Patrimonio ANTES</div>
            <div id="imp-antes" style="font-size:22px;font-weight:800;color:var(--accent-blue);"></div>
            <div id="imp-duracion-antes" style="font-size:13px;color:var(--text-secondary);margin-top:6px;"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-red);">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Patrimonio DESPUES</div>
            <div id="imp-despues" style="font-size:22px;font-weight:800;color:var(--accent-red);"></div>
            <div id="imp-duracion-despues" style="font-size:13px;color:var(--text-secondary);margin-top:6px;"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
          <div id="imp-detalle" style="font-size:14px;color:var(--text-secondary);"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-area" style="margin-right:8px;color:var(--accent-amber);"></i>Comparacion Antes vs Despues</span>
          </div>
          <div style="position:relative;height:320px;">
            <canvas id="impChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 7e. CALCULADORA DE INTERES COMPUESTO -->
    <div id="simPanel-compuesto" class="sim-panel" style="display:none;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-percentage" style="margin-right:8px;color:var(--accent-purple);"></i>Calculadora de Interes Compuesto</span>
        </div>
        <div class="grid-3" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Capital inicial</label>
            <input type="text" class="form-input sim-money-input" id="ic-capital" value="100,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Tasa de interes anual (%)</label>
            <input type="number" class="form-input" id="ic-tasa" value="${avgRendRedondeado}" step="0.1" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Plazo en anos</label>
            <input type="number" class="form-input" id="ic-plazo" value="10" step="1" min="1" max="50">
          </div>
          <div class="form-group">
            <label class="form-label">Frecuencia de capitalizacion</label>
            <select class="form-select" id="ic-frecuencia-cap">
              <option value="12">Mensual</option>
              <option value="4">Trimestral</option>
              <option value="2">Semestral</option>
              <option value="1">Anual</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Aportacion periodica</label>
            <input type="text" class="form-input sim-money-input" id="ic-aportacion" value="0" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Frecuencia de aportacion</label>
            <select class="form-select" id="ic-frecuencia-aport">
              <option value="12">Mensual</option>
              <option value="4">Trimestral</option>
              <option value="2">Semestral</option>
              <option value="1">Anual</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Moneda</label>
            <select class="form-select" id="ic-moneda">
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="calcularInteresCompuesto()">
          <i class="fas fa-calculator"></i> Calcular
        </button>
      </div>
      <div id="ic-resultados" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
          <div class="card" style="border-left:3px solid var(--accent-green);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Monto Final</div>
            <div id="ic-kpi-final" style="font-size:20px;font-weight:800;color:var(--accent-green);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-blue);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Total Invertido</div>
            <div id="ic-kpi-invertido" style="font-size:20px;font-weight:800;color:var(--accent-blue);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-amber);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Intereses Ganados</div>
            <div id="ic-kpi-intereses" style="font-size:20px;font-weight:800;color:var(--accent-amber);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-purple);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Rendimiento Total</div>
            <div id="ic-kpi-rendimiento" style="font-size:20px;font-weight:800;color:var(--accent-purple);"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-line" style="margin-right:8px;color:var(--accent-green);"></i>Crecimiento del Capital</span>
          </div>
          <div style="position:relative;height:340px;">
            <canvas id="icChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-amber);"></i>Desglose Anual</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" id="ic-tabla">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style="text-align:right;">Capital</th>
                  <th style="text-align:right;">Aportacion Acumulada</th>
                  <th style="text-align:right;">Interes del Periodo</th>
                  <th style="text-align:right;">Interes Acumulado</th>
                  <th style="text-align:right;">Valor Total</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 7f. CALCULADORA DE COSTO DE OPORTUNIDAD -->
    <div id="simPanel-oportunidad" class="sim-panel" style="display:none;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-balance-scale-right" style="margin-right:8px;color:var(--accent-amber);"></i>Costo de Oportunidad</span>
        </div>
        <div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary);">
          <i class="fas fa-lightbulb" style="margin-right:4px;color:var(--accent-amber);"></i>
          Si en vez de gastar ese dinero lo inviertes, <strong>cuanto tendrias en el futuro?</strong>
        </div>
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Monto del gasto (MXN)</label>
            <input type="text" class="form-input sim-money-input" id="opo-monto" value="50,000" inputmode="decimal" oninput="simFormatCommaInput(this)">
          </div>
          <div class="form-group">
            <label class="form-label">Descripcion (opcional)</label>
            <input type="text" class="form-input" id="opo-descripcion" placeholder="Ej: Viaje, auto, renovacion...">
          </div>
          <div class="form-group">
            <label class="form-label">Frecuencia del gasto</label>
            <select class="form-select" id="opo-frecuencia">
              <option value="unico">Gasto unico</option>
              <option value="mensual">Gasto mensual</option>
              <option value="anual">Gasto anual</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Horizonte temporal (anos)</label>
            <input type="number" class="form-input" id="opo-horizonte" value="10" step="1" min="1" max="50">
          </div>
          <div class="form-group">
            <label class="form-label">Rendimiento anual esperado (%)
              ${rend12.length > 0 ? '<span style="font-size:11px;font-weight:400;color:var(--accent-green);margin-left:6px;"><i class="fas fa-chart-line"></i> Promedio 12 meses</span>' : ''}
            </label>
            <input type="number" class="form-input" id="opo-rendimiento" value="${avgRendRedondeado}" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Inflacion anual (%)</label>
            <input type="number" class="form-input" id="opo-inflacion" value="4.5" step="0.1">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calcularOportunidad()">
          <i class="fas fa-calculator"></i> Calcular Costo de Oportunidad
        </button>
      </div>
      <div id="opo-resultados" style="display:none;">
        <div class="card" style="margin-bottom:24px;border-left:4px solid var(--accent-amber);background:var(--bg-base);">
          <div id="opo-frase" style="font-size:16px;font-weight:600;color:var(--text-primary);line-height:1.5;"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
          <div class="card" style="border-left:3px solid var(--accent-green);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Valor Futuro</div>
            <div id="opo-kpi-futuro" style="font-size:20px;font-weight:800;color:var(--accent-green);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-amber);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Costo de Oportunidad</div>
            <div id="opo-kpi-costo" style="font-size:20px;font-weight:800;color:var(--accent-amber);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-blue);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Valor Real (ajustado)</div>
            <div id="opo-kpi-real" style="font-size:20px;font-weight:800;color:var(--accent-blue);"></div>
          </div>
          <div class="card" style="border-left:3px solid var(--accent-red);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Total Gastado</div>
            <div id="opo-kpi-gastado" style="font-size:20px;font-weight:800;color:var(--accent-red);"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-line" style="margin-right:8px;color:var(--accent-amber);"></i>Crecimiento si Inviertes</span>
          </div>
          <div style="position:relative;height:340px;">
            <canvas id="opoChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-table" style="margin-right:8px;color:var(--accent-blue);"></i>Escenarios por Horizonte</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" id="opo-tabla">
              <thead>
                <tr>
                  <th>Horizonte</th>
                  <th style="text-align:right;">Total Gastado</th>
                  <th style="text-align:right;">Valor Futuro</th>
                  <th style="text-align:right;">Costo Oportunidad</th>
                  <th style="text-align:right;">Valor Real</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   SIMULADOR -- Tab Switching
   ============================================================ */
function switchSimTab(tab) {
  const tabs = ['duracion', 'inversion', 'comparador', 'impacto', 'compuesto', 'oportunidad'];
  tabs.forEach(t => {
    const panel = document.getElementById('simPanel-' + t);
    const btn = document.getElementById('simTab-' + t);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.className = t === tab ? 'btn btn-primary' : 'btn btn-secondary';
    }
  });
}

/* ============================================================
   7a. DURACION DE AHORROS -- Calculo
   ============================================================ */
function calcularDuracion() {
  const capital = simParseCommaValue('dur-capital');
  const gastoMensual = simParseCommaValue('dur-gasto');
  const rendAnual = parseFloat(document.getElementById('dur-rendimiento').value) || 0;
  const inflAnual = parseFloat(document.getElementById('dur-inflacion').value) || 0;
  const ingresosMens = simParseCommaValue('dur-ingresos');

  if (capital <= 0) {
    showToast('El capital debe ser mayor a 0', 'warning');
    return;
  }
  if (gastoMensual <= 0 && ingresosMens <= 0) {
    showToast('Ingrese al menos un gasto o ingreso mensual', 'warning');
    return;
  }

  // Real annual return (Fisher formula)
  const rendReal = ((1 + rendAnual / 100) / (1 + inflAnual / 100) - 1);
  const rendMensualReal = Math.pow(1 + rendReal, 1 / 12) - 1;
  // Inflate expenses, deflate income each year
  const inflMensual = Math.pow(1 + inflAnual / 100, 1 / 12) - 1;

  // Simulate month by month, up to 100 years max
  let saldo = capital;
  let gastoActual = gastoMensual;
  let ingresoActual = ingresosMens;
  const maxMeses = 1200;
  let meses = 0;
  const dataMensual = [saldo]; // month 0

  // Year-by-year table data
  const tablaAnual = [];
  let capitalInicioAnio = capital;
  let rendAnioAcum = 0;
  let ingresosAnioAcum = 0;
  let gastosAnioAcum = 0;
  let anioActual = 1;

  while (saldo > 0 && meses < maxMeses) {
    meses++;
    // Monthly return on current balance
    const rendMes = saldo * rendMensualReal;
    rendAnioAcum += rendMes;

    // Apply income and expenses (with inflation adjustment)
    const factorInflacion = Math.pow(1 + inflAnual / 100, meses / 12);
    const gastoAjustado = gastoMensual * factorInflacion;
    const ingresoAjustado = ingresosMens; // Income stays nominal (conservative)

    ingresosAnioAcum += ingresoAjustado;
    gastosAnioAcum += gastoAjustado;

    saldo = saldo + rendMes + ingresoAjustado - gastoAjustado;
    if (saldo < 0) saldo = 0;
    dataMensual.push(saldo);

    // End of year or end of simulation
    if (meses % 12 === 0 || saldo <= 0) {
      tablaAnual.push({
        anio: anioActual,
        capitalInicio: capitalInicioAnio,
        rendimientos: rendAnioAcum,
        ingresos: ingresosAnioAcum,
        gastos: gastosAnioAcum,
        capitalFinal: saldo,
      });
      capitalInicioAnio = saldo;
      rendAnioAcum = 0;
      ingresosAnioAcum = 0;
      gastosAnioAcum = 0;
      anioActual++;
    }

    if (saldo <= 0) break;
  }

  const anios = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;

  // Show results
  document.getElementById('dur-resultados').style.display = 'block';

  let resumenText = '';
  if (meses >= maxMeses) {
    resumenText = '<span class="text-green"><i class="fas fa-infinity" style="margin-right:8px;"></i>Tus ahorros duran mas de 100 anos. Estas financieramente seguro.</span>';
  } else {
    resumenText = `<span class="text-amber"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>Tus ahorros duraran aproximadamente <strong>${anios} anos y ${mesesRestantes} meses</strong>.</span>`;
  }
  document.getElementById('dur-resumen').innerHTML = resumenText;

  // Render table
  const tbody = document.querySelector('#dur-tabla tbody');
  tbody.innerHTML = tablaAnual.map(row => `
    <tr style="${row.capitalFinal <= 0 ? 'background:var(--accent-red-soft);' : ''}">
      <td style="font-weight:600;color:var(--text-primary);">Ano ${row.anio}</td>
      <td style="text-align:right;">${formatCurrency(row.capitalInicio, 'MXN')}</td>
      <td style="text-align:right;" class="text-green">${formatCurrency(row.rendimientos, 'MXN')}</td>
      <td style="text-align:right;" class="text-blue">${formatCurrency(row.ingresos, 'MXN')}</td>
      <td style="text-align:right;" class="text-red">${formatCurrency(row.gastos, 'MXN')}</td>
      <td style="text-align:right;font-weight:600;color:${row.capitalFinal <= 0 ? 'var(--accent-red)' : 'var(--text-primary)'};">${formatCurrency(row.capitalFinal, 'MXN')}</td>
    </tr>
  `).join('');

  // Render chart -- sample at yearly intervals for readability
  const chartLabels = [];
  const chartData = [];
  const chartColors = [];
  const step = Math.max(1, Math.floor(dataMensual.length / 60)); // max ~60 points
  for (let i = 0; i < dataMensual.length; i += step) {
    const yr = (i / 12).toFixed(1);
    chartLabels.push(i % 12 === 0 ? 'Ano ' + Math.floor(i / 12) : '');
    chartData.push(dataMensual[i]);
    chartColors.push(dataMensual[i] > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)');
  }
  // Ensure last point is included
  if ((dataMensual.length - 1) % step !== 0) {
    chartLabels.push(meses >= maxMeses ? 'Ano 100+' : 'Fin');
    chartData.push(dataMensual[dataMensual.length - 1]);
    chartColors.push(dataMensual[dataMensual.length - 1] > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)');
  }

  window._charts = window._charts || {};
  if (window._charts.duracion) window._charts.duracion.destroy();
  const ctx = document.getElementById('durChart').getContext('2d');

  // Find the index where capital becomes zero for red zone
  let zeroIdx = chartData.findIndex(v => v <= 0);

  window._charts.duracion = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Capital (MXN)',
        data: chartData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2,
        segment: {
          borderColor: function(ctx2) {
            if (zeroIdx >= 0 && ctx2.p1DataIndex >= zeroIdx - 1) return '#ef4444';
            return '#10b981';
          },
          backgroundColor: function(ctx2) {
            if (zeroIdx >= 0 && ctx2.p1DataIndex >= zeroIdx - 1) return 'rgba(239,68,68,0.1)';
            return 'rgba(16,185,129,0.1)';
          },
        },
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: {
            color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, 'MXN'); },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return 'Capital: ' + formatCurrency(ctx2.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });
}

/* ============================================================
   7b. SIMULADOR DE INVERSION -- Calculo
   ============================================================ */
function simularInversion() {
  const monto = simParseCommaValue('inv-monto');
  const tasaAnual = parseFloat(document.getElementById('inv-tasa').value) || 0;
  const plazoMeses = parseInt(document.getElementById('inv-plazo').value) || 0;
  const aportacionMensual = simParseCommaValue('inv-aportacion');
  const inflAnual = parseFloat(document.getElementById('inv-inflacion').value) || 0;
  const reinversion = document.getElementById('inv-reinversion').checked;

  if (monto <= 0 || plazoMeses <= 0) {
    showToast('El monto y plazo deben ser mayores a 0', 'warning');
    return;
  }

  const tasaMensual = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1;
  const inflMensual = Math.pow(1 + inflAnual / 100, 1 / 12) - 1;

  let saldo = monto;
  let saldoReal = monto;
  const dataMensual = [saldo];
  const dataMensualReal = [saldo];
  let totalAportaciones = 0;
  let totalRendimientos = 0;

  // Year table
  const tablaAnual = [];
  let capitalInicioAnio = monto;
  let aportacionesAnio = 0;
  let rendimientosAnio = 0;
  let anio = 1;

  for (let mes = 1; mes <= plazoMeses; mes++) {
    const rendMes = saldo * tasaMensual;
    totalRendimientos += rendMes;
    rendimientosAnio += rendMes;

    if (reinversion) {
      saldo += rendMes;
    }

    saldo += aportacionMensual;
    totalAportaciones += aportacionMensual;
    aportacionesAnio += aportacionMensual;

    // Real value accounting for inflation
    saldoReal = saldo / Math.pow(1 + inflAnual / 100, mes / 12);

    dataMensual.push(saldo);
    dataMensualReal.push(saldoReal);

    if (mes % 12 === 0 || mes === plazoMeses) {
      tablaAnual.push({
        anio: anio,
        capitalInicio: capitalInicioAnio,
        aportaciones: aportacionesAnio,
        rendimientos: rendimientosAnio,
        capitalFinal: saldo,
        capitalReal: saldoReal,
      });
      capitalInicioAnio = saldo;
      aportacionesAnio = 0;
      rendimientosAnio = 0;
      anio++;
    }
  }

  const montoFinalNominal = saldo;
  const montoFinalReal = saldoReal;
  const rendimientoTotal = montoFinalNominal - monto - totalAportaciones;
  const rendimientoPct = ((montoFinalNominal - monto - totalAportaciones) / (monto + totalAportaciones) * 100);

  // Show results
  document.getElementById('inv-resultados').style.display = 'block';
  document.getElementById('inv-final-nominal').textContent = formatCurrency(montoFinalNominal, 'MXN');
  document.getElementById('inv-final-real').textContent = formatCurrency(montoFinalReal, 'MXN');

  const aniosP = Math.floor(plazoMeses / 12);
  const mesesP = plazoMeses % 12;
  const plazoStr = aniosP > 0 ? `${aniosP} ano${aniosP > 1 ? 's' : ''}${mesesP > 0 ? ' y ' + mesesP + ' mes' + (mesesP > 1 ? 'es' : '') : ''}` : `${mesesP} mes${mesesP > 1 ? 'es' : ''}`;

  document.getElementById('inv-resumen').innerHTML = `
    Inversion inicial: <strong>${formatCurrency(monto, 'MXN')}</strong> |
    Plazo: <strong>${plazoStr}</strong> |
    Aportaciones totales: <strong>${formatCurrency(totalAportaciones, 'MXN')}</strong> |
    Rendimiento total: <strong class="text-green">${formatCurrency(rendimientoTotal, 'MXN')} (${rendimientoPct.toFixed(1)}%)</strong>
  `;

  // Table
  const tbody = document.querySelector('#inv-tabla tbody');
  tbody.innerHTML = tablaAnual.map(row => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary);">Ano ${row.anio}</td>
      <td style="text-align:right;">${formatCurrency(row.capitalInicio, 'MXN')}</td>
      <td style="text-align:right;" class="text-blue">${formatCurrency(row.aportaciones, 'MXN')}</td>
      <td style="text-align:right;" class="text-green">${formatCurrency(row.rendimientos, 'MXN')}</td>
      <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(row.capitalFinal, 'MXN')}</td>
      <td style="text-align:right;color:var(--accent-blue);">${formatCurrency(row.capitalReal, 'MXN')}</td>
    </tr>
  `).join('');

  // Chart
  const chartLabels = [];
  const chartNominal = [];
  const chartReal = [];
  const step = Math.max(1, Math.floor(dataMensual.length / 60));
  for (let i = 0; i < dataMensual.length; i += step) {
    chartLabels.push(i % 12 === 0 ? 'Ano ' + Math.floor(i / 12) : '');
    chartNominal.push(dataMensual[i]);
    chartReal.push(dataMensualReal[i]);
  }
  if ((dataMensual.length - 1) % step !== 0) {
    chartLabels.push('Fin');
    chartNominal.push(dataMensual[dataMensual.length - 1]);
    chartReal.push(dataMensualReal[dataMensualReal.length - 1]);
  }

  window._charts = window._charts || {};
  if (window._charts.inversion) window._charts.inversion.destroy();
  const ctx = document.getElementById('invChart').getContext('2d');

  window._charts.inversion = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Capital Nominal',
          data: chartNominal,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Capital Real (ajustado por inflacion)',
          data: chartReal,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2,
          borderDash: [6, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: {
            color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, 'MXN'); },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });
}

/* ============================================================
   7c. COMPARADOR DE ESCENARIOS -- Calculo
   ============================================================ */
function compararEscenarios() {
  const escenarios = [];
  const colores = ['#3b82f6', '#10b981', '#f59e0b'];

  for (let i = 0; i < 3; i++) {
    const nombre = document.getElementById('comp-nombre-' + i).value.trim();
    const monto = simParseCommaValue('comp-monto-' + i);
    const tasa = parseFloat(document.getElementById('comp-tasa-' + i).value) || 0;
    const plazo = parseInt(document.getElementById('comp-plazo-' + i).value) || 0;
    const inflacion = parseFloat(document.getElementById('comp-inflacion-' + i).value) || 0;

    // Skip scenario 3 if empty
    if (i === 2 && (nombre === '' || monto <= 0 || plazo <= 0)) continue;
    if (monto <= 0 || plazo <= 0) continue;

    const tasaMensual = Math.pow(1 + tasa / 100, 1 / 12) - 1;
    let saldo = monto;
    const dataMensual = [saldo];

    for (let mes = 1; mes <= plazo; mes++) {
      saldo += saldo * tasaMensual;
      dataMensual.push(saldo);
    }

    const montoFinal = saldo;
    const rendimiento = montoFinal - monto;
    const rendimientoPct = (rendimiento / monto * 100);
    const montoFinalReal = montoFinal / Math.pow(1 + inflacion / 100, plazo / 12);
    const rendimientoReal = montoFinalReal - monto;
    const rendimientoRealPct = (rendimientoReal / monto * 100);

    escenarios.push({
      nombre, monto, tasa, plazo, inflacion,
      montoFinal, rendimiento, rendimientoPct,
      montoFinalReal, rendimientoReal, rendimientoRealPct,
      dataMensual, color: colores[i],
    });
  }

  if (escenarios.length < 2) {
    showToast('Se necesitan al menos 2 escenarios para comparar', 'warning');
    return;
  }

  // Find winner (highest real return)
  let winnerIdx = 0;
  escenarios.forEach((e, i) => {
    if (e.rendimientoRealPct > escenarios[winnerIdx].rendimientoRealPct) winnerIdx = i;
  });

  document.getElementById('comp-resultados').style.display = 'block';

  // Table
  const tbody = document.querySelector('#comp-tabla tbody');
  tbody.innerHTML = escenarios.map((e, i) => `
    <tr style="${i === winnerIdx ? 'background:var(--accent-green-soft);' : ''}">
      <td style="font-weight:600;color:var(--text-primary);">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${e.color};margin-right:8px;"></span>
        ${e.nombre}
      </td>
      <td style="text-align:right;">${formatCurrency(e.monto, 'MXN')}</td>
      <td style="text-align:right;font-weight:600;color:var(--text-primary);">${formatCurrency(e.montoFinal, 'MXN')}</td>
      <td style="text-align:right;" class="text-green">${formatCurrency(e.rendimiento, 'MXN')} (${e.rendimientoPct.toFixed(1)}%)</td>
      <td style="text-align:right;" class="text-blue">${formatCurrency(e.rendimientoReal, 'MXN')} (${e.rendimientoRealPct.toFixed(1)}%)</td>
      <td>${i === winnerIdx ? '<span class="badge badge-green"><i class="fas fa-trophy" style="margin-right:4px;"></i>Ganador</span>' : ''}</td>
    </tr>
  `).join('');

  // Chart -- normalize all scenarios to same timeline (max plazo)
  const maxPlazo = Math.max(...escenarios.map(e => e.plazo));
  const chartLabels = [];
  const step = Math.max(1, Math.floor(maxPlazo / 60));
  for (let i = 0; i <= maxPlazo; i += step) {
    chartLabels.push(i % 12 === 0 ? 'Ano ' + Math.floor(i / 12) : '');
  }
  if (maxPlazo % step !== 0) {
    chartLabels.push('Fin');
  }

  const datasets = escenarios.map(e => {
    const data = [];
    for (let i = 0; i <= maxPlazo; i += step) {
      data.push(i < e.dataMensual.length ? e.dataMensual[i] : e.dataMensual[e.dataMensual.length - 1]);
    }
    if (maxPlazo % step !== 0) {
      const lastIdx = Math.min(maxPlazo, e.dataMensual.length - 1);
      data.push(e.dataMensual[lastIdx]);
    }
    return {
      label: e.nombre,
      data: data,
      borderColor: e.color,
      backgroundColor: e.color + '15',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2.5,
    };
  });

  window._charts = window._charts || {};
  if (window._charts.comparador) window._charts.comparador.destroy();
  const ctx = document.getElementById('compChart').getContext('2d');

  window._charts.comparador = new Chart(ctx, {
    type: 'line',
    data: { labels: chartLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: {
            color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, 'MXN'); },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });
}

/* ============================================================
   7d. SIMULADOR DE IMPACTO (What-If) -- Calculo
   ============================================================ */
function agregarEventoImpacto() {
  var container = document.getElementById('imp-eventos-container');
  var count = container.querySelectorAll('.imp-evento-row').length + 1;
  var div = document.createElement('div');
  div.className = 'imp-evento-row';
  div.style.cssText = 'padding:12px;background:var(--bg-base);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);margin-bottom:10px;';
  div.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:var(--text-primary);">Evento ' + count + '</span><button class="btn btn-danger" style="padding:3px 8px;font-size:11px;" onclick="this.closest(\'.imp-evento-row\').remove();"><i class="fas fa-trash"></i></button></div><div class="grid-2"><div class="form-group" style="margin-bottom:0;"><label class="form-label">Tipo de evento</label><select class="form-select imp-evento-tipo"><option value="retiro">Retiro de capital</option><option value="compra">Compra grande</option><option value="aumento_gasto">Aumento de gasto mensual</option><option value="reduccion_ingreso">Reduccion de ingreso</option><option value="reduccion_gasto">Reduccion de gasto mensual</option></select></div><div class="form-group" style="margin-bottom:0;"><label class="form-label">Monto (MXN)</label><input type="text" class="form-input sim-money-input imp-evento-monto" value="0" inputmode="decimal" oninput="simFormatCommaInput(this)"></div></div>';
  container.appendChild(div);
}

function simularImpacto() {
  // Collect all events
  var rows = document.querySelectorAll('.imp-evento-row');
  var eventos = [];
  rows.forEach(function(row) {
    var tipo = row.querySelector('.imp-evento-tipo').value;
    var rawVal = row.querySelector('.imp-evento-monto').value || '0';
    var monto = parseFloat(rawVal.replace(/,/g, '')) || 0;
    if (monto > 0) eventos.push({ tipo: tipo, monto: monto });
  });

  if (eventos.length === 0) {
    showToast('Agrega al menos un evento con monto mayor a 0', 'warning');
    return;
  }

  // Load current data
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  let patrimonioAntes = 0;
  cuentas.forEach(c => {
    if (c.activa !== false) {
      patrimonioAntes += toMXN(c.saldo, c.moneda, tiposCambio);
    }
  });

  // Calculate current monthly averages
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const gastosRec = movimientos.filter(mv => mv.tipo === 'gasto' && new Date(mv.fecha) >= threeMonthsAgo);
  const ingresosRec = movimientos.filter(mv => mv.tipo === 'ingreso' && new Date(mv.fecha) >= threeMonthsAgo);
  const gastoMensual = gastosRec.reduce((s, mv) => s + toMXN(mv.monto, mv.moneda, tiposCambio), 0) / 3;
  const ingresoMensual = ingresosRec.reduce((s, mv) => s + toMXN(mv.monto, mv.moneda, tiposCambio), 0) / 3;

  const rendAnual = (parseFloat(document.getElementById('imp-rendimiento').value) || 8) / 100;
  const inflAnual = (parseFloat(document.getElementById('imp-inflacion').value) || 4.5) / 100;
  const rendMensualReal = Math.pow(1 + ((1 + rendAnual) / (1 + inflAnual) - 1), 1 / 12) - 1;

  // Apply all events
  let patrimonioDespues = patrimonioAntes;
  let gastoMensualDespues = gastoMensual;
  let ingresoMensualDespues = ingresoMensual;
  let descripcionesEvento = [];

  eventos.forEach(function(ev) {
    switch (ev.tipo) {
      case 'retiro':
        patrimonioDespues -= ev.monto;
        descripcionesEvento.push('Retiro de capital: <strong>' + formatCurrency(ev.monto, 'MXN') + '</strong>');
        break;
      case 'compra':
        patrimonioDespues -= ev.monto;
        descripcionesEvento.push('Compra grande: <strong>' + formatCurrency(ev.monto, 'MXN') + '</strong>');
        break;
      case 'aumento_gasto':
        gastoMensualDespues += ev.monto;
        descripcionesEvento.push('Aumento gasto mensual: <strong>+' + formatCurrency(ev.monto, 'MXN') + '/mes</strong>');
        break;
      case 'reduccion_ingreso':
        ingresoMensualDespues = Math.max(0, ingresoMensualDespues - ev.monto);
        descripcionesEvento.push('Reduccion ingreso: <strong>-' + formatCurrency(ev.monto, 'MXN') + '/mes</strong>');
        break;
      case 'reduccion_gasto':
        gastoMensualDespues = Math.max(0, gastoMensualDespues - ev.monto);
        descripcionesEvento.push('Reduccion gasto: <strong>-' + formatCurrency(ev.monto, 'MXN') + '/mes</strong>');
        break;
    }
  });

  if (patrimonioDespues < 0) patrimonioDespues = 0;

  // Duration calculation helper
  function calcDuracionMeses(capital, gastoMens, ingresoMens) {
    if (capital <= 0) return 0;
    if (ingresoMens >= gastoMens) return 9999;
    let saldo = capital;
    let meses = 0;
    while (saldo > 0 && meses < 1200) {
      meses++;
      const rendMes = saldo * rendMensualReal;
      const factorInfl = Math.pow(1 + inflAnual, meses / 12);
      saldo = saldo + rendMes + ingresoMens - gastoMens * factorInfl;
    }
    return meses;
  }

  const duracionAntes = calcDuracionMeses(patrimonioAntes, gastoMensual, ingresoMensual);
  const duracionDespues = calcDuracionMeses(patrimonioDespues, gastoMensualDespues, ingresoMensualDespues);

  function formatDuracion(meses) {
    if (meses >= 9999) return 'Indefinida (ingresos cubren gastos)';
    if (meses >= 1200) return 'Mas de 100 anos';
    const a = Math.floor(meses / 12);
    const m = meses % 12;
    return `${a} ano${a !== 1 ? 's' : ''} y ${m} mes${m !== 1 ? 'es' : ''}`;
  }

  // Show results
  document.getElementById('imp-resultados').style.display = 'block';
  document.getElementById('imp-antes').textContent = formatCurrency(patrimonioAntes, 'MXN');
  document.getElementById('imp-despues').textContent = formatCurrency(patrimonioDespues, 'MXN');
  document.getElementById('imp-duracion-antes').innerHTML = '<i class="fas fa-clock" style="margin-right:4px;"></i>Duracion: ' + formatDuracion(duracionAntes);
  document.getElementById('imp-duracion-despues').innerHTML = '<i class="fas fa-clock" style="margin-right:4px;"></i>Duracion: ' + formatDuracion(duracionDespues);

  var eventoResumen = descripcionesEvento.map(function(d) { return '<li style="margin-bottom:4px;">' + d + '</li>'; }).join('');
  document.getElementById('imp-detalle').innerHTML = `
    <p style="margin-bottom:8px;font-weight:600;"><i class="fas fa-bolt" style="color:var(--accent-amber);margin-right:8px;"></i>Eventos simulados:</p>
    <ul style="margin:0 0 12px 20px;padding:0;">${eventoResumen}</ul>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Gasto mensual: ${formatCurrency(gastoMensual, 'MXN')} → ${formatCurrency(gastoMensualDespues, 'MXN')}</p>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Ingreso mensual: ${formatCurrency(ingresoMensual, 'MXN')} → ${formatCurrency(ingresoMensualDespues, 'MXN')}</p>
    <p style="color:var(--text-muted);font-size:13px;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Supuestos: rendimiento anual ${(rendAnual * 100).toFixed(1)}%, inflacion ${(inflAnual * 100).toFixed(1)}%.</p>
  `;

  // Generate depletion curves
  function generarCurva(capital, gastoMens, ingresoMens, maxMeses) {
    const datos = [capital];
    let saldo = capital;
    for (let i = 1; i <= maxMeses; i++) {
      const rendMes = saldo * rendMensualReal;
      const factorInfl = Math.pow(1 + inflAnual, i / 12);
      saldo = saldo + rendMes + ingresoMens - gastoMens * factorInfl;
      if (saldo < 0) saldo = 0;
      datos.push(saldo);
      if (saldo <= 0) break;
    }
    return datos;
  }

  const maxM = Math.min(Math.max(duracionAntes, duracionDespues, 60) + 12, 600);
  const curvaAntes = generarCurva(patrimonioAntes, gastoMensual, ingresoMensual, maxM);
  const curvaDespues = generarCurva(patrimonioDespues, gastoMensualDespues, ingresoMensualDespues, maxM);

  const chartLen = Math.max(curvaAntes.length, curvaDespues.length);
  const step = Math.max(1, Math.floor(chartLen / 60));
  const chartLabels = [];
  const dataAntes = [];
  const dataDespues = [];
  for (let i = 0; i < chartLen; i += step) {
    chartLabels.push(i % 12 === 0 ? 'Ano ' + Math.floor(i / 12) : '');
    dataAntes.push(i < curvaAntes.length ? curvaAntes[i] : 0);
    dataDespues.push(i < curvaDespues.length ? curvaDespues[i] : 0);
  }

  window._charts = window._charts || {};
  if (window._charts.impacto) window._charts.impacto.destroy();
  const ctx = document.getElementById('impChart').getContext('2d');

  window._charts.impacto = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Antes (escenario actual)',
          data: dataAntes,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
        },
        {
          label: 'Despues (con eventos)',
          data: dataDespues,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2, borderDash: [6, 3],
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: (typeof getChartColors === 'function' ? getChartColors() : {gridColor:'rgba(51,65,85,0.5)'}).gridColor },
          ticks: {
            color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, 'MXN'); },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: (typeof getChartColors === 'function' ? getChartColors() : {fontColor:'#94a3b8'}).fontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });
}

/* ============================================================
   7e. CALCULADORA DE INTERES COMPUESTO
   ============================================================ */
function calcularInteresCompuesto() {
  const P = simParseCommaValue('ic-capital');
  const tasaAnual = parseFloat(document.getElementById('ic-tasa').value) || 0;
  const anos = parseInt(document.getElementById('ic-plazo').value) || 0;
  const n = parseInt(document.getElementById('ic-frecuencia-cap').value) || 12;
  const PMT = simParseCommaValue('ic-aportacion');
  const nAport = parseInt(document.getElementById('ic-frecuencia-aport').value) || 12;
  const moneda = document.getElementById('ic-moneda').value || 'MXN';

  if (P <= 0) {
    showToast('El capital inicial debe ser mayor a 0', 'warning');
    return;
  }
  if (anos <= 0 || anos > 50) {
    showToast('El plazo debe estar entre 1 y 50 anos', 'warning');
    return;
  }
  if (tasaAnual <= 0) {
    showToast('La tasa de interes debe ser mayor a 0', 'warning');
    return;
  }

  const r = tasaAnual / 100;

  // --- Year-by-year simulation (period-by-period internally) ---
  // We simulate using the smallest common period (months) for accuracy
  // Capitalization happens every (12/n) months
  // Contributions happen every (12/nAport) months

  const tablaAnual = [];
  const chartDataCompuesto = [P];   // compound value over time (yearly points)
  const chartDataSimple = [P];      // simple interest for comparison
  const chartDataInvertido = [P];   // capital + contributions only
  const chartLabels = ['Ano 0'];

  let saldoCompuesto = P;
  let totalAportaciones = 0;
  let interesAcumulado = 0;

  for (let ano = 1; ano <= anos; ano++) {
    let interesPeriodo = 0;
    let aportacionesAno = 0;

    // Simulate each compounding period within this year
    // Number of compounding periods per year = n
    for (let periodo = 1; periodo <= n; periodo++) {
      // Interest for this compounding period
      const interes = saldoCompuesto * (r / n);
      interesPeriodo += interes;
      saldoCompuesto += interes;

      // Check if a contribution is due in this compounding period
      // A contribution happens nAport times per year
      // Map compounding period to contribution schedule:
      // Contribution happens when: periodo corresponds to one of the nAport evenly-spaced periods
      if (PMT > 0 && nAport > 0) {
        // Contributions per compounding period
        // If nAport >= n, multiple contributions per compounding period
        // If nAport < n, contributions happen only at certain compounding periods
        if (nAport >= n) {
          // Multiple contributions per compounding period
          const contribsPerPeriod = nAport / n;
          const contribThisPeriod = PMT * contribsPerPeriod;
          saldoCompuesto += contribThisPeriod;
          aportacionesAno += contribThisPeriod;
        } else {
          // Contributions are less frequent than compounding
          // Contribute when the compounding period aligns with contribution schedule
          // e.g., n=12 (monthly compounding), nAport=4 (quarterly contribution) => contribute every 3rd period
          const periodsPerContrib = n / nAport;
          if (periodo % periodsPerContrib === 0) {
            saldoCompuesto += PMT;
            aportacionesAno += PMT;
          }
        }
      }
    }

    totalAportaciones += aportacionesAno;
    interesAcumulado += interesPeriodo;

    // Simple interest comparison: P * (1 + r*t) + contributions * (assume no compounding)
    const valorSimple = P * (1 + r * ano) + totalAportaciones;

    // Capital invertido = P + total contributions
    const capitalInvertido = P + totalAportaciones;

    tablaAnual.push({
      ano: ano,
      capital: P,
      aportacionAcum: totalAportaciones,
      interesPeriodo: interesPeriodo,
      interesAcum: interesAcumulado,
      valorTotal: saldoCompuesto,
    });

    chartLabels.push('Ano ' + ano);
    chartDataCompuesto.push(saldoCompuesto);
    chartDataSimple.push(valorSimple);
    chartDataInvertido.push(capitalInvertido);
  }

  const montoFinal = saldoCompuesto;
  const totalInvertido = P + totalAportaciones;
  const interesesGanados = montoFinal - totalInvertido;
  const rendimientoTotalPct = totalInvertido > 0 ? ((montoFinal - totalInvertido) / totalInvertido * 100) : 0;

  // --- Show results ---
  document.getElementById('ic-resultados').style.display = 'block';

  // KPI cards
  document.getElementById('ic-kpi-final').textContent = formatCurrency(montoFinal, moneda);
  document.getElementById('ic-kpi-invertido').textContent = formatCurrency(totalInvertido, moneda);
  document.getElementById('ic-kpi-intereses').textContent = formatCurrency(interesesGanados, moneda);
  document.getElementById('ic-kpi-rendimiento').textContent = rendimientoTotalPct.toFixed(2) + '%';

  // --- Table ---
  const tbody = document.querySelector('#ic-tabla tbody');
  tbody.innerHTML = tablaAnual.map(function(row) {
    return '<tr>' +
      '<td style="font-weight:600;color:var(--text-primary);">Ano ' + row.ano + '</td>' +
      '<td style="text-align:right;">' + formatCurrency(row.capital, moneda) + '</td>' +
      '<td style="text-align:right;" class="text-blue">' + formatCurrency(row.aportacionAcum, moneda) + '</td>' +
      '<td style="text-align:right;" class="text-green">' + formatCurrency(row.interesPeriodo, moneda) + '</td>' +
      '<td style="text-align:right;" class="text-amber">' + formatCurrency(row.interesAcum, moneda) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-primary);">' + formatCurrency(row.valorTotal, moneda) + '</td>' +
    '</tr>';
  }).join('');

  // --- Chart ---
  const chartColorsTheme = (typeof getChartColors === 'function') ? getChartColors() : { gridColor: 'rgba(51,65,85,0.5)', fontColor: '#94a3b8' };

  window._charts = window._charts || {};
  if (window._charts.compuesto) window._charts.compuesto.destroy();
  const ctx = document.getElementById('icChart').getContext('2d');

  window._charts.compuesto = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Capital invertido',
          data: chartDataInvertido,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Valor con interes simple',
          data: chartDataSimple,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.05)',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          borderDash: [6, 3],
        },
        {
          label: 'Valor con interes compuesto',
          data: chartDataCompuesto,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.10)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: chartColorsTheme.gridColor },
          ticks: { color: chartColorsTheme.fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: chartColorsTheme.gridColor },
          ticks: {
            color: chartColorsTheme.fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, moneda); },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: chartColorsTheme.fontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y, moneda); },
          },
        },
      },
    },
  });
}

/* ============================================================
   7f. CALCULADORA DE COSTO DE OPORTUNIDAD
   ============================================================ */
function calcularOportunidad() {
  const monto = simParseCommaValue('opo-monto');
  const descripcion = (document.getElementById('opo-descripcion').value || '').trim();
  const frecuencia = document.getElementById('opo-frecuencia').value;
  const horizonte = parseInt(document.getElementById('opo-horizonte').value) || 10;
  const rendAnual = parseFloat(document.getElementById('opo-rendimiento').value) || 0;
  const inflAnual = parseFloat(document.getElementById('opo-inflacion').value) || 0;

  if (monto <= 0) {
    showToast('El monto debe ser mayor a 0', 'warning');
    return;
  }
  if (horizonte <= 0 || horizonte > 50) {
    showToast('El horizonte debe estar entre 1 y 50 anos', 'warning');
    return;
  }

  const r = rendAnual / 100;
  const infl = inflAnual / 100;
  const rMensual = Math.pow(1 + r, 1 / 12) - 1;

  // Helper: calculate FV and total spent for a given number of years
  function calcEscenario(anos) {
    var fv = 0;
    var totalGastado = 0;

    if (frecuencia === 'unico') {
      fv = monto * Math.pow(1 + r, anos);
      totalGastado = monto;
    } else if (frecuencia === 'mensual') {
      var nMeses = anos * 12;
      if (rMensual > 0) {
        fv = monto * ((Math.pow(1 + rMensual, nMeses) - 1) / rMensual);
      } else {
        fv = monto * nMeses;
      }
      totalGastado = monto * nMeses;
    } else if (frecuencia === 'anual') {
      if (r > 0) {
        fv = monto * ((Math.pow(1 + r, anos) - 1) / r);
      } else {
        fv = monto * anos;
      }
      totalGastado = monto * anos;
    }

    var valorReal = fv / Math.pow(1 + infl, anos);
    var costoOportunidad = fv - totalGastado;

    return {
      anos: anos,
      fv: fv,
      totalGastado: totalGastado,
      costoOportunidad: costoOportunidad,
      valorReal: valorReal,
    };
  }

  // Main calculation for the user's chosen horizon
  const resultado = calcEscenario(horizonte);

  // Show results
  document.getElementById('opo-resultados').style.display = 'block';

  // Build phrase
  var gastoLabel = descripcion || 'ese gasto';
  var freqLabel = frecuencia === 'mensual' ? ' cada mes' : frecuencia === 'anual' ? ' cada ano' : '';
  var frase = '';
  if (frecuencia === 'unico') {
    frase = '<i class="fas fa-lightbulb" style="color:var(--accent-amber);margin-right:8px;"></i>' +
      'Si en vez de gastar <strong>' + formatCurrency(monto, 'MXN') + '</strong> en ' + gastoLabel +
      ', lo inviertes a ' + rendAnual + '% anual, en <strong>' + horizonte + ' ano' + (horizonte > 1 ? 's' : '') +
      '</strong> tendrias <strong class="text-green">' + formatCurrency(resultado.fv, 'MXN') + '</strong>';
  } else {
    frase = '<i class="fas fa-lightbulb" style="color:var(--accent-amber);margin-right:8px;"></i>' +
      'Si en vez de gastar <strong>' + formatCurrency(monto, 'MXN') + freqLabel + '</strong> en ' + gastoLabel +
      ', lo inviertes a ' + rendAnual + '% anual, en <strong>' + horizonte + ' ano' + (horizonte > 1 ? 's' : '') +
      '</strong> acumularias <strong class="text-green">' + formatCurrency(resultado.fv, 'MXN') + '</strong>' +
      ' (habrias gastado ' + formatCurrency(resultado.totalGastado, 'MXN') + ')';
  }
  document.getElementById('opo-frase').innerHTML = frase;

  // KPI cards
  document.getElementById('opo-kpi-futuro').textContent = formatCurrency(resultado.fv, 'MXN');
  document.getElementById('opo-kpi-costo').textContent = formatCurrency(resultado.costoOportunidad, 'MXN');
  document.getElementById('opo-kpi-real').textContent = formatCurrency(resultado.valorReal, 'MXN');
  document.getElementById('opo-kpi-gastado').textContent = formatCurrency(resultado.totalGastado, 'MXN');

  // Scenario table: 5, 10, 15, 20 years (plus user's horizon if different)
  var escenarioAnos = [5, 10, 15, 20];
  if (escenarioAnos.indexOf(horizonte) === -1) {
    escenarioAnos.push(horizonte);
    escenarioAnos.sort(function(a, b) { return a - b; });
  }
  escenarioAnos = escenarioAnos.filter(function(a) { return a <= 50; });

  var escenarios = escenarioAnos.map(function(a) { return calcEscenario(a); });

  var tbody = document.querySelector('#opo-tabla tbody');
  tbody.innerHTML = escenarios.map(function(e) {
    var isSelected = e.anos === horizonte;
    return '<tr style="' + (isSelected ? 'background:var(--accent-amber-soft);' : '') + '">' +
      '<td style="font-weight:600;color:var(--text-primary);">' + e.anos + ' ano' + (e.anos > 1 ? 's' : '') +
        (isSelected ? ' <span class="badge badge-amber" style="font-size:10px;">Seleccionado</span>' : '') + '</td>' +
      '<td style="text-align:right;" class="text-red">' + formatCurrency(e.totalGastado, 'MXN') + '</td>' +
      '<td style="text-align:right;font-weight:600;" class="text-green">' + formatCurrency(e.fv, 'MXN') + '</td>' +
      '<td style="text-align:right;" class="text-amber">' + formatCurrency(e.costoOportunidad, 'MXN') + '</td>' +
      '<td style="text-align:right;" class="text-blue">' + formatCurrency(e.valorReal, 'MXN') + '</td>' +
    '</tr>';
  }).join('');

  // Chart: year-by-year growth
  var chartLabels = [];
  var chartFV = [];
  var chartGastado = [];
  for (var yr = 0; yr <= horizonte; yr++) {
    chartLabels.push('Ano ' + yr);
    var e = calcEscenario(yr);
    chartFV.push(e.fv);
    chartGastado.push(e.totalGastado);
  }

  var chartColorsTheme = (typeof getChartColors === 'function') ? getChartColors() : { gridColor: 'rgba(51,65,85,0.5)', fontColor: '#94a3b8' };

  window._charts = window._charts || {};
  if (window._charts.oportunidad) window._charts.oportunidad.destroy();
  var ctx = document.getElementById('opoChart').getContext('2d');

  window._charts.oportunidad = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Valor si inviertes',
          data: chartFV,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.10)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        },
        {
          label: 'Total gastado',
          data: chartGastado,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.05)',
          fill: true,
          tension: 0,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          borderDash: [6, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: chartColorsTheme.gridColor },
          ticks: { color: chartColorsTheme.fontColor, font: { size: 11, family: "'Plus Jakarta Sans'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: chartColorsTheme.gridColor },
          ticks: {
            color: chartColorsTheme.fontColor,
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            callback: function(v) { return formatCurrency(v, 'MXN'); },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: chartColorsTheme.fontColor, padding: 16, font: { size: 12, family: "'Plus Jakarta Sans'" } },
        },
        tooltip: {
          callbacks: {
            label: function(ctx2) { return ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y, 'MXN'); },
          },
        },
      },
    },
  });
}
