/**
 * UTM Desk — Aplicación Principal y Hash Router
 * Enrutamiento basado en hash SPA y orquestación del ciclo de vida de vistas.
 */

import { USE_MOCK } from './config.js';
import { renderTableroView } from './views/tablero.js';
import { renderRegistroView } from './views/registro.js';
import { renderDetalleView } from './views/detalle.js';
import { renderBusquedaView } from './views/busqueda.js';
import { renderAnaliticaView } from './views/analitica.js';

// Elementos raíz del DOM
const viewContainer = document.getElementById('app-view-container');
const mockBadge = document.getElementById('mock-badge-indicator');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Configurar visibilidad del badge de mock
if (!USE_MOCK && mockBadge) {
  mockBadge.style.display = 'none';
}

// ==========================================================================
// TEMA CLARO / OSCURO (Soporta preferencia del sistema y alternancia manual)
// ==========================================================================

let currentTheme = 'auto';

function initTheme() {
  const saved = sessionStorage.getItem('utm_theme_preference');
  if (saved === 'dark' || saved === 'light') {
    currentTheme = saved;
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    currentTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    sessionStorage.setItem('utm_theme_preference', currentTheme);

    // Notificar cambio de tema para redibujado de gráficas si aplica
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: currentTheme } }));
  });
}

initTheme();

// ==========================================================================
// HASH ROUTER
// ==========================================================================

function updateNavActive(route) {
  const links = document.querySelectorAll('.nav-link-custom');
  links.forEach(link => link.classList.remove('active'));

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
  updateNavActive(hash);

  // Limpiar y enfocar el contenedor accesible
  viewContainer.innerHTML = '';
  viewContainer.focus();

  // Enrutamiento de vistas
  if (hash === '#/' || hash === '#/tablero') {
    await renderTableroView(viewContainer);
  } else if (hash === '#/registro') {
    await renderRegistroView(viewContainer);
  } else if (hash.startsWith('#/incidencia/')) {
    const codigo = decodeURIComponent(hash.replace('#/incidencia/', '').trim());
    await renderDetalleView(viewContainer, codigo);
  } else if (hash.startsWith('#/busqueda')) {
    await renderBusquedaView(viewContainer);
  } else if (hash === '#/analitica') {
    await renderAnaliticaView(viewContainer);
  } else {
    // Redirigir por defecto al tablero
    window.location.hash = '#/tablero';
  }
}

// Escuchar cambios de hash y carga inicial
window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);
