/**
 * UTM Desk — Vista de Registro Público de Cuentas (RF-01, RF-24)
 * Permite a cualquier persona del campus registrar una cuenta de nivel 'reportante'
 * (docente, estudiante o administrativo).
 */

import { registerUser } from '../api.js';
import { showToast } from '../utils.js';

export function renderRegistroCuentaView(container) {
  container.innerHTML = `
    <div class="login-backdrop" id="registro-screen" aria-label="Pantalla de registro de cuenta">
      <div class="login-panel" role="main" style="max-width: 480px;">

        <header class="login-header">
          <div class="login-brand-meta">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="system-status-led" title="Servicio de registro activo">
                <span class="led-dot" aria-hidden="true"></span> REGISTRO • ACTIVO
              </span>
              <a href="#/login" class="font-mono text-muted text-decoration-none" style="font-size:0.75rem;">← VOLVER AL LOGIN</a>
            </div>
            <h1 class="login-title font-mono">NUEVA CUENTA</h1>
            <p class="login-subtitle">Registro institucional de reportante en UTM Desk</p>
          </div>
        </header>

        <form id="registro-cuenta-form" class="login-form" novalidate>
          <div class="login-field-group">
            <label for="reg-nombre" class="login-label">Nombre Completo *</label>
            <input
              type="text"
              id="reg-nombre"
              name="nombre_completo"
              class="form-control-custom"
              placeholder="Ej. Dra. Laura Méndez"
              required
              aria-required="true"
            >
          </div>

          <div class="login-field-group">
            <label for="reg-correo" class="login-label">Correo Institucional *</label>
            <input
              type="email"
              id="reg-correo"
              name="correo"
              class="form-control-custom font-mono"
              placeholder="usuario@campus.example.edu"
              required
              aria-required="true"
            >
          </div>

          <div class="login-field-group">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label for="reg-password" class="login-label mb-0">Contraseña (Mínimo 8 caracteres) *</label>
              <button
                type="button"
                id="reg-toggle-pwd"
                class="login-pwd-text-toggle"
                aria-label="Mostrar contraseña"
              >Mostrar</button>
            </div>
            <input
              type="password"
              id="reg-password"
              name="password"
              class="form-control-custom font-mono"
              placeholder="Mínimo 8 caracteres"
              minlength="8"
              required
              aria-required="true"
            >
          </div>

          <div class="login-field-group">
            <label for="reg-tipo" class="login-label">Tipo de Reportante *</label>
            <select id="reg-tipo" name="tipo_reportante" class="form-select-custom font-mono" required aria-required="true">
              <option value="">Seleccione tipo...</option>
              <option value="docente">Docente</option>
              <option value="estudiante">Estudiante</option>
              <option value="administrativo">Administrativo</option>
            </select>
            <div class="form-hint" style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
              Todas las cuentas se crean exclusivamente con nivel <strong>reportante</strong> y estado activo.
            </div>
          </div>

          <!-- Error feedback -->
          <div id="reg-error" class="login-error" role="alert" aria-live="assertive" hidden></div>

          <!-- Botón de registro -->
          <button type="submit" id="reg-submit-btn" class="btn-custom-primary login-btn mt-3">
            <span id="reg-btn-label">Crear Cuenta</span>
            <span id="reg-spinner" class="login-spinner" hidden aria-hidden="true"></span>
          </button>

          <div class="text-center mt-3" style="font-size:0.8rem;">
            <span class="text-muted">¿Ya tienes cuenta institucional?</span>
            <a href="#/login" class="fw-bold ms-1 text-decoration-none">Inicia sesión</a>
          </div>
        </form>

        <footer class="login-footer">
          <div class="d-flex justify-content-between align-items-center text-muted font-mono" style="font-size:0.675rem;">
            <span>POLÍTICA CAMPUS 2026</span>
            <span>AUTORIZACIÓN RBAC</span>
          </div>
        </footer>
      </div>
    </div>
  `;

  const form = document.getElementById('registro-cuenta-form');
  const nombreEl = document.getElementById('reg-nombre');
  const correoEl = document.getElementById('reg-correo');
  const pwdEl = document.getElementById('reg-password');
  const tipoEl = document.getElementById('reg-tipo');
  const toggleBtn = document.getElementById('reg-toggle-pwd');
  const errorEl = document.getElementById('reg-error');
  const submitBtn = document.getElementById('reg-submit-btn');
  const btnLabel = document.getElementById('reg-btn-label');
  const spinner = document.getElementById('reg-spinner');

  toggleBtn?.addEventListener('click', () => {
    const isText = pwdEl.type === 'text';
    pwdEl.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? 'Mostrar' : 'Ocultar';
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const nombre_completo = nombreEl.value.trim();
    const correo = correoEl.value.trim();
    const password = pwdEl.value;
    const tipo_reportante = tipoEl.value;

    if (!nombre_completo || !correo || !password || !tipo_reportante) {
      showError('Todos los campos son obligatorios.');
      return;
    }

    if (password.length < 8) {
      showError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    submitBtn.disabled = true;
    btnLabel.textContent = 'Registrando…';
    spinner.hidden = false;

    try {
      await registerUser({
        nombre_completo,
        correo,
        password,
        tipo_reportante,
      });

      showToast('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      showError(err.message || 'Error al crear la cuenta.');
      submitBtn.disabled = false;
      btnLabel.textContent = 'Crear Cuenta';
      spinner.hidden = true;
    }
  });

  nombreEl?.focus();
}
