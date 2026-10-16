/**
 * UTM Desk — Capa Central de API y Almacén Mock en Memoria
 * Único punto de interacción con el backend o el mock de datos en memoria.
 */

import { USE_MOCK, EDIFICIOS } from './config.js';
import { cleanPayload, normalizeTag } from './utils.js';

// ==========================================================================
// ALMACÉN EN MEMORIA PARA MODO MOCK (Sin localStorage de datos de negocio)
// ==========================================================================

const INITIAL_MOCK_INCIDENCIAS = [
  {
    codigo: "INC-2026-0042",
    titulo: "Falla general de switch de distribución en Laboratorio L-1",
    descripcion: "Switch Cisco Catalyst 2960 sin respuesta tras tormenta eléctrica. Se reemplazó módulo de fuente redundante y se reconfiguró puerto uplink Gi0/48.",
    categoria: "computo_redes",
    prioridad: "critica",
    estado: "resuelta",
    reportante: {
      nombre: "Ing. Carlos Mendoza",
      rol: "docente",
      correo: "carlos.mendoza@utm.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 1,
      espacio: "Laboratorio L-1"
    },
    tecnico_asignado: "Lic. Roberto Garza",
    detalle_especifico: {
      tipo_falla: "Pérdida de enlace en switch de distribución",
      equipo: "Cisco Catalyst 2960-X",
      direccion_ip: "10.10.4.2",
      vlan: 40,
      puerto_uplink: "Gi0/48",
      equipos_afectados: 24
    },
    tags: ["cisco", "red-academica", "switch", "vlan40"],
    horas_invertidas: 3.5,
    fecha_creacion: "2026-10-10T14:30:00.000Z",
    fecha_resolucion: "2026-10-11T18:00:00.000Z",
    historial_seguimiento: [
      {
        fecha: "2026-10-10T14:35:00.000Z",
        autor: "Mesa de Ayuda",
        estado_nuevo: "abierta",
        comentario: "Incidencia recibida por reporte docente.",
        horas: 0
      },
      {
        fecha: "2026-10-10T15:10:00.000Z",
        autor: "Roberto Garza",
        estado_nuevo: "en_proceso",
        comentario: "Se acudió a rack de piso 1 en Edificio A. Diagnóstico de falla en módulo de poder.",
        horas: 1.5
      },
      {
        fecha: "2026-10-11T18:00:00.000Z",
        autor: "Roberto Garza",
        estado_nuevo: "resuelta",
        comentario: "Instalación de módulo de respaldo y pruebas de conectividad en VLAN 40 exitosas.",
        horas: 2.0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "diagnostico_switch_l1.pdf",
        tipo_mime: "application/pdf",
        peso_kb: 420,
        url_storage: "https://example.com/storage/diagnostico_switch_l1.pdf",
        fecha_carga: "2026-10-11T17:50:00.000Z"
      }
    ]
  },
  {
    codigo: "INC-2026-0043",
    titulo: "Filtración en techo y luminarias de aula B-204",
    descripcion: "Gotera abundante sobre fila central de butacas y luminarias en aula B-204 tras lluvias intensas en el campus.",
    categoria: "infraestructura",
    prioridad: "alta",
    estado: "en_proceso",
    reportante: {
      nombre: "Dra. Sofía Alarcón",
      rol: "docente",
      correo: "sofia.alarcon@utm.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 2,
      espacio: "Aula B-204"
    },
    tecnico_asignado: "Arq. Marcos Peña",
    detalle_especifico: {
      tipo_dano: "Filtración pluvial en losa superior y falso plafón",
      riesgo_seguridad: "alto",
      insumos_requeridos: ["Sellador elastomérico", "Membrana de refuerzo", "Lámpara LED 60x60"],
      requiere_contratista: true,
      contratista: "Impermeabilizantes del Sureste"
    },
    tags: ["impermeabilizacion", "goteras", "aula-b204", "mantenimiento"],
    horas_invertidas: 1.5,
    fecha_creacion: "2026-10-14T09:15:00.000Z",
    historial_seguimiento: [
      {
        fecha: "2026-10-14T11:00:00.000Z",
        autor: "Marcos Peña",
        estado_nuevo: "en_proceso",
        comentario: "Inspección técnica de azotea y corte preventivo de energía en luminarias. Visita del contratista programada.",
        horas: 1.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "evidencia_filtracion_b204.jpg",
        tipo_mime: "image/jpeg",
        peso_kb: 1840,
        url_storage: "https://example.com/storage/evidencia_filtracion_b204.jpg",
        fecha_carga: "2026-10-14T11:20:00.000Z"
      }
    ]
  },
  {
    codigo: "INC-2026-0044",
    titulo: "Error 500 en portal de calificaciones al asentar actas",
    descripcion: "Al intentar guardar calificaciones finales del curso ISW-702, la plataforma arroja HTTP 500 Internal Server Error impidiendo el cierre de actas escolares.",
    categoria: "academico",
    prioridad: "media",
    estado: "abierta",
    reportante: {
      nombre: "Mtro. Fernando Trejo",
      rol: "docente",
      correo: "fernando.trejo@utm.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio C",
      espacio: "Cubículo Docente C-12"
    },
    detalle_especifico: {
      plataforma: "Portal de Servicios Escolares (SIA-UTM)",
      codigo_curso: "ISW-702",
      periodo_escolar: "SEP-DIC 2026",
      estudiantes_impactados: 32,
      mensaje_error: "Unhandled rejection: MongoDB Connection Pool Timeout after 30000ms"
    },
    tags: ["portal-sia", "calificaciones", "error-500", "isw-702"],
    horas_invertidas: 0,
    fecha_creacion: "2026-10-15T08:00:00.000Z",
    historial_seguimiento: [],
    evidencias_adjuntas: []
  }
];

