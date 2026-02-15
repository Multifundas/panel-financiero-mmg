/* ============================================================
   THEME MANAGEMENT
   ============================================================ */
function getChartColors() {
  var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    fontColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(203,213,225,0.5)',
    borderColor: isDark ? '#1e293b' : '#ffffff',
  };
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
  var config = loadData(STORAGE_KEYS.config) || getDefaultConfig();
  config.theme = theme;
  saveData(STORAGE_KEYS.config, config);
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (typeof navigateTo === 'function' && typeof currentModule !== 'undefined') {
    navigateTo(currentModule);
  }
}
