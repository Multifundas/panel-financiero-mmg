/* ============================================================
   MANUAL DE USO  -  Panel Financiero MMG
   ============================================================ */

function openManual() {
  var overlay = document.getElementById('manualOverlay');
  var body = document.getElementById('manualBody');
  body.innerHTML = getManualHTML();
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeManual(e) {
  if (e && e.target !== e.currentTarget) return;
  var overlay = document.getElementById('manualOverlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

function getManualHTML() {
  return ''
  // ── DEDICATORIA ──
  + '<div class="manual-dedication">'
  +   '<div class="dedication-icon"><i class="fas fa-heart"></i></div>'
  +   '<p class="dedication-text">'
  +     'Sistema creado por tu hijo, con mucho cari\u00f1o, aprendiendo de ti, '
  +     'tu disciplina y orden financiero todos los d\u00edas'
  +   '</p>'
  +   '<p class="dedication-signature">MMC</p>'
  + '</div>'

  // ── INTRODUCCION ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-info-circle"></i> Que es el Panel Financiero?</h3>'
  +   '<p>El Panel Financiero MMG es tu herramienta personal para administrar, visualizar y analizar '
  +   'todas tus finanzas en un solo lugar. Desde cuentas bancarias e inversiones hasta propiedades, '
  +   'prestamos, gastos y metas financieras.</p>'
  +   '<p>Todo se guarda de forma segura en la nube. Puedes acceder desde cualquier navegador con tu correo y contrasena.</p>'
  + '</div>'

  // ── DASHBOARD ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-chart-pie"></i> Dashboard</h3>'
  +   '<p>Es la pantalla principal. Muestra un resumen completo de tu situacion financiera:</p>'
  +   '<ul>'
  +     '<li><strong>Patrimonio Total:</strong> Suma de todas tus cuentas, inversiones y propiedades, convertido a tu moneda base.</li>'
  +     '<li><strong>Rendimientos del Mes:</strong> Cuanto han generado tus inversiones este mes.</li>'
  +     '<li><strong>Gastos del Mes:</strong> Total de gastos registrados en el periodo actual.</li>'
  +     '<li><strong>Balance Neto:</strong> Ingresos menos gastos del periodo.</li>'
  +     '<li><strong>Rendimiento Promedio Ponderado:</strong> Tasa promedio que ganan tus inversiones, ponderada por el monto invertido.</li>'
  +     '<li><strong>Grafica de Ingresos vs Gastos:</strong> Comparativa mensual a lo largo del ano.</li>'
  +     '<li><strong>Distribucion por Tipo de Cuenta:</strong> Como esta repartido tu dinero (debito, inversion, inmuebles, etc.).</li>'
  +     '<li><strong>Alertas de Vencimiento:</strong> Aviso de inversiones o prestamos que vencen en los proximos 90 dias.</li>'
  +     '<li><strong>Resumen de Deuda:</strong> Total de prestamos recibidos y relacion deuda/patrimonio.</li>'
  +     '<li><strong>Resumen Comparativo:</strong> Compara el ano actual contra el anterior.</li>'
  +   '</ul>'
  +   '<p><strong>Filtros:</strong> Puedes ver datos por periodo (Mensual, Trimestral, Semestral, Anual) y por ano.</p>'
  + '</div>'

  // ── CUENTAS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-wallet"></i> Cuentas</h3>'
  +   '<p>Aqui registras todas tus cuentas financieras. Cada cuenta tiene:</p>'
  +   '<ul>'
  +     '<li><strong>Nombre:</strong> Identificador de la cuenta (ej. "BBVA Nomina", "CetesDirecto").</li>'
  +     '<li><strong>Institucion:</strong> Donde esta la cuenta (banco, broker, etc.).</li>'
  +     '<li><strong>Tipo:</strong> Debito, Credito, Inversion, Inmueble, Activo Fijo, u Otro.</li>'
  +     '<li><strong>Moneda:</strong> MXN o USD.</li>'
  +     '<li><strong>Saldo:</strong> Monto actual en la cuenta.</li>'
  +     '<li><strong>Rendimiento Anual (%):</strong> Para cuentas de inversion, la tasa esperada.</li>'
  +     '<li><strong>Fecha de Vencimiento:</strong> Para inversiones con plazo fijo.</li>'
  +   '</ul>'
  +   '<p><strong>Acciones:</strong> Puedes agregar, editar y eliminar cuentas. Al eliminar una cuenta, se eliminan tambien sus movimientos asociados.</p>'
  +   '<p><strong>Vista:</strong> Las cuentas se muestran como tarjetas con su saldo, tipo e institucion. Se pueden filtrar por tipo y moneda.</p>'
  + '</div>'

  // ── MOVIMIENTOS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-exchange-alt"></i> Movimientos</h3>'
  +   '<p>Registra todos los ingresos y gastos de tus cuentas:</p>'
  +   '<ul>'
  +     '<li><strong>Tipo:</strong> Ingreso o Gasto.</li>'
  +     '<li><strong>Cuenta:</strong> A que cuenta se aplica.</li>'
  +     '<li><strong>Monto:</strong> Cantidad del movimiento.</li>'
  +     '<li><strong>Categoria:</strong> Clasificacion del gasto (Vivienda, Alimentacion, Salud, etc.).</li>'
  +     '<li><strong>Fecha:</strong> Cuando ocurrio.</li>'
  +     '<li><strong>Descripcion:</strong> Detalle del movimiento.</li>'
  +   '</ul>'
  +   '<p><strong>Importante:</strong> Al registrar un ingreso o gasto, el saldo de la cuenta se actualiza automaticamente.</p>'
  +   '<div class="manual-tip">'
  +     '<i class="fas fa-lightbulb"></i> '
  +     '<span><strong>Plantillas Recurrentes:</strong> Si tienes pagos o ingresos que se repiten cada mes '
  +     '(como renta, nomina, servicios), puedes crear plantillas recurrentes. El sistema te avisara cuando '
  +     'sea momento de aplicarlas y lo puedes hacer con un solo clic.</span>'
  +   '</div>'
  + '</div>'

  // ── RENDIMIENTOS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-chart-line"></i> Rendimientos</h3>'
  +   '<p>Lleva el control del rendimiento de tus inversiones mes a mes:</p>'
  +   '<ul>'
  +     '<li><strong>Cuenta de Inversion:</strong> Selecciona cual inversion registrar.</li>'
  +     '<li><strong>Periodo:</strong> Mes y ano del rendimiento.</li>'
  +     '<li><strong>Saldo Inicial / Final:</strong> El sistema calcula automaticamente el porcentaje de rendimiento.</li>'
  +   '</ul>'
  +   '<p>La seccion muestra graficas de evolucion de saldo y rendimiento porcentual por cuenta, '
  +   'ademas del rendimiento real (descontando inflacion).</p>'
  + '</div>'

  // ── GASTOS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-receipt"></i> Gastos</h3>'
  +   '<p>Analiza tus gastos con detalle:</p>'
  +   '<ul>'
  +     '<li><strong>Grafica de dona:</strong> Distribucion de gastos por categoria.</li>'
  +     '<li><strong>Tendencia mensual:</strong> Como han evolucionado tus gastos.</li>'
  +     '<li><strong>Presupuestos:</strong> Define un monto maximo mensual por categoria y ve si lo estas cumpliendo.</li>'
  +     '<li><strong>Top gastos:</strong> Los movimientos mas grandes del periodo.</li>'
  +   '</ul>'
  +   '<div class="manual-tip">'
  +     '<i class="fas fa-lightbulb"></i> '
  +     '<span><strong>Presupuestos:</strong> En esta misma seccion puedes definir presupuestos por categoria. '
  +     'Una barra de progreso te muestra cuanto llevas gastado vs. tu limite. Si te pasas, se marca en rojo.</span>'
  +   '</div>'
  + '</div>'

  // ── TRANSFERENCIAS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-arrows-alt-h"></i> Transferencias</h3>'
  +   '<p>Registra movimientos de dinero entre tus propias cuentas:</p>'
  +   '<ul>'
  +     '<li><strong>Cuenta Origen / Destino:</strong> De donde sale y a donde llega.</li>'
  +     '<li><strong>Montos:</strong> Si las cuentas son de diferente moneda, puedes poner montos distintos (ej. envias USD y recibes MXN).</li>'
  +     '<li><strong>Saldos automaticos:</strong> Se descuenta de la cuenta origen y se suma a la destino.</li>'
  +   '</ul>'
  +   '<p>Esto no cuenta como ingreso ni gasto, es solo un movimiento interno entre tus cuentas.</p>'
  + '</div>'

  // ── METAS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-bullseye"></i> Metas Financieras</h3>'
  +   '<p>Define objetivos financieros y mide tu progreso:</p>'
  +   '<ul>'
  +     '<li><strong>Nombre:</strong> Descripcion de la meta (ej. "Fondo de emergencia").</li>'
  +     '<li><strong>Categoria:</strong> Ahorro, Compra, Inversion u Otro.</li>'
  +     '<li><strong>Monto Objetivo:</strong> Cuanto necesitas alcanzar.</li>'
  +     '<li><strong>Monto Actual:</strong> Cuanto llevas acumulado.</li>'
  +     '<li><strong>Fecha Objetivo:</strong> Para cuando quieres lograrlo.</li>'
  +   '</ul>'
  +   '<p>Una barra de progreso te muestra el porcentaje alcanzado y los dias restantes.</p>'
  + '</div>'

  // ── PRESTAMOS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-handshake"></i> Prestamos</h3>'
  +   '<p>Controla prestamos otorgados (que te deben) y recibidos (que debes):</p>'
  +   '<ul>'
  +     '<li><strong>Persona:</strong> A quien prestaste o quien te presto.</li>'
  +     '<li><strong>Monto Original:</strong> Cantidad total del prestamo.</li>'
  +     '<li><strong>Tasa de Interes:</strong> Si aplica, el % anual.</li>'
  +     '<li><strong>Saldo Pendiente:</strong> Cuanto falta por pagar/cobrar.</li>'
  +     '<li><strong>Pagos:</strong> Registra cada abono con fecha y monto. El saldo se actualiza automaticamente.</li>'
  +   '</ul>'
  +   '<p>El dashboard muestra los prestamos recibidos como parte de tu deuda total.</p>'
  + '</div>'

  // ── PROPIEDADES ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-building"></i> Propiedades</h3>'
  +   '<p>Administra bienes inmuebles, ya sean propiedades terminadas o en preventa:</p>'
  +   '<ul>'
  +     '<li><strong>Preventa:</strong> Registra enganche, mensualidades pagadas/totales, fecha de entrega.</li>'
  +     '<li><strong>Terminada:</strong> Valor actual, renta mensual, si esta ocupada, gastos de mantenimiento.</li>'
  +     '<li><strong>Historial de Valor:</strong> Registra como cambia el valor de la propiedad con el tiempo.</li>'
  +     '<li><strong>Metricas:</strong> Plusvalia acumulada, rendimiento de renta, ROI anualizado.</li>'
  +   '</ul>'
  + '</div>'

  // ── SIMULADOR ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-calculator"></i> Simulador de Inversiones</h3>'
  +   '<p>Herramienta para proyectar el crecimiento de una inversion:</p>'
  +   '<ul>'
  +     '<li><strong>Monto Inicial:</strong> Con cuanto empiezas.</li>'
  +     '<li><strong>Aportacion Mensual:</strong> Cuanto agregas cada mes.</li>'
  +     '<li><strong>Tasa de Rendimiento:</strong> % anual esperado.</li>'
  +     '<li><strong>Plazo:</strong> Cantidad de anos.</li>'
  +     '<li><strong>Inflacion:</strong> Para calcular el valor real.</li>'
  +   '</ul>'
  +   '<p>Genera una grafica de proyeccion y tabla detallada ano por ano con el crecimiento nominal y real.</p>'
  + '</div>'

  // ── CONFIGURACION ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-cog"></i> Configuracion</h3>'
  +   '<p>Personaliza el sistema:</p>'
  +   '<ul>'
  +     '<li><strong>Moneda Base:</strong> MXN o USD como moneda principal para mostrar totales.</li>'
  +     '<li><strong>Tasa de Inflacion:</strong> Para el calculo de rendimiento real.</li>'
  +     '<li><strong>Tema:</strong> Modo Oscuro o Claro.</li>'
  +     '<li><strong>Tipos de Cambio:</strong> Actualiza manualmente o desde internet (open.er-api.com).</li>'
  +     '<li><strong>Categorias de Gasto:</strong> Agrega, edita o elimina categorias.</li>'
  +     '<li><strong>Instituciones:</strong> Agrega, edita o elimina instituciones financieras.</li>'
  +     '<li><strong>Exportar/Importar:</strong> Respaldo completo de todos tus datos en formato JSON.</li>'
  +     '<li><strong>Exportar Reportes:</strong> Genera reportes en Excel o PDF.</li>'
  +     '<li><strong>Respaldo de Datos:</strong> Exporta e importa respaldos con metadata de fecha.</li>'
  +     '<li><strong>Datos de Ejemplo:</strong> Carga datos ficticios para ver como funciona el sistema.</li>'
  +     '<li><strong>Borrar Todo:</strong> Elimina permanentemente todos los datos.</li>'
  +   '</ul>'
  + '</div>'

  // ── ASISTENTE AI ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-robot"></i> Asistente Financiero AI</h3>'
  +   '<p>El boton morado en la esquina inferior derecha abre un chat con inteligencia artificial:</p>'
  +   '<ul>'
  +     '<li>Analiza tus datos financieros y te da sugerencias.</li>'
  +     '<li>Puedes preguntarle sobre tus inversiones, gastos, o pedir consejos.</li>'
  +     '<li>Tiene acceso a tus datos del panel para dar respuestas personalizadas.</li>'
  +   '</ul>'
  +   '<div class="manual-tip">'
  +     '<i class="fas fa-lightbulb"></i> '
  +     '<span>Prueba preguntarle: "Como van mis inversiones?" o "En que estoy gastando mas?"</span>'
  +   '</div>'
  + '</div>'

  // ── SEGURIDAD ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-shield-alt"></i> Seguridad</h3>'
  +   '<p>Tu informacion esta protegida:</p>'
  +   '<ul>'
  +     '<li><strong>Acceso con correo y contrasena:</strong> Solo usuarios autorizados pueden entrar.</li>'
  +     '<li><strong>Datos en la nube:</strong> Toda tu informacion se guarda en Supabase con encriptacion.</li>'
  +     '<li><strong>Datos aislados:</strong> Cada usuario solo puede ver sus propios datos.</li>'
  +     '<li><strong>Bloqueo por inactividad:</strong> Despues de 30 minutos sin actividad, la sesion se bloquea automaticamente.</li>'
  +     '<li><strong>Registro restringido:</strong> Solo correos autorizados pueden tener cuenta.</li>'
  +   '</ul>'
  + '</div>'

  // ── CONSEJOS ──
  + '<div class="manual-section">'
  +   '<h3><i class="fas fa-star"></i> Consejos para Empezar</h3>'
  +   '<ol>'
  +     '<li><strong>Primero crea tus cuentas:</strong> Registra cada cuenta bancaria, inversion y propiedad con su saldo actual.</li>'
  +     '<li><strong>Registra movimientos:</strong> Ve anotando ingresos y gastos conforme ocurran.</li>'
  +     '<li><strong>Usa plantillas recurrentes:</strong> Para pagos fijos mensuales (renta, servicios, etc.).</li>'
  +     '<li><strong>Registra rendimientos:</strong> Al cierre de cada mes, actualiza el saldo de tus inversiones.</li>'
  +     '<li><strong>Define presupuestos:</strong> En la seccion de Gastos, pon limites por categoria.</li>'
  +     '<li><strong>Establece metas:</strong> Ten objetivos claros y ve tu progreso.</li>'
  +     '<li><strong>Haz respaldos:</strong> De vez en cuando exporta un respaldo JSON desde Configuracion.</li>'
  +     '<li><strong>Revisa el Dashboard:</strong> Checalo seguido para tener el pulso de tus finanzas.</li>'
  +   '</ol>'
  + '</div>'

  // ── VERSION ──
  + '<div class="manual-footer">'
  +   '<p>Panel Financiero MMG &mdash; Version 1.0</p>'
  + '</div>';
}
