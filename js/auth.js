/* ============================================================
   SUPABASE AUTHENTICATION
   ============================================================ */
var _supabaseClient = null;

function isSupabaseConfigured() {
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 0 &&
         typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 0;
}

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  if (!isSupabaseConfigured()) return null;
  _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabaseClient;
}

function initAuth() {
  if (!isSupabaseConfigured()) {
    console.error('Panel Financiero: Supabase no configurado.');
    return;
  }
  var client = getSupabaseClient();
  client.auth.getSession().then(function(res) {
    var session = res.data.session;
    if (session) {
      hideLoginScreen();
      hydrateCache().then(function() {
        initApp();
      });
      setupInactivityTimer(AUTH_INACTIVITY_TIMEOUT);
    } else {
      showLoginScreen();
    }
  }).catch(function(err) {
    console.error('Auth error:', err);
    showLoginScreen();
  });
}

function showLoginScreen() {
  document.getElementById('loginOverlay').style.display = 'flex';
  var layout = document.querySelector('.app-layout');
  if (layout) layout.style.display = 'none';
  showOriginalLoginForm();
}

function hideLoginScreen() {
  document.getElementById('loginOverlay').style.display = 'none';
  var layout = document.querySelector('.app-layout');
  if (layout) layout.style.display = 'flex';
  var logoutBtn = document.getElementById('logoutNavItem');
  if (logoutBtn) logoutBtn.style.display = '';
}

function handleLogin(event) {
  event.preventDefault();
  var email = document.getElementById('authEmail').value;
  var password = document.getElementById('authPassword').value;
  var errDiv = document.getElementById('authError');
  errDiv.style.display = 'none';
  var client = getSupabaseClient();
  client.auth.signInWithPassword({ email: email, password: password })
    .then(function(res) {
      if (res.error) {
        errDiv.textContent = res.error.message || 'Error al iniciar sesion';
        errDiv.style.display = 'block';
      } else {
        hideLoginScreen();
        hydrateCache().then(function() {
          initApp();
        });
        setupInactivityTimer(AUTH_INACTIVITY_TIMEOUT);
      }
    });
}

function showResetForm() {
  var container = document.getElementById('loginFormContainer');
  container.innerHTML = '<form id="resetForm" onsubmit="handlePasswordReset(event)"><div class="form-group"><label class="form-label">Correo electronico</label><input type="email" id="resetEmail" class="form-input" required placeholder="tu@correo.com"></div><div id="resetError" style="display:none;color:var(--accent-red);font-size:13px;margin-bottom:12px;"></div><div id="resetSuccess" style="display:none;color:var(--accent-green);font-size:13px;margin-bottom:12px;"></div><button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;"><i class="fas fa-envelope"></i> Enviar enlace de recuperacion</button></form><div style="margin-top:16px;text-align:center;"><a onclick="showOriginalLoginForm()" style="color:var(--accent-blue);cursor:pointer;font-size:13px;">Volver al login</a></div>';
}

function handlePasswordReset(event) {
  event.preventDefault();
  var email = document.getElementById('resetEmail').value;
  var errDiv = document.getElementById('resetError');
  var successDiv = document.getElementById('resetSuccess');
  errDiv.style.display = 'none'; successDiv.style.display = 'none';
  var client = getSupabaseClient();
  client.auth.resetPasswordForEmail(email).then(function(res) {
    if (res.error) { errDiv.textContent = res.error.message || 'Error'; errDiv.style.display = 'block'; }
    else { successDiv.textContent = 'Revisa tu correo para restablecer tu contrasena.'; successDiv.style.display = 'block'; }
  });
}

function showOriginalLoginForm() {
  var container = document.getElementById('loginFormContainer');
  container.innerHTML = '<form id="loginForm" onsubmit="handleLogin(event)"><div class="form-group"><label class="form-label">Correo electronico</label><input type="email" id="authEmail" class="form-input" required placeholder="tu@correo.com"></div><div class="form-group"><label class="form-label">Contrasena</label><input type="password" id="authPassword" class="form-input" required placeholder="********"></div><div id="authError" style="display:none;color:var(--accent-red);font-size:13px;margin-bottom:12px;"></div><button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;"><i class="fas fa-sign-in-alt"></i> Iniciar Sesion</button></form><div style="margin-top:16px;text-align:center;"><a onclick="showResetForm()" style="color:var(--accent-blue);cursor:pointer;font-size:13px;">Olvide mi contrasena</a></div>';
}

function handleLogout() {
  flushPendingSaves().then(function() {
    var client = getSupabaseClient();
    if (client) {
      client.auth.signOut().then(function() {});
    }
    clearCache();
    sessionStorage.removeItem('pf_logged_in');
    sessionStorage.removeItem('pf_user');
    document.getElementById('loginOverlay').style.display = 'flex';
    var layout = document.querySelector('.app-layout');
    if (layout) layout.style.display = 'none';
    showOriginalLoginForm();
  });
}

/* -- Inactivity Timer -- */
var _inactivityTimer = null;
var _lastActivity = Date.now();

function setupInactivityTimer(minutes) {
  if (!minutes || minutes <= 0) return;
  _lastActivity = Date.now();
  ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt) {
    document.addEventListener(evt, function() { _lastActivity = Date.now(); }, { passive: true });
  });
  if (_inactivityTimer) clearInterval(_inactivityTimer);
  _inactivityTimer = setInterval(function() {
    if (Date.now() - _lastActivity > minutes * 60 * 1000) {
      showLockScreen();
      clearInterval(_inactivityTimer);
    }
  }, 60000);
}

function showLockScreen() {
  var lockDiv = document.getElementById('lockScreen');
  if (!lockDiv) return;
  lockDiv.style.display = 'flex';
  var client = getSupabaseClient();
  if (client) {
    client.auth.getSession().then(function(res) {
      var email = res.data.session ? res.data.session.user.email : '';
      var emailEl = document.getElementById('lockUserEmail');
      if (emailEl) emailEl.textContent = email;
    });
  }
  var pwd = document.getElementById('lockPassword');
  if (pwd) pwd.focus();
}

function handleUnlock(event) {
  event.preventDefault();
  var password = document.getElementById('lockPassword').value;
  var errDiv = document.getElementById('lockError');
  errDiv.style.display = 'none';
  var client = getSupabaseClient();
  client.auth.getSession().then(function(res) {
    var email = res.data.session ? res.data.session.user.email : '';
    client.auth.signInWithPassword({ email: email, password: password }).then(function(res2) {
      if (res2.error) { errDiv.textContent = 'Contrasena incorrecta'; errDiv.style.display = 'block'; }
      else { document.getElementById('lockScreen').style.display = 'none'; document.getElementById('lockPassword').value = ''; _lastActivity = Date.now(); setupInactivityTimer(AUTH_INACTIVITY_TIMEOUT); }
    });
  });
}
