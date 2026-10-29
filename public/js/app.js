/**
 * UTM Desk — Aplicación Principal y Hash Router (RF-24)
 * Enrutamiento SPA con guard de autenticación JWT y control de acceso estricto por rol.
 */

import { USE_MOCK } from './config.js';
import { isLoggedIn, getUsuario, clearSession, tieneRol } from './auth.js';
import { renderLoginView } from './views/login.js';
import { renderRegistroCuentaView } from './views/registroCuenta.js';
import { renderTableroView } from './views/tablero.js';
import { renderRegistroView } from './views/registro.js';
import { renderDetalleView } from './views/detalle.js';
import { renderBusquedaView } from './views/busqueda.js';
import { renderAnaliticaView } from './views/analitica.js';

// Elementos raíz del DOM
const viewContainer = document.getElementById('app-view-container');
const mockBadge = document.getElementById('mock-badge-indicator');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const navBar = document.querySelector('.app-navbar .container-fluid');

// Badge de mock
if (!USE_MOCK && mockBadge) mockBadge.style.display = 'none';

// ==========================================================================
// TEMA CLARO / OSCURO (Sincronización Dual UTM + Bootstrap 5.3)
// ==========================================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);

  if (themeToggleBtn) {
    const isDark = theme === 'dark';
    themeToggleBtn.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    const icon = themeToggleBtn.querySelector('#theme-icon');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  }
}

function initTheme() {
  const saved = sessionStorage.getItem('utm_theme_preference');
  const isDark = saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const theme = isDark ? 'dark' : 'light';
  applyTheme(theme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    sessionStorage.setItem('utm_theme_preference', next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: next } }));
  });
}

// Escuchar cambios automáticos del sistema si el usuario no ha forzado preferencia
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!sessionStorage.getItem('utm_theme_preference')) {
      const next = e.matches ? 'dark' : 'light';
      applyTheme(next);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: next } }));
    }
  });
}

initTheme();

// ==========================================================================
// CONTROL DE VISIBILIDAD DE NAVBAR SEGÚN ROL (RF-24)
// ==========================================================================

function filterNavByRole() {
  const navTablero = document.getElementById('nav-tablero');
  const navRegistro = document.getElementById('nav-registro');
  const navBusqueda = document.getElementById('nav-busqueda');
  const navAnalitica = document.getElementById('nav-analitica');

  if (!isLoggedIn()) {
    if (navTablero) navTablero.style.display = 'none';
    if (navRegistro) navRegistro.style.display = 'none';
    if (navBusqueda) navBusqueda.style.display = 'none';
    if (navAnalitica) navAnalitica.style.display = 'none';
    return;
  }

  const usuario = getUsuario();
  const rol = usuario?.nivel_acceso;

  // Tablero: todos los roles
  if (navTablero) navTablero.style.display = 'inline-flex';

  // Registrar Incidencia: reportante y superadmin (RF-04 a RF-08)
  if (navRegistro) {
    navRegistro.style.display = (rol === 'reportante' || rol === 'superadmin') ? 'inline-flex' : 'none';
  }

  // Búsqueda: técnico, coordinador, directivo, superadmin (RF-20)
  if (navBusqueda) {
    navBusqueda.style.display = (rol === 'tecnico' || rol === 'coordinador' || rol === 'directivo' || rol === 'superadmin')
      ? 'inline-flex'
      : 'none';
  }

  // Analítica: directivo y superadmin (RF-21, RF-22)
  if (navAnalitica) {
    navAnalitica.style.display = (rol === 'directivo' || rol === 'superadmin') ? 'inline-flex' : 'none';
  }
}

// ==========================================================================
// NAVBAR — Chip de usuario y botón logout
// ==========================================================================

