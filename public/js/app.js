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
// TEMA CLARO / OSCURO
// ==========================================================================

function initTheme() {
  const saved = sessionStorage.getItem('utm_theme_preference');
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    sessionStorage.setItem('utm_theme_preference', next);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: next } }));
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

  // Registrar Incidencia: SOLO reportante (RF-04 a RF-08)
  if (navRegistro) {
    navRegistro.style.display = rol === 'reportante' ? 'inline-flex' : 'none';
  }

  // Búsqueda: técnico, coordinador, directivo (RF-20)
  if (navBusqueda) {
    navBusqueda.style.display = (rol === 'tecnico' || rol === 'coordinador' || rol === 'directivo')
      ? 'inline-flex'
      : 'none';
  }

  // Analítica: SOLO directivo (RF-21, RF-22)
  if (navAnalitica) {
    navAnalitica.style.display = rol === 'directivo' ? 'inline-flex' : 'none';
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

  // ── Rutas públicas sin autenticación ──────────────────────────────────
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
    // Solo reportante puede registrar incidencias (CU-01 / RF-04 a RF-08)
    if (!tieneRol('reportante')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">El levantamiento de incidencias es exclusivo para usuarios con rol <strong>reportante</strong>.</p>
          <a href="#/tablero" class="btn-custom-secondary">← Volver al tablero</a>
        </div>`;
      return;
    }
    await renderRegistroView(viewContainer);

  } else if (hash.startsWith('#/incidencia/')) {
    const codigo = decodeURIComponent(hash.replace('#/incidencia/', '').trim());
    await renderDetalleView(viewContainer, codigo);

  } else if (hash.startsWith('#/busqueda')) {
    // Técnico, coordinador y directivo (RF-20)
    if (!tieneRol('tecnico', 'coordinador', 'directivo')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">La búsqueda operativa está reservada para personal técnico, coordinación y directivos.</p>
          <a href="#/tablero" class="btn-custom-secondary">← Volver al tablero</a>
        </div>`;
      return;
    }
    await renderBusquedaView(viewContainer);

  } else if (hash === '#/analitica') {
    // SOLO directivo (RF-21, RF-22)
    if (!tieneRol('directivo')) {
      viewContainer.innerHTML = `
        <div class="state-container state-error" style="margin-top:3rem;">
          <div class="state-icon" aria-hidden="true">🔒</div>
          <h2 class="state-title">Acceso restringido</h2>
          <p class="state-desc">La consola de analítica y métricas institucionales es de acceso exclusivo para <strong>directivos</strong>.</p>
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
