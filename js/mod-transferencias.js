function renderTransferencias() {
  const el = document.getElementById('module-transferencias');

  // -- Load data --
  const transferencias = loadData(STORAGE_KEYS.transferencias) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const cuentasActivas = cuentas.filter(c => c.activa !== false);
  const cuentaOpciones = cuentasActivas
    .map(c => `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`)
    .join('');

  const hoy = new Date().toISOString().split('T')[0];

  el.innerHTML = `
    <!-- Formulario de Transferencia -->
    <div class="card" style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);"><i class="fas fa-exchange-alt" style="margin-right:8px;color:var(--accent-blue);"></i>Nueva Transferencia</h3>
      <form id="formTransferencia" onsubmit="executeTransferencia(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Cuenta Origen *</label>
            <select id="transCuentaOrigen" class="form-select" required onchange="onTransferCuentaChange()">
              <option value="">Seleccionar cuenta...</option>
              ${cuentaOpciones}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Cuenta Destino *</label>
            <select id="transCuentaDestino" class="form-select" required onchange="onTransferCuentaChange()">
              <option value="">Seleccionar cuenta...</option>
              ${cuentaOpciones}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Monto Origen *</label>
            <input type="number" id="transMontoOrigen" class="form-input" required step="0.01" min="0.01"
                   placeholder="0.00" oninput="onTransferCuentaChange()">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input type="date" id="transFecha" class="form-input" required value="${hoy}">
          </div>
        </div>

        <div id="tipoCambioSection" style="display:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label class="form-label">Tipo de Cambio *</label>
              <input type="number" id="transTipoCambio" class="form-input" step="0.0001" min="0.0001"
                     placeholder="Ej: 17.50" oninput="onTransferCuentaChange()">
            </div>
            <div class="form-group">
              <label class="form-label">Monto Destino (calculado)</label>
              <input type="text" id="transMontoDestino" class="form-input" readonly
                     style="background:var(--bg-base);color:var(--accent-green);font-weight:700;" placeholder="---">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Motivo / Descripcion</label>
          <input type="text" id="transMotivo" class="form-input" placeholder="Ej: Inversion en CETES">
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-exchange-alt"></i> Transferir
          </button>
        </div>
      </form>
    </div>

    <!-- Historial de Transferencias -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--text-primary);">Historial de Transferencias</h3>
      <div style="overflow-x:auto;">
        <table class="data-table" id="tablaTransferencias">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Destino</th>
              <th style="text-align:right;">Monto Origen</th>
              <th style="text-align:right;">Monto Destino</th>
              <th>Motivo</th>
              <th style="text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyTransferencias"></tbody>
        </table>
      </div>
    </div>
  `;

  // -- Populate history table --
  const tbody = document.getElementById('tbodyTransferencias');
  const sorted = [...transferencias].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No hay transferencias registradas</td></tr>';
  } else {
    tbody.innerHTML = sorted.map(t => {
      const ctaOrigen = cuentaMap[t.cuenta_origen_id];
      const ctaDestino = cuentaMap[t.cuenta_destino_id];
      const origenNombre = ctaOrigen ? ctaOrigen.nombre : 'Desconocida';
      const destinoNombre = ctaDestino ? ctaDestino.nombre : 'Desconocida';
      const monedaOrigen = t.moneda_origen || (ctaOrigen ? ctaOrigen.moneda : 'MXN');
      const monedaDestino = t.moneda_destino || (ctaDestino ? ctaDestino.moneda : 'MXN');

      return `<tr>
        <td>${t.fecha ? formatDate(t.fecha) : '-'}</td>
        <td>${origenNombre} <span style="color:var(--text-muted);font-size:11px;">(${monedaOrigen})</span></td>
        <td>${destinoNombre} <span style="color:var(--text-muted);font-size:11px;">(${monedaDestino})</span></td>
        <td style="text-align:right;color:var(--accent-red);">-${formatCurrency(t.monto_origen, monedaOrigen)}</td>
        <td style="text-align:right;color:var(--accent-green);">+${formatCurrency(t.monto_destino, monedaDestino)}</td>
        <td>${t.descripcion || '-'}</td>
        <td style="text-align:center;">
          <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteTransferencia('${t.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }
}

/* -- Handle cuenta selection change for transfer form -- */
function onTransferCuentaChange() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const origenId = document.getElementById('transCuentaOrigen').value;
  const destinoId = document.getElementById('transCuentaDestino').value;
  const tcSection = document.getElementById('tipoCambioSection');
  const tcInput = document.getElementById('transTipoCambio');
  const montoDestinoInput = document.getElementById('transMontoDestino');
  const montoOrigen = parseFloat(document.getElementById('transMontoOrigen').value) || 0;

  if (!origenId || !destinoId) {
    tcSection.style.display = 'none';
    return;
  }

  const ctaOrigen = cuentaMap[origenId];
  const ctaDestino = cuentaMap[destinoId];

  if (!ctaOrigen || !ctaDestino) {
    tcSection.style.display = 'none';
    return;
  }

  if (ctaOrigen.moneda !== ctaDestino.moneda) {
    tcSection.style.display = 'block';

    // Auto-suggest exchange rate
    if (!tcInput.value || parseFloat(tcInput.value) === 0) {
      let suggestedRate = 1;
      if (ctaOrigen.moneda === 'MXN' && ctaDestino.moneda === 'USD') {
        suggestedRate = 1 / (tiposCambio['USD_MXN'] || 17.50);
      } else if (ctaOrigen.moneda === 'USD' && ctaDestino.moneda === 'MXN') {
        suggestedRate = tiposCambio['USD_MXN'] || 17.50;
      } else if (ctaOrigen.moneda === 'MXN' && ctaDestino.moneda === 'EUR') {
        suggestedRate = 1 / (tiposCambio['EUR_MXN'] || 19.20);
      } else if (ctaOrigen.moneda === 'EUR' && ctaDestino.moneda === 'MXN') {
        suggestedRate = tiposCambio['EUR_MXN'] || 19.20;
      } else if (ctaOrigen.moneda === 'USD' && ctaDestino.moneda === 'EUR') {
        const usdMxn = tiposCambio['USD_MXN'] || 17.50;
        const eurMxn = tiposCambio['EUR_MXN'] || 19.20;
        suggestedRate = usdMxn / eurMxn;
      } else if (ctaOrigen.moneda === 'EUR' && ctaDestino.moneda === 'USD') {
        const usdMxn = tiposCambio['USD_MXN'] || 17.50;
        const eurMxn = tiposCambio['EUR_MXN'] || 19.20;
        suggestedRate = eurMxn / usdMxn;
      }
      tcInput.value = suggestedRate.toFixed(4);
    }

    // Calculate monto destino
    const tc = parseFloat(tcInput.value) || 0;
    const montoDestCalc = montoOrigen * tc;
    montoDestinoInput.value = montoDestCalc > 0 ? formatCurrency(montoDestCalc, ctaDestino.moneda) : '---';
  } else {
    tcSection.style.display = 'none';
    // Same currency: monto destino = monto origen
  }
}

/* -- Execute transferencia -- */
function executeTransferencia(event) {
  event.preventDefault();

  const transferencias = loadData(STORAGE_KEYS.transferencias) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const cuenta_origen_id = document.getElementById('transCuentaOrigen').value;
  const cuenta_destino_id = document.getElementById('transCuentaDestino').value;
  const monto_origen = parseFloat(document.getElementById('transMontoOrigen').value) || 0;
  const fecha = document.getElementById('transFecha').value;
  const descripcion = document.getElementById('transMotivo').value.trim();

  if (!cuenta_origen_id || !cuenta_destino_id || monto_origen <= 0 || !fecha) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (cuenta_origen_id === cuenta_destino_id) {
    showToast('La cuenta origen y destino no pueden ser la misma.', 'warning');
    return;
  }

  const origenIdx = cuentas.findIndex(c => c.id === cuenta_origen_id);
  const destinoIdx = cuentas.findIndex(c => c.id === cuenta_destino_id);
  if (origenIdx === -1 || destinoIdx === -1) {
    showToast('Una de las cuentas seleccionadas no existe.', 'error');
    return;
  }

  const ctaOrigen = cuentas[origenIdx];
  const ctaDestino = cuentas[destinoIdx];

  let monto_destino = monto_origen;
  let moneda_origen = ctaOrigen.moneda;
  let moneda_destino = ctaDestino.moneda;

  if (moneda_origen !== moneda_destino) {
    const tc = parseFloat(document.getElementById('transTipoCambio').value) || 0;
    if (tc <= 0) {
      showToast('Por favor ingresa un tipo de cambio valido.', 'warning');
      return;
    }
    monto_destino = monto_origen * tc;
  }

  // Check sufficient funds
  if (ctaOrigen.saldo < monto_origen) {
    const confirmar = confirm('La cuenta origen tiene un saldo de ' + formatCurrency(ctaOrigen.saldo, moneda_origen) + ' que es menor al monto de la transferencia. \u00BFDeseas continuar de todas formas?');
    if (!confirmar) return;
  }

  // Create transferencia record
  const transId = uuid();
  const nuevaTrans = {
    id: transId,
    cuenta_origen_id,
    cuenta_destino_id,
    monto_origen,
    monto_destino,
    moneda_origen,
    moneda_destino,
    fecha,
    descripcion,
    notas: '',
    created: new Date().toISOString(),
  };

  // Create 2 linked movimientos
  const movOrigenId = uuid();
  const movDestinoId = uuid();

  const movOrigen = {
    id: movOrigenId,
    cuenta_id: cuenta_origen_id,
    tipo: 'gasto',
    monto: monto_origen,
    moneda: moneda_origen,
    categoria_id: null,
    descripcion: 'Transferencia a ' + ctaDestino.nombre + (descripcion ? ' - ' + descripcion : ''),
    fecha: fecha,
    notas: 'Transferencia ID: ' + transId,
    transferencia_id: transId,
    created: new Date().toISOString(),
  };

  const movDestino = {
    id: movDestinoId,
    cuenta_id: cuenta_destino_id,
    tipo: 'ingreso',
    monto: monto_destino,
    moneda: moneda_destino,
    categoria_id: null,
    descripcion: 'Transferencia desde ' + ctaOrigen.nombre + (descripcion ? ' - ' + descripcion : ''),
    fecha: fecha,
    notas: 'Transferencia ID: ' + transId,
    transferencia_id: transId,
    created: new Date().toISOString(),
  };

  // Update saldos
  cuentas[origenIdx].saldo -= monto_origen;
  cuentas[destinoIdx].saldo += monto_destino;

  // Save everything
  transferencias.push(nuevaTrans);
  movimientos.push(movOrigen);
  movimientos.push(movDestino);

  saveData(STORAGE_KEYS.transferencias, transferencias);
  saveData(STORAGE_KEYS.movimientos, movimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);

  showToast('Transferencia realizada exitosamente.', 'success');
  renderTransferencias();
  updateHeaderPatrimonio();
}

/* -- Delete transferencia -- */
function deleteTransferencia(id) {
  const transferencias = loadData(STORAGE_KEYS.transferencias) || [];
  const movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];

  const trans = transferencias.find(t => t.id === id);
  if (!trans) return;

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.id] = c; });

  const origenNombre = cuentaMap[trans.cuenta_origen_id] ? cuentaMap[trans.cuenta_origen_id].nombre : 'Desconocida';
  const destinoNombre = cuentaMap[trans.cuenta_destino_id] ? cuentaMap[trans.cuenta_destino_id].nombre : 'Desconocida';

  const confirmar = confirm('\u00BFEstas seguro de eliminar esta transferencia?\n' + origenNombre + ' -> ' + destinoNombre + ': ' + formatCurrency(trans.monto_origen, trans.moneda_origen) + '\n\nSe revertiran los saldos y se eliminaran los movimientos asociados.');
  if (!confirmar) return;

  // Reverse saldos
  const origenIdx = cuentas.findIndex(c => c.id === trans.cuenta_origen_id);
  const destinoIdx = cuentas.findIndex(c => c.id === trans.cuenta_destino_id);

  if (origenIdx !== -1) cuentas[origenIdx].saldo += trans.monto_origen;
  if (destinoIdx !== -1) cuentas[destinoIdx].saldo -= trans.monto_destino;

  // Remove linked movimientos
  const newMovimientos = movimientos.filter(m => m.transferencia_id !== id);

  // Remove transferencia
  const newTransferencias = transferencias.filter(t => t.id !== id);

  saveData(STORAGE_KEYS.transferencias, newTransferencias);
  saveData(STORAGE_KEYS.movimientos, newMovimientos);
  saveData(STORAGE_KEYS.cuentas, cuentas);

  showToast('Transferencia eliminada y saldos revertidos.', 'info');
  renderTransferencias();
  updateHeaderPatrimonio();
}
