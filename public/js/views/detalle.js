/**
 * UTM Desk — Vista Detalle de Incidencia (RF-06 a RF-13)
 * Vista operativa completa: gestión de técnico, cambio de estado, bitácora cronológica,
 * tags normalizados, subida de evidencias con progreso y aviso TTL.
 */

import {
  getIncidencia,
  patchEstado,
  patchTecnico,
  addTag,
  removeTag,
  addEvidencia,
  getEvidenciaUrl
} from '../api.js';
import { USE_MOCK, ESTADOS, NIVELES_RIESGO, ROLES_REPORTANTE } from '../config.js';
import {
  esc,
  formatDate,
  formatTTLDate,
  normalizeTag,
  formatFileSize,
  renderStatusBadge,
  renderPriorityBadge,
  renderCategoryBadge,
  showToast,
  renderLoading,
  renderError
} from '../utils.js';

export async function renderDetalleView(container, codigo) {
  if (!codigo) {
    container.innerHTML = `
      <div class="state-container state-error">
        <div class="state-icon" aria-hidden="true">⚠</div>
        <div class="state-title">Código no especificado</div>
        <p class="state-desc">Debe proporcionar un código válido de incidencia.</p>
        <a href="#/tablero" class="btn-custom-secondary">Volver al tablero</a>
      </div>
    `;
    return;
  }

  renderLoading(container, `Cargando detalles de ${codigo}...`);

  try {
    const inc = await getIncidencia(codigo);
    renderContent(inc);
  } catch (err) {
    renderError(container, err.message, () => renderDetalleView(container, codigo));
  }

  function renderContent(inc) {
    const ttlAviso = inc.fecha_resolucion
      ? `<div class="ttl-notice mb-4" role="status">
           <span aria-hidden="true">⏳</span>
           <span><strong>Retención TTL:</strong> Esta incidencia fue resuelta el ${formatDate(inc.fecha_resolucion)}. Se eliminará automáticamente el <strong>${formatTTLDate(inc.fecha_resolucion)}</strong> (política de 60 días).</span>
         </div>`
      : '';

    // Renderizar detalle específico polimórfico
    const detalleEspecificoHtml = renderDetalleEspecifico(inc.categoria, inc.detalle_especifico || {});

    // Bitácora ordenada cronológicamente (más antigua a más reciente)
    const historial = [...(inc.historial_seguimiento || [])].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    container.innerHTML = `
      <!-- Cabecera de Navegación y Acciones -->
      <div class="mb-3">
        <a href="#/tablero" class="btn-custom-secondary btn-custom-sm" aria-label="Volver al tablero de triaje">
          ← Volver al Tablero
        </a>
      </div>

      ${ttlAviso}

      <!-- Encabezado de la Incidencia -->
      <section class="panel-card mb-4" aria-label="Información principal de la incidencia">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="ticket-code font-mono text-primary fs-4 fw-bold">${esc(inc.codigo)}</span>
            ${renderCategoryBadge(inc.categoria)}
            ${renderPriorityBadge(inc.prioridad)}
            ${renderStatusBadge(inc.estado)}
          </div>
          <div class="text-muted font-mono" style="font-size:0.8rem;">
            Creado: ${formatDate(inc.fecha_creacion)}
          </div>
        </div>

        <h1 class="fs-4 fw-bold mb-3 text-break-word">${esc(inc.titulo)}</h1>
        <p class="text-secondary mb-4" style="line-height:1.6; white-space:pre-wrap;">${esc(inc.descripcion)}</p>

        <!-- Métricas Rápidas -->
        <div class="row g-3 pt-3 border-top">
          <div class="col-12 col-sm-4">
            <div class="stat-metric-card">
              <div class="stat-metric-value">${Number(inc.horas_invertidas || 0).toFixed(1)} h</div>
              <div class="stat-metric-label">Horas Invertidas</div>
            </div>
          </div>
          <div class="col-12 col-sm-4">
            <div class="stat-metric-card">
              <div class="stat-metric-value">${historial.length}</div>
              <div class="stat-metric-label">Entradas en Bitácora</div>
            </div>
          </div>
          <div class="col-12 col-sm-4">
            <div class="stat-metric-card">
              <div class="stat-metric-value">${(inc.evidencias_adjuntas || []).length}</div>
              <div class="stat-metric-label">Archivos de Evidencia</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Grid Principal: Datos Operativos y Acciones -->
      <div class="row g-4">
        
        <!-- Columna Izquierda: Información de Reportante, Ubicación y Detalle Polimórfico -->
        <div class="col-12 col-lg-7">
          
          <!-- Reportante y Ubicación -->
          <div class="panel-card mb-4">
            <h2 class="panel-card-title mb-3">Ubicación y Reportante</h2>
            <div class="row g-3">
              <div class="col-sm-6">
                <span class="d-block text-muted" style="font-size:0.775rem; text-transform:uppercase; font-weight:600;">Reportante</span>
                <span class="fw-semibold">${esc(inc.reportante?.nombre || 'No registrado')}</span>
                <span class="d-block text-muted" style="font-size:0.825rem;">
                  ${esc(ROLES_REPORTANTE[inc.reportante?.rol] || inc.reportante?.rol || '—')} • <a href="mailto:${esc(inc.reportante?.correo)}" class="text-decoration-none">${esc(inc.reportante?.correo)}</a>
                </span>
              </div>
              <div class="col-sm-6">
                <span class="d-block text-muted" style="font-size:0.775rem; text-transform:uppercase; font-weight:600;">Ubicación en Campus</span>
                <span class="fw-semibold">📍 ${esc(inc.ubicacion?.edificio || '—')}</span>
                <span class="d-block text-secondary" style="font-size:0.825rem;">
                  ${inc.ubicacion?.piso !== undefined && inc.ubicacion?.piso !== null ? `Piso ${esc(inc.ubicacion.piso)} • ` : ''}Espacio: <strong>${esc(inc.ubicacion?.espacio || '—')}</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Detalle Específico de Categoría -->
          <div class="panel-card mb-4">
            <h2 class="panel-card-title mb-3">Parámetros Técnicos Específicos</h2>
            ${detalleEspecificoHtml}
          </div>

          <!-- Bitácora de Seguimiento (RF-10) -->
          <div class="panel-card mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h2 class="panel-card-title mb-0">Bitácora de Seguimiento</h2>
              <span class="text-muted font-mono" style="font-size:0.8rem;">${historial.length} registros</span>
            </div>
            
            ${historial.length === 0 ? `
              <div class="state-container py-4 my-2">
                <div class="state-desc mb-0">No hay entradas previas en la bitácora.</div>
              </div>
            ` : `
              <ol class="timeline-list">
                ${historial.map(entry => `
                  <li class="timeline-item">
                    <span class="timeline-marker" aria-hidden="true"></span>
                    <div class="timeline-box">
                      <div class="timeline-header">
                        <div>
                          <span class="timeline-author">${esc(entry.autor || 'Operador')}</span>
                          <span class="ms-2">${renderStatusBadge(entry.estado_nuevo)}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          ${entry.horas ? `<span class="timeline-meta-tag">+${Number(entry.horas).toFixed(1)} h</span>` : ''}
                          <time class="timeline-time">${formatDate(entry.fecha)}</time>
                        </div>
                      </div>
                      ${entry.comentario ? `<p class="timeline-comment">${esc(entry.comentario)}</p>` : `<em class="text-muted" style="font-size:0.8rem;">Sin notas adicionales</em>`}
                    </div>
                  </li>
                `).join('')}
              </ol>
            `}
          </div>

        </div>

        <!-- Columna Derecha: Acciones Rápidas (Técnico, Estado, Tags, Evidencias) -->
        <div class="col-12 col-lg-5">
          
          <!-- Asignación de Técnico (RF-09) -->
          <section class="panel-card mb-4" aria-label="Asignar técnico">
            <h2 class="panel-card-title mb-3">Técnico Asignado</h2>
            <form id="form-tecnico" class="d-flex gap-2">
              <input type="text" id="input-tecnico" class="form-control-custom" placeholder="Nombre del técnico responsable" value="${esc(inc.tecnico_asignado || '')}" required>
              <button type="submit" id="btn-guardar-tecnico" class="btn-custom-primary text-nowrap">
                Guardar
              </button>
            </form>
          </section>

          <!-- Cambio de Estado y Actualización de Bitácora (RF-08) -->
          <section class="panel-card mb-4" aria-label="Actualizar estado">
            <h2 class="panel-card-title mb-3">Registrar Avance / Cambiar Estado</h2>
            <form id="form-estado" class="d-flex flex-column gap-3">
              <div>
                <label for="select-nuevo-estado" class="form-label-custom">Nuevo Estado</label>
                <select id="select-nuevo-estado" class="form-select-custom" required>
                  ${Object.values(ESTADOS).map(e => `
                    <option value="${esc(e.id)}" ${e.id === inc.estado ? 'selected' : ''}>${esc(e.label)}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label for="input-autor" class="form-label-custom">Autor del Registro</label>
                <input type="text" id="input-autor" class="form-control-custom" placeholder="Tu nombre o cargo" required>
              </div>

              <div>
                <label for="input-horas" class="form-label-custom">Horas Invertidas en esta intervención</label>
                <input type="number" id="input-horas" class="form-control-custom font-mono" min="0" step="0.5" value="0.5" required>
                <div class="form-hint">Mínimo 0 h, incrementos de 0.5 h. Se acumulan al total.</div>
              </div>

              <div>
                <label for="textarea-comentario" class="form-label-custom">Comentario Técnico / Justificación</label>
                <textarea id="textarea-comentario" class="form-control-custom" rows="3" placeholder="Describe los hallazgos, diagnóstico o acciones realizadas..." required></textarea>
              </div>

              <button type="submit" id="btn-guardar-estado" class="btn-custom-primary w-100">
                Guardar Actualización
              </button>
            </form>
          </section>

          <!-- Gestión de Etiquetas / Tags (RF-13) -->
          <section class="panel-card mb-4" aria-label="Etiquetas">
            <h2 class="panel-card-title mb-3">Etiquetas (Tags)</h2>
            <div class="chips-container mb-2" id="tags-chips-wrapper">
              ${(inc.tags || []).map(t => `
                <span class="chip-item font-mono" data-tag="${esc(t)}">
                  #${esc(t)}
                  <button type="button" class="chip-remove-btn btn-remove-tag" data-tag="${esc(t)}" title="Quitar etiqueta #${esc(t)}" aria-label="Quitar etiqueta ${esc(t)}">✕</button>
                </span>
              `).join('')}
              <input type="text" id="input-new-tag" class="chip-input font-mono" placeholder="+ Agregar etiqueta (Enter)">
            </div>
            <div class="form-hint">Escribe una etiqueta y presiona Enter para agregarla.</div>
          </section>

          <!-- Evidencias Adjuntas (RF-11 / RF-12) -->
          <section class="panel-card mb-4" aria-label="Evidencias adjuntas">
            <h2 class="panel-card-title mb-3">Evidencias Adjuntas</h2>
            
            <!-- Zona de Carga / Dropzone -->
            <div class="evidence-dropzone" id="dropzone-evidencia" tabindex="0" role="button" aria-label="Subir archivo de evidencia (JPG, PNG o PDF hasta 10 MB)">
              <input type="file" id="file-input-evidencia" accept=".jpg,.jpeg,.png,.pdf" class="d-none">
              <div style="font-size:1.5rem;" aria-hidden="true">📁</div>
              <div class="fw-semibold mt-1">Arrastra un archivo o haz clic para subir</div>
              <div class="text-muted" style="font-size:0.775rem;">Formatos aceptados: JPG, PNG, PDF (Máx. 10 MB)</div>
            </div>

            <!-- Progreso de Subida -->
            <div id="upload-progress-box" class="upload-progress-wrapper d-none">
              <div class="d-flex justify-content-between align-items-center mb-1" style="font-size:0.775rem;">
                <span id="upload-filename" class="font-mono text-truncate">Subiendo archivo...</span>
                <span id="upload-percentage" class="font-mono fw-bold">0%</span>
              </div>
              <div class="progress-custom">
                <div id="upload-progress-bar" class="progress-bar-custom" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Lista de Archivos -->
            <div class="evidence-list" id="evidence-items-container">
              ${(inc.evidencias_adjuntas || []).length === 0 ? `
                <div class="text-muted text-center py-3" style="font-size:0.85rem;">
                  No hay evidencias adjuntas para este reporte.
                </div>
              ` : (inc.evidencias_adjuntas || []).map(ev => `
                <div class="evidence-item">
                  <div class="evidence-info">
                    <span class="evidence-icon" aria-hidden="true">${ev.tipo_mime === 'application/pdf' ? '📄' : '🖼'}</span>
                    <div style="min-width:0;">
                      <a href="javascript:void(0)" class="evidence-name btn-ver-evidencia font-mono d-block" data-path="${esc(ev.url_storage)}" title="Ver archivo firmado en nueva pestaña">
                        ${esc(ev.nombre_archivo)}
                      </a>
                      <span class="text-muted" style="font-size:0.75rem;">
                        ${formatFileSize(ev.peso_kb)} • ${formatDate(ev.fecha_carga)}
                      </span>
                    </div>
                  </div>
                  <button type="button" class="btn-custom-secondary btn-custom-sm btn-ver-evidencia" data-path="${esc(ev.url_storage)}" title="Abrir URL firmada">
                    Ver
                  </button>
                </div>
              `).join('')}
            </div>
          </section>

        </div>
      </div>
    `;

    setupInteractions(inc);
  }

  function renderDetalleEspecifico(categoria, det) {
    if (categoria === 'computo_redes') {
      return `
        <div class="row g-3">
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Tipo de Falla</span>
            <span class="fw-semibold">${esc(det.tipo_falla || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Equipo / Dispositivo</span>
            <span class="fw-semibold">${esc(det.equipo || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Dirección IPv4</span>
            <code class="font-mono bg-subtle px-2 py-1 rounded" style="font-size:0.875rem;">${esc(det.direccion_ip || '—')}</code>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">VLAN Asignada</span>
            <span class="font-mono fw-bold">${det.vlan !== undefined ? `VLAN ${esc(det.vlan)}` : '—'}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Puerto Uplink</span>
            <span class="font-mono">${esc(det.puerto_uplink || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Equipos Afectados</span>
            <span class="fw-bold fs-5">${det.equipos_afectados !== undefined ? esc(det.equipos_afectados) : '—'}</span>
          </div>
        </div>
      `;
    }

    if (categoria === 'infraestructura') {
      const riesgoLabel = NIVELES_RIESGO[det.riesgo_seguridad] || det.riesgo_seguridad || 'Bajo';
      const insumos = Array.isArray(det.insumos_requeridos) ? det.insumos_requeridos : [];
      return `
        <div class="row g-3">
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Tipo de Daño</span>
            <span class="fw-semibold">${esc(det.tipo_dano || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Riesgo de Seguridad</span>
            <span class="prio-badge ${det.riesgo_seguridad === 'alto' ? 'prio-critica' : (det.riesgo_seguridad === 'medio' ? 'prio-alta' : 'prio-baja')}">
              ${esc(riesgoLabel)}
            </span>
          </div>
          <div class="col-12">
            <span class="d-block text-muted mb-1" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Insumos Requeridos</span>
            <div class="d-flex flex-wrap gap-1">
              ${insumos.length > 0 ? insumos.map(i => `<span class="chip-item">${esc(i)}</span>`).join('') : '<span class="text-muted fst-italic">Sin insumos específicos</span>'}
            </div>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Requiere Contratista</span>
            <span class="fw-semibold">${det.requiere_contratista ? 'Sí' : 'No'}</span>
          </div>
          ${det.requiere_contratista ? `
            <div class="col-sm-6">
              <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Empresa Contratista</span>
              <span class="fw-bold">${esc(det.contratista || 'Por asignar')}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    if (categoria === 'academico') {
      return `
        <div class="row g-3">
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Plataforma Académica</span>
            <span class="fw-semibold">${esc(det.plataforma || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Código de Curso</span>
            <span class="font-mono fw-bold">${esc(det.codigo_curso || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Periodo Escolar</span>
            <span>${esc(det.periodo_escolar || '—')}</span>
          </div>
          <div class="col-sm-6">
            <span class="d-block text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Estudiantes Impactados</span>
            <span class="fw-bold fs-5">${det.estudiantes_impactados !== undefined ? esc(det.estudiantes_impactados) : '—'}</span>
          </div>
          ${det.mensaje_error ? `
            <div class="col-12">
              <span class="d-block text-muted mb-1" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Mensaje de Error</span>
              <pre class="bg-subtle p-2 rounded font-mono text-danger mb-0" style="font-size:0.8rem; overflow-x:auto;">${esc(det.mensaje_error)}</pre>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `<div class="text-muted">Sin detalles específicos disponibles.</div>`;
  }

  function setupInteractions(inc) {
    // 1. Asignar Técnico (RF-09)
    const formTecnico = container.querySelector('#form-tecnico');
    const inputTecnico = container.querySelector('#input-tecnico');
    const btnGuardarTecnico = container.querySelector('#btn-guardar-tecnico');

    formTecnico?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevoTecnico = inputTecnico.value.trim();
      btnGuardarTecnico.disabled = true;
      btnGuardarTecnico.textContent = 'Guardando...';

      try {
        await patchTecnico(inc.codigo, { tecnico_asignado: nuevoTecnico });
        showToast(`Técnico asignado exitosamente: ${nuevoTecnico}`, 'success');
        // Recargar detalle para mantener sincronía
        await renderDetalleView(container, inc.codigo);
      } catch (err) {
        showToast(err.message, 'error');
        btnGuardarTecnico.disabled = false;
        btnGuardarTecnico.textContent = 'Guardar';
      }
    });

    // 2. Cambio de Estado (RF-08)
    const formEstado = container.querySelector('#form-estado');
    const selectEstado = container.querySelector('#select-nuevo-estado');
    const inputAutor = container.querySelector('#input-autor');
    const inputHoras = container.querySelector('#input-horas');
    const textareaComentario = container.querySelector('#textarea-comentario');
    const btnGuardarEstado = container.querySelector('#btn-guardar-estado');

    formEstado?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const horasVal = parseFloat(inputHoras.value);
      if (isNaN(horasVal) || horasVal < 0) {
        showToast('Las horas deben ser un número mayor o igual a 0', 'error');
        return;
      }

      btnGuardarEstado.disabled = true;
      btnGuardarEstado.textContent = 'Guardando avance...';

      try {
        await patchEstado(inc.codigo, {
          estado_nuevo: selectEstado.value,
          autor: inputAutor.value.trim(),
          comentario: textareaComentario.value.trim(),
          horas: horasVal
        });
        showToast('Bitácora y estado actualizados correctamente', 'success');
        await renderDetalleView(container, inc.codigo);
      } catch (err) {
        showToast(err.message, 'error');
        btnGuardarEstado.disabled = false;
        btnGuardarEstado.textContent = 'Guardar Actualización';
      }
    });

    // 3. Etiquetas / Tags (RF-13)
    const inputNewTag = container.querySelector('#input-new-tag');
    inputNewTag?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = normalizeTag(inputNewTag.value);
        if (!tag) return;

        if (inc.tags && inc.tags.includes(tag)) {
          showToast(`La etiqueta "${tag}" ya existe en este reporte`, 'info');
          inputNewTag.value = '';
          return;
        }

        try {
          await addTag(inc.codigo, tag);
          showToast(`Etiqueta #${tag} agregada`, 'success');
          await renderDetalleView(container, inc.codigo);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });

    container.querySelectorAll('.btn-remove-tag').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tag = btn.getAttribute('data-tag');
        try {
          await removeTag(inc.codigo, tag);
          showToast(`Etiqueta #${tag} eliminada`, 'info');
          await renderDetalleView(container, inc.codigo);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // 4. Ver Evidencia con URL firmada (RF-11)
    container.querySelectorAll('.btn-ver-evidencia').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const storagePath = btn.getAttribute('data-path');
        try {
          const res = await getEvidenciaUrl(inc.codigo, storagePath);
          if (res && res.url) {
            window.open(res.url, '_blank', 'noopener,noreferrer');
          } else {
            throw new Error('No se recibió la URL firmada del servidor');
          }
        } catch (err) {
          showToast(`Error al obtener URL firmada: ${err.message}`, 'error');
        }
      });
    });

    // 5. Subida de Evidencia con Vercel Blob (RF-11 / RF-12)
    const dropzone = container.querySelector('#dropzone-evidencia');
    const fileInput = container.querySelector('#file-input-evidencia');
    const progressBox = container.querySelector('#upload-progress-box');
    const progressBar = container.querySelector('#upload-progress-bar');
    const progressFilename = container.querySelector('#upload-filename');
    const progressPercentage = container.querySelector('#upload-percentage');

    dropzone?.addEventListener('click', () => fileInput?.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer?.files?.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.length > 0) {
        handleFileUpload(fileInput.files[0]);
      }
    });

    async function handleFileUpload(file) {
      if (!file) return;

      // Validar tipo permitido (JPG, PNG, PDF)
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Tipo de archivo inválido. Solo se admiten JPG, PNG o PDF.', 'error');
        return;
      }

      // Validar tamaño máximo 10 MB
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        showToast('El archivo excede el límite máximo permitido de 10 MB.', 'error');
        return;
      }

      // Iniciar UI de progreso
      progressBox.classList.remove('d-none');
      progressFilename.textContent = file.name;
      progressBar.style.width = '10%';
      progressPercentage.textContent = '10%';

      try {
        let storageUrl = '';

        if (USE_MOCK) {
          // Simulación visual de subida con progreso gradual
          for (let p = 25; p <= 90; p += 25) {
            await new Promise(r => setTimeout(r, 80));
            progressBar.style.width = `${p}%`;
            progressPercentage.textContent = `${p}%`;
          }
          storageUrl = `https://blob.vercel-storage.com/incidencias/${inc.codigo}/${encodeURIComponent(file.name)}`;
        } else {
          // Subida real mediante Vercel Blob Client
          try {
            const { upload } = await import('https://esm.sh/@vercel/blob@0.27.1/client');
            const blobResult = await upload(`incidencias/${inc.codigo}/${file.name}`, file, {
              access: 'private',
              handleUploadUrl: '/api/evidencias/upload-token',
              onUploadProgress: (progressEvent) => {
                const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                progressBar.style.width = `${pct}%`;
                progressPercentage.textContent = `${pct}%`;
              }
            });
            storageUrl = blobResult.url;
          } catch (uploadError) {
            throw new Error(`Fallo en la subida a almacenamiento: ${uploadError.message}`);
          }
        }

        progressBar.style.width = '100%';
        progressPercentage.textContent = '100%';

        // SOLO si la subida termina bien, llamar a POST /api/incidencias/:codigo/evidencias
        const pesoKb = Math.round(file.size / 1024);
        await addEvidencia(inc.codigo, {
          nombre_archivo: file.name,
          tipo_mime: file.type,
          peso_kb: pesoKb,
          url_storage: storageUrl
        });

        showToast('Evidencia cargada y registrada exitosamente', 'success');
        await renderDetalleView(container, inc.codigo);

      } catch (err) {
        progressBox.classList.add('d-none');
        showToast(`Error al subir evidencia: ${err.message}`, 'error');
      }
    }
  }
}
