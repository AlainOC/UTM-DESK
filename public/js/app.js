/**
 * UTM Desk — Aplicación Principal y Hash Router
 * Enrutamiento SPA con guard de autenticación JWT y control de nivel de acceso.
 */

import { USE_MOCK } from './config.js';
import { isLoggedIn, getUsuario, clearSession, tieneAcceso } from './auth.js';
import { renderLoginView } from './views/login.js';
import { renderTableroView } from './views/tablero.js';
import { renderRegistroView } from './views/registro.js';
import { renderDetalleView } from './views/detalle.js';
import { renderBusquedaView } from './views/busqueda.js';
import { renderAnaliticaView } from './views/analitica.js';

// Elementos raíz del DOM
const viewContainer  = document.getElementById('app-view-container');
const mockBadge      = document.getElementById('mock-badge-indicator');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const navBar         = document.querySelector('.app-navbar .container-fluid');

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
// NAVBAR — Chip de usuario y botón logout (se inyecta dinámicamente)
// ==========================================================================

function renderUserChip() {
  // Eliminar chip previo si existe
  document.getElementById('user-chip-wrapper')?.remove();

  const usuario = getUsuario();
  if (!usuario) return;

  const nivelLabels = {
    reportante:  { label: 'Reportante', cls: 'badge-reportante' },
    tecnico:     { label: 'Técnico',    cls: 'badge-tecnico' },
    coordinador: { label: 'Coord.',     cls: 'badge-coordinador' },
    directivo:   { label: 'Directivo',  cls: 'badge-directivo' },
  };
  const { label, cls } = nivelLabels[usuario.nivel_acceso] ?? { label: usuario.nivel_acceso, cls: '' };

  const wrapper = document.createElement('div');
  wrapper.id = 'user-chip-wrapper';
  wrapper.className = 'd-flex align-items-center gap-2';
  wrapper.innerHTML = `
    <div class="user-chip" title="${usuario.correo}">
      <span class="badge-nivel ${cls}">${label}</span>
      <span class="user-chip-name">${usuario.nombre.split(' ')[0]}</span>
    </div>
    <button type="button" id="logout-btn" class="btn-custom-secondary btn-custom-sm" title="Cerrar sesión" aria-label="Cerrar sesión">
      ⏻
    </button>
  `;
  navBar.appendChild(wrapper);

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    renderUserChip(); // limpia el chip
    window.location.hash = '#/login';
    handleRouting();
  });
}

// ==========================================================================
// HASH ROUTER
// ==========================================================================

function updateNavActive(route) {
  document.querySelectorAll('.nav-link-custom').forEach(l => l.classList.remove('active'));
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

  // ── Guard de autenticación ────────────────────────────────────────────
  if (!isLoggedIn()) {
    // Si no hay sesión activa, siempre al login
    viewContainer.innerHTML = '';
    renderLoginView(viewContainer, () => {
      // Callback post-login exitoso
      renderUserChip();
      window.location.hash = '#/tablero';
      handleRouting();
    });
    return;
  }

  // Actualizar chip de usuario
  renderUserChip();
  updateNavActive(hash);
  viewContainer.innerHTML = '';
  viewContainer.focus();

  // ── Enrutamiento ──────────────────────────────────────────────────────
  if (hash === '#/' || hash === '#/tablero' || hash === '#/login') {
    await renderTableroView(viewContainer);

  } else if (hash === '#/registro') {
    await renderRegistroView(viewContainer);

  } else if (hash.startsWith('#/incidencia/')) {
    const codigo = decodeURIComponent(hash.replace('#/incidencia/', '').trim());
    await renderDetalleView(viewContainer, codigo);

  } else if (hash.startsWith('#/busqueda')) {
    await renderBusquedaView(viewContainer);

  } else if (hash === '#/analitica') {
    // Solo coordinador y directivo pueden ver analítica
    if (!tieneAcceso('coordinador')) {
      viewContainer.innerHTML = `
        <div class="empty-state" style="margin-top:4rem;">
          <div class="empty-state-icon" aria-hidden="true">🔒</div>
          <h2 class="empty-state-title">Acceso restringido</h2>
          <p class="empty-state-desc">La vista de Analítica requiere nivel <strong>coordinador</strong> o superior.</p>
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
