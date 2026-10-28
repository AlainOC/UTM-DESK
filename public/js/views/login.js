/**
 * UTM Desk — Vista de Login
 * Pantalla de autenticación con diseño NOC (modo oscuro técnico).
 */

import { saveSession, isLoggedIn } from '../auth.js';
import { showToast } from '../utils.js';
import { USE_MOCK } from '../config.js';

const API_BASE = '';

/**
 * Renderiza la pantalla de login dentro del contenedor dado.
 * @param {HTMLElement} container
 * @param {Function} onLoginSuccess — callback invocado tras login exitoso
 */
export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-backdrop" id="login-screen" aria-label="Pantalla de inicio de sesión">
      <div class="login-panel" role="main">

        <!-- Cabecera Institucional sobria (sin iconos decorativos flotantes) -->
        <header class="login-header">
          <div class="login-brand-meta">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="system-status-led" title="Servicio de autenticación en línea">
                <span class="led-dot" aria-hidden="true"></span> AUTH CLUSTER • ONLINE
              </span>
              <span class="text-muted font-mono" style="font-size:0.7rem;">PORTAL SEGURO</span>
            </div>
            <h1 class="login-title font-mono">UTM DESK</h1>
            <p class="login-subtitle">Consola de Operaciones de Campus y Triaje Técnico</p>
          </div>
        </header>

        <!-- Indicador de modo mock institucional -->
        ${USE_MOCK ? `
        <div class="login-mock-notice" role="note">
          <div class="d-flex align-items-center justify-content-between">
            <span class="font-mono fw-bold" style="font-size:0.7rem;letter-spacing:0.04em;">ENTORNO DE DEMOSTRACIÓN</span>
            <span class="badge-mock font-mono" style="font-size:0.65rem;">MOCK STORE</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
            Haz clic en una cuenta de prueba abajo para cargar credenciales de inmediato.
          </div>
        </div>` : ''}

        <!-- Formulario de acceso -->
        <form id="login-form" class="login-form" novalidate autocomplete="on">
          <div class="login-field-group">
            <label for="login-correo" class="login-label">Correo Institucional</label>
            <input
              type="email"
              id="login-correo"
              name="correo"
              class="form-control-custom font-mono"
              placeholder="usuario@campus.example.edu"
              autocomplete="username email"
              required
              aria-required="true"
            >
          </div>

          <div class="login-field-group">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label for="login-password" class="login-label mb-0">Contraseña</label>
              <button
                type="button"
                id="login-toggle-pwd"
                class="login-pwd-text-toggle"
                aria-label="Mostrar contraseña"
              >Mostrar</button>
            </div>
            <input
              type="password"
              id="login-password"
              name="password"
              class="form-control-custom font-mono"
              placeholder="••••••••••••"
              autocomplete="current-password"
              required
              aria-required="true"
            >
          </div>

          <!-- Error feedback -->
          <div id="login-error" class="login-error" role="alert" aria-live="assertive" hidden></div>

          <!-- Botón de acceso primario -->
          <button type="submit" id="login-submit-btn" class="btn-custom-primary login-btn">
            <span id="login-btn-label">Ingresar a Consola</span>
            <span id="login-spinner" class="login-spinner" hidden aria-hidden="true"></span>
          </button>

          <div class="text-center mt-3" style="font-size:0.8rem;">
            <span class="text-muted">¿No tienes cuenta de reportante?</span>
            <a href="#/registro-cuenta" class="fw-bold ms-1 text-decoration-none">Regístrate aquí</a>
          </div>
        </form>

        <!-- Selector rápido de cuentas de prueba (1-clic) -->
        <div class="login-quick-accounts">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted font-mono" style="font-size:0.675rem; font-weight:600; text-transform:uppercase;">
              ⚡ Acceso Rápido por Perfil (1-clic)
            </span>
            <span class="font-mono text-muted" style="font-size:0.65rem;">DEMO NOC</span>
          </div>
          <div class="login-accounts-grid">
            <button type="button" class="login-account-chip" data-email="carlos.ruiz@campus.example.edu" title="Cargar credenciales de Técnico">
              <span class="badge-nivel badge-tecnico">técnico</span>
              <span class="font-mono text-truncate">carlos.ruiz</span>
            </button>
            <button type="button" class="login-account-chip" data-email="ana.pech@campus.example.edu" title="Cargar credenciales de Coordinador">
              <span class="badge-nivel badge-coordinador">coord</span>
              <span class="font-mono text-truncate">ana.pech</span>
            </button>
            <button type="button" class="login-account-chip" data-email="laura.mendez@campus.example.edu" title="Cargar credenciales de Reportante">
              <span class="badge-nivel badge-reportante">report</span>
              <span class="font-mono text-truncate">laura.mendez</span>
            </button>
            <button type="button" class="login-account-chip" data-email="jorge.herrera@campus.example.edu" title="Cargar credenciales de Directivo">
              <span class="badge-nivel badge-directivo">direct</span>
              <span class="font-mono text-truncate">jorge.herrera</span>
            </button>
            <button type="button" class="login-account-chip" data-email="lizandro.reyes@utmetropolitana.edu.mx" data-password="lizandro_2026" title="Cargar credenciales de Superadmin">
              <span class="badge-nivel badge-superadmin">super</span>
              <span class="font-mono text-truncate">lizandro.reyes</span>
            </button>
          </div>
        </div>

        <footer class="login-footer">
          <div class="d-flex justify-content-between align-items-center text-muted font-mono" style="font-size:0.675rem;">
            <span>SESIÓN SEGURA TLS 1.3</span>
            <span>POLÍTICA CAMPUS 2026</span>
          </div>
        </footer>
      </div>
    </div>
  `;

  // ── Lógica del formulario ───────────────────────────────────────────────
  const form = document.getElementById('login-form');
  const correoEl = document.getElementById('login-correo');
  const pwdEl = document.getElementById('login-password');
  const toggleBtn = document.getElementById('login-toggle-pwd');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnLabel = document.getElementById('login-btn-label');
  const spinner = document.getElementById('login-spinner');

  // Mostrar/ocultar contraseña (con texto limpio, sin emojis AI slop)
  toggleBtn?.addEventListener('click', () => {
    const isText = pwdEl.type === 'text';
    pwdEl.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? 'Mostrar' : 'Ocultar';
    toggleBtn.setAttribute('aria-label', isText ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  // Selector rápido de cuentas mock de un clic
  container.querySelectorAll('.login-account-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const email = chip.getAttribute('data-email');
      const pass = chip.getAttribute('data-password') || 'UtmDesk#2026';
      if (email && correoEl && pwdEl) {
        correoEl.value = email;
        pwdEl.value = pass;
        clearError();
        submitBtn.focus();
      }
    });
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnLabel.textContent = loading ? 'Verificando…' : 'Acceder al sistema';
    spinner.hidden = !loading;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    correoEl.setAttribute('aria-invalid', 'true');
    pwdEl.setAttribute('aria-invalid', 'true');
  }

  function clearError() {
    errorEl.hidden = true;
    correoEl.removeAttribute('aria-invalid');
    pwdEl.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const correo = correoEl.value.trim();
    const password = pwdEl.value;

    if (!correo || !password) {
      showError('Completa correo y contraseña para continuar.');
      return;
    }

    setLoading(true);

    try {
      if (USE_MOCK) {
        // ── Modo mock: autenticación simulada ───────────────────────────
        await new Promise(r => setTimeout(r, 700)); // simular latencia

        // Mapa de cuentas mock
        const MOCK_ACCOUNTS = {
          'laura.mendez@campus.example.edu': { nombre: 'Laura Méndez', nivel_acceso: 'reportante', tipo_reportante: 'docente' },
          'miguel.torres@campus.example.edu': { nombre: 'Miguel Torres', nivel_acceso: 'reportante', tipo_reportante: 'docente' },
          'sofia.pool@campus.example.edu': { nombre: 'Sofía Pool', nivel_acceso: 'reportante', tipo_reportante: 'docente' },
          'diego.cauich@campus.example.edu': { nombre: 'Diego Cauich', nivel_acceso: 'reportante', tipo_reportante: 'docente' },
          'marisol.chan@campus.example.edu': { nombre: 'Marisol Chan', nivel_acceso: 'reportante', tipo_reportante: 'administrativo' },
          'valeria.euan@campus.example.edu': { nombre: 'Valeria Euán', nivel_acceso: 'reportante', tipo_reportante: 'estudiante' },
          'carlos.ruiz@campus.example.edu': { nombre: 'Carlos Ruiz', nivel_acceso: 'tecnico', tipo_reportante: null },
          'roberto.canul@campus.example.edu': { nombre: 'Roberto Canul', nivel_acceso: 'tecnico', tipo_reportante: null },
          'elena.dzul@campus.example.edu': { nombre: 'Elena Dzul', nivel_acceso: 'tecnico', tipo_reportante: null },
          'pedro.kuk@campus.example.edu': { nombre: 'Pedro Kuk', nivel_acceso: 'tecnico', tipo_reportante: null },
          'ana.pech@campus.example.edu': { nombre: 'Ana Pech', nivel_acceso: 'coordinador', tipo_reportante: null },
          'jorge.herrera@campus.example.edu': { nombre: 'Jorge Herrera', nivel_acceso: 'directivo', tipo_reportante: null },
          'lizandro.reyes@utmetropolitana.edu.mx': { nombre: 'lizandro.reyes', nivel_acceso: 'superadmin', tipo_reportante: null, password: 'lizandro_2026' },
        };

        const account = MOCK_ACCOUNTS[correo.toLowerCase()];
        const expectedPassword = account?.password || 'UtmDesk#2026';
        if (!account || password !== expectedPassword) {
          showError('Credenciales incorrectas. Revisa correo y contraseña.');
          setLoading(false);
          return;
        }

        // Generar token mock (no es un JWT real, solo para pruebas)
        const mockPayload = btoa(JSON.stringify({
          ...account,
          correo: correo.toLowerCase(),
          exp: Math.floor(Date.now() / 1000) + 8 * 3600,
        }));
        const mockToken = `mock.${mockPayload}.sig`;
        saveSession(mockToken, { ...account, correo: correo.toLowerCase() });

      } else {
        // ── Modo real: llamada al backend ────────────────────────────────
        const resp = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, password }),
        });

        const data = await resp.json();

        if (!resp.ok) {
          showError(data.error || 'Error al iniciar sesión.');
          setLoading(false);
          return;
        }

        saveSession(data.token, data.usuario);
      }

      // Login exitoso
      showToast(`Bienvenido, ${getUsuarioNombre()}`, 'success');
      onLoginSuccess();

    } catch (err) {
      console.error('[login]', err);
      showError('No se pudo conectar con el servidor. Verifica tu conexión.');
      setLoading(false);
    }
  });

  // Autofocus en correo
  correoEl.focus();
}

function getUsuarioNombre() {
  try {
    const raw = sessionStorage.getItem('utm_session');
    return JSON.parse(raw)?.usuario?.nombre ?? 'usuario';
  } catch { return 'usuario'; }
}
