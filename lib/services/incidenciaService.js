/**
 * UTM Desk — Servicio de Incidencias (RF-04 a RF-22)
 * Capa central de lógica de negocio para incidencias, ciclo de vida,
 * transiciones de estado, bitácora atómica, asignaciones y analítica.
 */
import mongoose from 'mongoose';
import { isConnectedToAtlas, isMemoryDbActive } from '../db.js';
import { Incidencia } from '../models/Incidencia.js';
import { memoryStore } from '../memoryFallback.js';
import { validarTecnicoParaAsignacion } from './usuarioService.js';

function asegurarAccesoBD() {
  if (!isConnectedToAtlas() && !isMemoryDbActive()) {
    const err = new Error('Base de datos MongoDB no disponible y USE_MEMORY_DB no está activo.');
    err.status = 500;
    throw err;
  }
}

const EDIFICIOS_VALIDOS = ['Edificio A', 'Edificio B', 'Edificio C', 'Edificio D'];
const CATEGORIAS_VALIDAS = ['computo_redes', 'infraestructura', 'academico'];
const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'critica'];
const ESTADOS_VALIDOS = ['abierta', 'en_proceso', 'en_espera', 'resuelta', 'cerrada'];

// ── Generador atómico de código INC-AAAA-NNNN (RF-04, sección 5.3) ─────────
export async function generarSiguienteCodigo() {
  const anio = String(new Date().getFullYear());

  if (isConnectedToAtlas()) {
    const db = mongoose.connection.db;
    const res = await db.collection('contadores').findOneAndUpdate(
      { _id: anio },
      { $inc: { ultimo: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const ultimo = res ? (res.ultimo || res.value?.ultimo || 1) : 1;
    return `INC-${anio}-${String(ultimo).padStart(4, '0')}`;
  }

  asegurarAccesoBD();
  // Fallback en memoria
  memoryStore.contadores[anio] = (memoryStore.contadores[anio] || 0) + 1;
  const seq = String(memoryStore.contadores[anio]).padStart(4, '0');
  return `INC-${anio}-${seq}`;
}

// ── RF-04, RF-05, RF-06, RF-07, RF-08: Registro de Incidencias ────────────
export async function crearIncidencia(body, user) {
  // Solo el reportante puede registrar (los demás 403)
  if (user.nivel_acceso !== 'reportante') {
    const err = new Error("Acceso denegado. Solo usuarios con nivel 'reportante' pueden registrar incidencias.");
    err.status = 403;
    throw err;
  }

  const { titulo, descripcion, categoria, prioridad, ubicacion, detalle_especifico } = body || {};

  // Validar campos generales obligatorios
  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
    const err = new Error('El título es obligatorio y debe tener al menos 3 caracteres.');
    err.status = 400;
    throw err;
  }

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 5) {
    const err = new Error('La descripción es obligatoria y debe tener al menos 5 caracteres.');
    err.status = 400;
    throw err;
  }

  if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
    const err = new Error(`Categoría inválida. Opciones: ${CATEGORIAS_VALIDAS.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  if (!prioridad || !PRIORIDADES_VALIDAS.includes(prioridad)) {
    const err = new Error(`Prioridad inválida. Opciones: ${PRIORIDADES_VALIDAS.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  // RF-07: Validación de Ubicación
  if (!ubicacion || typeof ubicacion !== 'object') {
    const err = new Error('Los datos de ubicación son obligatorios.');
    err.status = 400;
    throw err;
  }

  if (!ubicacion.edificio || !EDIFICIOS_VALIDOS.includes(ubicacion.edificio)) {
    const err = new Error(`Edificio inválido. Debe ser uno de: ${EDIFICIOS_VALIDOS.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  if (!ubicacion.espacio || typeof ubicacion.espacio !== 'string' || !ubicacion.espacio.trim()) {
    const err = new Error('El espacio o aula de la ubicación es obligatorio.');
    err.status = 400;
    throw err;
  }

  const ubicacionDoc = {
    edificio: ubicacion.edificio,
    espacio: ubicacion.espacio.trim(),
  };
  if (ubicacion.piso !== undefined && ubicacion.piso !== null && ubicacion.piso !== '') {
    const pisoNum = Number(ubicacion.piso);
    if (isNaN(pisoNum) || pisoNum < 0) {
      const err = new Error('El piso debe ser un número mayor o igual a 0.');
      err.status = 400;
      throw err;
    }
    ubicacionDoc.piso = pisoNum;
  }

  // RF-06: Detalle específico por categoría (guarda ÚNICAMENTE los de esa categoría)
  if (!detalle_especifico || typeof detalle_especifico !== 'object') {
    const err = new Error('El detalle específico de la categoría es requerido.');
    err.status = 400;
    throw err;
  }

  let detalleLimpio = {};

  if (categoria === 'computo_redes') {
    const { tipo_falla, equipo, direccion_ip, vlan, puerto_uplink, equipos_afectados } = detalle_especifico;
    if (!tipo_falla || !equipo || !direccion_ip || vlan === undefined || !puerto_uplink || equipos_afectados === undefined) {
      const err = new Error('Faltan campos requeridos para computo_redes: tipo_falla, equipo, direccion_ip, vlan, puerto_uplink, equipos_afectados.');
      err.status = 400;
      throw err;
    }
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(direccion_ip)) {
      const err = new Error('La dirección IP debe tener un formato IPv4 válido (ej. 10.10.4.2).');
      err.status = 400;
      throw err;
    }
    const vlanNum = Number(vlan);
    if (isNaN(vlanNum) || vlanNum < 1 || vlanNum > 4094) {
      const err = new Error('La VLAN debe ser un número entero entre 1 y 4094.');
      err.status = 400;
      throw err;
    }
    const afectadosNum = Number(equipos_afectados);
    if (isNaN(afectadosNum) || afectadosNum < 0) {
      const err = new Error('Los equipos afectados deben ser un número mayor o igual a 0.');
      err.status = 400;
      throw err;
    }

    detalleLimpio = {
      tipo_falla: String(tipo_falla).trim(),
      equipo: String(equipo).trim(),
      direccion_ip: String(direccion_ip).trim(),
      vlan: vlanNum,
      puerto_uplink: String(puerto_uplink).trim(),
      equipos_afectados: afectadosNum,
    };
  } else if (categoria === 'infraestructura') {
    const { tipo_dano, riesgo_seguridad, insumos_requeridos, requiere_contratista, contratista } = detalle_especifico;
    if (!tipo_dano || !riesgo_seguridad) {
      const err = new Error('Faltan campos requeridos para infraestructura: tipo_dano, riesgo_seguridad.');
      err.status = 400;
      throw err;
    }
    if (!['bajo', 'medio', 'alto'].includes(riesgo_seguridad)) {
      const err = new Error("El riesgo de seguridad debe ser 'bajo', 'medio' o 'alto'.");
      err.status = 400;
      throw err;
    }
    detalleLimpio = {
      tipo_dano: String(tipo_dano).trim(),
      riesgo_seguridad,
    };
    if (Array.isArray(insumos_requeridos) && insumos_requeridos.length > 0) {
      detalleLimpio.insumos_requeridos = insumos_requeridos.map((i) => String(i).trim()).filter(Boolean);
    }
    if (requiere_contratista !== undefined) {
      const reqContratista = Boolean(requiere_contratista);
      detalleLimpio.requiere_contratista = reqContratista;
      if (reqContratista && contratista && String(contratista).trim()) {
        detalleLimpio.contratista = String(contratista).trim();
      }
    }
  } else if (categoria === 'academico') {
    const { plataforma, codigo_curso, periodo_escolar, estudiantes_impactados, mensaje_error } = detalle_especifico;
    if (!plataforma || !codigo_curso || !periodo_escolar || estudiantes_impactados === undefined || !mensaje_error) {
      const err = new Error('Faltan campos requeridos para academico: plataforma, codigo_curso, periodo_escolar, estudiantes_impactados, mensaje_error.');
      err.status = 400;
      throw err;
    }
    const impactadosNum = Number(estudiantes_impactados);
    if (isNaN(impactadosNum) || impactadosNum < 0) {
      const err = new Error('Los estudiantes impactados deben ser un número mayor o igual a 0.');
      err.status = 400;
      throw err;
    }
    detalleLimpio = {
      plataforma: String(plataforma).trim(),
      codigo_curso: String(codigo_curso).trim(),
      periodo_escolar: String(periodo_escolar).trim(),
      estudiantes_impactados: impactadosNum,
      mensaje_error: String(mensaje_error).trim(),
    };
  }

  // RF-04 y RF-05: Generar código atómico y tomar datos del reportante exclusivamente de la sesión
  const codigo = await generarSiguienteCodigo();
  const reportante = {
    nombre: user.nombre_completo || user.nombre,
    rol: user.tipo_reportante || 'docente',
    correo: user.correo,
  };

  const nuevoDoc = {
    codigo,
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    categoria,
    prioridad,
    estado: 'abierta',
    reportante,
    ubicacion: ubicacionDoc,
    detalle_especifico: detalleLimpio,
    tags: [],
    horas_invertidas: 0,
    fecha_creacion: new Date(),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  };

  if (isConnectedToAtlas()) {
    const creado = await Incidencia.create(nuevoDoc);
    return creado.toObject();
  }

  asegurarAccesoBD();
  memoryStore.incidencias.unshift(nuevoDoc);
  return { ...nuevoDoc };
}

// ── RF-09: Listar Incidencias con Filtros y Restricción por Rol ───────────
export async function listarIncidencias(filtros = {}, user) {
  const { categoria, estado, prioridad, edificio } = filtros;
  const match = {};

  if (categoria) match.categoria = categoria;
  if (estado) match.estado = estado;
  if (prioridad) match.prioridad = prioridad;
  if (edificio) match['ubicacion.edificio'] = edificio;

  // Restricción por rol en la base de datos
  if (user.nivel_acceso === 'reportante') {
    match['reportante.correo'] = user.correo.toLowerCase();
  } else if (user.nivel_acceso === 'tecnico') {
    match.$or = [
      { 'tecnico_asignado.correo': user.correo.toLowerCase() },
      { tecnico_asignado: { $exists: false } },
      { tecnico_asignado: null },
    ];
  }
  // coordinador y directivo ven todas

  if (isConnectedToAtlas()) {
    return await Incidencia.find(match).sort({ fecha_creacion: -1 }).lean();
  }

  asegurarAccesoBD();
  // En memoria
  let list = [...memoryStore.incidencias];
  if (user.nivel_acceso === 'reportante') {
    list = list.filter((i) => i.reportante?.correo?.toLowerCase() === user.correo.toLowerCase());
  } else if (user.nivel_acceso === 'tecnico') {
    list = list.filter(
      (i) =>
        i.tecnico_asignado?.correo?.toLowerCase() === user.correo.toLowerCase() ||
        !i.tecnico_asignado
    );
  }

  if (categoria) list = list.filter((i) => i.categoria === categoria);
  if (estado) list = list.filter((i) => i.estado === estado);
  if (prioridad) list = list.filter((i) => i.prioridad === prioridad);
  if (edificio) list = list.filter((i) => i.ubicacion?.edificio === edificio);

  list.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
  return list;
}

// ── RF-10: Consultar Detalle con Verificación de Acceso (404 vs 403) ───────
export async function consultarDetalleIncidencia(codigoParam, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();

  let inc = null;
  if (isConnectedToAtlas()) {
    inc = await Incidencia.findOne({ codigo: codigoNorm }).lean();
  } else {
    asegurarAccesoBD();
    const found = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
    inc = found ? JSON.parse(JSON.stringify(found)) : null;
  }

  if (!inc) {
    const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
    err.status = 404;
    throw err;
  }

  // Verificación de acceso por rol y propiedad
  if (user.nivel_acceso === 'reportante') {
    if (inc.reportante?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. No tienes permisos para ver esta incidencia.');
      err.status = 403;
      throw err;
    }
  } else if (user.nivel_acceso === 'tecnico') {
    const esAsignado = inc.tecnico_asignado?.correo?.toLowerCase() === user.correo.toLowerCase();
    const esSinAsignar = !inc.tecnico_asignado;
    if (!esAsignado && !esSinAsignar) {
      const err = new Error('Acceso denegado. Esta incidencia está asignada a otro técnico.');
      err.status = 403;
      throw err;
    }
  }

  return inc;
}

// ── RF-11, RF-12, RF-15: Cambio de Estado, Bitácora Atómica y Horas ────────
export async function cambiarEstadoIncidencia(codigoParam, datos, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();
  const { estado_nuevo, comentario = '', horas = 0 } = datos || {};

  if (!estado_nuevo || !ESTADOS_VALIDOS.includes(estado_nuevo)) {
    const err = new Error(`estado_nuevo inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  const horasNum = Number(horas);
  if (isNaN(horasNum) || horasNum < 0) {
    const err = new Error('Las horas invertidas deben ser un número mayor o igual a 0.');
    err.status = 400;
    throw err;
  }

  if (comentario && typeof comentario === 'string' && comentario.length > 2000) {
    const err = new Error('El comentario no puede exceder los 2000 caracteres.');
    err.status = 400;
    throw err;
  }

  // 1. Obtener la incidencia actual para validar transiciones y propiedad
  const inc = await consultarDetalleIncidencia(codigoNorm, user);

  // Directivo o reportante no pueden cambiar estado (Matriz CU-03)
  if (user.nivel_acceso !== 'tecnico' && user.nivel_acceso !== 'coordinador') {
    const err = new Error('Acceso denegado. Solo el técnico asignado o el coordinador pueden actualizar el estado.');
    err.status = 403;
    throw err;
  }

  // Si es técnico, debe ser el técnico asignado
  if (user.nivel_acceso === 'tecnico') {
    if (inc.tecnico_asignado?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. Solo el técnico asignado puede actualizar esta incidencia.');
      err.status = 403;
      throw err;
    }
  }

  // Estado cerrado es estado final: ninguna transición sale de ahí
  if (inc.estado === 'cerrada') {
    const err = new Error("La incidencia se encuentra 'cerrada' (estado final). No se permiten cambios de estado.");
    err.status = 400;
    throw err;
  }

  const estadoActual = inc.estado;
  const esCoordinador = user.nivel_acceso === 'coordinador';

  // Validar transiciones según tabla de sección 3:
  // - De resuelta a cerrada: SOLO coordinador (RF-15)
  if (estado_nuevo === 'cerrada') {
    if (!esCoordinador) {
      const err = new Error("Solo el coordinador puede cerrar incidencias ('resuelta' → 'cerrada').");
      err.status = 403;
      throw err;
    }
    if (estadoActual !== 'resuelta') {
      const err = new Error("Solo se puede cerrar una incidencia que esté en estado 'resuelta'.");
      err.status = 400;
      throw err;
    }
  }

  // - De resuelta a en_proceso (reapertura): SOLO coordinador (RF-15)
  if (estadoActual === 'resuelta' && estado_nuevo === 'en_proceso') {
    if (!esCoordinador) {
      const err = new Error("Solo el coordinador puede reabrir una incidencia ('resuelta' → 'en_proceso').");
      err.status = 403;
      throw err;
    }
  } else if (estadoActual === 'resuelta' && estado_nuevo !== 'cerrada') {
    const err = new Error(`Transición no permitida desde 'resuelta' hacia '${estado_nuevo}'.`);
    err.status = 400;
    throw err;
  }

  // Entrada para bitácora atómica
  const entradaBitacora = {
    fecha: new Date(),
    autor: user.nombre_completo || user.nombre, // Identidad siempre de la sesión
    estado_nuevo,
    comentario: String(comentario || '').trim(),
    horas: horasNum,
  };

  const updateOp = {
    $set: { estado: estado_nuevo },
    $inc: { horas_invertidas: horasNum },
    $push: { historial_seguimiento: entradaBitacora },
  };

  // RF-12: Al pasar a resuelta, fijar fecha_resolucion
  if (estado_nuevo === 'resuelta' && estadoActual !== 'resuelta') {
    updateOp.$set.fecha_resolucion = new Date();
  }

  // RF-15: Al reabrir (resuelta -> en_proceso), eliminar fecha_resolucion
  if (estadoActual === 'resuelta' && estado_nuevo === 'en_proceso') {
    updateOp.$unset = { fecha_resolucion: '' };
  }

  // Filtro atómico que garantiza propiedad y estado no cerrado
  const filtroAtomico = {
    codigo: codigoNorm,
    estado: { $ne: 'cerrada' },
  };
  if (user.nivel_acceso === 'tecnico') {
    filtroAtomico['tecnico_asignado.correo'] = user.correo.toLowerCase();
  }

  if (isConnectedToAtlas()) {
    const actualizado = await Incidencia.findOneAndUpdate(filtroAtomico, updateOp, { new: true }).lean();
    if (!actualizado) {
      const err = new Error('No se pudo actualizar la incidencia (verifique propiedad y estado activo).');
      err.status = 403;
      throw err;
    }
    return actualizado;
  }

  asegurarAccesoBD();
  // En memoria
  const target = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  if (!target) {
    const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
    err.status = 404;
    throw err;
  }

  target.estado = estado_nuevo;
  target.horas_invertidas = (target.horas_invertidas || 0) + horasNum;
  target.historial_seguimiento = target.historial_seguimiento || [];
  target.historial_seguimiento.push(entradaBitacora);

  if (estado_nuevo === 'resuelta' && estadoActual !== 'resuelta') {
    target.fecha_resolucion = new Date();
  }
  if (estadoActual === 'resuelta' && estado_nuevo === 'en_proceso') {
    delete target.fecha_resolucion;
  }

  return JSON.parse(JSON.stringify(target));
}

// ── RF-13: Autoasignación de Técnico (Atómica) ─────────────────────────────
export async function autoasignarTecnico(codigoParam, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();

  if (user.nivel_acceso !== 'tecnico' && user.nivel_acceso !== 'coordinador') {
    const err = new Error('Acceso denegado. Solo un técnico o coordinador puede autoasignarse una incidencia.');
    err.status = 403;
    throw err;
  }

  const nuevoTecnico = {
    nombre: user.nombre_completo || user.nombre,
    correo: user.correo.toLowerCase(),
  };

  // Filtro atómico: la incidencia debe existir, NO tener técnico asignado y NO estar cerrada
  const filtro = {
    codigo: codigoNorm,
    estado: { $ne: 'cerrada' },
    $or: [{ tecnico_asignado: { $exists: false } }, { tecnico_asignado: null }],
  };

  const update = {
    $set: { tecnico_asignado: nuevoTecnico },
  };

  if (isConnectedToAtlas()) {
    const incActualizada = await Incidencia.findOneAndUpdate(filtro, update, { new: true }).lean();
    if (!incActualizada) {
      // Verificar si existe para distinguir 404 de 409
      const existe = await Incidencia.findOne({ codigo: codigoNorm }).lean();
      if (!existe) {
        const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
        err.status = 404;
        throw err;
      }
      const err = new Error('La incidencia ya tiene un técnico asignado o se encuentra cerrada.');
      err.status = 409;
      throw err;
    }
    return incActualizada;
  }

  asegurarAccesoBD();
  // En memoria
  const inc = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  if (!inc) {
    const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
    err.status = 404;
    throw err;
  }
  if (inc.tecnico_asignado) {
    const err = new Error('La incidencia ya tiene un técnico asignado.');
    err.status = 409;
    throw err;
  }
  if (inc.estado === 'cerrada') {
    const err = new Error('No se puede asignar técnico a una incidencia cerrada.');
    err.status = 400;
    throw err;
  }

  inc.tecnico_asignado = nuevoTecnico;
  return JSON.parse(JSON.stringify(inc));
}

// ── RF-14: Asignación o Reasignación por Coordinador ───────────────────────
export async function asignarTecnicoPorCoordinador(codigoParam, correoTecnico, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();

  if (user.nivel_acceso !== 'coordinador') {
    const err = new Error('Acceso denegado. Solo el coordinador puede asignar o reasignar técnicos.');
    err.status = 403;
    throw err;
  }

  if (!correoTecnico || typeof correoTecnico !== 'string') {
    const err = new Error('El correo del técnico es requerido.');
    err.status = 400;
    throw err;
  }

  // Valida que el técnico exista en usuarios, tenga rol tecnico y esté activo
  const tecnicoValido = await validarTecnicoParaAsignacion(correoTecnico.trim().toLowerCase());

  const filtro = {
    codigo: codigoNorm,
    estado: { $ne: 'cerrada' },
  };
  const update = {
    $set: { tecnico_asignado: tecnicoValido },
  };

  if (isConnectedToAtlas()) {
    const res = await Incidencia.findOneAndUpdate(filtro, update, { new: true }).lean();
    if (!res) {
      const existe = await Incidencia.findOne({ codigo: codigoNorm }).lean();
      if (!existe) {
        const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
        err.status = 404;
        throw err;
      }
      const err = new Error('No se puede asignar técnico a una incidencia cerrada.');
      err.status = 400;
      throw err;
    }
    return res;
  }

  asegurarAccesoBD();
  const inc = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  if (!inc) {
    const err = new Error(`Incidencia ${codigoNorm} no encontrada.`);
    err.status = 404;
    throw err;
  }
  if (inc.estado === 'cerrada') {
    const err = new Error('No se puede asignar técnico a una incidencia cerrada.');
    err.status = 400;
    throw err;
  }

  inc.tecnico_asignado = tecnicoValido;
  return JSON.parse(JSON.stringify(inc));
}

// ── RF-16: Registrar Metadatos de Evidencia Adjunta ────────────────────────
export async function registrarEvidencia(codigoParam, datosEvidencia, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();
  const { nombre_archivo, tipo_mime, peso_kb, url_storage } = datosEvidencia || {};

  if (!nombre_archivo || !tipo_mime || !url_storage) {
    const err = new Error('nombre_archivo, tipo_mime y url_storage son requeridos.');
    err.status = 400;
    throw err;
  }

  const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!tiposPermitidos.includes(tipo_mime)) {
    const err = new Error(`Tipo de archivo no permitido: '${tipo_mime}'. Solo se admiten JPG, PNG o PDF.`);
    err.status = 400;
    throw err;
  }

  const inc = await consultarDetalleIncidencia(codigoNorm, user);

  if (inc.evidencias_adjuntas && inc.evidencias_adjuntas.length >= 50) {
    const err = new Error('Se ha alcanzado el límite máximo de 50 evidencias por incidencia.');
    err.status = 400;
    throw err;
  }

  // Permisos: reportante a las suyas, técnico a las asignadas a él
  if (user.nivel_acceso === 'reportante') {
    if (inc.reportante?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. No puedes subir evidencias a incidencias de otros usuarios.');
      err.status = 403;
      throw err;
    }
  } else if (user.nivel_acceso === 'tecnico') {
    if (inc.tecnico_asignado?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. Solo puedes subir evidencias a las incidencias asignadas a ti.');
      err.status = 403;
      throw err;
    }
  } else {
    const err = new Error('Acceso denegado. Solo reportantes y técnicos pueden subir evidencias.');
    err.status = 403;
    throw err;
  }

  const nuevaEvidencia = {
    nombre_archivo: String(nombre_archivo).trim(),
    tipo_mime,
    peso_kb: Number(peso_kb) || 0,
    url_storage: String(url_storage).trim(),
    fecha_carga: new Date(),
  };

  const filtro = { codigo: codigoNorm };
  const update = { $push: { evidencias_adjuntas: nuevaEvidencia } };

  if (isConnectedToAtlas()) {
    const actualizado = await Incidencia.findOneAndUpdate(filtro, update, { new: true }).lean();
    return actualizado;
  }

  asegurarAccesoBD();
  const target = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  target.evidencias_adjuntas = target.evidencias_adjuntas || [];
  target.evidencias_adjuntas.push(nuevaEvidencia);
  return JSON.parse(JSON.stringify(target));
}

// ── RF-18 y RF-19: Agregar y Quitar Etiquetas ($addToSet y $pull) ───────────
export async function agregarTag(codigoParam, tagRaw, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();

  if (!tagRaw || typeof tagRaw !== 'string' || !tagRaw.trim()) {
    const err = new Error('El campo tag es obligatorio y no puede estar vacío.');
    err.status = 400;
    throw err;
  }

  if (tagRaw.trim().length > 50) {
    const err = new Error('La etiqueta no puede exceder los 50 caracteres.');
    err.status = 400;
    throw err;
  }

  const inc = await consultarDetalleIncidencia(codigoNorm, user);

  if (inc.tags && inc.tags.length >= 30) {
    const err = new Error('Se ha alcanzado el límite máximo de 30 etiquetas por incidencia.');
    err.status = 400;
    throw err;
  }

  // Permisos: técnico asignado (en las suyas) o coordinador (todas)
  if (user.nivel_acceso === 'tecnico') {
    if (inc.tecnico_asignado?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. Solo el técnico asignado puede agregar etiquetas a esta incidencia.');
      err.status = 403;
      throw err;
    }
  } else if (user.nivel_acceso !== 'coordinador') {
    const err = new Error('Acceso denegado. Solo el técnico asignado o el coordinador pueden gestionar etiquetas.');
    err.status = 403;
    throw err;
  }

  const tagNormalizado = tagRaw.trim().toLowerCase();
  const filtro = { codigo: codigoNorm };
  const update = { $addToSet: { tags: tagNormalizado } };

  if (isConnectedToAtlas()) {
    return await Incidencia.findOneAndUpdate(filtro, update, { new: true }).lean();
  }

  asegurarAccesoBD();
  const target = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  target.tags = target.tags || [];
  if (!target.tags.includes(tagNormalizado)) {
    target.tags.push(tagNormalizado);
  }
  return JSON.parse(JSON.stringify(target));
}

export async function removerTag(codigoParam, tagRaw, user) {
  const codigoNorm = (codigoParam || '').toUpperCase().trim();

  if (!tagRaw || typeof tagRaw !== 'string' || !tagRaw.trim()) {
    const err = new Error('El parámetro tag es requerido.');
    err.status = 400;
    throw err;
  }

  const inc = await consultarDetalleIncidencia(codigoNorm, user);

  // Permisos: técnico asignado (en las suyas) o coordinador (todas)
  if (user.nivel_acceso === 'tecnico') {
    if (inc.tecnico_asignado?.correo?.toLowerCase() !== user.correo.toLowerCase()) {
      const err = new Error('Acceso denegado. Solo el técnico asignado puede quitar etiquetas de esta incidencia.');
      err.status = 403;
      throw err;
    }
  } else if (user.nivel_acceso !== 'coordinador') {
    const err = new Error('Acceso denegado. Solo el técnico asignado o el coordinador pueden gestionar etiquetas.');
    err.status = 403;
    throw err;
  }

  const tagNormalizado = tagRaw.trim().toLowerCase();
  const filtro = { codigo: codigoNorm };
  const update = { $pull: { tags: tagNormalizado } };

  if (isConnectedToAtlas()) {
    return await Incidencia.findOneAndUpdate(filtro, update, { new: true }).lean();
  }

  asegurarAccesoBD();
  const target = memoryStore.incidencias.find((i) => i.codigo === codigoNorm);
  target.tags = (target.tags || []).filter((t) => t.toLowerCase() !== tagNormalizado);
  return JSON.parse(JSON.stringify(target));
}

// ── RF-20: Búsqueda por Texto Relevante ($text y textScore) ─────────────────
export async function buscarIncidencias(queryText, user) {
  // RF-20: Solo técnico, coordinador y directivo (reportante recibe 403)
  if (user.nivel_acceso === 'reportante') {
    const err = new Error("Acceso denegado. El nivel 'reportante' no tiene acceso a la función de búsqueda.");
    err.status = 403;
    throw err;
  }

  const q = (queryText || '').trim();
  if (q.length < 2) {
    const err = new Error('Se requiere el parámetro ?q= con al menos 2 caracteres.');
    err.status = 400;
    throw err;
  }

  // Filtro de visibilidad para técnicos: asignadas a él o sin asignar
  const filtroRol = {};
  if (user.nivel_acceso === 'tecnico') {
    filtroRol.$or = [
      { 'tecnico_asignado.correo': user.correo.toLowerCase() },
      { tecnico_asignado: { $exists: false } },
      { tecnico_asignado: null },
    ];
  }

  if (isConnectedToAtlas()) {
    const filtro = {
      $text: { $search: q },
      ...filtroRol,
    };
    return await Incidencia.find(filtro, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();
  }

  asegurarAccesoBD();
  // En memoria
  const qLower = q.toLowerCase();
  let list = [...memoryStore.incidencias];
  if (user.nivel_acceso === 'tecnico') {
    list = list.filter(
      (i) =>
        i.tecnico_asignado?.correo?.toLowerCase() === user.correo.toLowerCase() ||
        !i.tecnico_asignado
    );
  }

  const resultados = list
    .map((i) => {
      let score = 0;
      if (i.titulo?.toLowerCase().includes(qLower)) score += 10;
      if (i.descripcion?.toLowerCase().includes(qLower)) score += 5;
      if (i.codigo?.toLowerCase().includes(qLower)) score += 8;
      if ((i.tags || []).some((t) => t.toLowerCase().includes(qLower))) score += 4;
      return { ...i, score };
    })
    .filter((i) => i.score > 0);

  resultados.sort((a, b) => b.score - a.score);
  return resultados.slice(0, 50);
}

// ── RF-21: Analítica por Edificio (SOLO Directivo) ─────────────────────────
export async function obtenerAnaliticaEdificios(user) {
  if (user.nivel_acceso !== 'directivo') {
    const err = new Error("Acceso denegado. La analítica es exclusiva para el rol 'directivo'.");
    err.status = 403;
    throw err;
  }

  if (isConnectedToAtlas()) {
    const resultado = await Incidencia.aggregate([
      {
        $match: {
          estado: { $in: ['resuelta', 'cerrada'] },
        },
      },
      {
        $group: {
          _id: '$ubicacion.edificio',
          total_horas: { $sum: '$horas_invertidas' },
          incidencias: { $sum: 1 },
          promedio_horas: { $avg: '$horas_invertidas' },
        },
      },
      {
        $project: {
          _id: 0,
          edificio: '$_id',
          total_horas: { $round: ['$total_horas', 1] },
          incidencias: 1,
          promedio_horas: { $round: ['$promedio_horas', 1] },
        },
      },
      { $sort: { total_horas: -1 } },
    ]);
    return resultado;
  }

  asegurarAccesoBD();
  // En memoria
  const resueltas = memoryStore.incidencias.filter(
    (i) => i.estado === 'resuelta' || i.estado === 'cerrada'
  );

  const porEdificio = {};
  for (const ed of EDIFICIOS_VALIDOS) {
    porEdificio[ed] = { edificio: ed, total_horas: 0, incidencias: 0 };
  }

  for (const inc of resueltas) {
    const ed = inc.ubicacion?.edificio || 'Edificio A';
    if (!porEdificio[ed]) porEdificio[ed] = { edificio: ed, total_horas: 0, incidencias: 0 };
    porEdificio[ed].total_horas += Number(inc.horas_invertidas) || 0;
    porEdificio[ed].incidencias += 1;
  }

  const list = Object.values(porEdificio).map((item) => ({
    edificio: item.edificio,
    total_horas: Number(item.total_horas.toFixed(1)),
    incidencias: item.incidencias,
    promedio_horas: item.incidencias > 0 ? Number((item.total_horas / item.incidencias).toFixed(1)) : 0,
  }));

  list.sort((a, b) => b.total_horas - a.total_horas);
  return list;
}

// ── RF-22: Analítica de Etiquetas más Frecuentes (SOLO Directivo) ───────────
export async function obtenerRankingTags(user) {
  if (user.nivel_acceso !== 'directivo') {
    const err = new Error("Acceso denegado. La analítica es exclusiva para el rol 'directivo'.");
    err.status = 403;
    throw err;
  }

  if (isConnectedToAtlas()) {
    const resultado = await Incidencia.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, tag: '$_id', total: 1 } },
    ]);
    return resultado;
  }

  asegurarAccesoBD();
  // En memoria
  const counts = {};
  for (const inc of memoryStore.incidencias) {
    for (const tag of inc.tags || []) {
      const t = tag.toLowerCase().trim();
      counts[t] = (counts[t] || 0) + 1;
    }
  }

  const list = Object.entries(counts).map(([tag, total]) => ({ tag, total }));
  list.sort((a, b) => b.total - a.total);
  return list.slice(0, 10);
}
