/**
 * UTM Desk — Vista Búsqueda (CU-05)
 * Búsqueda textual por relevancia de tickets, equipos, espacios o palabras clave.
 */

import { buscarIncidencias } from '../api.js';
import {
  esc,
  formatDate,
  renderStatusBadge,
  renderPriorityBadge,
  renderCategoryBadge,
  renderLoading,
  renderError
} from '../utils.js';

export async function renderBusquedaView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Búsqueda Global de Incidencias</h1>
        <p class="view-desc">Localiza tickets por código (INC-2026-XXXX), palabras clave, equipos, espacios o etiquetas.</p>
      </div>
    </div>

    <!-- Barra de Búsqueda -->
    <section class="panel-card mb-4" aria-label="Búsqueda de incidencias">
      <form id="form-busqueda" class="row g-2 align-items-center">
        <div class="col-12 col-md-10">
          <div class="position-relative">
            <input type="search" id="input-busqueda" class="form-control-custom ps-4 font-mono" placeholder="Escribe para buscar... Ej: switch, INC-2026-0042, goteras, Edificio B, ISW-702" autofocus>
          </div>
        </div>
        <div class="col-12 col-md-2">
          <button type="submit" id="btn-ejecutar-busqueda" class="btn-custom-primary w-100">
            🔍 Buscar
          </button>
        </div>
      </form>
    </section>

    <!-- Resumen y Resultados -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span id="busqueda-meta-conteo" class="text-muted" style="font-size:0.85rem; font-weight:600;">
        Ingresa un término para comenzar
      </span>
    </div>

    <div id="busqueda-resultados-container">
      <div class="state-container">
        <div class="state-icon" aria-hidden="true">🔍</div>
        <div class="state-title">Explorador de Incidencias del Campus</div>
        <p class="state-desc">Puedes buscar por código de ticket, dirección IP, nombre de equipo, reportante, contratista o tags técnicos.</p>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-busqueda');
  const input = container.querySelector('#input-busqueda');
  const metaConteo = container.querySelector('#busqueda-meta-conteo');
  const resultadosContainer = container.querySelector('#busqueda-resultados-container');

  let debounceTimer = null;

  async function performSearch(query) {
    const q = (query || '').trim();
    if (!q) {
      metaConteo.textContent = 'Ingresa un término para comenzar';
      resultadosContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon" aria-hidden="true">🔍</div>
          <div class="state-title">Explorador de Incidencias del Campus</div>
          <p class="state-desc">Puedes buscar por código de ticket, dirección IP, nombre de equipo, reportante, contratista o tags técnicos.</p>
        </div>
      `;
      return;
    }

    renderLoading(resultadosContainer, `Buscando coincidencias para "${q}"...`);
    metaConteo.textContent = 'Buscando...';

    try {
      const results = await buscarIncidencias(q);
      renderResults(results, q);
    } catch (err) {
      renderError(resultadosContainer, err.message, () => performSearch(q));
      metaConteo.textContent = 'Error en búsqueda';
    }
  }

  function renderResults(list, query) {
    if (!list || list.length === 0) {
      metaConteo.textContent = `0 resultados para "${esc(query)}"`;
      resultadosContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon" aria-hidden="true">✕</div>
          <div class="state-title">Sin resultados para "${esc(query)}"</div>
          <p class="state-desc">Verifica la ortografía o intenta buscar por términos más generales como el edificio, categoría o número de ticket.</p>
        </div>
      `;
      return;
    }

    metaConteo.textContent = `${list.length} ${list.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'} para "${esc(query)}" (ordenadas por relevancia)`;

    resultadosContainer.innerHTML = `
      <!-- Vista Móvil (Tarjetas) -->
      <div class="d-md-none">
        ${list.map(inc => `
          <article class="ticket-mobile-card" tabindex="0" role="link" data-codigo="${esc(inc.codigo)}" aria-label="Incidencia ${esc(inc.codigo)}: ${esc(inc.titulo)}">
            <div class="card-top">
              <span class="ticket-code font-mono text-primary fw-bold">${esc(inc.codigo)}</span>
              <div>${renderStatusBadge(inc.estado)}</div>
            </div>
            <h2 class="card-title">${esc(inc.titulo)}</h2>
            <div class="card-meta mb-2">
              ${renderCategoryBadge(inc.categoria)}
              ${renderPriorityBadge(inc.prioridad)}
            </div>
            <div class="d-flex justify-content-between align-items-center pt-2 border-top" style="font-size:0.775rem; color:var(--text-muted);">
              <span>📍 ${esc(inc.ubicacion?.edificio || 'Campus')}</span>
              <span>👤 ${esc(typeof inc.tecnico_asignado === 'object' && inc.tecnico_asignado ? inc.tecnico_asignado.nombre : (inc.tecnico_asignado || 'Sin asignar'))}</span>
            </div>
          </article>
        `).join('')}
      </div>

      <!-- Vista Escritorio (Tabla Operativa) -->
      <div class="incidencias-table-wrapper d-none d-md-block">
        <table class="table-operativa" role="table">
          <thead>
            <tr>
              <th scope="col" style="width: 140px;">Código</th>
              <th scope="col">Título</th>
              <th scope="col" style="width: 150px;">Categoría</th>
              <th scope="col" style="width: 110px;">Prioridad</th>
              <th scope="col" style="width: 125px;">Estado</th>
              <th scope="col" style="width: 130px;">Edificio</th>
              <th scope="col" style="width: 160px;">Técnico</th>
              <th scope="col" style="width: 150px;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(inc => `
              <tr data-codigo="${esc(inc.codigo)}" tabindex="0" role="row">
                <td>
                  <a href="#/incidencia/${encodeURIComponent(inc.codigo)}" class="ticket-link font-mono" tabindex="-1">
                    ${esc(inc.codigo)}
                  </a>
                </td>
                <td>
                  <div class="fw-semibold text-break-word">${esc(inc.titulo)}</div>
                </td>
                <td>${renderCategoryBadge(inc.categoria)}</td>
                <td>${renderPriorityBadge(inc.prioridad)}</td>
                <td>${renderStatusBadge(inc.estado)}</td>
                <td><span style="font-size:0.825rem;">${esc(inc.ubicacion?.edificio || '—')}</span></td>
                <td><span class="${inc.tecnico_asignado ? 'fw-medium' : 'text-muted'}" style="font-size:0.825rem;">${esc(typeof inc.tecnico_asignado === 'object' && inc.tecnico_asignado ? inc.tecnico_asignado.nombre : (inc.tecnico_asignado || 'Sin asignar'))}</span></td>
                <td><span class="font-mono text-muted" style="font-size:0.775rem;">${formatDate(inc.fecha_creacion)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Asignar navegación al hacer clic en resultados
    resultadosContainer.querySelectorAll('[data-codigo]').forEach(el => {
      const codigo = el.getAttribute('data-codigo');
      const goTo = () => {
        window.location.hash = `#/incidencia/${encodeURIComponent(codigo)}`;
      };
      el.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') goTo();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goTo();
        }
      });
    });
  }

  // Evento submit de formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch(input.value);
  });

  // Búsqueda en tiempo real con debounce
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(input.value);
    }, 280);
  });
}