// Estructura en memoria
let mockStore = JSON.parse(JSON.stringify(INITIAL_MOCK_INCIDENCIAS));
let mockTicketCounter = 45;

// ==========================================================================
// WRAPPER DE FETCH CON MANEJO DE ERRORES DEL BACKEND
// ==========================================================================

/**
 * Wrapper de peticiones fetch que procesa respuestas y lanza errores legibles.
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
export async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json'
  };

  if (options.body && typeof options.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(endpoint, mergedOptions);
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = (data && typeof data === 'object' && data.error)
        ? data.error
        : (typeof data === 'string' && data ? data : `Error HTTP ${response.status}: ${response.statusText}`);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      // Fallo de conexión o red
      const netErr = new Error(`Error de conexión con el backend: ${error.message}`);
      netErr.status = 0;
      throw netErr;
    }
    throw error;
  }
}

// ==========================================================================
// MÉTODOS PÚBLICOS DE API (SOPORTAN BACKEND REAL Y MOCK EN MEMORIA)
// ==========================================================================

/**
 * GET /api/incidencias?categoria=&estado=&prioridad=&edificio=
 * Retorna lista de incidencias filtradas, ordenadas por más reciente primero.
 */
export async function getIncidencias(params = {}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 80)); // Simula latencia mínima
    let list = [...mockStore];

    if (params.categoria) {
      list = list.filter(i => i.categoria === params.categoria);
    }
    if (params.estado) {
      list = list.filter(i => i.estado === params.estado);
    }
    if (params.prioridad) {
      list = list.filter(i => i.prioridad === params.prioridad);
    }
    if (params.edificio) {
      list = list.filter(i => i.ubicacion && i.ubicacion.edificio === params.edificio);
    }

    // Ordenar por fecha_creacion descendente (más reciente primero)
    list.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
    return JSON.parse(JSON.stringify(list));
  }

  const query = new URLSearchParams(cleanPayload(params)).toString();
  const url = `/api/incidencias${query ? `?${query}` : ''}`;
  return await request(url, { method: 'GET' });
}

/**
 * GET /api/incidencias/:codigo
 * Retorna una incidencia completa o 404.
 */
