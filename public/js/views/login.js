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

        <!-- Cabecera institucional -->
        <div class="login-header">
          <div class="login-brand-icon font-mono" aria-hidden="true">UTM</div>
          <div>
            <h1 class="login-title">UTM Desk</h1>
            <p class="login-subtitle">Campus Operations Console · v2.4</p>
          </div>
        </div>

        <!-- Indicador de modo -->
        ${USE_MOCK ? `
        <div class="login-mock-notice" role="note">
          <span class="font-mono" style="font-size:0.7rem;letter-spacing:.05em;">⚠ MODO MOCK ACTIVO</span>
          <span style="font-size:0.72rem;">Usa cualquier correo y contraseña para entrar</span>
        </div>` : ''}

        <!-- Formulario -->
        <form id="login-form" class="login-form" novalidate autocomplete="on">
          <div class="login-field-group">
            <label for="login-correo" class="login-label">Correo institucional</label>
            <input
              type="email"
              id="login-correo"
              name="correo"
              class="login-input font-mono"
              placeholder="usuario@campus.example.edu"
              autocomplete="username email"
              required
              aria-required="true"
            >
          </div>

          <div class="login-field-group">
            <label for="login-password" class="login-label">Contraseña</label>
            <div class="login-password-wrapper">
              <input
                type="password"
                id="login-password"
                name="password"
                class="login-input"
                placeholder="••••••••••••"
                autocomplete="current-password"
                required
                aria-required="true"
              >
              <button
                type="button"
                id="login-toggle-pwd"
                class="login-pwd-toggle"
                aria-label="Mostrar u ocultar contraseña"
                title="Mostrar / ocultar contraseña"
              >👁</button>
            </div>
          </div>

          <!-- Error feedback -->
          <div id="login-error" class="login-error" role="alert" aria-live="assertive" hidden></div>

          <!-- Botón de acceso -->
          <button type="submit" id="login-submit-btn" class="btn-custom-primary login-btn">
            <span id="login-btn-label">Acceder al sistema</span>
            <span id="login-spinner" class="login-spinner" hidden aria-hidden="true"></span>
          </button>
        </form>

        <!-- Sugerencia de cuentas de prueba (solo visible en modo mock) -->
        ${USE_MOCK ? `
        <details class="login-hint-details">
          <summary class="login-hint-summary">Cuentas de prueba</summary>
          <div class="login-hint-body">
            <div class="login-hint-row">
              <span class="badge-nivel badge-reportante">reportante</span>
              <span class="font-mono" style="font-size:0.72rem;">laura.mendez@campus.example.edu</span>
            </div>
            <div class="login-hint-row">
              <span class="badge-nivel badge-tecnico">técnico</span>
              <span class="font-mono" style="font-size:0.72rem;">carlos.ruiz@campus.example.edu</span>
            </div>
            <div class="login-hint-row">
              <span class="badge-nivel badge-coordinador">coordinador</span>
              <span class="font-mono" style="font-size:0.72rem;">ana.pech@campus.example.edu</span>
            </div>
            <div class="login-hint-row">
              <span class="badge-nivel badge-directivo">directivo</span>
              <span class="font-mono" style="font-size:0.72rem;">jorge.herrera@campus.example.edu</span>
            </div>
            <p style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;">
              Contraseña: <span class="font-mono">UtmDesk#2026</span>
            </p>
          </div>
        </details>` : ''}

        <p class="login-footer-note">
          Sistema institucional UTM · Acceso restringido a personal autorizado
        </p>
      </div>
    </div>
  `;

  // ── Lógica del formulario ───────────────────────────────────────────────
  const form      = document.getElementById('login-form');
  const correoEl  = document.getElementById('login-correo');
  const pwdEl     = document.getElementById('login-password');
  const toggleBtn = document.getElementById('login-toggle-pwd');
  const errorEl   = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnLabel  = document.getElementById('login-btn-label');
  const spinner   = document.getElementById('login-spinner');

  // Mostrar/ocultar contraseña
  toggleBtn.addEventListener('click', () => {
    const isText = pwdEl.type === 'text';
    pwdEl.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? '👁' : '🙈';
    toggleBtn.setAttribute('aria-label', isText ? 'Mostrar contraseña' : 'Ocultar contraseña');
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

    const correo   = correoEl.value.trim();
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
          'laura.mendez@campus.example.edu':  { nombre: 'Laura Méndez',  nivel_acceso: 'reportante',  tipo_reportante: 'docente' },
          'miguel.torres@campus.example.edu': { nombre: 'Miguel Torres', nivel_acceso: 'reportante',  tipo_reportante: 'docente' },
          'sofia.pool@campus.example.edu':    { nombre: 'Sofía Pool',    nivel_acceso: 'reportante',  tipo_reportante: 'docente' },
          'diego.cauich@campus.example.edu':  { nombre: 'Diego Cauich',  nivel_acceso: 'reportante',  tipo_reportante: 'docente' },
          'marisol.chan@campus.example.edu':  { nombre: 'Marisol Chan',  nivel_acceso: 'reportante',  tipo_reportante: 'administrativo' },
          'valeria.euan@campus.example.edu':  { nombre: 'Valeria Euán',  nivel_acceso: 'reportante',  tipo_reportante: 'estudiante' },
          'carlos.ruiz@campus.example.edu':   { nombre: 'Carlos Ruiz',   nivel_acceso: 'tecnico',     tipo_reportante: null },
          'roberto.canul@campus.example.edu': { nombre: 'Roberto Canul', nivel_acceso: 'tecnico',     tipo_reportante: null },
          'elena.dzul@campus.example.edu':    { nombre: 'Elena Dzul',    nivel_acceso: 'tecnico',     tipo_reportante: null },
          'pedro.kuk@campus.example.edu':     { nombre: 'Pedro Kuk',     nivel_acceso: 'tecnico',     tipo_reportante: null },
          'ana.pech@campus.example.edu':      { nombre: 'Ana Pech',      nivel_acceso: 'coordinador', tipo_reportante: null },
          'jorge.herrera@campus.example.edu': { nombre: 'Jorge Herrera', nivel_acceso: 'directivo',   tipo_reportante: null },
        };

        const account = MOCK_ACCOUNTS[correo.toLowerCase()];
        if (!account || password !== 'UtmDesk#2026') {
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
