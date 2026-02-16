/* ============================================================
   NAVIGATION
   ============================================================ */
let currentModule = 'dashboard';

const moduleTitles = {
  dashboard:      'Dashboard',
  cuentas:        'Cuentas',
  movimientos:    'Movimientos',
  rendimientos:   'Rendimientos',
  gastos:         'Gastos',
  transferencias: 'Transferencias',
  prestamos:      'Prestamos',
  propiedades:    'Propiedades',
  metas:          'Metas Financieras',
  simulador:      'Simulador de Inversiones',
  configuracion:  'Configuracion',
  ingresos_futuros: 'Ingresos Futuros',
};

function navigateTo(moduleId) {
  // Hide all modules
  document.querySelectorAll('.module-section').forEach(el => el.classList.remove('active'));
  // Show target
  const target = document.getElementById('module-' + moduleId);
  if (target) target.classList.add('active');

  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-module="${moduleId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update header title
  currentModule = moduleId;
  document.getElementById('headerTitle').textContent = moduleTitles[moduleId] || moduleId;

  // Call module render
  const renderFns = {
    dashboard:      renderDashboard,
    cuentas:        renderCuentas,
    movimientos:    renderMovimientos,
    rendimientos:   renderRendimientos,
    gastos:         renderGastos,
    transferencias: renderTransferencias,
    prestamos:      typeof renderPrestamos === 'function' ? renderPrestamos : function(){},
    propiedades:    typeof renderPropiedades === 'function' ? renderPropiedades : function(){},
    metas:          typeof renderMetas === 'function' ? renderMetas : function(){},
    simulador:      renderSimulador,
    configuracion:  renderConfiguracion,
    ingresos_futuros: typeof renderIngresosFuturos === 'function' ? renderIngresosFuturos : function(){},
  };
  if (renderFns[moduleId]) renderFns[moduleId]();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const icons = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    info:    'fa-info-circle',
    warning: 'fa-exclamation-triangle',
  };

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3200);
}

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal(event) {
  // If called from overlay click, only close if click was on overlay itself
  if (event && event.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('show');
}

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

/* ============================================================
   UPDATE HEADER PATRIMONIO
   ============================================================ */
function updateHeaderPatrimonio() {
  const cuentas = loadData(STORAGE_KEYS.cuentas) || [];
  const propiedades = loadData(STORAGE_KEYS.propiedades) || [];
  const tiposCambio = loadData(STORAGE_KEYS.tipos_cambio) || {};
  let total = 0;
  cuentas.forEach(c => {
    if (c.activa !== false) {
      total += toMXN(c.saldo, c.moneda, tiposCambio);
    }
  });
  propiedades.forEach(p => {
    total += toMXN(p.valor_actual || 0, p.moneda || 'MXN', tiposCambio);
  });
  document.getElementById('headerPatrimonio').textContent = formatCurrency(total, 'MXN');

  // Show current exchange rate in header
  const tcEl = document.getElementById('headerTipoCambio');
  if (tcEl) {
    const usdMxn = tiposCambio.USD_MXN || 17.50;
    tcEl.textContent = 'TC: US$1 = $' + Number(usdMxn).toFixed(2) + ' MXN';
  }
}

/* ============================================================
   UPDATE HEADER DATE
   ============================================================ */
function updateHeaderDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('es-MX', options);
  // Capitalize first letter
  document.getElementById('headerDate').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}