function renderUserChip() {
  const userSlot = document.getElementById('navbar-user-slot');
  const roleContext = document.getElementById('navbar-role-context');

  if (!userSlot) return;
  userSlot.innerHTML = '';

  if (!isLoggedIn()) {
    if (roleContext) roleContext.innerHTML = '';
    return;
  }
  const usuario = getUsuario();
  if (!usuario) {
    if (roleContext) roleContext.innerHTML = '';
    return;
  }

  const nivelMeta = {
    reportante: {
      label: 'Reportante',
      cls: 'badge-reportante',
      dotCls: 'dot-reportante',
      scope: 'PORTAL // REPORTE DE INCIDENCIAS'
    },
    tecnico: {
      label: 'Técnico',
      cls: 'badge-tecnico',
      dotCls: 'dot-tecnico',
      scope: 'DESPACHO NOC // SOPORTE Y REDES'
    },
    coordinador: {
      label: 'Coord.',
      cls: 'badge-coordinador',
      dotCls: 'dot-coordinador',
      scope: 'MESA DE CONTROL // ASIGNACIÓN & TRIAJE'
    },
    directivo: {
      label: 'Directivo',
      cls: 'badge-directivo',
      dotCls: 'dot-directivo',
      scope: 'CONSOLA DIRECTIVA // ANALÍTICA CAMPUS'
    },
    superadmin: {
      label: 'Superadmin',
      cls: 'badge-superadmin',
      dotCls: 'dot-superadmin',
      scope: 'SUPERVISIÓN Y EVALUACIÓN // AUDITORÍA & CONTROL'
    },
  };
  const meta = nivelMeta[usuario.nivel_acceso] ?? {
    label: usuario.nivel_acceso,
    cls: '',
    dotCls: 'dot-reportante',
    scope: 'CAMPUS UNIVERSITARIO'
  };

  // Indicador de ámbito operativo central (elimina espacio muerto según el rol)
  if (roleContext) {
    roleContext.innerHTML = `
      <div class="nav-scope-badge" title="Ámbito de operaciones para nivel: ${meta.label}">
        <span class="nav-scope-dot ${meta.dotCls}" aria-hidden="true"></span>
        <span>${meta.scope}</span>
      </div>
    `;
  }

  const nombreCorto = (usuario.nombre_completo || usuario.nombre || 'Usuario').split(' ')[0];

  userSlot.innerHTML = `
    <div class="user-chip" title="${usuario.correo} (${meta.label})">
      <span class="badge-nivel ${meta.cls}">${meta.label}</span>
      <span class="user-chip-name">${nombreCorto}</span>
    </div>
    <button type="button" id="logout-btn" class="btn-custom-secondary btn-custom-sm" title="Cerrar sesión" aria-label="Cerrar sesión">
      ⏻
    </button>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearSession();
    renderUserChip();
    filterNavByRole();
    window.location.hash = '#/login';
    handleRouting();
  });
}

// ==========================================================================
// HASH ROUTER CON ACCESO POR ROL (RF-24)
// ==========================================================================

function updateNavActive(route) {
  document.querySelectorAll('.nav-deck-pill').forEach((l) => l.classList.remove('active'));
  if (route.startsWith('#/tablero') || route === '' || route === '#/') {
    document.getElementById('nav-tablero')?.classList.add('active');
  } else if (route.startsWith('#/registro')) {
    document.getElementById('nav-registro')?.classList.add('active');
  } else if (route.startsWith('#/busqueda')) {
    document.getElementById('nav-busqueda')?.classList.add('active');
  } else if (route.startsWith('#/analitica')) {
    document.getElementById('nav-analitica')?.classList.add('active');
  }
}

async function handleRouting() {
  const hash = window.location.hash || '#/tablero';

  // ── Rutas públicas de acceso (sin sesión previa) ──────────────────────
  if (!isLoggedIn()) {
    renderUserChip();
    filterNavByRole();

    if (hash === '#/registro-cuenta') {
      viewContainer.innerHTML = '';
      renderRegistroCuentaView(viewContainer);
      return;
    }

    // Cualquier otra ruta no autenticada va al login
    viewContainer.innerHTML = '';
    renderLoginView(viewContainer, () => {
      renderUserChip();
      filterNavByRole();
      window.location.hash = '#/tablero';
      handleRouting();
    });
    return;
  }

  // Actualizar UI con sesión activa
  renderUserChip();
  filterNavByRole();
  updateNavActive(hash);
  viewContainer.innerHTML = '';
  viewContainer.focus();

  // ── Enrutamiento con Guard de Roles ───────────────────────────────────
  if (hash === '#/' || hash === '#/tablero' || hash === '#/login') {
    await renderTableroView(viewContainer);

  } else if (hash === '#/registro') {
    // Reportante o superadmin pueden registrar incidencias (CU-01 / RF-04 a RF-08)
    if (!tieneRol('reportante', 'superadmin')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">El levantamiento de incidencias está reservado para usuarios <strong>reportantes</strong> y <strong>superadministradores</strong>.</p>
          <a href="#/tablero" class="btn-custom-secondary">← Volver al tablero</a>
        </div>`;
      return;
    }
    await renderRegistroView(viewContainer);

  } else if (hash.startsWith('#/incidencia/')) {
    const codigo = decodeURIComponent(hash.replace('#/incidencia/', '').trim());
    await renderDetalleView(viewContainer, codigo);

  } else if (hash.startsWith('#/busqueda')) {
    // Técnico, coordinador, directivo y superadmin (RF-20)
    if (!tieneRol('tecnico', 'coordinador', 'directivo', 'superadmin')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">La búsqueda operativa está reservada para personal técnico, coordinación, directivos y supervisión.</p>
          <a href="#/tablero" class="btn-custom-secondary">← Volver al tablero</a>
        </div>`;
      return;
    }
    await renderBusquedaView(viewContainer);

  } else if (hash === '#/analitica') {
    // Directivo y superadmin (RF-21, RF-22)
    if (!tieneRol('directivo', 'superadmin')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">La consola de analítica y métricas institucionales es de acceso exclusivo para <strong>directivos</strong> y <strong>supervisión y evaluación</strong>.</p>
          <a href="#/tablero" class="btn-custom-secondary">← Volver al tablero</a>
        </div>`;
      return;
    }
    await renderAnaliticaView(viewContainer);

  } else {
    window.location.hash = '#/tablero';
  }
}

// Escuchar cambios de hash y carga inicial
window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);
