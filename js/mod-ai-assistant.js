/* ============================================================
   AI ASSISTANT MODULE
   ============================================================ */

function toggleAIAssistant() {
  var panel = document.getElementById('aiAssistantPanel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
    document.getElementById('aiChatInput').focus();
  } else {
    panel.style.display = 'none';
  }
}

function sendAIMessage() {
  var input = document.getElementById('aiChatInput');
  var message = input.value.trim();
  if (!message) return;

  // Add user message to chat
  appendAIMessage(message, 'user');
  input.value = '';

  // Generate AI response based on context
  var response = generateAIResponse(message);
  setTimeout(function() {
    appendAIMessage(response, 'bot');
  }, 500);
}

function appendAIMessage(text, type) {
  var container = document.getElementById('aiChatMessages');
  var div = document.createElement('div');
  div.className = 'ai-message ai-' + type;

  var avatarIcon = type === 'bot' ? 'fa-robot' : 'fa-user';
  div.innerHTML = '<div class="ai-avatar"><i class="fas ' + avatarIcon + '"></i></div>' +
    '<div class="ai-bubble">' + text + '</div>';

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function generateAIResponse(question) {
  var q = question.toLowerCase();

  // Load current data for context
  var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  var movimientos = loadData(STORAGE_KEYS.movimientos) || [];
  var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
  var tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  var propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  var prestamos = loadData(STORAGE_KEYS.prestamos) || [];

  // Calculate key metrics
  var patrimonioTotal = 0;
  var totalInversiones = 0;
  var totalDeuda = 0;
  cuentas.forEach(function(c) {
    if (c.activa !== false) {
      var val = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
      patrimonioTotal += val;
      if (c.tipo === 'inversion') totalInversiones += val;
    }
  });
  propiedades.forEach(function(p) {
    patrimonioTotal += toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio);
  });
  prestamos.forEach(function(p) {
    if (p.estado === 'activo' && p.tipo === 'recibido') {
      totalDeuda += toMXN(p.saldo_pendiente, p.moneda, tiposCambio);
    }
  });

  // Rendimiento promedio
  var invCuentas = cuentas.filter(function(c) { return c.activa !== false && c.tipo === 'inversion' && c.rendimiento_anual > 0; });
  var sumPond = 0, sumPeso = 0;
  invCuentas.forEach(function(c) {
    var val = toMXN(_calcSaldoReal(c), c.moneda, tiposCambio);
    sumPond += val * c.rendimiento_anual;
    sumPeso += val;
  });
  var rendProm = sumPeso > 0 ? (sumPond / sumPeso) : 0;

  // Gastos promedio mensual
  var now = new Date();
  var threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  var gastosRec = movimientos.filter(function(mv) { return mv.tipo === 'gasto' && new Date(mv.fecha) >= threeMonthsAgo; });
  var gastoMensual = gastosRec.reduce(function(s, mv) { return s + toMXN(mv.monto, mv.moneda, tiposCambio); }, 0) / 3;

  // Smart responses based on keywords
  if (q.includes('patrimonio') || q.includes('cuanto tengo') || q.includes('total')) {
    return 'Tu patrimonio total es de <strong>' + formatCurrency(patrimonioTotal, 'MXN') + '</strong>. ' +
      'De esto, <strong>' + formatCurrency(totalInversiones, 'MXN') + '</strong> estan en inversiones activas' +
      (totalDeuda > 0 ? ' y tienes deuda pendiente de <strong>' + formatCurrency(totalDeuda, 'MXN') + '</strong>.' : '.');
  }

  if (q.includes('rendimiento') || q.includes('ganancia') || q.includes('retorno')) {
    if (invCuentas.length === 0) {
      return 'Actualmente no tienes inversiones con rendimiento registrado. Considera diversificar en instrumentos como CETES, fondos o ETFs.';
    }
    var desglose = invCuentas.map(function(c) { return c.nombre + ': ' + c.rendimiento_anual.toFixed(1) + '%'; }).join(', ');
    return 'Tu rendimiento promedio ponderado es <strong>' + rendProm.toFixed(2) + '%</strong> anual. ' +
      'Desglose: ' + desglose + '. ' +
      (rendProm < 8 ? 'Podrias considerar diversificar hacia instrumentos con mayor rendimiento.' : 'Buen nivel de rendimiento!');
  }

  if (q.includes('gasto') || q.includes('gastar') || q.includes('gastos')) {
    var mesesDuracion = patrimonioTotal > 0 && gastoMensual > 0 ? Math.floor(patrimonioTotal / gastoMensual) : 0;
    return 'Tu gasto mensual promedio es de <strong>' + formatCurrency(gastoMensual, 'MXN') + '</strong>. ' +
      (mesesDuracion > 0 ? 'Con tu patrimonio actual, podrias cubrir aproximadamente <strong>' + mesesDuracion + ' meses</strong> de gastos sin ingresos adicionales.' : '') +
      ' Revisa el modulo de Gastos para un desglose detallado por categoria.';
  }

  if (q.includes('deuda') || q.includes('prestamo') || q.includes('debo')) {
    if (prestamos.length === 0) {
      return 'No tienes prestamos registrados. Eso es positivo para tu salud financiera!';
    }
    var activos = prestamos.filter(function(p) { return p.estado === 'activo'; });
    return 'Tienes <strong>' + activos.length + '</strong> prestamo(s) activo(s). ' +
      (totalDeuda > 0 ? 'Tu deuda total pendiente es de <strong>' + formatCurrency(totalDeuda, 'MXN') + '</strong>. ' : '') +
      'Revisa el modulo de Prestamos para ver detalles y registrar pagos.';
  }

  if (q.includes('propiedad') || q.includes('inmueble') || q.includes('casa') || q.includes('depto')) {
    if (propiedades.length === 0) {
      return 'No tienes propiedades registradas. Si tienes bienes inmuebles, puedes agregarlos en el modulo de Propiedades.';
    }
    var valProp = propiedades.reduce(function(s, p) { return s + toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio); }, 0);
    var rentaTotal = propiedades.filter(function(p) { return p.tipo === 'terminada' && p.ocupada; }).reduce(function(s, p) { return s + p.renta_mensual; }, 0);
    return 'Tienes <strong>' + propiedades.length + '</strong> propiedade(s) con valor total de <strong>' + formatCurrency(valProp, 'MXN') + '</strong>.' +
      (rentaTotal > 0 ? ' Generas <strong>' + formatCurrency(rentaTotal, 'MXN') + '</strong>/mes en rentas.' : '');
  }

  if (q.includes('consejo') || q.includes('sugerencia') || q.includes('recomienda') || q.includes('que hago') || q.includes('ayuda')) {
    var consejos = [];
    if (rendProm < 8 && totalInversiones > 0) consejos.push('Tu rendimiento promedio es ' + rendProm.toFixed(1) + '%. Considera diversificar hacia instrumentos de mayor rendimiento.');
    if (gastoMensual > 0 && gastoMensual > patrimonioTotal * 0.03) consejos.push('Tus gastos mensuales representan mas del 3% de tu patrimonio. Intenta optimizar gastos.');
    if (totalDeuda > totalInversiones * 0.5) consejos.push('Tu deuda es significativa respecto a tus inversiones. Prioriza pagar deudas con alta tasa de interes.');
    if (consejos.length === 0) consejos.push('Tu situacion financiera se ve equilibrada. Sigue diversificando y monitoreando tus inversiones.');
    return '<strong>Sugerencias:</strong><br>' + consejos.map(function(c) { return '- ' + c; }).join('<br>');
  }

  if (q.includes('simulador') || q.includes('simular') || q.includes('proyeccion')) {
    return 'Puedes usar el modulo de <strong>Simulador</strong> para: <br>' +
      '- <strong>Duracion de ahorros</strong>: Cuanto tiempo durara tu capital<br>' +
      '- <strong>Simulador de inversion</strong>: Proyectar crecimiento<br>' +
      '- <strong>Comparador</strong>: Comparar escenarios de inversion<br>' +
      '- <strong>What-If</strong>: Simular impacto de decisiones financieras';
  }

  if (q.includes('cuenta') || q.includes('inversion')) {
    return 'Tienes <strong>' + cuentas.filter(function(c) { return c.activa !== false; }).length + '</strong> cuentas activas. ' +
      'De estas, <strong>' + invCuentas.length + '</strong> son inversiones con rendimiento. ' +
      'Revisa el modulo de Cuentas para administrarlas.';
  }

  // Default response
  return 'Puedo ayudarte con informacion sobre: <br>' +
    '- <strong>Patrimonio</strong>: "Cuanto tengo en total?"<br>' +
    '- <strong>Rendimientos</strong>: "Como van mis rendimientos?"<br>' +
    '- <strong>Gastos</strong>: "Cuanto gasto al mes?"<br>' +
    '- <strong>Deudas</strong>: "Cuanto debo?"<br>' +
    '- <strong>Propiedades</strong>: "Como van mis propiedades?"<br>' +
    '- <strong>Consejos</strong>: "Dame un consejo financiero"<br>' +
    '- <strong>Simulador</strong>: "Que puedo simular?"';
}
