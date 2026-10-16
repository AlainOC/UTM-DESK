/**
 * UTM Desk — Utilidades Generales
 * Funciones de sanitización, formateo local es-MX, toasts y renderers accesibles.
 */

import { CATEGORIAS, PRIORIDADES, ESTADOS } from './config.js';

/**
 * Escapa cadenas para prevenir inyecciones XSS al renderizar en el DOM.
 * @param {any} str Valor a escapar
 * @returns {string} Cadena segura
 */
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formatea una fecha UTC ISO en hora local es-MX legible.
 * @param {string} isoString Fecha en formato ISO UTC
 * @returns {string} Fecha y hora localizada
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return String(isoString);
  }
}

/**
 * Calcula la fecha de expiración TTL (60 días tras fecha de resolución)
 * @param {string} fechaResolucionIso Fecha de resolución ISO
 * @returns {string} Fecha estimada de eliminación
 */
export function formatTTLDate(fechaResolucionIso) {
  if (!fechaResolucionIso) return '';
  try {
    const d = new Date(fechaResolucionIso);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 60);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

/**
 * Normaliza una etiqueta (tag): minúsculas, sin espacios al inicio/final ni duplicados internos.
 * @param {string} tag
 * @returns {string}
 */
export function normalizeTag(tag) {
  if (!tag) return '';
  return String(tag).trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Validador estricto de dirección IPv4 (0.0.0.0 a 255.255.255.255).
 * @param {string} ip
 * @returns {boolean}
 */
export function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return regex.test(ip.trim());
}

/**
 * Validador de formato de correo electrónico.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Limpia un objeto eliminando campos vacíos, cadenas en blanco, undefined o null.
 * Regla de datos del backend: NUNCA enviar campos nulos o vacíos.
 * @param {object} obj
 * @returns {object}
 */
export function cleanPayload(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      const arr = value.filter(v => v !== null && v !== undefined && v !== '');
      if (arr.length > 0) {
        cleaned[key] = arr;
      }
    } else if (typeof value === 'object') {
      const nested = cleanPayload(value);
      if (Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Genera el HTML de un badge de Estado con accesibilidad multi-sensorial.
 * @param {string} estado
 * @returns {string}
 */
export function renderStatusBadge(estado) {
  const conf = ESTADOS[estado] || { label: estado, badgeClass: 'status-abierta', glyph: '○' };
  return `<span class="status-badge ${conf.badgeClass}" role="status" title="Estado: ${esc(conf.label)}"><span aria-hidden="true">${conf.glyph}</span> ${esc(conf.label)}</span>`;
}

/**
 * Genera el HTML de un badge de Prioridad con glifo distintivo.
 * @param {string} prioridad
 * @returns {string}
 */
export function renderPriorityBadge(prioridad) {
  const conf = PRIORIDADES[prioridad] || { label: prioridad, badgeClass: 'prio-baja', glyph: '●' };
  return `<span class="prio-badge ${conf.badgeClass}" title="Prioridad: ${esc(conf.label)}"><span aria-hidden="true">${conf.glyph}</span> ${esc(conf.label)}</span>`;
}

/**
 * Genera el HTML de un badge de Categoría.
 * @param {string} categoria
 * @returns {string}
 */
export function renderCategoryBadge(categoria) {
  const conf = CATEGORIAS[categoria] || { label: categoria, badgeClass: 'cat-computo_redes', glyph: '⚡' };
  return `<span class="cat-badge ${conf.badgeClass}" title="Categoría: ${esc(conf.label)}"><span aria-hidden="true">${conf.glyph}</span> ${esc(conf.label)}</span>`;
}

/**
 * Sistema de Toasts flotantes en pantalla para notificaciones de acción.
 * @param {string} message Texto del mensaje
 * @param {'success'|'error'|'info'} type Tipo de toast
 * @param {number} duration Duración en milisegundos
 */
export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('app-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toasts';
    container.className = 'toast-container-custom';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-custom toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠' : 'ℹ');
  toast.innerHTML = `
    <span style="font-weight:700;font-size:1.1rem;line-height:1" aria-hidden="true">${icon}</span>
    <div style="flex:1" class="text-break-word">${esc(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 220);
  }, duration);
}

/**
 * Muestra un estado de carga sobrio en un elemento contenedor.
 * @param {HTMLElement} el
 * @param {string} message
 */
export function renderLoading(el, message = 'Cargando información del campus...') {
  el.innerHTML = `
    <div class="state-container" role="status" aria-live="polite">
      <div class="app-spinner" aria-hidden="true"></div>
      <div class="state-title" style="font-size:1rem;margin-top:1rem;">${esc(message)}</div>
    </div>
  `;
}

/**
 * Muestra un estado de error estructurado con opción de reintento.
 * @param {HTMLElement} el
 * @param {string} errorMsg
 * @param {Function|null} retryFn
 */
export function renderError(el, errorMsg, retryFn = null) {
  el.innerHTML = `
    <div class="state-container state-error" role="alert">
      <div class="state-icon" aria-hidden="true">⚠</div>
      <div class="state-title">No fue posible completar la solicitud</div>
      <div class="state-desc">${esc(errorMsg)}</div>
      ${retryFn ? `<button type="button" class="btn-custom-secondary btn-retry">Reintentar</button>` : ''}
    </div>
  `;
  if (retryFn) {
    el.querySelector('.btn-retry')?.addEventListener('click', () => retryFn());
  }
}

/**
 * Formatea el peso en KB/MB de un archivo adjunto.
 * @param {number} pesoKb
 * @returns {string}
 */
export function formatFileSize(pesoKb) {
  if (!pesoKb && pesoKb !== 0) return '';
  if (pesoKb >= 1024) {
    return `${(pesoKb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(pesoKb)} KB`;
}
