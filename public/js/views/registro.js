/**
 * UTM Desk — Vista Registro de Incidencia (CU-01)
 * Formulario polimórfico dinámico, validación estricta de tipos y formatos IPv4,
 * sanitización de payload (cero nulls/vacíos) y feedback inmediato con código generado.
 */

import { createIncidencia } from '../api.js';
import { EDIFICIOS, CATEGORIAS, PRIORIDADES, ROLES_REPORTANTE, NIVELES_RIESGO } from '../config.js';
import { esc, isValidIPv4, isValidEmail, showToast } from '../utils.js';
import { getUsuario } from '../auth.js';

export async function renderRegistroView(container) {
  const usuarioActual = getUsuario();
  // Estado local para chips de insumos en infraestructura
  let currentInsumos = [];

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Registrar Nueva Incidencia</h1>
        <p class="view-desc">Levantamiento formal de ticket operativo para despacho en campus.</p>
      </div>
      <div>
        <a href="#/tablero" class="btn-custom-secondary btn-custom-sm">← Cancelar y volver</a>
      </div>
    </div>

    <!-- Contenedor para alerta de éxito posterior a la creación -->
    <div id="registro-alert-container"></div>

    <form id="form-registro-incidencia" class="needs-validation" novalidate>
      <div class="row g-4">
        
        <!-- Bloque 1: Reportante y Ubicación -->
        <div class="col-12 col-lg-6">
          
          <!-- Datos del Reportante (Sesión Activa RF-05) -->
          <section class="panel-card mb-4" aria-label="Sección del reportante">
            <h2 class="panel-card-title mb-3">1. Datos del Reportante (Sesión Activa)</h2>
            <div class="p-3 rounded bg-subtle border">
              <div class="d-flex align-items-center justify-content-between mb-1">
                <span class="fw-bold fs-6">${esc(usuarioActual?.nombre_completo || usuarioActual?.nombre || 'Reportante')}</span>
                <span class="badge-nivel ${usuarioActual?.nivel_acceso === 'superadmin' ? 'badge-superadmin' : 'badge-reportante'}">${esc(usuarioActual?.tipo_reportante || (usuarioActual?.nivel_acceso === 'superadmin' ? 'Superadmin' : 'Reportante'))}</span>
              </div>
              <div class="font-mono text-muted" style="font-size:0.8rem;">
                ${esc(usuarioActual?.correo || '')}
              </div>
              <div class="form-hint mt-2" style="font-size:0.75rem;">
                Identidad institucional tomada automáticamente del token de sesión (RF-05).
              </div>
            </div>
          </section>

          <!-- Ubicación en Campus -->
          <section class="panel-card mb-4" aria-label="Sección de ubicación">
            <h2 class="panel-card-title mb-3">2. Ubicación en Campus</h2>

            <div class="row g-3 mb-3">
              <div class="col-sm-8">
                <label for="ubi-edificio" class="form-label-custom">Edificio *</label>
                <select id="ubi-edificio" class="form-select-custom" required>
                  <option value="">Seleccione edificio...</option>
                  ${EDIFICIOS.map(ed => `<option value="${esc(ed)}">${esc(ed)}</option>`).join('')}
                </select>
                <div class="field-error-msg d-none" id="err-ubi-edificio">Seleccione un edificio.</div>
              </div>

              <div class="col-sm-4">
                <label for="ubi-piso" class="form-label-custom">Piso (Opcional)</label>
                <input type="number" id="ubi-piso" class="form-control-custom font-mono" min="0" max="10" placeholder="Ej. 1">
                <div class="field-error-msg d-none" id="err-ubi-piso">Piso no negativo.</div>
              </div>
            </div>

            <div class="mb-3">
              <label for="ubi-espacio" class="form-label-custom">Espacio / Aula / Laboratorio *</label>
              <input type="text" id="ubi-espacio" class="form-control-custom" placeholder="Ej. Aula B-204, Laboratorio L-1, Cubículo 12" required>
              <div class="field-error-msg d-none" id="err-ubi-espacio">Indique el espacio físico o aula.</div>
            </div>
          </section>

        </div>

        <!-- Bloque 2: Clasificación General y Detalle Específico Polimórfico -->
        <div class="col-12 col-lg-6">
          
          <section class="panel-card mb-4" aria-label="Información de la incidencia">
            <h2 class="panel-card-title mb-3">3. Datos Generales de la Falla</h2>

            <div class="mb-3">
              <label for="inc-titulo" class="form-label-custom">Título de la Incidencia *</label>
              <input type="text" id="inc-titulo" class="form-control-custom" placeholder="Ej. Switch sin respuesta en rack principal" required>
              <div class="field-error-msg d-none" id="err-inc-titulo">El título es obligatorio.</div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-sm-6">
                <label for="inc-categoria" class="form-label-custom">Categoría *</label>
                <select id="inc-categoria" class="form-select-custom" required>
                  <option value="">Seleccionar categoría...</option>
                  ${Object.values(CATEGORIAS).map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}
                </select>
                <div class="field-error-msg d-none" id="err-inc-categoria">Seleccione una categoría.</div>
              </div>

              <div class="col-sm-6">
                <label for="inc-prioridad" class="form-label-custom">Prioridad *</label>
                <select id="inc-prioridad" class="form-select-custom" required>
                  ${Object.values(PRIORIDADES).map(p => `
                    <option value="${esc(p.id)}" ${p.id === 'media' ? 'selected' : ''}>${esc(p.label)} (${esc(p.glyph)})</option>
                  `).join('')}
                </select>
                <div class="field-error-msg d-none" id="err-inc-prioridad">Seleccione prioridad.</div>
              </div>
            </div>

            <div class="mb-3">
              <label for="inc-descripcion" class="form-label-custom">Descripción Detallada *</label>
              <textarea id="inc-descripcion" class="form-control-custom" rows="3" placeholder="Detalle los síntomas del problema, comportamiento observado y cualquier impacto inmediato..." required></textarea>
              <div class="field-error-msg d-none" id="err-inc-descripcion">La descripción es obligatoria.</div>
            </div>
          </section>

          <!-- Detalle Específico Renderizado Dinámicamente -->
          <section class="panel-card mb-4" id="contenedor-detalle-especifico" aria-label="Campos técnicos polimórficos">
            <h2 class="panel-card-title mb-3">4. Parámetros Técnicos de Categoría</h2>
            <div id="campos-dinamicos-categoria" class="py-2">
              <div class="state-container py-4 my-1">
                <div class="state-desc mb-0">Seleccione una categoría arriba para mostrar los parámetros específicos requeridos.</div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <!-- Barra Inferior de Envío -->
      <div class="panel-card d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div class="text-muted" style="font-size:0.825rem;">
          * Campos obligatorios. El backend validará la estructura polimórfica según la categoría seleccionada.
        </div>
        <div class="d-flex gap-2">
          <button type="reset" class="btn-custom-secondary" id="btn-reset-form">Limpiar Formulario</button>
          <button type="submit" id="btn-submit-incidencia" class="btn-custom-primary">
            <span>+</span> Crear Incidencia
          </button>
        </div>
      </div>
    </form>
  `;

  const form = container.querySelector('#form-registro-incidencia');
  const selCategoria = container.querySelector('#inc-categoria');
  const contenedorDinamico = container.querySelector('#campos-dinamicos-categoria');
  const alertContainer = container.querySelector('#registro-alert-container');
  const btnSubmit = container.querySelector('#btn-submit-incidencia');

  // Renderizar campos de detalle específico al cambiar de categoría
  selCategoria.addEventListener('change', () => {
    const cat = selCategoria.value;
    currentInsumos = [];
    renderCamposCategoria(cat);
  });

  function renderCamposCategoria(cat) {
    if (!cat) {
      contenedorDinamico.innerHTML = `
        <div class="state-container py-4 my-1">
          <div class="state-desc mb-0">Seleccione una categoría arriba para mostrar los parámetros específicos requeridos.</div>
        </div>
      `;
      return;
    }

    if (cat === 'computo_redes') {
      contenedorDinamico.innerHTML = `
        <div class="row g-3">
          <div class="col-sm-6">
            <label for="det-cr-falla" class="form-label-custom">Tipo de Falla *</label>
            <input type="text" id="det-cr-falla" class="form-control-custom" placeholder="Ej. Pérdida de enlace, caída de switch" required>
            <div class="field-error-msg d-none" id="err-det-cr-falla">El tipo de falla es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-cr-equipo" class="form-label-custom">Equipo / Dispositivo *</label>
            <input type="text" id="det-cr-equipo" class="form-control-custom" placeholder="Ej. Cisco Catalyst 2960-X" required>
            <div class="field-error-msg d-none" id="err-det-cr-equipo">El equipo es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-cr-ip" class="form-label-custom">Dirección IPv4 *</label>
            <input type="text" id="det-cr-ip" class="form-control-custom font-mono" placeholder="10.10.4.2" required>
            <div class="field-error-msg d-none" id="err-det-cr-ip">Debe ser una dirección IPv4 válida (ej. 192.168.1.1).</div>
          </div>

          <div class="col-sm-6">
            <label for="det-cr-vlan" class="form-label-custom">VLAN *</label>
            <input type="number" id="det-cr-vlan" class="form-control-custom font-mono" min="1" max="4094" placeholder="40" required>
            <div class="field-error-msg d-none" id="err-det-cr-vlan">Número de VLAN requerido (1 a 4094).</div>
          </div>

          <div class="col-sm-6">
            <label for="det-cr-uplink" class="form-label-custom">Puerto Uplink *</label>
            <input type="text" id="det-cr-uplink" class="form-control-custom font-mono" placeholder="Gi0/48" required>
            <div class="field-error-msg d-none" id="err-det-cr-uplink">El puerto uplink es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-cr-afectados" class="form-label-custom">Equipos Afectados *</label>
            <input type="number" id="det-cr-afectados" class="form-control-custom font-mono" min="0" value="0" required>
            <div class="field-error-msg d-none" id="err-det-cr-afectados">Debe ser un entero mayor o igual a 0.</div>
          </div>
        </div>
      `;
    } else if (cat === 'infraestructura') {
      contenedorDinamico.innerHTML = `
        <div class="row g-3">
          <div class="col-sm-6">
            <label for="det-inf-dano" class="form-label-custom">Tipo de Daño *</label>
            <input type="text" id="det-inf-dano" class="form-control-custom" placeholder="Ej. Filtración pluvial en losa" required>
            <div class="field-error-msg d-none" id="err-det-inf-dano">El tipo de daño es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-inf-riesgo" class="form-label-custom">Riesgo de Seguridad *</label>
            <select id="det-inf-riesgo" class="form-select-custom" required>
              ${Object.entries(NIVELES_RIESGO).map(([k, v]) => `
                <option value="${esc(k)}" ${k === 'medio' ? 'selected' : ''}>${esc(v)}</option>
              `).join('')}
            </select>
          </div>

          <div class="col-12">
            <label for="det-inf-chip-input" class="form-label-custom">Insumos Requeridos (Chips)</label>
            <div class="chips-container" id="insumos-chips-wrapper">
              <input type="text" id="det-inf-chip-input" class="chip-input" placeholder="+ Agregar insumo y presionar Enter">
            </div>
            <div class="form-hint">Escribe cada material y presiona Enter para agregarlo (ej. Sellador, Lámpara LED).</div>
          </div>

          <div class="col-12">
            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="det-inf-contratista-check">
              <label class="form-check-label fw-semibold" for="det-inf-contratista-check">
                Requiere Contratista Externo
              </label>
            </div>
          </div>

          <div class="col-12 d-none" id="wrapper-contratista-nombre">
            <label for="det-inf-contratista-name" class="form-label-custom">Empresa / Contratista *</label>
            <input type="text" id="det-inf-contratista-name" class="form-control-custom" placeholder="Nombre de la empresa contratista">
            <div class="field-error-msg d-none" id="err-det-inf-contratista">Especifique el nombre del contratista.</div>
          </div>
        </div>
      `;

      // Comportamiento de checkbox de contratista
      const checkContratista = contenedorDinamico.querySelector('#det-inf-contratista-check');
      const wrapperContratista = contenedorDinamico.querySelector('#wrapper-contratista-nombre');
      const inputContratista = contenedorDinamico.querySelector('#det-inf-contratista-name');

      checkContratista.addEventListener('change', () => {
        if (checkContratista.checked) {
          wrapperContratista.classList.remove('d-none');
          inputContratista.required = true;
        } else {
          wrapperContratista.classList.add('d-none');
          inputContratista.required = false;
          inputContratista.value = '';
        }
      });

      // Manejo de chips de insumos
      const insumosWrapper = contenedorDinamico.querySelector('#insumos-chips-wrapper');
      const insumosInput = contenedorDinamico.querySelector('#det-inf-chip-input');

      insumosInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = insumosInput.value.trim();
          if (val && !currentInsumos.includes(val)) {
            currentInsumos.push(val);
            renderInsumosChips();
            insumosInput.value = '';
          }
        }
      });

      function renderInsumosChips() {
        insumosWrapper.querySelectorAll('.chip-item').forEach(el => el.remove());
        currentInsumos.forEach((insumo, idx) => {
          const chip = document.createElement('span');
          chip.className = 'chip-item';
          chip.innerHTML = `
            ${esc(insumo)}
            <button type="button" class="chip-remove-btn" title="Eliminar ${esc(insumo)}">✕</button>
          `;
          chip.querySelector('.chip-remove-btn').addEventListener('click', () => {
            currentInsumos.splice(idx, 1);
            renderInsumosChips();
          });
          insumosWrapper.insertBefore(chip, insumosInput);
        });
      }

    } else if (cat === 'academico') {
      contenedorDinamico.innerHTML = `
        <div class="row g-3">
          <div class="col-sm-6">
            <label for="det-ac-plataforma" class="form-label-custom">Plataforma Académica *</label>
            <input type="text" id="det-ac-plataforma" class="form-control-custom" placeholder="Ej. Portal de Servicios Escolares (SIA)" required>
            <div class="field-error-msg d-none" id="err-det-ac-plataforma">La plataforma es obligatoria.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-ac-curso" class="form-label-custom">Código de Curso *</label>
            <input type="text" id="det-ac-curso" class="form-control-custom font-mono" placeholder="ISW-702" required>
            <div class="field-error-msg d-none" id="err-det-ac-curso">El código de curso es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-ac-periodo" class="form-label-custom">Periodo Escolar *</label>
            <input type="text" id="det-ac-periodo" class="form-control-custom" placeholder="SEP-DIC 2026" required>
            <div class="field-error-msg d-none" id="err-det-ac-periodo">El periodo escolar es obligatorio.</div>
          </div>

          <div class="col-sm-6">
            <label for="det-ac-impactados" class="form-label-custom">Estudiantes Impactados *</label>
            <input type="number" id="det-ac-impactados" class="form-control-custom font-mono" min="0" value="0" required>
            <div class="field-error-msg d-none" id="err-det-ac-impactados">Debe ser un número entero mayor o igual a 0.</div>
          </div>

          <div class="col-12">
            <label for="det-ac-mensaje" class="form-label-custom">Mensaje o Código de Error *</label>
            <input type="text" id="det-ac-mensaje" class="form-control-custom font-mono" placeholder="Ej. HTTP 500: Database Connection Pool Timeout" required>
            <div class="field-error-msg d-none" id="err-det-ac-mensaje">El mensaje de error es obligatorio.</div>
          </div>
        </div>
      `;
    }
  }

  // Validación y envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertContainer.innerHTML = '';

    // Limpiar errores visuales previos
    container.querySelectorAll('.field-error-msg').forEach(el => el.classList.add('d-none'));
    container.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    let isValid = true;

    function setFieldError(fieldId, errorId, show = true) {
      const field = container.querySelector(fieldId);
      const err = container.querySelector(errorId);
      if (field && err) {
        if (show) {
          field.classList.add('is-invalid');
          err.classList.remove('d-none');
          isValid = false;
        } else {
          field.classList.remove('is-invalid');
          err.classList.add('d-none');
        }
      }
    }

    // Validar Ubicación
    const ubiEdificio = container.querySelector('#ubi-edificio').value;
    if (!ubiEdificio) setFieldError('#ubi-edificio', '#err-ubi-edificio');

    const ubiPisoVal = container.querySelector('#ubi-piso').value.trim();
    let ubiPiso = undefined;
    if (ubiPisoVal !== '') {
      ubiPiso = parseInt(ubiPisoVal, 10);
      if (isNaN(ubiPiso) || ubiPiso < 0) {
        setFieldError('#ubi-piso', '#err-ubi-piso');
      }
    }

    const ubiEspacio = container.querySelector('#ubi-espacio').value.trim();
    if (!ubiEspacio) setFieldError('#ubi-espacio', '#err-ubi-espacio');

    // Validar Incidencia
    const incTitulo = container.querySelector('#inc-titulo').value.trim();
    if (!incTitulo) setFieldError('#inc-titulo', '#err-inc-titulo');

    const incCategoria = container.querySelector('#inc-categoria').value;
    if (!incCategoria) setFieldError('#inc-categoria', '#err-inc-categoria');

    const incPrioridad = container.querySelector('#inc-prioridad').value;
    if (!incPrioridad) setFieldError('#inc-prioridad', '#err-inc-prioridad');

    const incDescripcion = container.querySelector('#inc-descripcion').value.trim();
    if (!incDescripcion) setFieldError('#inc-descripcion', '#err-inc-descripcion');

    // Validar Detalle Específico según Categoría elegida
    let detalleEspecifico = {};

    if (incCategoria === 'computo_redes') {
      const tipoFalla = container.querySelector('#det-cr-falla')?.value.trim();
      if (!tipoFalla) setFieldError('#det-cr-falla', '#err-det-cr-falla');

      const equipo = container.querySelector('#det-cr-equipo')?.value.trim();
      if (!equipo) setFieldError('#det-cr-equipo', '#err-det-cr-equipo');

      const ip = container.querySelector('#det-cr-ip')?.value.trim();
      if (!ip || !isValidIPv4(ip)) setFieldError('#det-cr-ip', '#err-det-cr-ip');

      const vlanVal = container.querySelector('#det-cr-vlan')?.value.trim();
      const vlanNum = parseInt(vlanVal, 10);
      if (isNaN(vlanNum) || vlanNum < 1 || vlanNum > 4094) setFieldError('#det-cr-vlan', '#err-det-cr-vlan');

      const uplink = container.querySelector('#det-cr-uplink')?.value.trim();
      if (!uplink) setFieldError('#det-cr-uplink', '#err-det-cr-uplink');

      const afectadosVal = container.querySelector('#det-cr-afectados')?.value.trim();
      const afectadosNum = parseInt(afectadosVal, 10);
      if (isNaN(afectadosNum) || afectadosNum < 0) setFieldError('#det-cr-afectados', '#err-det-cr-afectados');

      detalleEspecifico = {
        tipo_falla: tipoFalla,
        equipo: equipo,
        direccion_ip: ip,
        vlan: vlanNum,
        puerto_uplink: uplink,
        equipos_afectados: afectadosNum
      };
    } else if (incCategoria === 'infraestructura') {
      const tipoDano = container.querySelector('#det-inf-dano')?.value.trim();
      if (!tipoDano) setFieldError('#det-inf-dano', '#err-det-inf-dano');

      const riesgo = container.querySelector('#det-inf-riesgo')?.value;
      const reqContratista = container.querySelector('#det-inf-contratista-check')?.checked || false;
      let contratistaName = undefined;

      if (reqContratista) {
        contratistaName = container.querySelector('#det-inf-contratista-name')?.value.trim();
        if (!contratistaName) setFieldError('#det-inf-contratista-name', '#err-det-inf-contratista');
      }

      detalleEspecifico = {
        tipo_dano: tipoDano,
        riesgo_seguridad: riesgo,
        insumos_requeridos: currentInsumos.length > 0 ? currentInsumos : [],
        requiere_contratista: reqContratista
      };
      if (reqContratista && contratistaName) {
        detalleEspecifico.contratista = contratistaName;
      }
    } else if (incCategoria === 'academico') {
      const plataforma = container.querySelector('#det-ac-plataforma')?.value.trim();
      if (!plataforma) setFieldError('#det-ac-plataforma', '#err-det-ac-plataforma');

      const curso = container.querySelector('#det-ac-curso')?.value.trim();
      if (!curso) setFieldError('#det-ac-curso', '#err-det-ac-curso');

      const periodo = container.querySelector('#det-ac-periodo')?.value.trim();
      if (!periodo) setFieldError('#det-ac-periodo', '#err-det-ac-periodo');

      const impactadosVal = container.querySelector('#det-ac-impactados')?.value.trim();
      const impactadosNum = parseInt(impactadosVal, 10);
      if (isNaN(impactadosNum) || impactadosNum < 0) setFieldError('#det-ac-impactados', '#err-det-ac-impactados');

      const mensaje = container.querySelector('#det-ac-mensaje')?.value.trim();
      if (!mensaje) setFieldError('#det-ac-mensaje', '#err-det-ac-mensaje');

      detalleEspecifico = {
        plataforma: plataforma,
        codigo_curso: curso,
        periodo_escolar: periodo,
        estudiantes_impactados: impactadosNum,
        mensaje_error: mensaje
      };
    }

    if (!isValid) {
      showToast('Por favor complete los campos obligatorios con valores válidos.', 'error');
      // Enfocar el primer campo inválido
      container.querySelector('.is-invalid')?.focus();
      return;
    }

    // Armar payload estrictamente limpio (cero nulls o cadenas vacías)
    // Nota: El reportante lo toma el servidor directamente del token de sesión (RF-05).
    const payload = {
      titulo: incTitulo,
      descripcion: incDescripcion,
      categoria: incCategoria,
      prioridad: incPrioridad,
      ubicacion: {
        edificio: ubiEdificio,
        espacio: ubiEspacio
      },
      detalle_especifico: detalleEspecifico
    };

    if (ubiPiso !== undefined) {
      payload.ubicacion.piso = ubiPiso;
    }

    // Deshabilitar botón durante el envío
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="app-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Registrando...`;

    try {
      const response = await createIncidencia(payload);
      const codigoNuevo = response.codigo;

      showToast(`Incidencia ${codigoNuevo} creada exitosamente`, 'success');

      // Mostrar tarjeta de éxito con botón directo a detalle
      alertContainer.innerHTML = `
        <div class="panel-card mb-4" style="background-color:var(--status-resuelta-bg); border-color:var(--status-resuelta-border);">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <span class="d-block fw-bold" style="color:var(--status-resuelta-text); font-size:1.1rem;">
                ✓ Incidencia Registrada con Éxito
              </span>
              <span class="font-mono fs-5 fw-bold text-primary">${esc(codigoNuevo)}</span>
              <p class="text-secondary mb-0" style="font-size:0.875rem;">
                El ticket ha ingresado a la cola de triaje del campus.
              </p>
            </div>
            <div class="d-flex gap-2">
              <a href="#/incidencia/${encodeURIComponent(codigoNuevo)}" class="btn-custom-primary">
                Ver Detalle del Ticket →
              </a>
              <button type="button" id="btn-crear-otra" class="btn-custom-secondary">
                Registrar Otra
              </button>
            </div>
          </div>
        </div>
      `;

      form.reset();
      selCategoria.value = '';
      currentInsumos = [];
      renderCamposCategoria('');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      alertContainer.querySelector('#btn-crear-otra')?.addEventListener('click', () => {
        alertContainer.innerHTML = '';
        container.querySelector('#rep-nombre')?.focus();
      });

    } catch (err) {
      // SIEMPRE mostrar el mensaje de error 400 del backend
      showToast(err.message, 'error');
      alertContainer.innerHTML = `
        <div class="panel-card mb-4" style="background-color:var(--prio-critica-bg); border-color:var(--prio-critica-border);">
          <div class="d-flex align-items-start gap-3">
            <span style="font-size:1.5rem; color:var(--prio-critica-dot);">⚠</span>
            <div>
              <strong style="color:var(--prio-critica-text); display:block;">Error de validación del servidor:</strong>
              <div class="text-secondary" style="font-size:0.875rem;">${esc(err.message)}</div>
            </div>
          </div>
        </div>
      `;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>+</span> Crear Incidencia`;
    }
  });

  // Limpiar formulario al resetear
  container.querySelector('#btn-reset-form')?.addEventListener('click', () => {
    currentInsumos = [];
    renderCamposCategoria('');
    container.querySelectorAll('.field-error-msg').forEach(el => el.classList.add('d-none'));
    container.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    alertContainer.innerHTML = '';
  });
}
