/**
 * UTM Desk — Vista Analítica (CU-06)
 * Métricas operativas por edificio y ranking top 10 tags con Chart.js 4.4,
 * respetando variables de tema claro/oscuro y política de retención TTL.
 */

import { getAnaliticaEdificios, getAnaliticaTags } from '../api.js';
import { esc, renderLoading, renderError } from '../utils.js';

let chartEdificiosInstance = null;
let chartTagsInstance = null;

export async function renderAnaliticaView(container) {
  // Limpiar instancias previas de gráficas si existían
  if (chartEdificiosInstance) {
    chartEdificiosInstance.destroy();
    chartEdificiosInstance = null;
  }
  if (chartTagsInstance) {
    chartTagsInstance.destroy();
    chartTagsInstance = null;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Analítica Operativa de Incidencias</h1>
        <p class="view-desc">Métricas de esfuerzo técnico, horas invertidas y recurrencia de fallas en campus.</p>
      </div>
      <div>
        <button type="button" id="btn-refrescar-analitica" class="btn-custom-secondary btn-custom-sm">
          ↻ Actualizar Métricas
        </button>
      </div>
    </div>

    <!-- Nota Visible de Retención TTL (CU-06) -->
    <div class="ttl-notice mb-4" role="note">
      <span aria-hidden="true">ℹ</span>
      <span><strong>Alcance de datos:</strong> La analítica cubre solo incidencias resueltas de los últimos 60 días (retención TTL).</span>
    </div>

    <!-- Contenedor dinámico de analítica -->
    <div id="analitica-dynamic-content"></div>
  `;

  const dynamicContent = container.querySelector('#analitica-dynamic-content');
  const btnRefrescar = container.querySelector('#btn-refrescar-analitica');

  async function loadData() {
    renderLoading(dynamicContent, 'Calculando métricas operativas por edificio y etiquetas...');

    try {
      const [edificiosData, tagsData] = await Promise.all([
        getAnaliticaEdificios(),
        getAnaliticaTags()
      ]);

      renderChartsAndTables(edificiosData, tagsData);
    } catch (err) {
      renderError(dynamicContent, err.message, () => loadData());
    }
  }

  function getThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
      accent: cs.getPropertyValue('--accent-primary').trim() || (isDark ? '#38bdf8' : '#0284c7'),
      accentSubtle: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.15)',
      accentHover: cs.getPropertyValue('--accent-hover').trim() || '#0369a1',
      textPrimary: cs.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a'),
      textSecondary: cs.getPropertyValue('--text-secondary').trim() || (isDark ? '#cbd5e1' : '#475569'),
      textMuted: cs.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b'),
      borderSubtle: cs.getPropertyValue('--border-subtle').trim() || (isDark ? '#243048' : '#e2e6ec'),
      borderBase: cs.getPropertyValue('--border-base').trim() || (isDark ? '#334155' : '#cbd3de'),
      bgSurface: cs.getPropertyValue('--bg-surface').trim() || (isDark ? '#111827' : '#ffffff'),
      secondaryBar: isDark ? '#818cf8' : '#4f46e5',
      secondaryBarSubtle: isDark ? 'rgba(129, 140, 248, 0.25)' : 'rgba(79, 70, 229, 0.15)'
    };
  }

  function renderChartsAndTables(edificios, tags) {
    // Totales rápidos para tarjetas superiores
    const granTotalHoras = edificios.reduce((acc, cur) => acc + (cur.total_horas || 0), 0);
    const granTotalIncidencias = edificios.reduce((acc, cur) => acc + (cur.incidencias || 0), 0);
    const promedioCampus = granTotalIncidencias > 0
      ? (granTotalHoras / granTotalIncidencias).toFixed(1)
      : '0.0';

    dynamicContent.innerHTML = `
      <!-- Métricas Resumen -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4">
          <div class="stat-metric-card">
            <div class="stat-metric-value text-primary">${granTotalHoras.toFixed(1)} h</div>
            <div class="stat-metric-label">Total Horas de Soporte (60 días)</div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="stat-metric-card">
            <div class="stat-metric-value">${granTotalIncidencias}</div>
            <div class="stat-metric-label">Incidencias Resueltas / Cerradas</div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="stat-metric-card">
            <div class="stat-metric-value">${promedioCampus} h</div>
            <div class="stat-metric-label">Tiempo Promedio de Resolución</div>
          </div>
        </div>
      </div>

      <!-- Gráfica de Barras y Tabla por Edificio -->
      <div class="row g-4 mb-4">
        <div class="col-12 col-lg-7">
          <section class="panel-card h-100" aria-label="Gráfica por edificio">
            <h2 class="panel-card-title mb-3">Distribución de Horas de Intervención por Edificio</h2>
            <div style="position:relative; height: 320px; width: 100%;">
              <canvas id="chart-edificios"></canvas>
            </div>
          </section>
        </div>

        <div class="col-12 col-lg-5">
          <section class="panel-card h-100" aria-label="Tabla de esfuerzo por edificio">
            <h2 class="panel-card-title mb-3">Esfuerzo Técnico por Edificio</h2>
            <div class="table-responsive">
              <table class="table-operativa">
                <thead>
                  <tr>
                    <th scope="col">Edificio</th>
                    <th scope="col" class="text-end">Tickets</th>
                    <th scope="col" class="text-end">Total Horas</th>
                    <th scope="col" class="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  ${edificios.map(item => `
                    <tr>
                      <td class="fw-semibold">📍 ${esc(item.edificio)}</td>
                      <td class="text-end font-mono">${item.incidencias}</td>
                      <td class="text-end font-mono fw-bold">${item.total_horas.toFixed(1)} h</td>
                      <td class="text-end font-mono text-muted">${item.promedio_horas.toFixed(1)} h</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <!-- Top 10 Etiquetas Más Frecuentes (Barras Horizontales) -->
      <section class="panel-card mb-4" aria-label="Ranking de etiquetas">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="panel-card-title mb-0">Top 10 Etiquetas (Tags) Más Frecuentes</h2>
          <span class="text-muted font-mono" style="font-size:0.8rem;">Frecuencia acumulada</span>
        </div>
        
        ${tags.length === 0 ? `
          <div class="state-container py-4">
            <div class="state-desc mb-0">No hay etiquetas registradas en las incidencias evaluadas.</div>
          </div>
        ` : `
          <div class="row g-4 align-items-center">
            <div class="col-12 col-lg-8">
              <div style="position:relative; height: 340px; width: 100%;">
                <canvas id="chart-tags"></canvas>
              </div>
            </div>
            <div class="col-12 col-lg-4">
              <div class="d-flex flex-column gap-2">
                ${tags.map((t, idx) => `
                  <div class="d-flex align-items-center justify-content-between p-2 rounded bg-subtle">
                    <span class="font-mono" style="font-size:0.85rem; font-weight:600;">
                      <span class="text-muted" style="width:20px; display:inline-block;">${idx + 1}.</span> #${esc(t.tag)}
                    </span>
                    <span class="badge bg-secondary font-mono">${t.total} ${t.total === 1 ? 'ticket' : 'tickets'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `}
      </section>
    `;

    renderCharts(edificios, tags);
  }

  function renderCharts(edificios, tags) {
    if (typeof window.Chart === 'undefined') {
      console.warn('Chart.js no está cargado en el entorno.');
      return;
    }

    const colors = getThemeColors();

    // 1. Gráfica de Barras por Edificio
    const canvasEdificios = dynamicContent.querySelector('#chart-edificios');
    if (canvasEdificios) {
      if (chartEdificiosInstance) chartEdificiosInstance.destroy();

      const labels = edificios.map(e => e.edificio);
      const dataHoras = edificios.map(e => e.total_horas);
      const dataPromedio = edificios.map(e => e.promedio_horas);

      chartEdificiosInstance = new window.Chart(canvasEdificios, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Total Horas Invertidas',
              data: dataHoras,
              backgroundColor: colors.accent,
              borderColor: colors.accentHover,
              borderWidth: 1,
              borderRadius: 4
            },
            {
              label: 'Promedio Horas / Incidencia',
              data: dataPromedio,
              backgroundColor: colors.secondaryBar,
              borderColor: colors.secondaryBar,
              borderWidth: 1,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: colors.textSecondary,
                font: { family: 'Plus Jakarta Sans', size: 12 }
              }
            },
            tooltip: {
              titleFont: { family: 'Plus Jakarta Sans', size: 13 },
              bodyFont: { family: 'JetBrains Mono', size: 12 }
            }
          },
          scales: {
            x: {
              grid: { color: colors.borderSubtle },
              ticks: { color: colors.textSecondary, font: { family: 'Plus Jakarta Sans' } }
            },
            y: {
              grid: { color: colors.borderSubtle },
              ticks: { color: colors.textSecondary, font: { family: 'JetBrains Mono' } },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 2. Gráfica de Barras Horizontales Top 10 Tags
    const canvasTags = dynamicContent.querySelector('#chart-tags');
    if (canvasTags && tags.length > 0) {
      if (chartTagsInstance) chartTagsInstance.destroy();

      const tagLabels = tags.map(t => `#${t.tag}`);
      const tagTotals = tags.map(t => t.total);

      chartTagsInstance = new window.Chart(canvasTags, {
        type: 'bar',
        data: {
          labels: tagLabels,
          datasets: [
            {
              label: 'Frecuencia de Ocurrencia',
              data: tagTotals,
              backgroundColor: colors.accentSubtle,
              borderColor: colors.accent,
              borderWidth: 1.5,
              borderRadius: 4
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              titleFont: { family: 'JetBrains Mono', size: 13 },
              bodyFont: { family: 'JetBrains Mono', size: 12 }
            }
          },
          scales: {
            x: {
              grid: { color: colors.borderSubtle },
              ticks: {
                color: colors.textSecondary,
                font: { family: 'JetBrains Mono' },
                stepSize: 1,
                precision: 0
              },
              beginAtZero: true
            },
            y: {
              grid: { display: false },
              ticks: { color: colors.textPrimary, font: { family: 'JetBrains Mono', weight: '500' } }
            }
          }
        }
      });
    }
  }

  // Escuchar evento de cambio de tema para refrescar gráficas con nuevos colores
  const handleThemeChange = () => {
    if (dynamicContent && (chartEdificiosInstance || chartTagsInstance)) {
      loadData();
    }
  };
  window.addEventListener('theme-changed', handleThemeChange);

  btnRefrescar?.addEventListener('click', loadData);

  // Carga inicial
  await loadData();
}