export async function getIncidencia(codigo) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 60));
    const found = mockStore.find(i => i.codigo === codigo);
    if (!found) {
      const err = new Error(`Incidencia no encontrada con código ${codigo}`);
      err.status = 404;
      throw err;
    }
    return JSON.parse(JSON.stringify(found));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}`, { method: 'GET' });
}

/**
 * POST /api/incidencias
 * Registra una nueva incidencia. El backend genera codigo, estado, fecha_creacion, etc.
 */
export async function createIncidencia(data) {
  const payload = cleanPayload(data);

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 120));
    const anio = new Date().getFullYear();
    const padNum = String(mockTicketCounter++).padStart(4, '0');
    const codigoGenerado = `INC-${anio}-${padNum}`;

    const nuevaIncidencia = {
      codigo: codigoGenerado,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      categoria: payload.categoria,
      prioridad: payload.prioridad,
      estado: "abierta",
      reportante: payload.reportante,
      ubicacion: payload.ubicacion,
      detalle_especifico: payload.detalle_especifico || {},
      tags: [],
      horas_invertidas: 0,
      fecha_creacion: new Date().toISOString(),
      historial_seguimiento: [],
      evidencias_adjuntas: []
    };

    if (payload.tecnico_asignado) {
      nuevaIncidencia.tecnico_asignado = payload.tecnico_asignado;
    }

    mockStore.unshift(nuevaIncidencia);
    return JSON.parse(JSON.stringify(nuevaIncidencia));
  }

  return await request('/api/incidencias', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * PATCH /api/incidencias/:codigo/estado
 * Actualiza el estado, agrega entrada a la bitácora y acumula horas invertidas.
 */
export async function patchEstado(codigo, { estado_nuevo, autor, comentario, horas }) {
  const payload = cleanPayload({ estado_nuevo, autor, comentario, horas: Number(horas) || 0 });

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    const inc = mockStore.find(i => i.codigo === codigo);
    if (!inc) {
      const err = new Error(`Incidencia ${codigo} no encontrada`);
      err.status = 404;
      throw err;
    }

    inc.estado = payload.estado_nuevo;
    const addHoras = Number(payload.horas) || 0;
    inc.horas_invertidas = (Number(inc.horas_invertidas) || 0) + addHoras;

    if (!inc.historial_seguimiento) inc.historial_seguimiento = [];
    inc.historial_seguimiento.push({
      fecha: new Date().toISOString(),
      autor: payload.autor || 'Sistema',
      estado_nuevo: payload.estado_nuevo,
      comentario: payload.comentario || '',
      horas: addHoras
    });

    if (payload.estado_nuevo === 'resuelta' || payload.estado_nuevo === 'cerrada') {
      if (!inc.fecha_resolucion) {
        inc.fecha_resolucion = new Date().toISOString();
      }
    } else {
      delete inc.fecha_resolucion;
    }

    return JSON.parse(JSON.stringify(inc));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

/**
 * PATCH /api/incidencias/:codigo/tecnico
 * Asigna o cambia el técnico responsable de la incidencia.
 */
export async function patchTecnico(codigo, { tecnico_asignado }) {
  const payload = cleanPayload({ tecnico_asignado });

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 80));
    const inc = mockStore.find(i => i.codigo === codigo);
    if (!inc) {
      const err = new Error(`Incidencia ${codigo} no encontrada`);
      err.status = 404;
      throw err;
    }

    if (payload.tecnico_asignado) {
      inc.tecnico_asignado = payload.tecnico_asignado;
    } else {
      delete inc.tecnico_asignado;
    }
    return JSON.parse(JSON.stringify(inc));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/tecnico`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

/**
 * POST /api/incidencias/:codigo/tags
 * Agrega una etiqueta a la incidencia.
 */
export async function addTag(codigo, tag) {
  const cleanTag = normalizeTag(tag);
  if (!cleanTag) {
    throw new Error('La etiqueta no puede estar vacía');
  }

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 60));
    const inc = mockStore.find(i => i.codigo === codigo);
    if (!inc) {
      const err = new Error(`Incidencia ${codigo} no encontrada`);
      err.status = 404;
      throw err;
    }

    if (!inc.tags) inc.tags = [];
    if (!inc.tags.includes(cleanTag)) {
      inc.tags.push(cleanTag);
    }
    return JSON.parse(JSON.stringify(inc));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag: cleanTag })
  });
}

/**
 * DELETE /api/incidencias/:codigo/tags/:tag
 * Elimina una etiqueta de la incidencia.
 */
export async function removeTag(codigo, tag) {
  const cleanTag = normalizeTag(tag);

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 60));
    const inc = mockStore.find(i => i.codigo === codigo);
    if (!inc) {
      const err = new Error(`Incidencia ${codigo} no encontrada`);
      err.status = 404;
      throw err;
    }

    if (inc.tags) {
      inc.tags = inc.tags.filter(t => t !== cleanTag);
    }
    return JSON.parse(JSON.stringify(inc));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/tags/${encodeURIComponent(cleanTag)}`, {
    method: 'DELETE'
  });
}

/**
 * POST /api/incidencias/:codigo/evidencias
 * Registra los metadatos de un archivo tras su subida.
 */
export async function addEvidencia(codigo, { nombre_archivo, tipo_mime, peso_kb, url_storage }) {
  const payload = cleanPayload({ nombre_archivo, tipo_mime, peso_kb, url_storage });

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 80));
    const inc = mockStore.find(i => i.codigo === codigo);
    if (!inc) {
      const err = new Error(`Incidencia ${codigo} no encontrada`);
      err.status = 404;
      throw err;
    }

    if (!inc.evidencias_adjuntas) inc.evidencias_adjuntas = [];
    const evidenciaItem = {
      ...payload,
      fecha_carga: new Date().toISOString()
    };
    inc.evidencias_adjuntas.push(evidenciaItem);
    return JSON.parse(JSON.stringify(inc));
  }

  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/evidencias`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * GET /api/incidencias/:codigo/evidencias/url?path=...
 * Obtiene la URL firmada temporal para visualizar o descargar la evidencia.
 */
