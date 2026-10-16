/**
 * UTM Desk — Vista Tablero (RF-05)
 * Rediseño de Consola Técnica / NOC Universitario:
 * - Telemetría operativa en vivo (cola, críticas, en proceso, acumulados)
 * - Switcher táctico segmentado por estado con contadores dinámicos
 * - Tabla de alta densidad para triaje y despacho ágil en campus
 * - Modo móvil optimizado tipo terminal de campo
 */

import { getIncidencias } from '../api.js';
import { EDIFICIOS, CATEGORIAS, PRIORIDADES, ESTADOS } from '../config.js';
import {
  esc,
  formatDate,
  renderStatusBadge,
  renderPriorityBadge,
  renderCategoryBadge,
  renderLoading,
  renderError
} from '../utils.js';

export async function renderTableroView(container) {
  // Estado local para los filtros de la consola
  let activeStateFilter = '';

  container.innerHTML = `
    <!-- Barra Superior de Telemetría Operativa (NOC Pulse) -->
    <section class="noc-telemetry-bar" aria-label="Telemetría operativa de incidencias">
      <div class="noc-tile">
        <div class="noc-tile-header">
          <span class="noc-tile-label">COLA TOTAL DE INCIDENCIAS</span>
          <span class="text-muted font-mono" style="font-size:0.75rem;">ACTIVOS</span>
        </div>
        <div class="noc-tile-value" id="noc-metric-total">—</div>
        <div class="noc-tile-sub">Tickets registrados en el campus</div>
      </div>

      <div class="noc-tile">
        <div class="noc-tile-header">
          <span class="noc-tile-label" style="color:var(--prio-critica-dot);">PRIORIDAD CRÍTICA</span>
          <span class="led-dot" style="background-color:var(--prio-critica-dot);" aria-hidden="true"></span>
        </div>
        <div class="noc-tile-value" style="color:var(--prio-critica-text);" id="noc-metric-criticas">—</div>
        <div class="noc-tile-sub">Requieren despacho inmediato</div>
      </div>

      <div class="noc-tile">
        <div class="noc-tile-header">
          <span class="noc-tile-label">EN INTERVENCIÓN</span>
          <span class="text-muted font-mono" style="font-size:0.75rem;">CAMPO</span>
        </div>
        <div class="noc-tile-value text-primary" id="noc-metric-proceso">—</div>
        <div class="noc-tile-sub">Técnicos asignados en diagnóstico</div>
      </div>

      <div class="noc-tile">
        <div class="noc-tile-header">
          <span class="noc-tile-label">RESUELTAS (60D TTL)</span>
          <span class="text-muted font-mono" style="font-size:0.75rem;">CERRADAS</span>
        </div>
        <div class="noc-tile-value" style="color:var(--status-resuelta-text);" id="noc-metric-resueltas">—</div>
        <div class="noc-tile-sub">Atención exitosa documentada</div>
      </div>
    </section>

    <!-- Barra de Control Operativo y Filtros Tácticos -->
    <section class="panel-card mb-4" aria-label="Controles de triaje">
      
      <!-- Fila 1: Filtro rápido por estado segmentado -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-muted font-mono fw-bold" style="font-size:0.75rem; letter-spacing:0.04em;">FILTRO RÁPIDO:</span>
          <div class="noc-filter-switch" role="tablist" aria-label="Filtrar por estado">
            <button type="button" class="noc-pill-btn active" data-state="" role="tab" aria-selected="true">
              Todos <span class="noc-pill-count" id="pill-count-all">0</span>
            </button>
            <button type="button" class="noc-pill-btn" data-state="abierta" role="tab" aria-selected="false">
              Abiertas <span class="noc-pill-count" id="pill-count-abierta">0</span>
            </button>
            <button type="button" class="noc-pill-btn" data-state="en_proceso" role="tab" aria-selected="false">
              En proceso <span class="noc-pill-count" id="pill-count-proceso">0</span>
            </button>
            <button type="button" class="noc-pill-btn" data-state="en_espera" role="tab" aria-selected="false">
              En espera <span class="noc-pill-count" id="pill-count-espera">0</span>
            </button>
            <button type="button" class="noc-pill-btn" data-state="resuelta" role="tab" aria-selected="false">
              Resueltas <span class="noc-pill-count" id="pill-count-resuelta">0</span>
            </button>
          </div>
        </div>

        <div class="d-flex gap-2">
          <a href="#/registro" class="btn-custom-primary btn-custom-sm">
            <span>+</span> Levantar Ticket
          </a>
        </div>
      </div>

      <!-- Fila 2: Selectores multicriterio compactos -->
      <div class="row g-2 align-items-end">
        <div class="col-12 col-sm-6 col-lg-3">
          <label for="filtro-categoria" class="form-label-custom">Categoría Técnica</label>
          <select id="filtro-categoria" class="form-select-custom font-mono">
            <option value="">Todas las categorías</option>
            ${Object.values(CATEGORIAS).map(c => `<option value="${esc(c.id)}">${esc(c.glyph)} ${esc(c.label)}</option>`).join('')}
          </select>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
          <label for="filtro-prioridad" class="form-label-custom">Nivel de Severidad</label>
          <select id="filtro-prioridad" class="form-select-custom font-mono">
            <option value="">Todas las prioridades</option>
            ${Object.values(PRIORIDADES).map(p => `<option value="${esc(p.id)}">${esc(p.glyph)} ${esc(p.label)}</option>`).join('')}
          </select>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
          <label for="filtro-edificio" class="form-label-custom">Ubicación / Edificio</label>
          <select id="filtro-edificio" class="form-select-custom font-mono">
            <option value="">Todos los edificios</option>
            ${EDIFICIOS.map(ed => `<option value="${esc(ed)}">📍 ${esc(ed)}</option>`).join('')}
          </select>
        </div>

        <div class="col-12 col-sm-6 col-lg-3 d-flex gap-2">
          <button type="button" id="btn-limpiar-filtros" class="btn-custom-secondary w-100" title="Restablecer filtros">
            Limpiar Filtros
          </button>
          <button type="button" id="btn-refrescar-tablero" class="btn-custom-secondary" title="Recargar cola de triaje">
            ↻
          </button>
        </div>
      </div>
    </section>

    <!-- Resumen de Conteo de Incidentes -->
    <div class="d-flex justify-content-between align-items-center mb-2 px-1">
      <div class="d-flex align-items-center gap-2">
        <span class="system-status-led">COLA OPS</span>
        <span id="tablero-conteo" class="text-secondary font-mono" style="font-size:0.8rem; font-weight:600;">
          Consultando registros...
        </span>
      </div>
    </div>

    <!-- Contenedor dinámico de datos -->
    <div id="tablero-content-container"></div>
  `;

  // Selectores de elementos del DOM
  const selCategoria = container.querySelector('#filtro-categoria');
  const selPrioridad = container.querySelector('#filtro-prioridad');
  const selEdificio = container.querySelector('#filtro-edificio');
  const btnLimpiar = container.querySelector('#btn-limpiar-filtros');
  const btnRefrescar = container.querySelector('#btn-refrescar-tablero');
  const conteoEl = container.querySelector('#tablero-conteo');
  const contentEl = container.querySelector('#tablero-content-container');
  const pillButtons = container.querySelectorAll('.noc-pill-btn');

  // Métricas superiores
  const metricTotal = container.querySelector('#noc-metric-total');
  const metricCriticas = container.querySelector('#noc-metric-criticas');
  const metricProceso = container.querySelector('#noc-metric-proceso');
  const metricResueltas = container.querySelector('#noc-metric-resueltas');

  // Contadores de pills
  const pillCountAll = container.querySelector('#pill-count-all');
  const pillCountAbierta = container.querySelector('#pill-count-abierta');
  const pillCountProceso = container.querySelector('#pill-count-proceso');
  const pillCountEspera = container.querySelector('#pill-count-espera');
  const pillCountResuelta = container.querySelector('#pill-count-resuelta');

  async function loadData() {
    renderLoading(contentEl, 'Sincronizando estado operativo de campus...');
    conteoEl.textContent = 'Actualizando cola...';

    // Para la telemetría, primero consultamos la totalidad sin filtros
    try {
      const allIncidencias = await getIncidencias({});
      updateTelemetry(allIncidencias);

      // Ahora aplicamos los filtros actuales para la lista
      const params = {
        categoria: selCategoria.value,
        estado: activeStateFilter,
        prioridad: selPrioridad.value,
        edificio: selEdificio.value
      };

      const filtered = await getIncidencias(params);
      renderIncidencias(filtered);
    } catch (err) {
      renderError(contentEl, err.message, () => loadData());
      conteoEl.textContent = 'Fallo de sincronización';
    }
  }

  function updateTelemetry(list) {
    if (!list) return;
    const total = list.length;
    const criticas = list.filter(i => i.prioridad === 'critica').length;
    const proceso = list.filter(i => i.estado === 'en_proceso' || i.estado === 'en_espera').length;
    const resueltas = list.filter(i => i.estado === 'resuelta' || i.estado === 'cerrada').length;

    metricTotal.textContent = total;
    metricCriticas.textContent = criticas;
    metricProceso.textContent = proceso;
    metricResueltas.textContent = resueltas;

    // Contadores de pills
    pillCountAll.textContent = total;
    pillCountAbierta.textContent = list.filter(i => i.estado === 'abierta').length;
    pillCountProceso.textContent = list.filter(i => i.estado === 'en_proceso').length;
    pillCountEspera.textContent = list.filter(i => i.estado === 'en_espera').length;
    pillCountResuelta.textContent = list.filter(i => i.estado === 'resuelta').length;
  }

  function renderIncidencias(list) {
    if (!list || list.length === 0) {
      conteoEl.textContent = '0 tickets activos en filtro';
      contentEl.innerHTML = `
        <div class="state-container py-5">
          <div class="state-icon" aria-hidden="true">✓</div>
          <div class="state-title">Cola Despejada o Cero Coincidencias</div>
          <p class="state-desc">No existen tickets pendientes con la combinación de filtros seleccionada.</p>
          <button type="button" id="btn-empty-reset" class="btn-custom-secondary">Restablecer filtros</button>
        </div>
      `;
      contentEl.querySelector('#btn-empty-reset')?.addEventListener('click', () => {
        resetAllFilters();
      });
      return;
    }

    conteoEl.textContent = `${list.length} ${list.length === 1 ? 'ticket mostrado' : 'tickets mostrados'}`;

    // Render doble: Tabla NOC de alta densidad para escritorio, Tarjetas para móviles
    let html = `
      <!-- Vista Móvil (Terminal de Campo) -->
      <div class="d-md-none">
        ${list.map(inc => `
          <article class="ticket-mobile-card" tabindex="0" role="link" data-codigo="${esc(inc.codigo)}" aria-label="Ticket ${esc(inc.codigo)}: ${esc(inc.titulo)}">
            <div class="card-top">
              <span class="ticket-code font-mono text-primary fw-bold" style="font-size:0.95rem;">${esc(inc.codigo)}</span>
              <div class="d-flex align-items-center gap-1">
                ${renderPriorityBadge(inc.prioridad)}
                ${renderStatusBadge(inc.estado)}
              </div>
            </div>
            
            <h2 class="card-title my-2">${esc(inc.titulo)}</h2>
            
            <div class="card-meta mb-2">
              ${renderCategoryBadge(inc.categoria)}
              <span class="font-mono" style="font-size:0.75rem; color:var(--text-secondary);">
                📍 ${esc(inc.ubicacion?.edificio || 'Campus')} • ${esc(inc.ubicacion?.espacio || '—')}
              </span>
            </div>

            <div class="d-flex justify-content-between align-items-center pt-2 border-top" style="font-size:0.775rem;">
              <span class="text-muted">Despacho: <strong>${esc(inc.tecnico_asignado || 'Sin asignar')}</strong></span>
              <span class="font-mono text-muted">${formatDate(inc.fecha_creacion)}</span>
            </div>
          </article>
        `).join('')}
      </div>

      <!-- Vista Escritorio (Consola NOC de Alta Densidad) -->
      <div class="incidencias-table-wrapper d-none d-md-block">
        <table class="table-operativa" role="table">
          <thead>
            <tr>
              <th scope="col" style="width: 140px;">Código Ticket</th>
              <th scope="col" style="width: 110px;">Severidad</th>
              <th scope="col">Falla / Asunto</th>
              <th scope="col" style="width: 150px;">Categoría</th>
              <th scope="col" style="width: 170px;">Ubicación en Campus</th>
              <th scope="col" style="width: 125px;">Estado</th>
              <th scope="col" style="width: 150px;">Técnico</th>
              <th scope="col" style="width: 130px;">Fecha</th>
              <th scope="col" style="width: 80px;" class="text-end">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(inc => `
              <tr data-codigo="${esc(inc.codigo)}" tabindex="0" role="row" aria-label="Inspeccionar ticket ${esc(inc.codigo)}">
                <td>
                  <a href="#/incidencia/${encodeURIComponent(inc.codigo)}" class="ticket-link font-mono" tabindex="-1">
                    ${esc(inc.codigo)}
                  </a>
                </td>
                <td>${renderPriorityBadge(inc.prioridad)}</td>
                <td>
                  <div class="fw-semibold text-break-word" style="font-size:0.875rem;">
                    ${esc(inc.titulo)}
                  </div>
                </td>
                <td>${renderCategoryBadge(inc.categoria)}</td>
                <td>
                  <div class="font-mono" style="font-size:0.775rem; line-height:1.2;">
                    <strong>📍 ${esc(inc.ubicacion?.edificio || '—')}</strong>
                    <span class="d-block text-muted">${esc(inc.ubicacion?.espacio || '—')}</span>
                  </div>
                </td>
                <td>${renderStatusBadge(inc.estado)}</td>
                <td>
                  <span class="${inc.tecnico_asignado ? 'fw-medium' : 'text-danger fst-italic'}" style="font-size:0.825rem;">
                    ${esc(inc.tecnico_asignado || 'Sin despacho')}
                  </span>
                </td>
                <td>
                  <span class="font-mono text-muted" style="font-size:0.75rem;">
                    ${formatDate(inc.fecha_creacion)}
                  </span>
                </td>
                <td class="text-end">
                  <a href="#/incidencia/${encodeURIComponent(inc.codigo)}" class="btn-inspect-action" tabindex="-1" title="Abrir ficha operativa">
                    Ver →
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    contentEl.innerHTML = html;

    // Navegación en clic o teclado
    const rowsAndCards = contentEl.querySelectorAll('[data-codigo]');
    rowsAndCards.forEach(el => {
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

  function resetAllFilters() {
    activeStateFilter = '';
    selCategoria.value = '';
    selPrioridad.value = '';
    selEdificio.value = '';
    pillButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-state') === '');
      btn.setAttribute('aria-selected', btn.getAttribute('data-state') === '' ? 'true' : 'false');
    });
    loadData();
  }

  // Interacción con los botones de estado (pills)
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeStateFilter = btn.getAttribute('data-state') || '';
      loadData();
    });
  });

  // Eventos de selects
  [selCategoria, selPrioridad, selEdificio].forEach(sel => {
    sel.addEventListener('change', loadData);
  });

  btnLimpiar.addEventListener('click', resetAllFilters);
  btnRefrescar.addEventListener('click', loadData);

  // Carga inicial
  await loadData();
}