export async function getEvidenciaUrl(codigo, path) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 60));
    // En modo mock retornamos una URL de demostración o visualización segura
    return { url: path || `https://example.com/mock-signed-url?token=sec_${Date.now()}` };
  }

  const query = new URLSearchParams({ path }).toString();
  return await request(`/api/incidencias/${encodeURIComponent(codigo)}/evidencias/url?${query}`, {
    method: 'GET'
  });
}

/**
 * GET /api/busqueda?q=texto
 * Retorna incidencias que coinciden por relevancia de texto.
 */
export async function buscarIncidencias(q) {
  const queryText = (q || '').trim().toLowerCase();

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 70));
    if (!queryText) return [];

    const matched = mockStore.filter(i => {
      const inCode = (i.codigo || '').toLowerCase().includes(queryText);
      const inTitle = (i.titulo || '').toLowerCase().includes(queryText);
      const inDesc = (i.descripcion || '').toLowerCase().includes(queryText);
      const inTags = (i.tags || []).some(t => t.toLowerCase().includes(queryText));
      const inReporter = i.reportante && i.reportante.nombre.toLowerCase().includes(queryText);
      const inBuilding = i.ubicacion && i.ubicacion.edificio.toLowerCase().includes(queryText);
      const inSpace = i.ubicacion && (i.ubicacion.espacio || '').toLowerCase().includes(queryText);
      const inTech = (i.tecnico_asignado || '').toLowerCase().includes(queryText);
      return inCode || inTitle || inDesc || inTags || inReporter || inBuilding || inSpace || inTech;
    });

    // Ordenar por relevancia simple: coincidencia en código o título tiene mayor peso
    matched.sort((a, b) => {
      const scoreA = ((a.codigo || '').toLowerCase().includes(queryText) ? 10 : 0) +
                     ((a.titulo || '').toLowerCase().includes(queryText) ? 5 : 0);
      const scoreB = ((b.codigo || '').toLowerCase().includes(queryText) ? 10 : 0) +
                     ((b.titulo || '').toLowerCase().includes(queryText) ? 5 : 0);
      return scoreB - scoreA;
    });

    return JSON.parse(JSON.stringify(matched));
  }

  return await request(`/api/busqueda?q=${encodeURIComponent(queryText)}`, { method: 'GET' });
}

/**
 * GET /api/analitica/edificios
 * Retorna promedio de horas, total de horas e incidencias resueltas/cerradas por edificio.
 */
export async function getAnaliticaEdificios() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 90));

    // Filtrar incidencias resueltas o cerradas
    const resueltas = mockStore.filter(i => i.estado === 'resuelta' || i.estado === 'cerrada');

    const mapa = {};
    for (const ed of EDIFICIOS) {
      mapa[ed] = { edificio: ed, total_horas: 0, incidencias: 0 };
    }

    for (const inc of resueltas) {
      const ed = inc.ubicacion ? inc.ubicacion.edificio : 'Edificio A';
      if (!mapa[ed]) {
        mapa[ed] = { edificio: ed, total_horas: 0, incidencias: 0 };
      }
      mapa[ed].total_horas += Number(inc.horas_invertidas) || 0;
      mapa[ed].incidencias += 1;
    }

    const resultado = Object.values(mapa).map(item => ({
      edificio: item.edificio,
      total_horas: Number(item.total_horas.toFixed(1)),
      incidencias: item.incidencias,
      promedio_horas: item.incidencias > 0
        ? Number((item.total_horas / item.incidencias).toFixed(1))
        : 0
    }));

    // Ordenar de mayor a menor por total_horas o incidencias
    resultado.sort((a, b) => b.total_horas - a.total_horas);
    return resultado;
  }

  return await request('/api/analitica/edificios', { method: 'GET' });
}

/**
 * GET /api/analitica/tags
 * Retorna las 10 etiquetas más frecuentes en incidencias resueltas/cerradas.
 */
export async function getAnaliticaTags() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 80));
    const counts = {};

    // Cubre incidencias resueltas/cerradas
    const resueltas = mockStore.filter(i => i.estado === 'resuelta' || i.estado === 'cerrada');

    for (const inc of resueltas) {
      for (const tag of (inc.tags || [])) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }

    // Si hay pocos tags en resueltas para la demo, incorporar los tags globales para ver el ranking
    if (Object.keys(counts).length < 3) {
      for (const inc of mockStore) {
        for (const tag of (inc.tags || [])) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }

    const list = Object.entries(counts).map(([tag, total]) => ({ tag, total }));
    list.sort((a, b) => b.total - a.total);
    return list.slice(0, 10);
  }

  return await request('/api/analitica/tags', { method: 'GET' });
}
